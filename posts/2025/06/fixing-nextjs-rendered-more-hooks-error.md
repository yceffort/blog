---
title: 'Nextjs app router의 Rendered more hooks than during the previous render 버그 패치 후기'
tags:
  - nextjs
  - react
published: true
date: 2025-06-23 23:52:14
description: '어렵다 어려워'
---

## 3줄 요약

- Next.js 개발 시에 서버 컴포넌트에서 발생한 에러가 제대로 처리되지 않고 Application 에러가 나면서 터져버리는 문제가 발생한다.
- 이 에러는 "Rendered more hooks than during the previous render" 라는 메시지를 출력하며, 에러 바운더리에서도 걸리지 않아 상당히 곤란한 상황이 연출 된다.
- 리액트가 제공하는 `use` 훅 자체에 버그가 있는 것으로 보이며, 이를 위해 애플리케이션 레벨에서 Next.js를 패치해서 해결했다.
- **가 아니고 해결이 안된 것 같다 (다른 사이드 이펙이 있을 수도 있다)** 프로덕션 릴리즈 시간이 얼마 안남아 자세하게 디버깅하지 못해서 나중에 업데이트 하겠다.

## 문제의 발단

얼마 전부터 서버 컴포넌트에 에러가 발생시에 Next.js 애플리케이션이 터져버리는 문제가 발생했다. 에러가 나는 거야 그럴 수 있지만, 문제는 컴포넌트의 에러바운더리에도, 전역 에러 바운더리에도 걸리지 않는다는 것이었다. `error.tsx`에 걸려서 에러 화면이 보여줄 것이라는 기대가 무색하게, 애플리케이션은 이상한 메시지를 내뱉으면서 종료되었다.

![error1](./images/nextjs-error-1.png)

서버 컴포넌트에서 에러가 난다고 애플리케이션이 터져버리는 건 아무리 해도 발생해서는 안 되는 문제다. 이 에러가 왜 나는지, 그리고 어떻게 해야 이 에러를 제거할 수 있을지 살펴보았다.

## 디버깅

![error2](./images/nextjs-error-2.png)

먼저 이 에러는 다음과 같은 메시지와 함께 종종 발생한다. (매번 발생하는게 아님) 서버 컴포넌트 렌더링 중에 에러가 발생했으며, 프로덕션 환경에서 서버 컴포넌트 관련 정보가 노출되는 것을 방지하기 위해 에러가 표시되지 않는다는 메시지와 더불어, https://react.dev/errors/310 에러가 발생한다는 것이다.

이 에러 메시지는 리액트 컴포넌트가 이전 렌더링보다 더 많은 훅을 호출했을 때 발생한다. 이는 리액트의 rules of hook을 위반한 것으로, 훅의 호출 순서와 개수가 렌더링마다 일관되어야 한다는 규칙이다. 보통은 다음과 같은 상황에서 볼 수 있다.

```tsx
function MyComponent({shouldUseEffect}) {
  const [count, setCount] = useState(0)

  // 조건부 훅 호출
  if (shouldUseEffect) {
    useEffect(() => {
      console.log('effect')
    }, [])
  }

  return <div>{count}</div>
}
```

물론 정상적인 리액트 개발자라면 위와 같은 코드가 문제가 있다는 것을 단번에 알아차릴 수 있을 것이다. 하지만 당연하게도 저런 코드는 애초에 작성하지 않았고, nextjs 에서도 없다.

여기에 추가로 자세한 문제 해결을 위해서는 로컬 환경에서 보라는 메시지도 있는데, 문제는 이 애플리케이션이 터지는 상황은 프로덕션에서만 재현된다는 것이다. 🥺 에러 파악을 위해서는 결국 크롬 디버깅을 사용할 수밖에 없다. 앞서 에러 메시지에서 `app-router.tsx`에서 발생한다는 것을 살펴보았으니, 이 파일에 break를 걸어서 살펴보자.

![nextjs-error-3](./images/nextjs-error-3.png)

그러나 여기에서도 별다른 성과를 얻을 수는 없었다. `useMemo` 주변에 앞서 예제와 같은 조건부 훅과 같은 rules of hooks를 위반하는 내용을 찾을 수 없었고, `useMemo` 자체를 부를 때 터지는 것으로 보아 이미 rules of hooks이 위반된 시점이라는 뜻이다. 즉 `useMemo` 호출이 문제가 아니고 저 호출이 일어난 이전 상황이 문제라는 것이다.

Next.js, 리액트를 살펴보니 이미 많은 사람이 이 에러를 통해 고통받고 있었다.

- https://github.com/facebook/react/issues/33556
- https://github.com/facebook/react/issues/33580
- https://github.com/vercel/next.js/issues/63121
- https://github.com/vercel/next.js/issues/63388
- https://github.com/vercel/next.js/issues/78396
- https://github.com/vercel/next.js/issues/80483

이 문제는 이미 작년부터 보고되고 있었는데, 여전히 고쳐지지 않은 것이 가장 큰 문제고, 더 큰 문제는 프로덕션 런칭이 코앞에 다가왔다는 것이었다. 사용자와 이해관계자들에게 "아, 그거 리액트 에러예요. 못 고쳐요"라고 할 수는 없는 노릇이었다. 🤪

일단 `app-router.tsx` 코드를 다시 한 번 살펴보자.

```tsx
function Router({
  actionQueue,
  assetPrefix,
  globalError,
}: {
  actionQueue: AppRouterActionQueue
  assetPrefix: string
  globalError: [GlobalErrorComponent, React.ReactNode]
}) {
  const state = useActionQueue(actionQueue)
  const {canonicalUrl} = state
  // Add memoized pathname/query for useSearchParams and usePathname.
  const {searchParams, pathname} = useMemo(() => {
    const url = new URL(
      canonicalUrl,
      typeof window === 'undefined' ? 'http://n' : window.location.href,
    )

    return {
      // This is turned into a readonly class in `useSearchParams`
      searchParams: url.searchParams,
      pathname: hasBasePath(url.pathname)
        ? removeBasePath(url.pathname)
        : url.pathname,
    }
  }, [canonicalUrl])
  // ..
}
```

이 컴포넌트는 Next.js App router의 최상위 라우터 컴포넌트로, 글로벌 라우팅 상태를 관리하는 컴포넌트다. `useActionQueue`로 라우팅 상태를 관리하고 URL 변경, 페이지 전환 등의 라우팅 액션을 처리하며, 브라우저 네비게이션과 리액트 상태를 연결하는 핵심 컴포넌트다. 앞서 언급했듯, 문제는 `useMemo`가 아니고 이전에 있을 것이라고 추정했기 때문에, `useActionQueue`도 한 번 살펴볼 필요가 있다.

```tsx
export function useActionQueue(
  actionQueue: AppRouterActionQueue,
): AppRouterState {
  const [state, setState] = React.useState<ReducerState>(actionQueue.state)

  // Because of a known issue that requires to decode Flight streams inside the
  // render phase, we have to be a bit clever and assign the dispatch method to
  // a module-level variable upon initialization. The useState hook in this
  // module only exists to synchronize state that lives outside of React.
  // Ideally, what we'd do instead is pass the state as a prop to root.render;
  // this is conceptually how we're modeling the app router state, despite the
  // weird implementation details.
  if (process.env.NODE_ENV !== 'production') {
    const useSyncDevRenderIndicator =
      require('./react-dev-overlay/utils/dev-indicator/use-sync-dev-render-indicator')
        .useSyncDevRenderIndicator as typeof import('./react-dev-overlay/utils/dev-indicator/use-sync-dev-render-indicator').useSyncDevRenderIndicator
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const syncDevRenderIndicator = useSyncDevRenderIndicator()

    dispatch = (action: ReducerActions) => {
      syncDevRenderIndicator(() => {
        actionQueue.dispatch(action, setState)
      })
    }
  } else {
    dispatch = (action: ReducerActions) =>
      actionQueue.dispatch(action, setState)
  }

  return isThenable(state) ? use(state) : state
}
```

이 훅은 앞서 Next.js app router가 관리하는 외부 상태 관리 시스템을 리액트 컴포넌트와 동기화하는 브릿지 역할을 한다. 이해하기 어려우니 조금 더 쉽게 설명해보자.

리액트 딥 다이브에서 상태 관리에 대해 다뤘던 것처럼, 외부 상태는 보통 다음과 같이 스토어 패턴으로 관리한다.

```js
// 외부 store
const store = {count: 0}

// 리액트에서 구독
function useStore() {
  const [state, setState] = useState(store.count)

  useEffect(() => {
    const unsubscribe = store.subscribe(setState)
    return unsubscribe
  }, [])

  return state
}
```

그러나 이 패턴을 그대로 쓰기에 Next.js의 상황은 조금 특별하다. 서버에서 스트리밍으로 계속해서 데이터가 들어오며, 렌더링 중에도 상태가 바뀔 수 있기에, 순차적으로 처리하는 구독 방식으로는 이 문제를 온전히 해결할 수 없다. 따라서 Next.js는 `useActionQueue`를 통해 이 문제를 해결하고 있다. 이 훅을 조금 더 쉽게 설명하면 다음과 같다.

```tsx
function useActionQueue(actionQueue) {
  // 1. 외부 상태를 리액트 상태로 복사
  const [state, setState] = useState(actionQueue.state)

  // 2. 전역 dispatch 함수 만들기
  dispatch = (action) => {
    actionQueue.dispatch(action, setState) // 외부 상태 업데이트 및 리액트 리렌더링
  }

  // 3. Promise면 풀어서 반환, 아니면 그대로 반환
  return isThenable(state) ? use(state) : state
}
```

요약하자면, Next.js는 라우터에 따른 상태관리를 리액트 외부에서 관리하고 있으며, 이 복잡한 상황을 처리하기 위해 Router라고 하는 컨텍스트 기반 중앙 라우터 상태관리 컴포넌트를 만들었으며, `useActionQueue`로 이 상태를 컴포넌트와 동기화하고 있는 것이다. 그렇다면 왜 `isThenable`, 즉 Promise인지 여부를 확인하여 `use(state)` 또는 `state`를 반환하는 것일까?

그 이유는 서버 스트리밍 때문이다. 서버 스트리밍은 상태가 비동기적으로 완성되기 때문에 다음과 같은 상황이 발생할 수도 있다.

```js
// 페이지 이동 시작할 때
state = {
  tree: newPageTree,           // ✅ 라우트 구조는 즉시 결정
  cache: Promise<CacheNode>,   // ⏳ 페이지 컴포넌트 로딩 중
  prefetchCache: new Map(),    // ✅ 기존 프리페치 데이터
  pushRef: {
    mpaNavigation: false,
    pendingPush: true
  },                           // ✅ 네비게이션 설정
  focusAndScrollRef: {...},    // ✅ 스크롤 관리 설정
  canonicalUrl: '/new-page',   // ✅ 새 URL
  nextUrl: '/new-page'         // ✅ 내부 URL
}

// 서버에서 데이터 도착 후
state = {
  tree: newPageTree,           // ✅
  cache: actualCacheNode,      // ✅ 완료! 리액트 컴포넌트 포함
  prefetchCache: new Map(),    // ✅
  pushRef: {
    mpaNavigation: false,
    pendingPush: false
  },                           // ✅ 완료 상태로 변경
  focusAndScrollRef: {...},    // ✅
  canonicalUrl: '/new-page',   // ✅
  nextUrl: '/new-page'         // ✅
}
```

여기서 핵심은 `cache` 필드인데, 이 필드가 `CacheNode` 타입으로 정의되어 있고, 두 가지 상태를 가질 수 있다.

```typescript
// ReadyCacheNode - 준비된 상태
{
  rsc: <ActualPageComponent />,     // ✅ 서버 컴포넌트 준비됨
  lazyData: null,                   // ✅ 지연 로딩 불필요
  // ... 기타 필드들
}

// LazyCacheNode - 지연 로딩 상태
{
  rsc: null,                        // ❌ 아직 없음!
  lazyData: Promise<ServerData>,    // ⏳ 서버에서 가져오는 중
  // ... 기타 필드들
}
```

따라서 페이지 이동 시 다음과 같은 시나리오들이 발생할 수 있다.

**시나리오 1: 이미 캐시된 페이지**

```javascript
state = ReadyCacheNode // 즉시 사용 가능
return state // 바로 렌더링
```

**시나리오 2: 새로운 페이지 (서버에서 가져와야 하는 경우)**

```javascript
state = LazyCacheNode // rsc: null, lazyData: Promise
return use(state) // Suspense와 함께 Promise 처리
```

**시나리오 3: 복잡한 네비게이션**

```javascript
state = Promise<AppRouterState> // 전체 상태가 Promise
return use(state) // 전체 상태가 준비될 때까지 기다림
```

이렇게 `use()` 훅을 통해 Promise 상태를 처리하면서 리액트 Suspense와 연동되어 사용자에게 매끄러운 페이지 전환 경험을 제공한다. 서버에서 데이터가 스트리밍으로 들어오는 동안 로딩 상태를 보여주고, 데이터가 준비되면 자동으로 실제 페이지를 렌더링하는 것이다.

결국 `useActionQueue`는 **서버 스트리밍 + 리액트 Suspense + 외부 상태 관리**를 모두 조화롭게 동작시키기 위한 정교한 브리지 역할을 하는 훅이라고 할 수 있다. 덕분에 개발자는 복잡한 비동기 처리를 신경 쓰지 않고도 `<Link>` 컴포넌트만 사용해서 매끄러운 페이지 전환을 구현할 수 있는 것이다.

이야기가 조금 샜지만, `useMemo` 이전에 호출되는 훅은 이 `use`이고, 이 훅이 비동기 상태를 서버 스트리밍과 상호작용하는 과정에서 버그가 있다면 애플리케이션이 터지는 문제가, 즉 Next.js가 해결하지 못한 리액트가 터져버리는 문제가 발생할 수도 있지 않을까 하는 생각이 들었다.

```diff
diff --git a/dist/client/components/use-action-queue.js b/dist/client/components/use-action-queue.js
index a8f523d120dcf407d3f589920334e7b0bd69c3cc..5faf8e5d3ad9ac733c68f18ff6cf44dba0495419 100644
--- a/dist/client/components/use-action-queue.js
+++ b/dist/client/components/use-action-queue.js
@@ -37,8 +37,27 @@ function dispatchAppRouterAction(action) {
     }
     dispatch(action);
 }
+
+function useUnwrapState(_state) {
+    const [state, setState] = _react.default.useState(_state);
+    _react.default.useEffect(() => {
+        if ((0, _isthenable.isThenable)(_state)) {
+            _state.then(setState);
+        } else {
+            setState(_state);
+        }
+    }, [_state]);
+
+    return state;
+}
+
 function useActionQueue(actionQueue) {
     const [state, setState] = _react.default.useState(actionQueue.state);
+
+    // useUnwrapState 사용
+    const unwrappedState = useUnwrapState(state);
+
+
     // Because of a known issue that requires to decode Flight streams inside the
     // render phase, we have to be a bit clever and assign the dispatch method to
     // a module-level variable upon initialization. The useState hook in this
@@ -58,7 +77,7 @@ function useActionQueue(actionQueue) {
     } else {
         dispatch = (action)=>actionQueue.dispatch(action, setState);
     }
-    return (0, _isthenable.isThenable)(state) ? (0, _react.use)(state) : state;
+    return unwrappedState;
 }

 if ((typeof exports.default === 'function' || (typeof exports.default === 'object' && exports.default !== null)) && typeof exports.default.__esModule === 'undefined') {
```

결론부터 이야기 하자면 위와 같은 조치로 문제를 수정할 수 있었다. 하지만, 문제 해결을 한다고 모든 것이 끝나는 것이 아니니, 기술적인 부분에 대해서 조금더 이야기 해보자.

먼저 `use` 훅에 대해서 살펴보자면, [use](https://ko.react.dev/reference/react/use) 훅은 `Promise`나 `Context`를 읽어서 값을 반환하는 훅이다.

```jsx
function use(promise) {
  if (promise.status === 'pending') {
    throw promise // Suspense가 이걸 잡아서 로딩 처리
  }
  if (promise.status === 'rejected') {
    throw promise.reason // 에러 바운더리가 처리
  }
  return promise.value // 완료된 값 반환
}
```

이 훅은 다음과 같이 사용할 수 있다.

```js
function UserProfile({userPromise}) {
  const user = use(userPromise) // Promise를 "읽음"
  return <div>{user.name}</div>
}

// 사용할 때
;<Suspense fallback={<Loading />}>
  <UserProfile userPromise={fetchUser()} />
</Suspense>
```

이 훅의 목적은 어쨌든 비동기인 Promise를 훅 형태로 제공하는 것이므로, 다음과 같은 `use` 대체 훅으로도 **어느 정도는 비슷하게 기능할 수 있다.**

```jsx
function useUnwrapState(promise) {
  const [data, setData] = useState(null)

  useEffect(() => {
    if (isThenable(promise)) {
      promise.then(setData)
    } else {
      setData(promise)
    }
  }, [promise])

  return data
}
```

`Promise`를 `resolve`해서 준다는 공통점은 있지만, 두 훅에는 아주 큰 차이가 존재한다. `use` 훅은 렌더링을 중단할 수 있는 능력이 있는 반면, `useUnwrapState`는 렌더링을 중단할 수 있는 능력이 없다.

```javascript
function Component() {
  const data = use(promise) // Promise가 완료될 때까지 렌더링 중단
  return <div>{data}</div> // 완료 후 바로 렌더링
}
```

```javascript
function useUnwrapState(promise) {
  const [data, setData] = useState(null)

  useEffect(() => {
    if (isThenable(promise)) {
      promise.then(setData) // Promise 완료시 상태 업데이트
    } else {
      setData(promise)
    }
  }, [promise])

  return data // 처음엔 null, 나중에 실제 데이터
}
```

핵심 차이점은 다음과 같다.

| 측면         | `use` 훅                | `useUnwrapState`      |
| ------------ | ----------------------- | --------------------- |
| **렌더링**   | 중단 후 재시작          | 계속해서 리렌더링     |
| **Suspense** | 자동으로 연동           | 수동 로딩 처리        |
| **타이밍**   | Promise 완료시 즉시     | useEffect 사이클 따름 |
| **초기값**   | Promise 완료까지 기다림 | 일단 기본값 반환      |

실제 동작을 비교해본다면 다음과 같을 것이다.

```javascript
// Promise가 2초 후 완료되는 상황

// use 훅 사용시:
function Component() {
  const data = use(slowPromise) // 2초 동안 Suspense 보여줌
  return <div>{data}</div> // 2초 후 갑자기 나타남
}

// useUnwrapState 사용시:
function Component() {
  const data = useUnwrapState(slowPromise) // 처음엔 이전 상태 보여줌
  return <div>{data || 'Loading...'}</div> // 2초 후 새 데이터로 업데이트
}
```

둘 다 **Promise를 풀어서 실제 값을 반환한다**는 목적은 같다. 하지만,

- `use`: Suspense 기반의 "중단-재시작" 방식
- `useUnwrapState`: 전통적인 "상태 업데이트" 방식

이라는 결정적인 차이가 존재한다.

아무튼, 그래서 이 `use` 훅을 `useUnwrapState`로 교체해서 문제를 해결했다. 더 이상 전역 에러는 나지 않았지만, `Suspense` 활용이 의도한 대로 동작하지 않는다는 단점은 여전히 존재한다.

그럼에도, 애플리케이션이 터지는 것보다는 이 편이 훨씬 더 자연스럽기 때문에 이 방식 그대로 수정했다.

물론 리액트나 Nextjs 에서 공식적인 답변이 없는 관계로 이 방식이 올바른 해결책인지, 또 이게 근본적인 문제의 원인이 맞는지는 알 수 없다.

## 회고

Next.js App Router는 겉보기엔 안정화된 것처럼 보이지만, 내부적으로는 실험적인 기능이 여전히 많다. 그 증거로 리액트 버전도 사용자가 무슨 버전을 설치하는지와 상관없이 canary 버전으로 덮어써 버리며, 이 말인 즉슨 내부 구현이 리액트 팀의 공식 릴리스보다 앞서 있다는 말이기도 하다. 이 말인즉슨, **리액트 팀이 아직 '지원한다고 보장하지 않는 기능들'을 Next.js가 먼저 끌어다 쓰고 있다**는 뜻이다.

![nextjs-react-canary](./images/nextjs-react-canary.png)

실제로 [이 이슈](https://github.com/vercel/next.js/issues/54553)에서 Vercel 측은 "리액트 팀에서 아직 안 푼 걸 우리가 먼저 써야 해서 그렇다"고 설명한다. 즉, 아직 공식 릴리즈에 넣지 않은 기능이 있다고 하더라도, Next.js는 그걸 기반으로 새로운 아키텍처를 구성하고 있다는 것이다. 공식 문서에선 아무리 "안정화되었다"고 표현해도, 실제로 겪는 에러는 내부 구현이 실험적이라는 걸 그대로 보여준다. Next.js 와 리액트의 이러한 기묘한 동거 관계에 대한 내용은 [이 글](https://blog.isquaredsoftware.com/2025/06/react-community-2025/) 에서 자세히 확인해 볼 수 있다.

실제로 프로덕션에서 App Router를 써보면, 아주 정교하게 짜여진 프레임워크이기 때문에 디버깅이 꽤 어렵다. 단순히 리액트의 동작만 알아서는 디버깅 하는게 쉽지 않다. "Next.js 내부 상태가 왜 이 타이밍에 이렇게 바뀌었는지", "서버에서 받아온 stream이 왜 cache로 들어오지 않는지", "왜 Suspense가 잡아주지 못하는지" 같은 질문에 답하려면 리액트 서버 컴포넌트와 Next.js 내부 구조를 동시에 파악해야 한다.

물론 App Router, 리액트, Nextjs 가 지향하는 방향에는 동의한다. 서버 컴포넌트, 스트리밍, RSC 기반 트리 아키텍처 등은 앞으로 웹의 중요한 기반이 될 수도 있다. 하지만 지금 상태는 솔직히, **사용자가 버그 리포트 테스트 드라이버가 되는 느낌**이다. 이 외에도 여러 이슈를 제보했지만, 딱히 답변은 없었고, 여전히 메이저 버전 올리기에 바빠 보인다. 물론 내부적으로 버그 패치를 위해 열심히 노력중이시겠지만, 공식 배포용으로 쓰기에는 아직 너무 많은 부분이 열려 있다.

## 추가

https://github.com/vercel/next.js/issues/63388 를 살펴보니, `loading.tsx`를 삭제하는 것 만으로도 해당 문제를 해결할 수 있다는 글이 올라오고 있었다. 이 컴포넌트를 삭제하는 것만으로도 동작하는 이유는 아마도 다음과 같지 않을까?

### 이중 Suspense Boundary 문제

`loading.tsx`가 있으면 Next.js는 자동으로 해당 페이지를 `<Suspense>` boundary로 감싼다:

```jsx
// loading.tsx가 있을 때 Next.js가 내부적으로 생성하는 구조
<Suspense fallback={<LoadingComponent />}>
  <PageComponent />
</Suspense>
```

그런데 App Router 내부에서도 이미 Suspense를 사용하고 있기 때문에 다음과 같은 **이중 Suspense 상황**이 발생한다:

```jsx
// App Router 내부 구조 (추측)
<Suspense fallback={<GlobalLoading />}>
  {/* Next.js 내부 */}
  <Suspense fallback={<LoadingFromFile />}>
    {/* loading.tsx */}
    <Router>{/* useActionQueue에서 use(state) 호출 */}</Router>
  </Suspense>
</Suspense>
```

이중 Suspense의 핵심 문제는 Promise 해결 타이밍과 컴포넌트 재렌더링 순서가 복잡해진다는 것이다. 예컨데 `use()` 훅이 Promise를 throw하면:

1. **내부 Suspense (loading.tsx)가 먼저 catch** → Loading 컴포넌트 렌더링
2. **외부 Suspense (App Router)도 동시에 반응** → 전체 Router 컴포넌트 상태 변경
3. **Promise가 resolve되면 두 Suspense가 순차적으로 재시작**

이 과정에서 Router 컴포넌트가 **예상보다 많은 렌더링 사이클**을 거치게 되고, 리액트는 "첫 번째 렌더링에서는 `use()` 훅이 호출되지 않았는데, 두 번째 렌더링에서는 호출되었다"고 인식하여 훅 개수 불일치 에러를 던지는 것이다. (라고 추측 중)

```jsx
// 첫 번째 렌더링 (loading.tsx Suspense 활성화)
function Router() {
  const state = useActionQueue(actionQueue)  // 1. useState
  // state가 일반 객체 → use() 호출 안됨    // 총 훅 개수: 1개
  const memoized = useMemo(...)              // 2. useMemo
}                                            // 총 훅 개수: 2개

// 두 번째 렌더링 (서버 데이터 도착 후)
function Router() {
  const state = useActionQueue(actionQueue)  // 1. useState
  // state가 Promise → use() 호출됨!        // 2. use (새로 추가!)
  const memoized = useMemo(...)              // 3. useMemo
}                                            // 총 훅 개수: 3개 (2개 → 3개로 증가!)
```

### Race Condition과 서버 스트리밍 타이밍

또 다른 한가지 추측은 깃헙 이슈에서 언급한 "race condition"이다. 데이터 로딩 속도에 따라 문제 발생 여부가 달라진다:

**빠른 데이터 로딩 (50ms) - 문제 발생**:

```jsx
function Router() {
  // 첫 번째 렌더링: loading.tsx의 Suspense가 아직 활성화되기 전
  const state = useActionQueue(actionQueue)
  // state가 이미 완료된 데이터 → Promise가 아님 → use() 호출 안됨
  const memoized = useMemo(...)              // 총 훅: 2개

  // 갑자기 서버에서 새로운 Promise 상태가 도착
  // → 컴포넌트 리렌더링 트리거

  // 두 번째 렌더링: 이번엔 Promise 상태가 됨
  const state2 = useActionQueue(actionQueue)
  // state가 Promise → use() 호출됨!        // 새로운 훅 추가!
  const memoized2 = useMemo(...)             // 총 훅: 3개 (2개→3개 증가!)
}
```

**느린 데이터 로딩 (500ms) - 정상 동작**:

```jsx
function Router() {
  // 첫 번째 렌더링: loading.tsx의 Suspense가 먼저 활성화됨
  const state = useActionQueue(actionQueue)
  // state가 Promise → use() 호출됨 → 즉시 Suspense 트리거
  // → 렌더링 중단됨 (useMemo까지 도달하지 않음)

  // Suspense fallback 동안 500ms 대기...

  // 두 번째 렌더링: 데이터 완료 후
  const state2 = useActionQueue(actionQueue)
  // state가 완료된 데이터 → use() 호출 안됨
  const memoized2 = useMemo(...)             // 총 훅: 2개 (일관됨)
}
```

핵심은 **타이밍**이다. 데이터가 너무 빨리 도착하면 `loading.tsx`의 Suspense가 제대로 작동하기 전에 상태 변화가 일어나서, 같은 컴포넌트가 서로 다른 훅 호출 패턴을 가지게 된다. 이는 리액트의 "훅은 항상 같은 순서로 호출되어야 한다"는 규칙을 위반하게 만든다.

`loading.tsx`가 있으면 Next.js는 다음과 같은 복잡한 상태 전환을 해야 한다:

```jsx
// loading.tsx 없을 때: 단순한 상태 전환
Page Loading → Page Rendered

// loading.tsx 있을 때: 복잡한 상태 전환
Page Loading → Loading.tsx Rendered → Suspense Resolved → Page Rendered
              ↑                      ↑
         첫 번째 Suspense        두 번째 Suspense (use 훅)
```

이 과정에서 `useActionQueue`의 `use()` 훅이 예상과 다른 타이밍에 호출되면서 리액트의 훅 호출 순서 규칙을 위반하게 된다.

### 두 해결책의 비교

아마도 앞서 제기한 해결책과 `loading.tsx` 모두 문제를 해결하는 방법이 아닐까 싶다. 두개를 비교하면 다음과 같다.

| 방법                 | 장점                 | 단점                    |
| -------------------- | -------------------- | ----------------------- |
| **loading.tsx 제거** | 간단하고 확실한 해결 | 로딩 UX 완전히 포기     |
| **use 훅 패치**      | 로딩 UX 유지 가능    | Suspense 기능 일부 제한 |

`loading.tsx` 제거는 **문제 상황 자체를 회피하는 방법**이라고 볼 수 있다. 근본적인 해결책은 아니지만, 이중 Suspense boundary 제거로 race condition과 훅 호출 순서 문제를 피할 수 있다.

개인적으로는 UX를 포기하는 것보다는 `useUnwrapState` 패치가 더 나은 접근법이라고 생각한다. Suspense 메커니즘을 우회하면서도 `loading.tsx`의 UX 이점은 유지할 수 있기 때문이다.
