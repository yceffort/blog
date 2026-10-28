// Vercel Cron이 매일 00:50 UTC(09:50 KST)에 부른다. 큐레이션과 배포에 5분 안팎이 걸려 10시 발행에 맞춰 10분 앞서 시작한다.
// GitHub Actions 예약 실행은 부하가 몰리면 늦거나 빠져서, 여기서 news-daily를 workflow_dispatch로 시작한다.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response(null, {status: 401})
  }
  const response = await fetch(
    'https://api.github.com/repos/yceffort/blog/actions/workflows/news-daily.yml/dispatches',
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
      '[cron/news-daily] dispatch failed:',
      response.status,
      await response.text(),
    )
    return new Response(null, {status: 502})
  }
  return new Response(null, {status: 204})
}
