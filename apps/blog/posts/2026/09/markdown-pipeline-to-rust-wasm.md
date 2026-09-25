---
title: '블로그의 마크다운 파이프라인을 <em>Rust/WASM</em>으로 옮기기'
tags:
  - rust
  - markdown
  - blogging
  - webassembly
  - web-performance
published: true
date: 2026-09-14 15:00:00
description: '블로그의 remark/rehype 체인을 Rust로 옮기고 WASM으로 빌드해 Next.js 서버에 붙였다. 파싱과 HAST 생성에 이어 Oniguruma 하이라이트, MathML 수식, 이미지 크기와 MDX 속성 처리까지 한 호출로 묶었다. 메모리 전달과 해제, 기존 글의 호환성, WASI와 바이너리 배포를 구성하며 얻은 것과 감수한 비용을 기록했다.'
thumbnail: /thumbnails/2026/09/markdown-pipeline-to-rust-wasm.png
series: '블로그 성능 개선하기'
seriesOrder: 2
art:
  undraw: data-transfer
---

## Table of Contents

## remark와 rehype가 하던 일을 WASM에 맡기기로 했다

이 블로그의 마크다운에는 한글 강조와 GFM 표, 각주, 수식, 코드 블록의 파일명, 직접 만든 `<LiveDemo />` 컴포넌트가 함께 들어 있다. 글 하나를 그릴 때마다 remark와 rehype 플러그인이 이 문법을 차례로 처리한다. 파서를 교체하려면 제목과 문단만 같은 HTML로 나오는 것으로는 부족했다. 목차 링크와 코드 색, JSX 컴포넌트까지 기존 글이 같은 방식으로 동작해야 했다.

시작은 성능이었다. 빌드의 정적 페이지 생성이 3분 넘게 걸렸고, 파싱이 병목이라고 생각했다. 결론부터 적으면 그 생각은 틀렸다. 3분의 8할은 파서가 아니라 글 목록을 페이지마다 다시 읽는 데서 나왔고, 파서를 바꿔 줄어든 것은 빌드가 아니라 글 한 편을 처음 여는 시간이었다. 그 사실을 확인하기까지의 순서대로 적는다. 마침 9월 초에 [markdownlint-cli2를 Rust로 옮기면서](/2026/09/porting-markdownlint-cli2-to-rust) `markdown` 크레이트를 고쳐 쓴 적이 있었다. 같은 파서를 블로그 렌더러에 가져다 붙이면 되겠다 싶었다.

처음에는 파싱과 HAST(HTML 구문 트리) 생성만 Rust로 옮겼다. 수식은 KaTeX, 하이라이트는 Prism, 이미지 크기는 JS에서 처리하도록 남겼다. 출력이 달라지는 범위를 줄이기 위한 선택이었지만, 실제로 유지보수할 때는 변환 규칙이 Rust와 JS 양쪽에 흩어져 있었다. 코드 블록 하나를 고치려 해도 어느 단계에서 속성과 클래스를 바꾸는지 두 구현을 함께 읽어야 했다.

그래서 두 번째 단계에서는 목적을 넓혔다. 기존 코드의 색상과 수식의 HTML까지 같아야 한다는 조건은 내려놓고, 마크다운을 받아 React에 전달할 트리를 만드는 일 전체를 WASM으로 모으기로 했다. 현재는 파싱과 목차, 하이라이트, 수식, 이미지 메타데이터, MDX 속성 검증이 모두 Rust에 있다. Node.js는 WASM을 호출하고, 반환된 HAST를 React 요소로 바꾼다. 브라우저에 WASM을 내려보내는 구조는 아니다.

이식의 상당 부분은 Rust 문법보다 블로그가 기대하는 동작을 구체화하는 데 들어갔다. 한글 강조와 제목 링크를 어떻게 맞출지, 코드 색이 바뀌어도 지켜야 하는 것은 무엇인지, 수식과 이미지가 깨지지 않았다는 것을 어디까지 확인할지 정해야 했다. 아래는 처음 파서를 옮긴 과정과, 남은 후처리를 같은 WASM으로 합치기까지의 기록이다.

> 초기 이식과 빌드 수치는 `feat/markdown-rs`의 `b536d191` 기준 기록이다. 빌드는 GitHub Codespaces `standardLinux32gb`(4 vCPU AMD EPYC 7763, 16GB, Ubuntu 24.04.4 LTS)와 로컬 iMac(Apple M1 8코어, 16GB, macOS 26.6.2)에서 쟀다. 양쪽 모두 Node 24.20.0, pnpm 12.1.0, Next.js 16.3.1이다. `.next`를 지우고 첫 빌드를 한 뒤 두 번째 빌드를 이어서 실행했으며, 인기글 데이터가 바뀌지 않도록 GA4 자격증명 없이 빌드했다. 당시 작업 계획과 Rust 코드 리뷰는 내가 하고 구현은 Claude Code가 했다. 이 초기 기록 중 hast JSON 크기, 릴리즈 프로파일 비교, 정적 페이지 334장 대조, Codespaces와 M1의 빌드 표는 당시 터미널 출력에서 옮긴 값이고 원시 기록은 저장소에 남기지 않았다. 입력 해시와 함께 보존한 것은 `bench-results.json`, `bench-wasi-results.json`, `experience-results.json`이다.

> 후처리 통합과 새 벤치는 2026년 9월 14일, `feat/blog-performance`의 `f27162bd`에 변경을 적용한 작업 트리 기준이다. Node 24.20.0, Rust 1.88.0, Apple M1, macOS arm64(Darwin 25.6.0)에서 확인했다. 초기 출력 일치와 빌드 기록은 현재의 하이라이터와 수식 렌더러를 검증한 결과가 아니므로 구분해서 적었다.

## 처음에는 후처리를 남겼고, 나중에는 그 경계를 옮겼다

기존 체인은 `next-mdx-remote-client`가 `remark-parse`, `remark-gfm`, `remark-math`, `remark-mdx`, `remark-cjk-friendly`, `remark-toc`, `remark-rehype`를 거친 뒤 `rehype-katex`, `rehype-slug`, 직접 쓴 파일명 추출, `rehype-prism-plus`, Prism 클래스를 바꾸던 `parseCodeSnippet`, `rehype-autolink-headings`, 이미지 처리 순으로 돌리는 구조였다.

처음 이식에서는 파싱부터 제목 링크까지를 옮겼다. Prism을 syntect로 바꾸면 토큰 경계와 색이 달라지고, KaTeX를 다른 구현으로 바꾸면 수식 HTML이 달라진다. 기존 출력을 그대로 유지하는 작업과 렌더러를 교체하는 작업을 동시에 하지 않으려던 판단이었다. 이미지도 호스트 import가 없는 `wasm32-unknown-unknown` 모듈에서는 읽을 수 없었다.

후처리를 통합할 때는 유지할 조건을 다시 정했다. 코드의 원문과 줄 번호, 강조 줄, 파일명은 보존한다. 토큰을 나누고 색칠하는 방식은 바꿀 수 있다. 수식은 TeX 원문과 인라인/블록 구분을 유지하고, 기존 글에 쓰인 명령이 변환되는지 확인한다. 이미지의 경로와 크기, 대체 텍스트는 기존 결과와 대조한다. 이 조건이면 출력 전체의 바이트 일치를 포기해도 어디가 달라져도 되는지 알 수 있다.

| 현재 WASM이 하는 일                     | 구현                                     |
| --------------------------------------- | ---------------------------------------- |
| CommonMark, GFM, 수식과 MDX 문법 파싱   | 수정한 `markdown` 1.0.0                  |
| 한글 강조와 JSX 문단 처리               | 파서 패치와 `to_hast.rs`                 |
| 목차, HAST, 제목 id와 링크, 코드 파일명 | `toc.rs`, `to_hast.rs`, `transforms.rs`  |
| 코드 하이라이트와 줄 메타데이터         | syntect 5.3.0, Oniguruma, two-face 문법  |
| TeX 수식을 MathML로 변환                | math-core 0.5.0                          |
| 이미지 경로와 크기, 대체 텍스트         | WASI 파일 접근, imagesize, SVG 크기 처리 |
| MDX 리터럴 속성 변환과 표현식 검증      | `mdx.rs`                                 |

## 정규식 엔진도 WASM 안에서 바꿀 수 있었다

syntect가 느린 이유를 WASM이라는 실행 형식 하나로 설명할 수는 없었다. 정규식 엔진과 문법 처리, 초기화 반복, WASM 호출과 입력 전달, 벤치 범위와 빌드 설정을 나누어 확인했다. 별도 실험에서는 코드 블록을 미리 읽어 WASM에 한 번 전달하고, 문법과 인스턴스를 재사용한 상태에서 `ParseState::parse_line`만 측정했다.

두 구현이 공통으로 지원하는 코드 블록 2,587개에서 fancy-regex를 쓴 WASM의 중앙값은 2,341.5ms였다. 같은 블록을 같은 프로세스에서 Prism으로 돌리면 125.3ms다. 18.7배 차이다. 같은 syntect 코드와 입력을 네이티브로 빌드한 결과는 fancy-regex 1,662.8ms, Oniguruma 593.5ms였다. 초기화를 반복하지 않아도 차이가 남았고, 네이티브에서 정규식 엔진을 바꾸자 시간이 줄었다. 이 결과 때문에 Oniguruma를 WASM으로 빌드해 볼 근거가 생겼다.

Oniguruma는 C 라이브러리다. Rust 코드의 기능 플래그만 바꾸면 끝나는 것이 아니라, C 코드가 요구하는 헤더와 표준 라이브러리도 WASM 타깃에 맞춰야 했다. 여기서는 [wasi-sdk 27](https://github.com/WebAssembly/wasi-sdk/releases/tag/wasi-sdk-27)의 Clang과 libc를 쓰고 Rust 타깃을 `wasm32-wasip1`로 바꿨다. Node의 [WASI API](https://nodejs.org/docs/v24.20.0/api/wasi.html)가 모듈의 시스템 호출을 연결한다. 정규식 매칭 자체를 JS로 넘기는 구조는 아니다.

별도 Oniguruma WASM 실험도 같은 2,587개 입력을 처리했고, 예열 후 6회 중앙값은 689.7ms였다. 엔진을 바꿔 3.4배를 벌었지만 Prism의 125.3ms에 견주면 여전히 5.5배 느리다. 교체 전보다 빠른 하이라이터가 아니라는 사실은 이 작업의 비용으로 남는다. 블록 수와 파싱 위치 체크섬이 초기 실험과 일치했다. 이 측정은 초기 fancy-regex/Prism 비교와 별도 프로세스에서 실행했으며 원시 기록은 `experiments/syntect/wasm-onig.json`에 남겼다. 두 실행의 Node 메이저는 다르다. 2,341.5ms는 Node v26.0.0, 689.7ms는 v24.20.0에서 쟀다. WASM을 실행하는 것이 곧 V8이므로 이 차이를 엔진 교체 효과에서 분리하지는 못했다. 다만 이 입력은 전체 코드 블록 4,629개 중 2,042개(44%)를 뺀 것이다. syntect 기본 문법에 없는 TypeScript와 TSX, JSX 1,413개에 평문과 mermaid, 수식 블록 등 629개가 더 빠졌으므로 블로그 전체의 교체 성능을 대신할 수 없다. 실제 렌더러에는 [two-face](https://github.com/CosmicHorrorDev/two-face)의 bat 기반 문법을 넣어 이 언어들을 처리하고, 전체 글의 HAST 변환은 뒤에서 별도로 쟀다.

하이라이트 출력은 syntect의 scope를 블로그의 `token keyword`, `token string`, `token comment` 같은 클래스로 매핑해 만든다. 여러 줄에 걸친 주석과 문자열은 코드 블록 안에서 파싱 상태를 이어 간다. 줄 번호와 강조 범위, diff 줄과 파일명은 별도로 유지한다. 기존 CSS 팔레트를 가져왔지만 어떤 문자를 어느 토큰으로 판정하는지가 달라지므로 이전 색상과 같지는 않다. 등록되지 않은 언어는 평문으로 남겨 코드 자체를 읽을 수 있게 했다. 2,048바이트를 넘는 줄은 토큰화를 건너뛴다. syntect는 한 줄의 토큰 수에 따라 2차식으로 느려지기 때문인데, 현재 글에서 가장 긴 코드 줄은 601자라 실제로 걸린 줄은 없다.

## 수식과 이미지도 같은 호출에서 끝냈다

수식은 KaTeX의 HTML을 재현하는 대신 math-core가 만드는 MathML로 바꿨다. MathML은 수식의 분수와 제곱근, 첨자 같은 구조를 브라우저가 그리는 마크업이다. JS에서 KaTeX 후처리를 한 번 더 실행할 필요가 없어졌고, 수식의 TeX 원문은 `annotation`에 함께 남겼다. 현재 Rust 1.88.0에서 빌드할 수 있도록 math-core와 내부 렌더러를 0.5.0에 고정했다.

기존 수식 노드 145개를 넣어 변환을 확인했다. 사용하던 명령 중 `\space`는 이 버전이 그대로 받지 못해 백슬래시 뒤에 공백을 붙이는 명령으로 확장하는 매크로를 등록했다. `\not\subset`, `\lt`, 논리 연산과 여러 줄 입력도 확인했다. 이 개수에는 달러 기호로 금액을 적다가 기존 파서에서도 수식으로 인식되던 두 구간이 포함된다.

KaTeX용 CSS와 로더를 지우고 MathML용 Libertinus Math 글꼴을 로컬 파일로 추가했다. 글꼴은 341,752바이트이며 라이선스도 함께 넣었다. TeX가 모두 변환되고 React가 MathML을 직렬화하는 것과, 모든 브라우저에서 이전과 같은 모양으로 보이는 것은 별개다. 글꼴과 배치가 바뀐다. 뒤의 첫 방문 측정에서 Chromium으로 수식 글을 열어 MathML 31개와 글꼴 응답을 확인하고 첫 화면도 살폈다. 다른 브라우저와 모든 수식의 화면까지 대조한 것은 아니다.

프로덕션 HTTP 검사에서는 수식 HTML이 200으로 나와도 글꼴 요청은 404였다. 파일은 존재했지만 블로그의 프록시가 연도나 허용된 접두어로 시작하지 않는 경로를 404로 보내고 있었다. `/fonts`를 허용한 뒤 실제 글꼴 응답과 CSS의 글꼴 경로까지 확인했다. HAST나 JSX 변환만 검사했다면 놓쳤을 문제였다.

이미지는 WASI의 `preopens`로 블로그의 `public` 디렉터리를 `/public`에 연결해 읽는다. `renderMarkdown(body, path)`에 글 경로를 넘기면 Rust가 해당 연월의 이미지 경로를 만들고, imagesize로 크기를 읽어 HAST에 넣는다. SVG는 width와 height 또는 viewBox에서 크기를 얻는다. 일반 이미지 전체를 JS에서 읽어 sharp에 넘기던 후처리는 사라졌다. sharp 자체는 블로그의 다른 이미지 작업에서 사용하므로 의존성에서 지우지 않았다.

이 경로는 기존 이미지 노드 600개의 `src`, `width`, `height`, `alt`를 전부 대조했다. 처음 비교에서는 SVG 네 개만 크기가 빠져 별도 처리를 추가했고, 수정 뒤에는 600개가 모두 일치했다. Node는 디렉터리를 연결하고 Rust가 경로와 속성을 처리하므로, 이미지 규칙을 수정하기 위해 두 언어의 트리를 오갈 필요가 없어졌다.

## HTML 문자열 대신 HAST를 반환했다

처음 HAST를 교환 형식으로 고른 이유는 JS 후처리에 그대로 넘길 수 있어서였다. 후처리를 모두 옮긴 뒤에도 이 형식을 유지했다. `<LiveDemo />` 같은 노드를 실제 React 컴포넌트에 연결하려면 HTML 문자열보다 구조가 있는 트리가 적합하기 때문이다.

`packages/markdown-rs/src/hast.rs`의 Rust enum은 직렬화하면 `type`, `tagName`, `properties`, `children`을 갖는 객체가 된다. `className`은 클래스 목록이고 `tabIndex`는 숫자이며, JSX 노드는 일반 HTML 요소와 다른 `type`을 유지한다. 문단 사이에 들어가는 줄바꿈 텍스트도 트리의 일부다. Node가 Rust 전용 노드 타입을 다시 해석하지 않도록 `serde`의 태그와 필드 이름을 HAST에 맞췄다.

현재 연결은 다음과 같다. 마크다운을 해석하고 노드를 바꾸는 작업은 WASM 호출 안에서 끝난다.

```text
마크다운 본문과 글 경로
  -> Node 바인딩: JSON 직렬화, UTF-8 인코딩
  -> WASM: 파싱, 목차와 HAST, 링크, 수식, 하이라이트, MDX, 이미지
  -> Node 바인딩: UTF-8 디코딩, JSON 파싱
  -> toJsxRuntime: React 요소 생성과 컴포넌트 연결
```

앱의 `renderPost`에서는 `unified`와 후처리 플러그인 목록을 제거했다. 남은 코드는 WASM의 결과를 React에 연결한다.

```tsx
export function renderPost(body: string, path: string) {
  const tree = renderMarkdown(body, path)

  return toJsxRuntime(tree, {
    Fragment,
    jsx,
    jsxs,
    components: MDXComponents,
    createEvaluater,
  })
}
```

## 왜 네이티브 바이너리가 아니라 wasm인가

이 렌더러는 빌드 시점과 요청 시점 양쪽에서 돈다. 별도 실행 파일을 호출하는 구조라면 프로세스 관리가 필요하지만, 네이티브 구현이 반드시 그 방식을 요구하는 것은 아니다. Node.js의 [네이티브 애드온](https://nodejs.org/docs/latest-v24.x/api/addons.html)은 같은 프로세스에서 불러 쓸 수 있다. 여기서는 플랫폼별 네이티브 산출물을 관리하는 대신 하나의 wasm 파일을 배포하는 쪽을 택했다. `pkg/markdown_rs.wasm`(약 2.49MiB)을 저장소에 커밋하고, Rust를 고치면 다시 빌드해 같이 커밋한다. 배포 빌드에는 Rust 툴체인이 필요 없다. 네이티브 애드온과의 성능 비교까지 한 결정은 아니다.

빌드 때 모든 글의 hast를 JSON으로 구워 두는 안도 검토했다가 접었다. 당시 hast JSON 전체가 91.6MB였다. 이 수치는 이번 하이라이터와 MathML을 적용한 출력의 크기는 아니다.

## JS 문자열을 WASM 메모리로 보내는 과정

`wasm-bindgen`은 쓰지 않았다. 필요한 인터페이스가 "JSON 문자열을 넣으면 JSON 문자열이 나온다" 하나뿐이라 직접 ABI(호출 규약)를 정했다. 직접 정의한 함수는 할당과 해제를 포함해 네 개다. JS는 모듈이 내보낸 `memory`와 이 함수들을 사용한다. 초기 모듈에는 호스트 import가 없었지만, 현재 바이너리는 WASI 함수를 가져오며 `wasi.initialize(instance)`로 초기화한다.

| 함수                        | 역할                                       | 호출 뒤 메모리 처리            |
| --------------------------- | ------------------------------------------ | ------------------------------ |
| `alloc(len)`                | 입력을 쓸 버퍼를 할당하고 포인터 반환      | JS가 입력 바이트를 복사        |
| `render_json_ptr(ptr, len)` | 입력을 읽어 변환하고 출력 버퍼 포인터 반환 | 입력과 출력 버퍼가 따로 존재   |
| `dealloc(ptr, len)`         | 입력 버퍼 해제                             | 원래 입력 포인터와 길이 사용   |
| `free_result(ptr)`          | 출력 버퍼 해제                             | 출력 앞부분의 길이를 읽어 해제 |

JS 문자열이나 객체 자체를 Rust 함수의 인자로 넘기는 방식은 아니다. Node 바인딩은 먼저 `JSON.stringify({body, path})`를 `TextEncoder`로 인코딩한다. 그 바이트 수만큼 `alloc`으로 WASM 메모리를 확보하고, `Uint8Array` 뷰로 복사한 뒤 포인터와 길이를 넘긴다. 포인터는 WASM 선형 메모리 안의 위치다. Rust가 Node의 문자열 메모리를 직접 참조하지는 않는다.

출력은 길이와 내용을 한 버퍼에 넣었다. 앞의 4바이트에는 JSON의 바이트 수를 리틀 엔디언으로 기록하고, 나머지에는 UTF-8 JSON을 쓴다. 문자열 끝을 찾기 위해 전체 버퍼를 스캔하지 않아도 되고, 출력 포인터 하나로 어디까지 읽어야 하는지 알 수 있다.

```text
입력 버퍼: UTF-8로 인코딩한 {"body":"...","path":"..."}
출력 버퍼: [JSON 길이: u32, little-endian][UTF-8 JSON]
성공 응답: {"ok":true,"hast":{...}}
실패 응답: {"ok":false,"error":"..."}
```

입력 버퍼는 `render_json_ptr` 호출을 감싼 `finally`에서 해제한다. 출력은 JS 문자열로 디코딩한 다음 `free_result`로 돌려준다. 그 뒤에 `JSON.parse`를 하므로, JS 객체로 복원하는 동안에는 WASM 출력 버퍼를 붙들고 있지 않는다. Rust 내부에서는 입력 할당을 `Vec`으로, 길이가 확정된 출력은 `Box<[u8]>`로 관리한다. 둘의 해제 함수가 다른 것은 이 소유권을 각각 되돌려주기 위해서다.

JSON은 전달 비용이 없는 형식은 아니다. 마크다운을 넣을 때 한 번 직렬화하고, HAST를 꺼낼 때 다시 디코딩과 파싱을 한다. 대신 양쪽의 자료구조를 분리할 수 있고 중간 결과를 그대로 기록해 비교할 수 있다. 이번 벤치에는 이 바인딩 비용까지 포함했다. Rust 함수 안의 시간만 재고 이 비용을 빼면 실제 Node 호출의 이득을 과장하게 된다.

## 메모리 뷰와 인스턴스를 재사용하는 범위

WASM 인스턴스는 모듈 스코프에 보관하고 첫 `renderMarkdown` 호출 때 만든다. 같은 Node 모듈 인스턴스를 쓰는 다음 호출부터는 파일 읽기와 컴파일을 반복하지 않는다. 호출은 동기식이다. 이 구현은 Web Worker나 별도 스레드로 파싱을 넘기지 않으므로, WASM으로 바꿨다는 사실만으로 Node 이벤트 루프에서 계산이 사라지는 것은 아니다.

인스턴스를 재사용하더라도 `memory.buffer`로 만든 뷰까지 계속 재사용할 수는 없다. 이 모듈의 공유되지 않는 메모리가 커지면 이전 `ArrayBuffer`는 분리된다. 메모리 증가 뒤에는 `buffer`를 다시 읽어 새 뷰를 만들어야 한다는 것이 [WebAssembly 메모리 API의 동작](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/Memory/grow#detachment_upon_growing)이다. 파싱하는 동안 Rust 할당자가 메모리를 늘릴 수 있으므로 결과를 읽는 쪽은 호출이 끝난 뒤 뷰를 만든다.

```js
const memory = new Uint8Array(exports.memory.buffer)
const length = new DataView(exports.memory.buffer).getUint32(outputPtr, true)
const json = decoder.decode(
  memory.subarray(outputPtr + 4, outputPtr + 4 + length),
)
exports.free_result(outputPtr)
const result = JSON.parse(json)
```

위 코드는 `index.js`의 출력 처리 부분이다. `getUint32`의 두 번째 인자 `true`는 Rust가 쓴 리틀 엔디언 길이를 같은 방식으로 읽기 위한 값이다. 디코딩을 마치기 전에 출력 버퍼를 해제해서도 안 되고, 렌더 호출 전에 만든 메모리 뷰로 결과를 읽어서도 안 된다.

오류도 두 경로로 나눴다. 마크다운 파싱에 실패하면 Rust가 `ok: false`와 오류 문자열을 반환하고 Node 바인딩이 예외로 바꾼다. WASM 실행 자체에서 trap이 발생하면 정상적인 실패 응답조차 받지 못한다. 그 경우에는 모듈 스코프의 인스턴스 참조를 비우고 다음 호출 때 새 인스턴스를 만든다. 오류가 난 계산 상태를 다음 글의 변환에 그대로 넘기지 않으려는 처리다.

## 빌드한 WASM을 Next.js 서버에 싣기

패키지는 `index.js`와 타입 선언, Rust 소스, 빌드한 `pkg/markdown_rs.wasm`을 함께 갖는다. `rust-toolchain.toml`에는 Rust 1.88.0과 `wasm32-wasip1` 타깃을 고정했다. 빌드 스크립트는 wasi-sdk의 C 컴파일러와 archiver를 지정하고 `cargo build --locked --release --target wasm32-wasip1 --lib`를 실행한다. 결과를 `pkg/`에 쓰는 것은 `MARKDOWN_RS_WRITE_PKG=1`일 때뿐이고 평소에는 컴파일만 한다. 일반적인 블로그 빌드는 커밋된 파일을 사용하므로 Rust 컴파일러를 실행하지 않는다.

Next.js 설정에서도 두 가지를 명시했다. `serverExternalPackages`에 `@yceffort/markdown-rs`를 넣어 Node 바인딩을 외부 패키지로 읽고, `outputFileTracingIncludes`에는 `../../packages/markdown-rs/pkg/**/*`를 넣었다. JS import만 보고 배포 파일을 고르는 과정에서, 런타임에 파일 경로로 읽는 WASM이 빠지지 않게 하기 위해서다. 바인딩은 자신의 디렉터리를 기준으로 `pkg/markdown_rs.wasm`을 찾는다.

이 방식의 관리 단위는 Rust 소스만이 아니다. 소스를 고쳤다면 WASM도 다시 빌드해서 함께 변경해야 한다. JS 파리티 스크립트가 실행하는 것은 저장소의 WASM 바이너리이므로, 소스만 고치고 바이너리를 갱신하지 않으면 이전 구현을 검증하게 된다. Rust 단위 테스트와 배포되는 WASM의 출력 대조를 따로 두는 이유이기도 하다.

여기에는 예상하지 못한 비용이 하나 더 있었다. Rust와 wasi-sdk 버전을 고정하고 빌드 경로를 지워도, macOS에서 빌드한 파일과 Linux CI가 빌드한 파일의 코드 섹션이 달랐다. 그래서 커밋하는 바이너리는 CI가 만든 것으로 정했다. CI는 매번 다시 빌드해 커밋된 파일과 바이트 단위로 대조하고, 다르면 빌드를 실패시키면서 산출물을 아티팩트로 올린다. Rust를 고친 뒤에는 그 아티팩트를 받아 커밋한다. 소스와 바이너리가 같은 구현인지는 이 대조가 보증한다. 반대로 러너 이미지가 바뀌면 소스를 손대지 않아도 대조가 깨질 수 있고, 2.6MB 바이너리의 diff는 사람이 검토할 수 없다.

릴리즈 프로파일은 처음에 크기 우선(`opt-level = "s"`)으로 뒀다가 `3`으로 바꿨다. 작업 당시 기록에서 WASM 컴파일은 0.7ms였고, 옵션을 바꾼 뒤 글 451편 파싱이 1,428ms에서 1,160ms로 19% 줄었다. HAST JSON은 451편 전부 동일했다. 크기는 602KB에서 724KB가 됐다. 이 경우에는 약 122KB의 증가를 받아들이고 반복 실행 시간을 줄이는 쪽을 택했다.

호출 규약과 메모리 소유권은 [Rust의 `lib.rs`](https://github.com/yceffort/blog/blob/f27162bd/packages/markdown-rs/src/lib.rs)에, Node에서 읽고 실행하는 코드는 [바인딩 `index.js`](https://github.com/yceffort/blog/blob/f27162bd/packages/markdown-rs/index.js)에 있다. 이 링크는 초기 바인딩의 고정 ref다. 현재 작업 트리에는 WASI 초기화와 글 경로 전달이 추가됐다. 두 소스 파일과 빌드한 WASM이 같은 구현을 가리키도록 유지하는 것이 배포의 기본 단위다.

## 크레이트를 복사해서 두 군데를 고쳤다

파서는 `markdown` 크레이트 1.0.0을 썼다. 다만 그대로는 쓸 수 없어서 저장소 안에 복사해 두고 두 군데를 고쳤다([dd69e1b5](https://github.com/yceffort/blog/commit/dd69e1b5)). 포크해서 따로 관리하는 대신 `vendor/markdown-rs/PATCHES.md`에 표로 적어 두는 쪽을 택했다. 고친 곳이 두 군데뿐이고, 원본과의 차이를 한눈에 보는 것이 이 작업에서는 더 중요했다. 대신 크레이트 소스 81개 파일, 4만 2천 줄이 저장소에 들어왔다. 상류를 가리키는 remote가 없으므로 `markdown` 1.1이 나오면 손으로 다시 복사하고 패치를 다시 얹어야 한다. 패치 표에는 문자 분류에 쓰는 의존성 세 개를 추가한 항목도 있다.

첫째는 한글 강조다. 이 블로그는 `remark-cjk-friendly`를 쓴다. `**강조**는`처럼 강조가 한글 조사와 맞붙는 문장이 CommonMark 기본 규칙에서는 강조로 잡히지 않기 때문이다. 이걸 맞추려고 `micromark-extension-cjk-friendly` 2.0.1의 문자 분류와 open/close 판정을 `src/util/cjk.rs`로 옮기고, `attention.rs`의 `get_sequences()`가 `*`와 `_` 시퀀스를 그 판정으로 보게 했다. 취소선(`~`)은 원래 규칙을 유지했는데, `remark-cjk-friendly`도 취소선은 건드리지 않기 때문이다.

둘째는 제목 파싱이다. `### #1. 제목`을 넣으면 안쪽 `#`이 첫 Data 노드 앞에 오는 바람에 본문에서 빠졌다. micromark는 `#1. 제목`으로 읽는다. `heading_atx.rs`의 `resolve()`가 여는 시퀀스와 뒤따르는 공백 바로 다음부터 본문으로 잡도록 고쳤다. `# # #`처럼 Data가 아예 없는 경우는 원래대로 빈 제목이다.

이 두 가지는 "옮긴다"는 말이 실제로는 무엇을 뜻하는지 보여주는 자리이기도 했다. 목표가 같은 결과를 내는 것이라면, 원본 도구가 쓰는 확장까지 따라가야 한다. 기본 CommonMark 파서를 가져다 붙이는 것으로는 첫 글부터 결과가 달라진다.

## 파싱 옵션과 변환 순서도 이식 대상이었다

크레이트를 가져왔다고 원본과 같은 문법으로 읽는 것은 아니다. `lib.rs`의 `parse_options()`는 GFM 구성을 출발점으로 삼되 MDX 파이프라인에 맞춰 일부 문법을 끈다. 꺾쇠로 둘러싼 CommonMark 자동 링크와 들여쓰기 코드, 일반 HTML 파싱을 끄고, MDX JSX와 표현식, 수식 문법을 켰다. 여기서 일반 HTML 문법을 끈다는 것은 `<iframe>` 같은 요소를 버린다는 뜻이 아니다. 태그를 MDX JSX 문법으로 읽도록 입력 해석을 맞춘 것이다.

파싱 결과인 mdast를 HAST로 바꾸기 전에도 정리가 필요했다. 다음은 현재 `lib.rs`에서 제목 링크를 만들기까지의 순서다. 뒤이어 수식과 하이라이트, MDX 검증이 실행된다.

```rust
let mut mdast = markdown::to_mdast(body, &parse_options()).map_err(|m| m.to_string())?;
to_hast::unwrap_nested_links(&mut mdast, false);
to_hast::unravel(&mut mdast);
toc::apply(&mut mdast);
let mut tree = to_hast::to_hast(&mdast);
transforms::slug_headings(&mut tree);
transforms::extract_code_filename(&mut tree);
transforms::autolink_headings(&mut tree);
```

`unwrap_nested_links`는 Rust 파서와 JS의 GFM 자동 링크 처리가 다른 부분을 맞춘다. `[https://a.b/c](https://a.b/c)`에서 대괄호 안의 URL은 바깥 링크의 텍스트여야 한다. Rust 파서가 안쪽에도 링크 노드를 만들면 이를 풀어서, 최종 HAST에는 링크 하나만 남긴다. 일반 본문에서 자동으로 만들어진 링크는 유지하고 이미 링크 안에 있는 경우만 처리한다.

`unravel`은 JSX만 들어 있는 문단을 풀어준다. `<LiveDemo />`가 한 줄을 차지할 때 일반 문단처럼 `p` 안에 들어가면, 그 컴포넌트가 만드는 블록 요소까지 문단 안에 놓일 수 있다. 기존 `@mdx-js/mdx`의 `remark-mark-and-unravel`이 하던 대로 JSX와 공백만 있는 문단을 검사해 JSX를 flow 노드로 올린다. 본문 텍스트와 JSX가 섞인 문단까지 무조건 풀지는 않는다.

HAST 변환은 태그를 바꾸는 함수 하나로 끝나지 않는다. 참조형 링크는 먼저 정의를 수집해 연결하고, 각주는 등장 순서와 같은 각주를 참조한 횟수를 기억한 뒤 본문 끝에 footer를 붙인다. 목록과 표의 노드 사이에 들어가는 줄바꿈도 만든다. 이 상태는 문서마다 새로 생성하므로 WASM 인스턴스를 재사용해도 이전 글의 각주나 링크 정의가 다음 글로 이어지지 않는다.

변환 순서에는 후속 단계가 기대하는 조건도 담겨 있다. 코드 블록의 `json:package.json`은 하이라이터에 넘기기 전에 언어 `json`과 파일명 `package.json`으로 나눠야 한다. 제목 앞에 링크를 넣으려면 먼저 제목 id가 있어야 한다. JS 플러그인 목록을 Rust 함수 목록으로 바꾸는 일에는 이런 실행 순서까지 포함된다.

## 손으로 옮기지 않고 표를 생성했다

제목 id는 `rehype-slug`가 `github-slugger`로 만든다. 이걸 Rust로 옮기려면 github-slugger가 슬러그에서 제거하는 문자 집합을 그대로 재현해야 하는데, 그 집합은 정규식 하나에 유니코드 속성으로 표현돼 있다. 정규식을 읽어서 Rust 코드로 손으로 옮기면 그 순간부터 두 구현이 따로 논다.

대신 코드포인트를 전부 통과시켜서 표를 뽑았다.

```js
import {regex} from 'github-slugger/regex.js'

const plain = new RegExp(regex.source, regex.flags.replace('g', ''))
const ranges = []
let start = -1
for (let cp = 0; cp <= 0x10ffff; cp++) {
  if (cp >= 0xd800 && cp <= 0xdfff) continue
  const removed = plain.test(String.fromCodePoint(cp))
  if (removed && start < 0) start = cp
  if (!removed && start >= 0) {
    ranges.push([start, cp - 1])
    start = -1
  }
}
```

`node_modules`의 `regex.js`를 단일 사실의 원천으로 두고 0부터 0x10FFFF까지 돌려 제거되는 구간 목록을 `src/slug_table.rs`로 생성한다. Rust 쪽은 그 표를 이진 탐색한다. github-slugger가 올라가면 스크립트를 다시 돌리면 되고, 사람이 유니코드 속성을 해석할 일이 없어진다.

슬러그는 제목 id를 만들 때만 쓰지 않는다. 목차가 만드는 링크도 같은 규칙을 써야 한다. `한글 제목 (괄호)`의 id는 `한글-제목-괄호`가 되고, 같은 제목이 반복되면 뒤에 `-1`, `-2`를 붙인다. 목차를 만드는 쪽과 제목에 id를 붙이는 쪽은 각각 문서를 순회하므로, 같은 순서로 같은 중복을 세어야 목차가 엉뚱한 절을 가리키지 않는다.

예를 들어 `## 제목`이 두 번 나오면 제목 id는 `제목`, `제목-1`이다. 목차의 `href`는 URI 정규화를 거쳐 `#%EC%A0%9C%EB%AA%A9`와 `#%EC%A0%9C%EB%AA%A9-1`이 된다. 화면에 보이는 목차 텍스트만 대조하면 이런 차이를 놓친다. 실제 바이너리에 이 입력을 넣어 HAST의 id와 href를 함께 확인했다.

## MDX는 문법을 읽되 임의의 JS를 실행하지 않는다

이식 후에도 JSX 태그를 쓴 기존 글은 읽을 수 있어야 했다. 그렇다고 `next-mdx-remote-client`가 제공하던 JS 컴파일과 실행까지 Rust에서 재현한 것은 아니다. 지원 범위를 블로그가 사용하는 정적 속성과 등록된 컴포넌트로 좁혔다.

실제 배너 글에는 `<LiveDemo>`에 `height={680}`을 넘기는 자리가 있다. MDX 파서는 이를 문자열 속성이 아니라 표현식 속성으로 읽는다. `mdx.rs`의 `eval_literal()`은 이처럼 계산이 필요 없는 값을 확인해 HAST의 `data.literal`에 넣는다. 처음에는 Node 바인딩의 `resolveMdx()`가 그것을 실제 속성값 `680`으로 바꿨다. 후처리를 합치면서 이 변환과 지원하지 않는 표현식의 거부도 Rust의 `mdx::resolve()`로 옮겼다. 숫자 외에는 불리언과 `null`, 구현이 허용하는 단순한 따옴표 문자열을 처리한다.

| 입력 예                              | 처리                                 |
| ------------------------------------ | ------------------------------------ |
| `<LiveDemo height={680} />`          | 숫자 속성 `680`을 가진 JSX 노드 반환 |
| `<LiveDemo height={props.height} />` | 리터럴이 아닌 속성 표현식이므로 오류 |
| `<LiveDemo {...props} />`            | 펼침 속성은 지원하지 않으므로 오류   |
| `값: {2 + 2}`                        | 본문 표현식을 실행하지 않고 오류     |

이 예제들은 현재 저장소의 WASM과 Node 바인딩에 직접 넣어 확인했다. 첫 번째의 성공은 이름이 `LiveDemo`인 JSX 노드와 숫자 속성이 만들어졌다는 뜻이고, 그 이름을 실제 컴포넌트에 연결하는 일은 뒤의 `toJsxRuntime` 단계에서 한다.

`import`와 `export`도 지원 범위 밖이다. 현재 Rust 파싱 구성은 ESM을 실행하지 않으며, 이런 구문이 평문으로 남을 수 있다. 그래서 `check-markdown.mjs`가 본문의 해당 구문을 오류로 잡는다. 글 작성 단계의 검사까지 있어야 이 제약이 유지된다.

이렇게 역할을 나누면 WASM이 아는 것은 마크다운 구조와 정적인 값까지다. 실제 React 컴포넌트의 구현은 JS에 남는다. 데모 컴포넌트를 수정할 때 Rust 바이너리를 다시 만들 필요가 없고, 반대로 파서 내부를 고칠 때 컴포넌트 실행 환경을 Rust로 끌어들일 필요도 없다.

## 같다는 것을 어떻게 증명했나

이 작업은 결과가 달라지면 그 자체로 실패다. 그래서 코드보다 대조 스크립트를 먼저 만들었다([c9269cd4](https://github.com/yceffort/blog/commit/c9269cd4)).

`parity.mjs`는 글과 시리즈 전체를 두 구현으로 돌려 hast 트리를 비교한다. 이식 당시 입력은 글 451편과 시리즈 7개, 합쳐서 458개였다. 일부를 샘플링하지 않아도 몇 초면 끝나므로 굳이 줄일 이유가 없었다. 위치 정보와 MDX 메타데이터 등을 정규화한 결과를 대조하며, 이 경계 때문에 놓친 회귀가 뒤에서 나온다. 현재 입력은 글 457편(mdx 3편 포함)과 시리즈 8개, 465개다. 후처리 교체 뒤에도 전부 통과했지만, 현재 비교에서는 코드 줄 내부의 토큰 span을 원문으로 합치고 수식은 TeX 원문과 표시 모드로 정규화한다. 색상과 수식 내부 구조까지 같다는 뜻은 아니다.

여기서 한 번 걸려 넘어진 곳이 `serde_json`의 `preserve_order` 기능이다. hast의 `properties`는 `Map<String, Value>`인데, 이 기능을 빼면 `BTreeMap`이 되면서 키가 알파벳순으로 정렬된다. 트리 자체는 같아도 렌더된 HTML의 속성 순서가 바뀐다. 바이트 단위 대조를 기준으로 잡지 않았다면 지나쳤을 종류의 차이다.

트리가 같은 것으로 부족해서 빌드 산출물도 맞춰 봤다. 작업 당시 정적 페이지 334장을 두 브랜치에서 뽑아 `BUILD_ID`만 정규화하고 대조하니 334장 전부 바이트가 같았고, Rust 단위 테스트 11개도 통과했다. 이 두 검증은 당시의 기록이다. 후처리를 통합한 현재 구현에서는 Rust 단위 테스트 24개가 통과했다. 로컬의 Xcode 명령 선택 경로가 깨져 있어 설치된 SDK와 Clang 경로를 명시해 빌드했다. 예전의 HTML 바이트 일치 결과를 지금의 syntect와 MathML 출력에 적용하지는 않는다.

단위 테스트와 기존 글 대조는 서로 다른 질문에 답한다. 작은 입력의 단위 테스트는 한글 조사 옆의 강조, 제목 안의 `#`, 파일명이 붙은 코드 블록처럼 구현이 지켜야 할 규칙을 고정한다. 전체 글 대조는 실제로 쌓여 있는 문법 조합을 확인한다. 작은 입력에서는 각각 맞아도 한 문서에서 각주와 JSX, 수식과 목차가 함께 나오면 달라질 수 있으므로 둘 다 필요했다.

## 그물이 두 겹인데 같은 곳이 뚫려 있었다

여기까지 해놓고 나서 회귀를 하나 찾았다. 전체 글을 프리렌더해 보다가 [framer-motion 배너 글](/2026/08/framer-motion-banner-frame-drop)의 한국어판과 영어판이 요청 시점에 500을 내는 것을 봤다. main과 실서비스는 200이다.

원인은 속성이 아니라 컴포넌트 이름이었다. `hast-util-to-jsx-runtime`의 `mdxJsxElement` 처리는 `findComponentFromName(state, node.name, true)`를 부르는데, 대문자로 시작하는 이름은 estree `Identifier`가 된다. 라이브러리는 리터럴 이름만 `components`에서 찾고 식별자는 evaluater에게 넘기므로, evaluater가 없으면 그대로 죽는다. `<br>`, `<iframe>`, `<script>` 같은 소문자 이름은 리터럴이라 멀쩡했다. 기존 파이프라인은 `next-mdx-remote-client/rsc`가 MDX를 JS로 컴파일해 평가했으므로 이 경로를 아예 타지 않았다.

전수 조사를 해보니 458편 중 MDX JSX를 쓰는 글이 7편이고 대문자 컴포넌트는 `<LiveDemo>` 하나뿐이라 영향은 2편이었다. JS를 실행하지 않고 식별자 이름만 `MDXComponents`에서 찾아 이어 주는 evaluater를 넣어 고쳤다.

```tsx
function createEvaluater(): Evaluater {
  return {
    evaluateExpression(expression) {
      if (expression.type !== 'Identifier') {
        throw new Error(`MDX expression is not supported: ${expression.type}`)
      }
      const name = expression.name as keyof typeof MDXComponents
      const component = MDXComponents[name]
      if (!component) {
        throw new Error(`MDX component is not defined: <${expression.name} />`)
      }
      return component
    },
    evaluateProgram() {
      throw new Error('MDX import/export is not supported')
    },
  }
}
```

중요한 것은 고친 내용이 아니라 왜 못 잡았는가다. 검사는 두 겹이었다. `parity.mjs`가 hast를 대조하고, 커밋 전에 `check-markdown.mjs`가 렌더러를 돌린다. 둘 다 같은 곳이 뚫려 있었다. 당시 `parity.mjs`의 `normalize()`는 양쪽에서 `mdxJsxAttributeValueExpression`을 값으로 접고 mdx 노드의 `data`를 건너뛴다. hast끼리 같은지만 보므로 "그 hast가 JSX로 바뀌는가"는 애초에 검사 범위 밖이다. `check-markdown.mjs`는 hast를 만드는 데서 멈췄다. 둘 다 트리까지만 보고 있었던 것이다.

그래서 `check-markdown.mjs`가 `toJsxRuntime`까지 돌리도록 범위를 넓혔다([edb3886d](https://github.com/yceffort/blog/commit/edb3886d)). 컴포넌트 구현은 `tsx`라 이 스크립트에서 읽을 수 없으므로 프록시 스텁으로 잇는다. 여기서 잡으려는 것은 컴포넌트가 실제로 있는지가 아니라 트리가 JSX로 바뀌는지다.

```js
const stub = () => null
const jsxStubs = new Proxy({}, {get: () => stub, has: () => true})
```

evaluater 없이 이 검사를 돌리면 458편 중 정확히 그 2편만 걸린다. 고친 뒤에는 458편 전부 통과하고, 빌드 후 요청도 두 언어판 모두 200이며, 렌더된 iframe 마크업이 실서비스와 바이트 단위로 같다.

이 일에서 남은 교훈은 그물을 두 겹 치는 것만으로는 부족하다는 것이다. 두 그물의 구멍이 같은 자리에 있으면 겹쳐도 소용이 없다. 두 검사가 모두 "hast까지"를 경계로 삼고 있었다는 것을 먼저 봤어야 했다.

## 빌드와 첫 방문을 따로 재야 했다

전체 글을 한꺼번에 변환하는 벤치부터 만들었지만, 이 블로그에서 알고 싶었던 것은 두 가지였다. 배포할 때 빌드가 얼마나 걸리는지, 빌드하지 않은 글을 처음 열면 본문을 얼마나 기다리는지다. 이미 모듈과 WASM을 불러온 상태에서 글 453편을 처리하는 시간만으로는 어느 쪽도 알 수 없었다.

여기서 브라우저가 마크다운을 파싱하는 것은 아니다. WASM은 Next.js 서버에서 실행되고, 브라우저는 서버가 만든 결과를 받는다. 따라서 첫 방문에서는 서버의 `renderPost` 호출 시간과 브라우저의 응답 시간을 함께 쟀다. 호출 시간에는 본문 변환과 이미지 크기 처리, React 요소 생성이 들어간다. 함수 밖의 정적 import는 빠지지만, 브라우저의 요청 시간에는 요청 중 발생한 모듈 로딩과 글 목록 메타데이터 계산도 들어간다.

비교 대상은 기존 JS 체인, 파싱만 WASM으로 옮긴 혼합 구성, 후처리까지 합친 현재 WASM 구성이다. 예전 브랜치를 통째로 실행하면 스타일과 글 목록 캐시의 차이까지 섞인다. 같은 앱과 글을 복사한 뒤 렌더러와 그에 필요한 CSS, 수식 자원만 바꿨다. `getAllPosts`의 모듈 캐시는 세 구성 모두 유지했다. JS 기준은 당시 쓰던 `next-mdx-remote-client` 2.1.12의 MDX 컴파일과 실행까지 복원했다. 아래 수치는 파싱 알고리즘 하나의 비교가 아니라 실제 페이지를 만드는 세 구성의 비교다.

> 2026년 9월 14일, Apple M1, macOS arm64, Node 24.20.0, Next.js 16.3.1에서 측정했다. 개발 서버를 종료한 뒤 빌드와 방문을 순차 실행했다. 세 구성의 순서 여섯 가지를 모두 사용해 각 구성이 첫 번째, 두 번째, 세 번째에 두 번씩 오도록 했다. GA4 자격증명은 넣지 않았고, 의존성 설치와 Rust/WASM 컴파일은 빌드 시간에서 제외했다. 배포할 때처럼 저장소의 WASM 파일을 사용했다.

### 전체 빌드

매번 `.next`를 지우고 `next build`가 끝날 때까지 쟀다. 구성별 6회, 모두 18회다. 첫 방문에 사용할 두 경로가 프리렌더 목록에 없다는 것도 빌드마다 확인했다.

<BarCompare title="전체 빌드 시간" unit="초" series="JS|파싱 WASM + JS 후처리|전체 WASM" rows="중앙값|20.88|20.62|20.33;최솟값|20.68|19.98|19.77;최댓값|22.69|23.68|20.72" />

| 구성                  | 중앙값 | 최솟값 | 최댓값 |
| --------------------- | -----: | -----: | -----: |
| JS                    | 20.88s | 20.68s | 22.69s |
| 파싱 WASM + JS 후처리 | 20.62s | 19.98s | 23.68s |
| 전체 WASM             | 20.33s | 19.77s | 20.72s |

JS와 전체 WASM의 중앙값 차이는 0.55초였다. 각 구성의 실행 범위가 겹치므로 이 여섯 번의 로컬 측정만으로 빌드가 뚜렷하게 빨라졌다고 말하기는 어렵다. 적어도 여기서는 첫 방문에서 확인한 차이가 전체 빌드 시간에 그대로 나타나지는 않았다.

### 글 한 편을 처음 여는 시간

[코드 블록이 있는 Kubernetes 글](/2026/08/k8s-for-frontend-1)과 [수식 31개가 있는 집합 글](/2020/07/math-for-programmer-chapter1-2-set)을 골랐다. 두 글 모두 빌드에서 완성된 본문을 만들어 두지 않는 경로다. 각 방문 전에 빌드 직후의 `.next`를 복원하고 Next.js와 Chromium 프로세스를 새로 띄웠다. 서버의 준비 로그를 기다린 뒤 첫 요청을 보냈으며, 상태 확인을 위한 HTTP 요청이나 사전 방문은 하지 않았다. 서버 로그에서도 해당 글의 `renderPost`가 정확히 한 번 실행됐는지 확인했다.

브라우저는 Chromium 153, 1280×900 화면에서 HTTP 캐시와 서비스 워커를 사용하지 않았다. CPU와 네트워크 감속은 걸지 않았으며 로컬 서버에 접속했다. 각 구성과 글의 조합을 6회씩 방문해 총 36회를 쟀다. 아래는 모두 중앙값이고, 탐색 시작부터 걸린 시간이다.

<BarCompare title="글 한 편을 처음 여는 시간" unit="ms" series="JS|파싱 WASM + JS 후처리|전체 WASM" rows="코드 TTFB|1141.4|1090.0|885.3;코드 본문 DOM|1163.8|1119.2|917.2;코드 FCP|1294|1248|1050;수식 TTFB|1174.4|1127.1|865.4;수식 본문 DOM|1247.6|1204.4|896.0;수식 FCP|1366|1322|1014" />

| 글   | 구성                  | 첫 응답(TTFB) | 본문 DOM 도착 | 첫 화면 표시(FCP) |
| ---- | --------------------- | ------------: | ------------: | ----------------: |
| 코드 | JS                    |     1,141.4ms |     1,163.8ms |           1,294ms |
| 코드 | 파싱 WASM + JS 후처리 |     1,090.0ms |     1,119.2ms |           1,248ms |
| 코드 | 전체 WASM             |       885.3ms |       917.2ms |           1,050ms |
| 수식 | JS                    |     1,174.4ms |     1,247.6ms |           1,366ms |
| 수식 | 파싱 WASM + JS 후처리 |     1,127.1ms |     1,204.4ms |           1,322ms |
| 수식 | 전체 WASM             |       865.4ms |       896.0ms |           1,014ms |

본문 도착은 로딩용 스켈레톤을 제외한 `article.post-article`이 DOM에 들어온 시점이다. PPR(부분 프리렌더링)로 먼저 받은 페이지 껍데기를 본문으로 세지 않기 위해 따로 관찰했다. DOM에 들어오는 것과 화면에 그려지는 것은 다르므로 FCP도 함께 남겼다.

JS에서 전체 WASM으로 바꾸자 코드 글의 본문 도착 중앙값은 약 247ms, 수식 글은 약 352ms 줄었다. 코드 글은 JS가 1,152.5ms에서 1,180.3ms, WASM이 902.8ms에서 926.9ms였고, 수식 글은 각각 1,224.6ms에서 1,290.3ms와 870.6ms에서 922.1ms였다. 여섯 번의 범위에서도 차이가 났다. 다만 두 글의 로컬 측정이므로 모든 글이나 실서비스의 개선율로 넓혀 쓰지는 않는다.

서버 안에서 감싼 `renderPost` 호출만 보면 양상이 조금 다르다.

<BarCompare title="서버 안의 renderPost 호출 시간" unit="ms" series="JS|파싱 WASM + JS 후처리|전체 WASM" rows="코드|60.2|39.7|41.0;수식|87.0|61.2|23.9" />

| 글   |     JS | 파싱 WASM + JS 후처리 | 전체 WASM |
| ---- | -----: | --------------------: | --------: |
| 코드 | 60.2ms |                39.7ms |    41.0ms |
| 수식 | 87.0ms |                61.2ms |    23.9ms |

코드 글에서는 혼합 구성과 전체 WASM의 함수 호출 시간이 비슷하지만, 브라우저가 본문을 받는 시간에는 약 202ms 차이가 있었다. 함수 호출만 재면 놓치는 비용이 있다는 뜻이다. 요청 시간에는 글 목록을 읽는 작업, Next.js의 경로 로딩과 렌더링도 포함되며, 이번에는 각각의 비용까지 분해하지 않았다. 수식 글의 방문 시간에는 KaTeX 자원을 MathML과 로컬 글꼴로 바꾼 차이도 들어간다.

여기서 콜드는 서버 프로세스와 해당 경로, 브라우저의 캐시를 새로 시작한다는 뜻이다. 운영체제 파일 캐시와 외부 CDN 캐시는 비우지 않았다. 서버 프로세스가 준비되기까지 걸린 시간은 탐색 시간에서 제외해 원시 기록에 별도로 남겼다.

측정 스크립트는 `packages/markdown-rs/scripts/experience/`에, 18회 빌드와 36회 방문의 원시 시간과 입력 해시는 `packages/markdown-rs/experience-results.json`에 남겼다. `packages/markdown-rs/BENCHMARK.md`에는 비교 구성을 복원하는 기준 커밋과 재실행 방법도 적었다. 이후 본문을 고쳤으므로 지금 다시 실행하면 입력 해시가 달라진다.

### 예열한 HAST 벤치는 다른 질문에 답했다

처음 파싱과 HAST 생성만 옮겼을 때 글 453편의 변환 중앙값은 JS 4,110.7ms, 혼합 구성 2,416.2ms였다. 혼합 구성의 시간에는 JS에서 돌린 KaTeX와 Prism 후처리가 들어 있다. 이 기록은 `packages/markdown-rs/bench-results.json`에 보존했다. 후처리를 통합한 뒤에도 같은 성능이 유지되는지 확인하려고 다시 잰 결과는 다음과 같다.

<BarCompare title="예열한 HAST 변환, 글 453편" unit="ms" before="JS remark/rehype" after="WASM" rows="중앙값|4490.5|4464.0;최솟값|4449.6|4444.6;최댓값|4533.4|4505.1" />

| 글 453편의 HAST 변환               |    중앙값 |    최솟값 |    최댓값 |
| ---------------------------------- | --------: | --------: | --------: |
| JS remark/rehype, KaTeX, Prism     | 4,490.5ms | 4,449.6ms | 4,533.4ms |
| WASM, math-core, syntect/Oniguruma | 4,464.0ms | 4,444.6ms | 4,505.1ms |

이 벤치는 전체 입력을 검증하고 한 번 예열한 뒤 같은 프로세서와 WASM 인스턴스를 재사용한다. frontmatter를 뺀 문자열에서 HAST까지만 처리하며, 파일 읽기와 모듈 import, MDX 코드 생성과 실행, React 변환, 이미지 크기 처리는 제외한다. UTF-8/JSON 변환과 WASM 호출 비용은 포함한다. 실제 JS 페이지에서 필요한 MDX 컴파일까지 복원한 앞의 첫 방문 측정과 범위가 다르다.

예열한 HAST 처리에서 전체 WASM은 JS와 거의 같았다. 이는 혼합 구성이 벌어 두었던 이득을 후처리 통합으로 반납했다는 뜻이다. 혼합 구성은 JS의 0.59배였는데 전체 WASM은 0.99배이고, 절대값으로도 2,416.2ms에서 4,464.0ms로 편당 약 4.5ms 늘었다. Prism보다 느린 하이라이터의 비용이 이 벤치에 그대로 나타난다. 처음에는 이 결과를 빌드나 첫 방문도 같다는 뜻으로 설명했는데, 그것은 잘못이었다. 코드 원문과 줄 메타데이터, 수식의 TeX와 표시 모드는 대조하지만 토큰 색상과 수식 마크업은 달라졌으므로, 동일한 렌더러의 언어별 성능 차이도 아니다.

6회씩 번갈아 실행한 시간과 입력 해시는 `packages/markdown-rs/bench-wasi-results.json`에 남겼다. 이 예전 측정에서는 종료한 개발 명령의 자식 서버가 남아 있던 것을 나중에 확인했다. 별도의 빌드나 검사는 실행하지 않았지만, 개발 서버가 없는 조건으로 쓰지는 않는다. 위의 빌드와 첫 방문은 이를 정리한 뒤 별도로 쟀다.

## 이식 후 빌드에서 별도로 줄인 반복 작업

이식 당시에는 Rust를 붙인 뒤에도 `Generating static pages`가 346장을 그리는 데 3.3분이 걸렸다. 빌드 전체로는 wall 232초에 user CPU 667초를 썼다. 변환 함수의 벤치만으로는 빌드에서 시간이 어디에 쓰이는지 알 수 없었다. 다음으로 확인한 것은 여러 페이지에서 반복해 부르는 `getAllPosts`였다.

이 함수는 해당 언어의 글 파일을 읽고 frontmatter와 읽기 시간 등을 계산해 목록을 만든다. React의 `cache()`로 감싸여 있지만, 요청 안에서의 중복 제거가 빌드 워커 전체 수명 동안의 재사용을 보장하지는 않는다. 여러 페이지가 같은 언어의 목록을 요구하면 파일 읽기와 메타데이터 계산이 반복될 수 있었다. 실제 호출 횟수를 계측하지 않았으므로 글 수에 페이지 수를 곱한 값을 파일 읽기 횟수로 쓰지는 않는다.

빌드 시점과 요청 시점에는 글이 바뀌지 않는다. 그러면 워커 수명 동안 재사용해도 된다. `cache()`는 그대로 두고 그 앞에 모듈 스코프 `Map`을 하나 놓았다([2666308d](https://github.com/yceffort/blog/commit/2666308d)).

```ts
const allPostsCache = new Map<Locale, Post[]>()

export const getAllPosts = cache(async function getAllPostsImpl(
  locale: Locale = 'ko',
): Promise<Post[]> {
  const cached = allPostsCache.get(locale)
  if (cached) {
    return cached
  }
  // ... 파일을 읽고 정렬하는 기존 코드 ...
  if (process.env.NODE_ENV === 'production') {
    allPostsCache.set(locale, posts)
  }
  return posts
})
```

개발 모드에서는 채우지 않는다. 초안을 고치면 바로 반영돼야 하기 때문이다. 아래는 Rust 파이프라인을 사용하는 상태에서 이 메모이즈의 유무를 비교한 빌드 기록이다. 앞의 HAST 변환 벤치와는 측정 범위가 다르다.

그래프의 정적 페이지 생성은 분 단위 값을 초로 바꿔 그렸다.

<BarCompare title="getAllPosts 메모이즈 전후 빌드" unit="초" before="메모이즈 없음" after="있음" rows="정적 생성 (Codespaces)|198|11.4;정적 생성 (M1)|150|7.9;빌드 wall (Codespaces)|232.1|41.0;빌드 wall (M1)|165.1|22.3;user CPU (Codespaces)|667.0|107.5;user CPU (M1)|893.2|84.8" />

| 지표                                    | 메모이즈 없음 | 있음   | 변화   |
| --------------------------------------- | ------------- | ------ | ------ |
| 정적 페이지 생성 (Codespaces, 워커 3개) | 3.3min        | 11.4s  |        |
| 정적 페이지 생성 (M1, 워커 7개)         | 2.5min        | 7.9s   |        |
| 빌드 전체 wall (Codespaces)             | 232.1s        | 41.0s  | -82.3% |
| 빌드 전체 wall (M1)                     | 165.1s        | 22.3s  | -86.5% |
| user CPU (Codespaces)                   | 667.0s        | 107.5s | -83.9% |
| user CPU (M1)                           | 893.2s        | 84.8s  | -90.5% |

`.next`를 지우지 않고 이어서 돌린 두 번째 빌드도 같은 방향이었다. Codespaces는 219.8초 대 23.8초, M1은 166.5초 대 15.5초다.

두 환경의 절대값을 직접 비교하면 안 된다. 워커 수가 다르고(Codespaces 3개, M1 7개) CPU도 다르다. 볼 것은 같은 방향으로 8할 넘게 줄었다는 점이다. M1의 베이스라인 user CPU가 Codespaces보다 오히려 큰 것도 워커를 더 띄운 것과 관련이 있어 보이지만, 그 인과를 따로 확인하지는 않았다.

빌드가 하는 일도 글 전체를 변환하는 벤치와 다르다. 이식 당시 산출물을 대조했던 정적 페이지 334장을 종류별로 세면 이렇다. 앞서 빌드 로그에 나온 346장과는 다른 시점의 목록이므로 비율을 섞어 계산하지 않았다.

| 종류                             | 장수 |
| -------------------------------- | ---- |
| 태그 페이지                      | 268  |
| 목록 페이지                      | 26   |
| 글 상세                          | 18   |
| 시리즈                           | 8    |
| 나머지(홈, 소개, 이력서, 404 등) | 14   |

태그와 목록만 294장이다. 이 페이지들은 글 목록의 메타데이터가 필요하지만 글 본문을 모두 렌더하지는 않는다. 반대로 마크다운을 쓰는 페이지를 글 상세 18장으로 한정해서도 안 된다. 시리즈 페이지도 소개 본문을 같은 렌더러로 그린다. 일부 글은 PPR 껍데기만 빌드하고 본문은 요청 시점에 그리므로, 정적 페이지 수만으로 파서 호출 횟수나 빌드 시간에서 차지하는 비중을 계산할 수는 없다.

당시 HAST 벤치는 혼합 구성의 변환 구간을 확인한 기록이다. 요청 시점에 렌더되는 글도 같은 변환을 사용하지만, 전체 입력의 시간을 글 수로 나눈 값이 개별 요청의 개선량은 아니다. 그래서 이번에는 앞에서처럼 실제 글의 첫 요청을 따로 쟀다.

이 작업에서는 본문 변환 시간을 줄이는 것과 메타데이터 목록을 재사용하는 것이 각각의 개선이었다. `getAllPosts` 메모이즈는 기존 remark/rehype 파이프라인 위에서도 적용할 수 있다. 이 역사적 빌드 표는 Rust 사용 여부까지 교차해 측정한 결과가 아니다. 앞의 새 비교에서는 세 구성 모두 메모이즈를 켜 두어, 이 캐시를 추가한 효과가 렌더러 교체의 효과에 섞이지 않도록 했다.

한 가지 더 밝혀둘 것이 있다. 초기 기록에는 시리즈 페이지가 60초 타임아웃에 걸린 건수가 베이스라인에서 7건, 14건으로 남아 있고, 그 재시도가 워커를 잡아먹으므로 wall time 비교에 주의하라고 적어 두었다. 위 표를 만들기 위해 두 환경에서 빌드를 다시 쟀을 때는 타임아웃이 양쪽 모두 0건이었다. 베이스라인 2회는 Codespaces가 232.1초와 219.8초, M1이 165.1초와 166.5초였다. 초기 타임아웃이 왜 사라졌는지는 확인하지 못했다.

## 옮기다 드러난 것들

HAST를 단계별로 대조하면서 기존 후처리가 무엇을 바꾸는지도 확인할 수 있었다. 그 과정에서 코드 토큰과 이미지 속성 처리까지 살펴보게 됐다.

**단계 하나를 지웠다.** `parseCodeSnippet`은 Prism이 붙인 `token tag` 같은 클래스를 Tailwind 클래스로 갈아끼우던 hast 변환 단계였다. 클래스를 그대로 두고 `tailwind.css`의 `.token.*` 규칙이 칠하게 바꾸니 이 단계가 통째로 필요 없어졌다([1bdfe859](https://github.com/yceffort/blog/commit/1bdfe859)). 색은 기존 팔레트를 `@apply`로 그대로 쓰므로 값이 같다.

그런데 이렇게 바꾸고 나서 색이 있는 토큰이 오히려 늘었다. 기존 JS는 `className[1]` 하나만 보고 판단해서 `token method function property-access`처럼 클래스가 셋 이상인 토큰을 놓치고 있었다. CSS 선택자는 클래스의 위치를 따지지 않으므로 이런 조합 28가지, 토큰 7,664개(전체 191,730개의 4%)가 새로 색을 받는다. 전수 조사로 확인해 보니 전부 "색 없음에서 맞는 색" 방향이고 색이 뒤바뀌는 경우는 없었다. 다만 이 토큰 개수는 당시 Tailwind와 Prism 구성의 기록이다. 이후 통합 브랜치에 StyleX 클래스를 붙이는 `parseCodeSnippet`이 다시 들어왔고, 이번에는 그 단계도 제거했다. 현재는 syntect가 토큰 클래스를 만들고 `markdown.css`가 색칠한다. 팔레트 값은 유지했지만 토큰 판정이 달라졌으므로 당시의 색상 개선 개수를 이번 결과로 쓰지는 않는다.

**alt 텍스트를 덮어쓰고 있었다.** `imageMetadata`가 이미지 크기를 읽어 붙이면서 `node.properties.alt = src`를 무조건 실행하고 있었다. `![first-wasm](./images/first-wasm.png)`이라고 쓴 글에서 렌더된 alt가 `./images/first-wasm.png`가 되는 식이다. img 노드 600개 중 563개(94%)가 여기 해당했다. alt가 비어 있을 때만 경로로 채우도록 고쳤다([b536d191](https://github.com/yceffort/blog/commit/b536d191)).

이런 것들이 파이프라인을 빠르게 만드는 과정에서 나왔다는 점이 조금 얄궂다. 성능 작업의 부산물로 4년치 글의 접근성 문제가 고쳐졌다.

## 파이프라인을 교체하고 남은 것

앱의 마크다운 렌더 경로에서 KaTeX와 Prism, unified 후처리 체인, 이미지 메타데이터 플러그인, StyleX 토큰 변환을 제거했다. 마크다운을 받아 React에 전달할 트리를 만드는 규칙은 Rust에 모였고, JS에는 메모리 전달과 React 컴포넌트 연결이 남았다. 기존 JS 구현은 비교 기준으로 개발 의존성에 보관한다. 패키지 목록에서 모든 JS 라이브러리가 사라진 것은 아니지만, 실제 렌더에서 두 체인을 조합할 필요는 없어졌다.

그 대신 유지할 Rust 코드와 빌드 조건은 늘었다. WASM은 초기 740,914바이트에서 약 2.49MiB가 됐고, Oniguruma를 다시 빌드하려면 wasi-sdk가 필요하다. 커밋할 바이너리는 CI에서 받아야 하고, 파서 크레이트 4만 2천 줄은 저장소 안에서 직접 관리한다. 하이라이터는 같은 입력에서 Prism보다 5.5배 느리다. Node의 WASI API는 실험적 기능으로 표시되어 있다. 수식에는 로컬 글꼴이 추가됐고, 코드 색상과 수식 배치는 이전과 달라질 수 있다. 관리 지점을 모으는 대가로 받아들인 변화다.

실제 첫 방문에서는 코드 글과 수식 글 모두 본문을 받는 시간이 줄었다. 전체 빌드 중앙값은 JS 20.88초, WASM 20.33초였으며 반복 실행의 범위가 겹쳤다. 예열한 HAST 변환 시간은 거의 같았다. 무엇을 재는지에 따라 얻은 결과가 달랐고, 변환 함수의 수치 하나로 이 작업 전체를 설명할 수 없었다.

재사용할 수 있는 결과는 검증 과정에도 남았다. 작은 문법 규칙을 고정하는 Rust 테스트, 실제 글을 양쪽 구현에 넣는 HAST 대조, 이미지 속성 비교, JSX 변환까지 확인하는 마크다운 검사가 있다. 전체 글 비교에서 실제 빈 줄 하나가 빠진 코드 블록 다섯 개를 찾았고, 이미지 비교에서는 SVG 네 개의 크기 누락을 찾았다. 출력이 달라도 되는 부분을 정한 뒤에도 보존해야 하는 부분을 구체적으로 검사할 수 있었다.

처음에는 파싱 시간을 줄이려고 시작했지만, 마지막에 얻고 싶었던 것은 변환 규칙을 한곳에서 읽고 고칠 수 있는 구조였다. 앞으로 제목 링크나 코드 메타데이터를 바꿀 때 Rust와 JS 후처리의 실행 순서를 함께 추적하지 않아도 된다. 그 범위를 WASM 호출 하나로 묶었고, 기존 글이 요구하는 동작을 확인할 입력과 검사도 함께 남겼다.
