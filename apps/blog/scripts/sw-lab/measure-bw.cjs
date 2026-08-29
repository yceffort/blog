// 소프트 내비게이션 한 번에 실제로 오간 same-origin 트래픽을 프록시에서 센다.
// 사용법: node measure-bw.cjs <sw|nosw> <반복수>
const {chromium} = require('playwright')
const fs = require('fs')
const os = require('os')
const path = require('path')
const BASE = 'http://localhost:3100'
const COND = process.argv[2]
const N = Number(process.argv[3] || 10)
const OUT = `bw-${process.argv[4] || COND}.jsonl`

const stats = async () => (await fetch(`${BASE}/__stats`)).json()

void (async () => {
  for (let i = 0; i < N; i++) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'swbw-'))
    const context = await chromium.launchPersistentContext(dir, {
      serviceWorkers: COND === 'nosw' ? 'block' : 'allow',
      args: [
        '--host-resolver-rules=MAP *.google-analytics.com 127.0.0.1, MAP *.googletagmanager.com 127.0.0.1',
      ],
    })
    const page = context.pages()[0] ?? (await context.newPage())
    try {
      await page.goto(BASE + '/')
      if (COND === 'sw') {
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
      await page.waitForTimeout(4000)
      await stats() // 홈 로드 구간은 버리고 클릭부터 센다
      const link = page.locator('a[href^="/20"]').first()
      const href = await link.getAttribute('href')
      await link.click()
      await page.waitForURL(BASE + href, {timeout: 20000})
      await page.waitForTimeout(8000) // 워커의 배경 저장이 끝나도록 기다린다
      const rows = await stats()
      // 클릭으로 나간 그 글의 RSC 요청 하나를 페이지 쪽 타이밍에서 집는다
      const click = await page.evaluate(
        (clickedPath) =>
          performance
            .getEntriesByType('resource')
            .filter((e) => {
              const u = new URL(e.name)
              return u.pathname === clickedPath && u.searchParams.has('_rsc')
            })
            .map((e) => ({
              duration: e.duration,
              ttfb: e.responseStart - e.startTime,
              workerStart: e.workerStart,
              transferSize: e.transferSize,
            }))[0],
        href,
      )
      fs.appendFileSync(
        OUT,
        JSON.stringify({cond: COND, i, href, click, rows}) + '\n',
      )
      const bytes = rows.reduce((a, r) => a + r.bytes, 0)
      console.log(COND, i, 'requests', rows.length, 'bytes', bytes)
    } catch (e) {
      console.error('run', i, 'failed:', e.message)
    }
    await context.close()
    fs.rmSync(dir, {recursive: true, force: true})
  }
})()
