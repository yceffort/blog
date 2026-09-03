import fs from 'fs'

import frontMatter from 'front-matter'
import {sync} from 'glob'
import {cache} from 'react'
import readingTime from 'reading-time'

import {
  POPULAR_POSTS_COUNT,
  PRERENDER_POSTS_COUNT,
  RECENT_POSTS_COUNT,
} from '@/constants'

import type {ArtSpec, FrontMatter, Post, TagWithCount} from '../type'
import {getPopularPostSlugs} from './analytics'
import {POST_ROOT, isLocaleFile, pathToSlug} from './postPaths'
import type {Locale} from './postPaths'

const THUMB_DIR = `${process.cwd()}/public/thumbnails`

// 코드 생성 썸네일(api/og/art) 캐시 무효화용 버전. 아트 디자인이 바뀌면 올린다.
const ART_VERSION = 6

// public/thumbnails 에 생성 일러스트(webp)나 실사(png)가 있으면 그 경로, 없으면 frontmatter art 로 코드 아트 URL
// 둘 다 없는 옛 글은 썸네일 없이 둔다
// 재생성해도 파일명이 같아 캐시가 안 깨지므로 수정 시각을 버전으로 붙인다
export function resolveThumbnail(
  slug: string,
  art?: ArtSpec,
): string | undefined {
  const ext = ['webp', 'png'].find((e) =>
    fs.existsSync(`${THUMB_DIR}/${slug}.${e}`),
  )
  if (!ext) {
    return art ? buildArtThumbnail(slug, art) : undefined
  }
  const version = Math.floor(
    fs.statSync(`${THUMB_DIR}/${slug}.${ext}`).mtimeMs / 1000,
  ).toString(36)
  return `/thumbnails/${slug}.${ext}?v=${version}`
}

export function buildArtThumbnail(seed: string, art?: ArtSpec): string {
  const params = new URLSearchParams({v: String(ART_VERSION), slug: seed})
  if (art?.layout) {
    params.set('layout', art.layout)
  }
  if (art?.hue) {
    params.set('hue', art.hue)
  }
  if (art?.tone) {
    params.set('tone', art.tone)
  }
  if (art?.hero) {
    params.set('hero', art.hero)
  }
  return `/api/og/art?${params.toString()}`
}

export type {Locale}

export const getAllPosts = cache(async function getAllPostsImpl(
  locale: Locale = 'ko',
): Promise<Post[]> {
  const files = sync(`${POST_ROOT}/**/*.md*`).toReversed()

  const posts = files
    .filter((f) => isLocaleFile(f, locale))
    .reduce<Post[]>((prev, path) => {
      const file = fs.readFileSync(path, {encoding: 'utf8'})
      const {attributes, body} = frontMatter<FrontMatter>(file)
      const fm: FrontMatter = attributes
      const {tags: fmTags, published, date} = fm

      const slug = pathToSlug(path)

      const isDev = process.env.NODE_ENV !== 'production'
      if (published || isDev) {
        const tags: string[] = (fmTags || []).map((tag: string) => tag.trim())
        const stats = readingTime(body, {wordsPerMinute: 250})

        const thumbnail = resolveThumbnail(slug, fm.art)

        const result: Post = {
          frontMatter: {
            ...fm,
            tags,
            date: new Date(date).toISOString().substring(0, 19),
            thumbnail,
          },
          body,
          fields: {
            slug,
          },
          path,
          readingTime: Math.max(1, Math.ceil(stats.minutes)),
        }
        prev.push(result)
      }
      return prev
    }, [])
    .toSorted((a, b) => {
      if (a.frontMatter.date < b.frontMatter.date) {
        return 1
      }
      if (a.frontMatter.date > b.frontMatter.date) {
        return -1
      }
      return 0
    })

  return posts
})

export const findPostByYearAndSlug = cache(
  async function findPostByYearAndSlugImpl(
    year: string,
    slug: string[],
    locale: Locale = 'ko',
  ) {
    const slugs = [year, ...slug].join('/')
    const posts = await getAllPosts(locale)
    return posts.find((p) => p?.fields?.slug === slugs)
  },
)

export const getAllTagsFromPosts = cache(async function getAllTagsFromPostsImpl(
  locale: Locale = 'ko',
): Promise<TagWithCount[]> {
  const posts = await getAllPosts(locale)
  const tagCountMap = new Map<string, number>()

  for (const post of posts) {
    for (const tag of post.frontMatter.tags) {
      tagCountMap.set(tag, (tagCountMap.get(tag) ?? 0) + 1)
    }
  }

  return Array.from(tagCountMap.entries())
    .map(([tag, count]) => ({tag, count}))
    .toSorted((a, b) => b.count - a.count)
})

export const getSeriesPosts = cache(async function getSeriesPostsImpl(
  seriesName: string,
  locale: Locale = 'ko',
): Promise<Post[]> {
  const posts = await getAllPosts(locale)
  return posts
    .filter((post) => post.frontMatter.series === seriesName)
    .toSorted(
      (a, b) =>
        (a.frontMatter.seriesOrder ?? 0) - (b.frontMatter.seriesOrder ?? 0),
    )
})

export async function getRelatedPosts(
  slug: string,
  tags: string[],
  locale: Locale = 'ko',
  excludeSeries?: string,
  limit = 4,
): Promise<Post[]> {
  const posts = await getAllPosts(locale)
  const tagSet = new Set(tags)

  return posts
    .filter(
      (p) =>
        p.fields.slug !== slug &&
        (excludeSeries == null || p.frontMatter.series !== excludeSeries),
    )
    .map((post) => ({
      post,
      score: post.frontMatter.tags.reduce(
        (n, t) => (tagSet.has(t) ? n + 1 : n),
        0,
      ),
    }))
    .filter(({score}) => score > 0)
    .toSorted((a, b) =>
      b.score !== a.score
        ? b.score - a.score
        : a.post.frontMatter.date < b.post.frontMatter.date
          ? 1
          : -1,
    )
    .slice(0, limit)
    .map(({post}) => post)
}

export const getFeaturedPosts = cache(async function getFeaturedPostsImpl(
  locale: Locale = 'ko',
  reservedSlots = 0,
): Promise<{popular: Post[]; recent: Post[]}> {
  const allPosts = await getAllPosts(locale)
  const popularCount = POPULAR_POSTS_COUNT - reservedSlots
  // en은 번역이 없는 인기글이 걸러지므로 후보를 넉넉히 가져온다
  const popularSlugs = await getPopularPostSlugs(
    locale === 'ko' ? POPULAR_POSTS_COUNT : POPULAR_POSTS_COUNT * 3,
  )

  const popular = popularSlugs
    .map((slug) => allPosts.find((p) => p.fields.slug === slug))
    .filter((p): p is Post => p != null)
    .slice(0, popularCount)

  if (popular.length < popularCount) {
    const slugSet = new Set(popular.map((p) => p.fields.slug))
    for (const p of allPosts) {
      if (popular.length >= popularCount) {
        break
      }
      if (!slugSet.has(p.fields.slug)) {
        popular.push(p)
        slugSet.add(p.fields.slug)
      }
    }
  }

  const shown = new Set(popular.map((p) => p.fields.slug))
  const recent = allPosts
    .filter((p) => !shown.has(p.fields.slug))
    .slice(0, RECENT_POSTS_COUNT)

  return {popular, recent}
})

export const getFeaturedSlugs = cache(async function getFeaturedSlugsImpl(
  locale: Locale = 'ko',
): Promise<string[]> {
  const {popular, recent} = await getFeaturedPosts(locale)
  return [...popular, ...recent].map((p) => p.fields.slug)
})

// 빌드 시 사전 생성할 슬러그. 검색 롱테일 유입이 콜드 함수 렌더(TTFB 상승)를
// 밟지 않도록, 홈 노출용(getFeaturedSlugs)보다 넓게 최근 1년 인기 상위를 포함한다.
export const getPrerenderSlugs = cache(async function getPrerenderSlugsImpl(
  locale: Locale = 'ko',
): Promise<string[]> {
  const allPosts = await getAllPosts(locale)
  const existing = new Set(allPosts.map((p) => p.fields.slug))
  const popularSlugs = await getPopularPostSlugs(PRERENDER_POSTS_COUNT, 365)

  const slugs = new Set(popularSlugs.filter((slug) => existing.has(slug)))
  for (const p of allPosts.slice(0, RECENT_POSTS_COUNT)) {
    slugs.add(p.fields.slug)
  }
  return [...slugs]
})
