#!/usr/bin/env bash
# 4편: 파드 한 개의 종료 타임라인. delete(T0) 이후
# EndpointSlice 조건 전환(ready/serving/terminating), KUBE-SEP 소멸, 실트래픽, 컨테이너 종료(exit code)를 기록한다.
# 사용: measure-termination.sh <라벨>
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p results
LABEL=${1:-c}
MODE=${2:-new} # new | ka (ka는 인질 드레인 관찰용)
NODE=k8s-fe-lab-worker
now_ms() { perl -MTime::HiRes=time -e 'printf("%d", time()*1000)'; }

TARGET_POD=$(kubectl get pods -l app=graceful-lab -o jsonpath='{.items[0].metadata.name}')
TARGET_IP=$(kubectl get pod "$TARGET_POD" -o jsonpath='{.status.podIP}')
OUT=results/term-$LABEL-timeline.txt
echo "# target: $TARGET_POD ($TARGET_IP), scenario=$LABEL, measured=$(date '+%F %T')" | tee "$OUT"

kubectl exec -i client -- sh -c 'cat > /tmp/sampler4.js' < scripts/sampler.js
kubectl exec client -- node /tmp/sampler4.js graceful-lab "$MODE" 120 90 > results/term-$LABEL-traffic.txt &
SAMPLER=$!

( while true; do
    echo "$(now_ms) $(kubectl get endpointslice -l kubernetes.io/service-name=graceful-lab \
      -o jsonpath='{range .items[0].endpoints[*]}{.addresses[0]}=r{.conditions.ready}/s{.conditions.serving}/t{.conditions.terminating} {end}' 2>/dev/null)"
    sleep 0.15
  done ) > results/term-$LABEL-slice.txt &
SLICE=$!

( while true; do
    echo "$(now_ms) sep=$(docker exec $NODE sh -c "iptables-save -t nat | grep -c -- '--to-destination $TARGET_IP:3000'" 2>/dev/null)"
    sleep 0.15
  done ) > results/term-$LABEL-iptables.txt &
IPT=$!

# 종료 중 컨테이너 상태(실행/terminated exitCode) 폴러
( while true; do
    echo "$(now_ms) $(kubectl get pod "$TARGET_POD" -o jsonpath='{.status.containerStatuses[0].state}' 2>/dev/null | head -c 220)"
    sleep 0.3
  done ) > results/term-$LABEL-container.txt &
CSTATE=$!

sleep 4 # 베이스라인
T0=$(now_ms)
kubectl delete pod "$TARGET_POD" --wait=false >/dev/null
echo "T0_ms=$T0 (delete 발행)" | tee -a "$OUT"

# 종료 완료 대기 (최대 60초) 후 최종 상태 수집
for i in $(seq 1 120); do
  PHASE=$(kubectl get pod "$TARGET_POD" -o jsonpath='{.metadata.name}' 2>/dev/null || true)
  [ -z "$PHASE" ] && break
  sleep 0.5
done
T_GONE=$(now_ms)
{
  echo "T_gone_ms=$T_GONE (오브젝트 소멸, T0+$(( (T_GONE - T0) / 100 * 100 ))ms대)"
  echo "deletionTimestamp/Killing event:"
  kubectl get events --field-selector involvedObject.name="$TARGET_POD" \
    -o custom-columns=LAST:.lastTimestamp,REASON:.reason,MSG:.message --no-headers 2>/dev/null | tail -5
} | tee -a "$OUT"

kill $SLICE $IPT $CSTATE 2>/dev/null || true
wait $SAMPLER 2>/dev/null || true
kubectl rollout status deploy/graceful-lab --timeout=120s >/dev/null
echo "done. raw: term-$LABEL-{traffic,slice,iptables}.txt" | tee -a "$OUT"
