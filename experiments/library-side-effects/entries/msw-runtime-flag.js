import {http, HttpResponse} from 'msw'

// 런타임에 값이 정해지는 분기. 번들러는 조건을 접을 수 없어 msw를 그대로 남긴다.
if (globalThis.__API_MOCKING === 'enabled') {
  globalThis.__libResult = [
    http.get('/api/quote', () => HttpResponse.json({price: 1})),
  ]
} else {
  globalThis.__libResult = null
}
performance.mark('payload-evaluated')
