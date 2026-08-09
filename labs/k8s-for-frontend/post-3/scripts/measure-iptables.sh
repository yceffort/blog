#!/usr/bin/env bash
# 3편: ClusterIP의 실체. kind 노드 안 iptables NAT 규칙에서 KUBE-SERVICES → KUBE-SVC → KUBE-SEP 사슬을 해부한다.
# replicas=3 상태에서 실행해야 확률 캐스케이드(0.333 → 0.5 → 무조건)가 나온다.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p results
NODE=k8s-fe-lab-worker
CLUSTER_IP=$(kubectl get svc k8s-fe-lab -o jsonpath='{.spec.clusterIP}')

{
  echo "# measured at $(date '+%F %T'), node=$NODE, ClusterIP=$CLUSTER_IP, replicas=$(kubectl get deploy k8s-fe-lab -o jsonpath='{.spec.replicas}')"
  echo "--- kube-proxy mode"
  kubectl -n kube-system get cm kube-proxy -o jsonpath='{.data.config\.conf}' | grep -E '^\s*mode:'
  echo "--- iptables version (kind node)"
  docker exec "$NODE" iptables --version
  echo
  echo "--- [1] KUBE-SERVICES에서 우리 Service의 진입 규칙"
  docker exec "$NODE" iptables-save -t nat | grep -E "KUBE-SERVICES.*$CLUSTER_IP" || true
  SVC_CHAIN=$(docker exec "$NODE" iptables-save -t nat | grep -E "\-A KUBE-SERVICES.*$CLUSTER_IP" | grep -oE 'KUBE-SVC-[A-Z0-9]+' | head -1)
  echo
  echo "--- [2] $SVC_CHAIN: 확률 캐스케이드"
  docker exec "$NODE" iptables-save -t nat | grep -E "\-A $SVC_CHAIN " || true
  echo
  echo "--- [3] KUBE-SEP-* : 파드로의 DNAT"
  for sep in $(docker exec "$NODE" iptables-save -t nat | grep -E "\-A $SVC_CHAIN " | grep -oE 'KUBE-SEP-[A-Z0-9]+'); do
    docker exec "$NODE" iptables-save -t nat | grep -E "\-A $sep .*DNAT" || true
  done
  echo
  echo "--- [4] NAT 테이블 전체에서 ICMP를 매칭하는 규칙 수"
  echo -n "icmp match count: "
  docker exec "$NODE" iptables-save -t nat | grep -ci 'icmp' || true
  echo -n "tcp/udp dport match count: "
  docker exec "$NODE" iptables-save -t nat | grep -cE '\-p (tcp|udp) .*--dport' || true
  echo
  echo "--- [5] 같은 규칙을 nft로 보면 (iptables-nft 호환 계층)"
  docker exec "$NODE" nft list chain ip nat KUBE-SERVICES 2>&1 | head -8
} | tee results/iptables-anatomy.txt
