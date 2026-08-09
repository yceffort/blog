#!/usr/bin/env bash
# 3편: 세 경로(Gateway 경유 / LB 경유 / ClusterIP 직접)가 각각 어느 노드의 KUBE-SVC 체인을 지나는지
# 패킷 카운터로 확인한다. 주의: cloud-provider-kind의 Gateway는 업스트림이 ClusterIP라서
# kube-proxy를 우회하지 않는다(envoy /clusters 덤프로 확인). ingress-nginx나 Envoy Gateway처럼
# EndpointSlice를 직접 보고 파드 IP로 붙는 구현과 다른, 구현 의존 지점이다.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p results
CHAIN=KUBE-SVC-ISVZ3COTGREXVRO2 # k8s-fe-lab ClusterIP 체인 (measure-iptables.sh에서 확인)
NODES="k8s-fe-lab-control-plane k8s-fe-lab-worker k8s-fe-lab-worker2"
GW_IP=172.18.0.6
LB_IP=172.18.0.7
CLUSTER_IP=$(kubectl get svc k8s-fe-lab -o jsonpath='{.spec.clusterIP}')

zero_counters() { for n in $NODES; do docker exec "$n" iptables -t nat -Z "$CHAIN"; done; }
read_counters() {
  for n in $NODES; do
    local pkts
    pkts=$(docker exec "$n" iptables -t nat -L "$CHAIN" -v -x | awk 'NR>2 {s+=$1} END {print s}')
    echo "    $n: ${pkts} pkts"
  done
}
burst() { # $1=url, 매번 새 curl 프로세스 = 새 커넥션 10개
  for i in $(seq 1 10); do kubectl exec debug -- curl -s -m 5 -o /dev/null "$1"; done
}

{
  echo "# measured at $(date '+%F %T'), chain=$CHAIN, gw=$GW_IP lb=$LB_IP clusterip=$CLUSTER_IP"
  echo "--- [0] gateway envoy의 업스트림 (admin /clusters 발췌)"
  kubectl exec debug -- curl -s -m 5 "http://$GW_IP:10000/clusters" | grep -E '::(cx_total|rq_total)::' | grep -v xds_cluster || true

  echo "--- [1] Gateway 경유 10회 후 노드별 $CHAIN 패킷"
  zero_counters; burst "http://$GW_IP/api/health"; read_counters

  echo "--- [2] LoadBalancer(EXTERNAL-IP) 경유 10회 후"
  zero_counters; burst "http://$LB_IP/api/health"; read_counters

  echo "--- [3] ClusterIP 직접 10회 후 (debug 파드는 worker2에 있다)"
  zero_counters; burst "http://$CLUSTER_IP/api/health"; read_counters

  echo "--- [4] LB Service의 세 층 (한 Service가 세 주소를 갖는다)"
  kubectl get svc k8s-fe-lab-lb
  echo "--- [5] KUBE-NODEPORTS가 같은 KUBE-SVC 체인으로 합류하는 규칙"
  docker exec k8s-fe-lab-worker iptables-save -t nat | grep -E 'KUBE-NODEPORTS.*k8s-fe-lab-lb|KUBE-EXT' | head -6
} | tee results/gateway-path.txt
