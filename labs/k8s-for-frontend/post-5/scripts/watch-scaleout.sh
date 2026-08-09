#!/bin/bash
# 5편: 스케일 아웃 타임라인 관측기. 0.5초 간격으로 HPA desired/사용률, replicas, 파드 상태를 기록한다.
# 사용: ./watch-scaleout.sh <deploy=autoscale-lab> <durationSec=420> > results/xxx-watch.txt
D=${1:-autoscale-lab}; DUR=${2:-420}; END=$((SECONDS+DUR))
while [ $SECONDS -lt $END ]; do
  TS=$(python3 -c 'import time;print(int(time.time()*1000))')
  HPA=$(kubectl get hpa "$D" -o jsonpath='{.status.desiredReplicas} {.status.currentMetrics[0].resource.current.averageUtilization}' 2>/dev/null)
  DEP=$(kubectl get deploy "$D" -o jsonpath='{.status.replicas} {.status.readyReplicas}' 2>/dev/null)
  PODS=$(kubectl get pods -l app="$D" --no-headers 2>/dev/null | awk '{printf "%s/%s ", $1, $3}')
  echo "$TS hpa=[$HPA] deploy=[$DEP] pods=[$PODS]"
  sleep 0.35
done
