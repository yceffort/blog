---
title: 'Render nothing, faster: <></>, null, 그리고 hook'
marp: true
paginate: true
theme: default
tags:
  - react
  - performance
date: 2026-04-07
description: '아무것도 렌더링하지 않는 두 가지 흔한 패턴을 JSX runtime/reconciler 관점에서 다시 보기'
published: true
---

# Render nothing, faster

`<></>`, `null`, 그리고 훅으로 컴포넌트 없애기

<!-- _class: invert -->

@yceffort · 2026-04-07

---

## 오늘 다룰 두 가지 안티패턴

```jsx
// 패턴 A — 빈 fragment를 placeholder로
return condition ? <Foo /> : <></>

// 패턴 B — 화면에 아무것도 안 그리는 컴포넌트
function Analytics({event}) {
  useEffect(() => track(event), [event])
  return null
}
```

> 둘 다 동작은 똑같음. 그런데 React가 보는 비용은 다름.

---

## 잠깐, 용어 정리

이야기 따라가려면 두 단어만 구분되면 됨.

- **ReactElement** — JSX가 컴파일되면 만들어지는 _순수한 자바스크립트 객체_. "이 자리에 이런 컴포넌트를 그려달라"는 **명세서**라고 보면 됨.
- **Fiber** — React가 그 명세서를 보고 내부에 만드는 _작업 단위_. 실제로 렌더/effect/DOM 반영을 수행하는 **작업자**이며, 부모/자식/형제 포인터를 가짐.

명세서는 매 렌더마다 새로 만들어지지만, fiber는 가능하면 재사용됨. 우리가 줄이려는 비용은 **명세서 할당**과 **fiber 생성/유지**, 두 종류임.

---

## Part 1 — `<></>` vs `null`

PR 리뷰에서 자주 그냥 지나가는 코드.

```jsx
// Before
return condition ? <Toast /> : <></>

// After
return condition ? <Toast /> : null
```

같은 화면이 나옴. 그런데 컴파일된 결과부터 다름.

---

## JSX는 누가 변환하나

Babel(`@babel/plugin-transform-react-jsx`) 또는 SWC가 JSX를 함수 호출로 바꿈.

```js
// JSX
;<></>

// 컴파일 후 (react/jsx-runtime)
_jsx(_Fragment, {})
```

`_jsx`는 React 패키지 안에 있는 함수임 — `react/jsx-runtime`이 export하는 `jsxProd`.

> 출처: [`packages/react/src/jsx/ReactJSXElement.js#L293`](https://github.com/facebook/react/blob/v19.0.0/packages/react/src/jsx/ReactJSXElement.js#L293-L363)

---

## `_jsx`가 매번 만드는 객체

`jsxProd`의 마지막 줄은 `ReactElement(...)` 호출이고, 이 함수는 **매번 새 객체**를 만듦.

```js
// packages/react/src/jsx/ReactJSXElement.js (요약)
element = {
  $$typeof: REACT_ELEMENT_TYPE,
  type, // <- _Fragment 심볼
  key, // <- null
  ref, // <- null
  props, // <- {} 빈 객체
}
```

> 출처: [`ReactJSXElement.js#L161-L238`](https://github.com/facebook/react/blob/v19.0.0/packages/react/src/jsx/ReactJSXElement.js#L161-L238)

`<></>` 한 번에 객체 2개(element + props)가 할당됨. `null`은 0개.

---

## reconciler까지 가면 — 단일 자식일 때

`return ... : <></>` 처럼 빈 fragment가 부모의 *단일 자식*으로 들어오는 경우는 사실 fiber까지 안 만듦.

```js
// packages/react-reconciler/src/ReactChildFiber.js
const isUnkeyedTopLevelFragment =
  typeof newChild === 'object' &&
  newChild !== null &&
  newChild.type === REACT_FRAGMENT_TYPE &&
  newChild.key === null
if (isUnkeyedTopLevelFragment) {
  validateFragmentProps(newChild, null, returnFiber)
  newChild = newChild.props.children // <- undefined로 풀어버림
}
```

> 출처: [`ReactChildFiber.js#L1762-L1770`](https://github.com/facebook/react/blob/v19.0.0/packages/react-reconciler/src/ReactChildFiber.js#L1762-L1770)

---

## 그래서 단일 자식일 때 비용은

`undefined`가 된 newChild는 함수 마지막의 fallthrough로 빠짐.

```js
// 같은 파일 L1924
// Remaining cases are all treated as empty.
return deleteRemainingChildren(returnFiber, currentFirstChild)
```

> 출처: [`ReactChildFiber.js#L1924-L1925`](https://github.com/facebook/react/blob/v19.0.0/packages/react-reconciler/src/ReactChildFiber.js#L1924-L1925)

| 단계        | `<></>`                 | `null` |
| ----------- | ----------------------- | ------ |
| 객체 할당   | 2 (element + props)     | 0      |
| 검사·unwrap | 4가지 조건 + props 접근 | 0      |
| fiber 생성  | 0                       | 0      |
| 최종 분기   | deleteRemainingChildren | 동일   |

fiber까진 안 가도 **객체 할당과 분기 비용은 매 렌더 발생**함.

---

## 형제 자리에 끼면 이야기가 달라짐

```jsx
return (
  <>
    <Header />
    {showAd ? <Ad /> : <></>}
    <List />
  </>
)
```

이렇게 형제들 사이에 `<></>` 가 끼면, React 입장에서 그것은 **children 배열의 한 자리를 차지하는 자식**임. 앞 슬라이드에서 봤던 *빈 fragment를 그냥 통과시키는 단축 경로*는 여기엔 적용되지 않음 — 그 단축 경로는 "fragment가 부모의 단일 자식일 때"만 동작함.

---

## 그래서 fragment fiber가 진짜로 만들어짐

```js
// packages/react-reconciler/src/ReactChildFiber.js L1676
if (element.type === REACT_FRAGMENT_TYPE) {
  const created = createFiberFromFragment(
    element.props.children,
    returnFiber.mode,
    lanes,
    element.key,
  )
  // ...
}
```

`<></>`마다 fragment fiber가 매 렌더 새로 생기고, 다음 렌더에 다시 reconcile되고, 사라질 때 cleanup도 됨. 자식이 0개여도 그렇음.

> 출처: [`ReactChildFiber.js#L1676-L1693`](https://github.com/facebook/react/blob/v19.0.0/packages/react-reconciler/src/ReactChildFiber.js#L1676-L1693)

---

## `<Ad />` ↔ `<></>` 토글의 비용

```jsx
{
  showAd ? <Ad /> : <></>
}
```

`showAd`가 토글될 때마다 같은 자리의 element `type`이 `Ad` 와 `Fragment` 사이를 왔다 갔다 함.

React 형제 매칭 규칙: **같은 자리에 다른 type이 오면 그 자리의 fiber를 unmount하고 새로 mount함.** 즉 토글 한 번마다:

- 이전 fiber(`Ad` 또는 `Fragment`) 통째로 destroy + cleanup effect 실행
- 새 fiber 생성 + mount effect 실행

`null`로 두면 그 자리는 그냥 *비어 있는 자식*으로 처리됨. type이 바뀔 일도, fiber를 만들었다 부수는 비용도 없음.

> 빈 fragment는 화면엔 안 보여도 **자리는 차지하는** 자식임.

---

## Part 1 결론

> 렌더할 게 없으면 `<></>` 가 아니라 `null`.

- 단일 자식일 때 — 객체 2개 할당이 사라짐
- 형제 자리에 끼면 — fragment fiber까지 안 만들고, 옆 형제 reconciliation도 안정적임
- 의미적으로도 더 명확함 ("아무것도 그리지 않겠다")

단, 오해 금지.

- `return <></>` ❌ — 그냥 `null`
- `return <>{a}{b}</>` ✅ — 여러 자식을 묶을 때의 fragment는 전혀 다른 이야기

---

## Part 2 — `return null` 컴포넌트 vs 훅

이런 컴포넌트, 한 번쯤 본 적 있을 것임.

```jsx
function KeyboardShortcut({combo, onTrigger}) {
  useEffect(() => {
    const h = (e) => match(e, combo) && onTrigger()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [combo, onTrigger])
  return null
}
```

부모(`CommandHost`) 어딘가에서 `<KeyboardShortcut combo="cmd+k" onTrigger={openPalette} />` 처럼 박아 둠. 이거 왜 컴포넌트지?

---

## React가 매 렌더마다 하는 일

부모(`CommandHost`)가 한 번 그려질 때 `<KeyboardShortcut .../>` 한 줄 때문에 다음 일이 벌어짐.

1. `_jsx(KeyboardShortcut, { combo, onTrigger })` — **ReactElement 객체 1개 할당**
2. reconciler가 child 위치에서 **fiber 1개 생성/갱신** (이전 fiber와 매칭)
3. props 비교 (`combo`, `onTrigger` 얕은 비교)
4. `KeyboardShortcut` 함수 호출 — **콜 스택에 프레임 1개 더**
5. 내부 훅 실행 (`useEffect`)
6. `return null` → 하위 자식 없음으로 마무리
7. DevTools 트리에 노드 1개가 그대로 남음

산출물은 **0픽셀**.

---

## 훅으로 옮기면

```jsx
function useKeyboardShortcut(combo, onTrigger) {
  useEffect(() => {
    const h = (e) => match(e, combo) && onTrigger()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [combo, onTrigger])
}

function CommandHost() {
  useKeyboardShortcut('cmd+k', openPalette)
  return <Palette />
}
```

- ReactElement 할당 ❌
- 자식 fiber ❌
- 함수 호출이 한 단계 줄어듦 — 부모 fiber의 hook chain에 슬롯 하나만 추가됨
- DevTools 트리도 깔끔해짐

---

## 그래서 얼마나 더 가벼워지나

한 컴포넌트를 훅으로 바꿀 때마다 절약되는 것.

- ReactElement 객체 1개 (+ props 객체 1개)
- fiber 노드 1개 (React가 더블 버퍼링 때문에 같은 fiber를 두 벌 들고 있어서, 메모리상으론 사실 2개임)
- 함수 호출 1프레임 + props 얕은 비교 1회
- DevTools 트리 노이즈 1개

**한 곳에서는 미세함.** 그런데:

- 가상 리스트 row마다 박혀 있는 `<RowAnalytics />` 500개 → 그대로 500배
- 매 키 입력마다 리렌더되는 폼에서는 곱셈이 더 가파름

> React에게 일을 시키지 않는 게 가장 빠른 최적화.

---

## 변환 규칙

> 렌더 산출물이 항상 `null`인 컴포넌트 → **훅으로 옮긴다.**

거의 모든 케이스가 여기에 해당함.

- 동적 개수의 등록도 → `useFoos(items)` 처럼 배열 받는 훅 하나로 가능
- 조건부 mount/unmount cleanup도 → `useFoo(active)` + dep로 가능
- "이건 컴포넌트로만 되는데?" 싶은 사례는 거의 항상 *고민이 부족한 훅 설계*임

---

## 요약

|                         | 안티패턴      | 더 가벼운 쪽 |
| ----------------------- | ------------- | ------------ |
| 빈 자리                 | `<></>`       | `null`       |
| 화면 안 그리는 컴포넌트 | `return null` | 커스텀 훅    |

공통 원칙.

> **React가 하지 않아도 되는 일은 시키지 않음.**

작아 보이지만, 반복되는 곳에서는 측정 가능한 차이가 됨.

---

## 참고 — 직접 읽어볼 React 19 소스

- [`jsxProd` — `_jsx`의 본체](https://github.com/facebook/react/blob/v19.0.0/packages/react/src/jsx/ReactJSXElement.js#L293-L363)
- [`ReactElement` — 객체 만드는 factory](https://github.com/facebook/react/blob/v19.0.0/packages/react/src/jsx/ReactJSXElement.js#L161-L238)
- [`reconcileChildFibersImpl` — 자식 reconcile 진입점](https://github.com/facebook/react/blob/v19.0.0/packages/react-reconciler/src/ReactChildFiber.js#L1744-L1926)
- [top-level unkeyed fragment unwrap](https://github.com/facebook/react/blob/v19.0.0/packages/react-reconciler/src/ReactChildFiber.js#L1762-L1770)
- [형제 위치 fragment fiber 생성](https://github.com/facebook/react/blob/v19.0.0/packages/react-reconciler/src/ReactChildFiber.js#L1676-L1693)
- [empty fallthrough — `deleteRemainingChildren`](https://github.com/facebook/react/blob/v19.0.0/packages/react-reconciler/src/ReactChildFiber.js#L1924-L1925)
- React 공식 — [Conditional Rendering](https://react.dev/learn/conditional-rendering), [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
