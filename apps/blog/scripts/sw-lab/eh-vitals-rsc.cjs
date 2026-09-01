// 웜 내비게이션 LCP 차이의 원인이 RSC 프리페치인지 가른다. 조건 셋이다.
//   nosw       워커 없음, 프리페치 그대로
//   sw         워커 있음, 프리페치 그대로
//   noswblock  워커 없음, ?_rsc= 프리페치 차단
// 차단은 CDP Network.setBlockedURLs 로 한다. route() 는 HTTP 캐시를 꺼서
// 워커 없는 조건만 불리해지므로 쓰지 않는다. 대신 Network 도메인은 세 조건
// 전부에서 똑같이 enable 해 도메인 활성화 자체를 상수로 둔다.
const {chromium} = require('playwright')
const fs = require('fs')
const os = require('os')
const path = require('path')

const BASE = 'https://yceffort.kr'
const POST_WARM = '/2026/08/k8s-for-frontend-1'
const N = Number(process.argv[2] || 12)
const DWELL = Number(process.env.DWELL || 3500)
const OUT = path.join(__dirname, 'eh-vitals-rsc.jsonl')
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'

const collect = `(() => {
  const n = performance.getEntriesByType('navigation')[0]
  const fcp = performance.getEntriesByName('first-contentful-paint')[0]
  const res = performance.getEntriesByType('resource')
  const rsc = res.filter(e => e.name.includes('_rsc='))
  const fonts = res.filter(e => e.name.endsWith('.woff2'))
  return {
    responseStart: n.responseStart,
    domContentLoaded: n.domContentLoadedEventEnd,
    fcp: fcp ? fcp.startTime : null,
    lcp: window.__lcp || null, lcpEl: window.__lcpEl || null, lcpAll: window.__lcpAll || [],
    longTasks: window.__lt || [],
    longTaskTotal: (window.__lt || []).reduce((a, t) => a + t.d, 0),
    shifts: (window.__cls || []).length,
    lastShift: (window.__cls || []).length ? Math.max(...window.__cls.map(s => s.t)) : null,
    rscCount: rsc.length,
    rscBytes: rsc.reduce((a, e) => a + e.transferSize, 0),
    rscLastEnd: rsc.length ? Math.round(Math.max(...rsc.map(e => e.responseEnd))) : null,
    fontLastEnd: fonts.length ? Math.round(Math.max(...fonts.map(e => e.responseEnd))) : null,
    resCount: res.length,
    controlled: !!navigator.serviceWorker?.controller,
  }
})()`

async function open(cond, dir) {
  const ctx = await chromium.launchPersistentContext(dir, {
    serviceWorkers: cond === 'sw' ? 'allow' : 'block',
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
        for (const e of l.getEntries())
          window.__lt.push({
            t: Math.round(e.startTime),
            d: Math.round(e.duration),
          })
      }).observe({type: 'longtask', buffered: true})
    } catch {}
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries())
          if (!e.hadRecentInput)
            window.__cls.push({t: Math.round(e.startTime), v: e.value})
      }).observe({type: 'layout-shift', buffered: true})
    } catch {}
  })
  // Network 도메인은 세 조건 모두 enable 한다. 차단 목록만 조건별로 다르다.
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
  return {ctx, page, docs}
}

async function once(cond, i) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ehrsc-'))
  const {ctx, page, docs} = await open(cond, dir)
  try {
    await page.goto(BASE + '/', {waitUntil: 'load', timeout: 60000})
    if (cond === 'sw') {
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
    await page.waitForTimeout(DWELL)
    docs.length = 0
    await page.goto(BASE + POST_WARM, {waitUntil: 'load', timeout: 60000})
    await page.waitForTimeout(2500)
    const rec = {
      cond,
      i,
      ts: new Date().toISOString(),
      ...(await page.evaluate(collect)),
      cache: docs.at(-1) ? docs.at(-1).cache : null,
    }
    fs.appendFileSync(OUT, JSON.stringify(rec) + '\n')
    const f = (x) => (x == null ? '-' : Math.round(x))
    console.log(
      cond.padEnd(9),
      i,
      rec.cache,
      'ctrl',
      rec.controlled,
      '| ttfb',
      f(rec.responseStart),
      'fcp',
      f(rec.fcp),
      'lcp',
      f(rec.lcp),
      rec.lcpEl,
      '| rsc',
      rec.rscCount,
      'bytes',
      rec.rscBytes,
      'lastEnd',
      f(rec.rscLastEnd),
      '| fontEnd',
      f(rec.fontLastEnd),
      'longTask',
      rec.longTasks.length,
      f(rec.longTaskTotal),
      'shifts',
      rec.shifts,
      'lastShift',
      f(rec.lastShift),
    )
  } finally {
    await ctx.close().catch(() => {})
    fs.rmSync(dir, {recursive: true, force: true})
  }
}

void (async () => {
  fs.writeFileSync(OUT, '')
  const base = ['nosw', 'sw', 'noswblock']
  for (let i = 0; i < N; i++) {
    // 순서 편향을 없애려고 회차마다 순서를 돌린다
    const order = base.slice(i % 3).concat(base.slice(0, i % 3))
    for (const cond of order) {
      try {
        await once(cond, i)
      } catch (e) {
        console.error(cond, i, 'failed:', e.message)
      }
    }
  }
})()
