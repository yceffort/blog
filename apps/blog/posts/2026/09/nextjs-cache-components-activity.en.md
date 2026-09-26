---
title: "Pages You Leave Don't Die, They Hide: Next.js cacheComponents and React Activity"
tags:
  - nextjs
  - react
  - debugging
  - caching
published: true
date: 2026-09-26 22:00:00
description: "Next.js 16's cacheComponents hides the pages you leave with React Activity instead of unmounting them. Following a three.js canvas that went blank after a back navigation, I read the router, React, and react-three-fiber source and reproduced it in a browser."
art:
  undraw: tabs
  layout: glyph
  hue: cyan
  tone: light
  hero: 'display: none'
---

## Table of Contents

## The Graphic Went Blank After Going Back

At the top of this blog's [about page](/en/about) there is a graphic that draws the visitor's own page load with three.js. It reads resource requests, FCP, and LCP from the Performance Timeline, stands them up as bars, and renders them with the `<Canvas>` of [react-three-fiber](https://github.com/pmndrs/react-three-fiber) (R3F from here on). But when I went from the about page to another page and came back with the back button, the rest of the page was intact while the graphic's area was blank white. It was the same when I came back with the forward button, or by clicking the link in the header. The console had a single line: `THREE.WebGLRenderer: Context Lost.`

The cause was not in the graphic's code but between the router and a library. This blog has Next.js 16's `cacheComponents` setting turned on, and with it the App Router does not unmount the page you leave. It hides it with React's `<Activity>` instead. While hiding it, React cleans up the effects, and when showing it again, React runs the effects again. R3F 9.7.0's `<Canvas>` took that effect cleanup as an unmount and threw away its WebGL context, yet when shown again it was still holding the root it had already thrown away.

This post first covers what `cacheComponents` and Activity are, then follows the symptom down three layers: at what granularity the Next.js router hides pages and when it drops them, what React's Activity cleans up and what it keeps when hiding, and why R3F broke in between and how the library fixed it. Along the way I also wrote down two workarounds I tried and abandoned, and the results of reproducing three configurations in a browser. As it turned out, R3F had already fixed this bug two days before I wrote this post. Even so, fixing it gave me a fairly clear picture of what Activity demands of effects.

> Baseline: I read Next.js 16.3.5 and React `19.3.0-canary-cbb046ab-20260731`, which Next.js bundles for the App Router. The project's own `react-dom` is 19.2.8, but the App Router uses this canary from `next/dist/compiled/react-dom`. For R3F I compared 9.7.0, which had the problem, with 9.8.1, which contains the fix. Source quotes are pinned to the Next.js [`v16.3.5`](https://github.com/vercel/next.js/tree/v16.3.5) tag, React commit [`cbb046ab`](https://github.com/facebook/react/tree/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24), and the R3F [`v9.7.0`](https://github.com/pmndrs/react-three-fiber/tree/v9.7.0) and [`v9.8.1`](https://github.com/pmndrs/react-three-fiber/tree/v9.8.1) tags. The analysis and measurements were done on September 26, 2026.
>
> Browser behavior was reproduced with headless Chromium 153.0.8010.12 from Playwright 1.63.0 (WebGL2 via SwiftShader). The measurement method is described [later](#measuring-again-after-upgrading-to-981). Quoted code went through the blog's formatter, so semicolons and trailing commas may differ from the original, and `// ...` marks omitted parts.

## cacheComponents and Activity

### What cacheComponents is

`cacheComponents` is a setting introduced in Next.js 16 that switches the App Router's caching and rendering to a model called "Cache Components". In the docs' words, data fetching is dynamic by default, and you choose what to cache at the page, component, or function level with the `use cache` directive. Next.js prerenders a static HTML shell that is served immediately, while dynamic content streams in when ready.[^cc-docs] This is PPR (Partial Prerendering), and turning on `cacheComponents` makes PPR the App Router's default behavior. It also merges what used to be separate experimental flags, `experimental.ppr`, `experimental.useCache`, and `experimental.dynamicIO`, into one setting.

Put more simply: a page used to be either entirely static or entirely dynamic. If a single value that changes per request was mixed in, the whole page had to be rendered again on every request. With Cache Components, the parts of a page that don't change are prepared as HTML ahead of time, and only the parts that change per request are left as holes to be filled later. On a product page, for example, the product description is shown right away from prebuilt HTML, and only the logged-in user's cart count is computed and filled in at request time. What gets prepared ahead of time is not decided by Next.js on its own; the developer marks it explicitly with `use cache`.

```ts
import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
}

export default nextConfig
```

This blog also turns this setting on in `next.config.ts`. So far it sounds like a setting about what the server caches and how it renders. But the same doc has a separate section called "Navigation with Activity", which says this setting changes client-side navigation too.

> When `cacheComponents` is enabled, Next.js uses React's `<Activity>` component to preserve component state during client-side navigation. Rather than unmounting the previous route when you navigate away, Next.js sets the Activity mode to `"hidden"`.

In other words, with `cacheComponents` on, the previous page is not unmounted when you navigate to another page. Every symptom in this post starts from that one sentence.

### What Activity is

`<Activity>` is a component that became stable in React 19.2. The React docs introduce it as "`<Activity>` lets you hide and restore the UI and internal state of its children."[^activity-docs] Putting it next to conditional rendering makes the difference clear.

```tsx
// Conditional rendering: hiding unmounts the component and its state is gone
function WithCondition({isShowingSidebar}: {isShowingSidebar: boolean}) {
  return <>{isShowingSidebar && <Sidebar />}</>
}

// Activity: state and DOM survive while hidden
function WithActivity({isShowingSidebar}: {isShowingSidebar: boolean}) {
  return (
    <Activity mode={isShowingSidebar ? 'visible' : 'hidden'}>
      <Sidebar />
    </Activity>
  )
}
```

When you hide a component with conditional rendering, it is unmounted and its internal state disappears with it. When you hide it with Activity, React keeps its state and restores it exactly as it was when it becomes visible again.

Activity takes two props, `mode` and `children`. `children` is the UI to show or hide, and `mode` is a string, either `'visible'` or `'hidden'`. **If `mode` is omitted, it defaults to `'visible'`.**[^activity-docs] Based on the React docs and the release post, the two values are defined as follows.[^react-192]

| Value                 | Definition                                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'visible'` (default) | Shows the children, mounts effects (runs setup), and processes updates normally. Same as an ordinary rendered component.                                                              |
| `'hidden'`            | Hides the children with `display: none`, unmounts effects (runs cleanup), and defers updates until React has nothing left to work on. State and DOM are kept rather than thrown away. |

The implementation matches this definition. React treats a tree as hidden only when `mode === 'hidden'` and treats everything else as visible, and the internal type definition carries the comment "Default mode is visible."[^offscreen-mode] The key point is that `'hidden'` cleans up only the effects and keeps state and DOM. The release post gives two uses for it.

> You can use Activity to render hidden parts of the app that a user is likely to navigate to next, or to save the state of parts the user navigates away from. This helps make navigations quicker by loading data, css, and images in the background, and allows back navigations to maintain state such as input fields.

`cacheComponents` applies the second of these, keeping the state of the screens the user left, directly to the router. And this property, "clean up effects but keep state", is exactly where the bug in this post came from.

## Pages You Leave Are Not Unmounted

### How Activity got into the router

This behavior was not tied to `cacheComponents` from the start. In April 2025, Andrew Clark of the React team first added a flag called `experimental.routerBFCache` ([#77951](https://github.com/vercel/next.js/pull/77951)), and [#84923](https://github.com/vercel/next.js/pull/84923), merged on October 21, 2025, removed that flag and turned the behavior on automatically whenever `cacheComponents` is on.[^pr] [#84923](https://github.com/vercel/next.js/pull/84923) describes the intent like this.

> This leverages `React.Activity` on layout segments to support restoring previously visited UI segments while preserving state.

At build time, this setting becomes a constant, `process.env.__NEXT_CACHE_COMPONENTS`, that is inlined into the client bundle.[^define-env] The config schema has no option to turn off just this behavior, so to turn off Activity hiding for the whole app you have to turn off `cacheComponents` itself.

### Each segment level has its own Activity

The place that actually renders `<Activity>` is `layout-router.tsx`.[^layout-router] The App Router places a `LayoutRouter` at each level of the layout tree (each segment level), and this component does not render only the segment for the current URL. It also renders a few segments that were recently active at the same level, and keeps them inside hidden Activity boundaries so their state can be restored on the next visit. That is the intent the source comment describes.

```tsx
let bfcacheEntry: RouterBFCacheEntry | null = useRouterBFCache(
  activeTree,
  activeCacheNode,
  activeStateKey,
)
let children: Array<React.ReactNode> = []
do {
  // ...
  if (process.env.__NEXT_CACHE_COMPONENTS) {
    child = (
      <Activity
        name={debugNameToDisplay}
        key={stateKey}
        mode={stateKey === activeStateKey ? 'visible' : 'hidden'}
      >
        {child}
      </Activity>
    )
  }

  children.push(child)

  bfcacheEntry = bfcacheEntry.next
} while (bfcacheEntry !== null)
```

It walks the linked list returned by `useRouterBFCache`, creates one `<Activity>` per segment, and sets only the segment whose key matches the current URL to `visible` and the rest to `hidden`. Even after you navigate to another page, the previous page's component tree stays mounted as far as React is concerned.

The `stateKey` used as the `key` is built from the segment value.[^cache-key]

```ts
export function createRouterCacheKey(
  segment: Segment,
  withoutSearchParameters: boolean = false,
) {
  // if the segment is an array, it means it's a dynamic segment
  // for example, ['lang', 'en', 'd']. We need to convert it to a string to store it as a cache node key.
  if (Array.isArray(segment)) {
    return `${segment[0]}|${segment[1]}|${segment[2]}`
  }

  // Page segments might have search parameters, ie __PAGE__?foo=bar
  // When `withoutSearchParameters` is true, we only want to return the page segment
  if (withoutSearchParameters && segment.startsWith(PAGE_SEGMENT_KEY)) {
    return PAGE_SEGMENT_KEY
  }

  return segment
}
```

`activeStateKey` is built with `withoutSearchParameters` set to `true`. So a navigation that only changes search params is treated as the same segment, and a dynamic segment's key includes the param value. Applied to this blog's routes, the root-level key for `/about` is `about`, and the key for a post like `/2026/09/...` is `year|2026|d`. Because the post route is `app/[year]/[...slug]`, the year becomes the first segment.

### The last 3, but per segment level

How many are kept is a constant in `bfcache-state-manager.ts`.[^bfcache]

```ts
// When the flag is disabled, only track the currently active tree
const MAX_BF_CACHE_ENTRIES = process.env.__NEXT_CACHE_COMPONENTS ? 3 : 1
```

The guide also says "Next.js preserves up to 3 routes."[^guide] But the code shows that this 3 is not "the last 3 routes you visited" but **"the last 3 segments that were active at each segment level"**. `useRouterBFCache` is called separately in each `LayoutRouter`, and the file's comment also says it tracks the last N trees at "a certain segment level". The replacement rule is a simple linked list: the newly active segment goes to the front, the old list is cloned onto it from the front, and whatever is left after 3 entries is dropped. It cuts by count only, not by memory size.

So the same "going back" gives different results depending on where you went in between. What I checked in the browser matched the code.

- From the about page, going through the home page and reading **two posts from 2026**, then pressing back three times, the about page stayed hidden and reappeared (with R3F 9.7.0 its canvas went blank at this point). Only three keys pile up at the root level, `about`, home (`__PAGE__`), and `year|2026|d`, because the second post only changes the `[...slug]` at the second level.
- Going from home through **a 2026 post and then a 2022 post**, then to the about page via a link, it rendered fresh. `year|2026|d` and `year|2022|d` are different keys, so the about page was pushed out of the list.
- After going through the home, tags, and series pages, it likewise rendered fresh.

When the about page was pushed out of the list and actually unmounted, this post's symptom did not appear either. The bug only happens on the "hidden, then shown again" path.

### Back navigation and link navigation are not distinguished

The browser's bfcache (back/forward cache), as the name says, restores pages only when you move through history. Next.js's structure does not work that way. When looking up a segment in the list, it looks only at the `stateKey`, not at how you navigated. A TODO in the same file says so directly.[^bfcache]

```ts
// TODO: Once we start tracking back/forward history at each route level,
// we should use the history order instead. In other words, when traversing
// to an existing entry as a result of a popstate event, we should maintain
// the existing order instead of moving it to the front of the list. I think
// an initial implementation of this could be to pass an incrementing id
// to history.pushState/replaceState, then use that here for ordering.
```

This means that while the about page is still in the list, clicking the header link to the about page (a push navigation) shows the hidden tree again, just like going back. And indeed, with R3F 9.7.0 the canvas went blank just the same when I came back through the header link. Had I understood the symptom as a "back button bug", I would have narrowed the reproduction path too much.

As reports of existing apps breaking because of this difference kept coming, Next.js added `useRouter().bfcacheId` in May 2026 ([#93633](https://github.com/vercel/next.js/pull/93633)).[^bfcacheid] It is an identifier that changes whenever a segment is freshly created by a push or replace, and restores its previous value on back and forward navigation. Using it as a React `key` resets state on link navigation and restores it only on history navigation. The PR description points out that the browser's bfcache "implements state restoration for history traversal navigations only, not push/replace", while also stating clearly that the API itself is not a recommended pattern.

> The intent is communicate that `bfcacheId` is not considered an idiomatic pattern

The guide likewise says "`bfcacheId` is mainly a migration tool." and recommends resetting state explicitly, case by case, in new code.[^guide]

### Why the Next.js team chose this direction

Plenty of people ran into trouble with this behavior. [#86577](https://github.com/vercel/next.js/issues/86577), opened in November 2025, collected problems such as dropdowns staying open, dialog initialization logic not running again, and E2E tests breaking on hidden DOM, and it is still open at the time of writing.[^86577] Reading the explanation Sam Selikoff of the Next.js team left in that issue, there are two intentions.

One is to give every Next.js app, by default, the experience the browser's bfcache has long provided in MPAs (traditional websites made of separate HTML documents): press back and the previous screen appears instantly, with its scroll position, form inputs, and even the DOM state of uncontrolled elements intact. In SPAs, developers had to save and restore that state themselves. The other is a foundation for upcoming features.

> Both of these features (as well as others) rely on Activity-robust client code as part of their foundation, since animations really only work if the old and new screens are already ready to be displayed.

"These features" here refers to View Transitions tied to page navigations and React's Gesture APIs. I think keeping the pages you leave hidden is less a caching feature than a turning point that requires client code to survive being hidden and shown again. The same comment also floated opting specific segments out and applying the behavior only to back navigations, but those came with the caveat that they would not be compatible with upcoming features. What actually shipped afterwards was the `bfcacheId` above.

## What Activity Does When Hiding

### Activity is a thin shell over Offscreen

The implementation shows that Activity itself does very little. `mountActivityChildren` creates one `OffscreenComponent` fiber (the internal unit of work React uses to represent each component) as its child and passes `mode` straight through.[^begin-work]

```js
const nextChildren = nextProps.children;
const nextMode = nextProps.mode;
const mode = workInProgress.mode;
const offscreenChildProps: OffscreenProps = {
  mode: nextMode,
  children: nextChildren,
};
const primaryChildFragment = mountWorkInProgressOffscreenFiber(
  offscreenChildProps,
  mode,
  renderLanes,
);
```

All the hiding and showing lives on the Offscreen side. The same Offscreen is what Suspense uses to hide its original children while showing a fallback. Offscreen is a mechanism React used internally first, and Activity can be seen as the name under which it was exposed to app code.

### What happens when hiding

In the commit where `mode` changes to `hidden`, React does two things in the mutation phase (the phase that actually changes the DOM). First it cleans up the layout effects of the child tree. `disappearLayoutEffects` runs the cleanup of effects tagged `HookLayout`, that is `useLayoutEffect`, in function components, and detaches refs on host components (DOM elements).[^disappear]

```js
case FunctionComponent:
case ForwardRef:
case MemoComponent:
case SimpleMemoComponent: {
  // TODO (Offscreen) Check: flags & LayoutStatic
  commitHookLayoutUnmountEffects(
    finishedWork,
    finishedWork.return,
    HookLayout,
  );
  // ...
}
// ...
case HostHoistable:
case HostComponent: {
  // TODO (Offscreen) Check: flags & RefStatic
  safelyDetachRef(finishedWork, finishedWork.return);
```

Then it hides the DOM. It calls `hideInstance` on each nearest host node, and what this function does is a single inline style.[^hide-instance]

```js
export function hideInstance(instance: Instance): void {
  // TODO: Does this work for all element types? What about MathML? Should we
  // pass host context to this method?
  instance = instance as any as HTMLElement;
  const style = instance.style;
  // $FlowFixMe[method-unbinding]
  if (typeof style.setProperty === 'function') {
    style.setProperty('display', 'none', 'important');
  } else {
    style.display = 'none';
  }
}
```

It is `display: none !important`. The node stays attached to the document. Text nodes are hidden by setting `nodeValue` to an empty string. When shown again, `unhideInstance` does not restore a remembered pre-hide value; it reapplies `style.display` from the current props.

The `useEffect` cleanups run after this commit, in the phase that processes passive effects (the `useEffect` kind that runs after paint).[^passive-hide]

```js
case OffscreenComponent: {
  const instance: OffscreenInstance = finishedWork.stateNode;
  const nextState: OffscreenState | null = finishedWork.memoizedState;

  const isHidden = nextState !== null;

  if (
    isHidden &&
    instance._visibility & OffscreenPassiveEffectsConnected &&
    // For backwards compatibility, don't unmount when a tree suspends. In
    // the future we may change this to unmount after a delay.
    (finishedWork.return === null ||
      finishedWork.return.tag !== SuspenseComponent)
  ) {
    // The effects are currently connected. Disconnect them.
    // TODO: Add option or heuristic to delay before disconnecting the
    // effects. Then if the tree reappears before the delay has elapsed, we
    // can skip toggling the effects entirely.
    instance._visibility &= ~OffscreenPassiveEffectsConnected;

    recursivelyTraverseDisconnectPassiveEffects(finishedWork);
```

Two things stand out. An Offscreen directly under Suspense is an exception, so the `useEffect`s of a tree hidden behind a fallback while it waits for data are not cleaned up. And as the TODO says, effects are currently disconnected the moment the tree is hidden. Even if you hide it briefly and show it again right away, cleanup and setup each run once.

### Cleanup doesn't know why it runs

`disconnectPassiveEffect`, which runs `useEffect` cleanups when hiding, ultimately calls `commitHookPassiveUnmountEffects(finishedWork, finishedWork.return, HookPassive)`.[^disconnect] It is the same function used when a component is actually deleted, with the same `HookPassive` flag. The cleanup function is called with no arguments, so inside the cleanup there is no way to tell whether this is a hide or a deletion. The React docs' line "Conceptually, you should think of "hidden" Activities as being unmounted." fits this structure.[^activity-docs]

### What survives hiding

On the other hand, there are things React does not touch when hiding, and this post's bug came from there.

First, **state and ref objects** stay as they are. Fibers and hook lists are kept, so `useState` values and the objects returned by `useRef` are unchanged. Refs attached to DOM elements become `null` when hidden and are reattached when shown, but a `useRef` the component filled in itself is never cleared by anyone. The Next.js guide even presents this property as a way to tell a first mount from a re-show, in its words "The ref persists across hide/show cycles (refs aren't cleaned up)".[^guide]

**The DOM and the side effects it causes** also survive. The node stays attached to the document and only gets `display: none`, so a playing `<video>` keeps playing while hidden. The React docs say as much: "since a hidden component's DOM is not destroyed, any side effects from that DOM will persist, even after the component is hidden."[^activity-docs]

The last one is **`useInsertionEffect`**. On the hide path, `disappearLayoutEffects` cleans up only `HookLayout` and leaves `HookInsertion` alone. The cleanup of an insertion effect runs only in `commitDeletionEffectsOnFiber`, when a fiber is actually deleted.[^deletion]

```js
case FunctionComponent:
case ForwardRef:
case MemoComponent:
case SimpleMemoComponent: {
  // TODO: Use a commitHookInsertionUnmountEffects wrapper to record timings.
  commitHookEffectListUnmount(
    HookInsertion,
    deletedFiber,
    nearestMountedAncestor,
  );
  if (!offscreenSubtreeWasHidden) {
    commitHookLayoutUnmountEffects(
      deletedFiber,
      nearestMountedAncestor,
      HookLayout,
    );
  }
```

On the deletion path, a tree that was already hidden (`offscreenSubtreeWasHidden`) does not get its layout cleanups called again, since they already ran once when it was hidden. The insertion cleanup, on the other hand, is called unconditionally. So the cleanup of `useInsertionEffect` does not react to hiding, and runs exactly once, when the component truly leaves the tree. R3F makes use of this difference later on.

### When shown again, effects rerun regardless of dependency arrays

When `hidden` changes to `visible`, things run in reverse. The DOM's `display` is restored, `reappearLayoutEffects` recreates the layout effects and reattaches refs, and in the passive phase `reconnectPassiveEffects` runs the `useEffect`s again. The way it picks which effects to run here differs from usual. A normal commit calls it like this.[^mount-flags]

```js
commitHookPassiveMountEffects(finishedWork, HookPassive | HookHasEffect)
```

`HookHasEffect` is a mark set only on effects whose dependencies changed in this render, so normally only effects with changed dependencies run again. When a tree is shown again, it is called like this instead.

```js
// TODO: Check for PassiveStatic flag
commitHookPassiveMountEffects(finishedWork, HookPassive)
```

Since only `HookPassive` is passed, without `HookHasEffect`, every `useEffect` runs, because `commitHookEffectListMount` selects effects only by `(effect.tag & flags) === flags`. Even an effect like `useEffect(fn, [])`, expected to run once on mount, runs every time the tree is shown again. Layout effects work the same way through `commitHookLayoutEffects(finishedWork, HookLayout)`. This is why the Next.js guide spells out "Effects run on every hide-to-visible transition, not just the initial mount."[^guide]

This blog's graphic showed exactly this behavior. The effect that collects the load record declares `[]` as its dependency array, yet when I went from the about page to home and back, the caption under the graphic changed from "33 resources, 629KB, FCP 108ms, LCP 216ms" to "33 resources, 629KB, FCP 108ms, LCP 216ms, 9 later requests skipped" (I measured the Korean page; this is the same caption's English wording). The effect ran again the moment the page came back and reread the Performance Timeline, which now included the 9 requests made while going to home and back.

### StrictMode was already rehearsing this

Interestingly, this path is not new. StrictMode in development cleans up the effects of a newly mounted component once and runs them again, and `doubleInvokeEffectsOnFiber`, which implements this, calls the same four functions Activity uses.[^strict]

```js
function doubleInvokeEffectsOnFiber(root: FiberRoot, fiber: Fiber) {
  setIsStrictModeForDevtools(true);
  try {
    disappearLayoutEffectsForDEVValidation(fiber);
    disconnectPassiveEffect(fiber);
    reappearLayoutEffectsForDEVValidation(root, fiber.alternate, fiber);
    reconnectPassiveEffects(root, fiber, NoLanes, null, false, 0);
  } finally {
    setIsStrictModeForDevtools(false);
  }
}
```

StrictMode's double invocation was effectively a rehearsal of "hide, then show again". The rehearsal, however, happens once right after mount in development, and no time passes while the tree is hidden. Activity, in production, keeps a tree hidden for minutes while the user reads other pages. Problems the rehearsal never surfaced, such as code that defers cleanup work with a timer, can surface here. As we will see, this blog's graphic was exactly such a case: on the dev server (StrictMode) the first visit was fine, and it went blank only after visiting another page.

### Updates in a hidden tree are deferred

One more thing to know about is state updates that happen inside a hidden tree. When an update is scheduled, `markUpdateLaneFromFiberToRoot` walks from the fiber up to the root, and if it passes a hidden Offscreen along the way, it marks the update as a hidden update.[^hidden-update]

```js
if (
  offscreenInstance !== null &&
  !(offscreenInstance._visibility & OffscreenVisible)
) {
  isHidden = true;
}
// ...
if (node.tag === HostRoot) {
  const root: FiberRoot = node.stateNode;
  if (isHidden && update !== null) {
    markHiddenUpdate(root, update, lane);
  }
  return root;
}
```

`markHiddenUpdate` adds `OffscreenLane` to the update's lane (the bits React uses to express an update's priority): `update.lane = lane | OffscreenLane`. This is where the release post's "defers all updates until React has nothing left to work on" lives in the code. When hiding, the `OffscreenVisible` bit is cleared first in the mutation phase, so even a `setState` called inside a cleanup that runs later in the passive phase becomes a hidden update. This comes up again when evaluating the workarounds.

Summed up in a table:

| Target                     | When hidden                | When shown again                | Actual deletion                         |
| -------------------------- | -------------------------- | ------------------------------- | --------------------------------------- |
| `useState`, `useRef` value | Kept                       | Kept                            | Gone                                    |
| DOM node                   | `display: none !important` | `display` restored              | Removed from the document               |
| Ref attached to DOM        | Detached to `null`         | Reattached                      | Detached                                |
| `useLayoutEffect`          | Cleanup runs               | Setup runs again                | Cleanup (skipped if it was hidden)      |
| `useEffect`                | Cleanup runs               | Setup runs again (ignores deps) | Cleanup (skipped if it ran when hidden) |
| `useInsertionEffect`       | Untouched                  | Untouched                       | Cleanup runs                            |
| State updates              | Deferred as hidden updates | Processed normally              | Not applicable                          |

The `useEffect` deletion cell says "skipped" because running a cleanup clears `inst.destroy` to `undefined`. A cleanup that already ran when the tree was hidden does not run again when it is deleted.[^unmount-once]

## How the R3F Canvas Went Blank

Back to the symptom. R3F 9.7.0's `<Canvas>` holds the root, which contains the WebGL renderer and the scene, in a `useRef`. Below is an excerpt of the relevant parts.[^r3f-canvas-970]

```tsx
const root = React.useRef<ReconcilerRoot<HTMLCanvasElement>>(null!)

useIsomorphicLayoutEffect(() => {
  const canvas = canvasRef.current
  if (containerRect.width > 0 && containerRect.height > 0 && canvas) {
    if (!root.current) root.current = createRoot<HTMLCanvasElement>(canvas)
    // configure and render calls omitted
  }
})

React.useEffect(() => {
  const canvas = canvasRef.current
  if (canvas) return () => unmountComponentAtNode(canvas)
}, [])
```

The layout effect has no dependency array, so it runs on every commit and creates a root only when there is none. Cleanup is handled by the `useEffect` cleanup. `unmountComponentAtNode` empties the scene and then disposes the renderer on a 500ms timer.[^r3f-renderer-970]

```tsx
reconciler.updateContainer(null, fiber, null, () => {
  if (state) {
    setTimeout(() => {
      try {
        state.events.disconnect?.()
        state.gl?.renderLists?.dispose?.()
        state.gl?.forceContextLoss?.()
        if (state.gl?.xr) state.xr.disconnect()
        dispose(state.scene)
        _roots.delete(canvas)
        if (callback) callback(canvas)
      } catch (e) {
        /* ... */
      }
    }, 500)
  }
})
```

`forceContextLoss()` is a call that deliberately loses the WebGL context. R3F 9.8.0's changelog describes it as "`forceContextLoss()` is permanent, which left the canvas blank for the rest of the session."[^r3f-changelog]

In a world with only unmounts, this design had no problem. When the cleanup runs, the component is about to disappear, and the `root` ref disappears with it. When mounted again, a new component builds a new root in a new ref. Under Activity, that premise breaks. Step by step from the moment you leave the about page:

| When                         | What React does                                             | What happens in R3F 9.7.0                                                                              |
| ---------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Navigate to another page     | Sets the about page's Activity to `hidden`, `display: none` | The canvas node stays in the document                                                                  |
| Passive phase of that commit | Runs `useEffect` cleanup                                    | `unmountComponentAtNode` empties the scene and schedules a 500ms timer                                 |
| 500ms later                  | Nothing                                                     | `forceContextLoss()`, scene disposed, removed from `_roots`                                            |
| Go back                      | Sets Activity to `visible`, reruns layout effects           | `root.current` is still set, so `createRoot` is skipped and `configure` and `render` hit the dead root |
| Next passive phase           | Reruns `useEffect` setup                                    | Only the cleanup is registered again; no new root is created                                           |

What I reproduced in the browser matched this table. I tagged the canvas element before leaving and checked it after coming back: the returned canvas was **the same DOM element** with the tag still on it, and `getContext('webgl2').isContextLost()` was `true`. In the light theme, the canvas area looked blank white. Pressing back after only 200ms, before the timer fires, gave the same result. What the screen looked like right after returning and 1.5 seconds later differed between the two runs, but in both runs the context was lost 1.5 seconds later, because 9.7.0 has no code to cancel the scheduled teardown.

React only preserved state and refs as documented, and R3F only cleaned up because it received a cleanup. What went wrong was the mismatch between the lifetime of the cleanup and the lifetime of the ref. The cleanup threw the resources away assuming an unmount was coming, but the ref pointing at those resources survived. The very property the Next.js guide presents as a feature, that refs persist across hide and show, became the cause of the bug here.

A problem with the same root had already been reported in development mode. R3F [#3863](https://github.com/pmndrs/react-three-fiber/issues/3863), opened in August 2026, reports that under StrictMode a `<Canvas>` loses its context and goes blank about 500ms after mounting.[^r3f-3863] StrictMode's rehearsal runs the cleanup, the immediately remounted `<Canvas>` reuses the same root, and in the meantime the 500ms timer tears that root down. On this blog's about page, however, that symptom did not reproduce. Even on the dev server with `reactStrictMode: true`, the graphic was fine 2 seconds after the first visit, and went blank only after visiting another page. Code that passed the rehearsal broke under real hiding.

## Two Fixes I Tried

### First: an effect with only a cleanup

Once I had confirmed the cause, the first code I wrote looked like this. It changes a key in the cleanup that runs when hiding, so that `<Canvas>` mounts fresh when shown again.

```tsx
const [canvasKey, setCanvasKey] = useState(0)

useEffect(
  () => () => {
    setCanvasKey((k) => k + 1)
    setDrawn(false)
  },
  [],
)

// ...
<Canvas key={canvasKey} /* ... */>
```

I reverted this before checking it in a browser, because reading it again, it is strange code. An effect with an empty setup and only a cleanup is meant to catch "the moment it gets hidden", but the code itself does not reveal that intent. The flow of changing state in a cleanup to trigger the next render is also hard for a reader to follow. Above all, as we saw, a cleanup cannot tell a hide from a deletion, so this code bumps the key just the same on a real unmount and during StrictMode's rehearsal.

### Second: clearing the record in an existing effect's cleanup

The second approach merged the cleanup into the existing effect that collects the load record.

```tsx
useEffect(() => {
  let alive = true
  void (async () => {
    const collected = await collectTrace(SELF_URL)
    if (alive) setTrace(collected)
  })()
  return () => {
    alive = false
    setTrace(null)
    setDrawn(false)
    setFocus(-1)
  }
}, [])
```

`<Canvas>` is rendered only when there is a record, so clearing the record when hiding takes the canvas down with it, and when shown again a new canvas comes up with the newly collected record. No separate state is needed for a key, and the rule "keep the record and the canvas only while visible" lives inside the effect that already managed the record. `setFocus(-1)` is there so that if you leave with a bar selected and come back, an old index does not go out of range when the new record has fewer bars.

Measured on a production build, this approach did work. On every path, including back, forward, and link navigation, a new canvas was created each time I came back and was drawn again in about a second, and at the time it was drawn, the only canvas left in the document was the new one. In exchange, `THREE.WebGLRenderer: Context Lost.` was logged every time I left, meaning the hidden R3F root was being torn down each time.

Two things still bothered me. One is that it still changes state in a cleanup. Since this cleanup runs when hiding, the update becomes one of the hidden updates we saw earlier and is deferred. The result came out right, but it is hard for a reader of the code to predict exactly which render processes that update.

The bigger problem is that this approach throws away what Activity is trying to provide. Every time you come back, it creates a new WebGL context, recompiles the shaders, and plays the intro animation from the start. It is closer to forcing a hide into an unmount. The problem was not in the component but in the library's inability to tell a hide from a deletion, and both workarounds went in the direction of erasing that difference on the app side.

## How the Library Told Hiding and Deletion Apart

After applying the second approach, while gathering material for this post, I found the same symptom already reported in the R3F repository: [#3939](https://github.com/pmndrs/react-three-fiber/issues/3939), opened on September 24, 2026.[^r3f-3939] Its analysis of the cause was the same.

> When the tree is shown again, the Canvas's layout effect reuses the ref to the unmounted root, so `render()` does nothing.

The fixing PR, [#3943](https://github.com/pmndrs/react-three-fiber/pull/3943), was merged the same day and shipped in 9.8.1 a few hours later. 9.8.1's `<Canvas>` moved where the root is torn down.[^r3f-canvas-981]

```tsx
// Insertion effects survive Activity hiding and StrictMode effect replay. Only
// final removal releases the root, including removal while hidden from React 19.2
React.useInsertionEffect(() => {
  return () => {
    const current = root.current
    root.current = null
    current?.unmount()
  }
}, [])
```

As we confirmed earlier, the cleanup of an insertion effect runs neither when hiding nor during StrictMode's rehearsal, only on actual deletion. So if releasing the root is left to this cleanup alone, it reacts only to deletion and not to hiding. When a hidden tree is pushed out of Next.js's list and deleted, this cleanup still runs, so nothing leaks. And it clears `root.current` while releasing the root, so that a later mount creates a new root. It ties together, in one place, the "release resources" and "clear the ref" steps that were out of step in 9.7.0.

There is one more safeguard, for versions of React before 19.2.

```tsx
// Before 19.2, React skips insertion cleanups in a subtree Suspense has hidden but keeps its
// passive effects connected. A canvas that left the document was removed rather than hidden
React.useEffect(() => {
  const canvas = canvasRef.current
  return () => {
    if (!canvas.isConnected) root.current?.unmount()
  }
}, [])
```

Telling them apart with `isConnected` also relies on commit order. In the PR description's words, "React detaches it before running passive cleanups on a real unmount."[^r3f-3943] On an actual deletion, the DOM node is detached from the document in the mutation phase before the passive cleanups run, so at cleanup time the canvas is already out of the document. When hiding, the node stays in the document with `display: none`, so `isConnected` is `true`. The cleanup gets no arguments, but the state of the DOM lets you infer why the cleanup is running.

9.8.1 also has a change for the inside of the canvas. According to the changelog, it passes the outer Activity's visibility into the canvas's scene, disconnecting effects and `useFrame` subscriptions inside the scene when hidden and reconnecting them without resetting scene state when shown again.[^r3f-changelog] This seems to be needed because R3F renders the scene in a reconciler root separate from react-dom, so hiding the outer Activity does not disconnect the inner tree's effects on its own. The development-mode bug, [#3863](https://github.com/pmndrs/react-three-fiber/issues/3863), was fixed one version earlier, in 9.8.0, by removing the 500ms timer.

One thing is worth pointing out. The React docs introduce `useInsertionEffect` as "`useInsertionEffect` is for CSS-in-JS library authors."[^insertion-docs] The Activity docs do not say anywhere that insertion effects survive hiding, either. R3F's approach is a library-level technique that relies on the commit order of React's implementation, and I'm not sure it is a pattern app code should copy to catch a "real unmount". For app code, I think it is closer to what the docs describe to leave resources that are fine to keep while hidden, and stop only what has to stop when hidden, in the cleanup.

## Measuring Again After Upgrading to 9.8.1

This blog upgraded R3F to 9.8.1 and removed the workaround. `LoadTrace.tsx` is back to the code from before the problem, and the only change is one dependency. 9.8.1's `peerDependencies` declare `react` and `react-dom` as `>=19 <19.4`, and the 9.8.0 changelog has a "Support React 19.3" entry, so the range also covers the 19.3 canary bundled with Next.js 16.3.5.

To compare before and after under the same conditions, I started three configurations as production builds (`next build`, `next start`) and ran the same scenarios against each.

> Measurement: Playwright 1.63.0, headless Chromium 153.0.8010.12 (WebGL2 via SwiftShader), macOS, 1280×900 viewport, service workers blocked. Navigation was done by soft navigations that click real links, and by `page.goBack()` and `page.goForward()`. I judged the results three ways: I put a `data-probe` attribute on the canvas before leaving to see whether the returned canvas was the same DOM element, checked the context with `getContext('webgl2').isContextLost()`, and captured the canvas area with the HTML labels on top of it hidden to measure the ratio of bright pixels (max of RGB above 100). A normal graphic measured 0.8-8.9%, and a blank white canvas 86-93%. Once, a canvas that had lost its context still showed its last frame and looked dark, so blank canvases were judged by `isContextLost()`. Each scenario ran once per configuration, and the 200ms back navigation ran twice on 9.7.0.

| Scenario                                             | 9.7.0                   | 9.7.0 + second workaround | 9.8.1                |
| ---------------------------------------------------- | ----------------------- | ------------------------- | -------------------- |
| About → Home → Back                                  | Blank canvas            | New canvas                | Original canvas kept |
| Home → About → Back → Forward                        | Blank canvas            | New canvas                | Original canvas kept |
| About → Home → header link to About                  | Blank canvas            | New canvas                | Original canvas kept |
| About → Home → Back after 200ms                      | Blank canvas after 1.5s | New canvas                | Original canvas kept |
| About → Home → two 2026 posts → Back three times     | Blank canvas            | New canvas                | Original canvas kept |
| About → Home → 2026 post → 2022 post → link to About | Fresh render            | New canvas                | Fresh render         |
| About → Home → Tags → Series → link to About         | Fresh render            | New canvas                | Fresh render         |
| 2 seconds after first visit                          | Fine                    | Fine                      | Fine                 |

"Blank canvas" in the table means the same canvas element lost its context and was never drawn again, and "Original canvas kept" means the same element kept its context and showed the graphic within a second. "New canvas" and "Fresh render" both mean a different canvas element was created and drawn in about a second; the former is the workaround recreating it on purpose, and the latter is Next.js pushing the about page out of its list and actually unmounting it.

The console differed too. With 9.7.0 and the second workaround, `THREE.WebGLRenderer: Context Lost.` was logged in every scenario where I left the page, came back, and watched for more than 1.5 seconds, and with 9.8.1 it was never logged. As the 9.8.1 changelog says, this seems to be because on deletion it now disposes the renderer first and only then releases the context.

I checked the dev server (`next dev`, `reactStrictMode: true`) as well. With 9.7.0, the graphic was still fine 2 seconds after the first visit and went blank only on going back. With 9.8.1, the original canvas was kept on both going back and navigating via the header link.

## Code That Survives Activity

After this, I read effects a little differently. In short:

- A cleanup may be a pause rather than an end. If a cleanup throws resources away, it also has to clear the refs or state pointing at them, so they are recreated when the effect runs again. R3F 9.7.0 did not keep that pair in step.
- An effect with an empty `[]` dependency array is not "once on mount". It runs every time the tree is shown again. If you need to handle only the first mount, mark it with a ref as the Next.js guide shows.
- The DOM stays alive while hidden. `<video>` and `<audio>` do not stop with `display: none`, so they have to be stopped in a cleanup. The React docs explain why to use `useLayoutEffect` for this: "conceptually the clean-up code is tied to the component's UI being visually hidden".[^activity-docs] Since hidden nodes stay in the document, E2E test selectors may also match the hidden copies.
- What is kept is per segment level, not per route, and link navigation also revives hidden trees. If you narrow a reproduction to "a problem that only happens on back navigation", you will miss cases.
- Passing StrictMode is not a reason to relax. The rehearsal does not simulate time passing while a tree is hidden.
- If you want state to reset, treat `bfcacheId` as a migration tool, and first consider resetting explicitly in a submit handler or deriving the state from the URL.

This list comes down to one sentence in the React docs: "Most well-behaved React components that properly clean up their side effects will already be robust to being hidden by Activity."[^activity-docs] The trouble is that, in most cases, the standard for "properly" was set with an unmount in mind.

## When Should You Turn On cacheComponents?

This blog moved to cacheComponents in May 2026 ([19e2f05c](https://github.com/yceffort/blog/commit/19e2f05c9f9dd9f589be9a7ee7368c3cd97da11f)), and besides this incident it has fixed a few other problems tied to the setting. Based on that experience and the official docs, here is how I would split the cases where it fits well and the cases that call for caution. Keep in mind that this is a judgment based on one blog's experience.

### Where it fits well

- A page that mixes static parts with parts that change per request. Instead of rendering the whole page on every request because of one dynamic value, the static shell goes out first and only the dynamic parts stream in.
- You want to manage explicitly in code what is cached and for how long. Caching is applied only where needed with `use cache`, `cacheLife`, and `cacheTag`, and can be applied per component. This blog's post pages prerender only the 50 most popular posts of the last year at build time through `generateStaticParams`, and cache the body component rendered on the first request for the rest with `use cache` and `cacheLife('max')`. Each post also gets a `cacheTag` so it can be invalidated on its own. I covered how `use cache` works in detail in [an earlier post](/en/2026/05/use-cache-deep-dive).
- Apps where scroll position, form inputs, and expanded sections should survive going back. Activity preservation, the subject of this post, comes by default.
- You plan to use features such as page transitions combined with View Transitions or the Gesture APIs. The Next.js team describes Activity as the foundation for these.[^86577]

### Where to be careful

- You have routes that rely on the edge runtime. Cache Components requires the Node.js runtime and does not support `runtime = 'edge'`.[^migrate]
- A codebase that uses route segment configs heavily. Segments that export `dynamic`, `revalidate`, or `fetchCache` error out, so they have to move to `use cache` and `cacheLife`. `dynamicParams` fails the build, and `generateStaticParams` returning an empty array is an error too.[^migrate]
- Code that calls synchronous IO such as `new Date()` or `Math.random()` during rendering is scattered around. This blog's RSS feed hit this. A single argument-less `new Date()` turned the route into request-time rendering, and it returned 500 when it tried to read the post files at runtime ([262d97e2](https://github.com/yceffort/blog/commit/262d97e2e2b1cc90a76f5368db39d0e9df2734f3), June 2026). The current docs say that calling these during prerender now fails the build.
- Dynamic routes that must return 404 for paths that don't exist. You cannot block them with `dynamicParams: false`, and the docs tell you to call `notFound()` in the page. This blog had `[year]/[...slug]` accept any string as a year and send the PPR shell with a 200, and in the end fixed it by filtering out impossible paths in the proxy first and returning a 404 ([18eaae21](https://github.com/yceffort/blog/commit/18eaae21bfe5444ffc99782da15cc629871199be), August 2026).
- Lots of client code or third-party libraries that assume navigation unmounts. Libraries that read a cleanup as an unmount, like R3F in this post, dropdowns and dialogs that stay open, and forms that keep their values all fall into this. You cannot turn off just this behavior for the whole app; partially, the only option is using `bfcacheId` as a key.
- Apps that move between several heavy pages. Hidden pages keep their DOM and state, up to 3 per segment level. After upgrading to 9.8.1, this blog also keeps the about page's canvas and WebGL context alive while you read other pages. Coming back to the same canvas with the same context is the evidence.
- Lots of E2E tests. Hidden pages' DOM stays in the document, so selectors may match hidden copies too.[^guide] This post's measurement script was also written to pick only the visible canvas.

To sum up, on the server side there are clear benefits in the static shell and explicit caching, but on the client side you have to give up the premise that "pages you leave get unmounted". For a new project, you can write code with that premise from the start, so I think turning it on is the better choice. For an app that has already grown, it is safer to first check route segment configs, synchronous IO, and libraries that rely on cleanup, and then migrate. The docs also describe an incremental adoption that defers validation with `instant = false` and moves routes over one at a time.[^migrate]

## Wrapping Up

At first it looked like a small bug where one three.js graphic didn't show up. Following it down, Next.js keeps up to 3 pages you left hidden per segment level, React cleans up only the effects when hiding and keeps state, refs, and DOM, and R3F, sitting between them, was reading the cleanup as an unmount. Each of them behaved according to its docs and design intent; what didn't fit was a single old assumption, "when the cleanup runs, the component is about to disappear".

StrictMode had been shaking that assumption in development for years, but this blog's graphic passed that rehearsal and still broke under real hiding. cacheComponents effectively moved the rehearsal into everyday production. Seeing the Next.js team talk about "Activity-robust" code as the foundation for next features like View Transitions and the Gesture APIs, this direction seems unlikely to be reversed. When writing effects, it is probably safer to assume by default that a setup may come again after a cleanup.

There is also something to reflect on. I wrote workaround code as soon as I found the cause, but had I looked at the library's issue tracker first, neither workaround would have been needed. For a bug at a library boundary, it is faster to check the upstream repository's recent issues and releases before fixing anything, a lesson I learned once again.

## References

- [cacheComponents, Next.js docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)
- [How Next.js preserves UI state with Activity, Next.js docs](https://nextjs.org/docs/app/guides/preserving-ui-state)
- [Migrating to Cache Components, Next.js docs](https://nextjs.org/docs/app/guides/migrating-to-cache-components)
- [bfcacheId in useRouter, Next.js docs](https://nextjs.org/docs/app/api-reference/functions/use-router#bfcacheid)
- [`<Activity>`, React docs](https://react.dev/reference/react/Activity)
- [React 19.2, React blog](https://react.dev/blog/2025/10/01/react-19-2)
- [vercel/next.js#86577: Activity component route preservation causes significant breakage](https://github.com/vercel/next.js/issues/86577)
- [pmndrs/react-three-fiber#3939: `<Activity>` leaves a Canvas blank after it is shown again](https://github.com/pmndrs/react-three-fiber/issues/3939)

[^cc-docs]: [cacheComponents, Next.js docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents). Checked against `dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md` in the installed 16.3.5 package.

[^pr]: [vercel/next.js#77951](https://github.com/vercel/next.js/pull/77951) "Add experimental.routerBFCache to NextConfig" (merged April 9, 2025), [vercel/next.js#84923](https://github.com/vercel/next.js/pull/84923) "enable experimental.routerBfCache behind cacheComponents" (merged October 21, 2025)

[^define-env]: [`packages/next/src/build/define-env.ts` L126, L181](https://github.com/vercel/next.js/blob/v16.3.5/packages/next/src/build/define-env.ts#L126)

[^layout-router]: [`packages/next/src/client/components/layout-router.tsx` L787-L960](https://github.com/vercel/next.js/blob/v16.3.5/packages/next/src/client/components/layout-router.tsx#L787-L960)

[^cache-key]: [`packages/next/src/client/components/router-reducer/create-router-cache-key.ts`](https://github.com/vercel/next.js/blob/v16.3.5/packages/next/src/client/components/router-reducer/create-router-cache-key.ts)

[^bfcache]: [`packages/next/src/client/components/bfcache-state-manager.ts`](https://github.com/vercel/next.js/blob/v16.3.5/packages/next/src/client/components/bfcache-state-manager.ts)

[^guide]: [How Next.js preserves UI state with Activity](https://nextjs.org/docs/app/guides/preserving-ui-state). Checked against `dist/docs/01-app/02-guides/preserving-ui-state.md` in the installed 16.3.5 package.

[^migrate]: [Migrating to Cache Components, Next.js docs](https://nextjs.org/docs/app/guides/migrating-to-cache-components). Checked against `dist/docs/01-app/02-guides/migrating-to-cache-components.md` in the installed 16.3.5 package.

[^bfcacheid]: [vercel/next.js#93633](https://github.com/vercel/next.js/pull/93633) "bfcacheId: Opt out of state preservation" (merged May 12, 2026)

[^86577]: [vercel/next.js#86577](https://github.com/vercel/next.js/issues/86577). The quoted explanation is from Sam Selikoff's comment in January 2026.

[^react-192]: [React 19.2](https://react.dev/blog/2025/10/01/react-19-2), October 1, 2025

[^offscreen-mode]: [`packages/react-reconciler/src/ReactFiberOffscreenComponent.js` L17-L32](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberOffscreenComponent.js#L17-L32), [`ReactFiberBeginWork.js` L643-L647](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberBeginWork.js#L643-L647). The type also lists `'unstable-defer-without-hiding'`, but it is unused because the `enableLegacyHidden` flag is off.

[^begin-work]: [`packages/react-reconciler/src/ReactFiberBeginWork.js` L898-L934](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberBeginWork.js#L898-L934)

[^disappear]: [`packages/react-reconciler/src/ReactFiberCommitWork.js` L3040-L3110](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberCommitWork.js#L3040-L3110). The call site when hiding is the `OffscreenComponent` case at L2523-L2634 of the same file.

[^hide-instance]: [`packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js` L1405-L1444](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js#L1405-L1444)

[^passive-hide]: [`packages/react-reconciler/src/ReactFiberCommitWork.js` L5010-L5030](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberCommitWork.js#L5010-L5030)

[^disconnect]: [`packages/react-reconciler/src/ReactFiberCommitWork.js` L5133-L5151](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberCommitWork.js#L5133-L5151)

[^activity-docs]: [`<Activity>`, React docs](https://react.dev/reference/react/Activity)

[^deletion]: [`packages/react-reconciler/src/ReactFiberCommitWork.js` L1690-L1712](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberCommitWork.js#L1690-L1712)

[^mount-flags]: The normal commit is at [`ReactFiberCommitWork.js` L3756-L3759](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberCommitWork.js#L3756-L3759), the reveal path at [L3238](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberCommitWork.js#L3238) and [L4403-L4404](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberCommitWork.js#L4403-L4404), and the selection condition at [`ReactFiberCommitEffects.js` L141-L153](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberCommitEffects.js#L141-L153)

[^strict]: [`packages/react-reconciler/src/ReactFiberWorkLoop.js` L5328-L5338](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberWorkLoop.js#L5328-L5338)

[^hidden-update]: [`packages/react-reconciler/src/ReactFiberConcurrentUpdates.js` L189-L249](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberConcurrentUpdates.js#L189-L249), [`ReactFiberLane.js` L1076-L1090](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberLane.js#L1076-L1090)

[^unmount-once]: [`packages/react-reconciler/src/ReactFiberCommitEffects.js` L249-L267](https://github.com/facebook/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-reconciler/src/ReactFiberCommitEffects.js#L249-L267)

[^r3f-canvas-970]: [`packages/fiber/src/web/Canvas.tsx` L82-L142 (v9.7.0)](https://github.com/pmndrs/react-three-fiber/blob/v9.7.0/packages/fiber/src/web/Canvas.tsx#L82-L142)

[^r3f-renderer-970]: [`packages/fiber/src/core/renderer.tsx` L453-L480 (v9.7.0)](https://github.com/pmndrs/react-three-fiber/blob/v9.7.0/packages/fiber/src/core/renderer.tsx#L453-L480)

[^r3f-changelog]: [`packages/fiber/CHANGELOG.md` (v9.8.1)](https://github.com/pmndrs/react-three-fiber/blob/v9.8.1/packages/fiber/CHANGELOG.md). Checked against the changelog in the `@react-three/fiber@9.8.1` package published to npm.

[^r3f-3863]: [pmndrs/react-three-fiber#3863](https://github.com/pmndrs/react-three-fiber/issues/3863) "StrictMode: deferred unmount dispose force-loses the WebGL context of the remounted Canvas (dev)"

[^r3f-3939]: [pmndrs/react-three-fiber#3939](https://github.com/pmndrs/react-three-fiber/issues/3939) "v9: `<Activity>` leaves a Canvas blank after it is shown again"

[^r3f-canvas-981]: [`packages/fiber/src/web/Canvas.tsx` L94-L178 (v9.8.1)](https://github.com/pmndrs/react-three-fiber/blob/v9.8.1/packages/fiber/src/web/Canvas.tsx#L94-L178)

[^r3f-3943]: [pmndrs/react-three-fiber#3943](https://github.com/pmndrs/react-three-fiber/pull/3943) "fix(web): keep a Canvas root alive while `<Activity>` hides it"

[^insertion-docs]: [`useInsertionEffect`, React docs](https://react.dev/reference/react/useInsertionEffect)
