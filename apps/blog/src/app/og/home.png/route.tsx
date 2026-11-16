import {renderHomeOgImage} from '@yceffort/shared/og'
import {cacheLife} from 'next/cache'

import {SiteConfig} from '@/config'
import {getAllPosts, getAllTagsFromPosts} from '@/utils/Post'

// 글꼴과 글 목록을 읽으므로 캐시 함수 안에서 그려야 빌드 때 정적으로 만들어진다. 숫자 계산은 HomeView와 같다
async function renderHomePng() {
  'use cache'
  cacheLife('max')

  const [posts, tags] = await Promise.all([
    getAllPosts('ko'),
    getAllTagsFromPosts('ko'),
  ])
  const year = new Date().getFullYear()
  const earliest = posts
    .map((p) => new Date(p.frontMatter.date).getFullYear())
    .reduce((a, b) => Math.min(a, b), year)
  const image = await renderHomeOgImage({
    eyebrow: `LIVE · SEOUL · ${year}`,
    lines: [
      [{text: 'GRIND.'}],
      [
        {text: 'LEARN', tone: 'accent'},
        {text: ',', tone: 'muted'},
      ],
      [{text: 'REPEAT'}, {text: '.', tone: 'accent'}],
    ],
    stats: [
      [String(posts.length).padStart(3, '0'), 'posts'],
      [String(tags.length).padStart(3, '0'), 'tags'],
      [
        `${String(Math.max(1, year - earliest + 1)).padStart(2, '0')}y`,
        'writing',
      ],
    ],
    host: new URL(SiteConfig.url).host,
  })
  return new Uint8Array(await image.arrayBuffer())
}

export async function GET() {
  return new Response(await renderHomePng(), {
    headers: {'Content-Type': 'image/png'},
  })
}
