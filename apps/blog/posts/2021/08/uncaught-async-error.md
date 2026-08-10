---
title: 'uncaught async error를 올바르게 처리하기'
tags:
  - javascript
  - error-handling
  - async
published: true
date: 2021-08-23 13:21:41
description: 'async가 있으면 함수 실행이 뒤로 넘어간다니까요?'
---

> 2021년에 쓴 글인데 지금까지도 꾸준히 읽히고 있어서, 2026년 8월에 내용을 보강했다. 에러 메시지가 찍히는 원리, top-level await, `Promise.allSettled`, 전역 안전망(`unhandledrejection`)과 Node.js의 동작이 추가되었고, 기존 예제의 잘못된 주석 몇 개를 바로잡았다.

## TL;DR

`Uncaught (in promise) Error`로 검색해서 들어왔다면, 대부분 아래 케이스 중 하나에 해당한다.

- `async` 함수를 `await` 없이 호출: 호출부에 `.catch()`를 붙이거나, 함수 내부를 `try...catch`로 감싼다 ([Async IIFE](#async-iife))
- `forEach`에 async 콜백을 넘김: `map`으로 바꾸고 `await Promise.all()`로 감싼다 ([Async forEach](#async-foreach))
- `.then(onSuccess, onError)`의 `onSuccess`에서 던진 에러: 체인 마지막에 `.catch()`를 붙인다 ([Promise Chaining](#promise-chaining))
- `new Promise` 내부의 `setTimeout` 등 비동기 콜백에서 `throw`: `throw` 대신 `reject`를 호출한다 ([Promise Constructor](#promise-constructor))
- 이벤트 리스너에 넘긴 async 콜백: 콜백 내부에서 `try...catch` 하거나, 에러 처리를 붙여주는 래퍼로 감싼다 ([이벤트 리스너](#이벤트-리스너))
- 위의 어느 것으로도 못 잡고 새는 에러의 마지막 안전망: 브라우저는 `unhandledrejection` 이벤트, Node.js는 `process.on('unhandledRejection')` ([전역 안전망](#전역-안전망))

각 케이스가 왜 잡히지 않는지는 아래에서 하나씩 살펴본다.

## 이 메시지는 어디서 오는가

케이스로 들어가기 전에, `Uncaught (in promise)`라는 메시지가 어떤 원리로 찍히는지부터 짚고 가면 아래 내용이 훨씬 수월해진다.

promise가 reject되면, 자바스크립트 엔진은 그 rejection을 처리할 핸들러(`.catch()`, `.then()`의 두 번째 인자, 또는 `await`을 감싼 `try...catch`)가 붙어 있는지 확인한다. 마이크로태스크 큐가 비워질 때까지 아무 핸들러도 붙지 않으면, 호스트 환경(브라우저, Node.js)에 "처리되지 않은 rejection"으로 보고된다. 브라우저 콘솔의 `Uncaught (in promise) Error`가 바로 이 보고다.

여기서 중요한 것은 **이 메시지가 `try...catch`의 실패가 아니라, rejection 채널에 아무도 구독하지 않았다는 뜻**이라는 점이다. 그래서 이 글의 모든 케이스는 결국 하나의 질문으로 환원된다. "이 promise의 rejection은 누가 구독하고 있는가?" 동기 코드처럼 보이는 `try...catch`가 있어도, 그 블록이 promise를 구독하는 형태(`await`)가 아니면 아무 소용이 없다.

## Async IIFE

먼저, 즉시 실행 함수내에서 에러를 던지고 이 에러를 잡아보자.

```javascript
try {
  ;(() => {
    throw new Error('error')
  })()
} catch (e) {
  console.log(e) // caught
}
```

무사히(?) 에러가 잡히는 모습을 볼 수 있다.

하지만 여기에 `async` 키워드를 추가하면 어떻게 될까?

```javascript
try {
  ;(async () => {
    throw new Error('err') // uncaught
  })()
} catch (e) {
  console.log(e)
}
```

같은 코드에 `async`만 추가했을 뿐인데, 에러가 잡히지 않는 모습이다. 왜 그럴까?

동기 코드에서는, 에러가 동기로 발생하기 때문에, `try...catch` 문에서 잡을 수 있었다. 단순하게 이야기하면, 프로그램 실행이 `try...catch`를 벗어나지 않기 때문에 에러를 잡을 수 있었던 것이다.

하지만 비동기 함수의 경우는 다르다. async 함수 안에서 던진 에러는 밖으로 던져지는 것이 아니라 **reject된 promise가 되어 반환**된다. 그리고 이 코드는 그 promise를 `await` 하지도, `.catch()`를 붙이지도 않은 채 버려두고 있다. `try...catch` 문은 에러가 발생하는 시점에 이미 끝나 있고, rejection을 구독하는 사람이 아무도 없으니 앞서 본 원리대로 `Uncaught (in promise)`가 된다.

따라서 이를 해결 하기 위해서는, 아래 두 가지 방법으로 해결이 가능하다.

```javascript
;(async () => {
  throw new Error('err')
})().catch((e) => {
  console.log(e) // caught
})
```

```javascript
;(async () => {
  try {
    throw new Error('err')
  } catch (e) {
    console.log(e) // caught
  }
})()
```

요것은 [return await promise와 return promise의 차이](https://yceffort.kr/2021/02/run-await-return-return-await)와 좀 비슷하다.

### Top-level await

한 가지 덧붙이면, 요즘은 이 async IIFE 패턴 자체가 필요 없는 경우가 많다. ES2022부터 ES 모듈에서는 top-level await이 가능해서, 함수로 감싸지 않고도 모듈 최상위에서 바로 `await`을 쓸 수 있기 때문이다.

```javascript
// ES 모듈 (<script type="module">, .mjs 등)
try {
  await init()
} catch (e) {
  console.log(e) // caught
}
```

이 경우 `try...catch`가 자연스럽게 rejection을 구독하는 형태(`await`)가 되므로 에러도 잘 잡힌다. 다만 `try...catch` 없이 top-level await에서 에러가 나면 모듈 평가 자체가 실패하고, 그 모듈을 import한 쪽까지 실패가 전파된다는 점은 알아둘 필요가 있다.

## Async forEach

또 한가지 다른 것은 async `forEach`다. 아래 코드는 앞서 이야기한 것 처럼 동기 코드이기 때문에 에러가 잘 잡힌다.

```javascript
try {
  ;[1, 2, 3].forEach((index) => {
    throw new Error(`err ${index}`)
  })
} catch (e) {
  console.log(e) // caught
}
```

그러나 역시 이 것도 비동기로 바꾸게 되면 에러가 잡히지 않게 된다.

```javascript
try {
  ;[1, 2, 3].forEach(async (index) => {
    throw new Error(`err ${index}`)
  })
} catch (e) {
  console.log(e)
}
```

```bash
Uncaught (in promise) Error: err 1
Uncaught (in promise) Error: err 2
Uncaught (in promise) Error: err 3
```

세 번의 콜백 호출이 각각 reject된 promise를 만드는데, `forEach`는 콜백의 반환값을 그냥 버린다. 구독자 없는 promise가 세 개 생기는 셈이다.

이 경우에는 `await Promise.all`을 사용한다. 그런데 여기서 조금 다른게 있다. `map`을 썼을 때와 `forEach`를 썼을 때 차이다.

`forEach`

```javascript
try {
  await Promise.all(
    [1, 2, 3].forEach(async (index) => {
      throw new Error(`err ${index}`)
    }),
  )
} catch (e) {
  console.log(e) // undefined is not iterable (cannot read property Symbol(Symbol.iterator))
}
```

`map`

```javascript
try {
  await Promise.all(
    [1, 2, 3].map(async (index) => {
      throw new Error(`err ${index}`)
    }),
  )
} catch (e) {
  console.log(e) // caught Error: err 1
}
```

어떤일이 일어나는지 정확히 알기 위해, `console.log`를 추가해 보자.

```javascript
try {
  await Promise.all(
    [1, 2, 3].forEach(async (index) => {
      console.log('forEach', index)
      throw new Error(`err ${index}`)
    }),
  )
} catch (e) {
  console.log(e) // undefined is not iterable (cannot read property Symbol(Symbol.iterator))
}
```

```
forEach 1
forEach 2
forEach 3
TypeError: undefined is not iterable (cannot read property Symbol(Symbol.iterator))
    at Function.all (<anonymous>)
    at <anonymous>:2:16
```

`forEach`는 아무것도 반환하지 않으므로(`undefined`), `Promise.all(undefined)`는 그 자리에서 `TypeError`를 던진다. 이 `TypeError`는 잡히지만, 그것과 별개로 이미 실행된 콜백 세 개가 만든 rejection은 여전히 구독자가 없어서 `Uncaught (in promise)` 세 개가 그대로 콘솔에 찍힌다. 에러를 잡은 것처럼 보여도 실제로는 아무것도 해결되지 않은 것이다.

반면 `map`은 promise의 배열을 반환하고, `Promise.all`이 그 **모든 promise를 구독**한다.

```javascript
try {
  await Promise.all(
    [1, 2, 3].map(async (index) => {
      console.log('map', index)
      throw new Error(`err ${index}`)
    }),
  )
} catch (e) {
  console.log(e) // caught Error: err 1
}
```

```
map 1
map 2
map 3
Error: err 1
```

콜백은 세 번 모두 실행되지만(`map`도 `forEach`처럼 중간에 멈추지 않는다), `Promise.all`은 첫 번째 rejection(`err 1`)으로 reject되고 그것이 `catch`에 잡힌다. 나머지 두 rejection은 어떻게 될까? `Promise.all`이 이미 구독하고 있으므로 unhandled로 새지 않고 조용히 버려진다.

`forEach`는 `break`가 없다. 즉 중간에 도망갈 수 없는 loop 구문이다. 따라서 exception 유무와 상관없이 다 돌게 된다. 그러므로 `Promise.all`을 사용해야 하는 상황에서는 일반적으로 `forEach`대신 `map`을 쓴다.

- https://262.ecma-international.org/6.0/#sec-array.prototype.foreach

> There is no way to stop or break a forEach() loop other than by throwing an exception. If you need such behavior, the forEach() method is the wrong tool.

> `return false`를 쓰면 forEach를 나올 수 있다는 포스팅도 종종 보이는데, 사실 이건 엄밀히 말하면 그렇게 보이는 것 뿐이다.

```javascript
function hello() {
  ;[1, 2, 3].forEach((index) => {
    console.log(`${index} 도는 중`)
    return false
  })
}
```

```bash
1 도는 중
2 도는 중
3 도는 중
```

### Promise.allSettled

방금 본 것처럼 `Promise.all`은 첫 번째 실패에서 바로 reject되고, 나머지 결과는 성공이든 실패든 버린다. 실패한 것만 골라 재시도하거나, 어떤 항목이 실패했는지 모두 알아야 하는 상황이라면 `Promise.allSettled`가 맞는 도구다.

```javascript
const results = await Promise.allSettled(
  [1, 2, 3].map(async (index) => {
    if (index === 2) {
      throw new Error(`err ${index}`)
    }
    return index
  }),
)

console.log(results)
// [
//   { status: 'fulfilled', value: 1 },
//   { status: 'rejected', reason: Error: err 2 },
//   { status: 'fulfilled', value: 3 },
// ]
```

`allSettled`는 모든 promise가 결론에 도달할 때까지 기다리고, 절대 reject되지 않는다. 모든 rejection을 구독해서 결과 객체로 바꿔주므로 unhandled rejection이 생길 여지도 없다. 대신 실패를 직접 꺼내서 확인해야 하므로, `status === 'rejected'`인 항목을 확인하는 코드를 빼먹으면 이번에는 에러가 콘솔에도 찍히지 않고 조용히 사라진다는 점은 주의해야 한다.

## Promise Chaining

비동기 함수는 비동기 작업을 수행하기 위하여 Promise에 의존한다. 따라서, `.then(onSuccess, onError)` 콜백에서도 비동기 함수를 사용할 수 있다.

> 이와 관련된 포스팅: [promise.then(f, f) vs promise.catch(f)](https://yceffort.kr/2021/07/promise-then-f-f-vs-promise-catch)

아래 코드에서는 에러가 잡히지 않지만

```javascript
Promise.resolve().then(
  /*onSuccess*/ () => {
    throw new Error('err') // uncaught
  },
  /*onError*/ (e) => {
    console.log(e)
  },
)
```

별도로 이렇게 `catch` 문이 빠져 있다면 잡을 수 있게 된다.

```javascript
Promise.resolve()
  .then(
    /*onSuccess*/ () => {
      throw new Error('err')
    },
  )
  .catch(
    /*onError*/ (e) => {
      console.log(e) // caught
    },
  )
```

`onError`는 **앞선 promise**의 rejection만 처리할 뿐, 같은 `.then()`에 나란히 넘긴 `onSuccess`에서 던진 에러는 처리하지 못한다. `onSuccess`의 에러는 `.then()`이 반환하는 **다음 promise**의 rejection이 되므로, 그 뒤에 붙은 핸들러만 잡을 수 있다. 체인 마지막에 `.catch()`를 붙이는 습관이 안전한 이유다.

## Early Init

잡히지 않는 예외의 또다른 케이스는 promise와 await을 분리하여 병렬로 실행하는 것이다. `await`은 `async` 함수의 실행만을 중지해서 실행하므로, 이경우 병렬화가 일어나버리게 된다. 아래 예제를 살펴보자.

```javascript
const wait = (ms) => new Promise((res) => setTimeout(res, ms))

;(async () => {
  try {
    const p1 = wait(3000).then(() => {
      throw new Error('err')
    }) // uncaught
    await wait(2000).then(() => {
      throw new Error('err2')
    }) // caught
    await p1
  } catch (e) {
    console.log(e)
  }
})()
```

이 경우에는 두 개의 `await`을 모두 기다리지 않는다. 하나에서 error가 나버리면, `try...catch`로 해당 에러를 잡아버리고, 그 다음으로 넘어가버리게 된다. 따라서 나머지 하나의 에러는 잡히지 않게 된다.

```bash
Error: err2
Uncaught (in promise) Error: err
```

`err2`가 2초 시점에 던져져 `catch`로 점프하는 순간, `await p1`은 영영 실행되지 않는다. `p1`은 1초 뒤에 reject되지만 그 시점에는 구독자가 아무도 없다.

이 경우에도, 마찬가지로 `Promise.all`을 통해서 문제를 해결할 수 있다. 병렬로 시작하되, 구독은 한 곳에서 한꺼번에 하는 것이다.

```javascript
;(async () => {
  try {
    const p1 = wait(3000).then(() => {
      throw new Error('err')
    })
    await Promise.all([
      wait(2000).then(() => {
        throw new Error('err2')
      }),
      p1,
    ])
  } catch (e) {
    console.log(e)
  }
})()
```

## 이벤트 리스너

이벤트 리스너와 같이 콜백에서도 종종 unhandled exception이 발생하곤 한다.

```javascript
document.querySelector('button').addEventListener('click', async () => {
  throw new Error('err') // Uncaught (in promise) Error: err
})
```

```javascript
document.querySelector('button').addEventListener('click', () => {
  throw new Error('err') // Uncaught Error: err
})
```

둘 다 잡히지 않는 것은 같지만, 에러 메시지를 자세히 보면 **새는 채널이 다르다.** 동기 콜백의 에러는 일반적인 uncaught error가 되어 `window`의 `error` 이벤트로 보고되고, async 콜백의 에러는 reject된 promise가 되어 `unhandledrejection` 이벤트로 보고된다. 에러 모니터링을 직접 구축했다면 한쪽 채널만 수집하고 있지는 않은지 확인해 볼 필요가 있다.

이벤트 리스너는 콜백의 반환값을 누구도 받지 않으므로, `.catch()`를 붙일 자리 자체가 없다. 따라서 콜백 내부에서 `try...catch`로 처리하거나,

```javascript
document.querySelector('button').addEventListener('click', async () => {
  try {
    await submit()
  } catch (e) {
    showErrorToast(e)
  }
})
```

리스너가 많다면 에러 처리를 붙여주는 래퍼를 만들어 쓰는 방법도 있다.

```javascript
const withErrorHandler =
  (fn) =>
  (...args) =>
    fn(...args).catch((e) => showErrorToast(e))

document.querySelector('button').addEventListener(
  'click',
  withErrorHandler(async () => {
    await submit()
  }),
)
```

## Promise Constructor

Promise Constructor 내부에서 동기로 에러가 발생하면 다음과 같이 잘 잡을 수 있다.

```javascript
new Promise(() => {
  throw new Error('err')
}).catch((e) => {
  console.log(e) // caught
})
```

executor(생성자에 넘기는 함수) 안에서 동기로 던진 에러는 스펙상 자동으로 그 promise의 rejection으로 변환되기 때문이다.

그러나, 여기에서도 비동기로 에러가 발생할 경우에는 잡히지 않게 된다.

```javascript
new Promise(() => {
  setTimeout(() => {
    throw new Error('err') // uncaught
  }, 0)
}).catch((e) => {
  console.log(e)
})
```

`setTimeout` 콜백이 실행되는 시점에는 executor가 이미 끝난 뒤라서, 이 `throw`는 promise와 아무 관계 없는 곳에서 터진다. 비동기 콜백 안에서는 `throw`가 아니라 **`reject`를 직접 호출**해야 rejection이 promise로 연결된다.

아래 처럼 하게 되면, `setTimeout()`은 이미 태스크 큐 뒤로 넘어가서 실행되기 때문에 에러가 잡히지 않게 된다.

```javascript
new Promise((res, rej) => {
  setTimeout(() => {
    // 1
    connection.query('SELECT ...', (err, results) => {
      // 2
      if (err) {
        rej(err)
      } else {
        const r = transformResult(results) // 3
        res(r)
      }
    })
  }, 1000)
})
```

콜백의 에러 인자(`err`)는 `rej`로 연결했지만, `transformResult(results)`가 던지는 에러(3)는 여전히 비동기 콜백 안의 `throw`라서 새어 나간다. 이런 경우에는 promise로 감싸는 범위를 최소한으로 좁히고, 나머지 로직은 체인으로 빼는 것이 안전하다.

```javascript
new Promise((res, rej) => {
  setTimeout(res, 1000) // 1 비동기로 넘긴다
})
  .then(
    () =>
      new Promise((res, rej) => {
        connection.query('SELECT ...', (err, results) => {
          // 2 넘긴 다음에 쿼리 실행
          if (err) {
            rej(err)
          } else {
            res(results)
          }
        })
      }),
  )
  .then((results) => transformResult(results)) // 3 해당 쿼리에 대한 적절한 `then`처리
```

이렇게 되면 `transformResult`가 던지는 에러도 `.then()` 콜백 안의 에러이므로 자동으로 체인의 rejection으로 전파되어, 마지막의 `.catch`나 `await`이 적절하게 처리할 수 있게 된다.

## 전역 안전망

위 케이스들을 다 챙겨도, 규모가 있는 코드베이스에서는 어딘가에서 rejection이 새기 마련이다. 그래서 호스트 환경들은 마지막 안전망을 제공한다.

브라우저에서는 `unhandledrejection` 이벤트다. 콘솔에 `Uncaught (in promise)`가 찍히기 직전에 이 이벤트가 먼저 발생하며, Sentry 같은 에러 모니터링 도구들이 promise 에러를 수집하는 지점도 바로 여기다.

```javascript
window.addEventListener('unhandledrejection', (event) => {
  reportError(event.reason) // reject된 값 (대개 Error 객체)
  event.preventDefault() // 콘솔의 기본 출력을 막는다
})
```

Node.js에서는 `process` 이벤트로 같은 일을 할 수 있다.

```javascript
process.on('unhandledRejection', (reason, promise) => {
  logger.error({reason}, 'unhandled rejection')
})
```

Node.js에서 한 가지 주의할 점은, **v15부터 unhandled rejection의 기본 동작이 경고 출력에서 프로세스 종료로 바뀌었다**는 것이다. 브라우저에서는 콘솔에 빨간 줄이 하나 늘어나고 말 일이, 서버에서는 프로세스가 통째로 죽는 장애가 된다. 위처럼 `unhandledRejection` 핸들러를 등록하면 종료를 막을 수 있다.

다만 이것은 어디까지나 마지막 안전망이지, 개별 에러 처리의 대체재가 아니다. 이 지점까지 흘러온 에러는 어느 요청, 어느 사용자 동작에서 발생했는지에 대한 맥락이 이미 사라진 뒤라서, 로깅과 알림 정도가 할 수 있는 일의 전부다.

## 정리

모든 케이스는 결국 하나의 원리로 환원된다. **async 함수의 `throw`는 예외가 아니라 reject된 promise를 만들고, 그 promise를 아무도 구독하지 않으면 `Uncaught (in promise)`가 된다.**

- **버려지는 promise를 만들지 않는다.** async 함수를 불렀으면 `await` 하거나 `.catch()`를 붙인다. async 콜백을 `forEach`처럼 반환값을 버리는 API에 넘기지 않는다.
- **구독자가 있는 형태로 바꾼다.** `forEach`는 `map` + `Promise.all`로, 비동기 콜백의 `throw`는 `reject` 호출로, 이벤트 리스너는 내부 `try...catch`나 래퍼로.
- **실패를 어떻게 소비할지에 따라 도구를 고른다.** 하나라도 실패하면 중단할 것이면 `Promise.all`, 전체 결과가 필요하면 `Promise.allSettled`.
- **안전망을 친다.** 브라우저는 `unhandledrejection`, Node.js는 `process.on('unhandledRejection')`. 특히 Node.js는 v15부터 기본이 프로세스 종료라는 것을 기억할 필요가 있다.
