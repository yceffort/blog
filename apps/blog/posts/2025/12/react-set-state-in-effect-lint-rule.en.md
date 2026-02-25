---
title: "React's New Lint Rule: set-state-in-effect"
tags:
  - react
  - javascript
  - testing
published: true
date: 2025-12-16 15:30:00
description: "Why you shouldn't call setState in Effects and what alternatives exist"
---

## Table of Contents

## Overview

Starting with `eslint-plugin-react-hooks` version 6.1.0, a new rule called `set-state-in-effect` has been added. This rule is one of the new React Compiler-based lint rules that catches patterns where `setState` is called synchronously inside `useEffect`.

While React documentation has long warned against unnecessary Effect usage under the title "You Might Not Need an Effect," there was no actual lint rule to enforce this. Now there's an official rule that detects and warns against this pattern.

## Why Was This Rule Created?

When you call `setState` synchronously inside an Effect, the following problems occur:

1. Component renders
2. DOM gets updated
3. Effect runs and `setState` is called
4. **Rendering starts again**
5. DOM gets updated again

The result is that what could be done in a single render cycle takes two render cycles. This causes performance degradation and can even cause screen flickering if re-rendering occurs before the browser paints.

### Relationship with React Compiler

It's no coincidence that this rule was added **now**. It's directly related to the **React Compiler**, which was officially released with React 19.

React Compiler is a build-time tool that automatically applies memoization without manually writing `useMemo`, `useCallback`, or `React.memo`. It's a project Meta has been developing for nearly 10 years, reportedly achieving up to 12% loading speed improvements and 2.5x faster interactions.

However, for the Compiler to work properly, code must follow the **Rules of React**. Components must be pure, return the same output for the same input, and side effects must execute outside of rendering. Calling `setState` synchronously inside Effects violates these rules.

When rule-violating code is found, the Compiler **skips optimization** for that component. The app won't break, but that part won't benefit from optimization. The `set-state-in-effect` rule was added to catch these violations at compile time.

Ultimately, this rule isn't just a code style guide. It's closer to a **prerequisite** for receiving full optimization benefits in the React Compiler era.

## Common Anti-patterns

### Copying Props to State

This is the most common mistake.

```jsx
function Component({data}) {
  const [items, setItems] = useState([])

  useEffect(() => {
    setItems(data)
  }, [data])

  return <List items={items} />
}
```

This code causes unnecessary additional renders whenever `data` changes. You can just use `data` directly.

```jsx
function Component({data}) {
  return <List items={data} />
}
```

### Doing Calculations in Effects That Could Be Done During Rendering

```jsx
function Component({rawData}) {
  const [processed, setProcessed] = useState([])

  useEffect(() => {
    setProcessed(rawData.map((item) => transform(item)))
  }, [rawData])

  return <List items={processed} />
}
```

Data transformation can be performed during rendering. There's no need to manage it as state.

```jsx
function Component({rawData}) {
  const processed = rawData.map((item) => transform(item))
  return <List items={processed} />
}
```

If the transformation is expensive, you can use `useMemo`.

```jsx
function Component({rawData}) {
  const processed = useMemo(
    () => rawData.map((item) => transform(item)),
    [rawData],
  )

  return <List items={processed} />
}
```

### Managing Values Derivable from Props as State

```jsx
function Component({selectedId, items}) {
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setSelected(items.find((item) => item.id === selectedId))
  }, [selectedId, items])

  return <Detail item={selected} />
}
```

`selected` can be calculated from `selectedId` and `items` at any time. No state needed.

```jsx
function Component({selectedId, items}) {
  const selected = items.find((item) => item.id === selectedId)
  return <Detail item={selected} />
}
```

### useMount Pattern

This is a commonly used pattern in SSR environments to avoid hydration mismatches.

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

This pattern renders nothing on the server and shows content on the client after mounting. While it seems like a reasonable way to solve SSR issues, this is actually an **anti-pattern** too.

`true` is a constant value known at render time. It's not a value that can "only be known after rendering" like DOM measurements. It ultimately causes unnecessary cascading renders (double rendering).

#### Alternative 1: useSyncExternalStore

Using `useSyncExternalStore` provided since React 18, you can handle SSR/CSR branching without Effects.

```jsx
function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true, // true on client
    () => false, // false on server
  )
}

function Component() {
  const mounted = useIsMounted()

  if (!mounted) return null

  return <ClientOnlyContent />
}
```

This approach has no useEffect and no unnecessary re-renders.

#### Alternative 2: Next.js dynamic import

If you're using Next.js, you can skip SSR entirely with `dynamic` import.

```jsx
import dynamic from 'next/dynamic'

const ClientOnlyComponent = dynamic(() => import('./ClientOnlyComponent'), {
  ssr: false,
})
```

#### Why Doesn't useSyncExternalStore Cause Re-renders?

Unlike the `useEffect` + `setState` combination, `useSyncExternalStore` can avoid cascading renders because it's **synchronously integrated** with React's rendering lifecycle.

`useEffect` runs **after** rendering is complete. Therefore, calling `setState` inside an Effect inevitably starts a new render cycle.

In contrast, `useSyncExternalStore` reads snapshots **during** rendering. The third argument, `getServerSnapshot`, is key—this value is used on the server and also starts with this value during client hydration. If `getSnapshot` returns a different value after hydration is complete, re-rendering occurs then, but this is a normal flow that React expects and manages.

It also prevents **Tearing** problems that can occur in Concurrent Mode. If an external store changes during rendering, different parts of the UI might show different data, but `useSyncExternalStore` detects this and re-renders with consistent data.

## Real Project Cases

My blog project also had cases that triggered this rule. Let's look at how to handle each one.

### 1. DOM Element Query and State Storage (TableOfContents)

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

This case stores the result of **DOM element queries**. Since the DOM doesn't exist yet at render time, it must be handled in an Effect. This case falls under **rule exceptions**.

However, since the current rule can't automatically distinguish this, it's appropriate to explicitly handle the exception with an `eslint-disable` comment.

```jsx
// eslint-disable-next-line react-hooks/set-state-in-effect
setHeadings(items)
```

### 2. Scroll Event Handler (MobileTOC)

```jsx
useEffect(() => {
  const handleWindowScroll = () => {
    setShowScrollTop(window.scrollY > 50)
  }

  window.addEventListener('scroll', handleWindowScroll)
  return () => window.removeEventListener('scroll', handleWindowScroll)
}, [])
```

This case calls `setState` **inside an event handler**. This isn't calling it synchronously inside the Effect, but calling it asynchronously later when the event occurs, so it's **not a rule violation**.

### 3. sessionStorage Restoration + setMounted (InfiniteScrollList)

```jsx
useEffect(() => {
  const stored = getStoredState(storageKey)
  if (stored && stored.uniqueKey === uniqueKey) {
    setPosts(stored.posts)
  }
  setMounted(true)
}, [storageKey, uniqueKey])
```

This code has two synchronous setState calls.

**`setPosts(stored.posts)`**: Restoring data from external storage (sessionStorage). Since browser APIs can't be accessed at render time (SSR environment), Effect handling is necessary. This can be improved with `useSyncExternalStore`.

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

**`setMounted(true)`**: This is the anti-pattern described earlier. Since it's storing a constant value, it should be replaced with `useSyncExternalStore` or `dynamic import`.

### 4. Async Data Fetching (CommandPalette)

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

This case stores **async operation results**. Since it's called after `fetch` completes, it's not synchronous `setState`. This is also **not a rule violation**.

## When setState in Effects is Allowed

To summarize, `setState` is allowed inside Effects in these cases:

1. **When based on values read from refs** (DOM measurements, etc.)
2. **When storing async operation results** (fetch, setTimeout, etc.)
3. **When called inside event handlers** (addEventListener callbacks)
4. **When synchronizing with external systems** (browser APIs, subscriptions, etc.)

The key point is that you should only use `setState` inside Effects when dealing with **values that can't be known at render time**.

## How to Enable the Rule

To use this rule, you need `eslint-plugin-react-hooks` 6.1.0 or higher.

```js
// eslint.config.js (Flat Config)
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  reactHooks.configs.flat.recommended,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn', // or 'error'
    },
  },
]
```

To enable all React Compiler rules, you can also use the `recommended-latest` configuration.

## Rule Limitations

This rule isn't perfect. GitHub has issues saying the rule is **too strict**.

### [#34743](https://github.com/facebook/react/issues/34743): Inconsistency with Official Documentation

```jsx
useEffect(() => {
  setDidMount(true)
}, [])
```

This pattern has been widely used to avoid hydration mismatches, and some documentation still introduces this approach. While `useSyncExternalStore` is a better alternative as we saw earlier, this pattern is commonly found in existing codebases, so migration costs may occur.

### [#34905](https://github.com/facebook/react/issues/34905): Async Function False Positives

```jsx
const fetchData = useCallback(async () => {
  const response = await fetch('/api/data')
  setReady(true) // Not synchronous call since it's after await
}, [])

useEffect(() => {
  fetchData()
}, [fetchData])
```

`setState` called after `await` isn't a synchronous call, so it doesn't cause cascading render problems. However, the rule can't distinguish this and shows warnings.

The React Compiler team is aware of these issues. We'll have to wait and see if they improve.

## Core Principle

> If it can be calculated from existing Props or State, don't put it in State. Calculate it during rendering.

Remembering this principle will help you handle most cases correctly. Effects are for synchronizing with external systems, not for internal state synchronization.

## Conclusion

If the `set-state-in-effect` rule shows a warning, first ask yourself "Do I really need to manage this value as state?" In most cases, calculating during rendering or removing state entirely is the answer.

However, there are cases that really need to be handled in Effects, like DOM measurements or external system integration. In such cases, it's good to use `eslint-disable` comments along with explaining why the exception is needed.

## References

- [set-state-in-effect - React](https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-effect)
- [eslint-plugin-react-hooks - npm](https://www.npmjs.com/package/eslint-plugin-react-hooks)
- [React 19.2 - React](https://react.dev/blog/2025/10/01/react-19-2)
- [isMounted is an Antipattern - React Blog](https://legacy.reactjs.org/blog/2015/12/16/ismounted-antipattern.html)
- [Avoiding Hydration Mismatches with useSyncExternalStore - TkDodo](https://tkdodo.eu/blog/avoiding-hydration-mismatches-with-use-sync-external-store)
- [How useSyncExternalStore() works internally in React? - jser.dev](https://jser.dev/2023-08-02-usesyncexternalstore/)
- [React Compiler v1.0 - React](https://react.dev/blog/2025/10/07/react-compiler-1)
- [Rules of React - React](https://react.dev/reference/rules)