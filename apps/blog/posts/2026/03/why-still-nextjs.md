---
title: '왜 여전히 Next.js를 쓰는가'
tags:
  - nextjs
  - react
  - vercel
  - frontend
  - web
published: true
date: 2026-03-23 22:00:00
description: '기술 우위보다 강한 전환 비용'
thumbnail: /thumbnails/2026/03/why-still-nextjs.png
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

이 모든 문제에도 불구하고 Next.js는 지배적 위치를 유지하고 있다. 설문 기반 지표인 [State of JavaScript 2025](https://2025.stateofjs.com/en-US/libraries/meta-frameworks/)에서도 Next.js는 메타 프레임워크 사용률 1위이고, npm 주간 다운로드는 2위인 Nuxt의 4배를 넘긴다[^1]. 만족도가 하락하고 있음에도 채택률은 줄지 않는다.

왜 그런가? **Next.js가 지금도 기본값인 이유는 런타임이 빨라서가 아니라, 바꾸는 비용이 너무 높기 때문이다.** 생태계, 플랫폼, 채용 시장, 학습 자산. Vercel이 쌓아 올린 것들이 전환 비용을 만들었다. 그리고 그 전환 비용이 Next.js를 지탱한다.

중요한 것은, 이 구조가 강점과 약점을 동시에 만든다는 점이다. 빛과 어둠은 다른 곳에서 오지 않는다. 같은 설계에서 나온다.

## Vercel이 설계한 경로 의존성

### 생태계의 숫자

숫자부터 보자. Next.js의 npm 주간 다운로드는 약 900만으로, 2위인 Nuxt(약 200만)의 4.5배다[^1]. GitHub 스타는 133k를 넘겼고 Nuxt(56k)와 두 배 이상 차이가 난다. Stack Overflow에서 `[next.js]` 태그가 붙은 질문만 6만 건이 넘는데[^2], 이것은 단순한 인기 지표가 아니라 "검색하면 답이 나오는" 학습 자산의 축적량이다. 공식 예제 디렉토리에도 400개 이상의 템플릿이 들어 있다[^3].

이 숫자들이 같은 것을 측정하지는 않는다. 다만 공통적으로 보여주는 것은, Next.js가 새로 선택되는 프레임워크라기보다 이미 가장 많은 자료와 사례가 축적된 기본값이라는 점이다. TanStack Start나 React Router v7은 이 숫자 경쟁에 아직 참가조차 못한 수준이다. TanStack Start의 npm 주간 다운로드는 5만을 넘기지 못하고, React Router는 라우터로서의 다운로드(주간 1,400만)는 압도적이지만 메타 프레임워크로서의 v7 채택은 아직 초기다.

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

중요한 것은 이 세 층위가 단순히 병렬적으로 쌓이는 것이 아니라 **자기강화적 루프(self-reinforcing loop)** 를 형성한다는 점이다. 사용자가 많기 때문에 학습 자료가 풍부하고, 학습 자료가 풍부하기 때문에 새 팀원의 온보딩이 빠르며, 온보딩이 빠르니 채용이 쉽고, 채용이 쉬우니 서드파티가 우선 투자하고, 서드파티 투자가 다시 사용자 증가로 이어진다. 이 루프 안에서는 개별 기술 비교에서 약점이 드러나더라도 선택의 기본값은 쉽게 바뀌지 않는다.

물론 경로 의존성은 무능한 제품을 살려주는 마법이 아니다. Next.js가 여기까지 온 배경에는 실제로 뛰어난 DX, 빠른 기능 실험, 풍부한 문서와 예제가 있었다. 이 글의 주장은 Next.js의 기술이 부실하다는 것이 아니라, **현재의 지배력이 더 이상 런타임 성능이나 구조적 단순성만으로는 설명되지 않는다** 는 데 있다.

## 같은 설계, 다른 결과

앞 절의 모든 항목에는 이면이 있다. 빛과 어둠이 다른 원인에서 오는 것이 아니라 **같은 설계 결정의 양면** 이라는 것이 이 시리즈의 핵심 관찰이다.

| Vercel의 설계 결정      | 빛                                            | 어둠                                                                                      |
| ----------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| React Core 팀원 고용    | React 기능 개발 가속, Next.js에서 빠른 프리뷰 | 거버넌스 우려, 프레임워크-라이브러리 의존 역전 ([3편](/2026/03/react-is-whose))           |
| Next.js에서 먼저 구현   | 개발자가 최신 React 기능에 빠르게 접근        | RSC "안정화" 19개월 선행, `"use cache"` React 스펙 부재                                   |
| Vercel 플랫폼 최적화    | 배포 경험 최상 (제로 설정, Edge 자동 분배)    | `minimalMode` 비대칭, 타 플랫폼 지원 비용 ([2편](/2026/03/why-cloudflare-rebuilt-nextjs)) |
| 서드파티 생태계 투자    | 풍부한 통합, 개발 생산성                      | vendor lock-in, 전환 비용 증가                                                            |
| 캐싱/ISR 중심 성능 전략 | 캐시 적중 시 뛰어난 응답 속도                 | 캐싱 없는 SSR 기저 성능 방치 ([4편](/2026/03/is-nextjs-fast-enough))                      |

이 표를 관통하는 패턴은 **"Vercel 안에서 최적, Vercel 밖에서 차선"** 이다. 문제는 이 설계가 비합리적이라는 데 있지 않다. Vercel의 비즈니스와 제품 전략이라는 관점에서는 매우 합리적이다. 다만 그 합리성이 모든 사용자, 특히 non-Vercel 인프라 사용자에게 동일한 이익으로 환원되지 않는다는 점이 갈등의 출발점이다.

Edge Runtime의 궤적이 이것을 가장 명확히 보여준다. [1편](/2026/03/nextjs-edge-runtime-rise-and-fall)에서 추적했듯, Vercel은 Edge를 적극적으로 밀었다. V8 Isolate 기반의 빠른 콜드 스타트, CDN 수준의 지연시간 — 기술적 비전은 매력적이었다. 하지만 Edge Runtime의 제약(Node.js API 미지원, 번들 크기 제한, 네이티브 모듈 불가)은 Vercel의 인프라에서는 Serverless 폴백으로 우회 가능했지만, 자체 인프라에서는 그대로 벽이 되었다. 결국 Vercel 스스로 Node.js Runtime을 권장하는 방향으로 후퇴했고, 그 후퇴의 비용은 Edge를 믿고 코드를 작성한 개발자들에게 돌아갔다.

비판하기는 쉽다. 하지만 공정하게 말하면, **Vercel이 없었다면 RSC의 상용화는 지금보다 훨씬 느렸을 가능성이 크다.** Meta의 React 팀은 연구 조직에 가깝고, RSC의 RFC가 발표된 2020년 12월부터 React 19 안정 릴리스(2024년 12월)까지 4년이 걸렸다. Vercel이 Next.js에서 RSC를 먼저 구현하고, 프로덕션 피드백을 React 팀에 전달하는 루프가 없었다면 이 기간은 더 길어졌을 것이다. 거버넌스의 독립성과 기능 개발의 속도 사이에는 구조적 긴장이 있고, Vercel은 속도를 택했다.

이 구조가 왜 만들어졌는지를 이해하려면, Vercel의 인센티브를 봐야 한다. Vercel은 2024년 Series E 기준 누적 $5.6B 이상의 기업 가치를 인정받았고, 그에 상응하는 투자금 회수 압력이 존재한다. Vercel의 수익 구조가 플랫폼 사용량과 연결되어 있다는 점을 감안하면, Next.js의 기능 우선순위가 Vercel 인프라의 장점을 극대화하는 방향으로 정렬될 유인은 충분하다. 이것이 곧 의도적 비용 유도 설계를 의미하는 것은 아니지만, 적어도 프레임워크의 최적화 방향이 플랫폼 사업자의 경제적 이해와 완전히 분리되어 있다고 보기도 어렵다.

**빛을 유지하면서 어둠만 제거할 수 있는가?** 이것이 React Foundation이 답해야 할 질문이다. 기술 거버넌스를 Vercel로부터 분리하면 독립성은 확보되지만, Next.js를 통한 빠른 프로토타이핑과 피드백 루프는 약화될 수 있다. 반대로 현재 구조를 유지하면 개발 속도는 유지되지만, "벤더 중립"이라는 약속은 공허해진다.

## 그래서 언제 외면받는가

경로 의존성은 영원하지 않다. QWERTY가 지속되는 것은 전환 비용이 이점을 초과하기 때문인데, **전환 비용이 줄거나 유지 비용이 늘면** 균형이 깨진다. Next.js에서의 이탈을 촉발하는 조건은 사용자 유형에 따라 다르다.

### Vercel SaaS 사용자

Vercel에 배포하고 있는 사용자는 Next.js와 가장 높은 시너지를 누리는 동시에, 가장 높은 결합도를 가진다.

**이탈 트리거: 비용 이상 징후.** [4편](/2026/03/is-nextjs-fast-enough)에서 다뤘듯, Next.js 16의 세그먼트별 프리페치 도입 후 한 사용자는 Edge Request가 700% 증가하여 월 $800 이상의 추가 비용이 발생했다([GitHub 이슈 #85470](https://github.com/vercel/next.js/issues/85470)). 프레임워크 업그레이드가 곧 인프라 비용 증가로 이어지는 구조에서, 비용 이상 징후는 가장 직접적인 이탈 트리거다.

하지만 이 사용자들은 역설적으로 **이탈이 가장 어렵다.** Vercel의 플랫폼 서비스(Edge Config, KV, Analytics, Web Analytics)와 결합되어 있을수록, 프레임워크 전환은 플랫폼 전환까지 의미하기 때문이다. 이들에게 현실적인 첫 번째 선택지는 "Vercel 위에서 다른 프레임워크"보다는 "비용 최적화"다 — 프리페치 비활성화, ISR 적용 범위 확대, 정적 생성 비율 늘리기 등.

### 자체 인프라 사용자

Docker, Kubernetes, AWS ECS 등에서 Next.js를 자체 운영하는 팀은 적지 않다. Next.js의 주간 900만 다운로드와 Vercel의 유료 사용자 규모 사이 격차를 생각하면, 상당수가 Vercel 밖에서 Next.js를 돌리고 있다는 추정은 무리가 아니다.

이들이 Next.js를 선택한 이유는 Vercel 플랫폼이 아니라 Next.js 생태계 자체다. "React로 풀스택을 하려면 사실상 Next.js"라는 인식, 채용 시장에서 Next.js 경험자를 구하기 쉽다는 현실, Stack Overflow와 블로그에 쌓인 방대한 트러블슈팅 자산. 경로 의존성의 세 층위 중 '인프라 결합'은 이들에게 처음부터 없다. 대신 '학습 투자'와 '생태계 의존'이 잠금의 전부이고, 그것만으로도 충분히 강력하다.

문제는 Next.js의 DX가 Vercel 배포를 암묵적 전제로 설계된 부분들이 자체 인프라에서는 그대로 마찰이 된다는 점이다. `next/image`는 기본적으로 Vercel의 이미지 최적화를 사용하므로 자체 호스팅 시 별도 로더를 설정해야 하고, ISR 캐시 무효화는 `cacheHandler`를 직접 구현해야 한다. `output: 'standalone'` 모드에서는 정적 파일 서빙과 CDN 업로드를 수동으로 구성해야 하며, 공식 문서의 "Self-Hosting" 페이지가 존재하긴 하지만 프로덕션 운영의 엣지 케이스는 대부분 GitHub 이슈와 커뮤니티 블로그에 흩어져 있다.

**이탈 트리거는 이런 운영 고통의 누적이다.** `minimalMode`에 접근할 수 없어 Middleware가 서버 프로세스 안에서 실행되고, 빌드 출력물의 구조가 메이저 버전마다 바뀌며, 캐싱 없는 고부하 환경에서 OOMKilled와 레이턴시 급증을 경험한다. 한 번의 큰 사건이 아니라 매일의 작은 마찰이 쌓이는 과정이다.

[Northflank](https://northflank.com/blog/why-we-ditched-next-js-and-never-looked-back)가 대표적 사례다. 인프라 회사인 Northflank는 Next.js App Router에서 Remix로 전환하면서 "매일 겪는 고통"을 이유로 들었다. 특정 벤치마크나 보안 사고가 아니라, 프레임워크와 매일 싸우는 마찰이 임계치를 넘은 것이다.

이 그룹은 Vercel 플랫폼과 이미 분리되어 있으므로 인프라를 다시 구축할 필요가 없다. 전환 장벽은 학습 투자와 서드파티 생태계 의존뿐이다. 그래서 대안을 가장 먼저 검토할 가능성이 높은 것도 이들이다.

정리하면, 팀의 성격에 따라 이탈 순서가 다르다.

- **고부하 동적 SSR 앱** (자체 인프라): 가장 먼저 대안을 검토할 가능성이 높다. 캐싱 없는 SSR 성능 문제가 직접적으로 체감된다.
- **플랫폼/인프라 기업**: non-Vercel 운영 비용에 민감하므로 이탈 동기가 강하다.
- **콘텐츠/마케팅 사이트**: ISR과 정적 생성의 이점이 크므로 계속 Next.js에 머물 가능성이 높다.
- **대규모 채용 조직**: "Next.js 경험"이 채용 공고의 표준 요건인 상황에서, 프레임워크를 바꾸면 채용 풀이 줄어든다. 이 조직적 마찰이 기술적 판단을 압도하므로 마지막까지 기본값을 유지할 가능성이 높다.

### 공통 이탈 요인: 불신의 누적

두 그룹 모두에게 작동하는 요인이 있다. **신뢰의 점진적 침식** 이다.

- Server Components의 테스팅 전략이 3년째 부재하다 ([Testing Library #1209](https://github.com/testing-library/react-testing-library/issues/1209))
- `"use cache"`가 React 스펙 없이 Next.js 단독 기능으로 도입되었다
- 세그먼트별 프리페치가 비용 영향을 충분히 고지하지 않은 채 배포되었다

여기에 Next.js 내부의 마이그레이션 비용도 있다. 많은 팀이 Pages Router에서 App Router로 이동하는 과정 자체에서 이미 큰 피로를 겪고 있고, 이 경험은 프레임워크 외부로의 전환 불신과도 연결된다.

이 각각은 개별적으로 프레임워크를 버릴 이유가 되지 않는다. 하지만 누적되면 "이 프레임워크가 내 이익을 대변하는가?"라는 근본적 의문으로 이어진다. [4편](/2026/03/is-nextjs-fast-enough)의 벤치마크 데이터는 이 맥락에서 읽어야 한다. 성능 격차 자체가 이탈의 직접 원인이라기보다, **이미 축적된 불신에 객관적 근거를 부여하는 역할** 을 한다. "느낌적으로 불편했는데 데이터로도 확인되었다"는 순간이 전환을 고려하기 시작하는 시점이다.

## 대안의 성숙이란 무엇인가

이탈의 조건이 갖춰져도, 갈 곳이 없으면 떠나지 못한다. 그런데 "갈 곳이 있다"의 기준은 기술적 완성도가 아니다.

### 기술적 선택지는 충분히 생겨났다

2026년 3월 현재, React SSR 프레임워크의 대안은 "검토 불가능한 실험작" 수준을 벗어났다. 다만 기술적 가능성과 조직적 안전성은 별개다.

**TanStack Start**는 React 19 위에서 RSC 없이 Vite 기반 SSR을 제공한다. Platformatic 벤치마크에서 Next.js 대비 30배 이상 빠른 SSR 처리량을 기록했다. **React Router v7**은 Remix의 후속으로 Shopify가 후원하며, Hydrogen에서 프로덕션 검증을 마쳤다. **Remix 3**는 React 외부의 렌더링 레이어를 탐색하고 있지만[^7] 아직 방향 전환 초기다. **Astro**는 콘텐츠 중심 Islands Architecture로 4.x 안정 릴리스에 도달했고, 문서 사이트와 블로그에서 강세를 보인다.

기술적으로 "Next.js가 아니면 안 되는" 시나리오는 점점 줄고 있다. RSC를 전제로 하지 않는 구조 덕분에, TanStack Start나 React Router v7은 특정 SSR 시나리오에서 더 단순한 실행 모델을 제공한다. 물론 런타임 구조만으로 프레임워크를 선택하지는 않는다. 문서, 채용 시장, 서드파티 통합, 트러블슈팅 자산까지 포함하면 Next.js의 우위는 여전히 크다.

### 하지만 사회적 정당성은 아직이다

프레임워크 전환은 기술적 결정인 동시에 사회적 결정이다. 팀원들을 설득해야 하고, 채용 공고를 다시 써야 하며, "왜 Next.js 안 써요?"라는 질문에 답해야 한다.

**채용 시장이 가장 강력한 잠금 장치다.** 프론트엔드 채용 공고에서 "Next.js 경험"은 거의 표준 요건이 되었다. TanStack Start 경험을 요구하는 공고는 사실상 없다. 팀이 Next.js를 떠나면 채용 풀이 줄어든다. 이것은 기술적 판단이 아니라 조직 운영의 문제다.

**서드파티 지원도 마찬가지다.** Vercel의 통합 마켓플레이스에 등록된 서비스들이 TanStack Start용 공식 SDK를 제공하기 시작하려면, TanStack Start의 시장 점유율이 서드파티 기업의 투자를 정당화할 수준에 도달해야 한다. 이것은 닭과 달걀 문제다 — 사용자가 없어서 통합이 없고, 통합이 없어서 사용자가 모이지 않는다.

### 전환점은 언제 오는가

jQuery에서 React로의 전환은 jQuery가 망해서가 아니라, React가 조직적으로 설명 가능한 선택이 되었을 때 일어났다. Angular 1에서 React로의 이동도 Angular가 끔찍해서가 아니라, React를 채용 공고에 쓸 수 있게 되었을 때 가속화되었다.

대안의 성숙은 "더 나은 기술이 나왔다"가 아니라 "그것을 선택해도 이상하지 않게 되었다"의 문제다. 신호는 이런 것들이다. 주요 기업의 채용 공고에 "React Router v7 / TanStack Start 경험 우대"가 등장하는 것. Sanity, Clerk 같은 서드파티가 Next.js용과 동등한 수준의 대안 프레임워크 SDK를 출시하는 것. 팀이 Next.js 대신 다른 프레임워크를 골랐을 때 "왜요?"라는 질문 자체가 사라지는 것.

2026년 3월 현재, 이 중 어느 것도 일어나지 않았다. TanStack Start 경험을 요구하는 채용 공고는 사실상 없고, 주요 서드파티의 공식 SDK도 Next.js 우선이며, 프레임워크 선택에서 Next.js는 여전히 설명이 필요 없는 유일한 선택지다. 이것이 Next.js의 가장 강력한 방어선이다 — 기술이 아니라 사회적 관성.

다만 이런 전환은 보통 수개월이 아니라 수년 단위로 진행된다. 채용 시장과 서드파티 생태계의 관성은 기술 변화보다 훨씬 느리게 움직이기 때문이다.

## AI 시대의 역설

경로 의존성의 마지막 층위가 있다. 2026년에 새로 등장한 변수, AI다.

### AI는 기본값을 재생산한다

ChatGPT, Claude, GitHub Copilot — 현재의 주요 코딩 AI는 Next.js 코드를 가장 유창하게 생성한다. Next.js는 React 메타 프레임워크 중 가장 많은 텍스트 데이터(Stack Overflow 질문, GitHub 리포지토리, 블로그 포스트)를 생성해왔고, 이 데이터가 LLM의 학습 코퍼스에 포함되어 있을 가능성이 높다. LLM의 학습 데이터 구성은 공개되지 않으므로 확정할 수는 없지만, AI에게 프레임워크를 지정하지 않고 코드를 요청하면 높은 확률로 Next.js 코드가 나온다는 경험적 정황은 이를 뒷받침한다.

프레임워크의 AI 친화도가 개발 생산성에 직결되는 시대에, **AI는 Next.js의 경로 의존성을 강화하는 새로운 수확 체증(increasing returns) 메커니즘이다.**

이 수확 체증은 반대편에서 보면 악순환이다. TanStack Start로 코드를 요청하면 AI는 학습 데이터 부족으로 부정확한 코드를 생성할 가능성이 높다. 개발자 경험이 나빠지면 채택이 느려지고, 채택이 느리면 블로그·Stack Overflow·GitHub에 데이터가 쌓이지 않으며, 데이터가 쌓이지 않으면 다음 세대 AI도 학습할 수 없다. 새로운 프레임워크가 이 루프에 진입하는 것 자체가 점점 어려워지는 구조다.

물론 이것이 영구적 잠금을 의미하지는 않는다. TanStack Start의 사용자가 늘고 생태계가 성숙하면 학습 데이터도 따라 쌓인다. 다만 그 격차가 좁혀지는 속도보다, Next.js 코퍼스가 확대되는 속도가 더 빠를 가능성이 높다는 것이 문제다. **"불가능"이 아니라 "더 오래 걸린다"** — AI는 전환의 방향이 아니라 전환의 속도에 영향을 미친다.

### 반대 방향도 있다 — 다만 제한적으로

같은 이유가 반대 방향으로도 작동할 수 있다. AI가 Next.js를 잘 이해한다는 것은, Next.js 코드를 다른 프레임워크로 번역하는 비용도 낮출 수 있다는 뜻이다. [2편](/2026/03/why-cloudflare-rebuilt-nextjs)의 vinext가 그 사례다. Cloudflare의 Igor Minar는 "Claude가 이 프로젝트의 대부분의 코드를 작성했다"고 밝혔다[^5]. 기존 테스트 스위트가 명세서 역할을 하고, AI가 코드를 작성하며, 테스트가 정확성을 검증하는 구조였다.

다만 vinext가 보여준 것은 "공개 API 표면의 재구현"이지, 임의의 프로덕션 앱을 자동으로 마이그레이션하는 것과는 다르다. Next.js의 복잡한 캐싱 전략(`revalidateTag`, `revalidatePath`의 중첩 의존), Middleware의 암묵적 실행 순서, Server Actions에서 클로저로 캡처되는 서버 상태 — 이런 패턴은 기계적 변환의 영역이 아니다. 사례 하나를 일반화하기엔 아직 이르다.

**AI가 새로운 잠금을 만드는 속도가, 기존 잠금을 허무는 속도보다 빠른가?** 현재로서는 전자가 우세하다. AI 코드 생성의 품질 차이는 일상적으로 체감되는 반면, AI 마이그레이션은 단순한 라우팅 변환을 넘어서면 여전히 사람의 개입이 필요하기 때문이다.

이 균형이 바뀌려면 AI 도구 자체의 변화가 필요하다. 학습 코퍼스에 의존하는 대신 공식 문서를 실시간으로 인덱싱하는 RAG 기반 코드 생성, 프레임워크 제작자가 AI용 컨텍스트를 표준적으로 제공하는 `llms.txt` 같은 시도가 이미 등장하고 있다. 이런 접근이 보편화되면 "코퍼스가 큰 쪽이 이기는" 구조는 약화될 수 있다. 다만 2026년 현재, 이 방향은 아직 초기이고 대부분의 개발자가 사용하는 AI 도구는 여전히 학습 데이터 편향 위에서 동작한다.

## 결론

### Next.js를 지탱하는 것

이 시리즈의 다섯 편을 관통하는 관찰을 정리하면 이렇다.

Next.js는 SSR 성능에서 같은 React 생태계의 다른 프레임워크에 뒤처지고 있고([4편](/2026/03/is-nextjs-fast-enough)), 배포는 Vercel에 비대칭적으로 최적화되어 있으며([2편](/2026/03/why-cloudflare-rebuilt-nextjs)), React의 기술 방향에 대한 Vercel의 영향력은 구조적 질문을 만들고([3편](/2026/03/react-is-whose)), 한때 핵심 셀링 포인트였던 Edge Runtime은 후퇴했다([1편](/2026/03/nextjs-edge-runtime-rise-and-fall)).

그런데도 Next.js가 기본값인 이유는 **런타임이 빨라서가 아니라, 바꾸는 비용이 높기 때문이다.** Next.js는 단지 많이 쓰이는 프레임워크가 아니다. React 최신 기능의 선행 진입점이고, Vercel 배포의 기준 경로이며, 서드파티가 우선 지원하는 대상이고, AI가 가장 잘 재생산하는 React 메타 프레임워크다. 이 네 가지가 겹치면서 Next.js는 "검토 대상"이 아니라 "출발점"이 되었다. 기본값의 힘은 강력하다. 적극적으로 반대할 이유가 없으면 사람들은 기본값을 선택한다.

### 관성은 언제 끊기는가

그 관성이 끊기는 것은 하나의 벤치마크나 하나의 스캔들이 아니다. 개발자가 매일 겪는 마찰의 누적이다.

- 서버-클라이언트 경계를 넘는 에러를 또 디버깅해야 할 때
- Server Components를 테스트하는 공식적 방법이 여전히 없을 때
- 프레임워크 업그레이드 후 예상치 못한 비용 청구서를 받을 때
- 캐싱 없이는 감당할 수 없는 부하를 경험할 때

이 마찰 하나하나는 견딜 만하다. 하지만 합이 임계치를 넘는 순간 — 그리고 대안이 사회적으로 정당해지는 순간 — 전환은 시작된다. 경로 의존성 이론에서 이것을 "잠금 해제(lock-in break)"라 부르며, 대체로 점진적이지 않고 비선형적으로 일어난다[^6]. 오랫동안 변하지 않다가, 어느 순간 급격히 전환된다.

다만 AI의 기본값 재생산 효과를 고려하면, 그 "어느 순간"은 이전 세대의 프레임워크 전환보다 늦게 올 가능성이 크다. jQuery에서 React로의 전환은 5~6년이 걸렸다. Next.js에서의 전환은 AI 잠금 효과까지 더해져 그보다 더 길어질 수 있다.

가장 가능성 높은 시나리오는 하나의 프레임워크가 Next.js를 대체하는 것이 아니라, **용도별 분화** 다. 콘텐츠 중심 사이트는 Astro로, 고부하 동적 SSR은 TanStack Start나 React Router로, 엔터프라이즈와 대규모 팀 프로젝트는 여전히 Next.js로. "하나의 기본값" 시대가 끝나고, 요구사항에 따라 선택지가 갈리는 구조로 이행하는 것이다. TanStack Start, React Router v7, Remix 3가 모두 Vite 위에 있다는 점은 이 분화를 가속할 수 있는 요인이다 — 개별 프레임워크의 점유율은 작아도, "Vite 기반 React SSR"이라는 카테고리 전체로 보면 의미 있는 대안이 된다.

물론 Vercel도 가만히 있지 않는다. Next.js 16의 `proxy` 모드, Turbopack 안정화 등은 자체 인프라 사용자의 마찰을 줄이려는 시도다. 이 개선 속도가 불만 누적 속도를 앞지르면, 분화의 시점은 상당히 뒤로 밀릴 수도 있다.

### 세 가지 조건에 따른 판단

이 시리즈를 읽은 독자가 "그래서 나는 어떻게 해야 하는가"를 묻는다면, 조건에 따라 다르게 답하겠다.

**Vercel에 배포하고 있고, 팀에 유의미한 불만이 없다면** — 바꿀 이유가 없다. Vercel 위의 Next.js는 여전히 가장 매끄러운 풀스택 개발·배포 경험을 제공한다. 경로 의존성은 비용이면서 동시에 자산이다. 축적된 지식과 인프라 결합이 생산성을 높이고 있다면, 그것은 잠금이 아니라 투자의 회수다.

**자체 인프라에서 운영하면서 동적 SSR 비중이 높다면** — 대안을 검토할 시점이다. [4편](/2026/03/is-nextjs-fast-enough)의 벤치마크가 보여주듯, 캐싱 없는 SSR 환경에서 Next.js의 기저 성능은 구조적으로 불리하다. TanStack Start나 React Router v7을 파일럿으로 검토해볼 가치가 있다. 같은 React 19 위에서 동작하므로 기존 컴포넌트 자산을 상당 부분 재사용할 수 있다.

**새 프로젝트를 시작한다면** — "기본값이니까 Next.js"는 더 이상 충분한 근거가 아니다. 프로젝트의 요구사항을 먼저 정의하고 — 정적 생성 비율, SSR 부하 예상치, 배포 환경, 팀의 기존 경험 — 그에 맞는 프레임워크를 선택해야 한다. 2026년에 React로 풀스택 웹앱을 만드는 선택지는 Next.js만이 아니다.

### 마지막으로

이 시리즈는 Next.js의 종말을 선언하려고 쓴 것이 아니다. Next.js는 여전히 기본값으로 기능하고 있고, 앞으로도 상당 기간 가장 많이 사용되는 React 메타 프레임워크일 것이다.

다만, "왜 Next.js를 쓰는가?"라는 질문에 대한 정직한 대답이 점점 **"이미 쓰고 있으니까"** 에 가까워지고 있다는 것은 인지해야 한다. 그 자체가 나쁜 것은 아니다 — 전환 비용이 실재하고, 기존 선택을 유지하는 것이 합리적인 경우는 많다. 하지만 관성과 의도적 선택은 다르다. **자신이 Next.js를 "선택한" 것인지, 아니면 경로 의존성이 선택을 "대신한" 것인지를 구분할 수 있어야 한다.**

프레임워크를 계속 쓰는 것보다 위험한 것은, 왜 계속 쓰는지 점검하지 않는 것이다.

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

[^5]: Igor Minar의 발언으로 알려진 문구. [제3자 인용 트윗](https://x.com/AustinPlays0/status/1894504792392745365)을 통해 확인되며, 원본 게시물은 직접 확인되지 않았다.

[^6]: Brian Arthur, "Increasing Returns and Path Dependence in the Economy" (1994). 기술 잠금의 비선형적 해제에 대한 이론적 프레임워크.

[^7]: Remix 3의 구체적인 렌더링 레이어 방향(Preact 포크 등)은 커뮤니티에서 논의되고 있으나, 2026년 3월 기준 공식 블로그나 릴리스 노트를 통해 확정된 사항은 아니다.
