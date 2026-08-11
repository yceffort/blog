const CACHE_VERSION = 'v4'
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
const SKIP_HOSTS = [
  'google-analytics.com',
  'analytics.google.com',
  'googletagmanager.com',
  'vercel-insights.com',
  'va.vercel-scripts.com',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) =>
        cache.addAll(PRECACHE_URLS).then(() => cache.match('/')),
      )
      // 페이지 로드 중에 SW가 설치되면 이미 로드된 이미지는 fetch 이벤트를
      // 거치지 않으므로, 프리캐시한 홈의 이미지를 여기서 직접 저장한다
      .then((home) => (home ? saveImagesFromHTML(home.clone()) : null))
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
    // 코드 생성 썸네일 (?v= 파라미터가 캐시 버스팅을 담당한다)
    url.pathname.startsWith('/api/og/') ||
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

// HTML의 img 태그에서 이미지 URL을 추출한다. 포스트 본문 이미지는 대부분
// 외부 도메인이므로 절대 URL도 포함한다. next/image의 srcset은 원본당
// 여러 너비를 포함하므로, 원본(url 파라미터)별로 1080에 가장 가까운 하나만 고른다
function extractImageUrls(html) {
  const found = new Set()
  const tagRe = /<img\b[^>]*>/g
  const attrRe = /(?:src|srcset)="([^"]+)"/g
  let tag
  while ((tag = tagRe.exec(html))) {
    let match
    while ((match = attrRe.exec(tag[0]))) {
      for (const candidate of match[1].split(',')) {
        const u = candidate.trim().split(' ')[0].replaceAll('&amp;', '&')
        if (
          u.startsWith('/_next/image?') ||
          u.startsWith('/api/og/') ||
          u.startsWith('https://') ||
          /^\/[^\s"]+\.(?:png|jpe?g|gif|webp|avif|svg)$/.test(u)
        ) {
          found.add(u)
        }
      }
    }
    attrRe.lastIndex = 0
  }

  const bySource = new Map()
  const plain = []
  for (const u of found) {
    if (!u.startsWith('/_next/image?')) {
      plain.push(u)
      continue
    }
    const params = new URLSearchParams(u.slice('/_next/image?'.length))
    const source = params.get('url')
    const width = Number(params.get('w')) || 0
    const current = bySource.get(source)
    if (!current || Math.abs(width - 1080) < Math.abs(current.width - 1080)) {
      bySource.set(source, {url: u, width})
    }
  }
  return [...plain, ...[...bySource.values()].map((v) => v.url)]
}

async function saveImagesFromHTML(response) {
  try {
    const html = await response.text()
    const urls = extractImageUrls(html).slice(0, 50)
    const cache = await caches.open(IMAGES_CACHE)
    await Promise.all(
      urls.map(async (url) => {
        try {
          if (await cache.match(url)) {
            return
          }
          // 외부 이미지는 no-cors로 가져와 opaque 응답을 그대로 저장한다
          const external = url.startsWith('https://')
          const imageResponse = await fetch(
            url,
            external ? {mode: 'no-cors'} : undefined,
          )
          if (imageResponse.ok || imageResponse.type === 'opaque') {
            await putWithTrim(IMAGES_CACHE, url, imageResponse)
          }
        } catch {
          // 개별 이미지 실패는 무시한다
        }
      }),
    )
  } catch {
    // 오프라인이거나 파싱에 실패하면 저장을 생략한다
  }
}

// 오프라인에서 srcset이 캐시에 없는 너비를 요청하면, 같은 원본의
// 캐시된 다른 변형이라도 찾아서 돌려준다
async function matchImageVariant(requestUrl) {
  const url = new URL(requestUrl)
  if (url.pathname !== '/_next/image') {
    return null
  }
  const source = url.searchParams.get('url')
  if (!source) {
    return null
  }
  const cache = await caches.open(IMAGES_CACHE)
  for (const request of await cache.keys()) {
    const cachedUrl = new URL(request.url)
    if (
      cachedUrl.pathname === '/_next/image' &&
      cachedUrl.searchParams.get('url') === source
    ) {
      return cache.match(request)
    }
  }
  return null
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
    await putWithTrim(PAGES_CACHE, url.href, response.clone())
    await saveImagesFromHTML(response)

    // 처음 저장된 페이지만 클라이언트에 알린다 (토스트 표시용)
    if (!alreadySaved && clientId) {
      const client = await self.clients.get(clientId)
      client?.postMessage({type: 'page-saved', url: url.pathname})
    }
  } catch {
    // 오프라인이면 저장을 생략한다
  }
}

// 하드 내비게이션한 페이지도 본문 이미지(뷰포트 밖 lazy 이미지 포함)를
// 함께 저장한다
async function handleNavigation(event) {
  const response = await networkFirst(event, PAGES_CACHE)
  if (
    response.ok &&
    (response.headers.get('content-type') || '').includes('text/html')
  ) {
    event.waitUntil(saveImagesFromHTML(response.clone()))
  }
  return response
}

async function handleImage(event) {
  const cached = await caches.match(event.request)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(event.request)
    if (response.ok || response.type === 'opaque') {
      event.waitUntil(putWithTrim(IMAGES_CACHE, event.request, response.clone()))
    }
    return response
  } catch {
    const fallback = await matchImageVariant(event.request.url)
    if (fallback) {
      return fallback
    }
    return new Response('', {status: 408})
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
    if (SKIP_HOSTS.some((host) => url.hostname.includes(host))) {
      return
    }
    if (FONT_HOSTS.includes(url.hostname)) {
      event.respondWith(cacheFirst(event, STATIC_CACHE))
      return
    }
    // 포스트 본문 이미지는 대부분 외부 도메인이라 함께 캐시한다
    if (request.destination === 'image') {
      event.respondWith(handleImage(event))
    }
    return
  }

  if (url.pathname.startsWith('/api/') && !isImageRequest(url)) {
    return
  }

  // Content-hashed static assets and fonts: cache forever
  if (isStaticAsset(url) || isFontRequest(url)) {
    event.respondWith(cacheFirst(event, STATIC_CACHE))
    return
  }

  // Page navigations: network-first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event))
    return
  }

  if (isRSCRequest(request, url)) {
    event.respondWith(handleRSC(event))
    return
  }

  // Images (including the /_next/image optimizer): cache-first
  if (isImageRequest(url)) {
    event.respondWith(handleImage(event))
    return
  }

  // Other same-origin _next data: network-first
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(networkFirst(event, PAGES_CACHE))
  }
})
