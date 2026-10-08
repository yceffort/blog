import {DECK_PREFIX} from './cacheNames'
import {getSavedDeck} from './database'
import type {SavedDeck} from './types'

const SNAPSHOT_KEY = '/__research_offline_deck_snapshot__'
const CACHE_NAME = new RegExp(`^${DECK_PREFIX}[a-f0-9-]{36}$`)

export function putDeckSnapshot(cache: Cache, deck: SavedDeck) {
  return cache.put(SNAPSHOT_KEY, Response.json(deck))
}

// Downloads keep the exact rendered data beside their assets before committing.
// Old records need no database migration; their first opening pins the snapshot.
export async function getPresentationDeck(
  slug: string,
  snapshot: string | null,
): Promise<SavedDeck | undefined> {
  if (snapshot !== null) {
    if (!CACHE_NAME.test(snapshot) || !(await caches.has(snapshot))) {
      return undefined
    }
    const response = await (await caches.open(snapshot)).match(SNAPSHOT_KEY)
    if (!response) return undefined
    const deck = (await response.json()) as SavedDeck
    return deck.slug === slug && deck.assetCache === snapshot ? deck : undefined
  }

  const deck = await getSavedDeck(slug)
  if (!deck || !(await caches.has(deck.assetCache))) return undefined
  const cache = await caches.open(deck.assetCache)
  if (!(await cache.match(SNAPSHOT_KEY))) {
    await putDeckSnapshot(cache, deck)
  }
  return deck
}
