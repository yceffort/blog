// Keep download caches separate from opportunistic browsing caches. Only the
// download manager writes these caches; merely visiting a deck never saves it.
const META_CACHE = 'research-offline-meta-v1'
const RUNTIME_KEY = '/__research_offline_runtime__'
const RUNTIME_PREFIX = 'research-runtime-v1-'
const DECK_PREFIX = 'research-deck-v1-'

self.addEventListener('message', (event) => {
  if (
    event.data?.type !== 'research-cleanup' ||
    !Array.isArray(event.data.keep)
  )
    return
  event.waitUntil(
    (async () => {
      try {
        const clients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        // An open viewer may still be showing a superseded revision.
        if (
          clients.some((client) => {
            const url = new URL(client.url)
            return url.pathname === '/offline' && url.searchParams.has('deck')
          })
        )
          return
        const keep = new Set(event.data.keep)
        for (const name of await caches.keys()) {
          if (name.startsWith(DECK_PREFIX) && !keep.has(name))
            await caches.delete(name)
        }
      } finally {
        event.ports[0]?.postMessage('done')
      }
    })(),
  )
})

self.addEventListener('activate', (event) => {
  // Do not skipWaiting or delete old caches: a presentation may still be open.
  event.waitUntil(self.clients.claim())
})

async function savedShell() {
  const metadata = await (await caches.open(META_CACHE)).match(RUNTIME_KEY)
  if (!metadata) return undefined
  const {cacheName, shell} = await metadata.json()
  return (await caches.open(cacheName)).match(shell)
}

async function savedAsset(request) {
  const url = new URL(request.url)
  // Deployment query parameters do not change content-hashed Next assets.
  const key =
    url.origin === self.location.origin &&
    url.pathname.startsWith('/_next/static/')
      ? `${url.origin}${url.pathname}`
      : request.url
  const localAsset =
    url.origin === self.location.origin &&
    url.pathname.match(/^\/offline-assets\/([a-f0-9-]+)\/\d+$/)
  if (localAsset)
    return (await caches.open(`${DECK_PREFIX}${localAsset[1]}`)).match(key)
  const names = (await caches.keys()).filter((name) =>
    name.startsWith(RUNTIME_PREFIX),
  )
  for (const name of names.toReversed()) {
    const response = await (await caches.open(name)).match(key)
    if (response) return response
  }
  return undefined
}

async function navigate(request) {
  const url = new URL(request.url)
  if (url.pathname === '/offline') {
    const shell = await savedShell()
    if (shell) return shell
  }
  try {
    if (!self.navigator.onLine) throw new Error('offline')
    // A stale browser HTTP cache must not bypass the saved viewer on a cold
    // offline launch: it may reference scripts from an unrelated deployment.
    return await fetch(request, {cache: 'no-store'})
  } catch {
    const shell = await savedShell()
    if (!shell)
      return new Response(
        '오프라인 자료가 없습니다. 연결 후 자료를 저장해 주세요.',
        {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}},
      )
    const match = url.pathname.match(/^\/slides\/([^/]+)(\/presenter)?\/?$/)
    const target = new URL('/offline', url)
    if (match) {
      target.searchParams.set('deck', decodeURIComponent(match[1]))
      if (match[2]) target.searchParams.set('mode', 'presenter')
    }
    return Response.redirect(target.href, 302)
  }
}

self.addEventListener('fetch', (event) => {
  const {request} = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (!['http:', 'https:'].includes(url.protocol)) return
  if (url.origin === self.location.origin && request.mode === 'navigate') {
    event.respondWith(navigate(request))
    return
  }
  // Download requests must bypass existing versions when updating a deck.
  if (request.cache === 'no-store') return
  if (
    url.origin === self.location.origin &&
    (request.headers.get('rsc') === '1' || url.searchParams.has('_rsc'))
  ) {
    event.respondWith(
      fetch(request).catch(() => new Response('', {status: 503})),
    )
    return
  }
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    request.destination === 'audio' ||
    request.destination === 'video' ||
    url.pathname.startsWith('/offline-assets/') ||
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(
      (async () => (await savedAsset(request)) ?? fetch(request))(),
    )
  }
})
