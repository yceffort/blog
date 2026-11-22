---
title: '<em>z-index: 1</em>이 Chrome의 레이어 합치기를 느리게 만드는 조건'
tags:
  - browser
  - web-performance
  - debugging
  - algorithm
  - css
published: true
date: 2026-11-21 22:15:00
updated: 2026-11-22 15:22:41
description: 'sticky 탭바에 양수 z-index를 주면 Chrome의 Layerize가 합쳐지지 않는 레이어 수에 비례해 느려진다. 재현 페이지에 조건을 하나씩 더하며 Chromium 159의 레이어 합치기 코드와 맞춰 본다.'
art:
  undraw: building-blocks
---

Chrome은 화면을 그릴 때 페이지 전체를 이미지 한 장으로 만들지 않는다. 칠한(paint) 결과를 합성 레이어 여러 개로 나눠 각각 픽셀로 그려 두고, 화면에 낼 때 이 레이어들을 겹쳐 붙인다. 이렇게 겹쳐 붙이는 일을 합성(compositing)이라고 한다. Chromium 소스의 합성 디렉터리에는 칠한 결과를 레이어로 나누는 알고리즘을 설명한 README가 있고, 설명은 다음 문장으로 끝난다.[^1]

> In the worst case, this algorithm has an O(n^2) running time, where n is the number of `PaintChunks`.

`PaintChunks`(페인트 청크)는 칠한 결과를 Chrome이 레이어에 배정할 때 쓰는 단위다. 레이어를 나눠 두면 opacity 애니메이션이나 스크롤 때 다시 칠하지 않고 레이어만 흐리게 하거나 옮길 수 있지만, 레이어마다 메모리를 따로 쓴다. 그래서 Chrome은 따로 움직일 필요가 없는 청크를 가능하면 앞서 만든 레이어에 합친다. 청크를 칠한 순서대로 하나씩 꺼내, 앞서 만든 레이어를 가장 최근 것부터 거꾸로 확인하며 합칠 곳을 찾는 방식이다. 청크마다 앞의 레이어를 전부 확인하게 되는 경우가 최악이고, 그때 시간은 청크 수의 제곱에 비례한다. DevTools 성능 패널의 메인 스레드에 찍히는 `Layerize`가 이 단계다.

2025년 2월에는 이 최악의 경우를 막는 기능이 들어갔다. 합칠 곳을 찾아 거슬러 올라가는 레이어 수에 상한을 두는 기능이다. 2월 27일에 상한 16이 기본값이 됐지만, 3월 3일에 성능 영향이 불분명하다는 이유로 되돌려졌다.[^2] 그래서 Chrome 159의 기본값으로는 이 상한이 사실상 없다.

이 최악의 경우는 생각보다 흔한 CSS 조합에서 나온다. sticky 탭바에 `z-index: 1`을 주고, 탭바 아래 목록이 페인트 청크로 잘게 나뉘고, 탭바보다 먼저 칠해지면서 다른 레이어와 합쳐지지 않는 작은 합성 레이어(애니메이션이나 `will-change`로 따로 떨어진 요소)가 몇 개 있으면 된다. 세 조건을 갖춘 재현 페이지에서 탭바의 `z-index`를 `auto`에서 `1`로 바꾸면, Layerize 1회 시간이 0.44ms에서 2.08ms로 늘어난다(CPU 4배 감속). 조건 하나만 빠져도 차이는 거의 사라진다.

여기서 잰 것은 Layerize가 레이어 구성을 처음부터 다시 계산하는 전체 경로 1회의 비용이다. Layerize에는 이전 결과를 그대로 쓰고 끝나는 빠른 경로도 있어서, 전체 경로가 얼마나 자주 도는지는 페이지에서 무엇이 바뀌느냐에 달려 있다. 재현 페이지에서는 레이어 하나를 50ms마다 켜고 꺼서 이 경로를 일부러 반복시켰고, 어떤 변경이 이 경로를 일으키는지는 마지막 절에서 따로 쟀다.

> 소스 인용은 Chromium `159.0.8154.13` 태그(커밋 [`4d790f9e`](https://github.com/chromium/chromium/tree/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56))를 기준으로 했다. 측정은 Apple M5, macOS 27.2.1의 Chrome Beta 159.0.8154.13에서 했다.
>
> 재현 페이지와 측정 스크립트는 [blog-experiments `7efb581` sticky-z-index-layerize](https://github.com/yceffort/blog-experiments/tree/7efb581e8c4dab6da12975d1d79129f552caf18c/sticky-z-index-layerize)에 있다. 측정 스크립트는 CDP로 새 탭을 열고 390x844, DPR 3 모바일 화면과 CPU 4배 감속을 건 뒤 페이지를 연다. 4초 기다린 다음 10초 동안 `devtools.timeline`과 `blink` 카테고리로 트레이스를 찍고, 렌더러 메인 스레드의 `Layerize` 가운데 `PaintArtifactCompositor::Update`를 품은 것만 골라 평균을 낸다. 조건마다 3번 재서 중앙값을 썼고, 두 번째 반복은 조건 순서를 뒤집었다. DPR 1 측정만 같은 화면 크기에 DPR을 1로 바꿨다. 거리 제한은 별도 프로필의 Chrome을 플래그와 함께 띄워 쟀다. 레이어 수와 합성 이유는 CDP `LayerTree` 도메인으로 읽었다. 흔한 화면 데모의 수치는 같은 측정 스크립트로 `pattern.html?auto=1`(로드 직후부터 프레임마다 남은 수량을 바꾼다)을 잰 값이다. 숫자 폭 비교는 전체 경로만이 아니라 빠른 경로까지 포함한 `Layerize` 전체의 시간 합계로 비교했다.
>
> 줄을 static으로 둘 수 없는 경우와 숫자 폭 고정 때의 Layout, Paint는 같은 스크립트로 별도 회차(`run-extra.sh`)에 쟀다. 이 회차는 기준 조건의 값이 첫 회차보다 높게 나와서 같은 회차 안에서만 비교했다.
>
> 본문의 데모는 5초 동안 `requestAnimationFrame`마다 레이어 하나를 켰다 끄고, 그 안에서 시작 시각을 담아 `MessageChannel`로 보낸 메시지가 처리될 때까지의 시간을 잰다. 블로그 페이지와 같은 메인 스레드에서 돌기 때문에 위 측정값과 직접 비교할 수는 없다.

## 흔한 화면으로 본 네 가지 조건

코드로 들어가기 전에, 이 비용이 생기는 화면부터 보면 이렇다. 아래는 쇼핑 앱 홈처럼 꾸민 데모다. 화면 안의 번호와 아래 패널의 번호가 같은 조건을 가리키고, 패널에서 조건을 하나씩 끄고 켜 볼 수 있다.

<LiveDemo src="/demos/sticky-z-index-layerize/pattern.html" title="흔한 쇼핑 앱 홈 화면. 아래 패널에서 네 조건을 하나씩 바꾸고 5초씩 측정할 수 있다" height={640} />

1. **화면 위에 붙는 탭바에 `z-index`를 1 이상으로 줬다.** 패널에서 ①을 `auto`로 바꾸고 화면을 스크롤하면 상품 줄이 탭바를 덮는다. 이것을 막으려고 양수 `z-index`를 주는 경우가 많다. `auto`나 `0`이면 이 글의 비용은 생기지 않는다.
2. **탭바 아래 목록의 줄이 `position: relative`다.** 할인 배지를 줄 모서리에 `position: absolute`로 띄우려고 흔히 이렇게 쓴다. 줄마다 말줄임 처리한 상품명이나 둥근 배지처럼 잘리는 영역이 있으면 비용이 생기기 쉽다.
3. **목록보다 위쪽에 깜박이는 작은 요소가 여러 개 있다.** 로딩 스켈레톤은 막대 하나하나가 따로 화면에 합성된다. 개수가 많을수록 비용이 커진다.
4. **화면의 무언가가 자주 바뀐다.** 남은 수량처럼 자릿수가 바뀌는 숫자나, 짧게 시작하고 끝나는 애니메이션이 그렇다. 스크롤만으로는 생기지 않고, 숫자가 바뀌어도 폭이 그대로면 생기지 않는다.

이 화면을 본문과 같은 방법으로 재면 다음과 같다. 남은 수량은 프레임마다 바꿨다.

| 조건                               | Layerize 전체 경로 1회   |
| ---------------------------------- | ------------------------ |
| 네 가지 모두                       | 1.33ms                   |
| ① 탭바 `z-index: auto`             | 0.45ms                   |
| ② 목록 줄 `position: static`       | 0.34ms                   |
| ③ 스켈레톤 막대 8개                | 0.65ms                   |
| ③ 스켈레톤 없음                    | 0.35ms                   |
| ④ 같은 폭으로 갱신(`tabular-nums`) | 돌지 않음(10초 동안 0번) |
| ④ 갱신 없음                        | 돌지 않음(10초 동안 0번) |

이유를 짧게 줄이면 이렇다. 앞에서 설명한 대로 Chrome은 새로 칠한 청크를 레이어에 넣을 때, 앞서 만든 레이어를 가장 최근 것부터 하나씩 확인하며 합칠 곳을 찾는다. 탭바가 목록보다 먼저 칠해지면 이 확인은 탭바에서 끝난다. Chrome은 스크롤에 따라 움직이는 sticky 탭바를 화면 어디와도 겹칠 수 있는 레이어로 보고, 겹치는 레이어를 만나면 확인을 멈추기 때문이다. 그런데 탭바에 양수 `z-index`를 주면 탭바는 칠하는 순서의 맨 마지막으로 밀려난다. 화면에서는 맨 위에 그려지지만 칠하는 순서로는 가장 나중이라, 목록의 청크마다 스켈레톤 막대를 전부 확인하게 된다. 이 확인은 ④처럼 화면이 바뀔 때마다 다시 일어난다.

```text
칠하는 순서     먼저 ---------------------------------------------> 나중
z-index: auto   [스켈레톤 막대 x K] → [탭바] → [줄][줄][줄]...    줄은 탭바에서 확인이 끝난다
z-index: 1      [스켈레톤 막대 x K] → [줄][줄][줄]... → [탭바]    줄마다 막대 K개를 확인한다
```

자기 화면에서 확인하려면 DevTools 성능 패널에서 몇 초 기록한 뒤, 메인 스레드의 `Layerize` 막대가 ④ 같은 변경이 있을 때마다 길게 찍히는지 보면 된다. 아래부터는 단순한 재현 페이지에서 아무 일도 일어나지 않는 상태로 시작해 조건을 하나씩 더하면서, 각 조건이 Chromium 159의 어느 코드와 맞물리는지 살펴본다.

## 아무 일도 없는 페이지

재현 페이지의 뼈대는 다음과 같다. 위쪽에 빨간 점이 K개 있고, 그 아래 section 안에 sticky 탭바와 줄 200개가 있다.

```html
<div class="obst"><i></i><i></i>...</div>
<section id="sec">
  <div class="sticky">tabbar</div>
  <div id="list">
    <div class="row">row 0<b>0</b></div>
    ...
  </div>
</section>
```

```css
.obst {
  position: relative;
}
.obst i {
  width: 8px;
  height: 8px;
  will-change: opacity;
}
.sticky {
  position: sticky;
  top: 0;
  z-index: 1;
}
.row {
  position: relative;
}
.row b {
  position: relative;
  float: right;
}
```

빨간 점은 `will-change: opacity` 때문에 하나하나가 합성 레이어가 된다. 실제 페이지에서는 합성 애니메이션이 걸린 작은 요소나 `will-change`를 단 요소가 이런 레이어가 된다. 줄과 줄 안의 숫자는 둘 다 `position: relative`이고, 목록의 줄이 탭바를 덮지 않도록 탭바에는 양수 `z-index`를 줬다.

측정은 이 페이지를 Chrome Beta 159의 모바일 화면(390x844, DPR 3)에 띄우고 CPU를 4배 감속한 상태에서 했다. 맨 위의 작은 요소에 50ms마다 `will-change: opacity`를 켰다 껐다 해서 레이어 구성이 매번 바뀌게 했다.

Layerize는 다시 칠한 결과를 보고 기존 레이어 구성을 그대로 쓸 수 있는지부터 따진다. 청크 수, 각 청크의 경계와 불투명한 영역, 속성 트리(다음 절에서 설명한다)가 그대로면 이미 만든 레이어의 내용만 갈아 끼우는 빠른 경로로 끝난다. 하나라도 바뀌면 레이어 나누기를 처음부터 다시 하는 전체 경로(`PaintArtifactCompositor::Update`)를 탄다.[^3] 위의 토글 때문에 10초 동안 전체 경로가 200번 돌고, 이 글의 수치는 전체 경로 1회의 평균을 3번 재서 고른 중앙값이다. 측정 방법의 나머지는 글 앞의 인용에 적었다.

첫 상태에서는 빨간 점이 32개 있어도 Layerize 1회가 `z-index: 1`에서 0.11ms, `auto`에서 0.15ms로 차이가 없다.

## 청크를 나누는 조건

Chrome은 칠할 때 픽셀을 바로 찍지 않고, 무엇을 어디에 그릴지를 표시 항목(display item)의 목록으로 기록한다. 이 목록을 다시 페인트 청크로 묶는데, 묶는 기준은 속성 트리(property tree)다. Chrome은 칠하기 전에 페이지의 transform, 잘림(clip), opacity 같은 효과(effect)를 종류별로 트리 세 개에 정리한다. 예를 들어 `transform`이 걸린 요소는 transform 트리에 노드를 하나 만들고, 그 요소의 자손은 모두 그 노드 아래에서 칠해진다. 표시 항목마다 세 트리의 어느 노드 아래에 있는지가 정해지고, 이 세 노드의 조합을 속성 상태라고 부른다. 청크 하나는 같은 속성 상태로 칠해지는 연속된 표시 항목이고, 새 청크는 속성 상태가 바뀌거나 강제될 때만 생긴다.[^4]

```cpp
bool PaintChunker::WillCreateNewChunk() const {
  return will_force_new_chunk_ ||
         current_properties_ != chunks_.back().properties;
}
```

첫 상태의 줄 200개는 모두 같은 속성 상태로 칠해지므로, 측정 조건에서는 청크가 줄 단위로 나뉘지 않았다. 레이어를 합치는 단계가 다룰 청크도 몇 개 되지 않았다. 줄 안의 숫자에 둥근 모서리와 `overflow: hidden`을 주면 사정이 달라진다.

```css
.row b {
  overflow: hidden;
  border-radius: 4px;
}
```

이제 숫자의 안쪽은 클립 노드 아래에서 칠해진다. 줄 이름을 칠할 때와 숫자 안쪽을 칠할 때 속성 상태가 번갈아 바뀌므로 줄마다 청크가 새로 생긴다. 실제 목록에서도 둥근 배지나 말줄임 처리 때문에 줄마다 클립이 생기는 경우가 흔하다.

청크가 나뉘는 경우는 하나 더 있다. 줄과 숫자처럼 positioned인 요소는 몇 가지 조건에서 청크를 강제로 나누는데, 그 가운데 하나가 바로 앞 청크와 합쳤을 때 빈 공간이 너무 커지는 경우다. 이 기준 면적에는 DPR이 들어간다.[^5][^6] 측정 조건인 DPR 3에서는 클립이 없는 줄에서 차이가 없었지만, 같은 페이지를 DPR 1로 열면 클립이 없어도 `z-index: 1`이 0.63ms, `auto`가 0.24ms로 차이가 났다. 숫자를 줄 폭 전체로 늘려 빈 공간을 없애면 이 차이가 사라졌으므로(0.13ms, 0.17ms) 이 규칙이 영향을 줬을 가능성이 높다. 다만 레이어를 합치는 단계에도 DPR이 들어간 비슷한 면적 기준이 있어서, 둘 중 무엇이 영향을 줬는지는 나눠 재지 않았다.

아래 측정은 모두 DPR 3에서 줄마다 클립을 넣은 상태로 했다. 클립만으로는 아직 느려지지 않는다. 빨간 점을 없앤 채 클립을 넣으면 Layerize 1회는 `z-index: 1`에서 0.47ms, `auto`에서 0.39ms다.

## 합쳐지지도 겹치지도 않는 레이어

Layerize의 전체 경로는 청크를 칠한 순서대로 하나씩 꺼내 합성 레이어에 배정한다. 청크 하나는 먼저 `PendingLayer`(아직 확정되지 않은 레이어 후보) 하나가 되고, 바로 앞의 후보부터 거꾸로 거슬러 올라가며 합칠 곳을 찾는다.[^7]

```cpp
    wtf_size_t candidate_index = pending_layers_.size() - 1;
    while (candidate_index > first_layer_in_current_group &&
           pending_layers_.size() - candidate_index <=
               layer_merge_distance_limit_) {
      --candidate_index;
      PendingLayer& candidate_layer = pending_layers_[candidate_index];
      auto merge_result = candidate_layer.Merge(
          new_layer, compositor_.lcd_text_preference_,
          compositor_.device_pixel_ratio_, is_composited_scroll);
      if (merge_result.merged) {
        if (composited_transform &&
            composited_transform->RequiresCompositingForStickyPositionOnly() &&
            candidate_layer.GetPropertyTreeState()
                    .Transform()
                    .NearestDirectlyCompositedAncestor() !=
                composited_transform) {
          merged_sticky_transforms_.push_back(composited_transform);
        }
        pending_layers_.pop_back();
        if (merge_result.scroll_range_dependent) {
          compositor_.AddRangeDependentScroll(
              candidate_layer.GetPropertyTreeState());
        }
        break;
      }
      if (new_layer.MightOverlap(candidate_layer)) {
        new_layer.SetCompositingTypeToOverlap();
        break;
      }
    }
```

거슬러 올라가는 동안 생길 수 있는 일은 세 가지다. 확인한 레이어에 합쳐지면(`merged`) 새 후보는 사라지고 탐색이 끝난다. 합쳐지지는 않지만 그 레이어와 화면에서 겹칠 수 있으면(`MightOverlap`) 새 후보를 별도 레이어로 남기고 탐색을 끝낸다. 새 청크는 그 레이어보다 나중에 칠해졌으니 화면에서는 그 레이어 위에 그려져야 한다. 그런데 더 먼저 만든 레이어까지 넘어가 거기에 합쳐 버리면 겹치는 레이어 아래에 그려져 순서가 뒤집히므로, 겹치는 레이어를 만나면 거기서 멈춘다. 둘 다 아니면 그보다 먼저 만든 레이어로 넘어간다. 탐색 거리는 `layer_merge_distance_limit_`가 제한하는데, 이 값의 기본은 `0x10000000`이라 실제로는 제한이 없다.[^8]

```cpp
BASE_FEATURE(kLimitLayerMergeDistance, base::FEATURE_ENABLED_BY_DEFAULT);
BASE_FEATURE_PARAM(size_t,
                   kLayerMergeDistanceLimit,
                   &kLimitLayerMergeDistance,
                   "limit",
                   0x10000000);
```

빨간 점은 세 번째 경우를 만든다. 점마다 `will-change: opacity` 때문에 effect 트리에 자기 노드를 갖는데, 두 레이어를 합치려면 effect 노드가 같아야 한다.[^9]

```cpp
  if (&GetPropertyTreeState().Effect() != &guest_state.Effect()) {
    return std::nullopt;
  }
```

점은 화면 위쪽에 있어서 목록의 청크와 겹치지도 않는다. 그래서 목록의 청크는 하나하나가 점 K개를 모두 지나친 뒤에야 가장 먼저 만든 페이지 레이어에 합쳐진다. 겹치는지 비교하려면 두 레이어의 사각형을 같은 좌표계로 옮겨야 해서, 비교할 때마다 속성 트리를 두 노드의 공통 조상까지 거슬러 올라간다. 코드 주석은 이 단계의 최악 복잡도를 청크 수, 청크마다의 탐색 횟수, 속성 트리 깊이의 곱으로 적어 두었다.[^10]

```cpp
  // The worst case time complexity of the algorithm is O(pqd), where
  // p = the number of paint chunks.
  // q = average number of trials to find a squash layer or rejected
  //     for overlapping.
  // d = (sum of) the depth of property trees.
```

빨간 점은 이 가운데 탐색 횟수 q를 늘린다. 다만 이 글에서 잰 것은 비교 횟수가 아니라 시간이다. 줄 200개를 고정하고 점 수를 늘려 가며 잰 결과는 다음과 같다.

<BarCompare title="합쳐지지 않는 레이어 수에 따른 Layerize 1회 시간" unit="ms" before="z-index: auto" after="z-index: 1" rows="점 0개|0.39|0.47;점 16개|0.41|1.19;점 32개|0.44|2.08;점 48개|0.44|3.02" />

`z-index: 1`에서는 점이 16개 늘 때마다 0.85ms쯤 늘어난다. 반대로 점을 32개로 고정하고 줄 수를 50, 100, 150, 200개로 바꾸면 `z-index: 1`은 0.62, 1.07, 1.51, 2.08ms로 거의 일정하게 늘고, `auto`는 0.17, 0.32, 0.28, 0.44ms에 머문다. 점 수와 줄 수 어느 쪽으로도 시간이 늘어나는 것은, 청크마다 점 수만큼 비교한다는 소스의 설명과 맞는다. 시간을 잰 결과가 소스에서 추론한 모델과 맞는다는 것이고, 비교 횟수를 센 것은 아니다.

`auto`에서는 점이 48개가 돼도 거의 그대로다. 같은 청크가 같은 점을 지나칠 텐데 `auto`에서는 왜 비용이 생기지 않을까.

<LiveDemo src="/demos/sticky-z-index-layerize/index.html?z=1&k=32&n=200&m=0" title="본문과 같은 줄 200개, 점 32개 조건. 점 수와 탭바 z-index를 바꿔 가며 5초씩 잴 수 있다" height={580} />

데모의 줄과 탭바는 재현 페이지와 같은 크기와 구조다. "5초 재기"를 누르면 매 프레임 레이어 하나를 켰다 끄면서, `requestAnimationFrame`에서 보낸 메시지가 다음 태스크로 처리될 때까지의 시간을 잰다. 렌더링을 포함한 경과 시간의 근사값이라 다른 작업의 대기 시간이 섞일 수 있고, 블로그 페이지와 메인 스레드를 같이 쓰므로 본문의 Layerize 수치와 같은 값이 아니다. 이 글의 조건으로 단독 탭에서 재 보면 데모 값도 트레이스로 잰 Layerize와 같은 순서로 움직였다. 차이가 작게 보이면 점을 128개로 늘리거나 새 탭에서 열면 된다. 앞 절에서 본 것처럼, DPR 1 화면이나 DPR 2에 폭이 넓은 화면에서는 클립을 꺼도 차이가 남는다. 측정은 모두 Chrome에서 했으므로 데모도 Chrome 계열 브라우저에서 여는 것을 전제로 한다.

## 무한대로 잡히는 sticky의 겹침 영역

차이는 탭바에서 나온다. 겹침 판정은 두 레이어가 화면에서 겹칠 수 있는지를 따지는데, sticky 요소는 스크롤에 따라 위치가 바뀐다. Chromium은 이 경우 sticky 요소의 영역을 무한대로 본다.[^11]

```cpp
  if (for_compositing_overlap == ForCompositingOverlap::kYes &&
      (extra_result.has_animation ||
       extra_result.has_sticky_or_anchor_position)) {
    // Assume during the animation, the sticky translation or the anchor
    // position scroll translation can map |rect_to_map| to anywhere during
    // animation or composited scroll. Ancestor clips will still apply.
    // TODO(crbug.com/1026653): Use animation bounds instead of infinite rect.
    // TODO(crbug.com/1117658): Use sticky bounds instead of infinite rect.
    rect_to_map = InfiniteLooseFloatClipRect();
```

`z-index: auto`인 탭바는 빨간 점보다 나중에, 목록의 줄보다 먼저 칠해진다. CSS가 이런 요소를 문서 순서대로 칠하기 때문이고, 자세한 규칙은 다음 절에서 다룬다. 그러면 탭바 다음에 칠해지는 첫 청크는 거슬러 올라가자마자 탭바를 만난다. 탭바와 합쳐지지는 않지만 탭바의 영역이 무한대라 겹치므로, 첫 청크는 별도 레이어로 남고 탐색은 한 번에 끝난다. 다음 청크부터는 바로 앞의 후보가 방금 남은 그 레이어라서 첫 비교에서 합쳐진다.

레이어 목록에도 이 차이가 드러난다. `auto`에서는 레이어 목록의 탭바 레이어 바로 다음에 합성 이유가 "Overlaps other composited content"인 줄 레이어가 하나 생긴다. `z-index: 1`에서는 탭바 다음에 아무 레이어도 없고, 줄은 모두 가장 먼저 만든 페이지 레이어로 돌아가 합쳐진다. 레이어 수는 `auto`가 41개, `z-index: 1`이 40개다. `auto`는 레이어 하나를 더 쓰는 대신 청크마다 탐색이 한 번으로 끝나고, `z-index: 1`은 레이어 하나를 아끼는 대신 청크마다 점 K개를 다시 지나친다.

## 양수 z-index가 바꾸는 칠하는 순서

탭바가 어디에서 칠해지는지는 CSS의 칠하는 순서가 정한다. 쌓임 맥락(stacking context) 하나 안에서는 일반 흐름의 블록과 인라인을 먼저 칠하고, `z-index`가 `auto`나 `0`인 positioned 요소를 문서 순서대로 칠한 다음, `z-index`가 양수인 요소를 값 순서대로 칠한다.[^12] 빨간 점을 담은 `.obst`, 탭바, 줄과 숫자는 모두 positioned 요소이므로, `z-index: auto`인 탭바는 문서 순서에 따라 점과 줄 사이에서 칠해진다.

`z-index`가 양수가 되면 탭바는 마지막 단계로 옮겨 가서 줄을 전부 칠한 다음에 칠해진다. 줄이 탭바를 덮지 않게 하려고 준 양수 `z-index`가, 줄의 청크와 빨간 점 사이에 있던 탭바를 칠하는 순서의 맨 마지막으로 보내는 셈이다. 값이 1이든 201이든 같은 단계이므로 결과도 같다(점 32개에서 `z-index: 201`은 2.05ms). `z-index: 0`은 `auto`와 같은 단계에 남으므로 `auto`와 같다(0.45ms).

다만 `0`이나 `auto`에서는 문서 순서상 뒤에 오는 줄이 탭바보다 나중에 칠해지므로, 탭바가 화면 위에 붙었을 때 줄이 탭바를 덮는다. 처음에 양수 `z-index`를 준 이유가 이것이니, 줄이 positioned인 한 `z-index`를 되돌리는 것은 해법이 되지 못한다. 줄을 positioned가 아니게 바꾸는 방법은 마지막 절에서 다룬다.

## 효과가 절반에 그친 수정

실제 페이지에서는 탭바가 든 section 아래에도 다른 콘텐츠가 이어진다. 재현 페이지에 section 밖의 줄 100개를 붙이고 목록을 100줄로 줄였다. 이 상태에서 `z-index: 1`은 2.04ms, `auto`는 0.40ms다. 여기에 흔히 떠올릴 만한 수정을 하나씩 넣어 봤다.

| 수정                            | Layerize 1회 |
| ------------------------------- | ------------ |
| 없음                            | 2.04ms       |
| section에 `isolation: isolate`  | 1.24ms       |
| 목록에 `will-change: transform` | 1.24ms       |
| 위의 두 가지를 함께             | 0.37ms       |
| section에 `contain: paint`      | 2.58ms       |

`isolation: isolate`는 section을 쌓임 맥락으로 만든다. 그러면 탭바의 `z-index: 1`은 section 안에서만 의미가 있어서, 탭바는 section 안의 줄을 다 칠한 뒤, section 밖의 줄보다는 먼저 칠해진다. section 밖의 줄은 다시 탭바의 무한한 영역과 겹치므로 탐색이 한 번에 끝난다. section 안의 줄은 여전히 탭바보다 먼저 칠해지므로 비용은 절반 정도만 줄어든다.

목록에 `will-change: transform`을 주면 반대쪽 절반이 줄어든다. 이 목록은 transform 트리에 노드를 만들고, 그 노드는 반드시 자기 레이어를 가져야 하는 "직접 합성되는" 노드가 된다. 목록 안의 청크는 모두 이 노드 아래에 놓인다. 이런 노드를 처음 쓰는 청크는 앞의 어떤 레이어와도 합칠 수 없으므로, Layerize는 탐색 없이 바로 새 레이어로 만든다.[^13]

```cpp
    // If the new layer is the first using the nearest directly composited
    // ancestor, it can't be merged into any previous layers, so skip the merge
    // and overlap loop below.
    const auto* composited_transform = new_layer.GetPropertyTreeState()
                                           .Transform()
                                           .NearestDirectlyCompositedAncestor();
    if (composited_transform &&
        !composited_transform->RequiresCompositingForFixedPositionOnly() &&
        !composited_transform->RequiresCompositingForStickyPositionOnly() &&
        directly_composited_transforms_.insert(composited_transform)
            .is_new_entry) {
      continue;
    }
```

목록의 첫 청크는 탐색 없이 새 레이어가 되고, 다음 청크부터는 바로 앞의 그 레이어와 transform이 같아 첫 비교에서 합쳐진다. 이번에는 section 밖의 줄이 탐색을 계속하므로 역시 절반만 줄어든다. 두 수정을 함께 넣어야 `auto`와 비슷한 0.37ms가 된다.

`contain: paint`는 isolation처럼 쌓임 맥락을 만드는데도 효과가 없고, 수정 전보다도 느렸다. `contain: paint`는 section에 클립을 만든다. 앞에서 본 sticky의 무한한 영역에는 "Ancestor clips will still apply"라는 단서가 붙어 있었다. 탭바의 영역이 section 안으로 잘리면서 section 밖의 줄은 더 이상 탭바와 겹치지 않는다. 레이어 목록을 보면 isolation에서는 탭바 다음에 section 밖 줄의 레이어가 생기지만, `contain: paint`에서는 생기지 않는다.

<LiveDemo src="/demos/sticky-z-index-layerize/index.html?z=1&k=32&n=100&m=100" title="본문과 같은 목록 100줄, 아래 100줄, 점 32개 조건. 수정 항목을 바꿔 가며 5초씩 잴 수 있다" height={580} />

## section에 will-change 한 줄

두 수정을 한 줄로 합칠 수도 있다. section에 `will-change: transform`을 주면 section은 쌓임 맥락이 되면서 직접 합성되는 transform 노드도 갖는다. 앞의 두 수정이 하던 일을 한꺼번에 하는 셈이고, Layerize 1회는 0.41ms로 `auto`와 비슷해진다.

대가도 있다. `will-change`는 지정한 속성이 실제 값을 가졌을 때 생길 쌓임 맥락과 containing block을 미리 만든다.[^14] `transform`은 absolute와 fixed 자손의 containing block을 만들기 때문에, section 안에 `position: fixed`인 바텀시트나 토스트가 있다면 화면이 아니라 section을 기준으로 놓인다. section 전체를 담는 합성 레이어도 하나 늘어난다. 목록에 `will-change`를 주는 수정도 성질은 같지만 영향이 목록 안으로 좁다.

## 브라우저 쪽의 거리 제한

글 처음에 말한 거리 제한은 바로 이 탐색을 끊는다. Chrome을 `--enable-features=LimitLayerMergeDistance:limit/16`으로 실행하면 `layer_merge_distance_limit_`가 16이 된다. 이 상태에서 재현 페이지를 다시 재면, 점 32개일 때 2.08ms가 0.44ms로, 48개일 때 3.02ms가 0.43ms로 줄어든다. 레이어는 40개에서 41개가 됐다. 16번 거슬러 올라가도 합칠 곳을 찾지 못한 청크가 별도 레이어로 남고, 다음 청크부터는 그 레이어에 합쳐지기 때문이다. `z-index: auto`일 때 탭바가 하던 일을 거리 제한이 대신 하는 셈이다.

이 기능을 넣은 커밋은 후보 레이어가 많은데 서로 겹치지도 합쳐지지도 않는 경우를 최악으로 꼽았다. 16을 기본값으로 켠 커밋은 상한 8로 시험했을 때 Speedometer 3와 MotionMark에 영향이 없어 보였다고 적었다. 되돌린 커밋은 성능 영향이 불분명하니 영향과 적절한 값을 알 때까지 원래 기본값을 유지하겠다고 적었다.[^2] 재현 페이지에서는 레이어 하나를 더 쓰는 것으로 비용이 사라졌다.

## 실무에서 확인할 것

처음에 본 흔한 화면의 네 가지 조건을 이 글의 용어로 옮기면 이렇다. 콘텐츠가 페인트 청크로 잘게 나뉘어 있고, 그 콘텐츠보다 먼저 칠해진 합성 레이어가 콘텐츠와 합쳐지지도 겹치지도 않는다. 여기에 둘 사이에서 탐색을 끊어 주던 레이어가 칠하는 순서의 맨 마지막으로 밀려나면 비용이 생긴다.

- sticky 요소에 양수 `z-index`가 있고, 그 요소보다 먼저 칠해지는 positioned 콘텐츠가 많다.
- 그 콘텐츠보다 먼저 칠해지는, 화면 일부만 차지하는 합성 레이어가 여러 개 있다. 합성 애니메이션이 걸린 요소, `will-change`를 단 요소, 깜박이는 로딩 스켈레톤이 흔한 예이고, DevTools 레이어 패널에서 개수를 셀 수 있다.
- 콘텐츠가 청크로 잘게 나뉜다. 줄 안의 클립(둥근 모서리와 `overflow: hidden`, 말줄임)이 대표적이다. 재현 페이지에서는 DPR 1 화면에서 클립이 없어도 같은 비용이 나타났다.

그리고 이 비용은 Layerize의 전체 경로가 돌 때만 든다. 같은 페이지(`z-index: 1`, 점 32개, 줄 200개)에서 무엇이 전체 경로를 일으키는지 10초씩 쟀다.

| 변경                                          | 10초 동안 전체 경로 | 1회 평균 |
| --------------------------------------------- | ------------------- | -------- |
| 50ms마다 `will-change` 토글(본문의 측정 방식) | 200번               | 2.08ms   |
| 500ms마다 200ms짜리 opacity 애니메이션 재시작 | 40번                | 2.08ms   |
| 50ms마다 화면 안 줄의 숫자 폭 변경            | 200번               | 2.12ms   |
| 프레임마다 1px 스크롤                         | 0번                 |          |
| 아무것도 바꾸지 않음                          | 0번                 |          |

애니메이션은 시작할 때와 끝날 때 한 번씩 전체 경로를 탔다. 숫자 폭이 바뀌는 텍스트 갱신은 바뀔 때마다 탔는데, 청크의 경계가 바뀌면 빠른 경로를 쓸 수 없기 때문이다. 스크롤만으로는 돌지 않았다. 증상은 성능 패널에서 이런 변경이 있는 프레임마다 메인 스레드의 `Layerize`가 길어지는 것으로 보인다.

나는 웹소켓으로 값을 실시간으로 받는 서비스를 개발한다. 이런 화면에서는 이 비용이 더 커진다. 실시간 갱신이 붙어도 Layerize 1회의 비용은 그대로지만, 전체 경로가 도는 횟수가 갱신 빈도를 따라 늘어나기 때문이다. 흔한 화면 데모에서 남은 수량의 자릿수를 프레임마다 바꾸면 10초에 600번, 즉 프레임마다 전체 경로가 돌았다. 빠른 경로까지 합친 Layerize 총시간은 10초에 789ms로, 1초에 79ms를 Layerize에만 썼다(CPU 4배 감속). 탭바를 `auto`로 두면 같은 조건에서 208ms다. 렌더링은 프레임마다 한 번 일어나므로, 메시지가 프레임보다 자주 와도 이 횟수는 프레임 수를 넘지 않는다. 값이 자주 바뀌는 화면일수록 이 글의 조건이 겹쳤을 때 치르는 비용이 프레임마다 쌓인다.

다만 모든 실시간 갱신이 전체 경로를 타지는 않는다. 같은 데모에서 남은 수량에 `font-variant-numeric: tabular-nums`를 주고 자릿수가 같은 값으로만 바꾸면, 10초 동안 전체 경로가 한 번도 돌지 않았다. 숫자 영역의 폭이 그대로면 청크의 경계가 바뀌지 않아 빠른 경로로 끝나기 때문이다. Layerize 총시간은 `z-index: 1`에서 789ms가 88ms로 89% 줄었고, `auto`에서도 208ms가 98ms로 절반 넘게 줄었다. 폭이 고정되면 `z-index`와 상관없이 빠른 경로만 돌기 때문에 두 값이 비슷해진다. 실시간 화면이라면 `z-index`를 손보기 전에 숫자 폭부터 고정할 수 있는지 살펴볼 만하다.

다만 폭을 고정해서 줄어드는 것은 Layerize뿐이다. 같은 데모(`z-index: 1`)를 별도 회차에서 다시 재면서 Layout과 Paint도 함께 셌다. 자릿수가 바뀌는 갱신과 같은 폭 갱신 모두 10초 동안 Layout은 600번, Paint는 1,200번 돌았고, 시간 합계도 Layout은 377ms와 361ms, Paint는 373ms와 346ms로 비슷했다. 글자가 바뀌었으니 다시 배치하고 다시 칠하는 일은 폭과 상관없이 남는다. 같은 회차에서 Layerize 총시간은 1,221ms에서 177ms로 줄었다. 폭 고정으로 아끼는 것은 레이어 구성을 처음부터 다시 계산하는 비용이고, 이 글의 조건이 겹친 화면일수록 그 비용이 크다.

고치는 방법과 그 대가는 다음과 같다. 수치는 재현 페이지에서 잰 Layerize 1회 시간이다.

| 방법                                              | 재현 페이지                                                                             | 대가                                                                                                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 줄과 줄 안의 요소를 `position: static`으로 바꾼다 | 2.08ms → 0.27ms(`z-index: auto`면 0.28ms)                                               | 줄 안에서 `position: absolute`나 `z-index`로 배치하던 요소를 다른 방식으로 바꿔야 한다                                                              |
| 탭바를 감싼 영역에 `isolation: isolate`           | 2.04ms → 1.24ms, 영역 밖 콘텐츠만 회복                                                  | 영역 안 요소의 `z-index`는 영역 안에서만 순서를 정한다. 영역 밖 요소와의 순서는 영역 자체의 순서를 따르므로 자손의 `z-index`만으로는 뒤집을 수 없다 |
| 목록에 `will-change: transform`                   | 2.04ms → 1.24ms, 목록 안만 회복                                                         | 합성 레이어가 하나 늘고, 목록이 absolute와 fixed 자손의 containing block이 된다                                                                     |
| 위의 두 가지를 함께                               | 2.04ms → 0.37ms                                                                         | 두 대가를 함께 진다                                                                                                                                 |
| 탭바를 감싼 영역에 `will-change: transform`       | 2.04ms → 0.41ms                                                                         | 쌓임 맥락과 containing block이 영역 전체에 생기고, 영역 전체가 합성 레이어 하나가 된다                                                              |
| 합쳐지지 않는 레이어를 줄인다                     | 2.08ms → 0.47ms(점 0개)                                                                 | 애니메이션이나 디자인을 바꿔야 한다                                                                                                                 |
| 갱신되는 숫자의 폭을 고정한다(`tabular-nums`)     | 흔한 화면 데모의 Layerize 총시간 10초 789ms → 88ms(`z-index: 1`), 전체 경로 600번 → 0번 | 자릿수 자체가 바뀌는 갱신에는 이것만으로 부족하다                                                                                                   |
| 탭바를 감싼 영역에 `contain: paint`               | 2.04ms → 2.58ms                                                                         | 효과가 없다                                                                                                                                         |

줄을 static으로 바꾸면 줄이 일반 흐름 단계에서 칠해진다. 빨간 점보다 먼저 칠해지므로 점을 지나칠 일이 없고, 탭바는 `z-index: auto`여도 줄보다 나중에 칠해져 줄 위에 남는다. 양수 `z-index`가 처음부터 필요 없어지는 방법이라 가장 먼저 검토할 만하다.

그런데 줄을 static으로 바꿀 수 없는 경우도 흔하다. 재현 페이지에 그런 경우 세 가지를 더해 같은 방법으로 쟀다. 이 회차는 기준 조건이 `z-index: 1`에서 3.53ms, `auto`에서 0.80ms로 앞의 측정보다 높게 나와서, 아래 표는 같은 회차 안에서만 비교한다.

| 줄의 구성                                        | `z-index: 1` | `z-index: auto` |
| ------------------------------------------------ | ------------ | --------------- |
| 기준(줄과 숫자 `position: relative`)             | 3.53ms       | 0.80ms          |
| 줄과 숫자 `position: static`                     | 0.61ms       | 재지 않음       |
| 줄 static, 숫자를 grid로 겹쳐 오른쪽 위에 배치   | 0.56ms       | 0.62ms          |
| 줄 static, 줄에 `transform: translateX(0)`       | 5.26ms       | 0.77ms          |
| 줄 static, 줄에 `opacity: 0.99`                  | 1.42ms       | 0.68ms          |
| 줄 200개 높이에 보이는 줄 30개만 absolute로 배치 | 0.70ms       | 0.30ms          |

가장 흔한 경우는 할인 배지처럼 줄 모서리에 `position: absolute`로 띄운 요소다. 줄이 배지의 기준이 되려면 positioned여야 한다. 이때는 줄을 `display: grid`로 만들고 줄의 내용과 배지를 같은 grid 영역(`grid-area: 1 / 1`)에 겹친 뒤, 배지를 `justify-self: end`와 `align-self: start`로 오른쪽 위에 붙이면 position 없이 같은 배치가 된다. 재현 페이지에서는 static으로 바꾼 것과 같은 수준으로 줄었고, 그 대신 Layout 합계가 10초에 29ms에서 47ms로 조금 늘었다. 겹치는 순서는 DOM 순서로 정해야 한다. grid 아이템은 `position: static`이어도 `z-index`가 `auto`가 아니면 relative처럼 쌓임 맥락을 만들기 때문이다.[^15]

줄에 `transform`이나 1보다 작은 `opacity`가 걸려 있으면 position을 static으로 바꿔도 소용이 없다. 스와이프로 줄을 밀어 지우거나 줄마다 페이드 효과를 주는 목록이 그렇다. 명세에서는 이런 요소를 `z-index: 0`인 positioned 요소와 같은 순서로 칠한다.[^16] 그래서 줄은 일반 흐름 단계가 아니라 positioned 요소와 같은 단계에서 칠해지고, 양수 `z-index`를 준 탭바는 여전히 줄보다 나중에 칠해진다. 재현 페이지에서도 `z-index: 1`과 `auto`의 차이가 그대로 남았다. transform을 건 줄은 기준 조건보다도 길었는데, 그 이유는 확인하지 않았다.

가상 스크롤 라이브러리는 줄을 absolute와 `top`이나 `transform`으로 배치하므로 줄을 static으로 둘 수 없다. 대신 화면에 보이는 줄만 그리므로 비용을 키우는 청크 수가 처음부터 작다. 줄 200개 높이를 잡아 두고 보이는 줄 30개만 그린 경우 `z-index: 1`과 `auto`의 차이는 남았지만, 줄 200개를 모두 그린 기준 조건보다 훨씬 작았다. 줄을 static으로 둘 수 없다면 표의 나머지 방법 가운데에서 고르면 된다.

영역 밖 콘텐츠를 살리는 방법(isolation과 영역의 `will-change`)은 sticky의 영역을 무한대로 보는 판정에 기대고 있다. 그런데 그 판정 바로 위에는 sticky의 실제 이동 범위를 쓰라는 TODO가 붙어 있다. 이 TODO가 구현되면 탭바의 영역은 감싼 영역 안으로 좁아지고, `contain: paint`에서 본 것처럼 영역 밖 콘텐츠의 탐색이 다시 길어질 가능성이 높다. 줄을 static으로 바꾸거나 합쳐지지 않는 레이어를 줄이는 방법은 이 판정과 상관없이 동작한다. 앞 절의 거리 제한은 페이지가 사용자 브라우저에서 켤 수 있는 설정이 아니다.

sticky 요소의 `z-index`는 탐색을 끊어 주던 레이어를 칠하는 순서의 맨 마지막으로 옮겼을 뿐이다. 그래서 Layerize가 길어졌을 때는 `z-index`부터 의심하기보다, 느려진 콘텐츠보다 먼저 칠해지는 작은 합성 레이어가 몇 개인지 레이어 패널에서 세어 보는 것이 원인에 가장 빨리 닿는 방법이라고 생각한다.

[^1]: [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/compositing/README.md` L31-L32](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/compositing/README.md?plain=1#L31-L32)

[^2]: [Chromium `3fbdbcc6` Feature LimitLayerMergeDistance](https://chromium.googlesource.com/chromium/src/+/3fbdbcc6108fc85ce394288ad813036233ac9c79), [Chromium `728717ef` Set LimitLayerMergeDistance:limit/16 by default](https://chromium.googlesource.com/chromium/src/+/728717eff66457327d5f632fce8c05fdc7fdd66d), [Chromium `eee22cd2` Revert "Set LimitLayerMergeDistance:limit/16 by default"](https://chromium.googlesource.com/chromium/src/+/eee22cd21ec03b98bff4d1ad8d9b142d2df036e1)

[^3]: [Chromium `4d790f9e` `third_party/blink/renderer/core/frame/local_frame_view.cc` L3585-L3595](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/core/frame/local_frame_view.cc#L3585-L3595), [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.h` L140-L150](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.h#L140-L150), [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc` L669-L685](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc#L669-L685), [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc` L568-L584](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc#L568-L584)

[^4]: [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/paint/paint_chunker.cc` L59-L62](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/paint/paint_chunker.cc#L59-L62)

[^5]: [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/paint/paint_chunker.h` L158-L160](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/paint/paint_chunker.h#L158-L160), [Chromium `4d790f9e` `third_party/blink/renderer/core/paint/paint_layer.cc` L2304-L2305](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/core/paint/paint_layer.cc#L2304-L2305)

[^6]: [Chromium `4d790f9e` `third_party/blink/renderer/core/paint/paint_layer_painter.cc` L272-L283](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/core/paint/paint_layer_painter.cc#L272-L283)

[^7]: [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc` L949-L978](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc#L949-L978)

[^8]: [Chromium `4d790f9e` `third_party/blink/common/features.cc` L957-L962](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/common/features.cc#L957-L962)

[^9]: [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/compositing/pending_layer.cc` L437-L439](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/compositing/pending_layer.cc#L437-L439)

[^10]: [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc` L860-L864](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc#L860-L864)

[^11]: [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/paint/geometry_mapper.cc` L284-L292](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/paint/geometry_mapper.cc#L284-L292)

[^12]: [CSS 2.2 Appendix E. Elaborate description of Stacking Contexts](https://www.w3.org/TR/CSS22/zindex.html)

[^13]: [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc` L930-L942](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc#L930-L942)

[^14]: [w3c/csswg-drafts `e8a75fa0` `css-will-change-1/Overview.bs` L296-L303](https://github.com/w3c/csswg-drafts/blob/e8a75fa0ddea1a9aae4fe01098f39f92102e7cb0/css-will-change-1/Overview.bs?plain=1#L296-L303)

[^15]: [w3c/csswg-drafts `e8a75fa0` `css-grid-1/Overview.bs` L1232-L1237](https://github.com/w3c/csswg-drafts/blob/e8a75fa0ddea1a9aae4fe01098f39f92102e7cb0/css-grid-1/Overview.bs?plain=1#L1232-L1237)

[^16]: [w3c/csswg-drafts `e8a75fa0` `css-color-4/Overview.bs` L4651-L4655](https://github.com/w3c/csswg-drafts/blob/e8a75fa0ddea1a9aae4fe01098f39f92102e7cb0/css-color-4/Overview.bs?plain=1#L4651-L4655), [w3c/csswg-drafts `e8a75fa0` `css-transforms-1/Overview.bs` L319](https://github.com/w3c/csswg-drafts/blob/e8a75fa0ddea1a9aae4fe01098f39f92102e7cb0/css-transforms-1/Overview.bs?plain=1#L319)
