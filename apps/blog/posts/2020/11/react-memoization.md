---
title: '리액트와 메모이제이션'
tags:
  - react
  - web-performance
  - caching
published: true
date: 2020-11-12 23:34:31
description: '블로그에서 계속 같은 글을 쓰는 것 같은데🤪'
---

## 메모이제이션

https://ko.wikipedia.org/wiki/%EB%A9%94%EB%AA%A8%EC%9D%B4%EC%A0%9C%EC%9D%B4%EC%85%98

> 메모이제이션(memoization)은 컴퓨터 프로그램이 동일한 계산을 반복해야 할 때, 이전에 계산한 값을 메모리에 저장함으로써 동일한 계산의 반복 수행을 제거하여 프로그램 실행 속도를 빠르게 하는 기술이다. 동적 계획법의 핵심이 되는 기술이다.

함수형 프로그래밍의 기본원칙을 잘 지켰다면, (어떠한 외부 부수 효과에 영향을 받지 않는다면) 어떤 input이 들어가도 그 input에 대한 output은 동일 할 것이고, 따라서 동일한 input이 들어온다면 미리 전에 계산해두었던 output을 그대로 돌려줘도 될 것이다.

```javascript
const cache = {}
function addTwo(input) {
  if (!cache[input]) {
    console.log('계산 중..')
    cache[input] = input + 2
  } else {
    console.log('계산된 값을 그대로 돌려드립니다.')
  }
  return cache[input]
}
```

```javascript
addTwo(2) // 계산 중..
4
addTwo(3) // 계산 중..
5
addTwo(2) // 계산된 값을 그대로 돌려드립니다.
4
```

예제의 연산 자체는 간단했지만, 연산이 복잡하다면 메모이제이션으로 분명히 이득을 볼 수가 있다.

또 한가지 메모이제이션의 이점은, 정말로 동일한 결과가 리턴된다는 것이다. 결과값이 원시값이 아닌경우, 주소를 비교하기 때문에 `===`이 성립하지 않는데, 메모이제이션을 한다면 정말로 똑같은 값을 리턴할 것이다. (기존에 가지고 있던 값을 그대로 돌려줄 것이므로)

## 리액트의 메모이제이션

리액트는 메모이제이션을 위한 세개의 api를 제공한다.

- [memo](https://ko.reactjs.org/docs/react-api.html#reactmemo)
- [useMemo](https://ko.reactjs.org/docs/hooks-reference.html#usememo)
- [useCallback](https://ko.reactjs.org/docs/hooks-reference.html#usecallback)

리액트 메모이제이션에서는 주목해야 할 부분이 있다. https://ko.reactjs.org/docs/hooks-faq.html#how-to-memoize-calculations

> The useMemo Hook lets you cache calculations between multiple renders by "remembering" the previous computation:

바로 이전의 값만 메모이제이션 한다는 것이다.

```javascript
const Memoized = React.memo(Component)
```

```html
<!-- 새롭게 렌더링 -->
<Memoized num="{1}" />
<!-- 직전 elements를 사용 -->
<Memoized num="{1}" />
<!-- 새롭게 렌더링 -->
<Memoized num="{2}" />
<!-- 새롭게 렌더링 -->
<Memoized num="{1}" />
```

`useMemo` `useCallback`도 마찬가지로, 직전의 값만 메모이제이션한다. 코드로 풀면 이런 느낌의 메모이제이션일 것이다.,

```javascript
let prevInput;
let prevResult;

function someFunction(input) {
  if (input !== prevInput) {
    prevResult = doSomethingHeavyJob....
  }

  prevInput = input
  return prevResult
}
```

## 메모이제이션의 이유

메모이제이션은 아래 두가지 이유때문에 한다고 볼 수 있다.

1. 비싼 연산을 반복하는 것을 피하여 성능을 향상시킨다
2. 안정된 값 제공

1번에 대해서는 모든 리액트 개발자들이 공감하고 있을 것이기 때문에 생략하고, 2번에 대해서 이야기 해보자.

```javascript
function App() {
  const [body, setBody] = useState()
  const fetchOptions = {
    method: 'POST',
    body,
    headers: {'content-type': 'application/json'},
  }

  const callApi = () => (body ? fetch('/url', fetchOptions) : null)

  useEffect(() => {
    const result = callApi()
    if (!result) return
  }, [callApi])

  return <>...</>
}
```

리액트에서 흔히 볼 수 있는 코드다. `useEffect`는 `deps`에 변경이 있을 때마다 실행된다. 여기에서는 `callApi`가 있으므로, `callApi`는 컴포넌트 내에서 매번 새롭게 렌더링 될 때마다 계속해서 만들어질 것이다.

따라서 이 값을 안정시키기 위해서 memoization을, 정확히는 `useCallback`을 사용해야 한다.

```javascript
const callApi = useCallback(
  () => (body ? fetch('/url', fetchOptions) : null),
  [body, fetchOptions],
)
```

그러나 `fetchOptions`역시 컴포넌트가 렌더링 될 때마다 새롭게 생성될 것이므로, `fetchOptions`도 memoization을 거쳐야 한다.

```javascript
const fetchOptions = useMemo(() => {
  return {
    method: 'POST',
    body,
    headers: {'content-type': 'application/json'},
  }
}, [body])
```

`fetchOptions`와 `callApi`를 오로지 `body`의 값이 변경될 때만 다시 연산하게 함으로써 값을 안정시킬 수 있다.

원하는 값을 memoization하기 위해서 중요한 것은 memoization에 필요한 값들을 안정화 시키는 것이다. `fetchOptions`의 `useMemo`를 사용하여 `callApi`에서 하고자하는 memoization을 안정적으로 달성할 수 있게 되었다.

물론, 위의 예제를 제대로 작성하기 위해선 아래와 같이 해야할 것이다.

```javascript
useEffect(() => {
  if (!body) return

  const fetchOptions = {
    method: 'POST',
    body,
    headers: {'content-type': 'application/json'},
  }

  fetch('/url', fetchOptions)
}, [body])
```

굳이 memoization을 하지 않더라도, `useEffect`가 `body`의 값의 변화에만 트리거하도록 바꾸면 (이것도 리액트의 직전 값만 비교하는 memoization전략과 일치한다고 볼 수 있다.) 쉽게 원하는 바를 달성할 수 있다.
