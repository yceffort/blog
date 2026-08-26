---
title: '서비스 워커 캐싱 적용기: App Router의 함정들과 GA4 실측'
tags:
  - web-performance
  - service-worker
  - pwa
  - nextjs
published: false
date: 2026-08-13 20:00:00
description: '1편의 일반론을 들고 이 블로그(Next.js App Router)를 오프라인에서도 열리게 만들었다. 첫 배포에서는 방금 읽은 글이 오프라인에서 안 열렸고, 두 번째 배포에서는 글은 열리는데 이미지가 전부 깨졌다. 소프트 내비게이션과 프리페치, next/image가 만든 함정들을 하나씩 고쳐 배포한 연대기와, 그 결과를 GA4 실사용자 데이터로 정산한 기록이다. 재방문자 FCP는 평균 634ms 좋아졌고, TTFB는 평균 525ms 나빠졌다. 서비스 워커 캐싱 딥다이브 시리즈의 두 번째 편이다.'
thumbnail: /thumbnails/2026/08/service-worker-caching-2.png
series: '서비스 워커 캐싱 딥다이브'
seriesOrder: 2
---

## Table of Contents

## 비행기 모드에서도 열리는 블로그

이 블로그는 이제 비행기 모드에서도 열린다. 한 번 읽은 글은 네트워크가 끊겨도 본문 이미지까지 그대로 보이고, 방문한 적 없는 글로 이동하면 오프라인 안내 페이지가 뜬다. 여기까지 만드는 데 들어간 것은 400줄 남짓의 서비스 워커 파일 하나가 전부인데, 그 400줄에 한 번에 도달하지 못했다. 커밋 히스토리를 보면 "PWA 지원 추가" 뒤에 "방문한 페이지가 오프라인에서 안 열리는 버그 수정", "본문 이미지가 캐시되지 않는 버그 수정"이 줄줄이 이어진다.

서비스 워커가 요청 경로 어디에 서고, Cache Storage는 어떤 성질의 저장소이며, 캐싱 전략은 무엇을 기준으로 고르는지는 [1편](/2026/08/service-worker-caching-1)에서 정리했다. 이번 편은 그 일반론을 들고 실제로 배포하며 겪은 일들의 기록이다. 설계에서 출발해, 실패한 배포 두 번을 각각 부검하고, 워커 자신을 배포하는 문제를 지나, 마지막에 GA4 실사용자 데이터로 정산한다. 소프트 내비게이션과 RSC(React Server Components) 요청, `next/image`의 srcset처럼 프레임워크가 만들어내는 요청의 모양이 이야기의 중심인데, 이 각론이야말로 Workbox 같은 범용 라이브러리가 대신해 줄 수 없는 부분이기도 하다. 글에서 확인한 프레임워크 동작은 이 블로그가 쓰는 Next.js 16.3 기준이다.

## Workbox 없이 시작한 설계

서비스 워커 캐싱을 시작하면 대부분 [Workbox](https://developer.chrome.com/docs/workbox)를 먼저 만난다. 프리캐싱, 런타임 캐싱 전략, 만료 관리까지 검증된 구현을 제공하는 구글의 라이브러리이고, 일반적인 경우라면 지금도 Workbox나 그 위에 얹힌 프레임워크 통합을 쓰는 것이 맞다고 생각한다. 바퀴를 다시 발명하는 것이 목적이 아니라면 말이다.

그럼에도 이 블로그에서는 서비스 워커를 처음부터 직접 썼다. 이유는 두 가지였다. 하나는 뒤에서 다룰 App Router 특유의 요청들(RSC 페이로드, 프리페치, `next/image` 변형) 때문이다. 이 요청들을 어떻게 캐시할지는 "cache-first냐 network-first냐" 수준의 전략 선택이 아니라, 요청의 헤더와 쿼리를 뜯어보고 프레임워크의 폴백 동작까지 이용해야 하는 문제였고, 추상화 위에서 하기보다 바닥에서 직접 하는 편이 오히려 단순했다. 다른 하나는 솔직히 학습 목적이다. 책에서 못 다룬 주제를 라이브러리 설정으로 때우면 이번에도 이해 없이 지나갈 것 같았다. 결과적으로 의존성 없는 400줄 남짓의 `sw.js` 하나가 나왔고(정확히는 429줄인데, 그중 46줄은 캐싱과 무관한 웹 푸시 핸들러다), 무슨 일이 일어나는지 전부 설명할 수 있게 됐다. 물론 Workbox가 이미 풀어놓은 문제들(엔트리 상한, 오프라인 폴백)을 다시 푸는 비용을 치렀다.

설계의 출발점은 "무엇을 어떤 전략으로 캐시할 것인가"를 리소스 유형별로 정하는 일이었다. 모든 요청에 같은 전략을 적용할 수 없는 이유는 명확하다. 파일명에 해시가 박힌 정적 자산은 영원히 캐시해도 안전하지만, HTML은 배포마다 바뀌어야 한다. 그래서 캐시를 용도별로 넷으로 나누고, 각각 다른 전략을 배정했다.

```javascript
const CACHE_VERSION = 'v4' // 글을 쓰는 시점의 배포본 기준
const STATIC_CACHE = `static-${CACHE_VERSION}`
const PAGES_CACHE = `pages-${CACHE_VERSION}`
const IMAGES_CACHE = `images-${CACHE_VERSION}`
const RSC_CACHE = `rsc-${CACHE_VERSION}`
```

각 캐시의 대상과 전략은 다음과 같다.

| 캐시     | 대상                                        | 전략                          |
| -------- | ------------------------------------------- | ----------------------------- |
| `static` | `/_next/static/*` (해시 포함), 웹폰트       | cache-first                   |
| `pages`  | 페이지 내비게이션 HTML                      | network-first + 오프라인 폴백 |
| `images` | `/_next/image`, OG 이미지, 외부 본문 이미지 | cache-first + 변형 폴백       |
| `rsc`    | `?_rsc=` 쿼리가 붙은 RSC 페이로드           | network-first + MPA 폴백      |

전략을 가른 기준은 [1편](/2026/08/service-worker-caching-1) 카탈로그의 첫 번째 질문, **이 리소스가 낡은 채로 보여도 되는가**였다. 해시가 박힌 정적 자산은 URL이 곧 내용이므로 낡을 수가 없다. 캐시에 있으면 네트워크를 볼 이유가 없으니 cache-first다. 이미지는 사정이 조금 다르다. `/_next/image?url=...`의 URL에는 원본의 해시가 없어서, 같은 경로의 원본이 교체되면 캐시에 낡은 변형이 남을 수 있다. 발행 후 이미지를 갈아 끼우는 일이 거의 없는 블로그의 운영 특성에 기대어 이미지도 cache-first로 묶은 것이지, 이 선택이 어디서나 안전한 것은 아니다. 반면 HTML과 RSC 페이로드는 같은 URL의 내용이 배포마다 바뀐다. 온라인일 때는 항상 최신을 보여주고, 캐시는 오프라인일 때의 보험으로만 쓰는 network-first가 맞다. 책에서 다뤘던 `Cache-Control` 설계와 판단 기준 자체는 같고, 집행 위치가 헤더에서 코드로 옮겨왔을 뿐이다.

fetch 핸들러는 이 분류를 순서대로 적용하는 라우터가 된다. 실제 코드의 뼈대만 옮기면 다음과 같다.

```javascript
self.addEventListener('fetch', (event) => {
  const {request} = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // 해시 정적 자산과 폰트: 영구 캐시
  if (isStaticAsset(url) || isFontRequest(url)) {
    event.respondWith(cacheFirst(event, STATIC_CACHE))
    return
  }
  // 페이지 내비게이션: 네트워크 우선, 실패 시 캐시 → 오프라인 페이지
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event))
    return
  }
  // App Router 소프트 내비게이션의 RSC 요청
  if (isRSCRequest(request, url)) {
    event.respondWith(handleRSC(event))
    return
  }
  // 이미지: 캐시 우선
  if (isImageRequest(url)) {
    event.respondWith(handleImage(event))
  }
})
```

한 가지 덧붙이면, 애널리틱스처럼 캐시해서는 안 되는 요청은 아예 `respondWith()`를 부르지 않고 리턴한다. 서비스 워커가 관여하지 않은 요청은 원래의 네트워크 경로(HTTP 캐시 포함)를 그대로 탄다. 1편에서 본 오버헤드 문제 때문에도, 모든 요청을 가로채야 한다는 강박을 버리는 것이 중요하다. 그리고 위 스니펫은 뼈대라서 실제 파일에는 분기가 몇 개 더 있다. 교차 출처 요청은 폰트 CDN과 이미지만 캐시하고 나머지는 통과시키며, `/api/*`는 OG 이미지 경로만 캐시 대상이고, 위 분기에 걸리지 않은 나머지 same-origin `/_next/*` 요청은 network-first로 처리한다. 오프라인에서 캐시마저 없을 때는 경로에 따라 408이나 503 같은 실패 응답을 만들어 돌려준다.

전통적인 MPA라면 이 설계로 끝났을 것이다. 여기서부터가 문서에 없던 부분이다.

## 첫 배포: 방금 읽은 글이 오프라인에서 안 열린다

첫 구멍은 배포 직후에 발견됐다. 홈에서 글 목록을 눌러 읽고, 비행기 모드를 켜고 새로고침을 하면 방금 읽은 글이 열리지 않았다. 분명 network-first로 pages 캐시에 HTML을 쌓고 있을 텐데, 캐시를 열어보면 비어 있었다.

### 소프트 내비게이션은 HTML을 남기지 않는다

원인은 App Router의 동작 방식에 있다. 링크 클릭으로 일어나는 소프트 내비게이션은 문서(HTML) 요청을 만들지 않는다. 대신 `?_rsc=` 쿼리가 붙은 fetch로 RSC 페이로드만 받아 클라이언트에서 화면을 갱신한다(실제 판별 코드는 이 쿼리와 함께, 같은 목적으로 붙는 `rsc: 1` 요청 헤더도 본다). 즉 `request.mode === 'navigate'` 분기는 첫 진입에서만 타고, 그 뒤로 아무리 글을 읽어도 `pages` 캐시에는 HTML이 쌓이지 않는 것이다.

그래서 RSC 요청을 처리할 때, 그 페이지의 HTML을 백그라운드에서 별도로 받아 저장하는 우회로를 만들었다.

```javascript
async function savePageHTML(request) {
  const url = new URL(request.url)
  url.searchParams.delete('_rsc')
  const response = await fetch(url.href)
  if (!response.ok) return
  await putWithTrim(PAGES_CACHE, url.href, response.clone())
  await saveImagesFromHTML(response)
}
```

`_rsc` 쿼리를 떼면 같은 경로의 문서 URL이 되므로, 그것을 다시 fetch해서 HTML로 저장한다. 요청이 한 번 더 나가는 비용이 있지만 백그라운드(`event.waitUntil`)에서 일어나므로 렌더링을 막지는 않는다. 물론 방문한 글마다 HTML을 한 번 더 받는(그리고 뒤에 나올 이미지 선다운로드까지 얹히는) 대역폭 비용 자체는 실재하는 트레이드오프다. 이 HTML이 있어야 오프라인에서의 새로고침과 URL 직접 진입이 가능해진다.

### 프리페치를 캐시하면 안 되는 이유

RSC 요청을 저장하기로 하면 곧바로 다음 문제가 생긴다. Next.js는 뷰포트에 들어온 링크를 미리 프리페치한다. 프리페치도 똑같이 `?_rsc=` 요청이므로 구분 없이 저장하면 **읽지도 않은 글이 캐시에 쌓인다**. 목록 페이지를 한 번 스크롤하면 수십 개의 글이 "방문"으로 기록되는 셈이다. 저장 용량 낭비이기도 하지만, 뒤에 나올 "오프라인에 저장됨" 표시의 의미가 망가지는 것이 더 문제였다.

다행히 Next.js는 프리페치 요청에 식별 가능한 헤더를 붙인다.

```javascript
function isPrefetchRequest(request) {
  return (
    request.headers.has('next-router-prefetch') ||
    request.headers.has('next-router-segment-prefetch')
  )
}
```

프리페치는 그대로 네트워크에 흘려보내고, 이 헤더가 없는 실제 방문만 저장한다. 참고로 이 헤더들은 공개 API라기보다 프레임워크 내부 구현에 가까워서, Next.js 버전이 오르면 깨질 수 있는 지점이라는 것은 인정해야겠다. 이런 취약성이 바로 프레임워크 위에서 서비스 워커를 직접 짤 때 감수하는 비용이다.

### 오프라인 RSC 실패는 503으로 돌려준다

반대 방향의 구멍도 막아야 했다. 오프라인에서 캐시에 없는 글로 소프트 내비게이션이 일어나면 어떻게 해야 할까. RSC 요청이 실패했을 때 아무 응답이나 돌려주면 App Router는 화면을 갱신하지 못한 채 멈춘다. 여기서 프레임워크의 폴백 동작을 이용했다. Next.js 라우터는 RSC fetch의 응답이 2xx가 아니거나 RSC content-type(`text/x-component`)이 아니면 해당 내비게이션을 MPA 방식(문서 전체 요청)으로 폴백한다. 공식 문서가 아니라 라우터 소스의 동작이라 버전이 오르면 달라질 수 있는데, 이 폴백을 믿고 캐시에 없는 RSC 요청에는 빈 503을 돌려줬다. 그 문서 요청은 다시 서비스 워커의 `navigate` 분기로 들어오고, 거기서 캐시된 HTML이 있으면 그것을, 없으면 오프라인 안내 페이지를 응답한다. 서비스 워커 단독으로는 풀 수 없고, 프레임워크가 실패에 어떻게 반응하는지까지 알아야 이어지는 그림이다.

## 두 번째 배포: 글은 열리는데 이미지가 전부 깨졌다

수정을 배포하자 글은 오프라인에서 열렸다. 그런데 이번에는 이미지가 전부 엑박이었다. 원인은 둘이었다.

첫째, 본문 이미지는 지연 로딩된다. 뷰포트 밖의 이미지는 fetch 이벤트 자체가 발생하지 않으므로, 글을 끝까지 스크롤하지 않으면 그 이미지들은 캐시에 들어올 기회가 없다. 그래서 페이지 HTML을 저장할 때 `<img>` 태그를 파싱해 이미지 URL을 추출하고, 백그라운드에서 미리 받아 저장하도록 했다. 외부 도메인 이미지는 `no-cors`로 가져와 opaque 응답을 그대로 저장한다. [1편](/2026/08/service-worker-caching-1)에서 실측한 대로 opaque 응답은 개당 7MB 안팎으로 계상되므로 이것은 공짜가 아니다. 뒤에서 둘 images 캐시 상한 300개 기준으로 최악의 경우 계상만 2GB를 넘을 수 있는 규모라, 외부 이미지의 오프라인 지원을 포기하지 않는 한 상한으로 총량을 누르는 것 말고는 마땅한 답이 없었다.

둘째, `next/image`는 원본 하나로 여러 너비의 변형을 만든다. srcset에 따라 어떤 기기는 640px 변형을, 어떤 기기는 1080px 변형을 요청하는데, 캐시에 1080px만 있는 상태에서 오프라인에 640px 요청이 오면 그대로 실패한다. URL이 다르니 캐시 미스가 나는 것이 당연하다. 이 문제는 요청 실패 시 같은 원본(`url` 파라미터)의 캐시된 다른 변형을 찾아 돌려주는 폴백으로 해결했다. 캐시를 앞에서부터 뒤져 처음 만나는 변형을 쓰므로 요청보다 크거나 작은 이미지가 나갈 수 있지만, 깨진 이미지보다는 낫다는 판단이다. HTML에서 이미지를 추출해 저장할 때도 원본당 1080px에 가장 가까운 변형 하나만 골라 저장해서, 변형이 무한정 쌓이는 것을 막았다.

## 캐시는 조용히 쌓인다: ?dpl= 쿼리와 엔트리 상한

기능이 자리를 잡자 이번에는 인프라 쪽에서 함정이 왔다. 이 워커를 만들던 당시 Vercel은 정적 자산 URL에 배포 식별자인 `?dpl=` 쿼리를 붙였다. 파일 내용이 같아도 배포할 때마다 URL이 달라지므로, cache-first로 저장하는 `static` 캐시에는 **내용이 같은 파일이 배포 수만큼 쌓인다**. 1편에서 본 대로 Cache Storage에는 TTL이 없다. 그대로 두면 캐시는 단조 증가한다.

덧붙이면 이 전제는 그 뒤에 바뀌었다. Vercel이 2026년 7월부터 내용 주소 기반(content-addressed)의 immutable 정적 자산 경로를 도입하면서(Next.js 16.3부터 기본 활성)[^1], 지금 이 블로그의 정적 자산 URL에는 `?dpl=`이 붙지 않는다. 그래도 엔트리 상한은 남겨뒀다. 배포마다 해시가 바뀌는 청크와 이미지 변형처럼, 캐시가 단조 증가하는 구조 자체는 그대로이기 때문이다.

Workbox라면 `ExpirationPlugin`이 해주는 일을 직접 만들어야 했다. 캐시별 엔트리 상한을 두고, 넣을 때마다 초과분을 오래된 것부터 지우는 방식이다.

```javascript
async function putWithTrim(cacheName, request, response) {
  const cache = await caches.open(cacheName)
  await cache.put(request, response)
  const max = MAX_ENTRIES[cacheName]
  const keys = await cache.keys()
  if (max && keys.length > max) {
    await Promise.all(
      keys.slice(0, keys.length - max).map((key) => cache.delete(key)),
    )
  }
}
```

`cache.keys()`가 삽입 순서를 보장한다는 점[^2]을 이용하면 별도의 타임스탬프 관리 없이 앞에서부터 지우는 것으로 LRU 비슷한 동작이 된다. 정확히는 LRI(Least Recently Inserted)인데, 같은 키를 다시 `put`하면 스펙상 엔트리가 리스트 끝으로 이동하므로 재삽입 기준으로 오래된 것부터 지워지는 셈이라 이 용도로는 충분했다. 상한은 static 500, pages 200, images 300, rsc 300으로 잡았다.

## 워커 자신을 배포하는 문제

캐시 로직이 몇 번 바뀌는 동안, 워커 자신의 배포도 설계 대상이라는 것이 분명해졌다. [1편](/2026/08/service-worker-caching-1)의 라이프사이클에서 본 대로, 새 워커는 설치되어도 대기 상태에 머물고 탭을 열어둔 채 새로고침만 하는 사용자는 옛 캐시 로직에 계속 붙잡힌다. 이 블로그에서는 대기를 건너뛰는 쪽을 선택했다.

```javascript
const PRECACHE_URLS = [OFFLINE_URL, '/']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).then(() => cache.match('/')))
      // 페이지 로드 중에 SW가 설치되면 이미 로드된 이미지는 fetch 이벤트를
      // 거치지 않으므로, 프리캐시한 홈의 이미지를 여기서 직접 저장한다
      .then((home) => (home ? saveImagesFromHTML(home.clone()) : null))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !ALL_CACHES.includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})
```

`skipWaiting()`으로 새 워커를 즉시 활성화하고, `clients.claim()`으로 열려 있는 탭의 제어권도 바로 가져온다. 그리고 활성화 시점에 버전이 다른 캐시를 전부 지운다. `CACHE_VERSION`을 `v4`로 올리면 `static-v3`, `pages-v3` 같은 옛 캐시가 이때 정리되는 식이다. 캐시 무효화 단위를 개별 엔트리가 아니라 캐시 이름의 버전으로 잡으면, "옛 로직이 만든 캐시를 새 로직이 읽는" 부류의 문제를 통째로 피할 수 있다.

다만 `skipWaiting()`이 정답인 것은 아니다. 실행 중인 페이지의 제어권을 도중에 가로채므로, 코드 스플리팅된 청크를 지연 로딩하는 앱에서는 옛 HTML이 새 워커의 캐시 로직과 만나 청크 로드가 깨질 수 있다. 이 블로그도 Next.js 앱인 이상 이 위험에서 자유롭지 않다. 다만 열린 탭이 한참 뒤에 새 청크를 지연 로딩할 일이 드문 콘텐츠 중심 사이트이고, 깨져도 새로고침으로 복구되는 읽기 전용 화면이라 감수할 만하다고 판단한 것이다. 앱의 구조에 따라서는 대기 상태를 유지하고 사용자에게 "새 버전이 있습니다" 알림을 주는 쪽이 맞을 것이다.

## 오프라인을 보이게 만들기

여기까지는 리소스를 저장하는 이야기였다. 그런데 오프라인 지원은 저장만으로는 완성되지 않는다. 사용자가 "이 글은 오프라인에서도 읽을 수 있다"는 사실을 알지 못하면 기능은 없는 것과 같기 때문이다.

그래서 소프트 내비게이션으로 읽은 글이 처음 오프라인 저장소에 들어간 시점에, 서비스 워커가 클라이언트로 메시지를 보내 화면 하단에 "✓ 오프라인에 저장됨" 토스트를 띄우도록 했다(주소창 직접 진입 같은 하드 내비게이션 경로로 저장될 때는 아직 토스트가 없다). 서비스 워커 쪽에서는 `client.postMessage()`를 부르면 되는데, 페이지 쪽에서 사소하지만 찾기 어려운 함정이 하나 있었다. `navigator.serviceWorker.addEventListener('message', ...)`만으로는 메시지가 오지 않는다. `startMessages()`를 명시적으로 불러야 큐에 쌓인 메시지의 디스패치가 시작된다[^3].

```typescript
if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js')
  navigator.serviceWorker.addEventListener('message', onMessage)
  navigator.serviceWorker.startMessages()
}
```

방문한 적 없는 페이지로의 진입에는 미리 프리캐시해 둔 `/offline` 안내 페이지를 응답한다. install 때는 이 안내 페이지와 함께 홈(`/`)도 프리캐시해 두므로, 설치 직후부터 최소한 홈은 오프라인에서 열린다. 매니페스트(`site.webmanifest`)까지 얹으면 홈 화면 설치가 가능한 PWA가 되는데, 매니페스트 자체는 아이콘과 이름을 선언하는 정적 파일이라 특별히 적을 것이 없다. PWA의 실질은 결국 서비스 워커 쪽에 있다.

![소프트 내비게이션으로 글에 들어가면 하단에 "오프라인에 저장됨" 토스트가 뜬다](./images/service-worker-caching/offline-saved-toast.png)

![네트워크를 끊고 새로고침해도 방금 읽은 글이 코드 하이라이트와 표까지 그대로 열린다](./images/service-worker-caching/offline-article.png)

## 정산: GA4에 남은 숫자들

효과가 있었는지는 추측할 필요가 없었다. 이 블로그는 [web-vitals 라이브러리](https://github.com/GoogleChrome/web-vitals)로 방문자의 핵심 웹 지표를 GA4 이벤트로 수집하고 있어서, 서비스 워커 배포 전후의 실사용자 데이터가 그대로 쌓여 있었다. 마침 비교 조건도 깨끗한 편이다. 캐싱 워커를 배포하기 전 한 달여 동안은 서비스 워커가 아예 등록되어 있지 않았고(이전에 있던 푸시 전용 워커도 제거된 상태였다), 배포 이후 구간은 책 출간으로 트래픽 구성이 바뀌기 전인 6월 말까지로 잘랐다.

> 측정 환경: web-vitals 라이브러리가 보고한 지표를 GA4 이벤트로 수집하고, GA4 Data API로 집계했다. 비교 구간은 서비스 워커가 없던 2026-04-21\~05-25와, 초기 버전 워커가 돌던 2026-05-27\~06-30이다. 글의 세대 라벨은 v1이 첫 캐싱 워커, v3이 뒤에 나올 이미지 수정판이다. 코드의 `CACHE_VERSION` 문자열은 푸시 전용 워커 시절과 구분하느라 v2부터 시작해 글 라벨과 하나씩 어긋나는데(글의 v1 = 코드 v2, 글의 v3 = 코드 v4), 혼동을 줄이기 위해 본문은 글 라벨로 통일한다. 한계를 미리 밝혀둔다. 첫째, GA4 Data API는 백분위수를 제공하지 않아 아래 수치는 모두 **평균**이다. 핵심 웹 지표의 표준인 p75가 아니므로 이상값의 영향을 받는다. 뒤에 나오듯 41.7초짜리 값이 섞이는 분포라, 표본 1천여 건의 평균이라도 오차가 수백 ms에 이를 수 있어 아래의 세 자리 숫자들은 그 해상도 안에서 읽어야 한다. 둘째, 통제된 실험이 아닌 관측 데이터라 기간에 따른 콘텐츠·트래픽 구성 변화가 섞여 있다. 셋째, 신규/재방문 구분은 GA4의 기본 분류를 그대로 쓴 것이라 쿠키 기반 식별의 한계를 물려받는다.

서비스 워커의 효과를 보려면 전체 평균보다 **신규 방문자와 재방문자를 갈라서** 볼 필요가 있다. 첫 방문의 첫 페이지는 서비스 워커가 아직 등록되기 전이라 영향이 제한적이고, 캐시가 쌓인 재방문자가 수혜 집단이기 때문이다. 재방문자 기준 결과는 다음과 같다.

| 지표 (재방문자, 평균) | SW 없음 (n=1,090~1,421) | SW v1 (n=1,295~1,821) | 변화       |
| --------------------- | ----------------------- | --------------------- | ---------- |
| FCP                   | 1,463ms                 | 829ms                 | **-43%**   |
| TTFB                  | 148ms                   | 673ms                 | **+525ms** |
| LCP                   | 885ms                   | 1,931ms               | **+118%**  |
| CLS                   | 0.168                   | 0.200                 | 소폭 악화  |

이 표에는 각주가 하나 필요하다. 기준 구간의 LCP 평균(885ms)이 FCP 평균(1,463ms)보다 작은데, 한 페이지뷰 안에서 LCP는 FCP보다 빠를 수 없으므로 이 역전은 두 지표의 보고 표본이 같지 않다는 뜻이다. web-vitals의 LCP는 사용자 상호작용이나 탭 전환 시점에야 확정되어 전송되므로, 어떤 페이지뷰가 LCP를 남기는가부터가 편향된 표본이고(실제 표본 수도 TTFB > FCP > LCP 순으로 줄어든다), 지표별 전후 비교는 각 지표의 표본끼리 견주는 것이라 성립하지만 지표 사이를 가로질러 읽는 것은 이 표에서 성립하지 않는다.

FCP의 개선 폭이 상당한데, 이것을 워커의 효과로 볼 여지를 키워주는 근거가 신규 방문자 쪽에 있다. 같은 기간 신규 방문자의 FCP는 1,337ms에서 1,314ms로 사실상 변화가 없었다. 혜택을 받기 어려운 집단은 그대로이고 받을 수 있는 집단만 좋아졌으니, 정적 자산과 폰트를 Cache Storage에서 즉시 응답한 효과가 있었다고 보는 것이 자연스럽다.

다만 이 대조를 인과의 증명으로 쓰기에는 유보가 필요하다. 우선 대조가 깨끗하지 않다. 신규 방문자도 첫 세션의 두 번째 페이지뷰부터는 워커의 제어를 받고, 바로 아래에서 보듯 신규 방문자의 TTFB는 함께 움직였다. 다음으로 효과의 크기가 메커니즘만으로 다 설명되지 않는다. 재방문자라면 정적 자산 상당수가 HTTP 캐시에도 있었을 텐데 그 대비로도 634ms가 줄었다는 뜻이라, 기간 간 구성 변화가 일부 섞여 있다고 보는 것이 안전하다. 숫자 하나를 더 병기해 두면, v1 구간을 6월 말에서 자르지 않고 v3 배포 직전까지 늘려 잡으면 재방문자 FCP 평균은 1,066ms로, 개선 폭은 -43%가 아니라 -27%가 된다. 7월 이후는 책 출간으로 트래픽 구성이 바뀐 구간이라 본문 비교에서 제외했지만, 컷 위치에 따라 수치가 이만큼 움직인다는 것 자체가 이 비교의 해상도다. 기간 비교와 방문자 유형 비교는 어디까지나 근사이고, 이 구분을 정확히 하려고 뒤에서 `sw_controlled` 계측을 추가했다.

반대 방향의 숫자도 정직하게 봐야 한다. TTFB는 재방문자 기준 148ms에서 673ms로 크게 나빠졌다. 신규 방문자도 293ms에서 398ms로 올랐다. 내비게이션이 network-first 전략을 타면서 워커 기동과 fetch 경유가 첫 바이트 앞에 끼어든 것이 주된 용의자다. 다만 크기에는 유보를 달아야 한다. 1편에서 웜 기동은 2ms 안팎이었으니 이 평균을 만든 것은 대부분 콜드 기동일 텐데, 콜드 기동의 크기를 직접 잰 값은 없다(1편에서 본 대로 DevTools를 열면 재현되지 않는다). +525ms 전부를 워커 비용으로 귀속하는 것은 그래서 아직 단정이 아니고, 뒤에 나올 `sw_controlled` 계측으로 같은 기간 안에서 갈라 확인할 남은 과제다. 흥미로운 것은 그럼에도 FCP가 좋아졌다는 점이다. 첫 바이트는 늦어졌지만, 그 뒤에 오는 렌더링 차단 리소스들이 캐시에서 즉시 나오면서 첫 페인트까지의 총합은 오히려 줄었다. TTFB만 보고 있었다면 이 배포는 성능 후퇴로 읽혔을 것이다. 지표 하나로 캐싱 레이어를 평가하면 안 되는 이유다.

표에서 가장 조용한 줄인 CLS도 짚고 가야 한다. 서비스 워커는 응답의 바이트를 바꾸지 않으므로 CLS를 움직일 인과 경로가 마땅히 없다. 그런데도 0.168에서 0.200으로 19%가 움직였다는 것은, 두 기간의 콘텐츠·트래픽 구성이 완전히 동질하지 않다는 신호로 읽는 것이 맞다. 위의 FCP 개선 폭에도 그만큼의 불확실성이 얹혀 있는 셈이다.

문제는 재방문자 LCP가 885ms에서 1,931ms로 나빠졌다는 것이었다. 처음에는 v1 워커의 결함을 의심했다. 당시 v1은 `/_next/image` 최적화 요청을 이미지로 분류하지 못하고(확장자 기반 판별이라 쿼리 스트링 URL을 놓쳤다) network-first로 흘려보내고 있었다. LCP 요소가 이미지인 페이지라면 캐시의 혜택 없이 워커 경유 비용만 매번 치른 셈이니, 그럴듯한 용의자였다.

그런데 데이터를 더 가르자 다른 그림이 나왔다. 페이지 유형별(전체 방문 기준이라 재방문자 표와 모집단이 달라 직접 비교는 아니고 경향 확인용이다)로 보면 LCP 요소가 썸네일 이미지인 홈과 목록 페이지는 629ms에서 740ms로 +112ms 수준이고, 악화는 LCP가 대부분 텍스트인 글 본문 페이지(1,244ms → 2,043ms)에 집중되어 있었다. 이미지 가설과 맞지 않는 분포다. 기기 구성 변화도 아니었다(데스크톱만 떼어 봐도 +651ms). 남은 교란은 기간마다 인기 글이 달랐다는 콘텐츠 구성 효과여서, 양쪽 기간 모두 표본이 30건 이상인 같은 글끼리 짝지어 비교했다. 그러자 그림이 달라졌다. 짝지은 14개 경로의 표본 가중 평균 악화는 +1,079ms로 여전히 커 보였는데, 그중 한 글의 v1 구간 평균 LCP가 41.7초였다. 표본 30건 이상의 평균이 41.7초라는 것은 튀는 관측 하나가 아니라, 그 글에서 v1 기간에 지속적으로 일어난 정체 모를 현상이라는 뜻이다. 이 글을 제외하면 같은 글 기준 악화는 **+191ms**로 모든 요청이 워커를 한 번 더 거치는 비용으로 설명되는 규모지만, 제외한 그 현상이 v1 워커가 유발한 것일 가능성도 배제하지 못하므로 결론에는 두 숫자를 다 남겨야 한다. 포함하면 +1,079ms, 제외하면 +191ms다.

정리하면 "LCP 1초 악화"의 실체는, 워커 경유로 인한 200ms 안팎의 회귀에 한 글의 설명되지 않는 41.7초가 얹혀 평균이 끌려간 것으로 보인다. GA4 Data API가 p75를 주지 못하고 평균만 주는 한계가 하마터면 엉뚱한 결론(이미지 캐싱 결함이 주범)으로 이어질 뻔한 사례다. 41.7초의 정체는 아직 모른다. 특정 글에서만 나온다는 것은 콘텐츠 문제일 수도, 계측 문제일 수도, v1 워커가 그 글에서만 밟은 지뢰일 수도 있는데, 값 하나만 수집하는 지금의 계측으로는 여기까지가 한계였다. 고백해 두면 이 짝지은 경로 분석은 악화가 보인 LCP에만 적용했고, 개선으로 나온 FCP에는 같은 검증을 하지 않았다. 기준선 구간에 반대 방향의 극단값이 없었는지 확인하지 않았다는 뜻이므로, 앞의 -43%도 같은 종류의 왜곡 가능성을 안고 있다.

그래서 계측부터 고쳤다. web-vitals를 [attribution 빌드](https://github.com/GoogleChrome/web-vitals#attribution)로 교체하면 지표값과 함께 원인 추적용 정보가 따라온다. LCP라면 어느 요소였는지(CSS 셀렉터), 이미지라면 어떤 리소스였는지(URL), 그리고 전체 시간이 TTFB, 리소스 로드 지연, 리소스 로드 시간, 렌더 지연 중 어디서 쓰였는지가 나뉘어 나온다. 여기에 모든 지표 공통으로 내비게이션 유형과 서비스 워커 제어 여부를 파라미터로 실었다.

```typescript
const params = {
  value: Math.round(name === 'CLS' ? value * 1000 : value),
  navigation_type: navigationType,
  sw_controlled: navigator.serviceWorker?.controller ? 'yes' : 'no',
}

if (name === 'LCP') {
  const {attribution} = metric
  params.lcp_target = attribution.target // LCP 요소의 CSS 셀렉터
  params.lcp_url = attribution.url // 이미지라면 리소스 URL
  params.lcp_ttfb = Math.round(attribution.timeToFirstByte)
  params.lcp_resource_load_delay = Math.round(attribution.resourceLoadDelay)
  params.lcp_resource_load_duration = Math.round(
    attribution.resourceLoadDuration,
  )
  params.lcp_element_render_delay = Math.round(attribution.elementRenderDelay)
}
```

`sw_controlled`가 특히 요긴하다. 지금까지는 "서비스 워커 배포 전후"라는 기간 비교로 효과를 추정했지만, 이제부터는 같은 기간 안에서 워커가 제어한 페이지 뷰와 아닌 페이지 뷰를 직접 가를 수 있다. 다음 극단값이 나타나면 어느 글의 어느 요소가 어떤 단계에서 늦었는지가 데이터에 그대로 찍힐 것이다. 참고로 이런 커스텀 파라미터는 GA4 관리 화면에서 이벤트 범위의 커스텀 측정기준으로 등록해야 Data API로 조회할 수 있다.

그런데 2주쯤 데이터가 쌓인 뒤 적재량을 점검하다가 위 `sw_controlled` 줄이 틀렸다는 것을 알게 됐다. 같은 페이지 뷰에서 다섯 지표가 모두 나가므로 지표마다 `no`의 수가 비슷해야 하는데, 8월 21일부터 닷새 동안 TTFB와 FCP의 `no`는 214건과 207건인 반면 LCP는 40건, INP는 9건뿐이었다.

원인은 판정 시점이다. 이 워커는 `skipWaiting()`과 `clients.claim()`을 호출하므로, 첫 방문 페이지도 워커가 활성화되는 순간부터 `navigator.serviceWorker.controller`를 갖게 된다. 그 페이지의 내비게이션 요청은 워커를 거치지 않았는데도 그렇다. TTFB와 FCP는 로드 직후에 보고돼 활성화보다 앞서지만, LCP와 CLS, INP는 사용자가 상호작용하거나 페이지를 떠날 때 보고되므로 그 시점에는 이미 `controller`가 있다. 결과적으로 첫 방문의 LCP가 대부분 `yes`로 분류됐고, 닷새치 LCP 대조(`yes` 1,583ms 대 `no` 2,909ms)는 워커 효과가 아니라 늦게까지 머문 첫 방문자가 섞여 들어간 수치가 됐다.

판정 기준을 보고 시점과 무관한 값으로 바꿨다. `PerformanceNavigationTiming`의 `workerStart`는 내비게이션 요청을 처리하려고 워커를 기동한 시각으로, 워커를 거치지 않은 요청에서는 0이다.

```typescript
function isNavigationServedByServiceWorker() {
  const [navigation] = performance.getEntriesByType(
    'navigation',
  ) as PerformanceNavigationTiming[]
  return (navigation?.workerStart ?? 0) > 0
}
```

교훈은 소박하다. `controller`는 "지금 이 페이지를 워커가 제어하는가"에 답하고, `workerStart`는 "이 페이지의 응답이 워커를 거쳤는가"에 답한다. `clients.claim()`을 쓰는 워커에서 성능 지표에 필요한 것은 후자다. 수정 전에 쌓인 LCP, CLS, INP의 `sw_controlled`는 버려야 하고, TTFB와 FCP만 쓸 수 있다.

그래서 `/_next/image`를 cache-first로 분류하도록 고쳤다(이 수정은 본문 이미지 프리캐시와 함께 같은 날 v3으로 묶여 배포됐다). 주범은 아니었지만 워커 경유 비용을 없앨 수 있는 지점인 것은 맞다. 배포 당일 하루치 초기 신호는 재방문자 평균 LCP 951ms, TTFB 391ms, FCP 603ms로 모두 v1 전체 구간(앞 표의 6월 말까지가 아니라 v1이 돌던 5월 말부터 v3 배포 전까지 전부를 집계한 것으로, 각각 1,532ms, 859ms, 1,066ms)보다 좋다. 다만 이 기준선은 앞 표와 달리 책 출간 이후의 트래픽 변동 구간까지 포함해 v1에 불리한 비교이고, 표본이 지표당 120~170건뿐인 데다 위에서 봤듯 평균은 극단값 몇 개에 크게 흔들리므로 어디까지나 참고 수준이다. 몇 주쯤 데이터가 쌓이면 후속으로 확인해 볼 생각이다.

![서비스 워커 배포 전후 재방문자와 신규 방문자의 FCP·TTFB 평균 비교](./images/service-worker-caching/ga4-fcp-ttfb-before-after.png)

## 남은 과제와 솔직한 결론

TTFB 악화(재방문자 평균 +525ms)의 귀속은 위 계측 결함에서 살아남은 TTFB의 `sw_controlled`로 일부 확인할 수 있었다. 다만 `navigate`끼리의 대조는 쓸 수 없다. `no`는 첫 방문이라 DNS와 TLS 연결 비용이 얹혀 있어 워커 비용과 상쇄되고, 실제로 8월 13일부터 2주간 평균은 `no` 556ms(510건), `yes` 508ms(604건)로 거의 같았다. 대신 `navigation_type`이 `reload`인 표본은 양쪽 다 재방문이고 연결이 이미 열려 있어, 차이가 워커 경유 여부(하드 리로드는 워커를 우회한다)로 좁혀진다. 여기서는 `no` 51ms(12건), `yes` 595ms(64건)였다. 표본이 작아 정황 이상으로 쓰기는 어렵지만, 워커 경유 비용이 500ms 안팎이라는 위의 가설과 방향이 맞는다. 워커 기동을 기다리지 않고 내비게이션 요청을 먼저 출발시키는 navigation preload가 이 숫자를 회복할 다음 과제로 남아 있다.

이 블로그의 명분에 대해서도 정직해질 필요가 있다. "지하철에서 읽다가 터널에 들어가도 끊기지 않는 읽을거리"라는 명분으로 만들었지만, 그 명분조차 아직 절반만 채웠다. 터널은 완전 오프라인이 아니라 연결은 있는데 하염없이 느린 상태(lie-fi)인 경우가 많은데, network-first는 fetch가 실패해야 캐시로 넘어가므로 타임아웃 폴백이 없는 지금 구현은 그 상태에서 무력하다. 비행기 모드처럼 깨끗하게 실패하는 오프라인에서만 온전히 동작하는 셈이다.

돌아보면 이 연대기에서 작업량의 대부분은 캐싱 전략 자체가 아니라, App Router라는 프레임워크가 만드는 요청의 모양을 이해하는 데 들어갔다. 그리고 효과와 비용은 실사용자 데이터에 모두 남았는데, 어느 한 지표만 보았다면 이 배포를 완전히 잘못 평가했을 것이다. 서비스 워커 캐싱을 도입한다면 전후를 비교할 실사용자 지표 수집부터 갖추는 것이 순서라고 생각한다. 마지막으로, **필요하지 않다면 만들지 않는 것도 설계**다. fetch 핸들러는 모든 요청에 비용을 부과하고, 잘못 배포된 워커는 스스로 회수해야 한다. 그 기준으로 보면 이 블로그 자체는 절반의 요구와 절반의 학습 목적으로 만든, 경계선 위의 사례라는 것을 인정한다. 오프라인이라는 명확한 요구가 있을 때, 그때 이 시리즈가 지도가 되기를 바란다.

---

[^1]: [Optimized CDN caching and deploying of immutable static assets](https://vercel.com/changelog/optimized-cdn-caching-and-deploying-of-immutable-static-assets), Vercel Changelog (2026-07).

[^2]: [Cache.keys()](https://developer.mozilla.org/en-US/docs/Web/API/Cache/keys), MDN. 요청이 삽입된 순서로 반환됨을 명시한다.

[^3]: [ServiceWorkerContainer.startMessages()](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/startMessages), MDN 및 [스펙의 startMessages() 정의](https://w3c.github.io/ServiceWorker/#dom-serviceworkercontainer-startmessages). client message queue는 `startMessages()` 호출 또는 `onmessage` setter 지정으로만 활성화된다.
