---
title: 'Running One Web on <em>Multiple WebViews</em>: Folding Environment Branches into Adapters'
tags:
  - webview
  - architecture
  - css
  - frontend
published: true
date: 2026-09-09 14:00:00
description: 'We supported the iOS and Android WebViews of our own app and of a partner app, and gathered the scattered environment branching into adapters. This is a record of how we organized insets, the bridge, and CSS, along with the problems we hit with the SSR seed and hydration.'
thumbnail: /thumbnails/2026/09/one-web-on-multiple-webviews.png
art:
  undraw: device-sync
  layout: rings
  hue: blue
  tone: light
---

## Table of Contents

## Four Ways to Get a Single Inset

We ran one web service inside the iOS and Android WebViews of our own app and of a partner app. The screens were the same and so was the code, but even the way to obtain the safe area inset at the bottom of the screen was different. That is the inset that keeps content from overlapping the notch, the home indicator, or the OS navigation bar, and each environment handled it as follows.

| Environment          | Top inset                                                              | Bottom inset                           |
| -------------------- | ---------------------------------------------------------------------- | -------------------------------------- |
| Our own app, iOS     | First request header, or a device table (per-model defaults hardcoded) | `env(safe-area-inset-bottom)` (native) |
| Our own app, Android | Bridge (JSAPI) call                                                    | None (`env()` is always 0)             |
| Partner app, iOS     | First request header, then a cookie seed                               | `env(safe-area-inset-bottom)` (native) |
| Partner app, Android | Same as above                                                          | A CSS variable injected by the app     |

> The table above is what we observed with `viewport-fit=cover` declared. Even so, the Android WebViews of both apps returned 0 from `env()`. The reason we did not use `env(safe-area-inset-top)` at the top is that the WebView position differed depending on the screen mode. The WebView sometimes starts below the status bar and sometimes covers the whole screen, so for the status bar height the header calculation needs, we used the value the app reports.
>
> This behavior also changes with the WebView version. According to [Chromium's WebView inset documentation](https://chromium.googlesource.com/chromium/src/+/HEAD/android_webview/docs/insets.md), system bar and cutout insets are delivered to CSS from M136 in fullscreen WebViews and from M144 in all WebViews. The 0 in the table should not be read as a fixed property of Android WebView.

There was a lot more to check beyond insets. Whether the WebView shrinks or gets pushed when the keyboard comes up, whether Android's back action means page navigation or closing the WebView, whether a link opens as an SPA transition or in a new WebView, all of it differed. Down to background resume signals and dark mode settings, every feature used across several screens had to be checked against each channel and OS combination.

Many of these are affected not only by the OS but by the host app's WebView configuration. `windowSoftInputMode` is involved in keyboard behavior, and back navigation handling and edge-to-edge are decided by the host as well. Splitting only on iOS versus Android could not explain the difference between two apps running on the same OS.

Handling these differences meant `if (isPartnerApp)` kept multiplying across components and hooks.

This article covers how we folded scattered environment branching into adapters. We changed the code where each component asked "which environment am I in?", and moved to **declaring** per-environment settings and behavior in one place. I also wrote down the problems we hit while implementing it and the limits that remain.

> This is a case from a web service that ships inside several super apps. The channels are anonymized as "our own app / partner app", and the code examples were written fresh for this article. Behaviors such as partial injection or late injection are what we observed at the time, and do not mean that every WebView behaves the same way.

## The Problem with Piling Up Conditionals

At first, adding a condition wherever a problem appeared seemed like enough.

- The bottom inset came out as 0 in the partner app, so we put a separate calculation into that component.
- The UA had no identifying marker for our own app, so we added an exception in the detection code.
- We blocked our first-party bridge APIs with a guard so they would not be called in the partner app.

Each fix solved the immediate problem, but nothing recorded what actually differed per environment. A year later, hundreds of places computing values, calling the bridge, styling, and rendering UI were calling the raw detection functions directly. Three problems showed up as we maintained it.

1. **It was hard to see what differed per environment.** Answering "what is different in the partner app?" meant reading hundreds of lines of grep output.
2. **A missing guard was hard to notice.** Code that passed compilation and the existing tests failed only on a real device with a specific channel and OS combination.
3. **Adding a new environment meant checking many places.** For every existing branch, we had to review whether the same condition applied to the new environment too.

We hit exactly this kind of bug with the top inset. Our own app puts a navigation style marker in the UA, and the web read it and reserved the status bar height only when the navigation was transparent. We reused this logic in the partner app, but the partner app's UA had no such marker. It was always judged to be the default navigation, so the top inset became 0 as well.

As a result, the header intruded into the status bar only in the partner app. There was no problem in our own app, and on desktop it was hard to find unless you reproduced that UA. We only found the cause after checking on a real device with the partner app.

The detection utility had been built on the premise that "the UA contains our own app's marker." The caller had no way of knowing that premise. A condition specific to our own app was hidden inside a utility that looked reusable in other environments.

## Splitting the Branches Before Splitting the Web

We also considered splitting the web per host.

That said, our service shared most of its domain logic. Even with per-host builds, how to manage the shared code and the deployments would have been a separate problem to solve. The problems at the time were mostly in host integration such as insets and the bridge, so we chose to separate that part instead.

Even so, we could not remove every branch. Some conditions came from product requirements, like showing a banner only in a specific app. First we sorted the branches by purpose.

## Branches to Remove and Branches to Keep

Differences in values and behavior are handled inside the adapter, and structural differences in style were gathered into a declaration layer. UI conditions that come from product requirements stayed at their use sites.

| Branch type            | Example                                    | Solution                                  | Scope                                         |
| ---------------------- | ------------------------------------------ | ----------------------------------------- | --------------------------------------------- |
| Value branch           | Insets, status bar height, keyboard height | Adapter plus store                        | Removes environment detection from components |
| Behavior branch        | Bridge calls, back button, resume signals  | A shared bridge interface                 | Removes environment detection from call sites |
| Style structure branch | Per-environment selectors                  | `data-*` attributes plus shared selectors | Keeps per-environment conditions in one place |
| UI branch              | Components exclusive to a specific app     | An if that reads a config value           | Kept, since it follows product requirements   |

Branching on values and behavior stays inside adapter selection and the adapter implementations. Components only use the result, so they do not need to detect the environment themselves.

For a banner drawn only in a specific app, it reads better when the display condition is visible in the code. In that case, **where the condition comes from** is what matters.

```tsx
<Page>
  {/* The component parses the UA string directly */}
  {userAgent.includes('PARTNER') && <PartnerBanner />}

  {/* Uses the channel the adapter decided on */}
  {host.channel === 'partner' && <PartnerBanner />}

  {/* If it can apply to several channels, use a feature setting */}
  {host.features.showPartnerPromotion && <PartnerBanner />}
</Page>
```

Not every UI condition needs a feature flag. If the requirement applies to a single channel and will not be reused, a `channel === 'partner'` comparison can be enough.

## From Asking to Declaring

The shared principle is to reduce the number of places that detect the environment.

- If every component detects the environment, every new environment means reviewing the existing conditions.
- If per-environment settings are gathered into `HostConfig`, `data-*` attributes, and CSS variables, components can keep using the same interface. If a new environment can be supported through the existing interface, adding an adapter and a declaration is enough.

Environment detection happens at the composition root. That is where we read the UA and the headers, pick an adapter, and pass the config, the store, and the bridge to the rest of the code.

```text
[N hosts: headers / cookies / JSAPI / CSS variable injection / env()]    ← input differs per host
        ↓
① Adapters: N per-environment files                                     ← handles per-environment sources and behavior
        ↓
② Store: current values and trust grades
        ↓
③ Declaration: html[data-*] + our own CSS variables + HostConfig
        ↓
④ Usage: CSS / components / hooks                                       ← used through the same interface
        ↓
⑤ Verification: lint + shared tests                                     ← checks import limits and adapter behavior
```

We split the files along these roles too.

```text
src/host/
  adapters/
    types.ts        # the type and methods an adapter implements
    detect.ts       # raw detection (UA, headers). used only by composition code such as bootstrap.ts
    own-ios.ts      # per-environment integration
    own-aos.ts
    partner-ios.ts
    partner-aos.ts
  store.ts          # stores and updates insets with a grade per source
  bootstrap.ts      # composition root. the only place "which environment?" runs
  react.tsx         # the Provider and hooks components use
```

`HostAdapter` has three parts. `seedInsets` and `watchInsets` provide the initial and updated inset values, and `bridge` implements the host-specific behavior. `config` holds the channel, the OS, and the feature settings.

One adapter file implements one environment from the table at the top. Cookie names, CSS variable names, and the list of unsupported bridge methods are managed in that file. `bootstrapHost` picks the adapter matching the environment, creates the store from the seed, and returns the values React and CSS will use.

The server derives the seed from the request headers and cookies and puts it into the HTML along with the detection result. The client entry point reads that seed from `<html data-seed>` and initializes the store with the same value (the implementation is in the per-file example later). Hydration of the current page uses this value. The cookie the server sets on the response exists to restore the seed on later SSR requests, such as moving to another subdomain.

Components do not need to know where a value came from or how the bridge is implemented.

```tsx
function Screen() {
  const {bottom} = useInsets() // subscribes to the store. does not know where the value came from
  const host = useHost() // HostConfig: channel, os, features
  const bridge = useBridge() // HostBridge: the same methods in every environment

  useEffect(() => bridge.setStatusBarStyle('dark'), []) // called without a guard

  return (
    <div style={{paddingBottom: bottom}}>
      {host.features.showPartnerPromotion && <PartnerBanner />}
    </div>
  )
}
```

Where the raw detection functions may be used is restricted by lint, and every adapter runs the same tests to confirm the behavior promised by the interface. These are called contract tests.

## Values: Handling Insets That Arrive Late

On the hosts we observed, the CSS variables were injected after `onPageFinished`. Sometimes bottom came in first and top came in later. We could not assume that every inset is known at initialization time.

At first we wrote a function that compared the header, the cookie, and the CSS variable on every read and picked a fallback. But the answer could change from call to call, and we had to keep worrying about whether it might pick a cookie older than a measured value we had already read.

So we separated reading from updating. Components read the store, and the adapter pushes values into the store as it gets them. The store decides whether to update based on the trust grade of the source.

```text
seed (header/cookie)          = provisional. never overwrites a measured value.
injection detected (CSS var)  = measured.
```

`push(side, value, grade)` ignores a value whose grade is lower than the current grade for that side. If the grade is equal or higher, it changes the value and notifies subscribers.

The host app only attached the inset headers to the WebView's first request. Moving to another subdomain inside the service meant the next SSR request had no such header. So we wrote the header values into a cookie on the first SSR response, and restored the seed from that cookie on later requests. Since it came from an earlier request, we gave it a lower grade than a measured value.

In React we subscribe to the store with [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore#adding-support-for-server-rendering). If the store pins the seed snapshot it used for the first render and `getServerSnapshot` returns only that, then even if the client bootstrap pushes a measured value in before hydration, the value React sees during hydration is the same as the server's. The measured value is applied in a re-render after hydration finishes. The seed itself is the value the server serialized into the HTML rather than something the client re-reads from the cookie, which removes any chance of the two sides starting from different seeds.

When reading a CSS variable, **you have to distinguish between not injected and injected as 0.** `getComputedStyle` returns an empty string when the variable is absent, and something like `"0px"` when 0 was injected.

```ts
/** Reads the CSS variable for each side, distinguishing not injected (undefined) from injected 0 (0) */
const readInjectedInset = (cssVar: string): number | undefined => {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim()

  if (value === '') return undefined // not injected: it has not arrived yet

  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return undefined // unparseable counts as not injected too. promoting it to a measured 0 would beat the seed

  return parsed > 0 ? Math.round(parsed) : 0 // 0 is a valid measured value too
}
```

The cookie from a previous session may still hold `bottom: 34` while on the current screen edge-to-edge is off and the measured inset is 0. Falling back to the cookie "when it is 0" here produces an unnecessary 34px of bottom padding. Only the sides that were not injected should be filled from the seed, and a measured 0 should be used as is. The same principle keeps the top seed when only bottom was injected first.

```ts
const css = {
  top: readInjectedInset('--host-inset-top'),
  bottom: readInjectedInset('--host-inset-bottom'),
}
const seed = readSeedFromHtml() // the seed the server serialized into <html data-seed>

const merged = {
  top: css.top ?? seed.top ?? 0, // because it is ??, "injected as 0" does not lose to the seed
  bottom: css.bottom ?? seed.bottom ?? 0,
}
```

This article only covers top and bottom, but insets have four sides: top, right, bottom, left. In landscape, left and right repeat exactly the same problem, so it is better to let the store and the merge logic handle all four sides from the start.

The keyboard height can be handled in a similar way, since its source differs per environment and it can arrive late or change along the way. When picking a source, though, you have to check the WebView version as well. For example, [Android WebView supports visual viewport resizing for the keyboard from M139](https://chromium.googlesource.com/chromium/src/+/HEAD/android_webview/docs/insets.md). If each adapter handles that difference, components only need the height the store provides.

We did not detect every injection. Detecting inline style changes with `MutationObserver` required assuming that the app writes the value into the inline style of `documentElement`. We could not confirm that without access to the app source, so in JS we decided to reflect only the first measurement and changes that come with a signal, such as rotation or resize. So there are still cases where a measured value is injected but the seed is used until the next signal arrives.

## The Seed Cookie: What It Carries and When It Disappears

The seed used in SSR depends on whether the header and the cookie exist.

| SSR situation                     | Header  | Cookie                 | Seed    |
| --------------------------------- | ------- | ---------------------- | ------- |
| WebView's first request           | Present | Absent or an old value | Header  |
| Subdomain move inside the service | Absent  | Present                | Cookie  |
| SSR right after logout            | Absent  | Absent                 | Default |

The host we integrated with deleted every WebView cookie at logout. The inset seed disappeared along with the session cookie. The web cannot keep only the seed cookie as an exception, so we had to handle the state where there is no cookie.

Non-persistent storage and the timing of disk writes matter too. iOS's [`WKWebsiteDataStore.nonPersistent()`](https://developer.apple.com/documentation/webkit/wkwebsitedatastore/nonpersistent%28%29) keeps data in memory only, so you cannot assume cookies survive an app restart. On Android as well, recent cookie changes can be lost if the process is killed before they are written to disk. [`CookieManager.flush()`](<https://developer.android.com/reference/android/webkit/CookieManager#flush()>) is the API that writes current cookies to persistent storage. What we ran into directly was deletion at logout, but in either case cookies should not be treated as a value that is always there.

For the case where neither the header nor the cookie exists, we have a `default` grade.

```ts
type Grade = 'default' | 'seed' | 'measured'
const RANK: Record<Grade, number> = {default: 0, seed: 1, measured: 2}
```

An SSR request with no header and no cookie builds the first HTML with a `default` grade of 0. Our own app on iOS has a path that gets the seed from a device table. We pass the same initial value to the client too, and update to `measured` once the measured value arrives.

Without a seed, the padding on the first screen can be briefly wrong. We did not keep a separate copy in localStorage to avoid that, because it would add one more path managing a stale seed even after the cookies are deleted. Instead we recorded how many times we rendered with `default`, per host. If it happens often outside logout, we can go check the cookie storage or delivery path.

The default is not used on every logout. Closing and reopening the WebView brings the first request header back, and an SPA transition keeps the store in memory. The path we confirmed in our service was logging out inside the web and then SSR-ing the login screen through a full page navigation.

We configured the seed cookie as follows.

- Set `Max-Age` so it can be kept after the session ends. It does not prevent the host from deleting the cookie explicitly, though.
- Specify `Domain` so it can be shared across subdomains. If it is omitted, the cookie is only sent to the host that set it.
- Store only the insets and a schema version. No user identifying information, and the channel and OS are detected again on every SSR request.

Using a cookie as an SSR input makes the HTML differ per device. If a shared cache ignores that difference, you can receive HTML carrying another device's insets. Use `Cache-Control: private`, or make sure the inputs that change the HTML, such as headers and cookies, are reflected in the cache policy.

## Behavior: Handling Bridge Differences in the Adapter

Putting a guard around every first-party bridge call means every new call site has to remember the same condition. Call sites use the same method, and only the implementation differs per environment. Features that can be skipped in unsupported environments, such as the status bar style, were implemented as functions that do nothing (no-op).

```ts
// our own app's adapter calls the JSAPI, and the partner app's adapter implements the same method as a no-op
const ownAppBridge: HostBridge = {
  setStatusBarStyle: (style) => window.OwnAppJSAPI?.setStatusBar(style),
}
const partnerBridge: HostBridge = {
  setStatusBarStyle: () => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[bridge] setStatusBarStyle: not supported in the partner app (no-op)',
      )
    }
  },
}
```

Call sites can just call the method without checking the environment. We do leave a warning in development that the feature is unsupported, so that the reason nothing happens is discoverable.

Not every unsupported feature can be a no-op. For example, after a payment finishes our own app closes the WebView, while the partner app may need to navigate to a result page. This behavior is wrapped as `finishFlow(result)` and implemented in each adapter. Naming it after a specific mechanism, like `closeWebView()`, makes it hard to express the partner app's behavior. Use a no-op only when doing nothing still satisfies the requirement.

Navigation and resume events are handled the same way.

- **Navigation**: the same "go to the next screen" is pushing a new WebView stack in our own app and SPA routing in the partner app. The call site calls a single `bridge.navigate(url)`, and the adapter decides whether to push a stack or switch with the router. The `window.open` and external browser policies are absorbed in the same place.
- **Resume signals**: when the WebView comes back from the background, the session and the data have to be rechecked. The signal each host provides is different, so the adapter takes the bridge's resume event, `visibilitychange`, or `pageshow` and delivers it as an event of the same shape.
- **Back navigation**: even on Android the handling differs per host. The behavior of "go back if there is a previous page, otherwise close the WebView" is implemented against each host's API.

Whenever we found an environment-dependent difference in a handler, we first checked whether it was a difference in host integration or a product requirement.

- Differences in **host integration** are handled in the adapter. Whether to close the WebView or move to a result screen after a payment is decided in the implementation of `bridge.finishFlow(result)`.
- Differences from **product requirements** stay in the handler. If a coupon screen should be shown after payment only in a specific app, it is declared in `features` and the handler reads it.

```tsx
function usePaymentComplete() {
  const host = useHost()
  const bridge = useBridge()

  return async (order: Order) => {
    await markPaid(order) // domain. unrelated to the host

    if (host.features.showCouponAfterPayment) {
      bridge.navigate('/coupon') // product decision. an if that reads a declaration stays
      return
    }
    bridge.finishFlow({orderId: order.id}) // whether to close the WebView or move the page is the adapter's job
  }
}
```

We did not move the whole handler into the adapter. If `adapter.onPaymentComplete(order)` also took care of processing the payment, domain logic could end up duplicated across the per-environment implementations. If an adapter imports the order or payment modules, it is worth checking whether its role has grown too wide.

When the execution order differs per environment even after splitting the steps, the related steps can be wrapped into a single method. Even then, limit the scope so that domain processing does not move along with it. Contract tests check not only the internal call order but also whether every host satisfies the same result conditions once the work completes.

App versions have to be considered too, because shipping the web does not update the user's host app along with it. If every call site compares version strings to decide whether a feature is supported, the benefit of gathering environment branching shrinks. The adapter checks support through a bridge handshake or a version table and puts the result into `HostConfig.features`. Call sites only need to check that setting.

## Style: Using Insets Through a Shared CSS Variable

When only the value differs, as with insets, CSS variables can handle it. The per-environment declaration picks the source, and components use the same variable name.

```css
/* Environment declarations: the branch exists only here */
html {
  --app-bottom-inset: env(safe-area-inset-bottom, 0px);
}
html[data-host='partner'][data-os='aos'] {
  /* before injection, the seed SSR sent down as an <html> inline style; after injection, the measured value */
  --app-bottom-inset: var(--host-inset-bottom, var(--app-seed-bottom, 0px));
}

/* Component styles use only the shared variable */
.floating-layout {
  padding-bottom: calc(16px + var(--app-bottom-inset));
}
```

This way components do not have to repeat per-environment overrides.

`data-host` and `data-os` are put on `<html>` during SSR. Letting client JS attach them means the default rules apply on the first paint and change later. We also send down `--app-seed-bottom` so the pre-injection inset can be used.

We keep separate names for the variable the web uses (`--app-bottom-inset`) and the variable the app injects (`--host-inset-bottom`). If both sides set the same variable, the web code can overwrite the app's measured value. The name the app injects is only read, and the web uses its own variable.

In padding calculations we also had to look at the difference between `max()` and addition. Applying `max(inset, 16px)` to a bottom-fixed button reserves only the larger of the two. The partner app on Android that we observed extended the WebView below an opaque navigation bar. With a 15px inset, 15px of the 16px reserved by `max(15px, 16px)` was hidden behind the bar, leaving only 1px of visible padding.

To leave 16px above the bar on that screen we needed `calc(16px + 15px)`. That is why the example above uses addition. In environments where the inset is 0 it stays at 16px. The visual result was different from an iOS screen where the area around the home indicator is visible, so we checked not only whether edge-to-edge was on but how the bar is actually drawn.

Not every component needs 16px added. For something like a bottom sheet, where content should sit right above the system area, applying only the inset is enough. Extra padding is decided by the component design.

When the selector structure itself differs, the branch remains. We declare such conditions with an attribute that states the reason, like `[data-features~='no-env']`, and gathered the repeated selectors into mixins. The point is to be able to find all the related styles at once when changing them.

We split the CSS and JS paths by how the value is actually used. Values used only for layout, like the bottom one, can be handled in CSS. At the top there was code computing the position of the header and sticky elements in JS, so we made it use the same value through the store. The `Screen` above is an example of needing the bottom inset in JS too.

The two paths update at different times. CSS reflects a late-injected variable immediately, while the JS store stays on the previous value until the next detection signal. The problem of missing a late injection with no signal remains on the JS path.

## Enforcing It with Lint and Tests

Even after changing the structure, if new code uses the raw detection functions directly the branches scatter again. Rather than relying on review alone, we added lint and contract tests to CI.

Lint prevents importing the raw detection utilities (`isPartnerApp` and friends) outside the adapters and the composition code.

```js
// eslint: components may not import the raw detection utilities
'no-restricted-imports': ['error', {
  patterns: [{
    group: ['**/host/adapters/detect'],
    message: 'Detection utilities are for adapters and composition code only. Use HostConfig in components.',
  }],
}]
```

The real configuration also needs exceptions for the adapters and allowed composition code such as `bootstrap.ts`. The pattern above applies to the import string, so the project's path aliases and relative paths have to be considered too. We also add stylelint rules so that `env(safe-area-inset-*)` and `prefers-color-scheme` are not referenced directly in component styles.

Since the adapters implement the same interface, a shared test suite can be applied to all of them.

```ts
describe.each(adapters)(
  'HostAdapter contract: $config.channel-$config.os',
  (adapter) => {
    it('never returns a negative inset', () => {
      /* ... */
    })
    it('does not throw when an unsupported bridge method is called', () => {
      /* ... */
    })
    it('does not let a seed overwrite a measured value', () => {
      /* ... */
    })
  },
)
```

The top inset bug from earlier can also be kept as a test that feeds the partner app's UA as input and checks the result. Gathering per-environment detection and value computation in one place made regression tests like this easier to write. It does not verify the real host's behavior, but CI can confirm that a bug we already hit does not come back.

## Implementation Example, File by File

Putting the adapters, the store, the initialization code, and the React glue together looks like this. Details such as per-source parsing and the router are omitted.

```ts
// host/adapters/types.ts: the values and methods an adapter provides
export type Side = 'top' | 'right' | 'bottom' | 'left'
export const SIDES: Side[] = ['top', 'right', 'bottom', 'left']
export type Insets = Record<Side, number>
export type Grade = 'default' | 'seed' | 'measured'

export interface HostConfig {
  channel: 'own' | 'partner'
  os: 'ios' | 'aos'
  features: {showPartnerPromotion: boolean; showCouponAfterPayment: boolean}
}

export interface HostBridge {
  setStatusBarStyle(style: 'light' | 'dark'): void
  navigate(url: string): void // the adapter decides whether to push a stack or use the router
  finishFlow(result: FlowResult): void // and whether to close the WebView or go to a result screen
}

export interface HostAdapter {
  seedInsets(ctx: RequestContext): Partial<Insets> | undefined
  watchInsets(push: (side: Side, value: number, grade: Grade) => void): void
  bridge: HostBridge
  config: HostConfig
}
```

```ts
// host/store.ts: a lower grade cannot overwrite a higher one. that is the whole rule
const RANK: Record<Grade, number> = {default: 0, seed: 1, measured: 2}

export function createInsetStore(seed: Partial<Insets> | undefined) {
  const state = {} as Record<Side, {value: number; grade: Grade}>
  for (const side of SIDES) {
    const seeded = seed?.[side]
    state[side] =
      seeded === undefined
        ? {value: 0, grade: 'default'} // SSR with no header and no cookie lands here
        : {value: seeded, grade: 'seed'}
  }

  const listeners = new Set<() => void>()
  const serverSnapshot = toInsets(state) // the value used for the first render. never changes after this
  let snapshot = serverSnapshot

  return {
    push(side: Side, value: number, grade: Grade) {
      if (RANK[grade] < RANK[state[side].grade]) return
      state[side] = {value, grade}
      snapshot = toInsets(state)
      listeners.forEach((listener) => listener())
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot, // what React sees during hydration
    grades: () => Object.fromEntries(SIDES.map((s) => [s, state[s].grade])), // for telemetry
  }
}
```

```ts
// host/adapters/partner-aos.ts: the value sources and behavior of the partner app on Android
export const partnerAosAdapter: HostAdapter = {
  seedInsets: (ctx) =>
    parseInsetHeaders(ctx.headers) ?? parseSeedCookie(ctx.cookies),

  watchInsets: (push) => {
    const report = () => {
      for (const side of SIDES) {
        const injected = readInjectedInset(CSS_VAR_BY_SIDE[side]) // undefined when not injected, 0 when 0 is injected
        if (injected !== undefined) push(side, injected, 'measured')
      }
    }
    report()
    visualViewport?.addEventListener('resize', report)
  },

  bridge: {
    setStatusBarStyle: noopWithDevWarning('setStatusBarStyle'), // when the alternative is "do nothing"
    navigate: (url) => router.push(url), // this host does SPA transitions
    finishFlow: (result) => router.replace(resultPath(result)), // a different implementation, not a no-op
  },

  config: {
    channel: 'partner',
    os: 'aos',
    features: {showPartnerPromotion: true, showCouponAfterPayment: false},
  },
}
```

```ts
// host/bootstrap.ts: the only place "which environment?" runs. once on the server and once on the client
export function bootstrapHost(ctx: RequestContext) {
  const adapter = selectAdapter(detect(ctx))
  // the client uses the seed the server put into the HTML as is. it does not re-read the cookie
  const seed: Partial<Insets> =
    ctx.serializedSeed ?? adapter.seedInsets(ctx) ?? {}
  const store = createInsetStore(seed)

  if (typeof window !== 'undefined') {
    adapter.watchInsets((side, value, grade) => store.push(side, value, grade))
  }

  return {
    htmlAttrs: {
      'data-host': adapter.config.channel,
      'data-os': adapter.config.os,
      'data-seed': encodeSeed(seed), // with no seed it encodes {} and restores it as {}
      style: {'--app-seed-bottom': `${seed?.bottom ?? 0}px`}, // for the first paint on the CSS path
    },
    host: adapter.config,
    bridge: adapter.bridge,
    insetStore: store,
    // the rule from the seed section: only an SSR response that saw the header writes the cookie. Max-Age and Domain are required
    seedCookie: hasInsetHeaders(ctx)
      ? {
          name: SEED_COOKIE,
          value: encodeSeed(seed),
          maxAge: 60 * 60 * 24 * 30,
          domain: COOKIE_DOMAIN,
          path: '/',
          sameSite: 'lax' as const,
          secure: true,
        }
      : undefined,
  }
}
```

```tsx
// host/react.tsx: provides the config, the bridge, and the store to components
export function HostProvider({
  value,
  children,
}: {
  value: ReturnType<typeof bootstrapHost>
  children: ReactNode
}) {
  return (
    <HostContext.Provider value={value.host}>
      <BridgeContext.Provider value={value.bridge}>
        <InsetStoreContext.Provider value={value.insetStore}>
          {children}
        </InsetStoreContext.Provider>
      </BridgeContext.Provider>
    </HostContext.Provider>
  )
}

export const useHost = () => useContext(HostContext)
export const useBridge = () => useContext(BridgeContext)
export function useInsets() {
  const store = useContext(InsetStoreContext)
  // during hydration React sees the pinned server snapshot, and the current snapshot after that.
  // nothing mismatches even if the client bootstrap's watchInsets pushes a measured value before hydration
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  )
}
```

```tsx
// SSR entry point (framework-independent pseudocode): detection ends here, and the <html> attributes and the cookie ride the response
function renderDocument(req: Request, res: Response) {
  const boot = bootstrapHost(requestContextFrom(req))
  if (boot.seedCookie) res.setCookie(boot.seedCookie)

  return renderToString(
    <html {...boot.htmlAttrs}>
      <body>
        <HostProvider value={boot}>
          <App />
        </HostProvider>
      </body>
    </html>,
  )
}
```

The code above is pseudocode showing a general SSR flow. In the Next.js App Router there are [specific places where cookies can be written](https://nextjs.org/docs/app/api-reference/functions/cookies), and a `boot` object containing functions cannot be passed from the server to a Client Component. Putting the seed cookie on the first response has to happen in Proxy (formerly Middleware) or in the server code that builds the response.

The Provider receives the detection result and the seed as **serializable props**. [Client Components are also rendered to HTML on the server for the first request](https://nextjs.org/docs/app/getting-started/server-and-client-components#on-the-server), so the initial value must not be read only from `document`. The Provider initializes the store from props, and initialization is kept separate from watching so that measurement watching starts after mounting in the browser. Server rendering and hydration use the same seed snapshot.

The client entry point in the plain SSR example builds the context from `navigator` and the HTML's `data-seed`, then runs `bootstrapHost` once. Passing the result to `HostProvider` lets components use `useInsets()`, `useHost()`, and `useBridge()`. Even for a request that had no seed, `data-seed` encodes an empty object `{}`. The decoded result has to stay `{}` as well, and must not be turned into `undefined`, which would run the cookie fallback again.

## Reproducing Per-Environment Behavior Locally

The adapters turned out to help in local development as well. Previously, checking a partner app screen meant faking not just the UA detection but host behaviors such as CSS variable injection, one by one. The setup was tedious, so both development checks and bug reproduction often depended on a real device.

Now a test adapter can provide the values and the behavior.

- **A dev environment switcher**: forcing HostConfig through a query parameter in dev builds reproduces the declarations of the partner app on Android (`data-*` attributes, CSS variables) as they are, even in a desktop browser. The host's CSS variable injection is faked with a dev script, and putting bottom in first and top in later with `setTimeout` reproduces even the partial injection race locally.
- **Storybook**: inject an adapter with a decorator and place the same component side by side as per-environment stories.
- **E2E**: define Playwright projects per environment profile (a combination of UA, cookies, and headers) and run the same scenario as many times as there are environments.

These tests reproduce behavior we already know about. Differences between WebView engines and unexpected injection timing still have to be checked on a real device. Local tests reduce the repeated checks, and the gap against the real host is verified on a device.

## Adding a New Environment

Supporting a new partner app adds another iOS and Android combination. If it can be supported through the existing interface, the work should go in this order.

1. Investigate the value sources, the bridge names, and the container configuration, and write the per-environment adapter.
2. Register the adapter in the shared contract tests.
3. Add the host declaration and any CSS overrides needed.
4. If there are app-specific UI requirements, add the feature settings and that UI.

If the environment can be supported through the existing interface and there are no new product requirements, the goal is not to modify the existing components and hooks. Adding dedicated UI does add code for it. There is no need to see that as a failure of the environment abstraction. What to watch for is whether host detection creeps back into the existing components and hooks.

Investigating a new host is still necessary. But gathering the results into an adapter means not having to hunt down the same condition across many files again. Whether we can keep that scope on the next integration has to be confirmed through the actual work.

## What This Structure Does Not Solve

Problems remained after we adopted it, and it added some burden of its own.

**Per-environment implementations still have to be maintained.** Gathering the branches into adapters does not remove the different sources and behaviors each host has. More environments mean more adapters and more tests.

**Tracking a bug goes through more code.** Finding where a value came from means following `component → hook → store → adapter`. Someone seeing it for the first time has to learn this structure first. For a small service with little environment branching, this cost could be the higher one.

**Feature flags need management too.** Making a flag for every condition leads to overlapping meanings and combinations that are hard to reason about. When adding a new flag, we confirmed in review why it cannot be expressed with the existing settings.

**A host update can change the premises.** Contract tests only verify the adapter's implementation, not whether the real host keeps returning the same values. When a value source or behavior changes, like the change in WebView `env()` support, the adapter has to be revisited.

That is why logging the source of the insets and any outliers remotely mattered. Our own app can be checked with a debug build, but partner app release builds often have WebView inspection disabled. Without logs, we would have to find the cause from the description of whoever has a real device.

**First paint accuracy is not guaranteed.** If the seed is stale or missing and the measured value arrives late, the padding can change. Hiding that means delaying rendering, and drawing immediately means accepting layout shift. On the JS path there are also cases where an injection with no signal is missed and the seed stays.

## After the Work

While working on it, I felt that it resembled the eventual consistency problem in distributed systems. The web cannot know the host's current state directly, and receives it through headers, the bridge, or CSS variables. The delivery times differ, and some values can be late or missing. A cookie is a previously observed value, and the store's grades are the rule for deciding which side to use when different sources conflict.

That said, this implementation does not guarantee eventual consistency. If a late injection with no signal is missed, the value may never be updated to the measured one. Where the analogy helped was in making us think first about when a value arrives and how long it is valid.

Being able to open one web in several apps is good for expanding the service. In return, the development side needs time to investigate each new host and handle the differences. Treating it as sticking a few conditions onto existing code makes it easy to repeat the same problems on the next integration.

In this work we gathered environment detection into one place and provided the values and behavior through a shared interface. Conditions from product requirements stayed. The biggest change was being able to tell which adapter to check and where to add a test when a new problem shows up.
