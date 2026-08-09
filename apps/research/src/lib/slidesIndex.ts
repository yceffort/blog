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
          date: data.date ? String(data.date) : undefined,
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
    date: data.date ? String(data.date) : undefined,
    published: data.published !== false,
    markdown,
  }
})
