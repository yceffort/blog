---
title: 'Web Service Performance Analysis (4)'
tags:
  - web-performance
  - frontend
published: true
date: 2025-07-19 19:20:44
description: 'If you find yourself thinking "maybe I should try this too..." — reach out right now!!'
series: 'Web Service Performance Analysis'
seriesOrder: 4
---

## Feedback from a Real Developer

> The following is feedback sent by an actual developer.

### Was the write-up helpful?

It was so helpful that I kept saying "wow..." the entire time I was reading it.
Thank you so much for the detailed analysis.

While building my portfolio with an animation library, this was the first time I really thought about web performance.
I kept poking around the Performance and Lighthouse tabs and looked up various documents on things like reducing JavaScript bundles,
but the material was unfamiliar and hard to work through on my own.

Then I requested the analysis service from you, and I was genuinely impressed by how detailed and professional the analysis was.
You introduced not only various strategies for web performance optimization but also principles that account for SEO and accessibility,
and even showed real applied examples, which helped me tremendously.

There were times during development when I felt uneasy and suspicious about something but just let it slide.
The part where the intro animation plays every time before the main content appears was exactly that.
It made me realize that emphasizing animation could end up lowering both performance and accessibility,
and I now feel I should develop in line with the Progressive Enhancement principle you introduced.

I'll study the analysis in detail and apply the improvements to my portfolio one by one.
This is truly the best.. thank you sincerely.

### Would you recommend this performance analysis to other developers?

Absolutely, without hesitation. I've never seen material that covers performance in this much detail.
When it's published, I'll definitely buy it and read it!

### Any additional questions or areas that need supplementing

> When implementing animations, I'm curious whether implementing them with CSS transitions is better for performance than using a library.
> I think the approach you demonstrated of adding classes via the classList.add() method is effective,
> but I know libraries like GSAP also do internal optimizations, and since I don't really know how they compare performance-wise, I kept having doubts.

For simple transition effects, CSS transitions with no dependencies whatsoever will obviously be more advantageous. (There's zero JavaScript overhead, and you're using only CSS.)

However, for complex cases or situations that require user interaction, GSAP should likewise be good enough that you won't feel any performance penalty.

I haven't used GSAP that much myself (I've mostly used framer-motion), but it's most likely built internally to take the GPU path well.

> While researching animation performance, I heard the term GPU acceleration a lot, and I was curious how the GPU processes CSS.
> Also, even if the number of animated elements grows, can the browser still maintain 60fps and run smoothly as long as these principles are followed?

The browser automatically separates elements into their own layers and performs only compositing work on the GPU for elements that satisfy the following conditions.

https://www.chromium.org/developers/design-documents/gpu-accelerated-compositing-in-chrome/

- transform (translate, scale, rotate)
- opacity
- will-change
- position: fixed + z-index
- contain: paint

And so on.. these properties skip the layout calculation and paint stages, and only the Composite stage runs on the GPU, which makes them very fast and smooth.

So even with many animations applied, you should be able to hit 60fps as long as the following conditions are met.

- Use only GPU-friendly properties (transform, opacity)
- Don't overuse will-change (it wastes GPU memory)
- Synchronize with requestAnimationFrame or internally optimized timing
- Minimize DOM updates (especially with scroll-linked animations, the DOM may struggle to keep up with scroll speed)

---

> The following is the write-up delivered to the actual developer. They said everything could be made public, so it's published in full without any redaction.

# portfolio-amber-mu-57.vercel.app Performance Analysis

> **Disclaimer**

> This summary condenses the key points from the performance analysis report of the portfolio-amber-mu-57.vercel.app website (as of July 19, 2025, 12:00). Depending on website updates or environmental changes after the time of analysis, the actual state may differ. This analysis was inferred from the bundled artifacts deployed to the browser, so it may differ somewhat from the code as actually written.

> The performance bottlenecks and improvement suggestions presented are general recommendations, and their actual effect when applied may vary depending on many factors such as the website's specific implementation, server environment, and traffic patterns. This summary is provided for informational purposes, and the final decisions on applying the suggestions and responsibility for their outcomes rest with the website's owner.

> For more detailed analysis, methodology, and full context, please refer to the original analysis report.

## 1. Summary

Hello! To help the [https://portfolio-amber-mu-57.vercel.app/](https://portfolio-amber-mu-57.vercel.app/) website deliver a faster and more reliable user experience, I've summarized the key findings from a performance analysis of the currently deployed service.

The `portfolio-amber-mu-57.vercel.app` website is a single-page portfolio built around a **GSAP-based intro animation** and a **CSR-centric React tech stack**. It currently **appears to be in an early stage of development**, and in terms of animation presentation it delivers an impressive user experience. Structurally, some design choices work against it in performance measurement tools like Lighthouse, so there is clear room for improvement.

The main findings are as follows.

- **The main content is dynamically rendered and mounted via JavaScript after the intro animation**  
  → Causes delayed LCP measurement and distorted content-exposure timing
- **The entire application logic is contained in a single `index.js` bundle**  
  → JavaScript parsing and execution delays, reduced cache reuse
- **The GSAP-based transition animation removes content and then re-introduces it**  
  → The actual content is recognized late by both browsers and crawlers
- **External libraries such as `react`, `react-dom`, `emotion`, and `gsap` are included in one bundle**  
  → Increased initial chunk size and loading delays
- **Core content is not included in the initial HTML**  
  → Disadvantageous for SEO and accessibility
- **LCP measurements differ between Lighthouse and the Performance tab**  
  → Caused by structural differences in how measurement end points are determined

Accordingly, I suggest prioritizing the following improvements.

- **Content-first rendering and Progressive Enhancement**:
  - Include the main content in the initial HTML, and handle only the visual transition with animation.
  - Improve the structure so that at least minimal information is delivered even in environments where JavaScript is disabled.
- **Redesign the GSAP animation structure**:
  - Instead of removing content and re-introducing it, implement only visual transitions with GPU-friendly properties like `opacity` and `transform`.
  - The structure where real content renders only after the one-line intro is disadvantageous for LCP, so removing it is recommended.
- **Adopt code splitting and a chunk caching strategy**:
  - Split out static libraries like `react` and `react-dom` into separate chunks with the `manualChunks` option.
  - Restructure so that small changes don't regenerate the entire bundle, maximizing user-side caching.
- **Branch on first-time vs. returning visitors**:
  - I recommend showing the full intro animation on the first visit, and a shortened transition or immediate content afterward.
  - This gives first-time visitors the rich animation, while repeat visitors get quick access to the content they want.
  - Track visitor state using `localStorage` or similar

Applying these improvements should yield gains across many fronts: user experience at initial render, key performance metrics like LCP/FCP, search engine optimization, and mobile responsiveness. Please refer to the full report body for detailed technical context and rationale.

## 2. Analysis Overview

The website was analyzed as deployed on July 19, 2025.

## 3. Website Analysis

![1.png](./images/portfolio/1.png)

![2.png](./images/portfolio/2.png)

The tools used for the analysis were:

- chrome dev tool
- webpagetest

### 3-1. Main Frameworks, Libraries, and Build Environment

Since this website has only a single JavaScript resource, I analyzed that resource to identify which frameworks and libraries are in use.

- react: react@19.1.0
- vite: I could confirm a build approach using ESModules. The project was likely developed from a create-vite based React boilerplate.
- emotion: I could see emotion-specific reserved strings like `data-emotion` and `__EMOTION_TYPE_PLEASE_DO_NOT_USE__`.
- GSAP: [GreenSock Animation Platform](https://gsap.com/) (hereafter GSAP) is a powerful JavaScript animation library used on the web. Its distinctive naming conventions, text-split animations, and timeline/sequence structures stood out. Most of the animations that make up this website appear to be built on GSAP.
- jotai: I found jotai's characteristic state management function usage patterns like `useAtom` and `useSetAtom`. Either jotai is in use, or a similar library was implemented or adapted directly.
- react-router: I could see error messages or strings distinctive to React Router.

### 3-2. Deployment Environment

As the address makes clear, https://portfolio-amber-mu-57.vercel.app/ is currently **a website deployed and served through the Vercel platform**.

## 4. Answers to the Main Questions

To get to the root cause of the developer's concern — the low Lighthouse performance score — I analyzed concretely which areas should be improved first.

### 4-0. Before We Begin: Why Do the Performance Tab and Lighthouse Scores Differ?

One of the most bewildering moments in web performance analysis is when you measure the same page but the Performance tab and Lighthouse report completely different LCP values. In fact, while the developer was worried about a low Lighthouse score, [WebPageTest](https://webpagetest.org/) and the Lighthouse tab inside DevTools were showing quite good scores.

![3.png](./images/portfolio/3.png)

![4.png](./images/portfolio/4.png)

The screenshots above show scores measured by webpagetest and Chrome DevTools respectively, and you can see the Lighthouse scores are all excellent.

But the Performance tab tells a different story.

![5.png](./images/portfolio/5.png)

Unlike the excellent Lighthouse scores we saw earlier, the Performance tab shows LCP dropping into the 4-second range. To understand why, we need to look at the differences in how the Performance tab and Lighthouse take their measurements.

The reason the tools differ isn't simple measurement error — it comes down to differences in the logic and philosophy that decide when measurement ends.

#### 4-0-1. The Performance Tab's End Point: A Recording Close to the User's Actual Experience

The Performance tab has DevTools trace the browser's actual execution path as-is. Even after the load event finishes, it automatically records an extra 5 seconds in order to observe additional UI changes (e.g., JavaScript animations, rendering). You can find the relevant source in the [Chromium codebase](https://source.chromium.org/search?q=millisecondsToRecordAfterLoadEvent).

```js
UI.panels.timeline._millisecondsToRecordAfterLoadEvent = 5000
```

The intent is to reflect the performance users actually perceive. Looking at the code, the variable name `millisecondsToRecordAfterLoadEvent` shows it waits about 5000ms. You can also roughly infer this by actually recording performance in the Performance tab.

![13.gif](./images/portfolio/13.gif)

It's not exact, but you can see it waiting roughly 5 seconds.

So what if we modified this number of seconds, re-measured, and checked whether the assumption holds — that Lighthouse comes out lower? Here's how to modify that wait time. It may be a slightly excessive verification, but it sounds fun, so let's take a look. 😄

1. First, enable Chrome developer mode.
2. Click the three-dot menu in the top right, then under Dock side click the leftmost icon. This opens Chrome DevTools in a separate window.
   ![6.png](./images/portfolio/6.png)
3. In this window where DevTools is open, press the DevTools shortcut Ctrl+Shift+i or ⌘+⌥+|i again. This opens DevTools for the DevTools. This technique is called devtools on devtools.
   ![7.png](./images/portfolio/7.png)
   In this window, we can inspect the DevTools instance the website is using with another DevTools and perform whatever manipulation we want.
4. Go to the console and enter `UI.panels.timeline.millisecondsToRecordAfterLoadEvent = 3000`. Now the Performance panel, which used to wait 5 seconds, waits only 3.

Measuring performance again, you can confirm that LCP comes out with a very similar, good score — much like Lighthouse.

![8.png](./images/portfolio/8.png)

#### 4-0-2. Lighthouse's End Point: Three Conditions That Determine "Is It Fully Loaded?"

Then on what basis does Lighthouse decide when to score? To understand Lighthouse's measurement conditions, we need to look at Lighthouse's core logic.

https://paulirish.github.io/lighthouse/docs/api/lighthouse/2.5.1/lighthouse-core_gather_driver.js.html

To see when measurement ends, we need to look at the `_waitForFullyLoaded` method. This function measures the point at which the page finishes loading, and the following three conditions must be satisfied.

```js
_waitForFullyLoaded(pauseAfterLoadMs, networkQuietThresholdMs, cpuQuietThresholdMs,
                   maxWaitForLoadedMs) {
  let maxTimeoutHandle;  // stores the timeout handle

  // 1. Wait for the Load event (+ extra wait time)
  // pauseAfterLoadMs: extra time to wait after the Load event (default: 0ms)
  const waitForLoadEvent = this._waitForLoadEvent(pauseAfterLoadMs);

  // 2. Wait for Network Quiet
  // networkQuietThresholdMs: how long the network must stay quiet (default: 5000ms)
  // What counts as quiet? 2 or fewer concurrent in-flight requests
  const waitForNetworkIdle = this._waitForNetworkIdle(networkQuietThresholdMs);

  // 3. Wait for CPU Quiet (initialized later)
  let waitForCPUIdle = null;

  // 4. Promise that runs once both Load and Network complete
  const loadPromise = Promise.all([
    waitForLoadEvent.promise,      // wait for the Load event
    waitForNetworkIdle.promise,    // wait for Network Quiet
  ]).then(() => {
    // Start checking the CPU only after the network has gone quiet!
    // cpuQuietThresholdMs: how long the CPU must stay quiet (default: 0 = no check)
    waitForCPUIdle = this._waitForCPUIdle(cpuQuietThresholdMs);
    return waitForCPUIdle.promise;
  }).then(() => {
    // Return a cleanup function once all conditions are satisfied
    return function() {
      log.verbose('Driver', 'loadEventFired and network considered idle');
      clearTimeout(maxTimeoutHandle);  // cancel the timeout
    };
  });

  // 5. Maximum wait timeout (safety net)
  // maxWaitForLoadedMs: maximum wait time (default: 30 seconds)
  const maxTimeoutPromise = new Promise((resolve, reject) => {
    maxTimeoutHandle = setTimeout(resolve, maxWaitForLoadedMs);
  }).then(_ => {
    // Return a cleanup function on timeout
    return function() {
      log.warn('Driver', 'Timed out waiting for page load. Moving on...');
      waitForLoadEvent.cancel();       // cancel all waits
      waitForNetworkIdle.cancel();
      waitForCPUIdle && waitForCPUIdle.cancel();
    };
  });

  // 6. Race: normal completion vs. timeout, whichever finishes first
  return Promise.race([
    loadPromise,        // normal measurement completion
    maxTimeoutPromise,  // 30-second timeout
  ]).then(cleanup => cleanup());  // run the cleanup function
}
```

This function checks the three conditions below in order, and if any of them isn't satisfied, it force-terminates after `maxWaitForLoadedMs` (default: 30 seconds).

1. Load event fires + wait for the specified time (`pauseAfterLoadMs`)
   - The default is `0ms`, so it moves on to the next condition immediately after the Load event
2. Network Quiet state maintained (`networkQuietThresholdMs`)
   - A state with 2 or fewer in-flight network requests must be maintained for at least `5000ms`
   - Internally, Lighthouse identifies this as the `"network-2-quiet"` state
3. CPU Quiet state maintained (`cpuQuietThresholdMs`)
   - There must be no Long Task of 50ms or more,
   - and at least `cpuQuietThresholdMs` (e.g., 5000ms) must pass after the last Long Task ends
   - However, if `cpuQuietThresholdMs` is 0, this check is skipped
4. Termination condition race
   - Terminates when the normal conditions are met
   - Otherwise force-terminates after the 30-second timeout

#### 4-0-3. Conclusion: The Differing LCP Values Are an 'Intended Difference'

Summarizing everything so far in a table:

| Item                  | Performance tab                              | Lighthouse                                                                |
| --------------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| Purpose               | Real-time behavior recording                 | Quality measurement in a controlled environment under specific conditions |
| End criterion         | `load` event + auto-stop 5 seconds later     | Ends when Load, Network, and CPU Idle conditions are met (or 30s timeout) |
| LCP collection window | Can detect content up to its last appearance | Elements appearing after early termination are not reflected              |
| Measured value        | Close to the actual user experience          | Based on experimental criteria (variables can be controlled)              |

The reason LCP measures slower in the DevTools Performance tab is that its purpose is to detect the moment the user actually sees the content. Lighthouse, on the other hand, ends measurement early once it judges the page has stabilized enough, and any large content that appears afterward is not included as an LCP candidate.

So Lighthouse reporting a low LCP while the Performance tab reports a high one is not mere error — it should be understood as a difference in the tools' design goals. Once you understand this difference, you can more clearly judge which tool's result reflects the real problem.

Of course, the most accurate performance measurement is RUM (Real User Monitoring) based on real user data. Lighthouse and DevTools are merely auxiliary means of approximating it — don't forget that the real answer lies not in the browser but in the user's eyes.

### 4-1. The Structural Reason LCP Measures Slower in the Performance Tab

Earlier I explained that the LCP measurement gap between Lighthouse and the Performance tab arises from **differences in the criteria that determine when measurement ends**. In this section, based on the website's rendering flow, let's analyze concretely why LCP is measured relatively later in the Performance tab.

#### 4-1-1. Initial Render: An Empty Root Element

At initial page entry, the `div#root` element exists empty, with no content. Since there are no meaningful elements displayed within the viewport at initial render, there is also no LCP candidate. The browser interprets this as a state in which no visual content can be initially detected.

#### 4-1-2. The Self-Introduction Text Appears: Transitional Animation Content

Afterwards, elements with class names like `.introTitle` and `.introTitleFill` appear, and a short self-introduction phrase shows up on screen. This behavior plays as sequences through a GSAP-based custom animation implementation. At this point, that text block would have been recorded as the LCP candidate. Indeed, looking at webpagetest, you can see that this area was recorded as the LCP.

![9.png](./images/portfolio/9.png)

#### 4-1-3. Removal of the First Content and Entry of the Main Content

After the self-introduction phrase appears, a fade-out animation is applied to the entire `.introTitleSection`. That area is visually removed via opacity and Y-axis translation, and then the website's actual main content renders. The key code used in this stage is as follows.

```ts
// Judging from their blog posts, I'd guess they built a library? function? called Rally.
Rally({
  target: '.introTitleSection',
  motions: [
    {
      delay: 0.4,
      duration: 0.6,
      ease: 'back.in',
      opacity: {
        to: 0,
      },
      translateY: {
        to: -30,
      },
    },
  ],
})
```

After this animation sequence ends, a callback that renders the actual content runs, and from that point the website's core content mounts and appears within the viewport.

#### 4-1-4. The Difference in LCP Measurement Points: Candidate Omission Depending on When Measurement Ends

Here it's worth recalling what we discussed in part 4-0.

- **Lighthouse**, per its internal logic, ends LCP measurement once the network and CPU reach an idle state. Because measurement ends before the `updateStep` callback described above runs, **the self-introduction text — not the actual content — is recorded as the final LCP candidate.**
- **The Performance tab** continues observing for 5 more seconds after the Load event. As a result, **the actual content area that appears after the `updateStep` callback is detected as an LCP candidate**, and ultimately **the later-appearing content is recorded as the LCP**.

Therefore, it's worth considering how to interpret LCP and other metric scores depending on what the website's measurement goals are.

#### 4-1-5. Consequences of the Score Difference

This website has a **transitional structure** in which initial content appears temporarily and is then removed, and the actual main content appears late. In this structure, Lighthouse ends measurement before the substantive content appears, so LCP measures short, whereas the Performance tab **measures up to and including the point the user actually sees the content**, so LCP is recorded as longer.

This is not simple measurement error but an **intended measurement difference** stemming from the two tools' design purposes. Therefore, if you want performance metrics close to the actual user experience, it's advisable to judge based on the Performance tab's results or consider adopting RUM-based measurement.

### 4-2. Suggestions to Address the Current Problems

Due to its structure where initial content appears with a delay, the current website reveals several limitations in user experience, performance metrics, and search optimization. This can be a strength in terms of deliberately staged visual effects, but it doesn't quite fit the purpose of a portfolio website operating in the real world.

This section proposes improvements based on the **Progressive Enhancement** principle that address the drawbacks of the current structure while still preserving the animation effects.

> **What is Progressive Enhancement?** https://en.wikipedia.org/wiki/Progressive_enhancement
>
> Progressive Enhancement is a design philosophy for ensuring web accessibility and reliability: **core content and functionality are delivered first in their most basic form**, and then **visual and interactive features are added progressively** depending on the browser's or device's capabilities and the user's environment.  
> In other words, **content and semantic structure must always come first**, and JavaScript or advanced styling should **operate optionally, only after the basic functionality is guaranteed**.  
> This principle is widely adopted as a foundational strategy for web development that accounts for diverse user environments, and it directly benefits performance optimization, accessibility, and SEO.

#### 4-2-1. Switch to a Content-First Rendering Structure

The most important improvement to consider first is **including the main content in the initial HTML**. In the current structure, the substantive content is mounted via JavaScript only after the intro animation completes, so browsers and performance measurement tools perceive the page as having no content.

This delayed-content-exposure structure not only worsens performance metrics like LCP, but can also lead to **unfavorable SEO outcomes** because search engines cannot properly index the content.

Content-first rendering here does not mean server-side rendering (SSR) or a framework migration. Of course, adopting SSR could improve performance even more dramatically. But even in the current CSR-based environment, this can be fully achieved by including meaningful content in the HTML and then revealing it visually through animation.

For example, if you include the main content in the DOM up front and implement the visual transition using CSS properties like `opacity`, `transform`, and `visibility`, users can perceive the information immediately upon entering the page, and performance measurement tools can reflect it accurately. As a result, metrics like LCP are measured against the substantive content, and the structure becomes SEO-friendly.

This approach is **the most practical improvement strategy that keeps the current CSR structure while conforming to the Progressive Enhancement principle**.

#### 4-2-2. Handle Animation in the Visual Layer

When applying animation, rather than **delaying the rendering point of the content itself**, it's preferable to **give already-rendered content a progressive-reveal effect through visual styling**.

For example, the current approach of creating and mounting specific DOM nodes after JavaScript executes **causes browsers and performance measurement tools to recognize that content late**, and metrics like LCP and FCP can measure unfavorably. In addition, when content is inserted late, search engine crawlers may fail to discover it.

To solve this, I suggest a **visual animation approach** using properties like these:

- `opacity`: gradually increase opacity for a natural entrance
- `transform`: movement or scale effects using `translateY`, `scale`, etc.
- `clip-path`: effects where an element is progressively clipped or revealed in a given shape
- `visibility`: reveal by switching `visibility: hidden` → `visible`

```html
<!-- The following example code was written independently of the actual portfolio. -->
<section class="intro">
  <h1 class="intro-title">I'm Kim Seonghyun</h1>
  <p class="intro-description">Frontend developer portfolio</p>
</section>

<style>
  .intro {
    opacity: 0;
    transform: translateY(30px);
    transition:
      opacity 0.6s ease-out,
      transform 0.6s ease-out;
  }

  .intro.visible {
    opacity: 1;
    transform: translateY(0);
  }
</style>

<script>
  window.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(() => {
      document.querySelector('.intro')?.classList.add('visible')
    })
  })
</script>
```

In the example above, the content **exists in the HTML from the start**, and JavaScript merely adds a single class to apply the visual animation. Structured this way, **search engines, Lighthouse, and the browser's rendering engine can all recognize the content accurately**, while users still experience a smooth transition effect.

This approach is also built around animation properties that are optimized at the GPU level (opacity, transform), so it can **operate reliably on mobile devices without performance degradation**.

#### 4-2-3. Adopt a Strategy That Distinguishes First Visits from Return Visits

Given the nature of a portfolio, providing a visually striking presentation to first-time visitors can be important. For repeat visitors, however, content accessibility matters more. Accordingly, a **strategy of branching whether to run the animation based on visit history** could be effective.

```javascript
// Run the full intro animation only for first-time visitors
const showFullAnimation = !localStorage.getItem('returning-visitor')

if (showFullAnimation) {
  runIntroAnimation()
  localStorage.setItem('returning-visitor', 'true')
} else {
  skipToContentImmediately()
}
```

This approach can be a compromise that reduces user fatigue while maintaining visual impact on first exposure.

#### 4-2-4. Checklist for Applying This in Practice

When applying the improvements suggested above to a real project, how about using the following items as a checklist to review up front whether there are structural issues in code quality, performance, and accessibility?

- **Is all text content included in the initial HTML?**  
  → Ensures performance measurement tools and search engines can recognize the content accurately.
- **Is the content visible even with JavaScript disabled?**  
  → Verifies you're following the Progressive Enhancement principle.
- **Are animations optimized with the `will-change` property?**  
  → `will-change` is a CSS property that hints to the browser that "this property is about to change." For example, setting `will-change: transform` lets the browser prepare layer separation or GPU-accelerated handling for that element in advance, which **can reduce layout calculation and repaint costs**. However, excessive use can actually degrade performance, so it's best to limit it to the key elements where changes are concentrated.
- **Did you consider the `prefers-reduced-motion` media query?**  
  → `prefers-reduced-motion` is a CSS media query that can detect **when a user has explicitly indicated in their OS or browser that they prefer minimized animation**. Using it, you can minimize or skip animations and transition effects out of consideration for motion-sensitive users.

  ```css
  @media (prefers-reduced-motion: reduce) {
    .animated {
      animation: none;
      transition: none;
    }
  }
  ```

- **Is animation performance sufficient on mobile devices?**  
  → Verify it operates without rendering bottlenecks or frame drops even on low-end devices. In particular, I recommend using only GPU-optimizable properties like `opacity` and `transform`, and avoiding properties that trigger layout/paint/reflow (`top`, `left`, `height`, etc.).

This checklist serves as a standard for evaluating not just whether the animation looks good, but web accessibility, performance stability, and maintainability as a whole. Especially for websites like portfolios that demand both content delivery and visual polish, these criteria become the very standard of quality.

Therefore, to provide users with an impressive experience while also satisfying discoverability and performance optimization, I believe a design that considers both content-first rendering and a Progressive Enhancement strategy must be at the core.

## 5. Other Suggestions

Beyond the core bottlenecks mentioned above, I also analyzed additional fine-grained optimization points that can contribute to overall performance.

### 5-1. A Bundle Optimization Proposal via Code Splitting

The current bundle file, `index-CF5N6APp.js`, is about 138KB. By recent frontend standards this isn't excessively large, but considering that this is **a static site with no complex logic**, it's on the heavy side. In particular, this website is structured as a **single-page application (SPA)**, so this bundle structure directly affects performance.

#### 5-1-1. Why the Bundle Is Large

The current JavaScript file contains not only the developer's own service logic but also all of the framework and external library code: `react`, `react-dom`, `emotion`, `gsap`, and so on. Code splitting is also not applied, so every piece of logic that makes up the page depends on a single bundle. Because of this, the browser must download and parse the entire resource at once, and **gains none of the benefits of parallel loading.**

#### 5-1-2. The Impact of JS Parsing Delays in an SPA Structure

A JavaScript file over 100KB may not be fatal for a typical CSR-based service. But since this website has no SSR, the browser depends on JavaScript for the entire process of constructing the initial screen.

In this structure, **the longer JS parsing and execution take, the more directly content rendering is delayed**, which in turn negatively affects key performance metrics like LCP and TTI. This delay can be even more pronounced in the current setup, where the actual content appears after the intro animation.

#### 5-1-3. A Code-Splitting Strategy for Initial Rendering and Cache Efficiency

In the current structure, all code lives in a single bundle, and major libraries like `react`, `react-dom`, `emotion`, and `gsap` are included in `index.js` as well. This structure causes the following problems:

- **Excessive JS parsing and execution cost at initial render**
- **Even small code changes rebuild the entire bundle, invalidating the cache**

To solve this, you need a strategy of **splitting out only the code strictly needed for initial render into a minimal chunk, and separating common libraries into their own chunks**. This can be expected to yield:

- The browser **loads only the minimal resources needed to construct the initial screen first**, improving **LCP**
- `react`, `react-dom`, etc. rarely change, so **cache utilization is maximized**
- Only the changed chunk is replaced without regenerating the whole bundle, improving **deployment efficiency**

In Vite, this is easy to apply via the `rollupOptions.output.manualChunks` setting:

```ts
// vite.config.ts example
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
}
```

Next.js adopts the same strategy: it separates common libraries into a file called `framework.js`, **configured so that unchanging resources are cached long-term**.

![12.png](./images/portfolio/12.png)

![1.png](./images/portfolio/11.png)

As you can see, even simple chunk separation can **improve initial rendering performance, network load, and deployment efficiency all at once**, and for an SPA like this project it can be an especially effective strategy.

#### 5-1-5. In the Current Structure, Even Modest Splitting Delivers Sufficient Benefits

Of course, excessive code splitting can actually slow initial loading in large web applications with many routes. But this site is an SPA composed of a single view without clear page boundaries, so **simple library-level chunk separation alone can yield performance benefits.**

**In conclusion**, the current structure loads unnecessarily large amounts of JavaScript all at once at initial render, and **bundle optimization via chunk separation is an essential task** to improve this. In a Vite-based build environment this is relatively simple to implement, so it should improve both performance and user experience in the actual deployed environment.

## 6. Conclusion

Based on the structure of [https://portfolio-amber-mu-57.vercel.app/](https://portfolio-amber-mu-57.vercel.app/), we've taken a concrete look at what improvements are possible in terms of user experience and performance.

Despite being in an early stage of development, the current build is **an impressive portfolio with technical polish**, built on **intense animation staging with GSAP**, **Emotion-based styling**, and a modern frontend composition based on React and Vite. In particular, the UI/UX flow, centered on visual impact, clearly conveys an intent to showcase **staging and expressiveness themselves rather than content**.

That said, the structure where content mounts after the intro, and the current approach of handling every resource in a single bundle, can **produce evaluation results in tools like Lighthouse that diverge from the actual user experience**, and there appears to be room for improvement in search optimization and accessibility as well.

Since the portfolio is at an early stage, **light structural improvements alone — rendering order, code-splitting strategy, applying the Progressive Enhancement principle — can deliver substantial performance gains** without complex restructuring. And as content is added or the number of pages grows in the future, I believe the directions presented in this analysis can help you secure **structural scalability and technical sustainability**.

I sincerely hope this portfolio continues to grow, that the content and message within it reach a wider audience, and that you take a successful first step as a frontend developer.

If you have any questions or anything you'd like to discuss further, please feel free to reach out anytime.
Thank you for reading!
