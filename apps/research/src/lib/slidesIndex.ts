import fs from 'fs'
import path from 'path'

import matter from 'gray-matter'
import {cache} from 'react'

export interface SlideIndexEntry {
  slug: string
  title: string
  description?: string
  tags?: string[]
  date?: string
  published: boolean
  markdown: string
}

const RESEARCH_DIR = path.join(process.cwd(), 'research')

// YAML의 unquoted date는 gray-matter가 Date 객체로 파싱하므로,
// String()으로 감싸면 "Wed Aug 05 ..." 형태가 되어 localeCompare 정렬이 깨진다.
// 항상 yyyy-MM-dd로 정규화한다.
function normalizeDate(value: unknown): string | undefined {
  if (!value) {
    return undefined
  }
  const date = new Date(value as string | Date)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }
  return date.toISOString().slice(0, 10)
}

export const getAllSlides = cache(
  function getAllSlidesImpl(): SlideIndexEntry[] {
    const files = fs.readdirSync(RESEARCH_DIR).filter((f) => f.endsWith('.md'))

    return files
      .map((file) => {
        const slug = file.replace(/\.md$/, '')
        const markdown = fs.readFileSync(path.join(RESEARCH_DIR, file), 'utf-8')
        const {data} = matter(markdown)
        return {
          slug,
          title: data.title ? String(data.title) : slug,
          description: data.description ? String(data.description) : undefined,
          tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
          date: normalizeDate(data.date),
          published: data.published !== false,
          markdown,
        }
      })
      .toSorted((a, b) => {
        const ad = a.date ?? ''
        const bd = b.date ?? ''
        return bd.localeCompare(ad)
      })
  },
)

export const getSlideBySlug = cache(function getSlideBySlugImpl(
  slug: string,
): SlideIndexEntry | null {
  const filePath = path.join(RESEARCH_DIR, `${slug}.md`)
  if (!fs.existsSync(filePath)) {
    return null
  }
  const markdown = fs.readFileSync(filePath, 'utf-8')
  const {data} = matter(markdown)
  return {
    slug,
    title: data.title ? String(data.title) : slug,
    description: data.description ? String(data.description) : undefined,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
    date: normalizeDate(data.date),
    published: data.published !== false,
    markdown,
  }
})
