#!/usr/bin/env bash
# 3편: port-forward의 정체. 네 가지를 확인한다.
# [1] 전송이 WebSocket 터널(101 Switching Protocols)이라는 것
# [2] svc/이름으로 포워드해도 파드 하나에 고정된다는 것
# [3] readiness가 꺼져 Service에서 제외된 파드도 port-forward로는 멀쩡히 닿는 것
# [4] 역방향 함정: 파드 IP에만 바인드된 앱(HOSTNAME 함정)은 Service는 정상인데 port-forward만 거부
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p results
OUT=results/port-forward.txt
echo "# measured at $(date '+%F %T')" | tee "$OUT"

pf_cleanup() { kill $(jobs -p) 2>/dev/null || true; sleep 1; }
trap pf_cleanup EXIT

{
  echo "--- [1] kubectl port-forward -v=6 핸드셰이크 (WebSocket 101)"
  kubectl port-forward deploy/k8s-fe-lab 18080:3000 -v=6 > /tmp/pf-verbose.log 2>&1 &
  sleep 3
  curl -s -m 3 -o /dev/null http://127.0.0.1:18080/api/health || true
  sleep 1
  kill %1 2>/dev/null || true; wait 2>/dev/null || true
  grep -E 'portforward|101 Switching' /tmp/pf-verbose.log | head -4
  cp /tmp/pf-verbose.log results/port-forward-verbose.log

  echo "--- [2] svc/이름으로 포워드해도 파드 하나 고정 (10회 요청의 pod 필드)"
  kubectl port-forward svc/k8s-fe-lab 18081:80 > /dev/null 2>&1 &
  sleep 3
  for i in $(seq 1 10); do curl -s -m 3 http://127.0.0.1:18081/api/health | sed -E 's/.*pod":"([^"]+).*/\1/'; done | sort | uniq -c
  kill %1 2>/dev/null || true; wait 2>/dev/null || true

  echo "--- [3] readiness가 꺼진 파드: Service는 피하지만 port-forward는 닿는다"
  TARGET_POD=$(kubectl get pods -l app=k8s-fe-lab -o jsonpath='{.items[0].metadata.name}')
  TARGET_IP=$(kubectl get pod "$TARGET_POD" -o jsonpath='{.status.podIP}')
  echo "target: $TARGET_POD ($TARGET_IP)"
  kubectl exec client -- node -e "fetch('http://$TARGET_IP:3000/api/toggle?ready=false').then(r=>r.json()).then(j=>console.log('toggle off:',JSON.stringify(j)))"
  echo "(probe 실패 3회 + 전파 대기: 25초)"
  sleep 25
  echo "slice ready 상태: $(kubectl get endpointslice -l kubernetes.io/service-name=k8s-fe-lab -o jsonpath='{range .items[0].endpoints[*]}{.addresses[0]}={.conditions.ready} {end}')"
  echo "Service 경유 20회의 파드 분포 (새 커넥션, $TARGET_POD 는 나오지 않아야 함):"
  kubectl exec debug -- sh -c 'for i in $(seq 1 20); do curl -s -m 3 http://k8s-fe-lab/api/health; echo; done' | sed -E 's/.*pod":"([^"]+).*/\1/' | sort | uniq -c
  echo "같은 파드로 port-forward:"
  kubectl port-forward pod/"$TARGET_POD" 18082:3000 > /dev/null 2>&1 &
  sleep 3
  echo "  http status: $(curl -s -m 3 -o /dev/null -w '%{http_code}' http://127.0.0.1:18082/api/info) (/api/info는 readiness와 무관하게 응답)"
  kill %1 2>/dev/null || true; wait 2>/dev/null || true
  kubectl exec client -- node -e "fetch('http://$TARGET_IP:3000/api/toggle?ready=true').then(r=>r.json()).then(j=>console.log('toggle on:',JSON.stringify(j)))"

  echo "--- [4] 역방향 함정: HOSTNAME이 파드 이름인 앱 (hostname-trap)"
  TRAP_POD=$(kubectl get pods -l app=hostname-trap -o jsonpath='{.items[0].metadata.name}')
  echo "Service 경유: $(kubectl exec debug -- curl -s -m 3 http://hostname-trap/api/health)"
  echo "파드 안 localhost: $(kubectl exec deploy/hostname-trap -- node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>console.log('OK',r.status)).catch(e=>console.log('FAIL',e.cause?.code))")"
  kubectl port-forward pod/"$TRAP_POD" 18083:3000 > /dev/null 2>&1 &
  sleep 3
  echo "port-forward 경유: $(curl -s -m 3 http://127.0.0.1:18083/api/health -o /dev/null -w '%{http_code}' ; echo " (curl exit $?)")"
  kill %1 2>/dev/null || true; wait 2>/dev/null || true
} | tee -a "$OUT"
