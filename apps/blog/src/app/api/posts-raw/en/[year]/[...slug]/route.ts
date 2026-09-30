import {getPostRawBySlug} from '@/utils/postsRaw'

export async function GET(
  req: Request,
  {params}: {params: Promise<{year: string; slug: string[]}>},
) {
  const {year, slug} = await params
  const raw = getPostRawBySlug(year, slug, 'en')
  if (!raw) {
    // 번역이 없는 글은 HTML 페이지처럼 한국어 원문으로 보낸다
    if (getPostRawBySlug(year, slug)) {
      const koUrl = new URL(`/${[year, ...slug].join('/')}.md`, req.url)
      return Response.redirect(koUrl, 308)
    }
    return new Response('Not Found', {status: 404})
  }
  return new Response(raw, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=300, stale-while-revalidate=86400',
    },
  })
}
