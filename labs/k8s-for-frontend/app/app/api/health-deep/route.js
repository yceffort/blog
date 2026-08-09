import os from 'node:os'

export const dynamic = 'force-dynamic'

// 4편 실측용: 다운스트림(internal-api)까지 검사하는 "깊은" 헬스체크.
// 이것을 liveness에 걸면 다운스트림 장애가 앱 파드의 연쇄 재시작으로 번지는 사고를 재현할 수 있다.
export async function GET() {
  try {
    const res = await fetch('http://internal-api/api/health', {
      signal: AbortSignal.timeout(1500),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`downstream ${res.status}`)
    return Response.json({ok: true, pod: os.hostname()})
  } catch (e) {
    return Response.json(
      {ok: false, pod: os.hostname(), reason: String(e?.cause?.code || e.message)},
      {status: 503},
    )
  }
}
