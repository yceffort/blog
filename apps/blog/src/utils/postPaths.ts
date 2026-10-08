import path from 'path'

export type Locale = 'ko' | 'en'

export const pathPrefixOf = (locale: Locale) => (locale === 'en' ? '/en' : '')

export const POST_ROOT = path.join(process.cwd(), 'posts')

export function isLocaleFile(filePath: string, locale: Locale): boolean {
  const isEn = /\.en\.mdx?$/.test(filePath)
  return locale === 'en' ? isEn : !isEn
}

export function pathToSlug(filePath: string): string {
  return filePath
    .slice(POST_ROOT.length + 1)
    .replace(/\.en\.mdx?$/, '')
    .replace(/\.mdx?$/, '')
}
