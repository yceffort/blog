import os from 'node:os'

export const dynamic = 'force-dynamic'

// 3편 실측용: /api/toggle?ready=false → 이후 /api/health가 503을 돌려준다.
export function GET(request) {
  const ready = new URL(request.url).searchParams.get('ready') !== 'false'
  globalThis.__ready = ready
  return Response.json({ready, pod: os.hostname(), at: new Date().toISOString()})
}
