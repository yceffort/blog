#!/usr/bin/env bash
# 1편 실측 ②: 컨테이너 안의 Node가 보는 세계 (cgroup, availableParallelism, heap_size_limit)
# 호스트(macOS)의 Node와, 제약 없는/있는 컨테이너의 값을 대조한다.
set -euo pipefail
OUT_DIR="$(cd "$(dirname "$0")" && pwd)/results"
mkdir -p "$OUT_DIR"

probe() {
  local label="$1"; shift
  echo "== $label =="
  docker run --rm "$@" k8s-fe-lab:standalone node -e '
    const os = require("node:os");
    const v8 = require("node:v8");
    const fs = require("node:fs");
    const rd = (p) => { try { return fs.readFileSync(p, "utf8").trim() } catch { return "n/a" } };
    console.log(JSON.stringify({
      availableParallelism: os.availableParallelism(),
      cpus: os.cpus().length,
      totalmemMiB: Math.round(os.totalmem() / 1048576),
      heapSizeLimitMiB: Math.round(v8.getHeapStatistics().heap_size_limit / 1048576),
      cgroupMemoryMax: rd("/sys/fs/cgroup/memory.max"),
      cgroupCpuMax: rd("/sys/fs/cgroup/cpu.max"),
    }, null, 2));
  '
  echo
}

{
  echo "== host (macOS) =="
  node -e '
    const os = require("node:os");
    const v8 = require("node:v8");
    console.log(JSON.stringify({
      availableParallelism: os.availableParallelism(),
      cpus: os.cpus().length,
      totalmemMiB: Math.round(os.totalmem() / 1048576),
      heapSizeLimitMiB: Math.round(v8.getHeapStatistics().heap_size_limit / 1048576),
    }, null, 2));
  '
  echo
  probe "container: no limits"
  probe "container: --cpus=1 --memory=512m" --cpus=1 --memory=512m
  probe "container: --cpus=2 --memory=2g" --cpus=2 --memory=2g
} | tee "$OUT_DIR/container-view.txt"
