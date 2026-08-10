---
title: "Autoscaling Is Automatic but Not Instant: HPA's Timeline, Measured Segment by Segment"
tags:
  - kubernetes
  - autoscaling
  - nextjs
  - nodejs
  - frontend
published: true
date: 2026-08-10 12:00:00
description: "Raise traffic 12x and it takes 31.5 seconds for a new pod to receive its first request. I pulled an itemized bill for those 31.5 seconds with a stopwatch: the structure dominated by the detection window, the conditions under which the autoscaler goes blind in the five minutes right after a deploy, the scale-down staircase, why memory-based HPA misfires on Node, and KEDA's preemptive scaling. Part 5 of the Kubernetes for frontend developers series."
thumbnail: /thumbnails/2026/08/k8s-for-frontend-5.png
series: 'Kubernetes for Frontend Developers'
seriesOrder: 5
---

## Table of Contents

## The Spike Alarm and 31.5 Seconds

Imitating the graph of a morning traffic rush, I raised the request rate of the experiment cluster from 10 to 121 requests per second in one step. HPA (CPU 70% target) was in place. Here is the record from the stopwatch that started at that moment. HPA noticed the target was exceeded and rewrote replicas 22.5 seconds later, the 4 new pods were created within the same second as that decision, and they became Ready 22 to 23 seconds in. And the new pods **received their first real request 31.5 seconds in**. The load in between was carried entirely by the existing 3 pods, and p95 slid from 9ms to 74ms, only coming back down after the expansion finished.

In [Part 1](/en/2026/08/k8s-for-frontend-1) I wrote a single line, "scale-out is automatic but not instant," and moved on. This post is the itemized bill for that line. It breaks down which segments make up the 31.5 seconds, and which of them can and cannot be shortened, stopwatch in hand. But let me say up front: this mild picture is not the whole story. When I pushed the load higher, a stretch appeared where the autoscaler stopped responding entirely. At first it looked like a vicious cycle where the very overload blinds the autoscaler, but the autopsy turned up one more accomplice. That story belongs to the second half.

This is the fifth post in the "Kubernetes for Frontend Developers" series. If the vocabulary is unfamiliar, I recommend [Part 1's concept map](/en/2026/08/k8s-for-frontend-1) first, [Part 2](/en/2026/08/k8s-for-frontend-2) for pods and containers, [Part 3](/en/2026/08/k8s-for-frontend-3) for the traffic path and conntrack, and [Part 4](/en/2026/08/k8s-for-frontend-4) for how pods terminate.

> Measurement environment: colima VM (4 CPU/8GB) on Apple M5 macOS, kind v0.32.0 (kindest/node v1.36.1, Kubernetes v1.36.1), metrics-server (15-second resolution), app is Next.js 16.2.12 standalone (node:24-slim, Node v24.19.0), same as the previous parts. The experimental Deployment inherits [Part 4's final assembly](/en/2026/08/k8s-for-frontend-4) (preStop sleep 3s, no-vacancy stride, readiness 5s) but with requests lowered to CPU 200m / limit 400m. That value exists to create a scale where "scale-out actually recovers latency" on a single machine with only 4 physical cores. HPA is autoscaling/v2, CPU 70%, min 3 / max 12. Load was driven open-loop (fixed request rate) from a client pod inside the cluster. Pre-validation taught me that closed-loop load (fixed concurrency) produces ~150rps with just 4 concurrent workers and wakes HPA before the experiment even starts, and open-loop, where the arrival rate holds even as responses slow down, is also the more faithful model of a real traffic spike. KEDA is v2.20.2, and images are pulled from a local registry (registry:2) attached to the kind network. HPA controller source quotes are pinned to the kubernetes v1.36.1 tag. Measurement scripts and raw logs are archived separately.

## The Autoscaler Is a 15-Second Loop

To break the time down, we first need the shape of the loop. The HPA controller wakes once every 15 seconds (the default), reads the target pods' metrics, computes one formula, and rewrites the Deployment's replicas if needed. The formula is all of this:

```text
desiredReplicas = ceil( currentReplicas × current utilization / target utilization )
```

If 3 pods are running at 140%, double the 70% target, then ceil(3 × 140/70) = 6. Three things are worth noting here.

First, **the "utilization" in the denominator is relative to requests.** This is where the connection previewed in [Part 1](/en/2026/08/k8s-for-frontend-1) gets confirmed by measurement: the ratio is against requests, not limit, so this experiment's pods (requests 200m, limit 400m) can reach 200% utilization. If requests drift away from actual usage, the entire formula is off.

Second, **the metrics being read already carry two layers of delay.** metrics-server scrapes kubelet's stats every 15 seconds (this cluster's `--metric-resolution=15s`), and HPA reads that every 15 seconds again. Depending on how the two loops' phases interlock, it takes up to around 30 seconds for HPA to "see" a load increase. If the spike starts right after a scrape, you wait up to 15 seconds for the next scrape, and up to another 15 for that value to catch HPA's next decision cycle. In the measurements below, this detection window turns out to be the dominant term of the total delay.

Third, **there is an ignore band called tolerance.** If the current/target ratio is within ±0.1 of 1.0, HPA does not move. This is why replicas do not flap while utilization wanders between 70 and 77%. Interestingly, this 0.1 was a cluster-global setting for a long time, but on this experiment cluster (v1.36), putting `spec.behavior.scaleUp.tolerance` on an individual HPA object was accepted and stored as-is. That means the [per-HPA tolerance](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/) that entered as alpha in v1.33 is alive behind a default-on gate. Here is the record of checking it directly.

```text
$ kubectl patch hpa autoscale-lab --type=merge \
    -p '{"spec":{"behavior":{"scaleUp":{"tolerance":"0.2"}}}}'
horizontalpodautoscaler.autoscaling/autoscale-lab patched

$ kubectl get hpa autoscale-lab -o jsonpath='{.spec.behavior.scaleUp}'
{"policies":[{"periodSeconds":15,"type":"Pods","value":4},
 {"periodSeconds":15,"type":"Percent","value":100}],
 "selectPolicy":"Max","stabilizationWindowSeconds":0,"tolerance":"200m"}
```

Stored without rejection (0.2 is written in quantity notation as "200m"). As a bonus, this dump is also the original text of the next paragraph's default expansion policy, "4 pods or 100%, whichever is larger, every 15 seconds."

And there is **behavior**, which filters the computed result once instead of applying it directly. By default, scale-up moves up to "4 pods or 100% of current, whichever is larger" every 15 seconds, and scale-down moves only to the maximum of the values computed over the last 300 seconds (the stabilization window). Scale up fast, scale down carefully. We will see the scale-down device in the flesh in the scale-down section below.

That is the whole loop. What matters is that HPA's job ends at **rewriting the replicas number**. Actually launching pods is the chain from [Part 2](/en/2026/08/k8s-for-frontend-2) (Deployment → ReplicaSet → scheduler → kubelet), and traffic reaching the new pods is the world of [Part 3](/en/2026/08/k8s-for-frontend-3) (readiness → EndpointSlice → each node's rules). The time from spike to first request is the sum of these three layers.

## Stopwatch Breakdown: An Itemized Bill for 22.5 Seconds

Let me unfold the opening measurement segment by segment. The conditions: with a baseline of 10 requests per second flowing, at T0 I added 111 more per second (121rps total, roughly 12x). Observation used 0.5-second polling, the timestamps in pod conditions, and the pod name carried in each response.

| Segment (T0 = spike start)                       | Time (measured)          | Duration  |
| ------------------------------------------------ | ------------------------ | --------- |
| HPA first observes utilization >70%, desired 3→7 | +22.5s                   | **22.5s** |
| 4 new pods created (scheduling done)             | +21 to 22.5s (same time) | ~0s       |
| New pods Ready (readiness passed)                | +22 to 23s               | **1-2s**  |
| First real traffic reaches a new pod (fastest)   | +31.5s                   | +9s       |
| p95 recovers (74ms peak → 60ms stable)           | around +45s              | -         |
| Second expansion (desired 7→8, one pod added)    | +51s                     | -         |

Pod creation is the result of HPA rewriting replicas, so it cannot precede detection, yet in the records the creation time appears first at +21s. Pod creation timestamps are truncated to the second, and the HPA field is read by 0.5-second polling that shows up about a second late: a rounding gap between channels. The real order is "desired written → pods created within the same second," and the first two rows of the table also survive as HPA event originals.

```text
$ kubectl get events --field-selector involvedObject.kind=HorizontalPodAutoscaler ...
08:22:34  New size: 7; reason: cpu resource utilization (percentage of request) above target
08:23:04  New size: 8; reason: cpu resource utilization (percentage of request) above target
```

Errors: 0 out of 24,265 requests, and p95 slid from a 9ms baseline to 74ms in the first 15 seconds, then settled around 60ms. Three things to take from this table.

First, **detection dominates.** Of the total 31.5 seconds, 22.5 were "until HPA noticed." It is the phase gap of the 15-second scrape stacked on the 15-second decision, so this segment lands near 15 seconds when you are lucky and stretches to 30 when you are not. By contrast, pod creation through Ready finished in 1 to 2 seconds. With the image already on the node (preloaded) and a light app, startup is not the bottleneck.

Second, **Ready and first traffic are different events.** Tracking the five new pods one by one makes the gap visible.

| New pod (from T0)     | Created | Ready | First real traffic |
| --------------------- | ------- | ----- | ------------------ |
| #1                    | +21s    | +23s  | **+31.5s**         |
| #2                    | +21s    | +23s  | +58.2s             |
| #3                    | +21s    | +22s  | +97.4s             |
| #4                    | +21s    | +22s  | +168.9s            |
| #5 (second expansion) | +51s    | +57s  | none in window     |

Ready finished all at once within 1 to 2 seconds, but first requests scattered from 31 to 169 seconds, and one pod never got work at all. It is exactly what [Part 3](/en/2026/08/k8s-for-frontend-3) showed. Distribution happens only once, at connection birth: connections already established over keep-alive stay pinned to the old pods, and a new pod gets work only when a new connection opens. Counting the distribution two minutes after the spike, the surviving 3 original pods held 54% of the traffic, and the busiest pod differed from the idlest by 3.4x (1,940 vs 577). Replica count grew to 8, but the load did not spread evenly: evidence that scale-out and load balancing are separate things.

Third, **what holds the fort in between is the existing pods.** During the 22.5-second detection window, the existing 3 pods absorbed a 12x load. This time they held at p95 74ms; what happens when they cannot hold is the blindness section below. This window is why the [sizing post](/en/2026/08/nodejs-k8s-pod-sizing) says to set minReplicas by "spike absorption headroom."

## Can We Launch Faster? Three Interventions

With the bill itemized, let me intervene in each segment. Same spike, conditions changed one at a time.

**Intervention 1: keep pods up in advance (minReplicas 6).** Keeping 6 up before the spike made expansion itself unnecessary; desired was already 6 before T0. Yet the first 15 seconds of p95 came out at 75ms, effectively identical to the base experiment that started from 3 (74ms). This spike could be carried by 3 pods, so the pre-provisioned headroom never showed on the latency graph. The value of pre-provisioning lies not in normal-time latency but in **headroom for the limit case**, and that limit case arrives in the blindness section.

**Intervention 2: launch big at once (behavior tuning).** I loosened the scaleUp policy from "4 per 15 seconds" to "up to 12 per 15 seconds" and repeated the same spike. I expected desired to jump from 3 straight to 12, but the measurement was a staircase: 3→5 (+22.6s)→7 (+37.4s)→10 (+82.5s)→12 (+128s). behavior only lifts the cap; each cycle's desired is still set by the formula. The utilization observed at the first decision was 101%, so ceil(3 × 101/70) = 5 (in the base experiment that first observation was 142%; phase luck), and pods that just launched have no metrics yet, so they do not enter the sample (the identity of this rule is confirmed from source in the blindness section), which means each next step also climbs one stair at a time on the old sample. Indeed the second stair works out exactly to ceil(3 × 153/70) = 7. As a result, reaching 6 Ready pods took +43.9s, actually later than the base (+23.5s), and in the stretch where pods booted back to back (+30 to 45s), p95 spiked to 421ms. With only 4 physical cores, startup (Node boot, Next initialization) contended with serving; a cluster with roomy nodes would suffer less, but among pods piling onto the same node the direction of the story is the same. In short, even with the behavior cap lifted, the formula and the new pods' metric gap built a staircase and nothing got faster, while the startup contention penalty was real. **"Faster and bigger" is free only when startup is free.**

**Intervention 3: do not pre-place the image (cold node).** I also measured the opposite direction. The experiments so far had the image preloaded on every node, so the pull segment was 0. Wipe the app image's layers from one node and make it pull again from the local registry, and this happens.

| Pull on a cold node (local registry) | Duration  |
| ------------------------------------ | --------- |
| standalone image (69MB transfer)     | **0.23s** |
| naive image (590MB transfer)         | **7.7s**  |

This is a lower bound centered on decompression cost, with no network round trips thanks to the local registry. A real remote registry adds download time on top. The moment scale-out places a pod on an unfamiliar node (a node just added, a node whose image got evicted), this time is appended right after the detection window, and its size is proportional to the transfer size measured in [Part 2](/en/2026/08/k8s-for-frontend-2). Image weight reduction is an autoscaling speed problem too.

To sum up: the detection window (15 to 30 seconds) is HPA's structure and hard to shrink, startup (1 to 2 seconds) is already short, and forcing a mass launch backfires. The places to intervene come down to two: headroom to survive the detection window (minReplicas and requests sizing), and preparation that keeps startup short (small images, preloading).

One more thing worth writing down: a much larger block of time can attach in front of this whole timeline. The experiments so far always had a node ready to accept pods, but in a preliminary run with maxReplicas set too greedily, I watched 2 of the desired 11 freeze in Pending. The sum of requests exceeded what the nodes could accommodate. [Part 1](/en/2026/08/k8s-for-frontend-1) said pod scaling and node scaling are different layers; this situation is that boundary. A node autoscaler (Cluster Autoscaler, Karpenter) that sees Pending takes minutes to bring up a node, and that time is added verbatim in front of every timeline in this post. I could not reproduce it on single-machine kind, so no measurement, but it deserves the note: it is the biggest variable that can follow the detection window. There is also another axis, VPA (Vertical Pod Autoscaler), which resizes a single pod, but it is outside this series' scope, so I leave only the name.

## The 146.7 Seconds the Autoscaler Stopped Responding

Now the autopsy promised in the opening. This phenomenon was not in the plan. I first met it in an early experiment that ran without the load generator's protection (an intake cap), piling requests onto keep-alive connections whether responses fell behind or not. Under that load, far past the limit, HPA did not respond harder; it stopped responding.

| Event (T0 = past-limit load starts)                     | Time (measured) |
| ------------------------------------------------------- | --------------- |
| p95 starts exploding, 10ms → 3.3s                       | within +15s     |
| All 3 pods NotReady (readiness probe timeout cascade)   | early spike     |
| HPA "did not receive metrics ... pods might be unready" | repeatedly      |
| **First desired change (3→7)**                          | **+146.7s**     |
| Back to 6 Ready                                         | +172.4s         |
| First traffic to new pods                               | +157 to 180s    |
| p95 recovered to 889ms                                  | +225s           |

desired did not budge from 3 for 146.7 seconds. Meanwhile p95 soared to 18.7 seconds, and **27% of 20,138 requests failed** (mostly TIMEOUT, 5,255 of them). The load did not wake the autoscaler; it put it to sleep. The HPA event originals from that stretch state the cause of death plainly.

```text
$ kubectl describe hpa autoscale-lab   # events excerpt from the blind stretch
Warning  FailedGetResourceMetric       (x10 over 6m36s)  horizontal-pod-autoscaler
  failed to get cpu utilization: did not receive metrics for targeted pods
  (pods might be unready)
Warning  FailedComputeMetricsReplicas  (x10 over 6m36s)  horizontal-pod-autoscaler
  invalid metrics (1 invalid out of 1), first error is: failed to get cpu
  resource metric value: ...
```

The front of the chain is clear. When overload deepens the response queue, the readiness probe's requests line up in the same event loop. The probe's default timeout is 1 second, so even with the app working perfectly hard, the check fails 3 in a row and the pod goes NotReady (exactly [Part 3](/en/2026/08/k8s-for-frontend-3)'s removal timeline). And, as the events say, HPA failed to receive metrics and withheld judgment. That much is observation; the remaining question is the connective. Does going NotReady really drop you from the metrics? I went down into the HPA controller source. The sentence in those events comes from here in `pkg/controller/podautoscaler/replica_calculator.go` (v1.36.1).

```go
removeMetricsForPods(metrics, ignoredPods)
removeMetricsForPods(metrics, unreadyPods)

if len(metrics) == 0 {
	return 0, 0, fmt.Errorf("did not receive metrics for targeted pods (pods might be unready)")
}
```

It deletes the metrics of pods classified as unready from the sample, and if the remaining sample is 0, it withholds judgment with that error. Then what is unready? `groupPods` in the same file splits it like this for the CPU metric.

```go
if resource == v1.ResourceCPU {
	var unready bool
	_, condition := podutil.GetPodCondition(&pod.Status, v1.PodReady)
	if condition == nil || pod.Status.StartTime == nil {
		unready = true
	} else {
		if pod.Status.StartTime.Add(cpuInitializationPeriod).After(time.Now()) {
			unready = condition.Status == v1.ConditionFalse || metric.Timestamp.Before(condition.LastTransitionTime.Time.Add(metric.Window))
		} else {
			unready = condition.Status == v1.ConditionFalse && pod.Status.StartTime.Add(delayOfInitialReadinessStatus).After(condition.LastTransitionTime.Time)
		}
	}
	if unready {
		unreadyPods.Insert(pod.Name)
		continue
	}
}
```

Read it and it is not "NotReady means excluded." There are two branches. A pod whose `cpuInitializationPeriod` has not yet elapsed since startup, that is, **a recently born pod**, is excluded if NotReady, and excluded even when Ready if its metric is stale relative to the last state transition. It is a grace device to keep young pods, whose CPU numbers are contaminated by startup cost, out of the decision, and its length is the kube-controller-manager flag (`--horizontal-pod-autoscaler-cpu-initialization-period`) default of **5 minutes**. A pod past the grace period, by contrast, is excluded only if it has "never been Ready." In other words, **a long-running pod stays in the sample even when overload flips it NotReady.**

Then why did the measured blindness happen? The answer was in the pods' age. Because I rolled the Deployment before each run to change settings, the serving pods at spike time were all 2 to 3 minutes old: every one of them inside the 5-minute grace window. And decisively, the moment blindness lifted matches "serving pod creation + 5 minutes" to the second, run after run.

| Blindness run                   | Serving pods created | Created + 5min | First desired change (measured) |
| ------------------------------- | -------------------- | -------------- | ------------------------------- |
| First discovery (no intake cap) | 08:04:01-08          | 08:09:01-08    | +146.7s = 08:09:13              |
| 222rps, probe 3s                | 10:00:15             | 10:05:15       | +197.0s = **10:05:15 exactly**  |
| 222rps, probe 1s                | 10:14:55-56          | 10:19:55-56    | +196.8s = 10:20:01              |

The length of the freeze was set not by the depth of the load but by **the time remaining until the pods turned 5 minutes old.** If this reading is right, pods past 5 minutes should show no blindness under the same load. So as a final verification, I fired the same 222rps with the same probe settings, changing only one thing: the pods had been aged 63 minutes.

| Same 222rps spike (probe timeout 3s) | ~2-minute-old pods (right after deploy) | 63-minute-old pods            |
| ------------------------------------ | --------------------------------------- | ----------------------------- |
| First desired change                 | **+197.0s** (created+5min)              | **+26.8s** (normal window)    |
| Expansion                            | only 3→6 within the load                | +26.8s 6, +41.7s 9, +72.1s 12 |
| Failure rate                         | 19.1% (7,342/38,399)                    | **7.4%** (1,711/22,993)       |

The old pods bounced through NotReady in the overload just the same, but they never left the sample, and HPA moved as soon as the first detection window closed. The remaining 7.4% failure is the price of a queue that stayed deep until expansion to 12 finished at +194s, the load being 1.6x the limit. Even with expansion alive, the first two minutes past the limit hurt. But the eyes stay open.

So the accurate name for this phenomenon is not "overload blindness" but **"post-deploy blindness."** Right after a rollout, every pod sits inside the 5-minute grace window, and if a spike lands in that window and the probes collapse on top of it, HPA loses the entire sample. Both conditions must coincide, but I do not think the combination is rare. Deploying right before a traffic event is common, and the young pods that deploy created are exactly the ones that receive the event's first spike. [Part 4](/en/2026/08/k8s-for-frontend-4) said that hanging dependencies on liveness turns an outage into a restart storm; this is also the readiness edition of that. As long as the probe shares the serving queue, deep overload invites traffic loss and autoscaler blindness at the same time. Had it been liveness, restarts would have piled on as well.

Then under what load do probes collapse? With an intake-capped open-loop load, same right-after-deploy condition, I varied only the intensity to find the boundary.

| Open-loop spike (right after deploy, probe timeout 1s) | 143rps (near the limit) | 222rps (about 1.6x the limit)      |
| ------------------------------------------------------ | ----------------------- | ---------------------------------- |
| First desired change                                   | +32.2s (normal window)  | **+196.8s** (only at created+5min) |
| Worst p95 bucket                                       | 1.6s                    | 5.6s                               |
| Failure rate                                           | **0%** (0/30,064)       | **26.3%** (8,112/30,838)           |

The limit is a measured number. This app spends about 8.7ms of CPU per request, so 3 pods' limit (1.2 cores) caps out around 138 requests per second; 143rps sits at that edge and 222rps is about 1.6x. At 143rps there was no blindness. Even though the pods were equally inside the 5-minute grace window, the queue only backed up to 1.6 seconds, the probes held (a NotReady verdict needs 3 consecutive failures at 5-second intervals, at least somewhere past ten seconds), and the metrics of pods that stay Ready remain in the sample even inside the grace window. At 222rps, the 1-second probe collapsed, every pod left the sample, and failures stacked to 26% until the 5-minute window ran out. The condition for blindness is a product: **the pods must be inside the 5-minute grace window, and within it the queue must run deep enough to break the probes.**

What looks like a prescription that buys the probes time is raising timeoutSeconds. I raised the readiness timeout from 1 to 3 seconds and repeated the same 222rps.

| Same 222rps spike (right after deploy) | probe timeout 1s     | probe timeout 3s         |
| -------------------------------------- | -------------------- | ------------------------ |
| First desired change                   | +196.8s              | +197.0s                  |
| Worst p95 bucket                       | 5.6s                 | 2.3s                     |
| Failure rate                           | 26.3% (8,112/30,838) | **19.1%** (7,342/38,399) |

The thaw came at effectively the same moment either way: each run's own "created + 5 minutes." What the timeout raise changed was not the length of the blindness but the damage during it. The probes held on a bit longer, the Ready stretches grew, and traffic loss shrank accordingly (failures 26.3%→19.1%, p95 tail 5.6s→2.3s), but under a load where the queue blows past even 3 seconds, it cannot carry you out of the 5-minute window. More fundamentally you need probe responses that bypass the serving queue, or backpressure at the intake, and that design is beyond this post's scope.

One thing to append. The probe-1s run had one pod mixed in that had survived from the previous run, 10 minutes old. By the source's rules, that pod should have stayed in the sample and prevented the blindness, yet the freeze persisted. It appears that as the 4 physical cores saturated, the metrics collection path itself (kubelet stats → metrics-server) lost that pod's sample. The single-machine experiment environment is baked into that result, so I would not generalize it as-is, but it is worth writing down that deep overload can shake even the supply chain of the decision's raw material.

What to take away here is the diagnostic. **If HPA did not move during a spike, look at `kubectl describe hpa`'s events before staring at desired.** If "pods might be unready" is stamped there, check the probe settings together with the time of the last rollout. If the rollout was within 5 minutes, you are in the same state as this post's reproduction.

## Interlude: Calling In More Cooks

Let me park the structure so far in one analogy: calling in more cooks at a restaurant as customers pour in.

| Restaurant                                                                  | Autoscaling                                           |
| --------------------------------------------------------------------------- | ----------------------------------------------------- |
| A manager who walks the floor every 15 minutes                              | The 15-second HPA loop                                |
| The judgment call "orders are heavy for the table count"                    | Utilization vs target, relative to requests           |
| Phoning an on-call cook and waiting for them to arrive                      | Pod startup (short if the image is there)             |
| New cooks only get orders from newly seated tables                          | keep-alive connection pinning (Part 3)                |
| A probation rule: cooks in their first 5 minutes are not rated              | The 5-minute metric grace after startup               |
| The day everyone is new and the floor blows up, ratings go blank            | Post-deploy blindness (5-min window × probe collapse) |
| Watching for 30 minutes after guests leave, then releasing cooks one by one | Scale-down stabilization window (300s)                |
| Checking the reservation book and calling people in before the dinner party | KEDA cron preemptive scaling                          |

Two things to keep from the analogy: the manager's patrol interval (detection window) is a separate clock from how fast cooks arrive (startup), and the most reliable response is knowing in advance when the rush comes (preemptive scaling).

## Coming Down by the Stairs: Scale-Down

I also put a stopwatch on what happens after the load drains. Cut the spike while scaled out to 12, and utilization falls below target immediately, but replicas do not come down right away.

| Event (T1 = load removed) | Time (measured) |
| ------------------------- | --------------- |
| Utilization under target  | within +15s     |
| desired stays at 12       | **for 304s**    |
| desired 12 → 8            | +304s           |
| desired 8 → 3             | +319s           |

The relevant stretch of the watch log:

```text
+299s  hpa=[12 0]  deploy=[12 12]   # utilization is 0% but desired is still 12
+305s  hpa=[8 0]   deploy=[8 8]     # the window slides, first stair
+320s  hpa=[3 0]   deploy=[3 3]     # second stair, termination sequences begin for 5 pods
```

Twelve pods sat unchanged for over 5 minutes, then came down to 3 in two stairs 15 seconds apart. This is the **stabilization window (default 300s)** from earlier, in the flesh. HPA does not discard each cycle's computed value; it holds the last 300 seconds' worth, and in the downward direction applies only **the maximum among them**. As the window slides through time, the maximum inside it drops 12 → 8 → 3, and replicas following it like stairs is the record above. It is a device against round trips on choppy traffic, scaling down and right back up (paying the detection window again in between), so I think the right way to read this 5 minutes of conservatism is as insurance, not cost.

And the 9 pods coming down here ride [Part 4](/en/2026/08/k8s-for-frontend-4)'s termination sequence in full: the SIGTERM-vs-routing race, the preStop 3 seconds, the keep-alive connection hostage drama, all of it. If your service scales down often, Part 4's prescriptions are working every day in ordinary autoscaling, not just at deploy time.

## Why Memory Doesn't Work

What happens if HPA's metric is memory instead of CPU? The [sizing post](/en/2026/08/nodejs-k8s-pod-sizing) foreshadowed with V8's habits that this is a trap in Node.js, and this time I reproduced it to the end with HPA attached. On a Deployment with memory requests 128Mi (idle RSS 36Mi, 28% utilization) I hung an HPA with a 40% memory target, ran load for about 3 minutes, and cut it.

| Event (memory 40% target, 2 replicas to start) | Observation (measured)                         |
| ---------------------------------------------- | ---------------------------------------------- |
| Idle                                           | RSS 36Mi per pod, 28% utilization              |
| Load flows (about 3 min)                       | RSS 71-89Mi, utilization 54%, over target      |
| Scale-out                                      | desired 2 → 3 → 5 → 7 → 8 (max reached)        |
| **10 minutes after load removed**              | Swollen pods stuck at 58-64Mi, average 39-40%  |
| Scale-in                                       | **None. Still 8** (through end of observation) |

Three scenes from the watch log:

```text
(before load)      hpa=[2 28]  mem=[36Mi 36Mi]
(under load)       hpa=[5 54]  mem=[85Mi 89Mi | new pods 36Mi]
(10 min after)     hpa=[8 40]  mem=[58~64Mi x4 | new pods 40~46Mi]
```

Two mechanisms overlap. First, V8. Heap and RSS that swelled under load are not readily returned to the OS. Exactly the habit measured in the [sizing post](/en/2026/08/nodejs-k8s-pod-sizing): pods that lived through the load stayed at 58-64Mi, 1.7x their idle value, ten minutes later. Second, dilution of the average. The new pods brought in by expansion never saw the load and sit around 40Mi, and the average utilization mixed with the swollen pods lands at 39-40%, seated precisely inside the tolerance band of the 40% target. A value with no grounds to scale down and none to scale up, so HPA keeps 8 as they are. CPU is a consumable that returns to 0 when the work ends, but Node's RSS is a water line that rarely comes down once it rises, and with average dilution layered on, scale-in misfires structurally. **In a Node service, memory is safe to use only as an OOM defense line (limit) and as sizing material, not as a scaling signal.**

## Scaling That Knows the Clock: KEDA

If the detection window is structural delay, predictable spikes can skip detection entirely: commute hours, the lunch peak, a broadcast slot, traffic whose clock you know. HPA has no concept of time, but put [KEDA](https://keda.sh/) (Kubernetes Event-driven Autoscaler) on top and a cron trigger lets you declare "at least N during this window." KEDA does not replace HPA; it is a layer that creates and steers one, so hang a cpu trigger alongside and unpredicted load is still caught the usual way.

The setup is one ScaledObject. Delete the existing HPA (ownership overlaps on the same target) and hang cron and cpu triggers side by side.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: autoscale-lab
spec:
  scaleTargetRef:
    name: autoscale-lab
  minReplicaCount: 3
  maxReplicaCount: 12
  triggers:
    - type: cron # traffic whose clock you know: at least 9 inside the window
      metadata:
        timezone: Asia/Seoul
        start: 50 8 * * *
        end: 0 11 * * *
        desiredReplicas: '9'
    - type: cpu # unpredicted load is caught the usual way
      metricType: Utilization
      metadata:
        value: '70'
```

I replayed the 143rps spike (the very load that reactive scaling let slide to a 1.6-second p95) inside the cron window, already expanded to 9.

| Same 143rps spike | Reactive (HPA, from 3 pods) | Preemptive (KEDA cron, from 9 pods)  |
| ----------------- | --------------------------- | ------------------------------------ |
| Scale-out wait    | +32.2s (detection window)   | **0s (already up)**                  |
| Worst p95 bucket  | 1.6s                        | **101ms** (double digits throughout) |
| Failure rate      | 0% (0/30,064)               | **0%** (0/30,094)                    |

At this load the reactive setup also survived without errors, but the p95 explosion during the detection window disappeared wholesale. And we saw in the previous section that a 222rps right after a deploy takes the reactive setup all the way to blindness. What this contrast says is plain: **the fastest scale-out is the one that finished before the spike arrived.** As an aside, a batch-style workload that can rest completely at night can go all the way to scale-to-zero with minReplicaCount 0 plus a cron window (an HTTP service taking user traffic needs a separate request-based device to wake from 0, which is the territory of a dedicated add-on). Of course, preemptive scaling does not work on spikes whose clock you do not know; then the place to return to is, again, headroom to survive the detection window, that is, minReplicas and requests.

## Five Things to Check Before the Spike Arrives

Distilling this post's measurements into questions you can put to your own service.

**1. Is the HPA's denominator (requests) based on measurement?**

```bash
kubectl get hpa -o custom-columns=NAME:.metadata.name,TARGET:.spec.metrics[0].resource.target.averageUtilization
kubectl get deploy my-app -o jsonpath='{.spec.template.spec.containers[0].resources.requests}'
```

The denominator of utilization is requests. If requests is a copied value, then 70% is a copied target too. How to set it is what the [sizing post](/en/2026/08/nodejs-k8s-pod-sizing) is about, in its entirety.

**2. Is there headroom to survive the detection window?**

The existing pods must carry the 15 to 30 seconds before the spike is even seen. minReplicas × (headroom relative to requests) is that buffer. If normal-time utilization is already at 60 to 70%, there is nowhere to go during the detection window.

**3. Do the probes survive overload?**

```bash
kubectl describe hpa my-app | grep -A3 "unready\|invalid metrics"
```

If this log appears during a load test, the blindness scenario has reproduced. Look at probe timeoutSeconds, how entangled the probe path is with the serving queue, and whether the last rollout was within 5 minutes. Right after a deploy, every pod is inside the metric grace window, the most blindness-prone hour there is.

**4. Do the nodes that will scale out have the image?**

```bash
kubectl get events --sort-by=.metadata.creationTimestamp | grep -i "pulling\|pulled"
```

If an actual download is stamped at every expansion, pull time is being appended behind the detection window. Review image size ([Part 2](/en/2026/08/k8s-for-frontend-2)) and a pre-pull strategy.

**5. Is a memory-based HPA hanging on a Node service?**

If one is, check on a graph whether scale-in ever happens. If replicas do not come down after load drains, you are in the same state as this post's reproduction.

## Wrap-up: An Itemized Bill of Time

- **Spike to first request took 31.5 seconds, and the dominant term is the detection window (22.5s).** It is structural delay made by the phase of the 15-second scrape and the 15-second decision, hard to shrink with settings. Startup (1-2s) is already short, and the 9 seconds from Ready to first traffic belong to keep-alive distribution ([Part 3](/en/2026/08/k8s-for-frontend-3)).
- **Interventions work only at the two ends.** Pre-provisioning (minReplicas) is insurance for the limit case; mass-launching (behavior) was blocked by the staircase the formula and the new pods' metric gap build (3→5→7→10→12), gaining nothing while paying startup contention; image preparation (size, preload) separates a cold node's 7.7s (naive) from 0.23s (standalone).
- **For 5 minutes after a deploy, overload blinds the autoscaler.** HPA drops NotReady pods within 5 minutes of startup (cpuInitializationPeriod) from its sample, so when probes collapse under a spike right after a rollout, the whole sample vanishes. Every measured freeze (146.7s, 197s) lifted exactly at "pod creation + 5 minutes," and firing the same 222rps at pods aged 63 minutes scaled normally at +26.8s (failures 26.3%→7.4%). Raising the probe timeout (1→3s) does not hasten the thaw, only softens the damage (26.3%→19.1%). Diagnose from describe hpa's "pods might be unready" and the time of the last rollout.
- **Scale-down is a 304-second staircase.** The maximum held by the 300-second stabilization window built the 12→8→3 stairs, and the descending pods ride [Part 4](/en/2026/08/k8s-for-frontend-4)'s termination sequence.
- **Memory cannot be a scaling signal on Node.** Pods that grew 2→8 in three minutes of load stayed stuck at 8 after the load drained, thanks to RSS that V8 does not return and the averaging dilution of the new pods.
- **A spike whose clock you know skips detection.** The 143rps spike that reactive scaling let slide to a 1.6-second p95, KEDA's cron preemptive scaling absorbed at a worst p95 of 101ms.

This part measured the time it takes for the herd's size to change. The next and final piece of the series is **how much to mold a single pod**: requests and limits, NODE_OPTIONS and the heap, and how it all becomes the bill. The [Node.js pod sizing post](/en/2026/08/nodejs-k8s-pod-sizing) holds that answer as the series' terminus.
