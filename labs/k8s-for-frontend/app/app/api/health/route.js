import os from 'node:os'

export const dynamic = 'force-dynamic'

// 3편 실측용: /api/toggle?ready=false 이후 503을 돌려준다.
// 프로세스는 살아 있는 채로 probe만 실패시켜 EndpointSlice 전환 타임라인의 T0를 통제한다.
export function GET() {
  const ready = globalThis.__ready !== false
  return Response.json({ok: ready, pod: os.hostname()}, {status: ready ? 200 : 503})
}
