#!/bin/bash
# 5편: 마지막 실측 체인. run5b(깨끗한 probe 처방 대조) → E6 KEDA 선제 확장 → E5 메모리 HPA → E2 콜드 풀
set -e
cd "$(dirname "$0")/.."

settle_quiet() { # desired=3, ready=3, 파드당 CPU < 60m이 60초 유지될 때까지
  local QUIET=0
  for i in $(seq 1 150); do
    local S=$(kubectl get hpa autoscale-lab -o jsonpath='{.status.desiredReplicas}' 2>/dev/null || echo x)
    local R=$(kubectl get deploy autoscale-lab -o jsonpath='{.status.readyReplicas}')
    local MAXCPU=$(kubectl top pods -l app=autoscale-lab --no-headers 2>/dev/null | awk '{gsub("m","",$2); if($2>m) m=$2} END{print m+0}')
    if [ "$S" = "3" ] && [ "$R" = "3" ] && [ "$MAXCPU" -lt 60 ]; then QUIET=$((QUIET+10)); else QUIET=0; fi
    [ "$QUIET" -ge 60 ] && return 0
    sleep 10
  done
}

echo "=== run5b: 브루탈 + probe timeout 3s (깨끗한 조건) ==="
settle_quiet
./scripts/run-spike.sh run5b-probe3 100 7 45 210 340

echo "=== E6: KEDA cron 선제 확장 + 브루탈 스파이크 ==="
settle_quiet
kubectl delete hpa autoscale-lab
M=$(date +%M | sed 's/^0//')
if [ "$M" -gt 48 ]; then sleep $(( (62-M)*60 )); M=$(date +%M | sed 's/^0//'); fi
START=$((M+2)); END=$((M+12))
sed "s/__START__/$START/; s/__END__/$END/" manifests/keda-autoscale.yaml | kubectl apply -f -
# cron 창 진입 전 워밍업 부하를 미리 흘리고, 창 진입(선제 확장) 2분 뒤 스파이크
for i in $(seq 1 60); do
  R=$(kubectl get deploy autoscale-lab -o jsonpath='{.status.readyReplicas}')
  [ "${R:-0}" -ge 9 ] && break
  sleep 10
done
kubectl exec -i client -- sh -c 'cat > /tmp/spike5.js' < scripts/spike-load.js
./scripts/watch-scaleout.sh autoscale-lab 320 > results/keda-watch.txt 2>&1 &
WPID=$!
kubectl exec client -- node /tmp/spike5.js autoscale-lab 100 7 30 210 > results/keda-load.txt 2>&1
./scripts/collect-timeline.sh autoscale-lab > results/keda-timeline.txt 2>&1
wait $WPID || true
kubectl delete scaledobject autoscale-lab
kubectl apply -f manifests/hpa-cpu.yaml

echo "=== E5: 메모리 HPA 불발 재현 ==="
kubectl apply -f manifests/mem-lab.yaml -f manifests/hpa-mem.yaml
kubectl rollout status deploy/mem-lab --timeout=90s
sleep 45
{
  for i in $(seq 1 96); do  # 10초 간격 16분: 부하 전 1분 + 부하 ~3분 + 관찰 12분
    TS=$(python3 -c 'import time;print(int(time.time()*1000))')
    HPA=$(kubectl get hpa mem-lab -o jsonpath='{.status.desiredReplicas} {.status.currentMetrics[0].resource.current.averageUtilization}' 2>/dev/null)
    DEP=$(kubectl get deploy mem-lab -o jsonpath='{.status.replicas} {.status.readyReplicas}')
    TOP=$(kubectl top pods -l app=mem-lab --no-headers 2>/dev/null | awk '{printf "%s:%s ", $1, $3}')
    echo "$TS hpa=[$HPA] deploy=[$DEP] mem=[$TOP]"
    sleep 8
  done
} > results/mem-watch.txt 2>&1 &
MPID=$!
sleep 60
kubectl exec client -- node /tmp/spike5.js mem-lab 100 12 5 160 > results/mem-load.txt 2>&1
wait $MPID || true
kubectl scale deploy mem-lab --replicas=0

echo "=== E2: 콜드 노드 이미지 풀 ==="
./scripts/measure-pull.sh > results/pull-times.txt 2>&1
kind load docker-image k8s-fe-lab:standalone k8s-fe-lab:naive --name k8s-fe-lab 2>&1 | tail -1
echo "FINAL CHAIN DONE"
