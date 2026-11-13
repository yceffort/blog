import type {Article} from './types'

// Hacker News와 Lobsters는 글을 실어 나르는 경유지지 출처가 아니다.
// 실제 출처는 링크가 가리키는 사이트다.
const AGGREGATORS = new Set(['Hacker News', 'Lobsters'])

export function deriveOrigin(article: Article): string {
  if (article.sourceKind === 'trending') return 'github.com'
  if (!AGGREGATORS.has(article.source)) return article.source

  try {
    return new URL(article.url).hostname.replace(/^www\./, '')
  } catch {
    return article.source
  }
}

export function withOrigin<T extends Article>(
  article: T,
): T & {origin: string; via: string | null} {
  const via = AGGREGATORS.has(article.source) ? article.source : null
  return {...article, origin: deriveOrigin(article), via}
}
