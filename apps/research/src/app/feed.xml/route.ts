import {NextResponse} from 'next/server'

import {SiteConfig} from '@/config'
import {getAllSlides} from '@/lib/slidesIndex'

export async function GET() {
  const slides = getAllSlides().filter((slide) => slide.published)
  // 인자 없는 new Date()는 요청 시점 IO로 간주돼 라우트가 동적이 되므로,
  // 최신 슬라이드 날짜(빌드 타임 고정값)를 쓴다.
  const lastBuildDate = new Date(slides[0]?.date ?? 0).toUTCString()

  const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SiteConfig.title}</title>
    <link>${SiteConfig.url}</link>
    <atom:link href="${SiteConfig.url}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${SiteConfig.subtitle}</description>
    <language>ko-KR</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    ${slides
      .map((slide) => {
        const slideUrl = `${SiteConfig.url}/slides/${slide.slug}`
        return `
        <item>
          <title><![CDATA[${slide.title}]]></title>
          <link>${slideUrl}</link>
          <guid>${slideUrl}</guid>
          ${slide.date ? `<pubDate>${new Date(slide.date).toUTCString()}</pubDate>` : ''}
          <description><![CDATA[${slide.description ?? ''}]]></description>
          ${(slide.tags ?? [])
            .map((tag) => `<category><![CDATA[${tag}]]></category>`)
            .join('')}
        </item>
      `
      })
      .join('')}
  </channel>
</rss>`

  return new NextResponse(feedXml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}
