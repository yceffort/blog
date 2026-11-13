import {RECENT_WINDOW_HOURS} from './config/sources'
import type {Article} from './types'

// 소급 실행에서는 now가 과거라서 그 뒤에 나온 글도 뺀다.
export function filterRecent(articles: Article[], now: Date): Article[] {
  const cutoff = now.getTime() - RECENT_WINDOW_HOURS * 60 * 60 * 1000
  return articles.filter((a) => {
    if (!a.publishedAt) return true
    const ts = new Date(a.publishedAt).getTime()
    if (Number.isNaN(ts)) return true
    return ts >= cutoff && ts <= now.getTime()
  })
}
