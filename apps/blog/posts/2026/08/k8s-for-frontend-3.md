---
title: '트래픽은 어떻게 내 파드에 도착하는가: ClusterIP부터 port-forward까지'
tags:
  - kubernetes
  - networking
  - nextjs
  - nodejs
  - frontend
published: true
date: 2026-08-06 23:00:00
description: 'Service의 ClusterIP는 어느 기계에도 붙어 있지 않은 IP인데 curl은 어떻게 닿는가. iptables 규칙과 conntrack, EndpointSlice, 클러스터 DNS의 ndots, Gateway, port-forward까지, 요청이 파드에 도착하는 경로 전체를 kind 클러스터에서 직접 열어본 기록이다. 프론트엔드 개발자를 위한 쿠버네티스 시리즈의 세 번째 편이다.'
thumbnail: /thumbnails/2026/08/k8s-for-frontend-3.png
series: '프론트엔드 개발자가 알아야 할 쿠버네티스'
seriesOrder: 3
---

## Table of Contents

## 수수께끼를 여는데, 실험 환경이 거짓말을 한다

[2편](/2026/08/k8s-for-frontend-2)의 마지막 문장에서 약속을 하나 했다. `kubectl get svc`가 보여주는 ClusterIP는 ping도 받지 않는 이상한 IP인데, 어떻게 트래픽이 그리로 흘러 들어가는지 직접 열어서 확인하겠다는 것이었다. 그 약속을 지키러 클러스터 안에 디버그 파드를 하나 띄우고, 우리 Service의 ClusterIP인 10.96.35.226부터 확인했다.

```bash
$ kubectl exec debug -- curl -s http://10.96.35.226/api/health
{"ok":true,"pod":"k8s-fe-lab-5cfb6b8744-qppld"}
```

curl은 잘 된다. 응답에 파드 이름까지 실려 온다. 이제 약속했던 ping이다. 1편에 어떤 기계나 프로세스에도 붙어 있지 않아 ping도 받지 않는 가상 주소라고 적어 두었으니, 실패하는 장면을 확인하면 된다.

```bash
$ kubectl exec debug -- ping -c 3 10.96.35.226
64 bytes from 10.96.35.226: seq=0 ttl=62 time=0.203 ms
64 bytes from 10.96.35.226: seq=1 ttl=62 time=0.506 ms
64 bytes from 10.96.35.226: seq=2 ttl=62 time=0.716 ms
3 packets transmitted, 3 packets received, 0% packet loss
```

응답이 온다. 두 편에 걸쳐 예고한 실험이 첫 명령에서 어긋난 것이다. 당황해서 어떤 Service에도 할당되지 않은 10.96.222.222에 ping을 쳐 봤다. 역시 응답한다. 그러면 존재 자체가 불가능한 주소는 어떤가. 198.51.100.7은 RFC 5737이 문서 예시용으로 예약해 둔 대역(TEST-NET-2)이라, 인터넷 어디에도 이 주소로 응답하는 호스트가 있어서는 안 된다.

```bash
$ kubectl exec debug -- ping -c 3 198.51.100.7
64 bytes from 198.51.100.7: seq=0 ttl=62 time=0.147 ms
3 packets transmitted, 3 packets received, 0% packet loss
```

이것마저 응답한다. 전부 같은 ttl=62, 1ms 미만이다. 세상 모든 IP가 0.5ms 거리에 살아 있는 것처럼 보이는 이 상황의 정체는, 쿠버네티스가 아니라 실험 환경 쪽에 있었다. 이 실험은 macOS 위의 colima VM에서 도는데, colima의 유저모드 네트워크 게이트웨이가 사실상 모든 목적지의 ICMP echo에 대신 응답해 준다. 리눅스에 도커를 직접 올린 환경에서는 이런 위조 계층이 없어서, 같은 명령이 예고대로 타임아웃으로 끝나는 것으로 알려져 있다. 즉 ping의 성공도 실패도 환경에 따라 갈리는 값이라, 이 수수께끼의 증거로는 쓸 수 없게 됐다.

그런데 이 소동 덕에 질문이 오히려 선명해졌다. curl 쪽을 다시 보면, 진짜 ClusterIP에는 200이 오지만 미할당 IP에는 5초를 기다려도 아무것도 오지 않는다. ping은 거짓말을 해도 curl은 정확히 구분하고 있는 것이다. 그러니 이 글의 질문은 이렇게 다시 세울 수 있다. **어느 기계에도 붙어 있지 않은 IP에, curl은 어떻게 닿는가.** 이번에는 관찰이 아니라 규칙의 원문을 열어서 증명할 것이고, 그 추적이 분배의 단위(conntrack), 트래픽 대상 명단(EndpointSlice), 이름의 해석(클러스터 DNS), 바깥에서 들어오는 문(Gateway), 그리고 그 전부를 우회하는 터널(port-forward)까지 이어진다. 시작하자마자 실험 환경의 함정을 하나 밟은 이 장면은, 마지막 절에서 다룰 "로컬에선 됐는데"라는 주제의 축소판이기도 하다.

이 글은 "프론트엔드 개발자가 알아야 할 쿠버네티스" 시리즈의 세 번째 편이다. 용어가 낯설면 [1편의 개념 지도](/2026/08/k8s-for-frontend-1)를, 파드와 컨테이너의 실체는 [2편](/2026/08/k8s-for-frontend-2)을 먼저 읽는 것을 권한다.

> 측정 환경: Apple M5 macOS 위의 colima VM(4 CPU/8GB), kind v0.32.0(kindest/node v1.36.1, Kubernetes v1.36.1), kube-proxy는 kind 기본값인 iptables 모드, 노드의 iptables는 v1.8.11(nf_tables), 앱은 Next.js 16.2.12 standalone(node:24-slim, Node v24.19.0, glibc)이다. LoadBalancer와 Gateway는 cloud-provider-kind v0.11.1과 Gateway API CRD v1.5.1로 구성했다. 배포 구성은 [2편](/2026/08/k8s-for-frontend-2)에서 세 가지가 달라졌다. Deployment는 2레플리카에서 3레플리카로 늘렸고, readiness probe는 `/api/health`를 5초 간격으로 본다(periodSeconds 5. 2편 매니페스트는 기본값인 10초였다). 그리고 2편까지는 만들지 않았던 Service를 이번에 추가했다. `app: k8s-fe-lab` 레이블의 파드들을 셀렉터로 묶어 port 80을 targetPort 3000에 연결하는 ClusterIP 타입이고, 본문의 10.96.35.226이 이 Service가 할당받은 주소다. 재현 시 두 가지 유의 사항이 있다. colima의 유저모드 네트워크는 위에서 본 것처럼 모든 ICMP에 대신 응답하고, 앱 컨테이너(node:24-slim)에는 ping/curl/dig가 없어서 진단 도구를 담은 debug 파드와 Node 기준 실측(fetch, `dns.lookup`)용 client 파드를 따로 띄웠다. 측정 스크립트와 raw 로그는 별도 보관했다.

## 응답한 것은 누구인가: 규칙으로만 존재하는 IP

1편에서 kube-proxy를 "파드로 트래픽이 찾아올 수 있게 각 노드의 네트워크 규칙을 관리한다"라고만 적고 넘어갔다. 그 미뤄둔 설명을 여기서 회수한다. ClusterIP의 실체가 바로 그 "규칙"이기 때문이다.

kind의 노드는 도커 컨테이너이므로(2편), `docker exec`로 노드에 들어가 NAT(패킷의 주소를 바꿔 쓰는 커널의 규칙층) 규칙을 직접 덤프할 수 있다. 노드의 iptables(리눅스 커널의 패킷 처리 규칙을 관리하는 도구) 규칙에서 우리 Service를 찾으면 이렇게 나온다.

```text
$ docker exec k8s-fe-lab-worker iptables-save -t nat | grep 10.96.35.226
-A KUBE-SERVICES -d 10.96.35.226/32 -p tcp -m comment --comment "default/k8s-fe-lab cluster IP"
   -m tcp --dport 80 -j KUBE-SVC-ISVZ3COTGREXVRO2
```

읽어 보면, 목적지가 10.96.35.226이고 TCP 80 포트인 패킷을 `KUBE-SVC-ISVZ3COTGREXVRO2`라는 체인으로 넘기라는 규칙이다. 그 체인을 열면, 개인적으로 이 시리즈를 준비하며 본 것 중 가장 인상적이라고 생각한 규칙이 나온다.

```text
... (마스커레이드 마킹 규칙 KUBE-MARK-MASQ 한 줄 생략)
-A KUBE-SVC-ISVZ3COTGREXVRO2 -m comment --comment "default/k8s-fe-lab -> 10.244.1.12:3000"
   -m statistic --mode random --probability 0.33333333349 -j KUBE-SEP-FRMIQDBY5TTCZ5G3
-A KUBE-SVC-ISVZ3COTGREXVRO2 -m comment --comment "default/k8s-fe-lab -> 10.244.1.13:3000"
   -m statistic --mode random --probability 0.50000000000 -j KUBE-SEP-DIIQGOM6OBXKX6MD
-A KUBE-SVC-ISVZ3COTGREXVRO2 -m comment --comment "default/k8s-fe-lab -> 10.244.2.11:3000"
   -j KUBE-SEP-5SCZPP47RXDJDPM7
```

3레플리카에 대한 로드밸런싱이 이 세 줄이다. 첫 규칙이 1/3 확률로 첫 파드를 고르고, 남은 2/3 중 절반(0.5)이 둘째 파드, 나머지는 무조건 셋째 파드로 간다. 결과적으로 각 파드가 1/3씩 받는 확률의 폭포다. 규칙 주석에 대상 파드 IP까지 박혀 있어서, 이 덤프만으로 어느 파드로 갈 수 있는지가 다 보인다. 각 KUBE-SEP 체인의 내용은 DNAT, 즉 목적지 주소를 바꿔치기하는 것이다.

```text
-A KUBE-SEP-FRMIQDBY5TTCZ5G3 -p tcp -m comment --comment "default/k8s-fe-lab"
   -m tcp -j DNAT --to-destination 10.244.1.12:3000
```

여기까지 오면 인트로의 질문에 답할 수 있다. curl이 10.96.35.226에 닿는 것처럼 보였던 이유는, 그 주소로 가는 패킷이 노드를 지나는 순간 커널이 목적지를 파드 IP로 바꿔 써 버리기 때문이다. **ClusterIP라는 기계는 어디에도 없다. 각 노드의 NAT 규칙 안에 문자열로만 존재한다.** 그 규칙을 Service와 파드 목록의 변화에 맞춰 계속 다시 쓰는 프로세스가 kube-proxy다.

ping이 (제대로 된 환경에서) 실패하는 이유도 같은 덤프에서 확인된다. NAT 테이블 전체에서 프로토콜 매칭을 세어 보면 TCP/UDP 포트 매칭 규칙이 18개, ICMP를 매칭하는 규칙은 0개다. ping이 쓰는 ICMP 패킷은 위의 어떤 규칙에도 걸리지 않고, 바꿔치기되지 못한 목적지 10.96.35.226에는 응답할 실체가 없다. 존재하지 않는 IP가 curl에는 응답하고 ping에는 침묵하는 이유가, 규칙이 "TCP 80 포트"라고 명시된 데까지 내려가면 당연한 일이 된다.

버전 이야기를 여기서 한 번 정리해 둘 필요가 있다. 이 iptables 모드는 v1.36 기준으로도 리눅스에서 kube-proxy의 기본값이다. 후계자인 [nftables 모드](https://kubernetes.io/blog/2025/02/28/nftables-kube-proxy/)가 v1.33에서 GA가 됐지만 기본값은 바뀌지 않았고, 한때 대안으로 꼽히던 IPVS 모드는 v1.35에서 폐기 예정(deprecated)이 된 데 이어 v1.36에서는 아예 제거됐다. 그래서 이 글은 iptables 모드만 해부한다. 한 가지 주의할 점은, v1.35 이하 클러스터에 아직 남아 있을 수 있는 IPVS 모드에서는 ClusterIP가 노드의 더미 인터페이스에 실제로 바인드되어 ping이 진짜로 응답한다는 것이다. "ClusterIP는 ping이 안 된다"는 서술 자체가 모드 한정의 이야기인 셈이다.

재미있는 층이 하나 더 있다. 노드의 iptables 버전이 v1.8.11(nf_tables)인데, 이는 iptables 명령이 실제로는 커널의 nftables 하위 시스템에 규칙을 쓰는 호환 계층이라는 뜻이다. 실제로 nft 명령으로 같은 체인을 열면 동일한 규칙이 nft 문법으로 보이고, 첫 줄에 이런 경고까지 나온다.

```text
$ docker exec k8s-fe-lab-worker nft list chain ip nat KUBE-SERVICES
# Warning: table ip nat is managed by iptables-nft, do not touch!
```

즉 "kube-proxy의 iptables 모드"와 "커널의 nftables"는 서로 다른 층의 이야기라서, iptables 모드조차 커널 안에서는 nftables로 구현되어 있다. kube-proxy의 nftables 모드는 이 호환 계층을 걷어내고 nftables API를 직접 쓰는 재작성이라고 이해하면 된다.

> **단서 노트**: ClusterIP는 어느 기계에도 없고, 각 노드의 NAT 규칙 안에만 있다. curl이 닿는 것은 커널이 목적지를 파드 IP로 바꿔 쓰기 때문이고, ping이 침묵하는 것은 규칙이 TCP 80만 매칭하기 때문이다.

## 쉬어가기: 전화기 없는 대표번호

여기서 잠깐 비유 하나로 지금까지의 그림을 정리해 둔다. 회사 대표번호로 전화를 걸면 실제로는 상담원 중 한 명에게 연결되는데, 대표번호 자리에 전화기가 놓여 있는 것은 아니다. ClusterIP가 그 대표번호다. 교환대에는 걸려온 전화를 어느 내선으로 꽂을지 정하는 규칙표가 있고, 그것이 방금 본 iptables의 확률 규칙이다. 그리고 이 비유에서 미리 챙겨둘 부분이 두 가지 있다. 일단 연결된 통화는 끊길 때까지 교환대를 다시 거치지 않는다는 것(다음 절의 conntrack), 그리고 전화번호부는 번호를 알려줄 뿐 통화 자체에는 관여하지 않는다는 것(DNS 절)이다.

| 전화 비유                             | 쿠버네티스                    |
| ------------------------------------- | ----------------------------- |
| 전화기가 놓여 있지 않은 대표번호      | ClusterIP                     |
| 교환대의 연결 규칙표                  | iptables의 KUBE-SVC 확률 규칙 |
| 규칙표를 계속 갱신하는 담당자         | kube-proxy                    |
| 오늘 근무 중인 상담원 명단            | EndpointSlice (두 절 뒤)      |
| 일단 연결되면 교환대를 안 거치는 통화 | conntrack (바로 다음 절)      |
| 대표번호를 찾는 전화번호부            | 클러스터 DNS (세 절 뒤)       |

## 분배는 왜 요청 단위가 아닌가: keep-alive와 conntrack

앞 절의 확률 규칙을 보면 요청이 파드 세 개에 고르게 흩어질 것 같지만, 실제로 BFF(프론트엔드 팀이 관리하는 API 중간 서버)를 운영하다 보면 파드 하나만 유난히 바쁜 그래프를 만나게 된다. 그 이유를 클러스터 안의 클라이언트 파드에서 직접 재현해 봤다. Node.js의 내장 fetch로 Service에 30번 연속 요청을 보내고, 응답에 실린 파드 이름을 세는 실험이다.

| 호출 방식 (모두 같은 Service, 3레플리카)   | 파드별 응답 수        |
| ------------------------------------------ | --------------------- |
| 단일 Node 프로세스에서 fetch 30회 연속     | **30 / 0 / 0**        |
| 요청마다 새 프로세스(새 TCP 커넥션)로 21회 | 9 / 6 / 6             |
| 단일 프로세스, 요청 간격 4.5초로 8회       | 4 / 3 / 1 (매번 섞임) |

첫 행이 문제의 재현이다. 30번의 요청이 전부 한 파드로 갔다. 확률 규칙이 고장 난 것이 아니라, 그 규칙이 **적용되는 단위가 요청이 아니라 커넥션**이기 때문이다. iptables의 NAT는 커넥션의 첫 패킷에만 적용되고, 커널은 그 결정을 conntrack(연결 추적 테이블)에 기록해 뒀다가 같은 커넥션의 나머지 패킷을 전부 같은 파드로 보낸다. 노드에서 그 테이블을 열어 보면 결정의 기록이 그대로 있다.

```text
$ docker exec k8s-fe-lab-worker conntrack -L -d 10.96.35.226
tcp  ESTABLISHED src=10.244.1.9 dst=10.96.35.226 sport=45364 dport=80
     src=10.244.1.13 dst=10.244.1.9 sport=3000 dport=45364 [ASSURED]
```

클라이언트(10.244.1.9)가 ClusterIP로 보낸 커넥션이 파드 10.244.1.13으로 변환되어 고정돼 있다(살아 있는 커넥션을 잡으려고 2초 간격 호출을 돌리는 동안 캡처한 것으로, 요청이 끝난 직후에 잡으면 같은 엔트리가 TIME_WAIT 상태로 남아 있다).

그럼 왜 30번의 요청이 커넥션 하나였는가. Node의 fetch를 구현하는 undici가 기본으로 keep-alive 커넥션 풀을 쓰고, 그 유지 시간([keepAliveTimeout](https://github.com/nodejs/undici/blob/v7.29.0/docs/docs/api/Client.md), Node v24.19.0 내장 undici v7.29.0 기준)이 기본 4초이기 때문이다. SSR이나 BFF처럼 같은 내부 API를 계속 부르는 서버에서는 요청 간격이 4초를 넘기 어려우니, 사실상 커넥션 하나가 계속 재사용된다. 표의 셋째 행이 그 경계의 증명이다. 요청 간격을 4.5초로 벌리자 커넥션이 매번 새로 열리면서 분배가 되살아났다.

이것이 실무에서 뜻하는 바는 분명하다. **커넥션을 오래 유지하는 클라이언트에게 Service의 로드밸런싱은 사실상 없다.** 레플리카를 늘려도 기존 커넥션은 옮겨가지 않고, BFF 인스턴스 수가 적으면 뒷단 파드 몇 개에 부하가 쏠린다. 이 성질은 gRPC처럼 커넥션을 더 오래 쓰는 프로토콜에서 더 심해지는 것으로 [잘 알려져 있고](https://learnkube.com/kubernetes-long-lived-connections), 해법은 커넥션 수명을 제한하거나, 클라이언트 쪽에서 파드 목록을 보고 직접 분배하거나, 서비스 메시처럼 요청 단위로 프록시하는 층을 두는 쪽으로 간다. 어느 쪽이든 "Service가 알아서 골고루 나눠 줄 것"이라는 가정부터 접는 것이 시작이라고 생각한다.

재현할 때 주의할 점이 하나 있다. undici의 fetch는 Connection 헤더 지정을 금지해서, 헤더로는 keep-alive를 끌 수 없다. 요청마다 새 dispatcher(undici의 Agent)를 만들어 넘기는 방법도 있지만, 위 실험은 더 단순하고 확실한 "요청마다 새 프로세스"로 대조군을 만들었다.

> **단서 노트**: 분배는 커넥션이 태어나는 순간 한 번만 일어나고, conntrack이 그 결정을 커넥션이 끝날 때까지 고정한다. keep-alive가 기본인 Node fetch의 연속 호출은 그래서 한 파드로 쏠린다.

## 파드는 언제 명단에서 빠지는가: EndpointSlice 전환 타임라인

지금까지는 파드 세 개가 모두 건강한 상태였다. 이제 그중 하나가 아프면 무슨 일이 일어나는지 볼 차례인데, 그 전에 1편에서 소개한 Endpoints를 kubectl로 조회해 보면 흥미로운 것이 나온다.

```text
$ kubectl get endpoints
Warning: v1 Endpoints is deprecated in v1.33+; use discovery.k8s.io/v1 EndpointSlice
```

1편에서 "Service가 트래픽을 보낼 준비된 파드 목록"이라고 소개한 Endpoints는, v1.33부터 공식적으로 폐기 예정이 된 [구세대 API](https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/)다. 오브젝트 자체는 계속 존재하고 채워지지만, 표준은 EndpointSlice로 넘어갔다. 그래서 이 글의 실측은 전부 EndpointSlice 기준으로 진행한다.

EndpointSlice를 직접 열어 보면 1편의 설명을 정정할 부분이 하나 나온다. readiness에 실패한 파드는 명단에서 "빠지는" 것이 아니다. 엔드포인트는 목록에 그대로 남고, 세 가지 조건 중 `ready`가 false로 뒤집힐 뿐이다. 조건은 ready(트래픽을 받아도 되는가), serving(종료 여부와 무관하게 응답할 수 있는가), terminating(종료 중인가)의 셋인데, terminating은 파드가 죽는 이야기라 [다음 편](/2026/08/k8s-for-frontend-4)의 몫이고, 이번 편은 살아 있는 파드의 ready 전환만 다룬다.

그 전환에 시간이 얼마나 걸리는지 재 봤다. 예제 앱에 `/api/toggle?ready=false`를 추가해서, 프로세스는 멀쩡히 살아 있는 채로 readiness probe만 503을 받게 만들었다. 실험자가 실패의 시작 시각(T0)을 정할 수 있게 한 것이다. 동시에 클러스터 안에서 요청마다 새 커넥션을 여는 트래픽을 120ms 간격으로 계속 흘리면서(앞 절에서 본 대로, keep-alive 커넥션은 분배가 고정되어 이런 관찰에 쓸 수 없다), EndpointSlice의 ready 조건과 노드의 KUBE-SEP 규칙 존재 여부를 약 0.2초 간격(150ms 대기에 명령 실행 시간이 더해진 실측 간격)으로 관찰했다. probe는 5초 간격이고, 연속 3회 실패해야 NotReady가 되는 기본값(failureThreshold 3) 그대로다.

| 사건 (탈락 방향)                            | 시각 (실측) | T0 기준 |
| ------------------------------------------- | ----------- | ------- |
| `/api/health`가 503을 돌려주기 시작 (T0)    | 13:46:36.4  | 0초     |
| kubelet이 3연속 실패 확인, 파드 Ready=False | 13:46:47    | +10.6초 |
| 해당 파드로의 마지막 실트래픽 관찰          | 13:46:47.3  | +10.9초 |
| 노드의 KUBE-SEP 규칙(DNAT 대상) 소멸 관찰   | 13:46:47.7  | +11.4초 |
| EndpointSlice `ready=false` 관찰            | 13:46:47.7  | +11.4초 |

마지막 두 관찰은 6ms 차이로 폴링 해상도 안에 있어, 선후를 말할 수 없는 사실상의 동시 사건이다(인과 순서는 슬라이스 갱신이 먼저다). 표에서 눈에 띄는 것은 시간의 분포다. 11초 남짓 중 10.6초가 probe의 감지 창(5초 간격 x 3연속 실패)이고, kubelet의 판정에서 EndpointSlice 갱신, kube-proxy의 규칙 재작성, 실제 트래픽 이탈까지의 전파는 전부 같은 1초 안에서 끝났다. 이 중 명단 갱신부터 규칙 반영까지는 쿠버네티스가 [in-cluster network programming latency](https://github.com/kubernetes/community/blob/master/sig-scalability/slos/network_programming_latency.md)라는 이름의 공식 SLI(Service Level Indicator, 서비스 품질을 재는 지표)로 정의하는 구간이고, kube-proxy가 그 지연을 노드 안 127.0.0.1:10249에 히스토그램 메트릭으로 노출한다. 이번 실험의 전환 두 번 동안 그 카운트가 38에서 40으로 늘었고 누적 합은 1.52초 늘었으니, 명단 갱신부터 규칙 반영까지 한 번에 평균 0.76초가 걸린 셈이다. 즉 이 지연을 줄이고 싶다면 조정할 대상은 클러스터가 아니라 probe 설정 쪽이라는 결론이 나온다.

복귀 방향도 같은 방법으로 쟀다.

| 사건 (복귀 방향)                                | 시각 (실측) | T1 기준 |
| ----------------------------------------------- | ----------- | ------- |
| `/api/health`가 200을 돌려주기 시작 (T1)        | 13:47:08.5  | 0초     |
| 파드 Ready=True                                 | 13:47:12    | +3.5초  |
| EndpointSlice `ready=true` + KUBE-SEP 규칙 복원 | 13:47:12.8  | +4.3초  |
| 해당 파드로의 첫 실트래픽 복귀                  | 13:47:12.8  | +4.3초  |

탈락에 11초, 복귀에 4초. 이 비대칭은 우연이 아니라 기본값의 설계다. 탈락은 연속 3회 실패(failureThreshold 3)를 요구하지만 복귀는 성공 1회(successThreshold 1)면 충분하다. 트래픽에서 빼는 결정은 신중하게, 되돌리는 결정은 빠르게 하겠다는 뜻으로 읽힌다. 참고로 readiness probe는 liveness와 달리 successThreshold를 1보다 크게 줄 수 있어서, 복귀 쪽을 일부러 신중하게 만들어 잦은 왕복(flapping)을 누르는 조정도 가능하다.

기록해 둘 만한 관찰이 하나 더 있다. 이 전환 실험 동안 흘린 826개의 요청 중 **에러는 0개였다.** readiness에 의한 탈락은 새 커넥션이 그 파드를 피해 가게 만드는 일이라, 이미 진행 중인 요청을 죽이지 않는다. 다만 이 0을 readiness의 공으로만 읽으면 곤란하다. 이 실험은 probe 응답만 503으로 바꿨을 뿐 앱은 내내 정상이어서, 감지 창 10.6초 동안 그 파드로 간 요청들도 전부 200을 받았다. 파드가 실제로 고장 난 상황이라면 바로 그 감지 창이 에러가 새는 구간이 된다. 여기서 확인된 것은 전환 메커니즘 자체가 요청을 흘리지 않는다는 것까지다. 배포 때마다 5xx가 새는 문제는 이 경로가 아니라 파드가 종료될 때의 다른 경주에서 나오는데, 그 이야기는 [파드의 삶과 죽음 편](/2026/08/k8s-for-frontend-4)에서 재현한다.

> **단서 노트**: readiness 실패는 명단 제거가 아니라 EndpointSlice ready 조건의 전환이고, 지연의 지배항은 전파(1초 미만)가 아니라 probe 감지 창이다. 탈락(3연속 실패)과 복귀(1회 성공)는 의도된 비대칭이다.

## 같은 이름인데 왜 빠르고 느린가: 클러스터 DNS와 ndots

지금까지 클라이언트는 ClusterIP 숫자를 직접 썼지만, 실제 코드는 `http://internal-api` 같은 이름을 쓴다. 이름이 ClusterIP가 되는 과정에도 함정이 하나 숨어 있어서, 같은 Service를 어떻게 표기하느냐에 따라 DNS 왕복 수가 4배까지 벌어진다. 출발점은 파드 안의 리졸버 설정 파일이다.

```text
$ kubectl exec client -- cat /etc/resolv.conf
search default.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
options ndots:5
```

nameserver는 클러스터 DNS(CoreDNS)의 ClusterIP다. 문제는 나머지 두 줄의 조합이다. search는 이름 조회가 실패(NXDOMAIN, 그런 이름은 없다는 응답)했을 때 뒤에 붙여 볼 접미사 목록이고, ndots:5는 "점이 5개 미만인 이름은 완전한 이름이 아닐 수 있으니 search 접미사부터 붙여 보라"는 지시다. 점이 5개 이상인 도메인은 흔치 않으므로, 파드 안에서 조회하는 거의 모든 이름이 search 순회를 거치게 된다.

이게 실제로 몇 번의 조회를 만드는지, CoreDNS의 log 플러그인을 켜서 쿼리를 전수 계수해 봤다. 조회는 glibc 파드의 Node `dns.lookup`(HTTP 클라이언트가 실제로 타는 경로)으로 했고, A와 AAAA 레코드가 병렬로 나가므로 이름 시도 1번이 쿼리 2개다.

| 같은 Service의 표기                       | 이름 시도 | DNS 쿼리 | NXDOMAIN | 조회 지연 |
| ----------------------------------------- | --------- | -------- | -------- | --------- |
| `internal-api`                            | 1         | 2        | 0        | 2.4ms     |
| `internal-api.default`                    | 2         | 4        | 2        | 2.5ms     |
| `internal-api.default.svc.cluster.local`  | **4**     | **8**    | **6**    | 2.8ms     |
| `internal-api.default.svc.cluster.local.` | 1         | 2        | 0        | 2.3ms     |

셋째 행이 이 표의 반전이다. 흔히 "정식 이름"이라 부르는 FQDN(fully qualified domain name, 도메인 전체를 끝까지 적은 이름)이 가장 많은 쿼리를 만든다. 점이 4개라 ndots:5의 기준에 미달하고, 그래서 search 접미사 세 개를 전부 붙여 NXDOMAIN을 세 번 받은 뒤에야 원래 이름을 시도하기 때문이다. 반대로 단축명은 첫 search 후보에서 바로 적중하고, 끝에 점을 붙인 이름(trailing dot)은 절대 이름으로 취급되어 search를 아예 건너뛴다. 클러스터 안에서는 지연 차이가 ms 단위에서 안 보일 만큼 작지만(클러스터 내부 이름은 CoreDNS 자신이 원본 데이터를 들고 있어 바로 답한다), 쿼리 수는 표 그대로 4배다.

외부 도메인도 증폭 자체는 피하지 못한다. 같은 방법으로 `www.example.com`(점 2개)을 조회하면 search 후보 3개가 전부 NXDOMAIN, 마지막 절대 이름 시도까지 이름 4개 x A/AAAA = **쿼리 8개**가 나간다. 콜드 조회에 73.9ms가 걸렸고 끝에 점을 붙인 `www.example.com.`은 쿼리 2개에 2.3ms였는데, 이 차이를 증폭의 비용으로 읽으면 안 된다. 뒤쪽은 직전 조회로 CoreDNS에 캐시가 생긴 웜 상태라 업스트림 왕복 자체가 빠진 수치이고, 이 환경의 search 접미사는 셋 다 cluster.local 하위라 NXDOMAIN 6개도 CoreDNS가 즉답하는, 비용이 거의 들지 않는 실패다. 즉 73.9ms의 지배항은 증폭이 아니라 마지막 절대 이름의 업스트림 왕복이다. 증폭이 지연과 안정성 문제로 본격화되는 것은 EKS처럼 노드의 search를 상속받아 접미사 붙은 실패 조회까지 업스트림으로 포워딩되는 환경이나 UDP 유실로 재시도가 겹치는 순간이고, 그런 조건이 아니어도 쿼리 수 4배는 CoreDNS와 업스트림의 부하로 고스란히 남는다.

이걸 직접 재 보려는 분을 위해 측정 함정도 두 개 적어 둔다. 처음에 dig로 시도했다가 증폭이 전혀 재현되지 않아 한참을 헤맸는데, dig는 기본으로 search 목록을 쓰지 않는다(`+search`를 붙여야 한다). 그리고 CoreDNS 설정에 `cache 30`이 있어 응답이 30초 캐시되므로, 반복 측정은 콜드와 웜을 구분해야 한다(이 kind 환경의 기본 Corefile은 cluster.local 이름의 캐시를 꺼 두고 있어서, 캐시를 타는 것은 외부 이름 쪽이다). log 플러그인은 성능 비용 경고가 있으니 측정이 끝나면 빼는 것이 안전하다.

Node.js 쪽 사정까지 겹치면 이 함정의 실무 조건이 완성된다. 조회가 일어나는 빈도부터가 요청 단위가 아니라 커넥션 단위다. undici의 keep-alive 덕에 평상시에는 조회가 드물다가, 트래픽 스파이크나 뒷단 재배포로 커넥션이 한꺼번에 새로 열리는 순간 조회가 몰린다. 그 조회 하나하나가 ndots 때문에 최대 8쿼리로 증폭되고, `dns.lookup`은 [libuv 스레드풀(기본 4개)에서 도는 동기 getaddrinfo](https://nodejs.org/api/dns.html)라 파일 IO와 스레드를 놓고 경쟁하며, Node 코어에는 DNS 캐시가 없어서 같은 이름도 매번 다시 조회한다. 완화책은 원인별로 하나씩 대응된다. 표기를 단축명이나 trailing dot으로 바꾸고(외부 HTTPS 대상에는 trailing dot이 SNI(Server Name Indication, TLS 연결에서 접속하려는 서버 이름을 미리 알리는 확장) 쪽 부작용을 만들 수 있어 내부 HTTP 호출에 한정하는 편이 안전하다), 파드 spec의 dnsConfig로 ndots를 낮추고, keep-alive로 커넥션 수명을 늘려 조회 빈도 자체를 줄이고(다만 이는 앞 절의 쏠림과 반대 방향의 힘이라, 커넥션을 오래 쥘수록 조회는 줄고 분배는 나빠진다), 필요하면 undici의 dns 인터셉터 같은 애플리케이션 캐시를 붙이는 식이다. 한 가지, ndots를 낮추는 방법은 musl(alpine) 이미지에서는 리졸버의 폴백 동작이 glibc와 달라 점 있는 내부 이름을 깨뜨릴 수 있다. 2편의 감량 마지막 단계가 alpine 이미지였기 때문에 특히 짚어 둔다. 이 절의 측정은 전부 glibc(node:24-slim) 기준이다.

이름 이야기의 마지막으로, ExternalName이라는 특이한 Service 타입의 실체도 확인해 봤다. 외부 도메인에 클러스터 내부 이름을 붙여 주는 타입인데, 열어 보면 프록시도 ClusterIP도 없고 DNS가 CNAME 한 줄을 돌려주는 것이 전부다.

```text
$ kubectl exec debug -- dig +search external-api
external-api.default.svc.cluster.local. 5 IN CNAME example.com.
```

그래서 HTTPS와 만나면 바로 함정이 된다. 코드가 부른 이름(external-api.default.svc.cluster.local)과 TLS 서버가 아는 이름(example.com)이 달라지기 때문이다. 실제로 이 이름으로 fetch를 시도하면 핸드셰이크가 거부된다(이 실험에서는 서버가 낯선 SNI를 거절하는 `SSL/TLS_ALERT_HANDSHAKE_FAILURE`가 났다). 쿠버네티스 문서도 이 문제를 [공식적으로 경고](https://kubernetes.io/docs/concepts/services-networking/service/#externalname)하고 있어서, HTTPS 대상이라면 ExternalName보다 실제 도메인을 코드에 쓰는 쪽이 나은 선택일 것이다. 이보다 더 깊은 DNS의 세계(glibc의 A/AAAA 병렬 전송과 유명한 간헐적 5초 지연, 그 완화책인 NodeLocal DNSCache)는 이 글의 범위를 넘으니 [공식 문서](https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/)로 미뤄 둔다.

> **단서 노트**: ndots:5와 search 3개의 조합 때문에 표기가 성능이 된다. 단축명 2쿼리, 정식 FQDN 8쿼리로 정식 이름이 가장 느리고, 외부 도메인 조회도 8쿼리로 증폭된다. 조회 빈도는 커넥션 단위라 스파이크 때 몰린다.

## 같은 URL, 두 개의 경로: SSR의 내부 호출은 다른 길을 간다

여기까지 모은 조각으로 이 시리즈가 계속 강조해 온 축 하나를 실측으로 완성할 수 있다. 브라우저의 fetch와 SSR 서버 안의 fetch는, 같은 코드처럼 생겼어도 완전히 다른 길을 간다는 것이다.

실험을 위해 같은 앱 이미지를 `internal-api`라는 이름의 두 번째 Deployment와 Service로 하나 더 띄우고, 앱에 `/api/bff` 엔드포인트를 추가했다. SSR 서버가 `http://internal-api/api/info`를 서버 사이드 fetch로 부르고, 누가 응답했는지를 돌려주는 구성이다. 이 호출을 5번 반복하면서 앞 절들의 도구로 경로를 추적했다.

```text
{"via":"k8s-fe-lab-...-lhlf9","target":"http://internal-api","ms":9.3,"upstream":{"pod":"internal-api-...-2j92t"}}
{"via":"k8s-fe-lab-...-lhlf9","target":"http://internal-api","ms":3.0,"upstream":{"pod":"internal-api-...-2j92t"}}
```

관찰된 사실은 세 가지다. 첫째, 이름 해석은 DNS 절의 첫 행 그대로였다. log 플러그인을 켠 채 호출해 보면, CoreDNS 로그에 앱 파드가 보낸 `internal-api.default.svc.cluster.local`의 A/AAAA 쿼리가 정확히 2개 남는다(단축명이라 첫 search 후보에서 적중했고, 권위 응답이라 각각 0.1ms 안에 끝났다). 둘째, 커넥션은 internal-api의 ClusterIP(10.96.135.219)를 향했고, 노드의 KUBE-SVC 체인 패킷 카운터를 0으로 지우고 5회를 호출했더니 카운터가 정확히 1 올랐다. NAT 규칙은 커넥션의 첫 패킷만 세므로, 5번의 호출이 keep-alive 커넥션 하나로 처리됐다는 뜻이다. 첫 호출만 9.3ms이고 나머지가 3ms인 것도 같은 이유다. 셋째, 그래서 다섯 번의 응답이 전부 같은 internal-api 파드에서 왔다. keep-alive 쏠림이 BFF의 내부 호출 층에서도 그대로 재현된 것이다.

같은 도메인을 브라우저가 부를 때는 이 중 어느 것도 일어나지 않는다. 이름은 사용자 단말의 리졸버와 퍼블릭 DNS가 풀고(ndots의 세계와 무관하다), 요청은 CDN과 로드밸런서를 거쳐 다음 절의 문으로 들어오며, 클러스터 안 어느 노드의 conntrack에도 브라우저와 파드를 잇는 엔트리는 없다. 반대로 브라우저에서도 풀리는 퍼블릭 도메인이라 해도 SSR 안에서 부르는 순간에는 DNS 절의 www.example.com 실측처럼 8쿼리 순회가 일어난다. 경로를 가르는 것은 URL이 아니라 그것을 부르는 위치다. 정리하면 이렇다.

| 구분        | 브라우저의 fetch             | SSR/BFF 안의 fetch                     |
| ----------- | ---------------------------- | -------------------------------------- |
| 이름 해석   | 단말 리졸버, 퍼블릭 DNS      | 파드 resolv.conf, search 순회, CoreDNS |
| 도달 경로   | CDN, LB, Gateway를 거쳐 유입 | ClusterIP DNAT로 파드 직행             |
| 분배 주체   | 문 앞의 프록시(다음 절)      | 발신 노드의 iptables + conntrack       |
| 쏠림의 원인 | 프록시 설정의 영역           | 클라이언트의 keep-alive                |

"로컬에선 됐는데"의 상당수가 이 표의 오른쪽 열에서 나온다. 브라우저에서 잘 되는 URL이 SSR에서 느리거나(ndots), SSR에서 잘 되는 내부 이름이 브라우저에서는 아예 존재하지 않는(클러스터 밖에서는 풀리지 않는 이름) 식이다.

> **단서 노트**: 같은 fetch라도 브라우저와 SSR은 이름 해석, 경로, 분배 주체가 전부 다르다. SSR의 내부 호출은 이 글 앞 절들의 세계(ndots, DNAT, conntrack)를 그대로 지난다.

## 바깥의 요청은 어느 문으로 들어오는가: Service 계층과 Gateway

이제 경로의 남은 앞부분, 클러스터 바깥에서 들어오는 문이다. 1편에서 이 문을 Ingress라고 소개했는데, 그 사이 상황이 크게 변했다. 사실상의 표준 구현이던 ingress-nginx가 [2025년 11월에 은퇴를 발표](https://www.kubernetes.dev/blog/2025/11/12/ingress-nginx-retirement/)했고, 2026년 3월에 저장소가 아카이브되면서 보안 패치까지 완전히 끊겼다. 마지막 릴리스의 지원 범위가 Kubernetes 1.35까지라 이 실험 클러스터(v1.36)와도 맞지 않는다. 공식 권장 이전 경로는 [Gateway API](https://gateway-api.sigs.k8s.io/)다. 규칙을 리소스 세 종(GatewayClass는 구현체 선언, Gateway는 리스너, HTTPRoute는 라우팅 규칙)으로 나눈 후속 표준으로, 핵심 리소스는 v1.0(2023년)부터 GA였고 이 글 시점의 최신은 v1.6이다(이 글의 실측은 v1.5.1 CRD 기준). 다만 Ingress API 자체가 폐기된 것은 아니고 폐기 계획도 없다는 것이 공식 입장이라, 지금 돌아가는 Ingress가 당장 깨지는 이야기는 아니다. 은퇴한 것은 API가 아니라 특정 컨트롤러 구현이다.

그래서 이 글의 실측도 Gateway API로 했다. kind에서는 cloud-provider-kind라는 도구가 LoadBalancer와 Gateway를 함께 흉내 내 준다(macOS에서 바이너리로 실행하면 sudo를 요구하는데, 도커 컨테이너로 띄우면 그 제약 없이 동작했다). 먼저 LoadBalancer 타입부터. 같은 파드들을 향하는 LoadBalancer Service를 하나 만들면 이런 출력이 나온다.

```text
$ kubectl get svc k8s-fe-lab-lb
NAME            TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)
k8s-fe-lab-lb   LoadBalancer   10.96.83.209   172.18.0.7    80:30562/TCP
```

한 Service가 주소 세 개를 동시에 갖고 있다. 1편에서 타입 세 가지를 나열만 했는데, 실물은 이렇게 배타적 선택지가 아니라 **중첩된 레이어**다. LoadBalancer는 NodePort(모든 노드에 열리는 30562 포트)를 포함하고, NodePort는 ClusterIP를 포함한다(기본값 기준이며, `allocateLoadBalancerNodePorts: false`로 NodePort 없는 LoadBalancer를 만들 수도 있다). iptables에서도 NodePort로 들어온 패킷이 결국 ClusterIP와 같은 KUBE-SVC 체인으로 합류하는 규칙이 그대로 보인다. 바깥의 로드밸런서가 노드의 포트로 던지면, 거기서부터는 앞 절들에서 본 것과 같은 길이라는 뜻이다.

다음으로 Gateway와 HTTPRoute를 만들어 문을 세우고, 이 문이 어느 길로 파드에 닿는지를 쟀다. 방법은 앞 절과 같은 패킷 카운터 대조다. 우리 Service의 KUBE-SVC 체인 카운터를 세 노드에서 전부 0으로 지운 뒤, 경로별로 새 커넥션 10개씩을 보냈다.

| 유입 경로 (각 10회, 새 커넥션) | 카운터가 오른 위치                    |
| ------------------------------ | ------------------------------------- |
| Gateway(172.18.0.6) 경유       | control-plane 노드의 KUBE-SVC에 8     |
| LoadBalancer(172.18.0.7) 경유  | worker 3 + worker2 7 (LB 자신의 체인) |
| 파드에서 ClusterIP 직접        | 발신 파드가 있는 노드의 KUBE-SVC에 10 |

셋 다 kube-proxy의 규칙을 통과했다. 표의 숫자 두 개에는 부연이 필요하다. LB 행의 카운터가 원래 Service의 체인에 잡히지 않은 것은 LB가 별도 Service(k8s-fe-lab-lb)라서다. 원래 체인은 0에 머물고, LB의 프록시가 여러 노드의 NodePort로 뿌린 결과가 자기 몫의 KUBE-SVC 체인에 3+7로 잡혔다. Gateway 행이 10이 아니라 8인 것은 문 앞의 프록시가 업스트림 커넥션을 자체 관리해서 다운스트림 커넥션 수와 어긋날 수 있기 때문인데, 여기서 증명 대상은 숫자의 크기가 아니라 카운터가 0이 아니라는 사실 쪽이다. 그런데 이 결과를 일반화하기 전에 밝혀 둘 것이 있다. 사실 이 실측은 예상과 반대로 나온 것이다. ingress-nginx를 비롯한 많은 L7 컨트롤러는 [Service를 거치지 않고 EndpointSlice를 직접 구독해서 파드 IP로 바로 프록시하는 것](https://kubernetes.github.io/ingress-nginx/user-guide/miscellaneous/)을 기본으로 삼는다(세션 어피니티나 자체 로드밸런싱 알고리즘을 쓰기 위해서다). 그 우회를 카운터가 멈춰 있는 것으로 보여줄 계획이었는데, 이 환경의 게이트웨이 데이터 플레인(envoy)의 설정을 관리 API로 덤프해 보니 업스트림이 파드 IP 목록이 아니라 ClusterIP 하나였다(발췌의 cx_total, rq_total 값은 덤프를 뜬 시점의 것이라, 위 10회 실험의 숫자와는 별개다).

```text
$ kubectl exec debug -- curl -s http://172.18.0.6:10000/clusters   # 발췌
default_k8s-fe-lab_core_Service_80::10.96.35.226:80::cx_total::1
default_k8s-fe-lab_core_Service_80::10.96.35.226:80::rq_total::1
```

즉 **문이 Service를 우회하는지는 구현에 따라 갈린다.** cloud-provider-kind의 게이트웨이는 ClusterIP로 보내 kube-proxy를 태우고, ingress-nginx나 Envoy Gateway 계열은 파드 IP로 직행한다. 어느 쪽이냐에 따라 "파드 목록의 변화가 문에 반영되는 경로"가 달라지므로(kube-proxy의 규칙 갱신이냐, 컨트롤러 자신의 EndpointSlice 구독이냐), 운영 중인 클러스터에서 이것을 확인하는 방법 자체가 이 절에서 가져갈 도구라고 생각한다. 컨트롤러의 백엔드 목록을 덤프해 파드 IP가 보이면 직행, ClusterIP가 보이면 경유다. 어느 쪽이든 배포 중 트래픽이 새 파드 목록으로 수렴하는 타이밍이 경로마다 따로 논다는 사실은 변하지 않고, 그것이 배포 중 5xx를 다룰 [다음 편](/2026/08/k8s-for-frontend-4)의 재료가 된다.

> **단서 노트**: Service 타입은 선택지가 아니라 계층(LoadBalancer ⊃ NodePort ⊃ ClusterIP)이다. L7의 문이 Service를 우회하는지는 구현에 따라 갈리며, 컨트롤러의 백엔드 덤프로 확인할 수 있다.

## port-forward는 왜 항상 되는가: 터널의 정체

경로의 마지막 조각은 개발 장비에서 매일 쓰는 `kubectl port-forward`다. 1편에서 API 서버를 경유하는 터널이라 실제 트래픽 경로를 하나도 통과하지 않는다고 결론만 적었는데, 이번에는 그 우회가 실제로 어디까지인지 실측으로 채워 본다.

터널의 전송부터. 상세 로그를 켜고 port-forward를 실행하면 정체가 바로 보인다.

```text
$ kubectl port-forward deploy/k8s-fe-lab 18080:3000 -v=6
... url="https://127.0.0.1:.../api/v1/namespaces/default/pods/k8s-fe-lab-...-lhlf9/portforward"
    status="101 Switching Protocols"
... negotiated protocol: portforward.k8s.io
```

API 서버로 HTTP 요청을 보내 WebSocket으로 업그레이드(101)하고, 그 위로 포트의 바이트를 실어 나르는 구조다(예전에는 SPDY라는 사장된 프로토콜을 썼고, [WebSocket 터널](https://kubernetes.io/blog/2024/08/20/websockets-transition/)은 v1.35에서 GA가 됐다). 로그의 URL에서 알 수 있는 것이 하나 더 있다. `deploy/이름`으로 실행했는데 실제 터널은 특정 파드 하나에 붙었다. Service 이름으로 걸어도 마찬가지다.

```text
$ kubectl port-forward svc/k8s-fe-lab 18081:80   # 이후 10회 요청
  10 k8s-fe-lab-5cfb6b8744-lhlf9
```

10번의 요청이 전부 같은 파드다. **port-forward는 svc를 받아도 로드밸런싱하지 않고 파드 하나를 골라 고정한다.** 로컬에서 아무리 두들겨도 분배 문제는 영원히 관찰되지 않는 이유다.

이 터널이 무엇을 우회하는지는 readiness 실험과 교차하면 극적으로 보인다. 앞 절의 토글로 파드 하나의 readiness를 끄고 EndpointSlice에서 ready=false가 된 것을 확인한 상태에서, 세 경로로 접근해 봤다.

| 접근 경로 (같은 NotReady 파드) | 결과                                  |
| ------------------------------ | ------------------------------------- |
| Service 경유 (새 커넥션 20회)  | 그 파드로 0회 (나머지 둘이 11/9 분담) |
| 파드 IP로 직접 curl            | 200 OK (프로세스는 멀쩡히 살아 있다)  |
| 같은 파드로 port-forward       | **200 OK**                            |

Service의 세계에서 이 파드는 존재하지 않지만, port-forward는 명단(EndpointSlice)도 규칙(iptables)도 거치지 않고 파드에 직결되므로 멀쩡히 응답한다. "port-forward로는 되는데 실서비스에서 안 된다"는 상황의 교과서적 사례다. 같은 이유로 NetworkPolicy나 서비스 메시의 mTLS도 이 터널에는 적용되지 않는다.

반대 방향의 함정도 있다. 이 터널의 반대쪽 끝에서는 노드의 containerd가 파드의 네트워크 네임스페이스(2편에서 본 격리 장치) 안으로 들어가 127.0.0.1의 대상 포트로 접속한다. 즉 터널의 종착점이 파드 안의 127.0.0.1인데, [2편에서 확인한 HOSTNAME 함정](/2026/08/k8s-for-frontend-2)(Next.js standalone이 파드 IP에만 바인드되는 문제)과 만나면 증상이 뒤집힌다. HOSTNAME을 고치지 않은 이미지를 일부러 배포하고 세 경로로 접근해 봤다.

| 접근 경로 (파드 IP에만 바인드된 앱) | 결과                                          |
| ----------------------------------- | --------------------------------------------- |
| Service 경유                        | 200 OK (파드 IP로 DNAT)                       |
| readiness probe                     | 통과 (kubelet도 파드 IP로 검사, Ready=True)   |
| port-forward 경유                   | **실패** (반대편의 127.0.0.1 접속이 거부된다) |

실서비스는 멀쩡한데 port-forward만 안 되는, 흔한 고정관념과 정반대의 조합이다. 이렇게 port-forward는 실제 경로와 겹치는 구간이 없어서, 잘 되는 것도 안 되는 것도 프로덕션의 상태와는 별개의 사건이 된다. 디버깅 도구로서의 가치는 그대로지만, 검증 도구로 쓰기에는 이 표가 보여주는 대로 실제 경로와의 교집합이 없다.

> **단서 노트**: port-forward는 API 서버를 경유하는 WebSocket 터널로 파드 하나의 127.0.0.1에 직결된다. Service, EndpointSlice, iptables, NetworkPolicy 어느 것도 통과하지 않으므로, 그 결과는 실제 경로에 대해 아무것도 증명하지 않는다.

## '로컬에선 됐는데'를 만났을 때

이 글에서 확인한 세 경로를 한 표로 겹쳐 보면, 어떤 증상이 어느 층의 문제인지 역산하는 지도가 된다.

| 통과하는 층          | 브라우저 (문 경유) | SSR 내부 호출 | port-forward |
| -------------------- | :----------------: | :-----------: | :----------: |
| 클러스터 DNS (ndots) |         X          |       O       |      X       |
| L7 문 (Gateway 등)   |         O          |       X       |      X       |
| ClusterIP DNAT 규칙  |    구현에 따라     |       O       |      X       |
| EndpointSlice 명단   |         O          |       O       |      X       |
| conntrack 분배 고정  |    구현에 따라     |       O       |      X       |

이 지도 위에서, 자주 만나는 증상별로 어디를 먼저 열어 볼지 정리해 둔다.

| 증상                                     | 먼저 열어 볼 것                                                       |
| ---------------------------------------- | --------------------------------------------------------------------- |
| port-forward는 되는데 실서비스가 안 된다 | Service의 selector와 targetPort, 그리고 EndpointSlice의 ready 조건    |
| 파드 IP로는 되는데 ClusterIP로 안 된다   | 그 노드의 KUBE-SVC 체인 (kube-proxy 상태)                             |
| 레플리카를 늘렸는데 한 파드만 바쁘다     | 클라이언트의 keep-alive (conntrack 고정)                              |
| 내부 호출만 간헐적으로 느리다            | resolv.conf의 ndots와 표기, 커넥션이 한꺼번에 갈리는 시점의 조회 폭증 |
| Service는 되는데 port-forward만 거부된다 | 앱의 바인드 주소 (2편의 HOSTNAME 함정)                                |
| `get endpoints`에 경고가 뜬다            | 정상이다. EndpointSlice로 읽는 습관으로 넘어갈 때가 됐다는 신호       |

각 행의 확인 방법은 본문의 해당 절에 실측 그대로 있으니, 여기서는 증상에서 층을 찾는 용도로만 쓰면 된다.

> **단서 노트**: 증상은 층을 특정한다. 세 경로가 전부 통과하는 층이 하나도 없다는 사실이 진단의 지렛대다.

## 정리: 수수께끼의 답

존재하지 않는 IP를 추적한 결과를, 각 절의 단서 노트를 모아 다시 적어 본다.

- **ClusterIP는 어디에도 없다.** 각 노드의 NAT 규칙 안에 문자열로 존재하고, 커널이 목적지를 파드 IP로 바꿔 쓴다. 확률의 폭포(1/3, 1/2, 나머지)가 로드밸런싱의 전부였고, ICMP를 매칭하는 규칙은 0개였다.
- **분배는 커넥션이 태어날 때 한 번뿐이다.** conntrack이 그 결정을 고정하므로, keep-alive가 기본인 Node fetch의 연속 호출 30번은 한 파드로 갔다. 커넥션을 오래 쥐는 클라이언트에게 Service의 분배는 사실상 없다.
- **readiness는 명단 제거가 아니라 조건 전환이다.** EndpointSlice의 ready가 뒤집히기까지 11초 중 10.6초가 probe 감지 창이었고 전파는 1초 미만이었으며, 그 사이 826개 요청에 에러는 없었다(앱 자체는 내내 정상이었던 실험 조건에서의 이야기다). 탈락은 신중하게(3연속 실패), 복귀는 빠르게(1회 성공) 설계되어 있다.
- **이름의 표기가 성능이다.** ndots:5 때문에 정식 FQDN이 8쿼리로 가장 느리고 단축명이 2쿼리로 가장 빠르며, 외부 도메인 조회도 8쿼리로 증폭된다. 조회는 커넥션 단위라 스파이크 때 몰린다.
- **SSR의 fetch와 브라우저의 fetch는 다른 길이다.** 이름 해석부터 분배 주체까지 겹치는 층이 없고, 내부 호출은 이 글의 세계(search 순회, DNAT, conntrack 고정)를 그대로 지난다.
- **바깥의 문이 Service를 우회하는지는 구현에 따라 갈린다.** 이 실험의 게이트웨이는 ClusterIP를 경유했고, ingress-nginx 계열은 파드 직행이 기본이다. 컨트롤러의 백엔드 덤프가 판별법이다.
- **port-forward는 그 전부를 지나치지 않는다.** 명단에서 빠진 파드에도 닿고, 파드 IP에만 바인드된 앱에는 유일하게 실패한다. 로컬의 성공과 실패는 프로덕션에 대한 증거가 아니다.

[파드 사이징 글](/2026/08/nodejs-k8s-pod-sizing)에서 그레이스풀 셧다운을 다루며 "iptables·로드밸런서가 수렴할 때까지"라는 표현을 썼는데, 그 수렴이 정확히 무엇인지가 이번 편으로 채워진 셈이다. 그리고 이번 편 내내 미뤄 둔 조건이 하나 남아 있다. EndpointSlice의 세 번째 조건인 terminating, 즉 파드가 죽으면서 명단에서 빠지는 경우다. 살아 있는 파드의 ready 전환은 에러 0개로 우아했지만, 종료할 때도 그러리라는 보장은 없다. 종료 신호와 명단 제거는 어떤 순서로 진행되는가, 그 틈에서 새는 5xx의 정체는 무엇인가. 다음 편인 [파드의 삶과 죽음 편](/2026/08/k8s-for-frontend-4)에서 그 경주를 재현하고, 설정으로 5xx를 0으로 만드는 과정을 다룬다.
