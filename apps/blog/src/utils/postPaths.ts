import path from 'path'

export type Locale = 'ko' | 'en'

export const pathPrefixOf = (locale: Locale) => (locale === 'en' ? '/en' : '')

// 빌드 때 app/og/[...path]/route.tsx가 만든다. 서피트 같은 수집기가 긴 동적 URL을 받지 못해 짧은 정적 경로를 쓴다
export const postOgImagePath = (slug: string, locale: Locale) =>
  `/og${pathPrefixOf(locale)}/${slug}.png`

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
