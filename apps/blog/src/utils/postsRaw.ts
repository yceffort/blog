import fs from 'fs'
import path from 'path'

import {sync} from 'glob'

import {POST_ROOT, isLocaleFile} from './postPaths'
import type {Locale} from './postPaths'

export function getPostRawBySlug(
  year: string,
  slugParts: string[],
  locale: Locale = 'ko',
): string | null {
  const baseSlug = [year, ...slugParts].join('/')
  const suffix = locale === 'en' ? '.en' : ''

  for (const ext of ['.md', '.mdx']) {
    const filePath = path.join(POST_ROOT, `${baseSlug}${suffix}${ext}`)
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8')
    }
  }
  return null
}

export function getAllPostFiles(locale: Locale = 'ko'): string[] {
  return sync(`${POST_ROOT}/**/*.md*`).filter((f) => isLocaleFile(f, locale))
}
