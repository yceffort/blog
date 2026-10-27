import {NextResponse} from 'next/server'

import {SiteConfig} from '@/config'
import {listIssues} from '@/lib/content'
import {issueHref, issueTitle} from '@/lib/format'
import {renderIssueHtml} from '@/lib/markdown'

// 호는 배포할 때만 바뀐다. 빌드 때 한 번 만들어 둔다.
export const dynamic = 'force-static'

export async function GET() {
  const issues = [...listIssues('daily'), ...listIssues('weekly')].toSorted(
    (a, b) => b.date.localeCompare(a.date),
  )
  // 인자 없는 new Date()는 요청 시점 IO로 간주돼 라우트가 동적이 되므로,
  // 최신 호 날짜(빌드 타임 고정값)를 쓴다.
  const lastBuildDate = new Date(issues[0]?.date ?? 0).toUTCString()

  const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SiteConfig.title}</title>
    <link>${SiteConfig.url}</link>
    <atom:link href="${SiteConfig.url}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${SiteConfig.description}</description>
    <language>ko-KR</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    ${issues
      .map((issue) => {
        const issueUrl = `${SiteConfig.url}${issueHref(issue)}`
        // 주간 호는 일간 호를 상대 경로로 잇는다. 피드 리더에서는 절대 경로여야 열린다.
        const html = renderIssueHtml(issue.body).replaceAll(
          'href="/',
          `href="${SiteConfig.url}/`,
        )
        return `
        <item>
          <title><![CDATA[${issueTitle(issue)}]]></title>
          <link>${issueUrl}</link>
          <guid>${issueUrl}</guid>
          <pubDate>${new Date(issue.date).toUTCString()}</pubDate>
          <description><![CDATA[${html.replaceAll(']]>', ']]]]><![CDATA[>')}]]></description>
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
