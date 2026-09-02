// "워커가 RSC 프리페치를 Cache Storage 에서 내주기 때문에 웜 LCP 가 절반이 된다"
// 라는 설명은 원본 sw.js 의 handleRSC 를 읽으면 거짓이다. 프리페치는 저장도
// 조회도 되지 않는다. 바이트는 하나도 안 줄었는데 LCP 만 내려간 상태로 남아 있다.
//
// 프리페치를 진짜로 캐시에서 내주는 변형을 만들어 재면 갈린다.
//   변형이 뚜렷하게 더 내려가면 -> 바이트 경합이 범인이고 현재 워커는 그 이득을 못 얻고 있다
//   변형이 비슷하면            -> 바이트는 범인이 아니고 워커 경유 자체가 무언가를 바꾼다
//
// 조건 넷.
//   nosw       워커 없음
//   sw         프로덕션 워커 그대로 (계측 카운터만 감싼다)
//   sw-pfcache 프로덕션 워커 + handleRSC 만 프리페치 캐시 버전으로 교체
//   noswblock  워커 없음 + ?_rsc= 차단 (기존 3조건 실험의 그 조건)
//
// 주입 방법은 page.route() 가 아니라 워커 런타임 패치다. route 로 /sw.js 를
// 바꿔치기하는 방법은 실측으로 폐기했다. Chrome 의 soft update 가 내비게이션마다
// 진짜 /sw.js 를 다시 받아오는데, 그 요청은 Playwright route 로도, 페이지 타깃
// CDP Fetch 로도, 브라우저 타깃 CDP Fetch 로도 가로채지지 않는다. 그래서 변형은
// 첫 내비게이션 한두 번만 살아 있다가 진짜 워커로 되돌아간다.
// 대신 sw.js 는 classic worker 라 최상위 function 선언이 워커 전역 객체의
// 프로퍼티가 된다. self.handleRSC 를 런타임에 갈아끼우면 두 조건 모두 배포된
// 진짜 파일을 그대로 돌리면서 handleRSC 만 달라진다. route 를 아예 쓰지 않으므로
// route 가 HTTP 캐시를 끄는 함정 자체가 사라진다.
//
// 캐시가 비어 있으면 변형의 효과가 없다. _rsc 값은 프리페치 요청 헤더 넷을
// 해시한 값이라 같은 출발 페이지에서 같은 목적지로 가야 같은 URL 이 된다.
// 그래서 글을 두 번 방문하고 두 번째를 잰다. 첫 방문 뒤에는 HTTP 캐시와
// rsc-v4 를 뺀 워커 캐시를 지워, 잰 구간이 기존 실험과 같은 상태에서 출발하게 한다.
const {chromium} = require('playwright')
const fs = require('fs')
const os = require('os')
const path = require('path')

const BASE = 'https://yceffort.kr'
const POST_WARM = '/2026/08/k8s-for-frontend-1'
const RSC_CACHE = 'rsc-v4'
const N = Number(process.argv[2] || 25)
const DWELL = Number(process.env.DWELL || 3500)
const PRIME_SETTLE = Number(process.env.PRIME_SETTLE || 3000)
const OUT = path.join(__dirname, process.env.OUT || 'eh-vitals-pfcache.jsonl')
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'

// 원본 정책을 그대로 두고 감싸기만 한다. 프리페치는 캐시를 보지 않으니 항상 미스다.
const PATCH_KEEP = `(() => {
  if (self.__patched) return {already: self.__patched}
  self.__pf = {hit: 0, miss: 0, net: 0}
  const orig = self.handleRSC
  self.handleRSC = function (event) {
    if (isPrefetchRequest(event.request)) {
      self.__pf.miss++
      self.__pf.net++
    }
    return orig(event)
  }
  self.__patched = 'keep'
  return {ok: typeof self.handleRSC === 'function'}
})()`

// 변형: 프리페치도 캐시에서 먼저 찾고, 미스면 네트워크로 받아 저장한다.
// 원본과 다른 곳은 isPrefetchRequest 분기뿐이다.
//   조회: isVisit 이 false 여도 cache.match 를 먼저 한다 (원본은 네트워크 실패 시에만)
//   저장: putWithTrim 조건에서 isVisit 를 뺐다 (원본은 방문한 것만 저장)
// savePageHTML 은 원본대로 방문일 때만 부른다.
const PATCH_PFCACHE = `(() => {
  if (self.__patched) return {already: self.__patched}
  self.__pf = {hit: 0, miss: 0, net: 0}
  self.handleRSC = async function (event) {
    const request = event.request
    const isVisit = !isPrefetchRequest(request)
    if (isVisit) {
      event.waitUntil(savePageHTML(request, event.clientId))
    }
    if (!isVisit) {
      const cache = await caches.open('rsc-v4')
      const cached = await cache.match(request)
      if (cached) {
        self.__pf.hit++
        return cached
      }
      self.__pf.miss++
    }
    try {
      const response = await fetch(request)
      if (!isVisit) {
        self.__pf.net++
      }
      if (response.ok) {
        event.waitUntil(putWithTrim('rsc-v4', request, response.clone()))
      }
      return response
    } catch {
      const cache = await caches.open('rsc-v4')
      const cached = await cache.match(request)
      if (cached) {
        return cached
      }
      return new Response('', {status: 503})
    }
  }
  self.__patched = 'pfcache'
  return {ok: typeof self.handleRSC === 'function'}
})()`

const PATCH = {sw: PATCH_KEEP, 'sw-pfcache': PATCH_PFCACHE}

const readPfSrc = `({patched: self.__patched ?? null, pf: self.__pf ? {hit: self.__pf.hit, miss: self.__pf.miss, net: self.__pf.net} : null})`

const collect = `(() => {
  const n = performance.getEntriesByType('navigation')[0]
  const fcp = performance.getEntriesByName('first-contentful-paint')[0]
  const res = performance.getEntriesByType('resource')
  const rsc = res.filter(e => e.name.includes('_rsc='))
  const fonts = res.filter(e => e.name.endsWith('.woff2'))
  const stat = res.filter(e => e.name.includes('/_next/static/'))
  return {
    responseStart: n.responseStart,
    domContentLoaded: n.domContentLoadedEventEnd,
    loadEnd: n.loadEventEnd,
    fcp: fcp ? fcp.startTime : null,
    lcp: window.__lcp || null,
    lcpEl: window.__lcpEl || null,
    lcpAll: window.__lcpAll || [],
    longTasks: (window.__lt || []).length,
    longTaskTotal: (window.__lt || []).reduce((a, t) => a + t, 0),
    shifts: (window.__cls || []).length,
    rscCount: rsc.length,
    rscBytes: rsc.reduce((a, e) => a + e.transferSize, 0),
    rscFirstStart: rsc.length ? Math.round(Math.min(...rsc.map(e => e.startTime))) : null,
    rscLastEnd: rsc.length ? Math.round(Math.max(...rsc.map(e => e.responseEnd))) : null,
    rscDurTotal: Math.round(rsc.reduce((a, e) => a + e.duration, 0)),
    fontLastEnd: fonts.length ? Math.round(Math.max(...fonts.map(e => e.responseEnd))) : null,
    staticCount: stat.length,
    staticBytes: stat.reduce((a, e) => a + e.transferSize, 0),
    resCount: res.length,
    resBytes: res.reduce((a, e) => a + e.transferSize, 0),
    controlled: !!navigator.serviceWorker?.controller,
  }
})()`

const countRscCache = `(async () => {
  if (!self.caches) return null
  const names = await caches.keys()
  if (!names.includes(${JSON.stringify(RSC_CACHE)})) return 0
  return (await (await caches.open(${JSON.stringify(RSC_CACHE)})).keys()).length
})()`

// rsc-v4 만 남기고 나머지 워커 캐시를 지운다
const wipeExceptRsc = `(async () => {
  if (!self.caches) return []
  const names = await caches.keys()
  await Promise.all(names.filter(n => n !== ${JSON.stringify(RSC_CACHE)}).map(n => caches.delete(n)))
  return await caches.keys()
})()`

async function getWorker(ctx) {
  for (let i = 0; i < 40; i++) {
    const w = ctx.serviceWorkers().find((x) => x.url().endsWith('/sw.js'))
    if (w) return w
    await new Promise((r) => setTimeout(r, 200))
  }
  return null
}

async function swEval(ctx, src) {
  const w = await getWorker(ctx)
  if (!w) return 'no-worker'
  try {
    return await w.evaluate(src)
  } catch (e) {
    return 'err:' + e.message
  }
}

async function open(cond, dir) {
  const ctx = await chromium.launchPersistentContext(dir, {
    serviceWorkers: cond.startsWith('sw') ? 'allow' : 'block',
    userAgent: UA,
    args: [
      '--host-resolver-rules=MAP *.google-analytics.com 127.0.0.1, MAP *.googletagmanager.com 127.0.0.1, MAP *.doubleclick.net 127.0.0.1, MAP analytics.google.com 127.0.0.1, MAP *.vercel-insights.com 127.0.0.1, MAP va.vercel-scripts.com 127.0.0.1',
    ],
  })
  const page = ctx.pages()[0] ?? (await ctx.newPage())
  await page.addInitScript(() => {
    window.__lcp = 0
    window.__lcpEl = null
    window.__lcpAll = []
    window.__lt = []
    window.__cls = []
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        window.__lcp = e.startTime
        window.__lcpEl = e.element ? e.element.tagName : null
        window.__lcpAll.push({
          t: Math.round(e.startTime),
          size: e.size,
          el: e.element ? e.element.tagName : null,
        })
      }
    }).observe({type: 'largest-contentful-paint', buffered: true})
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration))
      }).observe({type: 'longtask', buffered: true})
    } catch {}
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries())
          if (!e.hadRecentInput) window.__cls.push(e.value)
      }).observe({type: 'layout-shift', buffered: true})
    } catch {}
  })

  // Network 도메인은 네 조건 모두 enable 한다. 차단 목록만 조건별로 다르다.
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setBlockedURLs', {
    urls: cond === 'noswblock' ? ['*_rsc=*'] : [],
  })

  const docs = []
  page.on('response', (r) => {
    try {
      if (r.request().resourceType() !== 'document') return
      docs.push({cache: r.headers()['x-vercel-cache'] ?? null})
    } catch {}
  })
  return {ctx, page, cdp, docs}
}

async function waitControlled(page) {
  await page.evaluate(() =>
    navigator.serviceWorker.ready.then(
      () =>
        new Promise((r) => {
          if (navigator.serviceWorker.controller) return r()
          navigator.serviceWorker.addEventListener(
            'controllerchange',
            () => r(),
            {once: true},
          )
        }),
    ),
  )
}

async function once(cond, i) {
  const isSw = cond.startsWith('sw')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ehpf-'))
  const {ctx, page, cdp, docs} = await open(cond, dir)
  try {
    // 1) 워커 설치
    await page.goto(BASE + '/', {waitUntil: 'load', timeout: 60000})
    if (isSw) await waitControlled(page)

    // 2) handleRSC 교체
    const patch = isSw ? await swEval(ctx, PATCH[cond]) : null

    // 3) 프라이밍 방문. 변형에서는 여기서 프리페치가 캐시에 들어간다.
    await page.goto(BASE + POST_WARM, {waitUntil: 'load', timeout: 60000})
    await page.waitForTimeout(PRIME_SETTLE)
    const primedRscKeys = await page.evaluate(countRscCache)
    const primeStats = isSw ? await swEval(ctx, readPfSrc) : null

    // 4) rsc-v4 만 남기고 초기화
    await cdp.send('Network.clearBrowserCache')
    const leftCaches = await page.evaluate(wipeExceptRsc)
    const keptRsc = await page.evaluate(countRscCache)

    // 5) 측정 구간: 홈 -> 체류 -> 같은 글 재방문
    await page.goto(BASE + '/', {waitUntil: 'load', timeout: 60000})
    await page.waitForTimeout(DWELL)
    // 워커가 재시작해 패치가 날아갔으면 다시 건다
    const repatch = isSw ? await swEval(ctx, PATCH[cond]) : null
    const pfBefore = isSw ? await swEval(ctx, readPfSrc) : null
    docs.length = 0
    await page.goto(BASE + POST_WARM, {waitUntil: 'load', timeout: 60000})
    await page.waitForTimeout(2500)

    const m = await page.evaluate(collect)
    const pfAfter = isSw ? await swEval(ctx, readPfSrc) : null
    const rscCacheAfter = await page.evaluate(countRscCache)
    const d = (k) =>
      pfBefore && pfAfter && pfBefore.pf && pfAfter.pf
        ? pfAfter.pf[k] - pfBefore.pf[k]
        : null
    const rec = {
      cond,
      i,
      ts: new Date().toISOString(),
      patch,
      repatch,
      patched: pfAfter && pfAfter.patched ? pfAfter.patched : null,
      primedRscKeys,
      primeStats,
      leftCaches,
      keptRsc,
      rscCacheAfter,
      pfBefore,
      pfAfter,
      pfHit: d('hit'),
      pfMiss: d('miss'),
      pfNet: d('net'),
      ...m,
      cache: docs.at(-1) ? docs.at(-1).cache : null,
    }
    fs.appendFileSync(OUT, JSON.stringify(rec) + '\n')
    const f = (x) => (x == null ? '-' : Math.round(x))
    console.log(
      cond.padEnd(10),
      i,
      rec.cache,
      'ctrl',
      rec.controlled,
      rec.patched ?? '-',
      '| fcp',
      f(rec.fcp),
      'lcp',
      f(rec.lcp),
      rec.lcpEl,
      '| rsc',
      rec.rscCount,
      'durTot',
      rec.rscDurTotal,
      'lastEnd',
      f(rec.rscLastEnd),
      '| pf h/m/n',
      [rec.pfHit, rec.pfMiss, rec.pfNet].join('/'),
      '| rscKeys',
      rec.keptRsc + '->' + rec.rscCacheAfter,
    )
  } finally {
    await ctx.close().catch(() => {})
    fs.rmSync(dir, {recursive: true, force: true})
  }
}

void (async () => {
  if (process.env.APPEND !== '1') fs.writeFileSync(OUT, '')
  const base = (process.env.CONDS || 'nosw,sw,sw-pfcache,noswblock').split(',')
  for (let i = 0; i < N; i++) {
    // 순서 편향을 없애려고 회차마다 순서를 돌린다
    const k = i % base.length
    const order = base.slice(k).concat(base.slice(0, k))
    for (const cond of order) {
      try {
        await once(cond, i)
      } catch (e) {
        console.error(cond, i, 'failed:', e.message)
      }
    }
  }
})()
