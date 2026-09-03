---
title: 'React <em>cache()</em> 딥다이브: 소스 코드로 읽는 요청 단위 메모이제이션'
tags:
  - react
  - react-server-components
  - memoization
  - performance
  - frontend
published: true
date: 2026-05-30 14:00:00
description: 'React cache() 함수의 모든 이상한 규칙은 30여 줄짜리 구현에서 직접 따라 나온다. dispatcher, getCacheForType, WeakMap/Map 트리를 소스 레벨로 따라가며 요청 단위 메모이제이션의 동작을 끝까지 본다.'
thumbnail: /thumbnails/2026/05/react-cache-function-deep-dive.png
art:
  layout: codePanel
  hue: violet
  tone: dark
  hero: 'getCacheForType'
---

## Table of Contents

## 서론

`cache()`는 React 19에 정식 추가된 API[^1]다. 그런데 막상 쓰면 직관이 자꾸 빗나간다. DB 쿼리를 감쌌는데 쿼리는 여전히 두 번 나가고, 같은 코드를 클라이언트 컴포넌트로 옮겼더니 아무 일도 일어나지 않고, 인자를 객체로 바꿨더니 캐시가 통째로 안 먹는다. 공식 문서에는 "Server Component 안에서만", "컴포넌트 밖에서는 동작 안 함", "모듈 최상위에서 한 번만 감싸기", "매 요청마다 캐시 초기화" 같은 규칙이 한 다발 적혀 있는데, 정작 왜 그런지는 알려주지 않는다.

규칙을 다 외우면 쓸 수는 있다. 그런데 외울 필요가 없다. 이 규칙들은 전부 **하나의 작은 구현에서 기계적으로 따라 나오는 결과**이기 때문이다. `ReactCacheImpl.js`의 `cache()`는 디스패처가 있는지 확인하는 가드 한 줄, 인자를 따라 자료구조를 한 단계씩 내려가는 루프, 반환값을 레퍼런스 그대로 저장하는 한 줄 — 사실상 이게 전부다. 이 30여 줄을 읽고 나면 위 규칙들이 "왜"까지 한꺼번에 풀린다.

그래서 이 글은 `cache()`의 사용법이 아니라 **구현**을 따라간다. `facebook/react`의 `ReactCacheImpl.js`[^2]와 Flight 서버의 요청 단위 캐시 저장소[^5]를 직접 읽으면서, 왜 RSC 전용인지, 왜 컴포넌트 밖에서는 안 되는지, 왜 객체 인자가 위험한지, 왜 실패한 fetch가 재시도되지 않는지를 소스 레벨로 설명한다.

> 시작하기 전에 한 가지. 이 글의 주인공은 **`react`에서 import하는 `cache()` 함수**다. Next.js의 **`'use cache'` 디렉티브**와는 전혀 다른 물건이다. 이름이 비슷해 자주 혼동되는데, 그 차이는 [`'use cache'` 디렉티브 딥다이브](/2026/05/use-cache-deep-dive)에서 따로 다뤘다. 둘의 경계는 아래 [먼저 결론](#먼저-결론) 바로 다음 절에서 명확히 정리한다.
>
> 소스 분석은 `facebook/react`의 **`v19.2.6` 태그**(이 글을 쓰는 시점의 최신 stable) 기준이다. `main`은 시점에 따라 바뀌므로 고정 태그로 인용하고, 본문의 모든 GitHub 링크도 이 태그를 가리킨다. 참고로 `cache()`는 React 19.0.0부터, 뒤에 나오는 `cacheSignal()`은 19.2.0부터 stable에 포함됐다.

## 먼저 결론

내부로 들어가기 전에 요약부터 둔다. 길게 안 읽어도 이 정도는 남기면 좋다.

- `cache()`는 **단일 서버 요청(렌더 패스) 안에서만** 동작하는 메모이제이션이다. 요청이 끝나면 캐시는 폐기되고, 요청·유저 간에 절대 공유되지 않는다. 영속 캐시가 아니다.
- 메모이즈 여부는 **`ReactSharedInternals.A`(AsyncDispatcher)의 존재**로 결정된다. 이게 `null`이면(클라이언트, 컴포넌트 밖) 캐싱을 통째로 건너뛰고 함수를 그냥 실행한다. "RSC 전용", "컴포넌트 밖에서는 안 됨"이라는 두 규칙의 정체가 바로 이 한 줄이다.
- 캐시는 **함수 레퍼런스와 인자로 만든 트리**다. 객체/함수 인자는 레퍼런스를 키로 `WeakMap`에, 원시값은 값을 키로 `Map`에 들어간다. 그래서 매 렌더 새 객체를 넘기면 항상 미스다.
- 반환값은 **레퍼런스 그대로** 저장된다. async 함수면 같은 Promise 객체가 캐시되어, 트리 곳곳의 `await`가 하나의 in-flight 요청을 공유한다. 이게 요청 중복 제거와 `preload` 패턴의 원리다.
- 에러 캐싱은 **비대칭**이다. 동기 `throw`만 `ERRORED` 상태로 저장되고, async 함수의 거부(rejected)는 거부 프로미스가 값으로 저장된다. 어느 쪽이든 **같은 요청 안에서는 재시도되지 않는다.**

각 항목의 근거가 본문이다.

## cache()는 'use cache'도 useMemo도 아니다

가장 먼저 정리할 게 이름의 혼란이다. 서버 캐싱 도구가 한꺼번에 쏟아지면서 `cache()`, `'use cache'`, `unstable_cache`, fetch 메모, `useMemo`가 머릿속에서 뒤섞인다. 결과만 보면 다 "같은 입력에 같은 출력, 두 번째 호출은 빠름"이라 비슷해 보인다. 하지만 **스코프와 지속성**이 다 다르다.

| 도구                   | 런타임 / 스코프               | 키                              | 지속성                          |
| ---------------------- | ----------------------------- | ------------------------------- | ------------------------------- |
| `useMemo(fn, deps)`    | 클라이언트, 컴포넌트 인스턴스 | 의존성 배열 참조 동등성         | 비영속 (리렌더·언마운트로 폐기) |
| **`cache(fn)`**        | **서버(RSC), 단일 요청 렌더** | **fn 레퍼런스 + 인자 identity** | **비영속 (요청 끝나면 폐기)**   |
| `fetch()` 메모         | 서버(RSC), 단일 요청 렌더     | URL + 옵션                      | 비영속 (렌더 한정)              |
| fetch Data Cache       | 서버, 요청을 가로지름         | URL + 옵션 + tags               | 영속 (revalidate / tag)         |
| `unstable_cache`       | 서버, 요청을 가로지름         | keyParts + 인자                 | 영속                            |
| `'use cache'` 디렉티브 | 서버, 요청을 가로지름         | buildId + fnId + 직렬화된 인자  | 영속 (호스팅 의존)              |
| React Query / SWR      | 클라이언트                    | query key                       | 세션 동안 영속                  |

핵심 경계는 굵게 표시한 줄이다. `cache()`는 위쪽 그룹(요청 단위 비영속)에 속하고, `'use cache'`/`unstable_cache`/Data Cache는 아래쪽 그룹(요청을 가로지르는 영속 캐시)이다.

이 차이가 둘을 헷갈리면 안 되는 이유다. `'use cache'`는 결과를 **직렬화해서** 키-값 저장소에 넣고 요청이 끝나도, 심지어 다음 요청에서도 재사용한다. 그래서 인자가 직렬화 가능해야 하고 `cookies()`를 직접 못 읽는다. 반면 `cache()`는 결과를 **자바스크립트 레퍼런스 그대로** 메모리에 들고 있다가 요청이 끝나면 버린다. 직렬화가 없으니 Promise든 클래스 인스턴스든 뭐든 캐시할 수 있다. 대신 요청 밖으로는 한 발도 못 나간다.

> 한 문장으로: **`'use cache'`는 "요청을 넘기는 저장소", `cache()`는 "요청 하나를 사는 메모", `useMemo`는 "컴포넌트 하나를 사는 메모"다.** 이름이 비슷할 뿐 사는 시간이 전부 다르다.

이제 `cache()`가 정확히 "요청 하나를 사는" 방식을 구현으로 본다. 출발점은 디스패처다.

## 디스패처가 모든 것을 정한다

`cache(fn)`이 반환하는 함수의 첫 줄을 보자.

```js
export function cache(fn) {
  return function () {
    const dispatcher = ReactSharedInternals.A
    if (!dispatcher) {
      // 디스패처가 없으면 캐시되지 않은 것으로 취급한다.
      return fn.apply(null, arguments)
    }
    // ... 여기서부터 실제 캐싱 ...
  }
}
```

`ReactSharedInternals`는 React 패키지들(`react`, `react-dom`, `react-reconciler`, `react-server`) 사이의 공유 통신 채널이다. 이들은 따로 배포되는 패키지라 서로의 내부를 직접 import할 수 없어서, `react`가 가변 객체 하나를 노출하고 나머지가 그걸 읽고 쓴다. 안에는 렌더 도중 바뀌는 "현재 디스패처"들이 한 글자 슬롯에 담겨 있다 — `H`는 훅 디스패처(`useState` 등이 타는 길), `T`는 트랜지션 설정, 그리고 우리가 보는 **`A`가 AsyncDispatcher**다[^4]. 슬롯 주석 그대로 `ReactCurrentCache`, 즉 "현재 캐시"를 가리킨다.

이 객체가 예전에 `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED`(직역하면 "쓰면 해고된다")라는 이름으로 노출되던, 그 악명 높은 내부 객체다. React 19에서 이 이름은 여러 PR에 걸친 내부 정리를 거쳐 [덜 극적인 `__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE`로 바뀌었지만](https://github.com/facebook/react/pull/28789), 손대지 말라는 의도는 그대로다.

이 디스패처는 **React가 서버에서 RSC를 렌더하는 동안에만** 채워진다. Flight 서버 런타임이 렌더를 시작할 때 `A`에 자기 디스패처를 꽂고, 렌더가 끝나면 비운다. 그 외의 모든 상황 — 클라이언트 번들, 컴포넌트 바깥의 모듈 최상위 코드, 일반 이벤트 핸들러 — 에서 `A`는 `null`이다.

그러니까 `if (!dispatcher) return fn.apply(null, arguments)` 이 한 줄이 공식 문서가 말하는 두 가지 함정의 정체다.

- **"cache is for use in Server Components only."** 클라이언트에는 디스패처가 없으니 캐싱을 건너뛴다.
- **"Calling a memoized function outside of a component will not use the cache."** 컴포넌트 밖에서 부르면 렌더 컨텍스트가 아니라 디스패처가 없고, 역시 건너뛴다.

둘 다 에러가 아니다. **조용히 그냥 함수를 실행할 뿐이다.** 그래서 "왜 캐시가 안 먹지?"가 디버깅하기 까다롭다. 동작은 멀쩡한데 캐시만 빠진다.

클라이언트에서의 무력화는 사실 **두 겹**으로 막혀 있다. React 패키지는 서버 엔트리(`ReactServer.js`)와 클라이언트 엔트리(`ReactClient.js`)가 갈리는데, 클라이언트 엔트리가 import하는 `ReactCacheClient.js`는 이렇게 되어 있다[^3].

```js
// ReactCacheClient.js (개념적으로)
export const cache = disableClientCache ? noopCache : cacheImpl
```

`ReactFeatureFlags.js`의 `disableClientCache`가 기본 `true`다. 즉 클라이언트에서 import하는 `cache`는 실제 구현이 아니라 그냥 `fn`을 호출하고 끝내는 `noopCache`다. `noopCache`에 달린 주석은 솔직하다 — "We intend to implement client caching in a future major release." 설령 이 플래그가 꺼져 실제 구현으로 연결돼도, 위에서 봤듯 클라이언트에는 `A`가 `null`이라 어차피 `fn.apply`로 떨어진다.

> 참고로, `arguments`와 `fn.apply(null, arguments)`를 쓰는 것도 의도된 선택이다. 소스 주석에 "rest 파라미터를 쓰면 트랜스파일 결과가 커지므로 안 쓴다"고 적혀 있다. 핫패스로 취급해 한 톨이라도 아끼겠다는 뜻이다.

## 캐시는 함수와 인자로 만든 트리다

디스패처가 있으면 본격적인 캐싱이 시작된다. 캐시의 자료구조는 함수와 인자를 따라 가지를 치는 **트리**다. 함수 자체가 루트이고, 인자 하나하나가 그 아래로 한 단계씩 가지를 뻗는다. 같은 함수에 같은 인자로 호출하면 같은 가지 끝(노드)에 도착하고, 거기에 결과가 매달린다.

먼저 노드부터. 캐시의 각 노드는 이렇게 생겼다.

```js
const UNTERMINATED = 0 // 아직 값 없음
const TERMINATED = 1 // 결과 저장됨
const ERRORED = 2 // 에러 저장됨

function createCacheNode() {
  return {
    s: UNTERMINATED, // status: 위 셋 중 하나
    v: undefined, // value: 결과 또는 던져진 에러 (s에 따라 의미가 달라짐)
    o: null, // object cache: 비-원시 인자용 WeakMap
    p: null, // primitive cache: 원시 인자용 Map
  }
}
```

`s`, `v`, `o`, `p` 네 글자가 전부다. `v` 하나를 결과와 에러가 공유하고, `s`로 어느 쪽인지 구분한다. `o`와 `p`는 다음 인자로 내려가는 두 갈래 길이다.

이제 전체 구현을 보자. 위에서 본 디스패처 가드 다음에 이어지는 부분이다.

```js
export function cache(fn) {
  return function () {
    const dispatcher = ReactSharedInternals.A
    if (!dispatcher) {
      return fn.apply(null, arguments)
    }

    // 1) 요청 단위 WeakMap을 얻고, 그 안에서 이 fn의 루트 노드를 찾는다
    const fnMap = dispatcher.getCacheForType(createCacheRoot)
    let cacheNode = fnMap.get(fn)
    if (cacheNode === undefined) {
      cacheNode = createCacheNode()
      fnMap.set(fn, cacheNode)
    }

    // 2) 인자 하나마다 트리를 한 단계씩 내려간다
    for (let i = 0; i < arguments.length; i++) {
      const arg = arguments[i]
      if (
        typeof arg === 'function' ||
        (typeof arg === 'object' && arg !== null)
      ) {
        // 객체/함수: 레퍼런스를 키로 WeakMap에 저장
        let objectCache = cacheNode.o
        if (objectCache === null) cacheNode.o = objectCache = new WeakMap()
        let next = objectCache.get(arg)
        if (next === undefined) objectCache.set(arg, (next = createCacheNode()))
        cacheNode = next
      } else {
        // 원시값(null 포함): 값을 키로 Map에 저장
        let primitiveCache = cacheNode.p
        if (primitiveCache === null) cacheNode.p = primitiveCache = new Map()
        let next = primitiveCache.get(arg)
        if (next === undefined)
          primitiveCache.set(arg, (next = createCacheNode()))
        cacheNode = next
      }
    }

    // 3) 마지막 노드의 상태로 분기
    if (cacheNode.s === TERMINATED) return cacheNode.v
    if (cacheNode.s === ERRORED) throw cacheNode.v

    try {
      const result = fn.apply(null, arguments)
      cacheNode.s = TERMINATED
      cacheNode.v = result
      return result
    } catch (error) {
      cacheNode.s = ERRORED
      cacheNode.v = error
      throw error
    }
  }
}
```

원본은 Flow 타입과 좀 더 장황한 분기를 쓰지만 동작은 이게 전부다. 세 단계를 풀어 본다.

### 1단계: 함수 identity가 루트다

`dispatcher.getCacheForType(createCacheRoot)`가 돌려주는 `fnMap`은 **이번 요청 동안만 사는 WeakMap**이다(이게 어떻게 요청 단위인지는 [다음 절](#요청-단위-격리는-어디서-오는가)에서 본다). 이 WeakMap의 키는 **원본 `fn` 레퍼런스**다.

여기서 공식 문서의 가장 헷갈리는 규칙이 풀린다.

> "Calling cache with the same function multiple times will return different memoized functions that do not share the same cache."

`cache(fn)`을 두 번 호출하면 wrapper 함수는 서로 다른 두 개가 나온다. 하지만 WeakMap의 키로 쓰이는 건 wrapper가 아니라 **넘긴 원본 `fn`**이다. 그러니 같은 `fn`을 넘겨 만든 wrapper들은 트리 어디서 호출되든 같은 루트 노드를 공유한다.

그런데 보통은 이렇게들 쓴다.

```tsx
// 매 렌더마다 cache()를 다시 호출해 새 wrapper 생성 — 흔히 안티패턴으로 불린다
export function Temperature({cityData}) {
  const getWeekReport = cache(calculateWeekReport)
  const report = getWeekReport(cityData)
  return <p>{report}</p>
}
```

공식 문서는 이걸 안티패턴으로 못 박는다 — wrapper가 매 렌더 새로 생기니 "creates a new memoized function each time the component is rendered which doesn't allow for any cache sharing"라고([cache – React 공식 문서](https://react.dev/reference/react/cache)). 그런데 **소스 기준으로는 틀린 설명이다.** 앞서 봤듯 루트 노드의 키는 wrapper가 아니라 원본 `fn`(`calculateWeekReport`)이고, 그건 모듈 레벨이라 매번 같다. wrapper를 매 렌더 새로 만들어 버려도 호출 시점엔 전부 같은 요청 단위 WeakMap에서 같은 `calculateWeekReport` 키로 같은 노드에 도착한다. 그래서 **같은 인자로 부르는 한 캐시는 실제로 공유된다.** 다른 컴포넌트가 `cache(calculateWeekReport)`를 따로 감싸 불러도 마찬가지다 — 문서 표현과 달리 공유는 된다.

캐시를 정말로 깨뜨리는 건 wrapper의 정체성이 아니다. (1) `cache((c) => …)`처럼 **`fn`을 컴포넌트 안에서 인라인 정의**해 `fn` 레퍼런스가 매 렌더 바뀌거나, (2) **인자를 매번 새 객체로** 넘기는 경우(아래 2단계)다. 위 예제는 둘 다 아니라서 사실은 동작한다.

그렇다면 왜 여전히 "모듈 레벨에서 한 번만 감싸라"고 할까. 공유가 되더라도 — 매 렌더 throwaway wrapper를 만드는 사소한 비용, 문서가 보장하지 않는 동작에 기대는 취약함, 누군가 `fn`을 인라인으로 바꾸는 순간 조용히 깨지는 위험 때문이다. 권장 형태는 전용 모듈에서 한 번만 감싸고 import해 쓰는 것이다.

```tsx
// getWeekReport.js — 전용 모듈에서 한 번만 정의
import {cache} from 'react'
export default cache(calculateWeekReport)

// 사용처: 같은 메모이즈 함수를 import해서 공유
import getWeekReport from './getWeekReport'

export function Temperature({cityData}) {
  const report = getWeekReport(cityData) // 트리 어디서 불러도 같은 캐시
  return <p>{report}</p>
}
```

"모듈 레벨에서 한 번만 감싸라"는 규칙은 캐시를 _동작하게 만드는_ 필수 조건이라서가 아니라 — `fn` 레퍼런스를 안정적으로 고정하고 위 세 취약함을 한 번에 없애기 때문에 권장된다.

### 2단계: 인자는 트리를 한 단계씩 내려간다

루트 노드를 잡았으면 인자 배열을 순회하며 한 단계씩 내려간다. 분기 조건이 핵심이다.

```js
if (typeof arg === 'function' || (typeof arg === 'object' && arg !== null)) {
  // 객체/함수 → WeakMap (레퍼런스 키)
} else {
  // 원시값 → Map (값 키)
}
```

객체와 함수는 노드의 `o`(WeakMap)에 **레퍼런스 그 자체를 키로** 들어간다. 문자열·숫자·boolean·`undefined`, 그리고 `null`은 `p`(Map)에 **값을 키로** 들어간다. `typeof null === 'object'`라는 자바스크립트의 유명한 함정을 `arg !== null` 가드가 막아, `null`은 원시 쪽 Map으로 라우팅된다.

이 분기가 **객체 인자의 위험**을 설명한다. 공식 문서는 "shallow equality, `Object.is`로 비교한다"고 표현하지만, 실제 룩업은 그냥 Map/WeakMap의 키 동등성이다. 객체 인자는 결국 레퍼런스 동등성으로 귀결된다. 그래서 이런 코드가 조용히 망가진다.

```tsx
// data.js
import {cache} from 'react'
export const getReport = cache((opts) => calc(opts.x, opts.y, opts.z))

// Cell.tsx (Server Component)
function Cell({x, y, z}) {
  // 🚩 매 렌더 새 객체 리터럴 → WeakMap이 매번 다른 키 → 항상 miss
  const report = getReport({x, y, z})
  return <pre>{report}</pre>
}
```

`{x, y, z}`는 값이 같아도 매번 새 객체다. WeakMap 입장에서는 매번 다른 키라 캐시가 한 번도 안 맞는다. 해법은 둘이다 — **원시값으로 풀어서 넘기거나**, **안정적인 레퍼런스를 공유하거나.**

```tsx
// (a) 원시값으로: 원시 Map은 값을 키로 쓰니 같은 값이면 히트
export const getReport = cache((x, y, z) => calc(x, y, z))
function Cell({x, y, z}) {
  return <pre>{getReport(x, y, z)}</pre>
}

// (b) 안정적 레퍼런스 공유: 한 번 만든 객체를 여러 곳에 그대로 전달
function App() {
  const vector = [10, 10, 10] // 한 번만 생성
  return (
    <>
      <Marker vector={vector} />
      <Marker vector={vector} /> {/* 같은 레퍼런스 → 히트 */}
    </>
  )
}
```

트리라는 점도 짚어둘 만하다. 인자가 `(a, b, c)`면 루트 → `a` 노드 → `b` 노드 → `c` 노드로 세 단계를 내려가고, 마지막 노드에 결과가 매달린다. 인자 순서대로 가지가 갈리므로, 앞 인자가 같고 뒤가 다르면 중간 노드까지는 경로를 공유한다. 가변 인자도 자연스럽게 처리된다 — 인자 개수만큼만 내려가면 되니까.

### 3단계: 마지막 노드의 상태로 분기

인자를 다 내려가면 도착한 노드의 `s`를 본다.

- `TERMINATED`(1)면 저장된 `v`를 그대로 반환. **캐시 히트.**
- `ERRORED`(2)면 저장된 에러 `v`를 다시 `throw`. **에러도 캐시된다.**
- 그 외(`UNTERMINATED`)면 `fn`을 실행하고, 결과를 `TERMINATED`로(또는 던져진 에러를 `ERRORED`로) 저장한 뒤 반환.

여기서 두 가지 디테일이 나온다. 하나는 반환값 저장 방식, 하나는 에러 캐싱의 비대칭. 각각 절을 따로 둘 만큼 중요하다. 그 전에, 이 모든 게 "요청 단위"인 이유부터 마무리하자.

## 요청 단위 격리는 어디서 오는가

지금까지 `ReactCacheImpl.js`에는 "요청"이라는 단어가 한 번도 안 나왔다. 트리도, 노드도 요청을 모른다. **요청 단위 격리는 `cache()` 구현이 아니라 디스패처가 제공한다.** 정확히는 `getCacheForType`이.

`cache()`가 부르는 건 `dispatcher.getCacheForType(createCacheRoot)` 한 줄이었다. 이 디스패처는 Flight 서버 런타임이 꽂아둔 것이고, `getCacheForType`은 **현재 Request의 캐시 저장소**를 읽는다. 대략 이렇게 생겼다[^5].

```js
// Flight 서버의 getCacheForType (개념적으로)
function getCacheForType(resourceType) {
  const cache = getCache() // 현재 Request의 cache — 평범한 Map
  let entry = cache.get(resourceType)
  if (entry === undefined) {
    entry = resourceType() // 처음이면 팩토리 호출 → createCacheRoot() → 새 WeakMap
    cache.set(resourceType, entry)
  }
  return entry
}
```

그리고 Flight 서버는 **요청(Request)마다** 새 저장소를 만든다.

```js
// ReactFlightServer.js의 Request 인스턴스 (발췌)
this.cache = new Map()
this.cacheController = new AbortController()
```

여기서 캐시 계층이 두 겹이라는 걸 헷갈리면 안 된다.

1. **`request.cache`** 는 평범한 `Map`이다. 키는 `resourceType`, 즉 `cache()`가 넘긴 `createCacheRoot` 팩토리 함수다.
2. 그 Map이 돌려주는 값이 **`createCacheRoot()`가 만든 `WeakMap`**이다. `cache()` 내부 트리의 루트가 바로 이것이다.

모든 `cache()` 호출은 같은 모듈 레벨 `createCacheRoot` 레퍼런스를 넘기므로, 한 요청 안에서는 전부 **같은 WeakMap 하나**를 공유한다. 그 WeakMap 안에서 다시 `fn`별로 갈리고, 인자별로 트리가 갈린다. 요청이 바뀌면 `request.cache`가 새 Map이 되니 `createCacheRoot`도 다시 호출되어 WeakMap이 새로 만들어진다. **그래서 다음 요청에서는 처음부터 다시다.**

> 디스패처 객체 자체는 프로세스 전역이지만, 그게 돌려주는 캐시는 "현재 Request"의 것이다. 그래서 **디스패처를 공유한다고 캐시가 공유되는 게 아니다.** 동시에 들어온 두 요청은 각자의 Request → 각자의 `cache` Map → 격리된 캐시를 받는다. 유저 A의 `getUser('me')` 결과가 유저 B에게 새는 일이 구조적으로 불가능한 이유다.

"현재 Request"를 어떻게 찾느냐가 마지막 퍼즐이다. 동기 실행 구간에서는 모듈 레벨 `currentRequest` 변수로, `await`를 건너 비동기로 이어지는 구간에서는 Node의 `async_hooks` 기반 `AsyncLocalStorage`로 현재 요청을 해소한다[^5]. 비동기 경계를 넘어도 같은 요청의 캐시를 보게 만드는 장치다.

한 가지 더 — **요청 내부에는 eviction이 없다.** TTL도, LRU도, 크기 제한도 없다. 한 번 캐시된 값은 요청이 끝날 때까지 그대로 남고, 요청이 끝나면 Request와 함께 통째로 버려진다. 객체 키 하위 트리는 WeakMap이라 키 객체가 어디서도 참조되지 않으면 GC 대상이 될 수는 있지만, 이건 의도된 캐시 정책이 아니라 부수효과다. `cache()`는 **읽기 메모이제이션 프리미티브**지 관리되는 캐시 스토어가 아니다.

> Next.js App Router가 이걸 어떻게 엮는지는 React 소스만으로 단정하긴 어렵다. 다만 App Router가 RSC를 렌더할 때 Flight Request를 만드는 구조이므로, 실무적으로 `cache()`의 캐시 수명은 **"한 라우트의 한 서버 렌더, 한 요청"**과 정렬된다고 보면 된다. (이 부분은 React의 요청 단위 의미로부터의 동작 추론이고, Next 내부 콜사이트를 직접 확인한 건 아니다.)

## 반환값은 레퍼런스로 저장된다: preload와 in-flight 공유

3단계의 캐시 미스 처리를 다시 보자.

```js
const result = fn.apply(null, arguments)
cacheNode.s = TERMINATED
cacheNode.v = result
return result
```

`await`도, `.then`도 없다. **`fn`의 반환값을 레퍼런스 그대로 저장한다.** `fn`이 async 함수면 `result`는 Promise 객체이고, 그 **같은 Promise**가 노드에 박힌다.

이게 별것 아닌 것 같지만 강력한 결과를 낳는다. 트리 곳곳에서 같은 인자로 cached async 함수를 부르면, 첫 호출이 만든 **하나의 in-flight Promise**를 모두가 공유한다. DB 쿼리는 한 번만 나가고, 나머지 `await`는 같은 프로미스가 resolve되기를 같이 기다린다. fetch는 자동으로 dedup되지만 DB·ORM 쿼리는 그렇지 않은데, `cache()`가 바로 그 빈자리를 메운다.

이 성질이 **`preload` 패턴**의 토대다. 데이터가 필요한 컴포넌트가 렌더되기 전에, 미리 한 번 호출해 작업을 시작시켜 두는 것이다.

```tsx
// user.js
import {cache} from 'react'
export const getUser = cache((id: string) => db.user.findById(id))
export function preload(id: string) {
  void getUser(id) // 결과를 안 쓰고 버린다 — 목적은 "시작"
}

// page.tsx
import {getUser, preload} from './user'

export default async function Page({id}: {id: string}) {
  preload(id) // 자식이 렌더되기 전에 쿼리를 미리 발사
  return <Profile id={id} />
}

// profile.tsx
async function Profile({id}: {id: string}) {
  const user = await getUser(id) // 같은 in-flight 프로미스에 히트 — 추가 쿼리 없음
  return <h1>{user.name}</h1>
}
```

`preload(id)`가 발사한 프로미스가 캐시에 저장되어 있으니, 나중에 `Profile`이 `await getUser(id)`를 해도 같은 프로미스를 받는다. 워터폴(부모 fetch 끝나야 자식 fetch 시작)을 한 단계 줄이는 흔한 기법이다.

> 단, `preload`를 **컴포넌트 안에서** 호출해야 한다는 점을 잊으면 안 된다. 모듈 최상위에서 `getUser('demo')`를 부르면? 디스패처가 없으니 캐싱 없이 그냥 실행되고, 정작 컴포넌트가 부를 때는 빈 캐시라 또 실행된다. 앞 절의 디스패처 가드가 여기서도 작동한다.

## 에러 캐싱의 비대칭: 동기 throw vs async rejection

3단계의 `try/catch`를 다시 보자.

```js
try {
  const result = fn.apply(null, arguments)
  cacheNode.s = TERMINATED
  cacheNode.v = result
  return result
} catch (error) {
  cacheNode.s = ERRORED
  cacheNode.v = error
  throw error
}
```

`try/catch`는 `fn.apply`가 **동기적으로 던지는 throw만** 잡는다. 동기 함수가 throw하면 노드는 `ERRORED`가 되고, 같은 인자로 다시 부르면 저장된 에러가 그대로 다시 던져진다. 소스 주석 그대로 — "We store the first error that's thrown and rethrow it."

그런데 **async 함수는 동기적으로 throw하지 않는다.** 내부에서 에러가 나도 async 함수는 _정상적으로_ "나중에 거부될 Promise"를 반환한다. 그러니 `try/catch`는 발동하지 않고, 노드는 `ERRORED`가 아니라 `TERMINATED`가 된다. 저장되는 `v`는 **그 거부될 프로미스 자체**다.

결과적으로 이렇게 된다.

```tsx
export const getUser = cache(async (id: string) => {
  const res = await fetch(`/api/user/${id}`)
  if (!res.ok) throw new Error('fetch failed') // 동기 throw가 아니다 → 거부 프로미스
  return res.json()
})
```

첫 호출이 거부되면, **같은 요청 안의 모든 후속 `await getUser(id)`는 동일한 거부 프로미스를 받는다.** `fetch`는 다시 실행되지 않는다. 즉 같은 요청에서는 실패도 한 번 캐시되면 재시도가 없다.

정리하면 이렇다.

| 케이스              | 노드 상태    | 저장되는 값         | 같은 요청 재호출 시                     |
| ------------------- | ------------ | ------------------- | --------------------------------------- |
| 동기 함수가 `throw` | `ERRORED`    | 던져진 에러         | 저장된 에러를 다시 `throw`              |
| async 함수가 reject | `TERMINATED` | 거부될 Promise      | 같은 거부 프로미스 재사용 (재시도 없음) |
| 정상 반환           | `TERMINATED` | 결과 (또는 Promise) | 같은 값/프로미스 재사용                 |

소스 레벨로 보면 `ERRORED` 상태는 동기 throw 전용이 맞다. 하지만 **관측되는 동작**으로 보면 async 실패도 거부 프로미스 재사용을 통해 사실상 캐시된다. 공식 문서가 sync/async를 구분하지 않고 그냥 "cachedFn will also cache errors"라고만 적은 것도 이 때문이다.

실무 함의는 하나다. **같은 요청 안에서 재시도가 필요한 호출을 `cache()`로 감싸면 안 된다.** 한 번 실패하면 그 요청 내내 같은 실패를 돌려받는다. 재시도 로직이 필요하면 `cache()` 바깥에 두거나, 실패를 캐시하면 안 되는 호출은 아예 감싸지 않는다.

## cacheSignal: 요청이 끝나면 끊기는 신호

`ReactCacheImpl.js`에는 `cache` 옆에 작은 동반 API가 하나 더 있다. 다만 `cache()`보다 나중에 나왔다 — `cache()`는 React 19.0.0부터지만 `cacheSignal()`은 19.2.0부터 stable이다.

```js
export function cacheSignal() {
  const dispatcher = ReactSharedInternals.A
  if (!dispatcher) return null
  return dispatcher.cacheSignal()
}
```

패턴은 `cache()`와 똑같다 — 디스패처가 없으면 `null`. 디스패처가 있으면 그 요청의 `AbortSignal`을 돌려준다. 앞에서 Request가 `this.cacheController = new AbortController()`를 들고 있던 걸 떠올리면 된다. `cacheSignal()`이 돌려주는 게 그 컨트롤러의 시그널이다.

쓸모는 명확하다. 캐시된 async 작업에 이 시그널을 넘겨두면, **요청이 끝나(또는 중단되어) 캐시가 폐기될 때 그 작업도 같이 abort된다.**

```tsx
import {cache, cacheSignal} from 'react'

export const getUser = cache((id: string) =>
  fetch(`/api/user/${id}`, {signal: cacheSignal() ?? undefined}),
)
```

요청이 끊겼는데도 백그라운드 fetch가 끝까지 살아 리소스를 잡는 상황을 막는 장치다. 요청 단위로 사는 캐시에 요청 단위로 죽는 신호를 짝지은 셈이다.

> 비슷한 이름의 다른 디스패처도 있다. 리코실리어(Fiber/SSR) 쪽에도 `getCacheForType`을 가진 별도의 `DefaultAsyncDispatcher`가 있는데, 이건 `CacheContext`에서 `<Cache>` 경계의 데이터를 읽어 `use()`/Suspense 캐시를 구동하는 **다른 경로**다[^6]. `cache()` 함수는 문서상 Server Components로 스코프가 한정되므로, 이 Fiber 경로를 `cache()`의 동작으로 섞어 이해하지 않는 게 좋다. 같은 `getCacheForType`이라는 이름을 공유할 뿐, 유저랜드 `cache()`가 직접 타는 길은 Flight 서버 디스패처다.

## 그래서 언제 쓰나

구현을 다 봤으니 실무 판단으로 돌아온다. `cache()`의 자리는 생각보다 좁고 분명하다.

**쓰기 좋은 곳.** 한 RSC 렌더 안에서 같은 데이터를 여러 컴포넌트가 필요로 할 때다. 레이아웃과 페이지가 둘 다 현재 유저를 조회한다거나, 사이드바와 본문이 같은 설정을 읽는다거나. fetch가 아닌 **DB·ORM 쿼리의 요청 단위 중복 제거**, 그리고 **비싼 계산을 트리 전체에서 한 번만** 하는 용도. `preload`로 워터폴을 줄이는 것도 여기 포함된다. 공통점은 전부 "한 요청, 한 렌더 안에서의 공유"라는 것이다.

**쓰면 안 되는 곳.** 요청을 넘겨 살아남아야 하는 캐시. 그건 `cache()`가 아니라 [`'use cache'`](/2026/05/use-cache-deep-dive)나 `unstable_cache`, 또는 Data Cache의 일이다. `cache()`는 다음 요청이 오면 빈손이다. 클라이언트 데이터 캐싱도 `cache()` 영역이 아니다 — 거기선 `cache()`가 no-op이니 React Query나 SWR을 쓴다. 같은 요청 안에서 재시도가 필요한 호출도 앞서 봤듯 부적합하다.

판단을 한 줄로 줄이면 이렇다. **"이 결과를 _이번 렌더 안에서_ 다시 쓰는가?"** 그렇다면 `cache()`다. "요청이 끝난 뒤에도 재사용하고 싶은가?"라면 다른 도구를 봐야 한다.

## Next.js에서 실제로 쓸 일이 있나

App Router를 쓰면 한 가지가 걸린다. Next가 `fetch`를 자동으로 dedup하기 때문이다. 같은 URL·옵션의 GET `fetch`는 한 렌더 안에서 [자동으로 메모이즈](https://nextjs.org/docs/app/api-reference/functions/fetch#memoization)된다(React의 request memoization). 그래서 **`fetch`는 `cache()`로 감쌀 필요가 없다.** 공식 문서도 "React cache로 감쌀 필요 없다"고 못 박는다.

그럼 `cache()`의 자리는 어디인가. **`fetch`가 아닌 것** 전부다. Next 공식 문서가 직접 권장한다 — "ORM이나 데이터베이스를 직접 쓴다면 React `cache`로 감싸 한 렌더 안의 중복 호출을 제거하라"며 [Drizzle 예제](https://nextjs.org/docs/app/guides/caching-without-cache-components#deduplicating-requests)를 든다. Prisma·Drizzle·raw SQL은 `fetch`처럼 자동 dedup되지 않는다. 이걸 fetch처럼 알아서 합쳐진다고 착각하는 게 가장 흔한 실수다.

가장 대표적인 패턴은 **인증 DAL(Data Access Layer)**이다. `getCurrentUser()`나 `verifySession()`을 `cache()`로 감싸두면, 레이아웃·페이지·말단 컴포넌트·Server Action이 제각기 호출해도 DB 조회와 세션 복호화가 요청당 한 번만 일어난다. Next의 [Authentication](https://nextjs.org/docs/app/guides/authentication)·[Data Security](https://nextjs.org/docs/app/guides/data-security) 가이드가 미는 정석 패턴이고, `cookies()` 같은 요청 단위 동적 값은 `'use cache'`로 감쌀 수 없으니 여기서는 `cache()`가 정답이다.

오해 하나만 더. `cache()`는 `'use cache'`에 밀려난 게 아니다. 둘은 **직교**한다 — `cache()`는 요청 단위 dedup, `'use cache'`는 요청을 넘는 영속 캐시. Next 16에서 대체되는 건 `cache()`가 아니라 `unstable_cache`(→ `'use cache'`)다. `cache()`는 이전 모델과 Cache Components 모델 양쪽에서 그대로 유효하고, 공식 문서도 현행으로 권장한다.

정리하면, **Next.js에서 `cache()`는 좁지만 분명한 자리가 있다.** fetch만 쓰는 앱이면 평생 안 쓸 수도 있지만, ORM·세션·권한이 얽힌 진지한 서버 트리에서는 사실상 필수에 가깝다.

## 마치며

`cache()`는 30여 줄짜리 함수다. 그 안에 마법은 없다.

- 디스패처가 없으면 캐싱을 건너뛴다. → **RSC 전용이고, 컴포넌트 밖·클라이언트에서는 no-op이다.**
- 캐시는 함수 레퍼런스와 인자로 만든 트리고, 객체는 레퍼런스를 키로 WeakMap에 들어간다. → **매 렌더 새 객체를 넘기면 항상 미스고, 모듈 레벨에서 한 번만 감싸야 한다.**
- 캐시 저장소는 디스패처가 요청마다 새로 만드는 Map 안에 산다. → **요청·유저 간에 절대 공유되지 않고, 요청이 끝나면 폐기된다.**
- 반환값은 레퍼런스 그대로 저장된다. → **async면 같은 프로미스를 공유해 요청을 dedup하고, `preload`가 동작하며, 실패는 같은 요청 안에서 재시도되지 않는다.**

문서의 규칙을 외우는 대신 구현 하나를 읽으면, 그 규칙들이 전부 "그럴 수밖에 없는 것"으로 바뀐다. `cache()`가 헷갈렸다면 그건 API가 복잡해서가 아니라, 이 함수가 **요청 하나의 수명에 단단히 묶인 메모이제이션**이라는 한 가지 사실을 안 보고 규칙만 봤기 때문이다. 디스패처, 트리, 요청 단위 Map — 이 셋이 그 한 가지 사실의 세 얼굴이다.

## 참고

- [cache – React 공식 문서](https://react.dev/reference/react/cache)
- [`facebook/react` — ReactCacheImpl.js](https://github.com/facebook/react/blob/v19.2.6/packages/react/src/ReactCacheImpl.js)
- [`facebook/react` — ReactFlightServer.js](https://github.com/facebook/react/blob/v19.2.6/packages/react-server/src/ReactFlightServer.js)
- [Deduplicating requests with React cache – Next.js 공식 문서](https://nextjs.org/docs/app/guides/caching-without-cache-components#deduplicating-requests)
- [`'use cache'` 디렉티브 딥다이브: 캐시 경계의 끝까지](/2026/05/use-cache-deep-dive)

[^1]: [cache – React 공식 문서](https://react.dev/reference/react/cache) — `cache()`의 시그니처, 스코프(요청 단위, RSC 전용), 인자 shallow equality(`Object.is`), 에러 캐싱, `preload`/스냅샷 공유 사용 사례, "컴포넌트 밖에서는 캐시를 쓰지 않음" 등 모든 공식 규칙의 출처. `cache()`는 React 19에서 stable로 도입됐다.

[^2]: [`facebook/react` — packages/react/src/ReactCacheImpl.js](https://github.com/facebook/react/blob/v19.2.6/packages/react/src/ReactCacheImpl.js) — `cache()`/`cacheSignal()`의 실제 구현. 상태 sentinel(`UNTERMINATED=0`/`TERMINATED=1`/`ERRORED=2`), 노드 형태 `{s, v, o, p}`, 디스패처 가드, WeakMap/Map 트리 순회, 에러 캐싱 로직.

[^3]: [`facebook/react` — packages/react/src/ReactCacheClient.js](https://github.com/facebook/react/blob/v19.2.6/packages/react/src/ReactCacheClient.js) — 클라이언트 엔트리의 `cache = disableClientCache ? noopCache : cacheImpl`. `ReactFeatureFlags.js`의 `disableClientCache = true` 기본값과 `noopCache`의 "client caching을 향후 메이저에 구현 예정" 주석.

[^4]: [`facebook/react` — packages/react/src/ReactSharedInternalsClient.js](https://github.com/facebook/react/blob/v19.2.6/packages/react/src/ReactSharedInternalsClient.js) — `ReactSharedInternals.A`(AsyncDispatcher) 슬롯. 주석상 `ReactCurrentCache`. `getCacheForType`/`cacheSignal` 계약을 정의한다.

[^5]: [`facebook/react` — packages/react-server/src/ReactFlightServer.js](https://github.com/facebook/react/blob/v19.2.6/packages/react-server/src/ReactFlightServer.js) — 요청 단위 캐시의 출처. Request 인스턴스의 `this.cache = new Map()`, `this.cacheController = new AbortController()`, `getCache(request)`/`resolveRequest()`, `currentRequest`/`AsyncLocalStorage`(`requestStorage`, `async_hooks`)를 통한 현재 요청 해소. `getCacheForType` 자체는 sibling 모듈 `flight/ReactFlightAsyncDispatcher.js`의 `DefaultAsyncDispatcher`에 있고, 그게 `getCache(request)`로 이 Map을 읽는다.

[^6]: [`facebook/react` — packages/react-reconciler/src/ReactFiberAsyncDispatcher.js](https://github.com/facebook/react/blob/v19.2.6/packages/react-reconciler/src/ReactFiberAsyncDispatcher.js) — 리코실리어(Fiber/SSR)의 `DefaultAsyncDispatcher`. `readContext(CacheContext)`로 `<Cache>` 경계의 데이터를 읽는 별개 경로로, `use()`/Suspense 캐시를 구동한다. 유저랜드 `cache()`와 혼동하지 말 것.
