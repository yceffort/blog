import {describe, expect, it} from 'vitest'

import {normalizeUrl} from '../src/normalize'

describe('normalizeUrl', () => {
  it('utm 계열 쿼리를 제거한다', () => {
    expect(normalizeUrl('https://a.com/p?utm_source=rss&utm_medium=feed')).toBe(
      'https://a.com/p',
    )
  })

  it('의미 있는 쿼리는 보존한다', () => {
    expect(normalizeUrl('https://a.com/p?id=3&utm_source=rss')).toBe(
      'https://a.com/p?id=3',
    )
  })

  it('트레일링 슬래시를 제거한다', () => {
    expect(normalizeUrl('https://a.com/p/')).toBe('https://a.com/p')
  })

  it('루트 경로의 슬래시는 남긴다', () => {
    expect(normalizeUrl('https://a.com/')).toBe('https://a.com/')
  })

  it('호스트를 소문자로 만들고 www를 제거한다', () => {
    expect(normalizeUrl('https://WWW.A.com/P')).toBe('https://a.com/P')
  })

  it('프래그먼트를 제거한다', () => {
    expect(normalizeUrl('https://a.com/p#section')).toBe('https://a.com/p')
  })

  it('http를 https로 통일한다', () => {
    expect(normalizeUrl('http://a.com/p')).toBe('https://a.com/p')
  })

  it('파싱 불가능한 입력은 원문을 그대로 돌려준다', () => {
    expect(normalizeUrl('not a url')).toBe('not a url')
  })
})
