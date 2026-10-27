import {describe, expect, it} from 'vitest'

import {parseTrendingHtml} from '../src/sources/trending'

const HTML = `<html><body>
<article class="Box-row">
  <h2 class="h3 lh-condensed"><a href="/tt-a1i/archify" class="Link"><span>tt-a1i /</span>archify</a></h2>
  <p class="col-9 color-fg-muted my-1 tmp-pr-4">   빠른   아카이브   도구  </p>
</article>
<article class="Box-row">
  <h2 class="h3 lh-condensed"><a href="/facebook/react" class="Link">react</a></h2>
</article>
<article class="Box-row">
  <h2 class="h3 lh-condensed"><a href="/topics/javascript" class="Link">토픽 링크</a></h2>
</article>
</body></html>`

describe('parseTrendingHtml', () => {
  it('저장소 링크를 뽑는다', () => {
    const items = parseTrendingHtml(HTML, 'javascript')
    expect(items[0]!.url).toBe('https://github.com/tt-a1i/archify')
    expect(items[0]!.title).toBe('tt-a1i/archify (GitHub Trending javascript)')
  })

  it('설명의 공백을 정리한다', () => {
    expect(parseTrendingHtml(HTML, 'javascript')[0]!.description).toBe(
      '빠른 아카이브 도구',
    )
  })

  it('설명이 없어도 빈 문자열로 넘어간다', () => {
    expect(parseTrendingHtml(HTML, 'javascript')[1]!.description).toBe('')
  })

  it('owner/repo 형태가 아닌 링크는 버린다', () => {
    const urls = parseTrendingHtml(HTML, 'javascript').map((a) => a.url)
    expect(urls).not.toContain('https://github.com/topics/javascript')
    expect(urls).toHaveLength(2)
  })

  it('구조가 없는 HTML에는 빈 배열을 준다', () => {
    expect(
      parseTrendingHtml('<html><body><p>없음</p></body></html>', 'rust'),
    ).toEqual([])
  })
})
