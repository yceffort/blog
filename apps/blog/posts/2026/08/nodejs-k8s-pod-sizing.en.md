---
title: 'Why Is Your Node.js Pod That Size? Sizing Measured Firsthand, from <em>NODE_OPTIONS</em> to Pod Count'
tags:
  - nodejs
  - kubernetes
  - v8
  - performance
  - frontend
published: true
date: 2026-08-03 21:00:00
description: 'I added one GC tuning flag to the same workload and peak RSS jumped from 201MB to 593MB, while the live data stayed the same. This post traces back through V8 New Space with direct measurements to show why that result is exactly what should happen, and lays out the three axes frontend developers can use to size a Node.js pod.'
thumbnail: /thumbnails/2026/08/nodejs-k8s-pod-sizing.png
series: 'Kubernetes for Frontend Developers'
seriesOrder: 6
art:
  layout: gridChart
  hue: warm
  tone: dark
  hero: '201MB → 593MB'
---

## Table of Contents

## Two Numbers Split by a Single Line

I ran the same script twice. Same code, same load, and the only difference was one line of runtime options.

```bash
NODE_OPTIONS="--max-semi-space-size=256 --max-old-space-size=3072"
```

Without this line, peak RSS was 201MB. With it, 593MB. The memory nearly tripled, and yet the amount of live data was the same in both cases, hovering around 20MB. Not a single byte of data grew, but the memory tripled.

That combination of flags may look familiar. It is a stock recommendation that comes up when you search for Node GC tuning, the kind of setting that gets passed from team to team along with testimonials about reduced latency in heavy data-processing services. The problem is that the same value is tuning for one service and pure waste for another, and it is often copied without knowing which side you are on.

For frontend developers, this is not someone else's problem. Whether it is Next.js, Remix, or a BFF (Backend For Frontend, an API middle-tier server managed directly by the frontend team), the moment we do SSR, we are putting a Node.js process into a container and running it on Kubernetes. And we copy knobs like `request`, `limit`, and `NODE_OPTIONS` from someone else's configuration, without knowing what those knobs actually do.

This post stood alone at first, and was later folded into the "Kubernetes for Frontend Developers" series as its deep-dive terminus (Part 6). If the background feels unfamiliar (pods and containers, the traffic path, pod termination), starting from [Part 1's concept map](/en/2026/08/k8s-for-frontend-1) is also an option.

This post traces back through the V8 heap internals to explain **why** that one line triples memory. Not by guessing, but by **measuring directly on Node.js v24.14.1**: how `--max-semi-space-size` inflates New Space, where the CPU ceiling of a single process sits, and how the cost multiplies when you use cluster, all in numbers. On top of that understanding, I lay out how to size a pod along three axes: CPU, memory, and pod count.

> Measurement environment: **Node.js v24.14.1**, Apple M5 (10 cores), 24GB RAM, macOS. RSS was measured with `process.memoryUsage().rss`, heap spaces with `v8.getHeapSpaceStatistics()`, CPU with `process.cpuUsage()`, and GC logs with `--trace-gc`. The load holds a resident cache of about 12MB and, to mimic request handling, keeps creating around 3MB of short-lived objects (some surviving until the next request) in a script that runs for 8 seconds. These are local numbers, not from inside a container, so absolute values will vary by environment, but what this post is trying to show is not absolute values. It is the **relationship between settings and memory**. That relationship is built into the runtime, so the same shape shows up wherever you measure.

## A Few Terms Worth Knowing

Let me define just the words that come up repeatedly in the text. Feel free to skip if you already know them.

> - **RSS** (Resident Set Size): the total amount a process actually has resident in RAM. It includes not just the V8 heap but code, buffers, and stacks, and this is the value the kernel's OOM killer looks at.
> - **New Space / Old Space**: the two generations of the V8 heap. New Space (the young generation) is where freshly created objects are born, and Old Space (the old generation) is where objects that survive it stay for the long term.
> - **semi-space**: one of the two halves (from/to) that make up New Space. Scavenge cleans up by copying objects from one half to the other.
> - **Scavenge**: the lightweight minor GC that cleans New Space. It moves only surviving objects to the opposite semi-space and discards everything else wholesale.
> - **working set**: the amount of data that is actually alive and continuously in use. The Old Space size right after a major GC is close to this.
> - **cgroup**: the Linux kernel mechanism that limits and isolates the CPU and memory of a group of processes. Container resource limits are enforced here.
> - **OOMKill**: when a container exceeds its memory limit (cgroup), the kernel kills the process. It shows up as exit code 137.
> - **kubelet**: the Kubernetes agent on each node that actually launches containers and watches their state.
> - **HPA** (Horizontal Pod Autoscaler): the standard Kubernetes autoscaler that automatically increases and decreases pod counts based on metrics (CPU utilization and so on).
> - **bin-packing**: the placement process where the scheduler looks at pods' requests and fits them into nodes like boxes, as tightly as possible. It determines node count and cost.

## Conclusions First

Before going inside, here is the summary. Even keeping just this much can stop the next copy-paste.

- `request` is a **reservation** that determines where the scheduler places a pod and how many the autoscaler runs. `limit` is not a reservation but a **cap on actual usage**, and exceeding it splits by resource: CPU gets throttled, memory gets OOMKilled. Neither is what your workload actually uses.
- `--max-semi-space-size` is the cap on **one semi-space** of New Space (the young generation). Since New Space runs on 2 semi-spaces (from/to), committed New Space grows up to **about 2x** this value. Give it 256 and you get a 512MB buffer.
- This buffer is **not claimed at startup.** It grows lazily toward the cap only as traffic (allocation) comes in. So things look fine at idle, and RSS spikes when load arrives. This is why the problem shows up as an alert only after traffic ramps up, not right after deployment.
- The scary part is that **RSS grows even when live data stays the same.** Looking at trace-gc, the amount surviving right after GC is nearly identical regardless of the setting, but raising just the semi value from 16 to 256 inflated the pre-GC heap from 30MB to 278MB. What grew was not data but the **buffer**.
- JS computation in a single Node process is **stuck on 1 core.** Pure JS saturates at 1 core (measured 0.99 cores). If you need more CPU, you scale out **processes (pods)**, not the container. That said, the GC threads' share is not a constant; depending on the shape of allocation, it moved from 0.03 cores to over 2 cores.
- With cluster, the GC reservation above is **multiplied by the worker count.** With 4 workers, a single `--max-semi-space-size=128` spread to around 1.7GB total (momentarily near 2GB). Copying a heavy `NODE_OPTIONS` into a cluster is the scaled-up version of the same problem.
- The default for one pod is **one process, about 1 core.** Keep K8s as the only supervisor and scale with replicas. Nesting a second supervisor like pm2 inside the pod makes OOMKills and crashes disappear from K8s's view.
- A CPU **limit** can stop the event loop via CFS throttling. For latency-sensitive tiers, drop the limit and set only an honest request, but keep the **memory limit equal to the request**.
- request is not usage; it is the **bill.** AWS charges you for nodes, not pods, and request determines the node count. An inflated heap multiplies across the fleet and turns into more expensive r-family nodes.

The body of the post is the evidence for each item. Let's start by taking apart that one line from the opening.

## request Is a Reservation, limit Is a Ceiling

This is the first mental model to put in place. If you read Kubernetes's `resources.requests` and `resources.limits` as "this is how much our service uses," you are off track from the start.

```yaml
resources:
  requests:
    cpu: '500m'
    memory: '256Mi'
  limits:
    cpu: '1'
    memory: '512Mi'
```

`requests` is a **reservation for scheduling.** The scheduler looks only at this value to decide which node to place the pod on (bin-packing). If the node does not have enough unreserved `requests` capacity left, the pod cannot land there no matter how low actual usage is. Autoscalers (HPA, and KEDA which we cover later) also compute how many pods to run by converting actual usage into a ratio against `requests`. In other words, `requests` is the **baseline for placement and scaling.**

`limits` has a different character. It is a cap on actual usage. And here CPU and memory split **asymmetrically.**

| Resource | When the limit is exceeded            | Enforcement mechanism                  |
| -------- | ------------------------------------- | -------------------------------------- |
| CPU      | **Throttling** (slows down, survives) | CFS quota tightens the time allocation |
| Memory   | **OOMKilled** (dies)                  | The kernel terminates the process      |

CPU is a time-shared resource, so if you go over, it can simply be given to you later. That is why exceeding the limit does not kill you but makes you **slow** (the enforcement mechanism is CFS, which we cover separately below). Memory cannot be reclaimed, so when a container exceeds the limit, the kernel just **kills it.** This asymmetry matters. If memory spikes to 593MB as in the opening measurement and the container limit is 512Mi, the service does not get slower. It gets restarted.

There is a point here that frontend developers easily miss. Node 24, helpfully, **reads the container's memory limit (cgroup) and automatically sizes the default heap to match.** With no flags at all, V8 sets its default heap ceiling based on available memory (constrained by cgroup in a container). The key point is that the smaller the constraint, the smaller the default ceiling (the exact ratio varies by Node version and environment, so it is safest to check directly in your pod). The problem is that this auto-adjustment **turns off, per flag, the moment you specify that heap flag explicitly.** The two flags' auto-adjustments are independent of each other, so only the specified one turns off, but the opening line specifies both, turning both off. The detailed mechanism and measured evidence are in the Old Space section.

To sum up, the knobs live on two layers. Kubernetes's `requests`/`limits` are the outer boundary, and the GC flags in `NODE_OPTIONS` determine how much memory V8 uses inside it. The opening line is the case where you leave the outside untouched and make only the inner flags heavy, so the inside ends up pushing against the outer boundary. Let's open up the inside first.

## New Space Is Not Reserved at Startup

The V8 heap splits broadly into two generations. **New Space** (the young generation), where newly created objects are born, and **Old Space** (the old generation), where objects that survive get promoted and stay long-term. Most objects die quickly, so V8 cleans New Space frequently with a very fast GC (Scavenge, the minor GC) and promotes only the surviving few to Old Space.

What `--max-semi-space-size` touches is this New Space. The reason semi-space is in the name is the key. New Space consists of **two semi-spaces**, called `from` and `to`. Scavenge runs the Cheney algorithm: it copies only the live objects in `from` over to `to`, empties `from` wholesale, and swaps their roles. Since half must always be kept empty as the copy destination, physically **both semi-spaces must be committed.**

So `--max-semi-space-size=256` does not mean "New Space at 256MB." It means "**one semi-space at up to 256MB.**" The actual committed New Space ceiling is close to twice that, 512MB. Measure it yourself and this 2x relationship shows up exactly.

| `--max-semi-space-size` | Max committed New Space | peak RSS | Actual live data (Old Space) |
| ----------------------: | ----------------------: | -------: | ---------------------------: |
|                 default |                  128 MB |   201 MB |                      20.3 MB |
|                      16 |                   32 MB |   104 MB |                      20.3 MB |
|                      64 |                  128 MB |   201 MB |                      20.3 MB |
|                     128 |                  256 MB |   332 MB |                      20.4 MB |
|                     256 |                  512 MB |   593 MB |                      20.3 MB |

There is a way to read this. Going down the New Space column, it is exactly 2x the semi value: 16→32, 64→128, 128→256, 256→512. Node 24's default on my laptop, with no memory constraint, is around semi 64MB (the default row in the table is identical to the semi=64 row), already larger than the 16MB commonly cited in the past. Inside a container, however, V8 sets this default **much smaller to match the memory limit.** According to the [official Node documentation](https://nodejs.org/docs/latest-v24.x/api/cli.html#--max-semi-space-sizesize-in-mib), at a 512MiB limit the default semi goes down to **1MiB**, and below 2GiB it stays under 16MiB. And when you specify `--max-semi-space-size` explicitly, that shrinking is ignored and your value is used as-is. In other words, hardcoding 256 in a small pod means multiplying the default by tens of times, and against a 512MiB pod, by **256x**.

> As a side note, when V8 **computes the heap ceiling**, it budgets the young generation's share not at 2x semi but at **3x**. On top of the two semi-spaces, it reserves one more semi's worth for the new large object space, where large newborn objects go (the `YoungGenerationSizeFromSemiSpaceSize` in V8 that the official docs cite). Indeed, measuring `v8.getHeapStatistics().heap_size_limit` on this machine gives 4288MiB by default (= old ceiling 4096 + 3×64), 4480 with semi=128 (= 4096 + 3×128), and 4864MiB with semi=256 (= 4096 + 3×256), following the 3x arithmetic exactly. The committed New Space itself (from/to) can be read as 2x, as in the measured table above.

But what really matters is the **rightmost column.** While semi grows 16x from 16 to 256, the actually surviving data (Old Space) is **immovable at around 20MB.** The workload is unchanged. The only thing that grew is the New Space buffer, and that buffer goes straight into RSS. At semi=256, RSS reached 593MB, which is 3.0x the default (201MB). This is the identity of the two numbers from the opening. What grew was not data but the buffer.

And the idle RSS before applying load was the same regardless of the semi value. A bare Node process sits at 40MB, and even with semi=256 it is still exactly 40MB. The New Space buffer is **not reserved at startup.** It grows lazily toward the cap as allocations come in and Scavenge runs. That is why this problem reveals itself not right after deployment but after traffic attaches. If you look only at the idle graph at deploy time and judge everything fine, the alert comes much later.

> In one sentence: **`--max-semi-space-size` is the size of the spare buffer the GC gets to use, not of actual data.** Even if the data is small, the buffer honestly eats exactly that much memory.

### The Evidence in trace-gc

Turn on `--trace-gc` and this shows up right in the logs. Here are the Scavenge logs from running the same allocation load with semi=16 and semi=256.

```text
# --max-semi-space-size=16
Scavenge  30.3 (47.3)  -> 16.9 (47.3)  MB  ...

# --max-semi-space-size=256
Scavenge 278.5 (535.8) -> 29.6 (535.8) MB  ...
```

It is worth being precise about how to read this. The **left** of the arrow is the value right before GC, the **right** is right after, and the parentheses are the committed size. The caveat is that these numbers are not just New Space but the **entire V8 heap including Old Space** (at first I misread them as New Space sizes myself).

With that premise, two things become visible. First, the right side (post-GC) is similar in both cases, at the 17-30MB level. That includes the roughly 20MB cache resident in Old Space, which means the amount of actual live data is independent of the setting. Second, the left side (pre-GC) differs 9x, 30MB versus 278MB. Subtracting the Old Space share, the short-lived objects piled up in New Space right before Scavenge were about 16MB and about 258MB respectively, which matches the size of one semi-space (16MB/256MB) exactly. Scavenge runs when a semi-space fills up. As a bonus, the parentheses at semi=256 (535.8MB) are the committed heap size, and the 512MB New Space buffer sitting inside it is the physical evidence.

Raising semi is an instruction that says "don't clean up until New Space fills to this much." For a heavy service, this can be a win. Less GC means saved CPU and reduced latency. But the price is a **large, permanently committed buffer.** A light service does not allocate enough to enjoy that latency benefit, yet pays the buffer cost in full. This difference in **shape** is why the same setting is tuning for a heavy service and waste for a light one.

## Old Space Is Determined by Traffic, and the Ceiling Is Not a Reservation

We also need to cover the other half of the opening line, `--max-old-space-size=3072`. There is a common misunderstanding here: "I gave it 3072, so it reserves 3GB."

No. `--max-old-space-size` is a **ceiling, not a reservation.** Old Space is where objects promoted from New Space accumulate after surviving, so its actual size is determined by **how many objects live long**, that is, by traffic and data retention. Hold a lot of cache or keep large per-request objects alive for a long time and it grows; discard quickly and it stays small. Give it 3072 and if you do not actually use that much, that much is not claimed. In this post's measurements too, Old Space stayed around 20MB. `--max-old-space-size=3072` contributed almost nothing to the memory increase in the opening. The culprit was `--max-semi-space-size`.

That does not make `--max-old-space-size` harmless. The real problem is that it **turns off Node's container awareness for Old Space.** As we saw in the previous section, Node 24 sizes the Old Space ceiling to the container memory automatically when the flag is absent. But give it `--max-old-space-size=3072` and that auto-adjustment disappears; whether the container is 512Mi or 8Gi, the ceiling is pinned at 3GB. If the container limit is smaller than 3GB, V8 keeps growing the heap believing it still has room, and the kernel kills the process first.

Here is the measured evidence for the earlier claim that "only the specified flag turns off." Measuring `heap_size_limit` per combination on this machine gives:

```text
No flags                                  : 4288 MiB  (old 4096 + 3×semi 64, both automatic)
--max-semi-space-size=256 only            : 4864 MiB  (old ceiling 4096 preserved as-is)
--max-old-space-size=3072 only            : 3264 MiB  (default semi 64 preserved as-is)
Both specified                            : 3840 MiB  (3072 + 3×256, auto-adjustment wiped out)
```

Specify only one side and the other side's auto-detection stays alive. For reference, the 4288MiB with no flags is the local value without cgroup constraints; inside a container it lands much smaller.

Death splits into two kinds here. When V8 hits its own heap ceiling, it throws `FATAL ERROR: ... JavaScript heap out of memory` with a JS stack. That is a V8 heap OOM. When the container's cgroup limit is exceeded, the kernel sends SIGKILL and the container dies with exit code 137 as `OOMKilled`. No JS stack. The latter is far more common and much harder to root-cause, because nothing lands in the logs and the pod just restarts.

So the practical rule is simple. **Rather than forcing the container heap with flags, leave it to Node's container awareness, or if you must set it, set it below the container limit with non-heap headroom left over.** For this, Node also has `--max-old-space-size-percentage` (specify old space as a % of available memory, cgroup-constrained in containers).

Since non-heap came up, let's cover it. RSS is not just the V8 heap. Beyond New Space + Old Space, compiled code, external memory like `ArrayBuffer`/`Buffer`, native addons, and thread stacks all count toward RSS. The two GC flags control none of this non-heap memory. So `--max-old-space-size` must not be set equal to the container limit; you always need headroom for the non-heap share.

> In one sentence: **New Space is a fixed buffer "determined by settings," Old Space is variable data "determined by traffic."** That is why memory sizing has to move the settings and the container together.

## Interlude ①: The Memory Story So Far

A lot of internal terminology arrived at once, so let's take a break and organize it with a restaurant analogy.

| V8 world                      | Restaurant analogy                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| New Space buffer (`semi` × 2) | Size of the dish tub. **The owner (settings) decides**                                               |
| Old Space                     | Ingredients in the fridge. **The customers (traffic) decide**                                        |
| Scavenge                      | Doing the dishes when the tub fills. A bigger tub means fewer rounds, but                            |
| RSS                           | Total kitchen floor space. Enlarge the dish tub and the kitchen grows even with the same ingredients |
| Container memory limit        | Leased floor area. If the kitchen exceeds it, forced eviction (OOMKill)                              |

Three things to remember. First, `--max-semi-space-size` is the size of the **dish tub (buffer)**, not of data, so it eats that much memory even with the same customers. Second, this tub only grows toward its cap **once business starts (traffic attaches).** Third, `--max-old-space-size` is a ceiling, not a reservation, but the moment you specify it, **the auto-adjustment that matches it to the container size turns off.** That is the memory part; next is CPU.

## The CPU Ceiling of a Single Node Process

Having covered memory, let's move to CPU. There is an intuition error here that frontend developers trip on often: "The pod is slow, so let's raise the CPU limit to 4."

Node.js does not work that way. JavaScript runs on a **single thread** (the event loop). So pure JS computation cannot exceed **1 core** no matter how busy it gets. Measure it directly and it comes out cleanly. The measurement computes `cores used = CPU time / wall-clock time`.

| Workload                                                          | Wall clock (ms) | CPU (ms) | cores used |
| ----------------------------------------------------------------- | --------------: | -------: | ---------: |
| Pure JS computation (single thread)                               |            3000 |     2984 |   **0.99** |
| JS + short-lived allocation (SSR-like, mostly dies immediately)   |            3000 |     3049 |   **1.02** |
| JS + heavy surviving allocation (promotion pressure, parallel GC) |            3000 |     9625 |   **3.21** |
| Async crypto ×16 (thread pool 4)                                  |             235 |      920 |   **3.91** |
| Async crypto ×16 (thread pool 8)                                  |             157 |     1170 |   **7.45** |

The first row is the key. Pure JS saturates at 1 core. Even allocating masses of objects that **mostly die quickly**, SSR-style, as in the second row, barely moves it, at 1.02 cores. The third row, though, was the discovery of this measurement run. When I created masses of long-surviving objects to pressure promotion, V8's parallel Scavenge and concurrent marking threads kicked in and it climbed to **3.21 cores.** The often-quoted "about 1.25 cores" is a rough estimate of JS's 1 core plus a GC/JIT share; not only is it an official constant found nowhere in Node or V8, that GC share itself is not a constant but depends on the **shape of allocation.** Mostly short-lived, and it is around 0.03 cores; heavy promotion, and it exceeds 2 cores. React SSR's string rendering creates mostly short-lived objects during render, so in practice it often idles near 1 core, and the commonly observed 0.1-0.3 core overage is closer to incidental thread-pool offload, like per-request compression or crypto, stacked on top.

Then what are 3.91 and 7.45? Work that **goes down to the libuv thread pool**, like `crypto.pbkdf2`, `zlib`, and file I/O. Only these can use multiple cores, up to the thread pool size (`UV_THREADPOOL_SIZE`, default 4). But SSR component rendering, JSON serialization, and template assembly all run on the JS main thread. They do not go down to the thread pool. That is why the CPU bottleneck in frontend services is almost always that 1-core wall.

So "1.25 cores" is fine as a starting point for the CPU **request**, but pinning it as the **limit** is dangerous. Services that compress responses with gzip/brotli (zlib) or hash tokens (crypto) legitimately exceed 1 core via the thread pool, and in promotion-heavy moments the GC threads eat cores too. A tightly wound CPU limit in that state comes back as CFS throttling. This is where the assumption "it can't possibly exceed 1.25 cores" goes wrong.

The conclusion points in a different direction. **When JS CPU falls short, scale out processes, not the container.** Run more pods (horizontal scaling), or add workers via cluster within a pod. Raise the CPU limit to 2 or 4 and the single event loop can still use only 1 core's worth. The rest is reserved capacity sitting idle.

## CFS Throttling: A CPU limit Can Stop the Event Loop

Earlier I said pinning 1 core as the limit is dangerous, and the mechanism is CFS (Completely Fair Scheduler, the Linux kernel scheduler that divides CPU time among processes) throttling. It is worth knowing.

Kubernetes's CPU limit is enforced via the kernel's CFS quota. It works like this: every 100ms by default (`cpu.cfs_period_us=100000`), the container is granted `limit_cores × 100ms` of CPU time. With a limit of 1 core, you can spend 100ms worth per 100ms period. If that quota runs out within the period, the container is frozen until the next period, **no matter how many idle cores the node has.**

Here is why Node is vulnerable. JS is single-threaded, but the process is not. The libuv thread pool we saw earlier (gzip/brotli compression, crypto) and V8's concurrent GC and JIT threads use multiple cores simultaneously in short bursts (the "promotion pressure" row in the CPU table above is exactly this picture; the process crossed 3 cores once GC threads attached). In a 100ms window where requests pile up, GC runs, and response compression overlaps, a 1-core quota drains in an instant, and then **the event loop thread freezes along with everything else.** The classic picture of average utilization at 60% with p99 latency spiking is this. Averages hide throttling.

That is why a common prescription in practice for latency-sensitive Node tiers is to **drop the CPU limit and set only an honest request.** The AWS EKS best practices documentation outright recommends not setting resource limits on CPU. Keep the request as the basis for scheduling and fair sharing, and remove the limit to allow bursts. The trade-off is losing noisy-neighbor isolation and Guaranteed QoS, so if multi-tenancy is tight, there is a middle ground: set the limit comfortably above the request so throttling does not engage. Either way, **keep the memory limit equal to the request.** Memory is an incompressible resource, so exceeding it means OOMKill, not throttling.

> **QoS class**: the grade (Guaranteed/Burstable/BestEffort) Kubernetes assigns based on a pod's request/limit settings. If request and limit are equal, it is Guaranteed. When a node comes under memory pressure, this grade decides which pods get evicted first.

Also, `container_cpu_cfs_throttled_periods_total` is a value worth watching. The ratio of throttled periods to total periods is the empirical gauge: above 5%, latency effects reportedly start appearing; above 20%, users can feel it.

> In one sentence: **A CPU limit is not "you may go this fast," it is "use this much and you stop."** For Node, where bursts are normal, it hurts especially.

## Traffic Is Absorbed by Pod Count

This leads naturally to the third mental model. **Traffic spikes are absorbed by pod count, not by per-pod memory buffers.**

The graphs of a service with autoscaling show this well. Even as traffic swings severalfold over a day, per-pod workload (memory, processing time) moves only within a narrow band. When traffic goes 8x, one pod does not do 8x the work. The **number** of pods grows to share the load, and each pod still handles a similar volume of requests.

Why does this matter? Because the common response, "let's give pods generous memory to prepare for spikes," points in the **wrong direction.** Doubling per-pod memory does not stop a spike. A spike is a problem of concurrent request count, and that is absorbed by horizontal scaling (pod count). Growing per-pod memory, like the GC buffer we saw earlier, **only raises the always-on cost and gives no spike resilience.** The place to invest headroom is not per-pod buffers but **autoscaling slack and speed.**

### Workloads Where Traffic Really Does Take Up Memory

Of course, there is a premise behind this. **Per-pod memory must not grow in proportion to concurrent request count.** Stateless SSR/BFF that receives a request, renders, sends the response, and is done generally satisfies this. A single request's context lives for tens to hundreds of milliseconds, so at any moment the pod holds little memory. But there are certainly workloads where traffic translates directly into pod memory.

- **Long-held connections.** With WebSocket, SSE (Server-Sent Events), or long polling, each connection keeps a socket buffer and session object resident in the pod. At 10,000 concurrent connections, memory for those 10,000 connections stays claimed. What makes it trickier is that connections are pinned to specific pods, so **adding pods does not move already-established connections to the new pods.** Scale-out works only for new connections.
- **Buffering whole payloads.** If large uploads or downloads are processed fully in memory rather than streamed, usage grows as concurrent requests × payload size. Ignoring stream backpressure (slowing production to match consumption) while sending large responses to slow clients does the same thing.
- **In-flight requests piling up behind a slow downstream.** When the API behind you lags, contexts of in-progress requests keep accumulating in the pod. This is the moment latency turns into queueing, and queueing into memory.
- **In-memory state that grows with traffic.** Put an unbounded cache or per-user sessions in process memory, and now Old Space follows traffic.

With these workloads, per-pod memory cannot be treated as a constant independent of traffic. But I do not think the answer is to circle back to "generous memory." The direction is to **make per-pod capacity a constant, and turn it back into a problem of count.** For connection-oriented workloads, fix a maximum connection count per pod and use connection count itself as the scaling signal (KEDA, coming up later, is strong with these custom signals). Stream payloads through to eliminate buffering, put timeouts and concurrency caps on downstream latency, and bound caches (LRU) or move them to external stores like Redis. Only when per-pod usage is predictable do memory limits and scaling math hold up.

Two caveats attach, though. First, this automatic absorption holds **only when you scale on a signal correlated with traffic.** Scale on CPU or request rate (RPS); **scaling on memory breaks with Node.** V8 RSS does not come down much even when traffic drains. It holds the heap at its high-water mark and returns pages to the OS only very slowly. So memory-based HPA can neither scale Node up properly nor down. Second, autoscalers react slowly. The HPA sync period defaults to 15 seconds, and a new pod takes tens of seconds including cold start (the preparation time from a pod launching to receiving its first request). In the meantime, **the leading edge of a sudden spike is ultimately absorbed as queueing by the existing pods' slack.** So the floor set by `minReplicaCount` is still necessary. The point is not to keep zero headroom, but to not keep it in per-pod heap buffers.

## With cluster, the Reservation Multiplies

Say you decide to use cluster to break through the CPU ceiling: running multiple worker processes in one pod to use multiple cores. Here the opening problem **recurs as multiplication.**

Each cluster worker is an **independent V8 instance.** They do not share a JS heap. So the GC reservation we saw earlier, the New Space buffer, is paid separately per worker. I set `--max-semi-space-size=128`, increased the worker count, and measured total RSS under the same load.

| Workers | primary RSS | Peak RSS per worker |    Total RSS |
| ------: | ----------: | ------------------- | -----------: |
|       1 |       43 MB | 333                 |       376 MB |
|       2 |       43 MB | 333, 334            |       710 MB |
|       4 |       45 MB | 333, 334, 628, 631  | 1672~1970 MB |

The primary is fixed around 43MB, and one worker costs about 333MB (semi=128's 256MB New Space plus cache and base). Add workers and total memory **multiplies linearly.** But at 4 workers something worse was also observed repeatedly. Some workers whose major GC fell behind due to core contention spiked to around 630MB momentarily, and the total oscillated between 1.7GB and near 2GB. The multiplication does not stop at linear; when things get crowded, it can get worse.

This is the truly dangerous version. If a heavy `NODE_OPTIONS` tripled memory in a single process, **in cluster that multiplier is multiplied again by the worker count.** Run 8 workers with a large `--max-semi-space-size` and the New Space buffers alone reserve several GB permanently. In a cluster, GC flags actually need to be set **more conservatively.**

> In one sentence: **cluster multiplies CPU, but it multiplies memory reservations too.** Worker count and `NODE_OPTIONS` always have to be calculated together.

## Interlude ②: The CPU Story So Far

Let me compress the CPU part into an analogy as well. A Node process is a shop with a single checkout counter.

- **JS is one checkout counter.** No matter how fast the clerk (event loop) is, it cannot use more than 1 core. If checkout lines grow, the answer is not a wider counter but **more branches (pods).**
- **The thread pool is the packing crew.** Only specific jobs like compression (zlib) and encryption (crypto) get handed back to use multiple cores. SSR rendering cannot be handed over.
- **GC is the cleaning robot.** Usually unnoticeable (short-lived allocation +0.03 cores), but when long-kept items accumulate, several robots run at once and eat cores (measured up to +2 cores or more).
- **The CPU limit is a timed circuit breaker.** Use up the quota granted every 100ms and the whole shop freezes, clerk included. So it is safer to drop the limit or set it generously, and set the request honestly.
- **cluster is multiple checkout counters in one store.** Checkout capacity grows, but each counter comes with its own dish tub (New Space buffer).

Next is the operations part: how many processes to put in a pod, and who should look after those processes.

## How Many Processes per Pod: Who Is the Supervisor

Having seen memory multiply with cluster, let's get to the fundamental question. Should a pod run just one Node process, or several (cluster workers)? This is a frequent point of divergence on frontend teams.

First, let's fix the frame. The real decision variable is not "1 process or N," but **how many CPU cores you give one pod.** Give a pod 4 cores and run a single Node, and 3 cores sit idle (JS has a 1-core ceiling). So the question becomes: **do we slice pods into roughly 1-core pieces and run many, or pack multiple workers into big pods?**

The default is **a roughly 1-core pod with one process, scaling by replicas (pod count).** That is the side that hands the supervisor role fully to Kubernetes. Why this wins becomes clear when you list what packing loses.

- **Probes and restarts are per container, not per worker.** A probe is the kubelet's periodic check of whether a container is alive (liveness) and ready for traffic (readiness). With one process, a crash becomes a visible container restart, captured in `restartCount` and `CrashLoopBackOff`. Hide N workers behind one container, and the kubelet sees only one health signal and cannot restart the one worker that went dead.
- **The cgroup memory limit is also per container.** In a packed pod, if one worker leaks memory, **its sibling workers all get OOMKilled together.** K8s records it as one lumped `OOMKilled`.
- **SIGTERM goes to PID 1.** With one process, the termination signal reaches Node directly and it ends with a single drain (the topic of the next section).
- **Bin-packing runs on requests.** Roughly 1-core pods slot neatly into node gaps and get consolidated by Karpenter. Fat N-core pods demand contiguous N-core holes, fragment nodes, and block consolidation.
- **Blast radius and rollout unit**: small pods are 1/N of capacity; fat pods are N at a time.
- **Compute cost is independent of topology.** EC2 on-demand pricing is linear per vCPU within a family, so 8 cores cost the same whether used as eight 1-core pods or one 8-core pod. What packing saves is only the **fixed per-pod overhead**, not compute.

> **Karpenter**: AWS's node autoscaler. It looks at pods' requests, launches the needed EC2 instances on the fly, and merges away underused nodes (consolidation). More flexible in instance selection and packing than the older Cluster Autoscaler.

So how big is the per-pod fixed overhead? Measured, a bare Node process is about 40MB, and a minimal HTTP server 43MB. Add a sidecar (an auxiliary container running alongside the main one in the pod; for example, the Envoy proxy of the Istio service mesh at about 40MB) and one VPC IP. Packing saves exactly this much. So "many small pods" is not free. Slice too finely and you hit the per-node IP and pod-density ceilings before CPU saturates. The cost-correct default is **roughly 1-core pods with honest requests, in a reasonable count, consolidated by Karpenter**, not slicing infinitely fine.

Let me clear up a common confusion here. **"Big node" and "big pod" are separate things.** The benefits of big nodes (fewer DaemonSets, that is, per-node pods, and fewer system-reserved copies, plus less control plane load) are fully captured by putting **many small single-process pods on big nodes.** What worker packing adds on top is only the per-pod overhead (sidecar + base RSS + IP). So before moving to worker packing, the right order is to first measure whether that specific overhead is actually large.

There are cases where packing is justified. Usually one of three. (1) When a **sidecar mesh** runs a proxy per pod and the overhead is large. Note that Istio's ambient mode moves the proxy to a per-node daemonset, eliminating this reason; fixing the mesh comes first. (2) **IP/ENI exhaustion.** An ENI is EC2's network interface, which limits how many IPs a node can hand to pods. Note that prefix delegation (receiving IPs in /28 blocks, up to 16x) is AWS's recommended fix and usually beats packing. (3) **AWS Fargate.** One pod is one node, so there is no bin-packing at all. This is the strongest reason, and we return to it in the cost section.

If you really do pack, use the **built-in `node:cluster` or `worker_threads`, not pm2**, and **pin the worker count to the CPU limit** (never `-i max`). Why not pm2 is exactly the next section.

## Should You Use pm2 on Kubernetes

Many teams put pm2 inside the container out of VM-era habit. The conclusion first: **it is better not to nest a second supervisor-plus-autoscaler inside Kubernetes.** But this should not be misread as "pm2 is bad." First, it is only fair to look at what pm2 does well.

pm2 was loved in the VM era for good reason. It automatically revives crashed processes, restarts workers with zero downtime via `pm2 reload`, uses multiple cores in one line with cluster mode, collects and rotates logs, restarts workers that exceed memory (`max_memory_restart`), and shows process state on a dashboard. On a single server without an orchestrator, all of this needs to exist, and pm2 does it well.

The problem is that Kubernetes already has that orchestrator. Every single thing pm2 provides is provided in K8s one layer up, usually better.

| What pm2 provides               | What K8s already does                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| Automatic crash restart         | `restartPolicy` + kubelet; restarts surface in `restartCount` and `CrashLoopBackOff` |
| Zero-downtime deploy (`reload`) | Rolling Deployment; replaces pods with the new image                                 |
| Cluster mode (multi-core)       | Scale with replicas; `node:cluster` inside the pod if truly needed                   |
| Restart on memory overrun       | Memory limit + OOMKill                                                               |
| Log collection and rotation     | stdout → node log agent (Fluent Bit and the like)                                    |
| Metrics and dashboard           | Prometheus / OTel                                                                    |

The right column does not just replace the left; it does so **at a higher layer.** A K8s restart is an event the whole cluster sees, and a K8s zero-downtime deploy is an image replacement tracked by GitOps. Put pm2 inside the pod again, and the same events happen **inside** the pod boundary, invisible from outside. It does not stop at overlapping features; the second layer blinds the first layer's eyes.

The claim "pm2 is an anti-pattern" points the right way but is too categorical. Precisely, two things need separating. Nesting a redundant supervisor inside K8s is fundamentally wrong. But the one uniquely valuable thing pm2 offers inside a pod, **"using multiple cores in one pod,"** is done more cleanly and dependency-free by `node:cluster`. So the reasons to really need pm2 narrow.

If you do use pm2, **`pm2-runtime` is mandatory** (neither bare `pm2` nor `npm start` will do). A bare `pm2 start` detaches into a daemon and goes to the background, so as PID 1 the container either exits immediately or the workers run unsupervised. `pm2-runtime` stays in the foreground as a "node binary replacement" that handles PID 1 signals and graceful shutdown.

But the moment you insert pm2, several **bug seams that do not exist in a native single process** appear. Every one of them bites in practice.

- **Signal mismatch.** The default termination signal pm2 sends workers is **SIGINT**, while K8s sends **SIGTERM.** A standard drain handler listening only for SIGTERM is **silently never called.** You have to align it with `PM2_KILL_SIGNAL=SIGTERM`. (Drain: the cleanup procedure of finishing in-flight requests while accepting no new ones.)
- **`kill_timeout` defaults to 1600ms.** Far shorter than K8s's 30-second grace. K8s would wait longer, but pm2 SIGKILLs a draining worker after 1.6 seconds. Raise it to match your drain budget, but keep it below `terminationGracePeriodSeconds`.
- **Hidden OOMKills.** The cgroup OOM killer targets the process with the largest RSS (a worker), not the slim pm2 PID 1. pm2 revives that worker and the container stays up, so **K8s gets no exit 137, no `OOMKilled`, no restart count.** The signals an autoscaler or VPA (a tool that auto-adjusts pod requests to actual usage) would consult vanish wholesale. Natively, an OOM is a first-class pod event.
- **Liveness and readiness go blind.** Probes hit one shared port and any healthy worker answers. Even with a worker that is dead or crash-looping, health checks pass, and pm2's internal restarts neither bump `restartCount` nor raise `CrashLoopBackOff`.
- **Memory multiplication.** Each worker is a full V8 process. Put `-i max` on a 4-core pod and the single-process footprint, including the roughly 2×semi New Space we saw, is claimed about 4 times over. A limit sized for one process gets OOMKilled per worker.

In particular, **`-i max` (or `0`) is a landmine.** It forks as many workers as detected CPUs, but `os.availableParallelism`/libuv long returned the **host core count**, not the cgroup quota (libuv #4146). So on a 2-core pod atop a 64-core EKS node, `-i max` forks up to 64 workers, one per logical core, and heads straight into CFS throttle hell and tail latency explosions. **If you use cluster, it is safest to pin the worker count to the CPU limit. Avoid `max`.**

The "PID 1 problem" often cited to justify pm2 is real, but pm2 is not the answer. Run Node directly as PID 1 and the kernel installs no default SIGTERM handling (because it is the init process), and zombies need reaping too. But this is solved cheaply with a single line of **`tini`/`dumb-init` or Docker's `--init`** plus an explicit `process.on('SIGTERM')` handler. You get signal handling and zombie reaping without pm2's double-supervisor side effects.

There is also the argument that **"restarts are faster than K8s."** To get the facts straight first: yes, they are faster. When a pm2 worker dies, forking one process again inside an already-running container is all it takes, so it comes back in 1-2 seconds while the remaining workers keep taking traffic. On the K8s side, the first restart itself is also fast, a few seconds, since the kubelet relaunches the container on the same node, but with repeated crashes, `CrashLoopBackOff`'s exponential backoff kicks in (starting at 10 seconds, up to 5 minutes), and after a restart, traffic only flows once the readiness probe passes. The more crash-prone a service, the more the gap really does widen.

But this argument deserves being turned over three times. First, that speed is exactly the hiding described above. If restart speed has become important, crashes are frequent, and pm2 revives while erasing that signal from K8s's eyes. Fast restarts fix the symptom; the cause of the crashes remains. Second, with enough replicas, one pod's restart speed never reaches the user. While one pod is out, the rest absorb it. If restart speed is deciding your availability, that reads less like a signal that pm2 is needed and more like a signal that replicas are insufficient. Third, the same speed is available without pm2. In `node:cluster`, wiring `cluster.fork()` to the worker's `exit` event gives identical instant respawns. In the end, fast restarts are not pm2's unique value either.

So why separate the layers? pm2's strengths are real, but they are real **when there is no orchestrator.** On K8s you already get those strengths one layer up, and stacking pm2 on top gives you the strengths a second time in exchange for **losing the observability signals** of restarts, OOMs, and crashes. Even the only non-overlapping piece, "multi-core in a pod," is covered by `node:cluster`. In the end, removing pm2 loses you nothing (K8s does it all), and adding it loses you observability. So split the layers: **supervision to K8s, the application as one Node per pod.** The narrow cases where pm2 is genuinely needed match the packing conditions of the previous section (Fargate and the like), and even then `node:cluster` beats pm2.

> In one sentence: **the only thing pm2 uniquely offers on K8s is "multi-core inside a pod," and `node:cluster` does that more cleanly.** Everything else is either a duplicate of what K8s already does, or a side effect that blinds K8s.

## Graceful Shutdown: SIGTERM Has to Reach PID 1

The point where topology choice turns into reliability is shutdown handling. It is also a common reason frontend services leak 5xx on every rollout.

The order in which a pod dies goes like this. When a deletion request arrives, the API server starts the grace period, and **the kubelet sends SIGTERM to PID 1.** It then waits `terminationGracePeriodSeconds` (default 30 seconds) before SIGKILL. In between, Node should receive SIGTERM, stop new connections with `server.close()`, let in-flight requests flow to completion, and exit. Installing a handler replaces Node's default behavior (exit 143), which creates the window to drain. Without it, in-flight requests get cut off and clients receive 5xx.

Here the PID 1 trap reappears. Launch with `CMD npm start` or a shell-form CMD and PID 1 becomes `sh` or `npm`, and **these do not forward SIGTERM to their children.** The app never receives the termination signal, and the pod hangs for the full 30 seconds before being SIGKILLed. It repeats on every rollout. Launch `node` directly as PID 1 and the signal arrives, but with no default handling, SIGTERM is silently ignored unless you install a handler explicitly. The fix is an **exec-form JSON CMD with an explicit handler**, or `tini`/`--init`.

There is one more trap that never shows up in testing. At termination, the API server signals the kubelet (SIGTERM) and the endpoint controllers **simultaneously, with no ordering.** So even after receiving SIGTERM, **new requests keep arriving** until iptables and load balancers converge (what that convergence actually is was later filled in with measurements in [the traffic part](/en/2026/08/k8s-for-frontend-3); in that environment it averaged 0.76 seconds). `server.close()` alone is not enough (there is an even deeper trap, busy keep-alive connections that close() cannot end, reproduced in [the life and death part](/en/2026/08/k8s-for-frontend-4)). You need the pattern of putting a sleep in the `preStop` hook so routing drains out first, and only then starting the drain. When this was first written, the convention was running a `sleep` command inside the container for 10-20 seconds (AWS documentation also uses `sleep` as its example); since v1.34 the native sleep action has been GA, needing no sleep binary and only the manifest, and the seconds can be derived from your cluster's measured propagation latency instead of convention ([the life and death part](/en/2026/08/k8s-for-frontend-4) used the measured 0.76s to set 3 seconds and drove convergence-window refusals to zero). And set `terminationGracePeriodSeconds` larger than `preStop sleep + longest in-flight drain + buffer`.

If you use pm2, all of this section's traps (signals, kill_timeout, PID 1) circle back into the pm2 configuration problems of the previous section. With a single process, they never exist in the first place.

## Interlude ③: The Operations Story So Far

The heart of the operations part is that "there should be only one caretaker."

- **One supervisor, Kubernetes, is enough.** Put a second manager like pm2 inside the pod, and that manager quietly cleans up accidents (OOMs, crashes) on the inside, leaving the outside (K8s, autoscalers, monitoring) blind.
- **One Node process per pod, about 1 core** is the default. Scale with pod count (replicas). Packing workers into a pod is an optimization for when there is a clear reason, like Fargate.
- **The termination signal must reach the owner (PID 1) directly.** Put `npm start` or a shell in between and the signal disappears midway, leaking 5xx on every rollout. Exec-form CMD, a SIGTERM handler, and a preStop sleep come as a set of three.

Now let's tie this understanding into an actual sizing procedure.

## The Three Axes of Sizing: CPU, Memory, Pod Count

Bundling everything we have seen into a sizing procedure gives three axes.

**CPU request.** Fit it to peak actual usage at p90. As we saw, a single process ceilings near 1 core for JS, so setting the request above 1 core is usually waste. If 1 core is not enough, go to pod count or worker count, not a bigger request. Inflate the request beyond actual usage (over-reservation) and the cluster misjudges "CPU is full" beyond reality and adds nodes unnecessarily. **An honest CPU request keeps the cluster's resource judgment honest.**

**Memory.** The working set consists of New Space (a fixed buffer determined by settings) + Old Space (variable data determined by traffic) + non-heap. Decide `--max-semi-space-size`, `--max-old-space-size`, and the container limit **together.** Copy any one of them in isolation and the picture we saw earlier reproduces itself.

**Pod count.** Divide the total CPU demand by what one pod can handle.

```text
pods = ceil( total CPU demand / (CPU request per pod × target utilization) )
```

Target utilization is the target the autoscaler holds (say 70%). Treat one pod as doing `request × 0.7` worth of work, divide total demand by it, and you get the required pod count. This is the same calculation as the formula HPA uses internally, `desiredReplicas = ceil(currentReplicas × currentUsage / targetUsage)`, flipped around from a sizing perspective. Both say the same thing: adjust the count so one pod works at the target level.

But this formula is a **steady-state approximation**, not an exact value. HPA does not adjust at all within a default ±10% of target (the tolerance dead-band), so the actual pod count settles into a band around the formula's value. Also, each pod has fixed overheads (runtime, heap base, sidecars), so total demand is not perfectly proportional to pod count. So use this value as a lower-bound estimate for `minReplicas`/`maxReplicas`, and it is safer to size headroom against **per-pod peak**, not the average.

### How to Measure the Shape of Your Service

In the end, everything in this post is a story of measuring instead of copying. The procedure is short.

1. Put the real service under load and run it with `--trace-gc`.
2. Read Old Space right after a major GC. That is the true working set.
3. Set memory request and limit equal, at `Old Space + New Space (about 2×semi) + non-heap headroom`.
4. **Leaving `--max-semi-space-size` alone is the default.** Raise it only when GC CPU is measured to actually be the bottleneck.
5. Fit the CPU request to peak at p90, and if latency matters, drop the CPU limit or set it comfortably above the request.

Instead of copying someone else's `NODE_OPTIONS`, run these five lines against your own service and you get your numbers, not guesses.

### What to Measure with a Load Test, and What Not To

There is a way of measuring that comes to mind first. Put load on one pod, watch the memory graph climb until it stops, and take that point as the pod size. It may look like the measurement this post recommends, but **reading RSS under load as-is makes for a poor sizing basis.** The reasons come in three layers.

- **Most of the RSS curve under load is the New Space buffer filling lazily, not data.** In the earlier measurements, the same workload (20MB of live data) registered anywhere from 104MB to 593MB depending on the semi setting. Where the graph plateaus is not what the service needs, but the ceiling at which that setting decided to postpone cleanup.
- **A circularity appears.** Node 24 reads the container limit to set the heap ceiling, so measuring in a big pod makes V8 set a big heap, RSS comes out big, and you size a big pod again based on that. The measurement is a function of pod size, so this method does not converge; it only inflates. V8's reluctance to return risen RSS to the OS cements the illusion.
- **Memory in the saturation regime is queueing cost, not per-request cost.** Push one pod to its limit and after the event loop hits the 1-core ceiling, in-flight requests pile up and memory climbs. In production, the autoscaler adds pods to absorb load before that point, so you would be measuring a state you will never experience in practice and using it to set an always-on size.

Does that mean don't load test? The opposite. The five-line procedure above is itself measurement under load. The problem is not the load but **which value you read.** Designed correctly, it looks like this.

1. **Measure under production-identical conditions.** Run in a pod with the same container image, the same `NODE_OPTIONS`, and the candidate request/limit. Since V8 sizes the heap to the container limit, values measured on a laptop or in a roomy pod take a different shape from the production pod.
2. **Set the load level to target utilization, not saturation.** Hold a steady state near the target the autoscaler will hold (say 70% of CPU request). This is the state one pod will actually experience in production.
3. **Run long.** The New Space buffer grows lazily, so short tests underestimate the peak. Run until the heap settles into a steady state (plateau), and if it keeps climbing with no plateau, that is not a sizing problem but a leak.
4. **Read memory as Old Space right after GC.** In `--trace-gc`, the value right after a major GC is the true working set, and adding about 2×semi plus non-heap headroom gives the memory limit. Peak RSS under load has one narrow use: verifying, as a **lower-bound check**, that the limit exceeds it under the current settings.
5. **Run saturation tests separately, with a different goal.** Deliberately pushing one pod to its limit is a valid test. But the value to read there is not memory; it is **one pod's maximum throughput (the RPS ceiling) and the latency shape at that point**, and this number calibrates your feel for the denominator in the pod count formula.

> In one sentence: **in a load test, read memory as "Old Space right after GC," not "RSS under load."** What a saturation test tells you is not the pod's memory size but one pod's throughput ceiling.

## Splitting Predictable Load and Spikes with KEDA

Fix the pod count statically and swinging traffic gives you either waste or shortage. Autoscaling is needed, and frontend traffic mixes two characters: **predictable cycles** (a daily pattern rising during commute hours and falling overnight) and **unpredictable spikes** (events, sudden inflows). KEDA (an open-source project that extends HPA so it can also scale on event signals like cron or queue length) catches these two with different triggers.

KEDA internally creates and manages an HPA, layering event-driven scalers on top. Predictable cycles get a timetable via the **cron scaler.**

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: ssr-frontend
spec:
  scaleTargetRef:
    name: ssr-frontend
  minReplicaCount: 3
  maxReplicaCount: 40
  triggers:
    - type: cron
      metadata:
        timezone: Asia/Seoul
        start: '0 8 * * *' # from 08:00
        end: '0 23 * * *' # until 23:00
        desiredReplicas: '12' # keep a floor of at least 12
    - type: cpu
      metadata:
        type: Utilization
        value: '70' # above that, add more when CPU exceeds 70%
```

The cron trigger lays the pod floor down ahead of commute hours, eliminating initial latency from cold starts. Predicted load is answered with prediction. And the cpu trigger layered on top catches unexpected spikes in real time. Between the two triggers, whichever demands more pods wins. The predictable part by timetable, the rest reactively. This is what "traffic is absorbed by pod count" looks like when carried into operations.

## AWS Cost: request Is the Bill

Everything so far (honest requests, roughly 1-core pods, an uninflated heap) eventually meets in money. The skeleton of EKS cost is simple. **You pay for nodes (EC2 instances), not pods.** The control plane is a flat \$0.10 per cluster-hour on standard support (always verify prices), and most of the cost is EC2. And **request determines** how many nodes you run. The scheduler, Cluster Autoscaler, and Karpenter all bin-pack on requests. Not actual usage, not limits.

Let's fix a common misconception precisely here. "Inflating requests raises the EC2 bill immediately" is a **step function, not linear.** Nodes are paid for by the machine, so a small request increase adds **\$0 of cost until you cross a bin boundary** and force one more node (or a bigger one). Moreover, bin-packing is two-dimensional, so **only the binding resource shows up in billing.** On a node that fills up on memory first, over-reserving CPU is free, and vice versa. Node SSR/BFF usually **binds on memory first** because of per-worker V8 New Space. So before talking dollars, the right order is to measure which dimension is saturated.

The second lever is the **instance family.** The memory-per-vCPU ratio is fixed: c family 1:2, m family 1:4, r family 1:8 (GiB/vCPU). The problem is that the r family costs about 48% more per vCPU than c and about 31% more than m (2026 us-east-1 on-demand; always verify prices). **Inflate the heap and New Space and pods get pushed onto the r family because of memory.** Honestly shrinking memory requests toward 2-4GiB per vCPU lets the same pods pack onto cheaper m/c, and since this both reduces node count and lowers the family tier, it is usually the **single highest-leverage cost reduction.** Building for arm64 (Graviton) takes off roughly another 20% on top.

This is the substance of "the resource bottleneck decides the optimization direction." A memory-bound cluster is forced onto the r family, and honest memory sends the cluster back to c/m.

### The Arithmetic That Turns an Inflated semi-space into a Node Bill

Let's get a feel with numbers. This is purely illustrative arithmetic, and the fleet size and the "memory is binding" premise are chosen values, not measurements.

Say you copied the opening's flags across a fleet. In this post's measurements, `--max-semi-space-size=256` made each process use about 390MB more peak RSS than the default (201MB → 593MB, a delta of 392MB, mostly the New Space buffer's share). Spread that over **100 processes** and about **39GB** disappears as pure reservation. If memory is the binding dimension, 39GB is roughly **60% of one r7i.2xlarge (8vCPU/64GiB).** That is an instance costing about \$390 per month on-demand, or about \$160 on Spot (EC2 that can be reclaimed mid-run in exchange for deep discounts) (2026 figures, verify). **One line of a flag, multiplied across a fleet, becomes more than half of a memory-optimized node and hundreds of dollars of standing monthly spend**, and that money buys nothing.

Finally, two things. **On Fargate the economics invert.** Fargate has no bin-packing, since one pod is one node, and **bills the pod's request directly.** On top of that, it adds a 256MB overhead to the request and then **rounds up** to fixed configurations (AWS's example: a 1vCPU+8GB request rounds up to 2vCPU+9GB, doubling the vCPU cost). So on Fargate, over-reservation is charged immediately, continuously, and per pod, and the packing we saw earlier (multiple cores in one pod) finally earns its keep. Conversely, **on EC2-based EKS, honest requests + Karpenter consolidation + Spot (up to 90% off, well suited to stateless SSR/BFF) + a Savings Plan baseline (committed-usage discounts)** is also the cleanest cost-wise. Layer on **KEDA's scale-to-zero** (shrinking to 0 pods when there is no traffic; plain HPA cannot go to 0) and Karpenter's empty-node removal, and the idle-fleet cost of frontend traffic that sleeps overnight disappears.

> In one sentence: **request is not usage; it is the bill.** Honest requests pack more tightly onto cheaper instance families, and an inflated heap multiplies across the fleet into the node bill.

## A Checklist You Can Run Tomorrow

The post ran long, so here are just the checks you can apply to your service right away. Each item is one command plus a criterion for "if it comes out like this, there is something worth fixing." Replace `deploy/my-app` with your own service name as you read.

**1. Start by checking the `NODE_OPTIONS` of the pods running right now.**

```bash
kubectl exec deploy/my-app -- printenv NODE_OPTIONS
```

If a value is there and nobody can explain its origin and rationale, it may well have been copied from somewhere without verification. In particular, if `--max-semi-space-size` is set high, compare the New Space buffer (about 2x) against the pod's memory limit.

**2. See how V8 perceived the container.**

```bash
kubectl exec deploy/my-app -- node -p "require('v8').getHeapStatistics().heap_size_limit / 1048576"
```

If this value (MiB) exceeds the container memory limit, V8 believes it has more heap than it really does, and an OOMKill is close to pre-booked. Considering the non-heap share, it needs to be comfortably below the limit to be safe.

**3. Look for a history of quiet OOMKills.**

```bash
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].restartCount}{"\t"}{.status.containerStatuses[0].lastState.terminated.exitCode}{"\n"}{end}'
```

Exit code 137 means OOMKill. If the restart count is 0 but pm2 runs inside the pod, it is worth suspecting worker OOMKills hiding behind pm2.

**4. See what PID 1 is.**

```bash
kubectl exec deploy/my-app -- ps -o pid,comm -p 1
```

If it is `sh` or `npm`, SIGTERM is likely not reaching the app. Change the Dockerfile CMD to exec form (JSON array) or put `tini` in front. If it is `node`, also confirm a `process.on('SIGTERM')` handler actually exists.

**5. Measure the CPU throttle ratio.** (If you have Prometheus)

```text
rate(container_cpu_cfs_throttled_periods_total[5m])
  / rate(container_cpu_cfs_periods_total[5m])
```

Above 5%, the CPU limit may be affecting latency. Consider removing the limit or raising it generously.

**6. Check what the HPA scales on.**

```bash
kubectl get hpa -o yaml | grep -B2 -A6 "metrics:"
```

If it is a Node service scaling on memory, scaling is likely not working properly (V8 does not readily return RSS). Consider switching to CPU or RPS based.

**7. Check the cluster/pm2 worker count.**

Check the code and manifests for `-i max` (pm2) or forks based on `os.availableParallelism()`. If the worker count exceeds the pod's CPU limit, workers can explode on big nodes and lead to throttling. Pin the worker count to a constant equal to the CPU limit.

**8. Look at the shutdown handling configuration.**

```bash
kubectl get deploy my-app -o yaml | grep -A6 "lifecycle:"
```

If there is only `server.close()` with no `preStop` sleep, 5xx can slip in during rollouts (per-configuration failure counts are measured in [the life and death part](/en/2026/08/k8s-for-frontend-4)'s staircase table). Also confirm that `preStop sleep + drain time < terminationGracePeriodSeconds` holds.

## Measure, Don't Copy

There was no trick to one line of a flag tripling memory. Behaviors the runtime always had simply followed the configured values honestly, and the problem lay in copying values around without knowing those behaviors. Laying out what the post confirmed leaves this.

- **`request` is a reservation, `limit` is a ceiling.** Neither is actual usage. Request is the baseline for placement and scaling, and exceeding a limit is asymmetric: **throttling** for CPU, **OOMKill** for memory.
- **`--max-semi-space-size` grows the GC buffer, not data.** New Space is two semi-spaces, so it commits up to **about 2x** the setting, pushing RSS up even with live data unchanged. This buffer grows **lazily under load.**
- **`--max-old-space-size` is a ceiling, not a reservation**, and traffic determines the actual size. Node 24 reads the container limit and sizes the heap automatically, but specifying a flag turns off that awareness for that flag's share. If you must set it, **set it below the container limit with non-heap headroom** to avoid OOMKills.
- **JS in a single Node process ceilings at 1 core.** When CPU falls short, add **processes/pods**, not a bigger container. "About 1.25 cores" is a rough estimate, not an official constant, and the GC share moves from 0.03 cores to over 2 cores depending on the shape of allocation. Wind the CPU **limit** tight and CFS throttling stops the event loop.
- **cluster multiplies memory reservations along with CPU.** Calculate worker count and `NODE_OPTIONS` together.
- **One process = one pod (about 1 core)** is the default, with K8s as the only supervisor. Packing is an optimization for Fargate, mesh, or IP pressure, not the default. pm2's fast worker restarts are equally available via `node:cluster`'s `exit` + `fork`, so use `node:cluster` pinned to the CPU limit instead of pm2, and solve PID 1 and SIGTERM with `tini`/`--init`.
- **Traffic spikes are absorbed by pod count, not per-pod buffers.** Put the headroom in autoscaling, not inside the pod. But scale on CPU or RPS; scaling on memory breaks with Node.
- **In load tests, read memory as Old Space right after GC, not RSS under load.** RSS under load is a function of GC settings and pod size, so it circles as a sizing basis, and what a saturation test tells you is not the pod's memory size but one pod's throughput ceiling.
- **request is the bill.** Honest requests pack more tightly onto cheaper instance families. An inflated heap multiplies across the fleet into node costs.

If I leave one line, it is this. **There is no "standard" configuration. Configuration has to fit the shape of the service (traffic, allocation patterns, process model), and the moment you copy a value fitted to someone else's service, it becomes a wrong value for yours.** If you are curious about the neighboring team's `NODE_OPTIONS`, I think the right order is to first ask whether their service has the same shape as yours, before copying.
