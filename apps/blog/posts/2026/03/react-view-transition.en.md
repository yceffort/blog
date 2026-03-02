---
title: "React's <ViewTransition>: Browser-Native Animation, Done the React Way"
tags:
  - react
  - css
  - nextjs
published: true
date: 2026-03-02 10:45:38
description: 'What happens when React wraps the View Transition API'
---

## Table of Contents

## Overview

Adding animations during page transitions or UI state changes on the web has traditionally required writing CSS `transition`/`animation` manually or relying on libraries like Framer Motion. Transitions where "the old state disappears and a new state appears" are particularly tricky because you need to keep both states in the DOM simultaneously while orchestrating the animation.

The [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) solves this problem at the browser level. Instead of developers managing two states simultaneously, the browser takes snapshots before and after the transition and creates the animation automatically.

## What Is the View Transition API

Here's how it works:

```js
document.startViewTransition(() => {
  // Modify the DOM inside this callback
  container.innerHTML = newContent
})
```

When `startViewTransition` is called, the browser goes through three stages:

1. **Capture**: Captures the current screen as a bitmap snapshot (`::view-transition-old`)
2. **Change**: Executes the callback to update the DOM
3. **Transition**: Captures the new DOM state (`::view-transition-new`) and applies a cross-fade animation between old and new

By default, the entire page cross-fades, but you can designate individual elements with the `view-transition-name` CSS property to animate them separately. If elements with the same `view-transition-name` exist before and after the transition, the browser creates a shared element animation that automatically interpolates position, size, and shape.

```css
.thumbnail {
  view-transition-name: hero-image;
}
```

This alone creates an animation where a small thumbnail on a list page naturally scales up and moves to a large image on a detail page. No additional CSS required.

The problem is that this API assumes **DOM changes happen synchronously within the callback**. React doesn't guarantee this.

The React team solved this with a `<ViewTransition>` component. As of March 2026, it's available in the `react@canary` channel but not yet included in stable releases. However, the [React Labs blog post (2025.04)](https://react.dev/blog/2025/04/23/react-labs-view-transitions-activity-and-more) states that it's been tested in production and the API design is nearly finalized, so it's worth exploring early.

## Why React Needs a Dedicated Component

Without React, using the View Transition API is straightforward — just modify the DOM directly inside the `startViewTransition` callback. The DOM change must be **synchronous**. When `startViewTransition` is called, the browser (1) captures the current screen as a snapshot, (2) executes the callback, and (3) captures the new DOM state when the callback returns. If the DOM hasn't changed by the time the callback returns, the old and new snapshots are identical and no transition animation occurs.

In React, `setState` is batched asynchronously, so you need to force synchronous rendering with `flushSync`.

```tsx
function handleClick() {
  document.startViewTransition(() => {
    flushSync(() => {
      setState(newState)
    })
  })
}
```

This approach hits concrete problems in real usage.

**Using it with Suspense causes fallbacks to reappear.** `flushSync` can force pending Suspense boundaries back to their fallback state. You might be showing content after data has loaded, only to have the skeleton flash back due to a single `flushSync` call. React's official documentation explicitly warns that [`flushSync` can cause Suspense fallbacks to reappear](https://react.dev/reference/react-dom/flushSync).

**Conflicts with other `flushSync` calls cause View Transitions to be skipped entirely.** React Transitions must complete synchronously, but if another `flushSync` intervenes, React abandons the Transition sequence. This can happen in real apps with overlapping user interactions, leading to hard-to-debug bugs where animations intermittently stop working.

**Fundamentally incompatible with Concurrent features.** Updates wrapped in `startTransition` can be intentionally delayed, and components inside Suspense can suspend rendering while waiting for data. This contradicts the View Transition API's requirement for "immediate DOM changes within the callback."

The `<ViewTransition>` component solves this from within React. Since React controls the rendering cycle, it can call `startViewTransition` at the exact moment DOM updates complete, automatically coordinating with Suspense boundaries and Concurrent rendering.

|                      | Vanilla JS     | React + flushSync         | `<ViewTransition>` |
| -------------------- | -------------- | ------------------------- | ------------------ |
| DOM timing           | Direct control | Unpredictable             | React coordinates  |
| Suspense integration | Not possible   | Risk of fallback reappear | Automatic support  |
| view-transition-name | Manual CSS     | Manual CSS                | Automatic          |
| Concurrent rendering | N/A            | Incompatible              | Automatic support  |

## Comparison with Other Frameworks

Compared to other frameworks, React's approach is notably heavy. The reason lies in the differences in rendering models.

**SvelteKit** operates on [Svelte 5's signal-based fine-grained reactivity](https://frontendmasters.com/blog/fine-grained-reactivity-in-svelte-5/). When a `$state` value changes, only the DOM nodes that depend on it are updated directly. There's no virtual DOM diffing, and changes are reflected in the DOM immediately when they occur. This makes View Transition integration surprisingly simple — it just provides an [`onNavigate`](https://svelte.dev/blog/view-transitions) lifecycle hook.

```js
// +layout.svelte
import {onNavigate} from '$app/navigation'

onNavigate((navigation) => {
  if (!document.startViewTransition) return

  return new Promise((resolve) => {
    document.startViewTransition(async () => {
      resolve()
      await navigation.complete
    })
  })
})
```

SvelteKit officially states that it ["doesn't greatly abstract over how View Transitions work — you're using the browser's built-in API directly"](https://svelte.dev/blog/view-transitions). This is possible because the framework doesn't need to control DOM timing.

**Angular** just needs to add [`withViewTransitions()`](https://angular.dev/api/router/withViewTransitions) to the router. Since the DOM is updated synchronously during the Change Detection cycle, there are no timing issues within `startViewTransition` callbacks.

```ts
export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes, withViewTransitions())],
}
```

**Nuxt (Vue)** requires just one configuration line (`experimental.viewTransition: true`). Vue's reactivity system batch-updates in the microtask queue, but DOM change completion timing is predictable via `nextTick`.

React combines virtual DOM diffing, Concurrent Rendering, Suspense, and automatic batching so that "when the DOM changes" is known only to the framework and not exposed to developers. Since the View Transition API must intervene at precisely that timing, a dedicated component was necessary.

|                | Abstraction Level         | DOM Updates                      | View Transition Integration                  |
| -------------- | ------------------------- | -------------------------------- | -------------------------------------------- |
| **SvelteKit**  | Minimal (one hook)        | Signal-based direct updates      | Native API used directly in `onNavigate`     |
| **Angular**    | One router config line    | Synchronous (Change Detection)   | `withViewTransitions()` auto-connects router |
| **Nuxt (Vue)** | One config line           | Microtask batching (predictable) | `experimental.viewTransition: true`          |
| **React**      | Dedicated component + API | Asynchronous (vDOM, Concurrent)  | `<ViewTransition>` + `addTransitionType`     |

React's approach is the heaviest, but it enables things impossible in other frameworks. Animations across Suspense boundaries, automatic integration with `useDeferredValue`, and declarative shared element matching are possible because React controls the entire rendering process.

## Core Structure: What, When, How

### What — What to Animate

Wrap it with `<ViewTransition>`.

```tsx
<ViewTransition>
  <div>This element becomes the animation target</div>
</ViewTransition>
```

### When — When Animations Trigger

Three triggers exist:

- `startTransition(() => setState(...))`
- `useDeferredValue(value)`
- When a `<Suspense>` fallback transitions to actual content

Regular `setState()` won't trigger animations. This is intentional design — animating every state change would actually worsen UX.

```tsx
// ❌ No animation triggered
const handleClick = () => {
  setShowDetail(true)
}

// ✅ Animation triggered
const handleClick = () => {
  startTransition(() => {
    setShowDetail(true)
  })
}
```

### How — How to Animate

Define with CSS View Transition pseudo-selectors. Without custom CSS, the default cross-fade is applied.

```css
::view-transition-old(.slow-fade) {
  animation-duration: 500ms;
}

::view-transition-new(.slow-fade) {
  animation-duration: 500ms;
}
```

When CSS isn't enough, callbacks are available. Four callbacks exist: `onEnter`, `onExit`, `onUpdate`, `onShare`, each receiving the animated DOM element and a transition type array as arguments.

```tsx
<ViewTransition
  onEnter={(element, types) => {
    element.animate(
      [
        {transform: 'scale(0.8)', opacity: 0},
        {transform: 'scale(1)', opacity: 1},
      ],
      {duration: 300, easing: 'ease-out'},
    )
  }}
>
  <Component />
</ViewTransition>
```

Combined with the Web Animations API, dynamic animations that are difficult to express in CSS become possible.

## View Transition Pseudo-Element Structure

When a View Transition activates, the browser creates the following pseudo-element tree. Understanding this structure is necessary for CSS customization.

```
::view-transition
└── ::view-transition-group(name)
    └── ::view-transition-image-pair(name)
        ├── ::view-transition-old(name)    ← Pre-transition snapshot (image)
        └── ::view-transition-new(name)    ← Post-transition live representation
```

- `::view-transition-old`: A static snapshot of the **before** state. Default animation: `opacity: 1 → 0`.
- `::view-transition-new`: A live representation of the **after** state. Default animation: `opacity: 0 → 1`.
- `::view-transition-group`: A container wrapping old and new, handling position and size transitions.

In React, CSS classes passed as `<ViewTransition>` props become selectors for these pseudo-elements.

```tsx
<ViewTransition enter="slide-in">
  <Component />
</ViewTransition>
```

This activates selectors like `::view-transition-old(.slide-in)` and `::view-transition-new(.slide-in)` on enter.

## Four Activation Types

`<ViewTransition>` activates in four types depending on the situation. React automatically determines the nature of the DOM change and decides which type to activate.

| Type     | Description                                                                          | Example                               |
| -------- | ------------------------------------------------------------------------------------ | ------------------------------------- |
| `enter`  | When a component mounts during a Transition                                          | New element via conditional rendering |
| `exit`   | When a component unmounts during a Transition                                        | Element removal, page transition      |
| `update` | When internal DOM changes or layout moves                                            | Props change, list reordering         |
| `share`  | When an element with the same `name` disappears on one side and appears on the other | Same element transition between pages |

Individual CSS classes can be specified for each type.

```tsx
<ViewTransition enter="slide-in" exit="slide-out" update="cross-fade">
  <Component />
</ViewTransition>
```

The `default` prop sets a fallback for unspecified types. It accepts either a string or an object.

```tsx
// String: same class for all types
<ViewTransition default="fade" enter="slide-up">
  <Component />
</ViewTransition>
```

Here, enter uses `slide-up`, while the rest (exit, update, share) use `fade`.

```tsx
// Object: different classes mapped by transition type
<ViewTransition
  default={{
    'nav-forward': 'slide-left',
    'nav-back': 'slide-right',
    default: 'fade',
  }}
>
  <Component />
</ViewTransition>
```

In object form, the keys are type strings specified via `addTransitionType` and the values are CSS class names. The `default` key is the fallback when no type matches. This pattern is explored in detail in the directional slide example below.

## Practical Example 1: Enter/Exit Animation

This is the most basic usage — applying animations when elements appear and disappear, or when pages transition.

A toggle panel:

```tsx
import {useState, startTransition, ViewTransition} from 'react'

function TogglePanel() {
  const [show, setShow] = useState(false)

  return (
    <div>
      <button onClick={() => startTransition(() => setShow(!show))}>
        {show ? 'Close' : 'Open'}
      </button>
      {show && (
        <ViewTransition enter="slide-up" exit="slide-down">
          <div className="panel">
            <h3>Panel Content</h3>
            <p>This panel appears and disappears with animation.</p>
          </div>
        </ViewTransition>
      )}
    </div>
  )
}
```

```css
::view-transition-new(.slide-up) {
  animation:
    300ms ease-out slide-in-up,
    300ms ease-out fade-in;
}

::view-transition-old(.slide-down) {
  animation:
    200ms ease-in slide-out-down,
    200ms ease-in fade-out;
}

@keyframes slide-in-up {
  from {
    transform: translateY(20px);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes slide-out-down {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(20px);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@keyframes fade-out {
  to {
    opacity: 0;
  }
}
```

Clicking "Open" slides the panel up from below with a fade-in, and clicking "Close" slides it down with a fade-out. Calling just `setShow(!show)` without `startTransition` shows and hides the panel instantly without animation.

> The [demo recreated with the native View Transition API](/demos/view-transition/1-enter-exit.html) shows the actual behavior. (Open in Chrome/Edge)

Page transitions follow the same pattern. If the router uses `startTransition` internally, one `<ViewTransition>` is enough.

```tsx
function App() {
  const {url} = useRouter()

  return <ViewTransition>{url === '/' ? <Home /> : <Details />}</ViewTransition>
}
```

This alone applies a cross-fade where the previous page gradually disappears and the new page gradually appears during transitions.

## Practical Example 2: Shared Element Transition

You can create animations where the same element moves naturally between two pages. This is similar to iOS Hero Animations or Android Shared Element Transitions.

The core principle is simple. When a `<ViewTransition>` with the same `name` prop unmounts on one side and mounts on the other, React recognizes this as a transition of the same element.

List page:

```tsx
function VideoList({videos}) {
  return (
    <div className="grid">
      {videos.map((video) => (
        <Link key={video.id} href={`/video/${video.id}`}>
          <ViewTransition name={`video-${video.id}`}>
            <img src={video.thumbnail} alt={video.title} />
          </ViewTransition>
          <ViewTransition name={`title-${video.id}`}>
            <h3>{video.title}</h3>
          </ViewTransition>
        </Link>
      ))}
    </div>
  )
}
```

Detail page:

```tsx
function VideoDetail({video}) {
  return (
    <div>
      <ViewTransition name={`video-${video.id}`}>
        <video src={video.url} controls />
      </ViewTransition>
      <ViewTransition name={`title-${video.id}`}>
        <h1>{video.title}</h1>
      </ViewTransition>
      <p>{video.description}</p>
    </div>
  )
}
```

When navigating from list to detail, the small thumbnail in the grid scales up and moves to the large video player position on the detail page, while the small `h3` title naturally transitions to the larger `h1` position. Position, size, and shape interpolation are all handled automatically without writing a single line of CSS. Pressing back plays the same animation in reverse.

> In the [demo](/demos/view-transition/2-shared-element.html), click a card to see the image and title expand and move to the detail view.

In real apps, shared elements are often combined with directional slides. By wrapping the content area with `<ViewTransition>` in the Layout, images move as shared elements while the rest of the content transitions with slides. Both animations run simultaneously, creating a native app-like experience.

```tsx
function Layout({children}) {
  return (
    <div>
      <Header />
      <ViewTransition
        default={{
          'nav-forward': 'slide-left',
          'nav-back': 'slide-right',
          default: 'fade',
        }}
      >
        <main>{children}</main>
      </ViewTransition>
    </div>
  )
}
```

**Important notes:**

- Only **one** `<ViewTransition>` with the same `name` should be mounted at a time. Having two or more with the same name causes an error.
- Both elements must be within the viewport for the shared transition to form.

## Practical Example 3: Slide Animation Based on Navigation Direction

This pattern slides in different directions for back and forward navigation, using the `addTransitionType` API.

```tsx
import {startTransition, addTransitionType, ViewTransition} from 'react'

function useNavigate() {
  const router = useRouter()

  return {
    forward(url: string) {
      startTransition(() => {
        addTransitionType('nav-forward')
        router.push(url)
      })
    },
    back() {
      startTransition(() => {
        addTransitionType('nav-back')
        router.back()
      })
    },
  }
}
```

Map different classes for each type in `<ViewTransition>`.

```tsx
function App() {
  const {url} = useRouter()

  return (
    <ViewTransition
      default={{
        'nav-forward': 'slide-left',
        'nav-back': 'slide-right',
        default: 'fade',
      }}
    >
      <Page url={url} />
    </ViewTransition>
  )
}
```

Define the CSS animations.

```css
/* Forward: current page slides out left, new page enters from right */
::view-transition-old(.slide-left) {
  animation:
    150ms cubic-bezier(0.4, 0, 1, 1) both fade-out,
    400ms cubic-bezier(0.4, 0, 0.2, 1) both slide-to-left;
}

::view-transition-new(.slide-left) {
  animation:
    210ms cubic-bezier(0, 0, 0.2, 1) 150ms both fade-in,
    400ms cubic-bezier(0.4, 0, 0.2, 1) both slide-from-right;
}

/* Back: current page slides out right, previous page enters from left */
::view-transition-old(.slide-right) {
  animation:
    150ms cubic-bezier(0.4, 0, 1, 1) both fade-out,
    400ms cubic-bezier(0.4, 0, 0.2, 1) both slide-to-right;
}

::view-transition-new(.slide-right) {
  animation:
    210ms cubic-bezier(0, 0, 0.2, 1) 150ms both fade-in,
    400ms cubic-bezier(0.4, 0, 0.2, 1) both slide-from-left;
}

@keyframes slide-to-left {
  to {
    transform: translateX(-50px);
  }
}

@keyframes slide-from-right {
  from {
    transform: translateX(50px);
  }
}

@keyframes slide-to-right {
  to {
    transform: translateX(50px);
  }
}

@keyframes slide-from-left {
  from {
    transform: translateX(-50px);
  }
}
```

The result: pressing "forward" slides the current page out to the left while the new page slides in from the right, and pressing "back" reverses the direction. This provides the same visual experience as a native app's navigation stack.

> Try the [demo](/demos/view-transition/3-nav-slide.html) — move between the top tabs left and right to see directional slides.

`addTransitionType` can be called multiple times within a single `startTransition` callback. Types are simple strings that match as keys in the `<ViewTransition>` prop object.

## Practical Example 4: List Animation

Using `useDeferredValue` makes list items naturally appear and disappear during search and filtering.

```tsx
import {useState, useDeferredValue, ViewTransition} from 'react'

function FilterableList({items}) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(deferredQuery.toLowerCase()),
  )

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <ul>
        {filtered.map((item) => (
          <ViewTransition key={item.id}>
            <li>{item.name}</li>
          </ViewTransition>
        ))}
      </ul>
    </div>
  )
}
```

Since `useDeferredValue` automatically creates Transitions, there's no need to explicitly call `startTransition`. As you type a search query, filtered-out items cross-fade away and the remaining items naturally rearrange their positions. Clearing the search query brings hidden items back with a fade-in.

Sorting follows the same pattern. Changing the sort criteria with `startTransition` automatically applies movement animations as each item shifts to its new position.

```tsx
<button onClick={() => startTransition(() => setSortBy('date'))}>Recent</button>
```

> Try the [demo](/demos/view-transition/4-list-filter.html) — use search and sort buttons to see item rearrangement animations.

**Note:** The **direct child** of `<ViewTransition>` must be a DOM element. Having other component wrappers in between may prevent animations from working.

## Practical Example 5: Suspense Integration

Animations also apply when transitioning from a `<Suspense>` fallback to actual content. There are two placement methods with different results.

### Method 1: Wrap from Outside (works as update)

```tsx
<ViewTransition>
  <Suspense fallback={<Skeleton />}>
    <Content />
  </Suspense>
</ViewTransition>
```

The transition from Skeleton to Content is treated as a single update. Visually, the skeleton gradually fades out while the actual content appears in the same position — a cross-fade effect.

### Method 2: Wrap Each Separately (works as enter/exit)

```tsx
<Suspense
  fallback={
    <ViewTransition exit="slide-down">
      <Skeleton />
    </ViewTransition>
  }
>
  <ViewTransition enter="slide-up">
    <Content />
  </ViewTransition>
</Suspense>
```

```css
::view-transition-old(.slide-down) {
  animation:
    150ms ease-out fade-out,
    150ms ease-out slide-out-down;
}

::view-transition-new(.slide-up) {
  animation:
    210ms ease-in 150ms fade-in,
    400ms ease-in slide-in-up;
}

@keyframes slide-out-down {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(10px);
  }
}

@keyframes slide-in-up {
  from {
    transform: translateY(10px);
  }
  to {
    transform: translateY(0);
  }
}
```

In this case, the skeleton slides down slightly while disappearing, and after a brief delay, the actual content slides up from below. Separate control over enter and exit allows for more detailed choreography.

> Compare both methods side by side in the [demo](/demos/view-transition/5-suspense-loading.html). Press both "Load Data" buttons simultaneously to see the clear difference.

Both methods wait for React to finish loading data, CSS, and fonts before starting the animation.

## Using with Next.js

In Next.js, enable the experimental `viewTransition` flag.

```ts
// next.config.ts
import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
}

export default nextConfig
```

With this flag enabled, you can import `ViewTransition` from `react` without the `unstable_` prefix. Features like automatically adding transition types to Next.js navigation (e.g., automatically connecting forward/back directions to `addTransitionType`) [have not yet been implemented as of February 2026](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition). For now, you need to call `addTransitionType` directly as shown in the examples above.

Next.js's `Link` component uses `startTransition` internally, so page transition animations work right away just by wrapping with `<ViewTransition>`.

```tsx
// app/layout.tsx
import {ViewTransition} from 'react'

export default function RootLayout({children}) {
  return (
    <html>
      <body>
        <Nav />
        <ViewTransition>{children}</ViewTransition>
      </body>
    </html>
  )
}
```

> Check out the [Next.js View Transition Demo](https://view-transition-example.vercel.app) for a working example.

## Caveats

### `<ViewTransition>` Is Not a Solution for All Animations

This is a point the React team has made clear. React's `<ViewTransition>` is specialized for **UI transitions driven by React state changes**. While the browser's View Transition API itself can be used more broadly (covered below), the React component has clear boundaries:

- ✅ Page navigation, modal open/close, list reordering, accordion expansion
- ❌ Like button heart animation, loading shimmer, typing effects, interactive drag

For the latter, continue using CSS `animation`/`transition` or libraries like Framer Motion.

### You Can Use View Transitions Without State Changes

React's `<ViewTransition>` only triggers on **React state changes** (`startTransition`, `useDeferredValue`, `Suspense`). This is because React needs to compare DOM snapshots before and after rendering. So if you want "just an animation without changing state," `<ViewTransition>` isn't the right tool.

However, **the browser's native `document.startViewTransition()` can be used without any constraints.** You can wrap any DOM change — toggling a class, changing inline styles, or letting an external library manipulate the DOM — regardless of React state.

A great example is **theme toggling**. Dark/light mode switching typically toggles a class on the `<html>` element. Since this is direct DOM manipulation rather than a React state change, `<ViewTransition>` can't animate it. Use the native API instead:

```tsx
function toggleTheme(e: React.MouseEvent) {
  const x = e.clientX
  const y = e.clientY

  document.startViewTransition(() => {
    // Direct DOM manipulation, not React state
    document.documentElement.classList.toggle('dark')
  })

  // Set CSS variables for circle-clip animation origin
  document.documentElement.style.setProperty('--theme-toggle-x', `${x}px`)
  document.documentElement.style.setProperty('--theme-toggle-y', `${y}px`)
}
```

```css
/* Circle-expand animation from click position on theme toggle */
.theme-transition-circle::view-transition-new(root) {
  animation: circle-clip 0.5s ease-in-out;
}

@keyframes circle-clip {
  from {
    clip-path: circle(0% at var(--theme-toggle-x) var(--theme-toggle-y));
  }
  to {
    clip-path: circle(150% at var(--theme-toggle-x) var(--theme-toggle-y));
  }
}
```

In summary:

| Scenario                                                     | API to Use                       |
| ------------------------------------------------------------ | -------------------------------- |
| UI transitions driven by React state                         | `<ViewTransition>`               |
| DOM manipulation outside React (theme toggle, external libs) | `document.startViewTransition()` |
| Suspense fallback → actual content                           | `<ViewTransition>`               |
| Scroll-based animations, mouse tracking, etc.                | CSS `animation`/`transition`     |

The two APIs are not mutually exclusive. It's perfectly natural to use `<ViewTransition>` for page transitions and `document.startViewTransition()` for theme toggles in the same app. In fact, this very blog does exactly that.

### prefers-reduced-motion Must Be Handled Manually

Browser accessibility settings are not automatically respected.

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

### Must Directly Wrap DOM Nodes

`<ViewTransition>` targets the first DOM node inside it. Wrapping only text or using it without DOM nodes won't work.

```tsx
// ❌ Won't work
<ViewTransition>
  Just text
</ViewTransition>

// ✅ Works
<ViewTransition>
  <span>Text must be wrapped</span>
</ViewTransition>
```

### Only One of the Same Name at a Time

```tsx
// ❌ Will error
<ViewTransition name="hero"><img src="a.jpg" /></ViewTransition>
<ViewTransition name="hero"><img src="b.jpg" /></ViewTransition>

// ✅ Use unique names
<ViewTransition name={`hero-${id}`}><img src="a.jpg" /></ViewTransition>
```

### Use `"none"` to Exclude Parts from Animation

Use this when you've applied `<ViewTransition>` to a parent but want to exclude expensive-to-render children.

```tsx
<ViewTransition>
  <div className="dashboard">
    <Header />
    <ViewTransition update="none">
      <HeavyChart data={chartData} />
    </ViewTransition>
    <Sidebar />
  </div>
</ViewTransition>
```

## Browser Support

| Browser | Same-document | Cross-document |
| ------- | :-----------: | :------------: |
| Chrome  |      ✅       |   ✅ (126+)    |
| Edge    |      ✅       |   ✅ (126+)    |
| Safari  |   ✅ (18+)    |       ❌       |
| Firefox |      ❌       |       ❌       |

The lack of Firefox support is disappointing, but browsers that don't support the View Transition API simply transition immediately without animation — functionality doesn't break. Approach it as progressive enhancement.

## Conclusion

We've explored why a dedicated component is needed to use the View Transition API in React, and how to use it. Compared to SvelteKit or Angular finishing with a single configuration line, it's clearly a heavier approach. But that weight translates into React-specific advantages like Suspense integration and automatic `useDeferredValue` connections, which makes it a reasonable trade-off.

As of March 2026, it's only available in the canary channel with no announced stable release schedule. Browser support also lacks Firefox. Rather than rushing into production, getting familiar with CSS View Transition pseudo-selector syntax and `addTransitionType` patterns will prepare you for quick adoption when the official release arrives.

## References

- [React Official Docs: \<ViewTransition\>](https://react.dev/reference/react/ViewTransition)
- [React Official Docs: addTransitionType](https://react.dev/reference/react/addTransitionType)
- [React Labs: View Transitions, Activity, and more](https://react.dev/blog/2025/04/23/react-labs-view-transitions-activity-and-more)
- [MDN: View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- [Next.js: viewTransition Configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition)
- [React View Transitions and Activity API tutorial (LogRocket)](https://blog.logrocket.com/react-view-transitions-activity-api/)
- [React's ViewTransition Element (Frontend Masters)](https://frontendmasters.com/blog/reacts-viewtransition-element/)
- [Fine-Grained Reactivity in Svelte 5 (Frontend Masters)](https://frontendmasters.com/blog/fine-grained-reactivity-in-svelte-5/)
- [Unlocking view transitions in SvelteKit](https://svelte.dev/blog/view-transitions)
- [Next.js View Transition Demo](https://view-transition-example.vercel.app)
