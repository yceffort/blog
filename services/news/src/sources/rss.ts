import {XMLParser} from 'fast-xml-parser'

import {FETCH_TIMEOUT_MS, RSS_FEEDS, USER_AGENT} from '../config/sources'
import type {Article, FeedSource, FetchReport} from '../types'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
})

function stripHtml(html: unknown): string {
  if (typeof html !== 'string') return ''
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600)
}

function textOf(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && '#text' in value) {
    return String(value['#text'])
  }
  return ''
}

function atomLink(link: unknown): string {
  if (Array.isArray(link)) {
    const alternate = link.find(
      (l) => l?.['@_rel'] === 'alternate' || l?.['@_rel'] === undefined,
    )
    return String(alternate?.['@_href'] ?? link[0]?.['@_href'] ?? '')
  }
  if (link && typeof link === 'object' && '@_href' in link) {
    const href = (link as Record<string, unknown>)['@_href']
    return typeof href === 'string' ? href : ''
  }
  return typeof link === 'string' ? link : ''
}

export function parseFeed(xml: string, feedName: string): Article[] {
  let data: Record<string, any>
  try {
    data = parser.parse(xml)
  } catch {
    return []
  }

  const base = {source: feedName, sourceKind: 'rss' as const}

  const rssItems = data?.rss?.channel?.item ?? data?.['rdf:RDF']?.item
  if (rssItems) {
    const items = Array.isArray(rssItems) ? rssItems : [rssItems]
    return items
      .map((item) => ({
        ...base,
        title: textOf(item.title),
        url: typeof item.link === 'string' ? item.link : atomLink(item.link),
        description: stripHtml(item.description ?? item['content:encoded']),
        publishedAt: String(item.pubDate ?? item['dc:date'] ?? ''),
      }))
      .filter((a) => a.url && a.title)
  }

  const atomEntries = data?.feed?.entry
  if (atomEntries) {
    const entries = Array.isArray(atomEntries) ? atomEntries : [atomEntries]
    return entries
      .map((entry) => ({
        ...base,
        title: textOf(entry.title),
        url: atomLink(entry.link),
        description: stripHtml(textOf(entry.summary) || textOf(entry.content)),
        publishedAt: String(entry.published ?? entry.updated ?? ''),
      }))
      .filter((a) => a.url && a.title)
  }

  return []
}

async function fetchOne(
  feed: FeedSource,
): Promise<{articles: Article[]; report: FetchReport}> {
  try {
    const res = await fetch(feed.url, {
      headers: {'User-Agent': USER_AGENT},
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) {
      return {
        articles: [],
        report: {
          source: feed.name,
          ok: false,
          count: 0,
          error: `HTTP ${res.status}`,
        },
      }
    }
    const articles = parseFeed(await res.text(), feed.name)
    return {
      articles,
      report: {
        source: feed.name,
        ok: articles.length > 0,
        count: articles.length,
        error: articles.length === 0 ? '파싱 결과 0건' : undefined,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      articles: [],
      report: {source: feed.name, ok: false, count: 0, error: message},
    }
  }
}

export async function fetchAllRss(): Promise<{
  articles: Article[]
  reports: FetchReport[]
}> {
  const results = await Promise.all(RSS_FEEDS.map(fetchOne))
  return {
    articles: results.flatMap((r) => r.articles),
    reports: results.map((r) => r.report),
  }
}
