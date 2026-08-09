#!/usr/bin/env bash
# 1편 실측 ①: 빌드 방식별 이미지 크기와 레이어 분해
set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/../app" && pwd)"
OUT_DIR="$(cd "$(dirname "$0")" && pwd)/results"
mkdir -p "$OUT_DIR"
cd "$APP_DIR"

docker build -f Dockerfile.naive -t k8s-fe-lab:naive .
docker build -f Dockerfile.slim -t k8s-fe-lab:slim .
docker build -f Dockerfile -t k8s-fe-lab:standalone .
docker build -f Dockerfile.alpine -t k8s-fe-lab:standalone-alpine .

{
  echo "== image sizes =="
  docker image ls k8s-fe-lab --format 'table {{.Tag}}\t{{.Size}}'
  for tag in naive slim standalone standalone-alpine; do
    echo
    echo "== history: $tag =="
    docker history "k8s-fe-lab:$tag" --format 'table {{.Size}}\t{{.CreatedBy}}' --no-trunc | head -25
  done
} | tee "$OUT_DIR/images.txt"
