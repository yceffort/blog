import fs from 'fs'
import path from 'path'

import frontMatter from 'front-matter'
import {sync} from 'glob'
import {cache} from 'react'

import type {Series} from '../type'
import {getPopularPostViews} from './analytics'
import {getSeriesPosts} from './Post'
import type {Locale} from './postPaths'

const SERIES_ROOT = path.join(process.cwd(), 'series')

interface SeriesFrontMatter {
  name: string
  title?: string
  description: string
}

function latestPostDate(series: Series): string {
  return series.posts.reduce(
    (latest, post) =>
      post.frontMatter.date > latest ? post.frontMatter.date : latest,
    '',
  )
}

export const getAllSeries = cache(async function getAllSeriesImpl(
  locale: Locale = 'ko',
): Promise<Series[]> {
  const files = sync(`${SERIES_ROOT}/*.md`).filter((f) => !f.endsWith('.en.md'))

  const series = await Promise.all(
    files.map(async (filePath): Promise<Series> => {
      const file = fs.readFileSync(filePath, {encoding: 'utf8'})
      const {attributes, body} = frontMatter<SeriesFrontMatter>(file)
      return {
        slug: path.basename(filePath, '.md'),
        name: attributes.name,
        title: attributes.title ?? attributes.name,
        description: attributes.description,
        body,
        path: filePath,
        posts: await getSeriesPosts(attributes.name, locale),
      }
    }),
  )

  return series
    .filter((s) => s.posts.length > 0)
    .toSorted((a, b) => (latestPostDate(a) < latestPostDate(b) ? 1 : -1))
})

export const findSeriesBySlug = cache(async function findSeriesBySlugImpl(
  slug: string,
  locale: Locale = 'ko',
): Promise<Series | undefined> {
  const series = await getAllSeries(locale)
  return series.find((s) => s.slug === slug)
})

export const getPopularSeries = cache(async function getPopularSeriesImpl(
  locale: Locale = 'ko',
): Promise<Series | null> {
  const [series, views] = await Promise.all([
    getAllSeries(locale),
    getPopularPostViews(50),
  ])
  if (views.length === 0) {
    return null
  }

  const viewMap = new Map(views.map((row) => [row.slug, row.views]))
  let best: Series | null = null
  let bestAverage = 0
  for (const s of series) {
    const total = s.posts.reduce(
      (sum, post) => sum + (viewMap.get(post.fields.slug) ?? 0),
      0,
    )
    const average = total / s.posts.length
    if (average > bestAverage) {
      best = s
      bestAverage = average
    }
  }
  return best
})

export const findSeriesSlugByName = cache(
  async function findSeriesSlugByNameImpl(
    name: string,
  ): Promise<string | undefined> {
    const series = await getAllSeries()
    return series.find((s) => s.name === name)?.slug
  },
)
