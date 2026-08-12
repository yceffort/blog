---
title: 'number-flow를 구형 브라우저로 이식하기: 다섯 가지 결정과 두 가지 번복'
tags:
  - javascript
  - animation
  - web-animations-api
  - browser-compatibility
  - frontend
published: true
date: 2026-08-11 22:00:00
description: 'number-flow가 애니메이션을 켜는 최소 버전은 Chrome 125, Safari 17.2다. 이 하한을 Chrome 66과 WebKit 16.4까지 내리는 포크를 만들면서 내린 결정들과, 뒤집게 된 판단 두 가지, 그리고 자동 강등을 포기한 Safari 버그 조사의 기록.'
thumbnail: /thumbnails/2026/08/number-flow-fork-for-old-browsers.png
---

## Table of Contents

## 숫자 두 개에서 시작한 일

Chrome 125, Safari 17.2. 숫자 카운터 애니메이션 라이브러리 [number-flow](https://github.com/barvian/number-flow)가 애니메이션을 켜기 위해 요구하는 사실상의 최소 버전이다. 라이브러리 자체는 그보다 낮은 버전에서도 로드되고 값도 정확히 렌더링되지만, 애니메이션은 조용히 꺼진다. 숫자가 굴러가는 대신 즉시 교체된다.

이 하한은 지원에 소홀해서가 아니라 오히려 설계가 급진적이어서 생긴다. number-flow는 자릿수 스핀을 CSS `mod()`/`round()` 수식으로, 스프링 곡선을 `linear()` easing으로, 애니메이션 가능한 커스텀 프로퍼티를 `@property`로 구현한다. 세 가지 전부 매 프레임 JS 개입 없이 브라우저 애니메이션 엔진에 일을 맡길 수 있게 해 주는 최신 CSS 기능이고, 세 가지 전부 있어야만 애니메이션이 켜진다. `mod()`가 Chrome 125부터, `linear()`가 Safari 17.2부터라서 교집합이 저 하한이 된다.

문제는 세상의 브라우저가 저 하한 아래에 아직 많다는 점이다. 이 라이브러리를 쓰고 싶었던 곳이 하필 그런 환경이었다. 업데이트가 멈춘 구형 Android WebView와, iOS 버전에 묶여 따라 올라가지 못하는 구형 Safari에서도 같은 애니메이션을 보여주고 싶었다. 같은 요구는 upstream 이슈 트래커에도 그대로 올라와 있다. iOS 17.2 미만에서 애니메이션이 돌지 않으니 `cubic-bezier()` 폴백이라도 달라는 요청([#131](https://github.com/barvian/number-flow/issues/131))과, 구형 Safari에서 동작하지 않는다는 제보([#164](https://github.com/barvian/number-flow/issues/164))가 열려 있다. 그래서 원본의 API와 시각 결과를 유지한 채 애니메이션 구동부만 교체해 하한을 Chrome 66과 WebKit 16.4(API 기준의 이론 하한은 iOS 13대)까지 내리는 포크 [yceffort/number-flow](https://github.com/yceffort/number-flow)를 만들었다.

이 글은 그 과정의 기록인데, 시간순 일지 대신 **결정 기록** 형식으로 정리해 봤다. 마이그레이션이라는 작업의 실체가 코드 작성보다는 연속된 판단에 가까웠기 때문이다. 내렸던 결정 다섯 개를 순서대로 적고, 뒤집었던 판단 두 가지는 "번복"으로 따로 적는다. 하나는 한 번에 뒤집혔고, 다른 하나는 세 번을 고쳐 쓰고서야 끝났다. 뒤집힌 결정이야말로 처음부터 알았더라면 좋았을 것들이라서다. 결정이라기보다 포기에 가까운 것도 하나 있는데, Safari의 자동 강등 이야기가 그렇다. 판단이 아니라 코드가 궁금한 쪽을 위해, 뒤쪽에 파일별로 무엇을 어떻게 왜 바꿨는지 정리한 변경 지도 절도 두었다.

> 이 글의 코드 인용은 포크 [yceffort/number-flow `578d5f0`](https://github.com/yceffort/number-flow/tree/578d5f0)과 업스트림 [barvian/number-flow `a7b78f5`](https://github.com/barvian/number-flow/tree/a7b78f5)(number-flow 0.6.2) 기준이다. 검증 수치는 저장소 CI와 README에 기록된 것이다.

## 결정 1: 다시 쓰지 않고, 구동부만 갈아 끼운다

처음 원본 코드를 읽고 내린 결론은 "이 라이브러리의 자산은 애니메이션 코드가 아니다"였다. 진짜 자산은 그 아래에 있었다.

- 각 자릿수가 0~9 숫자를 전부 DOM에 가지고 현재 값만 보이게 하는 구조. 애니메이션이 어떻게 되든 접근성 트리와 텍스트는 항상 정확하다.
- `Intl.NumberFormat.formatToParts` 결과에 키를 부여해서, 자릿수·기호의 등장/퇴장/이동을 안정적으로 추적하는 diff 로직.
- 위아래로 스크롤되는 숫자를 자연스럽게 잘라내는 여섯 겹 마스크 그래디언트 CSS.

이 자산들 위에 얹힌 애니메이션 실행부는 생각보다 얇았다. 실제로 `el.animate()`를 호출하는 곳은 [lite.ts](https://github.com/yceffort/number-flow/blob/578d5f0/packages/number-flow/src/lite.ts) 전체에서 일곱 곳뿐이다. 그래서 재작성이 아니라 vendoring을 택했다. 원본 소스를 그대로 가져오고, 일곱 곳의 호출부만 엔진 추상화 한 겹 뒤로 밀었다.

업스트림의 호출이 이런 형태라면:

```ts
// barvian/number-flow a7b78f5, lite.ts, Num.didUpdate
this.el.animate(
  {
    [dxVar]: [`${dx}px`, '0px'],
    [widthDeltaVar]: [dWidth, 0],
  },
  {
    ...this.flow.transformTiming,
    composite: 'accumulate',
  },
)
```

포크에서는 이렇게 바뀐다:

```ts
// yceffort/number-flow 578d5f0, lite.ts, Num.didUpdate
animate(
  this.flow,
  this.el,
  {
    [dxVar]: [`${dx}px`, '0px'],
    [widthDeltaVar]: [dWidth, 0],
  },
  this.flow.transformTiming,
)
```

`animate()`는 네이티브 경로가 가능하면 원본과 동일하게 `el.animate(..., { composite: 'accumulate' })`를 호출하고, 아니면 rAF 기반 폴백 엔진으로 넘긴다. 즉 모던 브라우저에서 이 포크는 원본과 완전히 같은 코드 경로를 탄다. 매 프레임 JS가 개입하지 않는 브라우저 네이티브 애니메이션이라는 성질도 그대로다. 엔진을 강제로 지정하지 않는 한, 폴백 엔진이 개입하는 것은 원본이 애니메이션을 포기하는 브라우저뿐이다.

vendoring의 부수 효과로 diff의 성격이 명확해졌다. 실제로 지금 두 저장소를 비교해 보면 `formatter.ts`와 util 파일들은 포매팅 차이를 빼고 의미상 100% 동일하고, 실질 변경은 `lite.ts`, `styles.ts`, `ssr.ts` 정도에 집중되어 있다. "무엇을 바꿨는가"가 diff로 증명되는 상태를 유지하는 것이 포크의 신뢰성에서 중요하다고 생각했다.

한 가지 덧붙이면, git fork 버튼 대신 새 저장소로 시작했다. 인프라를 통째로 바꾸고 싶었기 때문인데(pnpm 모노레포, oxlint/oxfmt, Vue/Svelte 래퍼와 문서 사이트 제거), 대신 커스텀 엘리먼트 이름을 `number-flow-yceffort-react`로 분리해서 마이그레이션 기간에 원본 `@number-flow/react`와 한 페이지에 공존할 수 있게 해 뒀다. 패키지도 alias로 코드 수정 없이 교체된다:

```json
"dependencies": {
  "@number-flow/react": "npm:@yceffort/number-flow-react@^0.1.0"
}
```

## 결정 2: 기능 감지의 질문을 바꾼다

업스트림의 애니메이션 게이트는 한 줄이다.

```ts
// barvian/number-flow a7b78f5, lite.ts
export const canAnimate = supportsMod && supportsLinear && supportsAtProperty
```

세 가지 CSS 기능이 전부 있는가. 이 질문에 대한 답이 곧 "애니메이션을 켤 것인가"였다. 포크에서 이 줄은 다음과 같이 바뀐다.

```ts
// yceffort/number-flow 578d5f0, lite.ts
// The rAF fallback engine only needs rAF itself; browsers that additionally
// support linear() + mod()/round() + @property get the original native path:
export const canAnimate =
  BROWSER && typeof requestAnimationFrame !== 'undefined'
```

세 기능의 감지 결과는 버려지지 않는다. [engine/index.ts](https://github.com/yceffort/number-flow/blob/578d5f0/packages/number-flow/src/engine/index.ts)의 `supportsNativeAnimations`로 이름이 바뀌어, "애니메이션이 되는가"가 아니라 "어느 엔진으로 돌릴 것인가"라는 질문에 답하게 된다. 같은 감지 코드의 역할이 게이트에서 라우터로 바뀐 셈이다.

여기에 테스트를 위한 수동 오버라이드를 추가했다. 모던 브라우저에서 폴백 엔진을 강제로 돌려볼 수단이 없으면 폴백 코드는 사실상 테스트 불가능한 죽은 경로가 되기 때문이다.

```ts
export type EngineMode = 'auto' | 'native' | 'raf'

export const setEngineMode = (m: EngineMode) => {
  mode = m
}
```

이 API는 나중에 예상하지 못한 두 번째 용도를 얻게 되는데, 그 이야기는 Safari 절에서 다시 나온다.

## 결정 3: composite: 'accumulate'를 시맨틱째 옮긴다

폴백 엔진을 설계할 때 가장 오래 고민한 지점이다. "구형 브라우저에서 rAF로 값을 트윈(tween, 매 프레임 중간값을 계산해 값을 옮기는 것)한다"까지는 누구나 떠올릴 수 있는데, 그 트윈이 **원본과 같은 시맨틱**이어야 한다는 조건이 문제를 어렵게 만든다.

number-flow의 애니메이션은 전부 `composite: 'accumulate'`로 실행된다. 각 애니메이션은 "현재 델타에서 0으로" 수렴하고, 같은 속성에 여러 애니메이션이 겹치면 브라우저가 그 기여분을 합산한다. 이 구조 덕에 숫자가 굴러가는 도중 새 값이 들어와도 애니메이션이 뚝 끊기지 않는다. 기존 애니메이션은 하던 감속을 계속하고, 새 델타만큼의 애니메이션이 하나 더 얹힐 뿐이다.

폴백을 "새 값이 오면 기존 트윈을 취소하고 새 트윈을 시작"으로 단순하게 만들면 이 시맨틱이 깨진다. 취소 시점의 위치에서 다시 시작하니 값 자체는 이어지지만, 감속하던 속도가 새 곡선의 가파른 초입으로 불연속하게 튀어서 연타할 때마다 미세하게 덜컥거린다. 원본과 비교 데모를 나란히 놓으면 바로 보이는 차이다.

그래서 엔진을 (요소, 속성) 채널 단위로 만들고, 채널이 활성 트윈들의 기여를 매 프레임 합산하게 했다.

```ts
// engine/index.ts
class Channel {
  readonly anims = new Set<JSAnimation>()

  apply(now: number) {
    let total = 0
    this.anims.forEach((anim) => {
      total += anim.valueAt(now)
      if (anim.done) this.anims.delete(anim)
    })
    this.applier(this.el, total, this.anims.size === 0)
    if (this.anims.size === 0) activeChannels.delete(this)
  }
}
```

각 트윈의 `valueAt`은 WAAPI와 같은 "델타에서 0으로"의 형태를 유지한다.

```ts
valueAt(now: number): number {
  if (this.done) return 0
  const t = (now - this._start) / this._duration
  if (t < 0) return 0
  if (t >= 1) {
    this._finish()
    return 0
  }
  return this._from * (1 - this._ease(t))
}
```

루프에는 rAF 외에 34ms짜리 `setTimeout` 백스톱을 겹쳐 뒀다.

```ts
const ensureLoop = () => {
  rafId ??= requestAnimationFrame(tick)
  // rAF can be throttled or entirely absent (hidden pages, some old WebViews,
  // headless virtual time); a timer backstop keeps animations progressing:
  backstopId ??= setTimeout(tick, 34)
}
```

백그라운드 탭이나 일부 WebView에서 rAF는 심하게 스로틀되거나 아예 멈춘다. 퇴장 중이던 문자의 정리가 그 상태에서 멎으면 이전 값과 새 값이 겹쳐 보이는 상태로 방치될 수 있는데, 원본에도 같은 계열의 문제가 [이슈 #148](https://github.com/barvian/number-flow/issues/148)로 보고되어 있다(Android WebView에서 간헐적으로만 재현되어 원인은 아직 특정되지 않은 open 이슈다). 타이머는 rAF가 정상일 때는 매 프레임 취소되므로 비용이 없고, rAF가 멎었을 때만 진행을 이어받는다.

물론 백그라운드에서는 `setTimeout` 자체도 초 단위로, 오래 방치되면 분 단위까지 스로틀된다. 34ms가 지켜질 리 없다는 반론이 바로 나올 텐데, 그래도 목적에는 충분하다. 이 타이머가 보장하려는 것은 프레임 유지가 아니라 종결이기 때문이다. 트윈은 경과 시간 기준으로 계산되므로, 몇 초 만에 깨어난 tick 한 번이면 곧장 종료 상태로 건너뛰어 정리까지 끝난다.

## 결정 4: easing은 근사하지 않고 파싱한다

number-flow의 스프링 감속은 CSS `linear()` 함수에 90개의 샘플 포인트를 넣은 문자열로 정의되어 있다.

```ts
// lite.ts, 기본 spinTiming (중략)
easing: `linear(0,.005,.019,.039,.066,.096,.129,.165, ..., .9988,.9989,1)`,
```

폴백에서 이걸 어떻게 처리할지 선택지가 몇 개 있었다. 가장 쉬운 길은 "비슷한 느낌의 ease-out을 하드코딩"하는 것이고, 다음은 "기본 easing일 때만 미리 구운 커브를 쓰는 것"이다. 둘 다 버렸다. 이 포크의 검증 방식이 원본과 나란히 놓고 비교하는 데모였기 때문에, 곡선이 다르면 그 자체가 실패다. 그리고 `spinTiming` 등은 공개 API라 사용자가 임의의 easing 문자열을 넣을 수 있는데, 기본값만 특별 취급하면 API 호환을 주장할 수 없게 된다.

서론에서 언급한 upstream [#131](https://github.com/barvian/number-flow/issues/131)의 제보자도 `cubic-bezier()` 폴백이라도 달라고 요청하고 있었는데, 근사를 버린 덕에 이 포크의 답은 그 요청보다 한 걸음 더 간 형태가 됐다. 비슷한 곡선으로의 폴백이 아니라 같은 곡선이기 때문이다.

그래서 [engine/easing.ts](https://github.com/yceffort/number-flow/blob/578d5f0/packages/number-flow/src/engine/easing.ts)에 CSS easing 문자열의 파서를 만들었다.

- `linear(...)`: CSS 스펙대로 파싱한다. 퍼센트 위치 지정, 위치 생략 시 균등 배분, 단조 증가 강제까지 포함해서다. 재생 시에는 이진 탐색으로 구간을 찾아 선형 보간하는데, `linear()`는 스펙 자체가 stop 사이를 선형 보간하는 함수라서 이 재생은 근사가 아니라 부동소수점 오차 수준에서 동일한 곡선이다.
- `cubic-bezier(...)`: 표준 bezier-easing 알고리즘(Newton-Raphson, 수렴 실패 시 이분법)으로 구현했다.
- `steps(...)`: `jump-start`/`jump-end`/`jump-none`/`jump-both` 네 위치를 모두 지원한다.
- 키워드(`ease`, `ease-in-out` 등)는 대응하는 cubic-bezier로 치환한다.

파서를 스펙대로 쓰다 보면 스펙의 유효성 규칙도 따라와야 한다는 것을 리뷰 과정에서 배웠다. 예를 들어 `steps(1, jump-none)`은 CSS 스펙상 유효하지 않은 조합인데, 순진하게 계산하면 `step / (count - 1)`이 0으로 나누기가 되어 인라인 스타일에 `NaN`이 적히게 된다. 브라우저라면 파싱 단계에서 거부했을 입력이, JS 포팅에서는 명시적으로 거부하지 않으면 조용히 통과해 버린다.

## 결정 5: CSS 수식을 JS로 옮기되, 스타일시트가 소비하게 한다

자릿수 스핀의 핵심은 원본 스타일시트의 `mod()`/`round()` 수식이다. 각 숫자(`.digit__num`)가 현재 값과 자기 인덱스의 거리를 계산해 `--y`(translateY 퍼센트)를 얻는다. 구형 브라우저에는 `mod()`가 없으므로 이 수식을 JS로 포팅했다.

```ts
// engine/index.ts
const cssMod = (a: number, m: number) => ((a % m) + m) % m

// JS port of the .digit__num CSS formula from styles.ts (mod()/round() math):
export const digitYPercent = (c: number, length: number, n: number): number => {
  const raw = cssMod(length + n - cssMod(c, length), length)
  const offset = raw - length * Math.floor(raw / (length / 2))
  return clamp(-1, offset, 1) * 100
}
```

여기서 중요한 설계 원칙 하나를 지키려고 했다. 폴백 엔진은 **원본 스타일시트가 소비하는 값을 인라인으로 기록할 뿐**, 스타일시트 자체를 폴백용으로 갈라내지 않는다. `--_number-flow-dx`, `--scale-x`, `--y` 같은 커스텀 프로퍼티를 매 프레임 써 주면 나머지는 원본 CSS가 알아서 처리한다. 스타일시트가 두 벌이 되는 순간 시각적 동등성을 검증할 방법이 사라진다고 봤기 때문이다.

다만 애니메이션 밖에서도 `round()`를 쓰는 마스크·패딩 스타일은 어쩔 수 없이 이중 선언이 필요했고, 여기서 CSS의 오래된 함정을 하나 밟았다. `@supports`로 분기하면 되겠거니 했는데, 프로브에 `var()`가 들어가면 구형 브라우저에서 분기가 무의미해진다. [styles.ts](https://github.com/yceffort/number-flow/blob/578d5f0/packages/number-flow/src/styles.ts)의 주석에 남긴 그대로다: 값에 `var()`가 있으면 구형 브라우저가 파싱 단계에서 선언을 거부하지 못하고, 캐스케이드에서는 이긴 다음, computed-value 단계에서 무효가 되어 속성이 통째로 날아간다. 그래서 `@supports (padding: round(nearest, 0.125em, 1px))`처럼 프로브는 반드시 `var()` 없는 리터럴로 써야 했다.

## 검증: 지원 범위는 주장하지 않고 실행해서 증명한다

여기까지의 결정들은 전부 "구형 브라우저에서 돌아간다"는 주장을 만들기 위한 것인데, 이 주장은 성격상 최신 브라우저에서 아무리 테스트해도 증명되지 않는다. 폴백 경로를 `setEngineMode('raf')`로 강제해서 최신 Chrome에서 돌리는 것과, 진짜 Chrome 66에서 돌리는 것은 다른 일이다. 진짜 구형 브라우저에는 폴백 엔진이 우회하려는 기능만 없는 게 아니라, 폴백 엔진 자신이 쓰는 API가 없을 수도 있다.

그래서 검증을 세 겹으로 만들었다.

1. **선언**: `.browserslistrc`에 지원 하한(Chrome 66+, Safari/iOS 13+, Firefox 78+, Edge 79+)을 못 박는다.
2. **정적 검사**: CI에서 `eslint-plugin-compat`이 소스가 하한에서 없는 API를 쓰면 실패시킨다.
3. **실행**: 실제 구형 브라우저 바이너리로 selftest를 돌린다.

먼저 인정할 것이 있다. 세 겹이 커버하는 범위는 같지 않다. 실행 증명이 닿는 곳은 Chromium 66+와 WebKit 16.4+까지다. 선언된 하한 중 iOS 13에서 16.3까지의 구간과 Firefox 78+는 정적 검사만 통과한, 이 절의 기준으로는 아직 "주장"이다. Safari 16.0에서 16.3까지의 WebKit 빌드는 현재 macOS에서 실행조차 안 되고, 구형 Firefox는 러너를 만들지 않았다. 그 구간의 하한은 API 표면의 정적 분석이 유일한 근거라는 것을 못 박아 둔다.

세 번째가 핵심이다. `demo/selftest.html`은 브라우저 안에서 스스로 다섯 가지 시나리오(스핀+폭 변화, 인터럽트 연타, 부호 크로스페이드, 실시간 티커, 종료 후 정리 상태)를 실행하고 44건의 assert 결과를 보고하는 페이지다. 이걸 Chromium 스냅샷 저장소에서 받은 실제 구버전 바이너리와, Playwright가 릴리스별로 고정해 둔 구버전 WebKit으로 실행한다. 매 커밋 도는 CI가 커버하는 것은 Chromium 66/80/114와 WebKit 16.4/17.4/18.2이고, 여덟 개 마일스톤(66/71/75/80/87/92/100/114) 전체 매트릭스는 로컬 러너로 확인한 결과다.

| 환경                                | 원본의 동작                          | 포크의 결과                             |
| ----------------------------------- | ------------------------------------ | --------------------------------------- |
| Chromium 66~114 (실바이너리 8종)    | 애니메이션 꺼짐                      | rAF 폴백 자동 선택, 44건 PASS           |
| WebKit 16.4 (Safari 16.4 상당)      | 애니메이션 꺼짐                      | rAF 폴백 자동 선택, PASS                |
| WebKit 17.4 / 18.2                  | 네이티브 (일부 실패, 아래 Safari 절) | 원본과 동일 실패, rAF 강제 시 전건 PASS |
| 최신 Chromium / Firefox / WebKit 26 | 네이티브                             | 네이티브·rAF 강제 모두 PASS             |
| Next.js 16 (React 19) SSR           | -                                    | 서버 마크업 + hydration 스모크 PASS     |

구형 Chromium을 CI에서 돌리는 데는 잔재주가 좀 필요했다. 오래된 바이너리는 최신 CDP 클라이언트와 호환이 안 되어 Playwright로 못 붙인다. 대신 `--headless --dump-dom`으로 selftest 페이지를 직접 실행하는데, 페이지가 `load` 이벤트를 검증이 끝날 때까지 지연시켰다가 완료 시점에 풀어 주면 그 순간 DOM 덤프가 트리거된다. 덤프된 DOM에서 결과를 수확하는 방식이다.

## 번복 1: "다 쓴 인라인 스타일은 지운다"는 틀렸다

여기부터는 뒤집은 판단들이다.

폴백 엔진은 매 프레임 인라인 스타일을 쓰니까, 애니메이션이 끝나면 지워서 스타일시트에 제어권을 돌려주는 게 당연한 위생이라고 생각했다. 실제로 그렇게 [고쳤다](https://github.com/yceffort/number-flow/commit/7bde206). rest 상태가 된 채널은 인라인 `--y`를 지운다.

그리고 며칠 뒤 이 결정을 [뒤집었다](https://github.com/yceffort/number-flow/commit/6be954f). 원인은 소유권과 타이밍의 불일치였다.

- 각 자릿수의 스핀은 **자릿수마다 다른 시점**에 끝난다. 1의 자리가 아직 도는 동안 100의 자리는 이미 멎어 있을 수 있다.
- 그런데 0~9 숫자 전체를 보이게 하는 `is-spinning` 클래스는 자릿수 단위가 아니라 **flow 전체**의 `animationsfinish` 시점에 제거된다.
- 먼저 멎은 자릿수의 인라인 `--y`를 그 자리에서 지우면, `mod()`가 없는 브라우저에서 스타일시트는 `--y`를 계산할 방법이 없다. 결과적으로 `is-spinning`이 아직 살아 있는 동안 그 자릿수의 숨어 있어야 할 숫자들이 그대로 노출된다.

수정은 "트윈이 끝난 채널도 flow가 다 멎을 때까지 resting 값을 인라인으로 유지하고, 정리는 flow 전체가 rest에 도달한 뒤 `Digit`이 한다"로 바뀌었다. 인라인 스타일을 지우는 코드 한 줄의 문제가 아니라, "이 값을 언제 누가 지우는가"라는 소유권 설계의 문제였다. 정리 코드는 쓰는 쪽이 아니라 수명을 아는 쪽에 두어야 한다는 것을 이 버그로 다시 배웠다.

## 번복 2: @property 감지는 세 번 고쳐 썼다

`@property` 지원 감지는 처음엔 업스트림과 같은 구조였다. 네 개의 커스텀 프로퍼티를 하나의 try 블록에서 `CSS.registerProperty`로 등록하고, throw하면 미지원으로 본다.

첫 번째 문제: 같은 라이브러리가 한 페이지에 두 카피 뜨면(마이크로 프론트엔드, 또는 원본과의 공존 시나리오. 결정 1에서 일부러 만든 상황이기도 하다) 두 번째 카피의 등록이 `InvalidModificationError`로 throw한다. 이건 "미지원"이 아니라 "이름 선점"인데, 배치 try/catch는 이 둘을 구분하지 못하고 지원되는 브라우저를 rAF로 강등시킨다. 그래서 [개별 등록으로 분해하고](https://github.com/yceffort/number-flow/commit/42182e1) `InvalidModificationError`는 지원으로 간주하게 고쳤다.

두 번째 문제: 리뷰 중에 이 판단도 안일하다는 걸 알게 됐다. `InvalidModificationError`는 이름이 선점됐다는 사실만 알려줄 뿐, **어떤 서술자로** 등록됐는지는 알려주지 않는다. 이게 왜 중요하냐면, 자릿수 스핀 수식은 `--_number-flow-d`가 `inherits: true`로 등록되어 부모의 애니메이션 값이 자식 `.digit__num`에게 상속되는 구조에 의존한다. 다른 코드가 같은 이름을 `inherits: false`로 선점해 두었다면, 등록은 "성공한 셈"이지만 애니메이션은 조용히 깨진다.

그래서 [세 번째 버전](https://github.com/yceffort/number-flow/commit/8f2bebd)은 선점된 등록의 실제 동작을 DOM으로 검사한다. 부모/자식 div를 만들어 프로브 값을 넣고, `getComputedStyle`로 syntax가 우리 값을 받아들이는지, 상속이 우리 기대와 같은지 확인한 뒤에만 지원으로 판정한다.

```ts
// styles.ts
const ok =
  // A different syntax would reject our probe value and compute to its
  // own initial value instead:
  getComputedStyle(parent).getPropertyValue(name) === probe &&
  getComputedStyle(child).getPropertyValue(name) ===
    (inherits ? probe : initialValue)
```

마지막에 사소해 보이지만 같은 계열의 함정이 하나 더 있었다. 네 개의 등록 결과를 `every()`로 판정하면 단락 평가 때문에 첫 실패 이후의 프로퍼티들이 등록조차 안 된 채 남는다. 그래서 `.map(registerProperty).every(Boolean)`으로, 전부 시도한 뒤에 판정하도록 순서를 강제했다.

## 자동 강등을 포기한 이유: Safari 17.4~18.x

포크 작업 중 가장 이상한 버그는 폴백 쪽이 아니라 네이티브 경로에서 나왔다. WebKit 17.4/18.2에서 selftest를 돌리면 44건 중 폭 스케일(그리고 macOS 빌드에서는 등장 페이드인까지)만 반복적으로 실패했다. 처음엔 당연히 포크가 만든 회귀를 의심했는데, 같은 시나리오를 원본 number-flow로 돌려도 똑같이 실패했다. 포크의 버그가 아니라 원본도 함께 걸려 있는 WebKit 버그였다.

증상을 좁혀 보면 이렇다. 같은 shadow root 안에서 애니메이션이 3개 이상 동시에 돌 때, WebKit은 등록된 커스텀 프로퍼티의 **애니메이션 중인 값**을 같은 요소의 다른 속성 `var()` 치환에 반영하지 않는다. `--scale-x: calc(1 + var(--_number-flow-d-width) / var(--width))`에서 델타가 항상 0으로 치환되어 폭 스케일 트윈이 사라지는 식이다. 자릿수 스핀은 `inherits: true`로 등록된 프로퍼티를 **자식 요소**가 소비하는 구조라서 이 버그를 우연히 비껴간다. 애니메이션 3개는 실제 숫자 업데이트라면 무조건 넘는 수치라, 해당 버전에서는 사실상 상시 발생한다.

이 버그의 고약한 부분은 관측이 안 된다는 점이다. `getComputedStyle`은 애니메이션 값이 정상 반영된 것처럼 보고하는데, 실제 스타일 해석에는 정적 선언값이 쓰인다. 처음에 "감지해서 자동으로 rAF 엔진으로 강등하면 되겠다"고 생각하고 프로브를 몇 가지 만들어 봤는데 전부 실패했다. `Animation.currentTime`을 직접 설정해 애니메이션 중간 상태를 만들면 스타일이 정상적으로 계산되어 버그가 재현되지 않는다. 재현에는 실시간으로 진행 중인 애니메이션 3개가 필요한데, 그걸 동기적 기능 감지로 만들 방법을 찾지 못했다.

그래서 자동 강등을 포기했다. 대신 세 가지를 남겼다.

1. **문서화**: README에 영향 범위(Safari 17.4~18.x, WebKit 26에서 해소), 실패하는 효과 두 개, 값·레이아웃·접근성은 정상이라는 것을 명시했다.
2. **탈출구**: 이 두 효과가 네이티브 경로보다 중요하다면 `setEngineMode('raf')`로 폴백 엔진을 명시 선택할 수 있다. 폴백은 모든 WebKit 버전에서 두 효과 모두 정상이다. 테스트용으로 만들었던 API가 여기서 두 번째 용도를 얻었다.
3. **회귀 감시**: CI의 WebKit 잡은 이 실패들을 "알려진 실패 목록"으로 관리한다. 목록에 있는 항목만 실패하면 통과하고, 그 외 실패는 진짜 회귀로 잡아낸다. 반대로 어떤 WebKit 빌드가 이 항목들을 통과하기 시작하면 러너가 목록을 줄이라고 알려 준다.

숙제도 하나 남아 있다. 이 버그의 근거는 아직 이 저장소 안에만 있다. 같은 시나리오에서 원본도 동일하게 실패한다는 교차 확인까지는 했지만, 라이브러리와 무관한 최소 재현을 만들어 WebKit Bugzilla에 보고하는 데까지는 이르지 못했다. 재현 조건인 "실시간으로 진행 중인 동시 애니메이션 3개"를 독립 페이지로 옮기는 일이 남아 있고, 그 전까지 이 절의 주장은 selftest 결과 이상의 외부 근거를 갖지 못한다.

우아한 강등이 항상 가능한 것은 아니고, 불가능하다는 사실을 확인했다면 그 확인 과정 자체를 문서와 CI에 남기는 것이 차선이라고 생각한다. 참고로 이 실패 중 등장 페이드인은 macOS WebKit 빌드에서만 재현되고 CI가 도는 Linux 빌드에서는 재현되지 않았다. "같은 버전의 WebKit"이라는 말이 빌드에 따라 다른 것을 의미할 수 있다는 것도 이번에 처음 겪었다.

## 변경 지도: 어디를 어떻게 왜 바꿨나

여기까지가 판단의 기록이라면, 이 절은 그 판단들이 실제로 코드 어디에 내려앉았는지의 목록이다. 업스트림 대비 의미 있는 diff가 있는 파일은 여섯 개이고, 새로 만든 것은 엔진 두 파일과 테스트다. 전체를 표로 먼저 훑고, 파일별로 항목을 짚는다.

| 파일                   | 주된 변경                                              | 이유                        |
| ---------------------- | ------------------------------------------------------ | --------------------------- |
| `lite.ts`              | 애니메이션 호출 7곳의 엔진 경유, 종료·대기 경로 이원화 | 구동부 교체의 본체          |
| `styles.ts`            | `@property` 감지 재작성, `round()` 이중 선언           | 기능 감지 오판 방지         |
| `ssr.ts`               | HTML/CSS 이스케이프, 폴백 스타일 이중화                | 서버 출력의 안전성          |
| `index.ts`, `group.ts` | 포매터 메모 키 직렬화, `queueMicrotask` 폴리필         | 재생성 비용, Chrome 71 미만 |
| `react/*`              | 엘리먼트 네임스페이스 분리, 캐시 상한                  | 원본과의 공존, 메모리       |
| `engine/*` (신규)      | rAF 엔진, easing 파서                                  | 폴백 경로의 본체            |

`formatter.ts`와 util 파일들은 포매팅 차이를 빼면 업스트림과 의미상 동일하다. 바꾸지 않은 것을 바꾸지 않았다고 말할 수 있는 상태가 vendoring의 이점이라서, 이 목록도 그 기준으로 관리하고 있다.

### lite.ts: 구동부 교체의 본체

- **애니메이션 시작 7곳의 엔진 경유(결정 1)와 `canAnimate` 재정의(결정 2)의 실체가 이 파일이다.** 앞에서 다뤘으므로 위치만 적으면, 7곳은 `Num`(폭 변화), `Section`/`Sym`/`Digit`(가로 이동), `Digit`(자릿수 스핀), `AnimatePresence`(등장/퇴장 페이드 두 곳)이고, `composite: 'accumulate'` 지정은 엔진 내부로 이동했다.
- **애니메이션 강제 종료와 완료 대기가 엔진별로 갈라졌다.** 원본은 `shadowRoot.getAnimations()`로 애니메이션을 열거해서 `finish()`하거나 `finished`를 기다리는데, rAF 엔진의 트윈은 WAAPI 목록에 잡히지 않는다. 그래서 `usesNativeEngine()`에 따라 원본 코드 또는 엔진의 `finishAll()`/`finishedOf()`로 분기한다. 이때 애니메이션 없이 끝나는 업데이트 경로에도 종료 처리를 넣었는데, 이유는 주석에 남긴 그대로다.

```ts
// lite.ts, didUpdate
if (!this.computedAnimated || !this._preUpdated) {
  // A non-animated update landing mid-flight (hidden tab, reduced
  // motion, invisible element) must not leave the old tweens running:
  // they'd keep deriving offsets from the already-updated --current:
  if (usesNativeEngine())
    this.shadowRoot?.getAnimations().forEach((a) => a.finish())
  else finishAll(this)
  return
}
```

숨은 탭이나 reduced motion 상태에서 값이 갱신되면 애니메이션 없이 DOM만 바뀌는데, 이때 날아가던 트윈을 그대로 두면 이미 갱신된 `--current` 위에 이전 델타를 계속 얹어서 숫자가 어긋난 위치에 그려진다.

- **`Num` 생성자가 rAF 모드에서 초기값을 인라인으로 심는다.** `--scale-x: 1`, `--_number-flow-dx: 0px`. rAF 엔진은 폭 델타 변수를 애니메이션하는 대신 `--scale-x`를 계산 완료된 숫자로 직접 쓰는데(구형 브라우저는 `var()`가 `calc()`로 치환된 값으로 나누는 연산을 소화하지 못한다), 그러려면 애니메이션이 없는 평상시에도 나눗셈의 기준이 될 안정된 값이 있어야 한다.
- **접근성 폴백.** Chrome 77~80은 `ElementInternals`는 있지만 ARIAMixin이 없어서 `internals.ariaLabel = ...` 대입이 조용히 무시된다. `'ariaLabel' in internals`로 감지해서 없으면 `setAttribute('aria-label', ...)`로 폴백한다. "구형 브라우저 지원"을 표방하는 순간, 이런 조용한 무시들이 전부 지원 범위의 책임이 된다.
- **React 19의 이중 마운트 리플로우 차단은 업스트림에서 물려받은 것이다.** React 19는 커밋 중에 커스텀 엘리먼트의 `data` 프로퍼티를 설정하고, 래퍼의 `componentDidMount`가 같은 객체를 한 번 더 설정하는데, 동일성 검사가 없으면 두 번째 설정이 업데이트 경로를 타서 마운트마다 모든 섹션과 자릿수를 재측정하며 동기 리플로우를 강제한다([이슈 #195](https://github.com/barvian/number-flow/issues/195)). 이 검사는 vendoring한 시점의 업스트림에 이미 들어 있었고(upstream PR #196), 포크는 유지만 했다. 포크의 개선이 아니므로 성격을 분리해 적어 둔다.
- **백그라운드 탭 애니메이션 누수 가드도 마찬가지로 업스트림의 것이다.** 숨은 탭에서는 WAAPI 애니메이션이 pending인 채 쌓여서, 초 단위로 값이 갱신되는 페이지를 오래 백그라운드에 두면 메모리가 기가바이트 단위로 새는 문제가 보고되어 있었다([이슈 #165](https://github.com/barvian/number-flow/issues/165)). 이를 막는 `visibilityState === 'visible'` 게이트 역시 업스트림에 이미 있었고 포크는 물려받았다. 포크 고유의 기여는 rAF 폴백 경로에 한정된다: 그쪽에서는 백스톱 타이머가 백그라운드에서도 트윈을 끝까지 진행시키므로, pending이 쌓일 자리 자체가 없다.
- **섹션 diff의 제거 감지를 O(n²)에서 O(n)으로.** 기존 자식마다 새 파트 배열을 선형 탐색(`parts.find(...)`)하던 것을, 키 `Set`을 한 번 만들어 `has()`로 조회하게 바꿨다. 자릿수가 많은 숫자에서 업데이트마다 반복되는 경로라서다.

### styles.ts: 기능 감지와 폴백 스타일

- **`@property` 감지가 배치 등록에서 개별 등록 + DOM 프로브로 바뀌었다.** 번복 2에서 다룬 3단 진화의 결과물이다. 등록 결과 판정도 `.map(registerProperty).every(Boolean)` 순서로 강제해서, `every()`의 단락 평가가 나머지 프로퍼티를 미등록 상태로 남기지 않게 했다.
- **`round()` 의존 스타일이 이중 선언되었다.** 마스크 높이·패딩처럼 애니메이션 밖에서 `round()`를 쓰는 값들은 먼저 `round()` 없는 폴백 값으로 선언하고, `var()` 없는 리터럴 프로브의 `@supports` 블록 안에서 `round()` 버전으로 덮는다. 결정 5에서 다룬 함정의 대응이다.

### ssr.ts: 서버 출력의 안전성

- **HTML 이스케이프 추가.** SSR 렌더러의 출력은 `dangerouslySetInnerHTML`로 주입되는데, `prefix`/`suffix` 같은 호출자 데이터가 이스케이프 없이 텍스트와 `aria-label` 속성으로 들어가고 있었다. `&`, `<`, `"` 계열의 이스케이프를 넣었다.
- **CSS 셀렉터 이스케이프 추가.** 커스텀 엘리먼트 이름을 만드는 `elementSuffix`가 폴백 스타일의 셀렉터에 그대로 들어간다. 서버에는 `CSS.escape`가 없어서 ident-unsafe 문자를 hex 이스케이프하는 구현을 직접 넣었다. 입력을 거부하는 대신 이스케이프를 택한 것은, 커스텀 엘리먼트 이름 규칙상 밑줄이나 비ASCII 문자가 합법이기 때문이다.
- **폴백 스타일에도 `@supports` 이중 선언 적용.** SSR이 그리는 정적 폴백 `<span>`의 스타일도 본체와 같은 `round()` 이중화를 따른다.

### index.ts, group.ts: 작은 호환 수리

- **포매터 메모 키를 참조 비교에서 직렬화 비교로.** 원본은 format 옵션 객체를 참조 동일성으로 비교하는데("Might want to do a deep-equal check here"라는 주석이 남아 있다), 호출부에서 매 렌더 새 객체 리터럴을 넘기는 흔한 패턴에서는 렌더마다 `Intl.NumberFormat`을 새로 만들게 된다. `JSON.stringify` 비교로 바꾸면서 locale은 `Intl.getCanonicalLocales`로 먼저 정규화했다. `Intl.Locale` 인스턴스는 own enumerable 속성이 없어서 그냥 stringify하면 전부 `{}`로 뭉개지기 때문이다.
- **`queueMicrotask` 폴리필.** Chrome 71 미만 WebView에는 `queueMicrotask`가 없다. `Promise.resolve().then(cb)`로 대체하는 세 줄이다.

### packages/react: 공존과 상한

- **커스텀 엘리먼트 네임스페이스 분리.** `number-flow-react` 대신 `number-flow-yceffort-react`로 등록한다. 결정 1에서 언급한 대로, 마이그레이션 기간에 원본 패키지와 한 페이지에 떠도 커스텀 엘리먼트 등록이 충돌하지 않게 하기 위해서다.
- **포매터 캐시에 64개 상한.** 원본의 무한 성장하는 `Record` 캐시를 `Map` 기반으로 바꿨다. 여기도 두 단계 수정이 있었는데, 처음엔 가득 차면 전체를 비우게 했다가 문제를 발견했다. 매번 새 옵션 객체를 만들어내는 호출자가 상한에 도달하는 순간부터 캐시 전체를 반복적으로 전멸시켜서(자주 쓰는 항목까지 같이 날아간다) 적중률이 사실상 0%로 떨어진다. [가장 오래된 항목 하나만 밀어내는 방식](https://github.com/yceffort/number-flow/commit/f02f1e7)으로 고쳤고, engine의 easing 파서 캐시(역시 상한 64개)도 같은 정책을 따른다.
- **`usePrefersReducedMotion`의 null 안전화.** `matchMedia`가 없는 환경에서 getSnapshot이 throw하지 않게 `?.matches ?? false`로 바꿨다.

### 새로 만든 것, 덜어낸 것

- **신규**: [engine/index.ts](https://github.com/yceffort/number-flow/blob/578d5f0/packages/number-flow/src/engine/index.ts)(rAF 엔진)와 [engine/easing.ts](https://github.com/yceffort/number-flow/blob/578d5f0/packages/number-flow/src/engine/easing.ts)(easing 파서)가 폴백의 본체다. 그 외에 easing 파서·mod 수식·가산 합성을 검증하는 유닛 테스트, 브라우저 안에서 스스로 검증하는 selftest 데모, 구형 브라우저 러너 스크립트가 새로 들어갔다. 업스트림은 Playwright 기반 앱 테스트 중심이라 이 계층의 유닛 테스트가 없었는데, CSS 수식을 JS로 포팅한 이상 그 포팅의 정확성은 유닛 레벨에서 고정해 둘 필요가 있었다.
- **제거**: Vue/Svelte 래퍼, 문서 사이트, 업스트림의 e2e 테스트 앱 인프라. 코어가 동일하므로 래퍼는 필요해지면 원본을 참고해 추가할 수 있다고 보고, 유지 범위를 줄이는 쪽을 택했다.

## 남겨둔 것들

정직하게 적어 두면, 이 포크에도 명확한 한계가 있다.

- 폴백 엔진은 메인 스레드에서 돈다. 다만 이 비용의 실체는 부풀리지 않고 적는 게 정확할 것 같다. 매 프레임 하는 일은 트윈 몇 개의 산술 합산과 인라인 커스텀 프로퍼티 몇 개의 기록, 그리고 그로 인한 작은 shadow root 서브트리의 스타일 재계산이 전부다. transform과 opacity만 건드리므로 레이아웃은 일어나지 않고, WAAPI 이전 시대의 JS 애니메이션 라이브러리들이 바로 이런 기기에서 오래 쓰던 것과 같은 모델이다. 원본의 네이티브 경로도 커스텀 프로퍼티 애니메이션은 compositable하지 않아 매 프레임 메인 스레드 스타일 재계산을 거치는 것은 같으므로, 폴백이 얹는 추가분은 JS 틱 비용이지 새로운 종류의 일이 아니다. 그래도 이 비용이 청구되는 기기가 정의상 구형이라는 구조는 남는다. 카운터 하나면 무시할 수준이겠지만 flow 수십 개가 동시에 도는 티커 류에서는 차이가 실제가 될 수 있고, 이 글의 검증은 전부 동작 검증이지 성능 실측이 아니라서 그 경계가 어디인지는 측정하지 않았다. 방금 문장들도 구조에서 따라 나온 추정이지 수치를 가진 주장은 아니다.
- 폴백의 `EffectTiming`은 `duration`/`delay`/`easing`만 해석하고 `iterations` 같은 옵션은 무시한다.
- `mix-blend-mode: plus-lighter`가 없는 브라우저에서 ± 기호 크로스페이드는 일반 페이드로 소폭 열화된다.
- Vue/Svelte 래퍼는 포팅하지 않았다.
- 하한 아래(Chrome 66 미만)에는 우아한 강등이 없다. Chrome 64~65는 `AbortController`가 없어 애니메이션 업데이트가 throw한다. 하한을 내리는 작업의 아이러니인데, 하한을 어디까지 내리든 그 바로 아래에서의 동작을 정의해야 하는 것은 똑같았다. 지원 범위 안에서는 "정적이지만 정확한 렌더링"으로 열화된다는 것, 하한 밖에서는 예외가 난다는 것을 문서에 못 박는 것으로 정리했다. 개인적으로는, Chrome 66과 Safari 13을 쓰는 사람이 이제는 없기를 바랄 뿐이다.

## 배운 것들

본문에 흩어져 있는 교훈들을 한 줄씩으로 추려서 남겨 둔다. 대부분은 이 포크가 아니어도 적용되는 이야기라고 생각한다.

- 정리 코드는 값을 쓰는 쪽이 아니라 수명을 아는 쪽에 둔다. 번복 1의 인라인 스타일 버그가 남긴 문장이다.
- 기능 감지는 "있는가"가 아니라 "우리 기대대로 동작하는가"를 물어야 한다. 번복 2의 `@property` 감지는 두 방향으로 틀렸다. 처음엔 등록 throw를 전부 미지원으로 봐서, 다른 카피가 이름을 선점했을 뿐인 멀쩡한 브라우저를 강등시켰다. 다음엔 선점을 전부 지원으로 봐서, 다른 서술자로 선점되어 애니메이션이 조용히 깨지는 경우까지 지원이라 판정했다. DOM에서 기대 동작을 직접 확인하고서야 끝났다.
- 스펙 함수를 JS로 포팅하면 계산식만 오는 게 아니라 유효성 규칙까지 따라온다. 브라우저 파서가 걸러 주던 입력이 포팅본에서는 `NaN`으로 조용히 통과한다.
- "구형 브라우저 지원"을 표방하는 순간, 조용히 무시되는 API 대입 하나하나가 전부 지원 범위의 책임이 된다.
- 지원 범위 주장은 실행으로만 증명된다. 실행이 닿지 않는 구간이 남는다면, 주장과 증명을 구분해서 적는 것까지가 일이다.
- 우아한 강등이 불가능한 경우도 있다. 불가능하다는 확인에 든 과정을 문서와 CI에 남기는 것이 차선이다.

덧붙여, 원본 설계에 대한 감상이 하나 남았다. 애니메이션 상태를 전부 커스텀 프로퍼티로 표현하고 스타일시트가 그것을 소비하는 원본의 구조 덕분에, 폴백 엔진은 "같은 프로퍼티를 JS로 채워 넣는" 것만으로 원본 CSS를 그대로 재사용할 수 있었다. 값의 생산자와 소비자가 CSS 커스텀 프로퍼티라는 좁은 인터페이스로 분리되어 있었기 때문에 구동부 교체가 가능했던 셈이다. 만들 때 의도한 확장점은 아니었겠지만, 관심사가 잘 갈라진 코드는 원저자가 상상하지 않은 방향으로도 열려 있다는 것을 확인한 작업이었다.

## 저장소와 데모

작업의 결과물은 전부 공개되어 있다.

- **저장소**: [github.com/yceffort/number-flow](https://github.com/yceffort/number-flow). 이 글에서 인용한 코드와 selftest, 구형 브라우저 러너, CI 구성이 모두 들어 있다.
- **라이브 데모**: [yceffort.github.io/number-flow](https://yceffort.github.io/number-flow/). Storybook에서 실시간 티커, 인터럽트 연타 같은 시나리오를 직접 조작해 볼 수 있다. rAF 폴백을 강제하는 스토리도 있어서, 모던 브라우저에서도 폴백 엔진의 결과를 눈으로 비교할 수 있다.
- **패키지**: [`@yceffort/number-flow`](https://www.npmjs.com/package/@yceffort/number-flow), [`@yceffort/number-flow-react`](https://www.npmjs.com/package/@yceffort/number-flow-react). 결정 1에서 다룬 alias 방식으로 원본 자리에 코드 수정 없이 끼울 수 있다.

반례 제보나 질문은 저장소 이슈로 남겨 주시면 감사하겠다. 특히 Safari 절의 WebKit 버그에 대해 독립 재현이나 추가 정보를 가진 분이 있다면 더욱 반갑다.

마지막으로, 이 포크는 원작이 있어야만 존재할 수 있는 작업이다. 뜯어볼수록 감탄한 설계였고, 구동부를 통째로 갈아 끼우는 일이 가능했던 것 자체가 그 설계의 증명이었다. 이 글의 어떤 문장도 원작에 대한 비판으로 읽히지 않기를 바란다. number-flow를 만들어 공개해 준 [Maxwell Barvian](https://github.com/barvian)에게 존경과 감사를 전하며, 이 포크의 작업 중 upstream에 유의미한 것이 있다면, 언제든.
