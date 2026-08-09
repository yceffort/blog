#!/usr/bin/env bash
# 매트릭스(A~D) 이후의 나머지 실측을 순서대로 수행한다.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== [1/6] E 계단: D 구성 + ka-retry 5회 =="
./scripts/run-rollout-matrix.sh manifests/scenario-d-prestop.yaml e-retry 5 ka-retry

echo "== [2/6] A drained 보충 1회 =="
./scripts/run-rollout-matrix.sh manifests/scenario-a-naive.yaml a-naive-drained 1

echo "== [3/6] 종료 타임라인: C + 새 커넥션 =="
kubectl apply -f manifests/scenario-c-graceful.yaml >/dev/null
kubectl rollout status deploy/graceful-lab --timeout=300s >/dev/null
sleep 3
./scripts/measure-termination.sh c new

echo "== [4/6] 종료 타임라인: C + keep-alive (인질) =="
./scripts/measure-termination.sh c-ka ka

echo "== [5/6] PDB: eviction 거부 vs delete 통과 =="
kubectl apply -f manifests/pdb.yaml >/dev/null
sleep 2
POD=$(kubectl get pods -l app=graceful-lab -o jsonpath='{.items[0].metadata.name}')
{
  echo "# pod=$POD measured=$(date '+%F %T')"
  echo "--- eviction 시도 (자발적 중단)"
  kubectl create --raw "/api/v1/namespaces/default/pods/$POD/eviction" -f - <<EOF 2>&1 || true
{"apiVersion": "policy/v1", "kind": "Eviction", "metadata": {"name": "$POD", "namespace": "default"}}
EOF
  echo "--- delete 시도 (PDB와 무관)"
  kubectl delete pod "$POD" --wait=false 2>&1
  echo "--- rollout restart (역시 PDB와 무관)"
  kubectl rollout restart deploy/graceful-lab >/dev/null && echo "restart 발행됨"
  kubectl rollout status deploy/graceful-lab --timeout=300s >/dev/null && echo "rollout 완료 (PDB가 막지 않음)"
} | tee results/pdb-demo.txt
kubectl delete pdb graceful-lab-pdb >/dev/null

echo "== [6/6] 전략 보폭 비교 =="
./scripts/measure-strategy.sh
echo "REMAINING_DONE"
