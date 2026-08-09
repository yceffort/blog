# k8s-for-frontend lab

"프론트엔드 개발자가 알아야 할 쿠버네티스" 시리즈의 실측 환경.
계획 문서: `plans/k8s-for-frontend-series.md`

## 측정 환경

- colima (docker runtime, 4 CPU / 8GB) + docker CLI
- kind v0.32.0, k6 v2.1.0
- 예제 앱: Next.js 16.2.12 / React 19.2.8 / Node 24 (standalone 출력)

## 구조

```text
app/        예제 Next.js SSR 앱 + Dockerfile 4종 (naive/slim/standalone/alpine)
cluster/    kind 구성, setup.sh, 앱 매니페스트, metrics-server
post-1/     1편 실측 스크립트 (results/에 raw 로그 저장)
post-3/     3편(트래픽) 실측: manifests/ + scripts/ + results/
```

## 시작하기

```bash
colima start --cpu 4 --memory 8
./cluster/setup.sh                 # kind 클러스터 + metrics-server

./post-1/measure-images.sh         # 실측 ①: 이미지 크기·레이어
./post-1/measure-container-view.sh # 실측 ②: 컨테이너 안의 Node가 보는 값
./post-1/measure-process-view.sh   # 실측 ③: 컨테이너 = 프로세스 물증
./post-1/measure-deploy-timeline.sh# 실측 ④: apply → ready 타임라인
```

## 예제 앱 엔드포인트

- `/` : force-dynamic SSR 페이지 (500개 아이템 렌더, `RESPONSE_DELAY_MS`로 지연 주입 가능)
- `/api/health` : readiness용. `/api/toggle?ready=false`로 런타임에 503으로 뒤집을 수 있다 (3편)
- `/api/info` : 런타임 자기소개 (availableParallelism, heap_size_limit, cgroup 값). 신원은 `os.hostname()`
- `/api/bff` : 서버 사이드 fetch 데모. `http://internal-api`를 내부 DNS로 호출한다 (3편)

## 3편 실측 (post-3/)

```bash
# 선행: Gateway API CRD(v1.5.1, proxy.golang.org 경유로 확보) + cloud-provider-kind.
# macOS에서 바이너리는 sudo를 요구하므로 컨테이너로 실행한다:
docker run -d --name cloud-provider-kind --network kind \
  -v /var/run/docker.sock:/var/run/docker.sock \
  registry.k8s.io/cloud-provider-kind/cloud-controller-manager:v0.11.1
kubectl apply -f post-3/manifests/   # internal-api, client, debug, hostname-trap, external-name, lb-and-gateway

./post-3/scripts/measure-ping-mystery.sh   # 인트로: colima의 ICMP 위조
./post-3/scripts/measure-iptables.sh       # KUBE-SVC 캐스케이드 (replicas=3 상태에서)
./post-3/scripts/measure-keepalive-skew.sh # keep-alive 쏠림 + conntrack
./post-3/scripts/measure-ready-timeline.sh # EndpointSlice ready 전환 타임라인
./post-3/scripts/measure-dns.sh            # 표기 4종 쿼리 수 (CoreDNS log 켰다 끔)
./post-3/scripts/measure-bff-path.sh       # SSR 내부 호출 물증
./post-3/scripts/measure-gateway-path.sh   # 세 경로별 KUBE-SVC 체인 통과
./post-3/scripts/measure-port-forward.sh   # 터널 4종 실측
```

주의: cloud-provider-kind(v0.11.1)의 Gateway는 업스트림이 ClusterIP라서 kube-proxy를 우회하지
않는다 (ingress-nginx, Envoy Gateway와 다름. `172.18.x.x:10000/clusters`로 확인 가능).
colima 유저모드 네트워크는 모든 IP의 ICMP에 대신 응답한다 (ping 실측은 이 전제로 읽을 것).

## 4편 실측 (post-4/)

```bash
# 앱에 /api/health-deep(다운스트림 검사) 추가 후 standalone 이미지 재빌드 + kind load 필요.
# naive 이미지도 kind load 되어 있어야 한다 (시나리오 A).
kind load docker-image k8s-fe-lab:naive k8s-fe-lab:standalone --name k8s-fe-lab

./post-4/scripts/run-rollout-matrix.sh post-4/manifests/scenario-a-naive.yaml a-naive 5
./post-4/scripts/run-rollout-matrix.sh post-4/manifests/scenario-b-ignored.yaml b-ignored 3
./post-4/scripts/run-rollout-matrix.sh post-4/manifests/scenario-c-graceful.yaml c-graceful 4
./post-4/scripts/run-rollout-matrix.sh post-4/manifests/scenario-d-prestop.yaml d-prestop 5
./post-4/scripts/run-rollout-matrix.sh post-4/manifests/scenario-d-prestop.yaml e-retry 5 ka-retry

./post-4/scripts/measure-termination.sh c new   # 종료 타임라인 (EndpointSlice terminating, KUBE-SEP, exit code)
./post-4/scripts/measure-termination.sh c-ka ka # 인질 드레인: 30초 뒤 137
./post-4/scripts/measure-liveness.sh            # liveness 오배선 연쇄 재시작 vs readiness
./post-4/scripts/measure-crashloop.sh 780       # CrashLoopBackOff 간격 (13분)
./post-4/scripts/measure-strategy.sh            # maxSurge/maxUnavailable 보폭 비교
```

주의: rollout status는 옛 파드의 Terminating 소진을 기다리지 않는다. grace 만료(+30초) 시점의
실패까지 보려면 drained까지 관찰해야 한다 (매트릭스 스크립트가 처리). 수치 정리는 results/NOTES.md.
