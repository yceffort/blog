import {describe, expect, it} from 'vitest'

import {
  filterUnseen,
  pruneSeen,
  recordSeen,
  seenAsOf,
  type SeenStore,
} from '../src/seen'
import type {Article} from '../src/types'

function article(url: string): Article {
  return {
    title: 't',
    url,
    description: '',
    source: 's',
    sourceKind: 'rss',
    publishedAt: '',
  }
}

const NOW = new Date('2026-08-30T00:00:00Z')

describe('filterUnseen', () => {
  it('이미 본 URL을 걸러낸다', () => {
    const seen: SeenStore = {'https://a.com/1': '2026-08-29T00:00:00Z'}
    const out = filterUnseen(
      [article('https://a.com/1'), article('https://a.com/2')],
      seen,
    )
    expect(out.map((a) => a.url)).toEqual(['https://a.com/2'])
  })

  it('정규화 후 같은 URL도 걸러낸다', () => {
    const seen: SeenStore = {'https://a.com/1': '2026-08-29T00:00:00Z'}
    expect(
      filterUnseen([article('http://www.a.com/1/?utm_source=rss')], seen),
    ).toEqual([])
  })

  it('같은 실행 안의 중복도 하나만 남긴다', () => {
    expect(
      filterUnseen(
        [article('https://a.com/1'), article('https://a.com/1/')],
        {},
      ),
    ).toHaveLength(1)
  })
})

describe('recordSeen', () => {
  it('정규화한 키로 기록한다', () => {
    const seen = recordSeen({}, ['http://WWW.a.com/1/'], NOW)
    expect(seen['https://a.com/1']).toBe(NOW.toISOString())
  })

  it('기존 항목을 보존한다', () => {
    const seen = recordSeen(
      {'https://old.com/a': '2026-08-01T00:00:00Z'},
      ['https://new.com/b'],
      NOW,
    )
    expect(Object.keys(seen).sort()).toEqual([
      'https://new.com/b',
      'https://old.com/a',
    ])
    expect(seen['https://old.com/a']).toBe('2026-08-01T00:00:00Z')
  })
})

describe('pruneSeen', () => {
  it('60일보다 오래된 항목을 지운다', () => {
    const seen: SeenStore = {
      'https://old.com': '2026-06-01T00:00:00Z',
      'https://new.com': '2026-08-29T00:00:00Z',
    }
    expect(Object.keys(pruneSeen(seen, NOW))).toEqual(['https://new.com'])
  })

  it('날짜가 깨진 항목은 지운다', () => {
    expect(pruneSeen({'https://x.com': 'garbage'}, NOW)).toEqual({})
  })
})

describe('seenAsOf', () => {
  it('기준 시각과 같은 시각에 기록된 URL도 뺀다', () => {
    const seen: SeenStore = {'https://a.com/1': '2026-08-30T00:00:00Z'}
    expect(seenAsOf(seen, NOW)).toEqual({})
  })

  it('기준 시각 뒤에 기록된 URL을 뺀다', () => {
    const seen: SeenStore = {
      'https://a.com/1': '2026-08-29T23:59:59Z',
      'https://a.com/2': '2026-08-30T00:00:01Z',
    }
    expect(Object.keys(seenAsOf(seen, NOW))).toEqual(['https://a.com/1'])
  })
})
