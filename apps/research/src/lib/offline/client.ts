'use client'

import {collectDeckAssets, rewriteDeckAssets} from './assets'
import {
  getSavedDeck,
  getSavedDecks,
  putSavedDeck,
  removeSavedDeck,
} from './database'
import {removePosition} from './positions'
import type {
  DownloadProgress,
  OfflineDeck,
  RuntimeManifest,
  SavedDeck,
} from './types'

const META_CACHE = 'research-offline-meta-v1'
const RUNTIME_KEY = '/__research_offline_runtime__'
const CHANGE_EVENT = 'research:offline-change'
const listeners = new Set<() => void>()
interface OfflineState {
  ready: boolean
  supported: boolean
  decks: SavedDeck[]
  progress: Record<string, DownloadProgress | undefined>
  errors: Record<string, string | undefined>
  notice?: string
  checkingUpdates: boolean
  lastCheckedAt?: number
  automaticUpdateError?: string
}
const initialState: OfflineState = {
  ready: false,
  supported: false,
  decks: [],
  progress: {},
  errors: {},
  checkingUpdates: false,
}
let state = initialState
let registration: Promise<ServiceWorkerRegistration> | undefined
let refresh: Promise<void> | undefined
let localQueue: Promise<unknown> = Promise.resolve()

function publish(update: Partial<OfflineState>) {
  state = {...state, ...update}
  for (const listener of listeners) listener()
}

export const getOfflineState = () => state
export const getServerOfflineState = () => initialState
export function dismissOfflineNotice() {
  publish({notice: undefined})
}
export function subscribeOffline(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function supportsOffline() {
  return (
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'caches' in window &&
    'indexedDB' in window
  )
}

export async function refreshOfflineState() {
  if (refresh) return refresh
  refresh = (async () => {
    const supported = supportsOffline()
    try {
      const decks = supported ? await getSavedDecks() : []
      // A record alone is not evidence that its asset cache still exists.
      const names = new Set(supported ? await caches.keys() : [])
      const available = decks.filter((deck) => names.has(deck.assetCache))
      publish({
        ready: true,
        supported,
        decks: available.toSorted((a, b) => b.savedAt - a.savedAt),
      })
    } catch {
      publish({ready: true, supported: false, decks: []})
    }
  })().finally(() => {
    refresh = undefined
  })
  return refresh
}

export function registerOfflineWorker() {
  if (!registration) {
    registration = navigator.serviceWorker
      .register('/sw.js', {scope: '/', updateViaCache: 'none'})
      .catch((error: unknown) => {
        registration = undefined
        throw error
      })
  }
  return registration
}

async function ensureController() {
  await registerOfflineWorker()
  if (navigator.serviceWorker.controller) return
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', onChange)
      reject(
        new Error('오프라인 준비가 지연되고 있습니다. 다시 시도해 주세요.'),
      )
    }, 15000)
    function onChange() {
      if (!navigator.serviceWorker.controller) return
      clearTimeout(timer)
      navigator.serviceWorker.removeEventListener('controllerchange', onChange)
      resolve()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onChange)
    onChange()
  })
}

// Serialize save/update/delete across tabs so shared runtime publication and
// replacement of the same deck cannot race. The queue covers older browsers.
function withDownloadLock<T>(run: () => Promise<T>): Promise<T> {
  if (navigator.locks)
    return navigator.locks.request('research-offline-downloads', run)
  const pending = localQueue.then(run, run)
  localQueue = pending.catch(() => {})
  return pending
}

async function digest(buffer: ArrayBuffer) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', buffer))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function fetchFile(url: string, signal: AbortSignal, revision?: string) {
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
    credentials: 'same-origin',
    headers: revision ? {'If-None-Match': `"${revision}"`} : undefined,
  })
  if (revision && response.status === 304) return response
  if (!response.ok || response.type === 'opaque') {
    throw new Error(
      `자료를 내려받지 못했습니다 (${response.status}). 다시 시도해 주세요.`,
    )
  }
  return response
}

async function parallel<T>(items: T[], task: (item: T) => Promise<void>) {
  let index = 0
  // Wait for all started workers before removing a failed staging cache.
  const results = await Promise.allSettled(
    Array.from({length: Math.min(4, items.length)}, async () => {
      while (index < items.length) {
        const item = items[index++]
        await task(item)
      }
    }),
  )
  for (const result of results)
    if (result.status === 'rejected') throw result.reason
}

async function fetchRuntimeManifest(signal: AbortSignal) {
  const manifestResponse = await fetchFile('/offline-runtime.json', signal)
  const manifest = (await manifestResponse.json()) as RuntimeManifest
  if (
    !/^[a-f0-9]+$/.test(manifest.revision) ||
    !manifest.assets?.length ||
    manifest.shell !== '/offline-shell.html'
  ) {
    throw new Error(
      '오프라인 뷰어를 준비할 수 없습니다. 페이지를 새로고침해 주세요.',
    )
  }
  return manifest
}

async function ensureRuntime(
  onProgress: (value: DownloadProgress) => void,
  signal: AbortSignal,
  manifest?: RuntimeManifest,
) {
  manifest ??= await fetchRuntimeManifest(signal)
  const cacheName = `research-runtime-v1-${manifest.revision}`
  const cache = await caches.open(cacheName)
  let completed = 0
  const report = () =>
    onProgress({
      label: '공통 뷰어 준비',
      completed,
      total: manifest.assets.length,
    })
  report()
  await parallel(manifest.assets, async ({url, sha256}) => {
    const parsed = new URL(url, location.origin)
    if (parsed.origin !== location.origin)
      throw new Error('잘못된 뷰어 파일 주소입니다.')
    if (!(await cache.match(url))) {
      const response = await fetchFile(url, signal)
      if ((await digest(await response.clone().arrayBuffer())) !== sha256) {
        throw new Error(
          '사이트가 업데이트되었습니다. 다운로드를 다시 시도해 주세요.',
        )
      }
      await cache.put(url, response)
    }
    completed++
    report()
  })
  // Publish the shell only after every dependency, including lazy JS, is ready.
  const metadata = await caches.open(META_CACHE)
  await metadata.put(
    RUNTIME_KEY,
    Response.json({cacheName, shell: manifest.shell}),
  )
  return manifest.revision
}

function broadcastChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(CHANGE_EVENT)
    channel.postMessage('changed')
    channel.close()
  }
}

const controllers = new Map<string, AbortController>()

export function cancelDownload(slug: string) {
  controllers.get(slug)?.abort()
}

export async function downloadDeck(
  slug: string,
  {
    automatic = false,
    manifest,
  }: {automatic?: boolean; manifest?: RuntimeManifest} = {},
) {
  if (controllers.has(slug)) return false
  const controller = new AbortController()
  controllers.set(slug, controller)
  const progress = (value: DownloadProgress) =>
    publish({progress: {...state.progress, [slug]: {...value, automatic}}})
  if (!automatic) {
    publish({errors: {...state.errors, [slug]: undefined}, notice: undefined})
    progress({label: '다운로드 대기', completed: 0, total: 0})
  }
  let updated = false
  try {
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(
        '오프라인 저장은 미리보기 서버에서 사용할 수 있습니다. pnpm preview:research 실행 후 http://localhost:3002 에서 자료를 저장해 주세요.',
      )
    }
    if (!supportsOffline())
      throw new Error('이 브라우저에서는 오프라인 저장을 사용할 수 없습니다.')
    await withDownloadLock(async () => {
      const {signal} = controller
      signal.throwIfAborted()
      // Re-read under the shared lock: another tab may have updated or deleted it.
      const saved = automatic ? await getSavedDeck(slug) : undefined
      if (automatic && !saved) return
      const currentRuntime =
        manifest ?? (automatic ? await fetchRuntimeManifest(signal) : undefined)
      let complete = false
      if (
        saved &&
        currentRuntime?.revision === saved.runtimeRevision &&
        (await caches.has(saved.assetCache))
      ) {
        const cache = await caches.open(saved.assetCache)
        complete = (
          await Promise.all(saved.assets.map((url) => cache.match(url)))
        ).every(Boolean)
      }
      const response = await fetchFile(
        `/api/slides/${encodeURIComponent(slug)}/offline`,
        signal,
        complete ? saved?.sourceRevision : undefined,
      )
      if (response.status === 304) {
        publish({errors: {...state.errors, [slug]: undefined}})
        return
      }
      const deck = (await response.json()) as OfflineDeck
      if (
        deck.schemaVersion !== 1 ||
        deck.slug !== slug ||
        !Array.isArray(deck.html) ||
        !deck.html.length
      ) {
        throw new Error(
          '슬라이드 형식을 읽을 수 없습니다. 페이지를 새로고침해 주세요.',
        )
      }
      const encoded = new TextEncoder().encode(JSON.stringify(deck))
      const sourceRevision = await digest(encoded.buffer)
      if (automatic && complete && sourceRevision === saved?.sourceRevision) {
        publish({errors: {...state.errors, [slug]: undefined}})
        return
      }
      await ensureController()
      publish({errors: {...state.errors, [slug]: undefined}})
      progress({
        label: automatic ? '새 버전 자동 저장' : '슬라이드 준비',
        completed: 0,
        total: 0,
      })
      const runtimeRevision = await ensureRuntime(
        progress,
        signal,
        currentRuntime,
      )
      const assets = collectDeckAssets(deck, location.origin)
      const assetId = crypto.randomUUID()
      const assetCache = `research-deck-v1-${assetId}`
      const localUrls = new Map(
        assets.map((url, index) => [
          url,
          `${location.origin}/offline-assets/${assetId}/${index}`,
        ]),
      )
      const cache = await caches.open(assetCache)
      const hashes = new Map<string, string>()
      let bytes = encoded.byteLength
      let completed = 0
      const report = () =>
        progress({label: '이미지·폰트 저장', completed, total: assets.length})
      report()
      let committed = false
      try {
        await parallel(assets, async (url) => {
          const asset = await fetchFile(url, signal)
          const body = await asset.clone().arrayBuffer()
          hashes.set(url, await digest(body))
          bytes += body.byteLength
          await cache.put(
            localUrls.get(url)!,
            new Response(body, {
              headers: {
                'Content-Type':
                  asset.headers.get('Content-Type') ??
                  'application/octet-stream',
              },
            }),
          )
          completed++
          report()
        })
        signal.throwIfAborted()
        // The revision includes the bytes of images/fonts, not just their URLs.
        const revision = await digest(
          new TextEncoder().encode(
            JSON.stringify([deck, assets.map((url) => hashes.get(url))]),
          ).buffer,
        )
        await putSavedDeck({
          ...rewriteDeckAssets(deck, location.origin, localUrls),
          revision,
          sourceRevision,
          runtimeRevision,
          savedAt: Date.now(),
          bytes,
          assetCache,
          assets: [...localUrls.values()],
        })
        committed = true
        updated = true
        if (!automatic) publish({notice: `저장 완료: ${deck.title}`})
        // Superseded caches are collected once no offline presentation is open.
      } finally {
        if (!committed) await caches.delete(assetCache)
      }
      // Denial does not make a successfully completed download fail.
      void navigator.storage?.persist?.().catch(() => {})
    })
    if (updated) {
      await cleanUnusedDeckCaches()
      broadcastChange()
    }
  } catch (error) {
    const message = controller.signal.aborted
      ? '다운로드를 취소했습니다.'
      : error instanceof DOMException && error.name === 'QuotaExceededError'
        ? '저장 공간이 부족합니다. 보관함에서 자료를 삭제한 뒤 다시 시도해 주세요.'
        : error instanceof TypeError
          ? '연결 또는 외부 이미지·폰트 다운로드에 실패했습니다. 기존 저장본은 유지됩니다.'
          : error instanceof Error
            ? error.message
            : '저장하지 못했습니다. 다시 시도해 주세요.'
    publish({
      errors: {
        ...state.errors,
        [slug]: automatic
          ? `자동 업데이트 실패: ${message} 기존 저장본은 유지됩니다.`
          : message,
      },
      ...(!automatic && {notice: message}),
    })
  } finally {
    controllers.delete(slug)
    publish({progress: {...state.progress, [slug]: undefined}})
    if (!automatic || updated) await refreshOfflineState()
  }
  return updated
}

let automaticCheck: Promise<void> | undefined

export function checkOfflineUpdates(): Promise<void> {
  if (automaticCheck) return automaticCheck
  if (
    process.env.NODE_ENV !== 'production' ||
    !supportsOffline() ||
    !navigator.onLine
  ) {
    return Promise.resolve()
  }
  const check = async () => {
    const decks = await getSavedDecks()
    if (!decks.length) return
    publish({checkingUpdates: true, automaticUpdateError: undefined})
    try {
      const signal = new AbortController().signal
      const manifest = await fetchRuntimeManifest(signal)
      // Refresh the shared viewer as well, even if every deck returns 304.
      await withDownloadLock(() => ensureRuntime(() => {}, signal, manifest))
      for (const deck of decks) {
        if (!navigator.onLine) break
        await downloadDeck(deck.slug, {automatic: true, manifest})
      }
      publish({lastCheckedAt: Date.now()})
    } catch {
      publish({
        automaticUpdateError:
          '업데이트를 확인하지 못했습니다. 기존 저장본을 사용할 수 있으며 연결되면 다시 확인합니다.',
      })
    } finally {
      publish({checkingUpdates: false})
    }
  }
  // Only one tab scans at a time. Per-deck writes also share the manual-download lock.
  automaticCheck = (
    navigator.locks
      ? navigator.locks.request(
          'research-offline-update-check',
          {ifAvailable: true},
          (lock) => (lock ? check() : undefined),
        )
      : check()
  )
    .catch(() => {})
    .finally(() => {
      automaticCheck = undefined
    })
  return automaticCheck
}

export function watchOfflineUpdates() {
  if (process.env.NODE_ENV !== 'production') return () => {}
  let lastAttempt = 0
  const check = (force = false) => {
    if (!navigator.onLine || document.visibilityState !== 'visible') return
    if (!force && Date.now() - lastAttempt < 60000) return
    lastAttempt = Date.now()
    void checkOfflineUpdates()
  }
  const onFocus = () => check()
  const onOnline = () => check(true)
  const timer = window.setInterval(() => check(true), 5 * 60 * 1000)
  window.addEventListener('online', onOnline)
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onFocus)
  check(true)
  return () => {
    clearInterval(timer)
    window.removeEventListener('online', onOnline)
    window.removeEventListener('focus', onFocus)
    document.removeEventListener('visibilitychange', onFocus)
  }
}

export async function deleteDeck(slug: string) {
  await withDownloadLock(async () => {
    const deck = await getSavedDeck(slug)
    await removeSavedDeck(slug)
    removePosition(slug)
    if (deck) await caches.delete(deck.assetCache)
  })
  await refreshOfflineState()
  await cleanUnusedDeckCaches()
  broadcastChange()
}

export async function cleanUnusedDeckCaches() {
  const worker = navigator.serviceWorker?.controller
  if (!worker) return
  await withDownloadLock(async () => {
    const keep = (await getSavedDecks()).map((deck) => deck.assetCache)
    await new Promise<void>((resolve) => {
      const channel = new MessageChannel()
      const done = () => {
        clearTimeout(timer)
        channel.port1.close()
        resolve()
      }
      const timer = window.setTimeout(done, 3000)
      channel.port1.addEventListener('message', done, {once: true})
      channel.port1.start()
      worker.postMessage({type: 'research-cleanup', keep}, [channel.port2])
    })
  }).catch(() => {})
}

export function watchOfflineChanges() {
  const onChange = () => {
    void refreshOfflineState()
  }
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('focus', onChange)
  const channel =
    'BroadcastChannel' in window
      ? new BroadcastChannel(CHANGE_EVENT)
      : undefined
  channel?.addEventListener('message', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('focus', onChange)
    channel?.close()
  }
}

export function offlineHref(slug: string, presenter = false) {
  return `/offline?deck=${encodeURIComponent(slug)}${presenter ? '&mode=presenter' : ''}`
}

export function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
