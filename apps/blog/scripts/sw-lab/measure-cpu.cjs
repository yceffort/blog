const {chromium} = require('playwright')
const fs = require('fs')
const BASE = 'http://localhost:3100'
const HOME = '/'
const POST_WARM = '/2026/08/k8s-for-frontend-1'
const POST_COLD = '/2026/08/og-scraping-server-1'
const COND = process.argv[2] // nosw | sw
const N = Number(process.argv[3] || 25)
const LABEL = process.argv[4] || COND
const OUT = `runs-${LABEL}.jsonl`

const collect = `(() => {
  const n = performance.getEntriesByType('navigation')[0]
  const fcp = performance.getEntriesByName('first-contentful-paint')[0]
  return {
    type: n.type, workerStart: n.workerStart, fetchStart: n.fetchStart, requestStart: n.requestStart,
    responseStart: n.responseStart, responseEnd: n.responseEnd, domContentLoaded: n.domContentLoadedEventEnd,
    load: n.loadEventEnd, transferSize: n.transferSize, fcp: fcp ? fcp.startTime : null, lcp: window.__lcp,
    controlled: !!navigator.serviceWorker?.controller,
    static: (() => { const rs = performance.getEntriesByType('resource').filter(e => e.name.includes('/_next/static/'))
      return {n: rs.length, fetched: rs.filter(e => e.transferSize > 0).length, bytes: rs.reduce((a, e) => a + e.transferSize, 0), viaSW: rs.filter(e => e.workerStart > 0).length} })(),
  }
})()`
const collectRsc = `performance.getEntriesByType('resource').filter(e => e.name.includes('_rsc=')).map(e => ({
  url: new URL(e.name).pathname, startTime: e.startTime, workerStart: e.workerStart, fetchStart: e.fetchStart,
  responseStart: e.responseStart, responseEnd: e.responseEnd, duration: e.duration, transferSize: e.transferSize,
}))`

async function settle(page) {
  await page.waitForLoadState('load')
  await page.waitForTimeout(2500)
  return page.evaluate(collect)
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
  // 활성화 직후 install 시 프리캐시·이미지 저장이 끝나도록 잠시 대기
  await page.waitForTimeout(1500)
}

const os = require('os')
const path = require('path')
async function open(userDataDir) {
  // route() 인터셉션은 HTTP 캐시를 무력화하므로 DNS 매핑으로 애널리틱스만 차단한다
  const context = await chromium.launchPersistentContext(userDataDir, {
    serviceWorkers: COND === 'nosw' ? 'block' : 'allow',
    args: [
      '--host-resolver-rules=MAP *.google-analytics.com 127.0.0.1, MAP *.googletagmanager.com 127.0.0.1, MAP *.doubleclick.net 127.0.0.1, MAP analytics.google.com 127.0.0.1',
    ],
  })
  const page = context.pages()[0] ?? (await context.newPage())
  await page.addInitScript(() => {
    window.__lcp = 0
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__lcp = e.startTime
    }).observe({type: 'largest-contentful-paint', buffered: true})
  })
  const cdp = await context.newCDPSession(page)
  // 느린 기기 근사: 렌더러 CPU 스로틀 (SW 스레드에도 걸리는지는 swStartup으로 확인)
  await cdp.send('Emulation.setCPUThrottlingRate', {
    rate: Number(process.env.CPU || 1),
  })
  return {context, page, cdp}
}

async function run(i) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swlab-'))
  let {context, page, cdp} = await open(userDataDir)
  const rec = {cond: LABEL, i}

  // 1. 홈: SW 등록(허용 조건) + 연결 웜업. RSC 프리페치 수집
  await page.goto(BASE + HOME)
  if (COND === 'sw') await waitControlled(page)
  await page.waitForTimeout(3000)
  rec.rscHome = await page.evaluate(collectRsc)

  // 2. 웜 상태 하드 내비게이션
  await page.goto(BASE + POST_WARM)
  rec.warm = await settle(page)

  // 3. 워커 정지 후 콜드 하드 내비게이션 (nosw 조건은 그냥 한 번 더 내비게이션)
  // 브라우저를 완전히 종료했다가 같은 프로필로 다시 열어 진짜 콜드 기동을 만든다
  await context.close()
  ;({context, page, cdp} = await open(userDataDir))
  await page.goto(BASE + POST_COLD)
  rec.cold = await settle(page)

  // 4. 하드 리로드 (ignoreCache: SW 우회)
  const reloaded = page.waitForEvent('load')
  await cdp.send('Page.reload', {ignoreCache: true})
  await reloaded
  await page.waitForTimeout(2500)
  rec.reload = await page.evaluate(collect)

  // 5. 홈으로 가서 글 링크 클릭 (소프트 내비게이션)
  await page.goto(BASE + HOME)
  await page.waitForTimeout(3000)
  const before = await page.evaluate(collectRsc)
  const link = page.locator('a[href^="/20"]').first()
  const href = await link.getAttribute('href')
  await link.click()
  await page.waitForURL(BASE + href, {timeout: 20000})
  await page.waitForTimeout(3000)
  const after = await page.evaluate(collectRsc)
  rec.softNav = {
    href,
    prefetch: before,
    afterClick: after.filter(
      (e) => !before.some((b) => b.startTime === e.startTime),
    ),
  }

  await context.close()
  fs.rmSync(userDataDir, {recursive: true, force: true})
  fs.appendFileSync(OUT, JSON.stringify(rec) + '\n')
  console.log(
    LABEL,
    i,
    'warm TTFB',
    Math.round(rec.warm.responseStart),
    'ws',
    Math.round(rec.warm.workerStart),
    '| cold TTFB',
    Math.round(rec.cold.responseStart),
    'ws',
    Math.round(rec.cold.workerStart),
    'fs',
    Math.round(rec.cold.fetchStart),
    '| reload TTFB',
    Math.round(rec.reload.responseStart),
    'ws',
    Math.round(rec.reload.workerStart),
  )
}

void (async () => {
  for (let i = 0; i < N; i++) {
    try {
      await run(i)
    } catch (e) {
      console.error('run', i, 'failed:', e.message)
    }
  }
})()
