# bundle-trace

빌드된 JavaScript의 바이트를 원본 파일·패키지에 귀속시키는 Rust CLI다. V8 실행 기록을 선택적으로 겹칠 수 있다. 분석·압축 계산·보고서 생성에는 Node.js나 브라우저가 필요 없다. 브라우저 실행 기록은 Chromium, Node 실행 기록은 Node에서 수집한 파일을 가져온다.

이 디렉터리는 독립 Cargo workspace다. `Cargo.toml`, `Cargo.lock`, `src/`만으로 빌드하며, Next.js나 이 블로그의 코드를 참조하지 않는다. Rust 1.85 이상이 필요하다. JavaScript 수집기와 블로그 실험은 선택적인 입력 생성·검증 도구다.

## 빠르게 실행하기

저장소 루트에서 실행한다.

```bash
cargo build --locked --release --manifest-path experiments/bundle-trace/Cargo.toml
experiments/bundle-trace/target/release/bundle-trace \
  --dir path/to/dist \
  --json experiments/bundle-trace/artifacts/static.json
```

디렉터리 자체를 다른 저장소에 복사한 경우에는 그 안에서 `cargo build --locked --release`를 실행하면 된다. 다음의 기록된 예제는 브라우저나 Node 없이 즉시 분석할 수 있다.

```bash
cd experiments/bundle-trace
cargo run --locked --release -- \
  --dir examples/recorded \
  --coverage examples/recorded/initial.coverage.json \
  --coverage examples/recorded/interaction.coverage.json \
  --html artifacts/report.html
```

기대값은 전체 293B, 실행 관찰 208B, 미실행 85B다. `examples/recorded`의 JS와 map은 기록의 해시에 묶여 있으므로 포매팅하지 않는다. 바이너리와 이 입력만 저장소 밖으로 복사하고 `PATH=/usr/bin:/bin`에서 실행한 결과도 [results/standalone.json](results/standalone.json)에 남겼다.

`--dir` 안의 `.js`, `.mjs`, `.cjs`를 재귀적으로 읽는다. 마지막 독립된 `//# sourceMappingURL=...`, `//@ sourceMappingURL=...` 또는 마지막 블록 주석 `/*# sourceMappingURL=... */`을 읽는다. 주석이 없으면 인접한 `파일명.js.map`을 찾는다. Turbopack처럼 JS와 map의 해시 이름이 달라도 처리한다. `data:application/json`의 base64·퍼센트 인코딩도 지원한다. 자동으로 찾은 로컬 map은 `--dir` 안에 있어야 한다.

map을 별도로 보관했다면 `--map chunks/app.js=/path/to/private/app.map`으로 연결한다. 여러 번 지정할 수 있으며, 이 명시적 경로는 `--dir` 밖이어도 된다. `--map`이 주석보다 우선한다. HTTP URL·HTTP 헤더에서 map을 가져오거나 외부 URL로 구성된 index map을 읽는 기능은 없다. 원격 파일은 가져오지 않는다.

일반 v3 map과 내부에 map이 들어 있는 index map을 지원한다. `sourcesContent` 없이도 동작한다. map이 없는 파일은 `[unmapped]`에 남긴다. 명시적으로 참조한 map이 없거나 map 형식이 잘못됐으면 실패한다.

index map은 평탄화하지 않고 중첩 섹션을 순회한다. 빈 섹션과 첫 매핑 전 접두부도 `[unmapped]` 경계를 유지한다. 잘못 정렬된 섹션, 다음 섹션을 침범하는 매핑, 유효하지 않은 섹션 오프셋은 오류다. 원본 표시를 요청했는데 같은 원본 이름에 서로 다른 `sourcesContent`가 있으면 임의의 내용을 보여주는 대신 실패한다.

## 결과 읽기

| 필드              | 뜻                                                           |
| ----------------- | ------------------------------------------------------------ |
| `bytes`           | 빌드 파일에 존재하는 압축 전 UTF-8 바이트                    |
| `observedBytes`   | 제공된 실행 기록 중 한 번 이상 실행된 범위에 해당하는 바이트 |
| `unobservedBytes` | 기록이 있는 스크립트 안에서 관찰 중 실행되지 않은 바이트     |
| `unmeasuredBytes` | 해당 스크립트의 실행 기록이 없는 바이트                      |

세 상태의 합은 `bytes`와 같으며, 파일·패키지·전체 합계도 일치해야 한다. 정적 모드에서는 전부 `unmeasuredBytes`다. 다운로드됐으나 실행 기록에 없는 스크립트도 미측정이다. 미측정 청크를 미사용으로 단정하지 않는다.

V8의 범위는 UTF-16 코드 유닛이다. Rust에서는 UTF-8 경계로 변환한 뒤 크기를 합산한다. JSON의 번들별 `utf16Units`와 `observedUtf16Units`는 검산용이다. Chrome UI의 바이트 표시와 비ASCII 문자가 있는 파일에서 수치가 다를 수 있다. gzip/Brotli 전송량, CPU 시간, 원본 TS 파일 크기와도 다른 지표다.

소스맵은 바이트 소유권 표가 아니다. 각 매핑 지점에서 **같은 줄의 다음 매핑 지점 또는 줄 끝**까지 원본에 귀속시키는 추정이다. 매핑 전 접두부, 줄바꿈, 원본 없는 매핑은 `[unmapped]`로 남긴다. 줄 밖이나 서로게이트 쌍 중간을 가리키는 잘못된 매핑 지점은 제외하고 경고한다. 실제 Turbopack 빌드에서 줄 끝을 넘는 매핑을 발견했기 때문에 넣은 처리다. 범위 자체를 복원할 수 없는 map은 실패한다.

`unobservedBytes`는 삭제 가능량이 아니다. 사용자 동작, 권한, 에러 처리 등에 따라 실행될 수 있다. 분석기는 삭제나 자동 코드 변환을 하지 않는다. 여러 시나리오를 입력하면 실행 범위의 합집합을 구하며 실행 횟수는 합산하지 않는다.

### HTML과 상세 JSON

`--html report.html`은 서버와 외부 자원 없이 열 수 있는 단일 HTML이다. 보고서 UI와 생성되는 텍스트·Markdown 문구는 영어다. 시스템 테마를 따르며 상단의 `System theme / Light / Dark`로 전환할 수 있다. 파일 목록은 10개씩 표시하고 긴 경로는 파일명으로 줄인다. 정확한 바이트 수와 전체 경로는 툴팁 및 상세 정보에서 확인한다. 트리맵은 `Show size distribution`을 펼치면 나오며, 큰 파일 최대 11개와 나머지 파일의 합계로 표시한다.

원본을 선택하면 넓은 코드 패널에서 `Original source / Generated code` 탭을 전환하며 실행·미실행·미측정 구간을 탐색할 수 있다. `Expand code`는 파일 목록을 접어 전체 폭을 사용한다. 원본은 매핑 지점 앞 20줄과 뒤 60줄까지 보여주고, 해당 지점이 보이도록 스크롤한다. 이전·다음 버튼으로 구간을 이동하며, 직접 선택할 구간 목록과 전체 경로·검증 정보는 기본적으로 접혀 있다. 파일·패키지 검색, 정렬, 앱 코드 필터, 실행 상태 필터를 제공한다. UI의 검색과 필터는 전체 합계를 바꾸지 않는다.

첫 화면에서 원본 파일명이나 패키지명을 검색하면 해당 코드를 포함한 청크가 나온다. 청크 해시를 미리 알 필요가 없다. 파란색은 원본의 선택 위치와 생성 코드의 선택 테두리다. 원본 줄 전체의 실행 상태를 나타내지 않는다. 생성 코드의 초록색·주황색·회색은 각각 실행 관측·미실행·미측정이며 화면에도 이 구분을 표시한다.

JSON 보고서는 `schemaVersion: 2`다. 기본 `--json`은 합계와 청크별 원본 연결(`bundles[].sources`), 검증 정보(`verification`)를 남기는 요약이다. `--details --json detailed.json`을 지정하면 `bundles[].spans`, `generatedSource`, 원본 코드까지 포함한다. `details` 필드로 두 출력을 구분한다. HTML과 JSON을 함께 출력하더라도 JSON의 상세 여부는 `--details`로 결정한다.

상세 JSON의 `spans[].source`는 해당 번들의 `sources` 배열 인덱스다. `start/end`는 반열린 UTF-8 바이트 범위, `startUtf16/endUtf16`은 JavaScript 문자열을 자르기 위한 UTF-16 범위다. `original`의 줄·열은 0부터 세는 소스맵의 매핑 지점이며, 원본 코드의 실행 범위가 아니다.

`sourcesContent`가 있으면 원본 주변 코드를 보여주고, 없으면 위치만 제공한다. 상세 JSON·HTML에는 생성 코드와 map에 포함된 원본 코드가 들어간다. 큰 번들에서는 접힌 구간 목록을 100개씩 더 표시하고 선택한 구간 주변만 렌더링한다. 생성 구간 하나가 아주 크면 첫 10,000 UTF-16 단위까지만 화면에 표시하지만 상세 데이터에는 전체 코드와 범위가 남는다.

HTML은 요약 메타데이터와 청크별 상세 데이터를 각각 독립된 JSON 블록으로 저장한다. 구간은 숫자 배열이고 각 블록이 16KiB를 넘으면 gzip/base64로 포함한다. 첫 화면에서는 요약만 파싱하며, 코드를 열 때 선택한 청크만 디코딩한다. 디코딩한 상세 데이터는 한 청크만 보관하고 탐색을 닫거나 다른 청크로 이동하면 해제한다. 전체 인코딩된 데이터는 HTML DOM에 계속 남아 있으며, 압축된 블록에는 `DecompressionStream` 지원이 필요하다. 외부 네트워크 요청은 발생하지 않는다.

전체 블로그 107개 청크의 최초 pretty JSON은 약 517MiB였다. 현재 요약 JSON은 약 0.75MiB, HTML은 약 28MiB다. 전체 데이터를 한 번에 파싱하던 이전 HTML과 파일 크기가 비슷해도 초기 로딩 방식은 다르다. [results/report-size.json](results/report-size.json)에 초기·선택·복귀 후 GC 힙, 약 50ms 간격의 JS 힙 표본 최댓값, 첫 화면 준비 시각을 기록했다. 단일 로컬 headless 실행이며 프로세스 전체 메모리의 최고치나 통계적 성능 벤치마크는 아니다.

### 표준 커버리지 파일 가져오기

전용 envelope 외에 다음 형식을 자동으로 구분한다.

| 입력                                                     | 코드 일치 검증                               | map의 수집 시점 검증                |
| -------------------------------------------------------- | -------------------------------------------- | ----------------------------------- |
| 기존 `schemaVersion: 1` envelope                         | 기록된 SHA-256                               | 기록된 map SHA-256 또는 명시적 부재 |
| Chrome Coverage export / Puppeteer `{url,text,ranges}[]` | `text`와 로컬 JS 비교                        | 정보 없음, `unverified`             |
| Playwright `{url,source,functions}[]`                    | `source`가 있으면 로컬 JS 비교               | 정보 없음, `unverified`             |
| CDP / `NODE_V8_COVERAGE`의 `{result:[...]}`              | 소스·해시가 없으면 `--allow-unverified` 필요 | 정보 없음, `unverified`             |

```bash
bundle-trace --dir dist \
  --coverage chrome-coverage.json \
  --url-prefix https://example.com/assets/ \
  --html coverage.html --json coverage.json

# URL이 file:///...이고 파일이 --dir 안에 있으면 자동 연결한다.
bundle-trace --dir dist --coverage coverage-123.json \
  --allow-unverified --html node.html
```

`--url-prefix` 뒤의 URL 경로를 `--dir`에 연결한다. 마지막 `/`는 필수이며 query·fragment는 제거하고 퍼센트 인코딩을 해제한다. 여러 prefix 중 가장 긴 것을 적용한다. 임의의 URL은 `--script-map paths.json`으로 정확히 연결한다. 이 JSON은 `{"https://cdn.example/chunk?id=1":"chunks/app.js"}`처럼 URL과 상대 경로의 객체다. 명시적 연결이 prefix보다 우선하며 `..`, 절대 경로, 역슬래시는 허용하지 않는다. 지원하지 않는 URL과 CSS 항목은 경고와 함께 제외하며, 비어 있지 않은 입력에서 JS가 하나도 연결되지 않으면 실패한다.

일반 export에 현재 map의 해시를 붙여도 **수집 당시 그 map이었다는 증거가 생기지 않는다.** 보고서는 코드 검증과 map 검증을 따로 표시한다. `--allow-unverified`도 이미 주어진 코드나 해시의 불일치를 무시하지 않는다. 코드 증거가 없는 입력에만 적용한다. 표준 입력의 시나리오 이름은 파일명이며, 전용 envelope의 시나리오 이름은 내부 필드를 사용한다.

### 필터, 압축 크기, CI

```bash
bundle-trace --dir dist \
  --include '**/*.js' --exclude 'vendor/**' \
  --compression --max-bytes 1000000 \
  --json artifacts/report.json --html artifacts/report.html \
  --markdown artifacts/summary.md
```

CLI 필터는 `--dir` 기준 번들 경로에 적용된다. `*`는 `/`를 넘지 않고 `**`는 하위 경로를 포함하며, exclude가 include보다 우선한다. 이 필터는 합계와 CI 예산의 분모를 바꾼다. 제외한 파일은 `excludedBundles`에 남고, 선택 결과가 비면 실패한다. 원본별 필터는 현재 HTML의 표시 기능으로만 제공한다.

`--compression`은 gzip level 6과 Brotli quality 5/lgwin 22로 **각 번들 전체**를 압축한다. 전체 값은 각 파일 압축 크기의 합이다. 원본 조각별 압축 크기나 삭제 시 절감량을 추정하지 않으며 실제 서버 인코딩 설정과 다를 수 있다.

같은 level 6이어도 기록된 fixture의 gzip은 Rust에서 241B, Node zlib에서 239B였다. 구현별 압축 크기 일치를 가정하지 않으며, Rust 테스트는 생성 스트림의 복원과 실제 길이를 검증한다. 설정은 보고서의 `compressionSettings`에도 남긴다.

`--config ci.json`으로 분석·CI 설정을 보관할 수도 있다. 입력·출력 경로와 URL 연결은 CLI로 지정한다.

```json
{
  "include": ["**/*.js"],
  "exclude": ["vendor/**"],
  "compression": true,
  "budgets": {
    "maxBytes": 1000000,
    "maxUnobservedBytes": 300000,
    "maxUnmeasuredBytes": 0,
    "maxGzipBytes": 300000,
    "maxBrotliBytes": 250000
  }
}
```

CLI의 include/exclude는 설정 목록에 추가되고, CLI 예산 값은 설정 값을 덮어쓴다. 압축 예산을 지정하면 압축 계산을 자동으로 켠다. 알 수 없는 설정 키는 오류다. 종료 코드는 정상 `0`, 입력·분석 오류 `1`, 예산 초과 `2`다. 예산을 초과해도 보고서는 먼저 저장한다. 미측정이 많으면 미실행이 적어 보일 수 있으므로, 측정 범위도 관리하려면 `maxUnmeasuredBytes`를 함께 지정한다. CI 요약 생성은 외부 서비스에 댓글을 게시하지 않는다.

## V8 기록 수집과 오프라인 분석

선택적인 수집·검증 스크립트는 이 디렉터리의 별도 pnpm workspace를 사용한다.

```bash
cd experiments/bundle-trace
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
cd ../..
```

블로그의 분석용 프로덕션 빌드를 만든다. `BUNDLE_TRACE=1`은 브라우저 소스맵을 켜고 출력 경로를 `.next/bundle-trace`로 바꾼다. 기본 빌드 설정은 그대로다. Next.js는 이 옵션에서 map도 제공하므로 로컬 분석 서버에만 사용한다.

```bash
BUNDLE_TRACE=1 GA4_PROPERTY_ID= GOOGLE_APPLICATION_CREDENTIALS_JSON= pnpm --filter blog build
BUNDLE_TRACE=1 GA4_PROPERTY_ID= GOOGLE_APPLICATION_CREDENTIALS_JSON= \
  pnpm --filter blog start --port 4317 --hostname 127.0.0.1
```

다른 터미널에서 수집한다. `initial`은 `networkidle` 이후 1초, `search`는 거기에 검색창 열기·`javascript` 입력·검색 결과 표시까지 추가한 시나리오다. 각각 새 브라우저에서 시작한다. 서비스 워커와 외부 출처 요청은 차단한다. page의 CDP target만 수집하므로 worker·별도 target·서버 실행은 포함하지 않는다.

```bash
node experiments/bundle-trace/scripts/collect.mjs \
  --url http://127.0.0.1:4317/ \
  --dir apps/blog/.next/bundle-trace/static \
  --scenario initial \
  --out experiments/bundle-trace/artifacts/blog-initial.coverage.json

node experiments/bundle-trace/scripts/collect.mjs \
  --url http://127.0.0.1:4317/ \
  --dir apps/blog/.next/bundle-trace/static \
  --scenario search \
  --out experiments/bundle-trace/artifacts/blog-search.coverage.json
```

수집기는 브라우저에서 읽은 소스와 디스크 파일의 SHA-256을 대조한다. 다음 분석 단계도 JS와 map의 해시를 검증한다. 파일명이나 URL이 같아도 내용이 다르면 실패한다. 분석할 빌드와 실행 기록은 함께 보관해야 한다. 수집이 끝나면 서버와 브라우저 없이 다음 명령을 실행할 수 있다.

```bash
experiments/bundle-trace/target/release/bundle-trace \
  --dir apps/blog/.next/bundle-trace/static \
  --coverage experiments/bundle-trace/artifacts/blog-initial.coverage.json \
  --json experiments/bundle-trace/artifacts/blog-initial.json

experiments/bundle-trace/target/release/bundle-trace \
  --dir apps/blog/.next/bundle-trace/static \
  --coverage experiments/bundle-trace/artifacts/blog-search.coverage.json \
  --json experiments/bundle-trace/artifacts/blog-search.json

experiments/bundle-trace/target/release/bundle-trace \
  --dir apps/blog/.next/bundle-trace/static \
  --coverage experiments/bundle-trace/artifacts/blog-initial.coverage.json \
  --coverage experiments/bundle-trace/artifacts/blog-search.coverage.json \
  --json experiments/bundle-trace/artifacts/blog-union.json
```

`--coverage` 없이 같은 명령을 실행하면 정적 분석이다. 터미널은 정적 모드에서 크기순, 커버리지 모드에서 `unobservedBytes`순으로 패키지를 보여준다. `--limit`으로 행 수를 조절한다. JSON에는 전체 파일·패키지·번들 목록과 경고가 들어간다.

### 입력 형식

실험의 전용 수집기는 CDP의 `ScriptCoverage.functions`를 보존하고 파일 식별 정보만 감싼 다음 JSON을 만든다. 위의 표준 입력 어댑터와 별개로, JS와 map 모두 수집 시점에 묶어 검증할 수 있는 형식이다.

```json
{
  "schemaVersion": 1,
  "scenario": "home",
  "scripts": [
    {
      "path": "chunks/app.js",
      "sha256": "SHA-256 of exact UTF-8 JS bytes",
      "sourceMapSha256": "SHA-256 of exact map bytes, or null if absent",
      "functions": [
        {
          "functionName": "",
          "isBlockCoverage": true,
          "ranges": [{"startOffset": 0, "endOffset": 100, "count": 1}]
        }
      ]
    }
  ]
}
```

`path`는 `--dir` 기준 상대 경로다. `sourceMapSha256`는 map이 존재하면 필수다. 서로 다른 시나리오, 같은 파일의 여러 실행, `takePreciseCoverage`의 여러 delta를 별도 envelope로 넣을 수 있다. 자식 범위가 부모의 실행 상태를 덮어쓰는 규칙을 적용한 뒤 기록 간 합집합을 계산한다. 부모가 0이고 자식이 1인 경우도 지원한다.

## 어떤 import를 통해 들어왔는가

선택적 `--metafile`은 **같은 빌드에서 생성한 esbuild metafile**을 읽는다. 소스맵과 별개인 데이터이며, 이 파일 자체는 콘텐츠 해시로 검증하지 않으므로 다른 빌드의 메타데이터를 섞으면 안 된다. 입력 모듈 그래프에서 한 가지 최단 경로를 구한다. 런타임 호출 그래프나 모든 유입 원인을 보여주는 것은 아니다.

```bash
experiments/bundle-trace/target/release/bundle-trace \
  --dir experiments/bundle-trace/artifacts/fixture \
  --metafile experiments/bundle-trace/artifacts/fixture-meta.json \
  --why fixtures/feature.js
```

이 fixture는 아래 검증 명령이 생성한다. JSON의 `importPaths`에 원본 입력 키, 메타파일의 `bytesInOutput` 합계, import 경로를 기록한다. 메타파일의 크기 계산과 소스맵 귀속 크기는 기준이 다르므로 동일하다고 가정하지 않는다.

Turbopack·webpack import graph 어댑터는 아직 없다. 이번 블로그의 `LayoutWrapper → SiteSearch → minisearch` 경로는 저장소 코드를 직접 읽어 확인한 결과다. Rust가 소스맵만으로 이 경로까지 알아냈다고 주장하지 않는다.

## 검증과 결과 재생성

```bash
cargo test --locked --manifest-path experiments/bundle-trace/Cargo.toml
node experiments/bundle-trace/scripts/verify.mjs
node experiments/bundle-trace/scripts/verify-formats.mjs
node experiments/bundle-trace/scripts/verify-blog.mjs \
  --dir apps/blog/.next/bundle-trace/static
node experiments/bundle-trace/scripts/summarize-blog.mjs
```

Rust 테스트는 중첩 범위, 겹치는 시나리오, Unicode, CRLF, 빈·중첩 index-map 섹션, 매핑 전 접두부, 잘못된 섹션 순서와 겹침, map 파일명, 잘못된 매핑, 해시 불일치 등을 다룬다. 브라우저 fixture는 초기 실행과 후속 호출의 delta를 수집한 뒤, Rust 상세 구간의 시작·끝·상태를 별도의 코드 유닛별 배열 계산과 비교한다. UTF-8 경계도 문자 단위로 다시 계산한다. 합계가 같은데 실행 구간의 위치만 바꾼 부정 대조군은 반드시 실패한다. 이는 source map의 의미적 정확성까지 증명하지 않으므로 원본 귀속은 별도 반례로 검사한다.

`verify-formats.mjs`는 실제 Playwright·Node 입력, 독립 검산으로 만든 DevTools export 형태, 오프라인 HTML 탐색·검색·모바일 표시·압축 데이터 복원을 검증한다. 블로그 전체 보고서를 `artifacts/reports/blog.html`과 `blog.json`에 생성한 경우 `node scripts/verify-large-report.mjs`로 큰 보고서의 MiniSearch 구간 탐색을 재현할 수 있다.

2026-09-22 로컬 블로그 기록은 [results/blog-summary.json](results/blog-summary.json)에 있다. 각 시나리오 1회이며 성능 벤치마크가 아니다. 원본 커버리지와 상세 리포트는 로컬 `artifacts/`에 생성되며 Git에서는 제외한다. summary에는 실행 환경, 입력 기록의 해시, 측정한 번들 해시와 바이트 수, 경고를 남긴다. 현재 소스에서 다시 빌드하면 콘텐츠 해시와 결과는 달라질 수 있다.

`blog-summary.json`은 첫 탐색 빌드의 기록이다. 아래 비교 빌드는 소스 경로와 청크 생성 결과가 달라 바이트 수가 약간 다르다. 본문은 아래의 `study-*` 결과를 사용한다.

## 독립 검산과 DevTools 대조

`scripts/vendor/devtools-coverage.ts`에는 DevTools의 `convertToDisjointSegments`, `calculateSizeForSources`를 고정 리비전 `63555438dd48b3cdecaa6293b01c446d86176d42`에서 추출했다. 메서드 선언만 exported function으로 바꿨으며 라이선스를 함께 보관했다. UI 전체를 검증하는 것이 아니라 해당 함수에 같은 입력을 넣는 비교다.

```bash
node experiments/bundle-trace/scripts/verify-devtools.mjs
```

아래 study의 원본 기록과 리포트가 있어야 실행된다. 측정된 청크만 상세 JSON으로 임시 재분석해, 77건의 스크립트에서 실행·미실행 구간의 시작·끝·상태 및 UTF-8 경계를 대조한다. 전체 빌드의 거대한 상세 JSON을 만들 필요는 없다. `foo();\nbar();`에 첫 위치의 매핑 하나만 준 사례에서는 원본 귀속이 DevTools 13, Rust 6으로 달라진다. 본문이 같은 문자열을 표시하는지도 검증한다. 결과는 [results/devtools-parity.json](results/devtools-parity.json)에 있다.

## 클래스 메서드 보존 분리 실험

```bash
node experiments/bundle-trace/scripts/study-class-shaking.mjs
```

`artifacts/class-shaking/app`에 별도 Next.js 앱을 만들고 설치된 블로그의 Next.js를 사용한다. 운영 앱이나 기존 비교 빌드는 변경하지 않는다. named export, 클래스 직접 호출, 동적 메서드 호출, 미사용 클래스 전체, 로컬 클래스를 같은 문자열 반환 예제로 비교한다. 생성된 클라이언트 JS에서 고유 본문 마커를 검사하며 소스맵은 제외한다. 같은 입력의 esbuild 출력은 실행 결과도 확인한다. [results/class-shaking.json](results/class-shaking.json)에 입력과 버전, esbuild 출력, 해당 Turbopack 청크 해시가 있다. MiniSearch 자체를 재설계한 실험이나 번들러 내부 패스에 대한 증명은 아니다.

## 블로그 빌드 비교 재현

저장소 루트에서 실행한다. 이 절만 블로그 소스에 의존한다. 복사본을 `.cache/bundle-trace-study/app`에 만들고, 같은 소스 경로에서 MiniSearch 정적 import와 동적 import 두 빌드를 만든다. 빌드 출력은 `.next/baseline`, `.next/lazy`로 나눈다.

```bash
node experiments/bundle-trace/scripts/prepare-study.mjs
```

복사본 디렉터리에서 터미널 두 개에 각각 서버를 실행한다. `next` 실행 파일은 블로그에 설치된 것을 사용한다.

```bash
cd .cache/bundle-trace-study/app
BUNDLE_TRACE=1 BUNDLE_TRACE_VARIANT=baseline ./node_modules/.bin/next start -p 4317
# 다른 터미널, 같은 디렉터리
BUNDLE_TRACE=1 BUNDLE_TRACE_VARIANT=lazy ./node_modules/.bin/next start -p 4318
```

수집기는 일반적인 첫 진입 분석에 `--url`, `--dir`, `--out`만 필요하다. `--scenario search|about`과 `--block-prefetch`는 이 블로그의 비교 시나리오다. 프로젝트 디렉터리에서 다음을 실행하면 여섯 시나리오를 수집한다.

```bash
node experiments/bundle-trace/scripts/collect-study.mjs
node experiments/bundle-trace/scripts/analyze-study.mjs
node experiments/bundle-trace/scripts/verify-devtools.mjs
```

결과는 [results/study-coverage.json](results/study-coverage.json), [results/study-methods.json](results/study-methods.json)에 저장된다. 기본 홈 672,025B에서 prefetch 요청을 차단하면 607,873B가 된다. 동적 import 빌드의 홈은 654,518B이며 검색 시 17,766B를 추가로 받는다.

시간·응답 본문 크기는 커버리지를 끈 별도 스크립트로 측정했다.

```bash
node experiments/bundle-trace/scripts/measure-study.mjs \
  --rounds 4 --out experiments/bundle-trace/artifacts/study/timing-complete.json
node experiments/bundle-trace/scripts/summarize-study-timing.mjs
```

새 컨텍스트, 외부 출처 차단, CPU 4배 감속, 지연 150ms, 다운로드 1.6Mbps, AB/BA 순서로 각 네 번이다. 바이트는 Resource Timing의 응답 본문이며 HTTP 헤더는 제외한다. 검색 시간은 클릭 이벤트에서 결과 DOM 추가까지다. paint나 INP가 아니다. 첫 pilot은 네 표본 뒤 추가 animation-frame 마커 대기에서 timeout이 났다. 원인은 확정하지 못했으며, 완료 실행에서는 결과의 표시와 DOM 시각을 기다리고 pilot의 시간은 제외했다.

[results/study-timing.json](results/study-timing.json)에 완료한 여덟 표본과 조건을 남겼다. 기본 빌드와 변경 빌드의 초기 JS 응답 본문은 211,332B와 205,689B다. 로컬 API 인덱스 3,775,467B가 압축 없이 전송되어 첫 검색은 양쪽 모두 약 20초였다. CDN 실서비스 성능으로 일반화하지 않는다.
