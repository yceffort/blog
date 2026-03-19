---
title: 'React는 누구의 것인가'
tags:
  - react
  - governance
  - nextjs
  - vercel
  - meta
published: true
date: 2026-03-19 23:30:00
description: 'React Foundation이 답해야 할 질문'
thumbnail: '/thumbnails/2026/03/react-is-whose.png'
series: 'Next.js의 현주소'
seriesOrder: 3
---

## Table of Contents

## 서론

React Core 팀은 21명이다. 이 중 5명이 Vercel 소속이고, RSC(React Server Components)의 핵심 설계자가 포함되어 있다. 2026년 2월, React는 Meta를 떠나 [Linux Foundation 산하의 독립 재단](https://react.dev/blog/2026/02/24/the-react-foundation)으로 출범했다. "벤더 중립"이 핵심 메시지다. 하지만 그 중립성을 담보할 구조적 장치는 아직 공개되지 않았다.

[이전 글](/2026/03/nextjs-edge-runtime-rise-and-fall)에서는 Edge Runtime의 확장과 후퇴를, [그 다음 글](/2026/03/why-cloudflare-rebuilt-nextjs)에서는 Next.js의 배포 비대칭성을 다뤘다. 이 글에서는 그 상위의 구조 — React 자체의 기술 방향이 어떻게 결정되어 왔는지를 추적하고, React Foundation이라는 새로운 거버넌스가 이 구조를 바꿀 수 있는지를 살펴본다.

## React Core 팀: 누가 React를 만드는가

React의 기술적 방향은 React Core 팀이 결정한다. [공식 팀 페이지](https://react.dev/community/team) 기준으로 21명이며, 소속은 다음과 같다.

| 소속   | 인원 | 비율 |
| ------ | ---- | ---- |
| Meta   | 14명 | 67%  |
| Vercel | 5명  | 24%  |
| 독립   | 2명  | 9%   |

Meta 소속 14명[^1], Vercel 소속 5명(Andrew Clark, Hendrik Liebau, Josh Story, Sebastian Markbåge, Sebastian Silbermann), 독립 엔지니어 2명(Dan Abramov, Sophie Alpert)이다.

숫자만 보면 Meta가 압도적이다. 하지만 이 숫자가 곧 영향력의 분포를 의미하지는 않는다. RSC(React Server Components)의 핵심 설계자인 Sebastian Markbåge는 Vercel 소속이고, Andrew Clark은 Redux의 공동 창시자이자 React Core의 오랜 기여자로, 현재 Vercel에서 Next.js 팀에 있으면서 React Core 팀 활동을 병행하고 있다. 물론 소속만으로 기술 방향에 대한 실질적 영향력을 확정할 수는 없고, 공식 의사결정 규칙도 공개되지 않았다. 다만 **핵심 아키텍처를 설계한 인물들이 특정 프레임워크 기업에 소속되어 있다는 사실 자체가 구조적 질문을 만든다.**

### 인력 이동의 타임라인

React Core 팀에서 Vercel로의 인력 이동은 RSC 개발과 시기가 겹친다.

| 시기        | 이동                                  | 맥락                                                       |
| ----------- | ------------------------------------- | ---------------------------------------------------------- |
| 2021년 12월 | Sebastian Markbåge, Meta → Vercel[^2] | RSC RFC 발표(2020.12) 이후 약 1년. RSC의 최초 설계자       |
| 2023년      | Andrew Clark, Meta → Vercel           | React Fiber 공동 창시자. Next.js 팀 합류                   |
| 2023년 7월  | Dan Abramov, Meta → 독립[^3]          | 이후 Bluesky에서 근무, 2025년 2월 퇴사. React Core 팀 유지 |

Vercel은 Sebastian Markbåge의 합류를 발표하면서 이렇게 [밝혔다](https://vercel.com/blog/supporting-the-future-of-react):

> Sebastian Markbåge on the React core team at Meta is joining Vercel. As part of his role at Vercel, he'll still provide leadership on the React core team and help maintain the direction of React.
>
> Meta의 React Core 팀에 있던 Sebastian Markbåge가 Vercel에 합류한다. Vercel에서의 역할의 일환으로, 그는 여전히 React Core 팀에서 리더십을 발휘하고 React의 방향을 유지하는 데 기여할 것이다. 이 구조 자체가 문제라는 것은 아니다. 오픈소스에서 기업 간 인력 이동은 흔한 일이고, 핵심 기여자가 다른 회사로 옮겨도 프로젝트에 계속 기여하는 것은 자연스럽다. 문제는 이 이동이 React의 기술적 방향에 어떤 영향을 미쳤는가다.

## Next.js가 먼저, React는 나중

React의 최근 주요 기능들을 시간순으로 정리하면 하나의 패턴이 보인다.

### React Server Components

| 날짜        | 이벤트                                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------- |
| 2020년 12월 | React 팀, [RSC RFC(#188)](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md) 발표 및 데모 공개 |
| 2022년 10월 | Next.js 13, [App Router 베타](https://nextjs.org/blog/next-13)로 RSC 탑재                                             |
| 2023년 5월  | Next.js 13.4, [App Router "안정화"](https://nextjs.org/blog/next-13-4) 선언                                           |
| 2024년 12월 | [React 19 안정 릴리스](https://react.dev/blog/2024/12/05/react-19) — RSC 공식 안정화                                  |

Next.js가 RSC를 "안정(stable)"이라 선언한 시점(2023년 5월)과 React 자체가 RSC를 안정 릴리스한 시점(2024년 12월) 사이에는 **약 19개월의 간격**이 있다. 이 기간 동안 RSC를 프로덕션에서 사용할 수 있는 프레임워크는 사실상 Next.js뿐이었다.

### Server Actions

| 날짜        | 이벤트                                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| 2023년 3월  | React Labs, [Server Actions 소개](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023) |
| 2023년 10월 | Next.js 14, [Server Actions "안정화"](https://nextjs.org/blog/next-14) 선언                                             |
| 2024년 12월 | React 19 안정 릴리스 — Server Actions(`"use server"`) 공식 안정화                                                       |

같은 패턴이다. Next.js가 Server Actions를 "안정"이라 선언한 시점(2023년 10월)은 React 19 안정 릴리스(2024년 12월)보다 **약 14개월** 앞선다.

### `"use cache"`

| 날짜            | 이벤트                                                                      |
| --------------- | --------------------------------------------------------------------------- |
| 2024년 10월     | Next.js canary에서 `"use cache"` 실험적 도입                                |
| 2025년 10월     | [Next.js 16](https://nextjs.org/blog/next-16), Cache Components 공식 기능화 |
| 2026년 3월 현재 | React에는 `"use cache"` 관련 RFC 없음                                       |

`"use cache"`는 `"use client"`, `"use server"`와 같은 형태의 디렉티브지만, React의 기능이 아니라 **Next.js의 기능**이다. React 컴파일러 인프라를 활용하지만, React 자체의 스펙에는 포함되어 있지 않다.

### 이 패턴이 의미하는 것

정리하면 이런 흐름이다:

```
React 팀이 개념을 설계
    ↓
Next.js에서 먼저 구현 및 "안정화" 선언
    ↓
1년 이상의 간격
    ↓
React 안정 릴리스에 포함
```

이 구조가 가능했던 메커니즘이 있다. **React Canary 채널**이다.

## Canary: 프레임워크를 위한 선행 접근권

2023년 5월, React 팀은 [Canary 릴리스 채널](https://react.dev/blog/2023/05/03/react-canaries)을 공식화했다. 이 글의 저자는 Dan Abramov, Sophie Alpert, Rick Hanlon, Sebastian Markbåge, Andrew Clark — React Core 팀의 핵심 멤버들이다.

핵심 메시지는 이것이다:

> We'd like to offer the React community an option to adopt individual new features as soon as their design is close to final, before they're released in a stable version.
>
> 우리는 React 커뮤니티에 개별 새 기능이 안정 버전으로 릴리스되기 전에, 설계가 거의 최종 단계에 이른 시점에서 채택할 수 있는 선택지를 제공하고자 한다. 그리고 이 글에서 명시적으로 언급된 프레임워크가 Next.js다:

> For example, here is how Next.js (App Router) enforces resolution of react and react-dom to a pinned Canary version.
>
> 예를 들어, Next.js(App Router)가 react와 react-dom을 고정된 Canary 버전으로 해석하도록 강제하는 방법은 다음과 같다.

Canary 채널은 기술적으로 모든 프레임워크에 열려 있다. 하지만 "열려 있다"와 "실제로 사용할 수 있다"는 다른 문제다.

### Canary의 불안정성: 숫자로 보기

npm 레지스트리 기준, 2023년 5월 공식화 이후 React Canary 버전은 **542개** 이상 발행되었다(18.x canary 202개, 19.x canary 340개). 월 15~29개 꼴이다. 같은 기간 React 18.x의 안정 릴리스는 **5개**(18.0.0~18.3.1)뿐이었다. [React 공식 버전 정책](https://react.dev/community/versioning-policy)은 이렇게 밝힌다:

> Canary releases... may include breaking changes.
>
> Canary 릴리스에는... 브레이킹 체인지가 포함될 수 있다.

그리고 RSC 구현자에게 특히 중요한 경고가 [React 문서](https://react.dev/reference/rsc/server-components)에 있다:

> The underlying APIs used to implement a React Server Components bundler or framework do not follow semver and may break between minors in React 19.x.
>
> React Server Components 번들러나 프레임워크를 구현하는 데 사용되는 하위 API는 semver를 따르지 않으며, React 19.x의 마이너 버전 사이에서도 깨질 수 있다.

RSC를 프레임워크 수준에서 구현하려면 React의 내부 번들러 API에 의존해야 하는데, 이 API는 minor 버전 사이에서도 깨질 수 있다는 것이다.

### 다른 프레임워크들은 어떻게 되었나

이 불안정성이 이론적인 문제가 아니라 실제로 프레임워크들을 좌절시켰다는 근거가 있다.

**Shopify Hydrogen**: 2021~2022년 RSC를 초기 채택한 대표적 프레임워크였다. 커스텀 `react-server-dom-vite` 구현까지 만들었다. 하지만 2022년 10월 Shopify가 Remix를 인수하면서 [Hydrogen v2에서 RSC를 철회했다](https://shopify.engineering/remix-joins-shopify):

> Moving to Remix's data loading pattern (instead of server components) will lead to faster performance and a simpler developer experience.
>
> (서버 컴포넌트 대신) Remix의 데이터 로딩 패턴으로 전환하면 더 빠른 성능과 더 단순한 개발자 경험을 얻을 수 있을 것이다.

**RedwoodJS**: Tom Preston-Werner가 2023년 5월 ["all in on RSC"](https://tom.preston-werner.com/2023/05/30/redwoods-next-epoch-all-in-on-rsc.html)를 선언했다. "Bighorn Epoch"이라 명명하고 canary 기반으로 개발을 진행했지만, 안정 릴리스에 도달하지 못하고 결국 [RedwoodSDK](https://rwsdk.com/)라는 Cloudflare 기반 프레임워크로 방향을 전환했다.

**Waku**: Daishi Kato가 만든 미니멀 RSC 프레임워크. [v1 로드맵](https://github.com/dai-shi/waku/issues/24)(2023년 5월)에서부터 "React canary의 `react-server-dom-vite`를 기다려야 하나?"라는 질문이 나왔다. 27개 이상의 마이너 버전(v0.10~v0.27.5)을 거쳐 2026년 초에야 1.0 알파에 도달했다[^6]. 움직이는 RSC API를 따라잡는 데 시간이 걸린 것이다.

**React Router**: 2025년 5월 RSC 프리뷰를 [출시했지만](https://remix.run/blog/rsc-preview), 당시 Vite에 RSC 지원이 없어 번들러로 **Parcel**을 택해야 했다. Ryan Florence는 "Vite doesn't have RSC support yet"이라고 밝혔다. Vite의 [RSC 통합 논의](https://github.com/vitejs/vite/discussions/4591)는 2021년 8월부터 시작되었지만, 비동기 모듈 로딩과 React의 동기 모듈 로딩 가정 사이의 구조적 불일치로 수년간 진전이 더뎠다. 이후 [`@vitejs/plugin-rsc`](https://www.npmjs.com/package/@vitejs/plugin-rsc)가 Vite 공식 플러그인으로 출시되면서 상황이 바뀌기 시작했다. 다만 2026년 3월 현재 최신 버전이 0.5.x로 아직 0.x 단계이며, 안정 릴리스에 도달하지는 않았다. React Router도 이 플러그인 위에서 Vite 기반 RSC를 지원하게 되었고, Cloudflare는 2026년 2월 자사 Vite 플러그인이 `@vitejs/plugin-rsc`와 통합된다고 발표했다. Waku도 자체 RSC 구현에서 공식 플러그인으로 마이그레이션했다. 하지만 이 시점은 **최초 논의로부터 4년 이상이 지난 뒤**다. Next.js가 2022년 10월에 RSC를 탑재한 것과 비교하면, 나머지 생태계가 같은 기능을 사용할 수 있게 되기까지 3~4년의 시차가 존재했다는 뜻이다.

### "18.2.0"의 진실

Tom MacWright는 2024년 1월 ["Miffed About React"](https://macwright.com/2024/01/03/miffed-about-react)에서 흥미로운 사실을 지적했다. Next.js가 React canary를 내장하면서, `package.json`에는 React 18.2.0을 명시하지만 실제로는 canary 버전이 실행되는 구조였다는 것이다:

> Next.js vendors a version of the next release of React, using trickery to make it seem like you're using React 18.2.0 when in fact you're using a canary release.
>
> Next.js는 React의 다음 릴리스 버전을 내장하면서, 실제로는 canary 릴리스를 사용하고 있는데 마치 React 18.2.0을 사용하고 있는 것처럼 보이게 하는 트릭을 쓰고 있다.

이 주장은 [Next.js GitHub 이슈 #54553](https://github.com/vercel/next.js/issues/54553)에서 확인되었다. 사용자가 `package.json`에 React 18.2.0을 지정했지만, `React.version`은 `18.3.0-canary-dd480ef92-20230822`를 반환했다. Next.js 팀원 Balazs Orban은 Next.js가 "다른 React 채널에서 아직 사용할 수 없는 API를 가져오고 있다"고 인정했다.

이것이 의미하는 바는, Canary 채널이 형식적으로는 모든 프레임워크에 열려 있었지만, **실제로 Canary의 불안정성을 감당하면서 미완성 기능을 프로덕션에 탑재하기에 가장 유리한 위치에 있었던 것은 Vercel/Next.js**였다는 점이다. React Core 팀 멤버가 사내에 있으므로 Canary에서 문제가 생기면 즉시 소통하여 수정할 수 있는 구조였다.

Next.js 14의 [발표 블로그](https://nextjs.org/blog/next-14)는 이렇게 적고 있다:

> As of v14, Next.js has upgraded to the latest React canary, which includes stable Server Actions.
>
> v14부터 Next.js는 안정적인 Server Actions를 포함하는 최신 React canary로 업그레이드되었다.

"React canary에 포함된 stable Server Actions"라는 표현이다. React의 안정 릴리스가 아닌 canary 버전의 기능을 "stable"이라 부르는 것은, Next.js가 React의 릴리스 사이클과 독립적으로 안정성을 선언하고 있다는 뜻이다. [DEVCLASS의 분석](https://devclass.com/2023/10/27/next-js-14-released-as-vercel-aims-for-dynamic-at-the-speed-of-static-but-are-new-features-really-stable/)은 이 점을 지적한 바 있다.

Canary 채널 자체는 합리적인 메커니즘이다. Meta도 내부적으로 React의 bleeding-edge 버전을 사용해왔고, React Native도 같은 방식으로 운영된다. 문제는 **결과적으로 특정 프레임워크에 선행 접근권을 부여하는 구조**가 되었다는 점이다.

## "Vercel이 React를 지배한다"는 맞는가

이 질문에 대해 가장 상세하게 분석한 사람은 Redux 메인테이너 Mark Erikson이다. 2025년 6월, 그는 ["The State of React and the Community in 2025"](https://blog.isquaredsoftware.com/2025/06/react-community-2025/)라는 글에서 이 논쟁을 정면으로 다뤘다.

Erikson의 핵심 주장은 **인과관계의 방향이 반대**라는 것이다:

> It was the React team that drove this set of changes.
>
> 이 일련의 변화를 주도한 것은 React 팀이었다.

RSC를 설계하고 밀어붙인 것은 Vercel이 아니라 React 팀 자체라는 것이다. Vercel이 React를 인수한 것이 아니라, **React 팀이 자신들의 비전을 구현할 환경으로 Vercel/Next.js를 선택한 것**에 가깝다는 주장이다.

그 배경에는 Meta의 특수한 사정이 있었다. Meta는 React를 대규모로 사용하지만, 자체 서버 인프라, GraphQL/Relay 기반 데이터 페칭, 독자적인 라우팅 시스템을 갖고 있다. 일반 웹 개발자들이 쓰는 Express, Prisma, next-auth 같은 도구와는 거리가 멀다. RSC를 Meta 내부에서 프로토타이핑하는 것은 한계가 있었고, React 팀은 외부 파트너가 필요했다. 그 파트너가 Vercel이었다.

이 분석은 설득력이 있다. 하지만 Erikson 자신도 이 구조의 결과가 커뮤니티에 마찰을 일으키고 있음은 인정한다:

> The React community and ecosystem is fractured, with an increasing split between how the React team wants the framework to be used, and how the community uses it in practice.
>
> React 커뮤니티와 생태계는 분열되어 있으며, React 팀이 원하는 프레임워크 사용 방식과 커뮤니티가 실제로 사용하는 방식 사이의 괴리가 점점 커지고 있다.

원인이 무엇이든, **결과적으로 React의 기술 방향과 커뮤니티의 실제 사용 사이에 괴리가 발생**했다는 것이다.

Vercel에서 Next.js 커뮤니티를 5년간 담당했던 Lee Robinson도 퇴사 후 이 구조적 문제를 [인정했다](https://leerob.substack.com/p/reflections-on-the-react-community):

> Most of the 'RSC innovation' happening in the ecosystem was from those building on Next.js. It was still very difficult to build non-Next.js RSC things.
>
> 생태계에서 일어나는 'RSC 혁신'의 대부분은 Next.js 위에서 만들어지고 있었다. Next.js가 아닌 곳에서 RSC를 사용하는 것은 여전히 매우 어려웠다.

그리고 App Router의 시기에 대해서도 이렇게 밝혔다:

> The App Router was likely marked stable too soon... Obviously that was a mistake.
>
> App Router는 아마 너무 일찍 안정(stable)이라고 표시되었을 것이다... 분명히 실수였다.

이 글에서 다루는 사실들 — 인력 이동, Canary 선행 구현, `"use cache"` — 만으로 "Vercel이 React를 지배한다"고 단정할 수는 없다. React Foundation은 기술 거버넌스의 독립성을 약속했고, React Core 팀 전체 구성에서 Meta 비중이 여전히 크며, React 팀이 자율적으로 기술 방향을 설정해왔다는 Erikson의 분석도 설득력이 있다. **문제는 그 반대가 사실이라고 믿게 할 구조적 장치가 아직 공개되지 않았다는 점이다.** "지배당하지 않고 있다"를 입증할 책임은 "벤더 중립"을 선언한 쪽에 있다.

## 커뮤니티의 온도

[State of React 2024 설문](https://2024.stateofreact.com/en-US)에 따르면:

- 신규 프로젝트의 **45%**가 RSC를 채택
- 하지만 Server Components와 Server Functions는 **3번째, 4번째로 불만족스러운 기능**으로 꼽힘
- 전반적 만족도는 5점 만점에 **3.6점**, 하락 추세
- 가장 큰 고충은 Context API 비호환(59건), 테스팅 공백(24건), 디버깅 어려움

설문 보고서는 이렇게 평가했다:

> Server Components and Server Functions are the third and fourth-most-disliked features... troubling for a set of new APIs that was supposed to pave the way towards React's next big evolution.
>
> Server Components와 Server Functions는 3번째, 4번째로 불만족스러운 기능이다... React의 다음 대진화를 이끌어야 할 새 API 세트치고는 우려스러운 결과다.

채택은 되고 있지만 만족도가 낮다. React의 "다음 진화"를 이끌어야 할 기능이 가장 불만족스러운 기능에 올라있는 셈이다.

[State of JavaScript 2025 설문](https://2025.stateofjs.com/en-US/libraries/meta-frameworks/)의 메타 프레임워크 부문도 비슷한 양상을 보인다. Next.js의 만족도(retention)는 2022년 89%에서 2023년 75%로 하락했고, 이후 추가 하락세를 보이고 있다. Next.js는 13번째로 사랑받는 프로젝트이면서 동시에 **5번째로 싫어하는 프로젝트**에 올라 있어, 생태계에서 가장 양극화된 도구 중 하나가 되었다.

### 불만족의 구체적 원인

숫자 이면에 있는 고충을 분류하면 세 가지로 나뉜다.

**멘탈 모델의 분열**: React는 오랫동안 하나의 멘탈 모델로 작동했다. 컴포넌트는 props와 state를 받아 UI를 렌더링한다. RSC는 이 모델을 둘로 쪼갰다. 서버에서 실행되는 컴포넌트와 클라이언트에서 실행되는 컴포넌트가 다른 규칙을 따른다. 서버 컴포넌트에서는 `useState`, `useEffect`, Context API를 쓸 수 없다. 클라이언트 컴포넌트에서는 `async/await`를 쓸 수 없다. 어떤 컴포넌트가 어디서 실행되는지를 항상 의식해야 하고, 경계를 넘을 때 데이터가 어떻게 직렬화되는지를 이해해야 한다. 설문에서 Context API 비호환이 59건으로 가장 많이 언급된 것은 이 분열의 직접적 결과다. 기존에 Context로 해결하던 패턴 — 테마, 인증 상태, 국제화 — 이 서버 컴포넌트에서 작동하지 않기 때문이다.

**디버깅의 어려움**: 서버-클라이언트 경계를 넘는 에러는 스택 트레이스가 분리된다. 서버에서 발생한 에러의 일부는 서버 로그에, 나머지는 브라우저 콘솔에 나타난다. RSC 페이로드(Flight 프로토콜)는 사람이 읽기 어려운 바이너리 포맷이므로, 서버와 클라이언트 사이에서 어떤 데이터가 오가는지 직접 확인하기 어렵다. React DevTools v6이 서버 컴포넌트 배지를 추가했지만, 서드파티 라이브러리와의 호환성은 아직 불안정하다.

**테스팅 공백**: Server Components를 단위 테스트하는 공식적인 방법이 아직 없다. React Testing Library의 [이슈 #1209](https://github.com/testing-library/react-testing-library/issues/1209) ("Support for React Server Components", 2023년 5월, **155개 이상의 댓글**, 여전히 OPEN)가 이 문제를 추적하고 있다. `render(<Page />)`를 호출하면 async 컴포넌트가 `Promise<Element>`를 반환하여 실패한다. `const Result = await Page(props); render(Result)`라는 우회법이 있지만 공식 지원이 아니다. Vitest의 [이슈 #8526](https://github.com/vitest-dev/vitest/issues/8526)에서 기여자 Hiroshi Ogawa는 "React와 Next.js 팀에 E2E 테스트 외의 서버 컴포넌트 공식 테스팅 전략이 없다"고 밝혔다. 설문에서 24건이 이 문제를 지적했다. [Next.js 공식 문서](https://nextjs.org/docs/app/guides/testing/vitest)도 async Server Components에는 E2E 테스트를 권장하고 있어, 컴포넌트 단위의 빠른 피드백 루프가 구조적으로 깨진 상태다.

### 다른 프레임워크들의 선택

React 생태계의 다른 주요 프레임워크들은 RSC에 대해 각기 다른 입장을 취하고 있다.

**React Router / Remix**: Remix의 공동 창시자 Ryan Florence는 RSC에 대해 복합적인 시각을 보였다. React Router v7은 RSC를 지원하지 않는 상태로 출시되었고, Florence는 ["React Router v7은 내가 원하는 것만큼 의견이 강하지 않고, 스코프도 내가 원하는 것보다 크다"](https://x.com/ryanflorence/status/1859291013879357828)라고 밝혔다. 더 극적인 것은 Remix 3의 방향이다. 2025년 5월, Florence와 Michael Jackson은 [Remix 3에서 React를 완전히 버리겠다](https://remix.run/blog/wake-up-remix)고 선언했다. Preact 포크를 기반으로 웹 플랫폼 표준에 직접 의존하는 방향이다. RSC 대신 "HTML을 와이어 포맷으로, HTMX에 가까운" 접근을 택했다.

**TanStack Start**: TanStack의 Tanner Linsley는 RSC의 이름부터 문제라고 [지적했다](https://github.com/TanStack/router/discussions/802). "Prerendering Components"나 "Serializable Components"라 불러야 한다는 것이다. RSC가 **SPA 생태계에서 10년간 축적된 지식과 패턴을 버리고 서버에서 다시 하려는 것**이라는 비판이다. TanStack Start는 "client-first" 철학을 표방하며, RSC를 전면적으로 도입하는 대신 필요한 곳에서만 선택적으로 사용할 수 있는 구조를 지향하고 있다.

이 선택들이 시사하는 바가 있다. React의 핵심 방향인 RSC를 전면 수용한 프레임워크는 Next.js뿐이고, 나머지 주요 프레임워크들은 각자의 방식으로 거리를 두거나 아예 React를 떠나고 있다.

## Meta는 왜 React를 내보냈나

이런 상황에서 Meta는 React를 독립 재단으로 이관하기로 결정했다. 2025년 10월 [React Conf에서 발표](https://react.dev/blog/2025/10/07/introducing-the-react-foundation)하고, 2026년 2월 [Linux Foundation 산하에 공식 출범](https://react.dev/blog/2026/02/24/the-react-foundation)시켰다.

공식 메시지는 "React has outgrown the confines of any one company"[^5]였다. 하지만 이 결정의 배경에는 여러 층위의 동기가 겹쳐 있다.

### Meta의 오픈소스 스핀아웃 패턴

React가 처음이 아니다. Meta는 [GraphQL을 2018년에](https://graphql.org/blog/2018-11-12-the-graphql-foundation/), [PyTorch를 2022년에](https://pytorch.org/blog/PyTorchfoundation/) Linux Foundation 산하 재단으로 이관했다. [The Register](https://www.theregister.com/2025/10/09/meta_react_foundation/)는 React의 이관을 "a similar corporate distancing exercise"라 평했다.

이 패턴의 배경에는 Meta 브랜드의 오픈소스 리스크가 있다. 2017년 React의 BSD+Patents 라이선스 논란은 Apache Software Foundation이 React를 금지하고, WordPress가 React에서 이탈하겠다고 위협하는 사태로 이어졌다[^12]. 프로젝트를 중립 재단으로 옮기면 "Meta가 포기하면 어떻게 되나"라는 엔터프라이즈 채택의 장벽이 사라진다.

Google이 2015년 Kubernetes를 CNCF에 기부한 뒤 Microsoft, Amazon 등 경쟁사가 대거 참여하면서 시장을 지배하게 된 전례도 있다. 중립성이 확보되면 경쟁사의 투자가 늘어난다는 검증된 전략이다.

### AI 전환과 비용 분산

Meta는 2022년부터 대규모 감원을 진행하면서 AI 인프라에 \$72\~135B 수준의 자본 지출을 집중하고 있다. React Foundation에 대한 Meta의 약속은 5년간 \$3M 이상의 자금과 전담 엔지니어링 팀 유지[^5]인데, 연간 약 \$600K는 5,500만 웹사이트와 2,000만 개발자가 사용하는 프로젝트치고는 적은 금액이다. 8개 Platinum 멤버 기업이 이사회에 참여하는 구조는 재정적 부담을 분산하는 효과가 있다.

### 재단의 구조

[React Foundation](https://react.dev/blog/2026/02/24/the-react-foundation)의 공개된 구조는 다음과 같다.

**이사회(Board of Directors)**: 8개 Platinum 창립 멤버 기업의 대표로 구성된다.

| 기업             | 분류                |
| ---------------- | ------------------- |
| Amazon           | 클라우드/인프라     |
| Callstack        | React Native 컨설팅 |
| Expo             | React Native 도구   |
| Huawei           | 하드웨어/통신       |
| Meta             | React 원 개발사     |
| Microsoft        | 클라우드/플랫폼     |
| Software Mansion | React Native 도구   |
| Vercel           | Next.js/배포 플랫폼 |

8개 기업 중 Vercel이 포함되어 있다. Next.js를 운영하는 회사가 React Foundation의 이사회에 참여하는 것이다.

**Executive Director**: Seth Webster (Meta). 자금과 리소스 배분을 관리한다.

**기술 거버넌스**: 이사회와 분리된 독립적 기술 결정 구조를 만들겠다고 밝혔다. 단, 2026년 2월 공식 출범 시점에서도 기술 거버넌스의 구체적 구조는 확정되지 않았다. "provisional leadership council"이 구성되었고, 상세 구조는 "coming months"에 공개하겠다고 했다[^4].

**Meta의 전환기 통제권**: [The New Stack의 분석](https://thenewstack.io/react-foundation-open-source-governance/)에 따르면, Meta는 출범 후 **2.5년간 기업 거버넌스 위원회에서 supermajority를 유지**한다[^13]. "벤더 중립"을 선언했지만, 전환기 동안은 Meta가 실질적 통제권을 갖는 구조다.

### 확인 가능한 것과 확인 불가능한 것

React Foundation에 대해 현재 확인 가능한 사실은 제한적이다.

**확인 가능한 것:**

- 이사회에 8개 기업이 참여하며, Vercel이 포함되어 있다
- 기술 거버넌스는 이사회와 분리된다고 선언했다
- Meta가 5년간 \$3M+ 자금과 엔지니어링 지원을 약속했다
- Executive Director는 Meta 소속의 Seth Webster다
- Meta는 출범 후 2.5년간 기업 거버넌스 위원회에서 supermajority를 유지한다

**아직 확인 불가능한 것:**

- 기술 거버넌스의 구체적 구조 (TSC 구성, 투표 규칙, 거부권 등)
- 기술 결정과 이사회 결정이 실제로 분리될 수 있는 메커니즘
- Vercel 소속 5명의 React Core 팀원이 재단 체제에서 어떤 역할을 하는지
- "벤더 중립"이 기술 방향 결정에서 구체적으로 어떻게 작동하는지
- supermajority 기간 종료 후 거버넌스 전환 계획

2026년 3월 현재, React Foundation은 출범했지만 **기술 거버넌스의 핵심 구조가 아직 공개되지 않은 상태**다.

## 프레임워크가 라이브러리를 이끄는 역전

React와 Next.js의 관계에서 가장 주목할 만한 현상은 **의존 방향의 역전**이다.

전통적으로 라이브러리/프레임워크 관계는 이런 방향이다:

```
라이브러리가 API를 정의 → 프레임워크가 구현/확장
React가 컴포넌트 모델을 정의 → Next.js가 라우팅/SSR을 추가
```

하지만 최근 React-Next.js의 관계는 이렇게 되었다:

```
Next.js에서 먼저 구현 → React가 사후적으로 스펙화
Next.js 13.4가 RSC "안정화" → 19개월 후 React 19가 공식 안정화
Next.js 14가 Server Actions "안정화" → 14개월 후 React 19가 공식 안정화
Next.js 16이 "use cache" 도입 → React에는 해당 스펙 없음
```

React의 경우가 특이한 이유는 주체가 셋이기 때문이다. React는 Meta가 만든 라이브러리인데, 핵심 기능의 프로토타이핑과 안정화가 **다른 회사(Vercel)의 제품(Next.js)**에서 이루어진다. 그리고 이제 **제3의 조직(React Foundation)**이 거버넌스를 맡겠다고 선언했다. 세 주체의 이해관계가 일치할 때는 문제가 없지만, 충돌할 때 어떤 메커니즘으로 해결되는지는 아직 정의되지 않았다.

## `"use cache"`: 경계가 흐려지는 징후

`"use cache"` 디렉티브는 이 경계가 흐려지고 있음을 보여주는 사례다.

`"use client"`와 `"use server"`는 React의 공식 디렉티브다. React 19에 포함되어 있고, [React 공식 문서](https://react.dev/reference/rsc/use-client)에 정의되어 있다. 어떤 프레임워크에서든 구현할 수 있는 React의 스펙이다.

`"use cache"`는 같은 문법적 형태를 취하지만, [Next.js 문서](https://nextjs.org/docs/app/api-reference/directives/use-cache)에만 존재한다. React 공식 문서에 `"use cache"` 항목은 없다. React에 RFC도 제출되지 않았다. 이 디렉티브를 설계한 사람은 Sebastian Markbåge다. 그가 2024년 10월 Next.js 블로그에 게시한 ["Our Journey with Caching"](https://nextjs.org/blog/our-journey-with-caching)에서 처음 공개되었다. `"use client"`와 `"use server"` 디렉티브도 설계한 같은 인물이, 이번에는 React가 아닌 Next.js의 기능으로 새 디렉티브를 만든 것이다.

```tsx
// React 공식 디렉티브
'use client' // → react.dev에 문서 있음
'use server' // → react.dev에 문서 있음

// Next.js 전용 디렉티브
'use cache' // → nextjs.org에만 문서 있음, React 스펙 아님
```

개발자 입장에서 이 세 디렉티브는 같은 문법, 같은 위치(파일 또는 함수 최상단), 같은 방식으로 동작하는 것처럼 보인다. 하지만 `"use cache"`는 React의 기능이 아니라 Next.js의 기능이다. 이 디렉티브에 의존하는 코드는 Next.js(또는 향후 이를 구현하는 다른 프레임워크)에서만 동작한다.

`"use client"`와 `"use server"`도 처음에는 Next.js에서 먼저 구현된 후 React 스펙이 되었다. `"use cache"`도 같은 경로를 밟을 가능성은 있다. 하지만 현 시점에서는 **React 디렉티브와 동일한 문법 형태를 사용하지만, Next.js가 정의한 프레임워크 기능**이다. 이것만으로 "경계가 무너졌다"고 단정하기는 어렵지만, React의 문법 관습이 특정 프레임워크의 기능으로 확장되는 구조적 경향을 보여주는 것은 사실이다.

## 선례: Node.js는 같은 문제를 어떻게 풀었나

React Foundation이 직면한 문제는 새로운 것이 아니다. 가장 유사한 선례는 Node.js다.

### io.js 포크와 Joyent 문제

2014년, Node.js 커뮤니티는 Joyent의 통제에 불만을 폭발시켰다. Joyent는 Node.js의 상표를 소유하고, 커밋 접근권을 통제하고, 프로젝트 리더(TJ Fontaine)를 임명했다. 릴리스는 지연되고, V8 엔진은 구버전에 묶여 있었다. 투명한 거버넌스 프로세스도 없었다.

2014년 12월, Fedor Indutny가 Node.js를 포크하여 **io.js**를 만들었다. 2015년 1월 io.js v1.0.0이 릴리스되자, Joyent는 압력에 못 이겨 2015년 2월 [Node.js Foundation 설립](https://nodejs.org/en/blog/announcements/foundation-v4-announce)을 선언했고, 2015년 9월 Node.js v4.0.0에서 두 프로젝트가 합쳐졌다.

### Node.js TSC의 구조적 장치

합병 과정에서 커뮤니티의 핵심 요구는 ["이사회로부터의 기술 결정 자율성"](https://github.com/nodejs/node/issues/978)이었다. 결과적으로 만들어진 [TSC(Technical Steering Committee) 헌장](https://github.com/nodejs/TSC/blob/main/TSC-Charter.md)에는 구체적인 구조적 장치가 들어갔다.

**고용주 상한선**: TSC 투표 멤버의 **1/4 이상이 같은 회사 소속일 수 없다**[^7]. 이 한도를 초과하면 즉시 시정해야 한다:

> No more than one-fourth of the TSC voting membership may be affiliated with the same company/entity. The situation must be immediately remedied by the removal of voting member status.
>
> TSC 투표 멤버의 1/4 이상이 같은 회사/단체에 소속될 수 없다. 이 상황은 투표 멤버 자격의 제거를 통해 즉시 시정되어야 한다.

Working Group에는 더 엄격한 **1/3 상한선**이 적용된다[^8]. OpenJS Foundation의 상위 기구인 CPC(Cross Project Council)에도 동일한 1/4 상한선이 적용된다[^9].

**비밀 투표**: 합의에 실패할 경우 투표로 결정하되, 투표 내용은 비공개다:

> TSC voting members' choices must not be disclosed, to avoid influencing other voting members.
>
> TSC 투표 멤버의 선택은 공개되어서는 안 된다. 다른 투표 멤버에게 영향을 미치는 것을 방지하기 위해서다.

특정 기업이 자사 소속 멤버에게 투표 압력을 가하는 것을 구조적으로 차단한다.

**헌장 수정 제한**: TSC 헌장은 TSC 자체적으로 수정할 수 없고, 상위 기구인 CPC의 승인이 필요하다. 포획된 TSC가 자체 규칙을 약화시키는 것을 방지한다.

이 구조의 핵심은 **선의에 의존하지 않는다**는 점이다. "우리는 중립적일 것이다"라는 선언이 아니라, 중립성을 깨뜨리는 것이 구조적으로 불가능하도록 설계되어 있다.

### Rust Foundation: 구조가 있어도 프로세스가 실패하면

Node.js가 "구조적 장치가 중요하다"는 교훈을 준다면, Rust Foundation은 "구조만으로는 부족하다"는 교훈을 준다.

Rust Foundation은 2021년 출범 시부터 강력한 구조적 장치를 갖추고 있었다. 이사회는 기업 이사(Platinum 멤버)와 프로젝트 이사(Leadership Council 선출)로 구성되며, 모든 의안은 **기업 이사 과반수와 프로젝트 이사 과반수 모두의 찬성**이 있어야 통과된다[^10]. 기업 측도 프로젝트 측도 단독으로 의사결정을 밀어붙일 수 없는 이중 다수결 구조다. Leadership Council에는 소속 기업당 대표 수 상한선이 있다(6명 이상일 때 최대 2명)[^11].

그런데 2023년 4월, Rust Foundation이 상표권 정책 초안을 공개했을 때 커뮤니티는 폭발했다. 초안에는 도메인 이름에 "Rust"를 포함할 수 없고, 크레이트 이름에도 제한이 있으며, 교육 자료에 "Rust Foundation의 검토를 받지 않았다"는 면책 조항을 넣어야 한다는 조항이 있었다. [반대 운동 레포지토리](https://github.com/blyxyas/no-rust-policy-change)가 만들어졌고, 프로젝트 이사들도 ["프로젝트 전체의 충분한 참여가 부족했다"](https://blog.rust-lang.org/inside-rust/2023/04/12/trademark-policy-draft-feedback/)고 인정했다.

Foundation은 사과하고 정책을 철회했지만, 수정안이 나오기까지 **18개월 이상**이 걸렸다. 2024년 11월에야 [수정 초안](https://blog.rust-lang.org/2024/11/06/trademark-update/)이 공개되었고, 2026년 3월 현재 최종 정책은 아직 확정되지 않았다.

Rust의 교훈은 이것이다. **이중 다수결, 소속 상한선 같은 구조적 장치가 있었지만, 정책이 소수의 그룹에서 8개월간 비공개로 개발된 후 짧은 의견 수렴 기간으로 제시되자 커뮤니티 신뢰가 무너졌다.** 구조적 안전장치와 프로세스 투명성은 별개의 문제이고, 둘 다 필요하다.

### React Foundation에 없는 것

Node.js TSC의 구조와 대비하면, React Foundation에 현재 없는 것이 명확해진다.

| 장치               | Node.js TSC            | React Foundation (2026.03 현재)         |
| ------------------ | ---------------------- | --------------------------------------- |
| 고용주 상한선      | 투표 멤버의 1/4        | 미공개                                  |
| 비밀 투표          | 명시적 규정            | 미공개                                  |
| 헌장 수정 제한     | CPC 승인 필요          | 미공개                                  |
| 기술 자율성        | 이사회로부터 독립 명시 | "분리" 선언, 메커니즘 미공개            |
| 기술 거버넌스 구성 | TSC 멤버 목록 공개     | "provisional council" 구성, 멤버 미공개 |

React Core 팀 21명 중 Vercel 소속이 5명(24%)이라는 현재 구성은, Node.js TSC의 1/4 상한선과 거의 같은 비율이다. Node.js TSC였다면 이 비율이 상한선에 걸려 추가 인원이 투표권을 가질 수 없다. React Foundation이 유사한 상한선을 도입할지는 아직 알 수 없다.

React Foundation은 기술 거버넌스의 구체적 구조를 "coming months"에 공개하겠다고 했다[^4]. 그 구조가 공개될 때, Node.js TSC와 같은 수준의 구조적 장치가 포함되는지가 React Foundation의 실질적 의미를 판단하는 기준이 될 것이다.

## 결론

이 글에서 다룬 내용을 정리하면 다음과 같다.

**확인된 사실:**

- React Core 팀 21명 중 Vercel 소속은 5명이며, RSC의 핵심 설계자를 포함한다
- RSC와 Server Actions는 React 안정 릴리스보다 1년 이상 앞서 Next.js에서 "안정" 선언되었다
- Canary 채널은 이 선행 구현을 가능하게 한 공식 메커니즘이며, 다른 프레임워크들은 같은 수준으로 활용하기 어려웠다
- `"use cache"`는 React 스펙이 아닌 Next.js 기능이지만, React 디렉티브와 같은 문법 형태를 사용한다
- React Foundation은 출범했지만, 기술 거버넌스의 구체적 구조는 2026년 3월 현재 공개되지 않았다

**이 사실들이 의미하지 않는 것:**

- "Vercel이 React를 지배한다"는 이 사실들만으로 단정되지 않는다. React Core 팀 전체 구성에서 Meta 비중이 여전히 크고, React 팀이 자율적으로 기술 방향을 설정해왔다는 분석도 있다. React Foundation은 기술 거버넌스의 독립성을 약속했다

**이 사실들이 의미하는 것:**

- React의 핵심 기능이 특정 기업의 제품을 통해 현실화되는 구조가 존재하며, 이 구조가 공정하다고 믿게 할 장치가 아직 보이지 않는다. Node.js TSC의 고용주 상한선, Rust Foundation의 이중 다수결 같은 선례가 있음에도, React Foundation은 아직 이에 준하는 구조를 공개하지 않았다

[이전 글](/2026/03/nextjs-edge-runtime-rise-and-fall)에서 Edge Runtime이 Vercel의 비즈니스 인센티브와 기술적 추진의 교차점에서 만들어졌다가 후퇴한 과정을 보았다. [그 다음 글](/2026/03/why-cloudflare-rebuilt-nextjs)에서는 Next.js의 배포 비대칭성이 경쟁 플랫폼들에게 역공학과 재구현이라는 비용을 강제한 현실을 보았다. 이 글에서는 그 상위의 구조 — React 자체의 기술 방향이 어떻게 결정되는가 — 를 살펴보았다.

React Foundation이 진짜 시험대에 오르는 시점은 출범 선언이 아니라 **기술 거버넌스 헌장이 공개되는 순간**이다. 그 문서에 고용주 상한선, 의사결정 절차, 투표 규칙, 이해충돌 방지 장치가 포함되어 있는지가 "벤더 중립"이 선언인지 구조인지를 가를 것이다.

[^1]: Eli White, Jack Pope, Jason Bonta, Joe Savona, Jordan Brown, Lauren Tan, Matt Carroll, Mike Vitousek, Mofei Zhang, Pieter Vanderwerff, Rick Hanlon, Ruslan Lesiutin, Seth Webster, Yuzhi Zheng. [React 공식 팀 페이지](https://react.dev/community/team) 기준, 2026년 3월 확인.

[^2]: [Supporting the Future of React — Vercel Blog](https://vercel.com/blog/supporting-the-future-of-react) (2021년 12월 14일). Guillermo Rauch가 Sebastian Markbåge의 합류를 발표.

[^3]: Dan Abramov의 [트윗](https://twitter.com/dan_abramov/status/1682029195843739649) (2023년 7월 20일). Meta 퇴사 발표. 이후 Bluesky에서 근무(2023~2025년 2월), 현재 독립 엔지니어로 React Core 팀 활동 유지.

[^4]: [The React Foundation — React Blog](https://react.dev/blog/2026/02/24/the-react-foundation) (2026년 2월 24일). "We will share more updates on technical governance in the coming months."

[^5]: [Introducing the React Foundation — Engineering at Meta](https://engineering.fb.com/2025/10/07/open-source/introducing-the-react-foundation-the-new-home-for-react-react-native/) (2025년 10월 7일). 5년 파트너십, \$3M 이상 자금, 전담 엔지니어링 팀 약속.

[^6]: [Waku Reaches 1.0 Alpha — InfoQ](https://www.infoq.com/news/2026/02/waku-react-framework/) (2026년 2월).

[^7]: [Node.js TSC Charter](https://github.com/nodejs/TSC/blob/main/TSC-Charter.md). "no more than one-fourth of the TSC voting membership may be affiliated with the same company/entity."

[^8]: [Node.js Working Groups](https://github.com/nodejs/TSC/blob/main/WORKING_GROUPS.md). "no more than 1/3 of the WG members may be affiliated with the same employer."

[^9]: [OpenJS CPC Charter](https://github.com/openjs-foundation/cross-project-council/blob/main/CPC-CHARTER.md). "No more than one-fourth of the Voting CPC members may be affiliated with the same employer."

[^10]: [Rust Foundation FAQ](https://github.com/rust-lang/foundation-faq-2020/blob/main/FAQ.md). "All motions be approved with both a majority of project directors and a majority of sponsor representatives."

[^11]: [Rust Leadership Council RFC #3392](https://github.com/rust-lang/rfcs/blob/master/text/3392-leadership-council.md). "If the Council has 6 or more representatives, no more than 2 representatives may have any given affiliation."

[^12]: [Facebook Buckles Under Pressure Over Hated React License — InfoWorld](https://www.infoworld.com/article/2257026/facebook-buckles-under-pressure-over-hated-react-license.html) (2017년). Apache Software Foundation의 React 라이선스 금지와 이후 MIT 전환.

[^13]: [React Foundation Open Source Governance — The New Stack](https://thenewstack.io/react-foundation-open-source-governance/). Meta가 출범 후 2.5년간 기업 거버넌스 위원회에서 supermajority를 유지한다는 분석.
