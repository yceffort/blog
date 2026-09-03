---
title: 'How My Next.js App Becomes a Pod: A Record of Opening Up Containers and Pods'
tags:
  - kubernetes
  - docker
  - nextjs
  - nodejs
  - frontend
published: true
date: 2026-08-05 21:00:00
description: 'The same Next.js app produced one 1.72GB image and one 208MB image. This post traces the missing 1.5GB back through the layers, and verifies with PIDs and cgroup files that a container is an isolated process. The second post of the Kubernetes for frontend developers series.'
thumbnail: /thumbnails/2026/08/k8s-for-frontend-2.png
series: 'Kubernetes for Frontend Developers'
seriesOrder: 2
art:
  scene: 'A massive block of stacked slabs stands on the left, and a single thin slab a fraction of its size sits on the right at the same baseline, both resting on identical small server boxes.'
  composition: plate
  layout: rings
  hue: blue
  tone: dark
  hero: '1.72GB → 208MB'
---

## Table of Contents

## The 1.72GB a Five-Line Dockerfile Made

Thinking back to the first time I put an SSR service in a container, the Dockerfile was copied from somewhere. `FROM node`, `COPY . .`, `RUN npm ci`, `RUN npm run build`, `CMD npm start`. Five lines built, the pipeline shipped it, and there was never a reason to look at how big the image was. Rebuild that era's Dockerfile with this post's sample app and it comes out at 1.72GB. The sample app's code and build output total 42.5MB, and the whole image is more than 40 times that. Something other than the app occupies all the rest.

Change how the same app is packaged and the number drops to 208MB. Not a single feature differs. This post starts by opening up the roughly 1.5GB in between, layer by layer with `docker history`, and follows with direct measurements through what a container actually is (not a small VM), what the Node.js inside that container sees, and what happens as Kubernetes wraps that container into a pod and lands it on a node.

This is the second post in the "Kubernetes for Frontend Developers" series. [Part 1](/en/2026/08/k8s-for-frontend-1) organized the vocabulary and concepts; from this part on, we run and measure them. First up: containers and pods. It continues with the traffic path in [Part 3](/en/2026/08/k8s-for-frontend-3), the life and death of pods in [Part 4](/en/2026/08/k8s-for-frontend-4), and autoscaling, with the already-published [Node.js pod sizing post](/en/2026/08/nodejs-k8s-pod-sizing) as the deep-dive terminus the series arrives at.

> Measurement environment: a colima VM (4 CPU/8GB, Docker 29.5.2) on Apple M5 (10 cores, 24GB RAM) macOS. Kubernetes is kind v0.32.0 (kindest/node v1.36.1, Kubernetes v1.36.1), the sample app is **Next.js 16.2.12** built standalone, and the container's Node is **v24.19.0** per the node:24 image. Image sizes are arm64, uncompressed (as laid out on disk). Absolute values vary by environment; what this post is after is not the absolutes but the structure.

## The Order of This Post

The code we write becomes a served process through four stages: image, container, pod, deploy. The post follows that order. One line each on what will be verified at every stage:

Code first becomes an **image**. What we verify here is that most of the image is not our app (in the measurement, the app was 2.5%). An image is executed into a **container**, whose reality is not a small VM but a single process wearing isolation devices. We directly confirm the same process appearing as PID 1 inside and PID 7656 outside. Kubernetes then wraps that container into a **pod**, attaching an IP and a resource contract, and we verify here whether the containers in a pod really do share a network. Finally we follow one `kubectl apply` through all these stages into a **deploy**, second by second through the event log, and at the end of it meet one compatibility problem between Next.js standalone and Kubernetes (the HOSTNAME trap).

If terms like pod, kubelet, and readiness still feel unfamiliar, I recommend [Part 1's vocabulary and concept survey](/en/2026/08/k8s-for-frontend-1) first. That said, every first-appearing concept gets a short in-place gloss here too, so reading straight on works fine.

## The Image: A Snapshot of the Whole App

An image is a snapshot of the app plus the entire filesystem its execution needs. The point is that it is a bundle of files, not an executable. We start by actually building the five-line Dockerfile from the intro and opening the bundle. The sample app is Next.js 16's default setup plus an SSR page and two API routes, the minimal configuration.

```dockerfile
FROM node:24
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Built this way, the image is 1,715MB. An image is a stack of layers (a layer being, roughly, what one Dockerfile instruction produces), so `docker history` shows the per-layer manifest. Grouped by origin:

| Layer                                          |   Size | Who put it there |
| ---------------------------------------------- | -----: | ---------------- |
| Debian (bookworm) base                         |  155MB | `node:24` base   |
| ca-certificates, curl, other base utilities    |   52MB | `node:24` base   |
| git, mercurial, openssh, other VCS tooling     |  200MB | `node:24` base   |
| gcc, g++, imagemagick, assorted -dev libraries |  592MB | `node:24` base   |
| Node.js 24.19 itself + yarn                    |  215MB | `node:24` base   |
| `npm ci` (node_modules)                        |  458MB | our Dockerfile   |
| `npm run build` (.next)                        | 42.5MB | our Dockerfile   |

Two things show in this table. First, what we made is the bottom two rows, and what deserves to be called app output is just 42.5MB. Second, the `node:24` base image alone takes 1.2GB, half of it **build tooling**: gcc and g++, imagemagick, dozens of `-dev` header packages. Not because `node:24` is lazy. It is a deliberately complete image, equipped to build native addons (npm packages written in C++ that compile at install time) in any environment. The problem is that those provisions are unnecessary at **runtime**, after the build is done. We had been shipping a compiler along with the service.

So the diet proceeds from two directions: changing the base image, and shrinking what gets packed. Measured stage by stage:

| Stage                                       | On-disk size | Transfer (compressed) size |
| ------------------------------------------- | -----------: | -------------------------: |
| `node:24` + full node_modules + `npm start` |      1,715MB |                      590MB |
| Base swapped to `node:24-slim`              |        767MB |                      270MB |
| Multi-stage + standalone output             |        304MB |                       91MB |
| Runner on `node:24-alpine`                  |        208MB |                       69MB |

The first cut is the base swap. `node:24-slim` is the same Debian minus build tools and VCS, and that alone removes 948MB. The second cut is this section's main event: standalone.

### standalone: How 458MB of node_modules Becomes 37MB

Add one line to `next.config.mjs` and the build output changes.

```js
const nextConfig = {
  output: 'standalone',
}
```

With this, `next build` creates a **self-contained server copy** in `.next/standalone`. The key is that Next.js traces which files the actual execution path references during the build, and picks only those files out of `node_modules`. Dev dependencies, build-only packages, and unreferenced code all drop out. In this sample, the result is 458MB versus 37.3MB. That is a twelfth, and the direction of the ratio holds as apps grow: what execution needs is a fraction of the full dependency tree.

What remains is packing only this copy into the final image: build where the tools are, carry only the result to a light stage. A multi-stage build.

```dockerfile
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

The final `runner` stage has no `npm ci` and no `COPY . .`. Only the standalone copy and static files go in. That yields 304MB, and swapping the runner base to alpine gives 208MB. Against the intro's 1,715MB, one eighth.

> One display quirk discovered while measuring. Recent Docker (the containerd image store) has `docker image ls` show disk usage that **combines** the compressed and uncompressed copies, so the 1,715MB image above appears in the listing as 2.31GB. Numbers in this post are unified on the `docker history` sum, that is, the uncompressed filesystem.

Why size matters deserves honest framing. If the image is already cached on a node, a big image costs nothing at runtime. The moment you pay is **when a pod first starts on a node that lacks the image**: a new node joins, scale-out lands a pod on an unfamiliar node, every node pulls the new image right after a deploy. The gap between transfer sizes of 590MB and 69MB becomes, at each of those moments, the gap in registry download time and bandwidth. In situations where a new pod must be up within seconds of a traffic spike (the topic of [the autoscaling part](/en/2026/08/k8s-for-frontend-5)), that gap turns directly into response latency. Image dieting is less an optimization technique than the act of removing files that execution never needed.

## The Container: A Process Wearing Isolation Devices

Execute an image and you get a container. But imagine this "executed thing" as a small virtual machine, and every intuition afterward comes out slightly wrong. A container has no OS to boot and no kernel of its own. Its reality is **an ordinary process running on the host kernel, wearing isolation devices**. This is not a metaphor but an observable fact, so the fastest way is to check directly.

Run the standalone image with 1 CPU and a 256MB memory cap, then find the same process from inside and outside.

```bash
$ docker run -d --rm --name pid-demo --cpus=1 --memory=256m k8s-fe-lab:standalone

# the world as seen inside the container (why the name is truncated: below)
$ docker exec pid-demo cat /proc/1/comm
next-server (v

# the same process as seen from the host (the Linux VM)
$ docker inspect -f '{{.State.Pid}}' pid-demo
7656
$ ps -o pid,ppid,comm -p 7656
    PID    PPID COMMAND
   7656    7632 next-server (v
$ ps -o pid,comm -p 7632
    PID COMMAND
   7632 containerd-shim
```

The same `next-server` process is PID 1 inside and PID 7656 outside. On the truncated name, since we are here: Next.js sets `process.title = 'next-server (v16.2.12)'` in `start-server.js`, and on Linux a process title is written over the argv memory the original command line occupied, so only as much fits as the original command's length, the 14 characters of `node server.js`. comm also has its own 15-character kernel cap, but the culprit here is the argv space, not that cap (run it with a long command line and the title survives intact while comm truncates at exactly 15, which is how you tell them apart). The parent is containerd-shim, the container runtime's supervisor process. In other words, from the host's viewpoint a container is just one branch of the process tree, no different from the neighboring processes `ps` shows. What is different is the two wrappers the kernel has fitted onto this process.

The first wrapper is the **namespace**. It partitions the world shown to the process. Thanks to the PID namespace, inside the container the process is PID 1 and sees no other processes; thanks to the network namespace it has its own network interfaces; thanks to the mount namespace the image's filesystem appears as its root (`/`). Namespaces handle the "what is visible" side of isolation.

The second wrapper is the **cgroup**. It caps not what is visible but what is consumed. Follow this process's cgroup from the host, and the caps given to `docker run` are written there as files, verbatim.

```bash
$ cat /proc/7656/cgroup
0::/docker/f00ea3e52f44...

$ cat /sys/fs/cgroup/docker/f00ea3e52f44.../memory.max
268435456        # 256MB
$ cat /sys/fs/cgroup/docker/f00ea3e52f44.../cpu.max
100000 100000    # 100ms worth every 100ms = 1 core
```

The reality of the Docker option `--memory=256m` is one number in this `memory.max` file. Kubernetes' memory limit, and the pod resource contract we will see shortly, all arrive at this same file if you follow them to the end. The [pod sizing post](/en/2026/08/nodejs-k8s-pod-sizing) covered OOMKills and CFS throttling; this is where that enforcement happens.

Picture the host as a building and the structure fits in one frame. The host kernel is the building's frame and utilities, shared by every unit. A container is one unit. Namespaces are the unit's walls, keeping the neighbors out of sight; the cgroup is the lease, stating how much power and water may be used. A VM is a detached house that builds even the utilities (the kernel) separately. Sturdy but heavy, which is why containers have no "boot": why startup is as fast as launching a process, why kernel-level isolation is weaker than a VM's, and why the container dies wholesale when its PID 1 process dies (we meet this again in [the life and death part](/en/2026/08/k8s-for-frontend-4) with the termination-signal story). All of it follows from this structure.

### Half of What Node Sees Inside a Container Is a Lie

Deceiving a process about its world has side effects. When the Node.js inside asks for system information, the kernel's answers are **host-based for some values and cgroup-based for others**. Run the same image under different constraints and tabulate what Node sees inside:

| Value                                    | Host (macOS) | Container (no limits) | `--cpus=1 --memory=512m` |
| ---------------------------------------- | -----------: | --------------------: | -----------------------: |
| `os.cpus().length`                       |           10 |                     4 |                    **4** |
| `os.availableParallelism()`              |           10 |                     4 |                    **1** |
| `os.totalmem()`                          |         24GB |                 7.9GB |                **7.9GB** |
| `v8.getHeapStatistics().heap_size_limit` |     4,288MiB |              2,240MiB |               **259MiB** |
| cgroup `memory.max`                      |            - |                   max |              536,870,912 |

The axis to read is the last column. The container is capped at 1 CPU and 512MB of memory, yet `os.cpus()` still returns 4 (the colima VM's core count) and `os.totalmem()` returns the VM's full 7.9GB. These two read the kernel's global information and know nothing of cgroups. In the building analogy, they show you the view out the window (the whole building). `availableParallelism()`, by contrast, returns 1, because libuv factors in the cgroup CPU quota. V8 also shrank its own heap ceiling from 4,288MiB to 259MiB: it reads the cgroup's `memory.max` and sets its default accordingly, the Node 24 container awareness covered in the [sizing post](/en/2026/08/nodejs-k8s-pod-sizing). These are the APIs that read the lease.

Half of this table being a lie shows up in production as two kinds of accidents. One is code sizing its worker count from `os.cpus().length`. In a 1-core pod on a 64-core node this returns 64, and 64 workers carve up a 1-core quota into throttling hell (pm2's `-i max` is exactly this trap, covered in detail in the sizing post). The other is code like cache sizing based on `totalmem()`, which comes to believe several multiples of the container limit is "available memory." Inside a container, read `availableParallelism()` when you need parallelism and cgroup values when you need memory judgment.

Looking again at how the heap ceiling tracks the cgroup, by condition: 259MiB at a 512MB cap, 1,120MiB at a 2GB cap; with a limit present it followed at roughly half the limit. With no limit the baseline itself changes: it settled at 2,240MiB, about 28% of the VM's 7.9GB. The exact formula can shift across versions, so take only the direction: give it a limit, and V8 scales its heap down in proportion. How much this auto-adjustment deserves gratitude, and how it switches off the moment you specify heap flags, is the sizing post's topic.

## The Pod: A Container Plus an IP and a Resource Contract

Everything so far was possible with Docker alone. Here Kubernetes enters. Kubernetes does not handle containers directly; it works in a packaging unit called the **Pod**, and the first question is why one more wrapper goes around a container that is already an execution unit.

A pod bundles one or more containers and attaches three things to the bundle. First, **one IP address**. Containers in a pod share a network namespace, calling each other over localhost and appearing to the outside as a single IP. The pattern of attaching helper containers (sidecars) such as log collectors or proxies beside the app stands on this sharing. Second, a **resource contract**. The pod spec's `requests`/`limits` are enforced through the cgroup files of the previous section. Third, **one lifecycle**. Kubernetes creates, moves, and kills at pod granularity; scheduling and restarts likewise treat the pod as the smallest unit.

I verified the network sharing directly too. Using the same standalone image, I put an app container and a sidecar container that does nothing but sleep into one pod, and asked each about its own network interface.

```bash
# commands and output trimmed to the IPv4 addresses
$ kubectl exec sidecar-demo -c app -- node -e "console.log(os.networkInterfaces().eth0...)"
10.244.1.5
$ kubectl exec sidecar-demo -c sidecar -- node -e "console.log(os.networkInterfaces().eth0...)"
10.244.1.5
```

Both containers see the same eth0, the same IP. Not one interface each: hard evidence that they are **sharing a single network namespace**. The container section said namespaces partition each container's visible world; a pod, then, is a bundle that deliberately tears down one of those walls, the network, between its containers. The experiment of calling the app from the sidecar over localhost continues shortly in the HOSTNAME trap.

If the pod is the unit of contract, the organization enforcing the contract is the cluster. The org chart was drawn in [Part 1](/en/2026/08/k8s-for-frontend-1), so here is just what this post needs. The control plane's scheduler decides which node a pod lands on, and that node's kubelet relays the decision to containerd, producing the isolation-wrapped process of the previous section. And what we author in manifests is not pods but a Deployment (the declaration "keep N of this app"); the Deployment makes a ReplicaSet, the ReplicaSet makes pods. Pods are consumable, and all we manage is the declaration. That is Kubernetes' baseline posture.

### Even Nodes Can Be Containers: kind

kind, this series' lab environment, has the charm of demonstrating the structure recursively. kind (Kubernetes in Docker) fakes "nodes" as Docker containers to build a local cluster, and after creating the cluster, `docker ps` shows this:

```bash
$ docker ps --format 'table {{.Names}}\t{{.Image}}'
NAMES                      IMAGE
k8s-fe-lab-control-plane   kindest/node:v1.36.1
k8s-fe-lab-worker          kindest/node:v1.36.1
k8s-fe-lab-worker2         kindest/node:v1.36.1
```

Three nodes are just three containers. Inside them run kubelet and containerd, and our pods come up as processes inside those. Accept the container section's conclusion, that a container is an isolation-wrapped process, and nodes being fake-able as containers follows naturally: isolation is a device that stacks.

How many containers per pod, and what resource contract to write: those operational decisions belong to the series' terminus, the [sizing post](/en/2026/08/nodejs-k8s-pod-sizing). What this section needs is one structure. **Pod = container bundle + IP + cgroup contract**, with the control plane deciding the contract and kubelet enforcing it.

## The Deploy: From Declaration to Process

Now we actually launch this pod. The deploy spec, summarized: run the standalone image as 2 pods (replicas), cap each at 1 CPU and 512Mi of memory, and designate `/api/health` as the readiness probe (the periodic kubelet check on whether traffic may be received).

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: k8s-fe-lab
spec:
  replicas: 2
  selector:
    matchLabels:
      app: k8s-fe-lab
  template:
    metadata:
      labels:
        app: k8s-fe-lab
    spec:
      containers:
        - name: app
          image: k8s-fe-lab:standalone
          resources:
            requests: {cpu: '500m', memory: '256Mi'}
            limits: {cpu: '1', memory: '512Mi'}
          readinessProbe:
            httpGet: {path: /api/health, port: 3000}
```

That `kubectl apply -f app.yaml` is a declaration, not a command, is Kubernetes' central idea. Not "start pods" but "this app's desired state is 2 replicas," a document submitted to the API server, upon which the controllers that read it move in a chain. The division of labor summarized in the previous section actually runs here: the Deployment controller creates a ReplicaSet, the ReplicaSet creates 2 pods, the scheduler picks nodes, and each node's kubelet starts the containers. The whole chain is recorded as events, so reading the event log right after apply in time order shows one full deploy cycle. An excerpt of the measured log:

```text
02:09:48  Normal   ScalingReplicaSet  k8s-fe-lab         Scaled up replica set k8s-fe-lab-6c8fb44888 from 0 to 2
02:09:48  Normal   SuccessfulCreate   k8s-fe-lab-6c8...  Created pod: k8s-fe-lab-6c8fb44888-wvx2x
02:09:48  Normal   Scheduled          ...-wvx2x          Successfully assigned default/...-wvx2x to k8s-fe-lab-worker
02:09:48  Normal   Pulled             ...-wvx2x          Container image "k8s-fe-lab:standalone" already present on machine
02:09:48  Normal   Created            ...-wvx2x          Container created
02:09:48  Normal   Started            ...-wvx2x          Container started
02:09:48  Warning  Unhealthy          ...-wvx2x          Readiness probe failed: ... connect: connection refused
```

From apply to both pods Ready took 0.97 seconds. The Ready transition time lands not in events but in the pod's conditions field; both pods flipped at 02:09:49, the second after Started. A few things are worth pinning.

First, the `Pulled` line's "already present on machine." This measurement pre-loaded the image onto the nodes, so the pull (downloading the image from the registry) was skipped, hence the 1 second. On a real first deploy or a fresh node, this line becomes a download tens of seconds long, proportional to the transfer sizes measured in the image section (590MB or 69MB). This is where "the biggest variable in the deploy timeline is image size" connects.

Next, the final `Unhealthy` warning. It looks like a failure but is normal behavior. At the moment the container hit Started, the Node process had not yet begun listening, and the first readiness probe arrived in that brief gap to receive connection refused. What matters is that during this failure the pod **receives no traffic**. Until readiness succeeds, the pod never makes the Service's target list. This device separating "up" from "ready to receive" is the core part that makes zero-downtime deploys work, a story told properly in [the traffic part](/en/2026/08/k8s-for-frontend-3) and [the life and death part](/en/2026/08/k8s-for-frontend-4).

### Meeting cgroups Again, Inside the Pod

With the pod up, we re-run the observation done with Docker in the container section, this time inside Kubernetes. The `/api/info` endpoint opened on the pod returns the world as Node sees it, verbatim.

```json
{
  "pod": "k8s-fe-lab-6c8fb44888-nm5h4",
  "node": "v24.19.0",
  "availableParallelism": 1,
  "cpus": 4,
  "totalmemMiB": 7922,
  "heapSizeLimitMiB": 259,
  "rssMiB": 83,
  "cgroup": {"memoryMax": "536870912", "cpuMax": "100000 100000"}
}
```

The limits of 1 CPU and 512Mi came down as cgroup files (`100000 100000`, `536870912`), and Node read them, setting itself to parallelism 1 and a 259MiB heap ceiling. The same values as in Docker. The route from one line of manifest YAML, through cgroup files, down to the V8 heap ceiling is now connected end to end.

### HOSTNAME: Why localhost Was Refused Only in the Pod

But while fetching those values I stepped on an unexpected trap: calling the server via `kubectl exec` inside the pod, localhost was refused.

```bash
$ kubectl exec deploy/k8s-fe-lab -- node -e "fetch('http://localhost:3000/api/info')..."
Error: connect ECONNREFUSED 127.0.0.1:3000
```

The readiness probe passes and the service is fine; only localhost fails. The cause is in the `server.js` that Next.js standalone generates. The line deciding the bind address looks like this (as of Next.js 16.2.12):

```js
const hostname = process.env.HOSTNAME || '0.0.0.0'
```

If `HOSTNAME` exists, bind to that address. And as it happens, in Kubernetes, unless the image defines `HOSTNAME` itself, the pod's `HOSTNAME` environment variable is filled with the **pod name**. The pod name resolves to the pod IP via the pod's `/etc/hosts`, so the server binds not to `0.0.0.0` (all interfaces) but **only to the pod IP**. Readiness probes and Service traffic arriving at the pod IP are fine; only things trying to enter through 127.0.0.1 are refused. `kubectl exec` debugging, sidecars calling localhost, and exec-based health check scripts all get caught.

Whether sidecars really get caught, I tested on the same pod used to verify network sharing in the pod section. Call the app from the sidecar container over localhost and it is refused outright.

```bash
$ kubectl exec sidecar-demo -c sidecar -- node -e "fetch('http://localhost:3000/api/health')..."
FAIL ECONNREFUSED
```

Two containers sharing one network namespace, and localhost still does not connect between them: the pod's premise (they call each other over localhost) is broken.

The fix is binding explicitly. One line in the Dockerfile's runner stage:

```dockerfile
ENV HOSTNAME=0.0.0.0
```

I verified this line actually takes effect: repeat the same sidecar experiment with the ENV added and the localhost call is restored. At least in this experiment's containerd environment, the image-defined `HOSTNAME` won over the pod name. One side effect follows, though. The app's `process.env.HOSTNAME` now reads `0.0.0.0` instead of the pod name, so any code using it as the pod identifier in logs breaks with it. If you need identity, read `os.hostname()` instead of the environment variable. The UTS hostname is still the pod name; I confirmed that in the same pod, `process.env.HOSTNAME` is `0.0.0.0` while `os.hostname()` returns the pod name.

What makes this trap interesting is that it barely surfaces in Docker-only environments. Docker's `HOSTNAME` is the container ID, so the server binds to the container IP the same way, but in Docker you rarely enter a container via localhost (port mapping goes to the container IP). Only after moving to Kubernetes, the moment you debug with `kubectl exec`, does it break the surface. When something fine locally and in Docker misbehaves only in a pod, the fact that environment variables are injected differently per runtime environment is quite often the culprit.

## Five Questions to Ask Your Own Service

The findings of this post, distilled into questions you can put to your own service. Read `deploy/my-app` as your service's name.

**1. What percentage of the image is our app?**

```bash
docker history <our-image> --format 'table {{.Size}}\t{{.CreatedBy}}' | head -20
```

If the base and node_modules dwarf the app output (this post's sample had the app at 2.5%), that is how much room the diet has.

**2. Are we using standalone?**

```bash
grep -r "output.*standalone" next.config.*
```

If it is Next.js without this setting and the final image carries all of `node_modules`, a 458MB → 37MB class reduction is available for one config line and a multi-stage Dockerfile.

**3. Does the Node inside the pod recognize its limit?**

```bash
kubectl exec deploy/my-app -- node -e "const os=require('node:os'),v8=require('node:v8'); console.log({parallelism: os.availableParallelism(), cpus: os.cpus().length, heapMiB: Math.round(v8.getHeapStatistics().heap_size_limit/1048576)})"
```

`cpus` showing the node's cores and `parallelism` showing the pod limit is the healthy state. If code somewhere sizes workers or concurrency from `os.cpus().length`, suspect that the value reflects the node, not the pod.

**4. Are we downloading the image fresh on every deploy?**

```bash
kubectl get events --sort-by=.metadata.creationTimestamp | grep my-app
```

If `Pulled` shows actual downloads every time instead of "already present," and the gaps are long, image size is eating your deploy and scale-out speed.

**5. Which address is the server bound to?**

```bash
kubectl exec deploy/my-app -- node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/').then(r=>console.log(r.status)).catch(e=>console.log(e.cause?.code))"
```

`ECONNREFUSED` means the server is bound only to the pod IP. If you have localhost-based sidecars or exec health checks, consider `ENV HOSTNAME=0.0.0.0`.

## Wrap-up

What this post verified by measurement:

- **An image is a filesystem snapshot, and most of it is not our app.** In the naive image the app was 2.5%. A base swap and standalone took 1,715MB down to 208MB, and that difference returns as time whenever a pod starts on a fresh node.
- **A container is a process wearing isolation devices.** The same process was PID 1 inside and PID 7656 outside. Namespaces decide what is visible, cgroups decide what may be consumed, and Docker options and Kubernetes limits both come down to numbers in cgroup files. And the Node inside sees only half the truth: `os.cpus()` and `totalmem()` return host values, `availableParallelism()` and the V8 heap ceiling return cgroup values.
- **A pod is a container bundle with an IP and a resource contract attached**, the contract decided by the control plane and enforced by kubelet. What we manage is not pods but the Deployment, the record of desired state.
- **apply is a declaration, not a command.** A chain of controllers turns the declaration into processes, the whole process lands in events readable second by second, and the timeline's biggest variable was the image pull, the transfer size measured in the image section.
- **Environment variables are injected differently per runtime environment.** The `HOSTNAME` Kubernetes fills in (the pod name) became Next.js standalone's bind address, breaking even the sidecar's localhost calls, as verified. The fix is `ENV HOSTNAME=0.0.0.0`, and pod identity is then read via `os.hostname()`, not the environment variable. When something fine locally and in Docker acts up only in a pod, suspect this first.

What containers and pods actually are has been verified by the measurements above. [The next part](/en/2026/08/k8s-for-frontend-3) is the path a request from outside takes to arrive at this pod. The ClusterIP address that `kubectl get svc` shows is a strange IP that does not even answer ping; how traffic flows into it is opened up and verified the same way as here.
