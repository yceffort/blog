#!/usr/bin/env bash
# 3편: readiness 실패 → EndpointSlice ready=false → iptables 규칙 소멸 → 실트래픽 중단,
# 그리고 복귀 방향까지의 타임라인을 한 번에 잰다.
# 사슬: /api/toggle?ready=false (T0) → probe 실패 3회(period 5s) → Pod Ready=false
#       → EndpointSlice controller → kube-proxy 재프로그램 → 새 커넥션이 해당 파드를 피함
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p results
NODE=k8s-fe-lab-worker
now_ms() { perl -MTime::HiRes=time -e 'printf("%d", time()*1000)'; }

TARGET_POD=$(kubectl get pods -l app=k8s-fe-lab -o jsonpath='{.items[0].metadata.name}')
TARGET_IP=$(kubectl get pod "$TARGET_POD" -o jsonpath='{.status.podIP}')
echo "# target: $TARGET_POD ($TARGET_IP), measured at $(date '+%F %T')" | tee results/ready-timeline.txt

# [A] 상시 트래픽 샘플러 (새 커넥션, 120ms 간격, 100초)
kubectl exec -i client -- sh -c 'cat > /tmp/sampler.js' < scripts/sampler.js
kubectl exec client -- node /tmp/sampler.js > results/ready-traffic-samples.txt &
SAMPLER=$!

# [B] EndpointSlice ready 조건 폴러
(
  while true; do
    echo "$(now_ms) $(kubectl get endpointslice -l kubernetes.io/service-name=k8s-fe-lab \
      -o jsonpath='{range .items[0].endpoints[*]}{.addresses[0]}={.conditions.ready} {end}' 2>/dev/null)"
    sleep 0.15
  done
) > results/ready-slice-poll.txt &
SLICE_POLL=$!

# [C] iptables KUBE-SEP 규칙 폴러 (클라이언트 노드)
(
  while true; do
    echo "$(now_ms) sep=$(docker exec $NODE sh -c "iptables-save -t nat | grep -c -- '--to-destination $TARGET_IP:3000'" 2>/dev/null)"
    sleep 0.15
  done
) > results/ready-iptables-poll.txt &
IPT_POLL=$!

# [D] kube-proxy 네트워크 프로그래밍 지연 메트릭 (전)
docker exec $NODE curl -s 127.0.0.1:10249/metrics | grep -E '^kubeproxy_network_programming_duration_seconds_(sum|count)' \
  > results/ready-kubeproxy-metric-before.txt

sleep 4 # 베이스라인

# [T0] readiness를 끈다 (대상 파드에 직접)
T0=$(now_ms)
TOGGLE_OFF=$(kubectl exec client -- node -e "fetch('http://$TARGET_IP:3000/api/toggle?ready=false').then(r=>r.json()).then(j=>console.log(JSON.stringify(j)))")
echo "T0_ms=$T0 toggle_off=$TOGGLE_OFF" | tee -a results/ready-timeline.txt

sleep 32 # probe 실패 3회(최대 15초) + 전파 + 관찰 여유

# 탈락 시점 기록들
{
  echo "--- after ready=false"
  echo "pod Ready condition: $(kubectl get pod "$TARGET_POD" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status} {.status.conditions[?(@.type=="Ready")].lastTransitionTime}')"
  echo "slice trigger-time: $(kubectl get endpointslice -l kubernetes.io/service-name=k8s-fe-lab -o jsonpath='{.items[0].metadata.annotations.endpoints\.kubernetes\.io/last-change-trigger-time}')"
  echo "probe events:"
  kubectl get events --field-selector involvedObject.name="$TARGET_POD",reason=Unhealthy \
    -o custom-columns=LAST:.lastTimestamp,COUNT:.count,MSG:.message --no-headers | tail -3
} | tee -a results/ready-timeline.txt

# [T1] readiness를 다시 켠다
T1=$(now_ms)
TOGGLE_ON=$(kubectl exec client -- node -e "fetch('http://$TARGET_IP:3000/api/toggle?ready=true').then(r=>r.json()).then(j=>console.log(JSON.stringify(j)))")
echo "T1_ms=$T1 toggle_on=$TOGGLE_ON" | tee -a results/ready-timeline.txt

sleep 22 # 성공 1회(최대 5초) + 전파 + 관찰 여유

{
  echo "--- after ready=true"
  echo "pod Ready condition: $(kubectl get pod "$TARGET_POD" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status} {.status.conditions[?(@.type=="Ready")].lastTransitionTime}')"
  echo "slice trigger-time: $(kubectl get endpointslice -l kubernetes.io/service-name=k8s-fe-lab -o jsonpath='{.items[0].metadata.annotations.endpoints\.kubernetes\.io/last-change-trigger-time}')"
} | tee -a results/ready-timeline.txt

docker exec $NODE curl -s 127.0.0.1:10249/metrics | grep -E '^kubeproxy_network_programming_duration_seconds_(sum|count)' \
  > results/ready-kubeproxy-metric-after.txt

kill $SLICE_POLL $IPT_POLL 2>/dev/null || true
wait $SAMPLER 2>/dev/null || true
echo "done. raw: ready-traffic-samples.txt ready-slice-poll.txt ready-iptables-poll.txt" | tee -a results/ready-timeline.txt
