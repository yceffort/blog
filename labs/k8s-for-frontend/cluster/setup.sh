#!/usr/bin/env bash
# kind 클러스터 생성 + metrics-server 설치 (시리즈 공통 인프라)
set -euo pipefail
cd "$(dirname "$0")"

kind create cluster --config kind.yaml

# HPA(4편)와 kubectl top에 필요한 metrics-server.
# 공식 components.yaml 호스트(GitHub release CDN)가 차단된 네트워크라 로컬 사본을 쓴다.
kubectl apply -f metrics-server.yaml

kubectl get nodes -o wide
