import fs from 'fs'
import path from 'path'

import {format} from 'date-fns/format'
import matter from 'gray-matter'
import {cacheLife, cacheTag} from 'next/cache'

import Hero from '@/components/Hero'
import LayoutWrapper from '@/components/LayoutWrapper'
import {SlideListWithFilter} from '@/components/SlideListWithFilter'
import {generateRenderedMarp} from '@/lib/marp'

interface Slide {
  filename: string
  slug: string
  date: string | null
  tags: string[]
  description: string
  title: string
  published: boolean
  post?: string
  slideCount: number
  preview: {
    html: string
    cssIndex: number
    fonts: string[]
  }
}

interface HomeSlidesData {
  slides: Slide[]
  // 같은 테마를 쓰는 덱은 Marp CSS가 동일하므로, 덱마다 CSS 전체를 싣지 않고
  // 유니크한 CSS만 모아 인덱스로 참조한다 (홈 페이로드가 덱 수에 비례해 커지는 것 방지)
  cssList: string[]
}

async function getHomeSlides(): Promise<HomeSlidesData> {
  'use cache'
  cacheLife('hours')
  cacheTag('research:home')

  const researchPath = path.join(process.cwd(), 'research')
  const allFiles = fs.readdirSync(researchPath)
  const mdFiles = allFiles.filter((file) => file.endsWith('.md'))

  const cssList: string[] = []
  const cssIndexMap = new Map<string, number>()

  const slidesPromises = mdFiles.map(async (filename) => {
    const slug = filename.replace(/\.md$/, '')

    const content = fs.readFileSync(path.join(researchPath, filename), 'utf-8')
    const {data} = matter(content)
    const date = data.date ? format(data.date, 'yyyy-MM-dd') : null
    const tags: string[] = data.tags || []
    const description = data.description
    const title = data.title
    const published = data.published
    const post = data.post ? String(data.post) : undefined

    const {html, css, fonts} = await generateRenderedMarp(content)

    let cssIndex = cssIndexMap.get(css)
    if (cssIndex === undefined) {
      cssIndex = cssList.push(css) - 1
      cssIndexMap.set(css, cssIndex)
    }

    return {
      filename,
      slug,
      date,
      tags,
      description,
      title,
      published,
      post,
      slideCount: html.length,
      preview: {
        html: html[0] || '',
        cssIndex,
        fonts,
      },
    }
  })

  const allSlides = await Promise.all(slidesPromises)
  const isDev = process.env.NODE_ENV !== 'production'
  const slides = allSlides
    .filter((slide) => isDev || slide.published)
    .toSorted((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  return {slides, cssList}
}

export default async function Page() {
  const {slides, cssList} = await getHomeSlides()

  return (
    <LayoutWrapper>
      <Hero />
      <SlideListWithFilter slides={slides} cssList={cssList} />
    </LayoutWrapper>
  )
}
