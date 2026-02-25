---
title: 'The Downfall of Infinite Scroll — Why Google Removed Infinite Scrolling'
tags:
  - frontend
  - ux
  - web-performance
  - accessibility
  - infinite-scroll
published: true
date: 2026-02-21 10:00:00
description: 'How infinite scroll is being reevaluated from UX, performance, accessibility, and legal perspectives'
---

## Table of Contents

## Introduction

In June 2024, Google removed continuous scroll from its search results. This happened just 2-3 years after introducing it on mobile in 2021 and desktop in 2022. Google's official statement was:

> "Automatically loading results did not meaningfully improve search satisfaction."

Google Search, which had been synonymous with infinite scroll, went back to the "Next" button. This decision isn't just a simple UI change. It signals that the industry is fundamentally reevaluating the infinite scroll pattern itself.

This article examines why infinite scroll was adopted, where it failed, what technical costs it incurs, and how it's now becoming a subject of regulation.

## Where Infinite Scroll Works

Infinite scroll isn't inherently bad. In specific contexts, it remains the most effective pattern.

According to Nielsen Norman Group's analysis, infinite scroll works well in **discovery-focused experiences**. When users browse content without specific goals, removing the friction of page transitions increases dwell time and reduces bounce rates. Research published in *Information Systems Journal* also found that "even brief interruptions like clicking next buttons can cause users to abandon tasks on social commerce platforms."

This is why Twitter (X), Instagram, and TikTok still maintain infinite scroll as a core pattern. These services share clear commonalities:

- **Content is homogeneous** — feeds composed of posts, photos, and short videos
- **Browsing is purposeless** — users scroll without specific intentions
- **Mobile-centric** — finger swipes and infinite scroll naturally align

The problem arises when this context is ignored and infinite scroll is applied everywhere.

## Failed Infinite Scroll Cases

### Etsy: "Failed in Every Major Way"

In 2012, Etsy introduced infinite scroll to search results. Dan McKinley, who was Principal Engineer at Etsy at the time, explained the team's assumption:

> "We thought it was obvious that showing more items, faster, would be a better experience."

The A/B test results were the complete opposite.

| Metric | Pagination (Control) | Infinite Scroll (Test) | Change |
|--------|---------------------|------------------------|--------|
| Items viewed per visitor | 80 | 40 | **-50.0%** |
| Clicks per visitor | 0.6520 | 0.5811 | **-10.87%** |
| Favorites per visitor | 0.0752 | 0.0689 | **-8.38%** |
| Purchases per visitor | 0.0164 | 0.0127 | **-22.5%** |

McKinley summarized this as having "failed in every major way." The causes discovered in post-mortem analysis were:

**Loss of spatial awareness.** With pagination, users could remember "that product I saw in the middle of page 2." In infinite scroll, such landmarks don't exist. Users couldn't return to previously viewed products, making comparison behavior impossible.

**Breaking the back button.** When users clicked on a product and returned, the scroll position would reset. They had to scroll through dozens of previously viewed products again.

**Content type mismatch.** Image-centric content like Google Images can be quickly scanned, making infinite scroll effective. But for Etsy's product listings that require comparing text descriptions, prices, and reviews, focused reading is necessary, and pagination better supports this.

McKinley's conclusion was striking:

> "My point is not that infinite scroll is stupid. It's that we should have understood our site's users better."

### Google Search: The Intersection of Ads and Satisfaction

Google's official reason for removing continuous scroll was "to deliver search results faster." However, industry observers remained skeptical.

Internal emails revealed during Google's antitrust trial showed executives discussing ways to increase ad revenue. Continuous scroll disperses user attention across multiple pages, while pagination concentrates ad exposure on the first page. In fact, Workshop Digital reported that this change caused the first year-over-year decrease in CPC (cost per click) in 5 years.

Regardless of the reason, the core facts remain unchanged. Backlinko's analysis of 4 million Google search results found that **only 0.63% of users click on page 2 results**. GSQI's research also showed that the click-through rate for top 6 results remained ~96% both before and after continuous scroll introduction. Automatically loading more results was unnecessary for most users.

### Personal Experience Removing Infinite Scroll

I recently removed infinite scroll from a project and switched to pagination. The biggest realization was that infinite scroll is much more expensive to "maintain" than to "implement."

**Scroll position restoration is a nightmare.** When users click an item, visit a detail page, and return to the list, you must precisely restore the previous scroll position. This requires reloading all previously loaded items, rendering them at identical heights, and scrolling to the exact `scrollTop` value. When item heights are variable — due to image loading timing, text line differences, etc. — the restored position becomes subtly misaligned. I've rarely seen a site that perfectly solves this problem.

**Back navigation is tricky.** In SPAs, if you don't update URLs with `history.pushState()`, the browser's back button goes to the previous site instead of the list. Even when updating URLs, you need to handle `popstate` events, cache scroll positions, determine whether to re-request data, among other things.

**Exception handling grows endlessly.** Retry logic for network errors, empty response handling, duplicate request prevention (debounce/throttle), duplicate item filtering due to data changes, loading indicator state management... Initially it seems like you only need Intersection Observer, but production-level implementation quickly increases code complexity. Pagination structurally avoids all these problems.

## Technical Costs

Infinite scroll may look like "just scrolling to load more," but technically it carries significant costs.

### DOM Bloat and Memory

As users scroll, DOM nodes accumulate. Chrome Lighthouse shows warnings at **800 nodes** and errors at **1,400 nodes**. If 1,000 product cards each consist of 20 nodes, by the end of scrolling there are 20,000 nodes in the DOM. This leads to increased memory usage, higher style recalculation costs, and more frequent garbage collection.

Real-world data supports this. At Expedia, just the star rating components in 50 search results were creating 1,200 DOM nodes. When they optimized the SVG structure to **50 nodes, key rendering metrics improved by ~200ms**. Google/SOASTA's analysis of 900,000 mobile pages showed that increasing page elements from 400 to 6,000 resulted in a **95% drop in conversion rate**.

Memory issues are also serious. Facebook developed a dedicated tool called MemLab to detect memory leaks in infinite scroll feeds. After introducing this tool, **OOM (Out of Memory) crashes on facebook.com decreased by 50%**, and React 18's fiber cleanup optimization **reduced average memory usage by ~25%**. Even giant corporations need dedicated tools to manage infinite scroll memory properly.

Virtualization libraries (react-window, react-virtuoso, etc.) that render only visible items are common solutions, but they also have limitations. Implementation complexity rapidly increases when dealing with scroll position restoration, variable height items, and SSR compatibility.

### Core Web Vitals Impact

**CLS (Cumulative Layout Shift).** This is the trickiest metric for infinite scroll. Scrolling isn't treated as an "active interaction" in CLS measurement. While layout shifts within 500ms of clicks or key inputs are excluded from CLS, content insertion during scrolling doesn't get such grace periods. When new items load and push down the footer, or images load without reserved space, CLS scores directly worsen.

Andrea Verlicchi's key principle from the 2025 Web Performance Calendar summarizes it well:

> "Don't move the visible part of the page while the user is scrolling. Reserve space before content becomes visible."

In contrast, "Load More" buttons structurally avoid this problem. Button clicks are active interactions, so inserting skeleton placeholders immediately after clicking completes layout expansion within the 500ms grace period. Even with slow network responses, CLS penalty is zero.

**INP (Interaction to Next Paint).** If infinite scroll implementations execute heavy JavaScript during scroll events, the main thread gets blocked and INP worsens. This can be mitigated with passive event listeners, Intersection Observer API-based implementation, and throttling through requestAnimationFrame, but requires additional engineering costs.

### Accessibility: Unsolvable Problems

Accessibility is the most fundamental technical problem with infinite scroll. In W3C's WCAG discussions, one participant mentioned that infinite scroll could be considered a **"keyboard trap."**

**Keyboard users.** They must tab through all links in the infinite scroll area to reach content below. One test required **over 100 Tab key presses** to reach side content.

**Screen reader users.** Test participant feedback clearly illustrates the problem:

> "I couldn't tell if there was a footer or not."
>
> "The screen reader kept reading down the content, and after a few minutes I got frustrated."

**Voice recognition users.** Users of voice recognition software like Dragon have no way to trigger new content loading. They're completely excluded from the infinite scroll experience.

**Low vision users.** For low vision users who use screen magnification software up to 6x, having content dynamically change while scrolling makes maintaining spatial orientation extremely difficult.

The `role="feed"` introduced in ARIA 1.1 is a partial solution for screen reader users, but doesn't address keyboard traps, cognitive overload, motor disabilities, voice recognition, or low vision user issues. The conclusion from W3C WCAG discussions is clear — infinite scroll represents **"substantial accessibility gaps not clearly addressed by current WCAG 2.0 standards"** that need to be addressed in WCAG 3.0.

## Regulatory Trends

Beyond technical discussions, infinite scroll is now becoming a subject of legislation. The federal KIDS Online Safety Act (KOSA) explicitly lists infinite scroll as a prime example of "addictive design features" targeting minors. New York's SAFE for Kids Act restricts providing infinite scroll, algorithmic feeds, and autoplay to users under 18 without parental consent ($5,000 fine per violation). China has been implementing time limits on algorithmic feeds and infinite scroll in apps targeting minors since 2021.

TikTok's 60-minute limit for minors, Instagram's "Take a Break," YouTube Shorts' timer — platforms are proactively responding to regulatory pressure. While infinite scroll itself causing addiction is an oversimplification, the real problem is the **combination of algorithmic feeds + autoplay + infinite scroll**. However, once framed as "minor protection," this distinction becomes politically meaningless. As frontend engineers, we should know that regulatory compliance could become an additional cost when implementing infinite scroll.

## Alternative Pattern Comparison

Here's a comparison of patterns that can replace infinite scroll and their trade-offs:

| Pattern | Pros | Cons | Suitable Context |
|---------|------|------|-----------------|
| **Pagination** | Maintains spatial awareness, good SEO, accessible | Page transition friction, high user frustration | Search results, admin lists |
| **Infinite Scroll** | Removes friction, increases dwell time, mobile-friendly | Spatial loss, worsens CLS, destroys accessibility | Social feeds, image galleries |
| **Load More button** | User control, avoids CLS, good accessibility | Requires clicks, simple initial implementation but difficult scroll restoration | E-commerce, blog lists |
| **Hybrid** (auto-load N times then Load More) | Initial friction removal + later control | Increased implementation complexity | Lists with large content volumes |
| **Virtualized Infinite Scroll** | Memory/DOM efficient, handles large datasets | SSR compatibility, complex variable height handling, same accessibility issues | Dashboards, data tables |

Baymard Institute's e-commerce UX research recommends the **"Load More" button + lazy loading** combination. In this approach, users explore more products than with pagination while examining individual products more carefully than with infinite scroll. However, at the time of the study, only **8%** of the top 50 US e-commerce sites adopted this pattern.

Specific guidelines are:

- **Category pages:** Initially load 10-30 products, lazy load additional 10-30, then show "Load More" button
- **Search results:** Load 25-75 products by default. **Never use infinite scroll for search** — Etsy's failure proves this
- **Mobile:** Show "Load More" after 15-30 products
- **Back navigation:** Use `history.pushState()` to update URLs and restore scroll position on back navigation. **Over 90%** of benchmarked sites incorrectly handled this behavior

## Conclusion

Infinite scroll isn't a bad pattern. It becomes bad when used without considering context.

In services like social feeds where purposeless exploration is key, it remains effective. But for e-commerce product lists, search results, and content requiring comparison, it backfires as Etsy and Google empirically demonstrated. Technically, it carries costs of DOM bloat, CLS degradation, and accessibility destruction, while legally becoming a target of regulation under the "addictive design" frame.

Nielsen Norman Group's conclusion well summarizes the key point:

> "No solution (infinite scroll, pagination, Load More, combined pagination) is universally superior."

There's no inherent good or evil in patterns themselves. The key is choosing what fits user intent and service purpose. And for that judgment — as Etsy's McKinley said — "understanding our site's users better" must come first.

## References

- [Infinite Scrolling: When to Use It, When to Avoid It - Nielsen Norman Group](https://www.nngroup.com/articles/infinite-scrolling-tips/)
- [Google Dropping Continuous Scroll in Search Results - Search Engine Land](https://searchengineland.com/google-dropping-continuous-scroll-in-search-results-443529)
- [Infinite Scroll Fail: Etsy - Dan McKinley](https://danwin.com/2013/01/infinite-scroll-fail-etsy/)
- [Design for Continuous Experimentation - Dan McKinley (Etsy A/B Test Data)](https://www.slideshare.net/danmckinley/design-for-continuous-experimentation)
- [Infinite Scrolling, Pagination Or "Load More" Buttons - Smashing Magazine (Baymard Institute)](https://www.smashingmagazine.com/2016/03/pagination-infinite-scrolling-load-more-buttons/)
- [Infinite Scrolling & Role Feed Accessibility Issues - Deque](https://www.deque.com/blog/infinite-scrolling-rolefeed-accessibility-issues/)
- [Infinite Scroll Accessibility: Is it Any Good? - DigitalA11Y](https://www.digitala11y.com/infinite-scroll-accessibility-is-it-any-good/)
- [W3C WCAG Discussion: Infinite Scroll Accessibility](https://github.com/w3c/wcag/discussions/3837)
- [Infinite Scroll Without Layout Shifts - Addy Osmani](https://addyosmani.com/blog/infinite-scroll-without-layout-shifts/)
- [Optimizing CLS for Infinite Scroll and Load More - Web Performance Calendar](https://calendar.perfplanet.com/2025/optimizing-cls-for-infinite-scroll-and-load-more/)
- [We Analyzed 4 Million Google Search Results - Backlinko](https://backlinko.com/google-ctr-stats)
- [Google Continuous Scroll Desktop Study - GSQI](https://www.gsqi.com/marketing-blog/google-continuous-scroll-study/)
- [Minimizing DOM Nodes for Performance - Expedia Group](https://medium.com/expedia-group-tech/minimizing-dom-nodes-for-performance-57f347df4c72)
- [MemLab: Finding JavaScript Memory Leaks - Facebook Engineering](https://engineering.fb.com/2022/09/12/open-source/memlab/)
- [Avoid an Excessive DOM Size - Chrome Lighthouse](https://developer.chrome.com/docs/lighthouse/performance/dom-size)
- [Mobile Page Speed Benchmarks - Google/SOASTA](https://business.google.com/ca-en/think/marketing-strategies/mobile-page-speed-new-industry-benchmarks/)
- [KIDS Online Safety Act - U.S. Congress](https://www.congress.gov/bill/119th-congress/senate-bill/1748/text)
- [NY SAFE for Kids Act - NY Attorney General](https://ag.ny.gov/press-release/2025/attorney-general-james-releases-proposed-rules-safe-kids-act-restrict-addictive)