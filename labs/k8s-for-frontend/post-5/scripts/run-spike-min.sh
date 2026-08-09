#!/bin/bash
set -e
TAG=$1; MIN=${2:-3}; BASE=${3:-100}; SPIKE=${4:-7}; WARM=${5:-45}; DUR=${6:-240}; WATCH=${7:-380}
cd "$(dirname "$0")/.."
for i in $(seq 1 120); do
  S=$(kubectl get hpa autoscale-lab -o jsonpath='{.status.desiredReplicas}')
  R=$(kubectl get deploy autoscale-lab -o jsonpath='{.status.readyReplicas}')
  [ "$S" = "$MIN" ] && [ "$R" = "$MIN" ] && break
  sleep 10
done
sleep 20
kubectl exec -i client -- sh -c 'cat > /tmp/spike5.js' < scripts/spike-load.js
./scripts/watch-scaleout.sh autoscale-lab "$WATCH" > "results/${TAG}-watch.txt" 2>&1 &
WPID=$!
sleep 2
kubectl exec client -- node /tmp/spike5.js autoscale-lab "$BASE" "$SPIKE" "$WARM" "$DUR" > "results/${TAG}-load.txt" 2>&1
./scripts/collect-timeline.sh autoscale-lab > "results/${TAG}-timeline.txt" 2>&1
wait $WPID || true
echo "DONE ${TAG}"
