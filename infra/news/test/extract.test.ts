import {describe, expect, it} from 'vitest'

import {extractFromHtml} from '../src/extract'

const ARTICLE_HTML = `<!doctype html><html><head><title>제목</title></head><body>
<nav>메뉴 링크 모음</nav>
<article><h1>제목</h1>
<p>${'본문 문단입니다. '.repeat(60)}</p>
<p>${'두 번째 문단입니다. '.repeat(60)}</p></article>
<footer>푸터</footer></body></html>`

describe('extractFromHtml', () => {
  it('본문 텍스트를 뽑는다', () => {
    const text = extractFromHtml(ARTICLE_HTML, 'https://a.com/1')
    expect(text).toContain('본문 문단입니다')
    expect(text!.length).toBeGreaterThan(500)
  })

  it('본문이 짧으면 null을 준다', () => {
    expect(
      extractFromHtml(
        '<html><body><p>짧음</p></body></html>',
        'https://a.com/1',
      ),
    ).toBeNull()
  })

  it('상한 12000자를 넘겨 자른다', () => {
    const long = `<html><body><article><p>${'가나다라마바사 '.repeat(3000)}</p></article></body></html>`
    const text = extractFromHtml(long, 'https://a.com/1')
    expect(text!.length).toBeLessThanOrEqual(12000)
  })

  it('keepLinks면 링크를 [텍스트](URL)로 남긴다', () => {
    const html = `<html><body><article>
<p><a href="https://github.com/moment/moment/releases/tag/2.31.0">Moment.js 2.31.0</a> ${'보안 패치입니다. '.repeat(60)}</p>
<p><a href="/issues/641">상대 경로</a></p></article></body></html>`
    const text = extractFromHtml(
      html,
      'https://nodeweekly.com/issues/641',
      true,
    )
    expect(text).toContain(
      '[Moment.js 2.31.0](https://github.com/moment/moment/releases/tag/2.31.0)',
    )
    expect(text).toContain('[상대 경로](https://nodeweekly.com/issues/641)')
    expect(
      extractFromHtml(html, 'https://nodeweekly.com/issues/641'),
    ).not.toContain('](')
  })

  it('깨진 입력에 예외를 던지지 않는다', () => {
    expect(() => extractFromHtml('', 'https://a.com/1')).not.toThrow()
  })
})
