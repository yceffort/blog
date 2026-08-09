import fs from 'fs'
import path from 'path'

import matter from 'gray-matter'
import {cacheLife, cacheTag} from 'next/cache'
import {notFound} from 'next/navigation'

import {MarpSlides} from '@/components/MarpSlides'
import {SiteConfig} from '@/config'
import {generateRenderedMarp} from '@/lib/marp'

interface SlideData {
  title: string
  description?: string
  tags?: string[]
  html: string[]
  css: string
  fonts: string[]
  published: boolean
}

async function getSlideData(slug: string): Promise<SlideData | null> {
  'use cache'
  cacheLife('max')
  cacheTag(`slide:${slug}`)

  const filePath = path.join(process.cwd(), 'research', `${slug}.md`)

  if (!fs.existsSync(filePath)) {
    return null
  }

  const markdown = fs.readFileSync(filePath, 'utf-8')
  const {data} = matter(markdown)

  const title = data.title ? String(data.title) : slug
  const description = data.description ? String(data.description) : undefined
  const tags = data.tags as string[] | undefined
  const published = data.published !== false
  const {html, css, fonts} = await generateRenderedMarp(markdown)

  return {title, description, tags, html, css, fonts, published}
}

export async function generateStaticParams() {
  const researchPath = path.join(process.cwd(), 'research')
  const files = fs.readdirSync(researchPath)

  return files
    .filter((file) => file.endsWith('.md'))
    .map((file) => ({
      slug: file.replace(/\.md$/, ''),
    }))
}

export async function generateMetadata(props: {
  params: Promise<{slug: string}>
}) {
  const params = await props.params
  const data = await getSlideData(params.slug)
  if (!data) {
    return {title: `Not Found - ${params.slug}`}
  }

  const ogImageUrl = `/api/og?title=${encodeURIComponent(data.title)}&description=${encodeURIComponent(data.description || '')}&tags=${encodeURIComponent((data.tags || []).join(','))}&path=${encodeURIComponent('/slides/' + params.slug)}`

  return {
    title: data.title,
    description: data.description,
    alternates: {
      canonical: `${SiteConfig.url}/slides/${params.slug}`,
      types: {
        'text/markdown': `${SiteConfig.url}/slides/${params.slug}.md`,
      },
    },
    openGraph: {
      title: data.title,
      description: data.description,
      url: `${SiteConfig.url}/slides/${params.slug}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: data.title,
      description: data.description,
      images: [ogImageUrl],
    },
  }
}

export default async function SlidePage(props: {
  params: Promise<{slug: string}>
}) {
  const params = await props.params
  const data = await getSlideData(params.slug)
  if (!data) {
    notFound()
    return null
  }

  const isDev = process.env.NODE_ENV !== 'production'
  if (!data.published && !isDev) {
    notFound()
    return null
  }

  const {html, css, fonts, published} = data

  return (
    <div>
      <MarpSlides
        dataHtml={JSON.stringify(html)}
        dataCss={css}
        dataFonts={JSON.stringify(fonts)}
        slug={params.slug}
      />
      {!published && (
        <div className="pointer-events-none fixed bottom-4 left-4 z-50 select-none rounded-lg border border-amber-400 bg-amber-100/95 px-4 py-2 text-sm font-medium text-amber-900 shadow-lg backdrop-blur-sm dark:border-amber-500 dark:bg-amber-900/90 dark:text-amber-100">
          ⚠️ 배포되지 않은 포스트입니다 (dev only)
        </div>
      )}
    </div>
  )
}
