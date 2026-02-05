import fs from 'fs'
import path from 'path'

import {notFound} from 'next/navigation'

import matter from 'gray-matter'

import {PresenterView} from '@/components/PresenterView'
import {generateRenderedMarp} from '@/lib/marp'

interface SlideData {
  title: string
  html: string[]
  css: string
  fonts: string[]
  notes: string[]
}

async function getSlideData(slug: string): Promise<SlideData | null> {
  const filePath = path.join(process.cwd(), 'research', `${slug}.md`)

  if (!fs.existsSync(filePath)) {
    return null
  }

  const markdown = fs.readFileSync(filePath, 'utf-8')
  const {data} = matter(markdown)

  const title = data.title ? String(data.title) : slug
  const {html, css, fonts, notes} = await generateRenderedMarp(markdown)

  return {title, html, css, fonts, notes}
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

  return {
    title: `발표자 모드 - ${data.title}`,
  }
}

export default async function PresenterPage(props: {
  params: Promise<{slug: string}>
}) {
  const params = await props.params
  const data = await getSlideData(params.slug)
  if (!data) {
    notFound()
    return null
  }

  const {html, css, fonts, notes} = data

  return (
    <PresenterView
      dataHtml={JSON.stringify(html)}
      dataCss={css}
      dataFonts={JSON.stringify(fonts)}
      dataNotes={JSON.stringify(notes)}
      slug={params.slug}
    />
  )
}
