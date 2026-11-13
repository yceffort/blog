import {JSDOM, VirtualConsole} from 'jsdom'

import {FETCH_TIMEOUT_MS, USER_AGENT} from '../config/sources'
import type {Article, FetchReport} from '../types'

// GitHub Trending은 공식 API가 없어 HTML을 읽는다. 구조가 바뀌면 0건이 되므로 리포트로 드러낸다.

const LANGUAGES = ['javascript', 'typescript', 'rust']
const PER_LANGUAGE = 3

// github.com/<이것들>/... 은 저장소가 아니라 GitHub 자체 페이지다.
const RESERVED_OWNERS = new Set([
  'topics',
  'collections',
  'trending',
  'explore',
  'sponsors',
  'marketplace',
  'features',
  'orgs',
  'settings',
  'notifications',
])

export function parseTrendingHtml(html: string, language: string): Article[] {
  const virtualConsole = new VirtualConsole()
  const {document} = new JSDOM(html, {virtualConsole}).window
  const now = new Date().toISOString()
  const articles: Article[] = []

  for (const row of document.querySelectorAll('article.Box-row')) {
    const href = row.querySelector('h2 a')?.getAttribute('href')
    if (!href) continue
    const repo = href.replace(/^\//, '').trim()
    if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) continue
    if (RESERVED_OWNERS.has(repo.split('/')[0]!)) continue

    const description =
      row.querySelector('p')?.textContent?.replace(/\s+/g, ' ').trim() ?? ''

    articles.push({
      title: `${repo} (GitHub Trending ${language})`,
      url: `https://github.com/${repo}`,
      description: description.slice(0, 400),
      source: `GitHub Trending ${language}`,
      sourceKind: 'trending',
      publishedAt: now,
    })
    if (articles.length >= PER_LANGUAGE) break
  }

  return articles
}

async function fetchLanguage(language: string): Promise<Article[]> {
  const res = await fetch(
    `https://github.com/trending/${language}?since=daily`,
    {
      headers: {'User-Agent': USER_AGENT},
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    },
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return parseTrendingHtml(await res.text(), language)
}

export async function fetchTrending(): Promise<{
  articles: Article[]
  reports: FetchReport[]
}> {
  const results = await Promise.allSettled(LANGUAGES.map(fetchLanguage))
  const articles: Article[] = []
  const reports: FetchReport[] = []

  results.forEach((result, index) => {
    const name = `GitHub Trending ${LANGUAGES[index]}`
    if (result.status === 'fulfilled') {
      articles.push(...result.value)
      reports.push({
        source: name,
        ok: result.value.length > 0,
        count: result.value.length,
        error: result.value.length === 0 ? 'HTML 구조 변경 의심' : undefined,
      })
    } else {
      const reason = result.reason
      reports.push({
        source: name,
        ok: false,
        count: 0,
        error: reason instanceof Error ? reason.message : String(reason),
      })
    }
  })

  return {articles, reports}
}
