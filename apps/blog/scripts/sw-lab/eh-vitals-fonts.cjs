// eh-vitals 의 웜 LCP 가 워커 없는 조건에서만 두 무리로 갈리는 이유를 본다.
// (1) 홈에서 머무는 시간을 두 조건에서 같게 맞추고, (2) 폰트 리소스 타이밍을 함께 모은다.
const {chromium} = require('playwright')
const fs = require('fs')
const os = require('os')
const path = require('path')

const BASE = 'https://yceffort.kr'
const POST_WARM = '/2026/08/k8s-for-frontend-1'
const N = Number(process.argv[2] || 10)
const DWELL = Number(process.env.DWELL || 3500) // 두 조건 공통 추가 체류
const OUT = path.join(__dirname, process.env.OUT || 'eh-vitals-fonts.jsonl')
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'

const collect = `(() => {
  const n = performance.getEntriesByType('navigation')[0]
  const fcp = performance.getEntriesByName('first-contentful-paint')[0]
  const fonts = performance.getEntriesByType('resource')
    .filter(e => e.name.endsWith('.woff2'))
    .map(e => ({name: e.name.split('/').pop(), start: e.startTime, end: e.responseEnd,
                workerStart: e.workerStart, transferSize: e.transferSize, dur: e.duration}))
  const res = performance.getEntriesByType('resource').map(e => ({
    t: e.initiatorType, n: e.name.replace(location.origin, '').slice(0, 70),
    s: Math.round(e.startTime), e2: Math.round(e.responseEnd),
    w: Math.round(e.workerStart), ts: e.transferSize,
  }))
  return {
    responseStart: n.responseStart, fcp: fcp ? fcp.startTime : null,
    lcp: window.__lcp || null, lcpEl: window.__lcpEl || null, lcpAll: window.__lcpAll || [],
    fonts, fontCount: fonts.length, res,
    lastResBefore600: Math.max(0, ...res.filter(r => r.e2 < 600).map(r => r.e2)),
    lastFontEnd: fonts.length ? Math.max(...fonts.map(f => f.end)) : null,
    controlled: !!navigator.serviceWorker?.controller,
  }
})()`

async function open(cond, dir) {
  const ctx = await chromium.launchPersistentContext(dir, {
    serviceWorkers: cond === 'nosw' ? 'block' : 'allow',
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ehvf-'))
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
    // 두 조건 모두 같은 시간을 머문다
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
      cond,
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
      '| fonts',
      rec.fontCount,
      'lastFontEnd',
      f(rec.lastFontEnd),
      'viaSW',
      rec.fonts.filter((x) => x.workerStart > 0).length,
      'fetched',
      rec.fonts.filter((x) => x.transferSize > 0).length,
      '| lcpEntries',
      JSON.stringify(rec.lcpAll),
    )
  } finally {
    await ctx.close().catch(() => {})
    fs.rmSync(dir, {recursive: true, force: true})
  }
}

void (async () => {
  fs.writeFileSync(OUT, '')
  for (let i = 0; i < N; i++) {
    const order =
      process.env.ORDER === 'sw'
        ? ['sw', 'nosw']
        : process.env.ORDER === 'alt' && i % 2
          ? ['sw', 'nosw']
          : ['nosw', 'sw']
    for (const cond of order) {
      try {
        await once(cond, i)
      } catch (e) {
        console.error(cond, i, 'failed:', e.message)
      }
    }
  }
})()
