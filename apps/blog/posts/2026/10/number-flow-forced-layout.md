---
title: '<em>number-flow</em> 갱신 경로의 강제 동기 레이아웃 줄이기'
tags:
  - web-performance
  - browser
  - debugging
  - oss
published: true
series: 'number-flow 개선기'
seriesOrder: 3
date: 2026-11-01 08:35:00
description: 'number-flow의 값을 바꿀 때마다 스타일과 레이아웃을 여러 번 다시 계산하고 있었다. 0.2.1에서 DOM을 읽고 쓰는 순서를 바꾸며 확인한 성능 변화와 남은 비용을 정리했다.'
art:
  undraw: bento-grid
---

## Table of Contents

## 갱신 한 번에 스타일을 12번 다시 계산했다

`15 / 103 / 91 / 2 / 11 / 11 / 11 / 11 / 11 / 11 / 109 / 54`. 숫자 하나를 바꾸는 동안 Chrome이 스타일을 다시 계산한 요소 수를 순서대로 적은 것이다. 한 번 갱신할 때 스타일 계산이 12번 일어났고, 다음 갱신에서도 같은 순서가 반복됐다. 가운데 11이 6번 이어지는 부분은 9자리 숫자에서 값이 바뀐 자릿수마다 스타일을 다시 계산한 흔적이었다.

[2편](/2026/10/number-flow-compositor-performance)에서는 애니메이션이 재생되는 900ms 동안 매 프레임 스타일을 다시 계산하던 문제를 다뤘다. 0.2.0에서 이동과 페이드를 `transform`과 `opacity` 키프레임으로 옮기면서 재생 중의 비용은 줄었다. 다만 그때는 `<NumberFlow>`의 값이 바뀌는 순간, 라이브러리가 DOM을 갱신하는 데 걸리는 시간까지 살펴보지는 않았다. 이번에 확인한 페이지에서는 CPU 4배 감속을 걸었을 때 이 갱신 태스크 하나가 50~60ms 걸렸다.

두 문제는 트레이스에서도 구분됐다. 재생 중의 스타일 재계산은 JavaScript 호출 바깥의 `RunTask` 바로 아래에 있었다. 브라우저가 프레임마다 처리하는 작업이었다. 반면 이번에는 JavaScript 함수가 실행되는 도중에 계산이 끼어 있었다. 코드가 최신 좌표를 요청하면서 브라우저가 미뤄 둔 레이아웃 계산을 즉시 실행한 것이다. 이를 강제 동기 레이아웃(forced synchronous layout)이라고 한다.

스타일만 다시 계산하고 레이아웃은 건너뛰는 경우도 있으므로, 이 글의 브라우저 측정 표에서는 스타일 재계산(`UpdateLayoutTree`)과 레이아웃(`Layout`) 횟수를 따로 센다. 포크의 [0.2.1](https://github.com/yceffort/number-flow/releases/tag/v0.2.1)에서는 DOM을 읽고 쓰는 순서를 바꿔 반복 계산을 줄였다. 실제로 몇 번 계산하는지는 페이지 상태와 갱신 종류에 따라 달랐다.

> 코드 분석은 2026년 10월 31일 릴리스한 `v0.2.1`, 커밋 [`477893f`](https://github.com/yceffort/number-flow/tree/477893f382cff2562df1c8522c6f1aa6a63e3f87)를 기준으로 한다. 변경은 [PR #18](https://github.com/yceffort/number-flow/pull/18)과 [PR #19](https://github.com/yceffort/number-flow/pull/19)에 들어 있고, 변경 전 코드는 2편과 같은 [`v0.2.0`](https://github.com/yceffort/number-flow/tree/v0.2.0)이다. 이슈의 페이지에서 잰 브라우저 측정값은 [이슈 #17](https://github.com/yceffort/number-flow/issues/17)과 PR #18에 기록한 결과다. 후반부의 세 빌드 비교는 일부 부하 조건을 재현한 별도 페이지의 결과이며, [실험 코드와 입력, 결과, 트레이스 파일](/demos/number-flow/forced-layout-experiment-2026-11-01.zip)을 함께 제공한다. jsdom 테스트 모델의 수치는 세 커밋에 같은 테스트를 적용한 결과다.

## 프로파일러에 나타난 함수부터 살펴봤다

이슈 #17은 `@yceffort/number-flow`와 React 래퍼를 모두 0.2.0으로 사용하던 페이지에서 측정한 결과다. React 19를 쓰는 Next.js 프로덕션 빌드였고, 접두부와 접미부가 붙은 약 9자리 `<NumberFlow>` 하나가 약 1초마다 갱신됐다. 같은 페이지의 다른 부분에서도 초당 약 180회 텍스트 노드를 바꾸고 있었다. 데스크톱 Chrome 156에서 모바일 뷰포트를 에뮬레이션하고 CPU 4배 감속을 걸었다. 확장 프로그램은 설치하지 않았다.

10초 트레이스에서 골라 본 갱신 태스크 6개는 모두 같은 패턴이었다.

| 갱신 태스크 하나                                   |    횟수 | 건당 시간 |
| -------------------------------------------------- | ------: | --------: |
| 전체 길이                                          |         |   50~60ms |
| JavaScript 안의 스타일 재계산 (`UpdateLayoutTree`) | 11~13회 | 0.1~5.5ms |
| JavaScript 안의 레이아웃 (`Layout`)                |  9~11회 | 0.2~1.8ms |

이 요소가 얼마나 영향을 주는지 알아보려고 두 가지를 비교했다. 먼저 `<NumberFlow>`를 같은 값을 표시하는 일반 텍스트로 바꾸고, 변경 전후를 각각 10초씩 측정했다. 애니메이션까지 없애는 비교이므로 최적화로 줄일 수 있는 비용의 상한을 확인하는 용도였다. 스타일 재계산과 레이아웃에 걸린 시간의 합은 104ms/s에서 22ms/s로 줄었고, 50ms를 넘는 태스크도 13개에서 0개가 됐다.

다음으로 페이지의 다른 갱신을 초당 약 36회로 줄여 봤다. 그래도 1초 주기로 나타나던 긴 태스크는 10초에 13개로 그대로였다. 배경 갱신을 줄이는 것만으로는 문제가 사라지지 않았다. 다만 50ms를 넘는 태스크의 개수만 비교했으므로, 갱신에 걸리는 시간도 같았다거나 배경 부하가 영향을 주지 않았다고까지 판단할 수는 없다.

브라우저는 DOM이나 스타일이 바뀌어도 곧바로 계산하지 않고 다음 렌더링 단계까지 미룰 수 있다. 그런데 그사이에 코드가 `getBoundingClientRect()`나 `offsetWidth`로 현재 위치나 크기를 요청하면, 필요한 계산을 먼저 끝내야 정확한 값을 돌려줄 수 있다. 이후 DOM이나 스타일이 바뀌지 않았다면 계산 결과를 재사용할 수 있지만, API를 호출하는 데 드는 시간까지 없어지는 것은 아니다.

모든 DOM 변경이 레이아웃 계산으로 이어지지는 않는다. 레이아웃을 다시 계산해야 하는 변경과 좌표 조회가 번갈아 반복될 때 문제가 된다. 브라우저가 계산을 한꺼번에 처리하지 못하고 읽을 때마다 실행해야 하기 때문이다. 이런 패턴을 레이아웃 스래싱(layout thrashing)이라고 부른다.

아래 예제에서는 상자의 폭을 읽고 바꾸는 작업을 두 가지 순서로 실행한다. 하나는 상자마다 폭을 읽고 바로 바꾸고, 다른 하나는 모든 상자의 폭을 읽은 뒤 한꺼번에 바꾼다. 두 방식 모두 같은 폭에서 시작하며, 마지막 변경에 따른 레이아웃 계산이 끝날 때까지 시간을 잰다. 페인트와 합성 시간은 포함하지 않는다.

<LiveDemo src="/demos/number-flow/layout-lab.html?scene=thrash" title="상자의 폭을 바꾸고 레이아웃을 계산하는 데 걸린 시간" height={760} />

강제 레이아웃은 좌표를 요청한 함수가 실행되는 도중에 일어나므로, 트레이스에서도 그 함수 아래에 나타난다. 20초 CPU 프로파일에서 `getBoundingClientRect`의 자체 실행 시간을 호출자별로 모아 봤다. Chrome의 Forced reflow 인사이트에서는 같은 트레이스의 강제 레이아웃 시간을 261ms로 집계했다.

| `getBoundingClientRect`를 호출한 함수    | 자체 시간 |
| ---------------------------------------- | --------: |
| `Digit.didUpdate`                        |     186ms |
| `Section.addNewAndUpdateExisting`        |     178ms |
| `Section.didUpdate`                      |     129ms |
| `Sym.didUpdate`                          |      85ms |
| `Section.willUpdate`, `Digit.willUpdate` |       9ms |

처음에는 `didUpdate`가 좌표를 읽은 직후 `animate()`를 호출하는 것이 원인이라고 생각했고, 이슈에도 그렇게 적었다. 하지만 코드를 보니 이번 경우에는 맞지 않는 설명이었다. 네이티브 엔진의 `animate()`는 요청을 `queue()`에 넣기만 한다. rAF 엔진도 재생 시간이 양수이면 다음 프레임에서 처리하도록 예약한다. 둘 다 이 시점에는 DOM을 바꾸지 않는다.

실제로는 그전에 실행된 `is-spinning` 클래스 추가, `--width` 기록, 갱신 단계의 DOM 이동이 원인이었다. 이 변경들 때문에 다음 좌표를 읽을 때 스타일과 레이아웃을 다시 계산해야 했다. 이 내용은 이슈 댓글로 정정했다. 프로파일러에는 계산을 요청한 함수가 나타나지만, 원인을 찾으려면 그보다 앞서 어떤 코드가 DOM을 바꿨는지도 봐야 했다.

## 네 군데에서 DOM 변경과 좌표 조회가 반복됐다

[`v0.2.0`의 `lite.ts`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/lite.ts)에서는 세 단계로 값을 갱신했다. `willUpdate()`에서 모든 섹션과 글자의 좌표를 읽고, `update()`에서 DOM을 바꾼 다음, `didUpdate()`에서 새 좌표를 읽어 이동한 만큼 애니메이션을 요청한다. 변경 전후의 위치를 구하고, 그 차이를 반대로 적용한 상태에서 원위치까지 움직이는 FLIP(First, Last, Invert, Play) 방식이다. 그런데 `update()`와 `didUpdate()` 내부를 보면 섹션과 글자를 처리할 때마다 DOM 변경과 좌표 조회가 번갈아 일어나고 있었다. PR #18에서 확인한 곳은 다음 네 군데다.

| 어디서                            | 무엇을 썼나                                    | 바로 뒤에 무엇을 읽었나                                    |
| --------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| `Section.addNewAndUpdateExisting` | 기존 글자까지 전부 다시 `append`, 새 글자 삽입 | 섹션의 좌표, 섹션마다 한 번 (pre, integer, fraction, post) |
| `NumberSection.update`            | 모든 글자를 흐름에 되돌리고 값 기록            | 사라지는 글자마다 `offsetTop`과 `offsetLeft`               |
| `Digit.didUpdate`                 | `is-spinning` 클래스 추가                      | 다음 자릿수의 좌표, 값이 바뀐 자릿수마다 한 번             |
| `Num.didUpdate`                   | `--width`                                      | 접미부 섹션의 좌표                                         |

첫 번째는 새로 추가되는 글자가 없어도 불필요하게 레이아웃을 계산했다. [`addNewAndUpdateExisting()`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/lite.ts#L493-L535)은 새 글자의 시작 위치를 구하려고 섹션 좌표를 조회한다. 그런데 그 앞의 루프에서는 이미 있던 글자에도 `append`나 `prepend`를 호출하고 있었다.

```ts
forEach(
  parts,
  (part) => {
    let comp: Char
    // Already exists/needs update, so set aside for now
    if (this.children.has(part.key)) {
      comp = this.children.get(part.key)!
      updated.set(part, comp)
      this.unpop(comp)
      comp.present = true
    } else {
      // New part
      comp = this.addChar(part, {startDigitsAtZero: true, animateIn: true})
      added.set(part, comp)
    }
    this.el[op](comp.el)
  },
  {reverse},
)

if (this.flow.computedAnimated) {
  const rect = this.el.getBoundingClientRect() // this should only cause a layout if there were added children (?)
  added.forEach((comp) => {
    comp.willUpdate(rect)
  })
}
```

이미 자식인 요소를 다시 `append`하면 최종 순서가 같더라도 브라우저는 요소를 제거했다가 삽입한다. DOM이 이동해 부모의 레이아웃을 다시 계산해야 하는데, 바로 아래의 `getBoundingClientRect()`는 `computedAnimated`가 참이면 항상 실행된다. 주석에는 자식이 추가됐을 때만 레이아웃 계산이 필요할 것이라고 적혀 있었지만, 실제로는 섹션 4개에서 각각 한 번씩 강제 레이아웃이 발생했다.

두 번째는 자릿수가 줄어들 때 나타난다. [`NumberSection.update()`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/lite.ts#L569-L593)는 사라질 자릿수를 잠시 일반적인 레이아웃 흐름에 넣어 새 위치를 잰 뒤, 그 위치에 고정하고 흐름에서 뺀다. 사라지는 숫자도 이웃 숫자의 폭 변화에 맞춰 움직이게 하려는 처리다. 그런데 위치를 재는 [`pop()`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/lite.ts#L481-L491)에서도 글자마다 읽기와 쓰기가 반복됐다.

```ts
protected pop(chars: Map<any, Char>) {
  // Calculate offsets for removed before popping, to avoid layout thrashing:
  chars.forEach((char) => {
    char.el.style.top = `${char.el.offsetTop}px`
    char.el.style[this.justify] = `${offset(char.el, this.justify)}px`
  })
  chars.forEach((char) => {
    char.el.setAttribute('inert', '')
    char.present = false
  })
}
```

주석대로 `inert`는 측정을 마친 뒤 설정한다. 하지만 측정하는 부분에서도 `offsetTop`을 읽어 `top`에 쓰고, 다시 `offsetLeft`를 읽어 `left`나 `right`에 쓴다. 이 순서가 반복되면서 글자 하나당 쓰기 뒤의 읽기가 두 번씩 생긴다. 뒤에서 설명할 테스트 모델에서 자릿수가 줄어드는 갱신을 34회로 집계한 이유다.

세 번째는 앞서 트레이스에서 11이 연속으로 나타났던 부분이다. [`Digit.didUpdate()`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/lite.ts#L771-L805)는 자릿수의 좌표를 읽고 이동 애니메이션을 요청한다. 그다음 값이 바뀐 자릿수에 `is-spinning` 클래스를 추가한다.

```ts
didUpdate(parentRect: DOMRect) {
  const rect = this.el.getBoundingClientRect()
  const offset = rect[this.section.justify] - parentRect[this.section.justify]
  const halfWidth = rect.width / 2
  const center =
    this.section.justify === 'left' ? offset + halfWidth : offset - halfWidth
  const dx = this._prevCenter! - center

  if (dx)
    animate(
      this.flow,
      this.el,
      {
        transform: [`translateX(${dx}px)`, 'none'],
      },
      this.flow.transformTiming,
    )

  const delta = this.getDelta()
  if (!delta) return

  this.el.classList.add('is-spinning')
  animate(
    this.flow,
    this.el,
    {
      [deltaVar]: [-delta, 0],
    },
    this.flow.spinTiming ?? this.flow.transformTiming,
  )
  // Hoisting the callback out prevents duplicates:
  this.flow.addEventListener('animationsfinish', this._onAnimationsFinish, {
    once: true,
  })
}
```

스타일시트의 `.digit:not(.is-spinning) .digit__num[inert] { display: none; }` 규칙은 현재 값이 아닌 숫자들을 숨긴다. `is-spinning` 클래스를 추가하면 이 규칙이 적용되지 않아 스핀 중에 지나갈 숫자들이 보이게 된다. 애니메이션이 끝나면 `animationsfinish`에서 클래스를 제거하므로 다음 갱신 때는 다시 추가한다. 자릿수를 순서대로 처리하는 루프에서는 한 자릿수에 클래스를 추가한 뒤 다음 자릿수의 `getBoundingClientRect()`를 호출한다. 이때마다 스타일을 다시 계산하므로, 자릿수가 9개라면 이 부분에서만 재계산이 8번 더 일어날 수 있다.

네 번째는 숫자 전체의 폭을 기록하는 부분이다. [`Num.didUpdate()`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/lite.ts#L380-L404)는 정수부와 소수부의 `didUpdate()`를 실행한 뒤, 새 폭을 읽어 `--width`에 저장한다. 이 값은 2편에서 설명한 마스크 보정에 쓰인다. 그다음 실행되는 `_post.didUpdate()`가 좌표를 읽으면 레이아웃 계산이 한 번 더 발생한다.

```ts
didUpdate() {
  const rect = this.el.getBoundingClientRect()

  // Do this before starting to animate:
  this._integer.didUpdate()
  this._fraction.didUpdate()

  const dx = this._prevLeft! - rect.left

  const width = this.el.offsetWidth
  // We convert scale to width delta in px to better handle interruptions and keep them in
  // sync with translations:
  const dWidth = this._prevWidth! - width
  this.el.style.setProperty('--width', String(width))

  animate(
    this.flow,
    this.el,
    {
      [dxVar]: [`${dx}px`, '0px'],
      [widthDeltaVar]: [dWidth, 0],
    },
    this.flow.transformTiming,
  )
}
```

이 밖에도 갱신 단계에서 모든 섹션의 `--current`와 `inert`를 바꾸고 DOM을 이동한 뒤, `_pre.didUpdate()`가 처음 좌표를 읽을 때 계산이 발생한다. 각 함수 안에서는 읽기를 모아 처리하려 했지만, 섹션과 글자를 차례로 처리하다 보니 앞 요소의 변경 때문에 다음 요소의 좌표를 읽을 때마다 재계산이 필요했다.

이 구조는 업스트림에서 가져왔다. 업스트림 `main`의 2026년 9월 20일 커밋 [`c5906cf`](https://github.com/barvian/number-flow/blob/c5906cf/packages/number-flow/src/lite.ts)에도 같은 루프와 주석이 남아 있다. 다만 업스트림에서는 같은 조건으로 트레이스를 수집하지 않았으므로, 실제 비용도 같다고 단정할 수는 없다.

아래 예제에서는 한 번 갱신하는 동안 이 네 부분이 어떤 순서로 실행되는지 볼 수 있다. 포크의 코드를 jsdom에서 실행하며 DOM을 읽고 쓴 순서를 기록했다. 왼쪽은 `v0.2.0`, 오른쪽은 `v0.2.1`이고, 쓰기 뒤에 이어지는 읽기를 보라색으로 표시했다. 자릿수가 줄어드는 예제를 선택하면 `pop()`이 글자마다 좌표를 읽으면서 집계값이 34회까지 늘어나는 과정을 볼 수 있다. 네이티브 엔진 예제에는 `flush()`가 값을 읽는 시점도 표시돼 있다.

<LiveDemo src="/demos/number-flow/layout-lab.html?scene=order" title="v0.2.0과 v0.2.1이 한 번 갱신하는 동안 DOM을 읽고 쓴 순서" height={800} />

오른쪽에서는 읽기와 쓰기가 각각 모여 있다. 같은 자릿수를 갱신하는 예제에서는 보라색이 한 번, 글자가 늘거나 자릿수가 줄어드는 예제에서는 두 번 나타난다. 보라색은 테스트에서 기록한 쓰기 뒤의 읽기이며, 브라우저가 실제로 레이아웃을 계산한 횟수는 아니다.

## 모든 섹션을 읽은 뒤 한꺼번에 쓴다

이슈에서 제안한 대로 측정과 커밋을 분리했다. 먼저 필요한 값을 모두 읽고, DOM에 반영하는 작업은 나중에 실행하는 방식이다. 이때 섹션 하나씩 읽고 쓰는 것만으로는 부족했다. 한 섹션을 바꾼 뒤 다음 섹션의 좌표를 읽으면 다시 계산이 필요하기 때문이다. 그래서 0.2.1에서는 접두부, 숫자, 접미부의 세 섹션을 모두 읽은 다음 쓰기를 실행하도록 순서를 바꿨다.

| 단계             | 종류 | 하는 일                                                                                       |
| ---------------- | ---- | --------------------------------------------------------------------------------------------- |
| `willUpdate`     | 읽기 | 모든 섹션과 글자의 좌표, 사라질 때 고정할 기호의 레이아웃 위치                                |
| `update`         | 쓰기 | 변경 비교, 사라지는 기호를 흐름에서 빼기, 사라지는 자릿수를 흐름에 되돌리기, 글자 삽입과 이동 |
| `measureAdded`   | 읽기 | 추가된 글자의 시작 위치, 추가된 글자가 있을 때만                                              |
| `updateValues`   | 쓰기 | `--current`, `inert`, 사라지는 자릿수를 0으로                                                 |
| `measureRemoved` | 읽기 | 사라지는 자릿수의 새 레이아웃에서의 위치, 사라지는 자릿수가 있을 때만                         |
| `popRemoved`     | 쓰기 | 사라지는 자릿수를 측정한 위치에 고정하고 흐름에서 빼기                                        |
| `measure`        | 읽기 | 최종 좌표, 섹션과 글자마다 커밋 클로저를 반환                                                 |
| 커밋             | 쓰기 | `is-spinning`, `--width`, `animate()` 호출, 그 뒤 `flush()`                                   |

[`set data`](https://github.com/yceffort/number-flow/blob/v0.2.1/packages/number-flow/src/lite.ts#L228-L239)는 앞의 여섯 단계를 아래 순서로 실행한다. 각 단계에서 필요한 섹션을 모두 처리한 뒤 다음 단계로 넘어간다.

```ts
// Each phase finishes its DOM writes across every section before the
// next one reads layout, so an update forces one layout (one more when
// it adds chars, one more when it drops digits) instead of one per
// section plus one per digit (yceffort/number-flow#17):
this._pre!.update(pre)
this._num!.update({integer, fraction})
this._post!.update(post)
const sections = [this._pre!, this._num!, this._post!]
sections.forEach((s) => s.measureAdded())
sections.forEach((s) => s.updateValues())
this._num!.measureRemoved()
this._num!.popRemoved()
```

마지막 두 단계는 [`didUpdate()`](https://github.com/yceffort/number-flow/blob/v0.2.1/packages/number-flow/src/lite.ts#L309-L315)에서 실행한다. 각 섹션의 `measure()`는 좌표를 읽어 이동량을 계산하고, DOM에 반영할 작업을 클로저로 반환한다. 세 섹션의 측정이 모두 끝나면 이 클로저들을 차례로 실행한다.

```ts
// Measure every section and char (and what the engine will need) before
// any of them writes to the DOM:
const sections = [this._pre!, this._num!, this._post!]
const commits = sections.map((s) => s.measure())
if (usesNativeEngine()) prepare(this)
commits.forEach((commit) => commit())
if (usesNativeEngine()) flush(this)
```

`prepare()`는 PR #19에서 추가한 함수로 뒤에서 설명한다. 자릿수의 [`measure()`](https://github.com/yceffort/number-flow/blob/v0.2.1/packages/number-flow/src/lite.ts#L820-L856)를 보면 좌표 계산은 이전 `didUpdate()`와 같다. `is-spinning`을 추가하고 `animate()`를 호출하는 부분만 반환할 함수 안으로 옮겼다.

```ts
measure(parentRect: DOMRect): Commit {
  const rect = this.el.getBoundingClientRect()
  const offset = rect[this.section.justify] - parentRect[this.section.justify]
  const halfWidth = rect.width / 2
  const center =
    this.section.justify === 'left' ? offset + halfWidth : offset - halfWidth
  const dx = this._prevCenter! - center

  return () => {
    if (dx)
      animate(
        this.flow,
        this.el,
        {
          transform: [`translateX(${dx}px)`, 'none'],
        },
        this.flow.transformTiming,
      )

    const delta = this.getDelta()
    if (!delta) return

    this.el.classList.add('is-spinning')
    animate(
      this.flow,
      this.el,
      {
        [deltaVar]: [-delta, 0],
      },
      this.flow.spinTiming ?? this.flow.transformTiming,
    )
    // Hoisting the callback out prevents duplicates:
    this.flow.addEventListener('animationsfinish', this._onAnimationsFinish, {
      once: true,
    })
  }
}
```

`measureAdded`와 `measureRemoved`는 기존 애니메이션의 위치 계산을 유지하려고 둔 단계다. 새로 추가한 글자는 값을 쓰기 전에 시작 위치를 재야 한다. 숫자라면 아직 0인 상태에서 측정한다. 이전 코드의 `addNewAndUpdateExisting()`도 이 순서로 처리했으며, 그 측정을 `measureAdded`로 분리했다.

사라지는 자릿수는 남은 숫자들을 새 값으로 바꾼 뒤의 위치에 고정해야 한다. 비례 폭 글꼴은 숫자에 따라 폭이 다르므로 이전 위치에 그대로 고정하면 이웃 숫자가 겹쳐 지나갈 수 있다. 이 위치를 재는 단계가 `measureRemoved`다. [`NumberSection`](https://github.com/yceffort/number-flow/blob/v0.2.1/packages/number-flow/src/lite.ts#L603-L634)은 사라질 자릿수를 모아 두었다가 이 단계에서 처리한다. 자릿수가 줄어들 때 측정이 한 번 더 필요한 이유다. PR에는 비례 폭 글꼴에서 1,111이 222로 바뀌는 상황을 모의해 고정 위치를 검사하는 테스트를 추가했다.

기호는 처리 방식이 다르다. 사라질 기호를 움직이기 전의 위치에 고정하므로 추가 측정이 필요 없다. 이 동작을 기본 구현으로 옮기면서 `SymbolSection` 클래스는 없앴다.

PR #18에서는 화면에 보이지 않는 요소의 처리도 바꿨다. 이전에는 `willUpdate()`가 모든 섹션과 글자를 측정한 뒤, `didUpdate()`의 `visible(this)` 검사에서 보이지 않는 요소의 측정값을 버렸다. 이제는 `willUpdate()`에서 먼저 확인하고 측정을 건너뛴다. `visible()`도 `offsetWidth`와 `offsetHeight`를 읽으므로 다른 조건들을 확인한 뒤 마지막에 호출한다. 앞선 조건에서 애니메이션할 수 없다고 판단되면 레이아웃 값도 읽지 않는다.

## jsdom으로 읽기와 쓰기의 순서를 검증한다

이후 코드를 수정하다가 읽기와 쓰기를 다시 섞지 않도록 테스트를 추가했다. jsdom은 레이아웃을 계산하지 않으므로 실제 브라우저처럼 걸리는 시간이나 계산 횟수를 잴 수는 없다. 대신 DOM을 바꾼 뒤 레이아웃이나 계산된 스타일을 조회하는 일이 몇 번 있는지 센다. [`lite.test.ts`의 `forcedLayouts()`](https://github.com/yceffort/number-flow/blob/v0.2.1/packages/number-flow/test/lite.test.ts#L73-L125)가 이 역할을 한다. 함수 이름에는 레이아웃이라고 돼 있지만, 검사하는 것은 호출 순서다.

```ts
// Counts the layouts a browser would be forced to run during fn(): every
// layout read that follows a DOM write since the previous read. jsdom does no
// layout, so the writes are observed through MutationObserver's synchronous
// takeRecords() instead (yceffort/number-flow#17):
const forcedLayouts = (el: TestFlow, fn: () => void) => {
  const observer = new MutationObserver(() => {})
  observer.observe(el, {attributes: true})
  observer.observe(el.shadowRoot!, {
    subtree: true,
    childList: true,
    attributes: true,
  })
  let forced = 0
  const read = () => {
    if (observer.takeRecords().length) forced++
  }

  const rect = Element.prototype.getBoundingClientRect
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      read()
      return rect.call(this)
    },
  )
  // Resolving a computed value also flushes pending style changes (it may be
  // a spy from the native suite, so wrap by assignment, not vi.spyOn):
  const computed = window.getComputedStyle
  window.getComputedStyle = (...args) => {
    read()
    return computed.apply(window, args)
  }
  const counting: LayoutGetter = (_el, original) => {
    read()
    return original()
  }

  observer.takeRecords() // writes before fn() aren't its fault
  try {
    withLayout(
      {
        offsetWidth: counting,
        offsetHeight: counting,
        offsetTop: counting,
        offsetLeft: counting,
      },
      fn,
    )
  } finally {
    window.getComputedStyle = computed
    observer.disconnect()
  }
  return forced
}
```

`MutationObserver`의 콜백은 마이크로태스크로 실행되지만, `takeRecords()`를 호출하면 쌓여 있는 변경 기록을 동기적으로 가져올 수 있다. 값을 읽을 때마다 이 기록을 꺼내 보고, 기록이 있으면 이전 읽기 이후에 DOM이 바뀌었다고 판단한다. 측정 대상은 `getBoundingClientRect()`, `getComputedStyle()`, 그리고 `withLayout()`으로 교체한 `offsetWidth`, `offsetHeight`, `offsetTop`, `offsetLeft` 접근자다. `el.style`로 인라인 스타일을 읽는 작업은 레이아웃 계산을 강제하지 않으므로 제외했다.

이 테스트가 센 횟수가 실제 레이아웃 횟수와 같지는 않다. 레이아웃에 영향을 주지 않는 속성 변경도 쓰기로 기록하고, 브라우저가 스타일만 갱신했는지 계산 결과를 재사용했는지도 구분하지 못한다. 반대로 Web Animations API의 모의 구현에는 브라우저 내부의 스타일 갱신이 빠져 있어 놓치는 작업도 있다. 따라서 이 값을 브라우저 트레이스와 직접 비교하거나 실제 횟수의 상한으로 볼 수는 없다. 읽기와 쓰기의 순서가 다시 섞이지 않는지 확인하는 테스트다.

아래 수치는 세 커밋의 소스에 `v0.2.1`의 테스트 파일을 각각 적용해 구했다. 테스트는 허용할 최대 횟수만 검사하므로, 기대값을 일부러 다르게 설정해 실패 메시지에 나온 실제 집계값을 확인했다.

| 쓰기 뒤 읽기 횟수 (접두부와 접미부 포함) | `v0.2.0` | PR #18 (`90a7539`) | `v0.2.1` |
| ---------------------------------------- | -------: | -----------------: | -------: |
| 같은 자릿수                              |       13 |                  1 |        1 |
| 자릿수 증가                              |       14 |                  2 |        2 |
| 자릿수 감소                              |       34 |                  2 |        2 |
| 기호만 제거                              |        7 |                  1 |        1 |
| 같은 자릿수, 네이티브 엔진               |       12 |                  2 |        1 |

표의 위 네 줄은 rAF 엔진의 결과다. 마지막 줄은 네이티브 엔진을 사용했다. jsdom에는 Web Animations가 없으므로 `Animation` 모의 객체를 만들어 `flush()`가 실행되게 했고, `getComputedStyle()`은 애니메이션이 멈췄을 때의 스타일 값을 반환하도록 했다. PR #18과 PR #19의 결과는 이 마지막 줄에서만 다른데, 이유는 뒤에서 설명한다. 변경 전의 13, 14, 34는 PR #18 본문의 수치와 같았다. 기호만 제거했을 때의 7은 PR에 없던 값으로, 이번에 추가로 측정했다.

## 실제 페이지에서는 갱신 시간이 절반으로 줄었다

실제 브라우저에서도 얼마나 줄었는지 확인했다. 이슈의 페이지에서 PR #18의 브랜치(`90a7539`)와 0.2.0을 번갈아 실행하며 빌드마다 10초 트레이스를 3회씩 수집했다. 이 비교에서는 자릿수가 그대로인 갱신만 있었다.

|                                      |       0.2.0 |    PR #18 |
| ------------------------------------ | ----------: | --------: |
| 갱신 태스크 평균                     |      53.9ms |    26.0ms |
| 갱신당 강제 스타일 재계산 / 레이아웃 | 11.9 / 10.6 | 3.5 / 2.2 |
| 10초당 50ms 초과 태스크              |         7.7 |         0 |
| number-flow 자체 + 하위 시간         |    51.2ms/s |  24.3ms/s |
| `getBoundingClientRect` 시간         |    28.6ms/s |   3.5ms/s |

갱신이 끝난 뒤 화면에 표시된 자릿수와 `valueAsString`을 비교했고, 15번 모두 일치했다. `getBoundingClientRect`에 걸린 시간은 8분의 1로 줄었지만 강제 스타일 재계산은 갱신당 3.5회가 남아 있었다. 태스크 내부의 `UpdateLayoutTree`와 `Layout` 이벤트에서 호출 스택을 소스맵으로 확인하니, 남은 계산은 다음 네 곳에서 발생했다.

| 남은 읽기                                                                                         | 갱신당 비용                                   |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `flush()`의 `overridden()`: 채널마다 `getComputedStyle(el).transform`, 스핀 단위의 `offsetHeight` | 스타일 5.3ms + 레이아웃 1.2ms                 |
| `didUpdate()`의 `shadowRoot.getAnimations()`, `flush()` 직후                                      | 스타일 3.1ms                                  |
| `Section.measure()`의 `getBoundingClientRect()` (FLIP 읽기)                                       | 스타일 2.4ms + 레이아웃 1.2ms                 |
| `willUpdate()`의 `visible(this)`                                                                  | 0.1~0.5ms, 이미 레이아웃 재계산이 필요할 때만 |

표의 세 번째 항목이 테스트 모델에서 센 한 번이다. DOM을 바꾼 뒤 최종 좌표를 읽는, FLIP에 필요한 측정이다. 당시 테스트는 rAF 엔진으로 실행했으므로 네이티브 엔진에만 있는 `flush()`와 `getAnimations()`의 작업은 빠져 있었다. 이 두 부분에서만 9.6ms가 걸려 FLIP 측정보다 오래 걸렸다. 둘 다 0.2.0부터 있던 코드여서 PR #18 때문에 새로 생긴 문제는 아니었다. 이 부분은 후속 PR에서 다루기로 했다.

`overridden()`은 2편에서 설명한 예외 처리에 쓰인다. 사용자가 `::part()`로 지정한 이동이나 불투명도 스타일을 새 엔진이 덮어쓰지 않도록 확인하는 함수다. 채널의 요소가 정지해 있을 때 `getComputedStyle()`로 변환과 불투명도 값을 구해 기본값과 비교한다. 스핀 채널에서는 `offsetHeight`로 숫자 한 칸의 높이를 구해 `translateY()`에 사용할 단위로 삼는다.

`flush()` 안에서는 이 값들을 먼저 모아서 읽고 있었다. 하지만 `flush()` 자체가 커밋 단계 뒤에 실행됐다. 이미 `is-spinning`과 `--width`를 바꾼 직후이므로 첫 값을 읽을 때 스타일을 다시 계산해야 했다.

`getAnimations()`는 `animationsfinish`를 언제 보낼지 결정하는 데 쓰였다. 갱신 과정에서 시작한 애니메이션들의 `finished` Promise를 모으고, 모두 끝나면 이벤트를 보낸다. 이 메서드는 CSS 애니메이션과 트랜지션도 찾아서 반환하므로 호출 시점의 스타일을 갱신해야 한다. 트레이스에서도 이 호출 아래에 3.1ms의 스타일 재계산이 있었다. `flush()`에서 새 애니메이션을 시작한 직후라는 점도 비용에 영향을 줬을 가능성이 높다.

## flush()에 필요한 값을 미리 읽는다

PR #19에서는 `flush()`에 필요한 값을 미리 읽고, 뒤따르던 `getAnimations()` 호출은 없앴다. 먼저 [`prepare()`](https://github.com/yceffort/number-flow/blob/v0.2.1/packages/number-flow/src/engine/compositor.ts#L242-L259)를 추가해 커밋 전에 필요한 값을 구하도록 했다. 앞서 본 `didUpdate()`에서 `measure()` 다음에 호출하는 함수다.

```ts
/**
 * Reads what flush() needs from layout and computed style. Call it before the
 * update writes to the DOM: none of those writes change these values
 * (`is-spinning` only shows the inert numerals, which are absolutely
 * positioned), and reading them after the writes would force a style update.
 */
export const prepare = (scope: object) => {
  const set = tracked.get(scope)
  set?.forEach((ch) => {
    if (!ch.el.isConnected) {
      set.delete(ch)
      return
    }
    if (ch.kind === 'spin') ch.unit = ch.el.offsetHeight || 100
    // flush() only asks for a channel at rest:
    if (localTime(ch) == null) ch.authorStyled = authorStyled(ch)
  })
}
```

`tracked`에는 해당 요소에서 `flush()`가 한 번이라도 처리한 채널을 모아 둔다. `prepare()`는 DOM에서 분리된 요소의 채널을 제외하고, 스핀 채널의 숫자 높이와 정지한 채널에 사용자 스타일이 적용됐는지를 확인해 저장한다. 이후 `flush()`는 저장한 값을 사용하고, 처음 처리하는 채널만 직접 조회한다. 따라서 첫 애니메이션 갱신이나 새 글자가 추가된 경우에는 `flush()`에서도 값을 읽어야 한다. 저장한 값은 갱신이 끝나면 지우고, 다음 갱신 때 다시 구한다.

값을 미리 읽어도 되는 이유는 커밋에서 하는 변경이 그 값에 영향을 주지 않기 때문이다. `is-spinning`을 추가하면 `display: none`으로 숨겨 뒀던 숫자가 보이지만, 이 요소들은 `position: absolute`여서 자릿수의 높이를 바꾸지 않는다. 반면 `--width`는 이번 커밋에서 기록하는 값이라 미리 읽을 수 없다. 다만 `el.style`에서 인라인 스타일을 확인하는 작업은 레이아웃 계산을 강제하지 않으므로 `flush()`에 남겨 뒀다.

`prepare()`가 실행될 때는 앞선 측정 단계에서 브라우저가 레이아웃 계산을 끝낸 상태다. 따라서 같은 계산 결과를 재사용할 수 있다. 물론 값을 조회하고 처리하는 JavaScript 실행 시간은 여전히 든다.

`getAnimations()` 대신에는 [`animationsOf()`](https://github.com/yceffort/number-flow/blob/v0.2.1/packages/number-flow/src/engine/compositor.ts#L79-L101)를 추가했다. 컴포지터가 시작한 `Animation`을 요소별로 보관하고, 그중 아직 진행 중인 것만 반환한다.

```ts
const start = (
  scope: object,
  el: HTMLElement,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  timing: KeyframeAnimationOptions,
) => {
  const a = el.animate(keyframes, timing)
  setOf(live, scope).add(a)
  return a
}

/**
 * The scope's animations still in flight: what `shadowRoot.getAnimations()`
 * would list, minus the style update that call forces.
 */
export const animationsOf = (scope: object): Animation[] => {
  const set = live.get(scope)
  if (!set) return []
  set.forEach((a) => {
    if (!inFlight(a)) set.delete(a)
  })
  return Array.from(set)
}
```

`flush()`에서 `el.animate()`를 호출하는 곳은 모두 `start()`를 거치게 했다. 2편의 합성 경로, `accumulate`를 사용하는 예외 경로, 분류되지 않은 요청에서 시작한 애니메이션을 같은 집합에 모은다. `didUpdate()`는 이 목록에서 `finished` Promise를 받아 모두 끝나면 `animationsfinish`를 보낸다. 1편의 rAF 엔진도 자신의 트윈 목록을 관리하며 `finishedOf()`를 제공했는데, 네이티브 엔진에도 같은 방식을 적용했다.

이 변경으로 `animationsfinish`가 기다리는 대상도 달라졌다. 이전의 `getAnimations()`는 shadow root 안의 모든 애니메이션을 반환하므로, 사용자가 `::part()`에 지정한 CSS 애니메이션이나 트랜지션이 끝날 때까지 이벤트가 늦어질 수 있었다. 이제는 rAF 엔진처럼 엔진이 시작한 애니메이션만 기다린다.

애니메이션 도중 DOM에서 제거된 글자도 차이가 있다. 기존 `getAnimations()`는 요소가 사라지면 그 애니메이션을 목록에서 제외했지만, 새 구현은 계속 기다린다. 애니메이션하지 않는 갱신에서 진행 중인 애니메이션을 끝내는 부분과 `disconnectedCallback`에서는 `getAnimations().forEach(finish)`를 유지했다. 이 두 경우는 드물게 실행되며 이번 트레이스에도 나타나지 않았다.

네이티브 엔진에서 같은 자릿수를 갱신하는 테스트는 PR #18의 2회에서 1회로 줄었다. 앞 표의 마지막 줄에 해당한다. PR #19에는 브라우저 측정값을 남기지 않았다. PR #18의 트레이스로 보면 `flush()`의 6.5ms와 `getAnimations()`의 3.1ms를 줄일 것으로 예상했다. 다음 절에서는 별도 재현 페이지에서 세 빌드를 함께 비교한다. 페이지와 브라우저가 다르므로 정확히 9.6ms가 줄어드는지 확인하는 실험은 아니다.

## 같은 입력으로 세 빌드를 다시 비교했다

이슈의 페이지는 회사 서비스라 글에 쓸 수 없어서, 일부 부하 조건을 재현한 페이지를 따로 만들었다. 아래 표는 글을 검토하면서 코딩 에이전트에게 이 페이지와 측정 스크립트를 다시 실행하게 한 결과다. [실험 자료 ZIP, 약 13MiB](/demos/number-flow/forced-layout-experiment-2026-11-01.zip)에 실행 코드와 고정 입력, 실행별 결과, 트레이스 파일 18개를 담았다. 각 파일의 SHA-256도 포함했다.

> `v0.2.0`, PR #18의 커밋 `90a7539`, `v0.2.1`의 소스를 esbuild 0.28.2로 번들했다. 접두부와 접미부가 있는 `<number-flow>` 하나를 1초마다 10회 갱신하고, 배경 텍스트 노드 24개를 11ms마다 2개씩 바꿨다. Playwright 1.62.1, 헤드리스 Chromium 151.0.7922.34, 390×844 뷰포트(배율 3), CPU 4배 감속 조건이다. Apple M5, 2026년 11월 1일(KST)에 측정했다.

숫자와 배경 텍스트는 시드 `0x20261101`을 사용하되, 서로 독립된 난수열에서 생성했다. 모든 빌드가 같은 숫자 10개를 같은 순서로 처리하고, 로케일도 `en-US`로 맞췄다. 자릿수가 바뀌는 실험은 9자리에서 시작해 첫 갱신 때 7자리로 줄이고, 이후 9자리와 7자리를 번갈아 표시한다.

배경 텍스트도 같은 순서로 바꾼다. 다만 타이머가 실제로 실행되는 시점과 횟수는 브라우저 스케줄링에 따라 달라질 수 있어 결과에 함께 기록했다. 이번 측정에서는 초당 약 181회였다. 빌드 실행 순서는 A/B/C, B/C/A, C/A/B로 바꾸면서 각 빌드를 3회씩 측정했다.

갱신 직전에 `performance.mark()`를 기록하고, 이 마크가 들어 있는 태스크를 갱신 태스크로 골랐다. 그 안에서 `FunctionCall`에 포함된 `UpdateLayoutTree`와 `Layout`을 각각 셌으며, 첫 애니메이션 갱신도 평균에 넣었다. 표의 `FunctionCall` 시간에는 하위 스타일과 레이아웃 계산 시간이 포함돼 있다. JavaScript 코드만 실행한 시간은 아니다. 또 React나 Next.js 없이 만든 페이지이므로 이슈의 페이지와 실행 시간을 직접 비교하기는 어렵다.

<BarCompare title="갱신 태스크 하나의 평균 길이 (CPU 4배 감속, 3회 평균)" unit="ms" before="v0.2.0" after="v0.2.1" rows="같은 자릿수|14.6|8.7;자릿수 변동|15.3|11.0" />

| 9자리에서 9자리로, 빌드별 3회 평균           |         `v0.2.0` |           PR #18 |         `v0.2.1` |
| -------------------------------------------- | ---------------: | ---------------: | ---------------: |
| 갱신 태스크 평균                             |           14.6ms |           12.7ms |            8.7ms |
| 갱신당 JS 안의 `UpdateLayoutTree` / `Layout` |      15.2 / 13.3 |        4.0 / 3.0 |        2.2 / 2.2 |
| 갱신당 강제 스타일 재계산과 레이아웃 시간    |            8.0ms |            6.0ms |            2.4ms |
| 페이지 전체 스타일 재계산과 레이아웃         |         28.6ms/s |         26.7ms/s |         26.9ms/s |
| 전체 `FunctionCall` 시간 (하위 작업 포함)    |         15.2ms/s |         13.3ms/s |          9.3ms/s |
| 실행별 갱신 태스크 평균 (ms)                 | 14.5, 14.6, 14.7 | 13.3, 12.5, 12.3 |    8.7, 8.5, 8.8 |
| 실행별 전체 스타일과 레이아웃 (ms/s)         | 28.2, 28.4, 29.1 | 28.4, 25.4, 26.3 | 27.1, 26.3, 27.3 |

| 9자리와 7자리를 번갈아, 빌드별 3회 평균      |         `v0.2.0` |           PR #18 |         `v0.2.1` |
| -------------------------------------------- | ---------------: | ---------------: | ---------------: |
| 갱신 태스크 평균                             |           15.3ms |           13.4ms |           11.0ms |
| 갱신당 JS 안의 `UpdateLayoutTree` / `Layout` |      17.4 / 15.5 |        5.0 / 4.0 |        3.6 / 3.6 |
| 갱신당 강제 스타일 재계산과 레이아웃 시간    |            8.3ms |            6.6ms |            4.1ms |
| 페이지 전체 스타일 재계산과 레이아웃         |         31.2ms/s |         30.3ms/s |         31.9ms/s |
| 전체 `FunctionCall` 시간 (하위 작업 포함)    |         15.8ms/s |         14.0ms/s |         11.6ms/s |
| 실행별 갱신 태스크 평균 (ms)                 | 15.7, 15.2, 15.0 | 13.3, 13.5, 13.5 | 10.9, 10.8, 11.3 |
| 실행별 전체 스타일과 레이아웃 (ms/s)         | 31.8, 32.3, 29.6 | 30.7, 32.6, 27.7 | 31.0, 32.0, 32.6 |

같은 자릿수에서 갱신 태스크 평균은 14.6ms에서 8.7ms로 줄었다. 하지만 JavaScript 바깥의 작업까지 합친 전체 스타일과 레이아웃 시간은 28.6ms/s에서 26.9ms/s로 소폭 줄었다. 자릿수가 바뀔 때는 태스크가 15.3ms에서 11.0ms로 짧아졌어도 전체 스타일과 레이아웃 시간은 31.2ms/s에서 31.9ms/s로 조금 늘었다.

실행마다 편차가 있고 각 빌드를 3회씩만 측정했으므로, 이 작은 차이만으로 전체 성능이 좋아졌거나 나빠졌다고 판단하기는 어렵다. 갱신 호출 안의 반복 계산과 태스크 길이가 줄어든 것은 확인했다. 다만 작업 일부가 이후 렌더링 단계로 미뤄졌을 수도 있으므로, 이 결과를 페이지 전체 렌더링 비용이 같은 비율로 줄었다는 의미로 받아들이면 안 된다.

스타일을 다시 계산한 요소 수에서도 차이가 보였다. 같은 자릿수의 첫 실행에서 `v0.2.0`은 자릿수마다 10이 반복됐다. PR #18은 `0 / 107 / 109 / 73`, `v0.2.1`은 `0 / 107 / 109` 또는 `0 / 107`이었다. `v0.2.1`에서는 갱신당 스타일 재계산이 2회 또는 3회 일어났고, 평균은 2.2회였다. 테스트 모델에서 센 1회와는 차이가 있었다.

요소 수가 0으로 기록된 스타일 갱신 뒤에도 `Layout`은 발생했다. 스타일은 그대로여도 배경 텍스트가 바뀌면 레이아웃을 다시 계산해야 할 수 있다. `willUpdate()`의 첫 읽기가 그 계산을 요구하는 상황과 맞아떨어진다. 나머지 한 번은 DOM을 바꾼 뒤 FLIP에 필요한 최종 좌표를 읽는 과정이다.

같은 자릿수라도 `flush()`가 처음 처리하는 애니메이션 채널이 있으면 커밋 뒤에 값을 더 읽는다. 그래서 첫 갱신을 제외해도 항상 2회가 되는 것은 아니다. 글자가 추가되거나 자릿수가 사라지면 시작 위치나 고정 위치를 재는 단계도 필요하다. 자릿수가 바뀌는 실험에서는 스타일 재계산과 레이아웃 모두 평균 3.6회였다.

두 실험에서 측정한 갱신 태스크는 총 180개다. 문자열은 각 10초 실행을 마치고 1.5초 기다린 뒤 한 번씩 검사했다. `--current`와 `inert`를 바탕으로 DOM에서 최종 문자열을 복원해 `Intl.NumberFormat` 결과와 비교했고, 총 18회 모두 일치했다. 이 검사는 실행이 끝난 뒤의 값만 확인한다. 중간 갱신이나 화면의 픽셀, 애니메이션 도중의 겹침까지 검증한 결과는 아니다.

이번 재현 페이지에서는 변경 전을 포함해 어느 빌드에서도 50ms를 넘는 태스크가 없었다. 따라서 원래 서비스에서 긴 태스크를 줄인 결과와는 구분해서 봐야 한다.

## 값을 바꾸는 동안의 반복 계산을 줄였다

같은 자릿수를 갱신할 때는 DOM을 바꾼 뒤 필요한 측정을 한 단계로 모을 수 있었다. 그래도 이미 바뀐 페이지의 레이아웃을 처음 읽거나, 새로운 애니메이션 채널을 처리하거나, 자릿수가 달라지면 추가 측정이 필요하다. 특히 DOM 변경 후 최종 위치를 구하는 FLIP 측정은 남아 있다. 이 측정까지 없애려면 위치를 미리 계산하거나 측정 시점을 늦추는 등 설계를 더 바꿔야 한다.

0.2.1은 공개 인터페이스를 유지한 패치 릴리스지만 일부 동작도 바뀌었다. 보이지 않는 요소는 사전 측정을 건너뛰고, `animationsfinish`는 엔진이 시작한 애니메이션만 기다린다. 사용자 CSS 애니메이션은 기다리지 않으며, DOM에서 제거된 글자의 진행 중 애니메이션은 계속 기다린다. 이 이벤트를 받은 뒤 다른 작업을 실행하고 있다면 영향을 확인할 필요가 있다. 최종 문자열 검사만으로 애니메이션의 모든 동작이 이전과 같다고 판단할 수는 없다.

PR #19에 기록된 검증 결과를 보면 단위 테스트 61개와 Chromium, WebKit의 selftest 및 SSR e2e 8개를 통과했다. WebKit 16.4(rAF), 17.4와 18.2(네이티브), Chromium 100과 114(rAF)에서도 selftest를 각각 44개씩 실행했다. Firefox는 Playwright 바이너리를 실행하지 못했고, Chromium 66과 80은 Rosetta가 없어 확인하지 못했다. 이번 추가 측정 역시 헤드리스 Chromium 하나에서만 진행했다. 회사 서비스에서 0.2.1을 적용한 뒤의 측정값과 실제 저사양 기기, 다른 브라우저의 성능값은 아직 없다.

2편에서는 애니메이션 재생 중의 비용을 줄였고, 이번에는 값을 바꾸는 순간에 걸리는 시간을 줄였다. 프로파일러에서 오래 걸린 좌표 조회를 따라가 보니, 그전에 DOM을 바꾸던 순서를 고쳐야 했다. 여기에 네이티브 엔진의 사전 측정과 애니메이션 목록 관리를 더해 0.2.1에 반영했다. 변경 코드는 [0.2.1 태그](https://github.com/yceffort/number-flow/tree/v0.2.1)에, 원래 서비스의 측정 조건은 [이슈 #17](https://github.com/yceffort/number-flow/issues/17)과 [PR #18](https://github.com/yceffort/number-flow/pull/18)에 남겨 뒀다.
