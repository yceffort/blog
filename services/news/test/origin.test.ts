import {describe, expect, it} from 'vitest'

import {deriveOrigin, withOrigin} from '../src/origin'
import type {Article} from '../src/types'

function article(over: Partial<Article> = {}): Article {
  return {
    title: 't',
    url: 'https://example.com/p',
    description: '',
    source: 'Hacker News',
    sourceKind: 'hn',
    publishedAt: '',
    ...over,
  }
}

describe('deriveOrigin', () => {
  it('Hacker News는 링크의 호스트를 출처로 쓴다', () => {
    expect(deriveOrigin(article({url: 'https://zackbartel.com/blog/x'}))).toBe(
      'zackbartel.com',
    )
  })

  it('Lobsters도 마찬가지다', () => {
    expect(
      deriveOrigin(
        article({
          source: 'Lobsters',
          sourceKind: 'rss',
          url: 'https://www.jacky.wtf/a',
        }),
      ),
    ).toBe('jacky.wtf')
  })

  it('www를 뗀다', () => {
    expect(deriveOrigin(article({url: 'https://www.theguardian.com/a'}))).toBe(
      'theguardian.com',
    )
  })

  it('일반 RSS 피드는 피드 이름을 그대로 쓴다', () => {
    expect(
      deriveOrigin(article({source: 'Jake Archibald', sourceKind: 'rss'})),
    ).toBe('Jake Archibald')
  })

  it('GitHub Trending은 github.com이다', () => {
    expect(
      deriveOrigin(
        article({source: 'GitHub Trending rust', sourceKind: 'trending'}),
      ),
    ).toBe('github.com')
  })

  it('URL이 깨졌으면 소스 이름으로 되돌아간다', () => {
    expect(deriveOrigin(article({url: 'not a url'}))).toBe('Hacker News')
  })
})

describe('withOrigin', () => {
  it('경유지를 via에 남긴다', () => {
    const out = withOrigin(article({url: 'https://zackbartel.com/x'}))
    expect(out.origin).toBe('zackbartel.com')
    expect(out.via).toBe('Hacker News')
  })

  it('경유하지 않은 글은 via가 null이다', () => {
    const out = withOrigin(
      article({source: 'Jake Archibald', sourceKind: 'rss'}),
    )
    expect(out.via).toBeNull()
  })
})
