---
title: '블로그의 JavaScript가 언제 실행되는지 추적해보기'
tags:
  - web-performance
  - bundler
  - blogging
  - debugging
  - rust
published: true
date: 2026-09-22 18:00:00
description: '추석맞이 뻘짓 대작전 1탄: 내 블로그 부터 살펴보기'
series: 'coldpath 제작기'
seriesOrder: 1
art:
  undraw: data-analysis
  layout: contours
  hue: warm
  tone: light
  hero: '393KB'
---

## Table of Contents

## 393KB의 미실행 코드, 어디까지 줄일 수 있을까

[지난 글](/2026/09/unused-javascript-cost)에서는 호출하지 않는 JavaScript를 10MiB까지 늘렸다. 함수 본문을 실행하지 않아도 전송과 소스 처리에 비용이 들었다. 이번에는 실험용 파일 대신 이 블로그의 번들을 보고 싶었다. 어떤 코드가 지금 필요하지 않고, 그 코드는 어디에서 들어왔을까.

프로덕션 빌드의 첫 화면에서 실행 기록을 수집했다. 기록이 있는 JavaScript는 13개, 압축 전 672,025B였다. 그중 실행되지 않은 구간이 393,540B, 약 58.6%였다.

그런데 이 숫자를 원본 파일로 돌려놓자 서로 다른 문제가 섞여 있었다. 소개 페이지의 컴포넌트는 페이지에 방문하기 전에 내려와 있었다. 검색 라이브러리는 검색창을 열기도 전에 들어와 있었다. 검색을 마친 뒤에도 검색 라이브러리의 절반 이상이 미실행으로 남았다.

소개 페이지의 코드는 링크 prefetch 때문이었다. 검색 라이브러리는 공통 레이아웃의 정적 import 때문이었다. 검색 후에도 남은 코드에는 브라우저에서 호출하지 않은 인덱스 생성과 수정 API가 있었다. 모두 커버리지에서는 같은 미실행 구간이지만, 수정할 위치와 판단에 필요한 정보는 달랐다.

이 구분을 자동으로 집계하려고 Rust 분석기 [coldpath](https://www.npmjs.com/package/@yceffort/coldpath)를 만들었다. 같은 미실행 구간이라도 다음 페이지 이동에 필요한 코드와 검색할 때까지 늦출 코드, 사용 중인 라이브러리에 함께 묶인 API는 고치는 방법이 달랐다.

비교용 복사본에서 검색 라이브러리의 로딩 시점을 바꾸자 첫 화면의 인코딩된 JS 본문은 5,643B 줄었고, 첫 검색까지 받은 JS는 194B 늘었다. 실제 블로그에는 다이어그램 확대 라이브러리까지 함께 늦춰 적용했고, 변경 전후 빌드를 비교하니 다이어그램이 있는 글의 첫 화면에서 JS 본문이 12,362B 줄었다. 검색 대기 시간은 큰 인덱스 응답의 영향을 받아, 이 조건만으로 추가 청크 요청의 손익을 판단하기 어려웠다. 어떤 코드를 줄이려는지에 따라 변경 위치를 고르고, 전달량과 대기 시간에서 확인한 결과를 구분해야 했다.

분석기는 [yceffort/coldpath](https://github.com/yceffort/coldpath)에 공개했고, npm에는 [`@yceffort/coldpath`](https://www.npmjs.com/package/@yceffort/coldpath/v/0.3.1)로 배포했다. 첫 화면과 후속 동작의 실행 기록을 비교하고, 번들에 포함된 원본 파일과 import 경로를 함께 볼 수 있는 도구다. 이 글에서는 도구를 만든 이유와 블로그에서 확인한 결과, 실행 방법을 다루고, 실행 범위와 소스맵을 결합하는 구현은 [2부](/2026/09/building-coldpath-v8-coverage-analyzer)에서 이어간다.

> 기준: 홈 화면 실험은 [블로그 커밋 `7f33d3bc`](https://github.com/yceffort/blog/tree/7f33d3bccd6ebc71d7c26c07a2527ced07846c3b/experiments/bundle-trace)의 초기 분석기(당시 이름 `bundle-trace`)로, 9월 25일 적용 결과는 [coldpath 커밋 `24a1a99`](https://github.com/yceffort/coldpath/tree/24a1a995443dc494926e9d841091e32ac7c52860)로 계산했다. 설치와 실행 명령은 `@yceffort/coldpath@0.3.1` 기준이다.

> 이 글의 수치가 말해 주지 않는 것: 미실행은 관찰한 시나리오에서 실행되지 않았다는 뜻이며, 지워도 된다는 뜻은 아니다. 바이트는 생성 코드의 UTF-8 크기이며 전송량이나 CPU 시간이 아니다. 원본별 크기는 소스맵으로 배분한 추정이다. 시나리오 몇 개로 실행 범위를 조사한 것이어서 통계적 성능 벤치마크도 아니다.

## coldpath를 직접 만든 이유

먼저 이미 있는 도구부터 짚어야 한다. [source-map-explorer](https://github.com/danvk/source-map-explorer#code-coverage-heat-map)는 소스맵으로 번들 기여도를 보여주고 `--coverage`로 Chrome의 실행 기록을 겹친다. [monocart-coverage-reports](https://github.com/cenfun/monocart-coverage-reports)는 V8 바이트 통계와 소스맵 변환을 지원한다. [c8](https://github.com/bcoe/c8#c8-report)도 저장된 기록으로 보고서를 다시 만들 수 있다. 수집과 분석의 분리 자체가 새로운 기능은 아니다.

그럼에도 직접 만든 이유는 이 계산을 Node 없이 실행되는 Rust 프로그램으로 옮겨보고 싶었기 때문이다. 기존 도구가 어떤 위치를 세는지 이해하고, 같은 입력에서 일치하는 부분과 내가 다르게 정한 부분을 확인하는 것이 목표였다. 도구 사이의 속도 비교는 이 시리즈에서 다루지 않는다.

만들면서 이 블로그를 조사하는 데 필요했던 기능도 몇 가지 더했다.

- 실행 기록이 없는 코드를 미실행과 섞지 않고 **미측정**으로 따로 센다. 뒤에서 다시 나오지만, 이 구분이 없으면 이미 지연 로딩하도록 나눈 청크가 수정 후보의 맨 위로 올라온다.
- `collect` 수집기는 브라우저가 읽은 JS와 소스맵의 SHA-256을 기록에 함께 남기고, 분석할 때 다른 빌드의 기록이면 거부한다.
- 첫 진입과 검색, 확대 같은 후속 동작을 시나리오로 나눠 어떤 코드가 어느 동작에서 처음 실행됐는지 보여준다. esbuild, webpack, Rollup/Vite, Turbopack의 번들러 그래프를 함께 넣으면 그 코드가 들어온 import 경로와 `split-review` 같은 검토 제안도 표시한다.
- 이전 빌드의 보고서를 `--baseline`으로 넘기면 원본별 변화를 비교하고, CI에서 생성 코드나 첫 진입 미실행량이 늘어나는 한도를 검사할 수 있다.
- 소스맵이 없는 외부 사이트도 저장한 스크립트에서 webpack 모듈 경계를 복원해 분석한다. 이 기능으로 토스증권을 분석한 결과는 [3부](/2026/09/tracing-third-party-javascript-without-sourcemaps)에서 다룬다.

결과는 서버 없이 브라우저에서 바로 열리는 HTML 보고서 하나로 남는다.

## 첫 화면에 소개 페이지 코드가 들어온 경로

9월 22일 홈 화면에서 기록한 미실행 구간 393,540B를 원본별로 나눠봤다. 처음 원본별 미실행 목록을 봤을 때 `AboutHero.tsx`, `TableOfContents.tsx`, `Mermaid.tsx`가 눈에 들어왔다. 홈에는 소개 페이지의 화면도, 글 본문의 목차도 없다. 공통 번들에 잘못 합쳐진 것일까.

요청 헤더를 함께 기록하자 `next-router-prefetch: 1`인 RSC(React Server Components) 요청이 보였다. `/about`뿐 아니라 글 페이지로 가는 요청도 있었다. [Next.js의 자동 prefetch](https://nextjs.org/docs/app/guides/prefetching)는 프로덕션에서 동작하며 화면에 들어온 링크의 다음 이동을 준비한다. 개발 서버에서 홈의 컴포넌트 트리만 봐서는 이 경로를 놓치기 쉽다.

같은 빌드를 새 브라우저에서 열되, 해당 헤더가 있는 요청만 차단해 다시 수집했다. 원래 설정에서 기록된 네 개의 JS 청크가 이 조건에서는 사라졌다.

| 첫 화면 시나리오   | 기록이 있는 JS | 압축 전 JS | 미실행 구간 |
| ------------------ | -------------: | ---------: | ----------: |
| prefetch 허용      |           13개 |   672,025B |    393,540B |
| prefetch 요청 차단 |            9개 |   607,873B |    343,559B |
| 차이               |            4개 |    64,152B |     49,981B |

prefetch를 차단하자 `AboutHero`, 목차, Mermaid 컴포넌트는 미실행에서 미측정으로 옮겨갔다. 코드는 빌드에 남아 있고, 그 시나리오에서 실행 기록이 사라진 것이다.

소개 페이지로 실제 이동하는 시나리오도 수집했다. 홈에서는 `AboutHero.tsx`에 귀속된 3,449B 중 23B만 실행 상태였지만, 소개 페이지로 이동한 뒤에는 3,449B 모두 실행 상태가 됐다. 홈의 빨간 구간만 보고 컴포넌트를 제거했다면 다음 화면의 기능을 지운 셈이다.

표에는 흥미로운 차이도 있다. JS는 64,152B 줄었는데 미실행 구간은 49,981B만 줄었다. 사라진 네 청크 자체의 미실행 구간은 63,443B였다. 나머지 차이는 공통 스크립트에서 생겼다. prefetch를 수행한 시나리오에서는 공통 코드의 실행 구간이 13,462B 더 넓었다.

```text
사라진 청크의 미실행량 63,443B
  - prefetch로 추가 실행된 공통 코드 13,462B
  = 미실행 합계 차이 49,981B
```

전달량과 미실행 합계가 일대일로 움직이지 않는 실제 사례다. 더 많은 동작을 수행하면 같은 파일에서도 미실행량이 줄어든다. 그러므로 미실행 비율을 줄이는 것 자체를 성능 목표로 삼을 수는 없다.

64KB의 비용은 확인했지만 그 대가로 다음 이동이 얼마나 빨라졌는지는 재지 않았으므로, prefetch를 끄자는 결론까지 가지는 않았다. 여기서 확인한 것은 홈에 필요하지 않은 코드가 들어온 **원인**이다.

## 검색 후에도 미실행으로 남는 MiniSearch의 62%

MiniSearch는 달랐다. prefetch를 차단해도 같은 양이 첫 화면에 들어왔다. 소스맵에서 `MiniSearch.ts`, `SearchableMap.ts`, `TreeIterator.ts`, `fuzzySearch.ts`를 같은 패키지로 모으면 17,080B였다.

검색창을 열고 `javascript`를 입력해 결과 20개가 표시될 때까지 실행해봤다.

| 기본 빌드의 MiniSearch |    전체 | 실행 관찰 |  미실행 |
| ---------------------- | ------: | --------: | ------: |
| 홈에 진입만 함         | 17,080B |      579B | 16,501B |
| 검색 결과까지 표시     | 17,080B |    6,425B | 10,655B |

검색을 했는데도 약 62.4%가 미실행이다. "기능을 한 번 사용했으니 라이브러리가 대부분 실행될 것"이라는 예상도 맞지 않았다.

이번에는 원본 파일 단위에서 멈추지 않고 해당 청크의 V8 함수 기록을 읽었다. 축소된 코드에서도 다음 메서드 이름은 남아 있었다. 아래 크기는 소스맵으로 배분한 크기가 아니라 **해당 함수의 V8 범위를 생성 문자열에서 직접 잘라 센 값**이다. 그 안에서 호출한 다른 메서드는 포함하지 않으므로 검색 기능 전체의 크기로 볼 수는 없다.

| 메서드        | 생성 코드 크기 | 검색 시나리오 호출 횟수 |
| ------------- | -------------: | ----------------------: |
| `loadJS`      |           385B |                       1 |
| `search`      |           380B |                       1 |
| `add`         |           586B |                       0 |
| `remove`      |           731B |                       0 |
| `autoSuggest` |           330B |                       0 |
| `toJSON`      |           448B |                       0 |

이 블로그는 서버에서 인덱스를 만든다. 서버 쪽 코드가 `addAll()`로 문서를 넣고 `toJSON()`으로 직렬화한다. 브라우저에서는 이미 만들어진 인덱스를 `loadJS()`로 읽어 `search()`를 호출한다. 그런데 클라이언트에 들어온 MiniSearch 클래스에는 문서를 추가하거나 삭제하고 인덱스를 직렬화하는 메서드도 남아 있었다.

동적 속성 접근으로 어떤 메서드든 호출될 수 있다면 번들러가 메서드를 남길 이유가 된다. 이번 결과도 그 때문인지 구분하려면, 동적 접근을 없앤 최소 입력에서 같은 보존이 발생하는지 확인해야 했다.

### 클래스 메서드의 트리 셰이킹 경계

블로그에서 사용한 것과 같은 Next.js 16.3.5/Turbopack 버전으로 작은 별도 앱을 만들었다. StyleX나 블로그 코드는 넣지 않았다. `search()`와 `add()`는 각각 고유 문자열만 반환하게 하고, 클라이언트 버튼에서는 `search()`만 호출했다. `add()` 본문의 문자열이 생성된 클라이언트 JS에 남는지 검사했다. 소스맵에는 제거된 코드의 원본도 들어갈 수 있으므로 `.map` 파일은 검색 대상에서 제외했다. esbuild 0.25.12에서도 같은 입력 형태를 따로 번들링했다.

| 입력 형태                                                      | Turbopack의 `add()` 본문 | esbuild의 `add()` 본문 |
| -------------------------------------------------------------- | ------------------------ | ---------------------- |
| `search`, `add`를 각각 named export, `search`만 import         | 제거                     | 제거                   |
| `Search` 클래스를 import하고 `new Search().search()`           | 유지                     | 유지                   |
| 외부 값으로 정한 메서드 이름으로 `new Search()[method]()` 호출 | 유지                     | 유지                   |
| `search`만 import하고 별도 `Unused` 클래스는 사용하지 않음     | 제거                     | 제거                   |
| import 없이 호출 파일에 클래스를 선언하고 `.search()`          | 유지                     | 유지                   |

직접 호출한 경우에도 인스턴스를 밖으로 넘기지 않았고 계산된 속성 접근도 없었지만 `add()`는 남았다. 사용하지 않은 named export와 클래스 전체는 사라졌다. **이 도구 체인은 export나 클래스 단위로는 코드를 제거하지만, 사용 중인 클래스의 개별 메서드까지 제거하지는 않았다.**

그래서 앱에서 `search()`만 호출하도록 줄여도 편집용 메서드가 빠질 것이라고 기대하기는 어렵다고 생각한다. API를 개별 export로 나누면 결과가 달라졌지만, MiniSearch처럼 내부 상태를 공유하는 라이브러리를 그렇게 나눌 수 있는지는 별개의 작업이다. 입력과 출력은 `results/class-shaking.json`, 재현 스크립트는 `scripts/study-class-shaking.mjs`에 남겼다.

여기서 수정 방향은 두 개로 갈렸다. 전체 라이브러리를 **검색할 때까지 늦추는 일**은 지금 앱에서 할 수 있다. 브라우저에서 필요 없는 인덱스 편집 API를 **라이브러리에서 떼어내는 일**은 다른 설계와 검증이 필요하다. 한 번의 검색 기록만으로 후자의 코드를 삭제하지는 않았다.

## 정적 import를 옮긴 뒤 실제로 줄어든 양

MiniSearch가 첫 화면으로 들어온 import 경로는 저장소 코드에서 확인했다.

```text
LayoutWrapper.tsx
  → SiteSearch.tsx
    → minisearch
```

소스맵은 이 그래프를 알려주지 않는다. 9월 22일 구현에는 esbuild metafile을 읽는 선택 기능만 있어서, Turbopack으로 빌드한 이 경로는 직접 코드를 읽어 추적했다. 이후 coldpath에는 Turbopack 분석 결과에서 import 그래프를 가져오는 기능도 추가했다.

`SiteSearch`는 검색 인덱스를 클릭할 때 받아오고 있었다. 하지만 파일 맨 위에서 라이브러리를 정적으로 가져왔다.

```tsx
import MiniSearch from 'minisearch'

// 검색창을 열 때 실행
const res = await fetch('/api/search-index')
const data = await res.json()
setIndex(MiniSearch.loadJS<SearchDoc>(data.index, miniSearchOptions))
```

데이터를 늦게 받는 것과 라이브러리를 늦게 받는 것이 분리돼 있었다. 비교를 위해 앱의 복사본을 만들고 같은 소스 경로에서 기본 빌드와 변경 빌드를 만들었다. 변경한 부분은 타입 import를 남기고, 라이브러리 import를 인덱스 요청과 함께 시작하는 것이다. 아래는 오류 처리 등을 생략한 핵심 부분이다.

```tsx
import type MiniSearch from 'minisearch'

const [{default: MiniSearch}, res] = await Promise.all([
  import('minisearch'),
  fetch(locale === 'en' ? '/api/search-index/en' : '/api/search-index'),
])
const data = await res.json()
if (data.index) {
  setIndex(MiniSearch.loadJS<SearchDoc>(data.index, miniSearchOptions))
}
```

`import`가 끝나기를 기다린 다음 `fetch`를 시작할 이유는 없다. 두 요청은 서로의 결과를 사용하지 않는다. 필요한 시점에 동시에 시작하고, 인덱스를 복원할 때 둘 다 준비되어 있으면 된다.

변경 빌드의 첫 화면에서는 MiniSearch가 전부 미측정이었다. 네트워크 기록에서도 검색 전에는 해당 청크를 받지 않았고, 검색 시점에 새 JS 요청 한 개가 생겼다. 검색 결과가 같은 순서로 나오는지도 확인했다.

| JS 응답 본문                                   | 기본 빌드 | 동적 import 빌드 |
| ---------------------------------------------- | --------: | ---------------: |
| 홈에서 받은 JS, 압축 해제 후                   |  672,025B |         654,518B |
| 홈에서 받은 JS, 인코딩된 응답 본문             |  211,332B |         205,689B |
| 첫 검색에서 추가로 받은 JS, 압축 해제 후       |        0B |          17,766B |
| 첫 검색에서 추가로 받은 JS, 인코딩된 응답 본문 |        0B |           5,837B |

네트워크 수치는 Resource Timing의 `decodedBodySize`와 `encodedBodySize`다. HTTP 헤더를 포함한 전송 총량이나 패키지별 gzip 추정치가 아니다.

첫 화면에서 줄어든 양은 압축 전 17,507B, 인코딩된 본문 기준 5,643B였다. 소스맵이 MiniSearch에 귀속한 17,080B와도 다르다. 분리 후에는 청크 경계와 생성 코드가 달라지므로 패키지 귀속 크기를 그대로 개선량으로 옮겨 쓸 수 없다.

검색까지 하는 방문자는 이야기가 달라진다. 변경 빌드에서 받은 JS 본문을 모두 더하면 211,526B다. 기본 빌드의 211,332B보다 194B 많다. 전체 빌드의 압축 전 JS도 7,246,076B에서 7,246,335B로 259B 늘었다. 이번 변경은 코드를 제거한 것이 아니라 **전달 시점을 바꾼 것**이다.

단순한 모델로 쓰면 검색하는 방문자의 비율이 p일 때, 새 방문 한 번의 JS 본문 차이는 다음과 같다.

```text
동적 import 빌드 - 기본 빌드
  = -5,643B + p × 5,837B
```

검색하지 않으면 5,643B를 아끼고, 모두 검색하면 194B가 더 든다. 재방문 캐시와 다른 페이지 이동, CPU 비용이 빠진 단순한 모델이고 실제 p도 재지 않았다. 그래도 미실행률만으로는 나오지 않는 판단 기준이 생긴다. 모든 방문자에게 보내던 비용을 검색하는 방문자에게 옮길 것인가.

검색 대기 시간은 별개의 문제였다. 로컬 `next start`에서 받은 검색 인덱스는 3,775,467B였고 압축이 적용되지 않았다. 라이브러리 청크보다 훨씬 큰 입력이어서, JS 본문 5.6KB가 줄었다는 사실만으로 첫 검색이 빨라졌다고 말하기는 어렵다.

커버리지를 끈 별도 측정에서는 CPU 4배 감속, 다운로드 1.6Mbps, 지연 설정 150ms를 적용하고 두 빌드를 번갈아 4회씩 실행했다. 클릭 이벤트부터 검색 결과 DOM이 추가될 때까지의 중앙값은 기본 빌드 20,019ms, 변경 빌드 20,056.9ms였다. 인덱스 응답에는 두 빌드 모두 약 19.2초가 걸렸다. [저장한 요청별 기록](https://github.com/yceffort/blog/blob/7f33d3bccd6ebc71d7c26c07a2527ced07846c3b/experiments/bundle-trace/results/study-timing.json)에서 추가 JS 청크는 요청 시작부터 응답 완료까지 약 241~247ms가 걸렸고, 인덱스 요청과 병렬로 진행됐다.

19초가 넘는 인덱스 전송 안에 추가 청크 요청이 묻혔으므로, 이 결과로는 동적 import가 더한 대기가 얼마인지 알 수 없다. 인덱스가 압축되거나 캐시에 있는 조건에서 라이브러리 로딩과 인덱스 준비가 끝나는 시점을 비교해야 손익을 판단할 수 있을 것이다.

> 위 홈 화면 비교 실험은 2026년 9월 22일 로컬 macOS에서 수행했다. 비교 앱은 Next.js 16.3.5/Turbopack으로 빌드했고, Chromium 153.0.8010.12와 Playwright 1.63.0으로 수집했다. 화면은 1280×900이며 각 커버리지 시나리오는 새 브라우저에서 시작했다. 홈은 `networkidle` 이후 1초, 검색은 결과 표시까지, 소개 페이지는 이동 후 `networkidle`과 추가 1초까지 관찰했다. 서비스 워커와 외부 출처 요청은 차단했고 Chrome DevTools Protocol(CDP)의 페이지 target만 수집했다. 이 수치는 비교용 복사본에서 얻었다.

## 실제 블로그에 적용한 뒤

9월 25일에는 블로그의 [MiniSearch를 검색창을 열 때 가져오도록](https://github.com/yceffort/blog/commit/42e9afa6257dec0b3d9324449158574940175f2b) 바꾸고, [Panzoom도 다이어그램 확대창을 열 때 가져오도록](https://github.com/yceffort/blog/commit/cb27fb0afbf1352e13112680cf1372310f8a362a) 바꿨다. 그리고 Mermaid 다이어그램이 있는 글에서 첫 진입, 검색 결과 표시, 다이어그램 확대를 각각 새 브라우저에서 기록했다. 검색은 결과 DOM이 나타날 때까지, 확대는 Panzoom이 적용된 뒤 확대 버튼을 누를 때까지 기다렸다. 클릭 직후에 기록을 끝내면 의존성을 불러오는 도중의 상태가 남을 수 있기 때문이다.

이 동작을 Playwright 코드로 남겨 두면 빌드를 바꾼 뒤에도 같은 절차로 수집할 수 있다. 새로 수집할 때는 Playwright가 필요하므로 프로젝트에 `@yceffort/coldpath@0.3.1`과 `playwright@1.63.0`을 설치하고 Chromium을 준비한 뒤 `npx @yceffort/coldpath collect`를 쓴다. [빌드와 수집 명령, 시나리오 코드](/demos/coldpath/blog-reproduction-2026-09-25.md)는 별도 재현 문서에 모았다.

원본 파일별 실행량은 다음과 같았다. 앞의 홈 화면 실험과는 대상 페이지와 빌드가 다르다.

| 원본 파일        | 첫 진입의 실행 관찰 | 검색의 실행 관찰 | 확대의 실행 관찰 |
| ---------------- | ------------------: | ---------------: | ---------------: |
| `SiteSearch.tsx` |                837B |           4,181B |             837B |
| `MiniSearch.ts`  |              미측정 |           4,341B |           미측정 |
| `Mermaid.tsx`    |              2,591B |           2,591B |           4,439B |
| `panzoom.es.js`  |              미측정 |           미측정 |           3,357B |

MiniSearch와 Panzoom은 첫 진입에서 미측정이고 각자의 동작에서만 실행됐다. 보고서도 두 파일에 첫 진입을 측정해 보라는 `measure-initial`을 표시했다. 초기 네트워크 요청이 없었다는 것까지는 커버리지만으로 알 수 없으므로, 실제 `import()` 위치와 네트워크 요청을 함께 봐야 한다.

`SiteSearch.tsx`는 검색 버튼을 포함하므로 첫 화면에서도 837B가 실행된다. import 그래프를 넣은 보고서의 `Review actions`에는 `LayoutWrapper.tsx → SiteSearch.tsx`라는 정적 import 경로와 함께 기능 분리를 검토하라는 `split-review`가 표시됐다. 이 파일까지 늦추려면 버튼과 검색창 구현을 어디서 나눌지부터 정해야 한다. `MiniSearch.ts`의 4,341B도 해당 원본 파일에 귀속한 실행량이지 전송량은 아니다. 전송량은 변경 전후 빌드의 응답 본문으로 따로 쟀다.

### 변경 전후의 응답 본문

두 커밋의 바로 앞인 `27fc9749`와 두 커밋을 모두 반영한 `cb27fb0a`를 각각 프로덕션 빌드했다. 두 리비전의 차이는 `SiteSearch.tsx`와 `Mermaid.tsx` 두 파일뿐이다. 앞의 홈 화면 실험과 같은 방식으로 Resource Timing의 `encodedBodySize`를 더했다.

| 인코딩된 JS 응답 본문           |  변경 전 |  변경 후 |     차이 |
| ------------------------------- | -------: | -------: | -------: |
| 홈 첫 화면                      | 211,574B | 202,566B |  -9,008B |
| 다이어그램 글 첫 화면           | 425,101B | 412,739B | -12,362B |
| 글에서 검색할 때 추가로 받은 JS |       0B |   5,766B |  +5,766B |
| 글에서 확대할 때 추가로 받은 JS |       0B |   3,642B |  +3,642B |

검색하는 방문자는 변경 후 418,505B를 받아 변경 전보다 6,596B 적고, 확대하는 방문자는 416,381B로 8,720B 적다. 복사본 실험에서는 검색하는 방문자가 194B를 더 받았는데, 이번에는 Panzoom을 함께 늦춘 효과가 남아 있기 때문이다. 검색과 확대를 모두 하는 방문자는 두 청크를 더해 422,147B로 계산되며, 이 조합은 따로 재지 않았다. 압축 해제 후 크기로는 글 첫 화면에서 35,813B가 줄었다. 원자료는 [측정 결과 JSON](/demos/coldpath/applied-2026-09-26.json)과 [측정 스크립트](/demos/coldpath/measure-applied-2026-09-26.md)에 남겼다.

> 2026년 9월 26일 로컬 macOS에서 Next.js 16.3.5의 `next start`로 두 빌드를 띄워 측정했다. Chromium 153.0.8010.12와 Playwright 1.63.0, 화면 1280×900을 사용했고, 매번 새 브라우저 컨텍스트에서 HTTP 캐시 없이 시작했다. 서비스 워커와 외부 출처 요청은 차단하고 prefetch는 켜 두었다. 페이지는 `networkidle` 뒤 1초, 동작 뒤에도 `networkidle`과 1초를 더 기다렸다. 두 빌드를 번갈아 3회씩 실행했고 바이트는 매번 같았다. 응답 압축은 로컬 서버의 설정이어서 CDN의 압축 결과와는 다를 수 있다.

같은 두 빌드에서 앞의 세 시나리오로 커버리지도 다시 수집했다. 변경 전 보고서를 `--baseline`으로 넘겨 변경 후 보고서를 만들면 같은 변화를 원본 파일 단위로 볼 수 있다. 첫 진입에서 `MiniSearch.ts`는 변경 전에 523B만 실행되고 13,043B가 미실행으로 남아 있었는데, 변경 후에는 13,590B 전체가 미측정이 됐다. `panzoom.es.js`도 변경 전 첫 진입에서 818B가 실행되던 상태에서 미측정으로 바뀌었다. 검색과 확대 시나리오에서 두 파일의 실행량은 거의 같았다(`MiniSearch.ts` 4,317B와 4,341B, `panzoom.es.js` 3,351B와 3,357B). 보고서 상단의 생성 코드 차이 8,499B는 빌드 전체의 합계여서 앞 표의 응답 본문과는 다른 값이다.

<iframe src="/demos/coldpath/applied-report-2026-09-26.html" title="블로그 변경 전후 비교 보고서" width="100%" height="720" loading="lazy" frameBorder="0"></iframe>

[변경 전후 비교 보고서 새 창에서 열기](/demos/coldpath/applied-report-2026-09-26.html)

변경 후 빌드의 세 시나리오를 담은 보고서이며, 변경 전과의 차이는 `Change from baseline`에서 볼 수 있다. HTML 파일이 약 5.3MB여서 화면에 가까워졌을 때 불러오도록 했고, `--details` 없이 만들어 코드 보기는 없다.

패키지별 크기와 시나리오별 후보는 [당시 저장한 보고서](/demos/coldpath/post-2026-09-25.md)에, 같은 기록을 0.1.1과 0.3.1로 다시 계산해 값이 유지되는지 확인한 결과와 매핑 경고의 위치는 [재계산 문서](/demos/coldpath/recalculation-0.1.1-2026-09-25.md)에 남겼다.

## 저장된 실행 기록으로 coldpath 돌려보기

Node.js 24 이상이면 설치 없이 `npx`로 실행할 수 있다. macOS와 Linux의 ARM64, x64용 분석기가 함께 배포되므로 지원 환경에서는 Rust를 직접 빌드하지 않아도 된다. Linux 바이너리는 glibc 2.35 이상이 필요하다. 그 밖의 환경에서 직접 빌드하는 방법은 [설치 문서](https://github.com/yceffort/coldpath/blob/85187c3093711e0787b485b20903a92d11c14ba2/README.md#install)에 있다.

먼저 저장된 예제로 분석기를 실행해본다. npm 패키지에는 예제 데이터가 포함되지 않으므로, 배포 커밋에 고정된 JavaScript와 소스맵, V8 실행 기록 4개 파일을 받는다. 모두 수집을 마친 입력이어서 이 단계에는 Playwright나 브라우저가 필요 없다. 명령에 패키지 이름과 버전을 그대로 적어, npm에서 다른 패키지를 받아 실행할 여지를 없앴다.

```bash
mkdir coldpath-demo
cd coldpath-demo
mkdir -p examples/recorded
for file in entry.js entry.js.map initial.coverage.json interaction.coverage.json; do
  curl -fsSL \
    "https://raw.githubusercontent.com/yceffort/coldpath/85187c3093711e0787b485b20903a92d11c14ba2/examples/recorded/$file" \
    -o "examples/recorded/$file"
done

npx @yceffort/coldpath@0.3.1 analyze \
  --dir examples/recorded \
  --coverage examples/recorded/initial.coverage.json \
  --coverage examples/recorded/interaction.coverage.json \
  --initial-scenario initial \
  --json artifacts/recorded.json \
  --treemap artifacts/recorded.html --details
```

`@yceffort/coldpath@0.3.1`으로 확인한 출력의 첫 부분은 다음과 같다.

```text
Generated UTF-8 bytes: 293 (1 bundles)
Observed: 208 | Unobserved: 85 | Unmeasured: 0
Unobserved means not executed during the supplied scenarios, not safe to delete.

Scenario initial: 177 observed | 116 unobserved | 0 unmeasured
Scenario interaction-delta: 31 observed | 262 unobserved | 0 unmeasured
```

전체 293B 중 두 기록에서 한 번이라도 실행된 구간은 208B, 관찰 중 실행되지 않은 구간은 85B다. `interaction-delta`는 초기 실행 이후에 수집한 구간만 담는다. 전체 실행량은 각 기록을 합친 구간의 길이이며, 일반적으로 시나리오별 숫자를 단순히 더해서 구하지 않는다.

| 출력         | 확인할 내용                                             |
| ------------ | ------------------------------------------------------- |
| `Observed`   | 제공한 기록에서 실행을 관찰한 생성 코드의 바이트        |
| `Unobserved` | 기록이 있는 스크립트 안에서 실행을 관찰하지 못한 바이트 |
| `Unmeasured` | 스크립트의 실행 기록이 없어 판단하지 않은 바이트        |

`artifacts/recorded.html`을 브라우저로 열면 별도 서버 없이 트리맵을 볼 수 있다. 사각형의 면적은 생성 코드의 크기이고, 색은 어느 시나리오에서 처음 실행을 관찰했는지 나타낸다. 파일을 선택하면 `--details`로 포함한 코드와 시나리오별 실행 구간도 확인할 수 있다. JSON은 같은 결과를 다른 스크립트에서 읽거나 이전 결과와 비교할 때 쓴다.

## 빌드 분석에 남길 것과 실행 검증에 남길 것

처음 홈 화면을 조사한 빌드에는 7.25MB 정도의 JavaScript가 있었지만 홈에서 기록한 양은 672KB 정도였다. 나머지는 다른 경로나 지연 로딩을 위한 청크일 수 있다. 커버리지가 없는 나머지를 전부 미사용으로 칠하면, 이미 늦게 받도록 나눈 큰 라이브러리가 수정 우선순위의 맨 위로 올라온다.

그래서 분석 결과에는 세 상태를 유지했다. **관찰한 실행, 기록 안의 미실행, 기록 자체가 없는 미측정**이다. 어떤 원본을 알 수 없는 `[unmapped]`는 이와 별개의 축이다. 원본 이름을 모르더라도 실행 여부는 알 수 있고, 원본 이름을 알아도 실행 기록은 없을 수 있다.

실행 없이 돌릴 빌드 작업에서는 파일과 패키지별 기여도와 크기 변화를 검사할 수 있다. 실행 검증까지 연결하려면 해당 빌드를 띄워 시나리오를 수집해야 한다. 그 이후의 집계와 보고서 재생성은 Rust 분석기가 처리한다. `npx @yceffort/coldpath analyze`는 함께 배포된 플랫폼용 바이너리를 실행한다.

CI에서도 미실행과 미측정을 구분해야 한다. 실행 기록이 없는 정적 분석의 미실행량은 0B이기 때문이다. 미실행 예산만 검사하면 아무것도 측정하지 않은 빌드가 가장 좋아 보인다.

원본별 조각의 gzip과 Brotli 크기도 `--source-compression`으로 추정할 수 있다. 다만 압축 사전이 주변 코드와 공유되므로 조각의 압축 크기를 더해도 실제 전송 절감량이 되지 않고, 보고서에서도 두 값을 구분해 표시한다.

coldpath가 원본별 실행량을 보여준 덕분에 393KB 안에서 성격이 다른 변경 후보 세 가지를 찾을 수 있었다. 소개 페이지 코드는 prefetch 요청으로, MiniSearch는 공통 레이아웃의 정적 import로, 검색 후에도 남은 API는 클래스 메서드의 트리 셰이킹 경계로 이어졌다. 후보마다 다음에 잴 것도 다르다. prefetch는 다음 페이지 이동의 대기 시간과, 동적 import는 첫 검색에 추가된 요청과, 남은 클래스 메서드는 라이브러리의 API 경계와 함께 봐야 한다. 실제 블로그에서는 MiniSearch와 Panzoom을 늦춘 결과 다이어그램 글의 첫 화면에서 JS 본문이 12,362B 줄었고, 검색이나 확대를 하는 방문자도 변경 전보다 적게 받았다. 검색 대기 시간의 손익은 다음 측정으로 남겼다.

[2부에서는 V8 커버리지와 소스맵으로 이 숫자를 계산하는 과정](/2026/09/building-coldpath-v8-coverage-analyzer)을 살펴본다. 중첩된 실행 범위와 문자 단위, 원본 귀속을 각각 어떻게 처리하고 검증했는지가 주제다.
