#!/bin/bash
# 5편: run1(브루탈, 실명 재현) 이후의 후속 회차 체인.
# run2~4는 온건 스파이크(9ms ~ 111rps: probe를 깨뜨리지 않는 과부하), run5는 브루탈 + probe 처방 대조.
set -e
cd "$(dirname "$0")/.."

./scripts/run-spike.sh run2 100 9 45 210 340

kubectl patch hpa autoscale-lab --type=merge -p '{"spec":{"minReplicas":6}}'
./scripts/run-spike-min.sh run3-min6 6 100 9 45 210 340
kubectl patch hpa autoscale-lab --type=merge -p '{"spec":{"minReplicas":3}}'

kubectl patch hpa autoscale-lab --type=merge -p '{"spec":{"behavior":{"scaleUp":{"policies":[{"type":"Pods","value":12,"periodSeconds":15}],"stabilizationWindowSeconds":0}}}}'
./scripts/run-spike.sh run4-behavior 100 9 45 210 340
kubectl patch hpa autoscale-lab --type=json -p '[{"op":"remove","path":"/spec/behavior"}]'

# run5: 브루탈(7ms) + readiness timeoutSeconds 3 처방. run1의 실명이 처방으로 풀리는지 대조.
kubectl patch deploy autoscale-lab --type=json -p '[{"op":"add","path":"/spec/template/spec/containers/0/readinessProbe/timeoutSeconds","value":3}]'
kubectl rollout status deploy/autoscale-lab --timeout=120s
sleep 60
./scripts/run-spike.sh run5-probe3 100 7 45 210 340
echo "CHAIN DONE"
