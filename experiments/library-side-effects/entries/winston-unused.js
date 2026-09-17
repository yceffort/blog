import winston from 'winston'

// 서버에서 쓰던 로거가 클라이언트 번들에 딸려 들어온 상황. 브라우저에서는 호출하지 않는다.
globalThis.__libResult = null
performance.mark('payload-evaluated')
