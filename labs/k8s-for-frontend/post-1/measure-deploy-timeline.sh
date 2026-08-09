#!/usr/bin/env bash
# 1편 실측 ③: kubectl apply 후 파드가 뜨기까지의 이벤트 타임라인
set -euo pipefail
LAB_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$(cd "$(dirname "$0")" && pwd)/results"
mkdir -p "$OUT_DIR"

kind load docker-image k8s-fe-lab:standalone --name k8s-fe-lab
kubectl delete -f "$LAB_DIR/cluster/app.yaml" --ignore-not-found
kubectl wait --for=delete pod -l app=k8s-fe-lab --timeout=60s || true

APPLY_AT=$(date +%s.%N)
kubectl apply -f "$LAB_DIR/cluster/app.yaml"
kubectl rollout status deploy/k8s-fe-lab --timeout=120s
READY_AT=$(date +%s.%N)

{
  echo "== apply → ready: $(echo "$READY_AT - $APPLY_AT" | bc)s =="
  echo
  echo "== events (chronological) =="
  kubectl get events --sort-by=.metadata.creationTimestamp \
    -o custom-columns='TIME:.firstTimestamp,TYPE:.type,REASON:.reason,OBJECT:.involvedObject.name,MESSAGE:.message' \
    | grep -i "k8s-fe-lab" || true
  echo
  echo "== pod conditions =="
  kubectl get pods -l app=k8s-fe-lab \
    -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{range .status.conditions[*]}  {.type}: {.lastTransitionTime}{"\n"}{end}{end}'
} | tee "$OUT_DIR/deploy-timeline.txt"
