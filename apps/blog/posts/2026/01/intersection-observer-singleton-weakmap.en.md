---
title: 'Preventing Memory Leaks with IntersectionObserver Singleton Pattern and WeakMap'
tags:
  - javascript
  - frontend
  - web-performance
published: true
date: 2026-01-17 21:30:00
description: 'How to efficiently observe hundreds of elements while preventing memory leaks'
art:
  layout: rings
  hue: cyan
  tone: light
  hero: 'WeakMap'
---

## Table of Contents

## Introduction

IntersectionObserver is an essential API for infinite scrolling, lazy loading, and ad viewability measurement. But what happens when each component creates its own observer?

In a list with 100 items, if each item creates its own observer, you end up with 100 IntersectionObserver instances. This not only wastes memory but also impacts performance since each observer performs intersection calculations separately.

In this article, we'll explore how to share observers using the singleton pattern and prevent memory leaks with WeakMap.

## Why IntersectionObserver is More Efficient Than Scroll Events

Before IntersectionObserver, we had to use scroll events to check element visibility.

```typescript
window.addEventListener('scroll', () => {
  const rect = element.getBoundingClientRect()
  const isVisible = rect.top < window.innerHeight && rect.bottom > 0

  if (isVisible) {
    loadImage()
  }
})
```

This approach has several serious problems.

### Main Thread Blocking

Scroll event handlers execute **synchronously on the main thread**. Every time you scroll, the handler is called, and calling `getBoundingClientRect()` inside it forces the browser to **reflow**.

```typescript
// Checking 100 elements during scroll → can trigger 100 reflows
elements.forEach((el) => {
  const rect = el.getBoundingClientRect() // reflow!
  // ...
})
```

Reflow is an expensive operation. For the browser to calculate accurate element positions, it needs to traverse the DOM tree and apply styles. When these operations repeat during scrolling, you get frame drops and janky performance.

### How IntersectionObserver Works

IntersectionObserver works completely differently.

1. **Asynchronous Processing**: Intersection calculations don't block the main thread. The browser handles them internally, integrated with the rendering pipeline.

2. **Batch Processing**: It calculates intersection states for multiple elements at once and calls the callback with only the changed elements.

3. **Idle Time Utilization**: Calculations are performed when the browser has spare time. It doesn't check every frame during scrolling.

4. **Hardware Acceleration**: Some browsers detect intersections at the GPU compositor level.

What's particularly important is that **when a single observer watches multiple elements**, browsers can optimize this. It's much more efficient to have one observer watching 100 elements than creating 100 individual observers.

## Utilizing rootMargin and threshold

By leveraging IntersectionObserver's options effectively, you can implement various UX patterns.

### rootMargin: Expanding/Contracting the Viewport

`rootMargin` expands or contracts the root element's boundaries. It's specified in the same format as CSS margin.

```typescript
// Detect 200px before entering the viewport
const observer = new IntersectionObserver(callback, {
  rootMargin: '200px 0px',
})
```

For image lazy loading, using the native `loading="lazy"` attribute is actually simpler.

```html
<img src="image.jpg" loading="lazy" />
```

IntersectionObserver is more useful for cases like **infinite scrolling** or **data prefetching**. You can preload the next page when scrolling approaches the end.

```typescript
const prefetchObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        prefetchNextPage() // Preload next page data
      }
    })
  },
  {rootMargin: '500px 0px'}, // Detect 500px before the end
)

// Observe the last item in the list
prefetchObserver.observe(lastItemElement)
```

You can also use negative values to contract the viewport. If you want to detect only when an element is **centered in the viewport**:

```typescript
// Detect only in the center 50% area, excluding top/bottom 25% each
const observer = new IntersectionObserver(callback, {
  rootMargin: '-25% 0px',
})
```

### threshold: Visibility Ratio Criteria

`threshold` specifies the visibility ratio at which the callback executes. The default is 0, meaning the callback executes when even 1 pixel is visible.

```typescript
// Execute callback when 50% of the element is visible
const observer = new IntersectionObserver(callback, {
  threshold: 0.5,
})

// Execute callback when the element is completely visible
const observer = new IntersectionObserver(callback, {
  threshold: 1.0,
})
```

**Specifying multiple thresholds as an array** executes the callback at each ratio. This is useful for tracking scroll progress.

```typescript
// Execute callback at 10% intervals
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const progress = Math.round(entry.intersectionRatio * 100)
      updateProgressBar(progress)
    })
  },
  {threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]},
)
```

**Ad viewability measurement** typically requires 50% or more exposure to count as "viewed".

```typescript
const adObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.intersectionRatio >= 0.5) {
        trackAdImpression(entry.target.dataset.adId)
        adObserver.unobserve(entry.target)
      }
    })
  },
  {threshold: 0.5},
)
```

## The Problem

Let's look at a typical IntersectionObserver usage pattern.

```typescript
function LazyImage({ src }: { src: string }) {
  const ref = useRef<HTMLImageElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true)
        observer.disconnect()
      }
    })

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return <img ref={ref} src={isVisible ? src : placeholder} />
}
```

This code works, but creates a new observer for each component instance. With 100 images, you get 100 observers.

### Why One IntersectionObserver is Enough?

IntersectionObserver is designed to observe multiple elements simultaneously. You can call the `observe()` method multiple times with a single observer.

```typescript
const observer = new IntersectionObserver(callback)

observer.observe(element1)
observer.observe(element2)
observer.observe(element3)
// One observer watching multiple elements
```

The browser internally groups these elements for efficient intersection calculations. Therefore, when using the same options (root, rootMargin, threshold), sharing an observer is much more efficient.

## Sharing Observers with the Singleton Pattern

### Basic Structure

Let's first create a VisibilityObserver class that manages multiple elements.

```typescript
type VisibilityCallback = (isVisible: boolean) => void

interface ObservedEntry {
  element: Element
  callback: VisibilityCallback
  previousVisibility: boolean | undefined
}

class VisibilityObserver {
  private observer: IntersectionObserver
  private entries = new Map<string, ObservedEntry>()
  private entriesByElement = new Map<Element, ObservedEntry>()

  constructor(options: IntersectionObserverInit = {}) {
    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const observed = this.entriesByElement.get(entry.target)
        if (observed && observed.previousVisibility !== entry.isIntersecting) {
          observed.previousVisibility = entry.isIntersecting
          observed.callback(entry.isIntersecting)
        }
      }
    }, options)
  }

  observe(key: string, element: Element, callback: VisibilityCallback): void {
    if (this.entries.has(key)) {
      this.unobserve(key)
    }

    const entry: ObservedEntry = {
      element,
      callback,
      previousVisibility: undefined,
    }

    this.entries.set(key, entry)
    this.entriesByElement.set(element, entry)
    this.observer.observe(element)
  }

  unobserve(key: string): void {
    const entry = this.entries.get(key)
    if (entry) {
      this.observer.unobserve(entry.element)
      this.entriesByElement.delete(entry.element)
      this.entries.delete(key)
    }
  }

  disconnect(): void {
    this.observer.disconnect()
    this.entries.clear()
    this.entriesByElement.clear()
  }
}
```

There are several noteworthy points here.

### Why Use Two Maps?

Why maintain two Maps: `entries` and `entriesByElement`?

```typescript
private entries = new Map<string, ObservedEntry>()        // key → entry
private entriesByElement = new Map<Element, ObservedEntry>()  // element → entry
```

The IntersectionObserver callback receives an array of `IntersectionObserverEntry`, but only provides `entry.target` (Element). We can't access the key or callback we registered.

```typescript
new IntersectionObserver((entries) => {
  for (const entry of entries) {
    console.log(entry.target) // Only Element is available
    // entry.key?  → doesn't exist
    // entry.callback?  → doesn't exist
  }
})
```

That's why we need a **reverse lookup Map** to find the original registration info by Element. We use `entriesByElement.get(entry.target)` to find and call the callback for that element.

But why do we need the `entries` Map? For `unobserve(key)`. Users unobserve by key, so we need to find the element by key to call `observer.unobserve(element)`.

```typescript
unobserve(key: string): void {
  const entry = this.entries.get(key)  // key → entry
  if (entry) {
    this.observer.unobserve(entry.element)  // extract element from entry
    this.entriesByElement.delete(entry.element)
    this.entries.delete(key)
  }
}
```

In summary:

- `entries`: to find element by key (unobserve)
- `entriesByElement`: to find callback by element (IntersectionObserver callback)

### Why Track previousVisibility?

IntersectionObserver calls callbacks more frequently than you might think. Especially with threshold 0, the callback can be called whenever an element moves even 1 pixel. Being called dozens of times during scrolling is not uncommon.

```typescript
// Problem: can be called multiple times with the same state
new IntersectionObserver((entries) => {
  for (const entry of entries) {
    // Called multiple times with isIntersecting true
    if (entry.isIntersecting) {
      loadImage() // Duplicate calls!
    }
  }
})
```

By storing `previousVisibility`, we can call the callback **only when the state actually changes**.

```typescript
if (observed.previousVisibility !== entry.isIntersecting) {
  observed.previousVisibility = entry.isIntersecting
  observed.callback(entry.isIntersecting) // Only call when changed
}
```

This prevents `visible → visible` duplicate calls, executing callbacks only on `visible → hidden` or `hidden → visible` transitions.

### Advantages of Key-Based Management

Why identify elements with string keys instead of elements directly? Because of React's characteristics.

When React components re-render, refs can point to new DOM elements. This often happens with conditional rendering or lists.

```tsx
function Item({id}: {id: string}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // ref.current can change on each re-render
    observer.observe(id, ref.current, callback)
    return () => observer.unobserve(id)
  }, [id]) // id stays the same, only element changes

  return <div ref={ref}>...</div>
}
```

If you use elements directly as identifiers, the same logical item gets treated as a new observation every time the element changes. Using keys allows us to recognize it's the "same item" and replace the existing observation with the new element.

```typescript
observe(key: string, element: Element, callback: VisibilityCallback): void {
  if (this.entries.has(key)) {
    this.unobserve(key)  // Unobserve existing
  }
  // Re-register with new element
  // ...
}
```

### Making it a Singleton

```typescript
let sharedObserver: VisibilityObserver | undefined

export const getSharedVisibilityObserver = (
  options?: IntersectionObserverInit,
): VisibilityObserver => {
  if (!sharedObserver) {
    sharedObserver = new VisibilityObserver(options)
  }
  return sharedObserver
}
```

Now the entire application can share a single observer.

```typescript
function LazyImage({ id, src }: { id: string; src: string }) {
  const ref = useRef<HTMLImageElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = getSharedVisibilityObserver({ rootMargin: '100px' })

    if (ref.current) {
      observer.observe(id, ref.current, (visible) => {
        if (visible) setIsVisible(true)
      })
    }

    return () => observer.unobserve(id)
  }, [id])

  return <img ref={ref} src={isVisible ? src : placeholder} />
}
```

## Managing observers by root with WeakMap

There's one problem here. IntersectionObserver behaves differently depending on the `root` option. An observer based on the viewport and an observer based on a specific scroll container should be separate.

```typescript
// viewport-based
const viewportObserver = new IntersectionObserver(callback, {root: null})

// scroll container-based
const containerObserver = new IntersectionObserver(callback, {
  root: scrollContainer,
})
```

If we need to manage observers by root, how should we do it?

### Problems with using Map

```typescript
const observersByRoot = new Map<Element, VisibilityObserver>()

export const getSharedVisibilityObserver = (options?: {
  root?: Element
}): VisibilityObserver => {
  const root = options?.root

  if (!root) {
    // viewport-based is a global singleton
    if (!viewportObserver) {
      viewportObserver = new VisibilityObserver(options)
    }
    return viewportObserver
  }

  // root-specific singleton
  let observer = observersByRoot.get(root)
  if (!observer) {
    observer = new VisibilityObserver(options)
    observersByRoot.set(root, observer)
  }
  return observer
}
```

The problem with this code is **memory leaks**.

Let's assume a scroll container component is unmounted and removed from the DOM. That Element is no longer needed, but the `observersByRoot` Map maintains a reference to it, so it doesn't get garbage collected. The observer instance also remains in memory.

In an SPA, new scroll containers are created every time you navigate to a page, and previous containers keep accumulating in the Map. Over time, significant memory leaks can occur.

### Solving with WeakMap

WeakMap maintains **weak references** to keys. When an object used as a key is no longer referenced elsewhere, the garbage collector automatically removes that key-value pair.

```typescript
let viewportObserver: VisibilityObserver | undefined
const observersByRoot = new WeakMap<Element, VisibilityObserver>()

export const getSharedVisibilityObserver = (options?: {
  root?: Element
}): VisibilityObserver => {
  const root = options?.root

  if (!root) {
    if (!viewportObserver) {
      viewportObserver = new VisibilityObserver(options)
    }
    return viewportObserver
  }

  let observer = observersByRoot.get(root)
  if (!observer) {
    observer = new VisibilityObserver(options)
    observersByRoot.set(root, observer)
  }
  return observer
}
```

Now when a scroll container is removed from the DOM:

1. The reference to the Element disappears.
2. WeakMap automatically cleans up the entry with that Element as a key.
3. The VisibilityObserver instance is also garbage collected.

We can handle dynamically created scroll containers without worrying about memory leaks.

## Understanding WeakMap deeply

### What is a weak reference?

When you assign an object to a variable in JavaScript, a **strong reference** is created. The garbage collector won't release an object from memory as long as at least one strong reference remains.

```typescript
let obj = {name: 'test'} // creates strong reference
const map = new Map()
map.set(obj, 'some data') // Map also holds a strong reference to obj

obj = null // broke the variable's reference but...
// The object won't be GC'd because Map still maintains a reference
```

A **weak reference** is a reference that the garbage collector doesn't include in the reference count. If only weak references remain, the object becomes eligible for GC.

```typescript
let obj = {name: 'test'}
const weakMap = new WeakMap()
weakMap.set(obj, 'some data') // WeakMap holds a weak reference

obj = null // the only strong reference is gone
// Since WeakMap's reference is weak, the object gets GC'd
// The corresponding entry in WeakMap is also automatically removed
```

### Why can't WeakMap be iterated?

WeakMap doesn't have `keys()`, `values()`, `entries()`, `forEach()` methods, and no `size` property either. This is an intentional design constraint.

Garbage collection is **non-deterministic**. You can't predict exactly when it will run or which objects will be collected. If WeakMap could be iterated, problems like this would occur:

```typescript
// hypothetical code (not actually possible)
for (const [key, value] of weakMap) {
  // What if GC runs during iteration?
  // Unvisited entries could suddenly disappear
  console.log(key, value)
}

console.log(weakMap.size) // different value each time?
```

If iteration results varied based on GC timing, code behavior would be unpredictable. To prevent this non-determinism, WeakMap doesn't provide iteration functionality at all.

### Map vs WeakMap comparison

| Feature     | Map                        | WeakMap                      |
| ----------- | -------------------------- | ---------------------------- |
| Key types   | Any value                  | Objects only                 |
| Key refs    | Strong reference           | Weak reference               |
| GC target   | Requires explicit deletion | Auto-deleted when key is GC  |
| Iterable    | Yes (for...of, forEach)    | No                           |
| size prop   | Yes                        | No                           |
| When to use | Direct key lifecycle mgmt  | Tied to key object lifecycle |

### Other use cases for WeakMap

#### 1. Storing private data

Before ES2022, there were no private class fields. WeakMap could implement private data inaccessible from outside.

```typescript
const privateData = new WeakMap<object, {password: string}>()

class User {
  constructor(name: string, password: string) {
    this.name = name
    privateData.set(this, {password})
  }

  name: string

  checkPassword(input: string): boolean {
    return privateData.get(this)?.password === input
  }
}

const user = new User('kim', 'secret123')
console.log(user.name) // 'kim' (accessible)
console.log(privateData.get(user)) // inaccessible from outside the module
```

When a User instance is GC'd, the password data in WeakMap is automatically cleaned up too.

#### 2. Caching/memoization

Using WeakMap for caches with objects as keys automatically cleans up the cache when the original object is no longer needed.

```typescript
const cache = new WeakMap<object, string>()

function expensiveOperation(obj: object): string {
  if (cache.has(obj)) {
    return cache.get(obj)!
  }

  const result = JSON.stringify(obj) // assume this is expensive
  cache.set(obj, result)
  return result
}

let data = {a: 1, b: 2}
expensiveOperation(data) // calculates and caches
expensiveOperation(data) // returns from cache

data = null // release original object reference
// Cache entry is also automatically GC'd (no explicit deletion needed)
```

#### 3. Attaching metadata to DOM nodes

```typescript
const nodeData = new WeakMap<Element, {clickCount: number}>()

function trackClicks(element: Element) {
  element.addEventListener('click', () => {
    const data = nodeData.get(element) ?? {clickCount: 0}
    data.clickCount++
    nodeData.set(element, data)
  })
}

// When element is removed from DOM, metadata is automatically cleaned up
```

### WeakSet, WeakRef, FinalizationRegistry

JavaScript provides other weak reference-related APIs besides WeakMap.

#### WeakSet

The Set version of WeakMap. Used when you only need to track the existence of objects without values.

```typescript
const visited = new WeakSet<Element>()

function markAsVisited(element: Element) {
  visited.add(element)
}

function hasVisited(element: Element): boolean {
  return visited.has(element)
}
```

#### WeakRef (ES2021)

Creates a weak reference to an object directly. Access the original object with the `deref()` method, or get `undefined` if it's been GC'd.

```typescript
let obj = {data: 'important'}
const weakRef = new WeakRef(obj)

console.log(weakRef.deref()) // { data: 'important' }

obj = null
// After GC runs...
console.log(weakRef.deref()) // undefined (if GC'd)
```

#### FinalizationRegistry (ES2021)

Executes a callback when an object is GC'd. Useful when cleanup work is needed.

```typescript
const registry = new FinalizationRegistry((heldValue: string) => {
  console.log(`${heldValue} object has been GC'd`)
  // cleanup external resources, etc.
})

let obj = {name: 'test'}
registry.register(obj, 'test object')

obj = null
// When GC runs, prints "test object object has been GC'd"
```

However, FinalizationRegistry depends on GC timing, so callback execution isn't guaranteed. It's better not to rely on it for critical cleanup tasks.

## Real usage examples

### Wrapping with a custom hook

```typescript
interface UseVisibilityOptions {
  root?: Element | null
  rootMargin?: string
  threshold?: number
  onVisible?: () => void
  onHidden?: () => void
}

function useVisibility(
  key: string,
  options: UseVisibilityOptions = {},
): [RefObject<HTMLElement>, boolean] {
  const {root, rootMargin, threshold, onVisible, onHidden} = options
  const ref = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = getSharedVisibilityObserver({
      root: root ?? undefined,
      rootMargin,
      threshold,
    })

    observer.observe(key, element, (visible) => {
      setIsVisible(visible)
      if (visible) {
        onVisible?.()
      } else {
        onHidden?.()
      }
    })

    return () => observer.unobserve(key)
  }, [key, root, rootMargin, threshold, onVisible, onHidden])

  return [ref, isVisible]
}
```

### Combined with real-time data subscription

If you want to subscribe to WebSocket only for visible elements:

```typescript
function StockPrice({symbol}: {symbol: string}) {
  const [ref, isVisible] = useVisibility(`stock-${symbol}`)

  useEffect(() => {
    if (isVisible) {
      subscribeToPrice(symbol)
    } else {
      unsubscribeFromPrice(symbol)
    }

    return () => unsubscribeFromPrice(symbol)
  }, [symbol, isVisible])

  // ...
}
```

Even with 100 stocks, only the 10 visible ones receive real-time data. As you scroll, visible stocks change and subscriptions automatically switch.

## Precautions

### Different rootMargin requires separate observers

The current implementation creates only one observer per root. To handle different rootMargin or threshold values, you need to create keys that include options.

```typescript
const getObserverKey = (options: IntersectionObserverInit) => {
  return `${options.rootMargin ?? '0px'}-${options.threshold ?? 0}`
}

// manage observers by root and options
const observersByRootAndOptions = new WeakMap<
  Element,
  Map<string, VisibilityObserver>
>()
```

In practice, the same rootMargin is used in most cases, so extend only when necessary.

### Consider SSR environments

IntersectionObserver doesn't exist in server-side rendering. It should be created conditionally.

```typescript
class VisibilityObserver {
  private observer: IntersectionObserver | null = null

  constructor(options: IntersectionObserverInit = {}) {
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(/* ... */)
    }
  }

  observe(key: string, element: Element, callback: VisibilityCallback): void {
    if (!this.observer) {
      // In SSR, either treat as always visible or do nothing
      callback(true)
      return
    }
    // ...
  }
}
```

## Conclusion

The combination of IntersectionObserver singleton pattern and WeakMap provides these benefits:

1. **Memory efficiency**: Observe hundreds of elements with a single observer
2. **Automatic cleanup**: Related observers are automatically GC'd when DOM elements are removed
3. **Flexible extension**: Independent observer management per root

WeakMap is a useful tool "when you want to manage data tied to object lifecycles." Use it when storing metadata connected to DOM elements, component instances, caches, etc.

## References

- [MDN: IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver)
- [MDN: WeakMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
