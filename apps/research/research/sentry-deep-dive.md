---
title: 'Sentry 딥다이브: 에러 하나가 이슈가 되기까지'
marp: true
paginate: true
theme: midnight
tags:
  - sentry
  - error-monitoring
  - frontend
  - deep-dive
date: 2026-08-05
description: 'window.onerror 후킹부터 Relay 파이프라인, 그루핑 해시까지 — 실제 SDK 소스로 따라가는 에러 모니터링의 전체 여정'
published: false
---

# Sentry 딥다이브

에러 하나가 이슈가 되기까지 — throw부터 대시보드까지의 전체 여정

<!-- _class: invert -->

@yceffort

---

## 어느 팀의 Sentry

- 미해결 이슈 **31,842개**, 아무도 안 읽는 알림 채널
- 스택을 열면 `a.b.c @ main-8f3a2.js:1:482910`
- 같은 버그인데 이슈는 40개, 다른 버그 7개가 이슈 1개에 뭉쳐 있다

"설정을 잘못해서"라고 하기엔, **뭘 잘못했는지 설명할 수 있는 사람이 없다.**

> 이 강의는 사용법이 아니라 **동작 원리**를 다룬다.
> 원리를 알면 위의 문제들이 전부 "당연한 결과"로 보이게 된다.

---

## 이 강의에서 다루는 것

에러 하나의 여정을 다섯 구간으로 나눠 실제 소스로 따라간다.

0. **워밍업** — 이벤트/이슈 모델, SDK가 잡는 것과 못 잡는 것 (개념만, 코드 없음)
1. **포착** — 브라우저에서 에러는 어떻게 잡히는가
2. **조립** — 이벤트는 어떻게 만들어지는가 (Scope, 콜 체인, 필터)
3. **전송** — envelope, transport, rate limit
4. **수신** — Relay 파이프라인과 소스맵 복원 (Debug ID)
5. **그루핑** — 이슈는 어떻게 묶이는가

마지막에 **원리에서 도출되는 운영 규칙**과 **꿀팁 부록**으로 마무리한다.

---

## 기준 버전

이 덱의 코드는 전부 실제 소스에서 가져왔다.

- SDK: `getsentry/sentry-javascript` **v10.69.0** (2026-07-29)
- 서버: `getsentry/sentry`, `getsentry/relay` master (2026-01 기준) + 공식 문서
- 그루핑 설정: `all-platforms@2026-01-20` enhancement config

<!-- 버전을 박아두는 이유: Sentry SDK는 v8에서 아키텍처가 크게 바뀌었다(Hub 제거). 구버전 블로그 글과 이 덱의 내용이 다르면 버전부터 의심할 것 -->

---

## 이 덱이 다루지 않는 것

**에러 이벤트의 파이프라인**에만 집중한다. 아래는 의도적으로 뺐다:

- **성능 모니터링** (트랜잭션, 스팬, Web Vitals) — 파이프라인은 비슷하지만 별도 주제
- **Session Replay** — 쿼터 이야기에서 샘플링 설정으로만 잠깐 등장한다
- **알림 채널 연동, 대시보드 세부 기능** — 운영 규칙(Part 6)에서 원리만 다룬다

> "에러 하나가 이슈가 되기까지"를 이해하면,
> 나머지는 필요해질 때 문서만으로 충분히 따라갈 수 있다.

---

## Part 0 — 워밍업

딥다이브 전에 필요한 개념 네 가지 (여기는 코드 없음)

---

## 개념 1. 이벤트와 이슈

Sentry의 데이터 모델은 딱 두 층이다.

- **이벤트(event)**: 에러가 한 번 발생할 때마다 전송되는 개별 리포트
  - 스택 트레이스, 브라우저 정보, URL, 유저, 직전 행동 기록…
- **이슈(issue)**: "같은 에러"라고 판단된 이벤트들의 **묶음**
  - 대시보드 목록의 한 줄 = 이슈 하나
  - 같은 에러가 10만 번 나도 이슈는 1개

> "같은 에러인지"를 판단하는 과정이 **그루핑** — 이 덱의 최종 보스다 (Part 5).
> 도입부에서 본 "같은 버그인데 이슈 40개"는 그루핑이 망가진 결과다.

---

## 개념 2. Sentry는 "버려진 에러"만 자동으로 줍는다

- 자동으로 잡히는 것: **아무도 처리하지 않은** 에러
  - `throw` 했는데 아무도 안 잡은 것
  - promise가 reject됐는데 `.catch()`가 없는 것
- 자동으로 잡히지 **않는** 것:
  - `try/catch`로 잡은 에러 — 이미 "처리된" 에러라서
  - fetch의 4xx/5xx 응답 — JS 관점에서는 에러가 아니라서 (reject되지 않는다)

```ts
try {
  await submitOrder(payload)
} catch (e) {
  toast.error('주문에 실패했습니다')
  Sentry.captureException(e) // 이 줄이 없으면 Sentry는 이 실패를 영원히 모른다
}
```

---

## 개념 3. 직접 보내는 API는 사실상 두 개

- `captureException(error)` — Error 객체를 보낸다. **스택이 남는다.** 기본 선택지
- `captureMessage(string)` — 문자열만. 스택이 없어서 디버깅도 그루핑도 약하다

> 원칙 한 줄: **Error 객체가 있으면 무조건 captureException.**

여기에 상황 정보를 붙이는 도구들(tags, extra, breadcrumb)이 있는데, 각각 언제 쓰는지는 여정을 따라가며 자연스럽게 나온다.

---

## 개념 4. 오늘 따라갈 지도

```
throw
  │ ① 포착      브라우저 어딘가에서 Sentry가 줍는다
  ▼
이벤트 조립     │ ② 조립      스택 파싱, tags/유저 정보 합치기, 필터
  ▼
전송           │ ③ 전송      묶어서 서버로 쏜다
  ▼
Sentry 서버    │ ④ 수신      필터 → 소스맵 복원
  ▼
그루핑         │ ⑤ 그루핑    "같은 에러" 판정 → 이슈
```

- 각 구간을 실제 소스 코드로 내려가는 것이 오늘 할 일
- **중간에 길을 잃으면 이 지도로 돌아오면 된다** — 구간별 "정리" 슬라이드만 이어 읽어도 전체 흐름은 잡힌다

---

## Part 1 — 포착

브라우저에서 에러는 어떻게 잡히는가

이번 파트가 코드가 가장 많다. 슬라이드마다 요점은 마지막 한두 줄이니, 코드가 버거우면 **그 줄만 챙겨도 뒤따라오는 데 문제없다.**

---

## 아무도 안 잡은 에러의 종착지

브라우저에는 "처리되지 않은 에러"가 도달하는 전역 지점이 두 개 있다.

- 동기 코드의 throw → `window.onerror`
- `.catch()` 없는 promise reject → `unhandledrejection` 이벤트

Sentry의 **globalHandlersIntegration**이 이 둘을 후킹한다.
그런데 후킹 방식이 특이하다 — `addEventListener`가 아니라 **프로퍼티 교체**다.

---

## window.onerror를 교체하는 실제 코드

```ts
// packages/core/src/instrument/globalError.ts
function instrumentError(): void {
  _oldOnErrorHandler = GLOBAL_OBJ.onerror

  // Note: The reason we are doing window.onerror instead of
  // window.addEventListener('error') is that we are using this handler
  // in the Loader Script, to handle buffered errors consistently
  GLOBAL_OBJ.onerror = function (msg, url, line, column, error) {
    triggerHandlers('error', {column, error, line, msg, url})

    if (_oldOnErrorHandler) {
      return _oldOnErrorHandler.apply(this, arguments)
    }
    return false
  }
}
```

- 기존 핸들러를 보관했다가 **체이닝** — 다른 라이브러리의 onerror를 깨뜨리지 않는다
- 왜 `addEventListener('error')`가 아닐까? 주석의 **Loader Script** 때문 (다음 장)

---

## 잠깐, Loader Script가 뭔데?

SDK 본체(수백 KB)를 CDN에서 **비동기로 늦게 로드**하는 초소형 스니펫이다.

```
페이지 로드 ──→ Loader Script 실행 ──→ ... ──→ SDK 본체 로드 완료
                (자기 onerror 설치)     ↑
                                  이 사이에 난 에러는?
```

- Loader는 자신의 `window.onerror`를 걸어 그동안의 에러를 **큐에 모아둔다**
- 본체가 로드되면 같은 `onerror` 자리를 **교체하며 이어받고**, 큐에 쌓인 에러를 재처리한다
- `addEventListener`였다면? 리스너는 추가만 되고 교체가 안 되므로, "로더의 핸들러를 본체가 승계한다"는 구조를 만들 수 없다

> 그래서 주석이 "buffered errors를 일관되게 처리하려고 onerror를 쓴다"고 말한 것이다.

---

## onerror 인자로 이벤트 만들기

```ts
// packages/browser/src/integrations/globalhandlers.ts
const {msg, url, line, column, error} = data

const event = _enhanceEventWithInitialFrame(
  eventFromUnknownInput(
    stackParser,
    error || msg,
    undefined,
    attachStacktrace,
    false,
  ),
  url,
  line,
  column,
)

captureEvent(event, {
  originalException: error,
  mechanism: {handled: false, type: 'auto.browser.global_handlers.onerror'},
})
```

- `error || msg` — 보통은 Error 객체가 오지만, 크로스 오리진 스크립트 에러처럼 문자열 `msg`만 올 때가 있다. 그때는 메시지로라도 이벤트를 만든다
- 스택이 아예 없으면 "어느 파일 몇 번째 줄"(`url/line/column`)짜리 프레임 하나를 만들어 넣는다
- `mechanism` — "어떤 경로로 잡았나" 꼬리표. `handled: false`라서 대시보드에 **unhandled** 배지가 붙는다

<!-- 덤: setupOnce()에서 Error.stackTraceLimit = 50으로 올려둔다 (V8 기본값 10). 스택을 더 길게 받아두려는 것 -->
<!-- 크로스 오리진 구두 보충: CDN 스크립트가 CORS 헤더 없이 서빙되면 브라우저가 정보를 숨겨 "Script error."만 온다. Part 2의 기본 필터 목록에서 다시 만난다 -->

---

## 그 유명한 "Non-Error promise rejection captured"

reject된 값이 **Error가 아니라 primitive일 때** 만들어지는 메시지다.

```ts
// packages/browser/src/integrations/globalhandlers.ts
const event = isPrimitive(error)
  ? _eventFromRejectionWithPrimitive(error)
  : eventFromUnknownInput(stackParser, error, undefined, attachStacktrace, true)
```

```ts
{
  type: 'UnhandledRejection',
  value: `Non-Error promise rejection captured with value: ${String(reason)}`,
}
```

- `Promise.reject('oops')` 처럼 문자열을 reject하면 이게 된다 — **스택도 없다**
- Error가 아닌 객체면: `Object captured as promise rejection with keys: ...`
- 이 이슈가 자주 보인다면 범인은 대부분 서드파티 스크립트이거나, `reject(new Error(...))`를 안 쓴 우리 코드다

---

## setTimeout 콜백의 에러는 어떻게 잡을까

문제: async 콜백은 등록한 코드의 **콜 스택 밖**에서 실행된다 (왜 그런지는 다음 장).
onerror로도 잡히지만, **어떤 API의 콜백이었는지** 정보가 없다.

**browserApiErrorsIntegration** (구 TryCatch)의 답: 브라우저 API를 몽키패치한다.

```ts
// packages/browser/src/integrations/browserapierrors.ts — setupOnce()
fill(WINDOW, 'setTimeout', _wrapTimeFunction)
fill(WINDOW, 'setInterval', _wrapTimeFunction)
fill(WINDOW, 'requestAnimationFrame', _wrapRAF)
fill(XMLHttpRequest.prototype, 'send', _wrapXHR)
eventTarget.forEach((target) => _wrapEventTarget(target, _options))
```

- `addEventListener`는 EventTarget, Node, WebSocket, Worker 등 **약 30종의 prototype**에 대해 래핑된다
- `removeEventListener`도 같이 패치해서 래핑본까지 해제해준다

---

## 왜 콜백은 "콜 스택 밖"인가

```ts
try {
  setTimeout(() => {
    throw new Error('1초 뒤의 에러') // ②
  }, 1000)
} catch (e) {
  // 절대 실행되지 않는다
}
// ① setTimeout은 콜백을 "등록"만 하고 즉시 리턴한다
```

- ①이 리턴하는 순간 이 코드의 콜 스택은 비워진다 — 걸어둔 try/catch도 함께 사라진다
- 1초 뒤 이벤트 루프가 콜백을 **완전히 새로운 콜 스택**에서 실행한다. ②의 throw가 위로 올라가 봐야 받아줄 사람이 없다
- 그래서 async 콜백의 에러는 등록부를 감싼 try/catch를 그냥 지나쳐 전역 `onerror`로 직행한다

> 던진 "시점"에 정보를 붙이려면 방법은 하나 — **콜백 자체를** try/catch로 감싸는 것.
> 앞 장의 몽키패치가 콜백을 바꿔치기한 이유이고, 그 감싸는 함수가 다음 장의 `wrap()`이다.

---

## wrap()의 트릭: 잡고, 보내고, 다시 던진다

```ts
// packages/browser/src/helpers.ts
const sentryWrapped = function (...args) {
  try {
    return fn.apply(
      this,
      args.map((arg) => wrap(arg, options)),
    )
  } catch (ex) {
    ignoreNextOnError()
    withScope((scope) => {
      scope.addEventProcessor((event) => {
        addExceptionMechanism(event, options.mechanism)
        return event
      })
      captureException(ex)
    })
    throw ex // 앱의 원래 동작 보존
  }
}
```

**rethrow하면 onerror가 또 잡아서 중복 리포팅되지 않을까?**

---

## ignoreNextOnError: 카운터와 이벤트 루프

```ts
export function ignoreNextOnError(): void {
  // onerror should trigger before setTimeout
  ignoreOnError++
  setTimeout(() => {
    ignoreOnError--
  })
}
```

- rethrow된 에러는 **동기적으로** onerror에 도달한다
- setTimeout 콜백(카운터 감소)은 그 **다음 틱**에 실행된다
- 그 사이에 globalHandlers가 `shouldIgnoreOnError()`로 카운터를 보고 스킵

> 이벤트 루프의 실행 순서를 정확히 알아야 성립하는 설계다.
> "브라우저에서 중복 없이 에러 잡기"가 얼마나 지저분한 문제인지 보여준다.

---

## breadcrumb도 전부 몽키패치다

에러 상세에서 보는 "유저 행동 타임라인"의 출처:

| 소스    | 계측 방식                                                             |
| ------- | --------------------------------------------------------------------- |
| fetch   | `fill(GLOBAL_OBJ, 'fetch', ...)` — 전역 fetch 교체                    |
| xhr     | `XMLHttpRequest.prototype.open/send`를 **Proxy**로 교체               |
| 클릭/키 | document 버블 리스너 + `addEventListener` 패치 (stopPropagation 대비) |
| console | `console.log/warn/error/...` 각 레벨을 fill                           |
| 라우팅  | `history.pushState/replaceState` fill + popstate 리스너               |

- Sentry 자신의 전송은 `url.match(/sentry_key/) && method === 'POST'`로 제외
- 클릭 breadcrumb의 셀렉터 문자열은 기본 80자, 옵션으로 늘려도 1024자 캡 — "breadcrumb 100개가 이벤트 1MB를 넘지 않도록"

---

## Sentry.init이 기본으로 켜는 것들

```ts
// packages/browser/src/sdk.ts — getDefaultIntegrations()
inboundFiltersIntegration(),      // ignoreErrors/denyUrls (뒤에서 자세히)
functionToStringIntegration(),
conversationIdIntegration(),
browserApiErrorsIntegration(),    // API 몽키패치
breadcrumbsIntegration(),         // 행동 기록
globalHandlersIntegration(),      // onerror/unhandledrejection
linkedErrorsIntegration(),        // error.cause 체인 펼치기
dedupeIntegration(),              // 직전 이벤트와 동일하면 드랍
httpContextIntegration(),
cultureContextIntegration(),
browserSessionIntegration(),
```

`Sentry.init({dsn})` 한 줄이 실제로는 **전역 핸들러 교체 + 수십 개 API 몽키패치**다.

---

## Part 1 정리

- unhandled 에러의 입구는 둘: `window.onerror`(프로퍼티 교체 방식), `unhandledrejection`
- "Non-Error promise rejection" = primitive를 reject한 것. 스택이 없다
- async 콜백은 `wrap()`이 try/catch로 감싸 잡고 **다시 던진다** — 중복은 카운터 + 이벤트 루프 순서로 방지
- breadcrumb은 fetch/XHR/console/history 몽키패치의 산물

---

## 랩업 퀴즈 — Part 1

<!-- _class: invert -->

**Q1.** `try { ... } catch (e) { console.error(e) }` 안에서 난 에러는 Sentry에 갈까?

**Q2.** `Promise.reject('oops')`는 대시보드에서 어떤 모습으로 보일까?

---

## 정답 — Part 1

<!-- _class: invert -->

**A1.** 안 간다. catch로 처리된 에러는 onerror에 도달하지 않는다 — console breadcrumb으로만 남는다. Sentry에 알리려면 `captureException`을 직접 불러야 한다.

**A2.** `UnhandledRejection` 타입에 "Non-Error promise rejection captured with value: oops" — **스택 없는 이슈**가 된다. `reject(new Error(...))`를 써야 하는 이유.

---

## Part 2 — 조립

이벤트는 어떻게 만들어지는가

---

## tags와 user는 어디에 쌓이는가: 3-Scope 모델

`setTag`, `setUser`로 심은 정보는 이벤트에 실리기 전까지 **스코프(Scope)**라는 보관함에 쌓인다. 스코프는 세 층이다:

- **globalScope** — 프로세스 전체 싱글턴. "applied to _all_ events"
- **isolationScope** — 실행 단위(서버라면 요청)별 격리. Node에서는 `AsyncLocalStorage`로 구현
- **currentScope** — `withScope()`가 만드는 가장 좁은 단위

```ts
// packages/core/src/exports.ts — 우리가 매일 쓰는 API의 실제 대상
export function setTag(key: string, value: Primitive): void {
  getIsolationScope().setTag(key, value)
}
export function setUser(user: User | null): void {
  getIsolationScope().setUser(user)
}
```

`Sentry.setTag`/`setUser`는 **isolationScope**에 쓴다.

<!-- 구두: 구글링하다 만나는 옛 자료의 "Hub"가 바로 이 역할을 하던 개념인데, v8에서 제거되고 스코프 모델로 대체됐다. Hub가 나오는 글은 오래된 글이라는 신호다 -->

---

## 스코프 병합: 누가 이기는가

```ts
// packages/core/src/utils/scopeData.ts
export function getCombinedScopeData(isolationScope, currentScope): ScopeData {
  const scopeData = getGlobalScope().getScopeData()
  isolationScope && mergeScopeData(scopeData, isolationScope.getScopeData())
  currentScope && mergeScopeData(scopeData, currentScope.getScopeData())
  return scopeData
}
```

- 병합 순서: global → isolation → current. **나중이 이긴다**: current > isolation > global
- 브라우저에서 isolationScope는 사실상 전역 하나 — `withIsolationScope`가 포크하지 않고 기존 것을 반환한다 (요청 격리가 필요 없는 환경이라서)

> 흥미로운 사실: client 인스턴스조차 전역이 아니라 **Scope에 붙어 있다.**
> `getClient()` = `getCurrentScope().getClient()`

---

## captureException의 여정 (1) — 스코프를 지나 클라이언트로

```ts
// ① exports.ts: getCurrentScope()로 위임 → ② scope.ts:
const syntheticException = new Error('Sentry syntheticException')
this._client.captureException(
  exception,
  {
    originalException: exception,
    syntheticException,
    ...hint,
    event_id: eventId,
  },
  this,
)

// ③ client.ts: 같은 Error 객체는 두 번 캡처하지 않는다
if (checkOrSetAlreadyCaught(exception)) return // error.__sentry_captured__ = true 마킹
```

- **syntheticException** — 스택 없는 값(`captureException('문자열')`)을 위해 SDK 진입 시점의 스택을 미리 만들어 둔다
- event_id(uuid)도 이 시점에 생성 — 서버 응답을 기다리지 않는다
- `__sentry_captured__` 마킹 덕에 rethrow되어 전역 핸들러를 거쳐도 **1번만 전송**된다
- 이 마킹은 **non-enumerable 속성**으로 찍는다 — `Object.keys`, `JSON.stringify`, 스프레드에 잡히지 않는 숨김 속성이라, 에러를 로깅·직렬화해도 흔적이 안 보인다

<!-- 구두: ignoreNextOnError(카운터), dedupeIntegration까지 합치면 SDK의 중복 방지 장치는 세 겹이다 -->

---

## captureException의 여정 (2) — 스택 파싱

Error의 `stack`은 **표준이 아니다.** 브라우저마다 포맷이 다르다.

```ts
// packages/browser/src/stack-parsers.ts (TraceKit 포크)
// Chromium: "at commitLayoutEffects (react-dom.development.js:23426:1)"
const chromeRegex =
  /^\s*at (?:(.+?\)(?: \[.+\])?|.*?) ?\((?:address at )?)?.../i

// Gecko/Safari: "func@url:row:col"
const geckoREgex = /^\s*(.*?)(?:\((.*?)\))?(?:^|@)?.../i

export const defaultStackParser = createStackParser(
  chromeStackLineParser,
  geckoStackLineParser,
)
```

- 기본은 **라인 파서 2개** (Chromium용, Gecko/Safari용 — 내부 정규식으로는 6개)
- 안전장치: 라인당 1024자 컷(ReDoS 방지), 프레임 상한 50
- 파싱 후 SDK 내부 프레임을 제거하고 **역순 정렬** — Sentry 프로토콜은 oldest-frame-first

---

## captureException의 여정 (3) — 조립 파이프라인

`Client._processEvent`가 실행하는 순서. **순서 자체가 중요하다:**

```
1. sampleRate 랜덤 샘플링        ← 에러 이벤트만, 가장 먼저
2. prepareEvent
   ├─ applyClientOptions          (environment/release 채우기)
   ├─ applyDebugIds               (스택 프레임에 debug_id 태깅 — Part 4)
   ├─ 3-스코프 병합 → applyScopeDataToEvent  (tags/user/breadcrumbs 주입)
   ├─ event processors            (client 것 먼저, scope 것 나중에)
   └─ applyDebugMeta + normalize  (순환 참조 제거, depth 3)
3. beforeSend                     ← 모든 처리가 끝난 "최종 이벤트"를 받는다
4. sendEvent → envelope → transport
```

- `ignoreErrors` 필터(inboundFilters)는 2단계의 **event processor**로 동작한다
- 각 단계에서 드랍되면 사유가 기록된다: `sample_rate`, `event_processor`, `before_send`…

---

## ignoreErrors의 실제 구현 — 그리고 숨겨진 기본 목록

```ts
// packages/core/src/integrations/eventFilters.ts
const DEFAULT_IGNORE_ERRORS = [
  /^Script error\.?$/, // CORS로 읽지 못한 외부 스크립트 에러
  /^ResizeObserver loop completed with undelivered notifications.$/,
  /^Cannot redefine property: googletag$/, // GTM + 애드블로커
  /can't redefine non-configurable property "solana"/, // 지갑 확장
  /Can't find variable: _AutofillCallbackHandler/, // Instagram 웹뷰
  // ...
]
```

- **SDK가 기본으로 버리는 에러 목록이 이미 있다** — 우리가 넣는 `ignoreErrors`는 여기에 합쳐진다
- `denyUrls`는 **크래시가 난 프레임(스택 최상단)의 filename** 기준으로 매칭한다
  (소스 주석: "we only want to match against the top frame of the 'root'")
- 서버에도 같은 종류의 필터가 또 있다 (Part 4) — 필터는 2중 구조다

---

## Part 2 정리

- 스코프는 3층: global / isolation / current — 병합은 current가 이긴다
- `setTag`/`setUser` → isolationScope. 브라우저에서 isolationScope는 사실상 전역
- 중복 방지 3중: `__sentry_captured__` 마킹, ignoreNextOnError 카운터, dedupeIntegration
- 파이프라인 순서: **sampleRate → processors(ignoreErrors 포함) → beforeSend**
- `ignoreErrors`에는 SDK 내장 기본 목록이 이미 합쳐져 있다

---

## 랩업 퀴즈 — Part 2

<!-- _class: invert -->

**Q1.** `beforeSend`에서 받은 event 객체에는 breadcrumbs가 들어 있을까?

**Q2.** `Sentry.withScope(scope => scope.setTag(...))`로 찍은 tag는 어떤 이벤트까지 적용될까?

---

## 정답 — Part 2

<!-- _class: invert -->

**A1.** 있다. beforeSend는 스코프 병합, event processor, normalize까지 전부 끝난 **최종 이벤트**를 받는다 — 파이프라인의 마지막 단계다.

**A2.** withScope **콜백 안에서 캡처된 이벤트에만**. 콜백이 끝나면 clone된 스코프가 pop되어 사라진다. 반면 `Sentry.setTag`는 isolationScope에 쓰므로 이후 모든 이벤트에 붙는다.

---

## Part 3 — 전송

envelope, transport, rate limit

---

## Envelope: 전송의 포장 단위

Sentry가 서버로 보내는 모든 것은 **envelope(봉투)**라는 규격으로 포장된다.
종류가 다른 데이터들을 **한 번의 HTTP 요청에 묶어 보내기 위한** 포장 단위다.

```
{"event_id":"9ec7...","sent_at":"2026-08-05T..."}     ← 봉투 헤더: 누가·언제
{"type":"event"}                                      ← 아이템 헤더: 내용물의 종류
{"exception":{...},"tags":{...},"breadcrumbs":[...]}  ← 페이로드: 내용물
```

- 개행으로 구분된 JSON 라인 — 아이템(헤더+페이로드)을 여러 개 이어 붙일 수 있다
- 에러 이벤트, 첨부파일, client report, replay가 **전부 이 봉투 하나의 규격**으로 나간다 — 데이터 종류가 늘어나도 전송 계층은 규격 하나만 알면 된다

전송 주소: `https://{host}/api/{projectId}/envelope/?sentry_version=7&sentry_key=...`

---

## 인증이 헤더가 아니라 쿼리스트링인 이유

```ts
// packages/core/src/api.ts — 주석 원문
// "Sending auth as part of the query string and not as custom HTTP headers
//  avoids CORS preflight requests."
```

- sentry.io는 우리 페이지와 **다른 도메인**이다 → 모든 전송이 cross-origin 요청
- 브라우저는 cross-origin 요청이 "안전한 형태"(GET/POST + 기본 헤더)를 벗어나면,
  본 요청 전에 **OPTIONS 요청으로 서버의 허락부터 구한다** — 이것이 **preflight**
- 커스텀 인증 헤더를 붙이는 순간 "안전한 형태"를 벗어난다 → **전송마다 왕복이 2배**
- 쿼리스트링은 요청 형태를 바꾸지 않으니 preflight가 없다 — 페이지 이탈 직전에도 보내야 하는 에러 리포팅에서 왕복 1회는 아깝다

---

## 애드블로커에 막힐 때: tunnel

애드블로커 상당수가 `*.sentry.io` 요청 자체를 차단한다 — SDK가 아무리 잘 잡아도 **전송 단계에서 증발**한다.

**tunnel 옵션**: 전송 목적지를 sentry.io 대신 **자기 도메인의 경로**로 바꾼다. 중계 서버가 받아서 Sentry로 포워딩하는 구조다.

```ts
// 이때는 중계 서버가 최종 목적지를 알아야 하므로
// envelope 헤더에 dsn이 들어간다 (packages/core/src/utils/envelope.ts)
...(!!tunnel && dsn && {dsn: dsnToString(dsn)}),
```

> Next.js라면 `tunnelRoute` 옵션 한 줄로 중계 라우트까지 자동 생성된다 (부록 꿀팁 2).

---

## Transport: 생각보다 아무것도 안 해준다

```ts
// packages/browser/src/transports/fetch.ts
keepalive: pendingBodySize <= 60_000 && pendingCount < 15,
```

- **재시도가 없다.** 네트워크 실패 = 이벤트 유실 (`network_error`로 집계만)
- 버퍼 40개 초과분은 그냥 버린다 (`queue_overflow`)
- `keepalive`는 페이지 이탈 중에도 전송을 보장하지만, 스펙상 총 64KiB 제한이 있어 조건부로만 켠다
- 계측된 fetch가 아니라 **네이티브 fetch**를 쓴다 — 자기 전송이 자기 breadcrumb이 되는 것을 방지

> 재시도가 필요하면 opt-in인 `makeBrowserOfflineTransport` — IndexedDB에 넣고 5초 → 최대 1시간 지수 백오프.

---

## Rate limit: 서버가 시키면 클라이언트가 버린다

서버 응답에 이 헤더가 오면:

```
X-Sentry-Rate-Limits: 60:error;transaction:organization
```

```ts
// packages/core/src/utils/ratelimit.ts
// <retry_after>:<categories>:<scope>:<reason_code>:<namespaces> 형식
updatedRateLimits[category] = now + delay
// 헤더 없이 429만 오면: 전체 카테고리 60초
```

- SDK는 카테고리별(`error`, `transaction`, `replay`…) "전송 금지 시각"을 기록
- 그 시각까지의 신규 이벤트는 **전송 시도조차 없이 로컬에서 드랍** (`ratelimit_backoff`)
- 재시도 큐 같은 것은 없다 — 그냥 사라진다

> "쿼터 초과 시간대의 에러는 복구 불가"인 이유가 프로토콜 수준에서 정해져 있다.

---

## SDK는 자기가 버린 것을 자백한다: client report

로컬에서 드랍된 모든 이벤트는 사유별로 집계된다:

```ts
// {"type": "client_report"} envelope 아이템
{
  timestamp: ...,
  discarded_events: [
    {reason: 'ratelimit_backoff', category: 'error', quantity: 3},
    {reason: 'before_send', category: 'error', quantity: 12},
  ]
}
```

- 사유: `sample_rate`, `event_processor`, `before_send`, `ratelimit_backoff`, `network_error`, `queue_overflow`…
- 전송 타이밍이 재밌다: **탭이 hidden으로 바뀔 때** flush (`visibilitychange`)
- 대시보드의 Stats → Client Discards가 이 데이터다

> "Sentry가 조용한데 정말 에러가 없는 걸까?"의 답을 여기서 확인할 수 있다.

---

## Part 3 정리

- envelope = JSON 라인 포맷. 인증은 쿼리스트링 (CORS preflight 회피)
- tunnel은 애드블로커 우회 — envelope 헤더의 dsn으로 목적지 식별
- 기본 transport는 재시도 없음. rate limit은 "전송 전 로컬 드랍"
- SDK가 버린 이벤트는 client report로 자백된다 — Stats 화면에서 확인 가능

---

## 랩업 퀴즈 — Part 3

<!-- _class: invert -->

**Q1.** 429를 받은 뒤 60초 안에 발생한 에러는, 60초가 지나면 전송될까?

**Q2.** Sentry는 왜 인증 정보를 HTTP 헤더가 아니라 쿼리스트링으로 보낼까?

**Q3.** `tracesSampleRate: 0.05`로 내리면 에러도 5%만 올까?

---

## 정답 — Part 3

<!-- _class: invert -->

**A1.** 안 된다. `ratelimit_backoff`로 로컬 드랍되고 끝 — 재시도 큐가 없다. offline transport를 쓰지 않는 한 복구 불가.

**A2.** 커스텀 헤더는 전송마다 CORS preflight(OPTIONS)를 유발하기 때문. 페이지 이탈 직전에도 보내야 하는 에러 리포팅 특성상 왕복 1회가 아깝다.

**A3.** 아니다. `tracesSampleRate`는 성능 트랜잭션 전용이고 에러는 `sampleRate`가 관장한다. 단 `sampleRate`를 1.0 아래로 내리면 **이벤트 단위 랜덤 추첨**이라 특정 유저의 에러가 무작위로 빠진다 — 에러 샘플링을 하지 말라는 이유.

---

## Part 4 — 수신

Relay 파이프라인과 소스맵 복원

---

## 이벤트가 도착한 뒤의 여정

self-hosted 문서 기준 실제 파이프라인:

```
SDK
 └→ Relay          (DSN 검증, inbound filter, rate limit, 정규화, PII 스크러빙)
     └→ Kafka
         └→ ingest consumer → preprocess_event
             └→ Symbolicator  (소스맵 복원 ← 여기!)
                 └→ 저장(nodestore) + 그루핑 → ClickHouse(snuba)
                     └→ post_process  (알림, 이슈 후처리)
```

- 이벤트가 도착하면 제일 먼저 **정문 경비실**을 통과한다 — 이 관문 서비스의 이름이 **Relay**다
- 경비실이 하는 일: 신원 확인(DSN 검증), 잡상인 차단(필터), 출입량 제한(rate limit), 반입 금지품 제거(PII 스크러빙). **여기서 걸러지면 뒤 단계는 아예 시작되지 않는다**
- 그래서 순서가 중요하다: **필터 → 소스맵 복원 → 그루핑**

<!-- 구두: Relay는 Rust로 만든 별도 오픈소스 서비스(getsentry/relay)라는 것 정도만. self-hosted나 데이터 주권 이슈로 자체 Relay를 중간에 둘 수도 있다는 건 심화 주제 -->

---

## 서버에도 필터가 있다: inbound data filters

Project Settings의 Inbound Filters — 구현은 Relay에 있다 (`relay-filter/src/`):

- `browser_extensions.rs` — 확장 프로그램 에러
- `legacy_browsers.rs`, `web_crawlers.rs`, `localhost.rs`
- React hydration error, ChunkLoadError 전용 필터도 있음

SDK 필터(`ignoreErrors`)와의 결정적 차이 두 가지:

1. **"Filtered events do not consume quota"** — 서버 필터는 쿼터를 아낀다
2. **"exclusively applied at ingest time"** — symbolication **전**에 적용된다
   → 복원된 원본 파일명 기준으로는 필터할 수 없다

> 그래서 실무 전략: 확실한 노이즈는 SDK에서(전송량 절약), 대시보드에서 켤 수 있는 것은 서버에서(쿼터 절약), 둘 다 쓴다.

---

## 소스맵 매칭의 구세대: release + URL

전통 방식은 "release가 같고 파일 URL이 같으면 이 소스맵을 써라"였다.

문제점 (공식 문서 원문):

> "when you changed the subpath of where your javascript files are served...
> the corresponding sourcemap would not be able to be found by Sentry."

- CDN 경로 변경, 쿼리스트링, 프록시… URL은 **신뢰할 수 없는 키**였다
- release를 잊으면 매칭 자체가 불가능

그래서 현재 표준은 **Debug ID** 방식이다 (SDK 7.47+).

---

## Debug ID: 파일 내용이 곧 신원

번들러 플러그인(`@sentry/bundler-plugins`)이 빌드 시점에:

```ts
// 청크 내용의 SHA-256에서 만드는 결정적(deterministic) UUID
const debugId = stringToUUID(code) // rollup/vite 기준. webpack은 청크 hash를 씀
```

1. 소스맵 JSON에 `debug_id` 필드 주입
2. 번들 끝에 `//# debugId=<uuid>` 주석 추가
3. 그리고 번들 **앞**에 이런 스니펫을 주입한다:

```js
!(function () {
  try {
    var e = window
    var n = new e.Error().stack
    n &&
      ((e._sentryDebugIds = e._sentryDebugIds || {}),
      (e._sentryDebugIds[n] = '<uuid>'),
      (e._sentryDebugIdIdentifier = 'sentry-dbid-<uuid>'))
  } catch (e) {}
})()
```

**`new Error().stack`을 맵의 키로 쓴다.** 왜?

---

## new Error().stack 트릭

빌드 시점에는 이 파일이 **어떤 URL로 서빙될지 알 수 없다.**

- 스니펫이 런타임에 실행되면, 그 순간의 스택에는 **배포된 실제 URL**이 들어 있다
  (`at https://cdn.example.com/assets/main-8f3a2.js:1:1`)
- SDK는 이벤트 조립 시(`applyDebugIds`) 이 스택 문자열들을 파싱해서
  `{ 파일 URL → debugId }` 맵을 만들고, 스택 프레임마다 `debug_id`를 붙인다
- 최종적으로 `event.debug_meta.images`에 `{code_file, debug_id}` 목록으로 실려 간다

```ts
// packages/core/src/utils/prepareEvent.ts
frame.debug_id = filenameDebugIdMap[frame.filename]
```

> 서버는 URL이 아니라 debug_id로 소스맵을 찾는다.
> **"creating a release is no longer required"** — 경로가 어떻게 바뀌어도 매칭된다.

---

## Part 4 정리

- 파이프라인: Relay(필터) → Kafka → symbolication → 그루핑 → 저장
- 서버 필터는 쿼터를 안 먹지만, symbolication **전**이라 원본 파일명 기준 필터 불가
- Debug ID = 청크 내용의 해시. `new Error().stack`으로 런타임 URL과 연결
- release 없이도 소스맵이 매칭된다 — 다만 release는 회귀 추적 때문에 여전히 필요 (Part 6)

---

## 호기심 퀴즈 — Part 5 예고

<!-- _class: invert -->

소스맵은 "스택을 읽기 좋게" 만들어주는 도구다.

**그런데 소스맵 업로드가 이슈가 묶이는 방식(그루핑)에도 영향을 줄까?**

답이 "그렇다"라면, 어떤 경로로?

<!-- 준다. 다음 Part의 핵심 — 그루핑은 symbolication 이후의 프레임으로 해시를 만들고, JS는 특히 context line(그 줄의 소스 코드)을 재료로 쓰기 때문. 답을 여기서 주지 말고 Part 5로 넘어가는 동기로 쓸 것 -->

---

## Part 5 — 그루핑

이슈는 어떻게 묶이는가

---

## 그루핑의 우선순위

공식 문서 원문:

> "All versions consider the **fingerprint** first, the **stack trace** next,
> then the **exception**, and then finally the **message**."

실제 서버 설정 (`src/sentry/grouping/strategies/configurations.py`):

```python
strategies=[
    "chained-exception:v1",  # This handles single exceptions, too
    "threads:v1",
    "stacktrace:v1",
    "template:v1", "csp:v1", ...,
    "message:v1",
],
# "The first strategy to produce a result will become the winner."
```

- SDK가 fingerprint를 보냈으면 알고리즘 결과는 **해시에 반영되지 않는다** (계산은 되지만 비기여 마킹)
- 스택이 없으면 exception type+value → message 순으로 폴백

---

## JS 스택은 무엇으로 해시되는가

플랫폼마다 해시에 넣는 프레임 요소가 다르다 (develop 문서 기준):

| 플랫폼     | 해시 재료                                             |
| ---------- | ----------------------------------------------------- |
| JavaScript | **module + filename(소문자 basename) + context line** |
| Python     | module + function + context line                      |
| Native     | 사실상 function 이름만 (강한 정규화)                  |

- 함수명은 **소스맵으로 복원된 context line이 있을 때만 무시**된다 — 소스맵이 없으면 minified 함수명이 그대로 해시에 들어간다
- context line을 쓰는 플랫폼은 서버 코드에 하드코딩되어 있다:

```python
initial_context={
    "contextline_platforms": ("javascript", "node", "python", "php", "ruby"),
}
```

---

## 따라서: 소스맵이 없으면 그루핑이 파괴된다

해시 재료가 어떻게 바뀌는지 따라가 보자.

- 소스맵 O → **원본 파일명 + 원본 context line** → 빌드가 바뀌어도 동일 → 안정적 그루핑
- 소스맵 X → 한 줄짜리 minified 코드는 **120자 초과라 context line이 해시에서 버려지고**
  ("ignored because line is too long"), 남는 재료가 **해시 붙은 파일명**(`main-8f3a2.js`)과
  **minified 함수명**(`a`, `Xu`) → 빌드마다 달라짐 → 같은 버그가 배포마다 새 이슈

> "같은 에러인데 이슈 40개"의 1번 원인.
> 소스맵은 "스택을 읽기 위한 것"이기 전에 **그루핑의 전제 조건**이다.

<!-- 부가(구두 설명용): 해시는 app hash(in-app 프레임만)와 system hash(전체 프레임) 두 개가 만들어지고, 하나라도 기존 이슈와 일치하면 그 이슈에 붙는다 (GroupHash 모델) -->

---

## 어떤 프레임이 그루핑에 참여하는가: enhancement rules

Sentry에는 내장 규칙 파일이 있다 (`all-platforms@2026-01-20.txt`, 약 500줄):

```
## js
path:**/node_modules/** -app

### transpilers and polyfills are just noise, be more aggressive
module:@babel/** -app -group
module:core-js/** -app -group
module:tslib/** -app -group

## (전 플랫폼 공통 섹션) 예외를 던진 지점 자체는 노이즈
category:throw ^-group -group ^-app -app
```

- 문법: `matcher:expression action…` — `+app/-app`(in-app 여부), `+group/-group`(해시 참여 여부), `^`(위 프레임에), `v`(아래 프레임에)
- node_modules는 in-app이 아니고, babel/core-js 프레임은 **해시에서 제외**된다
- 같은 문법으로 프로젝트 설정에 **커스텀 규칙**을 쓸 수 있다

---

## 뭉친 이슈 나누기: fingerprint

공통 에러 핸들러가 한곳에서 throw하면 스택이 전부 핸들러를 가리킨다 → 이슈 하나에 버그 7개.

**SDK 측** — 이벤트에 fingerprint를 실어 보낸다:

```ts
Sentry.captureException(error, {
  fingerprint: ['api-error', error.endpoint, String(error.status)],
})
// 기본 그루핑에 축만 추가하려면:
fingerprint: ['{{ default }}', error.endpoint]
```

**서버 측** — 배포 없이 대시보드에서 규칙으로:

```
error.type:DatabaseUnavailable         -> system-down
stack.function:"query_database"        -> {{ default }}, {{ transaction }}
```

변수: `{{ default }}`, `{{ error.type }}`, `{{ message }}`, `{{ stack.function }}`, `{{ transaction }}`, `{{ tags.x }}` 등 — SDK/서버 양쪽에서 동일하게 사용 가능.

---

## 쪼개진 이슈 막기: 메시지 위생

그루핑 폴백이 message까지 내려간 상황이라면:

```ts
// 안티패턴: 이슈가 유저 수만큼 생긴다
throw new Error(`User ${userId} not found`)

// 권장: 메시지는 고정, 가변 값은 컨텍스트로
Sentry.captureException(new Error('User not found'), {extra: {userId}})
```

- 서버가 message에서 파라미터를 일부 제거해주지만, 완전하지 않다
- **에러 메시지 = 에러의 종류, 컨텍스트 = 개별 상황의 값** — 이 분리가 원칙

부가: 신규 이슈 생성 시에는 AI 그루핑(Seer)이 임베딩 유사도로 한 번 더 개입한다. 완전 커스텀 fingerprint면 우회되지만, `{{ default }}` 하이브리드면 그 부분에는 여전히 적용된다.

---

## Part 5 정리

- 우선순위: fingerprint → stack trace → exception → message. fingerprint가 있으면 알고리즘은 실행 안 됨
- JS 해시 재료는 module + filename + **context line** — 그래서 소스맵이 그루핑의 전제
- babel/core-js/node_modules 프레임은 내장 enhancement 규칙이 이미 걸러준다
- 뭉침은 fingerprint로 나누고, 쪼개짐은 메시지 위생으로 막는다

---

## 랩업 퀴즈 — Part 5

<!-- _class: invert -->

**Q1.** 소스맵 없이 운영하다가 나중에 업로드를 시작하면, 기존 이슈들은 어떻게 될까?

**Q2.** `throw new Error(\`User ${userId} not found\`)`가 이슈를 수백 개 만들었다. 그루핑의 어느 단계까지 내려갔길래 이렇게 됐을까?

---

## 정답 — Part 5

<!-- _class: invert -->

**A1.** 해시 재료가 minified에서 원본으로 바뀌므로 **신규 이슈로 갈라진다**. 그루핑 설정 변경과 마찬가지로 "이슈 세대 교체"가 일어난다.

**A2.** 스택 그루핑이 실패해 **message 폴백**까지 내려간 상황. 서버가 파라미터를 일부 제거해주지만 완전하지 않다 — 메시지 고정 + `extra`로 해결한다.

---

## Part 6 — 원리에서 나오는 운영 규칙

지금까지의 내부 동작이 그대로 실무 수칙이 된다

---

## 규칙 1. 소스맵 + release는 협상 불가

- Debug ID 덕에 소스맵 매칭에 release가 필수는 아니지만 (Part 4),
  release는 **다른 세 가지** 때문에 여전히 필요하다:
  - "이 에러는 어느 배포부터인가" (회귀 추적)
  - **Resolved in next release** — 문서 원문: "Fix is in `main`, prod is still on `1.8.0` — only a recurrence in `1.9.0+` reopens it"
  - Releases 화면의 신규 이슈 감지

```ts
Sentry.init({
  release: process.env.NEXT_PUBLIC_GIT_SHA,
  environment: process.env.NEXT_PUBLIC_STAGE,
})
```

- 소스맵은 스택 가독성이 아니라 **그루핑 때문에** 필수다 (Part 5)

---

## 규칙 2. 필터는 2중으로, 각자의 자리에

| 계층                      | 실행 위치           | 특징                                 |
| ------------------------- | ------------------- | ------------------------------------ |
| `ignoreErrors`/`denyUrls` | SDK event processor | 전송량 자체를 줄임. 코드 배포 필요   |
| `beforeSend`              | SDK, processors 뒤  | 동적 조건·마스킹. 최종 이벤트를 본다 |
| Inbound filters           | Relay (서버)        | **쿼터 미소모**. 대시보드에서 즉시   |

- SDK에는 `DEFAULT_IGNORE_ERRORS`가 이미 있다 — 중복 추가로 목록을 오염시키지 말 것
- 서버 필터는 symbolication 전이라 원본 파일명 조건은 불가 (Part 4)
- 판단 기준: 항구적 노이즈는 SDK에, 긴급 차단은 서버에

---

## 규칙 3. 쿼터는 "미리" 지켜야 한다

Part 3~4에서 본 사실들:

- 쿼터 초과 이벤트는 **수락 자체가 안 되고 복구 불가** (문서: "will not be accepted")
- rate limit 발동 시 SDK는 이벤트를 **로컬에서 버린다** — 나중에 안 온다
- spike protection이 발동해도 마찬가지로 드랍

따라서:

```ts
Sentry.init({
  sampleRate: 1.0, // 에러는 전량 — 샘플링할 이유가 없다
  tracesSampleRate: 0.05, // 쿼터를 먹는 건 대부분 이쪽
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
})
```

- 얼마나 버려지고 있는지는 client report(Stats → Client Discards)로 감시할 수 있다 (Part 3)

---

## 규칙 4. try/catch 뒤에는 손으로 보내라

Part 1의 원리: SDK는 **unhandled만** 자동으로 잡는다.

```ts
try {
  await submitOrder(payload)
} catch (e) {
  toast.error('주문에 실패했습니다')
  Sentry.captureException(e, {
    tags: {feature: 'checkout'},
    extra: {orderId},
  })
}
```

- fetch의 4xx/5xx는 JS 관점에서 에러가 아니다 — reject되지 않으므로 안 잡힌다
- `captureMessage`에 가변 문자열을 넣으면 message 그루핑으로 폴백되어 이슈가 분열한다 (Part 5) — **Error 객체 + 고정 메시지 + 컨텍스트**가 항상 정답

---

## 규칙 5. 이슈 상태를 원리에 맞게 쓰기

현재 이슈 상태: **New, Ongoing, Escalating, Regressed, Archived, Resolved**

- **Resolve는 "in next release"로** — release 설정(규칙 1)이 되어 있어야 다음 릴리스에서의 재발만 이슈를 다시 연다
- **Archive는 기본이 "until escalating"** — 발생량이 예측 임계치를 넘으면 자동으로 다시 올라온다. 판정은 직전 1주 데이터 기반 forecast (7일 미만 이슈는 시간당 최대치 × 10)
- 그래서 "혹시 몰라서 안 닫는" 습관은 근거가 없다 — **닫아도 시스템이 다시 열어준다**

알림은 이 상태 전이에 걸어야 한다: 새 이슈 / **Escalating** / **Regressed** / 핵심 경로 태그. "발생했다"는 알림 대상이 아니다.

---

## 규칙 6. 주간 트리아지 15분을 루틴으로

도구가 아니라 습관이 Sentry를 살린다. 주 1회, 돌아가면서:

1. 지난 주 **신규 이슈**를 훑는다 — 필터: `is:unresolved firstSeen:-7d`
2. 각 이슈를 셋 중 하나로 보낸다: **고친다(assign) / 안 고친다(archive) / 노이즈(필터 PR)**
3. 이벤트 수 상위 10개를 확인한다 — 방치된 고빈도 이슈가 쿼터를 먹는다 (규칙 3)

- 15분 안에 안 끝난다면 노이즈 필터(규칙 2)가 부족하다는 신호다
- 새 팀원 온보딩 과제로도 좋다 — 서비스의 약한 곳을 가장 빨리 배운다

<!-- 데모: 실제 프로젝트 대시보드를 열고 신규 이슈 하나를 같이 트리아지해보기 -->

---

## 부록 — 알아두면 좋은 것들

내부 동작을 알아야 보이는 꿀팁 다섯 가지

---

## 꿀팁 1. 에러 화면에 event_id를 노출하라

Part 2에서 본 것처럼 event_id는 **서버 응답을 기다리지 않고 클라이언트에서 즉시** 생성된다. 그래서 에러가 난 그 자리에서 바로 쓸 수 있다:

```tsx
<Sentry.ErrorBoundary
  fallback={({eventId}) => (
    <ErrorPage message={`문의 시 이 코드를 알려주세요: ${eventId}`} />
  )}
>
```

- CS 문의가 들어오면 event_id로 대시보드에서 **해당 이벤트를 바로 검색**
- "재현이 안 되는데요"라는 대화가 "이벤트 열어보니 breadcrumb에 다 있네요"로 바뀐다
- `Sentry.lastEventId()`로 어디서든 직전 이벤트 id를 얻을 수도 있다

---

## 꿀팁 2. 애드블로커에 막히면 tunnel

애드블로커 상당수가 `*.sentry.io` 요청을 차단한다 — 에러가 많이 나는 환경일수록 리포팅이 누락되기 쉽다.

```ts
// @sentry/nextjs — 자기 도메인의 라우트로 우회
export default withSentryConfig(nextConfig, {
  tunnelRoute: '/monitoring',
})
```

- Part 3에서 본 원리: tunnel 사용 시 envelope 헤더에 dsn이 들어가므로, 중계 서버(Next.js가 자동 생성)는 그걸 보고 Sentry로 포워딩한다
- 도입 전후로 이벤트 볼륨을 비교해보면 그동안 얼마나 누락됐는지 보인다

---

## 꿀팁 3. error.cause를 쓰면 체인이 펼쳐진다

기본 integration 중 **linkedErrorsIntegration**(Part 1)이 `error.cause`를 따라가며 원인 에러를 이벤트에 같이 싣는다.

```ts
try {
  await fetchUser(id)
} catch (e) {
  // 원인을 버리지 않고 도메인 에러로 감싼다
  throw new UserLoadError('failed to load user', {cause: e})
}
```

- 대시보드에서 `UserLoadError`와 원인(`TypeError: Failed to fetch` 등)의 **스택이 둘 다** 보인다
- 도메인 에러로 감싸면 그루핑 단위도 "기능" 기준으로 정리된다 — fingerprint 없이 뭉침을 줄이는 가장 값싼 방법

---

## 꿀팁 4. extra의 객체가 `[Object]`로 잘려 있다면

Part 2의 조립 파이프라인 마지막 단계가 normalize였다 — 기본 **depth 3**에서 자른다.

```ts
Sentry.captureException(e, {
  extra: {order}, // order.items[0].product.name → 잘림
})

// 방법 1: 필요한 값만 평평하게
Sentry.captureException(e, {
  extra: {orderId: order.id, itemCount: order.items.length},
})

// 방법 2: 정말 깊은 구조가 필요하면
Sentry.init({normalizeDepth: 5})
```

- 순환 참조 제거와 페이로드 폭발 방지를 위한 안전장치라, 올리더라도 적당히
- 애초에 "디버깅에 실제로 쓸 값만 골라 넣는" 쪽이 항상 낫다

---

## 꿀팁 5. 에러 헬퍼가 스택 맨 위를 차지한다면 framesToPop

`assert()` 같은 헬퍼를 만들면 모든 에러의 스택 최상단이 헬퍼 자신이 된다 — 그루핑 재료가 오염된다(Part 5).

```ts
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    const error = new Error(message)
    // Sentry 스택 파서가 이 개수만큼 위에서 프레임을 버린다
    ;(error as any).framesToPop = 1
    throw error
  }
}
```

- SDK 스택 파서가 지원하는 관례다 (`parseStackFrames`) — invariant 같은 라이브러리들이 쓰는 방식
- 스택 최상단이 "실제 호출한 곳"이 되어 가독성과 그루핑이 같이 좋아진다

---

## 번외. @sentry/nextjs는 구조가 조금 다르다

Next.js에서는 서버·엣지·클라이언트 **세 런타임에서 SDK가 따로 초기화**된다:

```
instrumentation.ts          서버·엣지 config 로드 (register())
                            + onRequestError = Sentry.captureRequestError
instrumentation-client.ts   브라우저 SDK 초기화 ← 이 덱에서 본 세계
```

- **Server Component에서 난 에러**는 브라우저가 아니라 **서버 런타임의 SDK**가 잡는다 — `onRequestError` 훅 경유. 이 덱 Part 1(브라우저 계측)이 아니라 Node 계측의 영역이다
- 클라이언트 렌더 에러는 ErrorBoundary(`global-error.tsx`) → 브라우저 SDK로
- 소스맵 업로드와 tunnel은 `withSentryConfig`가 담당한다 (규칙 1, 꿀팁 2)

<!-- 데모: 같은 throw를 server component와 client component에 각각 넣고, 이벤트가 어느 런타임으로 잡히는지 비교하면 효과적 -->

---

## 전체 체크리스트

- [ ] 번들러 플러그인으로 소스맵 업로드 (Debug ID 자동 주입)
- [ ] `release`(커밋 SHA) + `environment` 설정
- [ ] `tracesSampleRate` 조정, `sampleRate`는 1.0 유지
- [ ] SDK 필터: 프로젝트 고유 노이즈만 (기본 목록과 중복 금지)
- [ ] 서버 Inbound filters: 확장 프로그램·크롤러 필터 활성화
- [ ] try/catch 안의 중요 에러에 `captureException` + 고정 메시지 + 컨텍스트
- [ ] 공통 에러 핸들러에 `fingerprint` 설계
- [ ] 알림: 새 이슈 / Escalating / Regressed / 핵심 경로, production 한정
- [ ] Stats → Client Discards 주기적 확인 (조용함 ≠ 에러 없음)
- [ ] Resolve는 "in next release"로, Archive는 "until escalating"으로
- [ ] 주간 15분 트리아지를 팀 캘린더에

---

## 마지막 한 장

이 덱에서 따라간 여정:

> `throw` → onerror(프로퍼티 교체) → 3-스코프 병합 → processors → beforeSend
> → envelope(JSON 라인) → Relay(필터) → Symbolicator(Debug ID) → 그루핑(context line) → 이슈

운영 수칙은 외울 것이 아니라 **이 파이프라인에서 도출되는 것**이다.

- 소스맵을 올리는 이유 = context line 해시
- 필터를 2중으로 두는 이유 = 쿼터는 Relay 앞에서만 절약된다
- Archive를 겁내지 않는 이유 = escalating forecast가 지켜본다

파이프라인이 머리에 있으면, 처음 보는 문제도 위치를 특정할 수 있다.

---

# 감사합니다

<!-- _class: invert -->

기준: sentry-javascript v10.69.0 / getsentry/sentry, relay (2026-01)

@yceffort
