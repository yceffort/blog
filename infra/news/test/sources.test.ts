import {describe, expect, it} from 'vitest'

import {RSS_FEEDS} from '../src/config/sources'

describe('RSS_FEEDS', () => {
  it('67개다', () => {
    expect(RSS_FEEDS).toHaveLength(67)
  })

  it('URL이 중복되지 않는다', () => {
    const urls = RSS_FEEDS.map((f) => f.url)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('이름이 중복되지 않는다', () => {
    const names = RSS_FEEDS.map((f) => f.name)
    expect(new Set(names).size).toBe(names.length)
  })
})
