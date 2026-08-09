#!/bin/bash
# 5편: 스파이크 실측 1회차 오케스트레이터.
# 사용: ./run-spike.sh <tag> <baseMs> <spikeMs> <warmSec> <spikeSec> <watchSec>
set -e
TAG=$1; BASE=${2:-100}; SPIKE=${3:-7}; WARM=${4:-45}; DUR=${5:-240}; WATCH=${6:-380}
cd "$(dirname "$0")/.."
# 정착 대기: desired=3, ready=3이 될 때까지
for i in $(seq 1 120); do
  S=$(kubectl get hpa autoscale-lab -o jsonpath='{.status.desiredReplicas}')
  R=$(kubectl get deploy autoscale-lab -o jsonpath='{.status.readyReplicas}')
  [ "$S" = "3" ] && [ "$R" = "3" ] && break
  sleep 10
done
sleep 20
kubectl exec -i client -- sh -c 'cat > /tmp/spike5.js' < scripts/spike-load.js
./scripts/watch-scaleout.sh autoscale-lab "$WATCH" > "results/${TAG}-watch.txt" 2>&1 &
WPID=$!
sleep 2
kubectl exec client -- node /tmp/spike5.js autoscale-lab "$BASE" "$SPIKE" "$WARM" "$DUR" > "results/${TAG}-load.txt" 2>&1
./scripts/collect-timeline.sh autoscale-lab > "results/${TAG}-timeline.txt" 2>&1
kubectl get events --field-selector involvedObject.kind=HorizontalPodAutoscaler -o custom-columns=T:.lastTimestamp,MSG:.message --sort-by=.lastTimestamp | tail -12 > "results/${TAG}-hpa-events.txt"
wait $WPID || true
echo "DONE ${TAG}"
