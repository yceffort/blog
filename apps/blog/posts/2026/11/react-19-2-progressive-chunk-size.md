---
title: '<em>Suspense</em>로 감싼 정적 페이지의 본문은 왜 hidden div에 들어가는가'
tags:
  - react
  - debugging
  - nextjs
  - blogging
  - html
published: true
date: 2026-11-09 19:27:00
updated: 2026-11-09 19:39:31
description: 'React 19.2부터 Suspense로 감싼 내용은 렌더가 끝난 정적 페이지에서도 hidden 요소로 분리돼 나갈 수 있다. 이 블로그의 글 본문이 5월부터 11월 초까지 그렇게 나간 과정을 React 소스, 버전별 재현, 웨이백 머신에 남은 HTML로 추적했다.'
art:
  undraw: files-missing
---

## Table of Contents

## 본문을 감싼 두 커밋

올해 이 블로그에는 Suspense 경계를 만드는 커밋이 두 번 들어갔다. 5월 1일에는 글 경로에 `loading.tsx`를 추가했고, 8월 10일에는 루트 레이아웃에서 페이지 전체를 `<Suspense fallback={null}>`로 감쌌다. 앞의 것은 Next.js 문서가 안내하는 대로 쓴 코드이고 뒤의 것은 내가 잘못 쓴 코드인데, 결과는 같았다. 빌드 때 렌더가 끝난 정적 페이지인데도 본문이 `hidden` 속성이 붙은 `<div>`로 옮겨져 나갔다.

브라우저에서는 스크립트가 본문을 원래 위치로 되돌려 놓기 때문에 화면으로는 알 수 없었다. 11월 초에 JavaScript를 실행하지 않는 환경에서 본문이 나오지 않는 것을 우연히 보고서야 알았다.

첫 번째 커밋 [`a111fed6`](https://github.com/yceffort/blog/commit/a111fed64721d6896a7162a471149fccc28e0e11)은 글을 처음 렌더하는 동안 보여 줄 스켈레톤이다. 한국어와 영어 글 경로에 `loading.tsx`를 하나씩 추가했다.

```tsx
export default function PostLoading() {
  return (
    <div className="page-view relative" aria-busy="true">
      <div className="post-back" aria-hidden="true">
        <span className="dot" />
        <span style={{visibility: 'hidden'}}>BACK TO INDEX</span>
      </div>
```

두 번째 커밋 [`10c5ed9b`](https://github.com/yceffort/blog/commit/10c5ed9b39b88a096f8a65b483d4ceae8c6f6ac3)은 레이아웃에서 `usePathname()`을 쓰는 컴포넌트를 경계로 감쌌다.

```diff
-          <NavigationDirection />
+          <Suspense fallback={null}>
+            <NavigationDirection />
+          </Suspense>
           <AmbientEffects />
           <Providers>
-            <LayoutWrapper>{children}</LayoutWrapper>
+            <Suspense fallback={null}>
+              <LayoutWrapper>{children}</LayoutWrapper>
+            </Suspense>
           </Providers>
```

두 커밋 모두 화면에서는 문제를 만들지 않았다. 달라진 것은 서버가 내보내는 HTML이었다.

## 두 커밋이 만든 HTML

같은 글(`/2026/03/why-still-nextjs`)의 HTML을 시점별로 받아, `hidden` 요소 밖에 있는 글자와 안에 들어 있는 글자를 따로 셌다. JavaScript를 실행하지 않는 클라이언트가 원래 위치에서 받는 텍스트가 `hidden` 요소 밖의 글자다. 8월 10일 이후의 프로덕션 HTML은 남아 있지 않아서 수정 직전 커밋을 로컬에서 빌드해 받았다.

| 시점          | HTML을 받은 곳                                                                                            | `hidden` 요소 밖의 글자 | `hidden` 요소 안의 글자 |
| ------------- | --------------------------------------------------------------------------------------------------------- | ----------------------: | ----------------------: |
| 4월 20일      | [웨이백 머신](https://web.archive.org/web/20260420004339id_/https://yceffort.kr/2026/03/why-still-nextjs) |                  12,686 |                       0 |
| 5월 2일       | [웨이백 머신](https://web.archive.org/web/20260502034722id_/https://yceffort.kr/2026/03/why-still-nextjs) |                     197 |                  12,680 |
| 7월 10일      | [웨이백 머신](https://web.archive.org/web/20260710144307id_/https://yceffort.kr/2026/03/why-still-nextjs) |                     205 |                  13,111 |
| 11월 2일 커밋 | `b6b64e47` 로컬 빌드                                                                                      |                       0 |                  13,348 |
| 11월 9일      | 프로덕션                                                                                                  |                  13,348 |                       0 |

다른 글의 스냅샷도 같았다. 3월 5일과 4월 20일의 스냅샷 2개는 본문이 원래 위치에 있었고, 5월 2일부터 8월 7일 사이의 스냅샷 11개(글 8편)는 전부 `hidden` 요소 밖의 글자가 197~205자였다. 8월 11일부터 11월 3일 사이의 스냅샷은 웨이백 머신에 없다.

5월 2일 스냅샷에서 본문이 있어야 할 곳과 문서 뒤쪽을 줄여서 적으면 다음과 같다.

```html
<main id="main">
  <!--$?--><template id="B:1"></template>
  <div class="page-view relative" aria-busy="true"><!-- 스켈레톤 --></div>
  <!--/$-->
</main>
<!-- 푸터와 스크립트 -->
<div hidden id="S:1"><!-- 글 본문 --></div>
<script>/* $RB, $RV, $RC 정의 */ $RC("B:1","S:1")</script>
```

11월 2일 커밋의 빌드는 경계가 `<body>` 바로 아래에 있고 폴백이 `null`이어서 경계 안이 비어 있다. 헤더와 푸터까지 `hidden` 요소로 들어갔다.

```html
<body>
  <!-- 테마 초기화 스크립트 -->
  <!--$?--><template id="B:0"></template><!--/$-->
  <script>requestAnimationFrame(function(){$RT=performance.now()});</script>
  <div hidden id="S:0">
    <a href="#main" class="skip-link">본문으로 건너뛰기</a>
    <header>...</header>
    <!-- 글 본문과 푸터 -->
  </div>
  <script>/* $RB, $RV, $RC 정의 */ $RC("B:0","S:0")</script>
</body>
```

각 조각의 문자열은 React의 서버 렌더러인 Fizz가 쓰는 것이고, [`ReactFizzConfigDOM.js`](https://github.com/react/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-dom-bindings/src/server/ReactFizzConfigDOM.js#L4647-L4655)에 상수로 정의돼 있다.

```js
// Suspense boundaries are encoded as comments.
const startCompletedSuspenseBoundary = stringToPrecomputedChunk('<!--$-->');
const startPendingSuspenseBoundary1 = stringToPrecomputedChunk(
  '<!--$?--><template id="',
);
const startPendingSuspenseBoundary2 = stringToPrecomputedChunk('"></template>');
const startClientRenderedSuspenseBoundary =
  stringToPrecomputedChunk('<!--$!-->');
const endSuspenseBoundary = stringToPrecomputedChunk('<!--/$-->');
```

```js
const startSegmentHTML = stringToPrecomputedChunk('<div hidden id="');
const startSegmentHTML2 = stringToPrecomputedChunk('">');
const endSegmentHTML = stringToPrecomputedChunk('</div>');
```

`<!--$-->`는 Suspense 경계의 내용이 원래 위치에 그대로 쓰였다는 표시다. `<!--$?-->`는 내용이 아직 도착하지 않은 경계라는 표시이고, 바로 뒤의 `<template>`이 경계의 위치를 가리킨다. 폴백이 있으면 그 뒤에 이어진다. 실제 내용은 `<div hidden>`으로 시작하는 세그먼트에 들어 있고, 마지막 스크립트의 `$RC`가 경계와 내용을 연결한다.

`$RC`는 [`completeBoundary`](https://github.com/react/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-dom-bindings/src/server/fizz-instruction-set/ReactDOMFizzInstructionSetShared.js#L408-L461)를 압축한 함수다. 경계와 내용을 찾아 대기열 `$RB`에 넣고, 첫 프레임이 그려지기 전이면 `requestAnimationFrame`에 공개 함수 `$RV`를 예약한다.

```js
  // Mark this Suspense boundary as queued so we know not to client render it
  // at the end of document load.
  const suspenseNodeOuter = suspenseIdNodeOuter.previousSibling;
  suspenseNodeOuter.data = SUSPENSE_QUEUED_START_DATA;
  // Queue this boundary for the next batch
  window['$RB'].push(suspenseIdNodeOuter, contentNodeOuter);

  if (window['$RB'].length === 2) {
    // This is the first time we've pushed to the batch. We need to schedule a callback
    // to flush the batch. This is delayed by the throttle heuristic.
    if (typeof window['$RT'] !== 'number') {
      // If we haven't had our rAF callback yet, schedule everything for the first paint.
      requestAnimationFrame(window['$RV'].bind(null, window['$RB']));
    } else {
```

`$RV`에 해당하는 [`revealCompletedBoundaries`](https://github.com/react/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-dom-bindings/src/server/fizz-instruction-set/ReactDOMFizzInstructionSetShared.js#L32-L100)는 폴백 노드를 지우고 `hidden` 요소의 자식을 경계 안으로 옮긴 다음, 주석을 `<!--$-->`로 바꾼다.

```js
    // Insert all the children from the contentNode between the start and end of suspense boundary.
    while (contentNode.firstChild) {
      parentInstance.insertBefore(contentNode.firstChild, endOfBoundary);
    }

    suspenseNode.data = SUSPENSE_START_DATA;
```

브라우저는 HTML을 읽다가 이 스크립트를 만나면 바로 실행하고, 첫 프레임 전에 대기열에 들어간 경계는 첫 `requestAnimationFrame`에서 한꺼번에 옮겨진다. 사람이 보는 화면으로는 차이를 알기 어렵다. 스크립트를 실행하지 않는 클라이언트에는 `<template>`과 `hidden`이 붙은 `<div>`가 그대로 남는다.

`<head>`는 경계 밖이어서 제목, 설명, OG 이미지 태그는 정상이었다. 링크 미리보기처럼 `<head>`만 읽는 수집기는 영향을 받지 않고, 본문 텍스트를 읽어 가는 수집기만 다른 결과를 받는다. `hidden` 속성이 붙은 요소의 텍스트를 읽을지는 수집기의 구현에 달려 있는데, 수집기별로 어떻게 처리하는지는 조사하지 않았다. 검색이 받은 영향도 확인하지 않았다. 구글은 [JavaScript를 렌더링한 결과로 색인한다고 안내](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)하고 있어서 영향이 없었을 가능성이 높다고 생각하지만, 서치 콘솔에서 확인한 것은 아니다.

## 관례를 따른 `loading.tsx`

첫 번째 커밋에는 `<Suspense>`라는 글자가 없다. 경계는 Next.js가 만든다. [공식 문서](https://nextjs.org/docs/app/api-reference/file-conventions/loading)는 이렇게 설명한다.

> In the same folder, `loading.js` will be nested inside `layout.js`. It will automatically wrap the `page.js` file and any children below in a `<Suspense>` boundary.

5월 2일 스냅샷의 모양이 이 설명과 일치한다. 경계 위치에는 `loading.tsx`의 스켈레톤이 폴백으로 들어가 있고, 본문 12,680자는 `<div hidden id="S:1">`에 있다. `hidden` 요소 밖의 197자는 헤더와 푸터, 그리고 스켈레톤에 들어 있는 고정 문구다. 스켈레톤 문구 중에는 `visibility: hidden`으로 가려 둔 것도 있어서 화면에 보이는 글자 수와는 다르다.

이 커밋은 Next.js 문서가 안내하는 관례를 그대로 쓴 것이다. 그것만으로 글 본문은 8월 10일 커밋 전부터 `hidden` 요소로 나가고 있었다. 레이아웃을 잘못 감싸지 않았더라도 글 페이지에서는 같은 일이 벌어졌다는 뜻이다.

10월 26일의 [`5da53183`](https://github.com/yceffort/blog/commit/5da5318379046a2e62ce590a29621d762252c937)에서는 스켈레톤 대신 클릭한 링크 아래에 대기 표시를 띄우도록 바꾸면서 `loading.tsx`를 지웠다. 두 번째 커밋이 없었다면 이때 글 본문은 원래 위치로 돌아왔을 것이다. 실제로는 레이아웃의 경계가 남아 있어서 달라진 것이 없었다.

## 잘못 감싼 레이아웃

두 번째 커밋은 Next.js를 16.2.12에서 16.3.0으로 올린 다음 날 들어갔다. 16.3은 Instant Navigations 검증을 도입했고, [문서](https://nextjs.org/docs/messages/blocking-prerender-client-hook)에 따르면 `usePathname()`은 동적 매개변수가 있고 요청마다 렌더되는 경로에서 이 검증에 걸린다. 이 블로그는 `cacheComponents: true`였고, 글 경로 `/[year]/[...slug]`는 일부만 사전 생성하고 나머지는 요청이 올 때 렌더했다. 이 조건에서 16.3.0의 개발 서버가 낸 오류가 다음과 같다.

```text
Error: Route "/[year]/[...slug]": Next.js encountered URL data `usePathname()` in a Client Component outside of `<Suspense>`.

This blocks prerendering because the value is only available at runtime.

Ways to fix this:
  - [stream] Wrap the component in `<Suspense fallback={...}>` so the hook value streams in after prerendering
  - [block] Set `export const instant = false` to allow a blocking route

Learn more: https://nextjs.org/docs/messages/blocking-prerender-client-hook
```

업그레이드 직전 커밋과 직후 커밋을 각각 받아 개발 서버를 띄워 보면, `usePathname()`을 쓰는 코드는 그대로인데 16.2.12에서는 오류가 없고 16.3.0에서는 이 오류가 나온다. `next build`는 Suspense 없이도 통과했다. 커밋 메시지는 "Wrap usePathname consumers in Suspense"이고, 오류가 안내한 첫 번째 방법대로 `usePathname()`을 쓰는 세 곳을 감쌌다.

세 곳 중 문제가 된 것은 `LayoutWrapper` 하나다. 나머지 둘은 화면에 아무것도 그리지 않는 컴포넌트여서 내용이 0바이트이고, HTML에도 빈 `<!--$--><!--/$-->`로 그대로 쓰여 있었다. `LayoutWrapper`는 헤더와 `{children}`, 푸터를 전부 품고 있어서 이때부터 글뿐 아니라 모든 페이지에서 `hidden` 요소 밖의 글자가 0자가 됐다. 수정 직전 커밋의 로컬 빌드에서 글 6편과 홈, `/about`, `/series`, 404 페이지를 받아 확인한 결과다.

이 커밋은 내가 코드를 잘못 쓴 경우에 가깝다. 당시 `LayoutWrapper`는 경로에 따라 컨테이너 폭을 정하려고 `usePathname()`을 읽었고, 같은 컴포넌트가 헤더와 `<main>{children}</main>`, 푸터까지 렌더했다. 경로를 읽는 컴포넌트가 본문까지 감싸는 구조였으니, 오류의 안내대로 그 컴포넌트를 경계로 감싸면 본문도 함께 경계 안에 들어간다. 16.2.12까지는 이 구조에 아무 경고가 없었고, 16.3.0에서 오류가 나오자 구조는 그대로 둔 채 가장 바깥에서 감싸는 것으로 넘어갔다. 경로에 따라 달라지는 부분을 본문과 분리했다면 경계가 본문을 품을 일은 없었을 것이다. 폴백을 `null`로 준 것도 같은 문제다. 스크립트가 실행되기 전까지 경계 위치에는 아무것도 남지 않는다.

## 완성된 경계를 분리하는 조건

두 커밋의 공통점은 본문이 Suspense 경계 안에 들어갔다는 것 하나다. 다만 두 경우 모두 기다릴 데이터가 없었다. 글은 빌드 때 렌더가 끝난 정적 페이지인데, HTML에는 데이터를 기다리는 경계에 쓰는 `<!--$?-->` 표시가 붙어 있다.

경계를 HTML로 쓰는 [`flushSegment`](https://github.com/react/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-server/src/ReactFizzServer.js#L5897-L5937)를 보면 경계는 네 가지 경우로 나뉜다. 클라이언트에서 다시 렌더할 경계와 아직 끝나지 않은 경계가 앞의 두 가지이고, 렌더가 끝난(`COMPLETED`) 경계가 다시 두 가지로 나뉜다.

```js
  } else if (
    // We don't outline when we're emitting partially completed boundaries optimistically
    // because it doesn't make sense to outline something if its parent is going to be
    // blocked on something later in the stream anyway.
    !flushingPartialBoundaries &&
    isEligibleForOutlining(request, boundary) &&
    (flushedByteSize + boundary.byteSize > request.progressiveChunkSize ||
      hasSuspenseyContent(boundary.contentState, flushingShell) ||
      boundary.defer)
  ) {
    // Inlining this boundary would make the current sequence being written too large
    // and block the parent for too long. Instead, it will be emitted separately so that we
    // can progressively show other content.
    // We add it to the queue during the flush because we have to ensure that
    // the parent flushes first so that there's something to inject it into.
    // We also have to make sure that it's emitted into the queue in a deterministic slot.
    // I.e. we can't insert it here when it completes.

    // Assign an ID to refer to the future content by.
    boundary.rootSegmentID = request.nextSegmentId++;

    request.completedBoundaries.push(boundary);
    // Emit a pending rendered suspense boundary wrapper.
    writeStartPendingSuspenseBoundary(
      destination,
      request.renderState,
      boundary.rootSegmentID,
    );
```

조건에 걸린 경계는 렌더가 끝났어도 대기 중인 경계와 같은 `<!--$?-->` 표시로 쓰이고, 내용은 `completedBoundaries` 대기열로 넘어가 같은 응답의 뒤쪽에 `hidden` 세그먼트와 `$RC` 호출로 나간다. 조건에 걸리지 않으면 바로 아래 `else`에서 내용을 원래 위치에 쓴다.

```js
  } else {
    // We're inlining this boundary so its bytes get counted to the current running count.
    flushedByteSize += boundary.byteSize;
```

React 소스에서는 앞의 경우를 outlining, 뒤의 경우를 inlining이라고 부른다. 이 글에서는 "분리한다"와 "그대로 쓴다"로 적는다.

분리 대상인지는 [`isEligibleForOutlining`](https://github.com/react/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-server/src/ReactFizzServer.js#L499-L515)이 먼저 거른다.

```js
function isEligibleForOutlining(
  request: Request,
  boundary: SuspenseBoundary,
): boolean {
  // For very small boundaries, don't bother producing a fallback for outlining.
  // The larger this limit is, the more we can save on preparing fallbacks in case we end up
  // outlining.
  return (
    (boundary.byteSize > 500 ||
      hasSuspenseyContent(boundary.contentState, /* flushingInShell */ false) ||
      boundary.defer) &&
    // For boundaries that can possibly contribute to the preamble we don't want to outline
    // them regardless of their size since the fallbacks should only be emitted if we've
    // errored the boundary.
    boundary.preamble === null
  );
}
```

스타일시트나 이미지를 기다리는 경우(`hasSuspenseyContent`)와 실험 기능인 `defer` prop으로 지연을 명시한 경우를 빼고 크기 조건만 남기면 규칙은 두 줄이다. 경계의 내용이 500바이트를 넘어야 하고, 지금까지 쓴 바이트(`flushedByteSize`)에 이 경계를 더한 값이 `progressiveChunkSize`를 넘어야 한다. `<html>`, `<head>`, `<body>`를 품을 수 있는 경계(`preamble`)는 크기와 무관하게 제외된다.

`progressiveChunkSize`의 기본값과 그 근거는 [같은 파일의 주석](https://github.com/react/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-server/src/ReactFizzServer.js#L447-L462)에 있다.

```js
// This is a default heuristic for how to split up the HTML content into progressive
// loading. Our goal is to be able to display additional new content about every 500ms.
// Faster than that is unnecessary and should be throttled on the client. It also
// adds unnecessary overhead to do more splits. We don't know if it's a higher or lower
// end device but higher end suffer less from the overhead than lower end does from
// not getting small enough pieces. We error on the side of low end.
// We base this on low end 3G speeds which is about 500kbits per second. We assume
// that there can be a reasonable drop off from max bandwidth which leaves you with
// as little as 80%. We can receive half of that each 500ms - at best. In practice,
// a little bandwidth is lost to processing and contention - e.g. CSS and images that
// are downloaded along with the main content. So we estimate about half of that to be
// the lower end throughput. In other words, we expect that you can at least show
// about 12.5kb of content per 500ms. Not counting starting latency for the first
// paint.
// 500 * 1024 / 8 * .8 * 0.5 / 2
const DEFAULT_PROGRESSIVE_CHUNK_SIZE = 12800;
```

느린 3G에서 500ms마다 새 내용을 보여 줄 수 있는 양을 12,800바이트로 잡은 것이다. 서버에서 렌더가 끝났더라도 그 바이트가 브라우저에 도착하는 데는 시간이 걸리고, 큰 내용을 그대로 쓰면 부모가 화면에 나타나는 시점이 그만큼 늦어진다. `<Suspense>`로 감쌌다는 것은 이 부분이 나중에 나타나도 된다는 표시이므로, React는 폴백을 먼저 그리고 내용을 뒤에 보내는 방법을 택한다.

`flushedByteSize`는 셸(shell, 어떤 경계에도 속하지 않아 처음에 나가는 부분)을 쓰기 시작할 때 [`request.byteSize`로 초기화](https://github.com/react/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-server/src/ReactFizzServer.js#L6168)된다.

```js
      flushedByteSize = request.byteSize; // Start counting bytes
```

`request.byteSize`와 `boundary.byteSize`는 세그먼트 하나의 렌더가 끝날 때마다 [`finishedSegment`](https://github.com/react/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-server/src/ReactFizzServer.js#L5121-L5141)에서 누적된다.

```js
function finishedSegment(
  request: Request,
  boundary: Root | SuspenseBoundary,
  segment: Segment,
) {
  // $FlowFixMe[invalid-compare]
  if (byteLengthOfChunk !== null) {
    // Count the bytes of all the chunks of this segment.
    const chunks = segment.chunks;
    let segmentByteSize = 0;
    for (let i = 0; i < chunks.length; i++) {
      segmentByteSize += byteLengthOfChunk(chunks[i]);
    }
    // Accumulate on the parent boundary to power heuristics.
    if (boundary === null) {
      request.byteSize += segmentByteSize;
    } else {
      boundary.byteSize += segmentByteSize;
    }
  }
}
```

따라서 12,800바이트는 경계 하나의 한도라기보다 한 번에 이어서 쓰는 묶음의 예산에 가깝다. 경계 밖의 셸이 이미 12,800바이트를 넘었다면 500바이트를 넘는 경계는 전부 분리 대상이 된다. 글 본문은 두 커밋 어느 경우에도 이 조건을 넘는다.

소스에서 읽은 조건이 맞는지 가장 작은 페이지로 확인했다. 경계 밖에 `<header>`를, 경계 안에 `<article>`을 놓고 글자 수만 바꾼다. 아무것도 suspend하지 않으므로 경계는 항상 렌더가 끝난 상태다.

```js
import {createElement as h, Suspense} from 'react'
import {prerender} from 'react-dom/static'

async function render(headerChars, articleChars) {
  const {prelude} = await prerender(
    h(
      'html',
      null,
      h(
        'body',
        null,
        h('header', null, 's'.repeat(headerChars)),
        h(
          Suspense,
          {fallback: null},
          h('article', null, 'b'.repeat(articleChars)),
        ),
      ),
    ),
  )
  return new Response(prelude).text()
}
```

`<article>`이 12,000자일 때와 13,000자일 때의 출력이다. 반복되는 글자와 스크립트의 함수 정의는 줄였다.

```html
<!-- article 12,000자 -->
<!DOCTYPE html><html><head></head><body><header></header><!--$--><article>bbb...</article><!--/$--></body></html>

<!-- article 13,000자 -->
<!DOCTYPE html><html><head></head><body><header></header><!--$?--><template id="B:0"></template><!--/$--><script id="_R_">requestAnimationFrame(function(){$RT=performance.now()});</script><div hidden id="S:0"><article>bbb...</article></div><script>/* $RB, $RV, $RC 정의 */$RC("B:0","S:0")</script></body></html>
```

`<header>`의 글자 수를 고정하고 `<article>`이 몇 자부터 분리되는지 이분 탐색으로 찾았다.

| 경계 밖 `<header>` 글자 수 | 분리가 시작되는 `<article>` 글자 수 |
| -------------------------: | ----------------------------------: |
|                          0 |                              12,765 |
|                      1,000 |                              11,765 |
|                      5,000 |                               7,765 |
|                     12,000 |                                 765 |
|                     20,000 |                                 482 |

숫자는 소스의 조건과 바이트 단위로 일치한다. 태그 자체가 `<header></header>` 17바이트, `<article></article>` 19바이트이므로 첫 줄은 17 + 12,765 + 19 = 12,801바이트로 12,800을 처음 넘는 값이다. 마지막 줄은 셸만으로 이미 예산을 넘은 경우여서 500바이트 조건만 남고, 482 + 19 = 501바이트가 500을 처음 넘는 값이다.

## React 19.2에서 켜진 `progressiveChunkSize`

앞에서 인용한 12,800바이트 주석과 크기 비교는 [`v18.0.0`](https://github.com/react/react/blob/v18.0.0/packages/react-server/src/ReactFizzServer.js#L1712)에도 있다.

```js
  } else if (boundary.byteSize > request.progressiveChunkSize) {
```

공식 문서의 [`renderToPipeableStream` 옵션](https://react.dev/reference/react-dom/server/renderToPipeableStream#parameters)에도 `progressiveChunkSize`가 "The number of bytes in a chunk"라는 설명으로 올라 있다. 여기까지만 읽으면 큰 경계는 React 18부터 분리됐다는 결론이 된다. 그런데 같은 페이지를 버전별로 렌더해 보면 결과가 다르다. 18에는 `prerender`가 없어서 이 비교만 `renderToPipeableStream`의 `onAllReady`에서 출력을 받았다.

| react-dom                       | `<header>` 0자 |    5,000자 |   12,000자 |   20,000자 |
| ------------------------------- | -------------: | ---------: | ---------: | ---------: |
| 18.3.1                          |     분리 안 됨 | 분리 안 됨 | 분리 안 됨 | 분리 안 됨 |
| 19.1.0                          |     분리 안 됨 | 분리 안 됨 | 분리 안 됨 | 분리 안 됨 |
| 19.2.0                          |         12,765 |      7,765 |        765 |        482 |
| 19.2.8                          |         12,765 |      7,765 |        765 |        482 |
| 19.3.0-canary-cbb046ab-20260731 |         12,765 |      7,765 |        765 |        482 |

값은 분리가 시작되는 `<article>` 글자 수이고, "분리 안 됨"은 60,000자까지 늘려도 원래 위치에 그대로 쓰였다는 뜻이다.

18.3.1과 19.1.0에서 분리되지 않는 이유는 소스에 있다. `v18.0.0`과 `v19.1.0`의 `ReactFizzServer.js`에서 `byteSize`는 타입 선언, `byteSize: 0` 초기화, 위의 비교문까지 세 번만 나온다. 값을 더하는 코드가 없으니 비교는 항상 `0 > 12800`이었다. 앞 절에서 인용한 `finishedSegment`의 바이트 집계는 `v19.2.0` 태그에서 처음 보인다.

이 집계를 넣은 변경이 [PR #33027](https://github.com/react/react/pull/33027)이고, 본문 첫 문단에 사정이 그대로 적혀 있다.

> Since the very beginning we have had the `progressiveChunkSize` option but we never actually took advantage of it because we didn't count the bytes that we emitted. This starts counting the bytes by taking a pass over the added chunks each time a segment completes.
>
> That allows us to outline a Suspense boundary to stream in late even if it is already loaded by the time that back-pressure flow and in a `prerender`. Meaning it gets inserted with script.

옵션은 처음부터 있었지만 바이트를 세지 않아 쓰인 적이 없었고, 이제 세기 시작했으며, 그 결과 이미 로드가 끝난 경계와 `prerender`의 경계도 스크립트로 삽입될 수 있다는 내용이다. 이 변경은 [React 19.2.0 릴리스 노트](https://github.com/react/react/releases/tag/v19.2.0)의 All Changes 아래 React DOM 목록에 한 줄로 실렸다.

> Enable the `progressiveChunkSize` option for server-side-rendering APIs (@sebmarkbage #33027)

뒤이은 [PR #33029](https://github.com/react/react/pull/33029)에서 경계 하나의 크기 대신 누적 바이트를 보도록 바뀌었고 500바이트 하한이 생겼다. 이 PR에는 기본 한도가 꽤 높아서 뷰포트 안의 내용이 분리될 일은 드물 것이라는 예상도 적혀 있다.

> The limit is still fairly high though so it's unlikely that by default you'd start outlining anything within the viewport at all.

누적이 루트의 크기에서 시작한다는 점을 생각하면, 헤더와 내비게이션만으로 수 KB가 되는 일반적인 페이지에서는 이 예상보다 자주 분리가 일어날 것으로 보인다.

이 변화는 여러 곳에서 이미 보고됐다. React 저장소에는 19.2.0 릴리스 3주 뒤인 2025년 10월 23일에 [이슈 #34966](https://github.com/react/react/issues/34966)이 올라왔다. `onAllReady`까지 기다리거나 `prerenderToNodeStream`을 써도 스트리밍 스크립트와 숨겨진 요소가 HTML에 들어간다는 내용이고, 2026년 11월 9일 기준으로 열려 있다. React Router 저장소의 [이슈 #14733](https://github.com/remix-run/react-router/issues/14733)은 봇 요청에 `onAllReady`까지 기다려도 19.2부터는 HTML에 폴백이 남는다는 내용이고, [토론 #14726](https://github.com/remix-run/react-router/discussions/14726)은 Googlebot에 같은 일이 생긴다는 질문이다. React Router의 두 곳에 달린 답은 같았다. React의 동작이므로 React Router가 고칠 문제가 아니고, `entry.server`에서 `progressiveChunkSize`를 `Infinity`로 넘기면 예전처럼 나온다는 것이다. PR #33027에도 스크립트가 전혀 없기를 원하면 `Infinity`로 끌 수 있다고 적혀 있다.

다만 `Infinity`로 꺼지는 것은 크기에 따른 분리다. 19.2.8에서 `Infinity`를 넘기고 확인해 보니 50,000자 경계는 그대로 쓰였지만, `precedence`가 있는 스타일시트를 넣은 경계는 `<span>` 하나짜리여도 분리됐다. 19.2.0도 같았다. Next.js 16.3.5가 내장한 `19.3.0-canary-cbb046ab-20260731`에서는 같은 경계가 그대로 쓰였는데, 셸과 함께 나가는 경계에서는 스타일시트를 분리 사유로 보지 않도록 `hasSuspenseyContent`가 바뀌었기 때문이다.

React Router는 서버 진입점을 사용자가 갖고 있어서 옵션 한 줄로 끝난다. Next.js의 App Router는 사정이 다르다. 우선 렌더러의 버전이 `package.json`과 다르다. App Router는 Next.js가 내장한 React canary로 렌더하므로, React 19.2.0이 정식 릴리스된 2025년 10월 1일보다 먼저 이 변경을 받았다. Next.js 저장소의 태그별 `package.json`에서 내장 React의 커밋을 확인하고 PR #33027의 커밋과 비교한 결과는 다음과 같다. 15.4.1은 2025년 7월 14일에 릴리스됐다.

| Next.js 태그 | 내장 React                        | PR #33027 포함 |
| ------------ | --------------------------------- | -------------- |
| v15.3.5      | `19.2.0-canary-3fbfb9ba-20250409` | 아니오         |
| v15.4.1      | `19.2.0-canary-97cdd5d3-20250710` | 예             |
| v16.3.5      | `19.3.0-canary-cbb046ab-20260731` | 예             |

다음으로 옵션을 넘길 방법을 찾지 못했다. Next.js 16.3.5와 16.4.5의 `next/dist`에서 `progressiveChunkSize`에 값을 지정하는 곳은 `server/app-render/make-get-server-inserted-html.js`의 `1024 * 1024` 하나였다. 스타일 태그처럼 서버가 끼워 넣는 HTML을 렌더하는 호출이고, 페이지 본문을 렌더하는 호출에는 값이 없어서 본문은 기본값 12,800바이트로 렌더된다.

이 문제는 Next.js 저장소에도 보고돼 있다. 2026년 10월 26일의 [이슈 #100730](https://github.com/vercel/next.js/issues/100730)은 `htmlLimitedBots`에 해당하는 봇의 요청에서 12.8KB를 넘는 완성된 경계가 `hidden` 요소로 나간다는 내용이고, Next.js가 App Router의 페이지 렌더에 `progressiveChunkSize`를 넘기지 않는다는 점도 함께 적혀 있다. 다음 날 올라온 [PR #100760](https://github.com/vercel/next.js/pull/100760)은 스트리밍 메타데이터가 꺼진 요청, 즉 HTML만 읽는 봇으로 판별된 요청에 `progressiveChunkSize: Infinity`를 넘기도록 고친다. 11월 9일 기준으로 병합되지 않았다.

다만 이 PR이 바꾸는 곳은 요청 시점에 렌더하는 `renderToStream`의 옵션 두 군데다. 빌드 때 만들어 둔 정적 HTML은 요청한 클라이언트가 봇인지와 무관하게 같은 파일이 나가므로, 사전 생성한 페이지는 PR이 병합돼도 달라지지 않을 것으로 보인다. 이 블로그의 글이 그런 페이지였다.

## 수정과 현재 상태

11월 3일의 [`b74ccf5a`](https://github.com/yceffort/blog/commit/b74ccf5a1241d143ec492d4be8784a34a8fd622c)에서 레이아웃의 경계 세 개를 지웠다.

```diff
           <Providers>
-            <Suspense fallback={null}>
-              <LayoutWrapper enSlugs={enSlugs}>{children}</LayoutWrapper>
-            </Suspense>
+            <LayoutWrapper enSlugs={enSlugs}>{children}</LayoutWrapper>
           </Providers>
```

이때는 두 번째 커밋만 원인으로 봤다. 저장소 이력에서 `Suspense`라는 글자가 추가된 커밋을 찾았는데, `loading.tsx`에는 그 글자가 없기 때문이다. 첫 번째 커밋은 이 글을 쓰려고 웨이백 머신의 스냅샷을 받아 보다가 8월 7일의 HTML에서 발견했다. 그 사이 10월 26일에 `loading.tsx`가 다른 이유로 지워져 있었기 때문에, 레이아웃의 경계만 지워도 글 페이지는 원래대로 돌아왔다.

같은 커밋에서 글의 사전 생성 범위도 바꿨다. 그전까지는 GA4 기준 최근 1년 인기 글 50편과 최근 글 8편만 빌드 때 만들고 나머지는 요청이 올 때 만들었다. 레이아웃에 경계가 없는 상태에서 요청 시점에 만들어지는 글이 어떻게 응답하는지는 따로 확인하지 않았고, 공개 글 전부를 빌드 때 만들어 그 경로를 없애는 방법을 택했다. 지금은 레이아웃에 경계가 없어도 개발 서버에서 `usePathname()` 오류가 나오지 않는다. 문서의 조건대로라면 요청마다 렌더되는 글이 없어졌기 때문일 것이다. 글을 쓰는 지금 기준으로 한국어 284편과 영어 81편이다. 같은 조건에서 두 커밋을 빌드하면 정적으로 생성되는 페이지가 406개에서 674개로 늘어난다.

개발 모드에서는 `connection()`을 호출해 글을 요청 시점에 렌더하는데, 이 호출에는 경계가 필요하다. 그래서 개발 모드의 본문만 감싸는 경계를 하나 남겼고 프로덕션 렌더는 이 경계를 지나지 않는다.

이 수정으로 포기한 것은 세 가지다. 글 경로의 스켈레톤은 다시 넣을 수 없다. `loading.tsx`가 곧 본문을 감싸는 경계이기 때문이다. 빌드 때 만드는 페이지는 글 수에 비례해 늘어난다. 그리고 본문을 감싸는 위치에는 앞으로도 경계를 놓을 수 없다. 레이아웃에 `usePathname()` 같은 값이 필요해지면 본문 대신 그 값을 쓰는 작은 컴포넌트만 감싸야 한다. 두 번째 커밋의 세 곳 중 두 곳이 무해했던 것과 같은 이유로, 내용이 500바이트 이하인 경계는 크기 때문에 분리되지는 않는다. 실제로 suspend하는 경계와, 앞에서 본 스타일시트처럼 크기와 무관한 조건에 걸리는 경계는 예외다.

수정이 반영된 뒤 프로덕션에서 경로 16개를 다시 받아 봤다. 글, 목록, 태그, 시리즈, 소개 페이지 등 14개는 `hidden` 세그먼트가 없었다. 홈(`/`, `/en`) 2개는 글 목록이 여전히 `hidden` 세그먼트 안에 있었다. 홈 컴포넌트는 내용 전체가 `<Suspense>` 하나에 감싸여 있는데, 11월 3일에는 글 페이지만 확인했다. 홈도 같은 방식으로 고쳤다. 경계는 개발 모드에만 남기고 프로덕션 렌더에서는 감싸지 않는다.

자신의 사이트가 해당하는지는 한 줄로 확인할 수 있다. 결과가 한 줄이라도 나오면 그 페이지의 일부는 스크립트가 실행돼야 보인다.

```bash
curl -s https://example.com/some-page | grep -o '<div hidden id="[^"]*S:[0-9a-f]*"'
```

`<Suspense>`는 화면에서 보면 로딩 상태를 다루는 도구다. 19.2 이후의 서버 렌더러에서는 여기에 뜻이 하나 더 붙었다. 감싼 내용을 스크립트로 나중에 끼워 넣어도 된다는 허락이고, 렌더가 끝났는지와 무관하게 크기 같은 조건만으로 적용된다. HTML만으로 읽혀야 하는 내용이라면 경계 안에 넣지 않는 편이 안전하다고 생각한다.
