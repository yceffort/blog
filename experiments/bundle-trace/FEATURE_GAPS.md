# bundle-trace 기능 점검

점검일: 2026-09-22. 초기 Rust 소스를 읽고 기존 바이너리로 입력 호환성을 확인했다. 비교 도구는 공식 문서를 확인했으며 같은 데이터로 실행 시간이나 정확도의 우열을 측정하지는 않았다.

## 개선 반영 결과

아래 초기 점검 이후 다음을 구현했다. 실행 근거는 [results/formats-and-ui.json](results/formats-and-ui.json), 사용법은 [README](README.md)에 있다.

- DevTools/Puppeteer export 형태, 실제 Playwright 결과, CDP/Node V8 입력 어댑터. URL prefix와 명시적 URL 경로 연결을 지원한다. 코드와 map의 검증 상태를 분리하며, 소스 증거가 없는 입력에는 `--allow-unverified`를 요구한다.
- base64·퍼센트 인코딩 인라인 map, 마지막 블록 주석, `--map`을 통한 별도 보관 map 연결.
- JSON v2에 청크별 원본 연결을 보존하고 `--details`로 생성 코드·실행 구간·원본 매핑 지점을 출력한다. 단일 HTML의 트리맵, 코드 구간, 검색, 앱 코드·실행 상태 필터. 큰 HTML은 내부 구간을 숫자 배열과 gzip으로 저장한다.
- CLI 번들 include/exclude, JSON 분석·CI 설정, 전체 파일 gzip/Brotli 크기, Markdown 요약, 예산 초과 종료 코드. 예산 초과 시에도 보고서는 저장한다.

아직 남은 범위는 원본 경로 치환·패키지 버전별 구분, 원본별 CLI 필터/예산, 시나리오별 기여도, 빌드 diff, webpack/Turbopack 유입 경로, map 오류의 부분 성공 모드, 배포 바이너리와 비교 벤치마크다. CSS·테스트 커버리지 리포터도 미구현이다. 원본 위치 표시는 소스맵 매핑 지점이며 원본의 정확한 실행 범위는 아니다.

## 초기 점검 기록

이하의 현재 상태와 실패 결과는 **개선 전 스냅샷**이다. 최초 재현 기록은 수정하지 않고 남겼다.

비교 기준은 번들 크기와 Chrome 커버리지를 함께 다루는 [source-map-explorer](https://github.com/danvk/source-map-explorer#code-coverage-heat-map)다. V8 리포트와 수집 연동은 [monocart-coverage-reports](https://github.com/cenfun/monocart-coverage-reports), 압축 크기와 청크 탐색은 [webpack-bundle-analyzer](https://github.com/webpack/webpack-bundle-analyzer), 테스트 CI 기능은 [c8](https://github.com/bcoe/c8)도 참고했다. 실제 사용량 순위를 조사한 것은 아니며, webpack-bundle-analyzer는 실행 커버리지 분석기와 목적이 다르다.

현재는 파일 입력으로 동작하는 분석 엔진이 있고, 다른 프로젝트에서 바로 쓰기 위한 입력·출력·설정이 부족하다. Node 없는 실행은 이미 확인했지만, 보편적인 수집 결과를 그대로 읽을 수 있는 독립성은 아직 부족하다.

## 우선 보완할 기능

| 우선순위 | 기능                         | 현재 상태와 사용자 영향                                                                                                                                             | 비교 근거                                                                                                        |
| -------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1        | 표준 커버리지 입력           | 전용 `schemaVersion/scenario/scripts` envelope만 받는다. DevTools export와 원본 CDP/Node 형식의 `result`를 직접 읽지 못해 기존 수집 파이프라인을 그대로 쓸 수 없다. | source-map-explorer의 Chrome export 입력, Monocart의 Playwright·Puppeteer·Node 연동                              |
| 1        | 인라인 및 별도 위치의 소스맵 | 인라인 `data:` map을 오류로 거부한다. CLI에서 JS와 map의 경로를 명시적으로 연결하는 방법도 없다. 출력 디렉터리와 map 보관 위치가 다르면 사용이 어렵다.              | source-map-explorer의 inline map 및 명시적 JS/map 쌍 입력, Monocart의 `sourceMapResolver`                        |
| 1        | 상세 보고서와 탐색           | 터미널에는 패키지 합계, JSON에는 번들·원본·패키지 합계가 있다. HTML, 트리맵, 미실행 코드 위치 보기가 없다. JSON에서도 원본과 청크의 연결 및 실행 구간이 사라진다.   | source-map-explorer의 coverage heat map, webpack-bundle-analyzer의 청크별 트리맵, Monocart의 V8 UI               |
| 2        | 필터와 경로 정규화           | `--include/--exclude`, 원본 경로 치환, 앱 코드만 보기 등의 옵션이 없다. 같은 라이브러리의 버전도 패키지 이름 하나로 합친다.                                         | Monocart의 `entryFilter/sourceFilter/sourcePath`, source-map-explorer의 `--replace/--with`, c8의 include/exclude |
| 2        | gzip/Brotli 크기             | 생성 JS의 UTF-8 길이만 계산한다. 전송 크기를 보려면 별도 스크립트가 필요하다.                                                                                       | source-map-explorer의 gzip, webpack-bundle-analyzer의 압축 크기                                                  |
| 2        | CI 판정과 보고서 형식        | 분석 오류로 실패하는 기능은 있지만 크기·커버리지 예산을 넘겼을 때 실패시키는 기능은 없다. 출력도 자체 JSON과 터미널뿐이다.                                          | c8의 `check-coverage/--per-file`, Monocart의 Markdown·LCOV·Codecov 보고서                                        |
| 3        | CSS 및 테스트 커버리지 지표  | JS 계열 파일만 스캔한다. 바이트 커버리지는 있지만 줄·분기·구문·함수 커버리지 보고서는 없다.                                                                         | Monocart의 CSS와 테스트 지표, c8의 Istanbul 리포터                                                               |

비교 도구의 세부 근거: [source-map-explorer 옵션과 API](https://github.com/danvk/source-map-explorer/blob/master/README.md), [Monocart 입력 연동](https://github.com/cenfun/monocart-coverage-reports#collecting-v8-coverage-data), [Monocart 필터](https://github.com/cenfun/monocart-coverage-reports#filtering-results), [Monocart 리포터](https://github.com/cenfun/monocart-coverage-reports#available-reports), [webpack 크기 정의](https://github.com/webpack/webpack-bundle-analyzer#size-definitions), [c8 CI 판정](https://github.com/bcoe/c8#checking-coverage).

## 실행으로 확인한 제약

기록된 fixture와 임시 디렉터리를 사용했다. Chrome export 입력은 같은 fixture의 범위를 정규화해 `{url, text, ranges}` 배열로 만들었고, 원본 V8 입력은 `{result: [{scriptId, url, functions}]}`로 감쌌다. 따라서 이번 확인은 실제 DevTools UI의 export 동작을 검증한 것이 아니라 해당 형식의 수용 여부를 확인한 것이다.

| 입력                                               | 종료 코드 | 결과                             |
| -------------------------------------------------- | --------: | -------------------------------- |
| 기존 전용 envelope                                 |         0 | 정상 분석                        |
| Chrome export 형태                                 |         1 | envelope 역직렬화 실패           |
| 원본 V8 `result` 형태                              |         1 | `schemaVersion` 필드 누락 오류   |
| 유효한 인라인 소스맵                               |         1 | 로컬 상대 경로만 지원한다는 오류 |
| 정상 파일과 잘못된 map을 가진 파일이 섞인 디렉터리 |         1 | 잘못된 map에서 전체 분석 중단    |

기계가 읽을 수 있는 기록은 [results/feature-audit.json](results/feature-audit.json)에 남겼다. 여러 번들의 부분 성공과 실패 목록을 내보내거나 엄격 모드를 선택하는 기능도 필요하다. 특히 알 수 없는 입력 형식에서 내부 역직렬화 오류를 보여주기보다 지원 형식과 변환 방법을 안내해야 한다.

## 구현에서 확인한 원인

- [src/coverage.rs](src/coverage.rs)의 `CoverageFile`은 전용 envelope만 받는다. `FunctionCoverage`는 이름을 저장하지 않으며, 후속 단계에서 횟수는 실행 여부로 축약된다.
- [src/maps.rs](src/maps.rs)의 `locate`는 마지막 독립 주석의 로컬 상대 경로나 인접 `.js.map`만 읽는다. 일반 map과 내부 map을 포함한 indexed map은 이미 지원한다.
- [src/lib.rs](src/lib.rs)의 `SourceRow`에는 원본 이름·패키지·합계만 있다. 생성 위치, 원본 위치, 해당 청크를 보존하지 않는다. HTML 출력만 추가해도 구간 탐색이 바로 가능해지는 구조가 아니다.
- [src/main.rs](src/main.rs)의 인자는 `dir`, `coverage`, `metafile`, `json`, `why`, `limit`뿐이다. 필터, 압축, 예산, 출력 리포터 선택은 없다.
- [src/metadata.rs](src/metadata.rs)는 esbuild 입력 그래프에서 최단 경로 하나를 구한다. webpack·Turbopack의 유입 경로나 정적 import와 동적 import의 구분은 제공하지 않는다.
- [scripts/collect.mjs](scripts/collect.mjs)의 기본 URL 접두사는 Next.js용이며 검색·소개 페이지 시나리오는 이 블로그에 맞춰져 있다. 첫 진입 수집은 URL과 접두사를 바꿔 사용할 수 있지만, 일반적인 사용자 동작을 주입하는 API는 없다.

## 우리 목적에서 추가로 필요한 것

다음은 위 도구들이 모두 제공한다고 확인한 기능이 아니라, 이 프로젝트의 목표에 맞춘 제안이다.

1. **시나리오별 기여도:** 지금도 같은 빌드의 여러 기록을 합칠 수 있다. 다만 출력에는 합집합과 시나리오 이름만 남는다. 홈에서는 미실행이지만 검색에서 실행된 양을 한 보고서에서 비교할 수 있어야 한다.
2. **빌드 전후 diff:** 현재 글의 기본·변경 빌드 비교는 보조 스크립트로 수행했다. CLI가 각 빌드의 보고서를 비교하고 원본·패키지별 증감을 보여주면 PR 검토에 직접 쓸 수 있다. 과거 커버리지 오프셋을 새 번들에 적용하는 기능과는 구분해야 한다.
3. **청크별 중복과 유입 경로:** 원본별 합계에 청크 연결과 패키지 버전 정보를 남겨, 어떤 경로에서 얼마나 중복으로 들어왔는지 확인할 수 있어야 한다. 소스맵만으로 import 그래프를 복원할 수 있다고 가정해서는 안 된다.
4. **배포와 성능 근거:** 현재 프로젝트는 소스에서 빌드하는 실험용 crate다. 운영체제별 바이너리 배포와 다양한 번들러의 실제 fixture가 필요하다. 대용량 입력의 시간·최대 메모리도 아직 다른 도구와 비교하지 않았다.

## 권장 구현 순서와 완료 기준

1. **표준 입력 어댑터와 map resolver.** 기존 fixture를 전용 수집기로 다시 수집하지 않고 DevTools export, CDP/Node V8, Playwright 형식으로 가져와 같은 실행 바이트를 얻는다. URL과 로컬 파일의 연결을 명시적으로 설정하며 인라인·외부 파일 map을 처리한다.
2. **보고서 모델과 HTML 탐색.** 청크 → 원본 → 생성 코드의 미실행 구간으로 이동할 수 있어야 한다. 원본에서 복원한 위치는 소스맵 기반 추정임을 표시한다. 하나의 HTML 파일로 저장해 서버 없이 공유할 수 있게 한다.
3. **필터와 CI용 출력.** 번들 선택과 원본 선택을 구분하고 분모도 명시한다. 설정 파일, Markdown 요약, 크기 예산 위반 종료 코드를 제공한다. 테스트 커버리지와 번들 낭비의 임계치를 같은 의미로 다루지 않는다.
4. **빌드 diff, 시나리오 비교, 압축 크기.** 먼저 같은 빌드의 기록들을 정규화한 다음 시나리오를 비교한다. 다른 빌드는 각자 분석한 보고서의 크기를 비교한다. 압축은 파일 단위로 계산하며 원본 조각을 따로 압축한 크기의 합을 실제 절감량으로 표현하지 않는다.

표준 export에는 수집 당시 map 해시가 없을 수 있다. 변환 시 현재 map의 해시를 계산했다고 과거 수집과의 결합까지 검증된 것으로 표시하면 안 된다. JS 일치와 map 출처 검증의 상태를 따로 남겨야 한다.

미측정과 미실행을 구분하는 정책, JS/map 해시 검증, UTF-16 위치와 UTF-8 크기의 구분은 유지할 가치가 있다. CSS·Istanbul·전체 테스트 리포터 호환은 JS 번들 분석이 충분히 사용 가능해진 뒤 확장할 범위다.
