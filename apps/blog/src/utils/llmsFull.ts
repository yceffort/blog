import fs from 'fs'

import frontMatter from 'front-matter'

import {SiteConfig} from '@/config'
import type {FrontMatter} from '@/type'

import {pathToSlug} from './postPaths'
import type {Locale} from './postPaths'
import {getAllPostFiles} from './postsRaw'

export function buildLlmsFullResponse(locale: Locale): Response {
  const files = getAllPostFiles(locale)
  const langLabel = locale === 'en' ? 'English' : 'Korean'
  const urlPrefix = locale === 'en' ? `${SiteConfig.url}/en` : SiteConfig.url

  const parts: string[] = []
  parts.push(`# ${SiteConfig.title}`)
  parts.push('')
  parts.push(`> Full markdown of every published post (${langLabel}).`)
  parts.push('')

  const entries = files
    .map((file) => {
      const raw = fs.readFileSync(file, 'utf-8')
      const {attributes, body} = frontMatter<FrontMatter>(raw)
      return {slug: pathToSlug(file), body, attributes}
    })
    .filter(({attributes}) => attributes.published)
    .toSorted(
      (a, b) =>
        new Date(b.attributes.date).getTime() -
        new Date(a.attributes.date).getTime(),
    )

  for (const {slug, body, attributes} of entries) {
    parts.push('---')
    parts.push('')
    parts.push(`Source: ${urlPrefix}/${slug}.md`)
    parts.push(`Title: ${attributes.title}`)
    if (attributes.description) {
      parts.push(`Description: ${attributes.description}`)
    }
    parts.push(`Date: ${new Date(attributes.date).toISOString().slice(0, 10)}`)
    if (attributes.tags?.length) {
      parts.push(`Tags: ${attributes.tags.join(', ')}`)
    }
    if (attributes.series) {
      parts.push(`Series: ${attributes.series}`)
    }
    parts.push('')
    parts.push(body.trim())
    parts.push('')
  }

  return new Response(parts.join('\n') + '\n', {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=300, stale-while-revalidate=86400',
    },
  })
}
