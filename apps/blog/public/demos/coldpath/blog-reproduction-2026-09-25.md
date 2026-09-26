# 블로그의 검색과 다이어그램 확대 기록하기

[분석 글](/2026/09/tracing-bundle-waste-with-v8-coverage-and-sourcemaps)의 9월 25일 기록을 수집하는 절차다. 원래 측정값은 coldpath `24a1a995443dc494926e9d841091e32ac7c52860`과 블로그의 시나리오 설정 `0e20da2c` 기준이다. 같은 입력을 0.1.1로 재계산해 합계와 원본별 값이 같음을 확인했다. 저장된 입력으로 실행할 때는 [재계산 문서](/demos/coldpath/recalculation-0.1.1-2026-09-25.md)를, 새 빌드에서 수집할 때는 아래 npm의 [`@yceffort/coldpath@0.3.1`](https://www.npmjs.com/package/@yceffort/coldpath/v/0.3.1) 명령을 사용한다. 새 빌드와 새 방문의 수치는 달라질 수 있다.

## 분석기 준비

Node.js 24 이상에서 블로그 저장소 루트에 패키지를 설치한다. 이 저장소는 pnpm 워크스페이스이므로 `-w`로 루트를 지정한다. macOS와 Linux의 ARM64, x64용 분석기는 npm 의존성으로 함께 설치된다. Linux는 glibc 2.35 이상이 필요하다.

```bash
pnpm add -Dw @yceffort/coldpath@0.3.1 playwright@1.63.0
pnpm exec playwright install chromium
```

이후 coldpath 명령도 모두 블로그 저장소 루트에서 실행한다. 별도의 coldpath 저장소나 Rust 빌드는 필요 없다.

## 빌드와 시나리오 수집

블로그의 `apps/blog/next.config.ts`에는 `COLDPATH=1`일 때 `productionBrowserSourceMaps: true`와 `distDir: '.next/coldpath'`를 적용하는 설정을 두었다. `blog` 저장소 루트에서 프로덕션 빌드를 만들고 실행한다. 아래 서버는 3000번 포트를 쓰므로, 같은 포트의 개발 서버를 사용 중이면 먼저 종료해야 한다.

```bash
COLDPATH=1 pnpm --filter blog build
COLDPATH=1 pnpm --filter blog start
```

서버를 켠 터미널은 그대로 두고, 다른 터미널에서 수집한다. `next dev`로 만든 개발용 코드와 프로덕션 빌드의 소스맵을 섞지 않도록 빌드와 서버 실행에 같은 `COLDPATH` 설정을 사용한다.

수집할 동작은 [블로그의 시나리오 파일](https://github.com/yceffort/blog/blob/0e20da2c/apps/blog/coldpath/coldpath.scenarios.json)에 다음과 같이 지정했다. 대상은 Mermaid 다이어그램이 있는 글이다. `dir`, `out`, `actions`는 이 JSON 파일이 있는 디렉터리를 기준으로 해석한다.

```json
{
  "url": "http://127.0.0.1:3000/2026/08/k8s-for-frontend-1",
  "dir": "../.next/coldpath/static",
  "prefix": "/_next/static/",
  "out": "out/coverage",
  "scenarios": [
    {"name": "initial"},
    {"name": "search", "actions": "scenarios/search.mjs"},
    {"name": "zoom-diagram", "actions": "scenarios/zoom-diagram.mjs"}
  ]
}
```

검색 동작은 `scenarios/search.mjs`에 적었다. 클릭만 하고 수집을 끝내면 검색 인덱스나 라이브러리를 불러오는 도중의 상태가 기록될 수 있으므로, 결과가 나타날 때까지 기다린다.

```js
export default async function ({page}) {
  await page.getByRole('button', {name: '검색', exact: true}).first().click()
  await page.getByPlaceholder('글 검색…').fill('react')
  await page.locator('.search-result').first().waitFor()
}
```

`scenarios/zoom-diagram.mjs`는 첫 다이어그램의 확대 버튼을 누르고, Panzoom이 적용된 뒤 확대를 한 번 수행한다.

```js
export default async function ({page}) {
  const open = page.getByRole('button', {name: '다이어그램 확대'}).first()
  await open.waitFor()
  await open.click()
  await page.waitForFunction(() =>
    [...document.querySelectorAll('div')].some(
      (node) => node.style.cursor === 'move',
    ),
  )
  await page.getByRole('button', {name: 'Zoom in'}).click()
}
```

다음 명령도 `blog` 저장소 루트에서 실행한다. `collect`는 시나리오마다 새 브라우저를 열고, 해당 페이지 진입부터 지정한 동작이 끝날 때까지 기록한다. 검색과 확대는 앞 시나리오의 브라우저를 이어 쓰지 않는다.

```bash
pnpm exec coldpath collect \
  --scenarios apps/blog/coldpath/coldpath.scenarios.json

pnpm exec coldpath analyze \
  --scenarios apps/blog/coldpath/coldpath.scenarios.json \
  --treemap apps/blog/coldpath/out/post.html \
  --json apps/blog/coldpath/out/post.json \
  --markdown apps/blog/coldpath/out/post.md
```

`pnpm exec coldpath analyze`는 패키지와 함께 설치된 플랫폼용 Rust 분석기를 실행한다. `analyze --scenarios`는 같은 설정에서 수집 파일을 찾아 읽고, 첫 시나리오인 `initial`을 비교 기준으로 사용한다. 결과 HTML은 패키지나 원본 파일을 찾아볼 때, JSON과 Markdown은 수치를 비교하거나 글에 옮길 때 사용한다. 코드 구간까지 볼 필요가 있으면 분석 명령에 `--details`를 추가한다.

### import 경로도 보고 싶다면

원본별 크기와 실행량은 위 명령으로 확인할 수 있다. 어떤 import를 거쳐 들어왔는지 표시하려면 같은 소스 리비전에서 만든 번들러 그래프도 필요하다. Next.js 16.3 계열의 Turbopack에서는 `experimental-analyze` 결과를 coldpath가 읽을 수 있는 JSON으로 변환한다.

다음 명령은 `blog` 루트에서 앞의 `next build`보다 먼저 실행한다. 이어서 빌드하고 서버를 띄워 수집하는 순서다. 이 블로그의 Next.js 16.3.5에서 `experimental-analyze`는 `distDir` 설정과 별도로 `.next/diagnostics/analyze`에 결과를 쓴다. 이후 빌드 작업에 영향을 받지 않도록 그래프를 `.next` 밖에 보관한다.

```bash
COLDPATH=1 pnpm --filter blog exec next experimental-analyze --output

pnpm exec coldpath graph \
  --format turbopack \
  --input apps/blog/.next/diagnostics/analyze \
  --root "$PWD" \
  --out apps/blog/coldpath/out/graph.json
```

이후 `analyze` 명령에 `--graph apps/blog/coldpath/out/graph.json --graph-root "$PWD"`를 추가한다. 이 모노레포에서 `[project]` 경로의 기준은 `blog` 루트다. 다른 프로젝트에서는 실제 `turbopack.root`에 맞춰야 한다. Rollup, Vite, webpack, esbuild에서 그래프를 만드는 방법은 [coldpath의 그래프 문서](https://github.com/yceffort/coldpath/blob/c626144e621edf139855be01cd0b3d78fe83b0ce/docs/graphs.md)에 정리했다.
