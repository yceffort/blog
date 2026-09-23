import type {SavedDeck} from './types'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('research-offline', 1)
    request.addEventListener('upgradeneeded', () => {
      request.result.createObjectStore('decks', {keyPath: 'slug'})
    })
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => reject(request.error))
  })
}

async function transaction<T>(
  store: 'decks',
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode)
    const request = run(tx.objectStore(store))
    tx.addEventListener('complete', () => {
      db.close()
      resolve(request.result)
    })
    const onError = () => {
      db.close()
      reject(tx.error ?? new Error('저장소를 열 수 없습니다.'))
    }
    tx.addEventListener('abort', onError)
    tx.addEventListener('error', onError)
  })
}

export function getSavedDeck(slug: string): Promise<SavedDeck | undefined> {
  return transaction('decks', 'readonly', (store) => store.get(slug))
}

export function getSavedDecks(): Promise<SavedDeck[]> {
  return transaction('decks', 'readonly', (store) => store.getAll())
}

export function putSavedDeck(deck: SavedDeck) {
  return transaction('decks', 'readwrite', (store) => store.put(deck))
}

export function removeSavedDeck(slug: string) {
  return transaction('decks', 'readwrite', (store) => store.delete(slug))
}
