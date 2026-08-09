#!/usr/bin/env bash
# 3편 인트로: ClusterIP에 ping과 curl을 쳐 본다.
# colima(macOS) 환경에서는 유저모드 네트워크가 ICMP를 위조해 아무 IP나 ping이 성공한다.
# 리눅스 네이티브 docker에서는 ClusterIP ping이 타임아웃된다(환경 의존).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p results
CLUSTER_IP=$(kubectl get svc k8s-fe-lab -o jsonpath='{.spec.clusterIP}')
UNUSED_IP=10.96.222.222   # 어떤 Service에도 할당되지 않은 서비스 대역 IP
TESTNET_IP=198.51.100.7   # RFC 5737 TEST-NET-2. 문서용 예약 대역이라 실존할 수 없다

{
  echo "# measured at $(date '+%F %T')"
  echo "# k8s-fe-lab ClusterIP = $CLUSTER_IP"
  for ip in "$CLUSTER_IP" "$UNUSED_IP" "$TESTNET_IP"; do
    echo "--- ping -c 3 $ip (debug pod)"
    kubectl exec debug -- ping -c 3 -W 2 "$ip" || true
  done
  echo "--- curl http://$CLUSTER_IP/api/health (debug pod)"
  kubectl exec debug -- curl -s -m 5 "http://$CLUSTER_IP/api/health" || true
  echo
  echo "--- curl http://$UNUSED_IP/ (debug pod, 미할당 IP)"
  kubectl exec debug -- curl -s -m 5 -o /dev/null -w '%{http_code} %{errormsg}\n' "http://$UNUSED_IP/" || true
} | tee results/ping-mystery.txt
