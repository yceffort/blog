#!/bin/bash
# 5편: 실측 후 정밀 타임스탬프 수집. 파드 conditions(PodScheduled/Ready)와 이벤트, HPA 이벤트를 덤프한다.
# 사용: ./collect-timeline.sh <deploy=autoscale-lab> > results/xxx-timeline.txt
D=${1:-autoscale-lab}
echo "=== pod conditions (creation/scheduled/ready) ==="
kubectl get pods -l app="$D" -o jsonpath='{range .items[*]}{.metadata.name}{" created="}{.metadata.creationTimestamp}{" started="}{.status.startTime}{range .status.conditions[*]}{" "}{.type}{"="}{.lastTransitionTime}{end}{"\n"}{end}'
echo "=== events ==="
kubectl get events --sort-by=.metadata.creationTimestamp | grep -Ei "$D|horizontalpodautoscaler" | tail -40
echo "=== hpa describe ==="
kubectl describe hpa "$D" | sed -n '/Metrics:/,$p'
