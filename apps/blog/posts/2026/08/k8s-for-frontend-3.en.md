---
title: 'How Does Traffic Reach My Pod? From ClusterIP to port-forward'
tags:
  - kubernetes
  - networking
  - nextjs
  - nodejs
  - frontend
published: true
date: 2026-08-06 23:00:00
description: "A Service's ClusterIP is an IP attached to no machine, yet curl reaches it. iptables rules and conntrack, EndpointSlice, cluster DNS and ndots, Gateway, and port-forward: a record of opening up the entire path a request takes to a pod, directly in a kind cluster. Part 3 of the Kubernetes for frontend developers series."
thumbnail: /thumbnails/2026/08/k8s-for-frontend-3.png
series: 'Kubernetes for Frontend Developers'
seriesOrder: 3
---

## Table of Contents

## The Mystery Opens, and the Lab Environment Lies

At the end of [Part 2](/en/2026/08/k8s-for-frontend-2), I made a promise. The ClusterIP that `kubectl get svc` shows is a strange IP that does not even answer ping, and I said I would open things up and see how traffic actually flows into it. To keep that promise, I launched a debug pod inside the cluster and started with 10.96.35.226, the ClusterIP of our Service.

```bash
$ kubectl exec debug -- curl -s http://10.96.35.226/api/health
{"ok":true,"pod":"k8s-fe-lab-5cfb6b8744-qppld"}
```

curl works fine. The response even carries a pod name. Now for the promised ping. Part 1 described this address as a virtual address attached to no machine or process, one that does not answer ping, so all I had to do was confirm the failure.

```bash
$ kubectl exec debug -- ping -c 3 10.96.35.226
64 bytes from 10.96.35.226: seq=0 ttl=62 time=0.203 ms
64 bytes from 10.96.35.226: seq=1 ttl=62 time=0.506 ms
64 bytes from 10.96.35.226: seq=2 ttl=62 time=0.716 ms
3 packets transmitted, 3 packets received, 0% packet loss
```

It answers. The experiment I had trailed for two posts broke on its very first command. Rattled, I pinged 10.96.222.222, an address assigned to no Service at all. It answers too. Then what about an address that cannot possibly exist? 198.51.100.7 sits in the block RFC 5737 reserves for documentation examples (TEST-NET-2), so no host anywhere on the internet should ever answer at this address.

```bash
$ kubectl exec debug -- ping -c 3 198.51.100.7
64 bytes from 198.51.100.7: seq=0 ttl=62 time=0.147 ms
3 packets transmitted, 3 packets received, 0% packet loss
```

Even this answers. All with the same ttl=62, all under 1ms. The truth behind this situation, where every IP in the world appears to be alive half a millisecond away, lay not in Kubernetes but in the lab environment. This experiment runs in a colima VM on macOS, and colima's user-mode network gateway effectively answers ICMP echo on behalf of every destination. On Linux with Docker installed directly there is no such forgery layer, and the same command is known to end in a timeout as predicted. In other words, both the success and the failure of ping are environment-dependent values, useless as evidence for this mystery.

But the commotion actually sharpened the question. Looking back at curl: the real ClusterIP returns 200, while the unassigned IP returns nothing even after 5 seconds of waiting. ping lies, but curl distinguishes them precisely. So the question of this post can be restated: **how does curl reach an IP that is attached to no machine?** This time I will prove it not by observation but by opening the original text of the rules, and that trail leads through the unit of load distribution (conntrack), the traffic roster (EndpointSlice), the resolution of names (cluster DNS), the door for outside traffic (Gateway), and the tunnel that bypasses all of it (port-forward). Stepping on a lab-environment trap in the very first scene is also a miniature of the last section's theme: "but it worked locally."

This is the third post in the "Kubernetes for Frontend Developers" series. If the vocabulary feels unfamiliar, I recommend [Part 1's concept map](/en/2026/08/k8s-for-frontend-1) first, and [Part 2](/en/2026/08/k8s-for-frontend-2) for what containers and pods physically are.

> Measurement environment: colima VM (4 CPU/8GB) on Apple M5 macOS, kind v0.32.0 (kindest/node v1.36.1, Kubernetes v1.36.1), kube-proxy in kind's default iptables mode, node iptables v1.8.11 (nf_tables), app is Next.js 16.2.12 standalone (node:24-slim, Node v24.19.0, glibc). LoadBalancer and Gateway were built with cloud-provider-kind v0.11.1 and Gateway API CRD v1.5.1. Three things changed from [Part 2](/en/2026/08/k8s-for-frontend-2)'s setup. The Deployment went from 2 replicas to 3; the readiness probe checks `/api/health` every 5 seconds (periodSeconds 5, versus the default 10 in Part 2's manifest); and I added the Service that did not exist through Part 2: a ClusterIP type that selects pods labeled `app: k8s-fe-lab` and maps port 80 to targetPort 3000, with 10.96.35.226 being the address this Service received. Two caveats for reproduction: colima's user-mode network answers all ICMP as shown above, and the app container (node:24-slim) has no ping/curl/dig, so I ran a separate debug pod with diagnostic tools and a client pod for Node-based measurements (fetch, `dns.lookup`). Measurement scripts and raw logs are archived separately.

## Who Answered? An IP That Exists Only as Rules

In Part 1 I wrote only that kube-proxy "manages each node's network rules so traffic can find its way to pods," and moved on. That deferred explanation gets collected here, because the true identity of ClusterIP is exactly those "rules."

kind's nodes are Docker containers (Part 2), so we can `docker exec` into a node and dump its NAT rules (the kernel's rule layer that rewrites packet addresses) directly. Searching the node's iptables (the tool that manages the Linux kernel's packet-processing rules) for our Service turns up this:

```text
$ docker exec k8s-fe-lab-worker iptables-save -t nat | grep 10.96.35.226
-A KUBE-SERVICES -d 10.96.35.226/32 -p tcp -m comment --comment "default/k8s-fe-lab cluster IP"
   -m tcp --dport 80 -j KUBE-SVC-ISVZ3COTGREXVRO2
```

Read it out: any packet destined for 10.96.35.226, TCP port 80, is handed to a chain called `KUBE-SVC-ISVZ3COTGREXVRO2`. Open that chain, and you find what I personally consider the most striking rule I saw while preparing this series.

```text
... (one KUBE-MARK-MASQ masquerade-marking rule omitted)
-A KUBE-SVC-ISVZ3COTGREXVRO2 -m comment --comment "default/k8s-fe-lab -> 10.244.1.12:3000"
   -m statistic --mode random --probability 0.33333333349 -j KUBE-SEP-FRMIQDBY5TTCZ5G3
-A KUBE-SVC-ISVZ3COTGREXVRO2 -m comment --comment "default/k8s-fe-lab -> 10.244.1.13:3000"
   -m statistic --mode random --probability 0.50000000000 -j KUBE-SEP-DIIQGOM6OBXKX6MD
-A KUBE-SVC-ISVZ3COTGREXVRO2 -m comment --comment "default/k8s-fe-lab -> 10.244.2.11:3000"
   -j KUBE-SEP-5SCZPP47RXDJDPM7
```

Load balancing across 3 replicas is these three lines. The first rule picks the first pod with probability 1/3; of the remaining 2/3, half (0.5) goes to the second pod, and the rest unconditionally to the third. The result is a waterfall of probabilities where each pod receives 1/3. The rule comments even embed the target pod IPs, so this dump alone shows everywhere traffic can go. What each KUBE-SEP chain does is DNAT, swapping out the destination address.

```text
-A KUBE-SEP-FRMIQDBY5TTCZ5G3 -p tcp -m comment --comment "default/k8s-fe-lab"
   -m tcp -j DNAT --to-destination 10.244.1.12:3000
```

At this point the intro's question can be answered. The reason curl seemed to reach 10.96.35.226 is that the moment a packet bound for that address passes through a node, the kernel rewrites its destination to a pod IP. **The machine called ClusterIP exists nowhere. It exists only as strings inside each node's NAT rules.** The process that keeps rewriting those rules to match changes in Services and pod lists is kube-proxy.

Why ping fails (in a proper environment) is confirmed by the same dump. Counting protocol matches across the entire NAT table: 18 rules match TCP/UDP ports, 0 rules match ICMP. The ICMP packets ping sends match none of the rules above, and the un-rewritten destination 10.96.35.226 has no entity to answer. An IP that does not exist answering curl but staying silent to ping becomes obvious once you get down to the rule that says, explicitly, "TCP port 80."

Version notes deserve a paragraph here. This iptables mode is still kube-proxy's default on Linux as of v1.36. The successor, [nftables mode](https://kubernetes.io/blog/2025/02/28/nftables-kube-proxy/), went GA in v1.33 but the default did not change, and IPVS mode, once considered the alternative, was deprecated in v1.35 and then removed entirely in v1.36. That is why this post dissects only the iptables mode. One caution: in IPVS mode, which may still be running on clusters at v1.35 or below, the ClusterIP is actually bound to a dummy interface on the node and ping genuinely answers. The statement "ClusterIP doesn't answer ping" is itself a mode-specific claim.

There is one more amusing layer. The node's iptables is v1.8.11 (nf_tables), which means the iptables command is actually a compatibility layer writing rules into the kernel's nftables subsystem. Opening the same chain with the nft command shows the identical rules in nft syntax, with this warning on the first line:

```text
$ docker exec k8s-fe-lab-worker nft list chain ip nat KUBE-SERVICES
# Warning: table ip nat is managed by iptables-nft, do not touch!
```

So "kube-proxy's iptables mode" and "the kernel's nftables" are stories on different layers: even iptables mode is implemented as nftables inside the kernel. kube-proxy's nftables mode can be understood as a rewrite that removes this compatibility layer and speaks the nftables API directly.

> **Clue note**: ClusterIP is on no machine; it lives only in each node's NAT rules. curl reaches it because the kernel rewrites the destination to a pod IP; ping goes silent because the rules match only TCP port 80.

## Interlude: A Main Number with No Phone

Let me pause and organize the picture so far with an analogy. When you call a company's main number, you actually get connected to one of the agents, but there is no phone sitting at the main number itself. ClusterIP is that main number. The switchboard holds a routing table deciding which extension each call gets plugged into; that is the probability rule in iptables we just saw. Two parts of this analogy are worth flagging in advance: once connected, a call never passes through the switchboard again until it ends (conntrack, next section), and the phone book only tells you the number, playing no part in the call itself (the DNS section).

| Phone analogy                                      | Kubernetes                            |
| -------------------------------------------------- | ------------------------------------- |
| A main number with no phone attached               | ClusterIP                             |
| The switchboard's routing table                    | iptables' KUBE-SVC probability rules  |
| The clerk who keeps the table updated              | kube-proxy                            |
| Today's roster of agents on duty                   | EndpointSlice (two sections from now) |
| A call that skips the switchboard once connected   | conntrack (next section)              |
| The phone book you consult to find the main number | Cluster DNS (three sections from now) |

## Why Load Balancing Isn't Per-Request: keep-alive and conntrack

The probability rules in the previous section suggest requests should scatter evenly across three pods, but if you run a BFF (a backend-for-frontend, the API middle server a frontend team operates) in production, you eventually meet a graph where one pod alone is unusually busy. I reproduced the cause directly from a client pod inside the cluster: send 30 consecutive requests to the Service with Node.js's built-in fetch, and count the pod names carried in the responses.

| Invocation (same Service, 3 replicas)               | Responses per pod              |
| --------------------------------------------------- | ------------------------------ |
| 30 consecutive fetches in one Node process          | **30 / 0 / 0**                 |
| 21 requests, each from a new process (new TCP conn) | 9 / 6 / 6                      |
| One process, 8 requests spaced 4.5s apart           | 4 / 3 / 1 (shuffles each time) |

The first row is the reproduction. All 30 requests went to one pod. The probability rule is not broken; the unit the rule applies to is **not the request but the connection**. iptables NAT applies only to a connection's first packet; the kernel records that decision in conntrack (the connection-tracking table) and sends every remaining packet of the same connection to the same pod. Open that table on the node and the recorded decision is right there:

```text
$ docker exec k8s-fe-lab-worker conntrack -L -d 10.96.35.226
tcp  ESTABLISHED src=10.244.1.9 dst=10.96.35.226 sport=45364 dport=80
     src=10.244.1.13 dst=10.244.1.9 sport=3000 dport=45364 [ASSURED]
```

The client's (10.244.1.9) connection to the ClusterIP is translated and pinned to pod 10.244.1.13. (Captured while running calls at 2-second intervals to catch a live connection; capture right after the requests end and the same entry remains in TIME_WAIT.)

Then why were 30 requests one connection? Because undici, which implements Node's fetch, uses a keep-alive connection pool by default, and its retention window ([keepAliveTimeout](https://github.com/nodejs/undici/blob/v7.29.0/docs/docs/api/Client.md), per undici v7.29.0 as bundled in Node v24.19.0) defaults to 4 seconds. On an SSR or BFF server that keeps calling the same internal API, request gaps rarely exceed 4 seconds, so in practice one connection is reused indefinitely. The table's third row proves the boundary: widen the gap to 4.5 seconds and a fresh connection opens each time, reviving the distribution.

What this means in practice is blunt: **for a client that holds connections long, the Service's load balancing effectively does not exist.** Scaling up replicas does not migrate existing connections, and with few BFF instances the load piles onto a handful of backend pods. This trait is [well known](https://learnkube.com/kubernetes-long-lived-connections) to worsen with protocols like gRPC that hold connections even longer, and the fixes head toward capping connection lifetime, having the client see the pod list and balance on its own, or inserting a per-request proxy layer such as a service mesh. Whichever you pick, I think the starting point is dropping the assumption that "the Service will spread things out for us."

One reproduction caveat: undici's fetch forbids setting the Connection header, so you cannot disable keep-alive via headers. Passing a new dispatcher (undici's Agent) per request also works, but the experiment above used the simpler and more certain control group: a new process per request.

> **Clue note**: Distribution happens exactly once, at a connection's birth, and conntrack pins that decision until the connection dies. Consecutive Node fetch calls, keep-alive by default, therefore pile onto one pod.

## When Does a Pod Leave the Roster? An EndpointSlice Transition Timeline

So far all three pods were healthy. Now it is time to see what happens when one gets sick. But first, querying the Endpoints object introduced in Part 1 returns something interesting:

```text
$ kubectl get endpoints
Warning: v1 Endpoints is deprecated in v1.33+; use discovery.k8s.io/v1 EndpointSlice
```

Endpoints, which Part 1 introduced as "the list of ready pods a Service sends traffic to," is a [legacy API](https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/) officially deprecated since v1.33. The object still exists and gets populated, but the standard has moved to EndpointSlice. All measurements in this post therefore use EndpointSlice.

Opening an EndpointSlice directly surfaces one correction to Part 1's description: a pod failing readiness is not "removed" from the roster. The endpoint stays in the list; only one of its three conditions, `ready`, flips to false. The conditions are ready (may it receive traffic), serving (can it respond regardless of termination), and terminating (is it shutting down). terminating is a story about dying pods, which belongs to [the next part](/en/2026/08/k8s-for-frontend-4); this part covers only the ready transition of living pods.

I measured how long that transition takes. I added `/api/toggle?ready=false` to the sample app so the readiness probe alone returns 503 while the process stays perfectly alive, giving the experimenter control of the failure's start time (T0). Meanwhile, traffic that opens a new connection per request flowed continuously at 120ms intervals (as the previous section showed, keep-alive connections have pinned distribution and are useless for this observation), and I sampled the EndpointSlice's ready condition and the node's KUBE-SEP rule existence roughly every 0.2 seconds (150ms sleep plus command execution time).The probe interval is 5 seconds with the default failureThreshold 3 (three consecutive failures make NotReady).

| Event (removal direction)                            | Time (measured) | From T0 |
| ---------------------------------------------------- | --------------- | ------- |
| `/api/health` starts returning 503 (T0)              | 13:46:36.4      | 0s      |
| kubelet confirms 3 consecutive failures, Ready=False | 13:46:47        | +10.6s  |
| Last real traffic observed to that pod               | 13:46:47.3      | +10.9s  |
| Node's KUBE-SEP rule (DNAT target) disappears        | 13:46:47.7      | +11.4s  |
| EndpointSlice `ready=false` observed                 | 13:46:47.7      | +11.4s  |

The last two observations are 6ms apart, inside the polling resolution, effectively simultaneous, with no claim about order (causally, the slice update comes first). What stands out is the distribution of time: of the ~11 seconds, 10.6 went to the probe's detection window (5s interval x 3 consecutive failures), while everything from kubelet's verdict through the EndpointSlice update, kube-proxy's rule rewrite, and actual traffic departure finished within the same single second. The segment from roster update to rule application is what Kubernetes formally defines as an SLI (Service Level Indicator, a metric for service quality) named [in-cluster network programming latency](https://github.com/kubernetes/community/blob/master/sig-scalability/slos/network_programming_latency.md), and kube-proxy exposes that latency as a histogram metric on 127.0.0.1:10249 inside the node. Across this experiment's two transitions the count rose from 38 to 40 and the cumulative sum grew by 1.52 seconds, an average of 0.76 seconds per roster-to-rules pass. Conclusion: if you want to shrink this latency, the knob to turn is not the cluster but the probe settings.

The recovery direction, measured the same way:

| Event (recovery direction)                          | Time (measured) | From T1 |
| --------------------------------------------------- | --------------- | ------- |
| `/api/health` starts returning 200 (T1)             | 13:47:08.5      | 0s      |
| Pod Ready=True                                      | 13:47:12        | +3.5s   |
| EndpointSlice `ready=true` + KUBE-SEP rule restored | 13:47:12.8      | +4.3s   |
| First real traffic returns to the pod               | 13:47:12.8      | +4.3s   |

Eleven seconds to leave, four to return. The asymmetry is not chance but designed defaults: removal demands three consecutive failures (failureThreshold 3) while return needs one success (successThreshold 1). I read it as: be deliberate about pulling traffic, be quick about giving it back. Note that readiness probes, unlike liveness, allow successThreshold above 1, so you can deliberately make recovery cautious to suppress flapping.

One more observation worth recording: across the 826 requests flowing during this transition experiment, **there were zero errors.** Removal via readiness only makes new connections avoid the pod; it does not kill requests already in flight. But do not credit the zero entirely to readiness. This experiment only flipped the probe response to 503 while the app stayed healthy, so requests reaching the pod during the 10.6-second detection window all got 200. If the pod had genuinely broken, that same detection window is exactly where errors leak. What is confirmed here is only that the transition mechanism itself spills no requests. The deploy-time 5xx problem lives not on this path but in a different race at pod termination; it is reproduced in [the pod's life and death part](/en/2026/08/k8s-for-frontend-4).

> **Clue note**: Readiness failure is not roster removal but an EndpointSlice ready-condition flip, and the dominant latency term is not propagation (sub-second) but the probe detection window. Removal (3 consecutive failures) versus return (1 success) is a designed asymmetry.

## Same Name, Different Speeds: Cluster DNS and ndots

So far the client used the raw ClusterIP number, but real code uses names like `http://internal-api`. The path from name to ClusterIP hides a trap of its own: depending on how you write the same Service's name, DNS round trips can differ by 4x. The starting point is the resolver config file inside the pod.

```text
$ kubectl exec client -- cat /etc/resolv.conf
search default.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
options ndots:5
```

The nameserver is the cluster DNS (CoreDNS) ClusterIP. The problem is the combination of the other two lines. search is the list of suffixes to append when a lookup fails (NXDOMAIN, "no such name"), and ndots:5 says "a name with fewer than 5 dots may not be complete, so try the search suffixes first." Domains with 5+ dots are rare, so almost every name looked up inside a pod goes through the search walk.

To count what this actually produces, I enabled CoreDNS's log plugin and tallied every query. Lookups used `dns.lookup` from a glibc pod's Node (the path HTTP clients actually take), and since A and AAAA records go out in parallel, one name attempt equals two queries.

| Notation for the same Service             | Name attempts | DNS queries | NXDOMAIN | Lookup latency |
| ----------------------------------------- | ------------- | ----------- | -------- | -------------- |
| `internal-api`                            | 1             | 2           | 0        | 2.4ms          |
| `internal-api.default`                    | 2             | 4           | 2        | 2.5ms          |
| `internal-api.default.svc.cluster.local`  | **4**         | **8**       | **6**    | 2.8ms          |
| `internal-api.default.svc.cluster.local.` | 1             | 2           | 0        | 2.3ms          |

The third row is the table's twist. The so-called "proper name," the FQDN (fully qualified domain name, written all the way out), generates the most queries. With 4 dots it falls short of ndots:5, so all three search suffixes get appended, collecting three NXDOMAINs before the original name is finally tried. The short name, by contrast, hits on the first search candidate, and a name with a trailing dot is treated as absolute, skipping search entirely. Inside the cluster the latency difference is invisible at ms scale (CoreDNS owns the source data for cluster-internal names and answers immediately), but the query count is 4x, exactly as the table shows.

External domains do not escape the amplification either. Looking up `www.example.com` (2 dots) the same way: three search candidates all NXDOMAIN, then the final absolute attempt: 4 names x A/AAAA = **8 queries**. The cold lookup took 73.9ms while `www.example.com.` with the trailing dot took 2 queries and 2.3ms, but do not read that gap as the cost of amplification. The latter was warm (the previous lookup had already primed CoreDNS's cache, removing the upstream round trip), and this environment's search suffixes are all under cluster.local, making the six NXDOMAINs cheap failures CoreDNS answers instantly. The dominant term in 73.9ms is the upstream round trip of the final absolute name, not the amplification. Amplification becomes a real latency and reliability problem in environments like EKS where the node's search list is inherited and suffix-appended failures get forwarded upstream, or the moment UDP loss stacks retries. Even without those conditions, the 4x query count lands squarely on CoreDNS and upstream as load.

Two measurement traps for anyone reproducing this. I first tried dig and the amplification would not reproduce at all, which cost me a while: dig does not use the search list by default (you must add `+search`). And CoreDNS ships `cache 30`, so responses are cached 30 seconds, so repeated measurements must separate cold from warm. (This kind environment's default Corefile disables caching for cluster.local names, so it is the external names that hit cache.) The log plugin carries a performance-cost warning, so removing it after measuring is the safe move.

Fold in Node.js's circumstances and the practical conditions of this trap are complete. Lookup frequency is per-connection, not per-request. Thanks to undici's keep-alive, lookups are rare in steady state; then a traffic spike or a backend redeploy reopens connections en masse and lookups stampede. Each of those lookups amplifies up to 8 queries via ndots; `dns.lookup` is [synchronous getaddrinfo on the libuv threadpool (default 4 threads)](https://nodejs.org/api/dns.html), competing with file IO for threads; and Node core has no DNS cache, so the same name is re-resolved every time. Mitigations map one-to-one to causes: switch notation to short names or trailing dots (for external HTTPS targets a trailing dot can break things on the SNI (Server Name Indication, the TLS extension that announces the server name up front) side, so it is safer confined to internal HTTP calls), lower ndots via the pod spec's dnsConfig, extend connection lifetime with keep-alive to reduce lookup frequency itself (noting this pushes opposite to the previous section's skew: the longer you hold connections, the fewer lookups and the worse the distribution), and if needed add an application-level cache like undici's dns interceptor. One warning: lowering ndots on musl (alpine) images can break dotted internal names because the resolver's fallback behavior differs from glibc. Part 2's final slimming step was an alpine image, hence this deliberate note. All measurements in this section are glibc (node:24-slim).

To close the naming story, I also examined the reality of ExternalName, the odd Service type that gives an external domain a cluster-internal name. Open it up and there is no proxy, no ClusterIP; DNS returns a single CNAME and that is all.

```text
$ kubectl exec debug -- dig +search external-api
external-api.default.svc.cluster.local. 5 IN CNAME example.com.
```

So the moment it meets HTTPS it becomes a trap: the name the code called (external-api.default.svc.cluster.local) and the name the TLS server knows (example.com) diverge. Fetching this name in practice gets the handshake rejected (in this experiment the server refused the unfamiliar SNI with `SSL/TLS_ALERT_HANDSHAKE_FAILURE`). Kubernetes documentation [officially warns](https://kubernetes.io/docs/concepts/services-networking/service/#externalname) about this, so for HTTPS targets, writing the real domain in code is likely the better choice over ExternalName. The deeper DNS world beyond this (glibc's parallel A/AAAA sends and the famous intermittent 5-second stall, and its mitigation NodeLocal DNSCache) exceeds this post's scope, so I leave it to the [official docs](https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/).

> **Clue note**: ndots:5 plus three search suffixes make notation a performance choice. Short name 2 queries, full FQDN 8 queries (the "proper" name is slowest), and external domains amplify to 8 queries too. Lookups are per-connection, so they stampede during spikes.

## One URL, Two Paths: SSR's Internal Calls Take a Different Road

With the pieces collected so far, one axis this series keeps stressing can be completed with measurements: the browser's fetch and the fetch inside an SSR server, however identical the code looks, travel completely different roads.

For the experiment I deployed the same app image again as a second Deployment and Service named `internal-api`, and added an `/api/bff` endpoint to the app. The SSR server calls `http://internal-api/api/info` via server-side fetch and returns who answered. I repeated the call 5 times while tracing the path with the previous sections' tools.

```text
{"via":"k8s-fe-lab-...-lhlf9","target":"http://internal-api","ms":9.3,"upstream":{"pod":"internal-api-...-2j92t"}}
{"via":"k8s-fe-lab-...-lhlf9","target":"http://internal-api","ms":3.0,"upstream":{"pod":"internal-api-...-2j92t"}}
```

Three facts observed. First, name resolution matched the DNS section's first row exactly: with the log plugin on, CoreDNS logs show precisely 2 queries (A/AAAA) for `internal-api.default.svc.cluster.local` from the app pod: a short name hitting the first search candidate, authoritative answers each inside 0.1ms. Second, the connection headed for internal-api's ClusterIP (10.96.135.219); I zeroed the node's KUBE-SVC chain packet counter, made the 5 calls, and the counter rose by exactly 1. NAT rules count only a connection's first packet, meaning the 5 calls rode a single keep-alive connection, which is also why the first call took 9.3ms and the rest 3ms. Third, and consequently, all five responses came from the same internal-api pod. The keep-alive skew reproduced itself at the BFF's internal-call layer.

When a browser calls the same domain, none of this happens. The name is resolved by the user's device resolver and public DNS (a world untouched by ndots); the request enters through the CDN, the load balancer, and the next section's door; and no node's conntrack anywhere in the cluster holds an entry linking browser to pod. Conversely, even a public domain resolvable from browsers undergoes the 8-query walk of the DNS section's www.example.com measurement the moment it is called inside SSR. What splits the path is not the URL but the location it is called from. In summary:

| Aspect          | Browser fetch                     | Fetch inside SSR/BFF                  |
| --------------- | --------------------------------- | ------------------------------------- |
| Name resolution | Device resolver, public DNS       | Pod resolv.conf, search walk, CoreDNS |
| Arrival path    | In via CDN, LB, Gateway           | Straight to pod via ClusterIP DNAT    |
| Balancing agent | The proxy at the door (next sec.) | Origin node's iptables + conntrack    |
| Cause of skew   | Proxy configuration's domain      | The client's keep-alive               |

A good share of "but it worked locally" comes from the right column: a URL fine in the browser is slow in SSR (ndots), or an internal name fine in SSR simply does not exist in the browser (names that resolve nowhere outside the cluster).

> **Clue note**: The same fetch differs between browser and SSR in name resolution, path, and balancing agent; no layer overlaps. SSR's internal calls pass straight through this post's world: ndots, DNAT, conntrack pinning.

## Which Door Do Outside Requests Enter? Service Layers and Gateway

Now the remaining front of the path: the door where traffic enters from outside the cluster. Part 1 introduced this door as Ingress, but the landscape has shifted substantially since. ingress-nginx, the de facto standard implementation, [announced retirement in November 2025](https://www.kubernetes.dev/blog/2025/11/12/ingress-nginx-retirement/), and in March 2026 its repository was archived, ending even security patches. Its final release supports Kubernetes up to 1.35, which does not even match this experiment's cluster (v1.36). The officially recommended migration path is the [Gateway API](https://gateway-api.sigs.k8s.io/), the successor standard that splits the rules into three resources (GatewayClass declares the implementation, Gateway the listeners, HTTPRoute the routing rules). Its core resources have been GA since v1.0 (2023), the latest at the time of writing is v1.6 (this post measures against v1.5.1 CRDs). Note that the Ingress API itself is not deprecated and there is no plan to deprecate it (that is the official position), so Ingresses running today are not about to break. What retired is not the API but one controller implementation.

Accordingly, this post's measurements use the Gateway API. In kind, a tool called cloud-provider-kind emulates both LoadBalancer and Gateway (run as a binary on macOS it demands sudo; run as a Docker container it worked without that constraint). LoadBalancer type first. Create a LoadBalancer Service pointing at the same pods and you get:

```text
$ kubectl get svc k8s-fe-lab-lb
NAME            TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)
k8s-fe-lab-lb   LoadBalancer   10.96.83.209   172.18.0.7    80:30562/TCP
```

One Service holding three addresses at once. Part 1 merely listed the three types, but the real thing is not a set of exclusive options; it is **nested layers**. LoadBalancer contains NodePort (port 30562 open on every node), and NodePort contains ClusterIP (by default; `allocateLoadBalancerNodePorts: false` can produce a NodePort-less LoadBalancer). iptables shows the same story: packets arriving via NodePort merge into the very same KUBE-SVC chain as ClusterIP. Once the outside load balancer throws at a node's port, from there on it is the same road we have been walking.

Next I raised a Gateway and HTTPRoute and measured which road this door takes to the pods, using the same packet-counter method as before: zero the KUBE-SVC chain counters for our Service on all three nodes, then send 10 fresh connections per path.

| Ingress path (10 conns each)  | Where counters rose                       |
| ----------------------------- | ----------------------------------------- |
| Via Gateway (172.18.0.6)      | 8 on control-plane node's KUBE-SVC        |
| Via LoadBalancer (172.18.0.7) | worker 3 + worker2 7 (the LB's own chain) |
| ClusterIP directly from a pod | 10 on the origin pod's node's KUBE-SVC    |

All three passed through kube-proxy's rules. Two numbers need footnotes. The LB row not being the original Service's chain is because the LB is a separate Service (k8s-fe-lab-lb): the original chain stayed at 0, while the LB's proxy spraying across nodes' NodePorts landed 3+7 on its own KUBE-SVC chain. The Gateway row reading 8 instead of 10 is because the proxy at the door manages upstream connections independently, so they can diverge from downstream connection counts; what is being proven is that the counter is nonzero, not its magnitude. But before generalizing, honesty requires a disclosure: this measurement came out the opposite of my prediction. Many L7 controllers, ingress-nginx included, default to [bypassing the Service and proxying straight to pod IPs by subscribing to EndpointSlice](https://kubernetes.github.io/ingress-nginx/user-guide/miscellaneous/) (to run session affinity or their own balancing algorithms). My plan was to show that bypass via motionless counters. Instead, dumping this environment's gateway data plane (envoy) config through its admin API showed the upstream was not a pod IP list but a single ClusterIP. (The cx_total and rq_total in the excerpt are from the moment of the dump, unrelated to the 10-connection runs above.)

```text
$ kubectl exec debug -- curl -s http://172.18.0.6:10000/clusters   # excerpt
default_k8s-fe-lab_core_Service_80::10.96.35.226:80::cx_total::1
default_k8s-fe-lab_core_Service_80::10.96.35.226:80::rq_total::1
```

So: **whether the door bypasses the Service depends on the implementation.** cloud-provider-kind's gateway sends to the ClusterIP and rides kube-proxy; the ingress-nginx and Envoy Gateway families go straight to pod IPs. Which one you have determines the path by which pod-list changes reach the door (kube-proxy's rule refresh versus the controller's own EndpointSlice subscription), so the method of checking this on a running cluster is itself the tool to take from this section: dump the controller's backend list: pod IPs mean direct, a ClusterIP means via. Either way, the fact remains that during a deploy, each path converges on the new pod list on its own clock, and that is raw material for [the next part](/en/2026/08/k8s-for-frontend-4) on deploy-time 5xx.

> **Clue note**: Service types are not options but layers (LoadBalancer ⊃ NodePort ⊃ ClusterIP). Whether the L7 door bypasses the Service depends on the implementation, and the controller's backend dump is the way to tell.

## Why Does port-forward Always Work? The Identity of the Tunnel

The path's final piece is `kubectl port-forward`, used daily on dev machines. Part 1 stated only the conclusion (a tunnel via the API server that touches none of the real traffic path), and this time I fill in, with measurements, exactly how far that bypass goes.

The tunnel's transport first. Run port-forward with verbose logging and the identity shows immediately:

```text
$ kubectl port-forward deploy/k8s-fe-lab 18080:3000 -v=6
... url="https://127.0.0.1:.../api/v1/namespaces/default/pods/k8s-fe-lab-...-lhlf9/portforward"
    status="101 Switching Protocols"
... negotiated protocol: portforward.k8s.io
```

An HTTP request to the API server upgrades to WebSocket (101), and the port's bytes ride on top. (It used to run over SPDY, a defunct protocol; the [WebSocket tunnel](https://kubernetes.io/blog/2024/08/20/websockets-transition/) went GA in v1.35.) The URL in the log reveals one more thing: I ran it as `deploy/name`, yet the actual tunnel attached to one specific pod. Same with a Service name:

```bash
$ kubectl port-forward svc/k8s-fe-lab 18081:80   # then 10 requests
  10 k8s-fe-lab-5cfb6b8744-lhlf9
```

All 10 requests, same pod. **port-forward accepts svc but does not load balance; it picks one pod and pins to it.** This is why no amount of local hammering will ever surface a distribution problem.

What this tunnel bypasses shows most dramatically when crossed with the readiness experiment. With one pod's readiness toggled off and its EndpointSlice ready=false confirmed, I approached it three ways:

| Access path (same NotReady pod) | Result                                  |
| ------------------------------- | --------------------------------------- |
| Via Service (20 new conns)      | 0 to that pod (other two split 11/9)    |
| curl straight to the pod IP     | 200 OK (the process is perfectly alive) |
| port-forward to that same pod   | **200 OK**                              |

In the Service's world this pod does not exist, but port-forward passes through neither the roster (EndpointSlice) nor the rules (iptables); it plugs straight into the pod and answers happily. The textbook case of "works over port-forward, fails in production." For the same reason, NetworkPolicy and a service mesh's mTLS do not apply to this tunnel either.

The trap runs in the opposite direction too. At the far end of this tunnel, the node's containerd enters the pod's network namespace (the isolation device from Part 2) and connects to the target port at 127.0.0.1. The tunnel's terminus, in other words, is 127.0.0.1 inside the pod, and when that meets [Part 2's HOSTNAME trap](/en/2026/08/k8s-for-frontend-2) (Next.js standalone binding only to the pod IP), the symptom inverts. I deliberately deployed an image without the HOSTNAME fix and approached three ways:

| Access path (app bound to pod IP only) | Result                                       |
| -------------------------------------- | -------------------------------------------- |
| Via Service                            | 200 OK (DNAT to pod IP)                      |
| readiness probe                        | Passes (kubelet also probes pod IP, Ready)   |
| Via port-forward                       | **Fails** (127.0.0.1 at the far end refused) |

Production perfectly fine, port-forward alone failing: the exact inverse of the usual assumption. port-forward shares no segment with the real path, so both its successes and its failures are events independent of production's state. Its value as a debugging tool stands, but as a verification tool, the table shows the intersection with the real path is empty.

> **Clue note**: port-forward is a WebSocket tunnel via the API server, plugged into one pod's 127.0.0.1. It traverses none of Service, EndpointSlice, iptables, or NetworkPolicy; its results prove nothing about the real path.

## When You Hit "But It Worked Locally"

Overlay the three paths this post examined and you get a map for back-solving which layer a symptom belongs to.

| Layer traversed        | Browser (via the door) | SSR internal call | port-forward |
| ---------------------- | :--------------------: | :---------------: | :----------: |
| Cluster DNS (ndots)    |           X            |         O         |      X       |
| L7 door (Gateway etc.) |           O            |         X         |      X       |
| ClusterIP DNAT rules   |    depends on impl     |         O         |      X       |
| EndpointSlice roster   |           O            |         O         |      X       |
| conntrack pinning      |    depends on impl     |         O         |      X       |

On this map, here is where to look first for the symptoms that come up most often:

| Symptom                                  | Open first                                                           |
| ---------------------------------------- | -------------------------------------------------------------------- |
| port-forward works, production doesn't   | Service selector and targetPort, then EndpointSlice ready conditions |
| Pod IP works, ClusterIP doesn't          | That node's KUBE-SVC chain (kube-proxy state)                        |
| Scaled replicas, one pod stays busy      | The client's keep-alive (conntrack pinning)                          |
| Internal calls intermittently slow       | resolv.conf ndots and notation; lookup bursts when connections churn |
| Service works, only port-forward refused | The app's bind address (Part 2's HOSTNAME trap)                      |
| `get endpoints` prints a warning         | Normal; time to switch to reading EndpointSlice                      |

The verification method for each row sits in its section above, measurements included; use this table only to map symptom to layer.

> **Clue note**: Symptoms pinpoint layers. That no layer is traversed by all three paths is the diagnostic lever.

## Wrap-up: The Answer to the Mystery

The result of chasing an IP that does not exist, restated by collecting each section's clue notes:

- **ClusterIP is nowhere.** It exists as strings in each node's NAT rules, and the kernel rewrites destinations to pod IPs. A waterfall of probabilities (1/3, 1/2, remainder) was the entirety of load balancing, and rules matching ICMP numbered zero.
- **Distribution happens once, at connection birth.** conntrack pins the decision, so 30 consecutive calls over Node's keep-alive-by-default fetch went to one pod. For clients that hold connections long, the Service's distribution effectively does not exist.
- **Readiness is not roster removal but a condition flip.** Of the 11 seconds to flip EndpointSlice's ready, 10.6 were the probe detection window and propagation was sub-second, with zero errors across 826 requests (under experiment conditions where the app itself stayed healthy throughout). Removal is deliberate (3 straight failures), return is fast (1 success), by design.
- **Notation is performance.** Because of ndots:5, the full FQDN is slowest at 8 queries and the short name fastest at 2, and external domain lookups amplify to 8 as well. Lookups are per-connection, so they stampede during spikes.
- **SSR's fetch and the browser's fetch are different roads.** From name resolution to balancing agent, no layer overlaps; internal calls pass through this post's world (search walk, DNAT, conntrack pinning) unabridged.
- **Whether the outside door bypasses the Service depends on the implementation.** This experiment's gateway went via ClusterIP; the ingress-nginx family defaults to pod-direct. The controller's backend dump is the discriminator.
- **port-forward passes by all of it.** It reaches pods missing from the roster, and uniquely fails against apps bound only to the pod IP. Local success and failure are no evidence about production.

The [pod sizing post](/en/2026/08/nodejs-k8s-pod-sizing) used the phrase "until iptables and the load balancer converge" while covering graceful shutdown; this part has now filled in what that convergence actually is. And one condition deferred throughout this part remains: EndpointSlice's third condition, terminating: the case of a pod leaving the roster because it is dying. A living pod's ready transition was graceful, zero errors; there is no guarantee dying is equally graceful. In what order do the termination signal and roster removal race, and what are the 5xx that leak through the gap? [The next part, on the pod's life and death](/en/2026/08/k8s-for-frontend-4), reproduces that race and walks through driving the 5xx to zero with configuration.
