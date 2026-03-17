---
title: 'Next.js Edge Runtime의 흥망성쇠'
tags:
  - nextjs
  - edge-computing
  - serverless
  - web-performance
  - vercel
published: true
date: 2026-03-16 16:24:02
description: 'Edge Middleware 야 잘 살고 있니?'
series: 'Next.js의 현주소'
seriesOrder: 1
---

## Table of Contents

## 서론

2022년, Vercel은 Edge의 적용 범위를 빠르게 넓혔다. Middleware에 이어 [Edge API Routes](https://nextjs.org/blog/next-12-2#edge-api-routes-experimental), Edge SSR까지 — Next.js의 모든 서버 사이드 코드를 Edge에서 실행할 수 있도록 확장해 나갔다. [Edge Functions 정식 출시 발표](https://vercel.com/blog/edge-functions-generally-available)에서는 "기존 Serverless보다 더 효율적이고 빠르다"고 했고, OG Image 생성 비용이 Serverless 대비 15배 저렴하다는 수치를 내세웠다. 커뮤니티에서는 자연스럽게 Edge가 Serverless를 대체하는 미래라는 기대가 형성되었다.

```ts
// app/api/hello/route.ts
export const runtime = 'edge' // 이 한 줄이면 전 세계 Edge에서 실행

export async function GET() {
  return new Response('Hello from the Edge!')
}
```

4년이 지난 지금, 그 비전은 어떻게 되었을까? Next.js 공식 문서에서는 Node.js 런타임을 권장하고, Next.js 16에서 Middleware를 대체하는 새로운 `proxy`는 Node.js only로 설계되었다.

이 글에서는 Next.js Edge Runtime이 어떻게 등장했고, 왜 후퇴했으며, 그 과정에서 우리가 배울 수 있는 것은 무엇인지를 나름대로 추적해 보았다.

## 타임라인: Edge의 부상과 후퇴

### 2021년 10월 — Middleware의 등장

Next.js 12에서 [Middleware](https://nextjs.org/blog/next-12#introducing-middleware)가 베타로 도입되었다. 요청이 라우트에 도달하기 전에 Edge에서 실행되는 코드로, A/B 테스트, 지역 기반 리다이렉트, 인증 검사 같은 용도였다. V8 Isolate 기반으로 콜드 스타트 없이 즉시 실행된다는 점이 핵심 셀링 포인트였다.

```ts
// middleware.ts (Next.js 12 beta)
export function middleware(req: NextRequest) {
  const country = req.geo?.country
  if (country === 'KR') {
    return NextResponse.rewrite(new URL('/ko', req.url))
  }
}
```

Middleware는 성공적이었다. 요청 레벨의 라우팅 로직을 Edge에서 실행하는 것은 합리적인 유스케이스였고, 실제로 체감할 수 있는 성능 개선이 있었다.

### 2022년 — Edge 확장의 해

Next.js 12.2에서 [Edge API Routes](https://nextjs.org/blog/next-12-2#edge-api-routes-experimental)가 실험적으로 도입되었고, 같은 해 12월에는 [Edge Functions가 정식 출시](https://vercel.com/blog/edge-functions-generally-available)되었다. Next.js 13에서는 App Router와 함께 `export const runtime = 'edge'`를 선언하면 페이지의 서버 컴포넌트까지 Edge에서 렌더링할 수 있게 되었다.

Vercel의 정식 출시 발표에서는 Edge Functions를 "기존 Serverless 대비 더 효율적이고 빠른 컴퓨트"로 포지셔닝하면서, 성능과 비용 특성에 따라 실행 환경을 선택하라고 안내했다. 하지만 Middleware → API Routes → SSR까지 Edge 적용 범위를 빠르게 넓혀가는 행보 자체가 메시지였다. 커뮤니티에서는 "Edge가 Serverless를 대체할 것"이라는 기대가 커졌다.

### 2023년 — 현실과의 충돌

App Router가 안정화되면서, 실제로 Edge Runtime을 프로덕션에 도입하려는 시도가 늘었다. 그리고 문제가 터져나왔다.

GitHub Issues에 올라온 대표적인 불만들은 다음과 같다:

- [Prisma가 Edge에서 동작하지 않는다](https://github.com/prisma/prisma/issues/21310) — ORM 없이 앱을 만들 수 있는가?
- [next-auth(Auth.js)가 Edge를 완전 지원하지 못한다](https://github.com/nextauthjs/next-auth/issues/9702) — 인증 없이 앱을 만들 수 있는가?
- `crypto`, `fs`, `net` 등 Node.js 핵심 모듈을 쓸 수 없다 — 기존 npm 패키지의 대다수가 동작하지 않는다

우리팀에서도 실험적으로 미들웨어를 도입하면서 상당히 많은 우여곡절이 있었다. 그리고 많은 사람들이 잘 아는 것 처럼, Next.js 가 커뮤니티에 올라오는 불만이나 이슈를 빠르게 해결하는 편도 아니었기에 점차 불만이 커져갔고, 그와 동시에 커뮤니티의 온도가 급격히 식은 것도 이맘때 쯤 이었던 것으로 기억한다.

### 2024년 — 조용한 후퇴

Vercel은 2024년 중반 [Fluid Compute](https://vercel.com/blog/introducing-fluid-compute)를 발표했다. Serverless Function의 콜드 스타트를 사실상 제거하고, 하나의 인스턴스가 여러 요청을 동시에 처리할 수 있게 하는 기술이었다. Edge Runtime의 존재 이유였던 "콜드 스타트 없는 빠른 응답"을 Node.js 런타임에서도 달성할 수 있게 된 것이다.

Next.js 공식 문서의 톤도 변화를 보인다. [v14 문서](https://nextjs.org/docs/14/app/building-your-application/rendering/edge-and-nodejs-runtimes)에서는 Edge Runtime을 "Lowest latency", "Highest scalability"로 소개하며 Node.js와 중립적으로 비교했지만, [v16 문서](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#runtime)에서는 "We recommend using the Node.js runtime for rendering your application"으로 명확히 Node.js를 권장하고 있다.

### 2025~2026년 — 조용한 퇴장

`export const runtime = 'edge'`가 공식적으로 "deprecated"라고 선언된 적은 없다. [Next.js 문서](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#runtime)에서는 여전히 `'nodejs' | 'edge'`를 유효한 옵션으로 명시하고 있다. 다만 같은 문서에서 이렇게 안내한다:

> We recommend using the Node.js runtime for rendering your application.

그리고 Next.js 16에서 더 의미심장한 변화가 일어났다. `middleware.ts`가 [`proxy.ts`로 개명](https://nextjs.org/docs/app/guides/upgrading/version-16)되면서, **새로운 `proxy`는 Node.js only로 설계되었다.** 기존 `middleware.ts`를 유지하면 Edge runtime을 계속 쓸 수 있지만, 프레임워크가 나아가는 방향은 명확하다.

> The `edge` runtime is **NOT** supported in `proxy`. The `proxy` runtime is `nodejs`, and it cannot be configured. If you want to continue using the `edge` runtime, keep using `middleware`.

왜 이렇게 되었을까? Middleware는 원래 가벼운 라우팅(리다이렉트, 헤더 조작, 지역 판별)을 위한 것이었지만, 현실에서 개발자들은 인증(세션 검증에 DB 접근 필요), 로깅(Pino/Winston 불가), 암호화(`crypto` 불가) 같은 작업을 해야 했다. Edge의 제약 때문에 Middleware 안에서 `/api/authenticate` 같은 별도 엔드포인트를 호출하는 우회 패턴이 만연했다. [GitHub Discussion](https://github.com/vercel/next.js/discussions/71727)에서 이 문제에 대한 커뮤니티의 불만이 쏟아졌고, Lee Robinson도 ["Middleware의 의도는 quick redirects, rewrites, headers/cookies 설정이지 blocking data fetching이 아니다"](https://github.com/vercel/next.js/discussions/71727)라고 인정했다. 하지만 현실의 요구를 무시할 수는 없었고, Next.js 팀은 v15.2에서 Middleware에 Node.js runtime을 실험적으로 도입한 뒤, v16에서 `proxy`로 개명하면서 Node.js only로 정리했다.

여기에 더해, [proxy.js 문서](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)에서는 Middleware(proxy) 자체의 사용도 줄이겠다고 한다:

> Middleware is highly capable, so it may encourage the usage; however, this feature is recommended to be used as a last resort.

"Middleware는 너무 강력해서 남용되기 쉽다. 다른 방법이 없을 때만 최후의 수단으로 쓰라." 앞으로는 Middleware 없이도 같은 목적을 달성할 수 있는 API를 제공하겠다는 선언이다.

Edge의 대표 유스케이스였던 Middleware는 여전히 Edge에서 동작하지만, 그 후속인 `proxy`는 Node.js only이고 최후의 수단으로 격하되었다. 공식적인 deprecation 선언은 없지만, Edge Runtime의 적용 범위는 점진적으로 축소되고 있다.

## 왜 범용 런타임으로 자리잡지 못했나 (1): Node.js 반쪽짜리 호환

Edge Runtime은 [Web API 기반](https://edge-runtime.vercel.app/)으로, Node.js API를 사용할 수 없다. `Request`, `Response`, `fetch` 같은 표준 Web API만 쓸 수 있다는 것이 "장점"으로 포장되었지만, 현실에서는 치명적인 제약이었다.

### npm 생태계와의 단절

npm 패키지의 상당수는 Node.js 내장 모듈에 의존한다. `fs`, `path`, `crypto`, `net`, `child_process` — 이 중 하나라도 `import`하는 패키지는 Edge에서 동작하지 않는다.

Edge에서 동작하지 않았던 핵심 라이브러리들:

| 라이브러리              | 이유                     | 영향                  |
| ----------------------- | ------------------------ | --------------------- |
| **Prisma**              | `fs`, `path`, `net` 의존 | ORM 사용 불가         |
| **bcrypt**              | C++ native addon         | 비밀번호 해싱 불가    |
| **jsonwebtoken**        | Node.js `crypto` 의존    | JWT 검증 불가         |
| **Auth.js (next-auth)** | 위 라이브러리들에 의존   | 인증 시스템 구축 난관 |
| **winston/pino**        | `fs`, `stream` 의존      | 구조적 로깅 불가      |
| **sharp**               | Native addon (libvips)   | 이미지 처리 불가      |

이 목록을 보면 Edge에서 무엇을 할 수 **있었는지**가 오히려 궁금해진다. 데이터베이스 접근, 인증, 이미지 처리, 로깅 — 웹 애플리케이션의 기본 기능 대부분이 막혀있었다.

### "Edge-compatible" 버전의 등장과 혼란

일부 라이브러리는 Edge 호환 버전을 별도로 만들었다. Prisma의 [Edge Client](https://www.prisma.io/docs/orm/prisma-client/deployment/edge/overview), Auth.js의 Edge 지원 등. 하지만 이는 생태계를 분열시켰다.

```ts
// Node.js 환경
import {PrismaClient} from '@prisma/client'

// Edge 환경
import {PrismaClient} from '@prisma/client/edge'
```

같은 기능인데 import 경로가 다르다. Edge 호환 버전은 기능이 축소되어 있거나, 추가 설정(connection pool URL 등)이 필요했다. 개발자는 런타임에 따라 코드를 분기해야 했고, 이는 유지보수 부담으로 이어졌다.

## 왜 범용 런타임으로 자리잡지 못했나 (2): 데이터는 Edge에 없다

호환성 문제를 우회하더라도, 더 근본적인 구조적 문제가 남아있었다. **레이턴시 역설**이다.

Edge의 약속은 단순했다: 서울에 있는 사용자의 요청을 서울의 Edge 노드에서 처리하면, 미국 동부의 서버까지 왕복할 필요가 없으니 빠르다. 이론적으로는 맞다. **정적 콘텐츠를 서빙할 때는.**

문제는 현실의 웹 애플리케이션이 거의 반드시 **데이터베이스에 접근**한다는 것이다. 그리고 데이터베이스는 Edge에 없다. 대부분의 경우 한두 개의 리전에 집중되어 있다.

```
[사용자: 서울] → [Edge 노드: 서울] → [DB: us-east-1]
                  ↑ 여기서 코드 실행         ↑ 데이터는 여기
                  RTT: ~2ms                   RTT: ~150ms
```

코드 실행은 서울에서 하지만, 데이터를 가져오려면 결국 미국까지 왕복해야 한다. **레이턴시의 병목은 코드 실행이 아니라 데이터 접근**이었다. Edge에서의 2ms 실행 시간 절약은 150ms의 DB 왕복 시간 앞에서 의미가 없었다.

반면 Node.js Serverless Function은 DB와 같은 리전에 배치할 수 있다:

```
[사용자: 서울] → [Serverless: us-east-1] → [DB: us-east-1]
                  RTT: ~150ms                RTT: ~2ms
```

총 레이턴시는 비슷하거나, DB 쿼리가 여러 번 필요한 경우 오히려 Serverless가 더 빨랐다. N+1 쿼리 패턴에서 Edge는 재앙적이었다:

```
Edge:    150ms × N (매 쿼리마다 대양 횡단)
Node.js: 150ms + 2ms × N (첫 요청만 대양 횡단, 이후 로컬)
```

### "그러면 Edge를 DB 리전에 두면 되지 않나?"

여기서 자연스러운 의문이 생긴다. Edge Function을 DB와 같은 리전에 고정하면 두 장점을 모두 취할 수 있지 않을까? 실제로 Vercel도 [Regional Edge Functions](https://vercel.com/changelog/regional-edge-functions-are-now-available)를 제공하여 특정 리전에서만 실행되도록 설정할 수 있다.

하지만 이렇게 하면 Edge의 존재 이유 자체가 사라진다. Edge의 핵심 가치는 **글로벌 분산 배치**다. 특정 리전에 고정하는 순간, 그것은 그냥 "Web API만 쓸 수 있는 제약이 있는 Serverless Function"이다. Node.js의 전체 API와 npm 생태계를 포기하면서까지 Edge Runtime을 선택할 이유가 없어진다.

정리하면 이런 딜레마다:

- **글로벌 분산 배치** → Edge의 장점을 살리지만, DB 레이턴시 문제 발생
- **DB 리전 고정** → DB 레이턴시를 해결하지만, Edge의 장점이 사라짐

어느 쪽을 택해도 Edge Runtime이 Node.js Serverless 대비 명확한 이점을 갖기 어려웠다.

### 레이턴시만이 아니다: Connection 관리의 문제

Edge에서 DB가 어려운 이유는 레이턴시뿐이 아니다. **커넥션 관리** 문제가 있다. 전통적인 서버는 DB와의 커넥션 풀을 유지하면서 커넥션을 재사용한다. 하지만 Edge Isolate는 수명이 짧다. 요청이 끝나면 Isolate가 사라지고, 커넥션도 함께 사라진다. 매 요청마다 새로운 TCP 커넥션을 맺어야 하는 것이다.

```
전통적 서버:
[서버 시작] → [커넥션 풀 생성 (5개)] → 요청마다 재사용

Edge Isolate:
요청1 → [커넥션 생성] → [쿼리] → [커넥션 종료]
요청2 → [커넥션 생성] → [쿼리] → [커넥션 종료]  ← 매번 새로 생성
```

이 문제를 해결하기 위해 HTTP 기반의 DB 드라이버들이 등장했다. [Prisma Data Proxy](https://www.prisma.io/docs/orm/prisma-client/deployment/edge/overview), [Neon HTTP driver](https://neon.tech/docs/serverless/serverless-driver), [PlanetScale HTTP driver](https://planetscale.com/docs/tutorials/planetscale-serverless-driver) 같은 것들이다. TCP 커넥션 대신 HTTP 요청으로 쿼리를 보내는 방식이다. 하지만 이는 또 하나의 프록시 레이어를 추가하는 것이고, 기존 ORM 사용법과 달라지는 문제가 있었다.

Vercel의 [Sam Lambert(전 PlanetScale CEO)](https://x.com/isamlambert)도 이 문제를 인정한 바 있다:

> "If your data isn't at the edge, your compute shouldn't be either."

## 왜 범용 런타임으로 자리잡지 못했나 (3): Fluid Compute가 존재 이유를 없앴다

Edge Runtime의 핵심 셀링 포인트를 정리하면 두 가지였다:

1. **콜드 스타트 제거**: V8 Isolate 기반이라 즉시 실행
2. **글로벌 분산**: 사용자 가까이에서 실행

2번은 데이터 레이턴시 역설로 무력화되었고, 1번은 Vercel의 [Fluid Compute](https://vercel.com/blog/introducing-fluid-compute)가 해결했다.

Fluid Compute는 2025년 2월에 발표된 Vercel의 새로운 컴퓨트 모델이다. 전통적인 Serverless와 전용 서버 사이에 위치하는 접근으로, Vercel은 이를 "고성능 미니 서버"라고 표현한다. 핵심 아이디어는 세 가지다:

1. **인스턴스 재사용**: 함수가 응답을 보낸 뒤에도 즉시 종료하지 않고 대기한다. 다음 요청이 들어오면 이미 warm 상태인 인스턴스가 처리한다.
2. **동시성(Concurrency)**: 하나의 인스턴스가 여러 요청을 동시에 처리할 수 있다. I/O 대기 중인 유휴 시간에 다른 요청을 받는 방식이다.
3. **빠른 초기화**: Rust 기반 런타임과 바이트코드 캐싱으로, 콜드 스타트가 발생하더라도 초기화 시간을 단축한다.

```
전통적 Serverless:
요청1 → [콜드 스타트 + 실행] → 종료
요청2 → [콜드 스타트 + 실행] → 종료  ← 매번 콜드 스타트

Fluid Compute:
요청1 → [콜드 스타트 + 실행] → 대기
요청2 → [실행] → 대기                ← 콜드 스타트 없음
요청3 → [실행] → 대기                ← 콜드 스타트 없음
```

Vercel은 이를 통해 컴퓨트 비용을 최대 85% 절감할 수 있다고 [주장한다](https://vercel.com/blog/introducing-fluid-compute). Fluid Compute의 발표 자체가 Edge Runtime의 대체를 직접 언급하지는 않았지만, 결과적으로 Edge의 핵심 장점이었던 "콜드 스타트 없는 빠른 응답"을 Node.js 환경에서도 달성할 수 있게 되었다. Node.js의 전체 API와 npm 생태계를 그대로 쓰면서.

## Edge는 완전히 죽었나?

Next.js에서의 Edge Runtime은 후퇴했지만, Edge Computing 자체가 죽은 것은 아니다. 오히려 다른 곳에서는 번성하고 있다.

### Cloudflare Workers: 같은 Edge, 다른 결과

Cloudflare Workers도 V8 Isolate 기반의 Edge Computing이다. 기술적 기반은 Vercel Edge Runtime과 동일하다. 그런데 Cloudflare는 후퇴하지 않았다. 차이는 어디에서 왔을까?

**첫째, 데이터를 Edge로 가져왔다.** Next.js Edge Runtime이 실패한 가장 큰 이유는 "데이터가 Edge에 없다"였다. Cloudflare는 이 문제를 인프라 레벨에서 해결했다.

- [D1](https://developers.cloudflare.com/d1/) — Edge에서 접근 가능한 SQLite 데이터베이스. Workers와 같은 위치에서 실행되어 DB 쿼리 레이턴시를 제거한다.
- [KV](https://developers.cloudflare.com/kv/) — 전역 분산 Key-Value 스토어. 읽기에 최적화되어 설정, 기능 플래그 등에 적합하다.
- [Durable Objects](https://developers.cloudflare.com/durable-objects/) — Edge 환경에서 가장 어려운 문제인 "분산 상태 관리"를 해결하기 위한 구조다. 각 Object가 고유한 ID를 가지고 단일 위치에서 실행되면서 상태를 유지한다. 실시간 협업, 채팅, 게임 같은 유스케이스를 Edge에서 처리할 수 있게 한다.
- [R2](https://developers.cloudflare.com/r2/) — S3 호환 오브젝트 스토리지. egress 비용이 없다.

Vercel의 Edge Runtime은 컴퓨트만 Edge에 올리고 데이터는 기존 인프라(AWS RDS, PlanetScale 등)에 의존하도록 했다. Cloudflare는 컴퓨트와 데이터를 모두 Edge에 올렸다. 이 차이가 결정적이었다.

**둘째, Node.js 호환성을 점진적으로 확보했다.** Cloudflare도 초기에는 Web API only였지만, [2025년 한 해 동안 11개 핵심 Node.js 모듈](https://blog.cloudflare.com/nodejs-workers-2025/)(`node:crypto`, `node:fs`, `node:http`, `node:net` 등)을 네이티브로 구현했다. 폴리필이 아니라 C++/TypeScript로 런타임에 직접 구현한 것이다. 그 결과 Express, Koa 같은 프레임워크와 jsonwebtoken, passport, knex 같은 주요 npm 패키지가 Workers에서 동작하게 되었다. Vercel Edge Runtime이 "Web API만 쓸 수 있다"는 제약을 유지한 것과 대조적이다.

**셋째, 인프라를 직접 소유하고 있다.** Cloudflare는 전 세계 330개 이상의 도시에 자체 네트워크를 운영하는 CDN 사업자다. Edge 노드를 추가하는 것이 비즈니스 자체이고, Workers는 그 인프라 위에서 돌아간다. 반면 Vercel은 AWS 위에 구축된 플랫폼이다. Edge를 확장할수록 AWS에 지불하는 비용이 늘어나는 구조다. 인프라를 직접 소유한 Cloudflare와 인프라를 임대하는 Vercel은 Edge에 대한 경제적 인센티브가 근본적으로 달랐다.

정리하면, Cloudflare의 접근은 "기존 Node.js 앱을 Edge에서 돌리자"가 아니라 "Edge-native 스택을 처음부터 만들자"였다. 컴퓨트, 데이터, 호환성, 인프라 — 네 가지를 모두 갖추었기 때문에 같은 Edge인데도 다른 결과를 낼 수 있었다.

### Turso/libSQL: 분산 데이터베이스

[Turso](https://turso.tech/)는 SQLite 기반의 Edge 데이터베이스로, 읽기 복제본을 전 세계 Edge에 배치하는 방식이다. 쓰기는 프라이머리 리전에서 처리하되, 읽기는 가장 가까운 복제본에서 처리한다.

```
[사용자: 서울] → [Edge 노드: 서울] → [Turso 읽기 복제본: 서울]
                                     RTT: ~2ms ✓
```

이런 접근이라면 Edge Computing의 레이턴시 약속을 실제로 지킬 수 있다. 다만 아직 생태계가 성숙하지 않았고, 쓰기 작업에는 여전히 한계가 있다.

## 교훈: 플랫폼이 미는 기술을 어디까지 따라가야 하는가

Next.js Edge Runtime의 역사에서 몇 가지 교훈을 끌어낼 수 있다.

### 1. 벤더의 인센티브를 읽어라

Vercel이 Edge를 강력히 밀었던 이유를 생각해 보자. Edge Computing은 Vercel의 비즈니스 모델에 유리했다. Edge Function은 Node.js Serverless보다 **리소스 소모가 적고** (V8 Isolate는 풀 Node.js 런타임보다 가볍다), **전 세계에 분산 배치**되므로 인프라 활용률이 높다. 기술적 우수성과 비즈니스 인센티브가 일치할 때, 기술 기업은 그 기술을 과대평가하는 경향이 있다.

이것이 Vercel만의 문제는 아니다.

- **Google과 AMP**: Google은 모바일 웹 성능을 명분으로 AMP를 밀었지만, AMP 페이지는 Google의 캐시 서버에서 서빙되어 트래픽이 Google을 경유하는 구조였다. 검색 결과 상단 캐러셀에 AMP 페이지를 우대하면서 사실상 채택을 강제했고, 퍼블리셔들은 "AMP를 안 쓰면 검색 노출에서 불이익"이라는 압박 속에서 도입했다. 결국 [2021년 AMP 우대 정책을 폐지](https://developers.google.com/search/blog/2021/04/more-details-page-experience)했고, AMP 채택률은 급감했다.
- **Serverless 만능론**: AWS Lambda가 등장하면서 "모든 것을 Serverless로"라는 흐름이 있었다. 서버 관리 부담 제거, 자동 스케일링, 사용한 만큼만 과금 — 매력적인 약속이었다. 하지만 콜드 스타트, 실행 시간 제한, 로컬 상태 불가, 디버깅 어려움 같은 현실적 제약이 드러나면서, 결국 대부분의 팀이 Serverless와 전통적 서버를 혼합하는 하이브리드 아키텍처로 정착했다. "모든 것을 Edge로" → "적절한 곳에만 Edge를"이라는 과정은 이 패턴과 정확히 동일하다.

### 2. "이론상 빠르다"와 "실제로 빠르다"를 구분하라

Edge Runtime은 이론상 빠르다. 사용자와 가까운 곳에서 실행되니까. 하지만 실제 애플리케이션의 성능은 네트워크 홉 하나가 아니라 **전체 요청 체인**으로 결정된다. DB 쿼리, 외부 API 호출, 인증 검증 — 이 모든 것을 포함한 end-to-end 레이턴시를 측정해야 한다.

새로운 기술을 도입할 때 벤치마크가 **어떤 조건에서** 측정되었는지를 항상 확인해야 한다. "Edge에서 Hello World가 5ms에 응답합니다"는 실제 프로덕션 성능과 아무 관련이 없다.

### 3. 생태계 호환성은 협상 불가다

아무리 좋은 런타임이라도 기존 생태계와 호환되지 않으면 채택되기 어렵다. Deno가 이 교훈을 배우고 Node.js 호환성을 강화한 것처럼, Edge Runtime도 Node.js API 호환성을 갖추지 못한 것이 치명적이었다.

Cloudflare도 이를 인식하고 Workers에 [Node.js 호환 레이어](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)를 추가하고 있다. `node:crypto`, `node:buffer`, `node:stream` 등을 점진적으로 지원하는 방식이다. 런타임의 미래는 "새로운 API"가 아니라 "기존 API의 어디서든 실행"일 수 있다.

### 4. 좁은 성공을 넓게 적용하지 마라

Middleware는 Edge의 성공 사례였다. 가볍고, DB가 필요 없고, 의존성이 적고, 모든 요청에 실행되므로 낮은 레이턴시가 중요하다. Edge Computing의 장점이 정확히 들어맞는 유스케이스다.

문제는 이 성공을 보고 "그러면 API Route도, SSR도 Edge에서 하면 되겠네?"라고 확장한 것이다. 하지만 Middleware가 성공한 조건 — DB 불필요, npm 의존성 최소, 가벼운 로직 — 은 대부분의 서버 사이드 코드에 해당하지 않는다. API Route는 DB에 접근해야 하고, SSR은 온갖 라이브러리를 사용한다.

이 패턴은 소프트웨어 엔지니어링에서 반복적으로 나타난다. 마이크로서비스가 Netflix에서 성공했다고 해서 10명짜리 팀에 마이크로서비스를 도입하는 것, 모노레포가 Google에서 성공했다고 해서 모든 조직에 모노레포를 적용하는 것. 특정 조건에서의 성공은 그 조건이 있었기 때문이지, 기술 자체가 범용적으로 우월하기 때문이 아니다. 기술을 도입하기 전에 "이 기술이 성공한 조건이 우리에게도 해당하는가?"를 먼저 물어야 한다.

## 결론

Next.js Edge Runtime의 역사는 "기술의 실패"가 아니라 "적용 범위의 과대확장과 축소"였다. Edge Computing 자체는 유효한 기술이고, Middleware, OG Image 생성, 정적 콘텐츠 서빙, Cloudflare의 Edge-native 스택에서 보듯 적절한 유스케이스에서는 여전히 강력하다. 문제는 특정 유스케이스에서의 성공을 범용 런타임으로 확장하려 했던 것이다.

우리가 기억해야 할 것은 이것이다: **기술의 가치는 그 기술이 해결하는 문제의 범위로 결정되는 것이지, 플랫폼이 부여하는 포지셔닝으로 결정되는 것이 아니다.** 다음에 또 특정 기술이 만능처럼 밀어질 때, Edge Runtime의 교훈을 떠올리면 된다.
