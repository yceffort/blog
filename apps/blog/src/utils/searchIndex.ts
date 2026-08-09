import {stripTitleEmphasis} from '@yceffort/shared/utils'
import MiniSearch from 'minisearch'
import {NextResponse} from 'next/server'

import {getAllPosts} from '@/utils/Post'
import type {Locale} from '@/utils/postPaths'
import {miniSearchOptions, type SearchDoc} from '@/utils/search'

const norm = (s: string) => s.normalize('NFC')

// 본문 마크다운에서 검색용 평문을 뽑는다. 코드블록은 제외(노이즈)하되 헤딩·문단은
// 전부 살려 전문 검색이 가능하게 한다.
function toPlainText(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[`*_~>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// locale을 인자로 받아(query param 없이) 정적 prerender가 가능하게 한다. query
// param 기반이면 라우트가 동적으로 분류돼 런타임에 posts 파일을 읽으려다 실패한다.
export async function buildSearchIndexResponse(locale: Locale) {
  try {
    const posts = await getAllPosts(locale)
    const docs: SearchDoc[] = posts
      .filter((p) => p.frontMatter.published)
      .map((p) => {
        const body = toPlainText(p.body)
        // 옛 글은 description에 마크다운(헤딩·코드펜스)이 통째로 들어있어 평문화한다.
        const description = norm(toPlainText(p.frontMatter.description ?? ''))
        return {
          slug: p.fields.slug,
          title: norm(stripTitleEmphasis(p.frontMatter.title)),
          description,
          tags: p.frontMatter.tags,
          body: norm(body),
          snippet: (description || body).slice(0, 160),
          date: p.frontMatter.date.slice(0, 10),
        }
      })

    const mini = new MiniSearch<SearchDoc>(miniSearchOptions)
    mini.addAll(docs)

    return NextResponse.json(
      {index: mini.toJSON()},
      {
        headers: {
          'cache-control': 'public, max-age=300, stale-while-revalidate=86400',
        },
      },
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[API/search-index] Error building index:', error)
    return NextResponse.json({index: null}, {status: 500})
  }
}
