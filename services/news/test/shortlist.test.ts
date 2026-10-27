import {describe, expect, it} from 'vitest'

import {filterRecent, shortlist} from '../src/shortlist'
import type {Article} from '../src/types'

const NOW = new Date('2026-08-30T12:00:00Z')
let counter = 0

function article(over: Partial<Article> = {}): Article {
  counter += 1
  return {
    title: `t${counter}`,
    url: `https://a.com/${counter}`,
    description: '',
    source: 's',
    sourceKind: 'rss',
    publishedAt: NOW.toISOString(),
    ...over,
  }
}

describe('filterRecent', () => {
  it('7일 안의 글을 남긴다', () => {
    expect(
      filterRecent([article({publishedAt: '2026-08-25T12:00:00Z'})], NOW),
    ).toHaveLength(1)
  })

  it('7일을 넘은 글을 뺀다', () => {
    expect(
      filterRecent([article({publishedAt: '2026-08-01T00:00:00Z'})], NOW),
    ).toEqual([])
  })

  it('발행일이 없으면 남긴다', () => {
    expect(filterRecent([article({publishedAt: ''})], NOW)).toHaveLength(1)
  })

  it('발행일이 깨졌으면 남긴다', () => {
    expect(filterRecent([article({publishedAt: 'garbage'})], NOW)).toHaveLength(
      1,
    )
  })
})

describe('shortlist', () => {
  it('상한 30개를 넘지 않는다', () => {
    const many = Array.from({length: 200}, () => article())
    expect(shortlist(many).length).toBeLessThanOrEqual(30)
  })

  it('후보가 적으면 있는 만큼만 준다', () => {
    expect(shortlist([article(), article()])).toHaveLength(2)
  })

  it('커뮤니티 소스의 자리를 확보한다', () => {
    const rss = Array.from({length: 200}, (_, i) =>
      article({sourceKind: 'rss', source: `S${i}`}),
    )
    const hn = Array.from({length: 20}, () =>
      article({sourceKind: 'hn', source: 'Hacker News', score: 100}),
    )
    const picked = shortlist([...rss, ...hn])
    expect(
      picked.filter((a) => a.sourceKind === 'hn').length,
    ).toBeGreaterThanOrEqual(4)
  })

  it('Hacker News 하나가 커뮤니티 몫을 다 먹지 못한다', () => {
    const hn = Array.from({length: 30}, () =>
      article({sourceKind: 'hn', source: 'Hacker News', score: 100}),
    )
    const rss = Array.from({length: 40}, (_, i) =>
      article({sourceKind: 'rss', source: `S${i}`}),
    )
    const picked = shortlist([...hn, ...rss])
    expect(
      picked.filter((a) => a.source === 'Hacker News').length,
    ).toBeLessThanOrEqual(5)
  })

  it('GitHub Trending은 3건을 넘지 않는다', () => {
    const tr = Array.from({length: 12}, (_, i) =>
      article({sourceKind: 'trending', source: `GitHub Trending ${i % 3}`}),
    )
    const rss = Array.from({length: 40}, (_, i) =>
      article({sourceKind: 'rss', source: `S${i}`}),
    )
    const picked = shortlist([...tr, ...rss])
    expect(
      picked.filter((a) => a.sourceKind === 'trending').length,
    ).toBeLessThanOrEqual(3)
  })

  it('한 소스가 목록을 독점하지 못한다', () => {
    const flood = Array.from({length: 100}, () => article({source: 'Deno'}))
    const others = Array.from({length: 40}, (_, i) =>
      article({source: `S${i}`}),
    )
    const picked = shortlist([...flood, ...others])
    expect(
      picked.filter((a) => a.source === 'Deno').length,
    ).toBeLessThanOrEqual(2)
  })

  it('점수가 높은 커뮤니티 글을 먼저 고른다', () => {
    const low = article({
      sourceKind: 'hn',
      source: 'Hacker News',
      score: 60,
      title: 'low',
    })
    const high = article({
      sourceKind: 'hn',
      source: 'Hacker News',
      score: 500,
      title: 'high',
    })
    expect(shortlist([low, high])[0]!.title).toBe('high')
  })

  it('Lobsters도 커뮤니티로 친다', () => {
    const rss = Array.from({length: 100}, (_, i) => article({source: `S${i}`}))
    const lob = Array.from({length: 15}, () =>
      article({source: 'Lobsters', score: 10}),
    )
    const picked = shortlist([...rss, ...lob])
    expect(picked.filter((a) => a.source === 'Lobsters').length).toBe(5)
  })

  it('결과에 중복이 없다', () => {
    const many = Array.from({length: 200}, () => article())
    const picked = shortlist(many)
    expect(new Set(picked.map((a) => a.url)).size).toBe(picked.length)
  })
})
