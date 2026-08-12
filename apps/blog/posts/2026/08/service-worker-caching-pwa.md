---
title: '비행기 모드에서도 열리는 블로그: 서비스 워커 캐싱을 직접 설계하며 배운 것들'
tags:
  - web-performance
  - service-worker
  - pwa
  - nextjs
published: false
date: 2026-08-12 20:00:00
description: '『프런트엔드 성능 최적화 Deep Dive』의 캐시 장에서 끝내 다루지 못한 주제가 서비스 워커 캐싱이다. 마침 이 블로그를 PWA로 만들면서 Workbox 없이 서비스 워커를 직접 설계했다. App Router의 RSC 요청, next/image의 srcset, Vercel의 ?dpl= 쿼리 같은 함정들을 지나 GA4 실측까지 갔더니, 재방문자 FCP는 평균 43% 좋아지고 TTFB는 4배 나빠져 있었다. 얻은 것과 잃은 것을 모두 기록한다.'
thumbnail: /thumbnails/2026/08/service-worker-caching-pwa.png
---

## Table of Contents

## 책에 넣지 못한 캐시 한 층

이 블로그는 이제 비행기 모드에서도 열린다. 한 번 읽은 글은 네트워크가 끊겨도 본문 이미지까지 그대로 보이고, 방문한 적 없는 글로 이동하면 오프라인 안내 페이지가 뜬다. 이 동작을 만드는 데 필요한 것은 400줄 남짓의 서비스 워커 파일 하나였다. 다만 그 400줄에 도달하기까지의 과정은 예상보다 험난했다. 처음 배포한 버전은 목록에서 클릭해 들어간 글을 오프라인에서 열지 못했고, 그다음 버전은 글은 열리는데 이미지가 전부 깨졌다.

사실 이 글에는 약간의 부채 의식이 있다. 얼마 전 출간한 [『프런트엔드 성능 최적화 Deep Dive』](/2026/07/frontend-performance-deep-dive-is-out-now)에서 브라우저 캐시를 한 장에 걸쳐 다뤘는데, 캐시의 세 레이어(브라우저 캐시, CDN 캐시, 서비스 워커 캐시) 중 서비스 워커 캐시만큼은 충분히 파고들지 못했다. `Cache-Control` 지시어, 파일명 해싱, Stale-While-Revalidate, BFCache까지 쓰고 나니 분량이 감당되지 않았다는 것이 솔직한 이유다. 마침 책을 마무리한 뒤 이 블로그를 PWA로 만들면서 서비스 워커 캐싱을 직접 설계할 일이 생겼고, 문서만 읽어서는 알 수 없었던 함정들을 여럿 만났다. 그 기록을 책에서 못 다한 이야기 삼아 남겨둔다.

미리 밝혀두면 이 글의 절반은 서비스 워커 캐싱의 일반론이 아니라 Next.js App Router라는 특정 환경에서의 각론이다. 소프트 내비게이션과 RSC(React Server Components) 요청, `next/image`의 srcset, Vercel 배포가 붙이는 `?dpl=` 쿼리처럼, 프레임워크와 인프라가 만들어내는 요청의 모양을 이해하지 못하면 서비스 워커 캐싱은 반쪽짜리가 된다. 반대로 말하면, 이 각론이야말로 Workbox 같은 범용 라이브러리가 대신해 줄 수 없는 부분이기도 하다.

## 먼저 결론

본문이 길어서, 핵심을 먼저 요약해 둔다.

- 서비스 워커 캐시는 HTTP 캐시를 대체하는 것이 아니라 **그 앞에 놓이는 별도의 레이어**다. 요청은 서비스 워커 → HTTP 캐시 → 네트워크 순서로 흐르고, 서비스 워커 안에서 부른 `fetch()`도 HTTP 캐시를 거친다.
- HTTP 캐시와 달리 서비스 워커의 Cache Storage에는 **만료라는 개념 자체가 없다**. 넣은 것은 직접 지우기 전까지 남는다. 버전 관리와 청소를 설계하지 않으면 캐시는 반드시 썩는다.
- App Router에서는 **소프트 내비게이션이 HTML 요청을 만들지 않는다**. 링크를 눌러 이동한 글은 `?_rsc=` 쿼리가 붙은 RSC 페이로드로만 도착하므로, 그것만 캐시하면 오프라인 새로고침과 직접 진입이 안 된다. 실제로 방문한 페이지의 HTML을 백그라운드에서 따로 저장해야 했다.
- 프리페치와 실제 방문을 구분하지 않으면 **방문한 적 없는 글까지 캐시에 쌓인다**. Next.js가 붙이는 `next-router-prefetch` 헤더로 걸러냈다.
- `next/image`는 원본 하나에 여러 너비의 변형을 만든다. 오프라인에서 캐시에 없는 너비를 요청받으면, 같은 원본의 **캐시된 다른 변형이라도 찾아 돌려주는** 폴백이 필요했다.
- Vercel은 정적 자산에 배포마다 바뀌는 `?dpl=` 쿼리를 붙인다. 내용이 같은 파일이 배포할 때마다 새 엔트리로 쌓이므로, 캐시별 엔트리 상한을 두고 오래된 것부터 지웠다.
- GA4에 쌓인 실측(평균 기준)으로는 **재방문자의 FCP가 1,463ms에서 829ms로 좋아졌다**. 같은 기간 신규 방문자는 거의 변화가 없어서(1,337ms → 1,314ms) 우연이 아니라고 볼 근거가 된다. 대신 모든 내비게이션이 워커를 경유하는 대가로 **재방문자의 TTFB는 148ms에서 673ms로 나빠졌다**. 얻은 것과 잃은 것이 모두 숫자로 남았다.
- LCP는 언뜻 1초 나빠진 것처럼 보였다. 하지만 같은 글끼리 짝지어 비교하니 실제 회귀는 +191ms였고, 나머지는 한 글의 41.7초짜리 극단값에 평균이 끌려간 것이었다. p75 없이 평균만 주는 GA4 Data API로 성능을 판단할 때 조심해야 하는 이유다.
- 서비스 워커는 공짜가 아니다. fetch 핸들러가 있으면 모든 요청이 워커 기동을 기다린다. 아무 일도 안 하는 핸들러는 Chrome이 콘솔 경고를 띄우고 아예 건너뛸 정도로, **확실한 이득이 있을 때만 요청 경로에 끼어들어야 한다**.

각 항목의 근거는 본문에서 하나씩 설명한다.

## 서비스 워커 캐시는 HTTP 캐시가 아니다

먼저 두 캐시의 관계부터 정리할 필요가 있다. 서비스 워커 캐싱을 처음 접하면 HTTP 캐시의 대체재처럼 보이지만, 실제로는 요청 경로에서 서로 다른 위치에 놓인 별개의 레이어다. 브라우저가 리소스를 찾는 순서는 다음과 같다[^1].

1. **서비스 워커의 fetch 핸들러**: 등록된 서비스 워커가 요청을 가로채 Cache Storage에서 응답하거나, 네트워크로 넘긴다.
2. **HTTP 캐시**: 서비스 워커가 `fetch()`를 부르거나 요청을 가로채지 않으면, 브라우저의 HTTP 캐시가 `Cache-Control` 규칙대로 동작한다.
3. **네트워크**: 둘 다 놓치면 서버까지 간다.

여기서 중요한 것은 서비스 워커 안에서 실행한 `fetch()`도 HTTP 캐시를 통과한다는 점이다. 서비스 워커에서 network-first 전략을 짰다고 해서 항상 서버까지 가는 것이 아니다. HTTP 캐시에 유효한 사본이 있으면 그것이 반환된다. 그래서 두 레이어의 만료 정책이 어긋나면 "분명 새로 배포했는데 서비스 워커가 옛날 응답을 캐시하는" 식의, 어느 한쪽만 봐서는 설명되지 않는 문제가 생긴다. web.dev의 가이드도 이 지점을 지적하면서, 서비스 워커 쪽에 더 긴 유효 기간과 주도권을 주고 HTTP 캐시를 보조로 두는 구성을 권한다[^1].

두 캐시의 성격 차이는 표로 정리하면 명확하다.

| 구분        | HTTP 캐시                           | 서비스 워커 캐시 (Cache Storage)            |
| ----------- | ----------------------------------- | ------------------------------------------- |
| 제어 주체   | 서버가 헤더로 선언, 브라우저가 집행 | 개발자가 코드로 직접 제어                   |
| 만료        | `max-age` 등 TTL 기반 자동 만료     | **만료 없음**. 직접 지우기 전까지 영구      |
| 저장 시점   | 응답을 받으면 자동 저장             | `cache.put()`을 불러야 저장                 |
| 오프라인    | 만료된 리소스는 사용 불가           | 네트워크 상태와 무관하게 코드가 결정        |
| 실수의 대가 | 잘못돼도 TTL이 지나면 회복          | 잘못된 코드가 배포되면 **직접 회수해야 함** |

이 표의 마지막 두 줄이 서비스 워커 캐싱의 본질이라고 생각한다. 만료가 없고 모든 것을 코드로 제어한다는 것은 강력함인 동시에, HTTP 캐시가 공짜로 해주던 일들(만료, 용량 관리, 실수로부터의 자동 회복)을 전부 직접 설계해야 한다는 뜻이다. 이 글의 나머지는 사실상 그 설계의 기록이다.

## Workbox를 쓰지 않은 이유

서비스 워커 캐싱을 시작하면 대부분 [Workbox](https://developer.chrome.com/docs/workbox)를 먼저 만난다. 프리캐싱, 런타임 캐싱 전략, 만료 관리까지 검증된 구현을 제공하는 구글의 라이브러리이고, 일반적인 경우라면 지금도 Workbox나 그 위에 얹힌 프레임워크 통합을 쓰는 것이 맞다고 생각한다. 바퀴를 다시 발명하는 것이 목적이 아니라면 말이다.

그럼에도 이 블로그에서는 서비스 워커를 처음부터 직접 썼다. 이유는 두 가지였다. 하나는 뒤에서 다룰 App Router 특유의 요청들(RSC 페이로드, 프리페치, `next/image` 변형) 때문이다. 이 요청들을 어떻게 캐시할지는 "cache-first냐 network-first냐" 수준의 전략 선택이 아니라, 요청의 헤더와 쿼리를 뜯어보고 프레임워크의 폴백 동작까지 이용해야 하는 문제였고, 추상화 위에서 하기보다 바닥에서 직접 하는 편이 오히려 단순했다. 다른 하나는 솔직히 학습 목적이다. 책에서 못 다룬 주제를 라이브러리 설정으로 때우면 이번에도 이해 없이 지나갈 것 같았다.

결과적으로 의존성 없는 400줄짜리 `sw.js` 하나가 나왔고, 무슨 일이 일어나는지 전부 설명할 수 있게 됐다. 물론 그 400줄에 도달하기까지 Workbox가 이미 풀어놓은 문제들(엔트리 상한, 오프라인 폴백)을 다시 푸는 비용을 치렀다. 이 트레이드오프는 각자의 상황에 따라 다르게 계산될 것이다.

## 캐시를 넷으로 나눈 이유

설계의 출발점은 "무엇을 어떤 전략으로 캐시할 것인가"를 리소스 유형별로 정하는 일이었다. 모든 요청에 같은 전략을 적용할 수 없는 이유는 명확하다. 파일명에 해시가 박힌 정적 자산은 영원히 캐시해도 안전하지만, HTML은 배포마다 바뀌어야 한다. 그래서 캐시를 용도별로 넷으로 나누고, 각각 다른 전략을 배정했다.

```javascript
const CACHE_VERSION = 'v4'
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

전략을 가른 기준은 하나다. **이 리소스가 낡은 채로 보여도 되는가.** 해시가 박힌 정적 자산과 이미지는 URL이 곧 내용이므로 낡을 수가 없다. 캐시에 있으면 네트워크를 볼 이유가 없으니 cache-first다. 반면 HTML과 RSC 페이로드는 같은 URL의 내용이 배포마다 바뀐다. 온라인일 때는 항상 최신을 보여주고, 캐시는 오프라인일 때의 보험으로만 쓰는 network-first가 맞다. 책에서 다뤘던 `Cache-Control` 설계와 판단 기준 자체는 같고, 집행 위치가 헤더에서 코드로 옮겨왔을 뿐이다.

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

한 가지 덧붙이면, 애널리틱스처럼 캐시해서는 안 되는 요청은 아예 `respondWith()`를 부르지 않고 리턴한다. 서비스 워커가 관여하지 않은 요청은 원래의 네트워크 경로(HTTP 캐시 포함)를 그대로 탄다. 모든 요청을 가로채야 한다는 강박을 버리는 것이, 뒤에서 다룰 오버헤드 문제 때문에도 중요하다.

## App Router가 만드는 함정들

여기서부터가 문서에 없던 부분이다. 위의 설계는 전통적인 MPA라면 그대로 동작했겠지만, App Router 위에서는 연달아 구멍이 드러났다. 커밋 히스토리를 보면 "PWA 지원 추가" 뒤에 "방문한 페이지가 오프라인에서 안 열리는 버그 수정", "본문 이미지가 캐시되지 않는 버그 수정"이 줄줄이 이어진다. 하나씩 살펴본다.

### 소프트 내비게이션은 HTML을 남기지 않는다

첫 번째 구멍은 이렇게 발견됐다. 홈에서 글 목록을 눌러 읽고, 비행기 모드를 켜고 새로고침을 하면 방금 읽은 글이 열리지 않았다. 원인은 App Router의 동작 방식에 있다. 링크 클릭으로 일어나는 소프트 내비게이션은 문서(HTML) 요청을 만들지 않는다. 대신 `?_rsc=` 쿼리가 붙은 fetch로 RSC 페이로드만 받아 클라이언트에서 화면을 갱신한다. 즉 `request.mode === 'navigate'` 분기는 첫 진입에서만 타고, 그 뒤로 아무리 글을 읽어도 `pages` 캐시에는 HTML이 쌓이지 않는 것이다.

그래서 RSC 요청을 처리할 때, 그 페이지의 HTML을 백그라운드에서 별도로 받아 저장하는 우회로를 만들었다.

```javascript
async function savePageHTML(request, clientId) {
  const url = new URL(request.url)
  url.searchParams.delete('_rsc')
  const cache = await caches.open(PAGES_CACHE)
  const response = await fetch(url.href)
  if (!response.ok) return
  await putWithTrim(PAGES_CACHE, url.href, response.clone())
  await saveImagesFromHTML(response)
}
```

`_rsc` 쿼리를 떼면 같은 경로의 문서 URL이 되므로, 그것을 다시 fetch해서 HTML로 저장한다. 요청이 한 번 더 나가는 비용이 있지만 백그라운드(`event.waitUntil`)에서 일어나므로 사용자 경험에는 영향이 없고, 이 HTML이 있어야 오프라인에서의 새로고침과 URL 직접 진입이 가능해진다.

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

오프라인에서 캐시에 없는 글로 소프트 내비게이션이 일어나면 어떻게 해야 할까. RSC 요청이 실패했을 때 아무 응답이나 돌려주면 App Router는 화면을 갱신하지 못한 채 멈춘다. 여기서 프레임워크의 폴백 동작을 이용했다. 캐시에 없는 RSC 요청에 503을 돌려주면 Next.js 라우터는 해당 내비게이션을 MPA 방식(문서 전체 요청)으로 폴백한다. 그 문서 요청은 다시 서비스 워커의 `navigate` 분기로 들어오고, 거기서 캐시된 HTML이 있으면 그것을, 없으면 오프라인 안내 페이지를 응답한다. 서비스 워커 단독으로는 풀 수 없고, 프레임워크가 실패에 어떻게 반응하는지까지 알아야 이어지는 그림이다.

### 이미지는 두 번 배신한다

글은 열리는데 이미지가 깨지는 문제는 원인이 둘이었다. 첫째, 본문 이미지는 지연 로딩된다. 뷰포트 밖의 이미지는 fetch 이벤트 자체가 발생하지 않으므로, 글을 끝까지 스크롤하지 않으면 그 이미지들은 캐시에 들어올 기회가 없다. 그래서 페이지 HTML을 저장할 때 `<img>` 태그를 파싱해 이미지 URL을 추출하고, 백그라운드에서 미리 받아 저장하도록 했다. 외부 도메인 이미지는 `no-cors`로 가져와 opaque 응답을 그대로 저장한다.

둘째, `next/image`는 원본 하나로 여러 너비의 변형을 만든다. srcset에 따라 어떤 기기는 640px 변형을, 어떤 기기는 1080px 변형을 요청하는데, 캐시에 1080px만 있는 상태에서 오프라인에 640px 요청이 오면 그대로 실패한다. URL이 다르니 캐시 미스가 나는 것이 당연하다. 이 문제는 요청 실패 시 같은 원본(`url` 파라미터)의 캐시된 다른 변형을 찾아 돌려주는 폴백으로 해결했다. 약간 큰 이미지가 나가는 한이 있어도 깨진 이미지보다는 낫다는 판단이다. HTML에서 이미지를 추출해 저장할 때도 원본당 1080px에 가장 가까운 변형 하나만 골라 저장해서, 변형이 무한정 쌓이는 것을 막았다.

### Vercel의 ?dpl= 쿼리와 만료 없는 캐시

마지막 함정은 인프라에서 왔다. Vercel은 정적 자산 URL에 배포 식별자인 `?dpl=` 쿼리를 붙인다. 파일 내용이 같아도 배포할 때마다 URL이 달라지므로, cache-first로 영구 저장하는 `static` 캐시에는 **내용이 같은 파일이 배포 수만큼 쌓인다**. 앞서 말했듯 Cache Storage에는 만료가 없다. 그대로 두면 캐시는 단조 증가한다.

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

`cache.keys()`가 삽입 순서를 보장한다는 점[^2]을 이용하면 별도의 타임스탬프 관리 없이 앞에서부터 지우는 것으로 LRU 비슷한 동작이 된다. 정확히는 LRI(Least Recently Inserted)이지만, 이 용도로는 충분했다.

## 배포했는데 옛날 버전이 보인다면

서비스 워커 캐싱에서 가장 악명 높은 문제는 따로 있다. 배포를 했는데 사용자가 며칠째 옛 버전을 보는 상황이다. 서비스 워커의 라이프사이클과 얽혀 있어서, 캐시 전략이 완벽해도 이 부분을 놓치면 고생하게 된다.

동작을 요약하면 이렇다. 브라우저는 내비게이션 때마다 등록된 서비스 워커 스크립트의 업데이트를 확인하고, 바이트가 하나라도 다르면 새 워커를 설치한다[^3]. 문제는 새 워커가 설치되어도 기존 워커가 제어하는 탭이 모두 닫히기 전까지는 **대기(waiting) 상태로 멈춰 있다**는 점이다. 탭을 계속 열어두고 새로고침만 하는 사용자는 옛 워커, 즉 옛 캐시 로직에 계속 붙잡혀 있게 된다.

이 블로그에서는 대기를 건너뛰는 쪽을 선택했다.

```javascript
self.addEventListener('install', (event) => {
  event.waitUntil(/* 프리캐시 */ self.skipWaiting())
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

다만 `skipWaiting()`이 정답인 것은 아니다. 실행 중인 페이지의 제어권을 도중에 가로채므로, 코드 스플리팅된 청크를 지연 로딩하는 앱에서는 옛 HTML이 새 워커의 캐시 로직과 만나 청크 로드가 깨질 수 있다. 이 블로그는 페이지 단위 캐싱이라 안전하다고 판단했지만, 앱의 구조에 따라서는 대기 상태를 유지하고 사용자에게 "새 버전이 있습니다" 알림을 주는 쪽이 맞을 것이다.

하나 더 알아두면 좋은 것이 있다. 서비스 워커 스크립트 자체는 기본적으로 HTTP 캐시를 우회해서 매번 새로 받아온다. `updateViaCache` 옵션으로 캐시를 쓰게 하더라도 24시간 이상 캐시된 사본은 쓰지 않도록 스펙에 못 박혀 있다[^3]. 잘못된 워커가 배포돼도 최대 하루 안에는 교체 기회가 온다는 뜻인데, 뒤집어 말하면 하루 동안은 잘못된 코드가 모든 요청을 주무를 수 있다는 뜻이기도 하다. 서비스 워커 배포에 유독 보수적이어야 하는 이유이고, 최악의 경우를 대비해 캐시를 비우고 스스로 등록 해제하는, 이른바 kill switch 워커를 배포하는 탈출로도 알려져 있다[^4].

## 오프라인을 UX로 만들기

여기까지는 리소스를 저장하는 이야기였다. 그런데 오프라인 지원은 저장만으로는 완성되지 않는다. 사용자가 "이 글은 오프라인에서도 읽을 수 있다"는 사실을 알지 못하면 기능은 없는 것과 같기 때문이다.

그래서 페이지가 처음 오프라인 저장소에 들어간 시점에, 서비스 워커가 클라이언트로 메시지를 보내 화면 하단에 "✓ 오프라인에 저장됨" 토스트를 띄우도록 했다. 서비스 워커 쪽에서는 `client.postMessage()`를 부르면 되는데, 페이지 쪽에서 사소하지만 찾기 어려운 함정이 하나 있었다. `navigator.serviceWorker.addEventListener('message', ...)`만으로는 메시지가 오지 않는다. `startMessages()`를 명시적으로 불러야 큐에 쌓인 메시지의 디스패치가 시작된다[^5].

```typescript
if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js')
  navigator.serviceWorker.addEventListener('message', onMessage)
  navigator.serviceWorker.startMessages()
}
```

방문한 적 없는 페이지로의 진입에는 미리 프리캐시해 둔 `/offline` 안내 페이지를 응답한다. 매니페스트(`site.webmanifest`)까지 얹으면 홈 화면 설치가 가능한 PWA가 되는데, 매니페스트 자체는 아이콘과 이름을 선언하는 정적 파일이라 특별히 적을 것이 없다. PWA의 실질은 결국 서비스 워커 쪽에 있다.

<!-- 이미지: 비행기 모드에서 블로그 글이 이미지까지 온전히 열리는 스크린샷 + "오프라인에 저장됨" 토스트 -->

## GA4 실측: 얻은 것과 잃은 것

효과가 있었는지는 추측할 필요가 없었다. 이 블로그는 [web-vitals 라이브러리](https://github.com/GoogleChrome/web-vitals)로 방문자의 핵심 웹 지표를 GA4 이벤트로 수집하고 있어서, 서비스 워커 배포 전후의 실사용자 데이터가 그대로 쌓여 있었다. 마침 비교 조건도 깨끗한 편이다. 캐싱 워커를 배포하기 전 한 달여 동안은 서비스 워커가 아예 등록되어 있지 않았고(이전에 있던 푸시 전용 워커도 제거된 상태였다), 배포 이후 구간은 책 출간으로 트래픽 구성이 바뀌기 전인 6월 말까지로 잘랐다.

> 측정 환경: web-vitals 라이브러리가 보고한 지표를 GA4 이벤트로 수집하고, GA4 Data API로 집계했다. 비교 구간은 서비스 워커가 없던 2026-04-21~~05-25와, 초기 버전(v1) 워커가 돌던 2026-05-27~~06-30이다. 두 가지 한계를 미리 밝혀둔다. 첫째, GA4 Data API는 백분위수를 제공하지 않아 아래 수치는 모두 **평균**이다. 핵심 웹 지표의 표준인 p75가 아니므로 이상값의 영향을 받는다. 둘째, 통제된 실험이 아닌 관측 데이터라 기간에 따른 콘텐츠·트래픽 구성 변화가 섞여 있다.

서비스 워커의 효과를 보려면 전체 평균보다 **신규 방문자와 재방문자를 갈라서** 봐야 한다. 첫 방문의 첫 페이지는 서비스 워커가 아직 등록되기 전이라 영향이 제한적이고, 캐시가 쌓인 재방문자가 수혜 집단이기 때문이다. 재방문자 기준 결과는 다음과 같다.

| 지표 (재방문자, 평균) | SW 없음 (n=1,090~1,421) | SW v1 (n=1,295~1,821) | 변화       |
| --------------------- | ----------------------- | --------------------- | ---------- |
| FCP                   | 1,463ms                 | 829ms                 | **-43%**   |
| TTFB                  | 148ms                   | 673ms                 | **+526ms** |
| LCP                   | 885ms                   | 1,931ms               | **+118%**  |
| CLS                   | 0.168                   | 0.200                 | 소폭 악화  |

FCP의 개선 폭이 상당한데, 이것이 우연이 아니라고 볼 수 있는 근거가 신규 방문자 쪽에 있다. 같은 기간 신규 방문자의 FCP는 1,337ms에서 1,314ms로 사실상 변화가 없었다. 서비스 워커의 혜택을 받을 수 없는 집단은 그대로이고 받을 수 있는 집단만 좋아졌으니, 정적 자산과 폰트를 Cache Storage에서 즉시 응답한 효과라고 해석하는 것이 합리적이라고 생각한다.

반대 방향의 숫자도 정직하게 봐야 한다. TTFB는 재방문자 기준 148ms에서 673ms로 크게 나빠졌다. 신규 방문자도 293ms에서 398ms로 올랐다. 내비게이션이 network-first 전략을 타면서 워커 기동과 fetch 경유가 첫 바이트 앞에 끼어든 비용이 그대로 지표에 찍힌 것이다. 흥미로운 것은 그럼에도 FCP가 좋아졌다는 점이다. 첫 바이트는 늦어졌지만, 그 뒤에 오는 렌더링 차단 리소스들이 캐시에서 즉시 나오면서 첫 페인트까지의 총합은 오히려 줄었다. TTFB만 보고 있었다면 이 배포는 성능 후퇴로 읽혔을 것이다. 지표 하나로 캐싱 레이어를 평가하면 안 되는 이유다.

문제는 재방문자 LCP가 885ms에서 1,931ms로 나빠졌다는 것이었다. 처음에는 v1 워커의 결함을 의심했다. 당시 v1은 `/_next/image` 최적화 요청을 이미지로 분류하지 못하고(확장자 기반 판별이라 쿼리 스트링 URL을 놓쳤다) network-first로 흘려보내고 있었다. LCP 요소가 이미지인 페이지라면 캐시의 혜택 없이 워커 경유 비용만 매번 치른 셈이니, 그럴듯한 용의자였다.

그런데 데이터를 더 가르자 다른 그림이 나왔다. 페이지 유형별(전체 방문 기준)로 보면 LCP 요소가 썸네일 이미지인 홈과 목록 페이지는 629ms에서 740ms로 +112ms 수준이고, 악화는 LCP가 대부분 텍스트인 글 본문 페이지(1,244ms → 2,043ms)에 집중되어 있었다. 이미지 가설과 맞지 않는 분포다. 기기 구성 변화도 아니었다(데스크톱만 떼어 봐도 +651ms). 남은 교란은 기간마다 인기 글이 달랐다는 콘텐츠 구성 효과여서, 양쪽 기간 모두 표본이 30건 이상인 같은 글끼리 짝지어 비교했다. 그러자 범인이 드러났다. 짝지은 14개 경로의 표본 가중 평균 악화는 +1,079ms로 여전히 커 보였지만, 그중 한 글의 v1 구간 평균 LCP가 41.7초라는 비정상 값이었다. 이 글 하나를 제외하면 같은 글 기준 악화는 **+191ms**로, 모든 요청이 워커를 한 번 더 거치는 비용으로 설명되는 규모다.

정리하면 "LCP 1초 악화"의 실체는, 워커 경유로 인한 200ms 안팎의 실제 회귀에 소수의 극단값이 얹혀 평균이 끌려간 것이었다. GA4 Data API가 p75를 주지 못하고 평균만 주는 한계가 하마터면 엉뚱한 결론(이미지 캐싱 결함이 주범)으로 이어질 뻔한 사례다. 극단값의 정체는 아직 모른다. 특정 글에서만 41초가 나온다는 것은 콘텐츠 문제일 수도, 계측 쪽 문제일 수도 있는데, 값 하나만 수집하는 지금의 계측으로는 여기까지가 한계였다.

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

v4에서는 `/_next/image`를 cache-first로 분류하도록 고쳤다. 주범은 아니었지만 워커 경유 비용을 없앨 수 있는 지점인 것은 맞다. 배포 당일 하루치 초기 신호는 재방문자 평균 LCP 951ms, TTFB 391ms, FCP 603ms로 모두 v1 전체 구간(각각 1,532ms, 859ms, 1,066ms)보다 좋지만, 표본이 지표당 120~170건뿐인 데다 위에서 봤듯 평균은 극단값 몇 개에 크게 흔들리므로 어디까지나 참고 수준이다. 몇 주쯤 데이터가 쌓이면 후속으로 확인해 볼 생각이다.

<!-- 이미지: GA4 재방문자 FCP/TTFB 전후 비교 차트 -->

## 서비스 워커는 공짜가 아니다

위 실측이 보여주듯 이 모든 것에는 비용이 따르고, 대부분의 사이트에는 서비스 워커 캐싱이 필요하지 않을 가능성이 높다.

fetch 핸들러를 등록하는 순간, 그 오리진의 모든 요청은 서비스 워커를 경유한다. 워커가 잠들어 있었다면 깨어나는 시간까지 내비게이션이 기다려야 한다. 이 오버헤드는 앞 절의 TTFB 악화(재방문자 평균 +526ms)로 이미 확인했고, 브라우저 개발사도 심각하게 여기는 비용이다. 한때 PWA 판정 조건을 맞추려고 아무 일도 하지 않는 빈 fetch 핸들러를 넣는 관행이 퍼지자, Chrome은 112부터 콘솔 경고를 띄우고 이후 그런 핸들러를 아예 건너뛰는 최적화까지 넣었다[^6]. 브라우저가 명시적으로 우회로를 만들 만큼의 비용이라는 뜻이다. 워커 기동을 기다리지 않고 내비게이션 요청을 먼저 출발시키는 navigation preload 같은 보완 장치도 있는데[^7], 이 블로그의 TTFB를 회복할 다음 과제로 남겨두었다.

그리고 근본적인 질문이 남는다. 파일명 해싱과 `Cache-Control`, CDN만으로 재방문 성능은 이미 상당 부분 해결된다. 책의 캐시 장에서 다룬 그 내용만 제대로 해도 대부분의 사이트는 충분하다. 서비스 워커 캐싱이 실질적인 값어치를 하는 것은 오프라인이라는 요구사항이 실제로 있거나, 네트워크가 불안정한 환경의 사용자가 많거나, HTTP 캐시로는 표현할 수 없는 전략(이번 글의 RSC 처리 같은)이 필요할 때다. 블로그는 "지하철에서 읽다가 터널에 들어가도 끊기지 않는 읽을거리"라는 명분이 있어서 만들었지만, 관리 비용과 위의 트레이드오프를 생각하면 모든 사이트에 권할 일은 아니라는 것이 솔직한 결론이다.

## 정리

책에서 못 다한 이야기를 블로그 구현기로 갚아 보았다. 핵심을 다시 묶으면 이렇다.

**서비스 워커 캐시는 HTTP 캐시 앞의 별도 레이어**이고, 만료가 없으므로 버전 관리(`CACHE_VERSION`과 activate 청소)와 용량 관리(엔트리 상한)를 직접 설계해야 한다. **전략은 리소스 유형이 정한다**. 낡아도 되는 것(해시 자산, 이미지)은 cache-first, 낡으면 안 되는 것(HTML, RSC)은 network-first에 오프라인 폴백이다.

프레임워크 위에서라면 **프레임워크가 만드는 요청의 모양을 알아야 한다**. App Router의 소프트 내비게이션은 HTML을 남기지 않고, 프리페치는 방문이 아니며, `next/image`의 srcset은 오프라인에서 캐시 미스를 만든다. 이 각론이 서비스 워커 캐싱 작업량의 대부분이었다.

효과와 비용은 실사용자 데이터에 모두 남았다. **재방문자의 FCP는 평균 43% 좋아졌지만 TTFB는 4배 이상 나빠졌다**. 어느 한 지표만 보았다면 이 배포를 완전히 잘못 평가했을 것이다. 서비스 워커 캐싱을 도입한다면 전후를 비교할 실사용자 지표 수집을 먼저 갖추는 것이 순서라고 생각한다.

마지막으로 **필요하지 않다면 만들지 않는 것도 설계**다. fetch 핸들러는 모든 요청에 비용을 부과하고, 잘못 배포된 워커는 스스로 회수해야 한다. 오프라인이라는 명확한 요구가 있을 때, 그때 이 글이 지도가 되기를 바란다.

---

[^1]: [Service worker caching and HTTP caching](https://web.dev/articles/service-worker-caching-and-http-caching), web.dev. 두 캐시 레이어의 조회 순서와 만료 정책 설계 지침을 다룬다.

[^2]: [Cache.keys()](https://developer.mozilla.org/en-US/docs/Web/API/Cache/keys), MDN. 요청이 삽입된 순서로 반환됨을 명시한다.

[^3]: [ServiceWorkerContainer.register()의 updateViaCache 옵션](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register), MDN 및 [Service Worker 스펙의 업데이트 알고리즘](https://w3c.github.io/ServiceWorker/#update-algorithm). 24시간을 넘긴 캐시 사본을 사용하지 않는 규칙이 정의되어 있다.

[^4]: [Removing buggy service workers](https://developer.chrome.com/docs/workbox/remove-buggy-service-workers), Chrome for Developers.

[^5]: [ServiceWorkerContainer.startMessages()](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/startMessages), MDN.

[^6]: [Intent to Ship: Skip service worker no-op fetch handler](https://groups.google.com/a/chromium.org/g/blink-dev/c/tEFS0BH8UmE), blink-dev. Chrome 112부터의 콘솔 경고와 no-op 핸들러 스킵 최적화의 배경을 설명한다.

[^7]: [NavigationPreloadManager](https://developer.mozilla.org/en-US/docs/Web/API/NavigationPreloadManager), MDN.
