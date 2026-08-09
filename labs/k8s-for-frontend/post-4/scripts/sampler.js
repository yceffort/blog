// 4편: 실패 유형 태깅 샘플러. 배포(파드 교체) 중의 실패를 유형·시각까지 남긴다.
//   모드 new      = 요청마다 새 커넥션 (수렴 전 유입을 관찰)
//   모드 ka       = keep-alive 커넥션 재사용 (죽은 커넥션 재사용을 관찰)
//   모드 ka-retry = ka + 커넥션 수준 실패(RESET/REFUSED 등)에 한해 새 커넥션으로 1회 재시도
//                   (GET이라 멱등하다는 전제. 마지막 계단의 처방)
// 페이지(/)는 RESPONSE_DELAY_MS만큼 느리게 응답하므로 SIGTERM 시점에 in-flight가 걸쳐 있게 된다.
// 출력: epoch_ms OK|ERR|RETRY_OK status|코드 pod|- elapsed_ms
const http = require('node:http')

const [, , host = 'graceful-lab', mode = 'new', intervalMs = '120', durationSec = '240'] = process.argv
const shared = new http.Agent({keepAlive: true, maxSockets: 8})
const RETRIABLE = new Set(['ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ECONNABORTED'])

function fire(agent, t0, onError, tag) {
  const req = http.get({host, port: 80, path: '/', agent, timeout: 8000}, (res) => {
    let body = ''
    res.on('data', (c) => (body += c))
    res.on('end', () => {
      const m = body.match(/pod=([A-Za-z0-9-]+)/)
      console.log(t0, res.statusCode === 200 ? tag : 'ERR', res.statusCode, m ? m[1] : '-', Date.now() - t0)
    })
    res.on('aborted', () => onError({code: 'ABORTED'}))
    res.on('error', (e) => onError(e))
  })
  req.on('timeout', () => req.destroy(Object.assign(new Error('timeout'), {code: 'TIMEOUT'})))
  req.on('error', (e) => onError(e))
}

function once() {
  const t0 = Date.now()
  const agent = mode === 'new' ? new http.Agent({keepAlive: false}) : shared
  fire(
    agent,
    t0,
    (e) => {
      const code = e.code || e.message
      if (mode === 'ka-retry' && RETRIABLE.has(code)) {
        // 죽은 커넥션이 원인일 수 있으니 새 커넥션으로 한 번만 다시 보낸다
        fire(new http.Agent({keepAlive: false}), t0, (e2) => {
          console.log(t0, 'ERR', `${code}>${e2.code || e2.message}`, '-', Date.now() - t0)
        }, 'RETRY_OK')
      } else {
        console.log(t0, 'ERR', code, '-', Date.now() - t0)
      }
    },
    'OK',
  )
}

const iv = setInterval(once, Number(intervalMs))
setTimeout(() => {
  clearInterval(iv)
  setTimeout(() => process.exit(0), 1000)
}, Number(durationSec) * 1000)
