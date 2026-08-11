const CACHE_VERSION = 'v3'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const PAGES_CACHE = `pages-${CACHE_VERSION}`
const IMAGES_CACHE = `images-${CACHE_VERSION}`
const RSC_CACHE = `rsc-${CACHE_VERSION}`

const OFFLINE_URL = '/offline'
const PRECACHE_URLS = [OFFLINE_URL, '/']
const ALL_CACHES = [STATIC_CACHE, PAGES_CACHE, IMAGES_CACHE, RSC_CACHE]

// 배포마다 ?dpl= 쿼리가 바뀌어 엔트리가 계속 쌓이므로 캐시별 상한을 두고
// 오래된 것부터 정리한다 (Cache API의 keys()는 삽입 순서를 보장한다)
const MAX_ENTRIES = {
  [STATIC_CACHE]: 500,
  [PAGES_CACHE]: 200,
  [IMAGES_CACHE]: 300,
  [RSC_CACHE]: 300,
}

const FONT_HOSTS = ['fonts.gstatic.com', 'cdn.jsdelivr.net']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !ALL_CACHES.includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/')
}

function isFontRequest(url) {
  return /\.woff2?$/.test(url.pathname)
}

function isImageRequest(url) {
  return (
    url.pathname === '/_next/image' ||
    /\.(?:png|jpe?g|gif|webp|avif|svg|ico)$/.test(url.pathname)
  )
}

// App Router의 소프트 내비게이션/프리페치는 ?_rsc= 쿼리가 붙은 fetch로 나간다
function isRSCRequest(request, url) {
  return url.searchParams.has('_rsc') || request.headers.get('rsc') === '1'
}

function isPrefetchRequest(request) {
  return (
    request.headers.has('next-router-prefetch') ||
    request.headers.has('next-router-segment-prefetch')
  )
}

async function putWithTrim(cacheName, request, response) {
  const cache = await caches.open(cacheName)
  await cache.put(request, response)
  const max = MAX_ENTRIES[cacheName]
  const keys = await cache.keys()
  if (max && keys.length > max) {
    await Promise.all(
      keys.slice(0, keys.length - max).map((key) => cache.delete(key)),
    )
  }
}

async function cacheFirst(event, cacheName) {
  const cached = await caches.match(event.request)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(event.request)
    if (response.ok) {
      event.waitUntil(putWithTrim(cacheName, event.request, response.clone()))
    }
    return response
  } catch {
    return new Response('', {status: 408})
  }
}

async function networkFirst(event, cacheName) {
  const {request} = event
  try {
    const response = await fetch(request)
    if (response.ok) {
      event.waitUntil(putWithTrim(cacheName, request, response.clone()))
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }

    if (request.mode === 'navigate') {
      const offline = await caches.match(OFFLINE_URL)
      if (offline) {
        return offline
      }
    }
    return new Response('', {status: 408})
  }
}

// 실제 내비게이션(프리페치 제외)이 일어난 페이지는 HTML도 백그라운드로
// 저장해서, 소프트 내비게이션으로만 방문한 글도 오프라인 새로고침·직접
// 진입이 가능하게 한다
async function savePageHTML(request, clientId) {
  const url = new URL(request.url)
  url.searchParams.delete('_rsc')
  try {
    const cache = await caches.open(PAGES_CACHE)
    const alreadySaved = await cache.match(url.href)
    const response = await fetch(url.href)
    if (!response.ok) {
      return
    }
    await putWithTrim(PAGES_CACHE, url.href, response)

    // 처음 저장된 페이지만 클라이언트에 알린다 (토스트 표시용)
    if (!alreadySaved && clientId) {
      const client = await self.clients.get(clientId)
      client?.postMessage({type: 'page-saved', url: url.pathname})
    }
  } catch {
    // 오프라인이면 저장을 생략한다
  }
}

// 오프라인에서 캐시에 없는 RSC 요청에 503을 돌려주면 Next.js 라우터가
// MPA 내비게이션으로 폴백하고, 그 문서 요청은 networkFirst가
// 캐시된 HTML 또는 오프라인 페이지로 응답한다
async function handleRSC(event) {
  const {request} = event
  // 프리페치는 캐시하지 않는다: 실제로 방문한 페이지만 저장한다
  const isVisit = !isPrefetchRequest(request)
  if (isVisit) {
    event.waitUntil(savePageHTML(request, event.clientId))
  }

  try {
    const response = await fetch(request)
    if (isVisit && response.ok) {
      event.waitUntil(putWithTrim(RSC_CACHE, request, response.clone()))
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }
    return new Response('', {status: 503})
  }
}

self.addEventListener('fetch', (event) => {
  const {request} = event

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return
  }

  if (url.origin !== self.location.origin) {
    // KaTeX(cdn.jsdelivr.net)·구글 폰트만 캐시하고 나머지 외부 요청은 넘긴다
    if (FONT_HOSTS.includes(url.hostname)) {
      event.respondWith(cacheFirst(event, STATIC_CACHE))
    }
    return
  }

  if (url.pathname.startsWith('/api/')) {
    return
  }

  // Content-hashed static assets and fonts: cache forever
  if (isStaticAsset(url) || isFontRequest(url)) {
    event.respondWith(cacheFirst(event, STATIC_CACHE))
    return
  }

  // Page navigations: network-first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(event, PAGES_CACHE))
    return
  }

  if (isRSCRequest(request, url)) {
    event.respondWith(handleRSC(event))
    return
  }

  // Images (including the /_next/image optimizer): cache-first
  if (isImageRequest(url)) {
    event.respondWith(cacheFirst(event, IMAGES_CACHE))
    return
  }

  // Other same-origin _next data: network-first
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(networkFirst(event, PAGES_CACHE))
  }
})
