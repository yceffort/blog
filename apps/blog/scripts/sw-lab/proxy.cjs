// next start(3000) 앞에 두는 네트워크 셰이핑 프록시(3100).
// 페이지·서비스 워커·navigation preload 요청 전부에 동일하게 적용된다.
// Chrome DevTools "Fast 4G" 프리셋과 같은 값: 4Mbps*0.9 다운, RTT 20ms*3.75=75ms
const http = require('http')
const RATE = (4 * 1000 * 1000 * 0.9) / 8 // bytes/s = 450,000
const ONE_WAY = 75 / 2 // ms
let nextFree = 0
function paced(res, chunk) {
  const now = performance.now()
  // 이 청크가 회선에서 다 도착했을 시각에 쓴다 (첫 청크도 전송 시간만큼 늦춘다)
  const start = Math.max(now, nextFree)
  nextFree = start + (chunk.length / RATE) * 1000
  return new Promise((r) =>
    setTimeout(() => {
      res.write(chunk)
      r()
    }, nextFree - now),
  )
}
http
  .createServer((req, res) => {
    setTimeout(() => {
      const up = http.request(
        {
          host: '127.0.0.1',
          port: 3000,
          path: req.url,
          method: req.method,
          headers: req.headers,
        },
        (u) => {
          setTimeout(async () => {
            res.writeHead(u.statusCode, u.headers)
            res.flushHeaders() // 헤더는 즉시 보내고 본문만 페이싱한다
            for await (const chunk of u) {
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
  .listen(3100, () => console.log('proxy :3100 -> :3000'))
