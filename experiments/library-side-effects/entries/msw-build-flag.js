import {http, HttpResponse} from 'msw'

// 빌드 타임에 값이 정해지는 분기. 번들러가 조건을 접으면 msw 전체가 dead code가 된다.
if (process.env.API_MOCKING === 'enabled') {
  globalThis.__libResult = [
    http.get('/api/quote', () => HttpResponse.json({price: 1})),
  ]
} else {
  globalThis.__libResult = null
}
performance.mark('payload-evaluated')
