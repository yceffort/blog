---
title: 'Web Service Performance Analysis (3)'
tags:
  - web-performance
  - nextjs
  - backend
published: true
date: 2025-07-01 13:11:17
description: 'Thank you for your interest. 🙇🏻‍♂️'
series: 'Web Service Performance Analysis'
seriesOrder: 3
---

## Feedback from the Actual Developer

> The following is feedback sent by the actual developer.

### Was the article helpful?

- Thank you so much for such a detailed and thorough analysis.. I think it will be a huge, huge help. I will take each and every item you mentioned to heart and apply them.
- I've always been interested in performance optimization, so I've read related books, articles, and videos, and actually applied them to my project. Even so, the site was still slow, and I couldn't clearly figure out why, so I was at a loss. It felt like everything that had piled up was completely resolved. In particular, the part about creating an i18n instance on every request and the unused recharts library being included in the bundle were things I had never even thought of.
- It was great that you told me exactly which parts of my code to fix and how. Thanks to that, it felt completely concrete, and I now know what to pay attention to going forward, like avoiding await in server components or checking whether instances are properly cached. I feel like my perspective on performance optimization has broadened considerably.

### Would you recommend this performance analysis to other developers?

I would absolutely, strongly recommend it !!

### Additional questions or areas that need supplementing

> In section 4-1-1, there was a statement that switching to CSR instead of fetching data on the server (HydrationBoundary) could be expected to improve perceived speed. I actually compared the two situations.
>
> My measurement method was to run window.performance.mark("page-start") in layout.tsx on a local server environment, then run performance.measure("MemoView mount", "page-start") inside the useEffect of MemoView, the component I wanted to measure after rendering, and compare the two values.
>
> https://guesung.notion.site/HydrationBoundary-22289de02fde80ba80e0d289de1569cf?pvs=74
>
> As shown in the link above, the time difference before and after removing HydrationBoundary was negligible, and in environments with slow network speeds, fetching data on the server was much faster. So I'm asking because I couldn't relate to the suggestion of moving to CSR for performance optimization.
>
> If I'm mistaken about something or my measurement method is wrong, I'd appreciate it if you could let me know.

The current structure, where data is prefetched in SSR and rendering happens on the client, has clear pros and cons.
Data fetching speed stays consistent depending on the server environment, but since the actual rendering point is pushed past hydration, it can be at a disadvantage in terms of perceived speed.

The options to consider here are as follows:

1. A structure where fetch/render happen in parallel with a Skeleton UI in CSR:
   In this case, if the user's device performance or network environment is slow, the loading delay may feel more pronounced, but in terms of LCP, the Skeleton is displayed quickly, which can produce positive metrics.
   That said, I honestly didn't expect fetching on the client to be this slow (ㅠㅠ)
   In this situation, approach 1 may not help much, but I think it would be good to examine it carefully and make a judgment.

2. A structure where both fetch + render happen at SSR time:
   This strategy can be a compromise where memo data is truncated to a certain length and included in the SSR HTML, with the remaining content loaded via CSR.
   Currently, everything is loaded regardless of memo length, which is probably where the performance problem came from.
   If the memo UI is actually not complex compared to the calendar and not particularly heavy, I'd judge that the rendering cost of including it in SSR wouldn't be large.

3. Keeping the current structure (SSR fetch, CSR render):
   The current structure fetches on the server and renders entirely on the client, but since SSR is done yet contributes nothing to LCP, I think it's a bit ambiguous.
   Of course, structurally there are advantages in terms of React Query prefetch and stable data responses, but you could also consider having the server render at least a skeleton.

Ultimately, I came to think the important thing is that there's a bottleneck in `SELECT`ing and serving the memos.
This is probably the biggest problem, and the three options above are likely just stopgaps for solving it.
So regardless of the structure, I think it would be good to consider tuning the `SELECT` query or exploring optimizations to fetch memos faster (limit, truncating text, setting up the DB in a closer region, etc..)

Rather than a definitive answer, I think what matters is seeing which option has the right trade-off in the current situation.
(I suspect this isn't the clear answer you were hoping for, so my apologies in advance.)

---

> The following is the write-up delivered to the actual developer. They said everything could be made public, so it's all published without any redaction.

# www.web-memo.site Performance Analysis

> **Disclaimer**

> This summary condenses the key points based on the performance analysis report of the www.web-memo.site website (as of June 28, 2025, 12:00). Due to website updates or environmental changes after the time of analysis, the actual state may differ. This analysis referenced not only the bundled output deployed to the browser but also the actual source code, so it could be more accurate than previous analyses.

> The performance bottlenecks and improvement suggestions presented are general recommendations, and the actual effect when applied may vary depending on various factors such as the website's specific implementation, server environment, and traffic patterns. This summary is for informational purposes, and the final decision to apply the suggested content and responsibility for its results lie with the website's operator.

> For more detailed analysis, methodology, and full context, please refer to the original analysis report.

## 1. Summary

Hello! To help the https://www.web-memo.site/ website deliver a faster and more stable user experience, I've summarized the key findings of the performance analysis of the currently deployed service.

The `web-memo` website makes good use of a **modern SSR-based architecture** and a **cutting-edge frontend tech stack**, and its technical level is excellent enough to hold its own even by working-professional standards. However, due to some structural limitations and constraints of the serverless environment, **initial loading delays and unnecessary resource costs** are occurring.

The main performance bottlenecks are as follows.

- **The separation of roles between SSR and CSR is ambiguous: data fetching happens in SSR while rendering happens in CSR** → SSR waiting costs are incurred even though no actual content is visible
- **An i18n instance is created and translation resources are dynamically imported on every request** → in a serverless environment, this becomes a performance bottleneck on cold starts
- **`getMemos()` fetches all data at SSR time without a limit** → initial rendering delays and increased hydration payload
- **A structure that redundantly fetches login authentication and user information** → the Supabase API is called up to 3 times per request
- **Unnecessary chunks included due to Day.js locales, the Pretendard web font, and barrel exports from the internal UI package**
- **Re-rendering bottlenecks in `react-big-calendar` and delayed loading of `next/dynamic` components**

Accordingly, I suggest the following improvements as priorities.

- **Improve the SSR structure and apply a CSR transition strategy**:
  - Fetch memo data in CSR and improve initial UX with a Skeleton UI.
  - Apply a `limit` to `getMemos()` and consider introducing infinite scroll.
- **Optimize i18n and resources**:
  - Cache the i18next instance and translation resources or move them to a CDN, reducing SSR-time loading costs.
  - Restructure Day.js locales and the Pretendard web font with static imports and asynchronous loading.
- **Remove duplicate fetches and optimize client-side reuse**:
  - Simplify the structure so user information is fetched only once and shared globally.
  - Fix the Supabase client implementation so caching actually works.
- **Resolve rendering bottlenecks and apply a chunk prefetch strategy**:
  - Optimize the `MemoCalendar` custom renderers and prevent unnecessary re-renders
  - Pre-import `dynamic` components to minimize user interaction delays

Applying these improvements should yield tangible perceived improvements in SSR and initial rendering performance, network response speed, and rendering stability. For detailed technical context and rationale, please refer to the main report.

## 2. Analysis Overview

I analyzed the website as deployed on June 28, 2025. Given the nature of the website, unlike other service analyses, this analysis was performed in Desktop mode.

![lighthouse](./images/lighthouse.png)

The tools used for the analysis are as follows.

- chrome dev tool

Unlike other analyses, since this service required login, a webpageTest analysis could not be performed.

## 3. Website Analysis

### 3-1. Main Frameworks, Libraries, and Build Environment

Normally when writing these reports, the tech stack has to be inferred from the built output alone, but for this analysis I was given the repository address and could examine the source code directly, so I could identify the exact tech stack without any guesswork.

https://github.com/guesung/Web-Memo

Briefly summarizing based on the repository contents:

This project is built on Next.js 14.2.10 and React 18.3.1, and actively uses the App Router structure. For state and data management, React Query (5.59.0), React Hook Form (7.53.2), and the Supabase client are used, and internationalization is handled with a combination of i18next and next-i18next.

The UI is built primarily around TailwindCSS, with Framer Motion, Lucide React, Driver.js, and others used to enhance the user experience. Error tracking via Sentry is also integrated, and the related configuration is specified in the `.cursor/rules/tech-stack.mdc` file.

The overall repository is organized as a Turborepo-based monorepo, using pnpm (9.5.0) as the package manager. The web app is built on Next.js, and the Chrome extension is bundled with Vite (5.3.3). Testing uses both Vitest and Playwright, and the runtime environment requires Node.js 18.12.0 or higher.

This repository manages a Next.js-based web application and a Vite-based Chrome extension together in a single monorepo, and can be seen as a structure with a good balance of modern frontend tech stack and quality management practices.

### 3-2. Deployment Environment

https://www.web-memo.site/ is currently **a website deployed and served via the Vercel platform**. The domain registrar is **Gabia**, and the domain is delegated to **Vercel DNS nameservers** using `ns1.vercel-dns.com` and `ns2.vercel-dns.com`.

Through the HTTP response headers (`curl -I https://www.web-memo.site`), information such as `server: Vercel` and `x-vercel-id` can be confirmed, which is clear evidence that Vercel is directly handling the request. Accessing the domain root redirects to HTTPS via `HTTP/1.0 308 Permanent Redirect`, and Vercel responds directly in the HTTPS environment.

The `.vercel.app` subdomain is not accessible, and the project **appears to be configured to be accessible only through the custom domain.** The actual service is built on Vercel's App Router-based SSR architecture, and both static assets and dynamic chunks are delivered through the Vercel CDN.

Therefore, this website can be judged to be **a service built on a modern Jamstack architecture where domain management, DNS configuration, deployment, and CDN are all configured on top of Vercel infrastructure**.

## 4. Answers to the Main Questions

I looked into the root causes of the **slow first page load problem** the developer mentioned, and analyzed in detail the areas that should be improved first.

### 4-1. Noticeably Slow First Page Load

The main causes of slow first page loads on server-side rendered websites are **server response delays and initial rendering bottlenecks**. Backend API call delays, complex server rendering logic, and the absence of a caching strategy are typical factors.
However, since these performance problems **occur inside the server, browser tools alone have limits in pinpointing the exact cause**. Lighthouse and Chrome DevTools only show results observed on the client; they don't tell you what the actual bottleneck is on the server.
Ideally, server-internal metrics such as server logs, APM data, and backend latency analysis **are needed together for an accurate diagnosis**. But such data is hard to obtain with externally accessible information.
Fortunately, since I was able to review the source code, I could look for **points in the code structure that are likely to become performance bottlenecks**. While I can't fully grasp the actual server situation, I'll focus the analysis on structurally improvable areas.

#### 4-1-1. The `await` Bottleneck in the `/memos` Rendering Process

The `/memos` page is currently built on SSR, and the following server-side requests occur sequentially in `layout.tsx` and `page.tsx`:

```ts
// layout.tsx
const isUserLogin = await new AuthService(supabaseClient).checkUserLogin();
if (!isUserLogin) redirect(PATHS.login);

await initSentryUserInfo({ lng });

<HydrationBoundaryWrapper
  queryKey={QUERY_KEY.category()}
  queryFn={() => new CategoryService(supabaseClient).getCategories()}
>
  <MemoSidebar />
</HydrationBoundaryWrapper>

// page.tsx
<HydrationBoundaryWrapper
  queryKey={QUERY_KEY.memos()}
  queryFn={() => new MemoService(supabaseClient).getMemos()}
>
  <MemoView />
</HydrationBoundaryWrapper>
```

Each `await` call is a network request via Supabase, and due to the React Query-based prefetch structure, **SSR HTML generation is delayed until all queries complete**. This can affect Time to First Byte (TTFB) and Largest Contentful Paint (LCP) metrics.

That said, the reason it was hard to easily suggest improvements for the current code is that it faithfully follows the recommended practices of modern SSR architecture: Next.js App Router, React Server Components (RSC), and the React Query prefetch structure. The roles of authentication checking, user settings, and sidebar rendering are clearly separated, and the structure appears designed with maintainability and extensibility in mind — excellent code that would hold its own even by working-professional standards.

However, when examined with performance optimization as the focus, the following structural limitations exist:

- The memo UI is rendered inside a client component (`MemoView`) wrapped in `<Suspense>`, so the SSR HTML **does not include the actual memo content.**
- Meanwhile, `getMemos()` executes at SSR time and **prefetches the entire memo data for React Query's hydration**.
- Below is an example where large memo data inserted for testing is not included in the actual HTML, but is delivered to the client in serialized form. This means the data fetch was completed on the server.

  ![streaming-data](./images/streaming-data.png)

- Also, according to the HTML capture, the actual memo list area does not exist in the SSR HTML, and instead waits for client rendering along with the Suspense fallback, as follows:

  ```html
  <div hidden id="S:5">
    <div class="flex w-full flex-col gap-4">
      <div class="flex items-center">
        <div class="flex w-full items-center justify-between">
          <p class="text-muted-foreground select-none text-sm">메모 5개</p>
          <div class="flex">
            <!--$!-->
            <template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"></template>
            <!--/$-->
            <!--$!-->
            <template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"></template>
            <!--/$-->
          </div>
        </div>
      </div>
      <div class="relative h-full w-full">
        <div
          class="bg-primary/20 pointer-events-none fixed left-0 top-0 z-[40] h-[1px] w-[1px] origin-top-left"
        ></div>
        <div
          class="container h-screen max-w-full pb-48 will-change-transform"
          id="memo-grid"
        >
          <div></div>
        </div>
      </div>
    </div>
  </div>
  ```

In other words, this is **a structure where rendering happens on the client, yet data fetching is done ahead of time in SSR**, which can be inefficient in that SSR waiting costs are incurred while no actual visual content is produced.

Therefore, if performance optimization is the priority, it's advantageous to switch the `/memos` page's memo data to **a structure where it is fetched and rendered entirely on the client**. The reasons are as follows.

- Memos are user-personalized data available after login, so **SSR offers almost no practical SEO benefit.**
- In the current structure where memo content is not included in the SSR HTML, fetching data at the SSR stage means **the immediately visible content improvement is limited while the initial loading delay cost remains**.
- The Supabase API carries a high likelihood of network latency, and handling it at SSR time **can lead to increased TTFB.**
- Switching data fetching to CSR allows rendering and fetching to proceed in parallel, so **improved perceived speed** can be expected.

However, switching the current structure to CSR can create a content gap during initial loading, so I think it's effective to apply the following UI strategies in parallel.

- Limit the maximum height of memo cards to eliminate layout differences between the Skeleton UI and the actual content.
- Limit the number of cards and characters loaded initially, and encourage asynchronous expansion via a **"Show more"** button to see the full content.
- Constraining the LCP target to a fixed-height Skeleton area lets the browser determine the rendering completion point quickly, positively influencing performance metrics.
- Fixing the Skeleton's height also contributes to preventing CLS (Cumulative Layout Shift).

As mentioned earlier, the current SSR structure of the `/memos` page is functionally and structurally well designed, and follows the standards of modern Next.js App Router architecture well.

However, when performance optimization is the main consideration, **moving memo data to CSR and applying a Skeleton UI plus content limiting strategy together** helps to substantially improve core Web Vitals metrics such as TTFB, LCP, and CLS.
This structural transition isn't simply abandoning SSR — I believe it can be a strategic refactoring that keeps SSR's advantages while resolving the bottleneck points.

#### 4-1-2. Translation Resource Loading Costs Incurred on Every Request

Currently, during SSR rendering of the `/memos` page, an i18next instance is newly created on every request via the `useTranslation()` hook, and language-specific translation resources are dynamically imported and initialized. The structure is composed as follows:

```typescript
const initI18next = async (language: Language, namespace?: Namespace) => {
  const i18nInstance = createInstance(); // creates a new instance every time
  await i18nInstance
    .use(initReactI18next)
    .use(
      resourcesToBackend((language: Language) =>
        import(`./locales/${language}/translation.json`)
      )
    )
    .init(getOptions(language, namespace));
  return i18nInstance;
};

export default async function useTranslation(...) {
  const i18nInstance = await initI18next(language, namespace);
  return {
  t: i18nextInstance.getFixedT(
    language,
    Array.isArray(namespace) ? namespace[0] : namespace,
    options?.keyPrefix,
  ),
  i18n: i18nextInstance,
  };
}
```

This code creates a new i18n instance each time a request comes in, and loads the translation JSON via `import()`.
Node.js generally caches `import()`ed modules within the same process, but this service is under the following environmental constraints:

```bash
curl -I https://www.web-memo.site

HTTP/2 307
cache-control: public, max-age=0, must-revalidate
content-type: text/plain
date: Sat, 28 Jun 2025 04:57:34 GMT
location: /memos
server: Vercel
strict-transport-security: max-age=63072000
x-vercel-id: icn1::2w69g-1751086654787-0015380b2120
```

According to the result of the `curl -I https://www.web-memo.site` request, this service runs on the **Vercel serverless platform**:

Serverless environments have the following characteristics:

- A new execution context (function instance) may be created per request,
- On cold starts, Node.js's module cache is nullified.
- Therefore, translation resource loading like `import('./locales/ko/translation.json')` incurs **repeated I/O and initialization costs on every request**.

This structure can lead to **TTFB (Time to First Byte)** delays during SSR initialization. Actual measurements show the translation resource size is about 8.4KB for English and about 10.5KB for Korean; while the JSON size is small, **the i18n initialization cost and the accumulated I/O cost of dynamic imports** can be the main cause of the performance bottleneck.

Additionally, since translation resources are **included inside the source code** in the form `/locales/{lang}/translation.json`:

- Changes require **redeploying the entire application**, and
- **CDN-based caching or runtime dynamic control is impossible**.

This can become a constraint for expanding multilingual support, integrating with external translation systems, real-time A/B testing, and so on.

Therefore, for translation resources, I suggest the following.

- **Switch to a caching structure so the i18n instance can be reused across requests.** By storing i18n instances initialized per language in a global scope, and reusing the existing instance for subsequent requests in the same language, the repeated calls to `.createInstance()` and `.init()` can be avoided.
- **Explicitly cache translation resources so they can be reused from memory.** Currently the JSON is dynamically loaded via `import()` every time, but caching it with structures like `Map` or `lru-cache` (alongside `require()`) avoids unnecessary I/O in non-cold-start cases. (With the current structure, a map would probably suffice.)

  ```typescript
  // Async caching using `import()` + `Map`
  const translationCache = new Map<string, any>()

  export const loadTranslation = async (lang: string) => {
    if (translationCache.has(lang)) return translationCache.get(lang)

    const resource = await import(`./locales/${lang}/translation.json`)
    translationCache.set(lang, resource.default ?? resource)
    return resource.default ?? resource
  }
  ```

- **Deploy translation resources separately to a CDN or external storage and load them via fetch.** Using S3, Vercel Blob, Edge Functions, and the like allows translation resources to be managed independently from the application code, and CDN caching enables fast delivery to users worldwide.
- **Improve the structure so only the namespaces each page needs are loaded selectively.** Rather than loading the same translation data on every page, initializing only the namespaces actually in use reduces unnecessary initialization time and JSON size. In the current structure, the amount of language data itself isn't large, so this may not help much.

In conclusion, the current i18n structure is functionally fine, but **creating a new i18n instance and dynamically importing translation resources on every request** can be a major cause of **SSR TTFB delays, especially in serverless environments**.
Also, importing translation resources bundled into the source code comes with **operational constraints regarding deployment flexibility, CDN utilization, and external translation system integration**.

Accordingly, by **applying a strategy of explicitly caching the i18next instance and translation resources, or switching to a CDN-based resource loading structure**, you can preserve SSR performance while keeping the service's English/Korean support running smoothly.

#### 4-1-3. Limiting the Count in `getMemos` and Introducing Infinite Scroll

Currently, during SSR rendering of the `/memos` page, all memos are fetched from Supabase at once via the `getMemos()` method:

```typescript
getMemos = async () =>
  this.supabaseClient
    .schema(SUPABASE.table.memo)
    .from(SUPABASE.table.memo)
    .select('*, category(id, name, color)')
    .order('created_at', {ascending: false})
```

This query loads all memos without a `limit()`, and since the call is performed as an SSR prefetch inside `HydrationBoundaryWrapper`, this structure, like the SSR structure described earlier, is one where **HTML generation waits for this entire dataset**.

The problem is that since the `MemoView` component is actually rendered on the client through Suspense, this structure of prefetching all data on the server can lead to **SSR response delays and increased hydration payload**.

Especially if the number of memos grows to hundreds or more,

- SSR response delays (increased TTFB)
- Increased client hydration cost
- Increased network transfer size

and other performance degradations can occur. Therefore, I suggest the following improvements:

- **Limit the number of memos on initial load (`limit`)**, then load progressively via infinite scroll or a "Show more" button

  ```typescript
  getMemos = async () =>
    this.supabaseClient
      .schema(SUPABASE.table.memo)
      .from(SUPABASE.table.memo)
      .select('*, category(id, name, color)')
      .order('created_at', {ascending: false})
      .limit(20)
  ```

- On the client, wire this up with React Query's `useInfiniteQuery` or a `cursor`-based loading structure

Switching to this structure reduces the network bottleneck at SSR time, and **by prioritizing only the data needed for what the user actually sees on screen, you can expect improvements in perceived performance (LCP, TTFB).**

#### 4-1-4. Login Status Checked Redundantly in Middleware and Layout

Currently, the `/memos` page checks the user's authentication status in two places: middleware and layout.tsx.

1. `middleware.ts` calls `checkUserLogin()` via `updateAuthorization()`
2. On entering `layout.tsx`, `checkUserLogin()` is called once more to check authentication status

This structure is functionally fine, but from the perspective of SSR performance and maintainability, there is a clear inefficiency.

- **The Supabase API is called twice per request**: the same network request to Supabase occurs twice per request just to obtain authentication info, and in serverless environments (Vercel, etc.) this becomes a bottleneck factor along with cold start latency.
- **SSR delays due to duplicate calls**: authentication requests run in positions that block HTML generation, so being called twice can lead to increased TTFB (Time to First Byte) and overall response delays.
- **Semantic duplication**: if authentication fails, the middleware already redirects, so there's no need to check again in the layout. Conversely, if you branch on authentication state in the layout, the middleware's authentication check becomes unnecessary.

So where should the check happen? I don't think there's a single right answer here. As I see it, the pros and cons of the two structures are as follows.

| Location       | Pros                                                                                                  | Cons                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **middleware** | - Fast redirects possible before SSR<br/>- Reliable route protection                                  | - Supabase calls delay the HTML response<br/>- State cannot be shared with React components |
| **layout.tsx** | - Auth info can be shared via Context<br/>- Easy to hook into React-based side effects (Sentry, etc.) | - On auth failure, some HTML rendering may proceed before the redirect                      |

If I were the developer, and given the current structure where authenticated user info continues to be used for Sentry initialization, Sidebar rendering, and so on, performing authentication in `layout.tsx` and having the middleware handle only `locale/path` redirection would be more suitable. I'd judge that separating roles — middleware for lightweight path handling, layout for React context and auth-based UI branching — is the most flexible and scalable structure.

That said, this comes down to personal choice, and I don't think there's one right answer for where to put it. However, since the structure is clearly making duplicate calls, performing the login check in a single stage seems appropriate.

#### 4-1-5. User Information Fetched Redundantly in Three Places

The previous section 4-1-4 pointed out that login authentication is checked redundantly in middleware and layout.tsx, and
this structure is also inefficient in that the Supabase calls fetching user information **occur a total of three times**.

1. `layout.tsx` calls `checkUserLogin()` → internally uses `getUser()`
2. Then `initSentryUserInfo()` calls `getUser()` again
3. On the client, the `<InitSentryUserInfo />` component performs the same request one more time

The Supabase API is called three times in the course of handling a single request, and two of those are **duplicate calls to obtain exactly the same user information**. Since Supabase is an external network request, in serverless environments this can negatively affect overall SSR performance along with cold start delays.

This problem can be resolved structurally. Instead of `checkUserLogin()`, call `getUser()` from the start to obtain the user information, and reuse that result in every flow that needs it. For example, the structure could be changed as follows:

```ts
const supabaseClient = getSupabaseClient()
const {data: user} = await new AuthService(supabaseClient).getUser()

if (!user) redirect(PATHS.login)

// User info is available, so Sentry can be configured on the server
setUser({
  id: user.id,
  email: user.email,
  username: user.identities?.[0]?.identity_data?.name,
  ip_address: '{{auto}}',
})
setTag('lng', lng)
```

This way, the Supabase call happens only once, and its result can be shared across Sentry initialization, the Sidebar, the user context, and elsewhere.

Meanwhile, the Supabase client itself currently has a cache variable `supabaseClient` declared, but with no actual assignment, so a new instance is created every time:

```tsx
let supabaseClient: MemoSupabaseClient;

export const getSupabaseClient = () => {
  if (supabaseClient) return supabaseClient;

  const cookieStore = cookies();

  return createServerClient<Database, "memo", Database["memo"]>(
    CONFIG.supabaseUrl,
    CONFIG.supabaseAnonKey,
    { cookies: { ... } },
  );
};
```

The code above appears intended to create the client once and reuse it, but since the `supabaseClient = ...` assignment is missing, caching doesn't happen. Fixing it as follows would also reduce client object creation costs:

```tsx
let supabaseClient: MemoSupabaseClient

export const getSupabaseClient = () => {
  if (supabaseClient) return supabaseClient

  const cookieStore = cookies()

  supabaseClient = createServerClient<Database, 'memo', Database['memo']>(
    CONFIG.supabaseUrl,
    CONFIG.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({name, value, options}) =>
            cookieStore.set(name, value, options),
          )
        },
      },
      db: {schema: SUPABASE.table.memo},
    },
  )

  return supabaseClient
}
```

If both the user information (the `getUser()` result) and the Supabase client are created once and reused this way, network requests and resource creation at SSR time are reduced, and the structure can become much simpler. However, in environments like Vercel where the context is reset per request, this kind of caching **may offer structural benefits without much practical performance gain.**

One more thing to consider here is the placement of `await initSentryUserInfo()`. This function fetches user information from Supabase and sets it in Sentry, and currently SSR waits until this work finishes. It has the advantage of log accuracy, but it becomes a bottleneck for initial rendering performance. If there's no strict need to record user context in Sentry on the server, you could consider handling this on the client or switching to parallel processing. However, in that case user information may be missing from server-side error logs, so the trade-off should be judged based on the service's characteristics.

In conclusion, this structure goes beyond where to check authentication (4-1-4) — it's a design problem of **how to fetch user information once and reuse it globally**. Since the current structure of requesting the same data multiple times directly affects SSR performance, it's desirable to simplify the structure so user information is fetched once and passed clearly to wherever it's needed.

## 5. Other Suggestions

Beyond the core bottlenecks mentioned above, I also analyzed additional fine-grained optimization points that can contribute to overall performance improvements.

## 5-1. Dynamic Locale Loading

Currently, the `MemoCalendar` component dynamically imports Day.js locale data as follows:

```ts
dayjs.extend(timezone)
const localizer = dayjsLocalizer(dayjs)

// dynamic loading
import('dayjs/locale/en')
import('dayjs/locale/ko')
```

This approach loads the locale modules asynchronously at execution time, and locale application is not guaranteed until after hydration. If the browser's network is slow, flickering can occur or the calendar can render before the locale is applied, and additional fetches on page transitions increase the initial execution cost.

Also, in Next.js or Vite build environments, only static `import`s are subject to bundle optimization, so this structure doesn't get separate chunk splitting and incurs a fixed runtime cost.

Therefore, **changing to static imports as below is more desirable**:

```ts
import 'dayjs/locale/en'
import 'dayjs/locale/ko'

dayjs.extend(timezone)
const localizer = dayjsLocalizer(dayjs)
```

This way, the locale modules are included in the bundle at build time and can be used immediately without extra network requests at runtime. Especially in situations where the calendar's initial render timing is hard to control, having the locales pre-included is advantageous for stability and consistency.

If the number of locales is small and unlikely to change, the static import approach is the simplest and most stable structure. If the number of languages grows in the future, you could consider refactoring toward a tree-shakeable structure, or a script that extracts only the languages in use at build time.

### 5-2. Render-Blocking CSS

I confirmed that the `pretendard` web font is currently loaded as follows.

```html
<link
  rel="stylesheet"
  as="style"
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
/>
```

Although the `as="style"` attribute is present, `rel="stylesheet"` is inherently render-blocking, so HTML parsing actually stops and waits for this CSS. Lighthouse also flags it as a render-blocking resource.

The bigger problem is that this `<link>` tag sits inside a component in `app/[lng]/layout.tsx`, alongside a `<div>`. This is an invalid position per HTML syntax, and depending on the browser it may be ignored or handled as an exception. As a result, the font may not be applied at the intended time, or the performance optimization may be nullified.

![wrong-stylesheet](./images/wrong-stylesheet.png)

To fix this, the web font should be loaded asynchronously, and its location should be moved into the HTML `<head>`. Typically this is handled using the `preload` and `onload` attributes as below:

```html
<link
  rel="preload"
  as="style"
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
  onload="this.onload=null;this.rel='stylesheet'"
/>
<noscript>
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
  />
</noscript>
```

This approach helps apply the font without blocking the initial render. Even in environments with JavaScript disabled, the fallback works via `<noscript>`, so it's relatively safe. Fortunately, the Pretendard CSS includes the `font-display: swap` setting, so the FOIT problem doesn't occur.

However, this approach also has a few drawbacks.

- Since the style is applied only after the `onload` event fires, font application can be delayed depending on network conditions, and FOUT can be more noticeable.
- As the style is applied later, layout shifts can occur, which can affect the CLS score.
- Older browsers don't support `onload` on `<link>`, so the font may not be applied. That said, browsers this old are rarely used, so you probably don't need to worry much about it.

In conclusion, the current structure of inserting the `<link>` tag inside a `<div>` within the `layout.tsx` component is invalid per HTML syntax, and depending on the browser may be ignored or handled in unintended ways. This can be a cause of **delayed or missing font application** at actual render time, and can also nullify the optimization meant to remove render blocking.

In particular, in the Next.js App Router structure, the only place where `<head>` can be configured is `app/layout.tsx`, so the current approach of inserting `<link>` inside `app/[lng]/layout.tsx` is structurally inappropriate as well.

Therefore, **web font loading must be performed in the `<head>` area of `app/layout.tsx`**, and where possible, I recommend configuring it to load asynchronously without render blocking via the `preload` + `onload` pattern.

### 5-3. Tree Shaking Failure Due to Barrel Files

While analyzing the source code, I found it puzzling that `recharts`-related resources were being sent to the client even though no chart-related features were in use.

![recharts](./images/recharts.png)

To identify the problem, I looked at the internal code and found that the project provides reusable components through an internal UI package called `@web-memo/ui`, and this package includes `recharts` as a dependency and exports it as follows.

```tsx
'use client'

import * as React from 'react'
import * as RechartsPrimitive from 'recharts'

// omitted

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
}
```

However, nothing actually used these components, and `sideEffects: false` was set in `package.json`. Even so, the reason the `recharts`-related code was included in the bundle wasn't simply a matter of whether it was an ESModule. (For reference, adding `type: "module"` does not solve the problem.)

The UI package used a **barrel export structure spanning multiple levels**, and because of this, Webpack apparently couldn't statically analyze module usage and included the entire `recharts` module.

In Next.js, when `export * from` statements are excessively nested in an ESM environment, **usage cannot be statically analyzed, and tree shaking may not work properly.** This is because Webpack **fails to construct an accurate dependency graph** by following import paths, and treats intermediate barrel files **as whole blocks**, including everything in those modules.

Webpack can assist safe tree shaking through options like `sideEffects: false`, but in deeply nested barrel export structures, such optimizations can be limited or, as in this case, fail to work properly.

Fortunately, this problem could be solved using Next.js's `experimental.optimizePackageImports` feature.

```js
// next.config.js
experimental: {
  optimizePackageImports: ['@web-memo/ui'],
}
```

This setting **rewrites the specified package's import paths into a flattened form**, allowing Webpack to statically determine usage. As a result, the unused `recharts` exports were removed, and the bundle size decreased significantly as follows:

| Path             | First Load JS Before | First Load JS After | Reduction   |
| ---------------- | -------------------- | ------------------- | ----------- |
| `/[lng]/login`   | 334 kB               | 103 kB              | **-231 kB** |
| `/[lng]/memos`   | 470 kB               | 339 kB              | **-131 kB** |
| `/[lng]/setting` | 422 kB               | 266 kB              | **-156 kB** |

As shown, **the phenomenon of unused components' dependencies unintentionally being included in the bundle deserves particular attention, because it can affect real service performance while remaining hard to notice.**

Also, since all internal packages in the current project are written as ESModules, exporting each component explicitly via the `exports` field is more suitable than unnecessary barrel files. The `optimizePackageImports` option Next.js provides is very useful, but it can burden build times, and omissions can lead to mistakes, so **designing packages on an ESModule basis from the start is the fundamental solution**. Rather than barrel files, please use the `exports` field in `package.json` to export without barrel files.

On top of that, personally, I think **referencing pre-built output is more suitable than directly referencing the internal UI package as source code.** Being able to inspect the build output makes problems faster to identify, and it's also more advantageous in terms of per-package caching, change tracking, test isolation, and other management aspects. However, structuring it this way clearly divides the points that need checking, so the developer needs a solid understanding of the build structure and dependency flow for debugging to go smoothly.

### 5-4. Optimizing `MemoCalendar`

Currently, `MemoCalendar` has a structure that is very vulnerable to re-rendering, and full re-renders unrelated to user interaction are confirmed to occur frequently. Below is a capture, taken with React DevTools' re-render visualization feature, showing unnecessary rendering occurring when a calendar item is clicked.

![rbc-rendering](./images/rbc-rendering.gif)

When an item is clicked, nothing changes on screen at all, yet the entire `react-big-calendar` re-renders, which stems from the following causes:

- The event click handler (`handleItemClick`) references `searchParams` → the handler is recreated on every render, and the change to `onSelectEvent` triggers a full `Calendar` re-render
- All of `Calendar`'s custom renderers (`event`, `dateHeader`, `agenda.date`, `toolbar`) are passed as inline functions → internal diff optimizations are nullified

To resolve these structural problems and improve performance, I suggest the following refactoring.

1. **Remove `searchParams` and use `URLSearchParams(window.location.search)` directly**

```tsx
const handleItemClick = useCallback(
  (event: ExtendedEvent) => {
    const params = new URLSearchParams(window.location.search)
    params.set('id', event.id)
    router.push(`?${params.toString()}`, {scroll: false})
  },
  [router],
)
```

This way, `handleItemClick` is no longer recreated on every render, and passing it as `onSelectEvent` won't cause `Calendar` to re-render unnecessarily. The reason for using `useSearchParams` is entirely understandable, but since the query parameter doesn't affect rendering, and the goal is simply reading and pushing the address as it is now, this approach is more stable and better for performance.

2. **Split all custom renderers out with `React.memo()`**

```tsx
const MemoEvent = memo(({event}: {event: ExtendedEvent}) => (
  <div className="text-center">{event.title}</div>
))
```

This way, the renderer functions maintain stable references, reducing unnecessary cell/event re-renders inside `react-big-calendar`.

`react-big-calendar` is a component with high render costs commensurate with its rich feature set. So without props reference optimization, separating unnecessary state, and lightening the rendering, perceived performance can degrade. Applying refactoring along the lines above allows a smooth and stable user experience without unnecessary rendering even under frequent user interactions like clicks and view switches.

### 5-5. Prefetching the Calendar Loaded via `next/dynamic`

It's commonly believed that prefetching in Next.js is **only possible at the page level** through `next/link`, but that's not the case. Components lazy-loaded via `next/dynamic` can also have their chunks preloaded (prefetched) by explicitly calling `import()`.

The screenshot below shows **when the JS chunk of a component loaded with `dynamic` is requested over the network**.

![prefetch-component-1](./images/prefetch-component-1.png)

This example shows the typical behavior. When the calendar component is loaded with `dynamic` and configured to render on button click, **the chunk is loaded over the network the moment the user clicks**. The larger the chunk file, the greater the delay between the click and rendering.

Below is an example using the same component, but with `import()` called ahead of time via `useEffect` to preload the chunk.

![prefetch-component-2](./images/prefetch-component-2.png)

The component hasn't actually rendered yet, but the resource is already loaded in the browser. Because the chunk was preloaded, rendering starts immediately the moment the user clicks to activate the calendar view. The screenshot below shows this situation.

![prefetch-component-3](./images/prefetch-component-3.png)

As a result, you can **improve perceived responsiveness** because resources can be loaded in advance without delaying the component's initial render timing.
Even for components loaded with `dynamic`, simply calling `import()` a bit earlier than the moment it's needed is enough to gain performance improvements.

This is **particularly effective when implementing view switches within the same view ("grid" → "calendar")**, rather than page transitions. The larger the chunk or the longer the initial render takes, the more pronounced the effect of the prefetch strategy becomes. In practice, you can use `useEffect` inside the `MemoView` component like this:

```tsx
useEffect(() => {
  if (view === 'grid') {
    import('./MemoCalendar')
  }
}, [view])
```

As shown, even for components loaded with `dynamic`, simply calling `import()` slightly ahead of when it's needed is enough to gain sufficient performance improvements. The larger the chunk or the more time the initial render takes, the more clearly the effect of the prefetch strategy shows.

### 5-6. Integrating Sentry Performance to Identify SSR Bottlenecks

https://docs.sentry.io/product/sentry-basics/performance-monitoring/

Sentry is already in place in the current project. However, the current setup is **oriented toward error tracking, so it has some limits for quantitatively analyzing SSR performance bottlenecks**. To more accurately identify the causes of slow SSR initial loading, **I recommend also leveraging Sentry's Performance feature.**

Sentry Performance can instrument SSR bottlenecks in the following ways:

- Set up `startTransaction` and `span`s for the major sections inside `layout.tsx` and `page.tsx` to record **step-by-step execution times of SSR processing**
- **Track the time spent** in parallel or serial processing areas such as Supabase API call timing, i18n initialization, Sentry setup, and React Query prefetch
- On the client, also hook in post-hydration measurements to **identify UX bottlenecks at the SSR → CSR transition point**

You can instrument it like this.

```ts
// Example code detached from the current structure.
import * as Sentry from '@sentry/nextjs'

const transaction = Sentry.startTransaction({name: 'SSR /memos'})
Sentry.getCurrentHub().configureScope((scope) => scope.setSpan(transaction))

const getUserSpan = transaction.startChild({op: 'auth', description: 'getUser'})
await getUser()
getUserSpan.finish()

const getMemosSpan = transaction.startChild({
  op: 'query',
  description: 'getMemos',
})
await getMemos()
getMemosSpan.finish()

transaction.finish()
```

In this way, Sentry can visualize each SSR request's **total processing time, bottleneck stages, and whether it was a cold start**, and since **execution contexts are separated per request in the Vercel serverless environment**, it's particularly effective for visualizing each request's bottleneck sections.

Since Sentry is already integrated for error tracking, adopting the Performance transaction feature alongside it lets you expect the following benefits at no additional cost:

- Speed comparison for each processing stage: `TTFB`, `getMemos()`, `i18n`, `Sentry setup`, etc.
- Confirming execution time increments in cold start situations
- Visualizing bottleneck sections and identifying priority improvement targets

For a project like this one where the SSR structure is well organized, **even simple transaction instrumentation can yield plenty of insights**, so it will be of practical help in identifying actual causes and prioritizing performance improvements.

## 6. Closing

This analysis was an attempt to concretely organize the improvable points from a performance optimization perspective, based on the structure of the http://www.web-memo.site/ project. Hard to call a mere toy project, this website was **impressive in its modern frontend tech stack and structural design**, and in every line of code I could sense the developer's deliberation and high level of polish.

Next.js App Router, React Query, Supabase, i18n, and the monorepo setup were all well combined, and the separation of roles was clearly done. This project goes beyond a simple experiment and stands as **a good example of modern frontend development**.

Of course, due to practical constraints it's hard to optimize every area perfectly, but **even small structural improvements or changes in how resources are handled** can improve the user experience to a noticeable degree. In particular, using Sentry's Performance feature together will be a great help in **confirming, based on real measurements, which parts are the actual bottlenecks** and setting future improvement priorities.

I hope this analysis serves as a reference as this project grows further or expands in new directions.
If there's anything you're curious about or topics you'd like to discuss together, please feel free to reach out anytime.

Thank you for reading!
