---
title: '<em>오래 쓸 수 있는 패키지</em>는 무엇이 다른가'
tags:
  - frontend
  - package-management
  - semver
  - nextjs
  - maintenance
published: true
date: 2026-05-09 12:54:08
description: '좋은 패키지는 기능뿐 아니라 의존성, 버전업, 호환성, 릴리즈 정책까지 사용자 친화적이어야 한다.'
thumbnail: /thumbnails/2026/05/good-package-for-long-term-users.png
art:
  layout: rings
  hue: blue
  tone: light
  hero: 'peerDependencies'
---

## Table of Contents

## 서론

좋은 패키지는 무엇인가. 보통은 API가 잘 설계되어 있고, 문서가 좋고, 성능이 괜찮고, 버그가 적은 패키지를 떠올린다. 틀린 말은 아니다. 하지만 실제로 어떤 패키지를 제품 코드에 오래 넣고 써보면, 품질은 코드 안에서만 결정되지 않는다.

패키지는 설치되는 순간부터 사용자의 일정에 들어온다. 기능 추가, 보안 패치, deprecation, breaking change, peer dependency 경고, canary 릴리즈, 마이그레이션 가이드가 모두 사용자의 비용이 된다. 심지어 아무것도 깨지지 않는 버전업도 비용이다. lockfile이 바뀌고, CI를 돌리고, QA를 하고, 배포 후 회귀를 봐야 한다. 그래서 패키지를 오래 쓸 수 있는지는 "처음 썼을 때 좋았는가"보다 "변화할 때 사용자를 어떻게 대하는가"에 더 가깝다.

개인적인 경험으로는 사내 디자인시스템을 쓰면서 이 문제를 강하게 느꼈다. 컴포넌트 자체가 나쁜 것은 아니다. 오히려 잘 만든 부분도 많다. 문제는 릴리즈 정책이었다. patch나 minor에서 토큰 이름이 바뀌어 theme override가 사라지고, 버튼 높이나 모달 padding 조정으로 QA 스냅샷이 깨지는 식의 일이 있었다. stable에는 필요한 버그 수정이 없어서 canary 버전을 실제 production에 배포해야 하는 상황도 있었다. 이런 경험이 반복되면 사용자는 패키지를 "의존성"이 아니라 "리스크"로 보게 된다.

이 글에서는 Next.js, Yarn Berry, peerDependencies, 디자인시스템 사례를 통해 사용자가 오래 쓸 수 있는 패키지의 조건을 살펴본다. React 자체보다는 React 위에서 더 넓은 릴리즈 표면을 가진 Next.js 쪽에 초점을 둔다. 결론은 간단하다. **좋은 패키지는 잘 동작하는 코드가 아니라, 사용자가 예측 가능한 비용으로 계속 의존할 수 있는 코드다.**

## 패키지의 진짜 API는 릴리즈 정책이다

패키지의 API는 함수 시그니처나 컴포넌트 props만이 아니다. 다음도 사실상 API다.

- 어떤 버전을 지원하는가
- 언제 breaking change를 내는가
- 이전 major에 보안 패치를 해주는가
- deprecation 기간은 얼마나 되는가
- canary, beta, rc, stable의 의미가 무엇인가
- peerDependencies를 얼마나 넓게 또는 좁게 잡는가
- 어떤 runtime dependencies를 사용자의 앱에 끌고 들어오는가
- 마이그레이션을 codemod로 제공하는가
- 릴리즈 노트에서 사용자가 해야 할 일을 명확히 말하는가

이것들은 `import` 구문에는 보이지 않는다. 하지만 제품 코드에서는 아주 현실적인 비용이다.

예를 들어 어떤 디자인시스템이 `Button`의 prop 이름을 바꾼다고 하자.

```tsx
// before
<Button variant="primary" />

// after
<Button color="brand" />
```

이 변경 자체는 유지보수자 입장에서 합리적일 수 있다. 용어를 더 정확히 만들고, 토큰 체계를 정리하고, 디자인 언어를 일관되게 만들기 위한 변화일 수 있다. 문제는 변경의 정당성이 아니라 변경의 전달 방식이다.

다음처럼 patch 릴리즈 노트 한 줄로 배포된다면 사용자는 받아들이기 어렵다.

```md
## 2.4.1

- Button의 `variant` prop을 `color` prop으로 변경
```

patch 버전에 breaking change가 들어갔다. migration guide가 없다. deprecated alias도 없다. codemod도 없다. 이전 major 지원 정책도 없다. 그러면 사용자는 다음부터 patch upgrade도 믿지 못한다.

반대로 같은 변경도 이렇게 제공되면 다르다.

```tsx
type ButtonProps =
  | {
      color?: 'brand' | 'neutral'
      variant?: never
    }
  | {
      /**
       * @deprecated use color instead.
       */
      variant?: 'primary' | 'secondary'
      color?: never
    }
```

그리고 릴리즈 정책이 이렇게 설명된다면 사용자는 계획할 수 있다.

```txt
2.5.0: color prop 추가, variant는 deprecated warning 출력
3.0.0: variant 제거
2.x: 6개월간 critical bug/security patch 제공
codemod: npx @design-system/codemod button-variant-to-color
```

두 방식 모두 최종 결과는 같다. `variant`는 사라지고 `color`가 남는다. 하지만 사용자 경험은 완전히 다르다. 좋은 패키지는 변화하지 않는 패키지가 아니다. **변화를 예측 가능하게 만드는 패키지다.**

릴리즈 채널의 이름도 같은 맥락이다. canary, beta, rc, stable이 단순한 라벨이 아니라 사용자가 위험을 판단하는 언어다. 사용자가 stable에서 받지 못하는 critical fix를 위해 canary를 production에 올려야 한다면, 이름은 canary지만 실제로는 불안정한 stable이다. 좋은 채널 정책은 critical fix를 가능한 한 stable line에 backport하고, 그게 어렵다면 다음 stable에 언제 들어가는지를 명시한다. UK Intelligence Community Design System이 canary component를 'unstable testing' 용도라고 명시하고 production 사용을 권장하지 않는다고 적은 것은 이 때문이다.

## Framework upgrade는 생태계 upgrade다

이 문제를 React 자체의 문제로 보는 것은 조금 부정확하다. React는 오히려 versioning과 upgrade path를 꽤 보수적으로 운영해온 편에 가깝다. major release를 자주 내는 편도 아니고, React 19에서는 breaking change가 있음을 인정하면서 React 18.3이라는 bridge release를 먼저 제공했다. React 18.3은 React 18.2와 거의 같지만 React 19에서 문제가 될 deprecated API를 미리 경고하도록 만들어졌다. major upgrade 전에 경고를 볼 수 있는 완충 지대를 제공한 것이다.

문제는 React 위에 있는 framework layer에서 더 크게 드러난다. Next.js는 React 버전뿐 아니라 router, compiler, bundler, runtime, cache semantics, deployment model, security patch를 한 번에 묶어 움직인다. Next.js의 API에는 이 모든 것의 cadence와 ecosystem coordination이 포함되어 있다. 그래서 Next.js를 올린다는 것은 단순히 `next` 패키지 하나를 올리는 일이 아니다.

Next.js 15는 이 긴장을 잘 보여준다. Next.js 15는 stable로 릴리즈되었지만 App Router는 React 19 RC와 맞물려 있었다. 공식 릴리즈 글에서도 App Router가 React 19 RC를 사용한다고 설명했다. 동시에 Async Request APIs, caching semantics 같은 breaking change도 들어갔다. 기능적으로는 납득할 수 있다. 하지만 큰 monorepo나 shared design system을 가진 조직에서는 "Next.js를 올린다"가 곧 "React 생태계 전체와 사내 패키지 전체를 같이 올린다"가 된다.

그리고 여기서 버전업 자체의 피로감이 생긴다. 어떤 변경이 breaking change가 아니더라도, 사용자는 매번 dependency diff를 보고, lockfile을 리뷰하고, CI와 E2E를 돌리고, staging에서 확인하고, 배포 후 모니터링해야 한다. "업그레이드가 쉽다"는 말은 유지보수자 입장에서는 맞을 수 있지만, 사용자의 제품 일정 안에서는 여전히 interruption이다. 특히 framework는 사용자 코드의 실행 환경 전체를 바꾸기 때문에, 작은 minor upgrade도 팀 입장에서는 작은 프로젝트가 된다.

실제 사용자 반응을 보면 이 문제가 더 분명해진다.

[Next.js discussion #73405](https://github.com/vercel/next.js/discussions/73405)의 제목은 "React 19 RC가 필요 없는 Next 15 기능을 Next 14에 backport할 수 없느냐"에 가깝다. 작성자는 Next.js 15의 self-hosting 개선이나 `next.config.ts` 같은 기능은 쓰고 싶지만, React 19 RC 때문에 큰 monorepo와 shared design system을 올릴 수 없다고 말한다.

> "Upgrading to React 19 is not an easy task, especially for people working in big monorepos with many ecosystem packages."
>
> React 19로 업그레이드하는 것은 쉽지 않다. 특히 많은 생태계 패키지를 가진 큰 monorepo에서 작업하는 사람들에게는 그렇다.

이 인용에서 중요한 건 "React 업그레이드가 어렵다"는 일반론이 아니다. Next.js 15의 self-hosting 개선이나 `next.config.ts` 같은 기능을 쓰고 싶어도, React 19 RC와 생태계 패키지의 peer dependency 문제가 한 덩어리로 따라온다는 점이다. 같은 글에서 작성자는 생태계와 디자인시스템이 따라오기까지 최소 1년이 걸릴 수 있다고 본다. warning을 무시하고 React 19 RC로 올렸다가 문제가 생기면, 사용자는 upstream에 이슈를 올리기도 애매해진다. 지원하지 않는 peer version을 사용자가 선택한 모양이 되기 때문이다. 이건 단순한 경고 피로가 아니라 책임 경계가 사용자에게 넘어가는 문제다.

비슷한 문제는 다른 이슈에서도 반복된다. [Next.js issue #72204](https://github.com/vercel/next.js/issues/72204)는 제목부터 "Cannot install dependencies after upgrading to Next 15 and React 19 RC"다. 작성자는 codemod로 Next 15와 React 19 RC로 올린 뒤 이렇게 말한다.

> "Now I cannot install any new package or upgrade any existing package."
>
> 이제 새 패키지를 설치할 수도 없고, 기존 패키지를 업그레이드할 수도 없다.

이 문장이 보여주는 문제는 build 하나가 실패했다는 정도가 아니다. framework upgrade 이후 package manager의 dependency resolution 자체가 막혔다는 점이다. 사용자는 Next.js를 올렸을 뿐인데, 그 다음부터는 전혀 관계없는 새 패키지 설치나 기존 패키지 업그레이드까지 멈춘다. 이때 upgrade 비용은 codemod로 고친 파일 수가 아니라, 생태계 전체의 peer range가 맞춰질 때까지 기다리는 시간으로 바뀐다.

[Headless UI issue #3538](https://github.com/tailwindlabs/headlessui/issues/3538)에서도 Next.js 15가 요구하는 React 19 때문에 peer dependency error가 upgrade를 막는다는 보고가 올라왔다.

> "I get a peer dependency error that breaks the upgrade. headlessui requires react 18."
>
> 업그레이드를 깨뜨리는 peer dependency error가 발생한다. headlessui는 React 18을 요구한다.

여기서도 핵심은 Headless UI가 나쁘다는 이야기가 아니다. 어떤 UI package가 아직 React 18만 peer로 선언하고 있을 때, Next.js의 React major requirement가 사용자 앱 전체의 upgrade 경로를 막을 수 있다는 점이다. 패키지 하나의 peer range가 제품 전체의 일정이 되는 순간이다.

Reddit 반응도 비슷하다. [Next.js 15 upgrade thread](https://www.reddit.com/r/nextjs/comments/1g9cqyq)에서는 작은 프로젝트는 codemod로 5분 안에 끝났지만, 더 큰 프로젝트는 dependency compatibility 문제로 build가 계속 실패했다는 경험담이 나온다. 결론은 업그레이드 보류였다.

> "With the smaller one, a blog template, it took less than 5 mins in total with the codemod. However, there was more problem when trying to upgrade another repo which is much bigger in size. The codemod managed to update close to 30-40 files but the build keeps failing. Digging deeper, there was lots of compatibility issues between that project's existing dependencies and React 19. ... Will wait for things to stabilize, so I'll give it at least 6 months before making a new attempt."
>
> 작은 블로그 템플릿은 codemod로 5분도 안 걸렸지만, 더 큰 저장소는 달랐다. codemod가 30~40개 파일을 고쳤는데도 build가 계속 실패했고, 기존 dependency와 React 19 사이의 compatibility issue가 많았다. 그래서 안정화될 때까지 최소 6개월은 기다리겠다는 것이다.

같은 thread의 다른 사용자는 cookies/headers refactoring과 3rd-party UI package 문제를 겪다가 2시간 만에 포기했다고 적었다. 이 반응들이 Next.js 15가 나쁘다는 증거는 아니다. 오히려 작은 프로젝트에서는 upgrade가 잘 되었다는 반응도 같이 있다. 중요한 건 규모가 커질수록 버전업이 단순 작업이 아니라 ecosystem coordination 문제가 된다는 점이다.

여기에 보안 패치가 끼어들면 선택지는 더 줄어든다. 2025년 말 React Server Components 관련 RCE 취약점은 Next.js 15.x, 16.x App Router 사용자에게 즉시 patched stable로 업그레이드하라고 안내했다. 2026년 4월에도 Server Components 기반 DoS advisory가 나왔다. 보안 취약점은 당연히 패치해야 한다. 하지만 보안 패치가 사실상 큰 업그레이드와 묶이면 사용자는 두 가지 위험 중 하나를 고르게 된다.

1. 보안 취약점을 안고 버틴다.
2. 생태계 호환성이 완전히 검증되지 않은 업그레이드를 강행한다.

좋은 패키지의 유지보수 정책은 이 선택지를 줄여야 한다. 보안 패치는 가능한 한 넓은 supported range에 backport하고, major upgrade가 필요한 경우에는 왜 필요한지, 어떤 조합이 안전한지, 어떤 조합은 포기해야 하는지 명확히 말해야 한다.

## 기술적으로 옳아도 migration이 없으면 깨진다

Yarn Berry는 패키지의 API가 코드뿐 아니라 migration design 자체였다는 것을 보여준다. Yarn 2는 Plug'n'Play(PnP)를 통해 `node_modules`의 오래된 문제를 해결하려 했다. 설치 속도, 디스크 사용량, phantom dependency 문제를 생각하면 방향 자체는 타당했다. `node_modules`는 느리고 크고 암묵적인 의존성 접근을 허용한다. PnP는 이 문제를 정면으로 다뤘다.

하지만 사용자의 관점에서는 기존 Node.js 생태계의 암묵적 계약이 크게 흔들렸다.

Yarn PnP 공식 문서는 migration 과정에서 다음을 고려하라고 안내한다.

- `node_modules` 폴더가 없다.
- `.bin` 폴더가 없다.
- 일부 `node` 호출은 `yarn node`로 바꿔야 한다.
- IDE 지원을 위해 SDK 생성과 VSCode 설정이 필요하다.
- 일부 dependency는 명시적으로 선언해야 한다.

이것은 단순한 package manager 교체가 아니다. 개발 환경, CI, 에디터, 번들러, 테스트 도구, 스크립트 관습을 모두 건드리는 변화다.

그래서 "Yarn 2 PnP 끄는 법" 같은 질문이 Stack Overflow에서 높은 점수를 받았다. GitHub 이슈에서도 같은 패턴이 반복된다.

[Yarn berry issue #6380](https://github.com/yarnpkg/berry/issues/6380)은 PnP와 workspace TypeScript SDK 조합에서 vscode가 module not found를 띄우지만 `yarn build`는 정상 통과한다는 보고다. 작성자는 yarn과 typescript 버전 조합을 매트릭스로 직접 검증하고 나서, 결국 단일 해결책을 정리한다.

> "What single action fixes this? `yarn config set nodeLinker node-modules && yarn`"
>
> 이걸 한 번에 고치는 방법은? `yarn config set nodeLinker node-modules && yarn`로 PnP를 끄는 것이다.

여기서 중요한 건 vscode의 버그냐 typescript의 버그냐가 아니다. 사용자는 `yarn build`는 성공하는데 에디터에서는 빨간 줄이 뜨는 상태를 매일 본다. 도구 한쪽의 문제로 PnP를 못 쓰게 되면, 가장 안정적인 escape hatch는 결국 nodeLinker를 `node-modules`로 되돌리는 것이다. PnP가 약속한 "node_modules로부터의 자유"가 IDE 한 곳에서 어긋나는 순간 사라진다.

[Yarn berry issue #7071](https://github.com/yarnpkg/berry/issues/7071)은 더 직접적이다. Vite 8이 rolldown으로 번들러 내부를 바꾸자 PnP 환경에서 import resolution 자체가 깨지기 시작했다. 작성자의 첫 보고는 짧다.

> "Changing the nodeLinker from pnp to node-modules fixes the problem."
>
> nodeLinker를 pnp에서 node-modules로 바꾸면 문제가 해결된다.

같은 thread의 다른 댓글은 더 무겁다.

> "The Vite team is probably not going to support Yarn PnP going forward."
>
> Vite 팀은 앞으로 Yarn PnP를 지원하지 않을 것 같다.

이 인용에서 핵심은 누구의 잘못이냐가 아니다. 번들러가 native(Rust) 쪽으로 옮겨가면서 PnP의 module resolution을 따라잡기 어려워졌고, Vite 측은 PnP 지원을 멈출 가능성이 있다는 점이다. 사용자 입장에서 nodeLinker를 한 줄로 바꿔 해결되는 build 실패는 사실 "이 도구는 더 이상 너의 채널이 아닐 수 있다"는 신호에 가깝다.

여기서 Yarn이 틀렸다고 말하려는 것은 아니다. 오히려 Yarn Berry는 Node.js 생태계의 구조적 문제를 정확히 찔렀다. 문제는 **사용자가 옳은 방향으로 이동하는 데 필요한 완충 지대가 충분했는가**다.

패키지나 도구가 기존 생태계의 암묵적 계약을 깨려면, 최소한 다음을 제공해야 한다.

- 기존 방식으로 남을 수 있는 escape hatch
- migration doctor 또는 compatibility checker
- 주요 도구와의 호환성 표
- 실패했을 때 원인을 설명하는 좋은 에러 메시지
- 조직 단위 migration을 위한 단계적 가이드
- 안정화될 때까지의 충분한 병행 지원

기술적으로 더 나은 설계가 사용자에게도 더 나은 경험이 되려면, 그 사이에 migration design이 있어야 한다.

## dependency는 사용자에게 전가되는 운영 책임이다

`peerDependencies`는 warning으로 드러나기라도 한다. 일반 `dependencies`는 더 조용하다. 패키지를 설치하면 자연스럽게 따라오고, 사용자는 그 의존성이 왜 필요한지 모른 채 bundle, audit, transitive dependency, 보안 패치 비용을 같이 떠안는다.

개인적으로는 "그냥 `fetch`로 해도 되는 일"에 axios가 들어가 있어서 axios 취약점 대응까지 해야 했던 경험이 있다. axios가 나쁜 패키지라는 뜻은 아니다. axios는 오래된 HTTP client이고, interceptors, timeout, transform, Node/browser 추상화 같은 기능이 필요하면 쓸 이유가 있다. 문제는 그 기능이 필요 없는데도 습관적으로 넣는 경우다.

예를 들어 이런 코드가 있다고 하자.

```ts
import axios from 'axios'

export async function getUser() {
  const response = await axios.get('/api/user')
  return response.data
}
```

이 정도면 platform API로 충분하다.

```ts
export async function getUser() {
  const response = await fetch('/api/user')

  if (!response.ok) {
    throw new Error('Failed to fetch user')
  }

  return response.json()
}
```

물론 `fetch`를 쓴다고 보안 문제가 사라지는 것은 아니다. 서버에서 사용자 입력 URL을 그대로 요청하면 `fetch`로도 SSRF는 만들 수 있다. 차이는 **굳이 외부 dependency를 추가하지 않아도 되는 문제에 dependency를 추가했을 때, 그 dependency 고유의 취약점과 릴리즈 정책까지 사용자가 따라가야 한다는 점**이다.

axios만 해도 2025년에 absolute URL 처리와 관련된 SSRF/credential leakage advisory가 있었고, `data:` URL 처리에서 메모리를 과도하게 사용할 수 있는 DoS advisory도 있었다. 사용자가 axios의 고급 기능을 직접 쓰고 있다면 이 대응은 당연한 비용이다. 하지만 패키지 내부에서 단순 HTTP 요청 하나를 위해 axios를 끌고 왔다면, 사용자는 자신이 선택하지 않은 비용을 떠안게 된다.

그래서 좋은 패키지는 dependencies를 쉽게 추가하지 않는다. 추가하기 전에 다음 질문을 해야 한다.

- platform API로 충분한가?
- 이 dependency가 사용자 bundle에 들어가는가?
- 이 dependency의 보안 취약점이 사용자의 audit을 깨뜨릴 수 있는가?
- 이 dependency가 Node, browser, edge runtime 중 어디까지 지원하는가?
- 이 dependency를 core에 넣어야 하는가, adapter package로 분리할 수 있는가?
- optional dependency나 peer dependency로 사용자가 선택하게 만들 수 있는가?

특히 디자인시스템이나 framework plugin처럼 많은 앱에 깔리는 패키지는 더 보수적이어야 한다. 내부 구현 편의를 위해 axios, date library, animation library, CSS-in-JS runtime을 core dependency로 넣으면 모든 제품팀이 그 릴리즈 주기를 같이 따라가야 한다. 좋은 구조는 보통 core를 작게 유지하고 integration을 분리한다.

```txt
@company/ui-core
@company/ui-react
@company/ui-next
@company/ui-axios-adapter
```

모든 패키지를 이렇게 쪼개야 한다는 뜻은 아니다. 하지만 사용자가 직접 선택하지 않은 dependency는 그 자체로 유지보수 부채다. 좋은 패키지는 dependency를 기능 추가의 지름길이 아니라 사용자에게 전가되는 운영 책임으로 본다.

## peerDependencies는 책임 경계다

Next.js 15 사례에서 반복해서 나온 문제는 결국 `peerDependencies`다. 많은 사람이 peer dependency를 귀찮은 설치 경고 정도로 본다. 하지만 실제로는 패키지가 사용자에게 선언하는 호환성 계약이고, 문제가 생겼을 때 누구의 책임인지 가르는 경계다.

예를 들어 다음 선언은 React 18만 지원한다는 뜻이다.

```json
{
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

이 패키지가 React 19에서도 실제로 동작한다고 해보자. 그래도 사용자는 React 19 프로젝트에서 설치 경고를 맞는다. npm에서는 설치가 막힐 수도 있고, pnpm이나 Yarn에서는 warning이 남는다. 결국 사용자는 `--force`, `--legacy-peer-deps`, `overrides`, `packageExtensions` 같은 우회책을 고민한다.

좋은 선언은 더 넓은 range를 허용한다.

```json
{
  "peerDependencies": {
    "react": "^18.2.0 || ^19.0.0",
    "react-dom": "^18.2.0 || ^19.0.0"
  },
  "peerDependenciesMeta": {
    "react-dom": {
      "optional": false
    }
  }
}
```

하지만 range만 넓히면 끝이 아니다. 이 선언은 CI matrix로 증명되어야 한다.

```yaml
strategy:
  matrix:
    react:
      - 18.2.0
      - 19.0.0
```

range를 넓히는 것은 메타데이터 변경에서 끝나지 않는다. 실제 코드도 두 React 버전 사이의 차이를 흡수해야 한다. 가장 흔한 예가 `forwardRef`다. React 19부터 함수 컴포넌트가 `ref`를 일반 prop으로 받을 수 있게 되면서 `forwardRef`는 deprecated 경로가 되었지만, React 18을 함께 지원하는 디자인시스템은 두 모델을 모두 만족시켜야 한다.

```tsx
// React 18: forwardRef가 필수
const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => (
  <button ref={ref} {...props} />
))

// React 19: ref가 일반 prop
function Button({ref, ...props}: ButtonProps & {ref?: Ref<HTMLButtonElement>}) {
  return <button ref={ref} {...props} />
}
```

실제 디자인 패키지들이 쓰는 우회는 비슷하다. `forwardRef`를 그대로 두고 React 19에서 발생하는 deprecated warning을 내부에서 무시하거나, ref를 단순 prop으로 바꾸고 React 18에서는 type assertion으로 통과시키거나, 빌드 단계에서 React 버전별 entry를 분리해 export한다.

여기서 한 가지 짚을 점은 React 19가 `forwardRef`를 **제거**한 게 아니라 **deprecated**만 시켰다는 사실이다. React 19에서도 `forwardRef`는 그대로 동작하고 콘솔에 warning만 출력된다. 그래서 가장 보수적인 패턴은 코드를 거의 그대로 두고 peer range만 넓히는 것이다. 사용자 측에 deprecation warning이 보이긴 하지만 깨지는 것보다 낫다. 디자인시스템 입장에서는 컴포넌트가 수십 개라면 한 번에 다 바꾸기 어려운데, deprecation 기간이 있는 deprecation은 "지금 깨지지 않으면서 다음 major까지 시간을 번다"는 운영 자원이 된다.

조금 더 적극적인 패키지는 호환 helper로 두 모델을 동시에 만족시킨다.

```tsx
import {forwardRef as legacyForwardRef, type Ref} from 'react'

// React 18 / 19 양쪽에서 동일하게 동작하는 helper
export function compatForwardRef<T, P>(
  render: (props: P, ref: Ref<T>) => React.ReactNode,
) {
  return legacyForwardRef(render as any) as unknown as (
    props: P & {ref?: Ref<T>},
  ) => React.ReactNode
}

// 사용
const Button = compatForwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => <button ref={ref} {...props} />,
)
```

이런 helper는 작아 보이지만 효과가 크다. 컴포넌트 작성자는 새 코드를 React 19 스타일로 짤 수 있고, React 18 사용자에게는 깨지지 않으며, deprecation warning은 helper 내부에서만 발생해서 사용자 콘솔이 비교적 깨끗하다. 더 중요한 건 컴포넌트 100개가 같은 helper를 통과하기 때문에 React 모델 전환을 한 곳에서 결정할 수 있다는 점이다.

이게 디자인시스템에서 특히 중요한 이유는 ref forwarding이 사슬처럼 이어지기 때문이다. `Tooltip → Popover → Button → <button>`처럼 ref를 여러 단계 흘려보내야 할 때, 한 단계만 React 19 모델로 바꾸면 다른 단계의 타입 정의와 충돌한다. 컴포넌트 합성에서 발생하는 타입 mismatch는 컴파일 단계에서 잡히지 않고 런타임에서 ref가 `null`이 되거나 focus management가 깨지는 식으로 드러난다. helper 하나를 통일해두면 전체 ref chain이 같은 방식으로 동작하기 때문에 이런 사고를 줄일 수 있다.

타입 정의도 같은 맥락에서 봐야 한다. React 18의 `Ref<T>`와 React 19의 `Ref<T>`는 약간 다르다. 그래서 일부 패키지는 빌드 시 `@types/react` 버전에 따라 다른 `.d.ts` 두 벌을 만들어 export한다. 빌드별 export 분기는 대략 이런 모양이다.

```json
{
  "exports": {
    ".": {
      "react-18": "./dist/react-18.js",
      "react-19": "./dist/react-19.js"
    }
  }
}
```

실제로 React 19 RC 발표 이후 비슷한 패턴의 이슈가 여러 디자인 패키지에서 동시에 올라왔다. [react-aria-components #7583](https://github.com/adobe/react-spectrum/issues/7583), [ant-design-mobile #6899](https://github.com/ant-design/ant-design-mobile/issues/6899), [vidstack/player #1533](https://github.com/vidstack/player/issues/1533) 모두 같은 본질이다. peer range 한 줄을 넓히려면 ref forwarding, JSX runtime, hook 동작 같은 내부 호환성을 같이 검증해야 한다. 어떤 패키지는 코드는 그대로 두고 peer만 넓혀 release했고, 어떤 패키지는 peer만 먼저 늘리고 내부 호환성을 늦게 따라잡으면서 사용자 측에서 runtime 오류를 보게 했다.

peer range `^18.2.0 || ^19.0.0`이라는 한 줄은 이런 내부 호환성 작업의 결과물이다. 넓은 peer range는 메타데이터가 아니라 패키지의 운영 부담을 의미한다.

반대로 React 18과 19를 동시에 지원할 수 없다면, 좁은 peer range 자체가 문제는 아니다.

```json
{
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

문제는 이 선언만 던져두고 React 18 사용자를 언제까지 지원할지, 이전 major에 어떤 패치를 해줄지, React 19 전용 기능을 왜 도입했는지 설명하지 않는 것이다. 특히 디자인시스템에서는 peer dependency 하나가 제품 전체의 React 버전을 움직인다. 버튼 하나가 React 19만 지원한다고 선언하면, 그 버튼을 쓰는 앱 전체가 같은 결정을 강요받는다.

그래서 peer dependency 변경은 changelog 한 줄로 끝나면 안 된다. 최소한 다음 정보가 같이 있어야 한다.

- React 18 지원 종료일
- React 18용 마지막 major/minor
- React 18 라인에 제공할 bug/security patch 범위
- React 19 전환을 위한 codemod 또는 migration guide
- 사내 앱별 migration window
- canary/stable package의 사용 원칙

`peerDependencies`는 설치 메타데이터가 아니라 운영 정책이다. 사용자가 warning을 무시하도록 만드는 순간, 유지보수자는 호환성 책임을 사용자에게 넘기고 있는 셈이다.

## 디자인시스템의 breaking change는 시각적 결과까지 포함한다

일반 라이브러리에서 breaking change는 보통 API 제거, 함수 시그니처 변경, 타입 변경을 뜻한다. 디자인시스템에서는 더 넓다.

Nulogy Design System은 prop 제거, prop rename, 컴포넌트 이름 변경뿐 아니라 layout에 영향을 주는 visual update도 major change로 본다. font size, font weight, letter spacing 변경도 줄바꿈과 레이아웃에 영향을 줄 수 있으므로 breaking change가 될 수 있다.

GitLab Pajamas Design System도 비슷하다. 업데이트 후 디자이너가 어떤 조치를 해야 한다면 breaking change로 본다. dimension 변경, property incompatibility, override 손실 같은 것들이 모두 포함된다.

이 관점은 사내 디자인시스템에 특히 중요하다. 디자인시스템의 변경은 TypeScript compile error로만 드러나지 않는다.

- 버튼 높이가 바뀌어 화면이 밀린다.
- 모달 padding이 바뀌어 QA 스냅샷이 깨진다.
- 토큰 이름이 바뀌어 theme override가 사라진다.
- DOM 구조가 바뀌어 테스트 selector가 실패한다.
- 기본 aria 속성이 바뀌어 접근성 테스트가 달라진다.
- 컴포넌트 내부 focus 동작이 바뀌어 E2E가 실패한다.

내가 겪은 문제도 이 범주였다. 예를 들어 색상 토큰 alias가 바뀌면서 제품에서 덮어쓴 theme override가 더 이상 적용되지 않았다. 버튼 높이와 모달 내부 여백이 바뀌면서 화면이 몇 픽셀씩 밀렸고, QA 스냅샷과 회귀 테스트가 같이 깨졌다. 컴포넌트 prop은 그대로였기 때문에 TypeScript는 조용했지만, 사용자가 보는 화면과 테스트는 조용하지 않았다.

이런 변화는 코드상으로 minor처럼 보일 수 있다. 하지만 사용자에게는 major다.

그래서 디자인시스템은 semver를 더 보수적으로 해석해야 한다. 특히 "시각적 변경은 API 변경이 아니다"라고 보면 안 된다. 디자인시스템에서 시각적 결과는 API의 일부다. 사용자는 디자인시스템의 DOM, CSS, token, spacing, interaction을 제품의 일부로 소비한다.

## 오래 쓸 수 있는 패키지의 체크포인트

앞의 내용을 다시 번호로 길게 풀 필요는 없다. 실무에서 패키지의 릴리즈 노트나 업그레이드 가이드를 볼 때 확인할 항목만 남기면 이렇다.

| 항목             | 좋지 않은 신호                          | 좋은 신호                                            |
| ---------------- | --------------------------------------- | ---------------------------------------------------- |
| semver           | patch/minor에 breaking change가 들어감  | 애매한 변경은 major로 보내고 migration path를 제공함 |
| release cadence  | 매번 최신 버전으로 사실상 강제함        | upgrade window와 긴급도를 설명함                     |
| 이전 major 지원  | 새 major가 나오면 이전 line이 방치됨    | EOL 날짜와 bug/security patch 범위를 명시함          |
| deprecation      | 제거된 뒤 changelog에서 발견됨          | warning, JSDoc, lint rule, codemod로 미리 알림       |
| dependencies     | 구현 편의를 위해 core dependency를 늘림 | platform API, optional dependency, adapter를 검토함  |
| peerDependencies | warning을 사용자가 무시하게 만듦        | 지원 range를 CI로 검증하고 미지원 조합을 명확히 말함 |
| canary           | blocker fix 때문에 production에 올라감  | critical fix를 stable line에 backport함              |
| migration        | "최신 버전으로 올리세요"만 있음         | 영향 범위, 순서, 자동화, 롤백 가능성을 설명함        |

이 표의 공통점은 하나다. 좋은 패키지는 변화의 비용을 없애지는 못해도, 사용자가 그 비용을 예측하고 일정에 넣을 수 있게 해준다.

## 좋은 패키지는 사용자의 시간을 존중한다

패키지 유지보수에서 중요한 것은 변화 자체를 피하는 것이 아니다. 변화는 필요하다. 낡은 API는 제거해야 하고, 더 나은 구조로 옮겨가야 하며, 보안 문제는 빠르게 고쳐야 한다. 문제는 그 변화가 사용자에게 어떻게 도착하느냐다.

패키지 개발자는 내부 구조를 과감하게 바꿀 수 있다. 새로운 runtime을 지원하고, 더 나은 bundler로 옮기고, 오래된 API를 정리할 수 있다. 하지만 그 변화가 사용자에게 전달될 때는 보수적이어야 한다. 사용자가 미리 알고, 테스트하고, 점진적으로 옮기고, 실패했을 때 되돌릴 수 있어야 한다.

제아무리 좋은 기능이라도 사용자가 소프트랜딩할 수 없다면, 그 기능은 개선이 아니라 일정 침범이 된다.

유지보수자는 늘 어려운 선택을 한다. 낡은 API를 계속 들고 가면 코드가 복잡해진다. 이전 major에 보안 패치를 backport하면 시간이 든다. React 18과 19를 동시에 테스트하면 CI 시간이 늘어난다. canary와 stable을 분리하면 릴리즈 운영이 귀찮아진다. 이 비용은 실제로 크다.

그래서 모든 패키지가 LTS 정책을 갖추고, 모든 major를 오래 지원하고, 모든 migration에 codemod를 제공해야 한다고 말할 수는 없다. 오픈소스든 사내 패키지든 유지보수자의 시간도 유한하다.

다만 좋은 패키지는 자신의 한계를 사용자에게 숨기지 않는다.

```txt
React 18은 더 이상 지원하지 않는다.
v2에는 보안 패치를 backport하지 않는다.
canary는 production 사용을 권장하지 않는다.
이 breaking change는 codemod를 제공하지 않는다.
```

이런 문장은 차갑게 보일 수 있지만, 사용자에게는 차라리 낫다. 불확실성이 줄어들기 때문이다. 사용자는 위험을 알고 선택할 수 있다.

사용자가 오래 쓸 수 있는 패키지는 완벽한 패키지가 아니다. **예측 가능한 패키지다.** 변화가 있을 때 이유를 설명하고, 지원 범위를 명확히 말하고, 가능한 한 업그레이드 비용을 낮추며, 사용자가 일정을 잡을 수 있게 해주는 패키지다.

결국 패키지의 품질은 릴리즈 이후에 드러난다. 처음 설치했을 때의 DX는 시작일 뿐이다. 진짜 DX는 6개월 뒤 보안 패치를 해야 할 때, 1년 뒤 major upgrade를 해야 할 때, 사내 제품 20개가 같은 디자인시스템을 각자 다른 속도로 따라가야 할 때 드러난다.

좋은 패키지는 사용자의 코드를 깨지 않는 패키지가 아니다. 코드를 깨야 할 때조차 사용자의 시간을 존중하는 패키지다.

## 참고

- **Next.js 15 / React 19 마이그레이션**: [Next.js 15](https://nextjs.org/blog/next-15), [Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-15), [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- **사용자 보고**: [discussion #73405](https://github.com/vercel/next.js/discussions/73405), [issue #72204](https://github.com/vercel/next.js/issues/72204), [Headless UI #3538](https://github.com/tailwindlabs/headlessui/issues/3538), [Reddit thread](https://www.reddit.com/r/nextjs/comments/1g9cqyq)
- **보안 advisory**: Next.js [RCE](https://github.com/vercel/next.js/security/advisories/GHSA-9qr9-h5gf-34mp) / [DoS](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3), axios [SSRF](https://github.com/advisories/ghsa-jr5f-v2jv-69x6) / [DoS](https://github.com/advisories/GHSA-4hjh-wcwx-xvwj)
- **Yarn Berry / PnP**: [Migration guide](https://yarnpkg.com/migration/pnp), [SO: PnP 끄는 법](https://stackoverflow.com/questions/60012394/how-to-turn-off-yarn2-pnp), [issue #6380 (TS SDK)](https://github.com/yarnpkg/berry/issues/6380), [issue #7071 (Vite 8)](https://github.com/yarnpkg/berry/issues/7071)
- **React 19 peer 호환 사례**: [react-aria-components #7583](https://github.com/adobe/react-spectrum/issues/7583), [ant-design-mobile #6899](https://github.com/ant-design/ant-design-mobile/issues/6899), [vidstack/player #1533](https://github.com/vidstack/player/issues/1533)
- **디자인시스템 versioning**: [ICDS](https://design.sis.gov.uk/get-started/releases-versions/), [Nulogy](https://nulogy.design/guides/versioning/), [GitLab Pajamas](https://design.gitlab.com/get-started/uik-breaking-changes/)
