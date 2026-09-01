// proxy-stats.cjs 와 동일하되 /sw.js 는 고정된 v4 스냅샷을 돌려준다.
const http = require('http')
const fs = require('fs')
const SW = fs.readFileSync(process.env.SW_FILE)
const UP = Number(process.env.UP || 3010)
const RATE = (4 * 1000 * 1000 * 0.9) / 8
const ONE_WAY = 75 / 2
let nextFree = 0
function paced(res, chunk) {
  const now = performance.now()
  const start = Math.max(now, nextFree)
  nextFree = start + (chunk.length / RATE) * 1000
  return new Promise((r) =>
    setTimeout(() => {
      res.write(chunk)
      r()
    }, nextFree - now),
  )
}
let stats = []
http
  .createServer((req, res) => {
    if (req.url === '/__stats') {
      const body = JSON.stringify(stats)
      stats = []
      res.writeHead(200, {'content-type': 'application/json'})
      res.end(body)
      return
    }
    const rec = {url: req.url, bytes: 0, t: Date.now()}
    stats.push(rec)
    if (req.url === '/sw.js') {
      rec.bytes = SW.length
      res.writeHead(200, {
        'content-type': 'application/javascript; charset=utf-8',
        'cache-control': 'no-cache',
        'content-length': String(SW.length),
      })
      res.end(SW)
      return
    }
    setTimeout(() => {
      const up = http.request(
        {
          host: '127.0.0.1',
          port: UP,
          path: req.url,
          method: req.method,
          headers: req.headers,
        },
        (u) => {
          setTimeout(async () => {
            res.writeHead(u.statusCode, u.headers)
            res.flushHeaders()
            for await (const chunk of u) {
              rec.bytes += chunk.length
              for (let o = 0; o < chunk.length; o += 4096)
                await paced(res, chunk.subarray(o, o + 4096))
            }
            res.end()
          }, ONE_WAY)
        },
      )
      up.on('error', () => {
        res.statusCode = 502
        res.end()
      })
      req.pipe(up)
    }, ONE_WAY)
  })
  .listen(3110, () => console.log('proxy :3110 -> :' + UP))
