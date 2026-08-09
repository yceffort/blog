// 3편: 상시 트래픽 샘플러. 요청마다 새 커넥션(keepAlive:false)을 열어
// conntrack 고정 없이 매번 분배를 다시 받게 한다. 출력: "epoch_ms pod이름"
const http = require('node:http')

function once() {
  const agent = new http.Agent({keepAlive: false})
  const req = http.get({host: 'k8s-fe-lab', port: 80, path: '/api/info', agent, timeout: 2000}, (res) => {
    let body = ''
    res.on('data', (c) => (body += c))
    res.on('end', () => {
      try {
        console.log(Date.now(), JSON.parse(body).pod)
      } catch {
        console.log(Date.now(), 'PARSE_ERR')
      }
    })
  })
  req.on('error', (e) => console.log(Date.now(), 'ERR', e.code || e.message))
}

const iv = setInterval(once, 120)
setTimeout(() => {
  clearInterval(iv)
  setTimeout(() => process.exit(0), 500)
}, 100000)
