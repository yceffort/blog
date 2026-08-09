#!/usr/bin/env bash
# 4편: 롤링 업데이트 보폭 비교. 같은 시나리오(D 권장) 아래
#   S1: maxSurge=1, maxUnavailable=0  (여유분을 먼저 만들고 줄인다. 3레플리카에서 기본값 25%/25%와 동치)
#   S2: maxSurge=0, maxUnavailable=1  (여유분 없이 하나 내리고 하나 올린다)
# 를 각각 restart하며 available/updated 레플리카 수의 타임라인과 총 소요를 기록한다.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p results
now_ms() { perl -MTime::HiRes=time -e 'printf("%d", time()*1000)'; }

run_one() {
  local LABEL=$1 SURGE=$2 UNAVAIL=$3
  kubectl patch deploy graceful-lab --type=merge -p \
    "{\"spec\":{\"strategy\":{\"rollingUpdate\":{\"maxSurge\":$SURGE,\"maxUnavailable\":$UNAVAIL}}}}" >/dev/null
  kubectl rollout status deploy/graceful-lab --timeout=300s >/dev/null
  sleep 3
  local OUT=results/strategy-$LABEL.txt
  ( while true; do
      echo "$(now_ms) $(kubectl get deploy graceful-lab -o jsonpath='ready={.status.readyReplicas} updated={.status.updatedReplicas} total={.status.replicas}' 2>/dev/null)"
      sleep 0.3
    done ) > "$OUT" &
  local POLL=$!
  local T0=$(now_ms)
  kubectl rollout restart deploy/graceful-lab >/dev/null
  kubectl rollout status deploy/graceful-lab --timeout=300s >/dev/null
  local T1=$(now_ms)
  # 옛 파드의 실제 소멸(Terminating 소진)까지 대기
  while kubectl get pods -l app=graceful-lab --no-headers 2>/dev/null | awk '{print $3}' | grep -q Terminating; do sleep 0.5; done
  local T2=$(now_ms)
  kill $POLL 2>/dev/null || true
  echo "$LABEL surge=$SURGE unavail=$UNAVAIL rollout_ready=$(( (T1 - T0) ))ms all_terminated=$(( (T2 - T0) ))ms" | tee -a results/strategy-summary.txt
}

echo "# measured=$(date '+%F %T')" > results/strategy-summary.txt
run_one s1-surge 1 0
run_one s2-unavail 0 1
