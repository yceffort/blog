import fs from 'fs'
import path from 'path'

import Link from 'next/link'

import {compareDesc} from 'date-fns/compareDesc'
import {format} from 'date-fns/format'
import matter from 'gray-matter'

import {ContributionGraph} from '@yceffort/shared'

import Hero from '@/components/Hero'
import LayoutWrapper from '@/components/LayoutWrapper'
import {SlidePreview} from '@/components/SlidePreview'
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

function ResearchCard({slide}: {slide: Slide}) {
  const {slug, date, tags, title, preview} = slide

  return (
    <article className="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/10 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-sky-500 dark:hover:shadow-sky-500/20">
      <Link href={`/slides/${slug}`} className="block">
        <SlidePreview
          html={preview.html}
          css={preview.css}
          fonts={preview.fonts}
        />
      </Link>
      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold uppercase text-blue-600 dark:bg-blue-900 dark:text-blue-300"
              >
                {tag}
              </span>
            ))}
          </div>
          <div>
            <h3 className="text-lg font-black leading-tight tracking-tight line-clamp-2">
              <Link
                href={`/slides/${slug}`}
                className="text-black decoration-4 hover:underline dark:text-white"
              >
                {title}
              </Link>
            </h3>
            <dl>
              <dt className="sr-only">Published on</dt>
              <dd className="text-sm font-bold leading-6 text-gray-600 dark:text-gray-400">
                <time dateTime={date}>{date}</time>
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </article>
  )
}

export default async function Page() {
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
  const slides = allSlides
    .filter((slide) => slide.published)
    .sort((a, b) => compareDesc(a.date, b.date))

  return (
    <LayoutWrapper>
      <Hero>
        <ContributionGraph />
      </Hero>
      <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-2">
        {slides.map((slide) => (
          <ResearchCard key={slide.slug} slide={slide} />
        ))}
      </div>
    </LayoutWrapper>
  )
}
