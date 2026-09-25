---
title: 'promise.then(f, f) vs promise.then(f).catch(f) 는 무엇이 다를까?'
tags:
  - javascript
  - async
  - error-handling
published: true
date: 2021-07-30 20:16:48
description: '덥다 더워'
---

자바스크립트에서는, promise의 성공과 실패에 따른 콜백을 두가지 방법으로 처리할 수 있다.

```javascript
promise.then(oSuccess, onFailure)
```

```javascript
promise.then(onSuccess).catch(onFailure)
```

이 두 가지는 무엇이 다른걸까?

일단, 각각 성공과 실패에 따른 콜백을 아래와 같이 선언한다고 가정해보자.

```javascript
function onSuccess(value) {
  console.log('Promise has been resolved with value:', value)
}

function onFailure(error) {
  console.log('Promise has been rejected with error:', error)
}
```

먼저, `resolve`의 경우를 살펴보자.

```javascript
Promise.resolve('Hi').then(onSuccess, onFailure) // Promise has been resolved with value: Hi

Promise.resolve('Hi').then(onSuccess).catch(onFailure) // Promise has been resolved with value: Hi
```

특별한 것 없이 둘다 동일한 결과를 보인다.

이번엔 둘다 실패했을 때를 가졍해보자.

```javascript
Promise.reject('Sorry').then(onSuccess, onFailure) // Promise has been rejected with error: Sorry

Promise.reject('Sorry').then(onSuccess).catch(onFailure) // Promise has been rejected with error: Sorry
```

이번에도 동일하다.

이 둘의 차이는, 바로 `resolve`에서 `rejected`가 발생할 때 알 수 있다.

```javascript
function onSuccessButRejected(value) {
  console.log('Promise has been resolved with value:', value)
  return Promise.reject('Oops, Sorry')
}

Promise.resolve('Hi').then(onSuccessButRejected, onFailure)
// Promise has been resolved with value: Hi
// Promise {<rejected>:"Oops, Sorry"}
// Uncaught (in promise) Oops, Sorry

Promise.resolve('Hi').then(onSuccessButRejected).catch(onFailure)
// Promise has been resolved with value: Hi
// Promise has been rejected with error: Oops, Sorry
// Promise {<fulfilled>:undefined}
```

`catch`는, `then` 내부에서도 `reject`가 발생했을 때에도 호출된다.

흐음... 🤔 ...

그렇다면 이건 어떨까?

```javascript
Promise.resolve('Hi').then(onSuccessButRejected).then(null, onFailure)
// Promise has been resolved with value: Hi
// Promise has been rejected with error: Oops, Sorry
```

```javascript
Promise.resolve('Hi').then(onSuccessButRejected).catch(onFailure)
```

와 동일하게 동작하는 것을 알 수 있다. 그렇다면, 둘 중에 무엇을 쓰는게 맞을까?

일반적인, `if/else`구문과, `try/catch`구문을 상상해보자. `if/else`는 내가 예측할 수 있는 경우를 `else`로 처리한다. 반면, `try/catch`는 내가 예측할 수 있는 경우를 포함하여 모든 경우의 수가 `catch`로 처리된다. 따라서, 내가 잠재적으로 처리하고 싶은 명확한 failure가 있다면, `promise.then(oSuccess, onFailure)`를 쓰는 것이 부수효과(side effect)를 방지하는데 있어 도움이 된다. 반면 `promise.catch(onFailure)`는 내가 예측하지 못한 경우를 포함한 모든 에러 - 지정된 작업이 성공처리가 되지 않거나, 비동기 흐름으로 인해 발생하는 오류 - 를 처리할 때 사용하는 것이 좋을 것 같다.

예를 들어, axios를 사용하는 시나리오를 가정해보자.

```javascript
axios
  .get('/api/user/123')
  .then(
    (value) => {
      // 성공
      console.log('user info', JSON.parse(value))
    },
    (error) => {
      // http 에러 (40x, 50x...)
      console.log('http error', error.response.status)
    },
  )
  .catch((error) => {
    // 예측하지 못한 에러
    console.log('Unexpected Error!', error)
  })
```

첫번째 `then`문에서 `resolve`로 정상적으로 응답이 왔을 때 (2xx, 3xx) 처리를 하고 있고, `reject`로 http request에러 (4xx, 5xx)처리를 하고 있다. 그리고 마지막 `catch`문에서는 예측하지 못한 에러를 핸들링하고 있는데, 이 경우는 `JSON.parse`에 실패하는 경우 등의 시나리오에서 호출 될 것이다.
