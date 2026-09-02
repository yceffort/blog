// 웜 LCP 의 높은 봉(약 460ms)이 뷰 트랜지션인지 가른다.
//
// 앞선 실험에서 LCP 는 약 160 과 약 460 두 봉우리로 갈렸고, LCP-FCP 간격이
// 낮은 봉 52~56ms, 높은 봉 364~372ms 로 네 조건 전부에서 같았다. 조건과 무관한
// 고정 약 310ms 계단이다. tailwind.css 의 ::view-transition-old(root) /
// ::view-transition-new(root) 가 animation-duration: 0.3s 이고, 포스트 h1 은
// <ViewTransition> 으로 감싸져 있다. 그 0.3s 가 이 계단인지 본다.
//
// 관측과 조작을 분리했다.
//  관측: 네 칸 모두에서 document.startViewTransition 을 감싸 호출 시각만 기록한다.
//        원본을 그대로 호출하므로 동작은 안 바뀐다. 높은 봉 회차에서만 호출이
//        잡히면 상관관계가 선다.
//  조작: vt-off 칸에서 뷰 트랜지션 애니메이션 길이만 0 으로 만든다.
//        startViewTransition 을 스텁으로 갈아끼우지 않는다. 그러면 스냅샷과
//        커밋 타이밍까지 함께 바뀌어 무엇이 원인인지 다시 갈리지 않는다.
//        메커니즘은 그대로 돌리고 0.3s 만 없앤다.
//
// 주입 자체가 교란이 되지 않게 vt-on 칸에도 같은 방식으로 같은 크기의
// 무해한 style 엘리먼트를 넣는다. 두 칸의 차이는 규칙 내용뿐이다.
//
// prefers-reduced-motion 은 쓸 수 없다. tailwind.css 의 reduced-motion 분기는
// #cursor-glow, .logo-ring, 리딩 프로그레스, hero 캔버스, 그리고 announcement
// banner 의 뷰 트랜지션만 끄고 ::view-transition-*(root) 에는 걸려 있지 않다.
const {chromium} = require('playwright')
const fs = require('fs')
const os = require('os')
const path = require('path')

const BASE = 'https://yceffort.kr'
const POST_WARM = '/2026/08/k8s-for-frontend-1'
const RSC_CACHE = 'rsc-v4'
const N = Number(process.argv[2] || 22)
const DWELL = Number(process.env.DWELL || 3500)
const PRIME_SETTLE = Number(process.env.PRIME_SETTLE || 3000)
const OUT = path.join(__dirname, process.env.OUT || 'eh-vitals-vt.jsonl')
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'

// 뷰 트랜지션 애니메이션 길이만 0 으로. 대상은 root 와 이름 붙은 것 전부.
const CSS_OFF = `
::view-transition-group(*),
::view-transition-image-pair(*),
::view-transition-old(*),
::view-transition-new(*),
::view-transition-group(root),
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 1ms !important;
  animation-delay: 0s !important;
  transition-duration: 1ms !important;
}
`
// 같은 자리에 같은 방식으로 들어가지만 아무것도 안 바꾸는 대조 규칙
const CSS_ON = `
.__vt_noop_a, .__vt_noop_b, .__vt_noop_c,
.__vt_noop_d, .__vt_noop_e, .__vt_noop_f,
.__vt_noop_g {
  animation-duration: inherit;
  animation-delay: inherit;
  transition-duration: inherit;
}
`

const collect = `(() => {
  const n = performance.getEntriesByType('navigation')[0]
  const fcp = performance.getEntriesByName('first-contentful-paint')[0]
  const res = performance.getEntriesByType('resource')
  const rsc = res.filter(e => e.name.includes('_rsc='))
  return {
    responseStart: n.responseStart,
    domContentLoaded: n.domContentLoadedEventEnd,
    fcp: fcp ? fcp.startTime : null,
    lcp: window.__lcp || null,
    lcpEl: window.__lcpEl || null,
    lcpAll: window.__lcpAll || [],
    vtCalls: window.__vt || [],
    vtStyle: !!document.getElementById('__vtctl'),
    vtStyleRules: (() => {
      const el = document.getElementById('__vtctl')
      try { return el && el.sheet ? el.sheet.cssRules.length : null } catch { return 'blocked' }
    })(),
    rscCount: rsc.length,
    rscDurTotal: Math.round(rsc.reduce((a, e) => a + e.duration, 0)),
    rscLastEnd: rsc.length ? Math.round(Math.max(...rsc.map(e => e.responseEnd))) : null,
    resCount: res.length,
    controlled: !!navigator.serviceWorker?.controller,
  }
})()`

const countRscCache = `(async () => {
  if (!self.caches) return null
  const names = await caches.keys()
  if (!names.includes(${JSON.stringify(RSC_CACHE)})) return 0
  return (await (await caches.open(${JSON.stringify(RSC_CACHE)})).keys()).length
})()`

const wipeExceptRsc = `(async () => {
  if (!self.caches) return []
  const names = await caches.keys()
  await Promise.all(names.filter(n => n !== ${JSON.stringify(RSC_CACHE)}).map(n => caches.delete(n)))
  return await caches.keys()
})()`

async function open(cond, vt, dir) {
  const ctx = await chromium.launchPersistentContext(dir, {
    serviceWorkers: cond === 'sw' ? 'allow' : 'block',
    userAgent: UA,
    args: [
      '--host-resolver-rules=MAP *.google-analytics.com 127.0.0.1, MAP *.googletagmanager.com 127.0.0.1, MAP *.doubleclick.net 127.0.0.1, MAP analytics.google.com 127.0.0.1, MAP *.vercel-insights.com 127.0.0.1, MAP va.vercel-scripts.com 127.0.0.1',
    ],
  })
  const page = ctx.pages()[0] ?? (await ctx.newPage())
  await page.addInitScript(
    ({css}) => {
      window.__lcp = 0
      window.__lcpEl = null
      window.__lcpAll = []
      window.__vt = []

      // 관측: 원본을 그대로 부르고 호출 시각만 남긴다
      try {
        if (document.startViewTransition) {
          const orig = document.startViewTransition.bind(document)
          document.startViewTransition = function (arg) {
            window.__vt.push(Math.round(performance.now()))
            return orig(arg)
          }
        }
      } catch {}

      // 조작(또는 대조): 같은 자리에 같은 방식으로 style 을 넣는다
      const inject = () => {
        if (!document.documentElement) return false
        if (document.getElementById('__vtctl')) return true
        const s = document.createElement('style')
        s.id = '__vtctl'
        s.textContent = css
        document.documentElement.appendChild(s)
        return true
      }
      if (!inject()) {
        const mo = new MutationObserver(() => {
          if (inject()) mo.disconnect()
        })
        mo.observe(document, {childList: true, subtree: true})
      }

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
    },
    {css: vt === 'off' ? CSS_OFF : CSS_ON},
  )

  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setBlockedURLs', {urls: []})

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

async function once(cell, i) {
  const [cond, vt] = cell.split('/')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ehvt-'))
  const {ctx, page, cdp, docs} = await open(cond, vt, dir)
  try {
    // 앞선 실험과 같은 회차 구성을 그대로 쓴다
    await page.goto(BASE + '/', {waitUntil: 'load', timeout: 60000})
    if (cond === 'sw') await waitControlled(page)

    await page.goto(BASE + POST_WARM, {waitUntil: 'load', timeout: 60000})
    await page.waitForTimeout(PRIME_SETTLE)

    await cdp.send('Network.clearBrowserCache')
    await page.evaluate(wipeExceptRsc)

    await page.goto(BASE + '/', {waitUntil: 'load', timeout: 60000})
    await page.waitForTimeout(DWELL)
    docs.length = 0
    await page.goto(BASE + POST_WARM, {waitUntil: 'load', timeout: 60000})
    await page.waitForTimeout(2500)

    const m = await page.evaluate(collect)
    const rec = {
      cell,
      cond,
      vt,
      i,
      ts: new Date().toISOString(),
      // 머신 부하가 높으면 300ms 계단이 잡음에 묻힌다. 사후 필터용으로 남긴다
      load1: Math.round(os.loadavg()[0] * 100) / 100,
      rscCacheAfter: await page.evaluate(countRscCache),
      ...m,
      cache: docs.at(-1) ? docs.at(-1).cache : null,
    }
    fs.appendFileSync(OUT, JSON.stringify(rec) + '\n')
    const f = (x) => (x == null ? '-' : Math.round(x))
    console.log(
      cell.padEnd(11),
      i,
      rec.cache,
      'ctrl',
      rec.controlled,
      '| fcp',
      String(f(rec.fcp)).padStart(4),
      'lcp',
      String(f(rec.lcp)).padStart(4),
      rec.lcpEl,
      '| lcp-fcp',
      String(f(rec.lcp - rec.fcp)).padStart(4),
      '| vtCalls',
      JSON.stringify(rec.vtCalls),
      '| style',
      rec.vtStyle,
      '| load',
      rec.load1,
    )
  } finally {
    await ctx.close().catch(() => {})
    fs.rmSync(dir, {recursive: true, force: true})
  }
}

void (async () => {
  if (process.env.APPEND !== '1') fs.writeFileSync(OUT, '')
  const base = (process.env.CELLS || 'nosw/on,nosw/off,sw/on,sw/off').split(',')
  for (let i = 0; i < N; i++) {
    const k = i % base.length
    const order = base.slice(k).concat(base.slice(0, k))
    for (const cell of order) {
      try {
        await once(cell, i)
      } catch (e) {
        console.error(cell, i, 'failed:', e.message)
      }
    }
  }
})()
