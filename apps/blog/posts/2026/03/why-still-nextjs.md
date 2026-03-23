---
title: '왜 여전히 Next.js를 쓰는가'
tags:
  - nextjs
  - react
  - vercel
  - frontend
  - web
published: false
date: 2026-03-23 22:00:00
description: '기술이 아니라 관성이 지탱하는 생태계'
series: 'Next.js의 현주소'
seriesOrder: 5
---

## Table of Contents

## 서론

[이 시리즈](/2026/03/nextjs-edge-runtime-rise-and-fall)에서 네 편에 걸쳐 다뤘던 이야기를 정리하면 이렇다.

- [Edge Runtime은 후퇴했다.](/2026/03/nextjs-edge-runtime-rise-and-fall) Vercel이 "Edge에서 모든 것을 실행한다"고 약속한 비전은 Node.js Runtime 권장으로 돌아왔고, Next.js 16의 `proxy`는 Node.js only로 설계되었다.
- [Cloudflare는 Next.js를 다시 만들기 시작했다.](/2026/03/why-cloudflare-rebuilt-nextjs) 문서화되지 않은 빌드 출력물과 비공개 `minimalMode` 플래그 때문에, 타 플랫폼은 Next.js를 지원하기 위해 역공학에 의존해야 했다. Cloudflare는 결국 API 표면을 Vite 위에서 재구현하는 vinext를 택했다.
- [React의 거버넌스는 흔들리고 있다.](/2026/03/react-is-whose) RSC의 핵심 설계자가 Vercel 소속이고, 새 기능은 Next.js에서 먼저 "안정화"된 뒤 1년 이상 지나서야 React에 공식 반영된다. React Foundation은 출범했지만 기술 거버넌스의 구체적 구조는 아직 공개되지 않았다.
- [SSR 성능에는 구조적 격차가 있다.](/2026/03/is-nextjs-fast-enough) Platformatic 벤치마크에서 TanStack Start는 13ms/100% 성공, Next.js 16 canary는 431ms/64% 성공이었다. RSC의 이중 데이터 아키텍처와 프레임워크 레이어의 누적 오버헤드가 원인이다.

이 모든 문제에도 불구하고 Next.js는 건재하다. [State of JavaScript 2025](https://2025.stateofjs.com/en-US/libraries/meta-frameworks/)에서 Next.js는 메타 프레임워크 사용률 1위를 유지하고 있고, npm 주간 다운로드는 2위인 Nuxt의 4배를 넘긴다[^1]. 만족도가 하락하고 있음에도 채택률은 줄지 않는다.

왜 그런가? 이 글의 주장은 이렇다. **Next.js를 지탱하는 힘은 기술적 우위가 아니라 Vercel이 설계한 경로 의존성이다.** 그리고 그 경로 의존성은 Next.js의 강점과 약점을 동시에 만들어낸다. 빛과 어둠이 다른 곳에서 오는 것이 아니라, 같은 설계에서 나온다.

## Vercel이 설계한 경로 의존성

### 생태계의 숫자

Next.js의 지배력을 확인하는 가장 직접적인 지표는 생태계의 규모다.

| 지표                    | Next.js | 2위          | 비고                    |
| ----------------------- | ------- | ------------ | ----------------------- |
| npm 주간 다운로드[^1]   | ~900만  | Nuxt ~200만  | 약 4.5배                |
| GitHub 스타             | 133k+   | Nuxt 56k+    |                         |
| Stack Overflow 질문[^2] | 60,000+ | Nuxt ~15,000 | 약 4배                  |
| 공식 예제/템플릿[^3]    | 400+    | —            | vercel/next.js/examples |

TanStack Start나 React Router v7은 이 숫자 경쟁에 아직 참가조차 못한 수준이다. TanStack Start의 npm 주간 다운로드는 5만을 넘기지 못하고, React Router는 라우터로서의 다운로드(주간 1,400만)는 압도적이지만 메타 프레임워크로서의 v7 채택은 아직 초기다.

### 핵심 기여자 고용

[3편](/2026/03/react-is-whose)에서 다뤘듯, Vercel은 React Core 팀의 핵심 인물들을 고용했다. Sebastian Markbåge(RSC 설계자), Andrew Clark(React Fiber 공동 창시자)이 대표적이다. 이것은 단순한 인재 영입이 아니라 기술 방향에 대한 구조적 영향력의 확보다.

이 전략은 효과적이었다. RSC, Server Actions, `"use cache"` — React의 최근 주요 기능들이 Next.js에서 먼저 구현되고 검증된 뒤 React에 반영되는 패턴이 정착되었다. 개발자 입장에서 React의 최신 기능을 가장 빨리 쓸 수 있는 프레임워크는 사실상 Next.js뿐이다.

### 서드파티 생태계의 정렬

Vercel의 [통합 마켓플레이스](https://vercel.com/integrations)에는 CMS(Sanity, Contentful, Storyblok), 인증(Clerk, Auth0), 데이터베이스(Neon, PlanetScale, Supabase), 분석(Segment, Amplitude) 등 주요 서드파티 서비스들이 등록되어 있다. 이들은 Next.js용 공식 SDK나 플러그인을 우선 제공한다.

[Sanity](https://www.sanity.io/exchange?framework=nextjs)를 예로 들면, Next.js용 공식 통합(next-sanity)은 App Router, Server Components, Visual Editing을 완벽히 지원한다. SvelteKit이나 Remix용 통합은 커뮤니티 수준이거나 기능이 제한적이다. CMS를 하나 선택하는 순간 프레임워크 선택지가 좁혀지는 것이다.

이것은 Vercel만의 특수한 전략이 아니다. 플랫폼 비즈니스의 교과서적 패턴이다. AWS가 Lambda 생태계를, Apple이 App Store 생태계를 구축한 것과 구조적으로 같다. 음모가 아니라 합리적인 비즈니스 전략이고, 그 합리성이 경로 의존성을 만든다.

### 경로 의존성의 메커니즘

경제학에서 경로 의존성(path dependence)은 초기 선택이 후속 선택의 범위를 제한하는 현상을 말한다[^4]. QWERTY 자판이 대표적 사례다. 기술적으로 최적이 아니어도, 타이피스트·교육·소프트웨어가 모두 QWERTY에 맞춰져 있기 때문에 전환 비용이 이점을 초과한다.

Next.js의 경로 의존성은 세 가지 층위에서 작동한다.

1. **학습 투자**: App Router의 멘탈 모델(서버/클라이언트 컴포넌트 경계, `"use client"`, Flight 프로토콜), Next.js 고유의 파일 규약(`layout.tsx`, `loading.tsx`, `error.tsx`), Middleware 패턴 등은 다른 프레임워크로 이전되지 않는 지식이다.
2. **인프라 결합**: Vercel에 배포하고 있다면 Edge Config, KV Store, Image Optimization, Analytics 등 플랫폼 서비스와 결합되어 있을 가능성이 높다. 프레임워크를 바꾸면 배포 파이프라인도 다시 구축해야 한다.
3. **생태계 의존**: 위에서 언급한 서드파티 통합들이다. CMS, 인증, 분석 도구가 Next.js에 최적화되어 있으면, 프레임워크 전환은 이 모든 통합을 재검증하는 작업이 된다.

이 세 가지의 합이 전환 비용이다. 그리고 이 전환 비용이 높을수록, 기존 선택을 유지하는 것이 합리적이 된다 — 설령 더 나은 대안이 존재하더라도.

## 같은 설계, 다른 결과

앞 절의 모든 항목에는 이면이 있다. 빛과 어둠이 다른 원인에서 오는 것이 아니라 **같은 설계 결정의 양면**이라는 것이 이 시리즈의 핵심 관찰이다.

| Vercel의 설계 결정      | 빛                                            | 어둠                                                                                      |
| ----------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| React Core 팀원 고용    | React 기능 개발 가속, Next.js에서 빠른 프리뷰 | 거버넌스 우려, 프레임워크-라이브러리 의존 역전 ([3편](/2026/03/react-is-whose))           |
| Next.js에서 먼저 구현   | 개발자가 최신 React 기능에 빠르게 접근        | RSC "안정화" 19개월 선행, `"use cache"` React 스펙 부재                                   |
| Vercel 플랫폼 최적화    | 배포 경험 최상 (제로 설정, Edge 자동 분배)    | `minimalMode` 비대칭, 타 플랫폼 지원 비용 ([2편](/2026/03/why-cloudflare-rebuilt-nextjs)) |
| 서드파티 생태계 투자    | 풍부한 통합, 개발 생산성                      | vendor lock-in, 전환 비용 증가                                                            |
| 캐싱/ISR 중심 성능 전략 | 캐시 적중 시 뛰어난 응답 속도                 | 캐싱 없는 SSR 기저 성능 방치 ([4편](/2026/03/is-nextjs-fast-enough))                      |

이 표를 관통하는 패턴은 **"Vercel 안에서 최적, Vercel 밖에서 차선"**이다.

Edge Runtime의 궤적이 이것을 가장 명확히 보여준다. [1편](/2026/03/nextjs-edge-runtime-rise-and-fall)에서 추적했듯, Vercel은 Edge를 적극적으로 밀었다. V8 Isolate 기반의 빠른 콜드 스타트, CDN 수준의 지연시간 — 기술적 비전은 매력적이었다. 하지만 Edge Runtime의 제약(Node.js API 미지원, 번들 크기 제한, 네이티브 모듈 불가)은 Vercel의 인프라에서는 Serverless 폴백으로 우회 가능했지만, 자체 인프라에서는 그대로 벽이 되었다. 결국 Vercel 스스로 Node.js Runtime을 권장하는 방향으로 후퇴했고, 그 후퇴의 비용은 Edge를 믿고 코드를 작성한 개발자들에게 돌아갔다.

비판하기는 쉽다. 하지만 공정하게 말하면, **Vercel이 아니었으면 RSC는 아직도 실험적 기능이었을 것이다.** Meta의 React 팀은 연구 조직에 가깝고, RSC의 RFC가 발표된 2020년 12월부터 React 19 안정 릴리스(2024년 12월)까지 4년이 걸렸다. Vercel이 Next.js에서 RSC를 먼저 구현하고, 프로덕션 피드백을 React 팀에 전달하는 루프가 없었다면 이 기간은 더 길어졌을 것이다. 거버넌스의 독립성과 기능 개발의 속도 사이에는 구조적 긴장이 있고, Vercel은 속도를 택했다.

**빛을 유지하면서 어둠만 제거할 수 있는가?** 이것이 React Foundation이 답해야 할 질문이다. 기술 거버넌스를 Vercel로부터 분리하면 독립성은 확보되지만, Next.js를 통한 빠른 프로토타이핑과 피드백 루프는 약화될 수 있다. 반대로 현재 구조를 유지하면 개발 속도는 유지되지만, "벤더 중립"이라는 약속은 공허해진다.

## 그래서 언제 외면받는가

경로 의존성은 영원하지 않다. QWERTY가 지속되는 것은 전환 비용이 이점을 초과하기 때문인데, **전환 비용이 줄거나 유지 비용이 늘면** 균형이 깨진다. Next.js에서의 이탈을 촉발하는 조건은 사용자 유형에 따라 다르다.

### Vercel SaaS 사용자

Vercel에 배포하고 있는 사용자는 Next.js와 가장 높은 시너지를 누리는 동시에, 가장 높은 결합도를 가진다.

**이탈 트리거: 비용 이상 징후.** [4편](/2026/03/is-nextjs-fast-enough)에서 다뤘듯, Next.js 16의 세그먼트별 프리페치 도입 후 한 사용자는 Edge Request가 700% 증가하여 월 $800 이상의 추가 비용이 발생했다([GitHub 이슈 #85470](https://github.com/vercel/next.js/issues/85470)). 프레임워크 업그레이드가 곧 인프라 비용 증가로 이어지는 구조에서, 비용 이상 징후는 가장 직접적인 이탈 트리거다.

하지만 이 사용자들은 역설적으로 **이탈이 가장 어렵다.** Vercel의 플랫폼 서비스(Edge Config, KV, Analytics, Web Analytics)와 결합되어 있을수록, 프레임워크 전환은 플랫폼 전환까지 의미하기 때문이다. 이들에게 현실적인 첫 번째 선택지는 "Vercel 위에서 다른 프레임워크"보다는 "비용 최적화"다 — 프리페치 비활성화, ISR 적용 범위 확대, 정적 생성 비율 늘리기 등.

### 자체 인프라 사용자

Docker, Kubernetes, AWS ECS 등에서 Next.js를 자체 운영하는 사용자는 처음부터 "non-Vercel 세금"을 내고 있다.

**이탈 트리거: 운영 고통의 누적.** `minimalMode`에 접근할 수 없어 Middleware가 서버 프로세스 안에서 실행되고, 빌드 출력물의 구조 변경을 매 버전마다 추적해야 하며, 캐싱 없는 고부하 환경에서 OOMKilled와 레이턴시 급증을 경험한다. 이것은 한 번의 큰 사건이 아니라 매일의 작은 마찰이 쌓이는 과정이다.

[Northflank](https://northflank.com/blog/why-we-ditched-next-js-and-never-looked-back)가 대표적 사례다. 인프라 회사인 Northflank는 Next.js App Router에서 Remix로 전환하면서 "매일 겪는 고통"을 이유로 들었다. 특정 벤치마크나 보안 사고가 아니라, 프레임워크와 매일 싸우는 마찰이 임계치를 넘은 것이다.

이 그룹은 이미 Vercel 플랫폼과 분리되어 있으므로, 전환 비용의 '인프라 결합' 항목이 없다. 전환 장벽은 학습 투자와 서드파티 생태계 의존이 전부다.

### 공통 이탈 요인: 불신의 누적

두 그룹 모두에게 작동하는 요인이 있다. **신뢰의 점진적 침식**이다.

- App Router가 "너무 일찍 안정화 선언되었다"는 것을 Next.js 팀 스스로 인정했다[^5]
- Server Components의 테스팅 전략이 3년째 부재하다 ([Testing Library #1209](https://github.com/testing-library/react-testing-library/issues/1209))
- `"use cache"`가 React 스펙 없이 Next.js 단독 기능으로 도입되었다
- 세그먼트별 프리페치가 비용 영향을 충분히 고지하지 않은 채 배포되었다

이 각각은 개별적으로 프레임워크를 버릴 이유가 되지 않는다. 하지만 누적되면 "이 프레임워크가 내 이익을 대변하는가?"라는 근본적 의문으로 이어진다. [4편](/2026/03/is-nextjs-fast-enough)의 벤치마크 데이터는 이 맥락에서 읽어야 한다. 성능 격차 자체가 이탈의 직접 원인이라기보다, **이미 축적된 불신에 객관적 근거를 부여하는 역할**을 한다. "느낌적으로 불편했는데 데이터로도 확인되었다"는 순간이 전환을 고려하기 시작하는 시점이다.

## 대안의 성숙이란 무엇인가

이탈의 조건이 갖춰져도, 갈 곳이 없으면 떠나지 못한다. 그런데 "갈 곳이 있다"의 기준은 기술적 완성도가 아니다.

### 기술적 준비는 이미 되었다

2026년 3월 현재, React SSR 프레임워크의 대안은 대부분 기술적으로 충분히 성숙해 있다.

| 프레임워크          | 특징                                        | 성숙도                                                |
| ------------------- | ------------------------------------------- | ----------------------------------------------------- |
| **TanStack Start**  | React 19, RSC 없는 SSR, Vite 기반           | Platformatic 벤치마크에서 Next.js 대비 SSR 30배+ 빠름 |
| **React Router v7** | Remix의 후속, Shopify가 후원                | Shopify의 Hydrogen에서 프로덕션 검증                  |
| **Remix 3**         | React에서 벗어나 Preact 포크 방향을 탐색 중 | 방향 전환 초기, 프로덕션 채택 미지수                  |
| **Astro**           | 콘텐츠 중심, Islands Architecture           | 4.x 안정, 문서 사이트/블로그에서 강세                 |

기술적으로 "Next.js가 아니면 안 되는" 시나리오는 점점 줄고 있다. RSC가 반드시 필요한 경우가 아니라면, TanStack Start나 React Router v7이 같은 React 19 위에서 더 가벼운 런타임을 제공한다.

### 하지만 사회적 정당성은 아직이다

프레임워크 전환은 기술적 결정인 동시에 사회적 결정이다. 팀원들을 설득해야 하고, 채용 공고를 다시 써야 하며, "왜 Next.js 안 써요?"라는 질문에 답해야 한다.

**채용 시장이 가장 강력한 잠금 장치다.** 프론트엔드 채용 공고에서 "Next.js 경험"은 거의 표준 요건이 되었다. TanStack Start 경험을 요구하는 공고는 사실상 없다. 팀이 Next.js를 떠나면 채용 풀이 줄어든다. 이것은 기술적 판단이 아니라 조직 운영의 문제다.

**서드파티 지원도 마찬가지다.** Vercel의 통합 마켓플레이스에 등록된 서비스들이 TanStack Start용 공식 SDK를 제공하기 시작하려면, TanStack Start의 시장 점유율이 서드파티 기업의 투자를 정당화할 수준에 도달해야 한다. 이것은 닭과 달걀 문제다 — 사용자가 없어서 통합이 없고, 통합이 없어서 사용자가 모이지 않는다.

### 전환점은 언제 오는가

jQuery에서 React로의 전환은 jQuery가 망해서가 아니라, React를 쓰는 것이 "정상"이 되었을 때 일어났다. Angular 1에서 React로의 이동도 Angular가 끔찍해서가 아니라, React를 채용 공고에 쓸 수 있게 되었을 때 가속화되었다.

**대안의 성숙은 "더 나은 기술이 나왔다"가 아니라 "그것을 선택해도 이상하지 않게 되었다"의 문제다.** 구체적으로, 다음 세 가지가 동시에 충족되는 시점이 전환점이다.

1. **채용 공고에 대안 프레임워크가 등장한다.** "React Router v7 / TanStack Start 경험 우대"가 주요 기업 공고에 나타나기 시작하는 시점.
2. **서드파티가 공식 지원한다.** Sanity, Clerk 같은 주요 서비스가 Next.js와 동등한 수준의 대안 프레임워크 SDK를 제공하는 시점.
3. **"왜 안 써요?" 질문이 사라진다.** 팀이 Next.js 대신 TanStack Start를 선택했을 때, 정당화 비용이 0에 가까워지는 시점.

2026년 3월 현재, 이 세 가지 중 어느 것도 충족되지 않았다. 이것이 Next.js의 가장 강력한 방어선이다 — 기술이 아니라 사회적 관성.

## AI 시대의 역설

경로 의존성의 마지막 층위가 있다. 2026년에 새로 등장한 변수, AI다.

### AI는 Next.js를 가장 잘 안다

ChatGPT, Claude, GitHub Copilot — 현재의 주요 코딩 AI 모델들은 Next.js 코드를 가장 유창하게 생성한다. 이유는 단순하다. **학습 데이터에 Next.js가 가장 많기 때문이다.**

Stack Overflow의 60,000+ 질문, GitHub의 수백만 개 리포지토리, 수만 개의 블로그 포스트와 튜토리얼. Next.js는 React 메타 프레임워크 중 가장 많은 텍스트 데이터를 생성해왔고, 이 데이터가 LLM의 학습 코퍼스에 포함되어 있다.

실무에서 이것은 직접적인 영향을 미친다. AI에게 "이커머스 상품 페이지를 만들어줘"라고 요청하면, 높은 확률로 Next.js App Router + Server Components 코드가 나온다. TanStack Start 코드를 생성하려면 명시적으로 지정해야 하고, 그래도 품질이 떨어지는 경우가 많다. 프레임워크의 AI 친화도가 개발 생산성에 직결되는 시대에, **AI는 Next.js의 경로 의존성을 강화하는 새로운 수확 체증(increasing returns) 메커니즘이다.**

### AI는 Next.js를 가장 싸게 대체할 수 있다

같은 이유가 반대 방향으로도 작동한다. AI가 Next.js를 잘 이해한다는 것은, Next.js 코드베이스를 다른 프레임워크로 **번역하는 비용도 낮다**는 뜻이다.

[2편](/2026/03/why-cloudflare-rebuilt-nextjs)에서 다뤘던 vinext가 이것을 실증했다. Cloudflare의 Igor Minar는 "Claude가 이 프로젝트의 대부분의 코드를 작성했다"고 밝혔다[^6]. Next.js의 공개 API 표면을 Vite 위에서 재구현하는 작업에서, **기존 테스트 스위트가 사실상의 명세서(specification) 역할**을 했다. AI가 코드를 작성하고, 테스트가 정확성을 검증한다. 프레임워크 전환에서 가장 비싼 부분 — "기존 동작을 정확히 재현하는 것" — 의 비용이 극적으로 낮아졌다.

이것은 vinext에 국한되지 않는다. 테스트 커버리지가 충분한 Next.js 프로젝트라면, AI에게 "이 앱을 TanStack Start로 마이그레이션해줘"라고 요청하는 것이 점점 현실적이 되고 있다. 파일 기반 라우팅을 설정 기반 라우팅으로 변환하고, Server Components를 loader 패턴으로 재작성하고, `"use client"` 경계를 제거하는 — 이런 기계적 변환은 AI가 잘하는 영역이다.

### 같은 곳에서 빛과 어둠이

단기적으로 AI는 Next.js를 강화한다. 더 많은 개발자가 AI로 Next.js 코드를 생성하면, 더 많은 Next.js 프로젝트가 만들어지고, 더 많은 학습 데이터가 생기는 선순환이다.

장기적으로 AI는 프레임워크 전환 비용을 낮추는 방향으로 작동할 수 있다. 다만 현재 AI 기반 마이그레이션에는 명확한 한계가 있다. Next.js의 복잡한 캐싱 전략(`revalidateTag`, `revalidatePath`의 중첩 의존), Middleware의 암묵적 실행 순서, Server Actions에서 클로저로 캡처되는 서버 상태 — 이런 패턴은 기계적 변환의 영역이 아니다. vinext가 보여준 것은 "공개 API 표면의 재구현"이지, 임의의 프로덕션 앱을 자동으로 마이그레이션하는 것과는 다르다.

질문은 이것이다. **AI가 새로운 잠금을 만드는 속도가, 기존 잠금을 허무는 속도보다 빠른가?** 현재로서는 전자가 우세하다. AI 코드 생성의 품질 차이(Next.js >> TanStack Start)가 일상적으로 체감되는 반면, AI 마이그레이션은 단순한 라우팅 변환 수준을 넘어서면 여전히 사람의 개입이 필요하기 때문이다.

## 결론

### Next.js를 지탱하는 것

이 시리즈의 다섯 편을 관통하는 관찰을 정리하면 이렇다.

Next.js는 SSR 성능에서 같은 React 생태계의 다른 프레임워크에 뒤처지고 있고([4편](/2026/03/is-nextjs-fast-enough)), 배포는 Vercel에 비대칭적으로 최적화되어 있으며([2편](/2026/03/why-cloudflare-rebuilt-nextjs)), React의 기술 방향에 대한 Vercel의 영향력은 구조적 질문을 만들고([3편](/2026/03/react-is-whose)), 한때 핵심 셀링 포인트였던 Edge Runtime은 후퇴했다([1편](/2026/03/nextjs-edge-runtime-rise-and-fall)).

그런데도 Next.js가 지배적인 이유는 **기술적 우위가 아니라 경로 의존성이다.** 생태계 규모, 채용 시장, 서드파티 통합, AI 학습 데이터 — 이 모든 것이 Next.js를 선택하는 것이 "기본값(default)"이 되게 만든다. 기본값의 힘은 강력하다. 적극적으로 반대할 이유가 없으면 사람들은 기본값을 선택한다.

### 관성은 언제 끊기는가

그 관성이 끊기는 것은 하나의 벤치마크나 하나의 스캔들이 아니다. 개발자가 매일 겪는 마찰의 누적이다.

- 서버-클라이언트 경계를 넘는 에러를 또 디버깅해야 할 때
- Server Components를 테스트하는 공식적 방법이 여전히 없을 때
- 프레임워크 업그레이드 후 예상치 못한 비용 청구서를 받을 때
- 캐싱 없이는 감당할 수 없는 부하를 경험할 때

이 마찰 하나하나는 견딜 만하다. 하지만 합이 임계치를 넘는 순간 — 그리고 대안이 사회적으로 정당해지는 순간 — 전환은 시작된다. 경로 의존성 이론에서 이것을 "잠금 해제(lock-in break)"라 부르며, 대체로 점진적이지 않고 비선형적으로 일어난다[^7]. 오랫동안 변하지 않다가, 어느 순간 급격히 전환된다.

### 세 가지 조건에 따른 판단

이 시리즈를 읽은 독자가 "그래서 나는 어떻게 해야 하는가"를 묻는다면, 조건에 따라 다르게 답하겠다.

**Vercel에 배포하고 있고, 팀에 유의미한 불만이 없다면** — 바꿀 이유가 없다. Vercel 위의 Next.js는 여전히 가장 매끄러운 풀스택 개발·배포 경험을 제공한다. 경로 의존성은 비용이면서 동시에 자산이다. 축적된 지식과 인프라 결합이 생산성을 높이고 있다면, 그것은 잠금이 아니라 투자의 회수다.

**자체 인프라에서 운영하면서 동적 SSR 비중이 높다면** — 대안을 검토할 시점이다. [4편](/2026/03/is-nextjs-fast-enough)의 벤치마크가 보여주듯, 캐싱 없는 SSR 환경에서 Next.js의 기저 성능은 구조적으로 불리하다. TanStack Start나 React Router v7을 파일럿으로 검토해볼 가치가 있다. 같은 React 19 위에서 동작하므로 기존 컴포넌트 자산을 상당 부분 재사용할 수 있다.

**새 프로젝트를 시작한다면** — "기본값이니까 Next.js"는 더 이상 충분한 근거가 아니다. 프로젝트의 요구사항을 먼저 정의하고 — 정적 생성 비율, SSR 부하 예상치, 배포 환경, 팀의 기존 경험 — 그에 맞는 프레임워크를 선택해야 한다. 2026년에 React로 풀스택 웹앱을 만드는 선택지는 Next.js만이 아니다.

### 마지막으로

이 시리즈는 Next.js의 종말을 선언하려고 쓴 것이 아니다. Next.js는 건재하고, 앞으로도 상당 기간 가장 많이 사용되는 React 메타 프레임워크일 것이다.

다만, "왜 Next.js를 쓰는가?"라는 질문에 대한 정직한 대답이 점점 **"이미 쓰고 있으니까"**에 가까워지고 있다는 것은 인지해야 한다. 그 자체가 나쁜 것은 아니다 — 전환 비용이 실재하고, 기존 선택을 유지하는 것이 합리적인 경우는 많다. 하지만 관성과 의도적 선택은 다르다. **자신이 Next.js를 "선택한" 것인지, 아니면 경로 의존성이 선택을 "대신한" 것인지를 구분할 수 있어야 한다.**

그 구분이 가능해지면, 언제 머물고 언제 떠날지를 기술이 아닌 맥락에서 판단할 수 있게 된다. 이 시리즈가 그 판단에 조금이라도 도움이 되었길 바란다.

## 참고

- [State of JavaScript 2025 — Meta-frameworks](https://2025.stateofjs.com/en-US/libraries/meta-frameworks/)
- [State of React 2024](https://2024.stateofreact.com/en-US)
- [Northflank — Why we ditched Next.js and never looked back](https://northflank.com/blog/why-we-ditched-next-js-and-never-looked-back)
- [Vercel — Supporting the future of React](https://vercel.com/blog/supporting-the-future-of-react)
- [Cloudflare — vinext](https://github.com/cloudflare/vinext)
- [Platformatic — React SSR Framework Showdown](https://blog.platformatic.dev/react-ssr-framework-benchmark-tanstack-start-react-router-nextjs)
- [TanStack Blog — 5x SSR Throughput](https://tanstack.com/blog/tanstack-start-5x-ssr-throughput)
- [Next.js 16.2 릴리스 블로그](https://nextjs.org/blog/next-16-2)
- [React Foundation](https://react.dev/blog/2026/02/24/the-react-foundation)
- [GitHub Issue #85470 — Server requests and latency increased after upgrading from Next.js 15 to 16](https://github.com/vercel/next.js/issues/85470)
- [Paul David — Path Dependence (Stanford Encyclopedia of Philosophy)](https://plato.stanford.edu/entries/path-dependence/)

[^1]: npm trends 2026년 3월 기준. `next` 주간 다운로드 약 900만, `nuxt` 약 200만, `astro` 약 90만, `@tanstack/react-router` 약 70만, `@remix-run/react` 약 50만.

[^2]: Stack Overflow에서 `[next.js]` 태그가 달린 질문 수. 정확한 수치는 시점에 따라 달라지며, 방향성의 근거로 제시한다.

[^3]: [vercel/next.js/examples](https://github.com/vercel/next.js/tree/canary/examples) 디렉토리 기준.

[^4]: Paul David, "Clio and the Economics of QWERTY" (1985). 경로 의존성 개념의 고전적 논문.

[^5]: React Core 팀의 Joe Savona가 TanStack 디스코드에서 인정한 것으로 알려진 발언: "The App Router was likely marked stable too soon... Obviously that was a mistake." 비공개 채널 발언으로 독립 검증이 어렵다. [원본 링크](https://discord.com/channels/719702312431386674/1285620257146753128/1286365966666162206)는 메시지 삭제나 채널 변경에 따라 접근 불가할 수 있다.

[^6]: Igor Minar, ["Claude has written the majority of the code in this project"](https://x.com/AustinPlays0/status/1894504792392745365), vinext 공개 당시.

[^7]: Brian Arthur, "Increasing Returns and Path Dependence in the Economy" (1994). 기술 잠금의 비선형적 해제에 대한 이론적 프레임워크.
