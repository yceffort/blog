const CACHE_VERSION = 'v1'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const PAGES_CACHE = `pages-${CACHE_VERSION}`

const OFFLINE_URL = '/offline'
const ALL_CACHES = [STATIC_CACHE, PAGES_CACHE]

// 배포마다 ?dpl= 쿼리가 바뀌어 엔트리가 계속 쌓이므로 상한을 두고
// 오래된 것부터 정리한다 (Cache API의 keys()는 삽입 순서를 보장한다)
const MAX_ENTRIES = {
  [STATIC_CACHE]: 300,
  [PAGES_CACHE]: 100,
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // 내비게이션 요청을 워커 기동과 병렬로 출발시켜 콜드 기동이
      // TTFB에 직렬로 얹히지 않게 한다 (미지원 브라우저는 그냥 넘어간다)
      self.registration.navigationPreload?.enable(),
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => !ALL_CACHES.includes(key))
              .map((key) => caches.delete(key)),
          ),
        ),
    ]).then(() => self.clients.claim()),
  )
})

async function putWithTrim(cacheName, request, response) {
  const cache = await caches.open(cacheName)
  await cache.put(request, response)
  // 오프라인 폴백은 가장 먼저 들어가므로 정리 대상에서 뺀다
  const keys = (await cache.keys()).filter(
    (key) => new URL(key.url).pathname !== OFFLINE_URL,
  )
  const max = MAX_ENTRIES[cacheName]
  if (keys.length > max) {
    await Promise.all(
      keys.slice(0, keys.length - max).map((key) => cache.delete(key)),
    )
  }
}

async function cacheFirst(event) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(event.request)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(event.request)
    if (response.ok) {
      event.waitUntil(
        putWithTrim(STATIC_CACHE, event.request, response.clone()),
      )
    }
    return response
  } catch {
    return new Response('', {status: 408})
  }
}

// 방문한 호는 저장해 두었다가 오프라인에서 꺼내 준다. 앱을 열면 항상
// 홈(최신 호)으로 내비게이션하므로 그날 호는 한 번 열기만 하면 저장된다
async function networkFirst(event, cacheName) {
  const {request} = event
  try {
    // 내비게이션이면 preload로 먼저 출발한 응답을 쓴다. 내비게이션이
    // 아니거나 preload 미지원이면 undefined로 resolve되어 fetch로 간다
    const response = (await event.preloadResponse) ?? (await fetch(request))
    if (response.ok) {
      event.waitUntil(putWithTrim(cacheName, request, response.clone()))
    }
    return response
  } catch {
    const cache = await caches.open(cacheName)
    // 공유 링크의 utm 쿼리가 붙어도 같은 호를 찾는다
    const cached = await cache.match(request, {ignoreSearch: true})
    if (cached) {
      return cached
    }

    if (request.mode === 'navigate') {
      const offline = await cache.match(OFFLINE_URL)
      if (offline) {
        return offline
      }
    }
    return new Response('', {status: 408})
  }
}

// 이미 받아 둔 호도 다시 요청한다. 당일 호는 다시 큐레이션될 수 있고,
// 바뀌지 않았으면 HTTP 재검증(304)으로 끝난다
async function saveRecentIssues() {
  try {
    const paths = await (await fetch('/recent.json')).json()
    await Promise.all(
      paths.map(async (path) => {
        const response = await fetch(path)
        if (response.ok) {
          await putWithTrim(PAGES_CACHE, path, response)
        }
      }),
    )
  } catch {
    // 오프라인이면 다음 실행 때 다시 받는다
  }
}

// 설치한 앱으로 열 때만 클라이언트가 보낸다
self.addEventListener('message', (event) => {
  if (event.data === 'save-recent') {
    event.waitUntil(saveRecentIssues())
  }
})

self.addEventListener('fetch', (event) => {
  const {request} = event

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(event, PAGES_CACHE))
    return
  }

  // RSC 요청은 건드리지 않는다. 오프라인에서 fetch가 실패하면 Next.js
  // 라우터가 브라우저 내비게이션으로 폴백하고, 그 요청을 위에서 받는다
  if (url.searchParams.has('_rsc') || request.headers.get('rsc') === '1') {
    return
  }

  // Content-hashed static assets: cache forever
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(event))
    return
  }

  // 프로필 이미지, 파비콘 같은 나머지 동일 출처 리소스
  event.respondWith(networkFirst(event, STATIC_CACHE))
})
