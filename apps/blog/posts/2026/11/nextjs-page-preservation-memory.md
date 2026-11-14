---
title: 'Next.js의 <em>최근 3개</em>는 왜 글 9개를 남겼을까'
tags:
  - nextjs
  - memory
  - web-performance
  - caching
  - debugging
published: true
date: 2026-11-14 18:29:00
series: 'Next.js의 페이지 보존'
seriesOrder: 2
description: 'Next.js가 최근 3개를 보존한다는데, 이 블로그에는 글 9개가 남았다. 연속 이동 실험으로 보존 범위를 확인하고, 숨겨질 때 종료할 작업과 계속 보존할 상태를 나누어 메모리를 관리하는 방법'
art:
  undraw: browser-stats
  layout: glyph
  hue: cyan
  tone: light
  hero: '3 × 3'
---

이 블로그에서 2026년 글 20개를 차례로 방문했더니, 마지막 화면의 DOM에는 글 3개가 남아 있었다. 2026년, 2025년, 2022년을 번갈아 가며 글 20개를 방문한 경우에는 9개가 남았다. 현재 보고 있는 글은 두 경우 모두 1개다.

[지난 글](/2026/09/nextjs-cache-components-activity)에서는 Next.js가 떠난 페이지를 React Activity로 숨기고, 세그먼트 레벨마다 최근 3개까지 남긴다는 것을 코드로 확인했다. 이번에는 그 규칙에 따라 연속 이동 뒤 실제로 몇 개의 화면이 남고, 메모리를 얼마나 쓰는지 쟀다. Codex에 이 블로그의 프로덕션 빌드에서 연속 이동 실험을 요청하고, 남은 화면의 경로와 GC 후 JavaScript 힙을 함께 기록하게 했다.[^measurement]

결과를 보고 나니 메모리를 판단하는 단위부터 바꿔야 했다. 지금 열린 페이지에 필요한 메모리만으로는 충분하지 않다. 떠난 페이지에 보존된 DOM과 상태, 그 페이지가 시작한 작업까지 함께 봐야 한다. Next.js는 남길 항목의 개수를 제한하지만, 그 안에 무엇을 얼마나 넣을지는 애플리케이션 코드에 달려 있다.

> 측정은 2026년 11월 12일의 블로그 커밋 [`0318847a`](https://github.com/yceffort/blog/tree/0318847a1dc5c023755f32ebc0870747240f3404), Next.js 16.4.5를 기준으로 했다. 프로젝트의 `react` 의존성은 19.2.8이지만, 측정한 App Router 빌드에는 Next.js가 내장한 React `19.3.0-canary-278794d7-20261002`가 들어 있다. 내장 패키지와 브라우저 청크의 버전 문자열을 함께 확인했다. Next.js 소스 링크는 `v16.4.5`에 고정했으며, 이전 글의 분석 버전인 16.3.5와 구분한다.

## Table of Contents

## 최근 3개는 세그먼트마다 따로 보존한다

같은 두 글 사이를 반복해서 오가는 경우, 같은 연도에서 새 글을 계속 여는 경우, 여러 연도를 오가는 경우를 나눴다. 조건마다 새 브라우저에서 3회씩 실행했다. 두 글 반복은 첫 진입 이후 20회 이동해 총 21회 방문했고, 나머지는 19회 이동해 서로 다른 글 20개를 방문했다.

| 이동 경로           | 남은 글, 그중 숨겨진 글 | GC 후 JS 힙 중앙값 (최솟값~최댓값) |
| ------------------- | ----------------------- | ---------------------------------- |
| 같은 두 글 반복     | 2개, 숨김 1개           | 14.52MiB (14.52~14.53MiB)          |
| 같은 연도의 글 20개 | 3개, 숨김 2개           | 16.68MiB (16.62~16.92MiB)          |
| 3개 연도의 글 20개  | 9개, 숨김 8개           | 18.34MiB (18.25~18.36MiB)          |

표는 마지막 방문 후 5초를 더 기다린 값이다. 1MiB는 1,048,576바이트이며, 남은 글 수는 세 실행 모두 같았다.

방문 횟수에 따른 GC 후 JS 힙을 그리면 다음과 같다. 회색 원은 두 글 반복, 파란 사각형은 같은 연도, 주황 삼각형은 3개 연도를 오간 조건이다. 가로축의 방문 횟수에는 첫 진입도 포함한다.

<Chart src="/charts/nextjs-memory/heap.json" />

같은 시점에 DOM에 남은 글 수도 따로 그렸다. 현재 보이는 글과 숨겨진 글을 모두 포함한 수이며, 색과 도형은 위 그래프와 같다. 두 글 반복은 2개, 같은 연도는 3개, 3개 연도는 9개가 남았다.

<Chart src="/charts/nextjs-memory/retained.json" />

두 그래프는 매 방문 후 1.2초 대기한 값이다. 선은 중앙값, 옅은 영역은 최솟값과 최댓값으로, 통계적인 신뢰구간은 아니다.

9개가 남는 경로의 힙이 3개가 남는 경로보다 약 1.66MiB 컸지만, 이 차이를 추가 화면 6개의 보존 비용이라고 계산할 수는 없다. 방문한 글과 DOM, 받아온 코드와 프리페치 데이터가 서로 다르다.

화면 수의 차이는 1편에서 본 보존 규칙으로 설명된다. 16.4.5에서도 [`bfcache-state-manager.ts`](https://github.com/vercel/next.js/blob/v16.4.5/packages/next/src/client/components/bfcache-state-manager.ts#L9)의 `MAX_BF_CACHE_ENTRIES`는 `cacheComponents`를 켜면 3이고, `useRouterBFCache()`는 현재 화면을 포함해 최근 활성화된 항목 3개를 React state에 남긴다. 이 목록은 [`OuterLayoutRouter`](https://github.com/vercel/next.js/blob/v16.4.5/packages/next/src/client/components/layout-router.tsx#L583-L598)가 세그먼트 레벨마다 따로 관리하며, 브라우저용 [`createSegmentKey`](https://github.com/vercel/next.js/blob/v16.4.5/packages/next/src/client/components/router-reducer/create-segment-key.browser.ts#L3-L5)가 실제 파라미터 값을 키에 넣으므로 `year=2026`과 `year=2025`도 다른 항목이다.

이 블로그의 글 라우트는 [`app/[year]/[...slug]/page.tsx`](https://github.com/yceffort/blog/blob/0318847a1dc5c023755f32ebc0870747240f3404/apps/blog/src/app/%5Byear%5D/%5B...slug%5D/page.tsx)다. 월과 글 이름은 `[...slug]` 하나가 받는다. 3개 연도를 충분히 오가면 다음과 같이 남는다.

```text
연도 세그먼트의 보존 목록
├─ 2025
│  └─ 해당 연도의 최근 slug 3개
├─ 2026
│  └─ 해당 연도의 최근 slug 3개
└─ 2022
   └─ 해당 연도의 최근 slug 3개
```

같은 연도 안에서는 아래의 글 목록만 바뀐다. 연도를 바꾸면 이전 연도와 그 안의 글 목록이 함께 남는다. [각 목록 항목을 감싼 Activity](https://github.com/vercel/next.js/blob/v16.4.5/packages/next/src/client/components/layout-router.tsx#L743-L758)가 비활성 트리를 숨기므로, DOM에서는 현재 글 외에 8개를 더 찾을 수 있었다. 매 이동 뒤 남은 경로도 이 규칙과 일치했다.

따라서 보존할 화면 수를 예상하려면 실제 라우트 트리와 방문 경로를 함께 봐야 한다. 이 블로그에서 9개가 나왔다고 모든 Next.js 앱의 한도가 9개인 것은 아니다. 1편에서 본 것처럼 이 보존은 브라우저의 뒤로 가기 캐시와 무관하며, 이 실험의 이동도 모두 `router.push()`였다.

## 남아 있는 화면과 계속 쌓이는 메모리

그렇다고 방문한 글이 끝없이 남지는 않았다. 추가 실험에서 3개 연도의 글 20개를 방문한 뒤 2021년, 2020년, 2019년 글을 하나씩 더 열자, 남은 글이 9개에서 7개, 5개, 3개로 줄었다. 이 추가 경로는 한 번 실행했다.

아래 그래프의 가로축에서 '기준'은 20번째 글까지 방문한 상태다. 이후 표시된 연도의 글을 하나씩 더 열었다. 세로축은 현재 보이는 글을 포함해 DOM에 남은 글 수다.

<Chart src="/charts/nextjs-memory/eviction.json" />

처음 연도 목록의 최근 방문 순서는 2025, 2026, 2022였다. 2021년 글을 열면 가장 오래된 2022년 트리와 그 안의 글 3개가 빠지고, 새 글 1개가 들어온다. `9 - 3 + 1 = 7`개가 되는 이유다. 이어서 2026년과 2025년 트리가 빠졌다. 각 라우터의 목록도 React state이므로, 부모 트리가 언마운트되면 하위 목록과 DOM도 함께 사라진다.

같은 순서로 측정한 GC 후 JS 힙도 18.35MiB에서 17.58MiB, 16.13MiB, 15.26MiB로 내려갔다.

<Chart src="/charts/nextjs-memory/eviction-heap.json" />

여기까지는 페이지 보존 목록이 예상대로 교체된다는 증거다. 그 화면과 관련된 모든 객체가 해제됐다는 증거까지 얻은 것은 아니다. DOM에서 빠진 뒤에도 전역 캐시나 이벤트 리스너가 객체를 참조할 수 있다.

이 구분은 같은 두 글을 오래 오간 진단에서도 필요했다. 별도 실행 한 번에서 100회 이동하고, 20회 이동 뒤와 100회 이동 뒤의 같은 글을 비교했다. 남은 글은 모두 2개, CDP DOM 노드 수는 18,635개, 이벤트 리스너 수는 725개로 같았다. 하지만 GC 후 힙은 14.52MiB에서 최종 대기 후 15.25MiB로 약 0.73MiB 늘었다. 화면 수가 일정하다는 것만으로 메모리까지 안정됐다고 결론 내릴 수 없었다.

두 시점의 힙 스냅샷을 객체 종류별로 비교하면 코드 객체와 브라우저 내부 기록의 증가가 보였다. 다만 참조 경로까지 추적하지 않았고, 이동 없이 같은 측정만 반복하는 대조군도 없었다. 중간 스냅샷과 자동화 자체의 영향이 섞여 있어서 이 증가를 애플리케이션의 누수로 확정하지 않았다. CDP 노드 수 역시 문서에 붙은 HTML 요소만 센 값은 아니다.

실제 앱에서 같은 증상을 만나면, 보존 목록을 채운 뒤 같은 이동 경로를 다시 반복한 전후를 비교하는 것이 다음 단계다. [DevTools의 힙 스냅샷](https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots)에서 Comparison으로 늘어난 객체를 찾고, Retainers에서 무엇이 그 객체를 계속 참조하는지 따라갈 수 있다. 목록에서 밀려난 페이지를 전역 `Map`이 붙잡고 있다면 캐시의 제거 정책을 고쳐야 하고, 해제하지 않은 리스너가 붙잡고 있다면 구독을 정리해야 한다. 보존 중인 React 트리에서 참조가 이어진다면, 그 화면에 계속 남겨 둘 데이터인지부터 판단할 수 있다.

누수가 발견되지 않아도 줄일 메모리는 있을 수 있다. Next.js가 정한 개수 안에 머무는 화면 하나가 지나치게 크다면, 보존이 정상 동작하는 동안에도 많은 메모리를 계속 사용한다.

## 숨겨질 때 끝내고, 돌아오면 다시 시작할 작업

첫 번째로 손댈 수 있는 것은 화면을 보고 있을 때만 필요한 작업이다. Activity는 화면을 숨길 때 Effect의 cleanup을 실행하고, 다시 보여 줄 때 setup을 실행한다. DOM과 상태를 보존하면서도 이 시점에 구독을 정리할 수 있다. [React의 Activity 문서](https://react.dev/reference/react/Activity)에 명시된 동작이다.

이 글의 차트에도 적용해 볼 수 있다. 차트는 화면 가까이 왔을 때 초기화하고, Chart.js 4.6.1의 계산과 그리기를 Web Worker에서 실행하도록 했다. 한 탭 안에서 활성화된 차트들이 `new Worker()`로 만든 워커 하나를 공유한다. 브라우저의 `SharedWorker`를 쓰는 것은 아니다. 이 구현은 11월 14일에 추가했으므로, 앞서 소개한 11월 12일의 힙 측정에는 포함되지 않는다.

[Chart.js는 OffscreenCanvas를 받아 워커 안에서 그릴 수 있다](https://www.chartjs.org/docs/latest/general/performance.html#parallel-rendering-with-web-workers). `chartClient.ts`에서는 캔버스 제어권을 넘기고, 차트 데이터와 화면 크기를 메시지로 보낸다. 아래는 워커 확보와 오류 처리를 거친 뒤의 전송 부분이다. `lease`는 `acquireChartWorker()`가 반환한 객체이며, `post()`가 메시지에 차트별 `id`를 붙인다.

```ts
const offscreen = canvas.transferControlToOffscreen()
lease.post({type: 'init', canvas: offscreen, input, size}, [offscreen])
```

`input`에는 데이터와 테마, 언어를, `size`에는 CSS 픽셀 기준의 너비와 높이, 기기 픽셀 비율을 담는다. 워커의 `chart.worker.ts`는 이 메시지를 받아 `createChart()`를 호출하고, 차트 인스턴스를 `id`별로 보관한다. Chart.js 설정에 들어가는 함수는 워커 안에서 만든다. 크기 변경과 포인터 좌표도 별도 메시지로 보내므로 툴팁을 유지할 수 있다.

공유 워커에서는 차트 하나가 숨겨졌다고 바로 `terminate()`를 호출할 수 없다. `chartWorkerPool.ts`의 `release()`는 해당 차트를 구독 목록에서 빼고 `destroy` 메시지를 보낸다. 다른 차트가 남아 있으면 워커가 메시지를 처리해 해당 인스턴스만 `destroy()`한다. 마지막 구독자까지 빠지면 워커 자체를 바로 종료한다. 다음은 `release()`의 본문이다.

```ts
if (!current.subscribers.delete(id)) return

current.worker.postMessage({type: 'destroy', id})
if (current.subscribers.size === 0) {
  current.worker.terminate()
  if (pool === current) pool = undefined
}
```

React 컴포넌트에서는 이 정리를 Effect의 cleanup에 연결한다. `ChartCanvas.tsx`가 호출하는 `chartClient.ts`의 `mountChart()`는 캔버스와 이벤트 리스너, ResizeObserver, 워커 구독을 함께 관리하는 객체를 만든다. `dispose()`는 예약된 프레임과 타이머를 취소하고, 리스너와 관찰자를 해제한 뒤 `release()`를 호출한다. 컴포넌트는 정리한 객체를 ref에서도 비운다.

```tsx
useEffect(() => {
  if (!host.current) return undefined
  const mounted = mountChart(host.current)
  renderer.current = mounted

  return () => {
    renderer.current = null
    mounted.dispose()
  }
}, [])

useEffect(() => {
  renderer.current?.update({view, dark, locale}, label)
}, [view, dark, locale, label])
```

첫 Effect는 외부 자원의 수명을 관리하고, 두 번째 Effect는 차트 조건과 테마가 바뀌면 현재 렌더러에 반영한다. Activity가 화면을 다시 보여 주면 두 Effect의 setup이 다시 실행되므로, 새 렌더러에도 보존된 조건을 전달한다. [`transferControlToOffscreen()`은 같은 캔버스에서 다시 호출할 수 없다](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen#exceptions). 따라서 `dispose()`에서 이전 캔버스를 제거하고, 다음 `mountChart()`에서 새 캔버스를 만든다. 1편에서 본 캔버스 복원 문제를 피하려면 인스턴스의 정리와 재생성을 함께 맞춰야 한다.

실제 클라이언트 이동에서도 확인했다. 이 글에서 워커가 1개인 상태로 목록에 이동하면 0개가 됐고, 뒤로 돌아와 차트를 표시하면 다시 1개가 됐다. 전체 문서가 새로 로드되지 않은 것도 확인했다. 워커를 지원하지 않거나 시작에 실패하면 새 캔버스로 메인 스레드 렌더러를 띄우도록 했다. 여기에는 핵심 부분만 발췌했으며, 오류 복구와 메시지 처리를 포함한 [구현 코드](/demos/nextjs-page-preservation-memory/chart-worker/source.txt)와 [소스 ZIP](/demos/nextjs-page-preservation-memory/chart-worker/source.zip), 파일별 SHA-256을 기록한 [스냅샷 정보](/demos/nextjs-page-preservation-memory/chart-worker/manifest.json)를 따로 남겼다.

워커 적용 효과는 메인 스레드 작업 시간으로 따로 비교했다. 4배 CPU 감속에서 메인 스레드 작업 시간은 약 18% 줄었지만, 렌더 완료를 확인하기까지 걸린 시간은 거의 같았고 렌더러 JavaScript는 늘었다.[^chart-worker] 워커가 사용하는 메모리까지 포함한 절감량은 재지 않았으므로, 워커로 옮겼다는 이유만으로 메모리가 줄었다고 판단할 수는 없다. 이 글에서 확인한 것은 차트를 쓰는 화면이 없을 때 워커를 끝내고, 돌아오면 다시 시작하는 동작이다. [`terminate()`](https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate)는 진행 중인 작업을 즉시 멈추므로, 페이지를 떠나도 완료해야 하는 저장 작업에는 같은 수명 정책을 그대로 적용하기 어렵다.

이렇게 정리해도 React state에 넣은 큰 배열과 숨겨진 DOM은 그대로 남을 수 있다. Effect cleanup은 페이지의 데이터를 일괄 삭제하는 기능이 아니다.

## 다시 보여 줄 상태는 얼마나 작게 남길 수 있을까

실험에서 두 글을 반복한 문서에는 DOM 요소가 8,195개 붙어 있었고, 같은 연도에서 3개 글이 남은 문서에는 3,730개가 붙어 있었다. `document.querySelectorAll('*').length`로 센 전체 문서의 값이며, 각각 세 실행에서 같았다. 남은 글이 더 적어도 DOM은 더 클 수 있었다. 화면 수만 줄이는 것보다 각 화면에 무엇이 들어 있는지 살피는 편이 먼저일 수 있다.

예를 들어 로그 목록 화면을 보존한다고 하자. 돌아왔을 때 검색어와 선택한 항목, 스크롤 위치를 되살리는 것은 유용하다. 그렇다고 서버에서 받은 전체 응답과 과거에 불러온 모든 행을 계속 state에 둘 필요까지 생기지는 않는다. 실제로 보여 줄 필드만 클라이언트에 전달하고, 페이지네이션으로 가져오는 범위를 제한하거나, 오래된 페이지 데이터를 언제 버릴지 정할 수 있다. 선택 상태도 전체 응답 객체 대신 식별자로 표현할 수 있다.

긴 목록에는 화면 주변의 행만 렌더링하는 [가상화](https://tanstack.com/virtual/latest/docs/introduction)를 적용해 DOM을 줄일 수 있다. 다만 전체 데이터 배열을 계속 보관한다면 그 배열의 메모리는 남는다. DOM이 큰 문제인지, 데이터가 큰 문제인지에 따라 렌더링할 범위와 보관할 데이터 범위를 각각 줄여야 한다. 서버에서만 필요한 필드가 Client Component의 props로 넘어오고 있다면, 전달하기 전에 필요한 값으로 좁히는 것도 이 작업에 포함된다.

페이지 밖에 둔 캐시도 같은 기준으로 봐야 한다. 모듈 범위의 `Map`에 방문한 페이지의 응답을 계속 추가한다면 Next.js의 3개 제한과 무관하게 늘어날 수 있다. 앱이 소유한 캐시에는 항목 수나 용량 상한, 오래된 항목의 제거 시점을 정하고 실제로 제거되게 해야 한다. 만료 시간을 기록만 해 두고 조회할 때만 검사하는 구현이라면, 다시 조회하지 않는 항목은 계속 남을 수 있다. 캐시에서 항목을 지워도 보존된 컴포넌트가 같은 객체를 참조 중이라면 즉시 회수되지는 않는다.

이 조치들로 몇 MiB를 줄일 수 있는지는 이번 실험에서 측정하지 않았다. 다만 손댈 대상은 구체적이다. 화면이 숨겨져도 유지할 UI 상태를 고르고, 다시 만들 수 있는 큰 데이터와 외부 자원의 보관 기간을 그 선택에 맞추는 것이다. 필요한 상태를 무조건 비우면 페이지 보존으로 얻으려던 복원 경험도 함께 잃는다.

## 설정으로 보존 범위를 줄일 수 있을까

`cacheLife`를 짧게 설정하면 숨은 페이지도 빨리 없어질까. [`cacheLife`](https://nextjs.org/docs/app/api-reference/functions/cacheLife)는 `use cache` 범위에서 결과의 유효기간을 정하는 기능이다. 앞에서 본 16.4.5의 `useRouterBFCache()`는 그 시간을 읽지 않고 최근 항목 수로 목록을 자른다. 데이터가 언제 오래된 것으로 취급되는지와 React 트리를 언제 버리는지는 서로 다른 정책이다.

라우트 구조도 보존 범위에 영향을 준다. 이번 블로그에서는 연도마다 독립된 하위 목록이 생겼다. 중첩을 줄이면 달라질 가능성은 있지만, 그것을 메모리 절감 방법으로 권하려면 같은 콘텐츠를 다른 라우트 구조에 놓고 비교해야 한다. 현재 수치는 서로 다른 글을 방문한 결과이므로 라우트를 바꿨을 때의 절감량을 알려 주지 않는다.

`cacheComponents`를 끄는 선택 역시 범위가 크다. 이 버전의 보존 상수는 1이 되지만, 이 설정은 [`use cache`와 부분 사전 렌더링도 함께 제어한다](https://github.com/vercel/next.js/blob/v16.4.5/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.mdx). 보존 비용 때문에 이 설정까지 바꾼다면 서버의 캐싱과 렌더링을 함께 검토해야 한다. 현재 실험만으로는 이 블로그의 설정을 끌 근거를 얻지 못했다.

## 서비스에 적용할 때 확인할 것

페이지 보존을 사용하는 관리자 도구나 협업 서비스에서는 돌아갈 화면에 큰 테이블, 편집 중인 문서, 실시간 차트가 함께 있을 수 있다. 같은 연도의 글만 오가던 테스트에 여러 연도를 섞자 보존 범위가 달라졌듯이, 서비스에서도 목록과 상세, 다른 작업 공간을 오가는 경로에 따라 남는 화면이 달라진다. 이 블로그에서 확인한 화면 수를 서비스의 한도로 삼기보다, 실제 업무 동선에서 무엇이 남는지 확인하는 것이 출발점이다.

1. 고객 A의 목록에서 상세 화면을 여러 개 열고, 고객 B나 다른 작업 공간으로 이동한 뒤 다시 돌아오는 경로를 테스트한다. 라우트의 중첩과 파라미터가 바뀌는 이동도 포함해야 한다. 새로고침한 화면 하나의 메모리만 재지 말고, 이 경로를 반복하면서 GC 후 힙의 추세와 남은 DOM, 탭의 메모리 사용량을 함께 비교한다. JS 힙에는 DOM의 네이티브 메모리, 이미지, GPU 자원이 들어가지 않는다. [Chrome의 메모리 진단 가이드](https://developer.chrome.com/docs/devtools/memory-problems)도 실제 사용 기기의 경험을 기준으로 판단하도록 안내한다.

2. 숨겨질 때 정리한 작업이 복귀할 때 제대로 다시 시작하는지 확인한다. ref만 남아 재초기화를 건너뛰거나, 복귀할 때마다 구독이 중복되면 안 된다. 여러 화면이 공유하는 연결이나 페이지를 떠나도 끝내야 하는 저장 작업은 화면의 Effect가 아니라 그 작업을 소유한 상위 범위에서 관리한다.

3. 복원한 화면의 데이터가 여전히 유효한지도 확인한다. 재고나 주문 상태처럼 바뀔 수 있는 값은 언제 다시 조회할지 정하고, 계정과 작업 공간별 데이터가 섞이지 않도록 캐시 키와 초기화 범위를 구분한다. 로그아웃이나 계정 전환 뒤에 이전 사용자의 화면과 데이터가 다시 나타나지 않는지도 테스트한다. 클라이언트 상태 정리와 별개로, 데이터 조회와 변경 요청에서는 [서버의 권한 검사](https://nextjs.org/docs/app/guides/authentication#authorization)를 유지해야 한다.

수정 뒤에는 같은 동선을 반복했을 때 메모리가 계속 증가하는지, 숨겨진 화면의 작업이 멈추는지, 돌아왔을 때 입력과 연결이 정상적으로 복원되는지를 함께 확인한다. 보존된 화면 때문에 일정량의 메모리가 남는 것과, 반복할수록 불필요한 객체가 계속 쌓이는 것은 구분해야 한다. 그래도 목표 기기의 메모리 예산을 넘는다면 같은 콘텐츠와 이동 경로를 유지한 채 라우트 구조나 보존 설정을 바꾸어 비교할 수 있다.

서비스에서 먼저 정할 것은 화면별로 복원할 상태의 범위와 숨겨진 동안 멈출 작업, 데이터를 무효로 처리할 시점이다. 이 기준이 있어야 페이지 보존의 편의와 유지 비용을 함께 판단할 수 있다.

[^measurement]:
    별도 체크아웃에서 `next build`와 `next start`로 띄운 프로덕션 서버에 `cacheComponents: true`를 유지했다. 첫 진입 뒤에는 루트의 실험용 클라이언트 컴포넌트가 `useRouter().push(path, {scroll: false})`를 호출했다. 문서를 매번 새로 받는 `page.goto()`나 브라우저 뒤로 가기는 사용하지 않았다. 공개된 한국어 원고 중 8,000~50,000바이트인 것을 URL 순서로 골랐다. 같은 연도 조건은 2026년의 첫 20개, 여러 연도 조건은 2026년, 2025년, 2022년 순서로 섞은 20개다. 반복한 두 글은 [코딩 에이전트 핵심 개념](/2026/01/coding-agent-core-concepts)과 [거대한 JSON 응답 처리](/2026/01/handling-large-json-responses)다.

    Node.js 24.20.0, Playwright 1.64.1, headless Chromium 156.0.8078.4를 썼다. 화면은 1280×900, 기기 배율은 1, 언어는 한국어다. CPU와 네트워크 감속은 적용하지 않았고, 서비스 워커와 로컬 서버 밖 HTTP(S) 요청은 차단했다. HTTP 캐시와 일반 링크 프리페치는 유지했다. 각 주 비교는 새 브라우저 프로세스와 프로필에서 3회씩 순차 실행했고, 두 번째 반복에서는 조건 순서를 뒤집었다. 스크롤과 본문 위젯 조작은 하지 않았다.

    매 이동마다 URL과 보이는 제목, 글꼴 준비를 확인하고 1.2초를 기다렸다. Chrome DevTools Protocol(CDP)로 콘솔 기록을 비우고, 접근할 수 없는 객체의 메모리를 회수하는 GC를 80ms 간격으로 두 번 요청했다. [`Runtime.getHeapUsage`](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-getHeapUsage)의 `usedSize`와 [`Memory.getDOMCounters`](https://chromedevtools.github.io/devtools-protocol/tot/Memory/#method-getDOMCounters)를 기록했으며, 마지막에는 5초를 더 기다리고 다시 측정했다.

    `h1.post-title`이 있는 `.page-view`마다 경로 문자열을 붙여 두고 `Element.checkVisibility()`로 표시 여부를 확인했다. 결과에는 값만 반환하고 DOM 객체는 보관하지 않았다. `performance.timeOrigin`이 유지되는지, 보이는 글이 1개인지, JavaScript 오류와 로컬 HTTP 오류가 없는지도 검증했다. 방문 경로와 원자료는 [JSON](/demos/nextjs-page-preservation-memory/measurements.json), 수치는 [CSV](/demos/nextjs-page-preservation-memory/measurements.csv)에 있다. 총 11개 실행은 주 비교 9회, 화면 제거 확인 1회, 중간 힙 스냅샷을 포함한 100회 이동 진단 1회다. 추가 실험은 주 비교의 반복 횟수에 합치지 않았다.

[^chart-worker]:
    Codex에 [강제 레이아웃 글](/2026/10/number-flow-forced-layout)의 막대 차트 하나를 대상으로 두 방식을 비교하게 했다. 방식별 7회 실행의 중앙값으로, 메인 스레드 작업 시간은 메인 스레드 렌더링 223.9ms, 워커 렌더링 184.6ms였다. 스크롤 시작 전부터 렌더 완료를 확인하기까지는 각각 835.4ms와 840.7ms였다. 차트를 그리는 계산만 떼어 잰 값이 아니므로 전체 페이지의 성능 개선율로 일반화할 수 없다. 렌더러 관련 JavaScript는 기존 일반 렌더러의 55.1KiB에서 워커 실행 코드를 포함한 63.3KiB로 늘었다. gzip 기준이며 공통 페이지 코드는 제외한 값이다.

    비교는 2026년 11월 14일 프로덕션 빌드에서 했다. Headless Chromium 156.0.8078.4, 화면 390×900, 기기 배율 2, CDP의 CPU 4배 감속을 사용했다. 각 실행은 새 브라우저 컨텍스트에서 시작했고, 방식별 7회씩 순서를 번갈아 실행했다. 별도 애니메이션 데모의 영향을 제외하려고 `/demos/` 아래 iframe 응답은 빈 HTML로 대체했다. 두 방식은 같은 `chartEngine.ts`를 사용했으며, 일반 렌더링 조건에서는 페이지 스크립트 실행 전에 `transferControlToOffscreen`을 비활성화해 fallback을 사용했다.

    페이지의 초기 네트워크 작업이 끝난 뒤 차트로 스크롤하기 직전과 `[data-chart-state="ready"]`를 확인한 직후 사이를 쟀다. 메인 스레드 작업 시간은 CDP `Performance.getMetrics`의 `TaskDuration` 증가량이다. 이 구간에는 스크롤과 청크 로드, 페이지의 다른 메인 스레드 작업도 포함되며, 렌더 완료 응답은 화면의 픽셀이 실제로 표시된 시점과 같지 않을 수 있다. [실행별 원자료](/demos/nextjs-page-preservation-memory/chart-worker/benchmark.json)와 [측정 스크립트](/demos/nextjs-page-preservation-memory/chart-worker/benchmark.mjs.txt), [이동 시 워커 수 확인 결과](/demos/nextjs-page-preservation-memory/chart-worker/lifecycle.json), [워커 버전 청크 크기](/demos/nextjs-page-preservation-memory/chart-worker/bundles.json)를 함께 남겼다. 워커 버전의 64,870바이트에는 메인 스레드에서 불러오는 렌더러 코드 2,493바이트와 워커 청크들이 포함된다. 워커를 추가하기 전 렌더러의 56,411바이트와 함께 gzip 레벨 9로 계산했으며, 1KiB는 1,024바이트다. `bundles.json`에는 워커 버전의 값만 들어 있다.
