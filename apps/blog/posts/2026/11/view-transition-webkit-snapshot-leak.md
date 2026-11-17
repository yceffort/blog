---
title: 'iOS에서 <em>View Transition</em>이 탭을 종료시킨 이유'
tags:
  - memory
  - debugging
  - browser
  - web-performance
  - react
published: true
date: 2026-11-17 16:39:00
description: '아이폰에서 긴 글 두 편을 몇 번 오가면 탭이 종료됐다. WebKit이 끝난 View Transition의 스냅샷을 해제하지 않고, React가 넘긴 업데이트 콜백이 그 스냅샷을 가진 객체를 붙잡아 GC로도 회수되지 않는 과정을 측정과 소스로 확인한다'
art:
  undraw: mobile-browsers
---

아이폰의 Safari에서 [Next.js의 페이지 보존](/series/nextjs-page-preservation) 시리즈의 1편과 2편을 글 상단의 시리즈 목록 링크로 번갈아 열었다. 3~4번째 이동에서 화면이 잠깐 하얗게 바뀌더니 2편이 처음부터 다시 로드됐다. 같은 방식으로 몇 번 더 오가자 이번에는 "'https://yceffort.kr/2026/09/nextjs-cache-components-activity'에서 문제가 반복적으로 발생했습니다"라는 안내만 남았다. 아이폰의 Chrome에서도 같은 순서로 "이 페이지를 열 수 없음"이 나타났다. 데스크톱 Chrome에서는 같은 동작을 반복해도 아무 일이 없었다.

1편 [떠난 페이지는 죽지 않고 숨는다](/2026/09/nextjs-cache-components-activity)와 2편 [Next.js의 최근 3개는 왜 글 9개를 남겼을까](/2026/11/nextjs-page-preservation-memory)에서는 Next.js가 떠난 페이지를 Activity로 숨겨 보존하는 동작과 그 메모리를 다뤘다. 이번에 탭을 종료시킨 메모리는 그 보존 목록 밖에 있었다. 이동할 때마다 실행되는 View Transition이 화면을 캡처한 이미지를 WebKit이 전환이 끝난 뒤에도 놓지 않았고, React가 넘긴 콜백이 그 이미지를 가진 객체를 계속 붙잡고 있었다. 이 글에서는 탭에서 출발해 프로세스, 스냅샷, `ViewTransition` 객체, 업데이트 콜백, 클로저 순서로 메모리를 붙잡고 있는 것을 하나씩 따라간다.

> 소스 인용은 WebKit 커밋 [`31fdaeb2`](https://github.com/WebKit/WebKit/tree/31fdaeb27daf545ea0bbef129d1695c5844c46b9)(2026년 11월 12일)와, Next.js 16.4.5에 내장된 React `19.3.0-canary-278794d7-20261002`의 커밋 [`278794d7`](https://github.com/react/react/tree/278794d7dee9cd2a3a2aaf9f0b2a4b8b747d74ee)을 기준으로 한다. 측정은 수정 전 블로그 커밋 [`49086956`](https://github.com/yceffort/blog/tree/49086956eb1013c600179ea563f12d0fccd23665)이 배포된 프로덕션과, 수정 커밋 [`5d42d2b8`](https://github.com/yceffort/blog/commit/5d42d2b88476bf0f56b1f59cbbc5e220013e9428)을 로컬에서 `next build`, `next start`로 띄운 서버에서 했다.

## Table of Contents

## 데스크톱 Chrome에서는 전환이 끝나면 회수된다

이 블로그는 `LayoutWrapper`에서 본문 `<main>` 전체를 React의 `<ViewTransition>`으로 감싸고 있었다.[^1] 이동할 때 이전 본문이 옆으로 밀려나고 새 본문이 들어오는 슬라이드 효과를 위한 경계였다.

```tsx
<ViewTransition default="page">
  <main id="main" className={stylex.props(sx.main).className}>
    {children}
  </main>
</ViewTransition>
```

View Transition은 바뀌기 전 화면을 이미지로 캡처해 두고(old 스냅샷), 바뀐 뒤의 실제 화면(new)과 겹쳐서 애니메이션을 실행한다. `view-transition-name`이 붙은 요소는 각각 따로 캡처된다. React의 `<ViewTransition>`은 경계 안의 DOM 요소에 이 이름을 붙이므로, 이 블로그에서는 이동할 때마다 `<main>` 하나가 통째로 캡처됐다.[^2]

처음에는 데스크톱 Chrome의 모바일 에뮬레이션(412×915, 기기 배율 2.625)으로 재현을 시도했다.[^3] GPU 프로세스의 메모리를 1초 간격으로 기록하며 두 글 사이를 20번 오갔다. 전환을 끈 조건은 페이지에서 `document.startViewTransition`을 `undefined`로 바꿔 만들었다. React는 이 호출이 실패하면 전환 없이 그대로 커밋한다.

| 조건                                  | 두 페이지의 `<main>` 높이 | GPU 프로세스 기준값 → 이동 중 최댓값 |
| ------------------------------------- | ------------------------- | ------------------------------------ |
| '블로그 성능 개선하기' 두 글, 전환 켬 | 25,374px, 38,343px        | 269MB → 453MB                        |
| 같은 두 글, 전환 끔                   | 같음                      | 267MB → 310MB                        |
| 'AI 시대의 판단' 두 글, 전환 켬       | 15,640px, 18,229px        | 290MB → 498MB                        |
| 시리즈 목록과 시리즈 소개, 전환 켬    | 1,444px, 1,130px          | 326MB → 451MB                        |

긴 글 두 편에서 전환을 켜면 이동할 때마다 GPU 메모리가 150\~185MB 튀었다가, 전환이 끝나면 기준값 근처로 돌아왔다. 전환을 끄면 증가 폭은 20\~40MB였다. 글 길이가 두 배 넘게 차이 나는 두 조건의 최댓값이 비슷한 것을 보면, Chromium은 큰 요소를 캡처할 때 크기에 상한을 두는 것으로 보인다.[^4] 어느 조건에서든 메모리는 회수됐고, 탭이 종료될 만한 이유는 보이지 않았다.

그래서 기기를 다시 확인했다. 증상을 겪은 기기는 아이폰이었고, 아이폰의 Chrome은 Safari와 같은 WebKit으로 페이지를 그린다. Safari에서도 같은 증상이 나타났으므로 측정할 대상은 WebKit이었다.

## WebKit에서는 떠난 글의 크기만큼 쌓인다

Playwright의 WebKit 빌드에 iPhone 15 Pro 설정(393×659, 기기 배율 3)을 걸고, 프로덕션에서 1편과 2편을 시리즈 목록 링크로 30번 오갔다.[^5] 이동할 때마다 페이지를 그리는 WebContent 프로세스와 GPU 프로세스의 메모리를 macOS의 `footprint`로 쟀다.

| 조건                       | 시작  | 30번 이동 뒤 | 30초 대기 뒤 |
| -------------------------- | ----- | ------------ | ------------ |
| 전환 켬                    | 230MB | 8,978MB      | 8,978MB      |
| `startViewTransition` 삭제 | 84MB  | 125MB        | 125MB        |

<Chart src="/charts/view-transition-webkit/navigation.json" />

전환을 켠 쪽은 이동할 때마다 WebContent 메모리가 늘었고, 30초를 기다려도 줄지 않았다. 1편과 2편을 두 번씩 떠나는 4번째 이동 뒤에 이미 1,429MB였다. 두 조건 모두 DOM 요소 수는 4,131~4,132개로 같았으니, 늘어난 메모리는 DOM 밖에 있었다.

증가량은 어느 글을 떠나느냐에 따라 두 값이 번갈아 나왔다. 떠난 글의 `<main>` 전체를 캡처할 때 필요한 메모리와 비교하면 다음과 같다.

| 떠난 글 | `<main>` 크기 | 전체를 캡처할 때의 계산값 | 이동당 증가량 |
| ------- | ------------- | ------------------------- | ------------- |
| 1편     | 361×42,776px  | 530MB                     | 352~433MB     |
| 2편     | 361×17,594px  | 218MB                     | 162~177MB     |

계산값은 CSS 픽셀에 기기 배율 3을 곱한 가로, 세로 픽셀 수에 픽셀당 4바이트(RGBA)를 곱한 값이다. 1편이라면 1,083×128,328 픽셀이다. 실측 증가량은 두 글 모두 계산값의 66~82%였다. 떠난 화면의 old 스냅샷이 거의 그대로 남는다고 보면 두 글의 증가량 차이가 설명된다.

## React를 빼도 쌓인다

React나 Next.js가 원인인지 확인하려고 프레임워크 없이 같은 구조를 만들었다. `<main>`에 `view-transition-name: page`를 주고, 높이가 60,005px인 본문과 24,803px인 본문을 `document.startViewTransition()`으로 번갈아 바꿨다.

| 전환 횟수  | 0    | 1     | 2     | 3       | 4       | 5       |
| ---------- | ---- | ----- | ----- | ------- | ------- | ------- |
| WebContent | 16MB | 426MB | 596MB | 1,004MB | 1,174MB | 1,582MB |

60,005px 본문을 떠날 때 약 410MB, 24,803px 본문을 떠날 때 약 170MB가 늘었다. 두 높이의 비율(2.42)과 증가량의 비율(2.41)이 거의 같다.

React가 전환 전후에 하는 일 중 메모리와 관련이 있을 만한 세 가지도 하나씩 넣어 봤다. 이전 본문을 지우지 않고 `display: none`으로 숨기는 것(Activity가 하는 일), `ready` 시점에 `document.documentElement.getAnimations({subtree: true})`를 호출하는 것, 전환이 끝난 뒤 모아 둔 애니메이션을 `cancel()`하는 것이다. 세 조건 모두 5번째 전환까지 1,582~1,583MB로 같은 값을 거쳤다. 쌓이는 현상 자체는 WebKit의 동작이다.

## 전환이 끝나도 이미지는 ViewTransition 객체에 남는다

WebKit에서 캡처한 이미지는 `CapturedElement`라는 구조체에 들어간다. 바뀌기 전 화면을 담는 필드는 `oldImage`다.[^6]

```cpp
    // std::nullopt represents an non-capturable element.
    // nullptr represents an absent snapshot on an capturable element.
    std::optional<RefPtr<ImageBuffer>> oldImage;
```

이름이 붙은 요소마다 하나씩 생기는 `CapturedElement`는 `ViewTransition` 객체의 `m_namedElements` 맵에 저장된다.[^7] `ViewTransition`은 `document.startViewTransition()`이 반환하는 객체의 C++ 구현이다.

```cpp
    OrderedNamedElementsMap m_namedElements;
```

이미지를 만드는 함수는 `snapshotElementVisualOverflowClippedToViewport()`다.[^8]

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

함수 이름에는 `ClippedToViewport`가 들어 있지만, 버퍼는 넘겨받은 사각형(`snapshotRect`)에서 계산한 `paintRect`의 크기로 만든다. 측정에서 증가량이 `<main>` 전체 높이에 비례한 것을 보면, 이 사각형은 화면 크기로 잘리지 않고 요소 전체를 덮었던 것으로 보인다.

그렇다면 이 이미지는 언제 해제될까. 전환이 끝나면 WebKit은 `clearViewTransition()`을 호출한다.[^9]

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

문서에서 활성 전환을 지우고(`setActiveViewTransition(nullptr)`) 전환용 스타일을 정리하지만, `m_namedElements`는 비우지 않는다. 따라서 `oldImage`는 `ViewTransition` 객체가 소멸할 때까지 남는다.

`ViewTransition`은 참조 카운트로 관리되는 C++ 객체이고, JavaScript에서는 `startViewTransition()`이 반환한 래퍼 객체가 이를 참조한다. 전환이 끝나면 `virtualHasPendingActivity()`가 `false`를 반환하므로, 래퍼는 다른 곳에서 참조하지 않는 한 GC 대상이 된다.[^10]

```cpp
bool ViewTransition::virtualHasPendingActivity() const
{
    return m_phase != ViewTransitionPhase::Done;
}
```

결국 이미지가 해제되는 시점은 GC가 래퍼를 회수할 때다. 그런데 `ViewTransition.cpp`와 `ViewTransition.h`에는 이 이미지의 크기를 JavaScriptCore의 GC에 알리는 코드가 없다. GC 입장에서는 작은 래퍼 객체 하나가 남아 있을 뿐이니, 그 뒤에 수백 MB가 매달려 있어도 이를 이유로 GC를 서두르지 않는다. 30초를 기다려도 메모리가 그대로였던 것은 이 때문으로 보인다.

## GC가 돌아도 회수되지 않는 이유

GC가 돌면 해제되는지 확인하려고 JavaScriptCore의 `$vm.gc()`로 full GC를 강제했다.[^11] 업데이트 콜백을 넘긴 방식에 따라 회수 여부가 달랐다.

| 조건                                                                  | 전환 뒤 | 5초 대기 뒤 | `$vm.gc()` 뒤 |
| --------------------------------------------------------------------- | ------- | ----------- | ------------- |
| 순수 HTML 5번 전환, 콜백이 `ViewTransition`에 닿지 않음               | 1,582MB | 1,582MB     | 16MB          |
| 순수 HTML 5번 전환, 같은 함수의 다른 클로저가 `ViewTransition`을 참조 | 1,582MB | 1,582MB     | 1,582MB       |
| 블로그 프로덕션 8번 이동                                              | 2,573MB | 2,572MB     | 2,567MB       |
| 블로그 프로덕션 8번 이동, 콜백 참조를 끊는 래퍼 사용                  | 2,583MB | 2,584MB     | 104MB         |

차이는 업데이트 콜백에서 나왔다. WebKit은 `startViewTransition()`에 넘긴 콜백을 `m_updateCallback`에 저장하고, `const` 멤버라서 전환이 끝난 뒤에도 놓지 않는다.[^12]

```cpp
    const RefPtr<ViewTransitionUpdateCallback> m_updateCallback;
```

이 콜백에 담긴 JavaScript 함수가 언제까지 살아 있는지는 IDL 선언에서 정해진다. `ViewTransitionUpdateCallback.idl`은 다음과 같다.[^13]

```webidl
[
    GenerateIsReachable=ImplScriptExecutionContext
] callback ViewTransitionUpdateCallback = Promise<any> ();
```

WebKit의 콜백 바인딩은 JavaScript 함수를 약한 참조로 들고 있다가, GC가 돌 때 소유자가 살아 있으면 함수도 살려 둔다. `GenerateIsReachable=ImplScriptExecutionContext`는 그 소유자를 문서(ScriptExecutionContext)로 정한다. 판단은 `JSCallbackData::WeakOwner::isReachableFromOpaqueRoots()`에서 한다.[^14]

```cpp
bool JSCallbackData::WeakOwner::isReachableFromOpaqueRoots(JSC::Handle<JSC::Unknown>, void* owner, JSC::AbstractSlotVisitor& visitor, ASCIILiteral* reason)
{
    if (reason) [[unlikely]]
        *reason = "Callback owner is an opaque root"_s;
    return visitor.containsOpaqueRoot(owner);
}
```

opaque root는 GC가 마킹하는 동안 "살아 있다"고 기록해 두는 C++ 객체다. 페이지가 열려 있으면 문서는 opaque root로 기록되므로, `ViewTransition`이 콜백을 들고 있는 한 그 함수도 회수되지 않는다.

여기까지는 함수 하나가 남는 정도다. 문제는 이 함수가 `ViewTransition`의 래퍼에 닿을 수 있을 때 생긴다. 그러면 다음 고리가 만들어진다.

```text
문서 (opaque root)
  └ 업데이트 콜백 함수
      └ 함수의 스코프
          └ startViewTransition()이 반환한 래퍼
              └ ViewTransition (C++)
                  ├ m_updateCallback → 업데이트 콜백 함수
                  └ m_namedElements → oldImage
```

함수가 살아 있으니 래퍼가 살고, 래퍼가 살아 있으니 `ViewTransition`과 이미지가 남는다. 문서가 사라질 때까지 이 고리는 끊기지 않는다.

React의 `startViewTransition()`이 이런 모양이다.[^15] 업데이트 콜백은 객체 리터럴의 `update()` 메서드로 넘어간다.

```js
    const transition = ownerDocument.startViewTransition({
      update() {
```

같은 함수의 뒷부분에서는 `transition.finished.finally()`에 넘긴 화살표 함수가 `transition`을 참조한다.[^16]

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

JavaScriptCore에서는 한 함수 안에서 만든 클로저들이 바깥 변수를 담은 스코프 객체를 함께 쓴다. 화살표 함수가 `transition`을 참조하므로 그 스코프에 `transition`이 들어가고, 같은 스코프에서 만든 `update()`도 그 스코프를 통해 래퍼에 닿는다. `update()` 안에서 `transition`을 직접 쓰지 않아도 고리가 완성된다.

이 고리가 원인인지 확인하려고, 넘겨받은 함수를 호출한 직후 참조를 끊는 래퍼를 `startViewTransition`에 씌웠다.

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

WebKit은 여전히 래퍼 함수를 붙잡지만, 래퍼 함수는 호출이 끝나면 React의 `update()`를 놓으므로 고리가 끊긴다. 표의 마지막 줄처럼 full GC 한 번에 2,583MB가 104MB로 줄었다. 다만 이동하는 동안에는 GC가 저절로 돌지 않아 똑같이 2.5GB까지 쌓였다. React 쪽에서 고리를 끊는 것만으로는 탭 종료를 막는다고 보기 어렵다.

프레임워크와 관계없이 평범한 코드에서도 같은 고리가 생긴다. 다음 두 함수는 같은 전환을 실행하지만, 두 번째 함수에서만 콜백의 스코프에 `t`가 들어간다.

```js
function makeUpdate(n) {
  return () => fill(n)
}

// 콜백이 transition에 닿지 않는다
function stepClean(n) {
  return document.startViewTransition(makeUpdate(n)).finished
}

// 콜백의 스코프에 t가 들어간다
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

높이 65,764px인 요소로 5번씩 전환한 뒤 full GC를 돌리면 `stepClean`은 2,803MB에서 17MB로 줄고, `stepCycle`은 2,800MB가 남는다. 전체 재현 페이지는 [repro.html](/demos/view-transition-webkit-snapshot-leak/repro.html)에 있다. async 함수 안에서 콜백을 인라인으로 넘기고 `await t.finished`로 기다리기만 한 경우도 회수되지 않았다.[^17]

## 블로그에서 바꾼 것

WebKit의 수정을 기다릴 수는 없어서, 큰 요소를 캡처하는 경계를 없앴다. `5d42d2b8`에서 `<main>`을 감싸던 `<ViewTransition default="page">`를 지웠다.[^18]

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

수정본을 같은 조건으로 30번 오가면 WebContent 메모리는 80MB에서 110MB로, 전환 API를 지운 조건(84MB에서 125MB)과 같은 수준이었다. 아이폰에서도 같은 순서로 오가며 탭이 종료되지 않는 것을 확인했다. 그 대신 본문 슬라이드 애니메이션은 모든 브라우저에서 사라졌다.

제목, 태그, 헤더의 메뉴 표시 점처럼 작은 요소의 전환은 남겨 두었다. 이 요소들도 같은 경로로 스냅샷을 남기는 것으로 보인다. 30번 이동한 뒤 GPU 프로세스는 223MB에서 549MB, 30초 뒤 487MB로, 전환 API를 지운 조건(222MB에서 212MB)보다 높게 남았다. 탭을 종료시킬 규모는 아니지만 0은 아니다.

## 이미 보고된 내용

같은 누수는 WebKit에 [Bug 330112](https://bugs.webkit.org/show_bug.cgi?id=330112)로 보고돼 있다. 24,000px 요소에 이름을 붙여 전환하면 전환당 약 330MB가 남고, root만 캡처하면 메모리가 늘지 않는다는 내용으로 이 글의 측정과 같다. 보고에는 원인이 적혀 있지 않아서, 해제하지 않는 코드와 콜백 고리, GC 비교를 [댓글](https://bugs.webkit.org/show_bug.cgi?id=330112#c2)로 덧붙였다. 긴 페이지에서 전환하면 WebView가 종료된다는 [Bug 298097](https://bugs.webkit.org/show_bug.cgi?id=298097)도 같은 문제일 가능성이 높다.

React에 보고된 iOS Safari 크래시([#35336](https://github.com/react/react/issues/35336))는 `getAnimations()`의 정렬 중 null 참조로 종료되는 다른 문제다. 그 수정([#35337](https://github.com/react/react/pull/35337))은 이 글에서 사용한 React에 이미 들어 있고, 앞에서 인용한 `finished.finally()`의 주석이 그 흔적이다.

근본적인 수정은 WebKit 쪽에서 전환이 끝날 때 `m_namedElements`의 이미지를 해제하는 것이라고 생각한다. 전환이 끝난 뒤 이 이미지를 읽을 수 있는 API가 없으니 동작이 달라질 것도 없고, 콜백 고리가 남아 있어도 이미지만큼은 사라진다.

## 떠난 페이지의 메모리는 JavaScript 힙 밖에도 있다

2편에서는 떠난 페이지가 보존된 DOM과 상태로 쓰는 메모리를 GC 후 JavaScript 힙으로 쟀다. 이번 메모리는 그 측정에 잡히지 않는다. 스냅샷은 브라우저 엔진이 만든 이미지 버퍼이고, JavaScript에서 보이는 것은 `startViewTransition()`이 반환한 작은 객체 하나뿐이다. 데스크톱 Chrome에서는 같은 코드가 전환이 끝날 때마다 메모리를 돌려주니, 개발 환경에서 이 문제를 볼 기회도 거의 없다.

큰 요소에 `view-transition-name`을 붙이는 전환은 WebKit이 고치기 전까지 iOS에서 이동할 때마다 그 요소 크기만큼 메모리를 남긴다. 이런 전환을 쓴다면 실제 iOS 기기나 WebKit에서 같은 동선을 반복하며 프로세스 메모리를 확인할 필요가 있다고 생각한다. 페이지 보존과 마찬가지로, 떠난 화면이 무엇을 남기는지는 지금 화면만 재서는 알 수 없다.

[^1]: [yceffort/blog `49086956` `apps/blog/src/components/layout/LayoutWrapper.tsx` L107-L111](https://github.com/yceffort/blog/blob/49086956eb1013c600179ea563f12d0fccd23665/apps/blog/src/components/layout/LayoutWrapper.tsx#L107-L111)

[^2]: [CSS View Transitions Module Level 1](https://www.w3.org/TR/css-view-transitions-1/)

[^3]: macOS의 Chrome Beta 159.0.8154.6에서 DevTools Protocol로 412×915, 기기 배율 2.625, 모바일 사용자 에이전트를 적용했다. 시리즈 글 조건은 화면에 보이는 시리즈 이전, 다음 링크를 클릭하고 2초를 기다리는 동작을 20번 반복했고, 시리즈 목록 조건은 링크 클릭과 뒤로 가기를 번갈아 썼다. GPU 프로세스와 렌더러 프로세스의 footprint를 macOS `footprint -p`로 1초 간격으로 기록했으므로, 실제 최댓값은 표보다 높을 수 있다. 측정값은 [blink-footprint.csv](/demos/view-transition-webkit-snapshot-leak/blink-footprint.csv)에 남겼다.

[^4]: [Define behaviour when capturing image for a large element (csswg-drafts#8561)](https://github.com/w3c/csswg-drafts/issues/8561). 큰 요소를 캡처할 때의 동작을 명세에 정의하자는 이슈다.

[^5]: Playwright 1.64.1의 WebKit 27.2 빌드(Playwright webkit 2370)를 macOS에서 창을 띄운 상태로 실행했고, `devices['iPhone 15 Pro']` 설정(393×659, 기기 배율 3, 모바일, 터치)을 썼다. 화면에 보이는 시리즈 목록 링크를 클릭하고 주소가 바뀐 뒤 1.5초를 기다려 WebContent와 GPU 프로세스의 footprint를 `footprint -p`로 기록했다. 전환을 끈 조건에서는 페이지 스크립트가 실행되기 전에 `Document.prototype.startViewTransition`을 지웠다. Playwright의 WebKit은 iOS Safari와 같은 빌드가 아니고, macOS에는 iOS와 같은 프로세스 메모리 한도가 없어서 탭이 종료되지 않고 계속 늘었다. 측정값은 [navigation.json](/demos/view-transition-webkit-snapshot-leak/navigation.json)과 [gc.json](/demos/view-transition-webkit-snapshot-leak/gc.json)에, 스크립트는 [navigation.mjs.txt](/demos/view-transition-webkit-snapshot-leak/navigation.mjs.txt), [plain.mjs.txt](/demos/view-transition-webkit-snapshot-leak/plain.mjs.txt), [gc.mjs.txt](/demos/view-transition-webkit-snapshot-leak/gc.mjs.txt), [repro.mjs.txt](/demos/view-transition-webkit-snapshot-leak/repro.mjs.txt)에 남겼다.

[^6]: [WebKit `31fdaeb2` `Source/WebCore/dom/ViewTransition.h` L84-L86](https://github.com/WebKit/WebKit/blob/31fdaeb27daf545ea0bbef129d1695c5844c46b9/Source/WebCore/dom/ViewTransition.h#L84-L86)

[^7]: [WebKit `31fdaeb2` `Source/WebCore/dom/ViewTransition.h` L264](https://github.com/WebKit/WebKit/blob/31fdaeb27daf545ea0bbef129d1695c5844c46b9/Source/WebCore/dom/ViewTransition.h#L264)

[^8]: [WebKit `31fdaeb2` `Source/WebCore/dom/ViewTransition.cpp` L575-L588](https://github.com/WebKit/WebKit/blob/31fdaeb27daf545ea0bbef129d1695c5844c46b9/Source/WebCore/dom/ViewTransition.cpp#L575-L588)

[^9]: [WebKit `31fdaeb2` `Source/WebCore/dom/ViewTransition.cpp` L1086-L1105](https://github.com/WebKit/WebKit/blob/31fdaeb27daf545ea0bbef129d1695c5844c46b9/Source/WebCore/dom/ViewTransition.cpp#L1086-L1105)

[^10]: [WebKit `31fdaeb2` `Source/WebCore/dom/ViewTransition.cpp` L254-L257](https://github.com/WebKit/WebKit/blob/31fdaeb27daf545ea0bbef129d1695c5844c46b9/Source/WebCore/dom/ViewTransition.cpp#L254-L257)

[^11]: 처음에는 큰 배열을 만들고 버리는 방식으로 GC를 유도했지만, 순수 HTML 조건에서는 그 배열조차 회수되지 않는 경우가 있어 full GC가 돌았는지 판단할 수 없었다. JavaScriptCore는 `useDollarVM` 옵션을 켜면 페이지에 `$vm` 객체를 노출한다. macOS에서는 WebContent 프로세스가 XPC 서비스로 실행되므로 `__XPC_JSC_useDollarVM=1` 환경 변수로 이 옵션을 넘겼다. `$vm.gc()`를 두 번 호출하고 5초 뒤에 쟀다.

[^12]: [WebKit `31fdaeb2` `Source/WebCore/dom/ViewTransition.h` L269](https://github.com/WebKit/WebKit/blob/31fdaeb27daf545ea0bbef129d1695c5844c46b9/Source/WebCore/dom/ViewTransition.h#L269)

[^13]: [WebKit `31fdaeb2` `Source/WebCore/dom/ViewTransitionUpdateCallback.idl` L26-L28](https://github.com/WebKit/WebKit/blob/31fdaeb27daf545ea0bbef129d1695c5844c46b9/Source/WebCore/dom/ViewTransitionUpdateCallback.idl#L26-L28)

[^14]: [WebKit `31fdaeb2` `Source/WebCore/bindings/js/JSCallbackData.cpp` L79-L84](https://github.com/WebKit/WebKit/blob/31fdaeb27daf545ea0bbef129d1695c5844c46b9/Source/WebCore/bindings/js/JSCallbackData.cpp#L79-L84)

[^15]: [React `278794d7` `packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js` L2186-L2187](https://github.com/react/react/blob/278794d7dee9cd2a3a2aaf9f0b2a4b8b747d74ee/packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js#L2186-L2187)

[^16]: [React `278794d7` `packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js` L2386-L2397](https://github.com/react/react/blob/278794d7dee9cd2a3a2aaf9f0b2a4b8b747d74ee/packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js#L2386-L2397)

[^17]: async 함수에서 `await`를 지나서도 쓰이는 지역 변수는 클로저와 같은 스코프 객체에 저장되기 때문으로 해석했다. JavaScriptCore 소스로 확인하지는 않았다.

[^18]: [yceffort/blog `5d42d2b8` `apps/blog/src/components/layout/LayoutWrapper.tsx` diff](https://github.com/yceffort/blog/commit/5d42d2b88476bf0f56b1f59cbbc5e220013e9428#diff-b9d8511c05a45a0f41451f4c8e9ebe00d7b638a4c2a49e64f3ca0ab89b929a40)
