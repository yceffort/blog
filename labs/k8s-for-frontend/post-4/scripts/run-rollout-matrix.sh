#!/usr/bin/env bash
# 4편 킬러 실측: 시나리오(A/B/C/D)별로 rollout restart를 R회 반복하며
# 새 커넥션·keep-alive 두 샘플러의 실패를 유형별로 계수한다.
# 사용: run-rollout-matrix.sh <시나리오 파일> <라벨> <반복 R> [ka모드=ka|ka-retry]
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p results
FILE=$1
LABEL=$2
REPEAT=${3:-5}
KA_MODE=${4:-ka}

kubectl apply -f "$FILE" >/dev/null
kubectl rollout status deploy/graceful-lab --timeout=300s >/dev/null
sleep 3

# 샘플러 업로드
kubectl exec -i client -- sh -c 'cat > /tmp/sampler4.js' < scripts/sampler.js

SUMMARY=results/rollout-$LABEL-summary.txt
echo "# scenario=$LABEL repeat=$REPEAT measured=$(date '+%F %T')" > "$SUMMARY"

for i in $(seq 1 "$REPEAT"); do
  RAW_NEW=results/rollout-$LABEL-run$i-new.txt
  RAW_KA=results/rollout-$LABEL-run$i-ka.txt
  kubectl exec client -- node /tmp/sampler4.js graceful-lab new 120 300 > "$RAW_NEW" &
  P1=$!
  kubectl exec client -- node /tmp/sampler4.js graceful-lab "$KA_MODE" 120 300 > "$RAW_KA" &
  P2=$!
  sleep 4 # 베이스라인
  T0=$(date +%s)
  kubectl rollout restart deploy/graceful-lab >/dev/null
  kubectl rollout status deploy/graceful-lab --timeout=300s >/dev/null
  T1=$(date +%s)
  # rollout status는 옛 파드의 Terminating 소진을 기다리지 않는다.
  # grace 만료(기본 30초) 시점의 실패까지 잡으려면 옛 파드가 실제로 사라질 때까지 관찰해야 한다.
  for _ in $(seq 1 150); do
    kubectl get pods -l app=graceful-lab --no-headers 2>/dev/null | awk '{print $3}' | grep -q Terminating || break
    sleep 0.5
  done
  T2=$(date +%s)
  sleep 8 # 늦은 에러 수집
  # client 이미지(node:24-slim)에는 pkill이 없어 node로 샘플러를 내린다
  kubectl exec client -- node -e '
    const fs = require("node:fs")
    for (const d of fs.readdirSync("/proc")) {
      if (!/^\d+$/.test(d)) continue
      try {
        if (fs.readFileSync(`/proc/${d}/cmdline`, "utf8").includes("sampler4")) process.kill(+d, "SIGTERM")
      } catch {}
    }' >/dev/null 2>&1 || true
  wait $P1 $P2 2>/dev/null || true
  NEW_STAT=$(awk '$2=="ERR"{c[$3]++; t++} $2=="RETRY_OK"{r++} END{printf "err=%d retried_ok=%d", t+0, r+0; for (k in c) printf " %s=%d", k, c[k]}' "$RAW_NEW")
  KA_STAT=$(awk '$2=="ERR"{c[$3]++; t++} $2=="RETRY_OK"{r++} END{printf "err=%d retried_ok=%d", t+0, r+0; for (k in c) printf " %s=%d", k, c[k]}' "$RAW_KA")
  NEW_TOTAL=$(awk 'END{print NR}' "$RAW_NEW")
  KA_TOTAL=$(awk 'END{print NR}' "$RAW_KA")
  echo "run$i rollout=$((T1 - T0))s drained=$((T2 - T0))s new[$NEW_TOTAL] $NEW_STAT | ka[$KA_TOTAL] $KA_STAT" | tee -a "$SUMMARY"
done
