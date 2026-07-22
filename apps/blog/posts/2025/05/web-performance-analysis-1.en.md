---
title: 'Web Service Performance Analysis (1)'
tags:
  - web-performance
  - react
  - frontend
published: true
date: 2025-05-06 16:39:31
description: 'Thank you for your interest. 🎉'
series: 'Web Service Performance Analysis'
seriesOrder: 1
---

## Feedback from the Developer

### Was the write-up helpful?

- I had been trying to work on performance optimization for a while — I bought Inflearn courses and read through Google's performance guides. But there was so much I didn't know that whenever I dug into one area, I'd end up drifting into another topic, and I'd finish projects with only half-baked knowledge, never actually fixing what needed fixing. It always left me with a nagging feeling, so I kept poking at it on weekends, wondering, "Why is performance optimization so hard?"
- The performance analysis I received this time became the perfect web performance optimization **guide** for me. Thanks to it, I was able to take a step forward. Thank you.

### Would you recommend this kind of performance analysis to other developers?

- Yes, I would. I recently visited Inflearn looking for a web performance optimization course, and there aren't many available.
- Also, rather than setting up an artificial performance optimization environment, you analyzed a site that could actually be used in real-world work, so I think it would be even more helpful to developers.
- If you publish a book, I'm definitely buying it!

## Additional Feedback

> It probably varies by site, but from your perspective, what is the criterion for judging that 100kb is large for a site without much complex functionality? I'm curious about these practical instincts, so it would be a big help if you could include them in the book!

https://httparchive.org/reports/state-of-javascript?start=earliest&end=latest&view=list#bytesJs

If you visit the site above, you can see the average JavaScript size of sites currently running on the web.
As of now it's around 680kb, so compared to that, your site is quite small. I actually left this part out — I'll add it!

> If an explanation of how to understand the call stack were included, I think it would be a real eureka moment for developers like me who didn't know much about it.

I think I rushed through that part, introducing it only to the extent of "18 function calls happen to draw this image." I'll flesh this out later =)

> For packages other than react and react-dom that trigger large-size warnings at build time → in these cases, is carefully splitting them with dependencies in mind the only option?

Yes! I'd say this part is purely a matter of developer preference. In my case, in a past create-react-app-based project, I split the code related to webpack, react, and react-dom into a separate chunk called `framework.js`. I split them this way because these three packages rarely change compared to the code I wrote myself or packages installed as needed. Similarly, for packages that you expect to change very rarely, I'd suggest splitting them into separate chunks so users can benefit from browser caching.

> Beyond react-device-detect → should I understand this as meaning that, going forward, when time allows, I should implement things myself rather than using libraries?!

Personally, I think this is a matter of taste. If development speed and fast deployment matter, installing a stable package is better; if you really want to squeeze out performance, or you use only a small fraction of a package relative to its size, then internalizing it is better. Before using a package, I always carefully review its size and internals on https://bundlephobia.com/ before installing.

---

> The following is the write-up actually delivered to the developer. Information such as the site address and images has been redacted.

# https://example.com Performance Analysis

# 1. Summary

I analyzed the performance of the `https://example.com` website you requested. Overall, there is plenty of room to improve the website's loading speed and user experience.

The key metric LCP (Largest Contentful Paint) currently measures around 3–4 seconds, and CLS (Cumulative Layout Shift), which quantifies how much elements on the screen move unexpectedly, came out to 0.272 — both metrics indicate a need for improvement to enhance the user experience.

The analysis identified the following as the biggest performance bottlenecks.

- **Delayed initial image loading (LCP)**: It takes a while for the key above-the-fold image (`/webp/part1/time.webp`) to appear. Due to the structure of the website, the browser must first process the related JavaScript code before it can load the image.
- **Layout instability (CLS)**: When the image above loads, its dimensions are not specified in advance, which is the primary contributor to the CLS score.

To resolve these issues and provide a smoother website experience, I propose the following improvements as priorities.

1. **Preload the key image (`<link rel="preload">`)**: Have the browser download the most important LCP image ahead of other work, speeding up when it appears on screen.
2. **Reserve space for the image in advance (CLS improvement)**: Specify size (width/height) information on the image tag so the layout doesn't shift when the image loads. (I confirmed that applying preload also partially mitigates this issue.)
3. **Split the JavaScript code (Code Splitting)**: Reduce the amount of JavaScript needed for initial loading to lighten the browser's workload, and load the necessary code faster in parallel to improve overall responsiveness.

Applying these recommendations should significantly improve the website's performance and user satisfaction. The detailed analysis and concrete methods are explained in the following sections.

# 2. Analysis Overview

I examined the website as deployed on April 29, 2025.

![image.png](./images/web-performance-analysis-1/image.png)

The tools used for the analysis are as follows.

- chrome dev tool
- webpagetest

# 3. Website Analysis

## Key Frameworks and Libraries

1. `react`, `react-dom`: Inside the index file, I found comments and functions that appear to be React code, along with JSX. The version you're using appears to be 18.3.1.
2. `styled-components`: I confirmed usage of variable names such as `data-styled` and `styledComponentId`, as well as `styled.`. The version in use is 6.1.14.
3. `react-router`: `useNavigate` and `useLocation` are hooks widely used in `react-router`, and I also confirmed the presence of `<Router>` through error messages used internally. The version in use is 7.1.3.
4. `us-parser-js`: A library for UserAgent analysis. I confirmed the existence of methods related to the `UAParser` object. It doesn't seem like you intended to install this package — it appears to have been installed as a dependency of `react-device-detect`, discussed below.
5. `react-modal`: I could tell from the presence of class names like `ReactModal__Overlay` and `ReactModal__Content`, which are used almost as reserved words in `react-modal`.
6. `react-device-detect`: I confirmed variable names distinctive to `react-device-detect`, such as `BrowserView` and `isMobile`.
7. `vite`: For the bundler, there is no explicit marker in the source code that identifies it directly, but at the beginning of the file I found `modulepreload`-related code that suggests `vite` was used. This code checks for the existence of `modulepreload` and attempts to apply a polyfill if the browser doesn't support it — this is one of the most noticeable signatures in web applications built with `vite`.

## Build Environment

Based on what I've mentioned above, this looks like a React project built with `create-vite`, most likely without significant changes to the default configuration.

## Deployment Environment

It appears to be deployed via Amazon CloudFront from the Seoul region.

```bash
ping example.com
PING example.com (0.0.0.0): 56 data bytes
```

[IP Address Lookup for 0.0.0.0 in Icheon, Korea (the Republic of)](https://whatismyipaddress.com/ip/0.0.0.0)

# 4. Key Concerns

## Improving the LCP Score

LCP (Largest Contentful Paint), as you know well, is the first of the Core Web Vitals — a metric that measures how quickly a page feels like it loads from a user experience perspective. It measures how long it takes for the largest content element within the viewport to be rendered on screen. As with all metrics, the faster the LCP, the faster the page feels.

The LCP score I measured on my end is around 3–4 seconds, so as you've sensed, it's in need of improvement. The element affecting LCP is `/webp/part1/time.webp`, and I investigated the causes based on it.

### JavaScript Bundle Size and Execution Delay

`index-mSjck-Fi.js` is about 100kb in total, which is on the large side for a static website without much complex functionality. The reason is that beyond the code responsible for the service's logic (i.e., the code you wrote yourself), it also includes all the framework code such as `react`, `react-dom`, and `styled-components`. Because there is no code splitting, you can't benefit from parallel downloads, and the fact that every resource depends on this single JavaScript file is clearly not good for performance.

Strictly speaking, 100kb isn't a large file by today's frontend standards — the problem is that this service is a single-page application. Since it can't benefit from SSR at all, the timing of when the image is drawn depends entirely on the JavaScript, and the more the JavaScript parsing is delayed, the later the LCP image gets drawn.

![image.png](./images/web-performance-analysis-1/image1.png)

The screenshot above shows the site's performance measured with Chrome DevTools. Since all images are recognized and executed only after the JavaScript resource has loaded, we can see that all the code needed to render the images runs only after the JavaScript is downloaded and evaluated.

![image.png](./images/web-performance-analysis-1/image2.png)

The screenshot above is from the Network tab of Chrome DevTools, where you can check where the image was loaded from. The `initiator` is the party that loaded the resource — clicking on it shows which code loaded the image.

![image.png](./images/web-performance-analysis-1/image3.png)

And if you set a Chrome debugger breakpoint here, you can inspect the call stack leading up to this function call.

![image.png](./images/web-performance-analysis-1/image4.png)

The call stack is about 18 frames deep, meaning a total of 18 function calls are needed to reach the point where this image is drawn. Considering the library situation above and the current setup, the process leading up to those 18 function calls probably looks like this.

1. `createRoot`
2. Root React component rendering begins
3. Component tree traversal
4. React Router processing
5. Component tree rendering
6. Rendering of the component containing the LCP
7. Rendering of the image component (`bn`) ⇒ I believe this is the part you mentioned in your email.
8. `<img/>` tag creation and image request

Of course, 18 levels isn't particularly deep from the perspective of a single-page React app, but it's undeniable that it affects LCP.

## Solutions

Based on the analysis above, I propose the following solutions.

### 1. Migrating to SSR or SSG

Adopting a React-based server-side rendering framework such as Next.js or Remix would easily solve the problem above. With SSR, the image's initiator becomes HTML instead of JS, so the image can be loaded quickly without waiting for JavaScript. Of course, this has downsides — it would require restructuring the project and provisioning infrastructure to deploy it — so it would be difficult to apply right away.

### 2. Applying Preload to the LCP Image

Browsers have a special mechanism called the preload scanner. The preload scanner is an auxiliary scanner that operates alongside the main parser that analyzes the HTML document — an internal optimization tool for loading HTML documents quickly. The preload scanner performs the following.

1. It reads ahead through the HTML, finding key resources declared with tags such as `link`, `script`, and `img`.
2. Even before the main parser reaches those tags — and even if the parser is stalled on other work — the scanner downloads any resources found in step 1 in advance.
3. Even when rendering is blocked by CSS, JS, etc., resources can be downloaded in parallel, improving page load speed.

For details, please refer to the blog post below.

[Understanding the browser's preload scanner and parsing behavior](https://yceffort.kr/2022/06/preload-scanner)

The LCP image currently cannot be picked up by the preload scanner. That's because the very existence of the image only becomes known once all the JS has been evaluated. If you add a `<link rel="preload" as="image" href="/webp/part1/time.webp">` tag to the HTML `<head>` so the browser can download the image in advance without waiting for JS execution, the image can be loaded much faster — even if the moment it's inserted into the DOM still comes after JS execution. Below are before-and-after examples of applying the link tag on your site.

![image.png](./images/web-performance-analysis-1/image5.png)

Before applying it, as you already know, the image download is scheduled after JS execution. That's because the browser only becomes aware of the image's existence after that point.

![image.png](./images/web-performance-analysis-1/image6.png)

But after adding the `link` tag so the preload scanner can recognize it, the situation changed considerably. You can see that even while the JS is being downloaded and parsed, the ~100kb image is being downloaded in parallel. This is evidence that the image was scanned and downloaded in advance by the preload scanner, and even though the image insertion still happens after the JS, the rendering will be much faster.

The preload scanner can be used not just for the LCP image but also for the various other images visible in that screenshot. For important images that will definitely load on the page and may fall within the viewport, please consider using this technique — beyond removing the `lazy` attribute as you've already done.

If you'd like to learn more about LCP, I recommend the following blog post.

[Optimizing Largest Contentful Paint (LCP)](https://yceffort.kr/2022/06/optimize-LCP)

### 3. Using the avif Format

avif is generally known to have better compression than webp. However, browser support is a bit tighter, so I recommend reviewing this carefully.

[AVIF vs. WebP: 4 Key Differences and How to Choose](https://cloudinary.com/guides/image-formats/avif-vs-webp-4-key-differences-and-how-to-choose#3-browser-support)

### 4. Implementing Code Splitting

As mentioned earlier, `index-mSjck-Fi.js` currently contains a lot of code that isn't essential for initial loading (modals, etc.). It's important to split out only the code needed for initial data loading into separate chunks. Doing so reduces the JS size needed for initial loading, shortening parse and execution time, which can significantly pull forward when the LCP image starts rendering. `vite` supports various tools for code splitting, so I believe you'll be able to do this without much difficulty.

Another benefit of chunk splitting is minimizing the blast radius for users on new deploys. For example, suppose you fix one tiny piece of code and deploy it. In the current structure, all changes live in a single chunk, so it would result in a new `index.js`, and users end up unable to benefit from caching. What if framework-type libraries with very few changes, like `react` and `react-dom`, were split into a separate chunk? That chunk, once uploaded to the CDN, can keep its cache strategy intact unless a version upgrade happens, so even after a new deploy, page load speed remains fast.

Excessive code splitting can be poisonous for services with many pages, but with the current service structure, I believe you'll be able to enjoy plenty of benefits.

## Improving the CLS Score

CLS is a key metric that measures the visual stability of a web page. It quantifies how much content (elements) unexpectedly shift position for the user while the page is loading. For example, you're reading text when an image suddenly loads and pushes the text down, or you're about to press a button when its position suddenly changes — these phenomena fall under CLS. A low CLS score means a stable, good user experience.

I confirmed that the element affecting CLS in this service is also `/webp/part1/time.webp`. Therefore, fixing the issues related to this image will naturally improve the CLS score as well.

## Solutions

### The Preload Scanner and Image Dimensions

The solution to this problem is also tied to LCP — more precisely, to the preload scanner. I mentioned earlier that the preload scanner scans images in advance; it doesn't just scan and download images ahead of time, it also learns the image's dimensions in advance. The reason CLS currently occurs is that the image download is late, and the image's dimensions are also discovered late — the size is only known after the image is downloaded, and only then is space in the HTML reserved to match that image size, which causes the shift. This problem is made worse by the fact that the `<img>` tag has no size attributes.

![image.png](./images/web-performance-analysis-1/image7.png)

But what if the preload scanner downloads the image in advance and learns its dimensions too? The moment the image is set as `src` on the `img`, the browser already knows how much space the `img` should occupy in the DOM — a big advantage, since it no longer has to wait for the image download to calculate CLS.

In fact, if you add the image via a `<link>` tag so the preload scanner recognizes it and then compare Lighthouse results, you can see the CLS score come out as 0.

![image.png](./images/web-performance-analysis-1/image8.png)

![image.png](./images/web-performance-analysis-1/image9.png)

In short, you can think of the current CLS of 0.272 as the time spent downloading `/webp/part1/time.webp` and figuring out its dimensions. So to fix CLS, you should look at the following two things.

- Add `width` and `height` to the `img`, or CSS `aspect-ratio`. This lets the browser reserve the DOM space for rendering the image in advance, reducing CLS.
- If you let the preload scanner scan the image ahead of time, the image's dimensions become known in advance.

## I Want to Reduce the Bundle Size

JavaScript bundle size is an important factor affecting web service performance. Because it comprehensively affects download, parsing, and execution, reducing this size can dramatically improve performance. Since I can't know the exact state of your code, I can't give precise guidance, but I'll speak based on what I've confirmed so far.

### 1. Internalizing Libraries That Are Disproportionately Large for Their Usage

Let me start with `react-device-detect` as an example. I don't know exactly how much of it you use, but judging from the source code, it appears to be just `isMobile` and `isTablet`. Personally, I think installing `react-device-detect` just to determine those two values is too heavy.

[react-device-detect v2.2.3 ❘ Bundlephobia](https://bundlephobia.com/package/react-device-detect@2.2.3)

![image.png](./images/web-performance-analysis-1/image10.png)

![image.png](./images/web-performance-analysis-1/image11.png)

`react-device-detect` and its dependency `ua-paser-js` embed many constants for analyzing a wide range of UAs, and most projects probably don't use all of that. If the internal code really is only used for mobile/tablet branching, I'd recommend removing `react-device-detect` and internalizing it yourself. It seems the purpose was probably integration with `styled-components` — if that's the goal, using media queries natively supported by the browser is far better.

Beyond `react-device-detect`, if time and circumstances allow, I recommend implementing things yourself rather than installing from npm. Implementing them yourself costs time and effort and may be less stable, but by doing so you can understand how the functionality fundamentally works, and furthermore extract only the code you need to optimize performance and bundle size.

It looks like you implemented the vertical carousel yourself. I believe what you learned by implementing that feature directly can carry over to learning in other areas through the work above.

### 2. Removing react-router

From what I can tell, this service appears to be just a single page. If so, I'm not sure why `react-router` is being used. Most of the unused resources showing up in coverage seem to be attributed here. If it's for future service scalability, you could keep it, but in the current structure it was hard to feel it was really needed.

If there's one meaningfully used feature, it's the code that redirects everything under the `/*` route to `/`.

![image.png](./images/web-performance-analysis-1/image12.png)

This can be handled with `react-router` as shown above, but it's far more effective to handle it on the server side by adding a rule to your hosting server — nginx, Netlify, Vercel, etc. I suggest considering handling this history fallback on the server instead of in `react-router`. That way you can remove `react-router`, reduce the JS bundle size, and improve execution speed.

Looking a bit further, it seems you're deploying via Amazon CloudFront. I don't remember exactly, but I believe you could configure path routing for resources that haven't been uploaded under distributions > error pages. You should be able to sort this out by adjusting that setting.

### 3. Code Splitting

You mentioned that you've done a lot of code splitting with `React.lazy`. The code splitting currently needed, as mentioned above, appears to be bundler-level code splitting. The difference between the two is as follows.

- **`vite`** code splitting: A build-time operation where the build tool decides how to divide the code and actually separates the files.
- `React.lazy`: A runtime mechanism where the React application decides when and which components to load dynamically.

I can't know the current structure exactly, but it seems `React.lazy` is probably being used for straightforward lazy loading rather than conditional loading.

As explained earlier, the `index-mSjck-Fi.js` file is a huge single bundle that combines nearly all the JS code needed to run the website (React, other libraries, all page sections and feature code, etc.). When the browser first loads the website, it must download, parse, and execute this one large file in its entirety before it can show the first screen. This process is sequential and time-consuming, making it a major cause of slow initial loading (FCP, LCP, etc.). Performing code splitting brings the following benefits.

1. Reduced initial load size: When a user first visits the website, there's no need to load all the code at once. Only a small initial chunk containing the minimum code needed to show the first screen is loaded first. This greatly reduces the initial download size and shortens JavaScript parse and execution time, letting users see the first screen much faster.
2. Leveraging parallel downloads of JavaScript bundles:
   - Modern web browsers can generally download multiple files simultaneously (typically 6 per domain on HTTP/1.1, more on HTTP/2 and above).
   - Before code splitting: The browser downloads **only one** large `index-mSjck-Fi.js` file. Because the file is large, the download takes long, and the browser's parallel download capability can't be properly leveraged for JavaScript loading.
   - After code splitting: The browser first quickly downloads the small initial chunk(s). Then, when the user navigates to another page or tries to use a specific feature (e.g., opening a modal, scrolling to a specific section), only the necessary code pieces (chunks) are additionally requested. At this point, the browser can download multiple small chunk files simultaneously in parallel.
   - Downloading multiple files simultaneously can greatly reduce total download time compared to sequentially downloading one large file. Network bandwidth is used far more efficiently. This provides a faster, smoother user experience not just for initial loading but also when loading code needed while using the website.

The current project is likely suffering from slow initial loading because the large single JavaScript bundle prevents it from properly leveraging the browser's parallel download benefits. Applying code splitting will not only reduce the amount of code needed for initial loading but also allow needed chunks to be downloaded efficiently in parallel, greatly improving overall website performance including LCP. Therefore, code splitting appears to be an essential optimization for this project.

# 5. Other Advice

## Using Source Maps

The code I analyzed is minified, making debugging and performance profiling very difficult. Of course, the principle is not to expose source maps in the real environment that users actually use. However, if you have a development/staging environment, it's good to upload source maps there so you can diagnose problems and find performance bottlenecks more easily against the original code.

## Mobile First

The analysis report did consider the mobile environment, but it's important to prioritize checking mobile in actual performance testing and optimization. Because network and device performance constraints are greater than on desktop, bottlenecks can stand out more prominently. Performance analysis is very demanding and time-consuming work, so I recommend prioritizing mobile when reviewing performance improvements.

## Continuous Monitoring

Rather than stopping at a one-off improvement, it's good to build a system that continuously measures website performance.

[Lighthouse CI Action - GitHub Marketplace](https://github.com/marketplace/actions/lighthouse-ci-action)

[https://github.com/NaverPayDev/size-action](https://github.com/NaverPayDev/size-action)

[Bundle size diff - GitHub Marketplace](https://github.com/marketplace/actions/bundle-size-diff)

[](https://www.webpagetest.org/)

The tools above are ones I've used at least once, or continuously on projects. The GitHub Actions ones in particular are very useful because you can continuously check how much each of your PRs actually affects production.

Please use tools like these to keep measuring your performance improvements over time.

# 6. Closing

Thank you for giving me the opportunity to look into the performance of the `https://example.com` website. The analysis uncovered several points where the user experience can be further improved in terms of initial load speed (LCP) and visual stability (CLS).

In particular, I believe optimizing how the initial JavaScript loads and how the LCP image is handled can have a positive impact. Considering the methods proposed in this report — applying preload to the LCP image, setting explicit image dimensions, and JavaScript code splitting — should help improve the service.

This is my first time doing a proper performance analysis, so the analysis may be somewhat lacking or insufficient in places. I ask for your generous understanding of this rough write-up, and if there's anything in the report you're curious about or would like to discuss further, please feel free to reach out anytime.

I sincerely hope this analysis can contribute, even in a small way, to improving and advancing your website's performance.
