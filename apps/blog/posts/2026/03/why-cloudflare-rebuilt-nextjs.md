---
title: 'Cloudflare가 Next.js를 다시 만든 이유'
tags:
  - nextjs
  - cloudflare
  - edge-computing
  - vite
  - reverse-engineering
published: true
date: 2026-03-17 20:07:31
description: 'vinext가 던진 질문은?'
series: 'Next.js의 현주소'
seriesOrder: 2
---

## Table of Contents

## 서론

vinext의 핵심은 "AI가 일주일 만에 만들었다"가 아니다. 핵심은 Cloudflare가 Next.js를 자사 플랫폼에서 지원하기 위해 더 이상 비공개 빌드 출력물을 해석하는 어댑터와 역공학에만 기대지 않고, 공개 API 표면을 직접 재구현하는 방향으로 전환하겠다고 선언했다는 점이다.

[이전 글](/2026/03/nextjs-edge-runtime-rise-and-fall)에서 다뤘듯, Cloudflare는 Edge-native 인프라를 완성했지만 빠진 퍼즐이 하나 있었다. 개발자 경험이다. 대부분의 현대 프레임워크는 어댑터(adapter)라는 공식 인터페이스를 제공한다. 빌드 결과물을 각 배포 플랫폼에 맞게 변환해주는 계층으로, 어댑터만 교체하면 Cloudflare든 AWS든 Netlify든 같은 코드를 배포할 수 있다. Next.js에는 이것이 없었다. Next.js는 빌드 시 `.next` 디렉토리에 서버 함수, 정적 에셋, 캐시 등을 생성하는데, 이 출력 형식이 Vercel 인프라에 맞춰 설계되어 있고 공식 문서화되어 있지 않다. Cloudflare나 Netlify 같은 타 플랫폼에서 이 앱을 돌리려면, 문서화되지 않은 내부 구조를 분석해서 자기 플랫폼에 맞게 변환하는 작업이 필요하다. 그리고 Next.js가 버전업될 때마다 이 구조가 예고 없이 바뀌므로, 변환 코드를 계속 따라잡아야 하는 유지보수 부담이 생긴다. 2026년 2월, Cloudflare는 [vinext](https://github.com/cloudflare/vinext)를 공개했다. Next.js의 공개 API 표면을 Vite 위에서 재구현한 프로젝트다. 이 글에서는 vinext가 등장한 구조적 배경, 기존 접근(OpenNext)과의 차이, AI로 만들었다는 것의 실체, 그리고 이 시도가 오픈소스 생태계에 던지는 질문을 살펴본다.

## Next.js는 왜 Vercel 밖에서 배포하기 어려운가

Next.js는 오픈소스지만, 빌드 출력물은 Vercel의 인프라에 맞춰 설계되어 있다.

### 어댑터가 없었다

Remix, Astro, SvelteKit, Nuxt — 현대 프레임워크들은 대부분 어댑터(adapter) 패턴을 지원한다. 빌드 결과물을 플랫폼별로 변환하는 공식 인터페이스가 있어서, Cloudflare Workers든 AWS Lambda든 Netlify든 어댑터만 바꾸면 배포할 수 있다.

Next.js에는 이것이 없었다. `.next` 디렉토리에 생성되는 빌드 출력물의 형식은 문서화되지 않았고, 버전마다 예고 없이 바뀌었다. Vercel 이외의 플랫폼에 배포하려면 이 비공개 출력물을 읽어서 자기 플랫폼에 맞게 다시 가공해야 했다.

Netlify는 이 문제의 심각성을 [직접 밝힌 바 있다](https://www.netlify.com/blog/how-we-run-nextjs/):

> Next.js builds use a private, largely undocumented format that is subject to change.
>
> Next.js 빌드는 비공개이고 대부분 문서화되지 않은 형식을 사용하며, 언제든 변경될 수 있다.

Netlify는 Next.js의 canary 브랜치 변경사항을 자동으로 모니터링하는 `nextjs-sentinel`[^1]이라는 도구까지 만들어야 했다. 프레임워크 하나를 지원하기 위해 전담 엔지니어링 팀을 운영하는 상황이었다.

### `minimalMode`라는 비공개 플래그

Next.js의 서버에는 [`minimalMode`](https://github.com/vercel/next.js/discussions/29801)라는 문서화되지 않은 설정이 있다. Vercel에서 배포할 때만 활성화되는 이 모드에서는 프레임워크의 핵심 기능 일부가 비활성화되고, Vercel의 비공개 인프라 코드가 이를 대체한다. Middleware를 애플리케이션에서 분리하여 Edge에서 실행할 수 있었던 것도 이 `minimalMode` 덕분인데, Vercel만 이 기능에 접근할 수 있었다.

Netlify의 [Eduardo Boucas가 분석한 글](https://eduardoboucas.com/posts/2025-03-25-you-should-know-this-before-choosing-nextjs/)에서 이 문제를 상세히 다루었다:

> This secret minimal mode is what allowed Vercel to break out middleware from the rest of the application so they could run it at the edge, but only Vercel has access to it.
>
> 이 비밀 미니멀 모드 덕분에 Vercel은 미들웨어를 애플리케이션에서 분리하여 Edge에서 실행할 수 있었지만, 오직 Vercel만이 이 기능에 접근할 수 있었다.

### `target: 'serverless'`의 제거

Next.js에는 원래 `target: 'serverless'` 설정이 있었다. 이 설정을 사용하면 어느 서버리스 플랫폼에서든 배포할 수 있었다. 2022년 10월, Vercel은 [이 옵션을 제거했다](https://github.com/vercel/next.js/pull/41495). 범용 서버리스 배포를 위한 공식 타깃이 사라졌고, 이후 타 플랫폼 지원은 사실상 별도 어댑터와 역공학에 의존하게 되었다.

### 비표준 캐시 헤더

Next.js는 v15 이전까지 [RFC 5861](https://datatracker.ietf.org/doc/html/rfc5861) 규격에 맞지 않는 `stale-while-revalidate` 헤더를 출력했다[^6]. 규격상 `stale-while-revalidate=<delta-seconds>` 형식으로 값이 필수인데, Next.js는 `s-maxage=SECONDS, stale-while-revalidate`처럼 값 없이 출력했다. Vercel의 CDN은 이 비표준 형식을 자체적으로 처리했지만[^7], AWS CloudFront 같은 다른 CDN에서는 헤더가 무시되었다. Next.js 15에서 [`expireTime`](https://nextjs.org/docs/app/api-reference/config/next-config-js/expireTime) 설정이 도입되면서 기본값으로 1년의 delta-seconds가 추가되어 수정되었다[^8].

### ISR 캐싱의 함정

[ISR(Incremental Static Regeneration)](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration)은 Next.js의 핵심 기능 중 하나다. 정적 페이지를 주기적으로 재생성하는 이 기능은 Vercel에서는 "그냥 동작"한다. 하지만 셀프 호스팅 환경에서는 파일 시스템 기반 캐시가 기본값이라, 다중 인스턴스 배포 시 각 인스턴스가 서로 다른 캐시를 갖게 된다. 일관된 캐시를 위한 커스텀 `cacheHandler`를 구현하려면 Redis 같은 외부 저장소와의 연동 코드가 필요했다.

지금까지 살펴본 사실들을 종합하면, 확인 가능한 것은 두 가지다. 첫째, Next.js의 배포 표면은 오랫동안 공식 어댑터 패턴 없이 운영되었다. 둘째, 그 결과 타 플랫폼 사업자들은 내부 출력물을 읽고 변환하는 높은 유지보수 비용을 떠안았다. 이것이 의도적 락인이었는지, 자사 플랫폼 최적화를 우선한 결과였는지는 외부에서 단정하기 어렵다. 하지만 결과적으로 **Vercel과 타 플랫폼 간에 배포 경험의 비대칭이 존재했다**는 점은 부정하기 어렵다.

## OpenNext: 역공학이라는 선택

이 마찰을 줄이기 위해 등장한 것이 [OpenNext](https://opennext.js.org/)다.

### OpenNext란 무엇인가

OpenNext는 Next.js 빌드 출력물을 Vercel이 아닌 플랫폼에서 실행할 수 있도록 변환하는 오픈소스 프로젝트다. 2022년 12월, [SST(Serverless Stack)](https://sst.dev/) 팀이 만들었다. 원래는 AWS Lambda 배포를 위한 것이었지만, 이후 Cloudflare와 Netlify도 각자의 어댑터를 만들면서 멀티 플랫폼 프로젝트로 확장되었다.

- [opennextjs-aws](https://github.com/opennextjs/opennextjs-aws) — AWS Lambda 어댑터
- [opennextjs-cloudflare](https://github.com/opennextjs/opennextjs-cloudflare) — Cloudflare Workers 어댑터

### 동작 원리

OpenNext의 작동 방식은 다음과 같다:

1. `next build`를 standalone 모드로 실행하여 `.next` 디렉토리를 생성한다
2. 이 출력물을 파싱하여 플랫폼별 배포 아티팩트로 변환한다

AWS의 경우를 예로 들면:

```
.next/ (Next.js 빌드 출력)
  ↓ OpenNext 변환
.open-next/
  ├── server-function/    → Lambda 함수 (NextServer 래핑)
  ├── image-function/     → 이미지 최적화 전용 Lambda
  ├── revalidation-function/ → ISR 재검증용 Lambda
  ├── warmer-function/    → 콜드 스타트 방지용 Lambda
  ├── assets/             → S3에 업로드할 정적 파일
  └── cache/              → DynamoDB 기반 캐시
```

핵심은 Next.js의 `NextServer`를 그대로 사용한다는 것이다. OpenNext는 빌드 출력물을 플랫폼에 맞게 재패키징하는 역할이지, Next.js 자체를 대체하는 것이 아니다.

### 역공학의 한계

이 접근 방식은 근본적인 취약점을 갖고 있다. **Next.js 내부 빌드 출력 형식의 안정성이 보장되지 않는다.**

Cloudflare 엔지니어링 블로그에서 이 문제를 [직접 언급했다](https://blog.cloudflare.com/vinext/):

> Because OpenNext has to reverse-engineer Next.js's build output, this results in unpredictable changes between versions that take a lot of work to correct.
>
> OpenNext는 Next.js의 빌드 출력물을 역공학해야 하기 때문에, 버전 간 예측 불가능한 변경이 발생하고 이를 수정하는 데 많은 작업이 필요하다.

구체적인 문제들:

- Next.js의 minor/patch 릴리스에서 빌드 출력 형식이 예고 없이 변경된다
- OpenNext 어댑터가 새 버전을 지원하기까지 시간이 걸려, 최신 Next.js를 즉시 사용할 수 없다
- Turbopack 빌드 도입 시 기존 어댑터가 깨지는 사례가 발생했다
- `next dev`는 Node.js에서만 실행되므로, 개발 시 플랫폼별 기능(Cloudflare KV 등)을 테스트할 수 없다

Cloudflare, Netlify, AWS Amplify 모두 자체적인 패치 스택과 폴백 로직을 유지해야 했다. Next.js가 업데이트될 때마다 "두더지 잡기(whack-a-mole)" 같은 대응이 반복되는 구조였다.

### Deployment Adapters API — 늦었지만 공식 해법

2025년 4월, Vercel은 [Deployment Adapters RFC](https://github.com/vercel/next.js/discussions/77740)를 발표했다. Netlify, Cloudflare, AWS Amplify, OpenNext가 참여한 워킹 그룹에서 설계한 표준 어댑터 API로, Next.js 16에서 알파로 도입되었다.

```js
// next.config.js
const nextConfig = {
  experimental: {
    adapterPath: require.resolve('./my-adapter.js'),
  },
}

module.exports = nextConfig
```

어댑터는 `modifyConfig()`로 빌드 설정을 조정하고, `onBuildComplete()`로 구조화된 빌드 출력(라우트 정보, 에셋 매핑, 함수 메타데이터 등)을 받아 플랫폼별 배포 아티팩트를 생성한다. [Next.js 공식 문서](https://nextjs.org/docs/app/api-reference/config/next-config-js/adapterPath) 기준으로 아직 `experimental` 하위에 위치하며, Vercel도 [자사 어댑터를 공개](https://github.com/nextjs/adapter-vercel)하여 "같은 API를 쓴다"고 밝혔다.

이 API가 성숙해지면 OpenNext 같은 역공학 프로젝트의 필요성이 줄어들 수 있다. 하지만 아직 알파 단계이고, Next.js 15 이하 구형 버전들에 대한 백포트 계획은 없다. 2026년 3월 현재, 이 API에만 의존하기에는 이르다.

## vinext: 역공학 대신 재구현

OpenNext가 "Next.js 빌드 출력물을 역공학"하는 접근이었다면, vinext는 근본적으로 다른 선택을 했다. **Next.js의 공개 API 표면 자체를 Vite 위에서 재구현**한 것이다.

### vinext란 무엇인가

[vinext](https://github.com/cloudflare/vinext)는 Cloudflare가 2026년 2월에 공개한 Vite 플러그인이다. Next.js의 라우팅, SSR, RSC(React Server Components), Server Actions, 캐싱, Middleware, `next/*` 모듈 임포트를 Vite 기반으로 재구현했다.

- GitHub: [cloudflare/vinext](https://github.com/cloudflare/vinext)
- 공식 사이트: [vinext.io](https://vinext.io/)
- 라이선스: MIT
- 배포 타깃: Cloudflare Workers가 첫 번째 네이티브 타깃이지만, [Nitro](https://nitro.build/)를 통해 Vercel, Netlify, AWS, Deno Deploy 등에도 배포 가능하다고 README에서 설명하고 있다. 다만 이 주장의 실체는 제한적이다. Cloudflare 자체적으로 Vercel에 배포하는 PoC를 "30분 만에" 성공시켰다고 하고[^3], [Netlify 배포를 위한 PR](https://github.com/cloudflare/vinext/pull/76)이 존재하지만 아직 DRAFT 상태이며 작성자 본인이 "코드를 리뷰하지 않았으니 실제 사용하지 말라"고 경고하고 있다. [Clever Cloud](https://www.clever.cloud/blog/engineering/2026/02/25/how-we-deployed-a-vinext-application/)가 자사 플랫폼에 배포한 사례는 있지만, AWS나 Deno Deploy에서 독립적으로 검증된 사례는 찾기 어렵다. Cloudflare-first이지 Cloudflare-only는 아니라는 것은 기술적으로 맞지만, 현 시점에서 비-Cloudflare 플랫폼 지원은 실험적 수준이다.

[Cloudflare가 제시한](https://blog.cloudflare.com/vinext/) 초기 벤치마크 수치:

| 항목                                  | vinext                | Next.js             |
| ------------------------------------- | --------------------- | ------------------- |
| **API 호환성** (README 기준)          | Next.js 16 API의 94%  | -                   |
| **빌드 속도** (33개 라우트 테스트 앱) | 1.67초                | 7.38초 (4.4배 느림) |
| **클라이언트 번들 크기** (gzip)       | 72.9 KB               | 168.9 KB (2.3배 큼) |
| **테스트**                            | 1,700+ 유닛 + 380 E2E | -                   |

이 수치는 Cloudflare가 공개한 특정 테스트 앱(33개 라우트) 기준의 초기 벤치마크다. 독립적인 제3자 검증은 아직 없으며, 앱의 규모나 구성에 따라 결과가 달라질 수 있다.

### RSC 재구현의 깊이

vinext가 "Next.js API를 재구현했다"고 할 때 가장 큰 기술적 도전은 RSC(React Server Components) 였을 것이다. RSC는 서버/클라이언트 경계, 스트리밍 렌더링, Server Actions 등 복잡한 런타임 동작이 얽혀있어 단순한 API 매핑으로 해결되지 않는다.

vinext의 RSC 구현은 `@vitejs/plugin-rsc`(Vite 공식 RSC 플러그인) 위에 구축되었으며, 세 개의 독립적인 모듈 그래프를 사용한다:

- **RSC 환경**: Server Component를 렌더링하여 RSC 스트림을 생성한다
- **SSR 환경**: RSC 스트림을 받아 HTML을 생성한다
- **Client 환경**: 브라우저에서 하이드레이션을 수행한다

`"use client"`와 `"use server"` 경계는 정상 동작하며, Suspense 통합과 스트리밍 SSR도 지원된다. Server Actions(폼 제출, 뮤테이션, `redirect()`, FormData 처리)도 동작한다. `generateMetadata()`와 동적 OG 이미지도 지원한다.

다만 `@vitejs/plugin-rsc` 자체가 아직 초기 단계이고, RSC/SSR 환경 경계에서 상태 전달이 명시적으로 이루어져야 하는 구조적 제약이 있다. Partial Prerendering(PPR)은 미지원이며, `"use cache"` 디렉티브는 실험적 상태다.

### OpenNext와의 구조적 차이

이 두 프로젝트의 차이는 단순한 구현 방식의 차이가 아니라, **의존 관계의 방향**이 다르다.

```
OpenNext:
  next build → .next/ (비공개 출력물) → OpenNext 변환 → 플랫폼 배포
  ⚠️ .next/ 형식이 바뀌면 깨짐

vinext:
  vinext build (Vite) → 플랫폼 배포
  ✓ Next.js 공개 API 계약에만 의존
```

|                    | OpenNext                          | vinext                       |
| ------------------ | --------------------------------- | ---------------------------- |
| **접근**           | 빌드 출력물 역공학                | 공개 API 재구현              |
| **빌드 도구**      | Next.js (Turbopack) 그대로 사용   | Vite로 완전 대체             |
| **Next.js 의존성** | `next build`에 직접 의존          | Next.js 코드에 의존하지 않음 |
| **버전 추적 부담** | 매 릴리스마다 내부 변경 대응 필요 | 공개 API가 바뀔 때만 대응    |
| **성숙도**         | 프로덕션에서 검증됨               | 실험적, 보안 이슈 존재       |

OpenNext는 `next-server` 바이너리를 그대로 실행하기 때문에, Next.js의 모든 기능이 동작하지만 내부 구조 변경에 취약하다. vinext는 Next.js 코드를 전혀 사용하지 않기 때문에, 내부 구조 변경의 영향을 받지 않지만 94%의 API 호환성에서 나머지 6%가 문제가 될 수 있다.

### 94%의 나머지 6%

"Next.js API의 94% 호환"이라는 수치에서 빠진 6%가 무엇인지에 따라 vinext의 실용성 평가가 달라진다. 누락된 기능을 분류하면 다음과 같다:

**의도적으로 제외된 것들** — Next.js 생태계에서 의미가 낮거나 Vite로 대체된 것들이다:

- `next/amp` (AMP 지원)
- Webpack/Turbopack 관련 설정 (Vite가 대체)
- Vercel 전용 기능: Edge Config, Vercel Analytics, `@vercel/og`
- 레거시 `next export` CLI
- `experimental.typedRoutes`

**실질적으로 문제가 되는 것들** — 프로덕션 앱에서 흔히 사용하는 기능이다:

| 미지원/부분 지원 기능                              | 영향                                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `next/image` 최적화                                | `@unpic/react`로 대체. 빌드 타임 이미지 최적화, 반응형 이미지 생성 불가. `images: { unoptimized: true }` 필요 |
| `next/font/local`의 `font.variable`                | CSS 커스텀 프로퍼티 주입이 깨짐. 타이포그래피에 CSS 변수를 쓰는 앱에 영향                                     |
| `next-auth` / `@clerk/nextjs`                      | Next.js 내부 API 라우트 핸들러에 의존하여 동작 불가                                                           |
| `generateStaticParams()` 빌드 타임 프리렌더링      | 첫 요청 시 ISR로만 동작. 초기 방문 시 콜드 스타트 레이턴시 발생                                               |
| `styled-components` / `@emotion/react`             | `useServerInsertedHTML()` 미구현으로 부분 지원                                                                |
| Workers 런타임 제약 (`fs`, `net`, `child_process`) | 서버 사이드 파일 처리가 필요한 앱에 제약                                                                      |

이 중 `next/image`와 `next-auth`는 자주 언급되는 미지원 항목이지만, 치명적인 문제라고 보기는 어렵다. 이미지 최적화는 Cloudflare Images나 외부 CDN(Cloudinary, imgix)으로 대체할 수 있고, 인증은 Auth.js(next-auth의 프레임워크 무관 버전)나 다른 서비스로 우회할 수 있다. 기존 Next.js 앱을 마이그레이션하는 경우에는 마찰이 있겠지만, 새 프로젝트라면 처음부터 대안을 선택하면 된다. 94%라는 수치는 API 표면의 커버리지로는 높아 보이지만, 나머지 6%가 자신의 프로젝트에 해당하는지는 직접 확인해볼 필요가 있다.

여기서 주의할 것이 있다. Cloudflare의 공식 홍보 문구는 "이미 프로덕션 사용 사례가 있다"에 가깝지만, [vinext README](https://github.com/cloudflare/vinext) 자체는 프로젝트를 실험적 소프트웨어(experimental)로 규정하고 있으며, 성숙도 면에서는 OpenNext를 더 안전한 선택으로 제시한다. 블로그와 README 사이에 톤 차이가 있는 셈이다. 현 시점에서 vinext를 프로덕션에 도입하려는 팀이라면, 블로그의 낙관보다 README의 경고를 기준으로 삼는 것이 현실적이다.

### Traffic-aware Pre-Rendering

vinext에는 Next.js에 없는 기능도 있다. **Traffic-aware Pre-Rendering(TPR)**은 Cloudflare의 zone analytics 데이터를 분석하여, 실제로 트래픽이 많은 페이지만 선택적으로 프리렌더링하는 기능이다. 모든 페이지를 프리렌더링하는 것이 아니라, 실제 접근 패턴에 기반한 최적화다. Cloudflare의 CDN 데이터에 직접 접근할 수 있기 때문에 가능한 기능이다.

## AI로 만들었다는 것의 실체

vinext가 화제가 된 가장 큰 이유는 "AI로 1주일 만에 만들었다"는 발표였다. Cloudflare 블로그 제목이 ["How we rebuilt Next.js with AI in one week"](https://blog.cloudflare.com/vinext/)이었으니 당연하다. 하지만 실체를 들여다보면, 이것은 단순한 바이브 코딩이 아니었다.

### 만든 사람과 방식

vinext를 만든 사람은 **Steve Faulkner**, Cloudflare의 엔지니어링 디렉터다. AI 모델은 **Claude**(Anthropic)를 사용했고, 800회 이상의 AI 코딩 세션을 거쳤다. API 토큰 비용은 약 $1,100이었다[^2].

Faulkner의 역할은 코드를 직접 쓰는 것이 아니라, **아키텍처 결정, 우선순위 설정, AI가 잘못된 방향으로 갈 때 교정**하는 것이었다. 초기 몇 시간을 Claude와 아키텍처를 정의하는 데 사용한 뒤, 이후에는 AI가 구현하고 테스트를 통과시키는 사이클을 반복했다.

> "The AI can hold the whole system in context, but I had to course-correct regularly." — Steve Faulkner[^2]
>
> "AI는 시스템 전체를 컨텍스트에 담을 수 있지만, 나는 주기적으로 방향을 교정해야 했다."

### 왜 이 작업이 AI에 적합했나

vinext가 AI로 만들어질 수 있었던 핵심 이유는, Next.js가 이미 **방대한 테스트 스위트**를 공개해놓았기 때문이다.

[paddo.dev의 분석](https://paddo.dev/blog/vinext-test-suites-are-specs/)이 이 점을 정확히 짚었다: Next.js의 2,000개 이상의 유닛 테스트와 400개 이상의 E2E 테스트[^5]는 사실상 **실행 가능한 명세(executable specification)**였다. AI는 문서를 읽고 해석하는 것보다, 테스트를 통과시키는 것에 훨씬 능하다. "이 입력에 이 출력이 나와야 한다"는 명확한 계약이 있으면, AI는 그 계약을 만족시키는 코드를 효율적으로 생성할 수 있다.

```
기존 AI 코딩:
  모호한 요구사항 → AI가 "추측"으로 코드 작성 → 사람이 검증

vinext:
  Next.js 테스트 스위트 (명확한 계약) → AI가 계약 충족 코드 작성 → 테스트가 자동 검증
```

이 구조가 가능했던 조건들로는 아마 다음과 같지 않을까?

1. **명확한 API 계약**: Next.js의 공개 API는 잘 정의되어 있다. `next/router`, `next/image`, `next/link` 등의 동작이 명확하다.
2. **방대한 테스트 스위트**: 2,000개 이상의 테스트가 기대 동작을 코드로 정의하고 있다. AI는 이 테스트들을 하나씩 통과시키면 된다.
3. **독립적인 모듈 구조**: 라우팅, SSR, RSC, 캐싱 등 각 기능이 비교적 독립적이라 병렬로 구현 가능했다.
4. **레퍼런스 구현의 존재**: Next.js 소스 코드 자체가 공개되어 있으므로, 동작이 애매한 경우 참고할 수 있었다.

요약하면, "AI가 프레임워크를 만들었다"가 아니라 **"잘 정의된 명세와 테스트가 있었기 때문에 AI가 구현체를 생성할 수 있었다"** 에 가깝다. 문서화가 잘 된 API와 포괄적인 테스트 스위트가 AI에게 명세서 역할을 한 것이다.

이 사건의 핵심은 "AI가 만능 도구라서"가 아니다. **명세가 공개된 소프트웨어는 구현이 상품화(commoditize)되기 시작했다** 는 점이다. 물론, 그 완성도가 Next.js 에 비할바는 아니다. 하지만 API 계약이 명확하고 테스트가 포괄적일수록, 구현체를 만드는 비용은 급격히 떨어질 수도 있다는 것을 보여준 셈이다. vinext가 $1,100에 만들어졌다는 것은 Next.js API의 "구현 비용"이 그 정도로 낮아졌다는 뜻이기도 하다.

## 보안: v1의 문제인가, AI 코드의 문제인가

vinext 공개 이틀 후, Vercel CEO [Guillermo Rauch가 7건의 보안 취약점을 공개](https://x.com/rauchg/status/2026864132423823499)했다. Critical 2건, High 2건, Medium 2건, Low 1건이었다. SSRF, 인증 우회, 보안 헤더 누락, 경로 파싱 오류 등이 포함되었다.

이후 AI 보안 도구 [Hacktron](https://www.hacktron.ai/blog/hacking-cloudflare-vinext)이 추가로 45건의 취약점을 발견했고, 수동 검증을 거친 24건 중 Critical 4건, High 6건이 포함되어 있었다. 주요 취약점들로는 다음과 같다.

| 취약점                            | 심각도   | 내용                                             |
| --------------------------------- | -------- | ------------------------------------------------ |
| AsyncLocalStorage 레이스 컨디션   | Critical | 동시 요청 간 세션 데이터 누출                    |
| 캐시 포이즈닝                     | Critical | `Authorization`/`Cookie` 헤더가 캐시 키에 미포함 |
| 이중 URL 인코딩으로 미들웨어 우회 | Critical | `/%2561dmin`으로 인증 우회 가능                  |
| API 라우트 미들웨어 미적용        | Critical | `/api/*` 엔드포인트가 미들웨어 보호 밖에 노출    |
| 이미지 옵티마이저 ACL 우회        | High     | `/_vinext/image`가 미들웨어 이전에 실행          |

보안 연구자 [Sam Curry의 지적](https://x.com/samwcyo/status/2026888257779224594)이 흥미롭다:

> "Two years ago, I reported an improper path parsing vulnerability in Next.js. Today, they reported the exact same vulnerability to their competitor, Vinext."
>
> "2년 전에 나는 Next.js에 부적절한 경로 파싱 취약점을 보고했다. 오늘, 그들은 정확히 같은 취약점을 경쟁자인 Vinext에 보고했다."

AI가 Next.js의 수정 전 코드를 학습 데이터로 사용했을 가능성이 높다. 이미 알려진 취약점이 그대로 재현된 것이다.

기능 테스트는 "이것이 동작해야 한다"를 검증하지만, 보안 취약점은 **"이것이 동작하면 안 된다"** 의 영역이다. 테스트 스위트에 보안 테스트가 충분하지 않으면, AI는 기능적으로 올바르지만 보안적으로 취약한 코드를 생성할 수 있다. 현재까지 보고된 취약점들은 모두 수정 가능한 범주에 속하므로, 이것은 v1의 문제이기도 하다.

더 근본적인 질문은 **코드 리뷰의 부재**다. vinext의 README에는 이렇게 적혀있다:

> Humans direct architecture, priorities, and design decisions, but have not reviewed most of the code line-by-line.
>
> 사람이 아키텍처, 우선순위, 설계 결정을 지시하지만, 대부분의 코드를 한 줄씩 리뷰하지는 않았다.

사람이 아키텍처를 잡고 AI가 구현하는 모델에서, 보안 검증의 책임은 누구에게 있는가? 테스트가 명세를 대체할 수 있었던 것처럼 자동화된 보안 스캐닝이 사람의 코드 리뷰를 대체할 수 있는지는 아직 답이 나오지 않았다.

## 오픈소스라고 불렀지만

vinext의 기술적 완성도보다 더 흥미로운 것은, 이 시도가 오픈소스 생태계의 구조적 긴장을 드러냈다는 점이다.

### Vercel의 전략: 오픈소스로 생태계를 만들고, 플랫폼으로 수익화

Vercel의 비즈니스 모델은 명확하다. Next.js라는 오픈소스 프레임워크로 개발자 생태계를 구축하고, Vercel 플랫폼에서 수익을 창출한다. 외부 분석 기관 [Sacra의 추정](https://sacra.com/c/vercel/)에 따르면 Vercel의 ARR은 2025년 기준 약 $200M규모로, 2019년 $1M에서 6년간 200배 성장한 것으로 보인다. (Vercel은 비상장 기업으로 공식 매출을 공개하지 않으므로, 이 수치는 Sacra의 독자적 추정이다.) Next.js를 사용하는 85만 이상의 개발자가 잠재 고객 풀이다[^4].

이 모델 자체는 건전하다. MongoDB, Redis, Elastic 등 많은 기업이 같은 전략을 사용한다. 오픈소스로 기술을 확산시키고, 매니지드 서비스로 수익을 낸다. 문제는 **프레임워크의 설계 결정이 플랫폼의 비즈니스 이익과 충돌할 때** 발생한다.

이 글의 앞에서 이미 다뤘듯, 결과적으로 **Vercel 밖에서 Next.js를 운영하는 비용이 높아졌다**는 것은 사실이다.

Vercel은 2025년 11월에 ["The Anti-Vendor Lock-in Cloud"](https://vercel.com/blog/vercel-the-anti-vendor-lock-in-cloud)라는 블로그를 발표하며 이 비판에 대응했다:

> "Approximately 70% of Next.js applications run outside of Vercel. Every Next.js 16 application deployed on Vercel uses the same adapter API available to other platforms."
>
> "Next.js 애플리케이션의 약 70%가 Vercel 외부에서 실행된다. Vercel에 배포된 모든 Next.js 16 애플리케이션은 다른 플랫폼에서도 사용 가능한 동일한 어댑터 API를 사용한다."

이 블로그는 vinext(2026년 2월) 이전에 나왔으므로, vinext에 대한 직접적인 대응은 아니다. 하지만 Deployment Adapters RFC(2025년 4월)가 Netlify, Cloudflare, OpenNext 등 경쟁 플랫폼들의 수년간의 압력 끝에 나왔다는 점은 주목할 만하다. 락인 비판이 쌓여온 결과, Vercel이 개방 방향으로 움직인 것이다. vinext는 이 흐름의 원인이 아니라, 같은 구조적 마찰에서 비롯된 또 하나의 결과물이다.

### vinext가 뒤집은 것

vinext가 드러낸 아이러니는 이것이다: **Vercel이 오픈소스로 공개한 API 명세와 테스트 스위트가, 경쟁자가 대체재를 만드는 데 그대로 활용되었다.**

Next.js의 2,000개 이상의 테스트는 API의 기대 동작을 정확히 정의한다. vinext는 이 테스트들을 가져와 Vite 기반 구현이 같은 동작을 하는지 검증했다. 테스트 스위트가 곧 명세서였고, 명세서가 공개되어 있으니 재구현이 가능했다.

Guillermo Rauch의 반응은 격렬했다. vinext를 ["vibe-coded framework"](https://x.com/rauchg/status/2026864132423823499)이라 불렀고, Cloudflare의 전략을 이렇게 비판했다:

> "Cloudflare's mission is to fork the entire developer ecosystem and destroy open source. Vinext was an excuse to swindle developers into using their proprietary runtimes instead of @nodejs."
>
> "Cloudflare의 목표는 개발자 생태계 전체를 포크하고 오픈소스를 파괴하는 것이다. Vinext는 개발자들을 Node.js 대신 자사의 독점 런타임으로 유인하기 위한 구실이었다."

이 발언의 타당성은 논쟁의 여지가 있지만, 배경에 깔린 긴장은 실재한다.

### 빠진 시각: Netlify는 어디에 있는가

Next.js의 플랫폼 종속성이라는 같은 문제에 대해 세 회사가 서로 다른 답을 택했다. Cloudflare는 재구현, Vercel은 Deployment Adapters API, Netlify는 Next.js에 대한 의존도 자체를 낮추는 방향이다.

Netlify는 `nextjs-sentinel`까지 만들어 Next.js 지원 비용을 감당해왔고, Eduardo Boucas의 `minimalMode` 분석글도 이 글에서 인용했다. 그런데 vinext에 대한 공식 입장은 없다. [Netlify 배포를 위한 PR](https://github.com/cloudflare/vinext/pull/76)이 DRAFT 상태로 존재하지만 작성자는 Netlify 직원이 아니다. Netlify의 Edge Functions는 Deno 기반이라 Workers와 런타임이 다르고, "composable architecture"로 피봇하면서 프레임워크 종속도를 줄이고 있다. 이 세 가지 대응이 모두 같은 구조적 문제에서 비롯되었다는 점이 오히려 문제의 심각성을 방증한다.

### 기업 주도 오픈소스의 지속 가능성

vinext 사례가 반복되면 어떻게 될까? 기업이 프레임워크를 오픈소스로 공개하고, 그 테스트 스위트와 API 명세를 경쟁자가 가져다 대체재를 만드는 패턴이 일반화된다면?

이 질문에 대한 선례가 있다. MongoDB(SSPL), Elastic(SSPL→AGPL), HashiCorp(BSL) 등은 경쟁적 사용을 제한하는 라이선스로 전환했다. 하지만 이들은 "인프라 소프트웨어"였고, Next.js는 "프레임워크"다. 프레임워크의 가치는 생태계 크기에 비례하므로, 라이선스를 제한하면 생태계가 쪼그라들고 프레임워크의 가치도 함께 떨어진다. Next.js가 MIT에서 다른 라이선스로 전환할 가능성은 낮다고 본다.

더 현실적인 경로는 **어댑터 API를 통한 공존**이다. Deployment Adapters API가 성숙해지면, Cloudflare도 공식 어댑터를 통해 Next.js를 지원할 수 있고, vinext 같은 재구현의 필요성이 줄어든다. Vercel 입장에서는 생태계가 건강해지고, Cloudflare 입장에서는 역공학 없이 안정적인 지원이 가능해진다.

"오픈소스가 죽는다"는 아니다. 하지만 **"기업이 프레임워크를 오픈소스로 유지할 인센티브"** 에 대한 질문은 유효하다. 공개된 API 명세와 테스트가 경쟁자의 무기가 된다면, 기업은 어느 수준까지 공개할 것인가? vinext는 이 질문을 처음 던진 것이 아니라, AI라는 변수가 추가되면서 구현 비용이 극적으로 낮아진 세계에서 이 질문을 다시 던진 것이다.

## vinext는 실제로 Workers 채택을 늘릴 수 있는가

글의 처음으로 돌아가자. Cloudflare의 Edge 전략에서 빠진 마지막 퍼즐은 개발자 경험이었고, vinext는 그 답이라고 했다. 그렇다면 vinext + Workers 조합이 실제로 Next.js 개발자를 Cloudflare로 끌어올 수 있을까?

### 인프라는 준비되었다, 문제는 전환 비용

[이전 글](/2026/03/nextjs-edge-runtime-rise-and-fall)에서 다뤘듯, Cloudflare가 같은 Edge 기술로 Vercel과 다른 결과를 낸 이유는 D1, KV, Durable Objects, R2로 컴퓨트와 데이터를 모두 Edge에 올렸기 때문이다. vinext가 이 인프라와 네이티브로 통합된다면, Vercel + AWS RDS 조합에서는 불가능한 진짜 Edge 렌더링이 가능해진다. TPR(Traffic-aware Pre-Rendering)은 CDN과 프레임워크가 한 지붕 아래 있어야만 가능한 최적화의 좋은 예시다.

하지만 이 장점이 현실의 전환 비용을 넘어설 수 있는지는 별개의 문제다. Next.js 개발자가 vinext로 전환한다는 것은 단순히 빌드 도구를 바꾸는 것이 아니다:

- **ORM 전환**: Prisma + PostgreSQL에서 Drizzle + D1(SQLite)으로
- **인증 전환**: Auth.js의 다양한 DB 어댑터에서 D1 기반으로
- **파일 스토리지 전환**: S3에서 R2로
- **모니터링 전환**: Datadog/Sentry에서 Cloudflare의 도구로

각각은 작은 변경이 아니다. 특히 Prisma → D1 전환은 SQL 방언(PostgreSQL → SQLite)까지 바뀌므로, 쿼리 레벨의 마이그레이션이 필요하다. vinext가 Next.js와 94% 호환이라 해도, 나머지 스택의 전환 비용이 크다면 DX 개선 효과가 상쇄된다.

### Deployment Adapters API가 성숙하면 vinext는 어떻게 되는가

이것이 vinext의 존재 의미와 직결되는 질문이다.

Deployment Adapters API가 안정화되면, Cloudflare는 공식 어댑터만으로 Next.js를 Workers에서 돌릴 수 있다. OpenNext의 역공학도, vinext의 재구현도 필요 없어진다. 그러면 vinext는 불필요해지는 것인가?

반드시 그렇지는 않다. vinext의 가치는 "Next.js를 Workers에서 돌리는 것"만이 아니라 **Vite 기반이라는 점**에도 있다. 이 차이는 Deployment Adapters API로 해결되지 않는다. 공식 어댑터가 나와도 빌드 도구는 여전히 Turbopack이기 때문이다.

Turbopack은 Next.js 15에서 dev 모드가 안정화되었지만, 프로덕션 빌드는 아직 성숙 과정에 있다. OOM 에러, 2분 이상 빌드 후 크래시, webpack 대비 동작 불일치, 소스맵이 항상 생성되어 소스 코드가 노출되는 문제 등이 [GitHub Discussion](https://github.com/vercel/next.js/discussions/77721)에서 보고되고 있다. 무엇보다 Turbopack은 Next.js 전용이다. 초기에는 프레임워크 무관한 범용 번들러를 지향했지만, 현재는 Next.js 빌드 파이프라인에 결합되어 있고 독립 사용은 불가능하다.

반면 Vite는 1,000개 이상의 커뮤니티 플러그인(Rollup 생태계 계승), React/Vue/Svelte/SolidJS 등 멀티 프레임워크 지원, 그리고 Vite 8에서 도입된 [Rolldown](https://rolldown.rs/)(Rust 기반 번들러)으로 프로덕션 빌드 성능까지 크게 개선되었다. vinext의 벤치마크에서 Vite 8 + Rolldown 조합이 Turbopack 대비 4.4배 빠른 빌드, 2.3배 작은 번들을 기록한 것은 이 조합의 잠재력을 보여준다. 빌드 도구로서의 성숙도와 생태계 면에서 Vite가 현재 더 안정적이라는 것은 vinext의 존재 이유 중 하나다.

그러나 현실적으로 보면, **API 호환성 94%의 재구현**보다 **공식 어댑터를 통한 100% 호환**이 대부분의 팀에게 더 안전한 선택이다. vinext는 Vite 생태계를 선호하는 일부 팀에게는 매력적이겠지만, Next.js 개발자의 대다수에게 Cloudflare가 제공해야 할 것은 안정적인 공식 어댑터다.

결국 vinext의 장기적 역할은 세 가지 중 하나가 될 것이다:

1. **Deployment Adapters API의 촉매제로서 역사적 역할을 마치는 것** — vinext가 없었다면 Vercel이 어댑터 API를 이 속도로 도입했을까? 경쟁 압력이 개방성을 촉진했다면, vinext는 이미 목적을 달성한 셈이다.
2. **Vite 기반 Next.js 호환 프레임워크로 독립적 포지션을 잡는 것** — "Next.js API + Vite 빌드"라는 조합이 충분한 개발자를 끌어모을 경우.
3. **Cloudflare의 자체 프레임워크로 진화하는 것** — Next.js API 호환을 유지하면서도 Cloudflare 인프라에 최적화된 기능(TPR 등)을 추가해, 점차 독자적 프레임워크로 분화하는 경로.

어느 방향이든, vinext가 "프로덕션에서 Next.js를 대체하는 프레임워크"가 되려면 94%가 아닌 100%에 가까운 호환성, 보안 안정화, 그리고 Cloudflare 이외 플랫폼에서의 검증이 필요하다. 현재로서는 갈 길이 멀다.

## 결론

vinext를 범용적인 프로덕션 대체재로 보기는 아직 이르다. Cloudflare는 일부 프로덕션에서 실제로 사용했다고 주장하지만서도, README는 프로젝트를 experimental로 규정하고 있고 사람들은 아직 AI가 만든 이 제품에 대해서 프로덕션에 섣불리 적용하려 하지는 않을 것이다.

그럼에도 vinext가 의미있는 이유는, 왜 Deployment Adapters API 같은 공식 해법이 필요한지를 가장 극적으로 드러냈기 때문이다. Deployment Adapters RFC(2025년 4월)는 vinext(2026년 2월)보다 먼저 나왔고, 별도의 흐름으로 진행되고 있었다. vinext는 그 흐름의 원인이 아니라, 같은 구조적 마찰이 얼마나 심각한지를 보여주는 증상이다. 그 API가 성숙해지면 vinext의 역할은 자연스럽게 재정의된다.

장기적으로, **vinext가 살아남는다면 그것은 Next.js의 대체재가 아니라 Vite 생태계의 Next.js 호환 레이어로서일 것이다.** "Next.js의 API 설계는 좋지만, 빌드 도구와 배포 파이프라인은 Vite/Nitro 기반이 낫다"는 선택지 — Turbopack이 Next.js 전용으로 고착되는 동안 이 포지션이 유효해질 수 있다. 그 경로에 도달하려면 호환성, 보안, Cloudflare 밖에서의 실전 검증이 먼저다.

[^1]: [netlify/nextjs-sentinel](https://github.com/netlify/nextjs-sentinel) — Next.js 릴리스를 모니터링하여 Netlify 어댑터에 영향을 줄 수 있는 변경사항을 자동 감지하는 도구.

[^2]: [How we rebuilt Next.js with AI in one week — Cloudflare Blog](https://blog.cloudflare.com/vinext/)

[^3]: Steve Faulkner의 발언. [Cloudflare Releases Experimental Next.js Alternative — InfoQ](https://www.infoq.com/news/2026/03/cloudflare-vinext-experimental/)

[^4]: [Building the most ambitious sites on the Web with Vercel and Next.js 14 — Vercel Blog](https://vercel.com/blog/building-the-most-ambitious-sites-on-the-web-with-vercel-and-next-js-14) (2023년 11월 기준 수치)

[^5]: [Test suites are specs — paddo.dev](https://paddo.dev/blog/vinext-test-suites-are-specs/)

[^6]: [GitHub Issue #51823 — stale-while-revalidate header used without delta-seconds](https://github.com/vercel/next.js/issues/51823). AWS CloudFront에서 헤더가 무시되는 문제가 보고되었다.

[^7]: 비표준 형식이 Vercel CDN(구 Now CDN) 전용으로 설계되었음을 확인하는 PR: [#8866 — Remove stale-if-error header from SPR](https://github.com/vercel/next.js/pull/8866)

[^8]: [PR #70674 — Changed default SWR delta value to 1 year](https://github.com/vercel/next.js/pull/70674). Next.js 15에서 `swrDelta`가 `expireTime`으로 [개명](https://github.com/vercel/next.js/pull/71159)되어 안정화되었다.
