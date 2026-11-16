import {renderHomeOgImage} from '@yceffort/shared/og'

import {SiteConfig} from '@/config'
import {listIssues} from '@/lib/content'

// news는 Cache Components를 쓰지 않아 GET 라우트가 기본으로 요청마다 돈다. 빌드 때 한 번 그린다
export const dynamic = 'force-static'

export async function GET() {
  const image = await renderHomeOgImage({
    eyebrow: 'DAILY · SEOUL · 10:00 KST',
    lines: [
      [{text: '매일 아침'}],
      [
        {text: '10시', tone: 'accent'},
        {text: ',', tone: 'muted'},
      ],
      [{text: '오늘 읽을 글'}, {text: '.', tone: 'accent'}],
    ],
    stats: [
      [String(listIssues('daily').length).padStart(3, '0'), 'daily'],
      [String(listIssues('weekly').length).padStart(3, '0'), 'weekly'],
    ],
    host: new URL(SiteConfig.url).host,
    size: 112,
  })
  return new Response(await image.arrayBuffer(), {
    headers: {'Content-Type': 'image/png'},
  })
}
