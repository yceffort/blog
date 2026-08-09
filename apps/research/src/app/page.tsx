import fs from 'fs'
import path from 'path'

import {compareDesc} from 'date-fns/compareDesc'
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
  date: string
  tags: string[]
  description: string
  title: string
  published: boolean
  preview: {
    html: string
    css: string
    fonts: string[]
  }
}

async function getHomeSlides(): Promise<Slide[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('research:home')

  const researchPath = path.join(process.cwd(), 'research')
  const allFiles = fs.readdirSync(researchPath)
  const mdFiles = allFiles.filter((file) => file.endsWith('.md'))

  const slidesPromises = mdFiles.map(async (filename) => {
    const slug = filename.replace(/\.md$/, '')

    const content = fs.readFileSync(path.join(researchPath, filename), 'utf-8')
    const {data} = matter(content)
    const date = format(data.date || new Date(), 'yyyy-MM-dd')
    const tags: string[] = data.tags || []
    const description = data.description
    const title = data.title
    const published = data.published

    const {html, css, fonts} = await generateRenderedMarp(content)
    const preview = {
      html: html[0] || '',
      css,
      fonts,
    }

    return {
      filename,
      slug,
      date,
      tags,
      description,
      title,
      published,
      preview,
    }
  })

  const allSlides = await Promise.all(slidesPromises)
  const isDev = process.env.NODE_ENV !== 'production'
  return allSlides
    .filter((slide) => isDev || slide.published)
    .toSorted((a, b) => compareDesc(a.date, b.date))
}

export default async function Page() {
  const slides = await getHomeSlides()

  return (
    <LayoutWrapper>
      <Hero />
      <SlideListWithFilter slides={slides} />
    </LayoutWrapper>
  )
}
