import {renderHomeOgImage} from '@yceffort/shared/og'
import {cacheLife} from 'next/cache'

import {SiteConfig} from '@/config'
import {getPublishedSlides} from '@/lib/slidesIndex'

// 글꼴을 읽으므로 캐시 함수 안에서 그려야 빌드 때 정적으로 만들어진다
async function renderHomePng() {
  'use cache'
  cacheLife('max')

  const image = await renderHomeOgImage({
    eyebrow: ['RESEARCH LAB', 'SEOUL', String(new Date().getFullYear())],
    lines: [
      [{text: 'SLOW.'}],
      [
        {text: 'DEEP', tone: 'accent'},
        {text: ',', tone: 'muted'},
      ],
      [{text: 'SHARE'}, {text: '.', tone: 'accent'}],
    ],
    stats: [[String(getPublishedSlides().length).padStart(3, '0'), 'decks']],
    host: new URL(SiteConfig.url).host,
  })
  return new Uint8Array(await image.arrayBuffer())
}

export async function GET() {
  return new Response(await renderHomePng(), {
    headers: {'Content-Type': 'image/png'},
  })
}
