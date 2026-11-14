---
title: '블로그의 <em>CLS</em>는 어느 요소가 만들었는가'
tags:
  - web-performance
  - browser
  - debugging
published: false
date: 2026-11-12 12:40:00
description: 'CLS 값과 함께 기록한 이동 요소로 찾은 두 가지 원인. 커서를 따라다니는 장식 요소가 레이아웃 이동으로 세어진 과정과, 전체 p75가 0.000인 동안 홈 목록이 푸터를 밀어낸 과정을 필드 데이터와 재현으로 확인했다.'
---

## Table of Contents

## 이동 요소별로 센 7일

핵심 웹 지표를 [직접 수집](/2026/10/cwv-self-hosted-blog)하기 시작하고 일주일이 지난 10월 24일에, 그동안 쌓인 CLS를 요소별로 세어 봤다. 수집 코드는 CLS 값과 함께 이동한 요소의 선택자를 trace에 남긴다. 아래는 2026년 10월 17일 15시부터 24일 15시까지 들어온 첫 로드 585건을 그 선택자로 묶은 표다.

| 기록된 이동 요소            | 건수 | CLS 0.1 이상 | CLS 중앙값 |
| --------------------------- | ---: | -----------: | ---------: |
| `#cursor-glow`              |  404 |          138 |      0.077 |
| 이동 없음                   |  121 |            0 |          0 |
| `body>div`                  |   22 |           21 |      0.540 |
| 요소 기록 없음              |   21 |           16 |      0.160 |
| `footer`                    |    8 |            0 |      0.043 |
| `span.reading-progress-num` |    5 |            0 |      0.000 |
| 그 밖                       |    4 |            0 |      0.028 |

이 기간의 CLS p75는 0.116으로 good 기준인 0.1을 넘었고, 0.1 이상인 로드는 175건(29.9%)이었다. 그중 138건이 첫 행에 있다. `#cursor-glow`는 마우스 커서를 따라다니는 장식 요소다. 다른 요소를 밀어내지 않는데도 첫 로드의 69%에서 이동 요소로 기록됐다. `body>div`와 `footer`는 그때는 건수가 적어서 원인을 찾지 않고 넘어갔는데, 11월 초 6일 동안 홈에서 크게 늘었다.

빛무리를 고친 뒤 전체 CLS의 주별 p75는 0.000이었다. 그런데 그 6일 동안 홈 첫 로드의 45%에서는 CLS가 0.1 이상이었다. 전체 p75가 내려간 뒤에도 페이지와 이동 요소를 나눠 살펴볼 필요가 있었다.

이 글에서는 표의 행을 위에서부터 따라가며 각 요소가 왜 레이아웃 이동으로 세어졌는지, 무엇을 고쳤는지, 고친 뒤 값이 어떻게 바뀌었는지를 적는다. 마지막에는 원인을 찾지 못하고 남은 행을 정리한다.

### 선택자가 기록되는 경로

CLS는 레이아웃 이동을 세션 윈도라는 묶음으로 나눠 계산한다. 이동 사이의 간격이 1초 미만이고 첫 이동부터 5초 미만인 동안 점수를 더한 뒤, 합계가 가장 큰 묶음의 값을 사용한다([`LayoutShiftManager.ts`](https://github.com/GoogleChrome/web-vitals/blob/v6.2.3/src/lib/LayoutShiftManager.ts), [`onCLS.ts`](https://github.com/GoogleChrome/web-vitals/blob/v6.2.3/src/onCLS.ts#L98-L102)).

web-vitals 6.2.3의 attribution 빌드는 이 묶음 안에서 점수가 가장 큰 `layout-shift` 항목을 고른다. 이어서 그 항목의 `sources`에서 `node`가 Element인 첫 항목을 찾고, 없으면 첫 항목을 사용한다. 여기서 얻은 노드의 선택자가 `largestShiftTarget`이다([`attribution/onCLS.ts`](https://github.com/GoogleChrome/web-vitals/blob/v6.2.3/src/attribution/onCLS.ts#L29-L35)).

```ts
const getLargestLayoutShiftSource = (sources: LayoutShiftAttribution[]) => {
  return sources.find((s) => s.node?.nodeType === 1) || sources[0];
};
```

Layout Instability 명세에 따르면 `sources`에는 영향 면적이 큰 순서로 정렬된 최대 5개의 노드 정보가 들어 있다.[^1] 표의 선택자는 CLS를 결정한 묶음 안에서 가장 점수가 큰 이동을 대표한다. 한 로드에 여러 요소의 이동이 있었더라도 기록되는 선택자는 하나다. 이 선택자만으로 이동을 일으킨 원인이나 각 요소의 누적 기여량까지 알 수는 없다.

수집 코드는 이 값을 span 속성 [`cwv.cls.largest_shift_target`](https://github.com/yceffort/blog/blob/0318847a1dc5c023755f32ebc0870747240f3404/apps/blog/src/utils/telemetry/attributes.ts#L42-L50)에 넣는다. StyleX가 만든 원자 클래스는 스타일을 고칠 때마다 이름이 바뀌므로 선택자에서 지운다. `body>div`처럼 클래스가 없는 선택자가 나오는 이유다.

표의 한 건은 페이지 로드 한 번이다. SPA 안의 이동과 bfcache 복원으로 새로 생성된 지표는 집계에서 뺐다. CLS는 `layout-shift` 항목을 지원하는 브라우저에서만 보고되며, 이 글에서 다루는 첫 로드 1,917건 중 1,909건이 Chromium 계열이었다.

수집 코드는 같은 지표 ID의 [첫 보고값만 집계한다](https://github.com/yceffort/blog/blob/0318847a1dc5c023755f32ebc0870747240f3404/apps/blog/src/utils/telemetry/vitals.ts#L28-L48). 보통 페이지가 처음 숨겨질 때 보고되지만, 이 블로그는 `reportSoftNavs: true`를 사용한다. 이를 지원하는 브라우저에서는 페이지가 숨겨지기 전에 SPA 이동이 감지돼도 [이전 내비게이션의 CLS를 보고한다](https://github.com/GoogleChrome/web-vitals/blob/v6.2.3/src/onCLS.ts#L107-L117). 따라서 표의 값은 처음 숨겨지거나 첫 soft navigation이 감지될 때까지의 값이다. 보고 시점의 기본 동작은 [web-vitals의 보고 시점](/2026/10/web-vitals-report-timing)에서 다뤘다.

## `#cursor-glow`

### 커서를 따라다니는 500px 원

이 블로그의 배경에는 커서 주변을 옅게 밝히는 지름 500px의 원이 있다. `position: fixed`인 `div` 하나에 방사형 그라데이션을 깔고 불투명도를 0.08로 낮춘 것이다. `pointermove` 이벤트가 올 때마다 좌표를 받아 두었다가 다음 프레임에 `left`와 `top`을 바꾸고, CSS에서는 두 속성에 400ms 전환을 걸어 원이 커서를 조금 늦게 따라오게 했다. 아래는 수정 전의 [`AmbientEffects.tsx`](https://github.com/yceffort/blog/blob/b39c87bedd8760d42c0765564b8ab10c28aec85b/packages/shared/src/components/AmbientEffects.tsx#L25-L38)다.

```tsx
const onMove = (e: PointerEvent) => {
  nextX = e.clientX
  nextY = e.clientY
  if (!raf) {
    raf = window.requestAnimationFrame(() => {
      glow.style.left = `${nextX}px`
      glow.style.top = `${nextY}px`
      raf = 0
    })
  }
}
window.addEventListener('pointermove', onMove, {
  passive: true,
})
```

화면에서는 문제로 보이지 않는다. 원은 본문 뒤에 깔려 있고, 고정 위치라 어떤 요소도 밀어내지 않는다. 글을 읽는 도중에 내용이 튀는 일도 없다.

### 밀려난 요소가 없는 이동

CLS를 콘텐츠가 밀려난 정도로만 알고 있으면 이 요소가 표의 첫 행에 있는 이유를 설명하기 어렵다. [Layout Instability 명세](https://wicg.github.io/layout-instability/#sec-unstable-nodes)에는 무엇이 밀려났는지를 따지는 조건이 없다. 요소마다 시작 위치(starting point, 요소 박스가 시작하는 모서리의 좌표)를 이전 프레임과 비교하고, 달라졌으면 그 요소가 이동했다고 판단한다.

> A Node N has shifted in a coordinate space C if:
>
> - the starting point of N in C differs significantly from the previous frame starting point of N in C, and
> - the transform-indifferent starting point of N in C differs significantly from the previous frame transform-indifferent starting point of N in C.

"differs significantly"의 기준은 브라우저가 정하며, 명세의 주석에 따르면 Chrome은 가로나 세로로 3px 이상이다. 이동한 요소가 집계 대상이 되려면 박스가 있어야 하고, `visibility`가 `visible`이어야 하고, 자신과 조상의 `opacity`가 0이 아니어야 한다. 요소가 문서의 흐름 안에 있는지, 다른 요소의 위치에 영향을 주었는지는 조건에 없다. 불투명도가 0.08인 고정 요소도 `left`와 `top`이 바뀌면 이동한 요소가 된다.

한 번의 이동 점수는 영향 면적의 비율과 이동 거리의 비율을 곱한 값이다. 영향 면적은 이동한 요소들이 이전 프레임과 현재 프레임에서 차지한 영역의 합집합 중 뷰포트 안에 있는 면적이다. 겹치는 부분은 한 번만 세고, 이 면적을 뷰포트 면적으로 나눠 비율을 구한다. 거리 비율은 가장 멀리 움직인 요소의 이동 거리를 뷰포트의 가로와 세로 중 긴 길이로 나눈 값이며, 최대 1이다. 여기서 이동 거리는 가로와 세로 이동량 중 큰 값이다([명세의 계산 정의](https://wicg.github.io/layout-instability/#sec-layout-shift-value)).

빛무리의 박스(500×500px)는 화면 안에 전부 들어오면 1440×900 뷰포트의 19%를 차지한다. 실제 영향 면적은 이동 전후의 위치와 화면 밖으로 잘린 부분에 따라 달라진다. 전환이 진행되는 400ms 동안 프레임마다 조금씩 움직이므로 이동 기준을 넘는 프레임마다 점수가 생긴다.

[명세 설명서](https://github.com/WICG/layout-instability/blob/04a596c53010bbf0b6b82cff6f429359803e1ed3/README.md#limitations)에는 이런 경우가 CLS의 한계로 적혀 있다.

> Conversely, it's possible for a website to provide a smooth user experience, but score poorly on CLS. For example, an image carousel that animates a layout property such as `left` will produce a layout shift on every frame of the animation.

### 마우스 이동과 `hadRecentInput`

CLS는 사용자 입력 뒤 500ms 안에 일어난 이동을 빼고 계산한다. 버튼을 눌러 메뉴가 펼쳐지는 것처럼 사용자가 일으킨 변화까지 불안정으로 세지 않기 위해서다. `layout-shift` 항목의 `hadRecentInput`이 그 표시다. 그런데 [명세가 정한 입력](https://wicg.github.io/layout-instability/#sec-input-exclusion)에는 마우스 이동이 들어 있지 않다.

> Excluding inputs generally include mousedown, keydown, pointerdown, and change events. However, an event whose only effect is to begin or update a flick or scroll gesture is not an excluding input.
>
> The mousemove and pointermove events are also not excluding inputs.

빛무리가 반응하는 이벤트가 `pointermove`다. 이 이벤트 자체에는 입력 제외가 적용되지 않는다. 클릭처럼 제외 대상이 되는 다른 입력이 없다면 마우스를 움직여서 생긴 레이아웃 이동도 CLS 집계 대상이 된다.

수정 직전 커밋([`b39c87be`](https://github.com/yceffort/blog/commit/b39c87bedd8760d42c0765564b8ab10c28aec85b))을 빌드해서 확인했다. `next start`로 띄운 글 페이지를 Playwright 1.64.1의 Chromium 156에서 1440×900 뷰포트로 열고, 마우스를 화면의 6개 지점으로 차례로 옮기면서 `layout-shift` 항목을 받았다. 한 번 옮길 때 12단계로 나눠 움직였고 다음 이동까지 450ms를 기다렸다.

| 빌드           | `layout-shift` 항목 | 값의 합 | `hadRecentInput`이 true인 항목 |
| -------------- | ------------------: | ------: | -----------------------------: |
| 수정 직전 빌드 |           133~134건 |   0.618 |                            0건 |

항목 수는 133~134건이었고, 값의 합은 5회 모두 소수점 셋째 자리까지 0.618이었다. 모든 항목의 `sources`는 `#cursor-glow` 하나였다. 첫 항목은 요소의 왼쪽 위 모서리가 (470, 200)에서 (338, 118)로 움직인 프레임이고 값은 0.0245였다. 이런 프레임이 3초 남짓한 동안 130번 넘게 이어졌다. 이동 사이에 1초 이상의 간격이 없어서 앞서 설명한 세션 윈도 하나에 모두 포함됐고, CLS도 0.618이 됐다.

필드의 중앙값은 0.077로 랩보다 훨씬 작다. 랩에서는 화면을 가로지르는 이동을 쉬지 않고 6번 했고, 실제 방문에서는 CLS가 처음 보고되기 전까지 마우스를 그만큼 움직이지 않는 경우가 많았을 것이다. 그래도 404건 중 138건은 CLS가 0.1 이상이었다.

### `left`와 `top`에서 `transform`으로

효과는 그대로 두고 원을 옮기는 방법만 바꿨다([`048eccb2`](https://github.com/yceffort/blog/commit/048eccb2c1a84dd4b40f30e107ed3a45d2502f86)).

```diff
         raf = window.requestAnimationFrame(() => {
-          glow.style.left = `${nextX}px`
-          glow.style.top = `${nextY}px`
+          // left/top 이동은 layout shift 로 집계돼 CLS 에 쌓인다. transform 이동은 집계에서 제외된다.
+          glow.style.transform = `translate3d(${nextX}px, ${nextY}px, 0) translate(-50%, -50%)`
           raf = 0
         })
```

```diff
       position: 'fixed',
-      top: '50%',
-      left: '50%',
+      top: '0',
+      left: '0',
       zIndex: '0',
       width: '500px',
       height: '500px',
@@ -54,9 +54,8 @@ const styles = stylex.create({
-      transform: 'translate(-50%, -50%)',
-      transition:
-        'left 400ms cubic-bezier(0.2, 0.9, 0.2, 1),\n    top 400ms cubic-bezier(0.2, 0.9, 0.2, 1)',
+      transform: 'translate3d(50vw, 50vh, 0) translate(-50%, -50%)',
+      transition: 'transform 400ms cubic-bezier(0.2, 0.9, 0.2, 1)',
```

`left`와 `top`은 0으로 고정하고 위치는 `transform`으로만 정한다. 처음 위치도 `top: 50%`, `left: 50%` 대신 `translate3d(50vw, 50vh, 0)`으로 옮겼다. research 사이트가 같은 컴포넌트를 쓰고 있어서 research의 CSS도 함께 고쳤다.

앞에서 인용한 정의의 둘째 조건이 `transform`을 빼는 장치다. transform-indifferent starting point는 모든 `transform`이 없다고 치고 계산한 시작 위치다. `transform`만 바뀐 요소는 이 값이 그대로이므로 이동한 요소가 되지 않는다. [명세](https://wicg.github.io/layout-instability/#sec-basic-concepts)에는 이유가 주석으로 달려 있다.

> NOTE: To determine whether a node has shifted, we consider the starting point both with and without transforms, to ensure that a node is not made unstable solely due to a transform change.

[설명서](https://github.com/WICG/layout-instability/blob/04a596c53010bbf0b6b82cff6f429359803e1ed3/README.md#transform-changes)에는 `transform`을 빼는 이유가 세 가지 적혀 있다. 주변 콘텐츠를 다시 배치하지 않고, 부드러운 애니메이션에 흔히 쓰이며, 레이아웃과 스크립트가 도는 스레드와 분리된 합성 단계에서 처리하기 쉽다는 것이다. 빛무리는 수정 전에도 주변을 다시 배치하지 않았고, 수정 뒤에도 화면에 보이는 움직임은 같다. 달라진 것은 브라우저가 이 요소를 세는 방식이다.

### 수정 전후의 값

같은 랩 조건에서 현재 빌드는 5회 모두 `layout-shift` 항목이 0건이었다.

필드는 수정을 배포한 다음 날인 10월 25일부터 11월 12일 11시까지를 수정 전 7일과 비교했다.

| 항목                              | 수정 전(10/17~10/24) | 수정 후(10/25~11/12) |
| --------------------------------- | -------------------: | -------------------: |
| 첫 로드                           |                585건 |              1,332건 |
| CLS p75                           |                0.116 |                0.000 |
| CLS 0.1 이상                      |         175건(29.9%) |           71건(5.3%) |
| 기록된 이동 요소가 `#cursor-glow` |                404건 |                  2건 |
| 글 페이지의 0.1 이상              |       374건 중 141건 |         846건 중 9건 |
| 모바일의 0.1 이상                 |         44건 중 25건 |          90건 중 0건 |

`#cursor-glow`가 기록되고 CLS가 0.1 이상인 로드는 10월 19일부터 23일까지 하루 21~30건이었고, 25일 이후로는 11월 11일의 1건뿐이다. 대조군을 둔 실험은 아니지만, 이 요소의 기록이 급감한 시점이 배포와 맞고 랩에서도 이동이 사라져 수정의 효과로 판단했다.[^2]

모바일의 값도 함께 내려갔다. 수정 전 모바일 44건 중 12건은 기록된 이동 요소가 `#cursor-glow`였다. 터치 화면에서도 손가락을 움직이면 `pointermove`가 발생한다. 한편 CLS가 0.1 이상인 모바일 25건 중 16건은 요소가 기록되지 않아 원인을 말할 수 없다. 이 16건은 마지막 절에서 다시 다룬다.

수정 후에도 0.1 이상인 로드가 71건 남았다. 그중 62건이 홈이었다.

## `body>div`와 `footer`

### 6일 동안의 홈

빛무리 수정의 효과를 확인하려고 11월 12일에 3주 치를 다시 조회했더니, 홈의 값이 11월 3일부터 9일 사이에만 높았다.

| 날짜  | 홈 첫 로드 | CLS 0.1 이상 | 0.1 미만의 이동 |
| ----- | ---------: | -----------: | --------------: |
| 11/02 |         24 |            0 |               0 |
| 11/03 |         15 |            2 |               5 |
| 11/04 |         30 |           11 |              14 |
| 11/05 |         25 |           12 |               9 |
| 11/06 |         21 |           12 |               9 |
| 11/07 |          5 |            1 |               3 |
| 11/08 |          9 |            4 |               3 |
| 11/09 |         24 |           14 |               4 |
| 11/10 |         12 |            0 |               0 |

이 기간의 시작과 끝은 커밋 두 개와 맞는다. 11월 3일의 [`b74ccf5a`](https://github.com/yceffort/blog/commit/b74ccf5a1241d143ec492d4be8784a34a8fd622c)와 9일의 [`6056cae8`](https://github.com/yceffort/blog/commit/6056cae8f2d87cf9d6b58e3dfdc13800b381da23) 사이에 들어온 홈 첫 로드는 121건이다. 그중 55건이 0.1 이상이었고, 47건은 0.1 미만의 이동이 있었고, 19건은 이동이 없었다.

0.1 이상인 55건은 기록된 이동 요소가 대부분 `body>div`(51건)였고 값은 0.27에서 0.91 사이였다. 0.1 미만인 47건은 대부분 `footer`(43건)였다. 선택자가 기록된 이동의 발생 시각은 내비게이션 시작 뒤 543ms(55건의 중앙값)였다. 그 앞의 9일(10월 25일부터 `b74ccf5a`까지)은 185건 중 7건이, 그 뒤로는 47건 중 0건이 0.1 이상이었다. 표에서 11월 3일의 2건 중 1건은 커밋 전인 새벽의 로드다.

수정 전 7일의 표에 있던 두 행과 이름이 같고 값의 크기도 비슷하다. 그 표에서 `body>div`의 중앙값은 0.540, `footer`는 0.043이었다.

### 첫 화면 뒤에 들어오는 목록

두 커밋은 모두 [Suspense로 감싼 본문이 hidden 요소로 나가던 문제](/2026/11/react-19-2-progressive-chunk-size)를 고치는 과정에서 나왔다. `b74ccf5a`에서는 루트 레이아웃에서 페이지 전체를 감싸던 `<Suspense fallback={null}>`을 지웠다. JavaScript를 실행하지 않는 크롤러가 글 본문을 읽을 수 있게 하려는 수정이었다. 이때 홈의 글 목록을 감싼 `<Suspense>`는 그대로 남았다.

이 차이로 홈의 HTML이 달라졌다. 지우기 전에는 헤더와 푸터까지 바깥 경계 안에 있어서, 처음 그려지는 부분(셸)에는 보이는 요소가 없었다. 지운 뒤에는 헤더와 푸터가 셸에 들어갔고, 글 목록만 `hidden` 속성이 붙은 `div`로 문서 뒤쪽에 실렸다. 목록이 나중에 제자리로 들어오면서 푸터가 화면 밖으로 밀려났다.

아래 두 장은 두 커밋 사이의 커밋([`cb89b3ad`](https://github.com/yceffort/blog/commit/cb89b3adb901489353967ccec0635fca6ecb1bae))을 빌드해 홈을 1440×900 뷰포트에서 찍은 화면이다. 첫 장은 `requestAnimationFrame` 콜백을 붙잡아 목록을 옮기기 전의 상태를 찍었고, 둘째 장은 콜백을 풀어 준 뒤에 찍었다. 푸터는 y 781에 있다가 2,848로 내려갔다.

![목록이 들어오기 전의 홈. 헤더와 푸터만 있고 푸터가 화면 아래에 보인다](./images/which-element-caused-cls/home-before-reveal.png)

![목록이 들어온 뒤의 홈. 푸터는 화면 밖으로 밀려났고 오른쪽에 세로 스크롤바가 생겼다](./images/which-element-caused-cls/home-after-reveal.png)

### 목록이 별도 프레임에 들어오는 이유

같은 빌드에서 받은 홈 HTML을 줄여서 적으면 다음과 같다. 빈 `main`과 푸터 뒤에 숨겨진 목록이 있고, 스크립트가 그 목록을 `main`으로 옮긴다.

```html
<main id="main"><!--$?--><template id="B:0"></template><!--/$--></main>
<footer>…</footer>
…
<div hidden id="S:0">…</div>
<script>
  …$RC("B:0","S:0")
</script>
```

앞의 30KB에 헤더와 빈 `main`, 푸터가 있고, 그 뒤에 약 68KB의 목록과 `$RC` 호출이 온다. `$RC`는 React가 HTML에 함께 싣는 `completeBoundary` 함수이고, `hidden` 요소의 내용을 경계의 원래 위치로 옮기는 일을 맡는다. 이 함수는 내용을 바로 옮기지 않고 예약만 한다. Next.js 16.4.5에 내장된 React(19.3.0-canary-278794d7)의 [소스](https://github.com/react/react/blob/278794d7dee9cd2a3a2aaf9f0b2a4b8b747d74ee/packages/react-dom-bindings/src/server/fizz-instruction-set/ReactDOMFizzInstructionSetShared.js#L439-L460)에서 해당 부분은 다음과 같다.

```js
  if (window['$RB'].length === 2) {
    // This is the first time we've pushed to the batch. We need to schedule a callback
    // to flush the batch. This is delayed by the throttle heuristic.
    if (typeof window['$RT'] !== 'number') {
      // If we haven't had our rAF callback yet, schedule everything for the first paint.
      requestAnimationFrame(window['$RV'].bind(null, window['$RB']));
    } else {
```

`$RT`에는 셸의 첫 프레임 시각이 기록된다. 아직 기록되기 전이면 다음 프레임에, 기록된 뒤면 `$RT`에서 300ms가 지난 시점에 맞춘 타이머로 `$RV`를 부른다. 실제로 내용을 옮기는 것은 `$RV`다.

이 블로그는 페이지 전환 효과를 위해 레이아웃의 `main`을 React의 `<ViewTransition>`으로 감싸고 있어서, HTML에 실리는 `$RV`가 뷰 전환을 쓰는 판이다. 이 판은 [`document.startViewTransition()`의 `update` 콜백 안에서](https://github.com/react/react/blob/278794d7dee9cd2a3a2aaf9f0b2a4b8b747d74ee/packages/react-dom-bindings/src/server/fizz-instruction-set/ReactDOMFizzInstructionSetShared.js#L296-L300) 내용을 옮긴다.

```js
      const transition = (document['__reactViewTransition'] = document[
        'startViewTransition'
      ]({
        update: () => {
          revealBoundaries(batch);
```

뷰 전환은 갱신 전의 화면을 먼저 잡아 둔 뒤에 `update` 콜백을 부른다. 그래서 문서 전체가 한꺼번에 도착하는 로컬 서버에서도 목록이 없는 화면이 먼저 한 번 만들어졌다. 홈을 1920×1080으로 열면서 호출 시각을 기록한 결과다. 3회 중 첫 회의 값이고 나머지 두 회도 순서는 같았다.

| 시각 | 일어난 일                                       |
| ---: | ----------------------------------------------- |
| 18ms | `$RC` 호출(`$RT`는 아직 없음)                   |
| 19ms | 첫 `requestAnimationFrame` 콜백, `$RT` 기록     |
| 30ms | `document.startViewTransition()` 호출           |
| 45ms | `update` 콜백 완료(목록이 `main` 안으로 들어감) |
| 70ms | `layout-shift` 항목, 값 0.0369                  |
| 96ms | first-paint                                     |

푸터는 목록이 들어오기 전 프레임에 이미 위치가 정해져 있었으므로 이동한 요소가 된다. 1920×1080에서 5회 측정했을 때 `layout-shift` 항목은 매번 하나였고, `sources`는 `footer` 하나, 값은 0.0369였다. 필드에서 0.1 미만이었던 47건 중 1920 폭의 값(0.033~0.043)과 같은 크기다.

레이아웃의 경계를 지우기 전인 10월 24일 빌드에서는 같은 조건에서 이동이 한 번도 기록되지 않았다. 셸에 보이는 요소가 없어서 헤더와 목록, 푸터가 한 번에 나타났고, 그 전 프레임에 위치가 있던 요소가 없었기 때문으로 보인다.

필드의 543ms가 랩의 70ms보다 늦은 것은 실제 회선에서 문서 뒤쪽이 늦게 도착하기 때문일 것이다. 랩에서 내려받기 속도를 1,600kbps로, 지연을 150ms로 제한하면 `$RC` 호출이 664\~687ms로, 이동이 728\~757ms로 늦어졌다.

### 스크롤바와 7px

원인은 하나인데 필드의 값은 두 무리였다. 뷰포트 폭이 1920인 로드로 좁히면 0.55\~0.56이 13건, 0.67이 1건, 0.033\~0.043이 3건이고 그 사이의 값은 없다.

랩에서 이 차이를 만든 조건은 스크롤바였다. 목록이 들어오면 문서가 길어져 세로 스크롤바가 생긴다. macOS의 기본 설정처럼 스크롤바가 콘텐츠 위에 겹쳐 뜨면 레이아웃의 폭은 그대로다. 스크롤바가 폭을 차지하는 환경에서는 뷰포트가 그만큼 좁아지고, 가운데 정렬된 요소가 전부 옆으로 움직인다. 15px짜리 스크롤바를 CSS(`::-webkit-scrollbar`)로 흉내 내어 같은 측정을 했다. 값은 조건마다 5회 모두 같았다.

| 뷰포트    | 겹쳐 뜨는 스크롤바 | 15px 스크롤바 |
| --------- | -----------------: | ------------: |
| 1920×1080 |              0.037 |         0.675 |
| 1440×900  |              0.060 |         0.848 |
| 2560×1440 |          재지 않음 |         0.305 |
| 390×844   |              0.070 |     재지 않음 |

1920×1080에서 15px 스크롤바일 때 `layout-shift` 항목의 `sources`는 세 개였다.

| 요소         | 이전 프레임(x, y, 폭, 높이) | 현재 프레임(x, y, 폭, 높이) |
| ------------ | --------------------------- | --------------------------- |
| `body>div`   | 320, 77, 1280, 948          | 313, 77, 1280, 1003         |
| `header>div` | 240, 0, 1440, 76            | 233, 0, 1440, 76            |
| `footer`     | 352, 961, 1216, 64          | 뷰포트 밖                   |

본문을 담은 `body>div`가 x 320에서 313으로 7px 움직였다. 스크롤바 15px의 절반쯤이고, Chrome의 기준인 3px를 넘는다. 푸터만 셀 때의 면적 비율은 1216×64를 1920×1080으로 나눈 0.0375다. 푸터가 뷰포트 밖까지 내려가서 거리 비율이 0.98이므로 두 값을 곱하면 0.037이 된다. `body>div`와 `header>div`도 이동한 요소로 포함되면, 이 요소들의 이동 전후 영역까지 합친 면적 비율이 0.69로 늘어난다. 최대 이동 거리는 여전히 푸터가 결정하므로 거리 비율은 같고, 점수는 0.675가 된다. 목록이 들어와 푸터를 밀어내는 변화에 본문과 헤더의 7px 이동이 더해지면서 점수가 크게 달라졌다.

필드의 큰 값은 폭이 넓을수록 작았다. 2560 폭은 0.27\~0.28, 1920 폭은 0.55\~0.56, 1439에서 1512 사이는 0.68\~0.87이었다. 본문 영역의 최대 폭이 정해져 있어서 화면이 넓을수록 `body>div`가 뷰포트에서 차지하는 비율이 줄어들기 때문으로 보인다. 랩의 값도 같은 순서다.

확인하지 못한 부분이 있다. 15px 스크롤바는 흉내 낸 것이고 Windows에서 직접 재지는 않았다. 방문자의 스크롤바 폭과 뷰포트 높이는 수집하지 않았으므로, 필드의 두 무리가 스크롤바 설정에서 나온다는 것은 랩 결과에 기댄 추정이다. 또 1280×720에서는 본문 영역이 가로를 꽉 채워 좌우 이동이 없었고 값이 0.117에 그쳤는데, 필드의 1280 폭에는 0.76이 4건 있었다. 이 차이는 설명하지 못했다.

### 크롤러를 위한 수정

홈의 값은 `6056cae8`을 배포한 뒤 0으로 돌아갔다. 이 커밋은 홈의 `<Suspense>`를 프로덕션 빌드에서 빼는 수정이다.

```diff
 export default function HomeView({locale}: {locale: Locale}) {
-  return (
-    <Suspense>
-      <HomeContent locale={locale} />
-    </Suspense>
-  )
+  if (process.env.NODE_ENV !== 'production') {
+    // 경계는 개발 모드의 connection()에만 필요하다. 프로덕션에서 감싸면 React가 완성된 경계도
+    // hidden 세그먼트로 빼내서 JS 없는 크롤러가 홈의 글 목록을 못 읽는다
+    return (
+      <Suspense>
+        <HomeContent locale={locale} />
+      </Suspense>
+    )
+  }
+  return <HomeContent locale={locale} />
 }
```

주석에 적힌 대로 목적은 크롤러였다. 글 본문을 고친 뒤에도 홈에 같은 문제가 남아 있어서 맞춘 것이고, CLS를 보고 한 수정이 아니었다. 현재 빌드는 두 스크롤바 조건 모두에서 이동이 0건이고, 필드에서도 그 뒤의 홈 첫 로드 47건 중 0.1 이상은 없다.

결과만 놓고 보면 11월 3일의 수정으로 홈에 CLS가 생겼고 9일의 수정으로 사라졌다. 6일 동안 홈 첫 로드의 45%에서 CLS가 0.1 이상이었다는 것은 11월 12일에 지난 데이터를 조회하고서야 알았다.

## 표에 남은 행

수정 후 기간에서 홈의 6일을 뺀 1,211건을 다시 요소별로 세면 다음과 같다.

| 기록된 이동 요소            | 건수 | CLS 0.1 이상 |
| --------------------------- | ---: | -----------: |
| 이동 없음                   |  829 |            0 |
| `span.reading-progress-num` |  277 |            0 |
| 그 밖                       |   85 |            5 |
| `body>div`                  |   10 |           10 |
| 요소 기록 없음              |    6 |            0 |
| `#cursor-glow`              |    2 |            1 |
| `footer`                    |    2 |            0 |

`span.reading-progress-num`은 글을 읽은 비율을 보여 주는 숫자다. 277건 모두 CLS 값이 0.0001에 못 미친다. 빛무리가 대표 이동 요소로 기록되던 때에는 드러나지 않다가 표에 올라온 것이어서 고칠 대상으로 삼지 않았다.

`body>div`는 설명하지 못한 행이다. 홈의 6일 밖에서도 32건이 있었고(수정 전 7일에 22건, 수정 후에 10건), 31건이 0.1 이상이었다. 글 페이지가 21건, 홈이 11건이다. 값의 중앙값이 0.54~0.62로 홈의 큰 무리와 같아서 같은 원인을 의심했다. 레이아웃 경계가 있던 10월 24일 빌드에서 내려받기 속도를 400kbps로 제한해 보고, 서비스 워커가 제어하는 두 번째 방문도 재 봤지만 두 조건 모두 이동이 0건이었다. 날짜로는 10월 18일부터 31일까지만 있고, 레이아웃 경계를 지운 11월 3일 뒤에는 홈의 6일을 빼면 한 건도 없다. 지금은 나타나지 않는다는 것까지만 확인했다.

요소가 기록되지 않은 행은 수정 전 21건에서 6건으로 줄었고, 남은 6건은 값이 0.01 이하다. 수정 전의 21건 중 16건은 모바일에서 CLS가 0.1 이상인 로드였다. 왜 요소가 기록되지 않았는지는 확인하지 못했다. 빛무리를 고친 뒤 모바일의 0.1 이상이 90건 중 0건이 됐다는 사실만 있다.

`#cursor-glow` 2건은 10월 29일과 11월 11일의 글 페이지 로드다. 수정을 배포한 뒤인데 왜 남았는지 확인하지 못했다.

## 값과 요소

CLS 값만 모았다면 10월 24일에는 0.116이라는 숫자 하나가 있었을 것이다. 글 페이지가 0.136이고 모바일이 0.172라는 것까지는 라벨로 알 수 있었겠지만, 무엇을 고쳐야 하는지는 랩에서 따로 찾아야 했다. 그런데 마우스를 움직이지 않는 랩 측정에서는 빛무리가 한 번도 움직이지 않는다.

홈의 6일은 전체 p75에 나타나지도 않았다. 수정 후 세 주의 p75는 주마다 0.000이었다. 홈만 따로 떼거나 요소별로 세어야 드러나는 값이었다.

두 건을 거치면서 CLS가 무엇을 세는지도 다시 확인했다. 빛무리는 아무것도 밀지 않았는데, CLS가 0.1 이상인 첫 로드 138건(전체 585건의 24%)에서 대표 이동 요소로 기록됐다. 홈에서는 목록이 들어올 때 스크롤바가 공간을 차지하는지에 따라 점수가 0.037이 되기도 0.675가 되기도 했다. 값이 사용자가 겪은 불편의 크기에 항상 비례하지는 않는다는 것은 명세 설명서에도 한계로 적혀 있는 내용이다. 그래서 이 블로그에서는 CLS 값을 페이지별로 나눠 보고, 함께 기록한 요소를 단서로 원인을 재현해 확인하려고 한다.

[^1]: 명세 인용은 2026년 11월 8일 자 Draft Community Group Report를 기준으로 했다(저장소 커밋 [`04a596c`](https://github.com/WICG/layout-instability/tree/04a596c53010bbf0b6b82cff6f429359803e1ed3)). `sources`의 정렬 순서는 [LayoutShift 인터페이스](https://wicg.github.io/layout-instability/#sec-layout-shift) 절에 있다.

[^2]: Grafana의 Mimir 대시보드에서는 같은 기간의 p75가 0.123에서 0.008로 표시된다. 히스토그램 버킷 안에서 보간한 값이어서 0~0.01 버킷에 몰린 표본이 0.008로 나온다. good 비율은 69.7%(567건)에서 94.7%(1,314건)가 됐다. trace와 metric의 건수가 다른 이유는 [직접 수집한 글](/2026/10/cwv-self-hosted-blog)에 적었다.
