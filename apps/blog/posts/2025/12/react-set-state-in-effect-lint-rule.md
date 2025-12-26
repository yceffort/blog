---
title: 'React의 새로운 lint 규칙: set-state-in-effect'
tags:
  - react
  - eslint
  - performance
published: true
date: 2025-12-16 15:30:00
description: 'Effect에서 setState를 호출하면 안 되는 이유와 대안'
---

## Table of Contents

## 개요

`eslint-plugin-react-hooks` 6.1.0 버전부터 `set-state-in-effect`라는 새로운 규칙이 추가되었다. 이 규칙은 React Compiler 기반의 새로운 lint 규칙 중 하나로, `useEffect` 안에서 동기적으로 `setState`를 호출하는 패턴을 잡아낸다.

그동안 React 문서에서는 "You Might Not Need an Effect"라는 제목으로 불필요한 Effect 사용을 경고해왔지만, 실제로 이를 강제하는 lint 규칙은 없었다. 이제 공식적으로 이 패턴을 감지하고 경고하는 규칙이 생긴 것이다.

## 왜 이 규칙이 생겼나?

Effect 안에서 `setState`를 동기적으로 호출하면 다음과 같은 문제가 발생한다.

1. 컴포넌트가 렌더링된다
2. DOM이 업데이트된다
3. Effect가 실행되고, `setState`가 호출된다
4. **다시 렌더링이 시작된다**
5. DOM이 또 업데이트된다

결과적으로 한 번의 렌더링으로 끝날 일을 두 번에 걸쳐 처리하게 된다. 이는 성능 저하를 일으키고, 브라우저가 화면을 그리기 전에 재렌더링이 발생하면 화면 깜빡임(flicker)까지 발생할 수 있다.

### React Compiler와의 관계

이 규칙이 **지금** 추가된 것은 우연이 아니다. React 19와 함께 정식 출시된 **React Compiler**와 직접적인 관련이 있다.

React Compiler는 `useMemo`, `useCallback`, `React.memo`를 수동으로 작성하지 않아도 자동으로 메모이제이션을 적용해주는 빌드 타임 도구다. Meta에서 10년 가까이 개발해온 프로젝트로, 실제로 최대 12%의 로딩 속도 향상과 2.5배 빠른 인터랙션을 달성했다고 한다.

하지만 Compiler가 제대로 작동하려면 코드가 **Rules of React**를 따라야 한다. 컴포넌트는 순수해야 하고, 같은 입력에 같은 출력을 반환해야 하며, side effect는 렌더링 밖에서 실행되어야 한다. Effect 안에서 동기적으로 `setState`를 호출하는 패턴은 이 규칙을 위반한다.

규칙을 위반하는 코드가 발견되면 Compiler는 해당 컴포넌트의 최적화를 **건너뛴다**. 앱이 깨지지는 않지만, 해당 부분은 최적화의 혜택을 받지 못한다. `set-state-in-effect` 규칙은 이런 위반을 컴파일 타임에 미리 잡아내기 위해 추가된 것이다.

결국 이 규칙은 단순한 코드 스타일 가이드가 아니다. React Compiler 시대에 최적화 혜택을 온전히 받기 위한 **필수 조건**에 가깝다.

## 흔히 보이는 안티패턴들

### Props를 State에 복사하기

가장 흔한 실수다.

```jsx
function Component({data}) {
  const [items, setItems] = useState([])

  useEffect(() => {
    setItems(data)
  }, [data])

  return <List items={items} />
}
```

이 코드는 `data`가 바뀔 때마다 불필요한 추가 렌더링을 발생시킨다. 그냥 `data`를 직접 사용하면 될 일이다.

```jsx
function Component({data}) {
  return <List items={data} />
}
```

### 렌더링 중에 할 수 있는 계산을 Effect에서 하기

```jsx
function Component({rawData}) {
  const [processed, setProcessed] = useState([])

  useEffect(() => {
    setProcessed(rawData.map((item) => transform(item)))
  }, [rawData])

  return <List items={processed} />
}
```

데이터 변환은 렌더링 중에 수행할 수 있다. 굳이 state로 관리할 필요가 없다.

```jsx
function Component({rawData}) {
  const processed = rawData.map((item) => transform(item))
  return <List items={processed} />
}
```

만약 변환 비용이 비싸다면 `useMemo`를 사용하면 된다.

```jsx
function Component({rawData}) {
  const processed = useMemo(
    () => rawData.map((item) => transform(item)),
    [rawData],
  )

  return <List items={processed} />
}
```

### Props에서 파생 가능한 값을 State로 관리하기

```jsx
function Component({selectedId, items}) {
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setSelected(items.find((item) => item.id === selectedId))
  }, [selectedId, items])

  return <Detail item={selected} />
}
```

`selected`는 `selectedId`와 `items`에서 언제든 계산할 수 있다. state가 필요 없다.

```jsx
function Component({selectedId, items}) {
  const selected = items.find((item) => item.id === selectedId)
  return <Detail item={selected} />
}
```

### useMount 패턴

SSR 환경에서 hydration 불일치를 피하기 위해 흔히 사용되는 패턴이다.

```jsx
function Component() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return <ClientOnlyContent />
}
```

이 패턴은 서버에서는 아무것도 렌더링하지 않고, 클라이언트에서 마운트 후 콘텐츠를 보여주는 방식이다. 언뜻 보면 SSR 문제를 해결하는 합리적인 방법 같지만, 사실 이것도 **안티패턴**이다.

`true`는 렌더링 시점에 이미 알고 있는 상수값이다. DOM 측정처럼 "렌더링 후에야 알 수 있는 값"이 아니다. 결국 불필요한 cascading render(이중 렌더링)를 발생시킨다.

#### 대안 1: useSyncExternalStore

React 18부터 제공되는 `useSyncExternalStore`를 사용하면 Effect 없이도 SSR/CSR 분기를 처리할 수 있다.

```jsx
function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true, // 클라이언트에서는 true
    () => false, // 서버에서는 false
  )
}

function Component() {
  const mounted = useIsMounted()

  if (!mounted) return null

  return <ClientOnlyContent />
}
```

이 방식은 useEffect도 없고, 불필요한 재렌더링도 없다.

#### 대안 2: Next.js dynamic import

Next.js를 사용한다면 `dynamic` import로 SSR 자체를 건너뛸 수 있다.

```jsx
import dynamic from 'next/dynamic'

const ClientOnlyComponent = dynamic(() => import('./ClientOnlyComponent'), {
  ssr: false,
})
```

#### 왜 useSyncExternalStore는 재렌더링을 일으키지 않는가?

`useEffect` + `setState` 조합과 달리 `useSyncExternalStore`가 cascading render를 피할 수 있는 이유는 React의 렌더링 라이프사이클과 **동기적으로 통합**되어 있기 때문이다.

`useEffect`는 렌더링이 완료된 **후에** 실행된다. 따라서 Effect 안에서 `setState`를 호출하면 새로운 렌더링 사이클이 시작될 수밖에 없다.

반면 `useSyncExternalStore`는 렌더링 **중에** 스냅샷을 읽는다. 세 번째 인자인 `getServerSnapshot`이 핵심인데, 서버에서는 이 값을 사용하고 클라이언트 hydration 시에도 이 값으로 시작한다. hydration이 완료된 후 `getSnapshot`이 다른 값을 반환하면 그때 리렌더링이 발생하지만, 이는 React가 예상하고 관리하는 정상적인 흐름이다.

또한 Concurrent Mode에서 발생할 수 있는 **Tearing(찢어짐)** 문제도 방지한다. 렌더링 도중 외부 스토어가 변경되면 UI의 다른 부분에서 다른 데이터가 보일 수 있는데, `useSyncExternalStore`는 이를 감지하고 일관된 데이터로 다시 렌더링한다.

## 실제 프로젝트에서 발견한 케이스들

내 블로그 프로젝트에서도 이 규칙에 걸리는 케이스들이 있었다. 각각 어떻게 대응할 수 있는지 살펴보자.

### 1. DOM 요소 조회 후 State 저장 (TableOfContents)

```jsx
useEffect(() => {
  const article = document.querySelector('article')
  const elements = article.querySelectorAll('h2, h3, h4')
  const items = Array.from(elements).map((el) => ({
    id: el.id,
    text: el.textContent || '',
    level: parseInt(el.tagName[1]),
  }))
  setHeadings(items)
}, [])
```

이 케이스는 **DOM 요소를 조회**한 결과를 저장하는 것이다. 렌더링 시점에는 DOM이 아직 존재하지 않기 때문에 Effect에서 처리할 수밖에 없다. 이런 경우는 **규칙의 예외**에 해당한다.

다만 현재 규칙은 이를 자동으로 구분하지 못하기 때문에 `eslint-disable` 주석으로 명시적으로 예외 처리하는 것이 적절하다.

```jsx
// eslint-disable-next-line react-hooks/set-state-in-effect
setHeadings(items)
```

### 2. 스크롤 이벤트 핸들러 (MobileTOC)

```jsx
useEffect(() => {
  const handleWindowScroll = () => {
    setShowScrollTop(window.scrollY > 50)
  }

  window.addEventListener('scroll', handleWindowScroll)
  return () => window.removeEventListener('scroll', handleWindowScroll)
}, [])
```

이 케이스는 **이벤트 핸들러 내에서** `setState`를 호출하는 것이다. 이는 Effect 안에서 동기적으로 호출하는 것이 아니라, 나중에 이벤트가 발생했을 때 비동기적으로 호출되는 것이므로 **규칙 위반이 아니다**.

### 3. sessionStorage에서 복원 + setMounted (InfiniteScrollList)

```jsx
useEffect(() => {
  const stored = getStoredState(storageKey)
  if (stored && stored.uniqueKey === uniqueKey) {
    setPosts(stored.posts)
  }
  setMounted(true)
}, [storageKey, uniqueKey])
```

이 코드에는 두 가지 동기적 setState가 있다.

**`setPosts(stored.posts)`**: 외부 저장소(sessionStorage)에서 데이터를 복원하는 것이다. 렌더링 시점에는 브라우저 API에 접근할 수 없으므로(SSR 환경) Effect에서 처리가 필요하다. `useSyncExternalStore`로 개선할 수 있다.

```jsx
const storedPosts = useSyncExternalStore(
  (callback) => {
    window.addEventListener('storage', callback)
    return () => window.removeEventListener('storage', callback)
  },
  () => {
    const stored = getStoredState(storageKey)
    return stored?.uniqueKey === uniqueKey ? stored.posts : initialPosts
  },
  () => initialPosts, // SSR fallback
)
```

**`setMounted(true)`**: 앞서 설명한 안티패턴이다. 상수값을 저장하는 것이므로 `useSyncExternalStore`나 `dynamic import`로 대체해야 한다.

### 4. 비동기 데이터 페칭 (CommandPalette)

```jsx
useEffect(() => {
  if (open && !dataLoaded) {
    fetch('/api/search')
      .then((res) => res.json())
      .then((data) => {
        setPosts(data.posts)
        setTags(data.tags)
        setDataLoaded(true)
      })
  }
}, [open, dataLoaded])
```

이 케이스는 **비동기 작업의 결과**를 저장하는 것이다. `fetch`가 완료된 후에 호출되므로 동기적인 `setState`가 아니다. 이 역시 **규칙 위반이 아니다**.

## Effect에서 setState가 허용되는 경우

정리하면, Effect 안에서 `setState`가 허용되는 경우는 다음과 같다.

1. **ref에서 읽은 값을 기반으로 할 때** (DOM 측정 등)
2. **비동기 작업의 결과를 저장할 때** (fetch, setTimeout 등)
3. **이벤트 핸들러 내에서 호출할 때** (addEventListener 콜백)
4. **외부 시스템과 동기화할 때** (브라우저 API, 구독 등)

핵심은 **렌더링 시점에는 알 수 없는 값**을 다룰 때만 Effect 안에서 `setState`를 사용해야 한다는 것이다.

## 규칙 활성화 방법

이 규칙을 사용하려면 `eslint-plugin-react-hooks` 6.1.0 이상이 필요하다.

```js
// eslint.config.js (Flat Config)
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  reactHooks.configs.flat.recommended,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn', // 또는 'error'
    },
  },
]
```

React Compiler의 모든 규칙을 활성화하려면 `recommended-latest` 설정을 사용할 수도 있다.

## 규칙의 한계

이 규칙이 완벽하지는 않다. GitHub에는 규칙이 **너무 엄격하다**는 이슈들이 올라와 있다.

### [#34743](https://github.com/facebook/react/issues/34743): 공식 문서와의 불일치

```jsx
useEffect(() => {
  setDidMount(true)
}, [])
```

이 패턴은 hydration 불일치를 피하기 위해 과거부터 널리 사용되어 왔고, 일부 문서에서는 아직도 이 방식을 소개하고 있다. 앞서 살펴본 것처럼 `useSyncExternalStore`가 더 나은 대안이지만, 기존 코드베이스에서 흔히 발견되는 패턴이라 마이그레이션 비용이 발생할 수 있다.

### [#34905](https://github.com/facebook/react/issues/34905): 비동기 함수 false positive

```jsx
const fetchData = useCallback(async () => {
  const response = await fetch('/api/data')
  setReady(true) // await 이후이므로 동기적 호출이 아님
}, [])

useEffect(() => {
  fetchData()
}, [fetchData])
```

`await` 이후에 호출되는 `setState`는 동기적 호출이 아니므로 cascading render 문제를 일으키지 않는다. 하지만 규칙은 이를 구분하지 못하고 경고를 띄운다.

React Compiler 팀은 이런 문제들을 인지하고 있다. 개선될지는 지켜봐야 할 것 같다.

## 핵심 원칙

> 기존 Props나 State에서 계산할 수 있다면, State에 넣지 마라. 렌더링 중에 계산하라.

이 원칙만 기억하면 대부분의 경우를 올바르게 처리할 수 있다. Effect는 외부 시스템과의 동기화를 위한 것이지, 내부 state 동기화를 위한 도구가 아니다.

## 마치며

`set-state-in-effect` 규칙이 경고를 띄웠다면, 먼저 "이 값을 정말 state로 관리해야 하는가?"를 자문해보자. 대부분의 경우 렌더링 중에 계산하거나, 아예 state를 제거하는 것이 정답이다.

다만 DOM 측정이나 외부 시스템 연동처럼 정말로 Effect에서 처리해야 하는 경우도 있다. 이런 경우에는 `eslint-disable` 주석과 함께 왜 예외가 필요한지 명시하는 것이 좋다.

## 참고

- [set-state-in-effect - React](https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-effect)
- [eslint-plugin-react-hooks - npm](https://www.npmjs.com/package/eslint-plugin-react-hooks)
- [React 19.2 - React](https://react.dev/blog/2025/10/01/react-19-2)
- [isMounted is an Antipattern - React Blog](https://legacy.reactjs.org/blog/2015/12/16/ismounted-antipattern.html)
- [Avoiding Hydration Mismatches with useSyncExternalStore - TkDodo](https://tkdodo.eu/blog/avoiding-hydration-mismatches-with-use-sync-external-store)
- [How useSyncExternalStore() works internally in React? - jser.dev](https://jser.dev/2023-08-02-usesyncexternalstore/)
- [React Compiler v1.0 - React](https://react.dev/blog/2025/10/07/react-compiler-1)
- [Rules of React - React](https://react.dev/reference/rules)
