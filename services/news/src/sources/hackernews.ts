import {FETCH_TIMEOUT_MS, HN_MIN_SCORE, HN_TOP_COUNT} from '../config/sources'
import type {Article, FetchReport} from '../types'

const HN_API = 'https://hacker-news.firebaseio.com/v0'

interface HNItem {
  id: number
  title: string
  url?: string
  score: number
  time: number
}

async function fetchItem(id: number): Promise<HNItem | null> {
  try {
    const res = await fetch(`${HN_API}/item/${id}.json`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    return res.ok ? ((await res.json()) as HNItem) : null
  } catch {
    return null
  }
}

export async function fetchHackerNews(): Promise<{
  articles: Article[]
  reports: FetchReport[]
}> {
  try {
    const res = await fetch(`${HN_API}/topstories.json`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const ids = ((await res.json()) as number[]).slice(0, HN_TOP_COUNT)
    const items = await Promise.all(ids.map(fetchItem))

    const articles = items
      .filter(
        (i): i is HNItem =>
          i !== null && typeof i.url === 'string' && i.score >= HN_MIN_SCORE,
      )
      .map((i) => ({
        title: i.title,
        url: i.url!,
        description: '',
        source: 'Hacker News',
        sourceKind: 'hn' as const,
        publishedAt: new Date(i.time * 1000).toISOString(),
        score: i.score,
      }))

    return {
      articles,
      reports: [{source: 'Hacker News', ok: true, count: articles.length}],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      articles: [],
      reports: [{source: 'Hacker News', ok: false, count: 0, error: message}],
    }
  }
}
