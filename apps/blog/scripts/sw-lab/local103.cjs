// 로컬 대조군: 103을 보내는 서버와 보내지 않는 서버를 각각 세우고,
// SW 제어 유무에 따라 navigation timing의 firstInterimResponseStart가
// 어떻게 찍히는지 본다.
const http = require('http')
const {chromium} = require('playwright')
const fs = require('fs')
const os = require('os')
const path = require('path')

const SEND_103 = process.argv[2] === '103'
const USE_SW = process.argv[3] === 'sw'
const PRELOAD = process.argv[4] !== 'nopreload'
const N = Number(process.argv[5] || 5)
const PORT = SEND_103 ? 3211 : 3212

const HTML = (body) => `<!doctype html><html><head><meta charset=utf-8>
<title>t</title></head><body>${body}
<script>
if ('serviceWorker' in navigator && location.search.indexOf('nosw') === -1) {
  navigator.serviceWorker.register('/sw.js')
}
</script></body></html>`

const SW = `
self.addEventListener('install', e => e.waitUntil(self.skipWaiting()))
self.addEventListener('activate', e => e.waitUntil(Promise.all([
  ${PRELOAD ? 'self.registration.navigationPreload?.enable()' : 'Promise.resolve()'},
]).then(() => self.clients.claim())))
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith((async () => {
    const r = (await event.preloadResponse) ?? (await fetch(event.request))
    return r
  })())
})
`

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/sw.js')) {
    res.writeHead(200, {
      'content-type': 'application/javascript',
      'cache-control': 'no-cache',
    })
    res.end(SW)
    return
  }
  const done = () => {
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    })
    res.flushHeaders()
    res.end(HTML('<h1>' + req.url + '</h1>'))
  }
  if (SEND_103) {
    // 103 interim response 를 raw socket 으로 직접 쓴다 (HTTP/1.1)
    res.socket.write('HTTP/1.1 103 Early Hints\r\nx-eh: 1\r\n\r\n')
    setTimeout(done, 40) // 103 과 최종 헤더 사이에 40ms 간격을 만든다
  } else {
    setTimeout(done, 40)
  }
})

const collect = `(() => {
  const n = performance.getEntriesByType('navigation')[0]
  return {
    proto: n.nextHopProtocol, workerStart: n.workerStart, requestStart: n.requestStart,
    firstInterimResponseStart: n.firstInterimResponseStart,
    finalResponseHeadersStart: n.finalResponseHeadersStart,
    responseStart: n.responseStart, responseEnd: n.responseEnd,
    controlled: !!navigator.serviceWorker?.controller,
  }
})()`

void (async () => {
  await new Promise((r) => server.listen(PORT, r))
  const base = `http://localhost:${PORT}`
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'l103-'))
  const ctx = await chromium.launchPersistentContext(dir, {
    serviceWorkers: USE_SW ? 'allow' : 'block',
    headless: false,
  })
  const page = ctx.pages()[0] ?? (await ctx.newPage())
  await page.goto(base + '/a')
  if (USE_SW) {
    await page.evaluate(() =>
      navigator.serviceWorker.ready.then(
        () =>
          new Promise((r) => {
            if (navigator.serviceWorker.controller) return r()
            navigator.serviceWorker.addEventListener(
              'controllerchange',
              () => r(),
              {
                once: true,
              },
            )
          }),
      ),
    )
    await page.waitForTimeout(500)
  }
  const rows = []
  for (let i = 0; i < N; i++) {
    await page.goto(`${base}/p${i}`)
    await page.waitForTimeout(200)
    rows.push(await page.evaluate(collect))
  }
  const tag = `${SEND_103 ? '103' : 'no103'}/${USE_SW ? (PRELOAD ? 'sw+preload' : 'sw-nopreload') : 'nosw'}`
  for (const r of rows) {
    console.log(
      tag,
      'ctrl',
      r.controlled,
      '| ws',
      r.workerStart.toFixed(1),
      'reqStart',
      r.requestStart.toFixed(1),
      'FIRS',
      r.firstInterimResponseStart.toFixed(1),
      'FRHS',
      r.finalResponseHeadersStart.toFixed(1),
      'respStart',
      r.responseStart.toFixed(1),
      'respEnd',
      r.responseEnd.toFixed(1),
    )
  }
  await ctx.close()
  fs.rmSync(dir, {recursive: true, force: true})
  server.close()
})()
