#!/usr/bin/env bash
# 1편 실측 ④: "컨테이너는 격리된 프로세스다"의 물증
# 같은 프로세스가 컨테이너 안에서는 PID 1, VM(호스트) 위에서는 평범한 PID로 보인다.
set -euo pipefail
OUT_DIR="$(cd "$(dirname "$0")" && pwd)/results"
mkdir -p "$OUT_DIR"

CID=$(docker run -d --rm --name pid-demo --cpus=1 --memory=256m k8s-fe-lab:standalone)
sleep 2

{
  echo "== inside container: ps =="
  docker exec pid-demo ps -o pid,comm 2>/dev/null || docker exec pid-demo sh -c 'echo "PID 1: $(cat /proc/1/comm)"; ls /proc | grep -E "^[0-9]+$"'
  echo
  echo "== host(VM) view: same process, ordinary PID =="
  HOST_PID=$(docker inspect -f '{{.State.Pid}}' pid-demo)
  echo "docker inspect .State.Pid = $HOST_PID"
  colima ssh -- ps -o pid,ppid,comm -p "$HOST_PID"
  echo
  echo "== host(VM) view: cgroup that backs the container =="
  colima ssh -- sh -c "cat /proc/$HOST_PID/cgroup"
  CG_PATH=$(colima ssh -- sh -c "cat /proc/$HOST_PID/cgroup" | head -1 | cut -d: -f3)
  colima ssh -- sh -c "cat /sys/fs/cgroup$CG_PATH/memory.max /sys/fs/cgroup$CG_PATH/cpu.max"
} | tee "$OUT_DIR/process-view.txt"

docker stop pid-demo >/dev/null
