// 프로덕션 오리진에서 워커 유무별 FCP/LCP/TTFB 를 짝지어 잰다.
// eh-ab.cjs 와 같은 교대 구조이고, 웜(등록 직후)과 콜드(브라우저 재기동) 둘 다 본다.
// 사용법: node eh-vitals.cjs [쌍 수]
const {chromium} = require('playwright')
const fs = require('fs')
const os = require('os')
const path = require('path')

const BASE = 'https://yceffort.kr'
const HOME = '/'
const POST_WARM = '/2026/08/k8s-for-frontend-1'
const POST_COLD = '/2026/08/og-scraping-server-1'
const N = Number(process.argv[2] || 25)
const OUT = path.join(__dirname, 'eh-vitals.jsonl')
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'

const collect = `(() => {
  const n = performance.getEntriesByType('navigation')[0]
  const fcp = performance.getEntriesByName('first-contentful-paint')[0]
  return {
    proto: n.nextHopProtocol,
    workerStart: n.workerStart,
    fetchStart: n.fetchStart,
    firstInterimResponseStart: n.firstInterimResponseStart,
    finalResponseHeadersStart: n.finalResponseHeadersStart,
    responseStart: n.responseStart,
    responseEnd: n.responseEnd,
    domContentLoaded: n.domContentLoadedEventEnd,
    fcp: fcp ? fcp.startTime : null,
    lcp: window.__lcp || null,
    lcpEl: window.__lcpEl || null,
    controlled: !!navigator.serviceWorker?.controller,
  }
})()`

async function open(cond, userDataDir) {
  const ctx = await chromium.launchPersistentContext(userDataDir, {
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
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        window.__lcp = e.startTime
        window.__lcpEl = e.element ? e.element.tagName : null
      }
    }).observe({type: 'largest-contentful-paint', buffered: true})
  })
  const docs = []
  page.on('response', (r) => {
    try {
      if (r.request().resourceType() !== 'document') return
      docs.push({
        url: r.url(),
        cache: r.headers()['x-vercel-cache'] ?? null,
        fromSW: r.fromServiceWorker(),
      })
    } catch {}
  })
  return {ctx, page, docs}
}

async function settle(page) {
  await page.waitForLoadState('load')
  await page.waitForTimeout(2500)
  return page.evaluate(collect)
}

async function once(cond, i) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ehv-'))
  let {ctx, page, docs} = await open(cond, dir)
  const rec = {cond, i, ts: new Date().toISOString()}
  try {
    await page.goto(BASE + HOME, {waitUntil: 'load', timeout: 60000})
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
      await page.waitForTimeout(1500)
    }
    await page.waitForTimeout(2000)

    docs.length = 0
    await page.goto(BASE + POST_WARM, {waitUntil: 'load', timeout: 60000})
    rec.warm = await settle(page)
    rec.warmDoc = docs.at(-1) ?? null

    // 브라우저를 완전히 종료했다가 같은 프로필로 다시 열어 콜드 기동을 만든다
    await ctx.close()
    ;({ctx, page, docs} = await open(cond, dir))
    await page.goto(BASE + POST_COLD, {waitUntil: 'load', timeout: 60000})
    rec.cold = await settle(page)
    rec.coldDoc = docs.at(-1) ?? null

    fs.appendFileSync(OUT, JSON.stringify(rec) + '\n')
    const f = (x) => (x == null ? '-' : Math.round(x))
    console.log(
      cond,
      i,
      '| warm ctrl',
      rec.warm.controlled,
      rec.warmDoc && rec.warmDoc.cache,
      'ttfb',
      f(rec.warm.responseStart),
      'fcp',
      f(rec.warm.fcp),
      'lcp',
      f(rec.warm.lcp),
      rec.warm.lcpEl,
      '| cold ctrl',
      rec.cold.controlled,
      rec.coldDoc && rec.coldDoc.cache,
      'ttfb',
      f(rec.cold.responseStart),
      'fcp',
      f(rec.cold.fcp),
      'lcp',
      f(rec.cold.lcp),
      rec.cold.lcpEl,
    )
  } finally {
    await ctx.close().catch(() => {})
    fs.rmSync(dir, {recursive: true, force: true})
  }
}

void (async () => {
  fs.writeFileSync(OUT, '')
  for (let i = 0; i < N; i++) {
    for (const cond of ['nosw', 'sw']) {
      try {
        await once(cond, i)
      } catch (e) {
        console.error(cond, i, 'failed:', e.message)
      }
    }
  }
})()
