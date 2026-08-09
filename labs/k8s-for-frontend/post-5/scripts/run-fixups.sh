#!/bin/bash
# 5편: E5(메모리 HPA, 목표 40%로 재실행)와 E2(콜드 풀, bash+나노초 타이밍) 보정 체인
set -e
cd "$(dirname "$0")/.."

echo "=== E5 재실행: 메모리 HPA 목표 40% ==="
kubectl apply -f manifests/mem-lab.yaml
kubectl patch hpa mem-lab --type=json -p '[{"op":"replace","path":"/spec/metrics/0/resource/target/averageUtilization","value":40}]' 2>/dev/null || \
  sed 's/averageUtilization: 70/averageUtilization: 40/' manifests/hpa-mem.yaml | kubectl apply -f -
kubectl scale deploy mem-lab --replicas=2
kubectl rollout status deploy/mem-lab --timeout=90s
sleep 45
{
  for i in $(seq 1 110); do
    TS=$(python3 -c 'import time;print(int(time.time()*1000))')
    HPA=$(kubectl get hpa mem-lab -o jsonpath='{.status.desiredReplicas} {.status.currentMetrics[0].resource.current.averageUtilization}' 2>/dev/null)
    DEP=$(kubectl get deploy mem-lab -o jsonpath='{.status.replicas} {.status.readyReplicas}')
    TOP=$(kubectl top pods -l app=mem-lab --no-headers 2>/dev/null | awk '{printf "%s:%s ", $1, $3}')
    echo "$TS hpa=[$HPA] deploy=[$DEP] mem=[$TOP]"
    sleep 8
  done
} > results/mem2-watch.txt 2>&1 &
MPID=$!
sleep 60
kubectl exec client -- node /tmp/spike5.js mem-lab 100 12 5 160 > results/mem2-load.txt 2>&1
wait $MPID || true
kubectl scale deploy mem-lab --replicas=0

echo "=== E2 재실행: 콜드 풀 타이밍 ==="
kubectl cordon k8s-fe-lab-worker2
kubectl delete pod --field-selector spec.nodeName=k8s-fe-lab-worker2 -l app=autoscale-lab --wait=true 2>/dev/null || true
sleep 8
docker exec k8s-fe-lab-worker2 bash -c '
  for img in localhost:5001/k8s-fe-lab:standalone docker.io/library/k8s-fe-lab:standalone \
             docker.io/library/k8s-fe-lab:naive docker.io/library/k8s-fe-lab:hostname-fix \
             docker.io/library/import-2026-08-05 docker.io/library/import-2026-08-06; do
    crictl rmi "$img" 2>/dev/null || true
  done
  ctr -n k8s.io content ls -q | while read d; do ctr -n k8s.io content rm "$d" 2>/dev/null; done; true
  echo "잔여 앱 이미지: $(crictl images 2>/dev/null | grep -c k8s-fe-lab || true)"
  S=$(date +%s%N); crictl pull localhost:5001/k8s-fe-lab:standalone > /dev/null; E=$(date +%s%N)
  echo "PULL_STANDALONE_MS $(( (E-S)/1000000 ))"
  crictl rmi localhost:5001/k8s-fe-lab:standalone > /dev/null
  ctr -n k8s.io content ls -q | while read d; do ctr -n k8s.io content rm "$d" 2>/dev/null; done; true
  S=$(date +%s%N); crictl pull localhost:5001/k8s-fe-lab:naive > /dev/null; E=$(date +%s%N)
  echo "PULL_NAIVE_MS $(( (E-S)/1000000 ))"
  crictl pull localhost:5001/k8s-fe-lab:standalone > /dev/null
' > results/pull-times2.txt 2>&1
kind load docker-image k8s-fe-lab:standalone k8s-fe-lab:naive k8s-fe-lab:hostname-fix --name k8s-fe-lab 2>&1 | tail -1
kubectl uncordon k8s-fe-lab-worker2
cat results/pull-times2.txt | grep PULL
echo "FIXUPS DONE"

echo "=== run7: 222rps + probe 3s (현재 설정) ==="
./scripts/run-spike.sh run7-probe3-222 100 4.5 45 210 340

echo "=== run6: 222rps + probe 1s ==="
kubectl patch deploy autoscale-lab --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/timeoutSeconds","value":1}]'
kubectl rollout status deploy/autoscale-lab --timeout=120s
./scripts/run-spike.sh run6-probe1-222 100 4.5 45 210 340
kubectl patch deploy autoscale-lab --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/timeoutSeconds","value":3}]'
echo "ALL FIXUPS DONE"
