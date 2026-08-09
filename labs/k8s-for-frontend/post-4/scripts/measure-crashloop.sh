#!/usr/bin/env bash
# CrashLoopBackOff 재시작 간격 실측: restartCount와 컨테이너 시작/종료 시각을 폴링으로 기록한다.
# 사용: measure-crashloop.sh <지속시간(초)> <출력파일>
set -u
DURATION=${1:-720}
OUT=${2:-results/crashloop-raw.log}
kubectl delete pod crash --ignore-not-found --wait=true >/dev/null 2>&1
kubectl apply -f "$(dirname "$0")/../manifests/crash.yaml" >/dev/null
START=$(date +%s)
echo "# start $(date -u +%FT%T.%3NZ 2>/dev/null || date -u +%FT%TZ)" > "$OUT"
while [ $(($(date +%s) - START)) -lt "$DURATION" ]; do
  kubectl get pod crash -o jsonpath='{range .status.containerStatuses[0]}{.restartCount}{"\t"}{.state}{"\t"}{.lastState.terminated.startedAt}{"\t"}{.lastState.terminated.finishedAt}{end}' 2>/dev/null \
    | awk -v ts="$(date +%s.%N)" '{print ts "\t" $0}' >> "$OUT"
  sleep 1
done
echo "# end" >> "$OUT"
