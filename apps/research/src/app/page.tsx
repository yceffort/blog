import fs from 'fs'
import path from 'path'

import Link from 'next/link'

import {compareDesc} from 'date-fns/compareDesc'
import {format} from 'date-fns/format'
import matter from 'gray-matter'

import Hero from '@/components/Hero'
import LayoutWrapper from '@/components/LayoutWrapper'

interface Slide {
  filename: string
  slug: string
  date: string
  tags: string[]
  description: string
  title: string
  published: boolean
}

function ResearchCard({slide}: {slide: Slide}) {
  const {slug, date, tags, description, title} = slide

  return (
    <article className="flex h-[280px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:scale-[1.02] hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
      <div className="flex flex-1 flex-col justify-between p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black leading-tight tracking-tight line-clamp-2">
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
          <div className="prose max-w-none text-sm font-medium text-gray-800 dark:text-gray-300 line-clamp-3">
            {description}
          </div>
        </div>
        <div className="mt-4 text-base font-black leading-6">
          <Link
            href={`/slides/${slug}`}
            className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            aria-label={`Read "${title}"`}
          >
            View slides &rarr;
          </Link>
        </div>
      </div>
    </article>
  )
}

export default async function Page() {
  const researchPath = path.join(process.cwd(), 'research')
  const allFiles = fs.readdirSync(researchPath)
  const mdFiles = allFiles.filter((file) => file.endsWith('.md'))

  const slides = mdFiles
    .map((filename) => {
      const slug = filename.replace(/\.md$/, '')

      const content = fs.readFileSync(
        path.join(researchPath, filename),
        'utf-8',
      )
      const {data} = matter(content)
      const date = format(data.date || new Date(), 'yyyy-MM-dd')
      const tags: string[] = data.tags || []
      const description = data.description
      const title = data.title
      const published = data.published

      return {
        filename,
        slug,
        date,
        tags,
        description,
        title,
        published,
      }
    })
    .filter((slide) => slide.published)
    .sort((a, b) => compareDesc(a.date, b.date))

  return (
    <LayoutWrapper>
      <Hero />
      <div className="grid grid-cols-1 pt-4 md:grid-cols-2 lg:grid-cols-3">
        {slides.map((slide) => (
          <div key={slide.slug} className="px-2 py-2 pb-8">
            <ResearchCard slide={slide} />
          </div>
        ))}
      </div>
    </LayoutWrapper>
  )
}
