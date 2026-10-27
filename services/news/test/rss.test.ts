import {describe, expect, it} from 'vitest'

import {parseFeed} from '../src/sources/rss'

const RSS_XML = `<?xml version="1.0"?>
<rss version="2.0"><channel>
<item><title>첫 글</title><link>https://a.com/1</link>
<description>&lt;p&gt;본문 &lt;b&gt;강조&lt;/b&gt;&lt;/p&gt;</description>
<pubDate>Mon, 25 Aug 2026 10:00:00 GMT</pubDate></item>
<item><title>둘째 글</title><link>https://a.com/2</link><description></description>
<pubDate>Tue, 26 Aug 2026 10:00:00 GMT</pubDate></item>
</channel></rss>`

const ATOM_XML = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<entry><title>Atom 글</title>
<link rel="alternate" href="https://b.com/1"/>
<link rel="edit" href="https://b.com/edit"/>
<summary>요약문</summary><published>2026-08-25T10:00:00Z</published></entry>
</feed>`

const SINGLE_ITEM_XML = `<?xml version="1.0"?>
<rss version="2.0"><channel>
<item><title>혼자</title><link>https://c.com/1</link><description>설명</description>
<pubDate>Mon, 25 Aug 2026 10:00:00 GMT</pubDate></item>
</channel></rss>`

describe('parseFeed', () => {
  it('RSS 2.0을 파싱한다', () => {
    const items = parseFeed(RSS_XML, 'Test')
    expect(items).toHaveLength(2)
    expect(items[0]!.title).toBe('첫 글')
    expect(items[0]!.url).toBe('https://a.com/1')
    expect(items[0]!.source).toBe('Test')
  })

  it('description의 HTML 태그를 벗긴다', () => {
    const items = parseFeed(RSS_XML, 'Test')
    expect(items[0]!.description).toBe('본문 강조')
  })

  it('Atom을 파싱하고 rel=alternate 링크를 고른다', () => {
    const items = parseFeed(ATOM_XML, 'Test')
    expect(items).toHaveLength(1)
    expect(items[0]!.url).toBe('https://b.com/1')
    expect(items[0]!.title).toBe('Atom 글')
  })

  it('항목이 하나뿐이어도 배열로 만든다', () => {
    expect(parseFeed(SINGLE_ITEM_XML, 'Test')).toHaveLength(1)
  })

  it('파싱 불가능한 입력에는 빈 배열을 준다', () => {
    expect(parseFeed('not xml at all', 'Test')).toEqual([])
  })

  it('url이 없는 항목은 버린다', () => {
    const xml = `<rss version="2.0"><channel><item><title>링크없음</title></item></channel></rss>`
    expect(parseFeed(xml, 'Test')).toEqual([])
  })
})
