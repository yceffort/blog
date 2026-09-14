# 블로그 전체 변경 전후 측정

시리즈 3편의 원자료다. StyleX 전환과 마크다운 전체 WASM 전환, 글 목록 메타데이터 재사용을 포함한 최종 버전을 두 작업 이전 버전과 비교한다. 특정 변경 하나의 효과를 분리한 실험은 아니다.

## 고정한 입력

| 항목           | 값                                                                            |
| -------------- | ----------------------------------------------------------------------------- |
| 변경 전        | `322601592c28d3094207a071f20d0d4df452d779`                                    |
| 변경 후        | `118a94668cfd9d7032ded2c0186138bc72bcd71b`                                    |
| 공통 콘텐츠    | 변경 후 커밋의 `apps/blog/posts`, `apps/blog/series`, `apps/blog/public`      |
| 실행 환경      | Apple M1 8코어, 메모리 16GiB, macOS 26.6.2 arm64, Node 24.20.0, pnpm 12.1.0   |
| 양쪽 공통 버전 | Next.js 16.3.1, React 19.2.8                                                  |
| 의존성         | 각 worktree에서 각 커밋의 잠금 파일로 별도 설치                               |
| GA4            | 빌드와 서버에서 `GA4_PROPERTY_ID`, `GOOGLE_APPLICATION_CREDENTIALS_JSON` 비움 |

`builds.json`은 전체 입력 파일의 SHA-256, 공개 자산의 수정 시각, 각 빌드의 시간과 빌드 ID를 기록한다. 양쪽의 글, 시리즈와 공개 자산 해시가 같은지 검사했다. 썸네일 URL이 수정 시각을 버전 값으로 사용하므로 초 단위 수정 시각도 대조했다. 글 3편과 2편의 시리즈 메타데이터는 입력을 고정한 뒤 추가했으며 이 입력에 들어 있지 않다. 잠금 파일의 다른 의존성까지 모두 같게 만들지는 않았다.

## 빌드

[`build.mjs`](../../../scripts/series-performance/build.mjs)는 별도 Git worktree를 만들고 같은 콘텐츠를 복사한 뒤 의존성을 설치한다. 이후 매번 `.next`를 지우고 블로그 앱에서 `next build`를 실행한다. 네 라운드의 실행 순서는 AB, BA, AB, BA다. 설치와 Rust/WASM 재컴파일은 시간에 포함하지 않는다. 이는 `pnpm build:blog`의 범위이며 전체 모노레포 CI 시간과 다르다.

벽시계 시간은 프로세스를 시작해서 종료하기까지 측정한다. macOS의 `/usr/bin/time -l -p`로 CPU 시간과 최대 RSS도 보존한다. 개발 서버와 다른 빌드, 브라우저 측정을 함께 실행하지 않았다.

공식 실행 전 준비 과정에서 남아 있던 개발 서버 프로세스와 서로 다른 공개 자산 수정 시각을 확인했다. 개발 서버를 종료하고 수정 시각을 맞춘 뒤 전체 빌드 측정을 처음부터 다시 수행했다. `builds.json`에는 이 조건을 충족한 마지막 실행의 모든 8회 결과만 있다. 준비 과정의 값은 중앙값에 섞지 않았다.

## 브라우저

[`compare-performance.mjs`](../../../scripts/compare-performance.mjs)를 다음 조건으로 실행했다.

| 항목        | 값                                                                                |
| ----------- | --------------------------------------------------------------------------------- |
| 경로        | `/`, `/2026/08/k8s-for-frontend-1`, `/2020/07/math-for-programmer-chapter1-2-set` |
| 서버        | 각 worktree의 프로덕션 `next start`, 모든 대상 경로와 자원 사전 방문              |
| 화면        | 390×844, 기기 배율 2, 모바일과 터치 에뮬레이션, 밝은 테마                         |
| CPU         | CDP로 호스트 CPU 대비 4배 감속                                                    |
| 네트워크    | CDP 규칙으로 지연 150ms, 다운로드와 업로드 각각 1,600Kbps                         |
| 첫 방문     | 새로운 Chromium 프로세스, 격리된 프로필, HTTP 캐시 활성화 후 비움                 |
| 재방문      | 같은 페이지에서 `about:blank`를 거쳐 같은 URL로 문서 탐색, HTTP 캐시 유지         |
| 서비스 워커 | 차단과 우회                                                                       |
| 측정 횟수   | 경로 3개 × 버전 2개 × 첫 방문과 재방문 × 4회 = 48회                               |
| 관찰 종료   | `load`, `document.fonts.ready`, 네트워크 유휴 상태를 기다린 뒤 5초                |

실행 순서는 라운드와 경로에 따라 AB/BA를 교대한다. 첫 방문과 재방문은 한 쌍으로 연속 실행한다. 각 방문에서 CPU와 네트워크 감속을 다시 적용한다. 추적을 수집하는 동안 두 버전 모두 애니메이션과 캔버스가 정상 실행되며, 스크린샷은 관찰 종료 후 CPU 감속을 해제하고 저장한다. 실서비스 GA와 Tag Manager 요청은 차단한다.

처음에는 별도 디렉터리에서 1라운드의 계측 점검을 수행하고, 이후 공식 4라운드를 실행했다. 점검 실행은 공식 중앙값에 포함하지 않는다. 같은 서버의 경로를 공식 실행에서도 다시 사전 방문했다. 서버 프로세스의 첫 요청이나 WASM 초기화 비용을 재는 실험은 아니다.

변경 전의 KaTeX 0.13.0 CSS와 글꼴은 버전이 고정된 jsDelivr URL에서 실제로 받았다. 변경 후의 수식 글꼴은 로컬 서버에서 받는다. 외부 CDN의 실제 지연과 응답 헤더 차이가 남으므로 모든 요청의 왕복 시간이 정확히 150ms로 고정되는 것은 아니다.

측정일은 2026년 9월 14일이며 브라우저 시각을 바꾸지 않았다. 두 버전 모두 9월 30일까지 표시하도록 구현한 모집 배너를 포함한다. 배너는 클라이언트에서 표시되며 LCP 후보가 될 수 있다. 날짜가 지난 뒤 같은 커밋을 실행하면 이 UI가 사라지므로 당시 화면을 그대로 재현하는 것은 아니다. 방문 간 배너를 닫거나 쿠키를 심는 조작은 하지 않았다.

## 지표의 범위

- FCP와 LCP는 Performance API에서 읽은 실제 감속 상태의 페인트 기록이다. LCP 요소도 원자료에 보존한다.
- 원자료의 `ttfbMs`는 탐색 시작부터 `navigation.responseStart`까지의 값이다. 아래의 별도 실험에서 이 필드가 CDP의 합성 지연을 반영하지 않는 것을 확인했다. 따라서 글의 모바일 첫 응답 시간 비교에는 사용하지 않았다. 실제 서버의 콜드 요청 비용이나 150ms 지연을 포함한 TTFB로 해석하지 않는다.
- 본문 DOM 시간은 `aria-hidden`이 아닌 `article.post-article`에서 텍스트 100자를 초과한 상태를 처음 감지한 시간이다. 전체 본문의 전송이나 페인트 완료 시간이 아니다. `bodyTextLength`는 숨김 텍스트도 포함할 수 있는 DOM의 `textContent` 길이이며 독자에게 보이는 글자 수가 아니다. 홈에는 본문 DOM 지표가 없으며 `null`이다.
- 전송량은 관찰 구간 전체의 CDP `encodedDataLength` 합계다. HTML과 RSC, JS, CSS, 이미지와 글꼴, 링크 prefetch를 포함한다. 단일 본문 파일 크기나 디스크 번들 크기가 아니다. 프로토콜에서 보고하는 응답 헤더 비용도 들어간다.
- 캐시 적중은 CDP의 `requestServedFromCache` 또는 `fromDiskCache`로 확인한다. 캐시 사용 여부와 전송 바이트를 각 요청에 남겼다.
- CLS는 1초 간격과 최대 5초 길이의 세션 윈도 중 최대값이다. 실험의 관찰 구간에 한정된다.
- `loadBlockingMs`는 FCP 이후 관찰 종료까지의 긴 작업에서 50ms를 넘는 부분을 합친 값이다. Lighthouse TBT가 아니다. 상호작용 시나리오를 실행하지 않았으므로 INP는 측정하지 않았다.

HTTP 오류와 예기치 않은 네트워크 실패, 자바스크립트 오류, 누락된 페인트 지표는 실행을 실패시킨다. 실제 요청에 네트워크 규칙 ID가 적용됐는지도 확인한다. 재방문 요청이 전부 캐시에서 처리된 경우에는 적용된 네트워크 요청이 없어도 허용한다. 코드 글의 코드 줄과 수식 글의 MathML 31개도 검사한다.

`results.json`에는 환경, 브라우저 버전, 빌드 ID, 계측 코드 해시, 모든 개별 방문과 요청 목록, 그룹별 중앙값과 최소, 최대값이 있다. 추적 파일과 화면 캡처는 실행 디렉터리에 생성하며 저장소에는 큰 추적 파일을 넣지 않았다. 중앙값은 짝수 표본의 가운데 두 값을 평균한다. 네 번의 로컬 측정을 방문자 전체의 75번째 백분위수나 실제 휴대전화의 성능으로 해석하지 않는다.

## Navigation Timing의 지연 반영 확인

첫 응답 필드가 설정한 150ms보다 짧아 별도로 계측을 점검했다. [`check-timing.mjs`](../../../scripts/series-performance/check-timing.mjs)는 작은 HTML을 반환하는 독립 HTTP 서버를 띄운다. 중간 응답 없이 HTTP 200만 반환하고 `Cache-Control: no-store`를 사용하며, 매번 새 브라우저에서 캐시를 비활성화한다. CPU 감속 없이 CDP 네트워크 지연만 바꾼 점검이며 블로그의 48회에 포함하지 않는다.

| 지연 설정 | responseStart | responseEnd |   FCP |
| --------- | ------------: | ----------: | ----: |
| 0ms       |         3.3ms |       6.9ms |  16ms |
| 150ms     |         1.5ms |     164.8ms | 184ms |
| 500ms     |         1.5ms |     520.9ms | 544ms |

Chromium 153.0.8010.12에서 `responseStart`와 `finalResponseHeadersStart`는 합성 지연을 따라 늘어나지 않았다. `firstInterimResponseStart`는 모두 0이었다. 지연 규칙이 실제 요청에 적용됐음을 검사했고 응답 완료와 페인트는 지연 설정에 따라 늦어졌다. 따라서 중간 응답이나 캐시 때문에 짧게 기록된 것으로 설명하지 않고, 이 계측 방식에서의 필드 해석 한계로 남겼다. [timing-probe.json](timing-probe.json)에 각 탐색의 원자료와 검사 코드 해시가 있다.

```sh
node apps/blog/scripts/series-performance/check-timing.mjs .cache/series-performance/timing-probe.json
```

## 다시 실행하기

### 수식 글의 LCP 원인 대조

[`diagnose-lcp.mjs`](../../../scripts/series-performance/diagnose-lcp.mjs)는 변경 후 커밋 `118a9466`의 기존 프로덕션 빌드에서 수식 글 하나를 측정한다. 첫 48회와 별개로 조건 다섯 개를 세 번씩 실행한 15회는 [lcp-investigation.json](lcp-investigation.json)에 보존했다. CPU 4배 감속, 지연 150ms, 다운로드와 업로드 각각 1,600Kbps와 같은 화면 크기를 유지한다. 매번 새 브라우저를 띄우고 순서를 라운드마다 뒤집는다. 계측 코드 해시와 브라우저 버전도 원자료에 있다.

모든 조건에서 CDP Fetch로 수식 글꼴 URL만 가로챈다. 대조군은 즉시 원래 요청을 이어 보낸다. 즉시 전달 조건은 미리 받은 동일한 글꼴 바이트로 응답해 네트워크 전송 대기를 제거한다. 요청 지연 조건은 네트워크 요청마다 한 번만 1,500ms를 기다렸다가 이어 보낸다. 같은 요청에 Fetch 이벤트가 두 번 발생할 수 있어 `networkId`로 중복 지연을 막는다. 별도의 두 조건은 `document.startViewTransition` 해제와 공통 웹 글꼴 제외다.

공통 웹 글꼴 제외는 `Inter`, `JetBrains Mono`, `Fraunces`에 쓰는 CSS 변수 세 개를 시스템 글꼴로 덮어쓰고 `/_next/static/media/*.woff2`의 미리 불러오기 요청을 차단하는 실험이다. `next/font`를 삭제하고 다시 빌드한 결과는 아니다. 모든 조건에서 MathML 31개와 동일한 본문 HTML 해시를 확인했고, 브라우저가 받은 수식 글꼴의 SHA-256도 원본과 대조했다. 수식 글꼴의 내용이나 크기를 바꾸지 않았다.

| 조건                | FCP 중앙값 | LCP 3회 (최종 대상)                            | 공통 글꼴 전송 |
| ------------------- | ---------: | ---------------------------------------------- | -------------: |
| 기존 설정           |    1,448ms | 5,636ms (문단), 1,552ms (제목), 5,636ms (문단) |       168.3KiB |
| 수식 글꼴 즉시 전달 |    1,456ms | 2,804ms (배너), 2,792ms (배너), 1,524ms (제목) |       168.3KiB |
| 수식 글꼴 요청 지연 |    1,448ms | 1,528ms (제목), 6,020ms (문단), 6,028ms (문단) |       168.3KiB |
| 화면 전환 해제      |    1,456ms | 5,640ms (문단), 5,660ms (문단), 5,640ms (문단) |       168.3KiB |
| 공통 웹 글꼴 제외   |      688ms | 2,312ms (배너), 2,316ms (배너), 2,368ms (배너) |           0KiB |

수식 글꼴을 즉시 전달하면 늦은 문단 후보가 사라졌고, 요청을 늦춘 조건에서 문단이 최종 후보인 실행은 약 6초가 됐다. 다만 대조군에서도 제목이 최종 후보로 남는 실행이 있어, 최종 LCP가 항상 수식 글꼴의 완료 시각을 따라가지는 않는다. 화면 전환을 끈 세 번도 약 5.6초였으므로 화면 전환만으로 지연을 설명하는 가설은 철회했다. 공통 글꼴을 제외하면 FCP가 줄었지만 LCP 대상도 배너로 바뀌었고, 수식 글꼴 응답은 여전히 약 4.8초에 완료됐다.

이 표의 전송량은 Resource Timing의 `transferSize` 합계다. 헤더 비용을 포함하며, 기존 48회의 CDP 바이트 합계와 집계 경로는 다르다. 공통 글꼴을 제외한 세 번 모두 해당 요청의 전송량이 0인지 확인했다. 배너가 표시되는 날짜에 대한 제약은 기존 측정과 같다.

같은 프로덕션 빌드를 3222 포트에 준비한 뒤 저장소 루트에서 실행한다. 개발 서버와 다른 빌드, 브라우저 실험은 함께 실행하지 않는다.

```sh
LCP_CASES=control,instant-font,delayed-font,no-view-transition,system-ui LCP_ROUNDS=3 node apps/blog/scripts/series-performance/diagnose-lcp.mjs .cache/series-performance/lcp-final
```

첫 네 번의 추적에서 글꼴과 LCP 시각을 발췌한 기록은 [lcp-font-timing.json](lcp-font-timing.json)에 있다. 해당 발췌와 위 대조 실험은 다른 실행이다.

로딩 중 화면 확인 두 번도 따로 실행해 [lcp-visual-check.json](lcp-visual-check.json)에 보존했다. 약 2초에 제목과 첫 문단의 시작이 이미 보였고, 수식 글꼴은 로딩 중이었다. 최종 LCP는 5,640ms와 5,632ms였다. `LCP_SNAPSHOTS=1`은 `document.fonts.ready`를 기다리지 않는 CDP `Page.captureScreenshot`으로 로딩 중 화면을 저장한다. 화면을 수집하는 부가 작업이 있으므로 이 실행을 위 15회와 합산하지 않았다. 본문에 실은 첫 화면의 파일 해시도 기록했다.

```sh
LCP_CASES=control LCP_ROUNDS=2 LCP_SNAPSHOTS=1 node apps/blog/scripts/series-performance/diagnose-lcp.mjs .cache/series-performance/lcp-early-paint
```

### 일반 웹 글꼴 제거 후 실제 페이지 비교

실제 일반 웹 글꼴 제거 후의 비교는 [font-removal-results.json](font-removal-results.json)에 보존했다. 이 파일의 `before`는 최초 비교의 변경 후 커밋 `118a9466`이고, `after`는 일반 웹 글꼴을 제거한 `973aba65`다. 최초 비교의 `before`인 Tailwind 버전과 혼동하지 않는다. 홈, 코드 글, 수식 글의 첫 방문을 양쪽 네 번씩 총 24회 측정했다. 재방문은 이 추가 비교에 포함하지 않았다.

`973aba65`의 별도 worktree에 최초 비교의 `after`에서 `posts`, `series`, `public`을 수정 시각을 보존해 복사했다. 세 디렉터리의 모든 파일 해시와 공개 자산의 초 단위 수정 시각이 같은지 검사한 뒤 해당 커밋의 잠금 파일로 설치하고 `pnpm build:blog`를 실행했다. [font-removal-build.json](font-removal-build.json)에 빌드 ID, 커밋, 수식 글꼴 해시와 성공 여부가 있다. 이 빌드는 성공 검증 한 번이며 기존 네 번의 빌드 시간 통계에 섞지 않았다.

두 서버는 3222와 3223에서 실행했다. 원인 대조 스크립트의 요청 가로채기나 CSS 주입은 쓰지 않고, `973aba65`에 보존된 `compare-performance.mjs`로 실제 페이지를 측정했다. 개발 서버와 다른 빌드는 종료한 상태였다. 아래 명령은 위 입력을 준비하고 서버를 실행한 뒤 저장소 루트에서 실행한다.

| 경로    | FCP 제거 전 | FCP 제거 후 | LCP 제거 전 | LCP 제거 후 |
| ------- | ----------: | ----------: | ----------: | ----------: |
| 홈      |     1,626ms |       868ms |     1,684ms |     2,376ms |
| 코드 글 |     2,146ms |       870ms |     3,150ms |     2,250ms |
| 수식 글 |     1,514ms |       758ms |     5,650ms |     2,352ms |

표는 각각 네 번의 중앙값이다. 수식 글의 제거 후 LCP는 2,320ms, 2,392ms, 2,336ms, 2,368ms였다. 제거 전 네 번은 모두 본문 문단, 제거 후 네 번은 모두 모집 배너가 최종 대상이었다. 홈은 썸네일에서 배너로 바뀌면서 LCP가 늦어졌다. 코드 글은 양쪽 모두 같은 배너였다. 전체 24회 CLS는 0이었다.

제거 후 12회 모두 일반 웹 글꼴의 요청과 글꼴 정의가 없었고, 세 경로의 LCP는 모두 5,000ms 미만이었다. 수식 글은 네 번 모두 MathML 31개와 수식 전용 글꼴의 HTTP 200 응답을 확인했다. 수식 글꼴 전송량은 약 334KiB로 유지됐다. 최초 48회나 요청을 가로챈 원인 대조 15회와 이 수치를 합산하지 않았다.

```sh
PERF_ROUNDS=4 PERF_CPU=4 PERF_LATENCY_MS=150 PERF_DOWNLOAD_KBPS=1600 PERF_UPLOAD_KBPS=1600 PERF_REPEAT_VISIT=0 \
PERF_ROUTES=/,/2026/08/k8s-for-frontend-1,/2020/07/math-for-programmer-chapter1-2-set \
PERF_BEFORE_DIR="$PWD/.cache/series-performance/after/apps/blog" \
PERF_AFTER_DIR="$PWD/.cache/series-performance/font-removal/apps/blog" \
node .cache/series-performance/font-removal/apps/blog/scripts/compare-performance.mjs http://127.0.0.1:3222 http://127.0.0.1:3223 .cache/series-performance/font-removal-browser
```

### 본문의 Mermaid 그래프

1편과 3편의 그래프는 본문 안의 Mermaid 코드로 작성했다. 별도의 이미지 생성 도구는 필요하지 않으며 블로그의 기존 Mermaid 렌더러가 표시한다. `results.json`과 `builds.json`, `font-removal-results.json`의 개별 실행에서 중앙값을 계산해 막대에 넣었다. 시간 축과 전송량 축은 모두 0에서 시작하며, 실행 범위는 본문과 원자료에 남겼다. 최초 마이그레이션 비교와 실제 일반 글꼴 제거 전후는 서로 다른 실험이다.

원인 대조 도식에는 `lcp-investigation.json`의 다섯 조건별 LCP 세 번과 최종 대상을 모두 적었다. 로딩 중 화면을 보여 주는 PNG는 실제 화면 캡처이므로 유지했다. 기존 Matplotlib 생성 스크립트와 사용하지 않는 SVG 10개는 제거했다.

### 벤치마크 다시 실행하기

현재 HEAD와 현재 콘텐츠로 새 비교를 만들려면 비어 있는 `.cache/series-performance`에서 다음 명령을 실행한다. 기존 디렉터리 아래에는 등록된 Git worktree가 있으므로 파일만 옮겨서 재사용하지 않는다. 과거 결과를 보존할 때는 별도 작업 디렉터리를 사용하는 편이 간단하다.

```sh
node apps/blog/scripts/series-performance/build.mjs
```

이 기록의 커밋과 콘텐츠로 반복하려면 `118a9466`의 별도 작업 디렉터리에서 현재 `build.mjs`를 복사해 실행한다. 복사한 스크립트는 측정 대상 안으로 복사되지 않으며, 내부 worktree는 기록된 커밋에서 다시 생성된다. 기존 기록의 공개 자산 수정 시각도 먼저 적용한다. 아래 예시는 현재 저장소 루트에서 실행하며 `/tmp/blog-series-replay`가 없어야 한다.

```sh
git worktree add --detach /tmp/blog-series-replay 118a9466
mkdir -p /tmp/blog-series-replay/apps/blog/scripts/series-performance
cp apps/blog/scripts/series-performance/build.mjs /tmp/blog-series-replay/apps/blog/scripts/series-performance/build.mjs
python3 - <<'PY'
import json
import os
from pathlib import Path

record = json.loads(Path('apps/blog/tests/performance/series-overall/builds.json').read_text())
for name, seconds in record['publicMtimeSeconds']['after'].items():
    os.utime(Path('/tmp/blog-series-replay') / name, (seconds, seconds))
PY
cd /tmp/blog-series-replay
node apps/blog/scripts/series-performance/build.mjs
```

완성된 각 `apps/blog` 디렉터리에서 아래 서버 명령을 별도 터미널로 실행한다. 두 서버의 포트는 각각 3221과 3222다.

```sh
GA4_PROPERTY_ID= GOOGLE_APPLICATION_CREDENTIALS_JSON= corepack pnpm start -p 3221 -H 127.0.0.1
GA4_PROPERTY_ID= GOOGLE_APPLICATION_CREDENTIALS_JSON= corepack pnpm start -p 3222 -H 127.0.0.1
```

현재 저장소에 설치된 Playwright와 계측 코드를 사용해 브라우저를 측정한다. 재현 디렉터리를 사용했다면 `PERF_BEFORE_DIR`와 `PERF_AFTER_DIR`를 그 디렉터리의 절대 경로로 바꾼다.

```sh
PERF_ROUNDS=4 PERF_CPU=4 PERF_LATENCY_MS=150 PERF_DOWNLOAD_KBPS=1600 PERF_UPLOAD_KBPS=1600 PERF_REPEAT_VISIT=1 \
PERF_ROUTES=/,/2026/08/k8s-for-frontend-1,/2020/07/math-for-programmer-chapter1-2-set \
PERF_BEFORE_DIR="$PWD/.cache/series-performance/before/apps/blog" \
PERF_AFTER_DIR="$PWD/.cache/series-performance/after/apps/blog" \
node apps/blog/scripts/compare-performance.mjs http://127.0.0.1:3221 http://127.0.0.1:3222 .cache/series-performance/browser-final
```

브라우저 버전과 호스트 환경, 빌드 ID와 입력 해시를 새 기록에 남긴다. 기존 빌드와 source tree를 유지한 채 빌드만 반복할 때는 `build.mjs --builds`를 쓸 수 있다. 이 옵션은 준비가 끝난 입력을 재사용하므로 중간에 worktree 소스나 콘텐츠를 수정하지 않아야 한다.
