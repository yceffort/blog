---
title: '<em>여러 웹뷰</em>에서 하나의 웹 운영하기: 환경 분기를 어댑터로 모은 과정'
tags:
  - webview
  - architecture
  - css
  - frontend
published: true
date: 2026-09-09 14:00:00
description: '자사 앱과 파트너 앱의 iOS, Android 웹뷰를 지원하며 흩어진 환경 분기를 어댑터로 모았다. 인셋과 브릿지, CSS를 정리한 과정과 SSR 시드, hydration에서 겪은 문제를 기록했다.'
thumbnail: /thumbnails/2026/09/one-web-on-multiple-webviews.png
art:
  undraw: device-sync
  layout: rings
  hue: blue
  tone: light
---

## Table of Contents

## 여백 하나를 얻는 네 가지 방법

하나의 웹 서비스를 자사 앱과 파트너 앱의 iOS, Android 웹뷰에서 운영했다. 화면도 코드도 같았지만, 화면 하단의 안전 여백(safe area inset)을 얻는 방법부터 달랐다. 노치나 홈 인디케이터, OS 내비게이션 바와 콘텐츠가 겹치지 않도록 확보하는 여백인데, 환경마다 아래와 같이 처리하고 있었다.

| 환경          | 상단 인셋                                                      | 하단 인셋                                |
| ------------- | -------------------------------------------------------------- | ---------------------------------------- |
| 자사 앱 iOS   | 최초 요청 헤더, 없으면 디바이스 테이블(모델별 기본값 하드코딩) | `env(safe-area-inset-bottom)` (네이티브) |
| 자사 앱 AOS   | 브릿지(JSAPI) 호출                                             | 없음 (`env()`가 항상 0)                  |
| 파트너 앱 iOS | 최초 요청 헤더, 이후 쿠키 시드                                 | `env(safe-area-inset-bottom)` (네이티브) |
| 파트너 앱 AOS | 위와 동일                                                      | 앱이 주입하는 CSS 변수                   |

> 위 표는 `viewport-fit=cover`를 선언한 상태에서 관측한 결과다. 그런데도 두 앱의 AOS 웹뷰는 `env()`에 0을 반환했다. 상단에 `env(safe-area-inset-top)`를 쓰지 않은 이유는 웹뷰 위치가 화면 모드에 따라 달랐기 때문이다. 웹뷰가 상태바 아래에서 시작하기도 하고 화면 전체를 덮기도 해서, 헤더 계산에 필요한 상태바 높이는 앱이 알려주는 값을 사용했다.
>
> 이 동작은 WebView 버전에 따라서도 달라진다. [Chromium의 WebView 인셋 문서](https://chromium.googlesource.com/chromium/src/+/HEAD/android_webview/docs/insets.md)에 따르면 M136부터는 풀스크린 웹뷰에서, M144부터는 모든 웹뷰에서 시스템 바와 컷아웃 인셋을 CSS로 전달한다. 표의 0을 Android WebView의 고정된 특성으로 봐서는 안 된다.

인셋 외에도 확인할 것이 많았다. 키보드가 올라오면 웹뷰가 줄어드는지 밀리는지, Android의 뒤로 가기가 페이지 이동인지 웹뷰 닫기인지, 링크를 SPA 전환으로 여는지 새 웹뷰로 여는지부터 달랐다. 백그라운드 복귀 신호와 다크모드 설정까지, 여러 화면에서 쓰는 기능마다 채널과 OS 조합을 확인해야 했다.

이 중 상당수는 OS뿐 아니라 호스트 앱의 웹뷰 설정에 영향을 받는다. 키보드 동작에는 `windowSoftInputMode`가 관여하고, 뒤로 가기 처리와 엣지투엣지 여부도 호스트가 정한다. iOS와 Android만 구분해서는 같은 OS에 있는 두 앱의 차이를 설명할 수 없었다.

이 차이를 처리하느라 컴포넌트와 훅마다 `if (isPartnerApp)`가 늘어났다.

이 글에서는 흩어진 환경 분기를 어댑터로 모은 과정을 다룬다. 각 컴포넌트가 "지금 어떤 환경인가?"를 판단하던 코드를 바꾸고, 환경별 설정과 동작을 한곳에서 **선언**해 사용하도록 했다. 구현하면서 겪은 문제와 남은 한계도 함께 정리했다.

> 복수의 슈퍼앱에 입점하는 웹 서비스에서 겪은 사례다. 채널은 "자사 앱 / 파트너 앱"으로 익명화했고, 코드 예제는 글을 위해 새로 작성했다. 부분 주입이나 늦은 주입 등의 동작은 당시 관측한 것이며, 모든 웹뷰에서 동일하게 발생한다는 뜻은 아니다.

## 조건문이 늘어나면서 생긴 문제

처음에는 문제가 생긴 곳에 조건을 추가하는 것으로 충분해 보였다.

- 파트너 앱에서 하단 인셋이 0으로 나와 해당 컴포넌트에 별도 계산을 넣었다.
- UA에 자사 앱의 식별 마커가 없어 판정부에 예외를 추가했다.
- 자사 전용 브릿지 API가 호출되지 않도록 파트너 앱에서는 가드로 막았다.

각 수정은 당장의 문제를 해결했지만, 환경별로 무엇이 달라졌는지는 따로 정리되지 않았다. 1년 뒤에는 값 계산, 브릿지 호출, 스타일, UI 표시 코드 수백 곳에서 원시 판별 함수를 직접 호출하고 있었다. 유지보수하면서 세 가지 문제가 드러났다.

1. **환경별 차이를 파악하기 어려웠다.** "파트너 앱에서 뭐가 다르죠?"에 답하려면 grep 결과 수백 줄을 읽어야 했다.
2. **가드를 빠뜨려도 발견하기 어려웠다.** 컴파일과 기존 테스트를 통과한 코드가 특정 채널과 OS 조합의 실기기에서만 실패했다.
3. **새 환경을 추가할 때 확인할 곳이 많았다.** 기존 분기마다 새 환경에도 같은 조건이 적용되는지 검토해야 했다.

상단 인셋에서 실제로 이런 버그를 겪었다. 자사 앱은 UA에 내비게이션 스타일 마커를 넣어 주고, 웹은 이를 보고 투명 내비게이션일 때만 상태바 높이를 확보했다. 이 로직을 파트너 앱에서도 사용했는데, 파트너 앱의 UA에는 그 마커가 없었다. 항상 기본 내비게이션으로 판정되면서 상단 인셋도 0이 됐다.

그 결과 파트너 앱에서만 헤더가 상태바를 침범했다. 자사 앱에서는 문제가 없었고, 데스크톱에서도 해당 UA를 재현하지 않으면 발견하기 어려웠다. 결국 파트너 앱 실기기에서 확인한 뒤에야 원인을 찾았다.

판정 유틸은 "UA에 자사 앱 마커가 있다"는 전제로 만들어져 있었다. 호출하는 쪽에서는 이 전제를 알기 어려웠다. 다른 환경에서도 재사용할 수 있어 보이는 유틸에 자사 앱의 조건이 숨어 있었던 것이다.

## 웹을 나누기 전에 분기를 나눠 보기

호스트별로 웹을 분리하는 방법도 생각해 봤다.

다만 우리 서비스는 도메인 로직 대부분을 공유하고 있었다. 호스트별 빌드를 만들더라도 공통 코드와 배포를 어떻게 관리할지는 별도로 풀어야 했다. 당시 문제는 주로 인셋이나 브릿지 같은 호스트 연동 부분에 있었으므로, 이 부분을 분리하는 쪽을 택했다.

그렇다고 모든 분기를 없앨 수는 없었다. 특정 앱에서만 배너를 보여주는 것처럼 제품 요구사항에 따른 조건도 있었다. 먼저 분기의 용도를 나눴다.

## 제거할 분기와 남길 분기

값과 동작의 차이는 어댑터 안에서 처리하고, 스타일의 구조적 차이는 선언부로 모았다. 제품 요구사항에 따른 UI 조건은 사용하는 곳에 남겼다.

| 분기 유형        | 예                              | 해법                        | 적용 범위                   |
| ---------------- | ------------------------------- | --------------------------- | --------------------------- |
| 값 분기          | 인셋, 상태바 높이, 키보드 높이  | 어댑터 + 스토어             | 컴포넌트의 환경 판별 제거   |
| 동작 분기        | 브릿지 호출, 백 버튼, 복귀 신호 | 공통 브릿지 인터페이스      | 호출부의 환경 판별 제거     |
| 스타일 구조 분기 | 환경별 셀렉터                   | `data-*` 속성 + 공통 셀렉터 | 환경별 조건을 한곳에서 관리 |
| UI 분기          | 특정 앱 전용 컴포넌트           | 설정값을 읽는 if            | 제품 요구사항에 따라 유지   |

값과 동작의 분기는 어댑터 선택과 구현 안에 남는다. 컴포넌트에서는 그 결과만 사용하므로 환경을 직접 판별할 필요가 없다.

특정 앱에서만 그리는 배너는 표시 조건이 코드에 드러나는 편이 읽기 쉽다. 이 경우에는 **조건을 어디서 가져오는지**가 중요하다.

```tsx
<Page>
  {/* 컴포넌트에서 UA 문자열을 직접 해석한다 */}
  {userAgent.includes('PARTNER') && <PartnerBanner />}

  {/* 어댑터가 판정한 채널을 사용한다 */}
  {host.channel === 'partner' && <PartnerBanner />}

  {/* 여러 채널에 적용할 수 있다면 기능 설정을 사용한다 */}
  {host.features.showPartnerPromotion && <PartnerBanner />}
</Page>
```

모든 UI 조건에 feature 플래그가 필요한 것은 아니다. 한 채널에만 해당하는 요구사항이고 재사용할 일도 없다면 `channel === 'partner'` 비교로 충분할 수 있다.

## 질문에서 선언으로

공통 원칙은 환경을 판별하는 위치를 줄이는 것이다.

- 컴포넌트마다 환경을 판별하면 새 환경이 추가될 때마다 기존 조건을 확인해야 한다.
- 환경별 설정을 `HostConfig`, `data-*` 속성, CSS 변수로 모으면 컴포넌트는 같은 인터페이스를 계속 사용할 수 있다. 새 환경도 기존 인터페이스로 지원할 수 있다면 어댑터와 선언부를 추가하는 것으로 대응할 수 있다.

환경 판별은 조립 지점(composition root)에서 한다. 이곳에서 UA와 헤더를 읽어 어댑터를 고르고, 나머지 코드에는 설정과 스토어, 브릿지를 전달한다.

```text
[호스트 N종: 헤더 / 쿠키 / JSAPI / CSS 변수 주입 / env()]   ← 호스트마다 다른 입력
        ↓
① 어댑터: 환경별 파일 N개                                  ← 환경별 소스와 동작 처리
        ↓
② 스토어: 현재 값과 신뢰 등급
        ↓
③ 선언: html[data-*] + 자체 CSS 변수 + HostConfig
        ↓
④ 사용: CSS / 컴포넌트 / 훅                                ← 같은 인터페이스로 사용
        ↓
⑤ 검증: 린트 + 공통 테스트                                 ← import 제한과 어댑터 동작 확인
```

파일도 이 역할에 맞춰 나눴다.

```text
src/host/
  adapters/
    types.ts        # 어댑터가 구현할 타입과 메서드
    detect.ts       # 원시 판별(UA, 헤더). bootstrap.ts 등 조립 코드에서만 사용
    own-ios.ts      # 환경별 연동 구현
    own-aos.ts
    partner-ios.ts
    partner-aos.ts
  store.ts          # 인셋과 출처별 등급을 저장하고 갱신
  bootstrap.ts      # 조립 지점. "어떤 환경인가?"가 실행되는 유일한 곳
  react.tsx         # 컴포넌트에서 사용할 Provider와 훅
```

`HostAdapter`는 세 부분으로 구성된다. `seedInsets`와 `watchInsets`는 인셋의 초기값과 갱신값을 제공하고, `bridge`는 호스트별 동작을 구현한다. `config`에는 채널과 OS, 기능 설정을 둔다.

어댑터 파일 하나는 서두 표의 한 환경을 구현한다. 쿠키 이름, CSS 변수명, 미지원 브릿지 목록은 이 파일에서 관리한다. `bootstrapHost`는 환경에 맞는 어댑터를 고르고, 시드로 스토어를 만든 뒤 React와 CSS에서 쓸 값을 반환한다.

서버는 요청 헤더와 쿠키로 시드를 구하고, 판정 결과와 함께 HTML에 넣는다. 클라이언트 진입점은 `<html data-seed>`에서 그 시드를 읽어 같은 값으로 스토어를 초기화한다(구현은 뒤의 파일별 구현 예제에 있다). 현재 페이지의 hydration에는 이 값을 사용한다. 서버가 응답에 설정하는 쿠키는 이후 서브도메인 이동 등 새로운 SSR 요청에서 시드를 복원하기 위한 것이다.

컴포넌트에서는 값의 출처나 브릿지 구현을 몰라도 된다.

```tsx
function Screen() {
  const {bottom} = useInsets() // 스토어 구독. 값이 어디서 왔는지 모른다
  const host = useHost() // HostConfig: channel, os, features
  const bridge = useBridge() // HostBridge: 환경마다 같은 메서드를 제공한다

  useEffect(() => bridge.setStatusBarStyle('dark'), []) // 가드 없이 호출한다

  return (
    <div style={{paddingBottom: bottom}}>
      {host.features.showPartnerPromotion && <PartnerBanner />}
    </div>
  )
}
```

원시 판별 함수를 사용할 수 있는 위치는 린트로 제한하고, 어댑터마다 같은 테스트를 실행해 인터페이스에서 약속한 동작을 확인한다. 이를 계약 테스트라고 부른다.

## 값: 늦게 도착하는 인셋 처리하기

우리가 관측한 호스트에서는 CSS 변수가 `onPageFinished` 이후에 주입됐다. bottom이 먼저 들어오고 top은 나중에 들어오는 경우도 있었다. 초기화 시점에 모든 인셋을 알 수 있다고 가정해서는 안 됐다.

처음에는 값을 읽을 때마다 헤더, 쿠키, CSS 변수를 비교해 폴백을 고르는 함수를 만들었다. 하지만 호출 시점마다 답이 달라질 수 있었고, 이미 읽은 실측값보다 오래된 쿠키를 선택하지 않는지도 계속 신경 써야 했다.

그래서 읽기와 갱신을 분리했다. 컴포넌트는 스토어를 읽고, 어댑터는 값을 얻는 대로 스토어에 전달한다. 스토어는 출처별 신뢰 등급에 따라 갱신 여부를 결정한다.

```text
시드(헤더/쿠키)           = 잠정값. 확정값을 절대 덮지 못한다.
주입 감지(CSS 변수 실측)   = 확정값.
```

`push(side, value, grade)`는 해당 방향의 현재 등급보다 낮은 값은 무시한다. 같거나 높은 등급이면 값을 바꾸고 구독자에게 알린다.

인셋 헤더는 호스트 앱이 웹뷰 최초 요청에만 실어 줬다. 서비스 안에서 다른 서브도메인으로 이동하면 다음 SSR 요청에는 이 헤더가 없었다. 그래서 최초 SSR 응답에서 헤더 값을 쿠키로 남기고, 이후 요청에서는 쿠키로 시드를 복원했다. 이전 요청에서 얻은 값이므로 실측값보다 낮은 등급을 부여했다.

React에서는 [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore#adding-support-for-server-rendering)로 스토어를 구독한다. 스토어가 첫 렌더에 쓴 시드 스냅샷을 따로 고정해 두고 `getServerSnapshot`은 그것만 돌려주게 하면, 클라이언트 부트스트랩이 hydration보다 먼저 실측값을 밀어 넣더라도 hydration 동안 React가 보는 값은 서버와 같다. 확정값은 hydration이 끝난 뒤의 재렌더로 반영된다. 시드 자체도 클라이언트가 쿠키를 다시 읽지 않고 서버가 HTML에 직렬화해 둔 값을 쓰게 해서, 두 쪽이 다른 시드에서 출발할 가능성을 없앤다.

CSS 변수를 읽을 때는 **미주입과 0으로 주입된 상태를 구분해야 한다.** `getComputedStyle`은 변수가 없으면 빈 문자열을, 0이 주입되면 `"0px"` 같은 값을 반환한다.

```ts
/** side별 CSS 변수를 읽되, 미주입(undefined)과 0 주입(0)을 구분한다 */
const readInjectedInset = (cssVar: string): number | undefined => {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim()

  if (value === '') return undefined // 미주입: 아직 도착하지 않았다

  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return undefined // 파싱 불가도 미주입으로 취급한다. 확정 0으로 승격시키면 시드를 이겨 버린다

  return parsed > 0 ? Math.round(parsed) : 0 // 0도 유효한 확정값
}
```

이전 세션의 쿠키에는 `bottom: 34`가 남아 있지만, 현재 화면에서는 엣지투엣지가 꺼져 실측 인셋이 0일 수 있다. 이때 "0이면 쿠키로 폴백"하면 불필요한 하단 여백 34px이 생긴다. 주입되지 않은 방향만 시드로 채우고, 실측한 0은 그대로 사용해야 한다. bottom만 먼저 주입됐을 때도 같은 원칙으로 top의 시드를 유지할 수 있다.

```ts
const css = {
  top: readInjectedInset('--host-inset-top'),
  bottom: readInjectedInset('--host-inset-bottom'),
}
const seed = readSeedFromHtml() // 서버가 <html data-seed>에 직렬화해 둔 시드

const merged = {
  top: css.top ?? seed.top ?? 0, // ??이므로 "0으로 주입됨"은 시드에 지지 않는다
  bottom: css.bottom ?? seed.bottom ?? 0,
}
```

이 글은 상단과 하단만 다루지만 인셋은 top, right, bottom, left 네 방향이다. 가로 모드에서는 left와 right가 같은 문제를 그대로 반복하므로, 스토어와 병합 로직은 처음부터 네 방향을 다루도록 두는 편이 낫다.

키보드 높이도 비슷하게 다룰 수 있다. 소스가 환경마다 다르고, 늦게 도착하거나 중간값이 바뀔 수 있어서다. 다만 소스를 정할 때는 WebView 버전까지 확인해야 한다. 예를 들어 [Android WebView는 M139부터 키보드에 따른 visual viewport 리사이즈를 지원한다](https://chromium.googlesource.com/chromium/src/+/HEAD/android_webview/docs/insets.md). 각 어댑터에서 이 차이를 처리하면 컴포넌트는 스토어가 제공하는 높이만 사용하면 된다.

모든 주입을 감지하지는 못했다. `MutationObserver`로 인라인 스타일 변경을 감지하려면 앱이 `documentElement`의 인라인 스타일에 값을 넣는다는 전제가 필요했다. 앱 소스를 볼 수 없어 이를 확정하지 못했고, JS에서는 최초 측정과 회전이나 리사이즈처럼 신호가 있는 변경만 반영하기로 했다. 따라서 실측값이 주입돼도 다음 신호가 올 때까지 시드를 사용하는 경우가 남는다.

## 시드 쿠키: 무엇을 싣고, 언제 사라지는가

SSR에서 사용할 시드는 헤더와 쿠키의 유무에 따라 달라진다.

| SSR 상황                      | 헤더 | 쿠키           | 시드   |
| ----------------------------- | ---- | -------------- | ------ |
| 웹뷰 최초 요청                | 있음 | 없거나 과거 값 | 헤더   |
| 서비스 안에서 서브도메인 이동 | 없음 | 있음           | 쿠키   |
| 로그아웃 직후의 SSR           | 없음 | 없음           | 기본값 |

우리가 연동한 호스트는 로그아웃 시점에 웹뷰 쿠키를 모두 삭제했다. 세션 쿠키와 함께 인셋 시드도 사라졌다. 웹에서 시드 쿠키만 예외로 남길 수는 없으므로, 쿠키가 없는 상태도 처리해야 했다.

비영속 저장소와 디스크 저장 시점도 고려해야 한다. iOS의 [`WKWebsiteDataStore.nonPersistent()`](https://developer.apple.com/documentation/webkit/wkwebsitedatastore/nonpersistent%28%29)는 데이터를 메모리에만 보관하므로 앱 재실행 후에도 쿠키가 남아 있다고 가정할 수 없다. Android에서도 디스크에 기록되기 전에 프로세스가 종료되면 최근 쿠키 변경이 유실될 수 있다. [`CookieManager.flush()`](<https://developer.android.com/reference/android/webkit/CookieManager#flush()>)는 현재 쿠키를 영속 저장소에 기록하는 API다. 직접 겪은 것은 로그아웃 삭제였지만, 어느 경우든 쿠키를 항상 존재하는 값으로 취급해서는 안 된다.

헤더와 쿠키가 모두 없을 때를 위해 `default` 등급을 둔다.

```ts
type Grade = 'default' | 'seed' | 'measured'
const RANK: Record<Grade, number> = {default: 0, seed: 1, measured: 2}
```

헤더도 쿠키도 없는 SSR은 `default` 등급의 0으로 첫 HTML을 만든다. 자사 앱 iOS는 디바이스 테이블에서 시드를 얻는 경로가 있다. 클라이언트에도 같은 초기값을 전달하고, 실측값이 도착하면 `measured`로 갱신한다.

시드가 없으면 첫 화면의 여백이 잠깐 틀릴 수 있다. 이를 피하려고 localStorage에 별도 복사본을 두지는 않았다. 쿠키 삭제 이후에도 오래된 시드를 관리하는 경로가 하나 더 생기기 때문이다. 대신 `default`로 렌더링한 횟수를 호스트별로 기록했다. 로그아웃 외의 상황에서도 빈번하게 발생하면 쿠키 저장이나 전달 경로를 확인할 수 있다.

로그아웃할 때마다 기본값이 쓰이는 것은 아니다. 웹뷰를 닫았다가 다시 열면 최초 요청 헤더를 다시 받고, SPA 전환만 하면 스토어가 메모리에 남는다. 우리 서비스에서 확인한 경로는 웹 안에서 로그아웃한 뒤 전체 페이지 이동으로 로그인 화면을 SSR하는 경우였다.

시드 쿠키는 다음과 같이 설정했다.

- `Max-Age`를 지정해 세션이 끝나도 보관할 수 있게 한다. 다만 호스트가 쿠키를 명시적으로 삭제하는 것까지 막지는 못한다.
- 서브도메인 사이에서 공유할 수 있도록 `Domain`을 명시한다. 생략하면 쿠키를 설정한 호스트에만 전송된다.
- 인셋과 스키마 버전만 저장한다. 사용자 식별 정보는 넣지 않고, 채널과 OS는 SSR 요청마다 다시 판정한다.

쿠키를 SSR 입력으로 사용하면 HTML도 기기마다 달라진다. 공유 캐시가 이 차이를 무시하면 다른 기기의 인셋이 들어간 HTML을 받을 수 있다. `Cache-Control: private`을 사용하거나, 헤더와 쿠키 등 HTML을 바꾸는 입력이 캐시 정책에 반영되도록 해야 한다.

## 동작: 브릿지 차이를 어댑터에서 처리하기

자사 전용 브릿지를 호출할 때마다 가드를 넣으면 새 호출부에서도 같은 조건을 기억해야 한다. 호출부에서는 같은 메서드를 사용하고, 내부 구현만 환경별로 다르게 두었다. 상태바 스타일처럼 미지원 환경에서 생략해도 되는 기능은 아무 작업도 하지 않는 함수(no-op)로 구현했다.

```ts
// 자사 앱 어댑터는 JSAPI를 부르고, 파트너 앱 어댑터는 같은 메서드를 no-op으로 구현한다
const ownAppBridge: HostBridge = {
  setStatusBarStyle: (style) => window.OwnAppJSAPI?.setStatusBar(style),
}
const partnerBridge: HostBridge = {
  setStatusBarStyle: () => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[bridge] setStatusBarStyle: 파트너 앱 미지원(no-op)')
    }
  },
}
```

호출부에서는 환경을 확인하지 않고 메서드를 부르면 된다. 다만 아무 반응이 없는 이유를 알 수 있도록 개발 환경에서는 미지원 기능이라는 경고를 남겼다.

모든 미지원 기능을 no-op으로 처리할 수는 없다. 예를 들어 결제를 마친 뒤 자사 앱은 웹뷰를 닫지만, 파트너 앱은 결과 페이지로 이동해야 할 수 있다. 이 동작은 `finishFlow(result)`로 묶고 각 어댑터에서 구현한다. `closeWebView()`처럼 특정 수단으로 이름을 정하면 파트너 앱의 동작을 담기 어렵다. 아무것도 하지 않아도 요구사항을 만족하는 경우에만 no-op을 쓴다.

내비게이션이나 복귀 이벤트도 같은 방식으로 처리한다.

- **내비게이션**: 같은 "다음 화면으로"가 자사 앱에서는 새 웹뷰 스택 쌓기이고 파트너 앱에서는 SPA 라우팅이다. 호출부는 `bridge.navigate(url)` 하나를 부르고, 스택을 쌓을지 라우터로 전환할지는 어댑터가 결정한다. `window.open`과 외부 브라우저 열기 정책도 같은 자리에서 흡수한다.
- **복귀 신호**: 웹뷰가 백그라운드에서 돌아오면 세션과 데이터를 다시 확인해야 한다. 호스트마다 제공하는 신호가 달라서, 어댑터가 브릿지의 resume 이벤트나 `visibilitychange`, `pageshow`를 받아 같은 형식의 이벤트로 전달한다.
- **뒤로 가기**: Android에서도 호스트마다 처리 방식이 다르다. "이전 페이지가 있으면 돌아가고, 없으면 웹뷰를 닫는다"는 동작을 각 호스트의 API에 맞춰 구현한다.

핸들러에서 환경에 따른 차이를 발견하면, 호스트 연동 방식의 차이인지 제품 요구사항인지 먼저 확인했다.

- **호스트 연동 방식**의 차이는 어댑터에서 처리한다. 결제 종료 후 웹뷰를 닫을지 결과 화면으로 이동할지는 `bridge.finishFlow(result)`의 구현에서 정한다.
- **제품 요구사항**에 따른 차이는 핸들러에 남긴다. 특정 앱에서만 결제 후 쿠폰 화면을 보여줘야 한다면, `features`에 선언하고 핸들러가 이를 읽는다.

```tsx
function usePaymentComplete() {
  const host = useHost()
  const bridge = useBridge()

  return async (order: Order) => {
    await markPaid(order) // 도메인. 호스트와 무관하다

    if (host.features.showCouponAfterPayment) {
      bridge.navigate('/coupon') // 제품 결정. 선언을 읽는 if는 남는다
      return
    }
    bridge.finishFlow({orderId: order.id}) // 웹뷰를 닫을지 페이지를 이동할지는 어댑터가 처리한다
  }
}
```

핸들러 전체를 어댑터로 옮기지는 않았다. `adapter.onPaymentComplete(order)`가 결제 처리까지 맡으면 환경별 구현에 도메인 로직이 중복될 수 있다. 어댑터가 주문이나 결제 모듈을 import한다면 역할이 지나치게 넓어진 것은 아닌지 확인해야 한다.

단계를 나눠도 실행 순서가 환경마다 다른 경우에는 관련 단계만 하나의 메서드로 묶을 수 있다. 이때도 도메인 처리까지 옮기지 않도록 범위를 제한한다. 계약 테스트에서는 내부 호출 순서뿐 아니라, 작업이 완료됐을 때 모든 호스트에서 같은 결과 조건을 만족하는지 확인한다.

앱 버전도 고려해야 한다. 웹을 배포해도 사용자의 호스트 앱이 함께 업데이트되지는 않기 때문이다. 기능 지원 여부를 호출부마다 버전 문자열로 비교하면 환경 분기를 모은 효과가 줄어든다. 브릿지 핸드셰이크나 버전 테이블로 어댑터가 지원 여부를 확인하고, 결과를 `HostConfig.features`에 담는다. 호출부는 이 설정값만 확인하면 된다.

## 스타일: 공통 CSS 변수로 인셋 사용하기

인셋처럼 값만 다른 경우에는 CSS 변수로 처리할 수 있다. 환경별 선언부에서 소스를 고르고, 컴포넌트는 같은 변수명을 사용한다.

```css
/* 환경 선언부: 분기는 여기 한 곳에만 존재한다 */
html {
  --app-bottom-inset: env(safe-area-inset-bottom, 0px);
}
html[data-host='partner'][data-os='aos'] {
  /* 주입 전에는 SSR이 <html> 인라인 스타일로 내려준 시드, 주입 뒤에는 실측값 */
  --app-bottom-inset: var(--host-inset-bottom, var(--app-seed-bottom, 0px));
}

/* 컴포넌트 스타일에서는 공통 변수만 사용한다 */
.floating-layout {
  padding-bottom: calc(16px + var(--app-bottom-inset));
}
```

이렇게 하면 컴포넌트마다 환경별 오버라이드를 반복할 필요가 없다.

`data-host`와 `data-os`는 SSR에서 `<html>`에 넣는다. 클라이언트 JS가 붙이게 하면 첫 페인트에 기본 규칙이 적용됐다가 나중에 바뀐다. 주입 전 인셋도 사용할 수 있도록 `--app-seed-bottom`을 함께 내려준다.

웹에서 사용할 변수(`--app-bottom-inset`)와 앱이 주입하는 변수(`--host-inset-bottom`)는 이름을 분리했다. 같은 변수를 양쪽에서 설정하면 웹 코드가 앱의 실측값을 덮어쓸 수 있다. 앱이 주입하는 이름은 읽기만 하고, 웹에서는 별도의 변수를 사용한다.

여백 계산에서는 `max()`와 덧셈의 차이도 확인해야 했다. 하단 고정 버튼에 `max(인셋, 16px)`를 적용하면 둘 중 큰 값만 확보한다. 우리가 관측한 파트너 앱 AOS는 웹뷰가 불투명한 내비게이션 바 아래까지 확장됐다. 인셋이 15px이면 `max(15px, 16px)`로 확보한 16px 중 15px이 바에 가려져, 보이는 여백은 1px뿐이었다.

이 화면에서 바 위에 16px을 남기려면 `calc(16px + 15px)`가 필요했다. 그래서 위 예제도 덧셈을 사용한다. 인셋이 0인 환경에서는 그대로 16px이 된다. 홈 인디케이터 주변이 보이는 iOS 화면과는 시각적 결과가 달랐으므로, 엣지투엣지 여부뿐 아니라 실제 바가 어떻게 그려지는지도 확인했다.

모든 컴포넌트에 16px을 더할 필요는 없다. 바텀시트처럼 콘텐츠를 시스템 영역 바로 위까지 배치하려면 인셋만 적용하면 된다. 추가 여백은 컴포넌트 디자인에 따라 정한다.

셀렉터 구조 자체가 달라지는 경우에는 분기가 남는다. 이런 조건은 `[data-features~='no-env']`처럼 이유를 나타내는 속성으로 선언하고, 반복되는 셀렉터를 mixin으로 모았다. 수정할 때 관련 스타일을 한 번에 찾을 수 있도록 하기 위해서다.

실제 사용처에 따라 CSS와 JS 경로를 나눴다. 하단처럼 레이아웃에만 쓰는 값은 CSS로 처리할 수 있다. 상단은 헤더와 sticky 요소의 위치를 JS로 계산하는 코드가 있어 스토어를 통해 같은 값을 사용하도록 했다. 앞의 `Screen`은 JS에서도 하단 인셋이 필요할 때의 사용 예다.

두 경로는 갱신 시점이 다르다. CSS는 변수가 늦게 주입돼도 바로 반영하지만, JS 스토어는 다음 감지 신호까지 이전 값에 머문다. 신호 없는 늦은 주입을 놓치는 문제는 JS 경로에 남는다.

## 린트와 테스트로 확인하기

구조를 바꾼 뒤에도 새 코드가 원시 판별 함수를 직접 사용하면 분기는 다시 흩어진다. 리뷰만으로 확인하기보다는 린트와 계약 테스트를 CI에 추가했다.

린트에서는 원시 판별 유틸(`isPartnerApp` 등)을 어댑터와 조립 코드 밖에서 import하지 못하게 한다.

```js
// eslint: 컴포넌트에서 원시 판별 유틸 import 금지
'no-restricted-imports': ['error', {
  patterns: [{
    group: ['**/host/adapters/detect'],
    message: '판별 유틸은 어댑터와 조립 코드에서만 사용하세요. 컴포넌트에서는 HostConfig를 참조하세요.',
  }],
}]
```

실제 설정에는 어댑터와 `bootstrap.ts` 등 허용된 조립 코드의 예외도 필요하다. 위 패턴은 import 문자열에 적용되므로 프로젝트의 경로 별칭과 상대 경로까지 고려해야 한다. `env(safe-area-inset-*)`나 `prefers-color-scheme`도 컴포넌트 스타일에서 직접 참조하지 않도록 stylelint 규칙을 둔다.

어댑터는 같은 인터페이스를 구현하므로 공통 테스트 스위트를 적용할 수 있다.

```ts
describe.each(adapters)(
  'HostAdapter 계약: $config.channel-$config.os',
  (adapter) => {
    it('인셋을 음수로 반환하지 않는다', () => {
      /* ... */
    })
    it('미지원 브릿지 호출이 예외를 던지지 않는다', () => {
      /* ... */
    })
    it('시드가 확정값을 덮지 않는다', () => {
      /* ... */
    })
  },
)
```

앞서 겪은 상단 인셋 버그도 파트너 앱 UA를 입력으로 넣고 결과를 확인하는 테스트로 남길 수 있다. 환경별 판별과 값 계산이 한곳에 모이면서 이런 회귀 테스트를 작성하기 쉬워졌다. 실제 호스트의 동작까지 검증하는 것은 아니지만, 이미 겪은 버그가 다시 들어오는 것은 CI에서 확인할 수 있다.

## 파일별 구현 예제

어댑터, 스토어, 초기화 코드와 React 연결부를 모으면 다음과 같다. 소스별 파싱과 라우터 같은 세부 구현은 생략했다.

```ts
// host/adapters/types.ts: 어댑터가 제공할 값과 메서드
export type Side = 'top' | 'right' | 'bottom' | 'left'
export const SIDES: Side[] = ['top', 'right', 'bottom', 'left']
export type Insets = Record<Side, number>
export type Grade = 'default' | 'seed' | 'measured'

export interface HostConfig {
  channel: 'own' | 'partner'
  os: 'ios' | 'aos'
  features: {showPartnerPromotion: boolean; showCouponAfterPayment: boolean}
}

export interface HostBridge {
  setStatusBarStyle(style: 'light' | 'dark'): void
  navigate(url: string): void // 스택을 쌓을지 라우터로 갈지는 어댑터가 정한다
  finishFlow(result: FlowResult): void // 웹뷰를 닫을지 결과 화면으로 갈지도
}

export interface HostAdapter {
  seedInsets(ctx: RequestContext): Partial<Insets> | undefined
  watchInsets(push: (side: Side, value: number, grade: Grade) => void): void
  bridge: HostBridge
  config: HostConfig
}
```

```ts
// host/store.ts: 등급이 낮은 값은 높은 값을 덮지 못한다. 그것이 규칙의 전부다
const RANK: Record<Grade, number> = {default: 0, seed: 1, measured: 2}

export function createInsetStore(seed: Partial<Insets> | undefined) {
  const state = {} as Record<Side, {value: number; grade: Grade}>
  for (const side of SIDES) {
    const seeded = seed?.[side]
    state[side] =
      seeded === undefined
        ? {value: 0, grade: 'default'} // 헤더도 쿠키도 없는 SSR이 여기로 온다
        : {value: seeded, grade: 'seed'}
  }

  const listeners = new Set<() => void>()
  const serverSnapshot = toInsets(state) // 첫 렌더에 쓴 값. 이후 절대 바뀌지 않는다
  let snapshot = serverSnapshot

  return {
    push(side: Side, value: number, grade: Grade) {
      if (RANK[grade] < RANK[state[side].grade]) return
      state[side] = {value, grade}
      snapshot = toInsets(state)
      listeners.forEach((listener) => listener())
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot, // hydration 동안 React가 보는 값
    grades: () => Object.fromEntries(SIDES.map((s) => [s, state[s].grade])), // 텔레메트리용
  }
}
```

```ts
// host/adapters/partner-aos.ts: 파트너 앱 AOS의 값 소스와 동작
export const partnerAosAdapter: HostAdapter = {
  seedInsets: (ctx) =>
    parseInsetHeaders(ctx.headers) ?? parseSeedCookie(ctx.cookies),

  watchInsets: (push) => {
    const report = () => {
      for (const side of SIDES) {
        const injected = readInjectedInset(CSS_VAR_BY_SIDE[side]) // 미주입 undefined, 0 주입 0
        if (injected !== undefined) push(side, injected, 'measured')
      }
    }
    report()
    visualViewport?.addEventListener('resize', report)
  },

  bridge: {
    setStatusBarStyle: noopWithDevWarning('setStatusBarStyle'), // 대안이 "아무것도 안 함"인 경우
    navigate: (url) => router.push(url), // 이 호스트는 SPA 전환
    finishFlow: (result) => router.replace(resultPath(result)), // no-op이 아니라 다른 구현
  },

  config: {
    channel: 'partner',
    os: 'aos',
    features: {showPartnerPromotion: true, showCouponAfterPayment: false},
  },
}
```

```ts
// host/bootstrap.ts: "어떤 환경인가?"가 실행되는 유일한 곳. 서버와 클라이언트에서 한 번씩
export function bootstrapHost(ctx: RequestContext) {
  const adapter = selectAdapter(detect(ctx))
  // 클라이언트는 서버가 HTML에 실어 둔 시드를 그대로 쓴다. 쿠키를 다시 읽지 않는다
  const seed: Partial<Insets> =
    ctx.serializedSeed ?? adapter.seedInsets(ctx) ?? {}
  const store = createInsetStore(seed)

  if (typeof window !== 'undefined') {
    adapter.watchInsets((side, value, grade) => store.push(side, value, grade))
  }

  return {
    htmlAttrs: {
      'data-host': adapter.config.channel,
      'data-os': adapter.config.os,
      'data-seed': encodeSeed(seed), // 시드가 없으면 {}를 인코딩하고 그대로 복원한다
      style: {'--app-seed-bottom': `${seed?.bottom ?? 0}px`}, // CSS 경로의 첫 페인트용
    },
    host: adapter.config,
    bridge: adapter.bridge,
    insetStore: store,
    // 시드 절의 규칙: 헤더를 본 SSR 응답만 쿠키를 쓴다. Max-Age와 Domain은 필수
    seedCookie: hasInsetHeaders(ctx)
      ? {
          name: SEED_COOKIE,
          value: encodeSeed(seed),
          maxAge: 60 * 60 * 24 * 30,
          domain: COOKIE_DOMAIN,
          path: '/',
          sameSite: 'lax' as const,
          secure: true,
        }
      : undefined,
  }
}
```

```tsx
// host/react.tsx: 컴포넌트에 설정, 브릿지, 스토어를 제공한다
export function HostProvider({
  value,
  children,
}: {
  value: ReturnType<typeof bootstrapHost>
  children: ReactNode
}) {
  return (
    <HostContext.Provider value={value.host}>
      <BridgeContext.Provider value={value.bridge}>
        <InsetStoreContext.Provider value={value.insetStore}>
          {children}
        </InsetStoreContext.Provider>
      </BridgeContext.Provider>
    </HostContext.Provider>
  )
}

export const useHost = () => useContext(HostContext)
export const useBridge = () => useContext(BridgeContext)
export function useInsets() {
  const store = useContext(InsetStoreContext)
  // hydration 동안은 고정된 서버 스냅샷을, 그 뒤로는 현재 스냅샷을 본다.
  // 클라이언트 부트스트랩의 watchInsets가 hydration보다 먼저 실측값을 밀어 넣어도 어긋나지 않는다
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  )
}
```

```tsx
// SSR 진입점(프레임워크 독립 의사 코드): 판정은 여기서 끝나고, <html> 속성과 쿠키가 응답에 실린다
function renderDocument(req: Request, res: Response) {
  const boot = bootstrapHost(requestContextFrom(req))
  if (boot.seedCookie) res.setCookie(boot.seedCookie)

  return renderToString(
    <html {...boot.htmlAttrs}>
      <body>
        <HostProvider value={boot}>
          <App />
        </HostProvider>
      </body>
    </html>,
  )
}
```

위 코드는 일반 SSR 흐름을 보여주는 의사 코드다. Next.js App Router에서는 [쿠키를 쓸 수 있는 위치](https://nextjs.org/docs/app/api-reference/functions/cookies)가 따로 있고, 함수가 든 `boot` 객체를 서버에서 Client Component로 전달할 수 없다. 최초 응답에 시드 쿠키를 넣는 작업은 Proxy(기존 Middleware)나 응답을 만드는 서버 코드에서 처리해야 한다.

Provider에는 판정 결과와 시드를 **직렬화 가능한 props**로 전달한다. [Client Component도 최초 요청에서는 서버에서 HTML로 렌더링되므로](https://nextjs.org/docs/app/getting-started/server-and-client-components#on-the-server), 초기값을 `document`에서만 읽게 해서는 안 된다. Provider가 props로 스토어를 초기화하고, 브라우저에서 마운트된 뒤 실측 감시를 시작하도록 초기화와 감시를 분리한다. 서버 렌더링과 hydration에서는 같은 시드 스냅샷을 사용한다.

일반 SSR 예제의 클라이언트 진입점은 `navigator`와 HTML의 `data-seed`로 컨텍스트를 만든 뒤 `bootstrapHost`를 한 번 실행한다. 그 결과를 `HostProvider`에 전달하면 컴포넌트는 `useInsets()`, `useHost()`, `useBridge()`를 사용할 수 있다. 시드가 없던 요청에서도 `data-seed`에는 빈 객체 `{}`를 인코딩한다. 디코딩한 결과 역시 `{}`로 유지해야 하며, 이를 `undefined`로 바꿔 쿠키 폴백을 다시 실행하지 않는다.

## 로컬에서 환경별 동작 재현하기

로컬 개발에서도 어댑터를 활용할 수 있었다. 이전에는 파트너 앱 화면을 확인하려면 UA 판별뿐 아니라 CSS 변수 주입 같은 호스트 동작도 각각 흉내 내야 했다. 설정이 번거로워 개발 중 확인과 버그 재현 모두 실기기에 의존하는 경우가 많았다.

이제는 테스트용 어댑터에서 값과 동작을 제공할 수 있다.

- **dev 환경 스위처**: dev 빌드에서 쿼리 파라미터로 HostConfig를 강제하면, 데스크톱 브라우저에서도 파트너 앱 AOS의 선언(`data-*` 속성, CSS 변수)이 그대로 재현된다. 호스트의 CSS 변수 주입은 dev 스크립트로 흉내 내는데, `setTimeout`으로 bottom을 먼저 넣고 top을 늦게 넣으면 부분 주입 레이스까지 로컬에서 재현할 수 있다.
- **Storybook**: 데코레이터로 어댑터를 주입해, 같은 컴포넌트를 환경별 스토리로 나란히 놓는다.
- **E2E**: Playwright의 project를 환경 프로파일(UA, 쿠키, 헤더 조합)별로 정의해 같은 시나리오를 환경 수만큼 돌린다.

이 테스트는 이미 알고 있는 동작을 재현한다. 웹뷰 엔진의 차이나 예상하지 못한 주입 타이밍은 실기기에서 확인해야 한다. 로컬 테스트로 반복 확인을 줄이고, 실제 호스트와의 차이는 기기에서 검증한다.

## 새 환경을 추가할 때

새 파트너 앱을 지원하면 iOS와 AOS 조합이 늘어난다. 기존 인터페이스로 지원할 수 있다면 다음 순서로 작업할 수 있어야 한다.

1. 값의 소스, 브릿지 이름, 컨테이너 설정을 조사해 환경별 어댑터를 작성한다.
2. 어댑터를 공통 계약 테스트에 등록한다.
3. 호스트 선언과 필요한 CSS 오버라이드를 추가한다.
4. 전용 UI 요구사항이 있다면 기능 설정과 해당 UI를 추가한다.

기존 인터페이스로 지원할 수 있는 환경이고 새 제품 요구사항이 없다면, 기존 컴포넌트와 훅은 수정하지 않는 것이 목표다. 전용 UI를 추가하는 경우에는 그에 필요한 코드가 늘어난다. 이를 환경 추상화의 실패로 볼 필요는 없다. 확인해야 할 것은 기존 컴포넌트와 훅에 호스트 판별이 다시 들어가는지다.

새 호스트를 조사하는 일은 여전히 필요하다. 다만 조사 결과를 어댑터에 모아 두면 여러 파일에서 같은 조건을 다시 찾지 않아도 된다. 다음 입점에서도 이 범위를 유지할 수 있는지는 실제 작업을 통해 확인해야 한다.

## 이 구조가 해결하지 못하는 것

도입 후에도 해결되지 않은 문제와 추가된 부담이 있다.

**환경별 구현은 계속 관리해야 한다.** 분기를 어댑터로 모아도 호스트마다 다른 소스와 동작은 남는다. 환경이 늘면 어댑터와 테스트도 늘어난다.

**버그를 추적할 때 거치는 코드가 늘었다.** 값의 출처를 찾으려면 `컴포넌트 → 훅 → 스토어 → 어댑터`를 따라가야 한다. 처음 보는 사람은 이 구조부터 익혀야 한다. 환경 분기가 적은 작은 서비스라면 이 비용이 더 클 수도 있다.

**feature 플래그도 관리가 필요하다.** 조건마다 플래그를 만들면 의미가 겹치거나 조합을 이해하기 어려워진다. 새 플래그를 추가할 때는 기존 설정으로 표현할 수 없는 이유를 리뷰에서 확인했다.

**호스트 업데이트로 전제가 바뀔 수 있다.** 계약 테스트는 어댑터의 구현을 검증할 뿐, 실제 호스트가 계속 같은 값을 주는지까지 확인하지 못한다. WebView의 `env()` 지원 변화처럼 값의 소스나 동작이 달라지면 어댑터도 재검토해야 한다.

그래서 인셋의 출처와 이상치를 원격 로그로 남기는 것이 중요했다. 자사 앱은 디버그 빌드로 확인할 수 있지만, 파트너 앱의 릴리즈 빌드는 웹뷰 인스펙션이 막혀 있는 경우가 많았다. 로그가 없으면 실기기를 가진 사람의 설명만으로 원인을 찾아야 했다.

**첫 페인트의 정확성은 보장하지 못한다.** 시드가 오래됐거나 없는 상태에서 실측값이 늦게 도착하면 여백이 바뀔 수 있다. 이를 숨기려면 렌더링을 늦춰야 하고, 바로 그리려면 레이아웃 시프트를 감수해야 한다. JS 경로에서는 신호 없는 주입을 놓쳐 시드가 계속 남는 경우도 있다.

## 작업을 마치고

작업하면서 분산 시스템의 최종 일관성(eventual consistency) 문제와 비슷하다고 느꼈다. 웹은 호스트의 현재 상태를 직접 알 수 없고, 헤더나 브릿지, CSS 변수로 전달받는다. 전달 시점이 다르고 일부 값이 늦거나 빠질 수 있다. 쿠키는 이전에 관측한 값이고, 스토어의 등급은 서로 다른 소스가 충돌할 때 어느 쪽을 사용할지 정하는 규칙이다.

다만 이 구현이 최종 일관성을 보장하는 것은 아니다. 신호 없는 늦은 주입을 놓치면 실측값으로 갱신되지 않을 수 있다. 이 비유가 도움이 된 지점은 값의 도착 시점과 유효 범위를 먼저 생각하게 됐다는 데 있다.

하나의 웹을 여러 앱에서 열 수 있다는 것은 서비스 확장에 유리하다. 그만큼 개발 쪽에서는 새 호스트를 조사하고 차이를 처리할 시간이 필요하다. 기존 코드에 조건 몇 개를 붙이는 일로 생각하면, 다음 입점에서도 같은 문제를 반복하기 쉽다.

이번 작업에서는 환경 판별을 한곳에 모으고, 값과 동작은 공통 인터페이스로 제공했다. 제품 요구사항에 따른 조건은 남겼다. 새 문제가 생겼을 때 어느 어댑터를 확인하고 어디에 테스트를 추가할지 알 수 있게 된 것이 가장 큰 변화였다.
