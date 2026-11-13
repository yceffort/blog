import {describe, expect, it} from 'vitest'

import {filterRecent} from '../src/recent'
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

  it('기준 시각 뒤에 나온 글을 뺀다', () => {
    expect(
      filterRecent([article({publishedAt: '2026-08-30T12:00:01Z'})], NOW),
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
