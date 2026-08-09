---
title: 'How Do Pods Terminate? Measuring the Causes and Fixes of Deploy-Time Errors'
tags:
  - kubernetes
  - nextjs
  - nodejs
  - frontend
  - devops
published: true
date: 2026-08-08 23:00:00
description: 'Even a deploy that changes not a single line of code leaks errors. This is a measured record of tagging every failure that leaks during rolling deploys by type and timestamp, performing an autopsy on four causes, and stacking prescriptions one layer at a time until the count reaches zero. Includes the actual Next.js shutdown code, hostage draining, and the real CrashLoopBackOff timetable. Part 4 of the Kubernetes for frontend developers series.'
thumbnail: /thumbnails/2026/08/k8s-for-frontend-4.png
series: 'Kubernetes for Frontend Developers'
seriesOrder: 4
---

## Table of Contents

## Nothing Changed, Yet Errors Happen

On a service whose error-rate graph spikes at every deploy, the first question is usually "what changed this time?" So this experiment began by eliminating that question at the source: leave the code, image, and configuration untouched, and repeatedly run `kubectl rollout restart`, which only swaps the pods, under constant traffic. The deploy artifact is identical, so any errors cannot be the code's fault.

Result first: with the exact app from [Part 3](/en/2026/08/k8s-for-frontend-3), graceful shutdown properly built in and all, errors appeared every single time. With two clients pushing requests at 120ms intervals (one opening a new connection per request, one reusing keep-alive connections) and deploys repeated, out of roughly 370 samples per run, the new-connection client saw 1 to 4 ECONNREFUSED and the keep-alive client saw 3 ECONNRESET each time. Small numbers, but the types and timestamps are uncannily consistent. The REFUSED cluster in the 1-to-3-second window right after the deploy; the RESET cluster just past the 30-second mark.

This was the question left at the end of Part 3. A living pod's readiness transition finished gracefully (826 requests, zero errors), but I wrote there was no guarantee dying would be as graceful. There wasn't. This post is the autopsy of those errors. There are four suspects: the PID 1 that swallows signals in transit, the Next.js rumored to die instantly on SIGTERM, the routing that learns of death late, and the client that grips connections to dead pods and won't let go. A spoiler: one of them is acquitted, and in its place a culprit the conventional wisdom never pointed at steps forward. After the autopsy, prescriptions get stacked one layer at a time until the failure count steps down like a staircase and lands on zero.

This is the fourth post in the "Kubernetes for Frontend Developers" series. If the vocabulary is unfamiliar, I recommend [Part 1's concept map](/en/2026/08/k8s-for-frontend-1) first, [Part 2](/en/2026/08/k8s-for-frontend-2) for what containers and pods are, and [Part 3](/en/2026/08/k8s-for-frontend-3) for the traffic path and conntrack.

> Measurement environment: colima VM (4 CPU/8GB) on Apple M5 macOS, kind v0.32.0 (kindest/node v1.36.1, Kubernetes v1.36.1), kube-proxy in iptables mode, app is Next.js 16.2.12 standalone (node:24-slim, Node v24.19.0), same as Part 3. This part's experimental Deployment runs 3 replicas with a 5-second readiness probe, and injects RESPONSE_DELAY_MS=400ms into page responses so in-flight requests straddle the termination window. One definition belongs up front: failures measured directly inside the cluster manifest as socket errors (ECONNREFUSED, ECONNRESET), not HTTP 5xx. They show up as 5xx on production dashboards because the load balancer or gateway in front translates upstream errors into 502/504. Measurement scripts and raw logs are archived separately.

## The Examination: What Happens While a Pod Dies

The first step of an autopsy is recording the body's state as-is. Under constant traffic I took down one pod with `kubectl delete pod`, observing every layer at roughly 0.2-second intervals (150ms sleep plus command execution time, the same measured cadence as Part 3) with Part 3's tools: the EndpointSlice conditions, the node's KUBE-SEP rule (the DNAT target), where real traffic went, and the container's final state.

| Event (T0 = delete issued)                                         | Time (measured)    |
| ------------------------------------------------------------------ | ------------------ |
| Last real traffic to the pod                                       | +0.12s             |
| Node's KUBE-SEP rule (DNAT target) disappears                      | +0.19s             |
| EndpointSlice flips: `ready=false, serving=true, terminating=true` | +0.20s             |
| Container exit observed, exit code **143**                         | within +0.75s      |
| Pod object gone                                                    | +1.6s              |
| Traffic errors produced by this termination                        | **0** (this round) |

Watch the conditions of this round carefully. The only traffic was the client opening a new connection per request, and under that condition one pod's death wrapped up in 1.6 seconds with zero errors. Signal received (SIGTERM), drained (143), roster and rules cleaned inside 0.2 seconds. From this table alone, termination looks like a non-problem. The intro's errors appear when the real world's conditions (a keep-alive client and all 3 replicas churning at once) are layered on top, and that story returns as we walk the causes of death one by one.

The most important fact in this timeline is not the order but that **there is no order.** The instant deletion lands on a pod, two tracks depart simultaneously without waiting for each other. On one, kubelet sends the container SIGTERM; on the other, the EndpointSlice controller fixes the roster and kube-proxy rewrites every node's rules. Part 3 measured that propagation segment (roster update through rule application) with the official SLI metric at an average of 0.76 seconds, and this part's observation landed in the same sub-second range. The problem is that even that sub-second lags behind SIGTERM. The app has already been notified of its death while routing can still send new connections its way; a short window opens.

The third EndpointSlice condition, name-dropped and deferred in Part 3, also gets collected here. An endpoint entering termination is not deleted from the roster; it flips to `ready=false, serving=true, terminating=true`. Out of the traffic pool (ready=false), still able to respond (serving=true), in the middle of dying (terminating=true): the state of deathbed itself.

## Cause of Death 1: The Signal Arrived, but the Server Never Got It

The first suspect is the naive Dockerfile from the opening of [Part 2](/en/2026/08/k8s-for-frontend-2), precisely its last line, `CMD ["npm", "start"]`. Boot a container from this image and look inside: there is more than one process.

```text
$ docker exec naive-test ps -eo pid,ppid,comm,args
  PID  PPID COMMAND
    1     0 npm start
   18     1 sh -c next start
   19    18 next-server (v16.2.12)
```

PID 1 is npm, and npm holds the real server (next-server) as a grandchild through a shell. Hang a 5-second request on it and send SIGTERM:

```text
$ docker kill -s TERM naive-test
inflight: http=000 curl_exit=52 (empty reply, severed at the 1.5s mark)
container: exitCode=1, exited 0.72s after TERM
npm error command failed
npm error signal SIGTERM
```

Conventional wisdom says at this point "npm ignores the signal and the pod hangs 30 seconds until SIGKILL", but in this environment (npm 11, Node 24) that was only half right. npm does not ignore the signal. The problem was that it reacts too fast. On SIGTERM, npm logs an error and exits within 0.7 seconds, and once PID 1 vanishes, the kernel sweeps up the container's remaining processes. The in-flight 5-second request was severed at 1.5 seconds with an empty reply. **The server collapsed along with its falling ancestor without ever having received SIGTERM.** Even with drain code present, it never gets a chance to run.

Put this configuration on Kubernetes and repeat the deploy 6 times: 4 to as many as 12 failures per deploy across both clients, almost all ECONNRESET (severance), timestamps concentrated in the deploy window. There is an amusing side observation too: the listener vanishes so instantly that ECONNREFUSED is actually rarer than in configurations that close the listener gracefully. Dying fast and dying well are different things.

> **Prescription note**: Part 2's final Dockerfile is already the prescription. `CMD ["node", "server.js"]` makes the server process PID 1 directly. The signal reaching the server is the precondition for any draining at all.

## The Suspect Found Innocent: Next.js Does Not Die Instantly

The second suspect is Next.js itself. The story that "the standalone server drops in-flight requests and dies immediately with `process.exit(0)` on SIGTERM" circulated for years, and [issues from the era when it really behaved that way](https://github.com/vercel/next.js/issues/38298) remain. But open the current source and the story differs. The shutdown handling in Next.js 16.2.12's `next/dist/server/lib/start-server.js`, verbatim:

```js
const cleanup = (signal) => {
  // ...(duplicate-signal guard omitted)
  ;(async () => {
    // first, stop accepting new connections and finish pending requests,
    await new Promise((res) => {
      server.close((err) => {
        /* ... */ res()
      })
      if (isDev) {
        server.closeAllConnections()
        // ...
      }
    })
    // ...(nextServer.close and trace cleanup omitted)
    // Exit with signal-based exit code (128 + signal number) ...
    switch (signal) {
      case 'SIGINT':
        process.exit(130) // breaks omitted from the original below
      case 'SIGTERM':
        process.exit(143)
    }
  })()
}
// Make sure commands gracefully respect termination signals (e.g. from Docker)
if (!process.env.NEXT_MANUAL_SIG_HANDLE) {
  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
}
```

On SIGTERM it stops accepting new connections via `server.close()`, waits for in-flight requests to finish, then goes down with 143, the conventional code for signal-based exit (128+15). I verified in Docker: hang a 5-second request, send SIGTERM at the 1-second mark. The request completed with 200 at 5.07 seconds, and the container exited 143 right after. Only requests newly arriving during the drain were refused. In short, **this version of Next.js is innocent.** If the signal actually reaches it, a graceful shutdown that protects in-flight work is built in by default.

Two interesting footnotes attach to this acquittal, though. First, `closeAllConnections()` (the Node API that force-closes open connections) in the source above sits inside an `isDev` condition. Only the dev server force-closes connections; production relies entirely on `server.close()` semantics, and the price of that choice surfaces in the hostage section below. Second, setting the `NEXT_MANUAL_SIG_HANDLE` environment variable skips the handler registration entirely. It still floats around blog posts as the fix from the old-issue era. So what happens if you set it today and register no handler of your own?

Here a rule peculiar to containers enters: **a PID 1 process ignores signals for which no handler is registered.** For a normal process SIGTERM's default action (terminate) applies, but the kernel does not apply default actions to PID 1. Measured directly: a container with only `NEXT_MANUAL_SIG_HANDLE=true` set does nothing on SIGTERM, keeps serving, and when the grace period runs out takes SIGKILL and dies with exit 137 (128+9). On Kubernetes this manifests as deploy time. Deploying this configuration 3 times, new pods were all up within 8 seconds, but the old pods took 34-38 seconds to disappear every time: terminationGracePeriodSeconds' default 30 seconds burned entirely on signal-ignoring. The true protagonist of the legendary "30-second hang" was not npm but this: a PID 1 with no handler.

> **Prescription note**: A rare case where the prescription is "do nothing." `NEXT_MANUAL_SIG_HANDLE` is a declaration that you will register your own handlers; if you have none to register, don't set it. The default cleanup already drains.

## Cause of Death 2: Routing Learns of Death Late

With two suspects sorted, a question remains: why does ECONNREFUSED still occur in a configuration where the signal lands correctly (node as PID 1) and draining works (Next defaults)? The answer was already in the examination's timeline. `server.close()` shuts the listener the instant SIGTERM arrives, but the DNAT rules pointing at the pod live nearly a second longer. New connections riding the routing into that window slam into a closed listener and get refused. This is why the measured REFUSED clustered only in the 1-3 seconds after deploy, the window where pods take their SIGTERMs in sequence.

The textbook prescription is the preStop hook: make the pod wait briefly before the termination signal, letting routing converge in the meantime. It used to require running a `sleep` command inside the container (meaning a sleep binary in the image), but since Kubernetes v1.34 the [native sleep action](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/) is GA and the manifest alone suffices. As for how many seconds: this series' measurements provide the basis. Part 3 measured propagation latency at an average of 0.76 seconds, so with margin multiplied in, I set 3.

```yaml
lifecycle:
  preStop:
    sleep:
      seconds: 3
```

The effect reproduced across 5 runs. **New-connection failures: zero, all 5 runs.** While SIGTERM is delayed 3 seconds, the pod keeps serving as usual and routing quietly finishes converging, so by the time the listener closes, no new connections are arriving. One caveat: these 3 seconds count against terminationGracePeriodSeconds. The longer the sleep, the less grace remains for draining.

> **Prescription note**: `lifecycle.preStop.sleep.seconds: 3` (v1.34+). The basis for the number is your cluster's measured propagation latency. Deriving it from the SLI metric (Part 3's network programming latency) is defensible in a way "5 seconds, roughly" is not.

## Cause of Death 3: Busy Connections Become Hostages

The prescriptions so far silenced the new-connection side, but the keep-alive client's 3 ECONNRESET (one per pod across 3 replicas) did not budge once in 5 runs. And their timestamps expose the nature of the incident: not the deploy window, but **30-32 seconds after the deploy, at grace expiry.**

Splitting the keep-alive traffic's responses by phase shows what happens. Long after leaving the routing (the window from 8 to 34 seconds post-deploy), the old pods kept receiving requests over keep-alive connections, handling 53-54 each. Part 3's conntrack pinning means existing connections ignore routing changes and keep flowing to their original pod, and that pod's `server.close()` was failing to close them. Then at the 34-second mark SIGKILL lands, and the requests riding those connections are severed with RST.

Why `server.close()` cannot close them is a matter of Node semantics, confirmed with a single-socket control experiment in Docker. A keep-alive socket that is idle closes immediately at SIGTERM (that is, at close()). But a socket mid-request at that instant is different:

```text
Handled up to TERM: 2 requests
Handled on the same socket for 6s after TERM: 19 (responses don't even carry Connection: close)
The client stops sending: drain completes at last, exit 143
```

**close() closes only connections idle at the moment of the call. Busy connections keep taking requests afterward, and the server waits indefinitely for the moment they happen to rest.** In BFF traffic where requests never pause, that moment never comes, so the drain never finishes and grace's 30 seconds acts as the ceiling, with SIGKILL as the closer. The footnote from earlier, `closeAllConnections()` being dev-only, pays its price here. Production Next.js has no public handle to end this hostage crisis from the server side.

Repeat the examination's single-pod experiment with only the traffic changed, and the whole hostage drama fits in one table:

| Same `delete pod`, traffic varied | New connections only   | keep-alive reuse               |
| --------------------------------- | ---------------------- | ------------------------------ |
| Pod object gone                   | +1.6s                  | **+30.4s**                     |
| Requests served while dying       | 0 (after routing exit) | **61** (last 200 at +29.1s)    |
| Severed requests                  | None                   | ECONNRESET at +29.5s           |
| Container exit code               | 143 (drain complete)   | **137** (grace-expiry SIGKILL) |

Same code, same config, same delete, and one habit of the client's connections splits a 1.6-second death from a 30.4-second one. As a bonus, the kubelet log during the hostage window records readiness probe connection refused: the listener is already closed so the probe fails while the pod keeps answering. Deathbed at its strangest.

This finding also breaks a piece of received wisdom about deploy duration. The old-pod drain time of the properly-working graceful configuration (C) was 33-34 seconds, identical to the configuration that ignores signals outright (B). As long as keep-alive clients exist, **"graceful shutdown" does not equal "fast shutdown."** Grace protects in-flight requests, nothing more; termination time is decided by hostage connections and the grace period.

Then who erases the final 3 RESETs? The server cannot, so the client remains. And in this series' premise, the keep-alive client is not a stranger; it is the BFF we own. The severed requests were GET (idempotent), so I added a client-side retry, one re-send on a fresh connection for connection-level failures only (ECONNRESET, ECONNREFUSED), and ran the same experiment 5 more times. **Zero failures; 1-3 requests absorbed by retry.** All 5 runs. The requests held hostage and severed completed their journeys over new connections on the already-running new pods. That the absorption is not 3 per run (one per pod) is a side effect of the retry itself: once the first retry plants a connection to a new pod in the pool, the odds of a request riding the remaining hostage sockets drop, and a socket severed while carrying no request leaves no error on the client; there is nothing to retry.

> **Prescription note**: Connection cleanup the server cannot finish falls to the client. Retry connection-level errors once on a fresh connection, idempotent requests only. Non-idempotent requests (POST etc.) must not be blindly retried, so also consider capping the lifetime of long-lived connections in the first place (the same direction as Part 3's skew mitigation).

## Stack the Prescriptions and You Reach Zero

The autopsy's findings, with prescriptions stacked one layer at a time, produce this post's final table: failure tallies from repeated deploys per scenario, same conditions throughout (new-connection and keep-alive clients simultaneously, 350-414 samples each per run; A's observation window was shorter at ~100 per run, but A's failures all fall inside the deploy window so the tally is unaffected). The +1 in the repeat column is a supplementary run under altered observation conditions (for A, measuring old-pod drain time; for C, a long observation with the window widened to 300 seconds).

| Configuration (cumulative)               | Runs | New-conn failures               | keep-alive failures         | Old-pod drain |
| ---------------------------------------- | ---- | ------------------------------- | --------------------------- | ------------- |
| A. naive (`npm start`, no signal)        | 5+1  | 0-7 (mostly RESET)              | 4-5 (nearly all RESET)      | instant (~4s) |
| B. signal ignored (handler-less PID 1)   | 3    | 0                               | RESET 3                     | 34-38s        |
| C. signal delivered + Next default drain | 4+1  | REFUSED 1-4 (6 in the long run) | RESET 3 (+occasional REF 1) | 33-34s        |
| D. C + preStop sleep 3s                  | 5    | **0 (all 5 runs)**              | RESET 3                     | 32-34s        |
| E. D + client idempotent retry           | 5    | **0**                           | **0** (retry absorbed 1-3)  | 31-33s        |

The axis to read is one failure type vanishing per step. Going from A to C, most of the severances (RESET) disappear, leaving the convergence-window refusals (REFUSED). D's preStop erases those. The 3 hostage severances that still remain are absorbed by E's client retry. It also matters that the steps are cumulative, not independent switches: if the signal never reaches the server (A), none of the later prescriptions get a chance to run.

One thing to state honestly is scale. This experiment's failures are single digits per deploy, around 1% of samples. The problem is not the size but the nature: these failures occur on every deploy for as long as there is traffic, their reproduction condition is "a deploy" so code review will never catch them, and they grow proportionally with traffic and replica count. And as the staircase shows, every one of them can be erased with configuration and a few lines of code.

## Interlude: The Order of Closing a Restaurant

Let me wrap the termination sequence so far in one analogy: how a well-run restaurant closes for the night.

| Closing the restaurant                              | Pod termination                                  |
| --------------------------------------------------- | ------------------------------------------------ |
| Flip the sign to "Closed"                           | EndpointSlice flips `terminating=true`           |
| The delivery apps delist the restaurant (staggered) | Each node's iptables update (propagation ~1s)    |
| The closing notice reaches the kitchen              | SIGTERM                                          |
| The notice dies at the floor manager's desk         | A PID 1 that swallows signals (Cause 1)          |
| Seated diners finish their meals                    | In-flight drain (`server.close()`)               |
| A regular keeps shouting "one more bowl!"           | Hostage drain of busy keep-alive conns (Cause 3) |
| Thirty minutes past close, lights out, doors locked | terminationGracePeriodSeconds expiry, SIGKILL    |

Two things to keep from the analogy: delisting from the delivery apps (routing) and the kitchen notice (signal) spread through different channels as separate events, and the lights-out time (grace) is not a cruelty but the ceiling for when "one more bowl" never ends.

## Another Death 1: When the Health Check Kills the Patient

Deploys are not the only way pods die. The most painful in practice is probe miswiring. Part 1 tabled the split (liveness failure restarts, readiness failure removes traffic), and here it gets verified by measurement. I built a "deep" health check `/api/health-deep` that also checks a downstream (internal-api, the Part 3 deployment), wired it to liveness in one deployment and readiness in another, then stopped internal-api for 100 seconds.

| Same 100s downstream outage | Deployment with it on liveness                  | Deployment with it on readiness |
| --------------------------- | ----------------------------------------------- | ------------------------------- |
| Container restarts          | **4-5**, enters CrashLoopBackOff (back-off 40s) | 0                               |
| Pod state                   | Churning through restarts                       | NotReady (traffic exit only)    |
| After downstream recovery   | Returns after back-off waits                    | Ready again immediately         |

The heart of this table: the app process was perfectly healthy on both sides the whole time. A process with no reason to die received a restart verdict every 15 seconds (5s interval x 3 consecutive failures) because of a neighbor's outage, and as restarts accumulated, the next section's back-off kicked in, slowing recovery further. A downstream outage is not cured by restarting this pod. The measured conclusion: liveness gets only the process's own survival; dependency state goes on readiness.

> **Prescription note**: livenessProbe points at a shallow endpoint that sees only the app itself. If you need dependency checks, wire them into readinessProbe. The recovery switch and the traffic switch are different circuits.

## Another Death 2: The Timetable of Repeated Deaths

When a pod dies on arrival repeatedly, kubelet widens the restart interval exponentially: the CrashLoopBackOff Part 1 described as "starting at 10 seconds, capped at 5 minutes." I measured the actual timetable with a container that exits 1 immediately, observed for 13 minutes:

```text
Restart times (relative): 0, 0, +13s, +40s, +86s, +172s, +337s, then "back-off 5m0s"
(One immediate restart follows the first crash; back-off starts after that)
Interval sequence: ~10 → 20 → 40 → 80 → 160 → 300s (cap) + 3-7s startup overhead
```

The textbook doubling sequence, stopping at 5 minutes, exactly as advertised. This measurement doubles as a verdict: [KEP-4603](https://github.com/kubernetes/enhancements/blob/master/keps/sig-node/4603-tune-crashloopbackoff/README.md), which lowers the default back-off to 1 second initial and a 1-minute cap, is in progress, so this timetable may change at some version, but at least v1.36's default is still 10 seconds and 5 minutes.

Exit-code reading also belongs here. This post's measurements alone produced four:

| exit code | Meaning                              | Where it appeared in this post                             |
| --------- | ------------------------------------ | ---------------------------------------------------------- |
| 0         | Clean exit                           | (Rarely seen during deploys, in fact)                      |
| 1         | App/wrapper error exit               | npm exiting on SIGTERM with an error (Cause 1)             |
| 143       | 128+15, voluntary exit after SIGTERM | Next's drain-complete signature                            |
| 137       | 128+9, force-killed by SIGKILL       | Grace exhausted (ignored signals, hostages), and OOMKilled |

The trap is that the same 137 has split causes: grace-exhaustion 137 and out-of-memory 137 share the number. Distinguish them with `kubectl describe`'s Reason (OOMKilled or not) and the memory context covered in the [sizing post](/en/2026/08/nodejs-k8s-pod-sizing).

## How Many May Die at Once? Rollout Stride and PDB

Everything so far was a single pod's death; the final question is herd management. How many pods a rolling update kills and spawns at a time is set by the Deployment's maxSurge (headcount-overrun allowance) and maxUnavailable (vacancy allowance). I contrasted the two extremes at 3 replicas:

| Stride (3 replicas)          | Ready pods during swap | Total pods        | To finish |
| ---------------------------- | ---------------------- | ----------------- | --------- |
| maxSurge=1, maxUnavailable=0 | **stays 3**            | up to 4 (overrun) | 3.4s      |
| maxSurge=0, maxUnavailable=1 | **drops to 2**         | stays 3           | 3.3s      |

Pod startup in this lab is sub-second so total time cannot distinguish them; the thing to watch is not the time axis but the capacity curve. The first row surges a new pod beyond headcount and only retires an old one per confirmed-ready replacement, so there is no vacancy at any point. The second row never exceeds headcount but runs one-third short throughout the swap. Unless node resources are too tight to permit the overrun, I see little reason for a user-facing service to refuse the vacancy-free first row. For reference, even when old pods stretch 30 seconds in the grace-exhaustion scenarios above, Ready counts and progress verdicts do not change: rolling-update progress is judged on new pods' readiness and Terminating pods are already excluded from the headcount math, though counting them means the instantaneous number of pods on the cluster can exceed the table's figures.

Then there is one more safety device that is easy to confuse: the PDB (PodDisruptionBudget) that Part 1 promised and deferred. Its definition, "the cap on how many pods may be down at once," gets it mistaken for a deploy-control device, so I verified the boundary by measurement. I attached a PDB demanding all 3 replicas (minAvailable: 3) and took pods down three ways. For the rolling-update case, I deliberately set the stride to maxSurge=0, maxUnavailable=1 so the experiment has teeth: with the vacancy-free stride above, Ready never dips below 3, and nothing would happen regardless of whether the PDB applies to deploys.

```text
# 1. eviction API (the path kubectl drain uses)
$ kubectl create --raw /api/v1/namespaces/default/pods/graceful-lab-.../eviction -f eviction.json
Error from server (TooManyRequests): Cannot evict pod as it would
violate the pod's disruption budget.

# 2. delete
$ kubectl delete pod graceful-lab-...
pod "graceful-lab-..." deleted

# 3. rolling update (maxSurge=0, maxUnavailable=1: a stride that genuinely violates the budget)
$ kubectl rollout restart deploy/graceful-lab
(Ready drops to 2 during the swap, violating minAvailable: 3, yet the PDB does not stop it; it completes)
```

Only eviction (the API used by voluntary disruptions like node drains) is refused; delete and the rolling update pass straight through the PDB. The rolling update in particular broke the PDB's demanded 3, dropped to Ready 2, and never paused. **PDB is a safety device against administrative operations, unrelated to deploy stride.** Reducing simultaneous vacancies during a deploy is maxUnavailable's job; preventing the service from emptying out during node maintenance is PDB's.

> **Prescription note**: For a user-facing service, consider maxUnavailable: 0 (vacancy-free swaps) as the default, and attach a PDB separately for node operations (drains, upgrades). They are non-overlapping insurance policies.

## The Final Assembly

Collect the prescription notes and this whole post compresses into three files. Each line's source section is in the comments.

```dockerfile
# Dockerfile (runner stage)
ENV HOSTNAME=0.0.0.0        # Part 2: the pod-IP bind trap
CMD ["node", "server.js"]   # Cause 1: the server itself becomes PID 1 and receives signals
# Do not set NEXT_MANUAL_SIG_HANDLE (acquittal section: let the default drain work)
```

```yaml
# Deployment excerpt
spec:
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0 # stride section: swap with no vacancy
  template:
    spec:
      terminationGracePeriodSeconds: 30 # hostage section: the ceiling when draining can't finish (includes preStop)
      containers:
        - name: app
          lifecycle:
            preStop:
              sleep:
                seconds: 3 # Cause 2: wait out routing convergence (measured 0.76s) before SIGTERM
          readinessProbe:
            httpGet: {path: /api/health, port: 3000} # probe section: if you need dependency checks, move this probe to a separate deep path
          livenessProbe:
            httpGet: {path: /api/health, port: 3000} # probe section: liveness sees only the app's own survival; if readiness gets a deep path, keep this one separate
```

```js
// The BFF's internal calls (excerpt): only the client can erase Cause 3's hostage severances
// Idempotent requests only; connection-level errors only; one retry on a fresh connection
const RETRIABLE = new Set(['ECONNRESET', 'ECONNREFUSED', 'EPIPE'])
async function getWithRetry(url) {
  try {
    return await fetchOnce(url)
  } catch (e) {
    if (!RETRIABLE.has(e.cause?.code)) throw e
    return await fetchOnce(url, {freshConnection: true})
  }
}
```

## Wrap-up: The Order of Death

The autopsy's findings, restated in clue order:

- **Termination is not a sequence but a race.** SIGTERM and the routing update do not wait for each other, and EndpointSlice flips `terminating=true` instead of deleting the pod. Deploy-time errors are rooted in this race.
- **The naive image's crime was severance, not the 30-second hang.** npm collapses its tree 0.7 seconds after SIGTERM, and the server never sees the signal. Conversely, a handler-less PID 1 ignores the signal and burns the full 30 seconds. Two pieces of folklore swapped places under measurement.
- **Next.js 16 is innocent.** Draining via `server.close()` and exiting 143 on SIGTERM is the default, with the footnote that force-closing connections is dev-only.
- **preStop sleep 3s erased the convergence-window refusals.** The number's basis is Part 3's measured propagation (0.76s average).
- **Busy keep-alive connections become hostages.** close() shuts only idle sockets; old pods lived 30 extra seconds off the routing, served 53-54 requests each, then got severed by SIGKILL. This is why even graceful deploys take 34 seconds, and why only a client retry can erase the last 3 errors.
- **Liveness miswiring restarts a healthy process every 15 seconds.** A 100-second dependency outage stacked 5 restarts plus back-off; the readiness-wired twin just exited traffic and returned instantly.
- **CrashLoopBackOff is the 10→20→…→300s sequence (v1.36 default).** KEP-4603 is shrinking that timetable, and a 137 needs its Reason before you call the cause.
- **PDB is unrelated to deploys.** It blocks only eviction, letting delete and even budget-violating rolling updates through. Deploy vacancies belong to maxUnavailable; administrative vacancies to PDB.

With this part, one pod's lifetime now runs from birth (Part 2) through traffic (Part 3) to death (this post). What remains is the story of the herd's size fluctuating. Pods that scale-down retires ride this very termination sequence, and on the far side of scale-out ticks another clock: "until the new pod takes its first request." How long does HPA make you wait on that clock? [The next part, on autoscaling](/en/2026/08/k8s-for-frontend-5), takes a stopwatch to those segments.
