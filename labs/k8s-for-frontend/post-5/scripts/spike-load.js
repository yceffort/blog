// 5편: 스파이크 부하기 v3. 베이스라인/스파이크 모두 개루프(고정 요청률)다.
//   폐루프는 4동시로도 ~150rps가 나와 스파이크 전에 HPA를 깨우고(스모크 실측),
//   개루프는 지연이 늘어도 유입률이 유지되는 "트래픽 스파이크"의 실제 모형이다.
//   사용: node spike-load.js <host> <baseIntervalMs> <spikeIntervalMs> <warmSec> <spikeSec>
// 출력: epoch_ms OK|ERR status|코드 pod elapsed_ms, 스파이크 진입 시 "SPIKE <epoch_ms>" 마커
const http = require('node:http')
const [, , host = 'autoscale-lab', baseIntervalMs = '100', spikeIntervalMs = '7', warmSec = '45', spikeSec = '240'] = process.argv
const agent = new http.Agent({keepAlive: true, maxSockets: 2048})
let inflight = 0

function fire() {
  if (inflight > 600) return // 과부하 시 클라이언트 붕괴 방지 (드랍은 셈에서 제외)
  inflight++
  const t0 = Date.now()
  const req = http.get({host, port: 80, path: '/', agent, timeout: 10000}, (res) => {
    let body = ''
    res.on('data', (c) => (body += c))
    res.on('end', () => {
      inflight--
      const m = body.match(/pod=([A-Za-z0-9-]+)/)
      console.log(t0, res.statusCode === 200 ? 'OK' : 'ERR', res.statusCode, m ? m[1] : '-', Date.now() - t0)
    })
    res.on('error', fail)
  })
  req.on('timeout', () => req.destroy(Object.assign(new Error('timeout'), {code: 'TIMEOUT'})))
  req.on('error', fail)
  function fail(e) {
    inflight--
    console.log(t0, 'ERR', e.code || e.message, '-', Date.now() - t0)
  }
}

const baseIv = setInterval(fire, Number(baseIntervalMs))
let spikeIv
setTimeout(() => {
  console.log('SPIKE', Date.now())
  spikeIv = setInterval(fire, Number(spikeIntervalMs))
}, Number(warmSec) * 1000)
setTimeout(() => {
  clearInterval(baseIv)
  if (spikeIv) clearInterval(spikeIv)
  setTimeout(() => process.exit(0), 2000)
}, (Number(warmSec) + Number(spikeSec)) * 1000)
