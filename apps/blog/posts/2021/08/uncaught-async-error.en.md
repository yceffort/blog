---
title: 'Handling Uncaught Async Errors in JavaScript Correctly'
tags:
  - javascript
  - error-handling
  - async
published: true
date: 2021-08-23 13:21:41
description: 'Why try...catch misses errors thrown in async functions, and how to handle every case: IIFEs, forEach, promise chains, constructors, event listeners, and global safety nets.'
---

> I originally wrote this post in 2021, and since it still gets steady traffic, I expanded it in August 2026. It now covers how the error message actually gets printed, top-level await, `Promise.allSettled`, the global safety nets (`unhandledrejection` and Node.js behavior), and fixes a few incorrect comments in the original examples.

## TL;DR

If you landed here by searching for `Uncaught (in promise) Error`, chances are your situation matches one of these cases.

- Calling an `async` function without `await`: attach `.catch()` at the call site, or wrap the function body in `try...catch` ([Async IIFE](#async-iife))
- Passing an async callback to `forEach`: switch to `map` and wrap it in `await Promise.all()` ([Async forEach](#async-foreach))
- An error thrown in the `onSuccess` of `.then(onSuccess, onError)`: attach `.catch()` at the end of the chain ([Promise Chaining](#promise-chaining))
- A `throw` inside an async callback like `setTimeout` within `new Promise`: call `reject` instead of `throw` ([Promise Constructor](#promise-constructor))
- An async callback passed to an event listener: use `try...catch` inside the callback, or wrap it with an error-handling helper ([Event Listeners](#event-listeners))
- The last line of defense for anything that still slips through: the `unhandledrejection` event in the browser, `process.on('unhandledRejection')` in Node.js ([The Global Safety Net](#the-global-safety-net))

Below, we'll walk through why each of these cases fails to get caught.

## Where This Message Comes From

Before diving into the cases, understanding how the `Uncaught (in promise)` message actually gets printed makes everything that follows much easier.

When a promise is rejected, the JavaScript engine checks whether a handler is attached to process that rejection — a `.catch()`, the second argument of `.then()`, or a `try...catch` wrapping an `await`. If no handler gets attached by the time the microtask queue is drained, the rejection is reported to the host environment (the browser, Node.js) as an "unhandled rejection." The `Uncaught (in promise) Error` in your browser console is exactly that report.

The important part is that **this message doesn't mean `try...catch` failed — it means nobody subscribed to the rejection channel.** Every case in this post ultimately reduces to a single question: "who is subscribed to this promise's rejection?" Even if a `try...catch` is sitting right there, it does nothing unless the block actually subscribes to the promise (via `await`).

## Async IIFE

First, let's throw an error inside an immediately invoked function expression and try to catch it.

```javascript
try {
  ;(() => {
    throw new Error('error')
  })()
} catch (e) {
  console.log(e) // caught
}
```

The error is caught without any trouble.

But what happens if we add the `async` keyword?

```javascript
try {
  ;(async () => {
    throw new Error('err') // uncaught
  })()
} catch (e) {
  console.log(e)
}
```

Same code, just with `async` added — and now the error isn't caught. Why?

In synchronous code, the error is thrown synchronously, so the `try...catch` statement can catch it. Put simply, program execution never leaves the `try...catch`, which is why the error gets caught.

Async functions are different. An error thrown inside an async function isn't thrown outward — it **becomes a rejected promise that gets returned**. And this code neither `await`s that promise nor attaches a `.catch()` to it; it just abandons it. The `try...catch` block has already finished by the time the error occurs, and since nobody is subscribed to the rejection, we get `Uncaught (in promise)` exactly as described above.

There are two ways to fix this.

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

This is somewhat similar to [the difference between return await promise and return promise](https://yceffort.kr/2021/02/run-await-return-return-await).

### Top-level await

One more thing worth adding: these days, the async IIFE pattern itself is often unnecessary. Since ES2022, ES modules support top-level await, so you can `await` directly at the top level of a module without wrapping anything in a function.

```javascript
// ES module (<script type="module">, .mjs, etc.)
try {
  await init()
} catch (e) {
  console.log(e) // caught
}
```

In this case the `try...catch` naturally takes the form that subscribes to the rejection (`await`), so the error is caught just fine. One thing to keep in mind, though: if an error occurs at a top-level await without a `try...catch`, the module evaluation itself fails, and that failure propagates to whatever imported the module.

## Async forEach

Another different beast is async `forEach`. The code below is synchronous, as discussed earlier, so the error is caught just fine.

```javascript
try {
  ;[1, 2, 3].forEach((index) => {
    throw new Error(`err ${index}`)
  })
} catch (e) {
  console.log(e) // caught
}
```

But once again, making it asynchronous means the error no longer gets caught.

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

Each of the three callback invocations produces a rejected promise, and `forEach` simply discards the callback's return value. We end up with three promises that have no subscribers.

The fix here is `await Promise.all`. But there's a subtle difference between using `map` and using `forEach`.

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

To see exactly what's happening, let's add a `console.log`.

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

`forEach` returns nothing (`undefined`), so `Promise.all(undefined)` throws a `TypeError` on the spot. That `TypeError` does get caught — but separately from it, the rejections produced by the three callbacks that already ran still have no subscribers, so three `Uncaught (in promise)` messages land in the console anyway. It looks like you caught the error, but nothing was actually solved.

`map`, on the other hand, returns an array of promises, and `Promise.all` **subscribes to all of them**.

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

The callback runs all three times (`map`, like `forEach`, doesn't stop midway), but `Promise.all` rejects with the first rejection (`err 1`), and that's what lands in the `catch`. What happens to the other two rejections? `Promise.all` is already subscribed to them, so they don't leak as unhandled — they're quietly discarded.

`forEach` has no `break`. It's a loop you can't escape from midway. It runs to completion regardless of exceptions. That's why, in situations that call for `Promise.all`, the general practice is to use `map` instead of `forEach`.

- https://262.ecma-international.org/6.0/#sec-array.prototype.foreach

> There is no way to stop or break a forEach() loop other than by throwing an exception. If you need such behavior, the forEach() method is the wrong tool.

> You'll occasionally see posts claiming `return false` lets you exit a forEach. Strictly speaking, it only looks that way.

```javascript
function hello() {
  ;[1, 2, 3].forEach((index) => {
    console.log(`looping ${index}`)
    return false
  })
}
```

```bash
looping 1
looping 2
looping 3
```

### Promise.allSettled

As we just saw, `Promise.all` rejects immediately on the first failure and discards the remaining results, success or failure. If you need to retry only the failed items, or need to know exactly which items failed, `Promise.allSettled` is the right tool.

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

`allSettled` waits for every promise to settle and never rejects. It subscribes to every rejection and converts each into a result object, so there's no room for an unhandled rejection to appear. The tradeoff is that you have to dig the failures out yourself — if you forget to check for items with `status === 'rejected'`, this time the error won't even show up in the console; it just silently disappears.

## Promise Chaining

Async functions rely on promises to perform asynchronous work. Accordingly, you can use async functions in `.then(onSuccess, onError)` callbacks as well.

> Related post: [promise.then(f, f) vs promise.catch(f)](https://yceffort.kr/2021/07/promise-then-f-f-vs-promise-catch)

The error is not caught in the code below,

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

but if the `catch` is attached separately like this, it can be caught.

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

`onError` only handles the rejection of the **preceding promise** — it can't handle an error thrown by the `onSuccess` passed alongside it in the same `.then()`. An error in `onSuccess` becomes the rejection of the **next promise** that `.then()` returns, so only a handler attached after it can catch it. This is why the habit of putting `.catch()` at the end of the chain is the safe one.

## Early Init

Another case of uncaught exceptions comes from separating a promise from its await to run things in parallel. Since `await` only suspends the execution of the `async` function itself, this creates parallelism. Take a look at the example below.

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

In this case, we don't end up waiting for both `await`s. Once one of them throws, the `try...catch` catches that error and execution moves on past the block. The other error is therefore never caught.

```bash
Error: err2
Uncaught (in promise) Error: err
```

The moment `err2` is thrown at the 2-second mark and execution jumps to the `catch`, `await p1` will never run. `p1` rejects one second later, but by then nobody is subscribed to it.

Here too, `Promise.all` solves the problem: start the work in parallel, but subscribe to everything in one place.

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

## Event Listeners

Unhandled exceptions also frequently occur in callbacks such as event listeners.

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

Neither gets caught, but look closely at the error messages: **they leak through different channels.** An error from a synchronous callback becomes a regular uncaught error and is reported via the `error` event on `window`, while an error from an async callback becomes a rejected promise and is reported via the `unhandledrejection` event. If you've built your own error monitoring, it's worth checking whether you're only collecting from one of the two channels.

Event listeners never hand the callback's return value to anyone, so there's simply no place to attach a `.catch()`. You either handle it with `try...catch` inside the callback,

```javascript
document.querySelector('button').addEventListener('click', async () => {
  try {
    await submit()
  } catch (e) {
    showErrorToast(e)
  }
})
```

or, if you have many listeners, build a wrapper that attaches the error handling for you.

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

If an error occurs synchronously inside a Promise constructor, it can be caught just fine.

```javascript
new Promise(() => {
  throw new Error('err')
}).catch((e) => {
  console.log(e) // caught
})
```

That's because, per the spec, an error thrown synchronously inside the executor (the function passed to the constructor) is automatically converted into that promise's rejection.

However, here too, an error that occurs asynchronously won't be caught.

```javascript
new Promise(() => {
  setTimeout(() => {
    throw new Error('err') // uncaught
  }, 0)
}).catch((e) => {
  console.log(e)
})
```

By the time the `setTimeout` callback runs, the executor has already finished, so this `throw` explodes somewhere that has nothing to do with the promise. Inside an async callback, you have to **call `reject` directly** instead of `throw` for the rejection to be wired to the promise.

If you write it like the code below, the `setTimeout()` has already been pushed to the back of the task queue by the time it executes, so the error won't be caught.

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

The callback's error argument (`err`) is wired to `rej`, but the error thrown by `transformResult(results)` (3) is still a `throw` inside an async callback, so it leaks. In cases like this, it's safer to narrow the promise-wrapped scope to a minimum and move the rest of the logic into the chain.

```javascript
new Promise((res, rej) => {
  setTimeout(res, 1000) // 1 defer asynchronously
})
  .then(
    () =>
      new Promise((res, rej) => {
        connection.query('SELECT ...', (err, results) => {
          // 2 run the query after the delay
          if (err) {
            rej(err)
          } else {
            res(results)
          }
        })
      }),
  )
  .then((results) => transformResult(results)) // 3 proper then handling for the query result
```

This way, an error thrown by `transformResult` is an error inside a `.then()` callback, so it automatically propagates as the chain's rejection, where the final `.catch` or an `await` can handle it properly.

## The Global Safety Net

Even if you take care of all the cases above, in a codebase of any real size a rejection will leak somewhere eventually. That's why host environments provide a last line of defense.

In the browser, it's the `unhandledrejection` event. This event fires right before `Uncaught (in promise)` is printed to the console, and it's exactly where error monitoring tools like Sentry hook in to collect promise errors.

```javascript
window.addEventListener('unhandledrejection', (event) => {
  reportError(event.reason) // the rejected value (usually an Error object)
  event.preventDefault() // suppress the default console output
})
```

In Node.js, you can do the same thing with a `process` event.

```javascript
process.on('unhandledRejection', (reason, promise) => {
  logger.error({reason}, 'unhandled rejection')
})
```

One thing to watch out for in Node.js: **starting with v15, the default behavior for an unhandled rejection changed from printing a warning to terminating the process.** What would be one more red line in a browser console becomes an outage on a server, with the whole process dying. Registering an `unhandledRejection` handler as above prevents the termination.

That said, this is strictly a last-resort safety net, not a replacement for handling individual errors. By the time an error flows all the way here, the context of which request or which user action produced it is already gone — logging and alerting are about all you can do.

## Wrap-up

Every case reduces to a single principle: **a `throw` in an async function doesn't produce an exception — it produces a rejected promise, and if nobody subscribes to that promise, it becomes `Uncaught (in promise)`.**

- **Don't create abandoned promises.** If you called an async function, `await` it or attach `.catch()`. Don't pass async callbacks to APIs like `forEach` that discard return values.
- **Restructure so there's a subscriber.** `forEach` becomes `map` + `Promise.all`, a `throw` in an async callback becomes a `reject` call, and event listeners get an internal `try...catch` or a wrapper.
- **Pick the tool based on how you'll consume failures.** If one failure should abort everything, `Promise.all`; if you need every result, `Promise.allSettled`.
- **Put up the safety net.** `unhandledrejection` in the browser, `process.on('unhandledRejection')` in Node.js — and remember that since v15, Node's default is to kill the process.
