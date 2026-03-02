---
title: 'React의 <ViewTransition>: 브라우저 네이티브 애니메이션을 React답게'
tags:
  - react
  - css
  - nextjs
published: true
date: 2026-03-02 10:45:38
description: 'View Transition API를 React가 감싸면 어떻게 되는가'
---

## Table of Contents

## 개요

웹에서 페이지 전환이나 UI 상태 변경 시 애니메이션을 넣으려면, 지금까지는 CSS `transition`/`animation`을 직접 작성하거나 Framer Motion 같은 라이브러리에 의존해야 했다. 특히 "이전 상태가 사라지고 새 상태가 나타나는" 전환은 두 상태를 동시에 DOM에 유지하면서 애니메이션을 조율해야 하기 때문에 까다롭다.

[View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)는 이 문제를 브라우저 레벨에서 해결한다. 개발자가 두 상태를 동시에 관리할 필요 없이, 브라우저가 알아서 전환 전후의 스냅샷을 찍고 애니메이션을 만들어준다.

## View Transition API란

동작 원리는 다음과 같다.

```js
document.startViewTransition(() => {
  // 이 콜백 안에서 DOM을 변경한다
  container.innerHTML = newContent
})
```

`startViewTransition`을 호출하면 브라우저는 3단계를 거친다.

1. **캡처**: 현재 화면을 비트맵 스냅샷으로 캡처한다 (`::view-transition-old`)
2. **변경**: 콜백을 실행하여 DOM을 업데이트한다
3. **전환**: 새로운 DOM 상태를 캡처하고 (`::view-transition-new`), old → new 사이에 cross-fade 애니메이션을 적용한다

기본적으로는 전체 페이지가 cross-fade되지만, `view-transition-name` CSS 속성으로 개별 요소를 지정하면 해당 요소만 별도로 애니메이션된다. 같은 `view-transition-name`을 가진 요소가 전환 전후에 존재하면, 브라우저가 위치·크기·형태를 자동으로 보간하는 shared element 애니메이션이 만들어진다.

```css
.thumbnail {
  view-transition-name: hero-image;
}
```

이것만으로 목록 페이지의 작은 썸네일이 상세 페이지의 큰 이미지로 자연스럽게 확대·이동하는 애니메이션을 만들 수 있다. CSS를 한 줄도 더 쓸 필요가 없다.

문제는 이 API가 **콜백 안에서 DOM이 동기적으로 변경되는 것**을 전제한다는 점이다. React에서는 그게 보장되지 않는다.

React 팀은 이 문제를 `<ViewTransition>`이라는 컴포넌트로 풀었다. 2026년 3월 현재 `react@canary` 채널에서 사용할 수 있으며, stable 릴리스에는 아직 포함되지 않았다. 다만 [React Labs 블로그 포스트(2025.04)](https://react.dev/blog/2025/04/23/react-labs-view-transitions-activity-and-more)에서 프로덕션에서 테스트를 거쳤고 API 설계가 거의 확정 단계라고 밝혔으므로, 미리미리 알아보자.

## 왜 React에 전용 컴포넌트가 필요한가

React 없이 View Transition API를 쓰면 `startViewTransition` 콜백 안에서 DOM을 직접 바꾸면 끝이다. 이때 DOM 변경은 **동기적**이어야 한다. 브라우저는 `startViewTransition`을 호출하면 (1) 현재 화면을 스냅샷으로 캡처하고 (2) 콜백을 실행한 뒤 (3) 콜백이 리턴되는 시점에 새 DOM 상태를 캡처한다. 콜백이 리턴되었는데 DOM이 아직 안 바뀌었으면, old 스냅샷과 new 스냅샷이 동일해서 전환 애니메이션이 성립하지 않는다.

React에서는 `setState`가 비동기적으로 배칭되므로, `flushSync`로 동기 렌더링을 강제해야 한다.

```tsx
function handleClick() {
  document.startViewTransition(() => {
    flushSync(() => {
      setState(newState)
    })
  })
}
```

이 방식은 실제로 쓰다 보면 구체적인 문제에 부딪힌다.

**Suspense와 함께 쓰면 fallback이 다시 나타난다.** `flushSync`는 pending 상태의 Suspense boundary를 강제로 fallback 상태로 되돌릴 수 있다. 이미 데이터를 받아서 콘텐츠를 보여주고 있는데, `flushSync` 호출 하나로 스켈레톤이 다시 번쩍 나타나는 상황이 발생한다. React 공식 문서에서도 [`flushSync`는 Suspense fallback을 다시 보여줄 수 있다](https://react.dev/reference/react-dom/flushSync)고 명시적으로 경고하고 있다.

**다른 `flushSync`와 충돌하면 View Transition이 통째로 스킵된다.** React의 Transition은 동기적으로 완료되어야 하는데, 중간에 다른 `flushSync`가 끼어들면 React가 Transition 시퀀스를 포기한다. 사용자 인터랙션이 겹치는 실제 앱에서는 이 상황이 충분히 발생할 수 있고, 애니메이션이 간헐적으로 작동하지 않는 디버깅하기 어려운 버그로 이어진다.

**Concurrent 기능과 원천적으로 양립할 수 없다.** `startTransition`으로 감싼 상태 업데이트는 의도적으로 지연될 수 있고, Suspense 안의 컴포넌트는 데이터를 기다리며 렌더링을 보류할 수 있다. View Transition API가 요구하는 "콜백 안에서 DOM 즉시 변경"이라는 전제와 근본적으로 맞지 않는다.

`<ViewTransition>` 컴포넌트는 이 문제를 React 내부에서 해결한다. React가 렌더링 사이클을 제어하고 있으므로, DOM 업데이트가 완료되는 정확한 타이밍에 `startViewTransition`을 호출하고, Suspense 경계와 Concurrent 렌더링을 자동으로 조율한다.

|                      | Vanilla JS      | React + flushSync    | `<ViewTransition>` |
| -------------------- | --------------- | -------------------- | ------------------ |
| DOM 타이밍           | 직접 제어       | 예측 어려움          | React가 조율       |
| Suspense 연동        | 불가            | fallback 재출현 위험 | 자동 지원          |
| view-transition-name | CSS에 수동 지정 | CSS에 수동 지정      | 자동 적용          |
| Concurrent 렌더링    | 해당 없음       | 양립 불가            | 자동 지원          |

## 다른 프레임워크와의 비교

다른 프레임워크와 비교하면 React의 접근 방식이 유독 무겁다는 걸 알 수 있다. 이유는 렌더링 모델의 차이에 있다.

**SvelteKit**은 [Svelte 5의 시그널 기반 fine-grained reactivity](https://frontendmasters.com/blog/fine-grained-reactivity-in-svelte-5/) 위에서 동작한다. `$state`로 선언한 값이 변경되면 해당 값에 의존하는 DOM 노드만 직접 업데이트된다. 가상 DOM 디핑이 없고, 변경이 발생한 시점에 DOM이 즉시 반영된다. 그래서 View Transition 통합이 놀라울 정도로 단순하다. [`onNavigate`](https://svelte.dev/blog/view-transitions)라는 라이프사이클 훅을 제공하는 게 전부다.

```js
// +layout.svelte
import {onNavigate} from '$app/navigation'

onNavigate((navigation) => {
  if (!document.startViewTransition) return

  return new Promise((resolve) => {
    document.startViewTransition(async () => {
      resolve()
      await navigation.complete
    })
  })
})
```

SvelteKit은 공식적으로 ["View Transition의 동작 방식을 크게 추상화하지 않는다 — 브라우저 내장 API를 직접 사용하는 것"](https://svelte.dev/blog/view-transitions)이라고 밝히고 있다. 프레임워크가 DOM 타이밍을 제어할 필요가 없으니 가능한 일이다.

**Angular**는 라우터에 [`withViewTransitions()`](https://angular.dev/api/router/withViewTransitions)를 추가하면 된다. Change Detection 사이클에서 DOM을 동기적으로 업데이트하므로, `startViewTransition` 콜백 안에서의 타이밍 문제가 발생하지 않는다.

```ts
export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes, withViewTransitions())],
}
```

**Nuxt (Vue)**는 설정 한 줄(`experimental.viewTransition: true`)로 끝난다. Vue의 반응성 시스템은 마이크로태스크 큐에서 배치 업데이트하지만, `nextTick`으로 DOM 변경 완료 시점을 예측할 수 있다.

React는 가상 DOM 디핑, Concurrent Rendering, Suspense, 자동 배칭이 결합되어 "DOM이 언제 바뀌는지"를 프레임워크만 알고 개발자에게 노출하지 않는다. View Transition API는 정확히 그 타이밍에 개입해야 하므로, 전용 컴포넌트가 필요했다.

|                | 추상화 수준         | DOM 업데이트                    | View Transition 통합                         |
| -------------- | ------------------- | ------------------------------- | -------------------------------------------- |
| **SvelteKit**  | 최소 (훅 하나)      | 시그널 기반 직접 업데이트       | `onNavigate`에서 네이티브 API 직접 사용      |
| **Angular**    | 라우터 설정 한 줄   | 동기적 (Change Detection)       | `withViewTransitions()`가 라우터에 자동 연결 |
| **Nuxt (Vue)** | 설정 한 줄          | 마이크로태스크 배칭 (예측 가능) | `experimental.viewTransition: true`          |
| **React**      | 전용 컴포넌트 + API | 비동기 (가상 DOM, Concurrent)   | `<ViewTransition>` + `addTransitionType`     |

React의 접근 방식이 가장 무겁지만, 그 덕에 다른 프레임워크에서는 불가능한 것도 있다. Suspense 경계를 넘나드는 애니메이션, `useDeferredValue`와의 자동 연동, 선언적 shared element 매칭은 React가 렌더링 전체를 제어하기 때문에 가능한 것이다.

## 핵심 구조: What, When, How

### What — 무엇을 애니메이션할 것인가

`<ViewTransition>`으로 감싸면 된다.

```tsx
<ViewTransition>
  <div>이 요소가 애니메이션 대상이 된다</div>
</ViewTransition>
```

### When — 언제 애니메이션이 발동하는가

세 가지 트리거가 있다.

- `startTransition(() => setState(...))`
- `useDeferredValue(value)`
- `<Suspense>` fallback이 실제 콘텐츠로 전환될 때

일반적인 `setState()`로는 발동하지 않는다. 이건 의도적인 설계다. 모든 상태 변경마다 애니메이션이 걸리면 오히려 UX가 나빠진다.

```tsx
// ❌ 애니메이션 발동 안 됨
const handleClick = () => {
  setShowDetail(true)
}

// ✅ 애니메이션 발동
const handleClick = () => {
  startTransition(() => {
    setShowDetail(true)
  })
}
```

### How — 어떻게 애니메이션할 것인가

CSS의 View Transition pseudo-selector로 정의한다. 별도 CSS를 지정하지 않으면 기본 cross-fade가 적용된다.

```css
::view-transition-old(.slow-fade) {
  animation-duration: 500ms;
}

::view-transition-new(.slow-fade) {
  animation-duration: 500ms;
}
```

CSS만으로 부족할 때는 콜백을 사용할 수 있다. `onEnter`, `onExit`, `onUpdate`, `onShare` 네 가지 콜백이 있으며, 각각 애니메이션된 DOM 요소와 transition 타입 배열을 인자로 받는다.

```tsx
<ViewTransition
  onEnter={(element, types) => {
    element.animate(
      [
        {transform: 'scale(0.8)', opacity: 0},
        {transform: 'scale(1)', opacity: 1},
      ],
      {duration: 300, easing: 'ease-out'},
    )
  }}
>
  <Component />
</ViewTransition>
```

Web Animations API와 조합하면 CSS로 표현하기 어려운 동적인 애니메이션도 가능하다.

## View Transition의 Pseudo-Element 구조

View Transition이 발동하면 브라우저는 다음과 같은 pseudo-element 트리를 생성한다. 이 구조를 이해해야 CSS 커스터마이징이 가능하다.

```
::view-transition
└── ::view-transition-group(name)
    └── ::view-transition-image-pair(name)
        ├── ::view-transition-old(name)    ← 전환 전 스냅샷 (이미지)
        └── ::view-transition-new(name)    ← 전환 후 라이브 표현
```

- `::view-transition-old`: 전환 **전** 상태의 정적 스냅샷이다. 기본적으로 `opacity: 1 → 0` 애니메이션이 적용된다.
- `::view-transition-new`: 전환 **후** 상태의 라이브 표현이다. 기본적으로 `opacity: 0 → 1` 애니메이션이 적용된다.
- `::view-transition-group`: old와 new를 감싸는 컨테이너로, 위치와 크기의 전환을 담당한다.

React에서는 `<ViewTransition>`의 prop으로 전달한 CSS 클래스가 이 pseudo-element들의 selector로 사용된다.

```tsx
<ViewTransition enter="slide-in">
  <Component />
</ViewTransition>
```

이렇게 하면 enter 시 `::view-transition-old(.slide-in)`, `::view-transition-new(.slide-in)` 등의 selector가 활성화된다.

## 네 가지 활성화 유형

`<ViewTransition>`은 상황에 따라 네 가지 유형으로 활성화된다. React가 DOM 변경의 성격을 판단해서 어떤 유형으로 활성화할지 자동으로 결정한다.

| 유형     | 설명                                                         | 예시                           |
| -------- | ------------------------------------------------------------ | ------------------------------ |
| `enter`  | 컴포넌트가 Transition 도중 마운트될 때                       | 조건부 렌더링으로 새 요소 등장 |
| `exit`   | 컴포넌트가 Transition 도중 언마운트될 때                     | 요소 제거, 페이지 전환         |
| `update` | 내부 DOM이 변경되거나 레이아웃이 이동할 때                   | props 변경, 리스트 재정렬      |
| `share`  | 같은 `name`의 요소가 한쪽에서 사라지고 다른 쪽에서 나타날 때 | 페이지 간 동일 요소 전환       |

각 유형에 대해 개별 CSS 클래스를 지정할 수 있다.

```tsx
<ViewTransition enter="slide-in" exit="slide-out" update="cross-fade">
  <Component />
</ViewTransition>
```

`default` prop을 사용하면 별도 지정하지 않은 유형에 대한 기본값을 설정할 수 있다. 문자열 또는 객체 두 가지 형태를 받는다.

```tsx
// 문자열: 모든 유형에 같은 클래스 적용
<ViewTransition default="fade" enter="slide-up">
  <Component />
</ViewTransition>
```

이 경우 enter는 `slide-up`, 나머지(exit, update, share)는 `fade`가 적용된다.

```tsx
// 객체: transition type에 따라 다른 클래스 매핑
<ViewTransition
  default={{
    'nav-forward': 'slide-left',
    'nav-back': 'slide-right',
    default: 'fade',
  }}
>
  <Component />
</ViewTransition>
```

객체 형태에서 키는 `addTransitionType`으로 지정한 타입 문자열이고, 값은 CSS 클래스명이다. `default` 키는 매칭되는 타입이 없을 때의 폴백이다. 이 패턴은 뒤에서 다루는 방향별 슬라이드 예제에서 자세히 살펴본다.

## 실전 예제 1: Enter/Exit 애니메이션

가장 기본적인 사용법이다. 요소가 나타나고 사라지거나, 페이지가 전환될 때 애니메이션을 적용한다.

토글로 패널을 열고 닫는 경우:

```tsx
import {useState, startTransition, ViewTransition} from 'react'

function TogglePanel() {
  const [show, setShow] = useState(false)

  return (
    <div>
      <button onClick={() => startTransition(() => setShow(!show))}>
        {show ? '닫기' : '열기'}
      </button>
      {show && (
        <ViewTransition enter="slide-up" exit="slide-down">
          <div className="panel">
            <h3>패널 내용</h3>
            <p>이 패널은 애니메이션과 함께 나타나고 사라진다.</p>
          </div>
        </ViewTransition>
      )}
    </div>
  )
}
```

```css
::view-transition-new(.slide-up) {
  animation:
    300ms ease-out slide-in-up,
    300ms ease-out fade-in;
}

::view-transition-old(.slide-down) {
  animation:
    200ms ease-in slide-out-down,
    200ms ease-in fade-out;
}

@keyframes slide-in-up {
  from {
    transform: translateY(20px);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes slide-out-down {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(20px);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@keyframes fade-out {
  to {
    opacity: 0;
  }
}
```

"열기"를 누르면 패널이 아래에서 위로 올라오면서 fade-in되고, "닫기"를 누르면 아래로 내려가면서 fade-out된다. `startTransition` 없이 `setShow(!show)`만 호출하면 애니메이션 없이 즉시 나타나고 사라진다.

> [네이티브 View Transition API로 재현한 데모](/demos/view-transition/1-enter-exit.html)에서 실제 동작을 확인할 수 있다. (Chrome/Edge에서 열 것)

페이지 전환도 같은 패턴이다. 라우터가 내부적으로 `startTransition`을 사용하고 있다면, `<ViewTransition>` 하나로 충분하다.

```tsx
function App() {
  const {url} = useRouter()

  return <ViewTransition>{url === '/' ? <Home /> : <Details />}</ViewTransition>
}
```

이것만으로 페이지 전환 시 이전 페이지가 서서히 사라지고 새 페이지가 서서히 나타나는 cross-fade가 적용된다.

## 실전 예제 2: Shared Element Transition

두 페이지에 걸쳐 동일한 요소가 자연스럽게 이동하는 애니메이션을 만들 수 있다. iOS의 Hero Animation, Android의 Shared Element Transition과 유사한 효과다.

핵심 원리는 간단하다. 같은 `name` prop을 가진 `<ViewTransition>`이 한쪽에서 언마운트되고 다른 쪽에서 마운트되면, React가 이를 같은 요소의 전환으로 인식한다.

목록 페이지:

```tsx
function VideoList({videos}) {
  return (
    <div className="grid">
      {videos.map((video) => (
        <Link key={video.id} href={`/video/${video.id}`}>
          <ViewTransition name={`video-${video.id}`}>
            <img src={video.thumbnail} alt={video.title} />
          </ViewTransition>
          <ViewTransition name={`title-${video.id}`}>
            <h3>{video.title}</h3>
          </ViewTransition>
        </Link>
      ))}
    </div>
  )
}
```

상세 페이지:

```tsx
function VideoDetail({video}) {
  return (
    <div>
      <ViewTransition name={`video-${video.id}`}>
        <video src={video.url} controls />
      </ViewTransition>
      <ViewTransition name={`title-${video.id}`}>
        <h1>{video.title}</h1>
      </ViewTransition>
      <p>{video.description}</p>
    </div>
  )
}
```

목록에서 상세로 이동하면, 그리드 안의 작은 썸네일이 상세 페이지의 큰 영상 플레이어 위치로 확대되면서 이동하고, 작은 `h3` 제목이 큰 `h1` 위치로 자연스럽게 전환된다. CSS를 한 줄도 쓰지 않아도 위치, 크기, 형태의 보간이 자동으로 처리된다. 뒤로 가기를 누르면 반대 방향으로 같은 애니메이션이 재생된다.

> [데모](/demos/view-transition/2-shared-element.html)에서 카드를 클릭하면 이미지와 제목이 상세 뷰로 확대·이동하는 것을 확인할 수 있다.

실제 앱에서는 이 shared element를 방향별 슬라이드와 조합하는 경우가 많다. Layout에서 `<ViewTransition>`으로 콘텐츠 영역을 감싸면, 이미지는 shared element로 이동하고 나머지 콘텐츠는 슬라이드로 전환된다. 두 애니메이션이 동시에 진행되어 네이티브 앱 같은 경험이 만들어진다.

```tsx
function Layout({children}) {
  return (
    <div>
      <Header />
      <ViewTransition
        default={{
          'nav-forward': 'slide-left',
          'nav-back': 'slide-right',
          default: 'fade',
        }}
      >
        <main>{children}</main>
      </ViewTransition>
    </div>
  )
}
```

**주의할 점:**

- 같은 `name`을 가진 `<ViewTransition>`은 **동시에 하나만** 마운트되어야 한다. 같은 이름이 두 개 이상 마운트되면 에러가 발생한다.
- 양쪽 요소가 모두 viewport 안에 있어야 shared transition이 형성된다.

## 실전 예제 3: 네비게이션 방향에 따른 슬라이드 애니메이션

뒤로 가기와 앞으로 가기에서 다른 방향으로 슬라이드하는 패턴이다. `addTransitionType` API를 사용한다.

```tsx
import {startTransition, addTransitionType, ViewTransition} from 'react'

function useNavigate() {
  const router = useRouter()

  return {
    forward(url: string) {
      startTransition(() => {
        addTransitionType('nav-forward')
        router.push(url)
      })
    },
    back() {
      startTransition(() => {
        addTransitionType('nav-back')
        router.back()
      })
    },
  }
}
```

`<ViewTransition>`에서 타입별로 다른 클래스를 매핑한다.

```tsx
function App() {
  const {url} = useRouter()

  return (
    <ViewTransition
      default={{
        'nav-forward': 'slide-left',
        'nav-back': 'slide-right',
        default: 'fade',
      }}
    >
      <Page url={url} />
    </ViewTransition>
  )
}
```

CSS 애니메이션을 정의한다.

```css
/* 앞으로 갈 때: 현재 페이지는 왼쪽으로 사라지고, 새 페이지는 오른쪽에서 들어온다 */
::view-transition-old(.slide-left) {
  animation:
    150ms cubic-bezier(0.4, 0, 1, 1) both fade-out,
    400ms cubic-bezier(0.4, 0, 0.2, 1) both slide-to-left;
}

::view-transition-new(.slide-left) {
  animation:
    210ms cubic-bezier(0, 0, 0.2, 1) 150ms both fade-in,
    400ms cubic-bezier(0.4, 0, 0.2, 1) both slide-from-right;
}

/* 뒤로 갈 때: 현재 페이지는 오른쪽으로 사라지고, 이전 페이지가 왼쪽에서 들어온다 */
::view-transition-old(.slide-right) {
  animation:
    150ms cubic-bezier(0.4, 0, 1, 1) both fade-out,
    400ms cubic-bezier(0.4, 0, 0.2, 1) both slide-to-right;
}

::view-transition-new(.slide-right) {
  animation:
    210ms cubic-bezier(0, 0, 0.2, 1) 150ms both fade-in,
    400ms cubic-bezier(0.4, 0, 0.2, 1) both slide-from-left;
}

@keyframes slide-to-left {
  to {
    transform: translateX(-50px);
  }
}

@keyframes slide-from-right {
  from {
    transform: translateX(50px);
  }
}

@keyframes slide-to-right {
  to {
    transform: translateX(50px);
  }
}

@keyframes slide-from-left {
  from {
    transform: translateX(-50px);
  }
}
```

결과적으로 "앞으로 가기"를 누르면 현재 페이지가 왼쪽으로 밀려나면서 새 페이지가 오른쪽에서 슬라이드 인되고, "뒤로 가기"를 누르면 반대 방향으로 전환된다. 네이티브 앱의 네비게이션 스택과 동일한 시각적 경험이다.

> [데모](/demos/view-transition/3-nav-slide.html)에서 상단 탭을 좌우로 이동하며 방향별 슬라이드를 확인할 수 있다.

`addTransitionType`은 하나의 `startTransition` 콜백 안에서 여러 번 호출할 수도 있다. 타입은 단순한 문자열이고, `<ViewTransition>`의 prop 객체에서 키로 매칭된다.

## 실전 예제 4: 리스트 애니메이션

`useDeferredValue`를 사용하면 검색/필터링 시 리스트 아이템이 자연스럽게 나타나고 사라진다.

```tsx
import {useState, useDeferredValue, ViewTransition} from 'react'

function FilterableList({items}) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(deferredQuery.toLowerCase()),
  )

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="검색..."
      />
      <ul>
        {filtered.map((item) => (
          <ViewTransition key={item.id}>
            <li>{item.name}</li>
          </ViewTransition>
        ))}
      </ul>
    </div>
  )
}
```

`useDeferredValue`가 자동으로 Transition을 생성하기 때문에 `startTransition`을 명시적으로 호출할 필요가 없다. 검색어를 입력하면, 필터에서 제외된 아이템이 cross-fade로 사라지고 남은 아이템이 자연스럽게 위치를 재배치한다. 검색어를 지우면 숨겨졌던 아이템이 다시 fade-in된다.

정렬도 같은 패턴이다. `startTransition`으로 정렬 기준을 바꾸면, 각 아이템이 새 위치로 이동하는 애니메이션이 자동으로 적용된다.

```tsx
<button onClick={() => startTransition(() => setSortBy('date'))}>최신순</button>
```

> [데모](/demos/view-transition/4-list-filter.html)에서 검색과 정렬 버튼을 눌러보면 아이템이 재배치되는 애니메이션을 확인할 수 있다.

**주의:** `<ViewTransition>`의 **직접적인 자식**이 DOM 요소여야 한다. 중간에 다른 컴포넌트 래퍼가 끼어 있으면 애니메이션이 동작하지 않을 수 있다.

## 실전 예제 5: Suspense 연동

`<Suspense>` fallback에서 실제 콘텐츠로 전환될 때도 애니메이션이 적용된다. 두 가지 배치 방법이 있는데, 결과가 다르다.

### 방법 1: 바깥에서 감싸기 (update로 동작)

```tsx
<ViewTransition>
  <Suspense fallback={<Skeleton />}>
    <Content />
  </Suspense>
</ViewTransition>
```

Skeleton에서 Content로의 전환이 하나의 update로 처리된다. 시각적으로는 스켈레톤이 서서히 투명해지면서 실제 콘텐츠가 같은 위치에서 나타나는 cross-fade 효과다.

### 방법 2: 각각 감싸기 (enter/exit로 동작)

```tsx
<Suspense
  fallback={
    <ViewTransition exit="slide-down">
      <Skeleton />
    </ViewTransition>
  }
>
  <ViewTransition enter="slide-up">
    <Content />
  </ViewTransition>
</Suspense>
```

```css
::view-transition-old(.slide-down) {
  animation:
    150ms ease-out fade-out,
    150ms ease-out slide-out-down;
}

::view-transition-new(.slide-up) {
  animation:
    210ms ease-in 150ms fade-in,
    400ms ease-in slide-in-up;
}

@keyframes slide-out-down {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(10px);
  }
}

@keyframes slide-in-up {
  from {
    transform: translateY(10px);
  }
  to {
    transform: translateY(0);
  }
}
```

이 경우 스켈레톤이 아래로 약간 밀려나면서 사라지고, 약간의 딜레이 후 실제 콘텐츠가 아래에서 올라오면서 나타난다. enter/exit를 각각 제어할 수 있어서 더 세밀한 연출이 가능하다.

> [데모](/demos/view-transition/5-suspense-loading.html)에서 두 방법의 차이를 나란히 비교할 수 있다. "데이터 로드" 버튼을 동시에 눌러보면 차이가 뚜렷하다.

두 방법 모두 React가 데이터, CSS, 폰트 로딩이 완료될 때까지 기다린 후 애니메이션을 시작한다.

## Next.js에서 사용하기

Next.js에서는 `viewTransition` 실험적 플래그를 켜면 된다.

```ts
// next.config.ts
import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
}

export default nextConfig
```

이 플래그를 켜면 `react`에서 `ViewTransition`을 `unstable_` prefix 없이 import할 수 있다. Next.js 네비게이션에 자동으로 transition type을 추가하는 기능(예: forward/back 방향을 자동으로 `addTransitionType`에 연결)은 [2026년 2월 기준으로 아직 구현되지 않았다](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition). 현재는 위의 예제처럼 직접 `addTransitionType`을 호출해야 한다.

Next.js의 `Link` 컴포넌트는 내부적으로 `startTransition`을 사용하므로, `<ViewTransition>`으로 감싸기만 하면 페이지 전환 애니메이션이 바로 동작한다.

```tsx
// app/layout.tsx
import {ViewTransition} from 'react'

export default function RootLayout({children}) {
  return (
    <html>
      <body>
        <Nav />
        <ViewTransition>{children}</ViewTransition>
      </body>
    </html>
  )
}
```

> [Next.js View Transition Demo](https://view-transition-example.vercel.app)에서 실제 동작하는 예제를 확인할 수 있다.

## 주의사항

### `<ViewTransition>`이 모든 애니메이션의 해결책은 아니다

React 팀이 명확히 밝힌 부분이다. React의 `<ViewTransition>`은 **React 상태 변경에 의한 UI 전환**에 특화되어 있다. 브라우저의 View Transition API 자체는 더 넓은 범위에서 쓸 수 있지만(아래에서 다룬다), React 컴포넌트로서의 `<ViewTransition>`은 다음과 같은 경계가 있다.

- ✅ 페이지 네비게이션, 모달 열기/닫기, 리스트 재정렬, 아코디언 확장
- ❌ 좋아요 버튼 하트 애니메이션, 로딩 시머, 타이핑 효과, 인터랙티브 드래그

후자는 기존처럼 CSS `animation`/`transition`이나 Framer Motion 같은 라이브러리를 사용하는 것이 맞다.

### 상태 변경 없이도 View Transition을 쓸 수 있다

React의 `<ViewTransition>`은 **React의 상태 변경**(`startTransition`, `useDeferredValue`, `Suspense`)에 의해서만 발동된다. React가 렌더링 전후의 DOM 스냅샷을 비교해야 하기 때문이다. 그래서 "상태 변경 없이 그냥 애니메이션만 넣고 싶다"는 경우에는 `<ViewTransition>`이 적합하지 않다.

하지만 **브라우저 네이티브 `document.startViewTransition()`은 아무 제약 없이 쓸 수 있다.** React 상태와 무관하게 DOM 클래스를 바꾸거나, 인라인 스타일을 토글하거나, 외부 라이브러리가 DOM을 조작하는 등 어떤 변경이든 감쌀 수 있다.

대표적인 예가 **테마 토글**이다. 다크/라이트 모드 전환은 보통 `<html>` 요소의 클래스를 바꾸는 것인데, React 상태 변경이 아닌 직접적인 DOM 조작이므로 `<ViewTransition>`으로는 애니메이션할 수 없다. 이 경우 네이티브 API를 직접 사용한다.

```tsx
function toggleTheme(e: React.MouseEvent) {
  const x = e.clientX
  const y = e.clientY

  document.startViewTransition(() => {
    // React state가 아닌 직접적인 DOM 조작
    document.documentElement.classList.toggle('dark')
  })

  // circle-clip 애니메이션을 위한 CSS 변수 설정
  document.documentElement.style.setProperty('--theme-toggle-x', `${x}px`)
  document.documentElement.style.setProperty('--theme-toggle-y', `${y}px`)
}
```

```css
/* 테마 토글 시 클릭 위치에서 원형으로 퍼지는 애니메이션 */
.theme-transition-circle::view-transition-new(root) {
  animation: circle-clip 0.5s ease-in-out;
}

@keyframes circle-clip {
  from {
    clip-path: circle(0% at var(--theme-toggle-x) var(--theme-toggle-y));
  }
  to {
    clip-path: circle(150% at var(--theme-toggle-x) var(--theme-toggle-y));
  }
}
```

정리하면:

| 상황                                                  | 사용할 API                       |
| ----------------------------------------------------- | -------------------------------- |
| React 상태 변경에 의한 UI 전환                        | `<ViewTransition>`               |
| React 외부의 DOM 조작 (테마 토글, 외부 라이브러리 등) | `document.startViewTransition()` |
| Suspense fallback → 실제 콘텐츠 전환                  | `<ViewTransition>`               |
| 스크롤 기반 애니메이션, 마우스 추적 등                | CSS `animation`/`transition`     |

두 API는 배타적이지 않다. 같은 앱에서 페이지 전환은 `<ViewTransition>`으로, 테마 토글은 `document.startViewTransition()`으로 처리하는 것이 자연스럽다. 실제로 이 블로그가 그렇게 구현되어 있다.

### prefers-reduced-motion은 직접 처리해야 한다

브라우저의 접근성 설정을 자동으로 반영하지 않는다.

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

### DOM 노드를 직접 감싸야 한다

`<ViewTransition>`은 내부의 첫 번째 DOM 노드를 대상으로 한다. 텍스트만 감싸거나, DOM 노드 없이 사용하면 동작하지 않는다.

```tsx
// ❌ 동작 안 함
<ViewTransition>
  그냥 텍스트
</ViewTransition>

// ✅ 동작
<ViewTransition>
  <span>텍스트를 감싸야 한다</span>
</ViewTransition>
```

### 같은 name은 동시에 하나만

```tsx
// ❌ 에러 발생
<ViewTransition name="hero"><img src="a.jpg" /></ViewTransition>
<ViewTransition name="hero"><img src="b.jpg" /></ViewTransition>

// ✅ 고유한 이름 사용
<ViewTransition name={`hero-${id}`}><img src="a.jpg" /></ViewTransition>
```

### 부분적으로 애니메이션을 제외하려면 `"none"`

부모에 `<ViewTransition>`을 걸었지만, 렌더링 비용이 큰 자식은 제외하고 싶을 때 사용한다.

```tsx
<ViewTransition>
  <div className="dashboard">
    <Header />
    <ViewTransition update="none">
      <HeavyChart data={chartData} />
    </ViewTransition>
    <Sidebar />
  </div>
</ViewTransition>
```

## 브라우저 지원

| 브라우저 | Same-document | Cross-document |
| -------- | :-----------: | :------------: |
| Chrome   |      ✅       |   ✅ (126+)    |
| Edge     |      ✅       |   ✅ (126+)    |
| Safari   |   ✅ (18+)    |       ❌       |
| Firefox  |      ❌       |       ❌       |

Firefox 지원이 없는 건 아쉽지만, View Transition API를 지원하지 않는 브라우저에서는 애니메이션 없이 즉시 전환되므로 기능 자체가 깨지지 않는다. Progressive enhancement로 접근하면 된다.

## 마치며

View Transition API를 React에서 쓰려면 왜 별도 컴포넌트가 필요한지, 그리고 그 컴포넌트를 어떻게 쓰는지를 살펴봤다. SvelteKit이나 Angular가 설정 한 줄로 끝내는 것에 비하면 분명 무거운 접근이지만, 그 무거움이 Suspense 연동이나 `useDeferredValue` 자동 연결 같은 React 고유의 이점으로 이어진다는 점에서 납득이 된다.

2026년 3월 현재 canary 채널에서만 사용 가능하고 stable 릴리스 일정은 공개되지 않았다. 브라우저 지원도 Firefox가 빠져 있다. 당장 프로덕션에 도입하기보다는, CSS View Transition pseudo-selector 작성법과 `addTransitionType` 패턴에 익숙해져두면 정식 릴리스 때 빠르게 적용할 수 있을 것이다.

## 참고

- [React 공식 문서: \<ViewTransition\>](https://ko.react.dev/reference/react/ViewTransition)
- [React 공식 문서: addTransitionType](https://react.dev/reference/react/addTransitionType)
- [React Labs: View Transitions, Activity, and more](https://react.dev/blog/2025/04/23/react-labs-view-transitions-activity-and-more)
- [MDN: View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- [Next.js: viewTransition 설정](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition)
- [React View Transitions and Activity API tutorial (LogRocket)](https://blog.logrocket.com/react-view-transitions-activity-api/)
- [React's ViewTransition Element (Frontend Masters)](https://frontendmasters.com/blog/reacts-viewtransition-element/)
- [Fine-Grained Reactivity in Svelte 5 (Frontend Masters)](https://frontendmasters.com/blog/fine-grained-reactivity-in-svelte-5/)
- [Unlocking view transitions in SvelteKit](https://svelte.dev/blog/view-transitions)
- [Next.js View Transition Demo](https://view-transition-example.vercel.app)
