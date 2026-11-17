---
title: 'Why <em>View Transitions</em> Crashed Tabs on iOS'
tags:
  - memory
  - debugging
  - browser
  - web-performance
  - react
published: true
date: 2026-11-17 16:39:00
description: 'On an iPhone, the tab crashed after going back and forth between two long posts a few times. Using measurements and source code, this post traces how WebKit keeps the snapshots of a finished View Transition, and how the update callback passed by React holds on to the object that owns them so that even GC cannot reclaim them.'
art:
  undraw: mobile-browsers
---

In Safari on my iPhone, I opened parts 1 and 2 of the [Page Preservation in Next.js](/series/nextjs-page-preservation) series alternately, using the series list links at the top of each post. On the third or fourth navigation, the screen briefly turned white and part 2 reloaded from the top. After a few more rounds the same way, all that was left was a notice: "A problem repeatedly occurred on 'https://yceffort.kr/2026/09/nextjs-cache-components-activity'." Chrome on the iPhone, following the same steps, ended up on a screen saying the page could not be opened. Desktop Chrome showed no problem no matter how many times I repeated it.

Part 1, [Pages You Leave Don't Die, They Hide](/2026/09/nextjs-cache-components-activity), and part 2, [Why Did Next.js's Last Three Leave Nine Posts Behind?](/2026/11/nextjs-page-preservation-memory), covered how Next.js preserves the pages you leave by hiding them with Activity, and how much memory that takes. The memory that crashed the tab this time was outside that preservation list. The View Transition that runs on every navigation captures the screen as an image, and WebKit kept those images even after the transition ended, while a callback passed by React kept holding the object that owned them. This post follows what holds the memory one link at a time: the tab, the process, the snapshots, the `ViewTransition` object, the update callback, and the closure.

> Source quotes are pinned to WebKit commit [`31fdaeb2`](https://github.com/WebKit/WebKit/tree/31fdaeb27daf545ea0bbef129d1695c5844c46b9) (November 12, 2026) and to commit [`278794d7`](https://github.com/react/react/tree/278794d7dee9cd2a3a2aaf9f0b2a4b8b747d74ee) of React `19.3.0-canary-278794d7-20261002`, which ships inside Next.js 16.4.5. Measurements were taken on production running blog commit [`49086956`](https://github.com/yceffort/blog/tree/49086956eb1013c600179ea563f12d0fccd23665) from before the fix, and on a local server started with `next build` and `next start` from the fix commit [`5d42d2b8`](https://github.com/yceffort/blog/commit/5d42d2b88476bf0f56b1f59cbbc5e220013e9428).

## Table of Contents

## On desktop Chrome, memory is reclaimed when the transition ends

In `LayoutWrapper`, this blog wrapped the entire `<main>` content in React's `<ViewTransition>`.[^1] It was the boundary for a slide effect where the previous content slides out and the new content slides in on navigation.

```tsx
<ViewTransition default="page">
  <main id="main" className={stylex.props(sx.main).className}>
    {children}
  </main>
</ViewTransition>
```

A View Transition captures the screen before the change as an image (the old snapshot), then runs an animation by layering it over the actual screen after the change (the new one). Each element with a `view-transition-name` is captured separately. React's `<ViewTransition>` gives this name to the DOM elements inside the boundary, so on this blog the whole `<main>` was captured as a single image on every navigation.[^2]

I first tried to reproduce it with mobile emulation in desktop Chrome (412×915, device scale factor 2.625).[^3] I went back and forth between two posts 20 times while recording GPU process memory every second. For the condition with transitions off, I set `document.startViewTransition` to `undefined` on the page. When this call fails, React simply commits without a transition.

| Condition                                              | `<main>` height of the two pages | GPU process baseline → peak during navigation |
| ------------------------------------------------------ | -------------------------------- | --------------------------------------------- |
| Two 'Improving Blog Performance' posts, transitions on | 25,374px, 38,343px               | 269MB → 453MB                                 |
| Same two posts, transitions off                        | Same                             | 267MB → 310MB                                 |
| Two 'Judgment in the AI Era' posts, transitions on     | 15,640px, 18,229px               | 290MB → 498MB                                 |
| Series list and series intro, transitions on           | 1,444px, 1,130px                 | 326MB → 451MB                                 |

With transitions on for two long posts, GPU memory jumped by 150-185MB on each navigation and returned to near the baseline once the transition ended. With transitions off, the increase was 20-40MB. The peaks were similar for two conditions whose post lengths differ by more than a factor of two, so Chromium appears to cap the size when it captures a large element.[^4] Under every condition the memory was reclaimed, and I saw nothing that would crash a tab.

So I took another look at the device. The device with the symptom was an iPhone, and Chrome on the iPhone renders pages with WebKit, the same engine as Safari. Since Safari showed the same symptom, what I needed to measure was WebKit.

## In WebKit, memory piles up by the size of the post you leave

I applied the iPhone 15 Pro settings (393×659, device scale factor 3) to Playwright's WebKit build and went back and forth between parts 1 and 2 on production 30 times through the series list links.[^5] After each navigation I measured the memory of the WebContent process, which renders the page, and of the GPU process with macOS `footprint`.

| Condition                     | Start | After 30 navigations | After waiting 30 seconds |
| ----------------------------- | ----- | -------------------- | ------------------------ |
| Transitions on                | 230MB | 8,978MB              | 8,978MB                  |
| `startViewTransition` removed | 84MB  | 125MB                | 125MB                    |

<Chart src="/charts/view-transition-webkit/navigation.en.json" />

With transitions on, WebContent memory grew on every navigation and did not shrink even after waiting 30 seconds. After the fourth navigation, by which point parts 1 and 2 had each been left twice, it was already 1,429MB. The DOM element count was the same in both conditions at 4,131-4,132, so the added memory was outside the DOM.

The increase alternated between two values depending on which post was left. Here they are next to the memory needed to capture the entire `<main>` of the post being left.

| Post left | `<main>` size | Calculated size for a full capture | Increase per navigation |
| --------- | ------------- | ---------------------------------- | ----------------------- |
| Part 1    | 361×42,776px  | 530MB                              | 352-433MB               |
| Part 2    | 361×17,594px  | 218MB                              | 162-177MB               |

The calculated size is the width and height in CSS pixels multiplied by the device scale factor of 3, then by 4 bytes per pixel (RGBA). For part 1 that is 1,083×128,328 pixels. For both posts, the measured increase was 66-82% of the calculated size. If the old snapshot of the screen being left stays almost intact, that explains the difference between the two posts' increases.

## It still piles up without React

To check whether React or Next.js was the cause, I built the same structure without a framework. I gave `<main>` `view-transition-name: page` and used `document.startViewTransition()` to swap back and forth between content 60,005px tall and content 24,803px tall.

| Transitions | 0    | 1     | 2     | 3       | 4       | 5       |
| ----------- | ---- | ----- | ----- | ------- | ------- | ------- |
| WebContent  | 16MB | 426MB | 596MB | 1,004MB | 1,174MB | 1,582MB |

Leaving the 60,005px content added about 410MB, and leaving the 24,803px content added about 170MB. The ratio of the two heights (2.42) and the ratio of the increases (2.41) are nearly the same.

I also added, one at a time, three things React does around a transition that might affect memory: hiding the previous content with `display: none` instead of removing it (what Activity does), calling `document.documentElement.getAnimations({subtree: true})` at the `ready` point, and calling `cancel()` on the collected animations after the transition ends. All three conditions passed through the same values, 1,582-1,583MB, by the fifth transition. The pile-up itself is WebKit's behavior.

## The images stay in the ViewTransition object after the transition ends

In WebKit, a captured image goes into a struct called `CapturedElement`. The field that holds the screen before the change is `oldImage`.[^6]

```cpp
    // std::nullopt represents an non-capturable element.
    // nullptr represents an absent snapshot on an capturable element.
    std::optional<RefPtr<ImageBuffer>> oldImage;
```

One `CapturedElement` is created for each named element and stored in the `m_namedElements` map of the `ViewTransition` object.[^7] `ViewTransition` is the C++ implementation of the object that `document.startViewTransition()` returns.

```cpp
    OrderedNamedElementsMap m_namedElements;
```

The function that creates the image is `snapshotElementVisualOverflowClippedToViewport()`.[^8]

```cpp
static RefPtr<ImageBuffer> snapshotElementVisualOverflowClippedToViewport(LocalFrame& frame, RenderLayerModelObject& renderer, const LayoutRect& snapshotRect, const LayoutSize& subpixelOffset = { })
{
    auto parameters = elementSnapshotParameters(frame, renderer, snapshotRect);
    if (!parameters)
        return nullptr;

    auto hostWindow = parameters->frameView->root() ? protect(parameters->frameView->root())->hostWindow() : nullptr;
    auto buffer = ImageBuffer::create(parameters->paintRect.size(), RenderingMode::Accelerated, RenderingPurpose::Snapshot, parameters->scaleFactor, parameters->colorSpace, PixelFormat::BGRA8, hostWindow);
    if (!buffer)
        return nullptr;

    paintElementSnapshot(*parameters, buffer->context(), subpixelOffset);
    return buffer;
}
```

The function name contains `ClippedToViewport`, but the buffer is created at the size of `paintRect`, which is computed from the rectangle passed in (`snapshotRect`). Since the measured increase was proportional to the full height of `<main>`, this rectangle seems to have covered the entire element instead of being clipped to the screen size.

So when is this image released? When a transition ends, WebKit calls `clearViewTransition()`.[^9]

```cpp
void ViewTransition::clearViewTransition()
{
    if (!document())
        return;

    Ref document = *this->document();
    ASSERT(document->activeViewTransition() == this);

    for (auto& [name, capturedElement] : m_namedElements.map()) {
        if (auto newStyleable = capturedElement->newElement.styleable())
            newStyleable->setCapturedInViewTransition(nullAtom());
    }

    document->setHasViewTransitionPseudoElementTree(false);
    document->styleScope().clearViewTransitionStyles();
    document->setActiveViewTransition(nullptr);

    if (RefPtr documentElement = document->documentElement())
        documentElement->invalidateStyle();
}
```

It clears the active transition from the document (`setActiveViewTransition(nullptr)`) and cleans up the transition styles, but it does not empty `m_namedElements`. So `oldImage` remains until the `ViewTransition` object is destroyed.

`ViewTransition` is a reference-counted C++ object, and on the JavaScript side the wrapper object returned by `startViewTransition()` references it. Once the transition ends, `virtualHasPendingActivity()` returns `false`, so the wrapper becomes eligible for GC unless something else references it.[^10]

```cpp
bool ViewTransition::virtualHasPendingActivity() const
{
    return m_phase != ViewTransitionPhase::Done;
}
```

In the end, the image is released when GC collects the wrapper. But neither `ViewTransition.cpp` nor `ViewTransition.h` has any code that reports the size of this image to JavaScriptCore's GC. From the GC's point of view, only one small wrapper object is left, so it has no reason to hurry even if hundreds of MB hang behind it. This seems to be why memory stayed the same even after waiting 30 seconds.

## Why it is not reclaimed even when GC runs

To see whether the image is released once GC runs, I forced a full GC with JavaScriptCore's `$vm.gc()`.[^11] Whether memory was reclaimed depended on how the update callback was passed.

| Condition                                                                                   | After transitions | After waiting 5 seconds | After `$vm.gc()` |
| ------------------------------------------------------------------------------------------- | ----------------- | ----------------------- | ---------------- |
| Plain HTML, 5 transitions, callback does not reach `ViewTransition`                         | 1,582MB           | 1,582MB                 | 16MB             |
| Plain HTML, 5 transitions, another closure in the same function references `ViewTransition` | 1,582MB           | 1,582MB                 | 1,582MB          |
| Blog production, 8 navigations                                                              | 2,573MB           | 2,572MB                 | 2,567MB          |
| Blog production, 8 navigations, with a wrapper that drops the callback reference            | 2,583MB           | 2,584MB                 | 104MB            |

The difference came from the update callback. WebKit stores the callback passed to `startViewTransition()` in `m_updateCallback`, and because it is a `const` member, it keeps the callback even after the transition ends.[^12]

```cpp
    const RefPtr<ViewTransitionUpdateCallback> m_updateCallback;
```

How long the JavaScript function inside this callback stays alive is determined by the IDL declaration. `ViewTransitionUpdateCallback.idl` looks like this.[^13]

```webidl
[
    GenerateIsReachable=ImplScriptExecutionContext
] callback ViewTransitionUpdateCallback = Promise<any> ();
```

WebKit's callback bindings hold the JavaScript function through a weak reference, and when GC runs they keep the function alive if its owner is alive. `GenerateIsReachable=ImplScriptExecutionContext` sets that owner to the document (ScriptExecutionContext). The check happens in `JSCallbackData::WeakOwner::isReachableFromOpaqueRoots()`.[^14]

```cpp
bool JSCallbackData::WeakOwner::isReachableFromOpaqueRoots(JSC::Handle<JSC::Unknown>, void* owner, JSC::AbstractSlotVisitor& visitor, ASCIILiteral* reason)
{
    if (reason) [[unlikely]]
        *reason = "Callback owner is an opaque root"_s;
    return visitor.containsOpaqueRoot(owner);
}
```

An opaque root is a C++ object that GC records as "alive" while marking. While the page is open, the document is recorded as an opaque root, so as long as `ViewTransition` holds the callback, the function is not collected either.

So far, that leaves only one function behind. The problem starts when this function can reach the `ViewTransition` wrapper. Then the following chain forms.

```text
Document (opaque root)
  └ Update callback function
      └ The function's scope
          └ Wrapper returned by startViewTransition()
              └ ViewTransition (C++)
                  ├ m_updateCallback → update callback function
                  └ m_namedElements → oldImage
```

The function is alive, so the wrapper lives; the wrapper is alive, so `ViewTransition` and the image remain. This chain does not break until the document goes away.

React's `startViewTransition()` has exactly this shape.[^15] The update callback is passed as the `update()` method of an object literal.

```js
    const transition = ownerDocument.startViewTransition({
      update() {
```

Later in the same function, the arrow function passed to `transition.finished.finally()` references `transition`.[^16]

```js
    transition.finished.finally(() => {
      for (let i = 0; i < viewTransitionAnimations.length; i++) {
        // In Safari, we need to manually cancel all manually started animations
        // or it'll block or interfer with future transitions.
        // We can't use getAnimations() due to #35336 so we collect them in an array.
        viewTransitionAnimations[i].cancel();
      }
      // $FlowFixMe[prop-missing]
      if (ownerDocument.__reactViewTransition === transition) {
        // $FlowFixMe[prop-missing]
        ownerDocument.__reactViewTransition = null;
      }
```

In JavaScriptCore, closures created inside one function share a scope object that holds the outer variables. Because the arrow function references `transition`, `transition` goes into that scope, and `update()`, created in the same scope, reaches the wrapper through it as well. The chain is complete even though `update()` never uses `transition` directly.

To confirm that this chain was the cause, I wrapped `startViewTransition` so that the function passed in is released right after it is called.

```js
const original = Document.prototype.startViewTransition
const release = (fn) => {
  let pending = fn
  return () => {
    const run = pending
    pending = null
    return run()
  }
}
Document.prototype.startViewTransition = function (arg) {
  if (typeof arg === 'function') return original.call(this, release(arg))
  if (arg && typeof arg.update === 'function') {
    return original.call(this, {types: arg.types, update: release(arg.update)})
  }
  return original.call(this, arg)
}
```

WebKit still holds the wrapper function, but the wrapper function lets go of React's `update()` once the call finishes, so the chain breaks. As the last row of the table shows, a single full GC brought 2,583MB down to 104MB. During navigation, however, GC did not run on its own, and memory still piled up to 2.5GB. Breaking the chain on the React side alone is unlikely to prevent the crash.

The same chain forms in ordinary code, whatever the framework. The two functions below run the same transition, but only in the second one does `t` end up in the callback's scope.

```js
function makeUpdate(n) {
  return () => fill(n)
}

// The callback does not reach the transition
function stepClean(n) {
  return document.startViewTransition(makeUpdate(n)).finished
}

// t ends up in the callback's scope
let current = null
function stepCycle(n) {
  const t = document.startViewTransition(() => fill(n))
  current = t
  t.finished.finally(() => {
    if (current === t) current = null
  })
  return t.finished
}
```

After 5 transitions each on an element 65,764px tall followed by a full GC, `stepClean` dropped from 2,803MB to 17MB, while `stepCycle` kept 2,800MB. The full reproduction page is [repro.html](/demos/view-transition-webkit-snapshot-leak/repro.html). Passing the callback inline inside an async function and only waiting with `await t.finished` was not reclaimed either.[^17]

## What I changed on the blog

I could not wait for a WebKit fix, so I removed the boundary that captured the large element. In `5d42d2b8`, I deleted the `<ViewTransition default="page">` that wrapped `<main>`.[^18]

```diff
-        {/* React는 root 전환을 취소하므로 본문을 경계로 감싸 page 클래스로 슬라이드한다 */}
-        <ViewTransition default="page">
-          <main id="main" className={stylex.props(sx.main).className}>
-            {children}
-          </main>
-        </ViewTransition>
+        <main id="main" className={stylex.props(sx.main).className}>
+          {children}
+        </main>
```

Going back and forth 30 times on the fixed version under the same conditions, WebContent memory went from 80MB to 110MB, the same level as the condition with the transition API removed (84MB to 125MB). On the iPhone, I also confirmed that the tab no longer crashed when going back and forth the same way. In exchange, the content slide animation is gone in every browser.

I kept the transitions on small elements such as the title, the tags, and the menu indicator dot in the header. These elements seem to leave snapshots through the same path. After 30 navigations, the GPU process went from 223MB to 549MB, and was at 487MB after 30 seconds, staying higher than the condition with the transition API removed (222MB to 212MB). It is not enough to crash a tab, but it is not zero.

## Already reported

The same leak has been reported to WebKit as [Bug 330112](https://bugs.webkit.org/show_bug.cgi?id=330112). It says that transitioning a named 24,000px element leaves about 330MB per transition, and that capturing only the root does not increase memory, which matches the measurements in this post. The report did not give a cause, so I added the code that never releases the images, the callback chain, and the GC comparison in a [comment](https://bugs.webkit.org/show_bug.cgi?id=330112#c2). [Bug 298097](https://bugs.webkit.org/show_bug.cgi?id=298097), which reports the WebView being terminated when transitioning on a long page, is likely the same problem.

The iOS Safari crash reported to React ([#35336](https://github.com/react/react/issues/35336)) is a different problem, a crash caused by a null reference while `getAnimations()` sorts. Its fix ([#35337](https://github.com/react/react/pull/35337)) is already in the React used in this post, and the comment in `finished.finally()` quoted above is a trace of it.

I think the fundamental fix is for WebKit to release the images in `m_namedElements` when a transition ends. No API can read these images after the transition ends, so no behavior would change, and even if the callback chain remains, the images at least would be gone.

## The memory of pages you leave is not only in the JavaScript heap

In part 2, I measured the memory that pages you leave use for preserved DOM and state as the JavaScript heap after GC. The memory in this post does not show up in that measurement. A snapshot is an image buffer created by the browser engine, and all JavaScript sees is the one small object returned by `startViewTransition()`. On desktop Chrome, the same code gives the memory back every time a transition ends, so there is little chance of noticing this problem during development.

Until WebKit fixes it, a transition that puts `view-transition-name` on a large element leaves behind memory the size of that element on every navigation on iOS. If you use transitions like this, I think it is worth repeating the same navigation path on a real iOS device or in WebKit and checking process memory. As with page preservation, you cannot tell what the screens you left behind are keeping by measuring only the current screen.

[^1]: [yceffort/blog `49086956` `apps/blog/src/components/layout/LayoutWrapper.tsx` L107-L111](https://github.com/yceffort/blog/blob/49086956eb1013c600179ea563f12d0fccd23665/apps/blog/src/components/layout/LayoutWrapper.tsx#L107-L111)

[^2]: [CSS View Transitions Module Level 1](https://www.w3.org/TR/css-view-transitions-1/)

[^3]: On macOS, I applied 412×915, a device scale factor of 2.625, and a mobile user agent to Chrome Beta 159.0.8154.6 through the DevTools Protocol. For the series post conditions, I clicked the series previous or next link visible on screen and waited 2 seconds, 20 times in a row; for the series list condition, I alternated between clicking a link and going back. I recorded the footprint of the GPU process and the renderer process every second with macOS `footprint -p`, so the actual peaks may be higher than in the table. The measurements are in [blink-footprint.csv](/demos/view-transition-webkit-snapshot-leak/blink-footprint.csv).

[^4]: [Define behaviour when capturing image for a large element (csswg-drafts#8561)](https://github.com/w3c/csswg-drafts/issues/8561). This issue proposes defining in the spec what happens when a large element is captured.

[^5]: I ran the WebKit 27.2 build from Playwright 1.64.1 (Playwright webkit 2370) on macOS with a visible window, using the `devices['iPhone 15 Pro']` settings (393×659, device scale factor 3, mobile, touch). I clicked the series list link visible on screen, waited 1.5 seconds after the URL changed, and recorded the footprint of the WebContent and GPU processes with `footprint -p`. In the condition with transitions off, I deleted `Document.prototype.startViewTransition` before any page script ran. Playwright's WebKit is not the same build as iOS Safari, and macOS has no per-process memory limit like the one on iOS, so the tab was never killed and memory kept growing. The measurements are in [navigation.json](/demos/view-transition-webkit-snapshot-leak/navigation.json) and [gc.json](/demos/view-transition-webkit-snapshot-leak/gc.json), and the scripts are [navigation.mjs.txt](/demos/view-transition-webkit-snapshot-leak/navigation.mjs.txt), [plain.mjs.txt](/demos/view-transition-webkit-snapshot-leak/plain.mjs.txt), [gc.mjs.txt](/demos/view-transition-webkit-snapshot-leak/gc.mjs.txt), and [repro.mjs.txt](/demos/view-transition-webkit-snapshot-leak/repro.mjs.txt).

[^6]: [WebKit `31fdaeb2` `Source/WebCore/dom/ViewTransition.h` L84-L86](https://github.com/WebKit/WebKit/blob/31fdaeb27daf545ea0bbef129d1695c5844c46b9/Source/WebCore/dom/ViewTransition.h#L84-L86)

[^7]: [WebKit `31fdaeb2` `Source/WebCore/dom/ViewTransition.h` L264](https://github.com/WebKit/WebKit/blob/31fdaeb27daf545ea0bbef129d1695c5844c46b9/Source/WebCore/dom/ViewTransition.h#L264)

[^8]: [WebKit `31fdaeb2` `Source/WebCore/dom/ViewTransition.cpp` L575-L588](https://github.com/WebKit/WebKit/blob/31fdaeb27daf545ea0bbef129d1695c5844c46b9/Source/WebCore/dom/ViewTransition.cpp#L575-L588)

[^9]: [WebKit `31fdaeb2` `Source/WebCore/dom/ViewTransition.cpp` L1086-L1105](https://github.com/WebKit/WebKit/blob/31fdaeb27daf545ea0bbef129d1695c5844c46b9/Source/WebCore/dom/ViewTransition.cpp#L1086-L1105)

[^10]: [WebKit `31fdaeb2` `Source/WebCore/dom/ViewTransition.cpp` L254-L257](https://github.com/WebKit/WebKit/blob/31fdaeb27daf545ea0bbef129d1695c5844c46b9/Source/WebCore/dom/ViewTransition.cpp#L254-L257)

[^11]: At first I tried to trigger GC by allocating and discarding a large array, but in the plain HTML condition even that array was sometimes not collected, so I could not tell whether a full GC had run. JavaScriptCore exposes a `$vm` object to the page when the `useDollarVM` option is on. On macOS the WebContent process runs as an XPC service, so I passed this option through the `__XPC_JSC_useDollarVM=1` environment variable. I called `$vm.gc()` twice and measured 5 seconds later.

[^12]: [WebKit `31fdaeb2` `Source/WebCore/dom/ViewTransition.h` L269](https://github.com/WebKit/WebKit/blob/31fdaeb27daf545ea0bbef129d1695c5844c46b9/Source/WebCore/dom/ViewTransition.h#L269)

[^13]: [WebKit `31fdaeb2` `Source/WebCore/dom/ViewTransitionUpdateCallback.idl` L26-L28](https://github.com/WebKit/WebKit/blob/31fdaeb27daf545ea0bbef129d1695c5844c46b9/Source/WebCore/dom/ViewTransitionUpdateCallback.idl#L26-L28)

[^14]: [WebKit `31fdaeb2` `Source/WebCore/bindings/js/JSCallbackData.cpp` L79-L84](https://github.com/WebKit/WebKit/blob/31fdaeb27daf545ea0bbef129d1695c5844c46b9/Source/WebCore/bindings/js/JSCallbackData.cpp#L79-L84)

[^15]: [React `278794d7` `packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js` L2186-L2187](https://github.com/react/react/blob/278794d7dee9cd2a3a2aaf9f0b2a4b8b747d74ee/packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js#L2186-L2187)

[^16]: [React `278794d7` `packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js` L2386-L2397](https://github.com/react/react/blob/278794d7dee9cd2a3a2aaf9f0b2a4b8b747d74ee/packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js#L2386-L2397)

[^17]: My interpretation is that in an async function, local variables still used after an `await` are stored in the same scope object as the closures. I did not confirm this in the JavaScriptCore source.

[^18]: [yceffort/blog `5d42d2b8` `apps/blog/src/components/layout/LayoutWrapper.tsx` diff](https://github.com/yceffort/blog/commit/5d42d2b88476bf0f56b1f59cbbc5e220013e9428#diff-b9d8511c05a45a0f41451f4c8e9ebe00d7b638a4c2a49e64f3ca0ab89b929a40)
