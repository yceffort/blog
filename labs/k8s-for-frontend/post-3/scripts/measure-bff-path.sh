#!/usr/bin/env bash
# 3편: SSR/BFF 내부 호출의 물증. 앱 파드의 서버 사이드 fetch(http://internal-api)가
# ClusterIP DNAT(iptables)를 통과하는 것을 KUBE-SVC 패킷 카운터와 conntrack으로 확인한다.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p results
NODE=k8s-fe-lab-worker
INTERNAL_IP=$(kubectl get svc internal-api -o jsonpath='{.spec.clusterIP}')
# worker 노드에 있는 앱 파드 하나를 골라 그 파드에서 bff를 실행시킨다
APP_POD=$(kubectl get pods -l app=k8s-fe-lab -o json | python3 -c "
import json, sys
for i in json.load(sys.stdin)['items']:
    if i['spec']['nodeName'] == 'k8s-fe-lab-worker':
        print(i['metadata']['name'], i['status']['podIP']); break")
APP_NAME=$(echo "$APP_POD" | cut -d' ' -f1)
APP_IP=$(echo "$APP_POD" | cut -d' ' -f2)
SVC_CHAIN=$(docker exec $NODE iptables-save -t nat | grep -E "\-A KUBE-SERVICES.*$INTERNAL_IP" | grep -oE 'KUBE-SVC-[A-Z0-9]+' | head -1)

{
  echo "# measured at $(date '+%F %T'), app pod=$APP_NAME($APP_IP) on $NODE, internal-api ClusterIP=$INTERNAL_IP, chain=$SVC_CHAIN"
  echo "--- [1] 카운터 초기화 후 bff 5회 (새 프로세스로 매번 새 커넥션)"
  docker exec $NODE iptables -t nat -Z "$SVC_CHAIN"
  for i in 1 2 3 4 5; do
    kubectl exec client -- node -e "fetch('http://$APP_IP:3000/api/bff').then(r=>r.json()).then(j=>console.log(JSON.stringify(j)))"
  done
  echo "--- [2] $SVC_CHAIN 패킷 카운터 (bff 5회 후)"
  docker exec $NODE iptables -t nat -L "$SVC_CHAIN" -v -x | head -7
  echo "--- [3] conntrack: 앱 파드 -> internal-api ClusterIP 변환 엔트리"
  docker exec $NODE conntrack -L -s "$APP_IP" -d "$INTERNAL_IP" 2>/dev/null || true
} | tee results/bff-path.txt
