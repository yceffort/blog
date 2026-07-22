---
title: 'React''s New Hook, "use"'
tags:
  - react
  - javascript
published: true
date: 2023-06-13 23:51:18
description: 'The name may change, or it may disappear entirely, depending on how things go'
---

# Table of Contents

## Introduction

React has an official channel for proposing new features: the https://github.com/reactjs/rfcs repository. This repository lets you propose new features or changes you would like to see in React and receive feedback from the React core team, and among the proposed issues, there are also some raised directly by the React core team to gather opinions from developers in the React community.

- Server Components: https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md
- Server Component module conventions: https://github.com/reactjs/rfcs/blob/main/text/0227-server-module-conventions.md

Among these, there is one interesting proposal that hasn't been merged yet: a new hook called `use`. As I'll explain later, this hook differs from previous hooks in several ways, one of which is that it can be called conditionally. This hook has been sitting as a PR for quite a while, and I had been keeping an eye on it 👀 wondering when it would get merged, but there was no sign of it happening, which puzzled me quite a bit. It turns out the person who authored the proposal [moved from Meta to Vercel](https://github.com/reactjs/rfcs/pull/229#issuecomment-1427067863) (🤪), and I found myself speculating (purely on my own) that the work might have been left in limbo during that transition. Then I happened to confirm the existence of the `use` hook in a React canary version.

![react-use](./images/react-use.png)

https://www.npmjs.com/package/react/v/18.3.0-next-1308e49a6-20230330?activeTab=code

It feels like the day the `use` hook officially arrives may not be far off, so I decided to take this opportunity to cover it. Let's read through [the `First class support for promises and async/await` RFC in the React RFCs](https://github.com/reactjs/rfcs/pull/229) and find out what the `use` hook really is.

## The Arrival of Server Components

With the arrival of Server Components, it is now possible to create `async` components like the following.

```javascript jsx
export async function Note({id, isEditing}) {
  const note = await db.posts.get(id)
  return (
    <div>
      <h1>{note.title}</h1>
      <section>{note.body}</section>
      {isEditing ? <NoteEditor note={note} /> : null}
    </div>
  )
}
```

Server Components like this, which access server resources directly and load server data, are the approach recommended by the React team itself, but one critical fact is that most hooks cannot be used in them. Of course, since Server Components are mostly limited to functionality that cannot hold state, hooks like `useState` won't be needed, and hooks like `useId` can still be used on the server.

## Then What About Client Components?

The fact that function components used on the server can now be `async`... raises one question. Is it impossible for Client Components to become asynchronous functions? Until now, the best we could do for asynchronous work in a Client Component was to declare and run an async function inside `useEffect`. Even then, the callback function of `useEffect` must not be asynchronous for various reasons, so it ended up being written in a somewhat awkward(?) form.

```javascript jsx
function ClientComponent() {
  useEffect(() => {
    async function doAsync() {
      await doSomething('...')
    }

    doAsync()
  }, [])

  return <>...</>
}
```

The reason Client Components cannot be `async` is due to technical limitations that I'll explain shortly. Instead, React plans to provide a special hook called `use`.

## What Is the `use` Hook?

Regarding the definition of the `use` hook, the RFC likens it to an `await` that is used only within React. Just as `await` can only be used inside `async` functions, `use` can only be used inside React components and hooks.

```javascript
import {use} from 'react'

function Component() {
  const data = use(promise)
}

function useHook() {
  const data = use(promise)
}
```

Quite remarkably, the `use` hook can do things that other hooks cannot. For example, it can be called inside conditionals, it can exist inside block statements, and it can even exist inside loops. This means that `use` is managed differently from all other hooks, while at the same time, like other hooks, it is still restricted to being used only within components.

```jsx
function Note({id, shouldIncludeAuthor}) {
  const note = use(fetchNote(id))

  let byline = null
  // Calling it conditionally
  if (shouldIncludeAuthor) {
    const author = use(fetchNoteAuthor(note.authorId))
    byline = <h2>{author.displayName}</h2>
  }

  return (
    <div>
      <h1>{note.title}</h1>
      {byline}
      <section>{note.body}</section>
    </div>
  )
}
```

And this `use` is planned to support not only `promise` but also other data types such as `Context`.

Now let's take a closer look at why this `use` was created.

### Questions About `use`

#### Why Not `async`?

What much of the community had asked for was a consistent way to render asynchronous components, regardless of whether they were Server Components, Client Components, or shared components. However, unlike Server Components, there were technical constraints on using `async` on the client.

Beyond these technical limitations, there is also an advantage: if the way you access data differs between server and client, it becomes a bit clearer which environment you are working in. Of course, there is the `use client` directive, but since this directive sits at the very top of the file, it is hard to intuitively recognize that you are in a Client Component. The React team mentioned that Server Components are similar to Client Components, but at the same time, they would prefer them not to be too similar. Each environment has clear limitations, so being able to quickly distinguish between them can go a long way toward reducing developer fatigue. In other words, a component declared as `async` can serve as a clear signal that it is a Server Component.

Even if a future arrives where `async` becomes possible in Client Components as well, the React team plans to keep recommending that developers refactor to separate asynchronous components (components that fetch data) from stateful components (components that use hooks). What React hopes for is that developers refactor by splitting data-fetching components and state-holding components into multiple pieces, and move work to the server where needed.

#### Avoiding Unnecessary Coupling Between `fetch` and `read`

The advantage of `await` and `use` is that they are completely uninvolved in how the asynchronous data loaded via a `promise` is fetched. The sole purpose and concern of `await` and `use` is simply to unwrap and retrieve asynchronous data, no matter how it was fetched.

The original earlier proposal was to provide a new `Suspense`-based fetching API, but that would have tightly coupled `fetch` and `read`, creating the problem of unnecessarily coupling fetching with rendering.

So the React team changed direction to simply provide `use`, without affecting the current rendering, so that data can be fetched optimally. `use` is intuitive for developers to work with, and fetching data becomes much more natural regardless of which library you use.

```jsx
function TooltipContainer({showTooltip}) {
  // This request does not block on the data.
  const promise = fetchInfo()

  if (!showTooltip) {
    // If we reach here, we return `null` regardless of whether the `promise` has finished or not.
    return null
  } else {
    // If we reach here, rendering starts after waiting for the `promise` passed through `use` to finish.
    return <Tooltip content={use(promise)} />
  }
}
```

#### A Flexible Transition Into React

One of the reasons the React architecture has been so loved is that there is not just one single React architecture; you can simultaneously enjoy the innovations and benefits of various third-party libraries and frameworks. If React were to add an official data-fetching API here, it would cause confusion across much of the React ecosystem.

### Detailed Design

`use` is designed to provide a programming model nearly identical to `async/await`, but unlike `async/await`, it still works in ordinary function components and hooks. Similar to JavaScript async functions, the runtime will manage internal state for suspending and resuming, but from the perspective of the component author, it looks like a function that executes sequentially.

```jsx
function Note({id}) {
  // The fetch request is asynchronous, but the component author can write it as if it were synchronous.
  const note = use(fetchNote(id))
  return (
    <div>
      <h1>{note.title}</h1>
      <section>{note.body}</section>
    </div>
  )
}
```

According to the JavaScript specification, the resolved value of a `promise`, whether fulfilled or rejected, can only ever be observed asynchronously. Even if the data has already finished loading, there is no way to synchronously inspect and check that value. This is a deliberate mechanism in JavaScript's design to avoid data races caused by ambiguous ordering.

The motivation behind this design is certainly understandable, but it poses a problem for a framework like React that models UI based on `props` and `state`. Depending on the situation, the options React can choose from are as follows.

- Suspend briefly until the `promise` completes, then render the component again: if the `promise` passed to `use` has not finished loading, throw an exception and suspend the component's rendering. Then, once the `use` call completes, return that value. A difference from `async/await` is that the suspended function component does not resume from the point where it was last interrupted. In other words, the runtime must re-execute all of the code between the start of the component and the point where it was suspended by `use`. This relies on the idempotency of React components. That is, there are no external side effects during rendering, and the same result is returned for a given set of state, props, context, and so on. As a performance optimization, React may separately memoize some computations. Of course, this approach carries additional overhead compared to `async/await`. However, when the data for the component has already been determined (the data was preloaded, or the component is re-rendering for unrelated reasons such as a parent re-render), the value can be retrieved without waiting on the microtask queue caused by `use`, so the overhead is small.
- Read the previous `promise` result as-is: if `props` or `state` have changed, there is no guarantee that the value from `use` is the same as before. In this case, a different strategy is needed. The first thing to try is checking whether that `promise` was previously read by another `use` or by another render attempt. If it has been read even once, the previous result can be reused synchronously without needing to suspend. To make this possible, React adds a few extra fields to the `promise` object.
  - A `status` field with `pending`, `fulfilled`, or `rejected`
  - If the `promise` has been fulfilled, the fulfilled value is stored in a `value` field.
  - If the `promise` has been rejected (fulfilled), the reason for rejection, an error object, is added to a `reason` field.

  One thing to keep in mind is that these fields are not added to every `promise`. They are only added to promises that are used with `use`. Thanks to this, `Promise.prototype` does not need to be polluted, and non-React code is not affected. This is of course not a JavaScript standard, but it helps React track the results of promises. If an API like `Promise.inpect` that allows synchronously inspecting the current state of a `Promise` is ever provided in the future, the team is willing to use it.

- Reading `promise` results during unrelated updates: tracking results on the `promise` object is only a valid strategy when the `promise` object has not changed during rendering. If a new `promise` object is returned, this strategy does not work. However, in most cases, even if it is a new `promise` object, the data will often have already been fetched. Consider the code below.

  ```jsx
  async function fetchTodo(id) {
    const data = await fetchDataFromCache(`/api/todos/${id}`)
    return {contents: data.contents}
  }

  function Todo({id, isSelected}) {
    const todo = use(fetchTodo(id))
    return (
      <div className={isSelected ? 'selected-todo' : 'normal-todo'}>
        {todo.contents}
      </div>
    )
  }
  ```

  If the `id` value has changed, it is correct for `fetchTodo` to return new data. But what if only the `isSelected` value has changed? The `promise` object handed to `use` is different, but the data will already have been fetched in the past. If React fails to handle this case properly, the UI could be suspended even though no new data was ever requested. So a way to handle this is needed. In this case, instead of suspending, React waits until the microtask queue is completely empty. If the `promise` becomes `resolved` during that time, React immediately resumes rendering the component without triggering the `Suspense` `fallback`. If it does not `resolve` within that window, React assumes that new data has been requested and suspends as usual.

  > This part can be a bit tricky, so let me add some extra explanation. It exploits the facts that a `Promise` resolves in a microtask, and that a `Promise` whose data has already been resolved in the past will (even though its state cannot be inspected synchronously) resolve its value immediately.

  However, this is not a solution to every problem. It only works when the data request is cached. More precisely, there is a constraint: an async function that re-renders without new input must resolve within the microtask window. That is why this `use` is planned to ship together with a `cache` API. It is very unlikely that `use` will ship without `cache`. Roughly speaking, `cache` will look like the following.

  ```jsx
  // If wrapped with the cache function, this function always returns the same result for the same `input`.
  // cache will probably also need an `invalidate` capability.
  const fetchNote = cache(async (id) => {
    const response = await fetch(`/api/notes/${id}`)
    return await response.json()
  })

  function Note({id}) {
    // Unless id changes or the cache is evicted, it always returns the same result.
    const note = use(fetchNote(id))
    return (
      <div>
        <h1>{note.title}</h1>
        <section>{note.body}</section>
      </div>
    )
  }
  ```

  Most fetch libraries these days already have caching mechanisms in place to avoid this kind of issue, so `use` should be usable even without this `cache`. That said, this will be useful when calling asynchronous functions directly from a component.

#### Conditional Calls

Unlike other hooks, the `use` hook can be called conditionally, unlike the hooks introduced so far. This is to spare developers the trouble of extracting data into separate components, and to allow suspending conditionally.

The reason `use` can be called conditionally is that, unlike most other hooks, it does not need to track state across component updates. Hooks like `useState` must run at the same position without being executed conditionally so that React can associate them with the previous state, but `use` does not need to store any data once the component has been rendered. Instead of storing it, the data is associated with the `promise`.

### Passing Promises from Server Components to Client Components

In the future, the team wants to add the ability to pass a promise from a Server Component to a Client Component in the form of props. Being able to conditionally invoke or control a promise passed via props would be useful.

#### Other Things `use` Can Do

Unlike other hooks, the fact that `use` can be called conditionally may cause confusion among developers, but the React team seems to believe the feature is useful enough to be worth that confusion. To reduce confusion, the React team has promised that this will be the only hook that supports conditional execution, so developers only need to remember this one characteristic of `use`.

In the future, `use` will support other types beyond `promise`. The first type to be supported besides `promise` is `Context`. Apart from the fact that it can be called conditionally, it is identical to the existing `useContext(Context)`.

## FAQ

### Why Is It Named `use`? Couldn't It Be More Specific?

There are two main reasons.

- `use` can accept not only a `promise` but also various types such as `Context`, `store`, and `observable`.
- `use` is a very special hook that can be used conditionally. Depending on the types above, it could have been something like `usePromise` or `useConditionalContext(?)`, but in that case developers would have to memorize which hooks can be used conditionally, so it was unified into a single `use`.

### Why Can It Only Be Called Inside Components?

Even though `use` can be called conditionally, the reason it is still a hook is that it can only operate while React is rendering. Therefore, `use` can only exist as a component or a hook. In theory, using `use` inside a function that is only ever called from a React component or hook would work, but the compiler will treat it as an error.

If it were allowed to be used in ordinary functions, there would be no way to enforce this with the current type system, so tracking whether it is being executed in the correct context would fall entirely on the developer. This is also the very reason the `use` prefix was created in the first place: to distinguish React functions from non-React functions. In other words, by enforcing the `use` prefix, developers are spared the trouble of verifying that these hooks are executed in the correct context.

### Why Can't Client Components Be async?

Making asynchronous Client Components was originally considered as well. It is technically possible, but it comes with many pitfalls and caveats, so making this pattern a general recommendation was a stretch. The runtime will support such asynchronous Client Components, but a warning will be logged during development. To prevent confusion, asynchronous Client Components will not be documented either.

One of the biggest reasons asynchronous Client Components are not recommended is that a `prop` can invalidate the component's memoization, making it far too easy for the microtask optimization to break down.

However, there is one scenario where asynchronous Client Components are valid: updating data only during navigation. But to guarantee this case, they would need to be integrated with the router's behavior, and it is unclear to what extent that should be documented and managed. Therefore, asynchronous Client Components were not banned entirely. Experiments with this are expected to happen in places like react-router and Next.js.

## Summary

- With the addition of optimizations that allow React's rendering to be suspended and resumed, there seems to have been a lot of deliberation about how to handle this on the client.
- To distinguish between Client Components and Server Components (along with technical reasons, developer convenience, etc.), the team seems to have introduced `await` and `use` as another point of differentiation. At first glance, this seems like a reasonable choice.
- As mentioned in the RFC, it seems `use` will not arrive until `cache` arrives. However, `cache` has not even shown up in an RFC yet, so it looks like it will be hard to see it appear for a while.
- Adding a status to the Promise object seems a bit,, provocative. They aren't even using a `Symbol`. I can only hope this work never ends up tangled with the standard in the future.
- Looking at the discussion going on at https://github.com/reactjs/rfcs/pull/229, it seems the React community is headed for a lot of confusion, just as with Server Components. The many changes in version 18 may turn out to be a major inflection point for React. Will they be embraced as changes for a better web, or will they end up producing an even larger anti-React camp?
