#!/bin/bash
# 5편: 콜드 노드 이미지 풀 시간 실측. worker2를 비우고 레이어를 지운 뒤 레지스트리에서 풀 시간을 잰다.
# 로컬 레지스트리라 네트워크 왕복이 없는 하한값임을 본문에 명시할 것.
set -x
kubectl cordon k8s-fe-lab-worker2
kubectl delete pod --field-selector spec.nodeName=k8s-fe-lab-worker2 -l app=autoscale-lab --wait=true
sleep 5
docker exec k8s-fe-lab-worker2 sh -c '
  crictl rmi localhost:5001/k8s-fe-lab:standalone docker.io/library/k8s-fe-lab:standalone \
    docker.io/library/k8s-fe-lab:naive docker.io/library/k8s-fe-lab:hostname-fix \
    docker.io/library/import-2026-08-05 docker.io/library/import-2026-08-06 2>&1 | tail -2
  echo "--- standalone(전송 69MB) 콜드 풀 ---"
  time crictl pull localhost:5001/k8s-fe-lab:standalone
  crictl rmi localhost:5001/k8s-fe-lab:standalone
  echo "--- naive(전송 590MB) 콜드 풀 ---"
  time crictl pull localhost:5001/k8s-fe-lab:naive
  crictl pull localhost:5001/k8s-fe-lab:standalone
'
kubectl uncordon k8s-fe-lab-worker2
