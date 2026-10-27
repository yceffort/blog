import {
  PERSONAL_BLOGS,
  RECENT_WINDOW_HOURS,
  SHORTLIST_SIZE,
} from './config/sources'
import type {Article} from './types'

// 소스 성격이 다르므로 몫을 나눠 배분한다. 안 그러면 발행량이 많은 쪽이 전부 가져간다.
// 실측: 몫을 안 나누면 Hacker News 11건 + GitHub Trending 9건으로 27칸 중 20칸이 찼고
// 개인 블로그와 프레임워크는 0건이었다.
const LANES = [
  // 무엇이 읽혔는가. 다만 Hacker News 하나가 전부 먹지 않도록 소스당 상한을 건다.
  {
    name: 'community',
    quota: 6,
    perSource: 3,
    match: isCommunity,
    order: byScore,
  },
  // 노이즈가 많아 몫을 작게 준다.
  {
    name: 'trending',
    quota: 2,
    perSource: 1,
    match: (a: Article) => a.sourceKind === 'trending',
    order: byScore,
  },
  // 실측: 몫이 없을 때 본문 확보 23건 중 개인 블로그는 2건이었다.
  {
    name: 'personal',
    quota: 8,
    perSource: 2,
    match: (a: Article) => PERSONAL_BLOGS.has(a.source),
    order: byNewest,
  },
] as const

// 나머지(프레임워크, 벤더, 표준, 릴리스, 뉴스레터)가 쓰는 소스당 상한.
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

function byScore(a: Article, b: Article): number {
  return (b.score ?? 0) - (a.score ?? 0)
}

// 발행일이 없거나 깨진 글은 뒤로 보낸다.
function byNewest(a: Article, b: Article): number {
  const time = (x: Article) => new Date(x.publishedAt).getTime() || 0
  return time(b) - time(a)
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
    const pool = articles.filter(lane.match).toSorted(lane.order)
    out.push(...takeCapped(pool, lane.quota, lane.perSource, taken))
  }

  const rest = articles
    .filter((a) => !LANES.some((lane) => lane.match(a)))
    .toSorted(byNewest)
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
