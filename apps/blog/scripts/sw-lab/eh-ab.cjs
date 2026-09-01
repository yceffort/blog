// eh.cjs 를 회차마다 nosw/sw 로 번갈아 돌려 시간대 변동을 상쇄한다.
// 문서 응답의 x-vercel-cache 도 함께 기록한다.
const {chromium} = require('playwright')
const fs = require('fs')
const os = require('os')
const path = require('path')
const BASE = 'https://yceffort.kr'
const POST = '/2026/08/k8s-for-frontend-1'
const N = Number(process.argv[2] || 12)
const OUT = path.join(__dirname, 'eh-ab.jsonl')
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'
const collect = `(() => {
  const n = performance.getEntriesByType('navigation')[0]
  return {proto: n.nextHopProtocol, workerStart: n.workerStart, requestStart: n.requestStart,
    firstInterimResponseStart: n.firstInterimResponseStart,
    finalResponseHeadersStart: n.finalResponseHeadersStart,
    responseStart: n.responseStart, responseEnd: n.responseEnd,
    controlled: !!navigator.serviceWorker?.controller}
})()`
async function once(cond, i) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ehab-'))
  const ctx = await chromium.launchPersistentContext(dir, {
    serviceWorkers: cond === 'nosw' ? 'block' : 'allow',
    userAgent: UA,
    args: [
      '--host-resolver-rules=MAP *.google-analytics.com 127.0.0.1, MAP *.googletagmanager.com 127.0.0.1, MAP *.doubleclick.net 127.0.0.1, MAP analytics.google.com 127.0.0.1, MAP *.vercel-insights.com 127.0.0.1, MAP va.vercel-scripts.com 127.0.0.1',
    ],
  })
  try {
    const page = ctx.pages()[0] ?? (await ctx.newPage())
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
      await page.waitForTimeout(1500)
    }
    await page.waitForTimeout(2000)
    docs.length = 0
    await page.goto(BASE + POST, {waitUntil: 'load', timeout: 60000})
    await page.waitForTimeout(1500)
    const rec = {
      cond,
      i,
      ts: new Date().toISOString(),
      ...(await page.evaluate(collect)),
      doc: docs.at(-1) ?? null,
    }
    fs.appendFileSync(OUT, JSON.stringify(rec) + '\n')
    console.log(
      cond,
      i,
      'ctrl',
      rec.controlled,
      rec.proto,
      rec.doc && rec.doc.cache,
      '| ws',
      rec.workerStart.toFixed(1),
      'FIRS',
      rec.firstInterimResponseStart.toFixed(1),
      'FRHS',
      rec.finalResponseHeadersStart.toFixed(1),
      'respStart',
      rec.responseStart.toFixed(1),
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
