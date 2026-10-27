import {Readability} from '@mozilla/readability'
import {JSDOM, VirtualConsole} from 'jsdom'

import {
  CONTENT_MAX_CHARS,
  FETCH_TIMEOUT_MS,
  NEWSLETTERS,
  USER_AGENT,
} from './config/sources'
import type {Article, Extracted} from './types'

// 이 단계가 큐레이션 품질을 결정한다. 제목만 보고 뽑던 기존 방식의 대체물이다.

const MIN_CONTENT_CHARS = 500

// 뉴스레터 호는 여러 글을 묶은 것이라 textContent만 남기면 각 글의 주소가 사라지고,
// 큐레이터는 호 주소에 링크를 걸 수밖에 없다. 링크를 [텍스트](URL)로 풀어 본문에 남긴다.
function inlineLinks(document: Document): void {
  for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const text = a.textContent?.replace(/\s+/g, ' ').trim()
    if (!text || !a.href.startsWith('http')) continue
    a.replaceWith(document.createTextNode(`[${text}](${a.href})`))
  }
}

export function extractFromHtml(
  html: string,
  url: string,
  keepLinks = false,
): string | null {
  try {
    const virtualConsole = new VirtualConsole()
    const dom = new JSDOM(html, {url, virtualConsole})
    if (keepLinks) inlineLinks(dom.window.document)
    const parsed = new Readability(dom.window.document).parse()
    const text = parsed?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    if (text.length < MIN_CONTENT_CHARS) return null
    return text.slice(0, CONTENT_MAX_CHARS)
  } catch {
    return null
  }
}

// Firecrawl은 폴백 전용이다. 키가 없으면 조용히 건너뛰고 파이프라인은 계속 돈다.
async function viaFirecrawl(url: string): Promise<string | null> {
  const key = process.env.FIRECRAWL_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({url, formats: ['markdown'], onlyMainContent: true}),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS * 2),
    })
    if (!res.ok) return null
    const body = (await res.json()) as {data?: {markdown?: string}}
    const text = body.data?.markdown?.trim() ?? ''
    return text.length >= MIN_CONTENT_CHARS
      ? text.slice(0, CONTENT_MAX_CHARS)
      : null
  } catch {
    return null
  }
}

async function extractOne(
  article: Article,
): Promise<Extracted | {reason: string}> {
  let html: string
  try {
    const res = await fetch(article.url, {
      headers: {'User-Agent': USER_AGENT},
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) {
      const fallback = await viaFirecrawl(article.url)
      if (fallback)
        return {...article, content: fallback, contentSource: 'firecrawl'}
      return {reason: `HTTP ${res.status}`}
    }
    html = await res.text()
  } catch (err) {
    const fallback = await viaFirecrawl(article.url)
    if (fallback)
      return {...article, content: fallback, contentSource: 'firecrawl'}
    return {reason: err instanceof Error ? err.message : String(err)}
  }

  const text = extractFromHtml(
    html,
    article.url,
    NEWSLETTERS.has(article.source),
  )
  if (text) return {...article, content: text, contentSource: 'readability'}

  const fallback = await viaFirecrawl(article.url)
  if (fallback)
    return {...article, content: fallback, contentSource: 'firecrawl'}
  return {reason: '본문 추출 실패'}
}

export async function extractAll(articles: Article[]): Promise<{
  candidates: Extracted[]
  dropped: {title: string; url: string; reason: string}[]
}> {
  const results = await Promise.all(articles.map(extractOne))
  const candidates: Extracted[] = []
  const dropped: {title: string; url: string; reason: string}[] = []

  results.forEach((result, index) => {
    const source = articles[index]!
    if ('content' in result) candidates.push(result)
    else
      dropped.push({
        title: source.title,
        url: source.url,
        reason: result.reason,
      })
  })

  return {candidates, dropped}
}
