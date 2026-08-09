import {readFileSync} from 'node:fs'
import os from 'node:os'
import v8 from 'node:v8'

export const dynamic = 'force-dynamic'

function readCgroup(path) {
  try {
    return readFileSync(path, 'utf8').trim()
  } catch {
    return null
  }
}

// 1편 실측용: 컨테이너 안의 Node가 무엇을 보는지 한 번에 덤프한다.
export function GET() {
  return Response.json({
    // HOSTNAME은 바인드 주소로 쓰기 위해 0.0.0.0으로 고정하므로(2편), 신원은 os.hostname()으로 읽는다.
    pod: os.hostname(),
    envHostname: process.env.HOSTNAME || null,
    node: process.version,
    availableParallelism: os.availableParallelism(),
    cpus: os.cpus().length,
    totalmemMiB: Math.round(os.totalmem() / 1048576),
    heapSizeLimitMiB: Math.round(v8.getHeapStatistics().heap_size_limit / 1048576),
    rssMiB: Math.round(process.memoryUsage().rss / 1048576),
    cgroup: {
      memoryMax: readCgroup('/sys/fs/cgroup/memory.max'),
      cpuMax: readCgroup('/sys/fs/cgroup/cpu.max'),
    },
  })
}
