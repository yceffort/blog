#!/usr/bin/env bash
# 4편: 같은 다운스트림 장애(internal-api 정지)에 대해
# liveness에 깊은 헬스체크를 건 배포(deep-live)는 연쇄 재시작이,
# readiness에 건 배포(deep-ready)는 트래픽 이탈만 나는 것을 나란히 기록한다.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p results
OUT=results/liveness-misfire.txt
POLL=results/liveness-poll.txt
now_s() { date +%s; }

snapshot() {
  kubectl get pods -l "app in (deep-live,deep-ready)" \
    -o jsonpath='{range .items[*]}{.metadata.labels.app}{"/"}{.metadata.name}{" ready="}{.status.conditions[?(@.type=="Ready")].status}{" restarts="}{.status.containerStatuses[0].restartCount}{" state="}{.status.containerStatuses[0].state}{"\n"}{end}' 2>/dev/null
}

echo "# measured=$(date '+%F %T')" | tee "$OUT" > "$POLL"
echo "--- baseline" | tee -a "$OUT"
snapshot | tee -a "$OUT"

T0=$(now_s)
kubectl scale deploy internal-api --replicas=0 >/dev/null
echo "T0=$T0 internal-api -> 0" | tee -a "$OUT"

END=$((T0 + 100))
while [ "$(now_s)" -lt "$END" ]; do
  {
    echo "== t+$(( $(now_s) - T0 ))s"
    snapshot
  } >> "$POLL"
  sleep 2
done

echo "--- after 100s of downstream outage" | tee -a "$OUT"
snapshot | tee -a "$OUT"
echo "--- restart events (deep-live)" | tee -a "$OUT"
kubectl get events --field-selector involvedObject.kind=Pod,reason=Killing -o custom-columns=LAST:.lastTimestamp,OBJ:.involvedObject.name,MSG:.message --no-headers 2>/dev/null | grep deep-live | tail -4 | tee -a "$OUT"
kubectl get events -o custom-columns=LAST:.lastTimestamp,REASON:.reason,OBJ:.involvedObject.name,MSG:.message --no-headers 2>/dev/null | grep -E "deep-(live|ready)" | grep -E "Unhealthy|Killing" | tail -8 >> "$POLL"

T1=$(now_s)
kubectl scale deploy internal-api --replicas=2 >/dev/null
echo "T1=$T1 internal-api -> 2 (복구)" | tee -a "$OUT"
sleep 45
echo "--- 45s after recovery" | tee -a "$OUT"
snapshot | tee -a "$OUT"
echo "done. raw: $POLL" | tee -a "$OUT"
