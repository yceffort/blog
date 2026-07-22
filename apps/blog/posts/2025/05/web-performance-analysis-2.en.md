---
title: 'Web Service Performance Analysis (2)'
tags:
  - web-performance
  - javascript
  - nextjs
published: true
date: 2025-05-12 09:44:34
description: 'Thank you for your interest. 🙇🏻‍♂️'
series: 'Web Service Performance Analysis'
seriesOrder: 2
---

## Feedback from the Actual Developer

### Was the report helpful?

It was genuinely very helpful. Suggestions like replacing libraries that can't be tree-shaken, such as lodash, and using namespaces felt like optimizations I could apply and test right away. I plan to apply and compare the other suggestions you provided one by one as well.

### Would you recommend this performance analysis to other developers?

To get straight to the point: yes, I can recommend it to others, and I plan to. I think many developers vaguely feel the need to optimize their sites but end up doing only partial fixes because they don't know the right analysis methods and optimization strategies. Since each site can receive suggestions tailored to it, I actually intend to recommend this.

### Additional questions

> We also operate an Admin service. When optimizing performance for editor-centric / B2B web services like this, are there areas where the strategy differs from a consumer-facing service?

Admin services call for a somewhat different strategy because the users' characteristics, patterns, and goals are different. Of course, it would be ideal if every web service did its best on all fronts of performance, but realistically the time and staffing you can devote to this work is limited (and an admin tool in particular may fall outside the spotlight), so I'd suggest considering the following.

1. The most important thing: interaction and performance during core feature usage after login (focused on INP and TTI)

   Admin tools often involve typing text into an editor, uploading files, and so on, so there should be no jank, input delays, or slow screen transitions while using these features. Consider avoiding putting pressure on the main thread with complex calculations or DOM manipulation.

2. Aggressive code splitting and lazy loading

   Libraries for text input, file uploads, and the like tend to be heavier than others. Split your code aggressively along various axes — routes, components, permissions — to reduce unnecessary code being loaded, and pay careful attention so that only the essential features are loaded.

3. Data handling and rendering

   Admin tools usually need to display a lot of data, so you'll frequently need to process large volumes of it. Fetch only the data strictly needed to draw the screen, reduce the number of HTMLElement nodes being rendered, and improve rendering performance. API responses should likewise return only what's needed, and since input is frequent, try using debouncing and throttling aggressively.

4. Caching

   Admin users tend to visit the service repeatedly and continuously. So cache application data, static assets (images, etc.), and key API responses to reduce network requests as much as possible and improve the user experience. Caching is especially effective on pages users visit frequently.

Ultimately, performance optimization in admin and B2B services is directly tied to users' work efficiency, so it's important to keep investing continuous attention and improvement effort centered on the strategies mentioned above.

> You might feel this question isn't very related, so please feel free to say so if it's inconvenient or difficult. Our team is planning to build an internal shared library. Beyond simple code reuse, in terms of bundlers, utility function composition like lodash, and so on, what should we prioritize most to build a structure that accounts for bundle size, DX, and performance?

Building an internal shared library sounds like fun. I've also worked on internal shared libraries (design systems, packages, etc.) at both my previous and current companies. This work is fun, but if the goals aren't clear, the people developing alongside you may not actively help, or may lose motivation. So I'd suggest considering the following points.

1. Splitting into micro services: How about splitting the web service you currently provide into separate addresses and services per tab? Since everything currently lives in a single repository, I imagine version bumps, deployments, and testing are difficult. The payment module, excel module, and so on that I mentioned earlier being included across the entire web service is probably for the same reason. If you split it into home, product listings, the service logged-in users see, and so on, you could gain the following benefits.
   - Improved service stability: A failure can be confined to the affected service instead of spreading across the entire service.
   - Building the shared library: You'd be able to actively use the shared library you mentioned, and also try out the shared library you create during the service split.
   - Improved code quality: Once services are separated, you can test each service independently, which raises code quality.
   - Easier deployment and maintenance: Since each service is deployed independently, updates or bug fixes to a specific service become easier to carry out.
   - Easier to start new projects: When adding a new service or feature, you can minimize dependencies on existing services and develop faster.

   That said, this is equivalent to operating new servers, so server operating costs may increase. Also, once services are separated, additional work may be needed for inter-service communication and data sharing. So you'll want to weigh the pros and cons of splitting services carefully.

2. Monorepo structure and package build/publishing: To develop a shared library effectively, the prerequisites are designing the monorepo structure and setting up package builds. These two tasks take more effort than you'd expect. It would be good to think through what an effective structure would look like in advance before starting the work.
3. Browser support range: For the services and shared library you provide to be managed effectively, the browser support range needs to be clear and unified. Only then can you reduce unnecessary polyfills/transpilation. I'd suggest managing the support range as a single browserslist, in a form like https://github.com/NaverPayDev/browserslist-config.

Building an internal shared library is an important undertaking that goes beyond simple code reuse and has a large impact on bundle size, developer experience (DX), and overall application performance. If you set clear goals based on the considerations above and approach it systematically, you'll be able to produce something valuable as a technical asset.

### Anything else you'd like corrected or expanded

> Applying everything would be great, but it would be even better if there were priorities on which items to apply first for the most impact

The easiest wins with the biggest impact are the following.

- Remove or replace libraries that can't be tree-shaken, such as `lodash`
- Remove unnecessary code from `__app.tsx` or move it elsewhere
- Remove third-party libraries or add `async` `defer` attributes
- Change the CLS-causing heading from React logic to a CSS media query

The priority items listed above are a good starting point that can deliver noticeable performance improvements with relatively little effort. I hope you'll start with these and keep improving incrementally to further enhance your website's user experience.

---

> The following is the document delivered to the actual developer. Information such as the site address and images has been redacted.

# https://example.com/ko Performance Analysis

> **Disclaimer**
>
> This summary condenses the key points of the performance analysis report for the `example.com` website (as of May 10, 2025, 18:00). Due to website updates or environmental changes after the time of analysis, there may be differences from the actual current state. **Also, please note that this analysis was based on the bundled artifacts deployed to the browser rather than the original source code as written, so inferences about the code's internal structure or logic may differ somewhat from the actual implementation.**
>
> The performance bottlenecks and improvement suggestions presented are general recommendations, and the actual effect of applying them may vary depending on many factors, including the website's specific implementation, server environment, and traffic patterns. This summary is provided for informational purposes, and the final decisions on applying the suggested changes, along with responsibility for their results, rest with the website's operators.
>
> For more detailed analysis, methodology, and full context, please refer to the original analysis report.

# 1. Summary

Hello! To help the `example.com` website reach its full potential and provide users with an even smoother experience, I've summarized the key findings of the performance analysis.

The `example.com` website has room for improvement in loading speed and user experience, particularly in initial JavaScript loading, resource handling efficiency, and layout stability.

The main performance bottlenecks are as follows.

- **JavaScript overload**: An unnecessarily large amount of JavaScript in the initial load (including `_app.js`) and unoptimized third-party scripts are delaying loading.
- **Inefficient key resources**: Excessive i18n data transfer and unoptimized image/font loading are degrading performance.

I propose prioritizing the following improvements.

- **JavaScript optimization and loading improvements**:
  - Optimize `_app.js`, split code, remove unnecessary libraries, and apply `defer/async` to third-party scripts.
- **Key resource optimization**:
  - Optimize how i18n data, images, and fonts are loaded, and improve the related CLS (Cumulative Layout Shift).

Applying these recommendations should significantly improve the website's performance and user satisfaction. Please see the main body of the report for details.

# 2. Analysis Overview

I analyzed the website as deployed at 18:00 on May 10, 2025.

![image.png](./images/web-performance-analysis-2/image.png)

![image.png](./images/web-performance-analysis-2/image1.png)

![image.png](./images/web-performance-analysis-2/image2.png)

The tools used for the analysis are as follows.

- chrome dev tool
- webpagetest

# 3. Website Analysis

## 3-1. Main Frameworks and Libraries

- Next.js: `__app.js` `__buildManifest.js` `__ssgManifest.js` and the like are JavaScript files you'd see in a Next.js-based project. I also confirmed the presence of the `window.__NEXT_DATA__` global variable, which is evidence that the site uses Next.js's page router.
- react: Patterns suggesting React usage were found across many JavaScript files, and the React version confirmed in `framework.js` is 17.0.2.
- emotion: The site appears to use emotion, a css-in-js library, for styling.
- Apollo: I could see traces of Apollo Client for integrating with `GraphQL`.
- react-query: I could also see that react-query is used for data fetching.
- axios: The site uses axios, a `fetch` library. The version appears to be `0.25.0`.
- i18next: i18next is used for internationalization. I also confirmed the use of `_nextI18Next` for integrating with the Next.js project.
- dayjs: `dayjs` is used as the date utility.
- uuid: uuid appears to be used to generate unique IDs.
- lodash: The general-purpose JavaScript utility lodash is in use.
- datadog sdk: I confirmed the use of the datadog sdk, version 5.35.1.
- zustand: This appears to be in use for state management.

## 3-2. Build Environment

There's no way to determine the exact Next.js version, but judging from internal patterns, it appears to be a page-router-based SSR project on version 12.x~14.x. Due to the nature of server-side rendering it's difficult to fully grasp the internal structure, but `__app.tsx` appears to be wrapped in numerous Providers, including the following.

- `@emotion/react` : `CacheProvider`
- `@apollo/client` : `ApolloProvider`
- `appWithTranslation` : HOC from `next-i18next`
- `I18nextProvider` : same as above
- `@tanstack/react-query` : `QueryClientProvider` , `Hydrate`

## 3-3. Deployment Environment

```bash
nslookup example.com
Server:    0.0.0.0
Address:  10.100.3.167#53

Non-authoritative answer:
Name:  example.com
Address: 0.0.0.0
Name:  example.com
Address: 0.0.0.0
Name:  example.com
Address: 0.0.0.0
Name:  example.com
Address: 0.0.0.0

curl https://ipinfo.io/0.0.0.0/json

{
  "ip": "0.0.0.0",
  "hostname": "server-0.0.0.0.icn00.r.cloudfront.net",
  "city": "Seoul",
  "region": "Seoul",
  "country": "KR",
  "loc": "37.5660,126.9784",
  "org": "AS16509 Amazon.com, Inc.",
  "postal": "03141",
  "timezone": "Asia/Seoul",
  "readme": "https://ipinfo.io/missingauth"
}
```

- The site is hosted on AWS and appears to use Amazon CloudFront in Incheon.

# 4. Suggestions

The preceding 'Website Analysis' section examined the current performance state of the `example.com` website and the key areas needing improvement from multiple angles. In this 'Suggestions' chapter, based on those findings, I'd like to present concrete, actionable measures, item by item, that can practically help improve the website's overall loading speed, optimize the user experience, and further improve Core Web Vitals.

Each suggestion is written around a concrete solution to an identified problem and its expected effect, so as to aid understanding of the actual improvement work and serve as a reference for setting priorities.

## 4-1. Enormous JavaScript Resource Files

The most striking thing during the analysis of this web service was the JavaScript files required to load `/`. Loading `/` required a total of 41 JavaScript files amounting to 14,647kb. Of course, some of these were third-party libraries such as `kakao.min.js` and `gtm.js`, but the size of the Next.js resources served by the web service itself was considerable as well.

```javascript
;((self.__BUILD_MANIFEST = (function (
  t,
  s,
  e,
  a,
  c,
  i,
  n,
  o,
  u,
  d,
  p,
  m,
  l,
  k,
  f,
  y,
  r,
  b,
  h,
  g,
  j,
  v,
  w,
  S,
  _,
  x,
  M,
  C,
  D,
  I,
  T,
  A,
  E,
  U,
  B,
  F,
  q,
  z,
) {
  return {
    __rewrites: {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    },
    '/': [
      e,
      a,
      d,
      c,
      p,
      l,
      h,
      n,
      'static/chunks/pages/index-6b09fcdd8e2f5445.js',
    ],
    // .. other pages omitted
  }
})(
  'static/chunks/15-a9a48f7944e0e298.js',
  'static/chunks/8631-592dbd6f83032fc0.js',
  'static/chunks/fec483df-db3f7b2046a0a64a.js',
  'static/chunks/3763-ecbc1ef0a619ccdc.js',
  'static/chunks/7978-897f3a152fd54de3.js',
  'static/chunks/966-6cef0f650c8a7441.js',
  'static/css/2c191b1d58af9610.css',
  'static/chunks/3053-ae68c57739ba1ff4.js',
  'static/chunks/3127-870b5d6feca82804.js',
  'static/chunks/1907-ad5c27c3b3b7d60b.js',
  'static/chunks/5011-6994a6f9b60dd1c1.js',
  'static/chunks/5912-301e1a380c683a48.js',
  'static/chunks/2451-9e32b55d273f58ab.js',
  'static/chunks/9819-61b2f434cbd511ac.js',
  'static/chunks/2992-759ed9bf2658b944.js',
  'static/chunks/9738-70e6b0d150c1fb76.js',
  'static/chunks/8412-36d0e0939bef9710.js',
  'static/chunks/5967-26ad41dd5b9edc06.js',
  'static/chunks/3055-58c5470e34b2f706.js',
  'static/chunks/8349-9faf5341f07dd35c.js',
  'static/chunks/7094-84c88e31a56721ad.js',
  'static/chunks/3096-eb0b475935c82a55.js',
  'static/chunks/6186-c06b470a95a9374e.js',
  'static/chunks/9099-7d6cb2e6ff4b5743.js',
  'static/chunks/2957-1ebc10f740dfdb59.js',
  'static/chunks/8888-8d8e077c448bea31.js',
  'static/chunks/2871-2587166ff722243e.js',
  'static/chunks/9152-098296c0be4fa4cb.js',
  'static/chunks/2272ea81-d98992a44535b5b7.js',
  'static/chunks/9965-2bf9c244cc59be40.js',
  'static/chunks/9433-769dc6182acbdb07.js',
  'static/chunks/3676-60038ecd98fea7cc.js',
  'static/chunks/5872-d6248ba3506507b6.js',
  'static/chunks/770-740564783223b60a.js',
  'static/chunks/1134-7590ca8c52014b90.js',
  'static/chunks/4045-93d1c0b9d354c3b9.js',
  'static/chunks/9534-625ccbc57a2af12a.js',
  'static/chunks/6404-ef83ba69c344044a.js',
)),
  self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB())
```

The file above is the `__buildManifest.js` file provided by Next.js. This JavaScript file describes a website built with Next.js. As you can see, loading `/` requires a total of 9 JavaScript files, and once you include the `__app` and `framework` files required for any initial site load, roughly 3 megabytes are needed. Considering that the average website serves about 22 JavaScript files at 680kb, this website is on the quite large side.

[HTTP Archive: State of JavaScript](https://httparchive.org/reports/state-of-javascript?start=earliest&end=latest&view=list#bytesJs)

Most of the performance problems this website suffers from appear to stem from these large JavaScript files.

Among them, `__app.js` stands out the most. `_app.js` is a core Next.js file — the JavaScript file that is always included first to load the website. This file being large means it negatively affects the performance of every page. A large size here means that much of a burden is being placed on the project's shared area.

![image.png](./images/web-performance-analysis-2/image3.png)

Indeed, looking at the analysis results above, you can see that most of the time is spent downloading and parsing `__app`, which exceeds 2 megabytes. (Un-minified, it grows to as much as 9 megabytes.) So checking whether this file contains only what's actually needed and whether there are unnecessary resources should go a long way toward resolving the performance problems.

From here, let me offer a few suggestions for this `__app` file.

### 4-1-1. Remove or Replace Libraries That Can't Be Tree-Shaken, Such as `lodash`

lodash is a representative library that can't be tree-shaken, and I could see traces of non-tree-shaken `lodash` on this website.

![image.png](./images/web-performance-analysis-2/image4.png)

The screenshot above shows traces of the `lodash` library found on the website and part of what's actually in use. I confirmed that functions provided by `lodash` were attached to the `kt` variable. Since `lodash` can't be tree-shaken, you can see that even unused utilities are all included in `__app`, and this weighs directly on the bundle size.

[npm: lodash-es](https://www.npmjs.com/package/lodash-es)

I strongly recommend switching to `lodash-es`, which is written in the tree-shakeable `ESModule` format. With that library, utilities that aren't actually used are removed from the `__app.js` bundle, and you should see the bundle size shrink noticeably.

Beyond this, I also recommend checking the libraries used in your `package.json` on bundlephobia.

[Bundlephobia | Size of npm dependencies](https://bundlephobia.com/)

![image.png](./images/web-performance-analysis-2/image5.png)

For a library that can be properly tree-shaken, an `exports` analysis will be possible, as in the case of [Bundlephobia: lodash-es](https://bundlephobia.com/package/lodash-es@4.17.21) in the screenshot above.

### 4-1-2. Enormous Props Due to i18n Resource Usage

Next.js calls functions like `getInitialProps` or `getServerSideProps`, then sends the results down to the client to go through hydration. If you want to see the `props` provided on a given page, you can check `window.__NEXT_DATA__`.

![image.png](./images/web-performance-analysis-2/image6.png)

For `/`, I could see `next-i18next`-related props being provided for internationalization. The problem is that this object is very large — as much as 560kb.

There are roughly two ways to address this problem.

- Remove `en` from `fallbackLng`: Even though the site I visited was `/ko`, the reason it also includes `/en` data is probably that `en` has been added to `fallbackLng`, the fallback handling for information that fails to load.

  ```javascript
  A.exports = {
    i18n: {
      defaultLocale: 'default',
      locales: ['default', 'en', 'ko', 'ja', 'zh-CN'],
      localeDetection: !1,
      fallbackLng: {
        ko: ['en'],
        en: ['ko'],
        ja: ['ko'],
        'zh-CN': ['ko'],
      },
      backend: {
        expirationTime: 18e5,
        loadPath: 'https://'.concat(
          'd3jg758w1vtpa6',
          '.cloudfront.net/v2/projects/26cf3ff8b06465adbd967ff8ed1e8d12/locales/{{lng}}/download?file_format=react_nested_json',
        ),
        reloadInterval: !1,
      },
      react: {
        transKeepBasicHtmlNodesFor: ['strong', 'br', 'b', 'i', 'u', 'li'],
        useSuspense: !1,
      },
    },
  }
  ```

  `fallbackLng` is an effective option for at least showing a default for missing languages, but seen the other way around, it amounts to downloading an entire extra language just to handle the edge case of text that might not appear. Whether it's worth downloading `en`, which totals about 200kb, is something to think over.

- Split `namespace` per page: Another problem I noticed while going through the i18n data one by one is that language data unnecessary for the current page also seems to be returned in full. I also got the impression that the namespaces provided by `next-i18next` aren't being used.

  ![image.png](./images/web-performance-analysis-2/image7.png)

  Namespaces are the key technique for splitting i18n resources into multiple files, and they play an important role in preventing i18n files from becoming enormous like this.

  [Namespaces | i18next documentation](https://www.i18next.com/principles/namespaces)

  I recommend using namespaces to split the loading as follows.
  1. Resources needed for the areas unconditionally shown to the user during SSR
  2. Resources shown only when the user takes a specific action, such as modals and interactions

  Load the resources in category 1 in `getServerSideProps`, and load the resources in category 2 at the point the component actually loads, via `React.lazy`, `useEffect`, or the like. Doing so reduces the resources that must be downloaded initially and makes page loading faster.

### 4-1-3. Removing Unnecessary Polyfills

What browsers is the web service currently targeting? I can't know your exact service provision situation, but speaking purely from a performance standpoint, the higher the browser support target, the better. Put the other way around, the less you strain to support old browsers, the better performance gets and the smaller the bundle becomes. The polyfills I found on your website are as follows.

![image.png](./images/web-performance-analysis-2/image8.png)

And the versions and status of those polyfills are as follows.

| **Module Path**                             | **Polyfilled Feature**                                      | **Approx. ECMAScript Version**            |
| ------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------- |
| `core-js/modules/es.promise`                | `Promise` object                                            | ES2015                                    |
| `core-js/modules/es.promise.finally`        | `Promise.prototype.finally`                                 | ES2018                                    |
| `core-js/modules/es.object.assign`          | `Object.assign()`                                           | ES2015                                    |
| `core-js/modules/es.object.keys`            | `Object.keys()`                                             | ES5.1                                     |
| `core-js/modules/es.object.values`          | `Object.values()`                                           | ES2017                                    |
| `core-js/modules/es.symbol`                 | `Symbol` type and related features (e.g. `Symbol.iterator`) | ES2015                                    |
| `core-js/modules/es.symbol.async-iterator`  | `Symbol.asyncIterator`                                      | ES2018                                    |
| `core-js/modules/es.array.iterator`         | Array iterator (e.g. `Array.prototype[Symbol.iterator]`)    | ES2015                                    |
| `core-js/modules/es.array.includes`         | `Array.prototype.includes()`                                | ES2016                                    |
| `core-js/modules/es.array.find-index`       | `Array.prototype.findIndex()`                               | ES2015                                    |
| `core-js/modules/es.array.find`             | `Array.prototype.find()`                                    | ES2015                                    |
| `core-js/modules/es.string.from-code-point` | `String.fromCodePoint()`                                    | ES2015                                    |
| `core-js/modules/es.string.includes`        | `String.prototype.includes()`                               | ES2015                                    |
| `core-js/modules/es.number.is-nan`          | `Number.isNaN()`                                            | ES2015                                    |
| `regenerator-runtime/runtime`               | `async/await`, generator function support                   | ES2017 (async/await), ES2015 (Generators) |

I haven't verified every single polyfill, but most of them appear to be code unnecessary in the modern browsers used as of 2025. Removing the code that injects these polyfills would help considerably in reducing the bundle size.

### 4-1-4. Removing uuid

It appears the uuid library is used to generate unique IDs within the service.

![image.png](./images/web-performance-analysis-2/image9.png)

However, at around 10.3kb, this library is on the fairly large side.

[uuid v11.1.0 ❘ Bundlephobia](https://bundlephobia.com/package/uuid@11.1.0)

Unless you have a particular reason, I recommend safely generating random IDs with `nanoid`, which is much smaller.

[nanoid v5.1.5 ❘ Bundlephobia](https://bundlephobia.com/package/nanoid@5.1.5)

### 4-1-5. Checking Whether Unnecessary Dependencies Ended Up in `__app`

Chrome DevTools has a menu called `Coverage`, which provides a way to distinguish which code was actually used for a given page.

![image.png](./images/web-performance-analysis-2/image10.png)

Examining the page with this menu, the analysis showed that 78% (in red) of the roughly 2-megabyte `__app.js` resource is not needed for the actual page load. Of course, that 78% doesn't mean it can be removed right away. It may not be needed for the initial page load but could be needed depending on user interaction, or it could be code needed for error handling.

That said, some of it will surely be code that can actually be deleted. Let's take a look at the following screenshot.

![image.png](./images/web-performance-analysis-2/image11.png)

The code above appears, as far as I can infer, to be code for parsing the Microsoft Office Open XML format, in particular spreadsheet files. The reasons are as follows.

- A polyfill is included for using Node.js's `Buffer` on the client
- The tag names match the OOXML standard

It probably exists to parse excel or docx files on your site. What matters, though, is that this source code is included in `__app.js`, the shared resource needed to load every web page, as mentioned earlier. Functionality meant for a specific page should be included in that page's resources. When a huge library like this is included in `__app` in particular, it imposes an unnecessary burden on initial page loads. My guess is that this library is `exceljs`.

[exceljs v4.4.0 ❘ Bundlephobia](https://bundlephobia.com/package/exceljs@4.4.0)

`exceljs` is a huge library — its raw size alone reaches 1mb. Please double-check whether this package really needs to be in the client code, and if possible, adjust things so this library is included only on the server. And if it's unavoidably needed on the client as well, please move it into another page's resources rather than `__app.js`.

Beyond this, please review the list of packages in the `import`s of `__app.tsx` and move any unnecessary packages to where they truly belong. Other packages or components whose reason for being at the root looks questionable include the following.

- `react-tooltip`
- A password validation component
- Components related to job application, filtering, uploads, and identity verification
- File upload

Once again, the thing to keep in mind is not 'whether the feature is needed' but 'whether the feature absolutely must be at the root'. `__app.js` should contain only functionality that is genuinely needed everywhere.

### 4-1-6. Unifying Data Fetching Libraries

You currently appear to be using both `GraphQL` and `react-query` + `axios` for data fetching. Using two completely different techniques for data fetching is quite a rare case. Using two different data fetching techniques means the initial code needed to provide both features grows accordingly. How about removing `GraphQL` and using only `react-query`? Of course, this would only be possible with appropriate backend support, but if you remove `GraphQL`, you can drop the `Apollo`-related libraries and providers, reducing the bundle size accordingly.

I'm cautious about saying this without having examined every use case, but if the functionality used via GraphQL isn't very complex, I'd recommend `graphql-request`, which is far lighter than `ApolloClient`.

[npm: graphql-request](https://www.npmjs.com/package/graphql-request)

---

If you apply the above, you should be able to greatly reduce the size of `__app.js` and significantly improve performance for loading every page.

Next are other items that can help improve performance.

## 4-2. Optimizing Third-Party Library Loading

I analyzed the code above `<body />` inside `<head />` — the code that appears to have been inserted manually by you, apart from the JavaScript inserted by Next.js.

```html
<script src="https://developers.kakao.com/sdk/js/kakao.min.js"></script>
<script
  type="text/javascript"
  src="https://code.jquery.com/jquery-1.12.4.min.js"
></script>
<script
  type="text/javascript"
  src="https://cdn.iamport.kr/js/iamport.payment-1.2.0.js"
></script>
<script
  async=""
  src="https://www.googletagmanager.com/gtag/js?id=G-YNKW461YK0"
></script>
<script>
  window.dataLayer = window.dataLayer || []
  function gtag() {
    dataLayer.push(arguments)
  }
  gtag('js', new Date())
  gtag('config', 'G-YNKW461YK0', {
    cookie_flags: 'SameSite=Lax',
    debug_mode: false,
  })
</script>
<script>
  !(function (e, t, n, s, u, a) {
    e.twq ||
      ((s = e.twq =
        function () {
          s.exe ? s.exe.apply(s, arguments) : s.queue.push(arguments)
        }),
      (s.version = '1.1'),
      (s.queue = []),
      (u = t.createElement(n)),
      (u.async = !0),
      (u.src = '//static.ads-twitter.com/uwt.js'),
      (a = t.getElementsByTagName(n)[0]),
      a.parentNode.insertBefore(u, a))
  })(window, document, 'script')
  // Insert Twitter Pixel ID and Standard Event data below
  twq('init', 'o8306')
  twq('track', 'PageView')
</script>
<script>
  ;(function (w, d, s, l, i) {
    w[l] = w[l] || []
    w[l].push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js',
    })
    var f = d.getElementsByTagName(s)[0],
      j = d.createElement(s),
      dl = l != 'dataLayer' ? '&l=' + l : ''
    j.async = true
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl
    f.parentNode.insertBefore(j, f)
  })(window, document, 'script', 'dataLayer', 'GTM-WDWL5GM')
</script>
```

Here is some guidance on script loading optimization that can help performance for these JavaScript resources.

Among the scripts placed in `<head />`, any resource without `async` or `defer` halts HTML parsing and forces the browser to wait until the script is downloaded and executed, delaying page load speed.

- `kakao.min.js` This appears to be needed for Kakao login. If this resource isn't strictly required for loading the web service, please insert it dynamically at the point Kakao login is needed, add `defer`, or move it to the bottom of `body`.
- `jquery-1.12.4.min.js` Do you really need jquery? When I removed the jquery script and ran the site, there were no major issues. `jquery` isn't really necessary, and its version is so old that using it looks both risky and unnecessary.
- `iamport.payment` The iamport payment module seems to be needed only at the point a user attempts a payment. Please modify the code so it's loaded only on pages where payment is needed, or at minimum add `defer`.
- [`//wcs.naver.net/wcslog.js`](https://wcs.naver.net/wcslog.js) : This appears to be a script for Naver log analytics; this script too should get `async` `defer`. Analytics scripts aren't critical to rendering, so handling them asynchronously is preferable.

Indeed, you can currently see the two libraries above blocking the resources Next.js needs to render the page.

![image.png](./images/web-performance-analysis-2/image12.png)

Simply adding defer to those four libraries can significantly move up the point at which Next.js loads the page.

![image.png](./images/web-performance-analysis-2/image13.png)

The screenshot above is the code with nothing but `defer` added to the four resources mentioned earlier. You can see the point at which the Next.js code is downloaded and parsed moved up by nearly a second.

## 4-3. Banner Image Optimization

Your site has a structure where a large banner is shown on first access.

![image.png](./images/web-performance-analysis-2/image14.png)

Naturally, this is a UI that performance — and LCP in particular — doesn't much like. From a developer's standpoint it's a resource you'd want to remove, but it may be a banner important to the business. Let me suggest a few ways to keep showing this banner while pulling the Lighthouse score up as much as possible.

- Use image formats with higher compression: The image currently in use is PNG, but using webp or avif could reduce the image size further.
- Change to fetching the image from the server: In the current structure, only after the JavaScript bundle is fully downloaded and parsed does the site know which image will appear in the banner.

  ![image.png](./images/web-performance-analysis-2/image15.png)

  Try using `getServerSideProps` so the image needed for the banner is known during server-side rendering.

- Leverage the preload scanner: Browsers have a special behavior called the preload scanner. The preload scanner is a secondary scanner that runs alongside the main parser analyzing the HTML document — an internal optimization tool for loading the HTML document quickly. The preload scanner works as follows.
  1. It reads ahead through the HTML and finds key resources declared via `link` `script` `img` tags and the like.
  2. Even before the main parser reaches those tags, and even while the parser is blocked on other work, the scanner pre-downloads any resources found in step 1.
  3. Even when rendering is blocked by CSS, JS, and so on, resources can be downloaded in parallel, improving page load speed.

  For details, please refer to the blog post below.

  [Understanding the browser's preload scanner and parsing behavior](https://yceffort.kr/2022/06/preload-scanner)

  This image currently has no preload hint, so the image isn't fetched until the parser reaches the image tag. If you add the following tag so the preload scanner can fetch it, the image can be downloaded in advance and performance improves.

  ```html
  <link
    rel="preload"
    as="image"
    href="https://cf.example.com/mercury/admin/4de275c6-3517-4316-bb45-78e9d80dfafb/7b253cc6-e4f8-459d-b869-4e37dee5a048.png?Expires=1721284816&Signature=hFDXxzCE0NmomVB-nhe0NR6FvA1ZwMVP6EDSFzU6dk5GhWVaQ7r6bXZZ-YQc0MQ7C-EGU4dW9dRUtDoFyVE-FL5HZhKSfv-VBqV4dHGhcfg3ObbeXH9~aG0X3UT8IJIILCqPfZDyrd59noaardQohENAUTgU6qum3kxkPw~fIRyqyBPBUkVDXMvePkenNd0hVq5KYggH44xZqr36L1JyHCslxN2WZlo504BCbQU9q1JARZc86ocwUgUaLfYf0cIe9YDpZBb3QotguVte5aC5TOh862N1XQ~P3CuC2Pcxdh9EUECwePqaSCuzE1KUnNC56qUfvJo7g9vHqbqqEquPqw__&Key-Pair-Id=K23149LG91UYF2&response-content-disposition=attachment%3B+filename*%3DUTF-8 7 7s3Path.png"
  />
  ```

  Here is the before and after of adding the tag above.

  ![image.png](./images/web-performance-analysis-2/image16.png)

  ![image.png](./images/web-performance-analysis-2/image17.png)

Merely adding this tag moved the image download priority up significantly, and you can see LCP also improved by nearly a second.

- `fetchpriority: 'high'` : A similar technique is adding this attribute to the image, but given the nature of a banner where the image's existence is only known after the scripts have all run, it doesn't seem like it would help much here.

  [Optimizing resource loading with the Fetch Priority API | Articles | web.dev](https://web.dev/articles/fetch-priority?hl=ko)

- Resize the image: The current image appears larger than the size at which it's displayed. It would be good to resize it appropriately to the size you want shown on the user's screen.

## 4-4. Video Resource Optimization

Your website also appears to use some video resources like the following.

```html
<video
  autoplay=""
  loop=""
  muted=""
  playsinline=""
  disablepictureinpicture=""
  width="100%"
  height="auto"
  src="https://cf.example.com/example.png"
></video>
```

These video resources can also affect performance, so let me offer a few pieces of advice.

- Use an appropriate size: The video appears larger than how it's displayed on mobile screens. It would be good to use the minimum resolution needed for the area where the video is shown, and the lowest bitrate possible without visible quality loss.
- Use `poster`: `video` has an attribute called `poster`. This attribute is the image shown when the video is paused or fails to play, and it also serves as the reference when the video is the LCP element. Please add this attribute to provide an optimized still image.
- Prevent CLS: Please specify the video's aspect-ratio explicitly in CSS to reserve the space before the video loads.

## 4-5. A Large Heading That Causes CLS

The large heading on your site currently appears to be causing CLS.

![image.png](./images/web-performance-analysis-2/image18.png)

![image.png](./images/web-performance-analysis-2/image19.png)

As you can see above, the heading area shifts significantly, and looking into the reason, I found the following.

```html
<!-- Font size when ko.html is loaded -->
<div
  letter-spacing="-0.02em"
  color="#242424"
  cursor=""
  text-decoration="none"
  style="font-size:50px"
  class="css-bygkac e1mepo3j0"
>
  플랫폼
</div>

<!-- Size that is finally rendered -->
<div
  letter-spacing="-0.02em"
  color="#242424"
  cursor=""
  text-decoration="none"
  style="font-size: 30px;"
  class="css-bygkac e1mepo3j0"
>
  플랫폼
</div>
```

```javascript
  {
    font: 'title_1_B',
    color: 'greyScale90',
    style: {
      fontSize: i ? '50px' : 'ko' === n ? '30px' : '24px',
    },
    children: e(i ? 'homeV2.example.title' : 'homeV2.example.titleMobile'),
  }
```

Roughly sketching out the logic, it looked like this.

- If the current environment is desktop, set 50px
- If not desktop, set 30px for ko, otherwise 24px

Circumstantially, this means the browser/mobile determination is happening on the client rather than the server. The font shrinks abruptly at the point client code runs, which negatively affects CLS.

Rather than deciding this in JavaScript, I recommend letting a CSS media query make the determination. CSS is parsed and applied far faster than JavaScript, and cleanly separating the concerns of styling and JavaScript lets JavaScript focus on interaction logic.

## 4-6. Fonts That Block Rendering

I confirmed that there is code at the top of the CSS that loads external fonts, as follows.

```css
@import 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=Noto+Sans+JP:wght@300;400;500;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap';
*,
:after,
:before {
  box-sizing: border-box;
  white-space: pre-wrap;
}
```

This code has the following problems.

- An `@import` rule inside a CSS file can block page rendering. The browser first downloads and parses this CSS file, and only when it encounters `@import` does it then request another CSS file from the Google Fonts server. That Google Fonts CSS file contains `@font-face` rules that download the actual font files (`woff2`, etc.). These multiple sequential request stages delay font loading, which can cause FOUT (Flash of Unstyled Text) or CLS (Cumulative Layout Shift). (`display=swap` induces FOUT, so text appears quickly, but the layout can shift when the font swaps in.)
- Loading many fonts**:** Noto Sans KR (Korean), JP (Japanese), and SC (Simplified Chinese) fonts are being loaded in multiple weights. If only some fonts are needed depending on the specific page or the user's language setting, downloading unnecessary fonts slows down the initial load. CJK (Chinese, Japanese, Korean) fonts have very large character sets and correspondingly large file sizes.

To fix the problems above, I propose the following.

- Switch to a `<link>` tag in the HTML `<head>`: Instead of `@import`, it's better to load fonts via a `<link>` tag in the `<head>` section of the HTML file. This lets the browser request the font CSS in parallel or earlier.
  `preconnect` establishes an early connection to the font server and can slightly improve download speed.

```html
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=Noto+Sans+JP:wght@300;400;500;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap"
    rel="stylesheet"
  />
</head>
```

- Load only the fonts you need, and font subsetting:
  - Selective loading: You could consider dynamically loading only the fonts for the language matching the user's locale, or initially loading only a minimal default font and loading the rest on demand.
  - Subsetting: For CJK fonts, creating a font file (subset) containing only the characters your website actually uses can greatly reduce the file size. (Google Fonts does some automatic subsetting, but it may not be perfect.) This is mainly something you can control more effectively when self-hosting fonts.

# 5. Closing

So far we've looked at the main factors degrading the performance of the `example.com` website: the excessive JavaScript problem and the inefficient handling of key resources (i18n data, images, fonts, and so on). I hope the suggested JavaScript optimization and loading improvements, along with the per-resource optimization measures, provide practical help in making the `example.com` website faster and more stable.

These small optimization efforts will accumulate to deliver a more satisfying experience to users, and that in turn will serve as an important foundation for the service's growth.

I'm rooting for `example.com`'s successful performance improvement journey, and I look forward to seeing the website continue to advance through ongoing attention and care. If you have any questions or need further support, please feel free to reach out anytime.

I'll wrap up here. Have a good night!
