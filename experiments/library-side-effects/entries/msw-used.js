import {http, HttpResponse} from 'msw'

globalThis.__libResult = [
  http.get('/api/quote', () => HttpResponse.json({price: 1})),
]
performance.mark('payload-evaluated')
