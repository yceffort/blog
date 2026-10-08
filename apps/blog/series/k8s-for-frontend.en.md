---
name: 'Kubernetes for Frontend Developers'
title: '<em>Kubernetes</em> for Frontend Developers'
description: 'A record of opening up and measuring Kubernetes in a kind cluster, so that frontend developers running SSR do not have to treat it as a black box'
---

Once you run SSR, about half of the problems with deployment, traffic, and memory happen outside the application, in Kubernetes. Yet for frontend developers, Kubernetes tends to stay a black box of manifests that someone else wrote and that you copy. This series opens that black box one layer at a time.

Each part does not stop at explaining concepts. The rule was to reproduce and measure everything with a kind cluster and a real Next.js app: tracing the 1.5GB that disappeared in an image layer, following through iptables rules how curl reaches a ClusterIP that exists nowhere, and stacking fixes one layer at a time until the errors leaking during a rolling deploy reach zero.

The first part serves as a concept map for the whole series, so if Kubernetes is new to you, reading in order is recommended. If you are dealing with a specific problem, each part is written to stand on its own.
