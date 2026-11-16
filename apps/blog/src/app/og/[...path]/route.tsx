import {readFile} from 'node:fs/promises'
import path from 'node:path'

import {renderOgImage} from '@yceffort/shared/og'
import {cacheLife} from 'next/cache'

import {GET as renderArt} from '@/app/api/og/art/route'
import {SiteConfig} from '@/config'
import {findPostByYearAndSlug, getAllPosts} from '@/utils/Post'
import {type Locale} from '@/utils/postPaths'

export async function generateStaticParams() {
  const params: {path: string[]}[] = []
  for (const locale of ['ko', 'en'] as const) {
    for (const post of await getAllPosts(locale)) {
      const segments = `${post.fields.slug}.png`.split('/')
      params.push({path: locale === 'en' ? ['en', ...segments] : segments})
    }
  }
  return params
}

async function loadThumbnail(thumbnail: string) {
  const url = new URL(thumbnail, SiteConfig.url)
  if (url.pathname === '/api/og/art') {
    const res = await renderArt(new Request(url))
    return Buffer.from(await res.arrayBuffer())
  }
  return readFile(path.join(process.cwd(), 'public', url.pathname))
}

// 파일 읽기가 있으면 Cache Components가 정적 생성을 멈추므로 캐시 함수 안에서 그린다
async function renderPostOgPng(locale: Locale, year: string, slug: string[]) {
  'use cache'
  cacheLife('max')

  const post = await findPostByYearAndSlug(year, slug, locale)
  if (!post) {
    return null
  }
  const {title, thumbnail} = post.frontMatter
  const image = await renderOgImage({
    title,
    mark: new URL(SiteConfig.url).host,
    seed: post.fields.slug,
    image: thumbnail ? await loadThumbnail(thumbnail) : undefined,
  })
  return new Uint8Array(await image.arrayBuffer())
}

export async function GET(
  _request: Request,
  {params}: RouteContext<'/og/[...path]'>,
) {
  const {path: segments} = await params
  const locale: Locale = segments[0] === 'en' ? 'en' : 'ko'
  const [year, ...slug] = (locale === 'en' ? segments.slice(1) : segments)
    .join('/')
    .replace(/\.png$/, '')
    .split('/')
  const png = await renderPostOgPng(locale, year, slug)
  if (!png) {
    return new Response('Not found', {status: 404})
  }
  return new Response(png, {headers: {'Content-Type': 'image/png'}})
}
