import fs from 'fs'
import path from 'path'

import matter from 'gray-matter'
import {cacheLife, cacheTag} from 'next/cache'
import {notFound} from 'next/navigation'

import {MarpSlides} from '@/components/MarpSlides'
import {isTransitionType} from '@/components/MarpSlides.constants'
import type {TransitionType} from '@/components/MarpSlides.constants'
import {SiteConfig} from '@/config'
import {generateRenderedMarp} from '@/lib/marp'

import {devBanner} from '../devBanner.styles'

interface SlideData {
  title: string
  description?: string
  tags?: string[]
  html: string[]
  css: string
  fonts: string[]
  published: boolean
  post?: string
  transition?: TransitionType
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
  const post = data.post ? String(data.post) : undefined
  const transition = isTransitionType(data.transition)
    ? data.transition
    : undefined
  const {html, css, fonts} = await generateRenderedMarp(markdown)

  return {
    title,
    description,
    tags,
    html,
    css,
    fonts,
    published,
    post,
    transition,
  }
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
    robots: data.published ? undefined : {index: false, follow: false},
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

  const {html, css, fonts, published, post, transition} = data

  return (
    <div>
      <MarpSlides
        dataHtml={JSON.stringify(html)}
        dataCss={css}
        dataFonts={JSON.stringify(fonts)}
        slug={params.slug}
        postUrl={post}
        defaultTransition={transition}
      />
      {isDev && !published && (
        <div className={devBanner}>
          ⚠️ 배포되지 않은 포스트입니다 (dev only)
        </div>
      )}
    </div>
  )
}
