import {FETCH_TIMEOUT_MS, HN_MIN_SCORE, HN_TOP_COUNT} from '../config/sources'
import type {Article, FetchReport} from '../types'

const HN_API = 'https://hacker-news.firebaseio.com/v0'
const ALGOLIA_API = 'https://hn.algolia.com/api/v1'

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

interface AlgoliaHit {
  objectID: string
  title: string
  url?: string
  points: number
  created_at_i: number
}

// topstories는 지금의 순위만 준다. 소급 실행은 그날 24시간 동안 올라온 글을 점수순으로 대신 쓴다.
async function fetchItemsAsOf(asOf: Date): Promise<HNItem[]> {
  const end = Math.floor(asOf.getTime() / 1000)
  const filters = `created_at_i>=${end - 24 * 60 * 60},created_at_i<${end},points>=${HN_MIN_SCORE}`
  const res = await fetch(
    `${ALGOLIA_API}/search?tags=story&hitsPerPage=${HN_TOP_COUNT}&numericFilters=${encodeURIComponent(filters)}`,
    {signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)},
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const {hits} = (await res.json()) as {hits: AlgoliaHit[]}
  return hits.map((h) => ({
    id: Number(h.objectID),
    title: h.title,
    url: h.url,
    score: h.points,
    time: h.created_at_i,
  }))
}

async function fetchTopItems(): Promise<(HNItem | null)[]> {
  const res = await fetch(`${HN_API}/topstories.json`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const ids = ((await res.json()) as number[]).slice(0, HN_TOP_COUNT)
  return Promise.all(ids.map(fetchItem))
}

export async function fetchHackerNews(asOf?: Date): Promise<{
  articles: Article[]
  reports: FetchReport[]
}> {
  try {
    const items = asOf ? await fetchItemsAsOf(asOf) : await fetchTopItems()

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
