---
title: '떠난 페이지는 죽지 않고 숨는다: Next.js cacheComponents와 React Activity'
tags:
  - nextjs
  - react
  - debugging
  - caching
published: true
date: 2026-09-26 22:00:00
description: 'Next.js 16의 cacheComponents는 떠난 페이지를 언마운트하지 않고 React Activity로 숨긴다. 하얗게 빈 three.js 캔버스를 따라 라우터, React, react-three-fiber의 소스를 읽고 브라우저에서 재현했다.'
art:
  undraw: tabs
  layout: glyph
  hue: cyan
  tone: light
  hero: 'display: none'
---

## Table of Contents

## 뒤로 가기를 하자 그래픽이 하얗게 비었다

이 블로그의 [소개 페이지](/about) 상단에는 방문자 브라우저의 로딩 기록을 three.js로 그리는 그래픽이 있다. Performance Timeline에서 리소스 요청과 FCP, LCP를 읽어 막대로 세우고, [react-three-fiber](https://github.com/pmndrs/react-three-fiber)(이하 R3F)의 `<Canvas>`로 렌더링한다. 그런데 소개 페이지에서 다른 페이지로 갔다가 뒤로 가기로 돌아오면, 페이지의 나머지는 그대로인데 이 그래픽 자리만 하얗게 비어 있었다. 앞으로 가기로 돌아와도, 헤더의 링크를 눌러 돌아와도 마찬가지였다. 콘솔에는 `THREE.WebGLRenderer: Context Lost.` 한 줄이 남아 있었다.

원인은 그래픽 코드가 아니라 라우터와 라이브러리 사이에 있었다. 이 블로그는 Next.js 16의 `cacheComponents` 설정을 켜 두었는데, 이 설정이 켜지면 App Router는 떠난 페이지를 언마운트하지 않고 React의 `<Activity>`로 숨겨 둔다. 숨기는 동안 React는 effect를 정리하고, 다시 보여 줄 때 effect를 다시 실행한다. 그리고 R3F 9.7.0의 `<Canvas>`는 effect 정리를 언마운트로 받아들여 WebGL 컨텍스트를 버렸는데, 다시 보일 때는 이미 버린 root를 그대로 붙잡고 있었다.

이 글은 먼저 `cacheComponents`와 Activity가 무엇인지 짚은 뒤, 증상을 따라 세 층을 차례로 내려간다. Next.js 라우터가 어떤 단위로 페이지를 숨기고 언제 버리는지, React의 Activity가 숨길 때 무엇을 정리하고 무엇을 남기는지, 그리고 그 사이에서 R3F가 왜 깨졌고 라이브러리가 이를 어떻게 고쳤는지다. 중간에 직접 시도했다가 버린 우회 방법 두 가지와, 세 가지 구성을 브라우저에서 재현해 비교한 결과도 함께 적었다. 결과만 보면 이 버그는 이 글을 쓰기 이틀 전에 R3F에서 이미 고쳐져 있었다. 그래도 고치는 과정에서 Activity가 effect에 무엇을 요구하는지는 꽤 선명하게 볼 수 있었다.

> 기준: Next.js 16.3.5와, Next.js가 App Router용으로 내장한 React `19.3.0-canary-cbb046ab-20260731`을 읽었다. 프로젝트의 `react-dom`은 19.2.8이지만 App Router는 `next/dist/compiled/react-dom`에 들어 있는 이 canary를 쓴다. R3F는 문제가 난 9.7.0과 수정이 들어간 9.8.1을 비교했다. 소스 인용은 Next.js [`v16.3.5`](https://github.com/vercel/next.js/tree/v16.3.5) 태그, React [`cbb046ab`](https://github.com/facebook/react/tree/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24) 커밋, R3F [`v9.7.0`](https://github.com/pmndrs/react-three-fiber/tree/v9.7.0)과 [`v9.8.1`](https://github.com/pmndrs/react-three-fiber/tree/v9.8.1) 태그에 고정했다. 분석과 측정은 2026년 9월 26일에 했다.
>
> 브라우저 동작은 Playwright 1.63.0의 headless Chromium 153.0.8010.12(WebGL2는 SwiftShader)로 재현했다. 측정 방법은 [뒤에서](#981로-올리고-다시-잰-결과) 따로 적었다. 인용한 코드의 영어 주석은 한국어로 옮겼다. 블로그의 포매터를 거치면서 세미콜론이나 후행 쉼표가 원본과 달라진 곳이 있고, `// ...`는 생략한 부분이다.

## cacheComponents와 Activity

### cacheComponents는 어떤 설정인가

`cacheComponents`는 Next.js 16에서 들어온 설정으로, App Router의 캐싱과 렌더링 방식을 "Cache Components"라는 모델로 바꾼다. 문서의 설명을 옮기면 이렇다. 데이터 가져오기는 기본적으로 동적이고, 캐시할 대상은 `use cache` 지시어로 페이지, 컴포넌트, 함수 단위에서 직접 고른다. 그리고 Next.js는 정적인 HTML 셸을 미리 만들어 곧바로 내려보내고, 동적인 부분은 준비되는 대로 스트리밍한다.[^cc-docs] 이 방식이 PPR(Partial Prerendering)이고, `cacheComponents`를 켜면 PPR이 App Router의 기본 동작이 된다. 예전에 `experimental.ppr`, `experimental.useCache`, `experimental.dynamicIO`로 나뉘어 있던 실험 플래그를 하나로 묶은 설정이기도 하다.

조금 더 쉽게 풀면 이렇다. 예전에는 한 페이지가 통째로 정적이거나 통째로 동적이었다. 요청마다 달라지는 값이 하나라도 섞이면 그 페이지 전체를 요청 때마다 새로 그려야 했다. Cache Components에서는 한 페이지 안에서도 변하지 않는 부분은 미리 HTML로 만들어 두고, 요청마다 달라지는 부분만 자리를 비워 두었다가 나중에 채운다. 상품 페이지라면 상품 설명은 미리 만들어 둔 HTML로 바로 보여 주고, 로그인한 사용자의 장바구니 개수만 요청 때 계산해서 채워 넣는 식이다. 그리고 무엇을 미리 만들어 둘지는 Next.js가 알아서 정하지 않고, 개발자가 `use cache`로 직접 표시한다.

```ts
import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
}

export default nextConfig
```

이 블로그도 `next.config.ts`에서 이 설정을 켜 두었다. 여기까지만 보면 서버에서 무엇을 캐시하고 어떻게 렌더링할지에 관한 설정이다. 그런데 같은 문서에는 "Navigation with Activity"(Activity를 이용한 내비게이션)라는 절이 따로 있고, 이 설정이 클라이언트 내비게이션도 바꾼다고 적혀 있다.

> When `cacheComponents` is enabled, Next.js uses React's `<Activity>` component to preserve component state during client-side navigation. Rather than unmounting the previous route when you navigate away, Next.js sets the Activity mode to `"hidden"`.

> `cacheComponents`를 켜면 Next.js는 클라이언트 사이드 내비게이션 중에 컴포넌트 state를 보존하려고 React의 `<Activity>` 컴포넌트를 쓴다. 다른 곳으로 이동할 때 이전 라우트를 언마운트하는 대신, Next.js는 그 Activity의 mode를 `"hidden"`으로 바꾼다.

`cacheComponents`를 켜면 다른 페이지로 이동해도 이전 페이지가 언마운트되지 않는다는 뜻이다. 이 글의 증상은 전부 이 한 줄에서 시작한다.

### Activity는 무엇인가

`<Activity>`는 React 19.2에서 정식으로 추가된 컴포넌트다. React 문서는 "`<Activity>` lets you hide and restore the UI and internal state of its children."(`<Activity>`는 자식의 UI와 내부 state를 숨겼다가 되살릴 수 있게 해 준다)이라고 소개한다.[^activity-docs] 조건부 렌더링과 나란히 놓으면 차이가 분명하다.

```tsx
// 조건부 렌더링: 숨기면 언마운트되고 state도 사라진다
function WithCondition({isShowingSidebar}: {isShowingSidebar: boolean}) {
  return <>{isShowingSidebar && <Sidebar />}</>
}

// Activity: 숨겨도 state와 DOM이 남는다
function WithActivity({isShowingSidebar}: {isShowingSidebar: boolean}) {
  return (
    <Activity mode={isShowingSidebar ? 'visible' : 'hidden'}>
      <Sidebar />
    </Activity>
  )
}
```

조건부 렌더링으로 숨기면 컴포넌트는 언마운트되고 내부 state도 함께 사라진다. Activity로 숨기면 React가 state를 보관해 두었다가, 다시 보일 때 숨기기 전 상태 그대로 되살린다.

Activity가 받는 prop은 `mode`와 `children` 두 개다. `children`은 보여 주거나 숨길 UI이고, `mode`는 `'visible'`과 `'hidden'` 중 하나인 문자열이다. **`mode`를 생략하면 기본값은 `'visible'`이다.**[^activity-docs] 두 값의 정의를 React 문서와 발표 글을 바탕으로 정리하면 이렇다.[^react-192]

| 값                   | 정의                                                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'visible'` (기본값) | 자식을 화면에 보여 주고, effect를 마운트하며(setup 실행), 업데이트를 평소처럼 처리한다. 평범하게 렌더링된 컴포넌트와 같다.                                                   |
| `'hidden'`           | 자식을 `display: none`으로 가리고, effect를 언마운트하며(cleanup 실행), 업데이트는 React가 더 할 일이 없을 때까지 미룬다. 이때도 state와 DOM은 버리지 않고 그대로 남겨 둔다. |

구현도 이 정의와 같다. React는 `mode === 'hidden'`일 때만 숨김으로 처리하고 나머지는 모두 보이는 상태로 다루며, 내부 타입 정의에도 "Default mode is visible."(기본 모드는 visible이다)이라는 주석이 붙어 있다.[^offscreen-mode] 핵심은 `'hidden'`이 effect만 정리하고 state와 DOM은 남긴다는 점이다. 발표 글은 쓰임새도 두 가지로 든다.

> You can use Activity to render hidden parts of the app that a user is likely to navigate to next, or to save the state of parts the user navigates away from. This helps make navigations quicker by loading data, css, and images in the background, and allows back navigations to maintain state such as input fields.

> Activity를 쓰면 사용자가 다음에 이동할 가능성이 높은 부분을 숨긴 채 미리 렌더링하거나, 사용자가 떠난 부분의 state를 저장해 둘 수 있다. 데이터와 CSS, 이미지를 백그라운드에서 미리 불러오므로 내비게이션이 빨라지고, 뒤로 가기를 했을 때 입력 필드 같은 state가 그대로 남는다.

`cacheComponents`는 이 중 두 번째, 사용자가 떠난 화면의 state를 남겨 두는 용도를 라우터에 그대로 적용한 것이다. 그리고 "effect는 정리하지만 state는 남긴다"는 이 성질이 이 글의 버그가 생긴 자리다.

## 떠난 페이지는 언마운트되지 않는다

### Activity가 라우터에 들어온 경위

이 동작이 처음부터 `cacheComponents`에 묶여 있던 것은 아니다. 2025년 4월 React 팀의 Andrew Clark이 `experimental.routerBFCache`라는 플래그를 먼저 추가했고([#77951](https://github.com/vercel/next.js/pull/77951)), 2025년 10월 21일 병합된 [#84923](https://github.com/vercel/next.js/pull/84923)이 이 플래그를 없애고 `cacheComponents`를 켜면 자동으로 켜지도록 바꿨다.[^pr] [#84923](https://github.com/vercel/next.js/pull/84923)은 의도를 이렇게 적었다.

> This leverages `React.Activity` on layout segments to support restoring previously visited UI segments while preserving state.

> 레이아웃 세그먼트에 `React.Activity`를 적용해, 이전에 방문한 UI 세그먼트를 state를 보존한 채로 되살릴 수 있게 한다.

빌드할 때 이 설정은 `process.env.__NEXT_CACHE_COMPONENTS`라는 상수로 바뀌어 클라이언트 번들에 들어간다.[^define-env] 설정 스키마에도 이 동작만 따로 끄는 항목은 없어서, Activity로 숨기는 동작을 앱 전체에서 끄려면 `cacheComponents` 자체를 꺼야 한다.

### 세그먼트 레벨마다 Activity가 있다

실제로 `<Activity>`를 렌더링하는 곳은 `layout-router.tsx`다.[^layout-router] App Router는 레이아웃 트리의 각 단계(세그먼트 레벨)마다 `LayoutRouter`를 두는데, 이 컴포넌트는 지금 주소에 해당하는 세그먼트만 그리지 않는다. 같은 레벨에서 최근에 활성이었던 세그먼트 몇 개를 함께 그리고, 그것들을 숨겨진 Activity 안에 넣어 두어 다시 방문할 때 상태를 되살린다. 소스 주석이 설명하는 의도가 이것이다.

```tsx
let bfcacheEntry: RouterBFCacheEntry | null = useRouterBFCache(
  activeTree,
  activeCacheNode,
  activeStateKey,
)
let children: Array<React.ReactNode> = []
do {
  // ...
  if (process.env.__NEXT_CACHE_COMPONENTS) {
    child = (
      <Activity
        name={debugNameToDisplay}
        key={stateKey}
        mode={stateKey === activeStateKey ? 'visible' : 'hidden'}
      >
        {child}
      </Activity>
    )
  }

  children.push(child)

  bfcacheEntry = bfcacheEntry.next
} while (bfcacheEntry !== null)
```

`useRouterBFCache`가 돌려주는 연결 리스트를 돌면서 세그먼트마다 `<Activity>`를 하나씩 만들고, 지금 주소와 키가 같은 세그먼트만 `visible`로, 나머지는 `hidden`으로 둔다. 다른 페이지로 이동해도 이전 페이지의 컴포넌트 트리는 React 입장에서 여전히 마운트된 상태로 남는다.

`key`로 쓰이는 `stateKey`는 세그먼트 값으로 만든다.[^cache-key]

```ts
export function createRouterCacheKey(
  segment: Segment,
  withoutSearchParameters: boolean = false,
) {
  // 세그먼트가 배열이면 동적 세그먼트라는 뜻이다.
  // 예: ['lang', 'en', 'd']. 캐시 노드의 키로 저장하려면 문자열로 바꿔야 한다.
  if (Array.isArray(segment)) {
    return `${segment[0]}|${segment[1]}|${segment[2]}`
  }

  // 페이지 세그먼트에는 검색 파라미터가 붙을 수 있다. 예: __PAGE__?foo=bar
  // `withoutSearchParameters`가 true면 페이지 세그먼트만 돌려준다.
  if (withoutSearchParameters && segment.startsWith(PAGE_SEGMENT_KEY)) {
    return PAGE_SEGMENT_KEY
  }

  return segment
}
```

`activeStateKey`는 `withoutSearchParameters`를 `true`로 넘겨 만든다. 그래서 검색 파라미터만 바뀌는 이동은 같은 세그먼트로 취급되고, 동적 세그먼트는 파라미터 값까지 키에 들어간다. 이 블로그의 라우트에 대입하면 루트 레벨에서 `/about`의 키는 `about`이고, `/2026/09/...` 같은 글의 키는 `year|2026|d`다. 글 라우트가 `app/[year]/[...slug]` 구조라서 연도가 첫 세그먼트가 된다.

### 최근 3개, 단 세그먼트 레벨마다

몇 개를 남겨 두는지는 `bfcache-state-manager.ts`에 상수로 있다.[^bfcache]

```ts
// 플래그가 꺼져 있으면 현재 활성 트리만 추적한다.
const MAX_BF_CACHE_ENTRIES = process.env.__NEXT_CACHE_COMPONENTS ? 3 : 1
```

가이드 문서도 "Next.js preserves up to 3 routes."(Next.js는 라우트를 최대 3개까지 보존한다)라고 적는다.[^guide] 그런데 코드를 보면 이 3은 "최근에 방문한 라우트 3개"가 아니라 **"세그먼트 레벨마다 최근에 활성이었던 세그먼트 3개"**다. `useRouterBFCache`는 `LayoutRouter`마다 따로 호출되고, 파일의 주석도 "a certain segment level"에서 최근 N개의 트리를 추적한다고 설명한다. 교체 규칙은 단순한 연결 리스트다. 새로 활성화된 세그먼트를 맨 앞에 두고 예전 리스트를 앞에서부터 복제해 붙이다가, 3개가 차면 나머지를 버린다. 메모리 크기는 보지 않고 개수로만 자른다.

그래서 같은 "뒤로 가기"라도 그 사이에 어디를 거쳤는지에 따라 결과가 달라진다. 브라우저에서 확인한 결과는 코드와 맞았다.

- 소개 페이지에서 홈을 거쳐 **2026년 글 두 편**을 읽고 뒤로 가기를 세 번 누르면, 소개 페이지는 숨겨진 채 남아 있다가 다시 나타났다(R3F 9.7.0에서는 이때 캔버스가 하얗게 비었다). 루트 레벨에는 `about`, 홈(`__PAGE__`), `year|2026|d` 세 개만 쌓이고, 두 번째 글은 두 번째 레벨의 `[...slug]`만 바꾸기 때문이다.
- 홈에서 **2026년 글과 2022년 글**을 차례로 거친 뒤 링크로 소개 페이지에 가면 새로 렌더링됐다. `year|2026|d`와 `year|2022|d`가 서로 다른 키라서 소개 페이지가 리스트에서 밀려났기 때문이다.
- 홈, 태그, 시리즈 목록을 거친 뒤에도 마찬가지로 새로 렌더링됐다.

리스트에서 밀려나 실제로 언마운트된 경우에는 이 글의 증상도 나타나지 않았다. 버그는 "숨겨졌다가 다시 보이는" 경로에서만 생긴다.

### 뒤로 가기와 링크 이동을 구분하지 않는다

브라우저의 bfcache(back/forward cache)는 이름 그대로 히스토리를 오갈 때만 페이지를 되살린다. Next.js의 이 구조는 그렇지 않다. 리스트에서 세그먼트를 찾을 때 보는 것은 `stateKey`뿐이고, 어떤 방식으로 이동했는지는 보지 않는다. 같은 파일의 TODO가 이 점을 직접 적어 두었다.[^bfcache]

```ts
// TODO: 라우트 레벨마다 뒤로/앞으로 가기 히스토리를 추적하게 되면,
// 이 순서 대신 히스토리 순서를 써야 한다. 즉 popstate 이벤트로
// 기존 항목으로 이동할 때는 그 항목을 리스트 맨 앞으로 옮기지 말고
// 기존 순서를 유지해야 한다. 처음 구현은 history.pushState/replaceState에
// 증가하는 id를 넘기고, 여기서 그 id로 순서를 정하는 방식이면 될 것 같다.
```

소개 페이지가 리스트에 남아 있는 동안에는 헤더의 링크를 눌러 소개 페이지로 가도(push 내비게이션) 뒤로 가기와 똑같이 숨겨 둔 트리가 다시 보인다는 뜻이다. 실제로 R3F 9.7.0에서는 헤더 링크로 돌아와도 캔버스가 똑같이 하얗게 비었다. 처음 증상을 "뒤로 가기 버그"로 이해했다면 재현 경로를 좁게 잡았을 것이다.

이 차이 때문에 기존 앱이 깨진다는 보고가 이어지자, Next.js는 2026년 5월 `useRouter().bfcacheId`를 추가했다([#93633](https://github.com/vercel/next.js/pull/93633)).[^bfcacheid] push나 replace로 세그먼트가 새로 만들어질 때마다 바뀌고, 뒤로 가기나 앞으로 가기에서는 예전 값을 복원하는 식별자다. 이 값을 React `key`로 쓰면 링크 이동에서는 상태를 초기화하고, 히스토리 이동에서만 상태를 되살릴 수 있다. PR 본문은 브라우저의 bfcache가 "implements state restoration for history traversal navigations only, not push/replace"(push나 replace가 아닌 히스토리 이동에서만 상태 복원을 구현한다)라고 짚으면서도, 이 API 자체는 권장하는 패턴이 아니라고 분명히 적는다.

> The intent is communicate that `bfcacheId` is not considered an idiomatic pattern

> 의도는 `bfcacheId`가 관용적인 패턴으로 여겨지지 않는다는 점을 전하는 것이다.

가이드 문서 역시 "`bfcacheId` is mainly a migration tool."(`bfcacheId`는 주로 마이그레이션 도구다)이라고 쓰고, 새 코드에는 상황별로 상태를 직접 초기화하는 방법을 권한다.[^guide]

### Next.js 팀이 이 방향을 택한 이유

이 동작 때문에 곤란을 겪은 사례도 많았다. 2025년 11월에 열린 [#86577](https://github.com/vercel/next.js/issues/86577)은 드롭다운이 열린 채 남는 문제, 다이얼로그의 초기화 로직이 다시 돌지 않는 문제, 숨겨진 DOM 때문에 E2E 테스트가 깨지는 문제를 모았고, 이 글을 쓰는 시점에도 열려 있다.[^86577] 이 이슈에서 Next.js 팀의 Sam Selikoff가 남긴 설명을 보면 의도는 두 가지다.

하나는 MPA(여러 HTML 문서로 이루어진 전통적인 웹사이트)에서 브라우저 bfcache가 해 주던 경험을 모든 Next.js 앱에 기본으로 주는 것이다. 뒤로 가기를 누르면 스크롤 위치와 폼 입력, 비제어 요소의 DOM 상태까지 그대로인 이전 화면이 즉시 나온다. SPA에서는 이런 상태를 개발자가 직접 저장하고 복원해야 했다. 다른 하나는 앞으로의 기능을 위한 기반이다.

> Both of these features (as well as others) rely on Activity-robust client code as part of their foundation, since animations really only work if the old and new screens are already ready to be displayed.

> 이 두 기능(그리고 다른 기능들)은 Activity를 견디는 클라이언트 코드를 토대로 삼는다. 이전 화면과 새 화면이 이미 표시될 준비가 되어 있어야 애니메이션이 제대로 동작하기 때문이다.

여기서 "these features"는 페이지 전환과 결합한 View Transitions와 React의 Gesture API를 가리킨다. 떠난 페이지를 숨겨 두는 것은 캐시 기능이라기보다, 클라이언트 코드가 숨겨졌다가 다시 보이는 상황을 견디도록 요구하는 전환점에 가깝다고 생각한다. 같은 댓글에서 특정 세그먼트만 빼는 방법과 뒤로 가기에만 적용하는 방법도 거론됐는데, 이런 방식은 앞으로 나올 기능과 호환되지 않는다는 단서가 함께 붙어 있었다. 이후 실제로 들어간 것은 앞에서 본 `bfcacheId`다.

## Activity는 숨길 때 무엇을 하는가

### Activity는 Offscreen의 얇은 껍데기다

구현을 보면 Activity 자체가 하는 일은 거의 없다. `mountActivityChildren`은 자식으로 `OffscreenComponent` fiber(React가 컴포넌트 하나하나를 표현하는 내부 작업 단위)를 하나 만들고 `mode`를 그대로 넘긴다.[^begin-work]

```js
const nextChildren = nextProps.children;
const nextMode = nextProps.mode;
const mode = workInProgress.mode;
const offscreenChildProps: OffscreenProps = {
  mode: nextMode,
  children: nextChildren,
};
const primaryChildFragment = mountWorkInProgressOffscreenFiber(
  offscreenChildProps,
  mode,
  renderLanes,
);
```

숨기고 보여 주는 동작은 전부 Offscreen 쪽에 있다. Suspense가 fallback을 보여 주는 동안 원래 자식을 가려 둘 때 쓰는 것도 같은 Offscreen이다. Offscreen은 React 내부에서 먼저 쓰이던 장치이고, Activity는 이를 앱 코드에서 쓸 수 있게 공개한 이름이라고 보면 된다.

### 숨길 때 일어나는 일

`mode`가 `hidden`으로 바뀐 커밋에서 React는 mutation 단계(DOM을 실제로 고치는 단계)에서 두 가지를 한다. 먼저 자식 트리의 layout effect를 정리한다. `disappearLayoutEffects`는 함수 컴포넌트에서 `HookLayout` 태그가 붙은 effect, 즉 `useLayoutEffect`의 cleanup을 실행하고, 호스트 컴포넌트(DOM 요소)에서는 ref를 뗀다.[^disappear]

```js
case FunctionComponent:
case ForwardRef:
case MemoComponent:
case SimpleMemoComponent: {
  // TODO (Offscreen): flags & LayoutStatic 검사 필요
  commitHookLayoutUnmountEffects(
    finishedWork,
    finishedWork.return,
    HookLayout,
  );
  // ...
}
// ...
case HostHoistable:
case HostComponent: {
  // TODO (Offscreen): flags & RefStatic 검사 필요
  safelyDetachRef(finishedWork, finishedWork.return);
```

그다음 DOM을 숨긴다. 가장 가까운 호스트 노드마다 `hideInstance`를 부르는데, 이 함수가 하는 일은 인라인 스타일 한 줄이다.[^hide-instance]

```js
export function hideInstance(instance: Instance): void {
  // TODO: 모든 요소 타입에서 동작하는가? MathML은 어떤가?
  // 이 메서드에 호스트 컨텍스트를 넘겨야 하나?
  instance = instance as any as HTMLElement;
  const style = instance.style;
  // $FlowFixMe[method-unbinding]
  if (typeof style.setProperty === 'function') {
    style.setProperty('display', 'none', 'important');
  } else {
    style.display = 'none';
  }
}
```

`display: none !important`다. 노드는 문서에 그대로 붙어 있다. 텍스트 노드는 `nodeValue`를 빈 문자열로 바꿔서 숨긴다. 다시 보일 때 `unhideInstance`는 숨기기 전 값을 기억해 두었다가 되돌리는 것이 아니라, 현재 props의 `style.display`를 다시 적용한다.

`useEffect`의 cleanup은 이 커밋이 끝난 뒤 passive effect(화면을 그린 뒤 실행되는 `useEffect`류)를 처리하는 단계에서 실행된다.[^passive-hide]

```js
case OffscreenComponent: {
  const instance: OffscreenInstance = finishedWork.stateNode;
  const nextState: OffscreenState | null = finishedWork.memoizedState;

  const isHidden = nextState !== null;

  if (
    isHidden &&
    instance._visibility & OffscreenPassiveEffectsConnected &&
    // 하위 호환을 위해 트리가 suspend된 경우에는 언마운트하지 않는다.
    // 나중에는 일정 시간이 지난 뒤 언마운트하도록 바꿀 수도 있다.
    (finishedWork.return === null ||
      finishedWork.return.tag !== SuspenseComponent)
  ) {
    // effect가 지금 연결되어 있으므로 연결을 끊는다.
    // TODO: effect를 끊기 전에 잠시 기다리는 옵션이나 휴리스틱을 추가할 것.
    // 그러면 그 시간 안에 트리가 다시 나타날 때 effect를 끊었다가
    // 다시 잇는 일을 통째로 건너뛸 수 있다.
    instance._visibility &= ~OffscreenPassiveEffectsConnected;

    recursivelyTraverseDisconnectPassiveEffects(finishedWork);
```

두 가지가 눈에 띈다. Suspense 바로 아래의 Offscreen은 예외로 두어서, 데이터를 기다리느라 fallback에 가려진 트리의 `useEffect`는 정리하지 않는다. 그리고 TODO에 적힌 대로 지금은 숨기는 즉시 effect를 끊는다. 잠깐 숨겼다가 바로 다시 보여 줘도 cleanup과 setup이 한 번씩 실행된다.

### cleanup은 이유를 모른다

숨길 때 `useEffect` cleanup을 실행하는 `disconnectPassiveEffect`는 결국 `commitHookPassiveUnmountEffects(finishedWork, finishedWork.return, HookPassive)`를 호출한다.[^disconnect] 컴포넌트가 실제로 삭제될 때 쓰는 함수와 같고, 넘기는 플래그도 `HookPassive`로 같다. cleanup 함수는 인자 없이 호출되므로 cleanup 안에서는 지금이 숨김인지 삭제인지 구분할 방법이 없다. React 문서가 "Conceptually, you should think of "hidden" Activities as being unmounted."(개념적으로는 hidden 상태의 Activity를 언마운트된 것으로 생각해야 한다)라고 쓰는 것도 이 구조와 맞닿아 있다.[^activity-docs]

### 숨겨도 남는 것

반대로 숨길 때 React가 건드리지 않는 것들이 있고, 이 글의 버그는 여기서 나왔다.

우선 **state와 ref 객체**가 그대로 남는다. fiber와 hook 목록이 유지되므로 `useState`의 값도, `useRef`가 돌려준 객체도 그대로다. DOM 요소에 연결한 ref는 숨길 때 `null`이 되었다가 다시 보일 때 다시 연결되지만, 컴포넌트가 직접 값을 넣어 둔 `useRef`는 누구도 비우지 않는다. Next.js 가이드는 이 성질을 첫 마운트와 다시 보이는 경우를 구분하는 방법으로 소개하기도 하는데, 가이드의 표현으로는 "The ref persists across hide/show cycles (refs aren't cleaned up)"(ref는 숨김과 표시를 거쳐도 유지되며 정리되지 않는다)이다.[^guide]

**DOM과 DOM이 일으키는 부수 효과**도 남는다. 노드는 문서에 붙은 채로 `display: none`만 받으므로 재생 중인 `<video>`는 숨겨도 계속 재생된다. React 문서도 "since a hidden component's DOM is not destroyed, any side effects from that DOM will persist, even after the component is hidden."(숨겨진 컴포넌트의 DOM은 파괴되지 않으므로, 그 DOM이 일으킨 부수 효과는 컴포넌트가 숨겨진 뒤에도 계속된다)이라고 적는다.[^activity-docs]

마지막은 **`useInsertionEffect`**다. 숨김 경로의 `disappearLayoutEffects`는 `HookLayout`만 정리하고 `HookInsertion`은 건드리지 않는다. insertion effect의 cleanup은 fiber가 실제로 삭제될 때 `commitDeletionEffectsOnFiber`에서만 실행된다.[^deletion]

```js
case FunctionComponent:
case ForwardRef:
case MemoComponent:
case SimpleMemoComponent: {
  // TODO: 소요 시간을 기록하려면 commitHookInsertionUnmountEffects 래퍼를 써야 한다.
  commitHookEffectListUnmount(
    HookInsertion,
    deletedFiber,
    nearestMountedAncestor,
  );
  if (!offscreenSubtreeWasHidden) {
    commitHookLayoutUnmountEffects(
      deletedFiber,
      nearestMountedAncestor,
      HookLayout,
    );
  }
```

삭제 경로를 보면 이미 숨겨져 있던 트리(`offscreenSubtreeWasHidden`)에서는 layout cleanup을 다시 부르지 않는다. 숨길 때 이미 한 번 정리했기 때문이다. 반면 insertion cleanup은 조건 없이 부른다. 정리하면 `useInsertionEffect`의 cleanup은 숨김에는 반응하지 않고, 컴포넌트가 정말로 트리에서 빠질 때 한 번만 실행된다. 뒤에서 R3F가 이 차이를 이용한다.

### 다시 보일 때는 의존성 배열과 상관없이 다시 실행된다

`hidden`에서 `visible`로 바뀌면 순서가 반대로 돈다. DOM의 `display`를 되돌리고, `reappearLayoutEffects`가 layout effect를 다시 만들고 ref를 다시 연결한다. 그리고 passive 단계에서 `reconnectPassiveEffects`가 `useEffect`를 다시 실행한다. 여기서 어떤 effect를 실행할지 고르는 방식이 평소와 다르다. 평소의 커밋은 이렇게 호출한다.[^mount-flags]

```js
commitHookPassiveMountEffects(finishedWork, HookPassive | HookHasEffect)
```

`HookHasEffect`는 이번 렌더링에서 의존성이 바뀐 effect에만 붙는 표시다. 그래서 평소에는 의존성이 바뀐 effect만 다시 실행된다. 반면 다시 보일 때는 이렇게 호출한다.

```js
// TODO: PassiveStatic 플래그 검사 필요
commitHookPassiveMountEffects(finishedWork, HookPassive)
```

`HookHasEffect` 없이 `HookPassive`만 넘기므로 모든 `useEffect`가 실행된다. `commitHookEffectListMount`는 `(effect.tag & flags) === flags`로만 고르기 때문이다. `useEffect(fn, [])`처럼 마운트 때 한 번만 실행되리라 기대한 effect도 다시 보일 때마다 실행된다. layout effect도 `commitHookLayoutEffects(finishedWork, HookLayout)`로 같은 방식이다. Next.js 가이드가 "Effects run on every hide-to-visible transition, not just the initial mount."(effect는 첫 마운트 때만이 아니라 숨김에서 표시로 바뀔 때마다 실행된다)라고 따로 적어 둔 이유다.[^guide]

이 블로그의 그래픽에서도 이 동작이 그대로 보였다. 로딩 기록을 모으는 effect는 의존성 배열을 `[]`로 선언했는데, 소개 페이지에서 홈에 갔다가 돌아오자 그래픽 아래 요약 문구가 "리소스 33개, 629KB, FCP 108ms, LCP 216ms"에서 "리소스 33개, 629KB, FCP 108ms, LCP 216ms, 이후 요청 9개 생략"으로 바뀌었다. 돌아오는 순간 effect가 다시 실행되어 Performance Timeline을 다시 읽었고, 그사이 홈을 오가며 생긴 요청 9개가 새로 잡힌 것이다.

### StrictMode가 이미 연습시키던 것

흥미로운 점은 이 경로가 새로 생긴 것이 아니라는 것이다. 개발 모드의 StrictMode는 새로 마운트된 컴포넌트의 effect를 한 번 정리했다가 다시 실행하는데, 이를 구현한 `doubleInvokeEffectsOnFiber`는 Activity가 쓰는 함수 네 개를 그대로 호출한다.[^strict]

```js
function doubleInvokeEffectsOnFiber(root: FiberRoot, fiber: Fiber) {
  setIsStrictModeForDevtools(true);
  try {
    disappearLayoutEffectsForDEVValidation(fiber);
    disconnectPassiveEffect(fiber);
    reappearLayoutEffectsForDEVValidation(root, fiber.alternate, fiber);
    reconnectPassiveEffects(root, fiber, NoLanes, null, false, 0);
  } finally {
    setIsStrictModeForDevtools(false);
  }
}
```

StrictMode의 이중 실행은 사실상 "숨겼다가 다시 보여 주기"의 리허설이었던 셈이다. 다만 리허설은 개발 모드에서 마운트 직후에 한 번 일어나고, 숨겨진 사이에 시간이 흐르지 않는다. Activity는 프로덕션에서, 사용자가 다른 페이지를 읽는 동안 몇 분이고 트리를 숨겨 둔다. 정리 작업을 타이머로 미뤄 두는 코드처럼, 리허설에서는 드러나지 않던 문제가 여기서 드러날 수 있다. 뒤에서 보겠지만 이 블로그의 그래픽이 정확히 그런 경우였다. 개발 서버(StrictMode)에서 첫 진입은 멀쩡했고, 다른 페이지에 다녀오자 비었다.

### 숨겨진 트리의 업데이트는 미뤄진다

하나 더 알아 둘 것은 숨겨진 트리 안에서 일어나는 state 업데이트다. 업데이트가 예약되면 `markUpdateLaneFromFiberToRoot`가 fiber에서 루트까지 올라가는데, 도중에 숨겨진 Offscreen을 만나면 그 업데이트를 숨겨진 업데이트로 표시한다.[^hidden-update]

```js
if (
  offscreenInstance !== null &&
  !(offscreenInstance._visibility & OffscreenVisible)
) {
  isHidden = true;
}
// ...
if (node.tag === HostRoot) {
  const root: FiberRoot = node.stateNode;
  if (isHidden && update !== null) {
    markHiddenUpdate(root, update, lane);
  }
  return root;
}
```

`markHiddenUpdate`는 업데이트의 lane(React가 업데이트의 우선순위를 나타내는 비트)에 `OffscreenLane`을 덧붙인다(`update.lane = lane | OffscreenLane`). 발표 글의 "defers all updates until React has nothing left to work on"(React가 더 할 일이 없을 때까지 모든 업데이트를 미룬다)은 코드에서 이 부분에 해당한다. 숨길 때 `OffscreenVisible` 비트는 mutation 단계에서 먼저 내려가므로, 그 뒤 passive 단계에서 실행되는 cleanup 안에서 `setState`를 호출해도 숨겨진 업데이트가 된다. 이 점은 뒤에서 우회 코드를 평가할 때 다시 나온다.

여기까지를 표로 정리하면 이렇다.

| 대상                    | 숨길 때                    | 다시 보일 때                    | 실제 삭제                         |
| ----------------------- | -------------------------- | ------------------------------- | --------------------------------- |
| `useState`, `useRef` 값 | 유지                       | 유지                            | 사라짐                            |
| DOM 노드                | `display: none !important` | `display` 복원                  | 문서에서 제거                     |
| DOM 요소에 연결한 ref   | `null`로 분리              | 다시 연결                       | 분리                              |
| `useLayoutEffect`       | cleanup 실행               | setup 다시 실행                 | cleanup (숨겨져 있었으면 생략)    |
| `useEffect`             | cleanup 실행               | setup 다시 실행 (의존성과 무관) | cleanup (숨길 때 실행했으면 생략) |
| `useInsertionEffect`    | 그대로                     | 그대로                          | cleanup 실행                      |
| state 업데이트          | 숨겨진 업데이트로 미뤄짐   | 정상 처리                       | 해당 없음                         |

`useEffect`의 삭제 칸이 "생략"인 것은 cleanup을 실행할 때 `inst.destroy`를 `undefined`로 비워 두기 때문이다. 숨길 때 이미 실행된 cleanup은 삭제될 때 다시 실행되지 않는다.[^unmount-once]

## R3F Canvas가 하얗게 빈 과정

이제 증상으로 돌아가면 이렇다. R3F 9.7.0의 `<Canvas>`는 WebGL 렌더러와 씬을 담은 root를 `useRef`에 들고 있다. 아래는 관련 부분만 추린 발췌다.[^r3f-canvas-970]

```tsx
const root = React.useRef<ReconcilerRoot<HTMLCanvasElement>>(null!)

useIsomorphicLayoutEffect(() => {
  const canvas = canvasRef.current
  if (containerRect.width > 0 && containerRect.height > 0 && canvas) {
    if (!root.current) root.current = createRoot<HTMLCanvasElement>(canvas)
    // configure와 render 호출은 생략
  }
})

React.useEffect(() => {
  const canvas = canvasRef.current
  if (canvas) return () => unmountComponentAtNode(canvas)
}, [])
```

layout effect는 의존성 배열이 없어서 커밋마다 실행되고, root가 없을 때만 새로 만든다. 정리는 `useEffect`의 cleanup이 맡는다. `unmountComponentAtNode`는 씬을 비운 뒤 500ms 타이머로 렌더러를 정리한다.[^r3f-renderer-970]

```tsx
reconciler.updateContainer(null, fiber, null, () => {
  if (state) {
    setTimeout(() => {
      try {
        state.events.disconnect?.()
        state.gl?.renderLists?.dispose?.()
        state.gl?.forceContextLoss?.()
        if (state.gl?.xr) state.xr.disconnect()
        dispose(state.scene)
        _roots.delete(canvas)
        if (callback) callback(canvas)
      } catch (e) {
        /* ... */
      }
    }, 500)
  }
})
```

`forceContextLoss()`는 WebGL 컨텍스트를 일부러 잃게 만드는 호출이다. R3F 9.8.0의 변경 기록은 이 호출을 "`forceContextLoss()` is permanent, which left the canvas blank for the rest of the session."(`forceContextLoss()`는 되돌릴 수 없어서, 세션이 끝날 때까지 캔버스를 빈 채로 남겼다)이라고 설명한다.[^r3f-changelog]

언마운트만 있던 시절에는 이 설계에 문제가 없었다. cleanup이 실행되면 컴포넌트는 곧 사라지고 `root` ref도 함께 사라진다. 다시 마운트되면 새 컴포넌트가 새 ref로 새 root를 만든다. Activity 아래에서는 이 전제가 깨진다. 소개 페이지를 떠나는 순간부터 순서대로 적으면 이렇다.

| 시점                     | React가 하는 일                                        | R3F 9.7.0에서 일어나는 일                                                                           |
| ------------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| 다른 페이지로 이동       | 소개 페이지의 Activity를 `hidden`으로, `display: none` | 캔버스 노드는 문서에 남는다                                                                         |
| 같은 커밋의 passive 단계 | `useEffect` cleanup 실행                               | `unmountComponentAtNode`가 씬을 비우고 500ms 타이머를 예약한다                                      |
| 500ms 뒤                 | 없음                                                   | `forceContextLoss()`, 씬 dispose, `_roots`에서 삭제                                                 |
| 뒤로 가기                | Activity를 `visible`로, layout effect 다시 실행        | `root.current`가 남아 있어 `createRoot`를 건너뛰고, 정리된 root에 `configure`와 `render`를 호출한다 |
| 다음 passive 단계        | `useEffect` setup 다시 실행                            | cleanup만 다시 등록되고, 새 root는 만들어지지 않는다                                                |

브라우저에서 재현한 모습도 이 표와 같았다. 떠나기 전에 캔버스 요소에 표식을 달아 두고 돌아와서 확인하면, 돌아온 캔버스는 표식이 그대로 남은 **같은 DOM 요소**였고 `getContext('webgl2').isContextLost()`는 `true`였다. 라이트 테마에서는 캔버스 자리가 하얗게 비어 보였다. 타이머가 돌기 전인 200ms 만에 뒤로 가기를 눌러도 결과는 같았다. 돌아온 직후와 1.5초 뒤의 화면은 두 번의 실행에서 서로 달랐지만, 두 번 모두 1.5초 뒤에는 컨텍스트를 잃은 상태였다. 9.7.0에는 예약된 정리를 취소하는 코드가 없기 때문이다.

React는 문서대로 state와 ref를 보존했을 뿐이고, R3F는 cleanup을 받았으니 정리했을 뿐이다. 어긋난 것은 cleanup과 ref의 수명이다. cleanup은 곧 언마운트된다고 가정하고 자원을 버렸는데, 그 자원을 가리키는 ref는 살아남았다. Next.js 가이드가 기능으로 소개한 성질, 즉 ref가 숨김과 표시를 거쳐도 유지된다는 점이 여기서는 버그의 원인이 됐다.

같은 뿌리의 문제는 개발 모드에서 먼저 보고되어 있었다. 2026년 8월에 열린 R3F [#3863](https://github.com/pmndrs/react-three-fiber/issues/3863)은 StrictMode에서 `<Canvas>`가 마운트되고 약 500ms 뒤 컨텍스트를 잃고 빈 화면이 된다는 이슈다.[^r3f-3863] StrictMode의 리허설이 cleanup을 실행하고, 곧바로 다시 마운트된 `<Canvas>`가 같은 root를 재사용하는 사이 500ms 타이머가 그 root를 정리해 버린 것이다. 다만 이 블로그의 소개 페이지에서는 이 증상이 재현되지 않았다. `reactStrictMode: true`인 개발 서버에서도 첫 진입 뒤 2초가 지나도록 그래픽은 멀쩡했고, 다른 페이지에 다녀온 뒤에만 비었다. 리허설을 통과한 코드가 실제 숨김에서 깨진 것이다.

## 직접 고쳐 보려던 두 가지 방법

### 첫 번째: cleanup만 있는 effect

원인을 확인하고 처음 쓴 코드는 이랬다. 숨길 때 실행되는 cleanup에서 key를 바꿔 두어, 다시 보일 때 `<Canvas>`가 새로 마운트되게 하는 방식이다.

```tsx
const [canvasKey, setCanvasKey] = useState(0)

useEffect(
  () => () => {
    setCanvasKey((k) => k + 1)
    setDrawn(false)
  },
  [],
)

// ...
<Canvas key={canvasKey} /* ... */>
```

이 코드는 브라우저에서 확인하기 전에 되돌렸다. 다시 읽어 보면 이상한 코드이기 때문이다. setup이 비어 있고 cleanup만 있는 effect는 "숨겨지는 순간"을 잡으려는 의도인데, 코드만 봐서는 그 의도를 알 수 없다. cleanup에서 state를 바꿔 다음 렌더링을 일으키는 흐름도 읽는 사람이 따라가기 어렵다. 무엇보다 앞에서 본 것처럼 cleanup은 숨김과 삭제를 구분하지 못하므로, 이 코드는 실제로 언마운트될 때도, StrictMode가 리허설할 때도 똑같이 key를 올린다.

### 두 번째: 이미 있는 effect의 cleanup에서 기록을 비운다

두 번째는 로딩 기록을 모으는 기존 effect에 정리를 합치는 방법이었다.

```tsx
useEffect(() => {
  let alive = true
  void (async () => {
    const collected = await collectTrace(SELF_URL)
    if (alive) setTrace(collected)
  })()
  return () => {
    alive = false
    setTrace(null)
    setDrawn(false)
    setFocus(-1)
  }
}, [])
```

`<Canvas>`는 원래 기록이 있을 때만 렌더링되므로, 숨길 때 기록을 비우면 캔버스도 함께 내려가고 다시 보일 때 새로 모은 기록으로 새 캔버스가 뜬다. key를 위한 state가 따로 필요 없고, "보이는 동안만 기록과 캔버스를 가진다"는 규칙이 원래 기록을 관리하던 effect 안에 모인다. `setFocus(-1)`은 막대를 선택한 채 떠났다가 돌아왔을 때, 새 기록의 막대 수가 더 적으면 예전 인덱스가 범위를 벗어나는 것을 막으려고 넣었다.

프로덕션 빌드에서 재 보니 이 방법은 동작하기는 했다. 뒤로 가기, 앞으로 가기, 링크 이동을 포함한 모든 경로에서 돌아올 때마다 새 캔버스가 만들어져 1초 안팎에 다시 그려졌고, 다시 그려진 시점에 문서에 남은 캔버스는 새 캔버스 하나뿐이었다. 대신 떠날 때마다 콘솔에 `THREE.WebGLRenderer: Context Lost.`가 찍혔다. 숨겨진 R3F root가 매번 정리되고 있었다는 뜻이다.

그래도 두 가지가 마음에 걸렸다. 하나는 여전히 cleanup에서 state를 바꾼다는 점이다. 숨길 때 실행되는 cleanup이므로 이 업데이트는 앞에서 본 숨겨진 업데이트가 되어 뒤로 미뤄진다. 결과는 맞게 나왔지만, 이 업데이트가 정확히 어느 렌더링에서 처리되는지는 코드를 읽는 사람이 예측하기 어렵다.

더 큰 문제는 이 방법이 Activity가 주려는 것을 스스로 버린다는 점이다. 돌아올 때마다 WebGL 컨텍스트를 새로 만들고 셰이더를 다시 컴파일하며, 재생 연출도 처음부터 다시 돈다. 숨김을 억지로 언마운트로 바꾼 것에 가깝다. 문제는 컴포넌트가 아니라 라이브러리가 숨김과 삭제를 구분하지 못하는 데 있었는데, 두 우회 방법 모두 그 차이를 앱 쪽에서 지워 버리는 방향이었다.

## 라이브러리는 숨김과 삭제를 이렇게 구분했다

두 번째 방법을 적용해 둔 뒤 이 글을 쓰려고 자료를 모으다가, R3F 저장소에 같은 증상이 이미 올라와 있는 것을 발견했다. 2026년 9월 24일에 열린 [#3939](https://github.com/pmndrs/react-three-fiber/issues/3939)다.[^r3f-3939] 원인 분석도 같았다.

> When the tree is shown again, the Canvas's layout effect reuses the ref to the unmounted root, so `render()` does nothing.

> 트리가 다시 보일 때 Canvas의 layout effect가 이미 언마운트된 root를 가리키는 ref를 재사용하므로, `render()`는 아무 일도 하지 않는다.

수정한 PR [#3943](https://github.com/pmndrs/react-three-fiber/pull/3943)은 같은 날 병합되었고, 몇 시간 뒤 배포된 9.8.1에 들어갔다. 9.8.1의 `<Canvas>`는 root를 정리하는 위치를 옮겼다.[^r3f-canvas-981]

```tsx
// insertion effect는 Activity의 숨김과 StrictMode의 effect 재실행을 견딘다.
// root는 최종적으로 제거될 때만 놓는다. React 19.2부터는 숨겨진 채 제거되는 경우도 포함된다.
React.useInsertionEffect(() => {
  return () => {
    const current = root.current
    root.current = null
    current?.unmount()
  }
}, [])
```

앞에서 확인했듯이 insertion effect의 cleanup은 숨길 때도, StrictMode가 리허설할 때도 실행되지 않고 실제로 삭제될 때만 실행된다. 그래서 root를 버리는 일을 여기에만 맡기면 숨김에는 반응하지 않고 삭제에만 반응한다. 숨겨진 채로 Next.js의 리스트에서 밀려나 삭제될 때도 이 cleanup이 실행되므로 자원이 새지 않는다. 그리고 root를 버리면서 `root.current`도 함께 비워, 나중에 다시 마운트되면 새 root를 만들게 했다. 9.7.0에서 짝이 맞지 않던 "자원 정리"와 "ref 비우기"를 한곳에 묶은 것이다.

React 19.2보다 오래된 버전을 위한 장치도 하나 더 있다.

```tsx
// 19.2 이전의 React는 Suspense가 숨긴 서브트리에서 insertion cleanup을 건너뛰지만
// passive effect는 연결된 채로 둔다. 문서에서 빠진 캔버스는 숨겨진 것이 아니라 제거된 것이다.
React.useEffect(() => {
  const canvas = canvasRef.current
  return () => {
    if (!canvas.isConnected) root.current?.unmount()
  }
}, [])
```

`isConnected`로 구분하는 원리도 커밋 순서에 있다. PR 설명의 표현으로는 "React detaches it before running passive cleanups on a real unmount."(실제 언마운트에서는 React가 passive cleanup을 실행하기 전에 노드를 문서에서 떼어 낸다)다.[^r3f-3943] 실제 삭제에서는 mutation 단계에서 DOM 노드를 문서에서 떼어 낸 뒤에 passive cleanup이 실행되므로, cleanup 시점의 캔버스는 이미 문서 밖에 있다. 숨김에서는 노드가 `display: none`인 채로 문서에 남아 있으므로 `isConnected`가 `true`다. cleanup에 인자는 없지만, DOM의 상태를 보면 cleanup이 실행된 이유를 추론할 수 있는 것이다.

9.8.1에는 캔버스 안쪽을 위한 변경도 있다. 변경 기록에 따르면 바깥 Activity의 표시 상태를 캔버스의 씬으로 전달해서, 숨기면 씬 안의 effect와 `useFrame` 구독을 끊고 다시 보이면 씬 상태를 초기화하지 않은 채 다시 연결한다.[^r3f-changelog] R3F는 씬을 react-dom과는 별도의 reconciler 루트에서 렌더링하므로, 바깥의 Activity가 숨겨져도 안쪽 트리의 effect는 저절로 끊기지 않기 때문으로 보인다. 개발 모드 버그였던 [#3863](https://github.com/pmndrs/react-three-fiber/issues/3863)은 한 버전 앞선 9.8.0에서 500ms 타이머를 없애는 방식으로 고쳐졌다.

한 가지 짚어 둘 점이 있다. React 문서는 `useInsertionEffect`를 "`useInsertionEffect` is for CSS-in-JS library authors."(`useInsertionEffect`는 CSS-in-JS 라이브러리 작성자를 위한 것이다)라고 소개한다.[^insertion-docs] Activity 문서에도 insertion effect가 숨김을 견딘다는 설명은 없다. R3F의 방법은 React 구현의 커밋 순서에 기대는 라이브러리 수준의 기법이고, 앱 코드에서 "진짜 언마운트"를 잡으려고 따라 할 만한 패턴인지는 잘 모르겠다. 앱 코드라면 숨겨져도 괜찮은 자원은 그대로 두고, 숨김과 함께 멈춰야 하는 것만 cleanup에서 멈추는 쪽이 문서가 말하는 방향에 더 가깝다고 생각한다.

## 9.8.1로 올리고 다시 잰 결과

이 블로그는 R3F를 9.8.1로 올리고 우회 코드를 걷어냈다. `LoadTrace.tsx`는 문제가 생기기 전 코드 그대로이고, 바뀐 것은 의존성 하나다. 9.8.1의 `peerDependencies`는 `react`와 `react-dom`을 `>=19 <19.4`로 두고 있고, 9.8.0 변경 기록에는 "Support React 19.3"(React 19.3 지원) 항목이 있어 Next.js 16.3.5가 내장한 19.3 canary와도 범위가 맞는다.

고치기 전과 후를 같은 조건에서 비교하려고 세 가지 구성을 프로덕션 빌드(`next build`, `next start`)로 띄워 같은 시나리오를 돌렸다.

> 측정: Playwright 1.63.0, headless Chromium 153.0.8010.12(WebGL2는 SwiftShader), macOS, 뷰포트 1280×900, 서비스 워커 차단. 이동은 실제 링크를 클릭하는 소프트 내비게이션과 `page.goBack()`, `page.goForward()`로 했다. 판정은 세 가지로 했다. 떠나기 전에 캔버스에 `data-probe` 속성을 달아 돌아온 캔버스가 같은 DOM 요소인지 보고, `getContext('webgl2').isContextLost()`로 컨텍스트를 확인하고, 캔버스 위의 HTML 라벨을 숨긴 채 캔버스 영역을 캡처해 밝은 픽셀(RGB 중 최댓값이 100 초과) 비율을 쟀다. 정상적인 그래픽은 0.8-8.9%, 하얗게 빈 캔버스는 86-93%였다. 컨텍스트를 잃고도 마지막 장면이 남아 어둡게 보인 경우가 한 번 있어서, 빈 캔버스 판정은 `isContextLost()`를 기준으로 했다. 시나리오마다 구성별로 한 번씩 돌렸고, 200ms 뒤로 가기는 9.7.0에서 두 번 돌렸다.

| 시나리오                                        | 9.7.0              | 9.7.0 + 두 번째 우회 | 9.8.1            |
| ----------------------------------------------- | ------------------ | -------------------- | ---------------- |
| 소개 → 홈 → 뒤로 가기                           | 빈 캔버스          | 새 캔버스            | 원래 캔버스 유지 |
| 홈 → 소개 → 뒤로 가기 → 앞으로 가기             | 빈 캔버스          | 새 캔버스            | 원래 캔버스 유지 |
| 소개 → 홈 → 헤더 링크로 소개                    | 빈 캔버스          | 새 캔버스            | 원래 캔버스 유지 |
| 소개 → 홈 → 200ms 뒤 뒤로 가기                  | 1.5초 뒤 빈 캔버스 | 새 캔버스            | 원래 캔버스 유지 |
| 소개 → 홈 → 2026년 글 두 편 → 뒤로 가기 세 번   | 빈 캔버스          | 새 캔버스            | 원래 캔버스 유지 |
| 소개 → 홈 → 2026년 글 → 2022년 글 → 링크로 소개 | 새로 렌더링        | 새 캔버스            | 새로 렌더링      |
| 소개 → 홈 → 태그 → 시리즈 → 링크로 소개         | 새로 렌더링        | 새 캔버스            | 새로 렌더링      |
| 첫 진입 후 2초                                  | 정상               | 정상                 | 정상             |

표의 "빈 캔버스"는 같은 캔버스 요소가 컨텍스트를 잃은 채 다시 그려지지 않은 경우, "원래 캔버스 유지"는 같은 요소가 컨텍스트를 유지한 채 1초 안에 그래픽을 보여 준 경우다. "새 캔버스"와 "새로 렌더링"은 다른 캔버스 요소가 새로 만들어져 1초 안팎에 그려진 경우인데, 앞의 것은 우회 코드가 일부러 다시 만든 것이고 뒤의 것은 Next.js가 소개 페이지를 리스트에서 밀어내 실제로 언마운트했기 때문이다.

콘솔에서도 차이가 났다. 9.7.0과 두 번째 우회에서는 페이지를 떠났다가 돌아와 1.5초 넘게 지켜본 모든 시나리오에서 `THREE.WebGLRenderer: Context Lost.`가 찍혔고, 9.8.1에서는 한 번도 찍히지 않았다. 9.8.1 변경 기록에 적힌 대로, 삭제할 때도 렌더러를 먼저 dispose한 뒤 컨텍스트를 놓기 때문으로 보인다.

개발 서버(`next dev`, `reactStrictMode: true`)에서도 확인했다. 9.7.0에서는 첫 진입 그래픽은 2초가 지나도 멀쩡했고 뒤로 가기에서만 비었다. 9.8.1에서는 뒤로 가기와 헤더 링크 이동 모두 원래 캔버스가 유지됐다.

## Activity를 견디는 코드

이번 일을 겪고 나서 effect를 읽는 방식이 조금 달라졌다. 정리하면 이렇다.

- cleanup은 끝이 아니라 잠시 멈춤일 수 있다. cleanup에서 자원을 버린다면 그 자원을 가리키는 ref나 state도 함께 비워야, 다시 실행될 때 새로 만든다. R3F 9.7.0은 이 짝이 맞지 않았다.
- 의존성 배열이 `[]`인 effect는 "마운트 때 한 번"이 아니다. 다시 보일 때마다 실행된다. 첫 마운트만 따로 처리해야 한다면 Next.js 가이드처럼 ref로 표시해 두면 된다.
- 숨겨져도 DOM은 살아 있다. `<video>`와 `<audio>`는 `display: none`으로 멈추지 않으므로 cleanup에서 직접 멈춰야 한다. React 문서는 이때 `useLayoutEffect`를 쓰는 이유를 "conceptually the clean-up code is tied to the component's UI being visually hidden"(개념적으로 이 정리 코드는 컴포넌트의 UI가 화면에서 가려지는 일과 묶여 있다)이라고 설명한다.[^activity-docs] 숨겨진 노드가 문서에 남으므로 E2E 테스트의 선택자가 숨겨진 사본까지 잡을 수도 있다.
- 남겨 두는 단위는 라우트가 아니라 세그먼트 레벨이고, 링크 이동도 숨겨 둔 트리를 되살린다. "뒤로 가기에서만 생기는 문제"라고 좁혀서 재현하면 놓치는 경우가 생긴다.
- StrictMode를 통과했다고 안심하기는 이르다. 리허설은 숨겨진 채로 시간이 흐르는 상황까지는 흉내 내지 않는다.
- 상태를 초기화하고 싶다면 `bfcacheId`는 마이그레이션 도구로 두고, 제출 핸들러에서 명시적으로 초기화하거나 URL에서 상태를 파생하는 쪽을 먼저 검토하는 편이 좋다.

이 목록은 결국 React 문서의 한 문장으로 모인다. "Most well-behaved React components that properly clean up their side effects will already be robust to being hidden by Activity."(부수 효과를 제대로 정리하는 잘 만든 React 컴포넌트는 대부분 이미 Activity에 숨겨지는 상황을 견딘다)[^activity-docs] 문제는 대부분 "properly"(제대로)의 기준이 언마운트를 전제로 세워져 있었다는 데 있다.

## cacheComponents는 언제 켜면 좋을까

이 블로그는 2026년 5월에 cacheComponents로 옮겼고([19e2f05c](https://github.com/yceffort/blog/commit/19e2f05c9f9dd9f589be9a7ee7368c3cd97da11f)), 이번 일 말고도 이 설정과 얽힌 문제를 몇 번 고쳤다. 그 경험과 공식 문서를 바탕으로 잘 맞는 경우와 신중해야 하는 경우를 나눠 보면 이렇다. 블로그 하나의 경험에 기댄 판단이라는 점은 감안할 필요가 있다.

### 잘 맞는 경우

- 한 페이지에 정적인 부분과 요청마다 달라지는 부분이 섞여 있는 경우. 동적인 값 하나 때문에 페이지 전체를 요청마다 그리지 않고, 정적 셸을 먼저 보낸 뒤 동적인 부분만 스트리밍한다.
- 무엇을 얼마나 캐시할지 코드에서 명시적으로 관리하고 싶은 경우. 캐시는 `use cache`, `cacheLife`, `cacheTag`로 필요한 곳에만 걸고, 컴포넌트 단위로도 걸 수 있다. 이 블로그의 글 페이지는 최근 1년 인기 글 50편만 `generateStaticParams`로 빌드 때 만들고, 나머지는 첫 요청 때 그린 본문 컴포넌트를 `use cache`와 `cacheLife('max')`로 저장한다. 글마다 `cacheTag`를 붙여 따로 무효화할 수 있게도 해 두었다. `use cache`의 동작은 [이전 글](/2026/05/use-cache-deep-dive)에서 자세히 다뤘다.
- 뒤로 가기에서 스크롤 위치, 폼 입력, 펼친 섹션이 그대로 남아야 하는 앱. 이 글의 주제였던 Activity 보존이 기본으로 따라온다.
- View Transitions와 결합한 페이지 전환이나 Gesture API 같은 기능을 쓸 계획이 있는 경우. Next.js 팀은 Activity를 이런 기능의 기반으로 설명한다.[^86577]

### 신중해야 하는 경우

- 엣지 런타임에 기대는 라우트가 있는 경우. Cache Components는 Node.js 런타임이 필요하고 `runtime = 'edge'`를 지원하지 않는다.[^migrate]
- 라우트 세그먼트 설정을 많이 쓰는 코드베이스. `dynamic`, `revalidate`, `fetchCache`를 export한 세그먼트는 에러가 나므로 `use cache`와 `cacheLife`로 옮겨야 한다. `dynamicParams`는 빌드 에러가 나고, `generateStaticParams`가 빈 배열을 돌려줘도 에러다.[^migrate]
- 렌더링 중에 `new Date()`, `Math.random()` 같은 동기 IO를 부르는 코드가 흩어져 있는 경우. 이 블로그의 RSS 피드가 여기에 걸렸다. 인자 없는 `new Date()` 하나 때문에 라우트가 요청 시점 렌더링으로 바뀌었고, 런타임에 글 파일을 읽으려다 500이 났다([262d97e2](https://github.com/yceffort/blog/commit/262d97e2e2b1cc90a76f5368db39d0e9df2734f3), 2026년 6월). 지금 문서는 이런 호출을 prerender 중에 부르면 빌드 에러가 난다고 적고 있다.
- 없는 경로를 404로 돌려줘야 하는 동적 라우트. `dynamicParams: false`로 막을 수 없고, 문서는 페이지에서 `notFound()`를 부르라고 안내한다. 이 블로그에서는 `[year]/[...slug]`가 아무 문자열이나 연도로 받아 PPR 셸을 200으로 내보내는 문제가 있었고, 결국 proxy에서 유효할 수 없는 경로를 먼저 걸러 404를 돌려주게 고쳤다([18eaae21](https://github.com/yceffort/blog/commit/18eaae21bfe5444ffc99782da15cc629871199be), 2026년 8월).
- 내비게이션을 언마운트로 가정한 클라이언트 코드나 서드파티 라이브러리가 많은 경우. 이 글의 R3F처럼 cleanup을 언마운트로 읽는 라이브러리, 열린 채 남는 드롭다운과 다이얼로그, 값이 남는 폼이 모두 여기에 해당한다. 이 동작만 앱 전체에서 끌 수는 없고, 부분적으로 `bfcacheId`를 key로 쓰는 방법만 있다.
- 무거운 페이지를 여럿 오가는 앱. 숨겨진 페이지는 세그먼트 레벨마다 최대 3개까지 DOM과 state를 그대로 들고 있다. 9.8.1로 올린 뒤의 이 블로그도 다른 페이지를 읽는 동안 소개 페이지의 캔버스와 WebGL 컨텍스트를 살려 둔다. 돌아왔을 때 같은 캔버스, 같은 컨텍스트였다는 것이 그 증거다.
- E2E 테스트가 많은 경우. 숨겨진 페이지의 DOM이 문서에 남아 있어 선택자가 숨겨진 사본까지 잡을 수 있다.[^guide] 이 글의 측정 스크립트도 보이는 캔버스만 고르도록 짰다.

정리하면 서버 쪽에서는 정적 셸과 명시적 캐시라는 분명한 이점이 있지만, 클라이언트 쪽에서는 "떠난 페이지는 언마운트된다"는 전제를 버려야 한다. 새로 시작하는 프로젝트라면 처음부터 그 전제로 코드를 쓰면 되므로 켜는 편이 낫다고 생각한다. 이미 커진 앱이라면 라우트 세그먼트 설정과 동기 IO, cleanup에 기대는 라이브러리부터 점검한 뒤 옮기는 편이 안전하다. 문서도 `instant = false`로 검증을 미뤄 둔 채 라우트를 하나씩 옮기는 점진적 도입을 안내한다.[^migrate]

## 마치며

처음에는 three.js 그래픽 하나가 나오지 않는 작은 버그처럼 보였다. 따라 내려가 보니 Next.js는 떠난 페이지를 세그먼트 레벨마다 최대 3개까지 숨겨 두고, React는 숨길 때 effect만 정리하고 state와 ref와 DOM은 남기며, R3F는 그 사이에서 cleanup을 언마운트로 읽고 있었다. 각자의 동작은 문서와 설계 의도에 맞았고, 어긋난 것은 "cleanup이 실행되면 컴포넌트는 곧 사라진다"는 오래된 가정 하나였다.

StrictMode는 이 가정을 개발 모드에서 꾸준히 흔들어 왔지만, 이 블로그의 그래픽은 그 리허설을 통과하고도 실제 숨김에서 깨졌다. cacheComponents는 리허설을 프로덕션의 일상으로 옮긴 셈이다. Next.js 팀이 View Transitions와 Gesture API 같은 다음 기능의 기반으로 "Activity-robust"(Activity를 견디는) 코드를 말하는 것을 보면, 이 방향이 되돌려질 가능성은 낮아 보인다. effect를 쓸 때 cleanup 다음에 setup이 다시 올 수 있다는 것을 기본값으로 두는 편이 안전할 것이다.

반성할 점도 하나 있다. 원인을 찾자마자 우회 코드부터 썼는데, 라이브러리의 이슈 트래커를 먼저 봤다면 두 번의 우회는 필요 없었다. 라이브러리 경계에서 나는 버그라면 고치기 전에 상위 저장소의 최근 이슈와 릴리스부터 확인하는 편이 빠르다는 것을 다시 배웠다.

## 참고

- [cacheComponents, Next.js 문서](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)
- [How Next.js preserves UI state with Activity, Next.js 문서](https://nextjs.org/docs/app/guides/preserving-ui-state)
- [Migrating to Cache Components, Next.js 문서](https://nextjs.org/docs/app/guides/migrating-to-cache-components)
- [useRouter의 bfcacheId, Next.js 문서](https://nextjs.org/docs/app/api-reference/functions/use-router#bfcacheid)
- [`<Activity>`, React 문서](https://react.dev/reference/react/Activity)
- [React 19.2, React 블로그](https://react.dev/blog/2025/10/01/react-19-2)
- [vercel/next.js#86577: Activity component route preservation causes significant breakage](https://github.com/vercel/next.js/issues/86577)
- [pmndrs/react-three-fiber#3939: `<Activity>` leaves a Canvas blank after it is shown again](https://github.com/pmndrs/react-three-fiber/issues/3939)

[^cc-docs]: [cacheComponents, Next.js 문서](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents). 설치된 16.3.5 패키지의 `dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md`와 대조했다.

[^pr]: [vercel/next.js#77951](https://github.com/vercel/next.js/pull/77951) "Add experimental.routerBFCache to NextConfig"(2025년 4월 9일 병합), [vercel/next.js#84923](https://github.com/vercel/next.js/pull/84923) "enable experimental.routerBfCache behind cacheComponents"(2025년 10월 21일 병합)

[^define-env]: [`packages/next/src/build/define-env.ts` L126, L181](https://github.com/vercel/next.js/blob/v16.3.5/packages/next/src/build/define-env.ts#L126)

[^layout-router]: [`packages/next/src/client/components/layout-router.tsx` L787-L960](https://github.com/vercel/next.js/blob/v16.3.5/packages/next/src/client/components/layout-router.tsx#L787-L960)

[^cache-key]: [`packages/next/src/client/components/router-reducer/create-router-cache-key.ts`](https://github.com/vercel/next.js/blob/v16.3.5/packages/next/src/client/components/router-reducer/create-router-cache-key.ts)

[^bfcache]: [`packages/next/src/client/components/bfcache-state-manager.ts`](https://github.com/vercel/next.js/blob/v16.3.5/packages/next/src/client/components/bfcache-state-manager.ts)

[^guide]: [How Next.js preserves UI state with Activity](https://nextjs.org/docs/app/guides/preserving-ui-state). 설치된 16.3.5 패키지의 `dist/docs/01-app/02-guides/preserving-ui-state.md`와 대조했다.

[^migrate]: [Migrating to Cache Components, Next.js 문서](https://nextjs.org/docs/app/guides/migrating-to-cache-components). 설치된 16.3.5 패키지의 `dist/docs/01-app/02-guides/migrating-to-cache-components.md`와 대조했다.

[^bfcacheid]: [vercel/next.js#93633](https://github.com/vercel/next.js/pull/93633) "bfcacheId: Opt out of state preservation"(2026년 5월 12일 병합)

[^86577]: [vercel/next.js#86577](https://github.com/vercel/next.js/issues/86577). 인용한 설명은 Sam Selikoff의 2026년 1월 댓글이다.

[^react-192]: [React 19.2](https://react.dev/blog/2025/10/01/react-19-2), 2025년 10월 1일

[^offscreen-mode]: [`packages/react-reconciler/src/ReactFiberOffscreenComponent.js` L17-L32](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberOffscreenComponent.js#L17-L32), [`ReactFiberBeginWork.js` L643-L647](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberBeginWork.js#L643-L647). `'unstable-defer-without-hiding'` 값도 타입에는 있지만 `enableLegacyHidden` 플래그가 꺼져 있어 쓰이지 않는다.

[^begin-work]: [`packages/react-reconciler/src/ReactFiberBeginWork.js` L898-L934](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberBeginWork.js#L898-L934)

[^disappear]: [`packages/react-reconciler/src/ReactFiberCommitWork.js` L3040-L3110](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberCommitWork.js#L3040-L3110). 숨길 때 이 함수를 부르는 곳은 같은 파일 L2523-L2634의 `OffscreenComponent` 처리다.

[^hide-instance]: [`packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js` L1405-L1444](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js#L1405-L1444)

[^passive-hide]: [`packages/react-reconciler/src/ReactFiberCommitWork.js` L5010-L5030](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberCommitWork.js#L5010-L5030)

[^disconnect]: [`packages/react-reconciler/src/ReactFiberCommitWork.js` L5133-L5151](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberCommitWork.js#L5133-L5151)

[^activity-docs]: [`<Activity>`, React 문서](https://react.dev/reference/react/Activity)

[^deletion]: [`packages/react-reconciler/src/ReactFiberCommitWork.js` L1690-L1712](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberCommitWork.js#L1690-L1712)

[^mount-flags]: 평소 커밋은 [`ReactFiberCommitWork.js` L3756-L3759](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberCommitWork.js#L3756-L3759), 다시 보일 때는 [L3238](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberCommitWork.js#L3238)과 [L4403-L4404](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberCommitWork.js#L4403-L4404), effect를 고르는 조건은 [`ReactFiberCommitEffects.js` L141-L153](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberCommitEffects.js#L141-L153)

[^strict]: [`packages/react-reconciler/src/ReactFiberWorkLoop.js` L5328-L5338](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberWorkLoop.js#L5328-L5338)

[^hidden-update]: [`packages/react-reconciler/src/ReactFiberConcurrentUpdates.js` L189-L249](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberConcurrentUpdates.js#L189-L249), [`ReactFiberLane.js` L1076-L1090](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberLane.js#L1076-L1090)

[^unmount-once]: [`packages/react-reconciler/src/ReactFiberCommitEffects.js` L249-L267](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberCommitEffects.js#L249-L267)

[^r3f-canvas-970]: [`packages/fiber/src/web/Canvas.tsx` L82-L142 (v9.7.0)](https://github.com/pmndrs/react-three-fiber/blob/v9.7.0/packages/fiber/src/web/Canvas.tsx#L82-L142)

[^r3f-renderer-970]: [`packages/fiber/src/core/renderer.tsx` L453-L480 (v9.7.0)](https://github.com/pmndrs/react-three-fiber/blob/v9.7.0/packages/fiber/src/core/renderer.tsx#L453-L480)

[^r3f-changelog]: [`packages/fiber/CHANGELOG.md` (v9.8.1)](https://github.com/pmndrs/react-three-fiber/blob/v9.8.1/packages/fiber/CHANGELOG.md). npm에 배포된 `@react-three/fiber@9.8.1` 패키지의 변경 기록과 대조했다.

[^r3f-3863]: [pmndrs/react-three-fiber#3863](https://github.com/pmndrs/react-three-fiber/issues/3863) "StrictMode: deferred unmount dispose force-loses the WebGL context of the remounted Canvas (dev)"

[^r3f-3939]: [pmndrs/react-three-fiber#3939](https://github.com/pmndrs/react-three-fiber/issues/3939) "v9: `<Activity>` leaves a Canvas blank after it is shown again"

[^r3f-canvas-981]: [`packages/fiber/src/web/Canvas.tsx` L94-L178 (v9.8.1)](https://github.com/pmndrs/react-three-fiber/blob/v9.8.1/packages/fiber/src/web/Canvas.tsx#L94-L178)

[^r3f-3943]: [pmndrs/react-three-fiber#3943](https://github.com/pmndrs/react-three-fiber/pull/3943) "fix(web): keep a Canvas root alive while `<Activity>` hides it"

[^insertion-docs]: [`useInsertionEffect`, React 문서](https://react.dev/reference/react/useInsertionEffect)
