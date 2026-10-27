import {RECENT_WINDOW_HOURS, SHORTLIST_SIZE} from './config/sources'
import type {Article} from './types'

// 소스 성격이 다르므로 몫을 나눠 배분한다. 안 그러면 발행량이 많은 쪽이 전부 가져간다.
// 실측: 몫을 안 나누면 Hacker News 11건 + GitHub Trending 9건으로 27칸 중 20칸이 찼고
// 개인 블로그와 프레임워크는 0건이었다.
const LANES = [
  // 무엇이 읽혔는가. 다만 Hacker News 하나가 전부 먹지 않도록 소스당 상한을 건다.
  {name: 'community', quota: 10, perSource: 5, match: isCommunity},
  // 노이즈가 많아 몫을 작게 준다.
  {
    name: 'trending',
    quota: 3,
    perSource: 1,
    match: (a: Article) => a.sourceKind === 'trending',
  },
] as const

// 나머지(개인 블로그, 프레임워크, 벤더, 표준, 릴리스)가 쓰는 몫과 상한.
const REST_PER_SOURCE = 2

export function filterRecent(articles: Article[], now: Date): Article[] {
  const cutoff = now.getTime() - RECENT_WINDOW_HOURS * 60 * 60 * 1000
  return articles.filter((a) => {
    if (!a.publishedAt) return true
    const ts = new Date(a.publishedAt).getTime()
    if (Number.isNaN(ts)) return true
    return ts >= cutoff
  })
}

function isCommunity(a: Article): boolean {
  return a.sourceKind === 'hn' || a.source === 'Lobsters'
}

function takeCapped(
  pool: Article[],
  limit: number,
  perSource: number,
  taken: Set<string>,
): Article[] {
  const counts = new Map<string, number>()
  const picked: Article[] = []
  for (const a of pool) {
    if (picked.length >= limit) break
    if (taken.has(a.url)) continue
    const used = counts.get(a.source) ?? 0
    if (used >= perSource) continue
    counts.set(a.source, used + 1)
    taken.add(a.url)
    picked.push(a)
  }
  return picked
}

export function shortlist(articles: Article[]): Article[] {
  const taken = new Set<string>()
  const out: Article[] = []

  for (const lane of LANES) {
    const pool = articles
      .filter(lane.match)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    out.push(...takeCapped(pool, lane.quota, lane.perSource, taken))
  }

  const rest = articles.filter((a) => !LANES.some((lane) => lane.match(a)))
  out.push(
    ...takeCapped(rest, SHORTLIST_SIZE - out.length, REST_PER_SOURCE, taken),
  )

  // 몫이나 소스 상한 때문에 자리가 남으면 남은 후보로 채운다.
  if (out.length < SHORTLIST_SIZE) {
    for (const a of [...rest, ...articles]) {
      if (out.length >= SHORTLIST_SIZE) break
      if (taken.has(a.url)) continue
      taken.add(a.url)
      out.push(a)
    }
  }

  return out.slice(0, SHORTLIST_SIZE)
}
