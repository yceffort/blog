---
title: 'Promise 관련 API 살펴보기'
tags:
  - async
  - javascript
  - error-handling
published: true
date: 2020-10-31 15:39:11
description: 'Promise.all에서 멈춰있지 말자'
---

[이 글](https://v8.dev/features/promise-combinators)을 번역 하고 요약했습니다.

| name                 | description                                     |                                                                      |
| -------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| `Promise.allSettled` | does not short-circuit                          | this proposal 🆕                                                     |
| `Promise.all`        | short-circuits when an input value is rejected  | added in ES2015 ✅                                                   |
| `Promise.race`       | short-circuits when an input value is settled   | added in ES2015 ✅                                                   |
| `Promise.any`        | short-circuits when an input value is fulfilled | [separate proposal](https://github.com/tc39/proposal-promise-any) 🔜 |

## Promise.all

Promise를 배열로 받을 수 있으며, 모두 실행이 끝나거나 이 중 하나라도 reject 되면 끝나게 된다.

유저가 버튼을 클릭했을 때, CSS를 모두 다운로드 해서 완전히 새로운 UI를 그려주는 스펙을 상상해보자.

```javascript
const promises = [
  fetch('/component-a.css'),
  fetch('/component-b.css'),
  fetch('/component-c.css'),
]
try {
  const styleResponses = await Promise.all(promises)
  enableStyles(styleResponses)
  renderNewUi()
} catch (reason) {
  displayError(reason)
}
```

모든 요청이 성공해야 렌더링이 필요할 것이다. 만약 여기에서 하나라도 오류를 뱉게 된다면, 다른 작업이 끝나는 것을 기다리지 않고 바로 종료한다.

## Promise.race

`Promise.race`는 여러 개의 promise를 실행시킬 때, 아래와 같은 상황에서 유용하다.

1. 하나라도 먼저 끝나는 것을 원하는 경우
2. 바로 Promise가 리젝트 되었을 때 실행되길 원하는 경우

즉, Promise 중 하나가 거부되면 즉시 오류를 개별적으로 처리하게 된다.

```javascript
try {
  const result = await Promise.race([
    performHeavyComputation(),
    rejectAfterTimeout(2000),
  ])
  renderResult(result)
} catch (error) {
  renderError(error)
}
```

위 예제에서는 시간이 오래 걸리는 연산을 수행하거나, 2초후에 리젝트 되는 함수와 경쟁을 한다. 성공 또는 실패 중 첫번째로 실행되는 결과에 따라서 결과 또는 오류메시지를 처리할 수 있다.

## Promise.allSettled

`Promise.allSettled`는 모든 Promise 들이 종료되면, 성공과 실패와 상관없이 실행된다.
이는 Promise의 성공 실패가 중요하지 않고 단순히 종료되는 것을 확인하고 싶을 때 유용하다. 예를 들어, 모든 Promise가 끝나고 나면 로딩 스피너를 없애는 케이스가 존재할 수 있다.

```javascript
const promises = [
  fetch('/api-call-1'),
  fetch('/api-call-2'),
  fetch('/api-call-3'),
]

await Promise.allSettled(promises)
// 성공 실패와 관련없이 모두 종료가 되면 실행된다.
removeLoadingIndicator()
```

## Promise.any

`Promise.any`는 Promise가 하나라도 실행이 종료되면 실행된다는 점이 `Promise.race`와 유사하다. 다만 다른 점은, 하나가 실패한다고 해서 종료되지 않는다.

```javascript
const promises = [
  fetch('/endpoint-a').then(() => 'a'),
  fetch('/endpoint-b').then(() => 'b'),
  fetch('/endpoint-c').then(() => 'c'),
]
try {
  const first = await Promise.any(promises)
  // 첫번째로 성공한 Promise
  console.log(first)
  // → e.g. 'b'
} catch (error) {
  // 모든 Promise가 거절될 경우
  console.assert(error instanceof AggregateError)
  // 실패한 값을 프린트 한다.
  console.log(error.errors)
  // → [
  //     <TypeError: Failed to fetch /endpoint-a>,
  //     <TypeError: Failed to fetch /endpoint-b>,
  //     <TypeError: Failed to fetch /endpoint-c>
  //   ]
}
```

`Promise.any`에서 두 개 이상의 에러가 날 경우, 한번에 여러 에러들을 합칠 수 있는 [AggregateError](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError)를 사용할 수도 있다.

```javascript
Promise.any([Promise.reject(new Error('some error'))]).catch((e) => {
  console.log(e instanceof AggregateError) // true
  console.log(e.message) // "All Promises rejected"
  console.log(e.name) // "AggregateError"
  console.log(e.errors) // [ Error: "some error" ]
})
```
