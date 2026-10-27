import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {dirname} from 'node:path'

import {SEEN_RETENTION_DAYS} from './config/sources'
import {normalizeUrl} from './normalize'
import type {Article} from './types'

export type SeenStore = Record<string, string>

export function filterUnseen(articles: Article[], seen: SeenStore): Article[] {
  const batch = new Set<string>()
  return articles.filter((a) => {
    const key = normalizeUrl(a.url)
    if (seen[key] || batch.has(key)) return false
    batch.add(key)
    return true
  })
}

export function recordSeen(
  seen: SeenStore,
  urls: string[],
  now: Date,
): SeenStore {
  const stamp = now.toISOString()
  const next = {...seen}
  for (const url of urls) next[normalizeUrl(url)] = stamp
  return next
}

export function pruneSeen(seen: SeenStore, now: Date): SeenStore {
  const cutoff = now.getTime() - SEEN_RETENTION_DAYS * 24 * 60 * 60 * 1000
  const next: SeenStore = {}
  for (const [url, stamp] of Object.entries(seen)) {
    const ts = new Date(stamp).getTime()
    if (!Number.isNaN(ts) && ts >= cutoff) next[url] = stamp
  }
  return next
}

export async function loadSeen(path: string): Promise<SeenStore> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as SeenStore
  } catch {
    return {}
  }
}

export async function saveSeen(path: string, seen: SeenStore): Promise<void> {
  await mkdir(dirname(path), {recursive: true})
  await writeFile(path, `${JSON.stringify(seen, null, 2)}\n`, 'utf8')
}
