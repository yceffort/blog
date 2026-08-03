import fs from 'fs'

import {cache} from 'react'

import frontMatter from 'front-matter'
import {sync} from 'glob'
import readingTime from 'reading-time'

import {getPopularPostSlugs} from './analytics'
import {POST_ROOT, isLocaleFile, pathToSlug} from './postPaths'

import type {Locale} from './postPaths'
import type {FrontMatter, Post, TagWithCount} from '../type'

import {
  PINNED_POPULAR_SLUG,
  POPULAR_POSTS_COUNT,
  RECENT_POSTS_COUNT,
} from '@/constants'

const THUMB_DIR = `${process.cwd()}/public/thumbnails`

export type {Locale}

export const getAllPosts = cache(async function getAllPostsImpl(
  locale: Locale = 'ko',
): Promise<Post[]> {
  const files = sync(`${POST_ROOT}/**/*.md*`).reverse()

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

        const thumbPath = `${THUMB_DIR}/${slug}.png`
        const thumbnail = fs.existsSync(thumbPath)
          ? `/thumbnails/${slug}.png`
          : undefined

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
    .sort((a, b) => {
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
    .sort((a, b) => b.count - a.count)
})

export const getSeriesPosts = cache(async function getSeriesPostsImpl(
  seriesName: string,
  locale: Locale = 'ko',
): Promise<Post[]> {
  const posts = await getAllPosts(locale)
  return posts
    .filter((post) => post.frontMatter.series === seriesName)
    .sort(
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
    .sort((a, b) =>
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
): Promise<{popular: Post[]; recent: Post[]}> {
  const allPosts = await getAllPosts(locale)
  const pinned = allPosts.find((p) => p.fields.slug === PINNED_POPULAR_SLUG)
  const popularCount = pinned ? POPULAR_POSTS_COUNT - 1 : POPULAR_POSTS_COUNT
  const popularSlugs =
    locale === 'ko' ? await getPopularPostSlugs(POPULAR_POSTS_COUNT) : []

  const popular = popularSlugs
    .map((slug) => allPosts.find((p) => p.fields.slug === slug))
    .filter(
      (p): p is Post => p != null && p.fields.slug !== PINNED_POPULAR_SLUG,
    )
    .slice(0, popularCount)

  if (popular.length < popularCount) {
    const slugSet = new Set(popular.map((p) => p.fields.slug))
    if (pinned) {
      slugSet.add(pinned.fields.slug)
    }
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

  if (pinned) {
    popular.push(pinned)
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
