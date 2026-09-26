# 토스증권 실행 기록 수집과 재분석

[분석 글](/2026/09/tracing-third-party-javascript-without-sourcemaps)의 재현 절차다. 본문의 측정값은 2026년 9월 26일 [토스증권](https://www.tossinvest.com/)에서 저장한 JS와 방문 4개의 실행 기록을 npm의 [`@yceffort/coldpath@0.3.1`](https://www.npmjs.com/package/@yceffort/coldpath/v/0.3.1)로 분석한 결과다. 0.3.1은 Sentry 코드가 쉼표로 붙은 webpack 청크를 모듈로 복원하는 수정([커밋 `7dca3ee`](https://github.com/yceffort/coldpath/commit/7dca3ee454c1f2630036ec35f041fbd92363b41e))을 포함한다. 0.3.0으로 `modules`를 실행하면 본문보다 적은 모듈만 복원된다.

아래 절차는 사이트를 새로 방문해 수집부터 다시 하는 방법이다. 새 방문은 사이트의 배포와 응답에 따라 값이 달라진다.

## 공개하지 않은 증거 묶음

본문의 증거 묶음(약 4.1MB, SHA-256 `7a7bc774a8bdd65a8bdf67937938b8610a79f5b9ac965c53ce0b4500e90c2220`)은 `analyze --export`에 `--export-select`를 붙여 만든 발췌(`kind: "excerpt"`)다. 에디터 경로에 있는 청크 7개와 그 합성 소스맵, 방문 4개의 커버리지에서 이 청크들의 항목만 남긴 기록, `manifest.json`이 들어 있다. 커버리지 항목은 원래 offset과 호출 횟수, 소스 본문을 유지한다. 토스증권의 코드가 그대로 들어 있어서 이 묶음은 배포하지 않는다.

측정 당시 묶음 안의 `verify-toss-factories-2026-09-26.mjs`는 기록된 청크 본문이 묶음 안의 파일과 같은지 확인한 뒤, 각 모듈 함수의 시작 위치와 일치하는 V8 함수 항목에서 첫 범위의 `count`를 읽었다. 출력은 다음과 같았다.

```text
initial.json: 5099=1, 75745=1, 57427=1, 70388=1, 96245=1, 54017=1, 42120=1, 33036=1, 73681=1, 61750=1
search.json: 5099=1, 75745=1, 57427=1, 70388=1, 96245=1, 54017=1, 42120=1, 33036=1, 73681=1, 61750=1
stock.json: 5099=1, 75745=1, 57427=1, 70388=1, 96245=1, 54017=1, 42120=1, 33036=1, 73681=1, 61750=1
feed.json: 5099=1, 75745=1, 57427=1, 70388=1, 96245=1, 54017=1, 42120=1, 33036=1, 73681=1, 61750=1
```

같은 묶음을 `npx @yceffort/coldpath@0.3.1 --replay toss-evidence`로 검사하면 입력 해시를 먼저 확인하고, 선택한 청크의 바이트 수와 실행 구간의 digest를 기록과 비교한다. 성공하면 다음 문장을 출력하고 종료 코드 `4`를 돌려준다. 다른 버전으로 실행하면 종료 코드 `3`과 함께 기록된 버전을 안내한다. 전체 107개 파일의 합계는 이 묶음으로 재현할 수 없다.

```text
Replay verified an excerpt, not a complete reproduction: 7 selected bundles reproduced their counts and spans; 202 omitted inputs and the full-analysis totals were not checked.
```

아래 절차로 직접 수집하고 [발췌 내보내기](#발췌-내보내기)까지 실행하면 같은 형식의 묶음을 만들어 `--replay`로 확인할 수 있다.

## 새로 수집하기

### 준비

Node.js 24 이상에서 새 작업 디렉터리에 설치한다. macOS(arm64, x64)와 Linux(arm64, x64, glibc 2.35 이상)에서는 플랫폼용 분석기가 함께 설치된다. Windows는 지원하지 않는다.

```bash
mkdir coldpath-toss
cd coldpath-toss
npm init -y
npm install --save-dev --save-exact @yceffort/coldpath@0.3.1 playwright@1.63.0
npx playwright install chromium
alias coldpath="npx @yceffort/coldpath"
```

측정에는 Playwright 1.63.0의 Chromium을 사용했다. `snapshot`은 뷰포트 1280×900으로 페이지를 열고, `load` 후 5초를 기다린 뒤 지정한 동작을 수행한다.

### 동작 스크립트

`actions` 디렉터리에 다음 세 파일을 저장한다. 선택자는 측정 당시 페이지 기준이므로 사이트가 바뀌면 함께 고쳐야 한다. 로그인하지 않은 상태에서 수행했다.

`actions/search.mjs`는 상단 검색에 삼성전자를 입력하고 종목 코드 `005930`이 결과에 나타날 때까지 기다린다.

```js
export default async function ({page}) {
  await page.getByRole('button', {name: '/ 를 눌러 검색하세요'}).click()
  await page.getByPlaceholder('검색어를 입력해주세요').pressSequentially('삼성전자', {delay: 80})
  await page.getByRole('option').filter({hasText: '005930'}).first().waitFor({timeout: 10000})
  await page.waitForTimeout(1500)
}
```

`actions/stock.mjs`는 같은 검색 결과를 눌러 종목 화면으로 이동한다.

```js
export default async function ({page}) {
  await page.getByRole('button', {name: '/ 를 눌러 검색하세요'}).click()
  await page.getByPlaceholder('검색어를 입력해주세요').pressSequentially('삼성전자', {delay: 80})
  const option = page.getByRole('option').filter({hasText: '005930'}).first()
  await option.waitFor({timeout: 10000})
  await option.click()
  await page.waitForURL(/\/stocks\/[^/]*005930/, {timeout: 10000})
  await page.waitForTimeout(3000)
}
```

`actions/feed.mjs`는 상단의 피드로 이동해 글 목록이 나타날 때까지 기다린다.

```js
export default async function ({page}) {
  await page.getByRole('link', {name: '피드'}).first().click()
  await page.waitForURL(/\/feed\//, {timeout: 10000})
  await page.getByText('의견 남기기').first().waitFor({timeout: 10000})
  await page.waitForTimeout(3000)
}
```

### 수집

첫 진입과 동작 3개를 같은 디렉터리에 차례로 저장한다. 각 방문은 새 브라우저에서 시작하므로 동작 기록에도 그 방문의 초기 로딩이 포함된다.

```bash
coldpath snapshot --url https://www.tossinvest.com/ --out artifacts/toss --scenario initial
for s in search stock feed; do
  coldpath snapshot --url https://www.tossinvest.com/ --out artifacts/toss \
    --scenario "$s" --actions "actions/$s.mjs"
done
```

측정 당시 `www.googletagmanager.com/gtm.js`는 방문마다 내용이 조금씩 다른 판이 내려왔다. 먼저 저장한 판과 다른 판을 받으면 `snapshot`은 `gtm.js differs from the copy an earlier snapshot saved`로 실패하고 아무것도 추가하지 않는다. 서로 다른 코드의 실행 범위를 한 파일로 합치지 않기 위한 동작이다. 이번 수집에서는 같은 판이 나올 때까지 다시 시도해, 검색 방문은 12번째, 종목 방문은 4번째, 피드 방문은 첫 시도에 저장됐다. 토스증권의 스크립트는 네 방문 모두 같은 빌드(`LCgFIQwFsag3GrRgpJus7`)였다.

### 모듈 경계 복원과 분석

```bash
coldpath modules --dir artifacts/toss/files --out artifacts/toss/modules \
  --maps-json artifacts/toss/maps.json --chunks --graph artifacts/toss/graph.json

coldpath analyze --dir artifacts/toss/files --url-prefix https:// \
  --coverage artifacts/toss/coverage/initial.json \
  --coverage artifacts/toss/coverage/search.json \
  --coverage artifacts/toss/coverage/stock.json \
  --coverage artifacts/toss/coverage/feed.json \
  --initial-scenario initial.json \
  --scenario-order initial.json,search.json,stock.json,feed.json \
  --maps-json artifacts/toss/maps.json --maps-json artifacts/toss/modules/maps.json \
  --loading artifacts/toss/loading.json --details \
  --json artifacts/toss/report.json --treemap artifacts/toss/report.html
```

`--details`는 생성 코드와 실행 구간을 보고서에 넣는다. 본문에 올린 [보고서](/demos/coldpath/toss-report-2026-09-26.html)는 토스증권의 코드를 싣지 않으려고 `--details`를 빼고 `--labels`를 더해 다시 만든 것이다.

측정 당시의 출력은 다음과 같았다.

```text
Recovered 6183 modules in 102 chunks, 5 whole-chunk sources
Generated UTF-8 bytes: 14151337 (107 bundles)
Observed: 4937525 | Unobserved: 9213812 | Unmeasured: 0
```

같은 입력을 0.3.0(커밋 `8fbe871`)의 `modules`로 처리하면 `Recovered 2748 modules in 64 chunks, 43 whole-chunk sources`가 나온다. 합성 소스맵은 수집 뒤에 만든 것이므로 모든 파일에 `source=source-text, source-map=unverified` 경고가 붙는다.

`--graph`로 만든 그래프는 모듈 함수 안의 `n(id)` 호출을 간선으로 삼는다. 본문의 경로는 이 그래프에서 홈 진입 모듈 `3084`로부터 `73681`까지의 최단 경로를 구하고, 각 간선을 생성 코드에서 확인한 것이다. 에디터를 통해서만 닿는 모듈 13개는 첫 진입에서 실행된 모듈 중 다른 모듈이 불러오지 않는 모듈 18개를 시작점으로 두고, `42120`으로 들어가는 간선을 끊었을 때 도달하지 못하게 되는 모듈을 셌다. `dynamic` 간선은 제외했다.

### 라벨

모델의 라벨은 선택 사항이다. 코드의 일부와 문자열 표본을 모델 제공자에게 보낸다.

```bash
npm install --save-dev @anthropic-ai/sdk@0.128.0
export ANTHROPIC_API_KEY=...
coldpath label --report artifacts/toss/report.json --out artifacts/toss/labels.json \
  --top 80 --lang Korean --mode identify --provider anthropic --model claude-haiku-4-5
```

이후 앞의 `analyze`에 `--labels artifacts/toss/labels.json`을 붙여 다시 실행한다. 측정 당시에는 80개 모두 라벨이 붙었고, 2개는 근거 문자열이 걸러져 이름 추정이 버려졌다. 입력 224,945 토큰, 출력 24,051 토큰을 사용했다. 모델의 답은 실행마다 달라질 수 있다.

### 발췌 내보내기

본문의 증거 묶음은 라벨을 붙인 `analyze` 명령 끝에 `--export`와 `--export-select`를 더해 만들었다.

```bash
P=www.tossinvest.com/assets/v2/_next/static/chunks
coldpath analyze ... --labels artifacts/toss/labels.json \
  --export artifacts/toss/evidence \
  --export-select $P/pages/index-b182e4e7a2464f9c.js \
  --export-select $P/532-e3ef6e8144370fd5.js \
  --export-select $P/8814-e376aadbf781b406.js \
  --export-select $P/4017-a0e514dda47466d9.js \
  --export-select $P/3876-b582271fb942ae1b.js \
  --export-select $P/17312c0e-063710eada4efca1.js \
  --export-select $P/31f91cad-9d2b77d634b7151e.js
```

`...`는 앞의 `analyze` 명령과 같은 입력 옵션이다. 묶음에는 이렇게 만든 디렉터리에 검증 스크립트를 더했다.

본문의 모든 수치와 원래 커버리지 4개의 SHA-256은 [측정 요약 JSON](/demos/coldpath/toss-summary-2026-09-26.json)에 남겼다.
