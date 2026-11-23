// Vercel Cron이 일요일 23:00 UTC(월요일 08:00 KST)에 부른다.
// GitHub Actions 예약 실행은 부하가 몰리면 늦거나 빠져서, 여기서 newsletter-weekly를 workflow_dispatch로 시작한다.
export async function GET(request: Request) {
  // 헤더를 env보다 먼저 읽는다. CRON_SECRET 없이 빌드되면 요청을 건드리지 않고 끝나 401이 prerender될 수 있다
  const authorization = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authorization !== `Bearer ${secret}`) {
    return new Response(null, {status: 401})
  }
  const response = await fetch(
    'https://api.github.com/repos/yceffort/blog/actions/workflows/newsletter-weekly.yaml/dispatches',
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${process.env.GITHUB_DISPATCH_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ref: 'main'}),
    },
  )
  if (!response.ok) {
    // eslint-disable-next-line no-console
    console.error(
      '[cron/newsletter-weekly] dispatch failed:',
      response.status,
      await response.text(),
    )
    return new Response(null, {status: 502})
  }
  return new Response(null, {status: 204})
}
