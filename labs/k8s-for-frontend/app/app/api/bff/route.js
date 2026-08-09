import os from 'node:os'

export const dynamic = 'force-dynamic'

// 3편 실측용: SSR/BFF의 내부 호출 데모. 서버 안에서 내부 Service 이름으로 fetch한다.
// 브라우저 호출과 내부 호출의 경로 차이(DNS search 순회, ClusterIP DNAT)를 관찰하는 대상.
export async function GET(request) {
  const target = new URL(request.url).searchParams.get('target') || process.env.INTERNAL_API_URL || 'http://internal-api'
  const started = process.hrtime.bigint()
  try {
    const res = await fetch(`${target}/api/info`, {cache: 'no-store'})
    const upstream = await res.json()
    const ms = Number(process.hrtime.bigint() - started) / 1e6
    return Response.json({via: os.hostname(), target, ms: Math.round(ms * 10) / 10, upstream: {pod: upstream.pod}})
  } catch (e) {
    const ms = Number(process.hrtime.bigint() - started) / 1e6
    return Response.json({via: os.hostname(), target, ms: Math.round(ms * 10) / 10, error: e.cause?.code || e.message}, {status: 502})
  }
}
