#!/usr/bin/env bash
# 3편: 분배는 커넥션 단위다. undici(Node fetch)의 keep-alive(기본 4초) 아래에서
# 연속 요청이 파드 하나로 쏠리는 것을 세 가지 변주로 확인한다.
# 주의: undici fetch는 Connection 헤더 지정을 금지하므로 대조군은 "새 프로세스"로 만든다.
# 클라이언트는 앱과 별도 파드(client)에서 실행한다(헤어핀 오염 방지).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p results
NODE=k8s-fe-lab-worker # client 파드가 있는 노드. conntrack은 클라이언트 쪽 노드에 생긴다
CLUSTER_IP=$(kubectl get svc k8s-fe-lab -o jsonpath='{.spec.clusterIP}')

{
  echo "# measured at $(date '+%F %T'), replicas=$(kubectl get deploy k8s-fe-lab -o jsonpath='{.spec.replicas}'), ClusterIP=$CLUSTER_IP"

  echo "--- [1] 단일 Node 프로세스에서 순차 fetch 30회 (keep-alive 재사용)"
  kubectl exec client -- node -e '
    (async () => {
      const count = {}
      for (let i = 0; i < 30; i++) {
        const j = await fetch("http://k8s-fe-lab/api/info").then((r) => r.json())
        count[j.pod] = (count[j.pod] || 0) + 1
      }
      console.log(JSON.stringify(count))
    })()'

  echo "--- [1b] 쏠림 상태의 conntrack (클라이언트 노드에서, ClusterIP 목적지)"
  docker exec "$NODE" conntrack -L -d "$CLUSTER_IP" 2>/dev/null || true
  echo "--- [1c] conntrack에 ICMP 변환 엔트리가 있는가"
  echo -n "icmp entries to ClusterIP: "
  docker exec "$NODE" conntrack -L -p icmp -d "$CLUSTER_IP" 2>/dev/null | wc -l || true

  echo "--- [2] 매 요청 새 프로세스(새 TCP 커넥션) 21회"
  kubectl exec client -- sh -c '
    for i in $(seq 1 21); do
      node -e "fetch(\"http://k8s-fe-lab/api/info\").then((r) => r.json()).then((j) => console.log(j.pod))"
    done' | sort | uniq -c

  echo "--- [3] 단일 프로세스, 요청 간격 4.5초 (undici keepAliveTimeout 4초 초과) 8회"
  kubectl exec client -- node -e '
    (async () => {
      const seq = []
      for (let i = 0; i < 8; i++) {
        const j = await fetch("http://k8s-fe-lab/api/info").then((r) => r.json())
        seq.push(j.pod.slice(-5))
        if (i < 7) await new Promise((r) => setTimeout(r, 4500))
      }
      console.log(seq.join(" "))
    })()'
} | tee results/keepalive-skew.txt
