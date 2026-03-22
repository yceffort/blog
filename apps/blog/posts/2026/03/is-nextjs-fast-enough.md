---
title: 'Next.js의 성능은 충분히 빠른가'
tags:
  - nextjs
  - web-performance
  - react
  - ssr
  - benchmark
published: true
date: 2026-03-21 22:00:00
description: '벤치마크가 말해주는 불편한 진실'
thumbnail: '/thumbnails/2026/03/is-nextjs-fast-enough.png'
series: 'Next.js의 현주소'
seriesOrder: 4
---

## Table of Contents

## 서론

[이 시리즈](/2026/03/nextjs-edge-runtime-rise-and-fall)에서 지금까지 다뤘던 이야기를 정리하면 이렇다. Edge Runtime은 후퇴했고, Cloudflare는 Next.js를 직접 재구현하기 시작했으며, React의 거버넌스는 흔들리고 있다. 이번 글에서는 더 근본적인 질문을 던져본다. Next.js는 충분히 빠른가?

미리 말해두자면, 이 글의 결론은 "현재 시점에서 Next.js의 SSR 성능은 같은 React 생태계의 다른 프레임워크에 비해 뒤처진다"는 쪽이다. 하지만 그 결론을 먼저 믿고 근거를 끼워 맞추는 것이 아니라, 2026년 3월에 공개된 벤치마크 데이터를 하나씩 검토하면서 어디까지가 사실이고 어디서부터가 해석인지를 구분해 보려 한다. 데이터에 한계가 있는 곳은 그 한계도 함께 짚는다.

## Platformatic의 SSR 프레임워크 대결

2026년 3월 17일, Node.js TSC 멤버이자 Fastify 창시자인 Matteo Collina가 이끄는 [Platformatic](https://platformatic.dev/)이 [React SSR Framework Showdown](https://blog.platformatic.dev/react-ssr-framework-benchmark-tanstack-start-react-router-nextjs)이라는 벤치마크를 공개했다. 이 벤치마크가 주목할 만한 이유는 방법론의 공정성에 있다.

### 테스트 설계

동일한 이커머스 앱(카드 거래 마켓플레이스)을 세 프레임워크로 구현했다:

- **TanStack Start** (v1.157.16) — Vite 기반 SSR, `createFileRoute` + `loader`
- **React Router** (v7) — Route 모듈 + `loader` export
- **Next.js** (v15.5.5 → v16.2.0-canary.66) — App Router + Server Components

앱의 데이터 모델은 상당히 현실적이다. 5개 게임(포켓몬, MTG, 유희왕, 디지몬, 원피스), 50개 카드 세트(게임당 10개), 10,000개 카드(세트당 200개), 100명의 판매자, 50,000개 리스팅으로 구성되어 있다. 모든 프레임워크가 동일한 JSON 데이터를 사용하고, 1-5ms의 랜덤 지연을 추가해 실제 DB 레이턴시를 시뮬레이션했다. 부하 테스트 중에는 홈페이지, 검색, 게임 상세, 카드 상세, 판매자 목록 등의 라우트에 실제 이커머스 트래픽 비율을 반영한 분배를 적용했다.

인프라는 AWS EKS(m5.2xlarge 4노드, 노드당 8vCPU/32GB), 부하 테스트 도구는 Grafana k6, 테스트 머신은 c7gn.2xlarge(네트워크 최적화), 목표 부하는 **1,000 req/s**였다. 런타임은 두 가지로 테스트했는데, Node.js 단독(6 pod × 1 CPU)과 Platformatic Watt(3 pod × 2 CPU, `SO_REUSEPORT` 활용)으로, 총 CPU 할당량(6코어)은 동일하게 맞췄다.

그리고 중요한 설계 결정이 있다. **캐싱을 사용하지 않았다.** 이커머스에서 개인화와 A/B 테스트를 적극 운영하는 환경에서는 개별 사용자 뷰의 겹침이 5% 미만인 경우가 많아, 캐시 적중이 무효화 오버헤드 대비 이점이 거의 없기 때문이다. 캐싱 없는 순수 SSR 성능을 측정하는 것이 현실적이라는 판단이었다.

### 결과: Next.js 15의 참패

Next.js 15.5.5의 초기 결과는 충격적이었다.

| 지표          | TanStack Start | React Router | Next.js 15          |
| ------------- | -------------- | ------------ | ------------------- |
| 평균 응답시간 | 12.79ms        | 17ms         | 8,000~11,000ms      |
| 성공률        | 100%           | 100%         | ~60%                |
| p95 레이턴시  | < 50ms         | < 100ms      | 10,001ms (타임아웃) |

Next.js는 1,000 req/s를 감당하지 못했다. 응답시간이 평균 8~11초에 달했고, 요청의 약 40%가 10초 타임아웃에 걸려 실패했다. p95 레이턴시가 정확히 10,001ms인 것은 우연이 아니다 — 요청들이 타임아웃 한계에 부딪힌 것이다. TanStack Start와 React Router가 모든 요청을 밀리초 단위로 처리하는 동안, Next.js는 말 그대로 익사(drowning) 상태였다.

여기서 "성공"의 정의도 엄격했다. 10초 타임아웃 내에 HTTP 200을 반환하는 것이 기준이었다. 실제 프로덕션에서 사용자가 10초를 기다릴 리 없으니, 체감 성공률은 이보다 더 낮았을 것이다.

### Next.js 16 canary로의 개선

Platformatic 팀은 벤치마크 데이터와 [@platformatic/flame](https://github.com/platformatic/flame)으로 생성한 flamegraph를 Next.js 팀과 공유했다. Next.js의 Tim Neutkens는 flamegraph에서 `initializeModelChunk`라는 함수가 병목인 것을 발견했다. 이 부분은 뒤에서 자세히 다룬다.

수정이 반영된 Next.js 16.2.0-canary.66으로 재측정한 결과:

| 지표            | Next.js 15 (Watt) | Next.js 16 canary (Watt) | 개선율    |
| --------------- | ----------------- | ------------------------ | --------- |
| throughput      | 322 req/s         | 701 req/s                | **2.2배** |
| 평균 레이턴시   | 8,000~11,000ms    | —                        | —         |
| 중앙값 레이턴시 | —                 | 431ms                    | —         |
| 성공률          | ~60%              | ~64%                     | 소폭 개선 |
| 레이턴시 감소   | —                 | —                        | **83%**   |

Throughput은 2배 이상 늘었고, 성공한 요청의 레이턴시는 83% 줄었다. 의미 있는 개선이다. 하지만 여전히 요청의 약 36%가 실패했고, TanStack Start(13ms, 100% 성공)와의 격차는 컸다.

전체 순위를 정리하면 이렇다 (Watt 런타임 기준):

| 순위 | 프레임워크        | 평균 레이턴시  | 성공률 |
| ---- | ----------------- | -------------- | ------ |
| 1    | TanStack Start    | 12.79ms        | 100%   |
| 2    | React Router      | ~17ms          | 100%   |
| 3    | Next.js 16 canary | 431ms (중앙값) | ~64%   |

한 가지 유의할 점이 있다. Platformatic은 원문 상단에 "readers pointed out some inconsistencies in the code"라며 벤치마크 코드의 일부 불일치를 인정하고 결과 업데이트를 예고했다. 따라서 구체적인 수치보다는 프레임워크 간 상대적 격차의 방향성에 주목하는 것이 적절하다.

그럼에도 Platformatic의 핵심 결론은 명확했다:

> Framework Choice Matters More Than Runtime. The difference between TanStack Start and Next.js (3x throughput, 690x latency difference) far exceeds the difference between Watt and Node.js on the same framework.
>
> 프레임워크 선택이 런타임보다 중요하다. TanStack Start와 Next.js의 차이(throughput 3배, 레이턴시 690배)는 같은 프레임워크에서 런타임을 바꾸는 것(Watt vs Node.js)보다 훨씬 크다.

## 왜 느린가: Next.js App Router의 아키텍처적 무게

벤치마크 숫자만으로는 부족하다. **왜** 느린지를 이해해야 한다. Next.js App Router의 SSR 요청 처리 과정을 추적하면서 오버헤드가 어디서 발생하는지 분석해 보자.

### SSR 요청의 여정

Next.js App Router에서 하나의 SSR 요청이 처리되는 과정은 대략 이렇다:

```
요청 수신
  → 라우트 매칭 (파일시스템 기반 라우팅)
  → 레이아웃 트리 구성 (layout.tsx 중첩 해석)
  → Server Component 실행
    → 데이터 페칭 (fetch 자동 중복 제거, 캐시 확인)
    → React Element 트리 생성
  → Flight 직렬화 (컴포넌트 트리 → RSC Payload)
  → HTML 렌더링 (renderToReadableStream)
  → 스트리밍 응답 전송
```

이 파이프라인 자체는 합리적이다. 문제는 각 단계에 숨어 있는 오버헤드의 총합이다.

### 오버헤드 1: Flight 프로토콜과 이중 데이터(Double Data) 문제

React Server Components는 서버에서 렌더링한 컴포넌트 트리를 클라이언트로 전달하기 위해 [Flight](https://github.com/facebook/react/tree/main/packages/react-server)라는 자체 직렬화 프로토콜을 사용한다. Flight는 라인 기반의 스트리밍 포맷으로, 각 라인이 `<chunkId>:<payloadMarker><serializedData>` 형태를 가진다.

예를 들어, 간단한 Server Component의 렌더링 결과가 이렇다면:

```jsx
// Server Component
export default async function Page() {
  const products = await getProducts()
  return (
    <main>
      <h1>Products</h1>
      <ProductList items={products} /> {/* Client Component */}
    </main>
  )
}
```

Next.js는 이 결과를 **두 가지 형태로 동시에** 전송한다:

1. **HTML** — 브라우저가 즉시 렌더링할 수 있는 마크업
2. **RSC Payload** — React가 클라이언트에서 Virtual DOM을 재구축하고 hydration을 수행하기 위한 데이터

HTML이 `<main><h1>Products</h1><div>...</div></main>` 형태라면, RSC Payload에는 같은 구조가 Flight 포맷으로 다시 한번 인코딩된다. 여기에 Client Component(`ProductList`)에 전달되는 `items` props까지 직렬화되어 포함된다.

이 이중 데이터 문제의 실제 영향은 상당하다:

- 커뮤니티 보고에 따르면, RSC payload가 전체 HTML 페이지 크기의 상당 부분을 차지하는 경우가 많다. 다만 이 비율은 앱의 구조와 데이터 양에 따라 크게 달라지므로, [Vercel의 RSC payload 최적화 가이드](https://vercel.com/kb/guide/how-to-optimize-rsc-payload-size)에서 제시하는 방법으로 직접 측정해보는 것이 정확하다
- [eknkc/ssr-benchmark](https://github.com/eknkc/ssr-benchmark)의 측정에서도 이 문제가 드러난다: Next.js App Router의 응답 크기는 **284.64KB**인 반면, 순수 React는 **97.28KB**, Remix는 **189.10KB**다

eknkc 벤치마크에서는 이 현상을 "데이터 중복 계수(duplication factor)"로 정량화했다. hydration이 필요한 프레임워크는 렌더링된 각 데이터 항목이 응답에서 두 번 관찰되는 **x2.00** 중복이 발생한다. RSC 구현체인 mfng의 경우 중복이 **x2.50**까지 올라간다. HTML과 Flight Payload라는 두 개의 서로 다른 포맷으로 같은 정보를 보내기 때문에, 중복이 눈에 잘 띄지 않을 뿐 대역폭에는 분명한 영향을 미친다.

물론 Server Component 코드 자체는 클라이언트 번들에 포함되지 않으므로 JavaScript 번들 크기는 줄어든다. 하지만 그 대가로 RSC Payload라는 새로운 전송 비용이 생긴다. 번들 크기와 전송 크기는 별개의 문제다.

### 오버헤드 2: `initializeModelChunk`와 JSON.parse reviver

Platformatic의 flamegraph에서 가장 넓은 블록으로 드러난 병목이 바로 `initializeModelChunk`다. 이 함수는 서버에서 전송된 RSC Flight 청크를 JavaScript 객체로 역직렬화하는 역할을 한다. 그리고 이 함수의 핵심에 `JSON.parse(text, reviver)` 호출이 있었다.

문제를 이해하려면 V8이 `JSON.parse`를 어떻게 처리하는지 알아야 한다.

V8의 `JSON.parse`는 C++로 구현되어 있다([v8/src/json/json-parser.cc](https://github.com/v8/v8/blob/main/src/json/json-parser.cc)). reviver 없이 호출하면 C++ 내부에서 파싱이 완료되고, 최종 JavaScript 객체만 반환된다. C++↔JS 경계를 **한 번만** 넘는다.

하지만 reviver 콜백을 전달하면 상황이 완전히 달라진다. V8은 파싱된 JSON의 **모든 키-값 쌍에 대해** reviver 함수를 호출해야 한다. 매 호출마다 다음이 발생한다:

1. C++ 실행 컨텍스트에서 JavaScript 실행 컨텍스트로 전환
2. reviver 함수 호출
3. JavaScript 실행 컨텍스트에서 다시 C++ 실행 컨텍스트로 복귀

이 경계 교차(boundary crossing)의 비용은 reviver 함수가 무엇을 하는지와 무관하다. 아무것도 하지 않는 `(k, v) => v`조차 이 비용을 피할 수 없다. [React PR #35776](https://github.com/facebook/react/pull/35776)에서 제시된 벤치마크가 이를 명확히 보여준다:

| 페이로드 크기         | `JSON.parse(text)` | `JSON.parse(text, (k,v) => v)` | reviver 오버헤드 |
| --------------------- | ------------------ | ------------------------------ | ---------------- |
| 108KB (1000행 테이블) | 0.60ms             | 2.95ms                         | **391%**         |

108KB 페이로드에서 trivial reviver만 추가해도 파싱 시간이 **약 4배**로 뛴다. 그리고 RSC에서는 `initializeModelChunk`가 **모든 Server Component 청크마다** 호출되므로, 컴포넌트가 많고 props가 큰 페이지에서 이 오버헤드가 급격히 누적된다.

이전 React의 구현에서 reviver가 필요했던 이유는, RSC Flight 포맷에서 `$`로 시작하는 특수 문자열(모듈 참조, Promise, lazy 등)을 만나면 별도 처리가 필요했기 때문이다. 변경의 핵심을 의사코드로 단순화하면 이렇다 (실제 PR의 코드는 [facebook/react#35776](https://github.com/facebook/react/pull/35776)에서 확인할 수 있다):

```javascript
// 변경 전 (의사코드): JSON.parse에 reviver 전달
// → 모든 키-값 쌍마다 C++↔JS 경계 교차 발생
const model = JSON.parse(payload, function reviver(key, value) {
  if (typeof value === 'string' && value[0] === '$') {
    return parseModelString(value, ...)
  }
  return value
})
```

```javascript
// 변경 후 (의사코드): 2단계 접근
// 1단계: C++에서 순수 파싱 (경계 교차 1회)
const model = JSON.parse(payload)

// 2단계: JavaScript에서 필요한 노드만 순회하며 변환
function reviveModel(value) {
  if (typeof value === 'string') {
    if (value[0] === '$') return parseModelString(value, ...)
    return value  // 대부분의 문자열은 여기서 즉시 반환
  }
  if (typeof value === 'object' && value !== null) {
    for (const key in value) {
      value[key] = reviveModel(value[key])
    }
  }
  return value
}
reviveModel(model)
```

핵심 차이는 두 가지다:

1. **C++↔JS 경계 교차가 2회로 고정된다.** 페이로드 크기에 비례하지 않는다.
2. **short-circuit 최적화가 가능하다.** 대부분의 문자열은 CSS 클래스명이나 텍스트 콘텐츠처럼 `$`로 시작하지 않으므로, 첫 글자만 확인하고 건너뛸 수 있다.

PR에서 제시된 벤치마크 결과:

| 페이로드              | Before   | After    | 개선율  |
| --------------------- | -------- | -------- | ------- |
| Small (142B)          | 0.0024ms | 0.0007ms | 72%     |
| Medium (914B)         | 0.0116ms | 0.0031ms | 73%     |
| Large (16.7KB)        | 0.1836ms | 0.0451ms | 75%     |
| XL (25.7KB)           | 0.3742ms | 0.0913ms | 76%     |
| 1000행 테이블 (110KB) | 3.0862ms | 0.6887ms | **78%** |

페이로드가 클수록 개선 폭이 커진다. 110KB에서 78% 개선이라는 것은, 기존 구현에서 경계 교차 비용이 얼마나 지배적이었는지를 보여준다. 파싱 로직 자체는 경량인데 매번 C++↔JS를 오가는 비용이 전체를 지배하고 있었던 것이다.

실제 Next.js 앱에서의 효과도 PR에서 측정되었다. nested Suspense가 있는 페이지에서 평균 렌더링 시간이 78ms → 59ms(**24% 개선**), 이중 중첩 레벨에서는 169ms → 134ms(**21% 개선**)를 보였다.

참고로 이 수정은 React 코어에 반영되었으므로, Next.js뿐 아니라 RSC를 사용하는 **모든 프레임워크**가 혜택을 받는다.

### 오버헤드 3: 프레임워크 레이어의 누적된 무게

`JSON.parse` reviver가 flamegraph에서 확인된 가장 극적인 단일 병목이었다면, 나머지 오버헤드에 대해서는 아키텍처적 추론에 의존할 수밖에 없다. Next.js가 요청마다 수행하는 작업들을 나열하면:

- **파일시스템 기반 라우팅**: 요청 URL을 `app/` 디렉토리의 파일 구조와 매칭. layout, template, loading, error 등의 파일 규약을 해석하고 중첩 레이아웃 트리를 구성
- **fetch 자동 중복 제거와 캐시**: 같은 요청의 fetch를 자동으로 중복 제거하고, 캐시 전략(`force-cache`, `no-store`)을 적용하는 로직
- **Metadata API**: `generateMetadata` 함수 실행, 중첩된 레이아웃의 메타데이터 병합
- **스트리밍 파이프라인**: Suspense 경계를 감지하고, `$RC()` 함수와 `<template>` 태그를 활용한 비순차 스트리밍(out-of-order streaming) 조율
- **Client Component 참조 관리**: `'use client'` 경계를 넘는 모든 컴포넌트와 props의 직렬화 관리

이 각각이 전체 오버헤드에서 얼마를 차지하는지는 프로파일링 데이터 없이는 단정할 수 없다. 다만 이것들이 **모든 SSR 요청마다** 실행되는 반면, TanStack Start나 React Router 같은 더 얇은 프레임워크에서는 이런 레이어가 최소화되어 있다는 것은 아키텍처적으로 분명하다. eknkc 벤치마크에서 React(1.3ms) → Next.js App Router(18.7ms)로 약 17ms가 추가되는데, `JSON.parse` reviver 수정이 약 75%의 개선을 가져왔다는 것은 이 17ms 중 상당 부분이 RSC 역직렬화에 집중되어 있었음을 시사한다.

## Next.js 16.2의 공식 벤치마크

2026년 3월 18일에 공개된 [Next.js 16.2 릴리스 블로그](https://nextjs.org/blog/next-16-2)에서는 위 `JSON.parse` 수정의 실제 영향을 공식 수치로 제시했다.

| 시나리오                              | Before | After | 개선율  |
| ------------------------------------- | ------ | ----- | ------- |
| Server Component Table (1000 items)   | 19ms   | 15ms  | 26%     |
| Server Component with nested Suspense | 80ms   | 60ms  | 33%     |
| Payload CMS 홈페이지                  | 43ms   | 32ms  | 34%     |
| Payload CMS (rich text)               | 52ms   | 33ms  | **60%** |

RSC payload가 클수록 개선 폭이 커진다는 패턴이 다시 확인된다. Payload CMS의 rich text 페이지는 문자열 비율이 높은 대형 payload를 생성하는데, 여기서 60%라는 가장 큰 개선이 나왔다. 이는 기존의 reviver 방식에서 모든 문자열마다 C++↔JS 경계를 넘었던 비용이 얼마나 컸는지를 방증한다.

Vercel이 공식적으로 표현한 개선율은 "RSC payload deserialization이 최대 **350% 빨라짐**", 실제 앱 기준 "**25-60% faster rendering to HTML**"이다.

Next.js 16.2에는 이 외에도:

- `next dev` 시작 속도 **~400% 향상** (같은 프로젝트에서 16.1 대비 87% 빠름)
- `ImageResponse` 기본 이미지 **2배**, 복잡한 이미지 최대 **20배** 빨라짐
- `next start --inspect`로 프로덕션 서버에 Node.js 디버거 연결 가능

등이 포함되었다. 성능 개선에 상당한 리소스를 투입하고 있다는 것은 분명하다.

## 마이크로벤치마크: 렌더링 오버헤드의 해부

Platformatic 벤치마크가 실제 앱 수준의 부하 테스트였다면, [eknkc/ssr-benchmark](https://github.com/eknkc/ssr-benchmark)는 프레임워크의 순수 렌더링 성능만을 측정하는 마이크로벤치마크다.

**중요한 주의사항:** 이 벤치마크의 마지막 커밋은 2024년 4월이다. 따라서 테스트된 Next.js 버전은 v14~v15 초기일 가능성이 높으며, Next.js 16.2의 RSC 역직렬화 개선이 반영되지 않았다. 아래 수치는 "개선 전" 기준으로 읽어야 한다. 그래도 프레임워크 간 상대적 오버헤드의 구조적 차이를 파악하는 데는 유용하다.

테스트 환경은 다음과 같다:

- Node.js v20.6.1, MacBook Pro M1 Pro
- HTTP 오버헤드 완전 제거 (모의 요청/응답 사용)
- 테스트 시나리오: 1000행 테이블, 각 행에 UUID 2열
- Next.js의 라우트 캐시 비활성화 (`export const dynamic = 'force-dynamic'`)
- 비동기 데이터 로딩 포함 (Suspense 또는 loader 활용)

### 프레임워크 벤치마크

| 프레임워크      | ops/sec | 평균(ms) | 응답 크기(KB) | React 대비 | 중복 계수 |
| --------------- | ------- | -------- | ------------- | ---------- | --------- |
| React (기준선)  | 766     | 1.305    | 97.28         | 1x         | —         |
| SvelteKit       | 589     | 1.696    | 184.46        | 1.30x      | x2.00     |
| Remix           | 449     | 2.224    | 189.10        | 1.71x      | x2.00     |
| Nuxt            | 381     | 2.622    | 201.12        | 2.01x      | x2.00     |
| Qwik City       | 278     | 3.584    | 139.21        | 2.76x      | x1.00     |
| Next.js (Pages) | 104     | 9.590    | 187.67        | **7.37x**  | x2.00     |
| Astro           | 99      | 10.077   | 99.91         | 7.74x      | x1.00     |
| mfng (RSC)      | 69      | 14.372   | 317.31        | 11.10x     | x2.50     |
| Next.js (App)   | 53      | 18.673   | 284.64        | **14.45x** | —         |

몇 가지 눈에 띄는 점이 있다.

**첫째, Next.js App Router는 Pages Router보다도 2배 느리다.** App Router(18.673ms)가 Pages Router(9.590ms)보다 거의 2배 느린 것은 RSC가 추가하는 오버헤드의 직접적 증거다. 같은 Next.js 프레임워크 내에서도 App Router를 선택하는 것만으로 성능이 절반으로 줄어든다.

**둘째, 응답 크기가 말해주는 것.** Next.js App Router의 응답은 284.64KB인데, 순수 React의 97.28KB 대비 약 2.92배다. RSC 구현체인 mfng는 317.31KB로 더 크다. 이것이 앞서 설명한 이중 데이터 문제의 직접적 수치다. 흥미롭게도 Qwik(139.21KB, 중복 x1.00)과 Astro(99.91KB, 중복 x1.00)는 hydration 데이터를 보내지 않아 응답이 작다.

**셋째, 격차의 크기가 비상식적이다.** SvelteKit은 1.30배, Remix는 1.71배의 오버헤드만 가진다. 프레임워크 레이어가 추가하는 오버헤드가 30-70%라면 합리적인 범위다. 하지만 Next.js App Router의 14.45배는 차원이 다른 수준이다.

### 렌더러 벤치마크

프레임워크 전체가 아닌 렌더링 엔진만 분리해서 비교한 결과도 있다:

| 렌더러     | ops/sec | 평균(ms) | Marko 대비 |
| ---------- | ------- | -------- | ---------- |
| Marko      | 6,675   | 0.150    | 1x (기준)  |
| Kita (JSX) | 3,074   | 0.325    | 2.17x      |
| Hono JSX   | 945     | 1.058    | 7.06x      |
| Vue        | 897     | 1.114    | 7.44x      |
| React      | 764     | 1.308    | 8.74x      |
| Qwik       | 622     | 1.605    | 10.73x     |
| Solid      | 613     | 1.630    | 10.89x     |

React의 순수 렌더링 성능(1.308ms)은 프레임워크들 사이에서 중간 정도다. Marko(0.150ms)나 Kita(0.325ms)와는 큰 차이가 있지만, Vue(1.114ms)와는 비슷하다. 즉, React 자체의 렌더링 속도는 합리적인 범위인데, Next.js가 그 위에 쌓는 레이어가 1.3ms를 18.7ms로 만들고 있다는 것이다.

## TanStack Start: 같은 React 위에서 어떻게 5.5배를 달성했나

Next.js의 성능 문제가 React 자체의 한계인지, 아니면 Next.js 프레임워크 레이어의 문제인지를 판단하려면 대조군이 필요하다. TanStack Start가 바로 그 역할을 한다. 같은 React 19 위에서 동작하지만 RSC를 사용하지 않는 SSR 프레임워크다.

TanStack Start 역시 초기 벤치마크(v1.150.0)에서는 좋지 않았다. 평균 응답시간 3초 이상, p95 레이턴시 10,001ms(타임아웃), 성공률 75%로 고전했다. 하지만 Platformatic이 공유한 flamegraph를 기반으로 7개 마이너 버전 만에 극적인 개선을 이뤄냈다.

TanStack 팀이 [공개한 최적화 과정](https://tanstack.com/blog/tanstack-start-5x-ssr-throughput)에서 발견된 4가지 병목과 수정 방법은, SSR 성능 최적화의 교과서적 사례다:

### 1. URL 파싱의 오버헤드

이커머스 앱에는 링크가 많다. 상품 목록, 카테고리 네비게이션, 판매자 링크 — 한 페이지에 수십~수백 개의 링크가 있을 수 있다. TanStack Router는 각 링크마다 `new URL()`을 생성하고 있었는데, URL 생성은 WHATWG URL 스펙을 완전히 파싱하는 비싼 연산이다.

수정은 간단했다. 값이 명백히 내부 링크인지(절대 경로 `/`로 시작하는지) 먼저 확인하고, 외부 URL일 때만 `URL` 객체를 생성하도록 변경했다.

### 2. SSR에서 불필요한 반응성(reactivity)

TanStack Router는 클라이언트에서의 상태 관리를 위해 스토어 구독, 구조적 공유(structural sharing), 업데이트 배칭 등의 반응성 시스템을 내장하고 있다. 하지만 SSR은 요청당 **한 번만** 렌더링한다. 상태가 변경될 일이 없으므로 구독도, 배칭도, 구조적 공유도 전부 불필요한 CPU 사이클이다.

빌드타임 `isServer` 플래그를 도입하여 서버에서는 이 작업들을 완전히 건너뛰도록 했다. 번들러가 dead code elimination으로 클라이언트 빌드에서는 이 분기를 제거하므로, 클라이언트 성능에는 영향이 없다.

### 3. 서버 전용 빠른 경로(fast path)

위의 `isServer` 패턴을 더 적극적으로 활용했다. 빌드타임 상수로 보호된 서버 전용 코드 경로를 추가하여, 서버에서만 실행되는 최적화된 로직을 별도로 구현했다. 이것만으로 서버 throughput이 **25%** 향상되었다.

### 4. `delete` 연산의 V8 최적화 파괴

이것은 특히 흥미로운 발견이다. JavaScript에서 `delete obj.key`는 단순히 프로퍼티를 제거하는 것이 아니다. V8은 객체의 프로퍼티 구조를 hidden class(또는 Map/Shape)라는 내부 메타데이터로 관리하는데, `delete`는 이 hidden class를 변경하여 V8의 인라인 캐시(IC) 최적화를 무효화한다. 이후 해당 객체에 대한 모든 프로퍼티 접근이 느려진다.

`delete obj.key` 대신 `obj.key = undefined`로 변경하자 `startViewTransition` 메서드의 CPU 시간이 **50% 이상** 감소했다.

이 네 가지 수정의 결과:

| 지표          | v1.150.0  | v1.157.16   | 개선율    |
| ------------- | --------- | ----------- | --------- |
| throughput    | 427 req/s | 2,357 req/s | **5.5배** |
| 평균 레이턴시 | 424ms     | 43ms        | **9.9배** |
| p99 레이턴시  | 6,558ms   | 928ms       | 7.1배     |
| 성공률        | 99.96%    | 100%        | —         |

Platformatic의 독립 벤치마크에서도 동일한 결론이 나왔다. 같은 부하에서 성공률이 75.5% → 100%, 평균 레이턴시가 3,171ms → 13.7ms로 개선되었다.

핵심은 이 모든 개선이 **같은 React 19 위에서**, 프레임워크 레이어의 최적화만으로 달성되었다는 점이다. React 자체가 느린 게 아니라, 프레임워크가 React 위에 얼마나 효율적인 레이어를 쌓느냐가 성능을 결정한다.

다만, 이 비교에는 구조적 한계가 있다. TanStack Start에서 발견된 병목(URL 파싱, 불필요한 반응성, `delete` 연산)은 TanStack Router 고유의 문제였고, Next.js에 같은 종류의 병목이 있다는 뜻이 아니다. Next.js의 주요 병목은 RSC 역직렬화(`initializeModelChunk`)처럼 RSC라는 근본적으로 다른 아키텍처에서 비롯된다. "TanStack이 빠르게 고쳤으니 Next.js도 그럴 수 있다"고 단순 비교할 수는 없다 — RSC의 이중 직렬화 파이프라인은 URL 파싱 최적화와는 난이도가 다른 문제다.

그럼에도 이 사례가 의미 있는 이유는, 같은 React 위에서도 프레임워크 설계에 따라 SSR 성능이 자릿수 단위로 달라질 수 있다는 것을 실증했기 때문이다.

## RSC는 정말 성능을 개선하는가

React Server Components의 기본 전제는 "서버에서 더 많은 작업을 하고, 클라이언트에 보내는 JavaScript를 줄여서 성능을 개선한다"는 것이다. [Nadia Makarevich의 실측 연구](https://www.developerway.com/posts/react-server-components-performance)는 이 전제를 냉정하게 검증한다.

### 실측 결과

| 렌더링 방식                      | LCP (캐시 없음) | LCP (캐시 있음) |
| -------------------------------- | --------------- | --------------- |
| CSR (클라이언트 렌더링)          | 4.1s            | 800ms           |
| SSR + 클라이언트 데이터 페칭     | 1.61s           | 800ms           |
| Next.js Pages (서버 데이터 페칭) | 2.15s           | 1.15s           |
| Next.js App Router + Suspense    | **1.28s**       | **750ms**       |

App Router + Suspense 조합이 가장 좋은 LCP를 보여준다. 하지만 이 숫자만 보면 안 된다. 핵심적인 조건과 비용이 숨어 있다.

### RSC 단독으로는 성능 개선이 없다

Server Components를 도입하는 것만으로는 아무것도 달라지지 않는다. 위의 1.28s라는 LCP를 얻으려면 **Suspense 경계와 함께 데이터 페칭 구조를 완전히 재설계**해야 한다. 데이터 페칭이 관련되지 않은 페이지에서는 기존 SSR과 성능이 동일하다.

그리고 Suspense를 잘못 배치하면 오히려 성능이 **악화**될 수 있다. 느린 Server Component가 Suspense 경계 없이 다른 컴포넌트 위에 위치하면 전체 스트림이 차단된다. "가장 느린 요리가 나올 때까지 식사를 할 수 없는" 상황이다.

### 비대화형 구간(Non-Interactive Gap)

간과되기 쉬운 점이 있다. 서버 렌더링으로 화면은 빨리 보이지만, JavaScript가 로드되어 hydration이 완료될 때까지 **페이지는 상호작용할 수 없다.** Makarevich의 측정에서 이 비대화형 구간은 **2.52초**에 달했다. LCP가 1.28초라 화면은 빠르게 보이지만, 사용자가 보이는 버튼을 클릭해도 2초 이상 아무 반응이 없는 것이다.

RSC의 선택적 hydration(Client Component만 hydrate)이 이 문제를 완화하지만, 완전히 해결하지는 못한다. 그리고 이 비대화형 시간은 클라이언트 번들 크기와 클라이언트 기기 성능에 의존하므로, 서버 최적화로는 줄일 수 없는 영역이다.

### `'use client'` 경계 관리의 어려움

실무에서 RSC의 성능 이점을 온전히 누리기 어려운 이유 중 하나는 `'use client'` 경계 관리다. 공유 파일 상단에 `'use client'`를 추가하면, 그 파일과 모든 import가 클라이언트 컴포넌트로 승격된다.

이것 자체는 RSC의 결함이라기보다 컴포넌트 설계의 문제다. 직접 작성하는 컴포넌트는 Server Component로 유지할 수 있고, Client Component를 최소 단위로 분리하면 경계를 잘 관리할 수 있다. 하지만 현실적으로 MUI, Chakra 같은 서드파티 UI 라이브러리를 사용하면 해당 컴포넌트 트리 전체가 클라이언트로 내려간다. 라이브러리 생태계가 RSC에 아직 완전히 적응하지 못한 과도기적 문제이긴 하나, "RSC를 도입하면 자동으로 번들이 줄어든다"는 기대와 현실 사이에 괴리가 있다는 점은 인지해야 한다.

### 서버 비용의 현실

RSC를 도입하면 서버가 더 많은 일을 한다. 이전에 클라이언트 API 호출로 처리하던 데이터 페칭이 모든 SSR 요청에 포함된다. [GitHub 디스커션 #86081](https://github.com/vercel/next.js/discussions/86081)에서는 "서버 렌더링 오버헤드는 DB + 비즈니스 로직 비용 대비 소수 퍼센트 수준"이라는 반론도 있다. JSP, PHP, Rails도 매 요청마다 HTML을 생성했지만 문제없이 동작했다는 논리다.

하지만 이 주장에는 전제가 있다. 충분한 서버 리소스와 적절한 캐싱이 있을 때의 이야기다. Platformatic 벤치마크에서 Next.js가 1,000 req/s에서 무너진 것은, "소수 퍼센트"의 오버헤드가 부하 상황에서 눈덩이처럼 불어나는 현실을 보여준다.

## Next.js 16 업그레이드의 숨겨진 비용

성능 개선만 있는 것은 아니다. Next.js 15에서 16으로 업그레이드한 후 예상치 못한 문제를 경험한 사례도 있다.

### 세그먼트별 프리페치의 대가

[GitHub 이슈 #85470](https://github.com/vercel/next.js/issues/85470)에서 보고된 내용에 따르면, Next.js 16은 세그먼트별 프리페치(per-segment prefetching) 방식을 도입했다. 이전에는 하나의 라우트에 대해 하나의 프리페치 요청을 보냈지만, 이제는 라우트 트리의 각 세그먼트(layout, page)에 대해 **개별 요청**을 보낸다. 이론적으로는 공유 레이아웃을 한 번만 fetch하고 재사용할 수 있어 캐시 효율이 높아진다.

하지만 현실은 달랐다:

- 한 사용자는 요청 수가 **약 700% 증가**
- Edge Request 기준으로 월 **$800 이상**의 추가 비용 발생
- 의도치 않게 큰 청구서를 받은 사용자가 Vercel에서 25% 환급을 받은 사례
- 정적 내보내기 사용자의 빌드 파일 수가 급증하여 배포 시간이 **2분 → 10분**으로 증가

Vercel의 공식 설명은 "더 많은 개별 프리페치 요청이 발생하지만, 전체 전송량은 감소한다"는 트레이드오프라는 것이었다. 전송량이 줄어들어도, 요청 수 기반으로 과금되는 환경에서는 이 트레이드오프가 비용 폭탄으로 돌아온다. 많은 개발자가 Next.js 15로 다운그레이드했다.

Next.js 16.2에서는 이 문제의 대안으로 [`experimental.prefetchInlining`](https://nextjs.org/blog/next-16-2) 옵션이 추가되었다. 이 옵션을 켜면 하나의 라우트에 대한 모든 세그먼트 데이터를 단일 응답으로 번들링한다. 요청 수는 줄지만, 공유 레이아웃 데이터가 중복 전송되는 트레이드오프가 있다. 아직 실험적 옵션이다.

### 메모리: 또 다른 성능 지표

[BeyondIT의 비교 분석](https://beyondit.blog/blogs/nextjs-16-vs-tanstack-start-data-comparison)에서는 Next.js 16의 메모리 문제를 다음과 같이 보고하고 있다. 단, 이 수치들은 해당 블로그의 단일 출처에 의존하며 독립적으로 검증되지 않았으므로 참고 수준으로 읽어야 한다:

- 개발 환경에서 Next.js 프로세스가 **9-10GB**까지 메모리를 소비
- 프로덕션 Kubernetes 환경에서 지속적인 메모리 증가로 **OOMKilled** 빈번 발생
- RSC 오버헤드와 캐시 컨트롤러의 객체 보유가 메모리 누수의 원인으로 지목

개발 경험 비교 수치도 같은 출처에서 제시된 것이다:

| 지표                | Next.js 16 | TanStack Start |
| ------------------- | ---------- | -------------- |
| 개발 서버 초기 로드 | 10-12초    | 2-3초          |
| HMR (RSC 활성화)    | ~836ms     | ~335ms         |
| CI 빌드 속도        | 기준       | **7배 빠름**   |

## 그래서, 충분히 빠른가

이 글에서 다룬 데이터를 종합해 보자.

### 개선된 것

- RSC 역직렬화 **최대 78%** 빨라짐 — `JSON.parse` reviver 제거 (React 코어)
- Next.js 16.2에서 실제 렌더링 **25-60% 향상** (공식 벤치마크)
- v15 → v16 canary에서 throughput **2.2배**, 레이턴시 **83% 감소** (Platformatic 벤치마크)
- `next dev` 시작 속도 **~400% 향상**

### 여전히 남은 것

- 1,000 req/s 부하에서 성공률 **~64%** (TanStack Start: 100%, React Router: 100%)
- 프레임워크 오버헤드: React 기준선 대비 **14.45배** (eknkc 마이크로벤치마크, 2024년 측정 — Next.js 16.2 개선 미반영)
- 같은 Next.js 내에서도 App Router가 Pages Router보다 **2배 느림** (위와 동일 시점)
- 응답 크기: 순수 React(97KB) 대비 **284KB** — 이중 데이터 문제
- 캐싱 없이는 고부하를 감당하지 못함
- 세그먼트별 프리페치로 인한 요청 수 **700% 증가** 사례
- 개발 환경 메모리 **9-10GB**, 프로덕션 OOMKilled 보고 (단일 출처, 독립 검증 필요)

### 데이터의 한계

결론을 내리기 전에, 이 글에서 인용한 데이터의 한계를 명확히 짚어야 한다.

**Platformatic 벤치마크**는 가장 최신이고 가장 현실적인 테스트지만, 원문 스스로 "코드 불일치가 지적되어 결과를 업데이트할 예정"이라고 밝혔다. 구체적인 수치는 변할 수 있다.

**eknkc 마이크로벤치마크**는 2024년 4월이 마지막 업데이트로, 테스트된 Next.js는 v14~v15 초기다. 이 글에서 여러 번 인용한 "14.45배"는 `JSON.parse` reviver 수정(2026년 2월) 이전의 수치다. Next.js 16.2 이후 이 격차가 구체적으로 얼마나 줄었는지는 아직 측정되지 않았다. 따라서 "14.45배"는 구조적 문제의 존재를 보여주는 참고치로만 읽어야 하며, 현재 버전의 정확한 오버헤드를 대표하지 않는다.

**BeyondIT 비교**(메모리 9-10GB, CI 7배 등)는 단일 서드파티 블로그 출처로, 독립적으로 검증되지 않았다.

### 결론

이 글의 데이터가 말해주는 것을 정리하면 이렇다.

**확실한 것:** Next.js의 SSR 성능은 같은 React 생태계의 TanStack Start, React Router에 비해 뒤처진다. 이것은 Platformatic 벤치마크(2026년 3월, Next.js 16 canary)에서 확인된 사실이다. 1,000 req/s 부하에서 TanStack Start는 13ms/100% 성공, Next.js는 431ms 중앙값/64% 성공이었다.

**구조적 원인이 있다:** 이 격차의 상당 부분은 RSC 아키텍처에서 비롯된다. Flight 프로토콜의 이중 데이터 전송, `initializeModelChunk`의 역직렬화 비용(수정되었지만 구조는 남아있다), 프레임워크 레이어의 누적 오버헤드가 원인이다. RSC를 사용하지 않는 TanStack Start나, RSC 이전의 Pages Router가 더 빠른 것이 이를 뒷받침한다.

**빠르게 개선되고 있다:** v15 → v16 canary에서 throughput 2.2배, 레이턴시 83% 감소. React 코어에 직접 성능 수정을 기여하는 적극적인 자세. 이 궤적이 계속된다면 격차는 줄어들 것이다.

### "캐싱을 쓰면 되지 않느냐"

이것은 독자가 가장 먼저 던질 반론이고, 정직하게 다룰 필요가 있다.

맞다, 캐싱은 강력하다. Next.js는 ISR, `stale-while-revalidate`, 컴포넌트 캐싱(`experimental.cacheComponents`) 등 정교한 캐싱 프리미티브를 제공하고, 이것들을 적절히 활용하면 SSR 오버헤드의 대부분을 회피할 수 있다. 대다수의 프로덕션 Next.js 앱은 이미 캐싱을 적극적으로 사용하고 있고, 그 환경에서는 이 글에서 다룬 수준의 성능 문제를 체감하지 못할 가능성이 높다.

Platformatic이 캐싱을 배제한 이유 — "이커머스 개인화 환경에서는 캐시 적중률이 5% 미만" — 도 특정 시나리오에 한정된 이야기다. 모든 이커머스가 그 수준의 개인화를 하는 것은 아니며, 콘텐츠 사이트나 문서 사이트에서는 캐싱이 매우 효과적이다.

그럼에도 캐싱이 이 문제를 완전히 해소하지는 못한다고 보는 이유가 세 가지 있다.

**첫째, 캐싱은 SSR 성능을 "해결"하는 게 아니라 "우회"하는 것이다.** 캐시 미스가 발생하면 — 그리고 프로덕션에서 캐시 미스는 반드시 발생한다 — 사용자가 체감하는 것은 캐싱되지 않은 SSR의 성능이다. 캐시 적중률이 95%인 사이트에서도 나머지 5%의 사용자는 느린 응답을 받는다. 프레임워크의 기저 성능이 좋을수록 이 5%도 양호한 경험을 얻는다.

**둘째, 캐싱 전략은 복잡도를 추가한다.** ISR의 재검증 주기 설정, 동적/정적 경계 결정, 개인화된 콘텐츠의 캐시 무효화 — 이것들은 올바르게 설정하기 어렵고, 잘못 설정하면 스테일 데이터나 캐시 불일치 문제를 일으킨다. 캐싱이 아닌 기저 성능으로 충분하다면, 이 복잡도 자체가 불필요하다.

**셋째, 동일한 캐싱 전략을 다른 프레임워크에도 적용할 수 있다.** 캐싱으로 Next.js가 빨라진다면, 같은 캐싱을 TanStack Start에 적용하면 더 빨라진다. 캐싱은 모든 프레임워크에 공평한 승수이므로, 프레임워크 간 기저 성능 차이를 정당화하는 논거가 되기 어렵다.

### 이 벤치마크가 의미 있는 경우와 아닌 경우

Platformatic 벤치마크의 조건을 다시 보자. 6 CPU 코어에서 1,000 req/s, 캐싱 없음. Next.js 16 canary는 이 조건에서 701 req/s만 성공시켰다. 코어당 약 117 req/s의 성공 throughput이다.

이 조건이 자신의 프로덕션과 무관하다면 — 예를 들어 정적 생성이 주력이거나, ISR로 대부분의 요청을 캐시에서 처리하거나, 동시 접속이 충분히 낮다면 — 이 글의 숫자들은 참고 수준이다. 대부분의 Next.js 앱은 이 범주에 속할 것이고, 그 환경에서 Next.js는 충분히 잘 동작한다.

하지만 다음 조건이 겹친다면 이 데이터를 진지하게 고려해야 한다:

- **동적 SSR 비율이 높다**: 개인화, A/B 테스트, 실시간 데이터로 인해 캐싱 가능한 비율이 낮다
- **레이턴시 SLA가 엄격하다**: p95 응답시간 500ms 이내 같은 기준이 있다
- **트래픽 스파이크가 빈번하다**: 프로모션, 이벤트 등으로 순간 부하가 급증한다

이 세 가지가 겹치는 환경에서 캐시 미스 트래픽이 코어당 100 req/s를 넘긴다면, Platformatic 벤치마크의 시나리오와 직접적으로 관련이 있다. 이 경우 TanStack Start나 React Router를 대안으로 검토하는 것이 합리적이다.

물론 이 숫자는 Platformatic의 특정 테스트 앱과 인프라에서 나온 것이므로, 정확한 임계값은 자신의 앱으로 직접 부하 테스트를 해봐야 한다. 이 글이 제공하는 것은 임계값이 아니라 방향성이다 — Next.js의 캐싱되지 않은 SSR 성능에는 구조적 비용이 있고, 그 비용이 문제가 되는 조건이 존재한다는 것.

Next.js 팀이 React 코어에 직접 성능 수정을 기여하고(`react#35776`), 외부 벤치마크를 수용하는 자세는 긍정적이다. Platformatic의 문구를 빌리면:

> Performance benchmarks capture a moment, not a final judgment.
>
> 성능 벤치마크는 한 순간을 포착할 뿐, 최종 판결이 아니다.

이 글의 숫자들도 한 순간의 포착이다. 하지만 그 순간이 보여주는 구조적 격차는, 다음 벤치마크에서 Next.js 팀이 얼마나 줄여 놓을지 지켜볼 가치가 있다.

## 참고

- [Platformatic — React SSR Framework Showdown: TanStack Start, React Router, and Next.js Under Load](https://blog.platformatic.dev/react-ssr-framework-benchmark-tanstack-start-react-router-nextjs)
- [eknkc/ssr-benchmark — Benchmarking JS web framework SSR performance](https://github.com/eknkc/ssr-benchmark)
- [Next.js 16.2 릴리스 블로그](https://nextjs.org/blog/next-16-2)
- [facebook/react#35776 — Walk parsed JSON instead of using reviver for parsing RSC payload](https://github.com/facebook/react/pull/35776)
- [V8 JSON parser 소스코드 — v8/src/json/json-parser.cc](https://github.com/v8/v8/blob/main/src/json/json-parser.cc)
- [TanStack Blog — 5x SSR Throughput: Profiling SSR Hot Paths in TanStack Start](https://tanstack.com/blog/tanstack-start-5x-ssr-throughput)
- [Nadia Makarevich — React Server Components: Do They Really Improve Performance?](https://www.developerway.com/posts/react-server-components-performance)
- [The Hidden Performance Costs of React Server Components](https://dev.to/rbobr/the-hidden-performance-costs-of-react-server-components-248f)
- [Tony Alicea — Understanding React Server Components](https://tonyalicea.dev/blog/understanding-react-server-components/)
- [Vercel — How to Optimize RSC Payload Size](https://vercel.com/kb/guide/how-to-optimize-rsc-payload-size)
- [GitHub Issue #85470 — Server requests and latency increased after upgrading from Next.js 15 to 16](https://github.com/vercel/next.js/issues/85470)
- [GitHub Discussion #86081 — Real-world cost of Server Components vs CSR at scale](https://github.com/vercel/next.js/discussions/86081)
- [BeyondIT — Next.js 16 vs TanStack Start: Performance, Memory Leaks & Migration Guide](https://beyondit.blog/blogs/nextjs-16-vs-tanstack-start-data-comparison)
- [Northflank — Why we ditched Next.js and never looked back](https://northflank.com/blog/why-we-ditched-next-js-and-never-looked-back)
- [Radek Pietruszewski — I made JSON.parse() 2x faster](https://radex.io/react-native/json-parse/)
