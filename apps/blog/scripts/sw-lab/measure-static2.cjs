// 웜/콜드 하드 내비게이션에서 /_next/static/ 이 실제로 몇 개나 네트워크(프록시)를 지나는지 센다.
const {chromium} = require('playwright')
const fs = require('fs')
const os = require('os')
const path = require('path')
const BASE = 'http://localhost:3110'
const POST_WARM = '/2026/08/k8s-for-frontend-1'
const POST_COLD = '/2026/08/og-scraping-server-1'
const COND = process.argv[2]
const N = Number(process.argv[3] || 3)
const stats = async () => (await fetch(`${BASE}/__stats`)).json()
const openCtx = async (dir) => {
  const context = await chromium.launchPersistentContext(dir, {
    serviceWorkers: COND === 'nosw' ? 'block' : 'allow',
    args: [
      '--host-resolver-rules=MAP *.google-analytics.com 127.0.0.1, MAP *.googletagmanager.com 127.0.0.1, MAP *.doubleclick.net 127.0.0.1, MAP analytics.google.com 127.0.0.1',
    ],
  })
  return {context, page: context.pages()[0] ?? (await context.newPage())}
}
const collect = `(() => {
  const n = performance.getEntriesByType('navigation')[0]
  const f = performance.getEntriesByName('first-contentful-paint')[0]
  const rs = performance.getEntriesByType('resource').filter(e => e.name.includes('/_next/static/'))
  return {ttfb: Math.round(n.responseStart), fcp: f ? Math.round(f.startTime) : null,
    entries: rs.length, viaSW: rs.filter(e => e.workerStart > 0).length,
    controlled: !!navigator.serviceWorker?.controller}
})()`
void (async () => {
  for (let i = 0; i < N; i++) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'swst2-'))
    let {context, page} = await openCtx(dir)
    try {
      await page.goto(BASE + '/')
      if (COND === 'sw')
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
      await page.waitForTimeout(4000)
      await stats()
      await page.goto(BASE + POST_WARM)
      await page.waitForLoadState('load')
      await page.waitForTimeout(3500)
      const warmPage = await page.evaluate(collect)
      const warmRows = (await stats()).filter((r) =>
        r.url.startsWith('/_next/static/'),
      )
      await context.close()
      ;({context, page} = await openCtx(dir))
      await stats()
      await page.goto(BASE + POST_COLD)
      await page.waitForLoadState('load')
      await page.waitForTimeout(3500)
      const coldPage = await page.evaluate(collect)
      const coldRows = (await stats()).filter((r) =>
        r.url.startsWith('/_next/static/'),
      )
      console.log(
        JSON.stringify({
          cond: COND,
          i,
          warm: {
            proxy: warmRows.length,
            bytes: warmRows.reduce((a, r) => a + r.bytes, 0),
            ...warmPage,
          },
          cold: {
            proxy: coldRows.length,
            bytes: coldRows.reduce((a, r) => a + r.bytes, 0),
            ...coldPage,
          },
        }),
      )
    } catch (e) {
      console.error('run', i, 'failed:', e.message)
    }
    await context.close()
    fs.rmSync(dir, {recursive: true, force: true})
  }
})()
