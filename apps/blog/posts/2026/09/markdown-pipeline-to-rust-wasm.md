---
title: '마크다운 파이프라인을 Rust로 옮기고, 빌드는 <em>12줄</em>이 줄였다'
tags:
  - rust
  - wasm
  - markdown
  - nextjs
  - performance
  - frontend
published: false
date: 2026-09-14 15:00:00
description: '블로그의 remark/rehype 체인을 Rust(wasm)로 옮겨 글 451편 렌더가 17.1초에서 4.3초가 됐다. 그런데 정작 빌드를 줄인 것은 Rust가 아니라 getAllPosts를 워커 수명 동안 재사용하는 12줄이었고, 정적 페이지 생성이 3.3분에서 11.4초가 됐다. 무엇을 옮기지 않을지 먼저 정하고, 글 458개의 hast를 통째로 대조하고, 두 겹으로 쳐둔 그물이 같은 곳에서 뚫린 것을 찾은 기록이다.'
thumbnail: /thumbnails/2026/09/markdown-pipeline-to-rust-wasm.png
art:
  undraw: data-transfer
---

## Table of Contents

## 느린 것이 파싱이라고 생각했다

이 블로그는 글 하나를 그릴 때마다 remark와 rehype 플러그인 체인을 통째로 돈다. 글 451편을 한 번씩 렌더해 보면 17.1초가 걸린다. 빌드 쪽이 더 눈에 띄었다. `Generating static pages`가 346장을 그리는 데 3.3분이고, 빌드 전체로는 wall 232초에 user CPU 667초를 쓴다. 4코어가 거의 쉬지 않았다는 뜻이다.

파싱이 병목이라고 생각했다. 마침 9월 초에 [markdownlint-cli2를 Rust로 옮기면서](/2026/09/porting-markdownlint-cli2-to-rust) `markdown` 크레이트를 고쳐 쓴 적이 있었다. 같은 파서를 블로그 렌더러에 가져다 붙이면 되겠다 싶었다.

결론부터 적으면 파싱은 실제로 4배 빨라졌고, 빌드 시간은 거의 그대로였다. 빌드를 줄인 것은 나중에 따로 건드린 12줄이었다. 이 글은 그 순서대로 무엇을 왜 그렇게 했는지에 대한 기록이다.

> 측정 환경은 둘이다. GitHub Codespaces `standardLinux32gb`(4 vCPU AMD EPYC 7763, 16GB, Ubuntu 24.04.4 LTS)와 로컬 iMac(Apple M1 8코어, 16GB, macOS 26.6.2). 양쪽 모두 Node 24.20.0, pnpm 12.1.0, Next.js 16.3.1이고 브랜치는 `feat/markdown-rs` `b536d191`이다. 렌더 벤치는 3회 중앙값, 빌드는 `.next`를 지우고 연달아 2회씩 돌린 값이다. GA4 자격증명이 없는 상태로 빌드해 인기글이 빈 배열로 떨어지는 조건인데, 실시간 데이터가 섞이면 실행마다 결과가 달라져 대조가 불가능하기 때문이다. 이 글의 렌더 벤치와 빌드 수치는 2026년 9월 14일에 다시 쟀고, 그 밖의 수치(syntect 비교, wasm 로딩 분해 등)는 작업 당시의 기록이다. 작업 계획은 내가 쓰고 구현은 코딩 에이전트(Claude Code)가 했다. 내가 직접 한 것은 Rust 코드 리뷰다.

## 무엇을 옮기지 않을지 먼저 정했다

"마크다운 파이프라인을 Rust로 옮긴다"는 문장은 실제로는 "체인의 어디를 자를 것인가"라는 질문이다. 기존 체인은 `next-mdx-remote-client`가 `remark-parse`, `remark-gfm`, `remark-math`, `remark-mdx`, `remark-cjk-friendly`, `remark-toc`, `remark-rehype`, `rehype-slug`, `rehype-autolink-headings`, `rehype-katex`, `rehype-prism-plus`, 그리고 직접 쓴 두 단계를 차례로 돌리는 구조였다.

먼저 옮기지 않을 것을 정했다. 셋이다.

**코드 하이라이트(`rehype-prism-plus`)는 그대로 뒀다.** Rust 쪽 대안인 syntect로 한 번 해봤는데, 토큰 경계가 달라서 기존 글의 코드 문자 12%가 색이 바뀌었다. YAML 키는 54%, JSON 키는 31%였다. 거기에 wasm이 2.2MB 커지고 Prism보다 4배 느렸다(13.2초 대 3.3초). 크기와 속도는 감수할 수 있어도 451편의 코드 색이 바뀌는 것은 이 작업의 목적과 정반대다. tree-sitter 계열도 토큰 이름 체계가 달라 같은 문제를 안고 있고, Prism 문법을 그대로 옮긴 Rust 구현은 없다.

**수식(`rehype-katex`)도 남겼다.** 파리티 기준을 "렌더된 HTML이 바이트 단위로 같을 것"으로 잡았는데, KaTeX와 같은 출력을 내는 Rust 구현은 없다. 재구현으로 맞출 수 있는 종류의 것이 아니다. 게다가 수식이 있는 글은 451편 중 12편이고 전체 렌더에서 169ms를 쓴다. 옮겨도 가져올 것이 없다.

**이미지 크기(`sharp`)는 구조적으로 불가능했다.** 뒤에서 다시 나오지만 이 wasm 모듈은 호스트 import가 0개인 순수 계산 모듈이다. 파일 시스템이 없으니 이미지를 읽을 수가 없다.

그래서 Rust가 맡은 범위는 이렇게 정리됐다.

| Rust(wasm)가 하는 일                            | 대응하는 기존 구현                                           |
| ----------------------------------------------- | ------------------------------------------------------------ |
| 마크다운 파싱 (CommonMark, GFM, 수식, MDX 문법) | `remark-parse` + `remark-gfm` + `remark-math` + `remark-mdx` |
| 한글 강조 판정                                  | `remark-cjk-friendly`                                        |
| JSX 한 줄 문단 풀기                             | `@mdx-js/mdx`의 `remark-mark-and-unravel`                    |
| 목차 생성                                       | `remark-toc` (`mdast-util-toc`)                              |
| mdast에서 hast로                                | `mdast-util-to-hast` (`remark-rehype`)                       |
| 제목 id                                         | `rehype-slug` (`github-slugger`)                             |
| 코드 블록의 파일명 분리                         | 직접 쓴 `extractCodeFilename`                                |
| 제목 앞 링크 아이콘                             | `rehype-autolink-headings`                                   |

붙이는 자리는 30줄이 안 된다. Rust가 hast를 만들어 주면 JS가 그 위에 남은 세 단계를 얹는다([3ac9c28a](https://github.com/yceffort/blog/commit/3ac9c28a)).

```tsx
export async function renderPost(body: string, path: string) {
  const tree = await unified()
    .use(rehypeKatex)
    .use(prism, {showLineNumbers: true})
    .use(imageMetadataPlugin, {path})
    .run(renderMarkdown(body))

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

Rust로 옮긴다고 하면 보통은 네이티브 바이너리를 떠올린다. 여기서는 wasm을 골랐는데, 제약이 하나 있었기 때문이다. 이 렌더러는 빌드 시점과 요청 시점 양쪽에서 돈다. 네이티브로 가면 플랫폼별 바이너리를 배포에 실어야 하고, 렌더할 때마다 프로세스를 띄워야 한다. Vercel 빌드에 Rust 툴체인을 넣고 싶지도 않았다. 그래서 `pkg/markdown_rs.wasm`(740,914 bytes)을 저장소에 커밋하고, Rust를 고치면 다시 빌드해 같이 커밋하는 방식으로 정했다.

빌드 때 모든 글의 hast를 JSON으로 구워 두는 안도 검토했다가 접었다. hast JSON 전체가 91.6MB라 배포가 무거워진다.

`wasm-bindgen`은 쓰지 않았다. 필요한 인터페이스가 "JSON 문자열을 넣으면 JSON 문자열이 나온다" 하나뿐이라 함수 세 개짜리 ABI로 충분했다.

```rust
// 입력: alloc 으로 받은 버퍼에 UTF-8 JSON 을 쓰고 render_json_ptr(ptr, len) 호출.
// 출력: [u32 길이 (LE)][UTF-8 JSON]. 다 읽은 뒤 free_result(ptr) 로 반납.
```

호스트에서 가져다 쓰는 함수가 하나도 없으니 `WebAssembly.Instance`에 넘기는 import 객체가 빈 객체다. 대신 Node 쪽 바인딩에서 신경 쓸 것이 두 가지 생겼다. 호출 중에 wasm 메모리가 자라면 기존 `ArrayBuffer`가 분리되므로 결과를 읽기 전에 `exports.memory.buffer`를 다시 읽어야 하고, Rust가 trap을 던진 뒤의 인스턴스 상태는 믿을 수 없으므로 인스턴스를 버리고 다음 호출에서 새로 만들어야 한다.

릴리즈 프로파일은 처음에 크기 우선(`opt-level = "s"`)으로 뒀다가 `3`으로 바꿨다. 크기를 아껴서 지키는 것이 없었기 때문이다. wasm 컴파일에 0.7ms가 걸리니 122KB가 늘어도 로딩에 영향이 없는데, 바꾸고 나니 451편 파싱이 1,428ms에서 1,160ms로 19% 줄었다. hast JSON은 451편 전부 동일했다. 크기는 602KB에서 724KB가 됐다.

## 크레이트를 복사해서 두 군데를 고쳤다

파서는 `markdown` 크레이트 1.0.0을 썼다. 다만 그대로는 쓸 수 없어서 저장소 안에 복사해 두고 두 군데를 고쳤다([dd69e1b5](https://github.com/yceffort/blog/commit/dd69e1b5)). 포크해서 따로 관리하는 대신 `vendor/markdown-rs/PATCHES.md`에 표로 적어 두는 쪽을 택했다. 고친 곳이 두 군데뿐이고, 원본과의 차이를 한눈에 보는 것이 이 작업에서는 더 중요했다.

첫째는 한글 강조다. 이 블로그는 `remark-cjk-friendly`를 쓴다. `**강조**는`처럼 강조가 한글 조사와 맞붙는 문장이 CommonMark 기본 규칙에서는 강조로 잡히지 않기 때문이다. 이걸 맞추려고 `micromark-extension-cjk-friendly` 2.0.1의 문자 분류와 open/close 판정을 `src/util/cjk.rs`로 옮기고, `attention.rs`의 `get_sequences()`가 `*`와 `_` 시퀀스를 그 판정으로 보게 했다. 취소선(`~`)은 원래 규칙을 유지했는데, `remark-cjk-friendly`도 취소선은 건드리지 않기 때문이다.

둘째는 제목 파싱이다. `### #1. 제목`을 넣으면 안쪽 `#`이 첫 Data 노드 앞에 오는 바람에 본문에서 빠졌다. micromark는 `#1. 제목`으로 읽는다. `heading_atx.rs`의 `resolve()`가 여는 시퀀스와 뒤따르는 공백 바로 다음부터 본문으로 잡도록 고쳤다. `# # #`처럼 Data가 아예 없는 경우는 원래대로 빈 제목이다.

이 두 가지는 "옮긴다"는 말이 실제로는 무엇을 뜻하는지 보여주는 자리이기도 했다. 목표가 같은 결과를 내는 것이라면, 원본 도구가 쓰는 확장까지 따라가야 한다. 기본 CommonMark 파서를 가져다 붙이는 것으로는 첫 글부터 결과가 달라진다.

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

## 같다는 것을 어떻게 증명했나

이 작업은 결과가 달라지면 그 자체로 실패다. 그래서 코드보다 대조 스크립트를 먼저 만들었다([c9269cd4](https://github.com/yceffort/blog/commit/c9269cd4)).

`parity.mjs`는 글 451편과 시리즈 7개, 합쳐서 458개 파일을 두 구현으로 돌려 hast 트리를 통째로 비교한다. 일부를 샘플링하지 않고 전부 돌리는데, 458개는 몇 초면 끝나니까 굳이 줄일 이유가 없었다. 오늘 다시 돌린 결과도 양쪽 환경에서 458 pass, 0 fail이다.

여기서 한 번 걸려 넘어진 곳이 `serde_json`의 `preserve_order` 기능이다. hast의 `properties`는 `Map<String, Value>`인데, 이 기능을 빼면 `BTreeMap`이 되면서 키가 알파벳순으로 정렬된다. 트리 자체는 같아도 렌더된 HTML의 속성 순서가 바뀐다. 바이트 단위 대조를 기준으로 잡지 않았다면 지나쳤을 종류의 차이다.

트리가 같은 것으로 부족해서 빌드 산출물도 맞춰 봤다. 작업 당시 정적 페이지 334장을 두 브랜치에서 뽑아 `BUILD_ID`만 정규화하고 대조하니 334장 전부 바이트가 같았다. Rust 단위 테스트는 11개이고 오늘도 전부 통과한다.

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

중요한 것은 고친 내용이 아니라 왜 못 잡았는가 쪽이다. 검사는 두 겹이었다. `parity.mjs`가 hast를 대조하고, 커밋 전에 `check-markdown.mjs`가 렌더러를 돌린다. 둘 다 같은 곳이 뚫려 있었다. `parity.mjs`의 `normalize()`는 양쪽에서 `mdxJsxAttributeValueExpression`을 값으로 접고 mdx 노드의 `data`를 건너뛴다. hast끼리 같은지만 보므로 "그 hast가 JSX로 바뀌는가"는 애초에 검사 범위 밖이다. `check-markdown.mjs`는 hast를 만드는 데서 멈췄다. 둘 다 트리까지만 보고 있었던 것이다.

그래서 `check-markdown.mjs`가 `toJsxRuntime`까지 돌리도록 범위를 넓혔다([edb3886d](https://github.com/yceffort/blog/commit/edb3886d)). 컴포넌트 구현은 `tsx`라 이 스크립트에서 읽을 수 없으므로 프록시 스텁으로 잇는다. 여기서 잡으려는 것은 컴포넌트가 실제로 있는지가 아니라 트리가 JSX로 바뀌는지다.

```js
const stub = () => null
const jsxStubs = new Proxy({}, {get: () => stub, has: () => true})
```

evaluater 없이 이 검사를 돌리면 458편 중 정확히 그 2편만 걸린다. 고친 뒤에는 458편 전부 통과하고, 빌드 후 요청도 두 언어판 모두 200이며, 렌더된 iframe 마크업이 실서비스와 바이트 단위로 같다.

이 일에서 남은 교훈은 그물을 두 겹 치는 것만으로는 부족하다는 쪽이다. 두 그물의 구멍이 같은 자리에 있으면 겹쳐도 소용이 없다. 두 검사가 모두 "hast까지"를 경계로 삼고 있었다는 것을 먼저 봤어야 했다.

## 정작 빌드를 줄인 것은 12줄이었다

파싱은 계획대로 빨라졌다.

| 렌더 대상 451편   | 기존 remark/rehype | Rust hast + katex/prism | 그중 Rust 파싱만 | 배수   |
| ----------------- | ------------------ | ----------------------- | ---------------- | ------ |
| Codespaces 4 vCPU | 17,068 ms          | 4,308 ms                | 2,012 ms         | 3.96배 |
| 로컬 M1 8코어     | 12,090 ms          | 2,854 ms                | 1,448 ms         | 4.24배 |

그런데 빌드는 거의 그대로였다. `Generating static pages`가 여전히 3분대였다. 렌더가 4배 빨라졌는데 정적 페이지 생성이 그대로라면 시간을 쓰는 곳이 렌더가 아니라는 뜻이다.

찾아보니 `getAllPosts`였다. 이 함수는 글 파일을 전부 읽어 frontmatter를 파싱하고 정렬해서 배열로 돌려주는데, React의 `cache()`로 감싸여 있다. `cache()`는 요청 단위 중복 제거다. 한 요청 안에서 여러 번 불러도 한 번만 실행되지만, 빌드 워커가 페이지를 346장 그리는 동안에는 페이지마다 새로 실행된다. 글이 451편이니 451편을 346번 다시 읽고 있었던 셈이다.

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

개발 모드에서는 채우지 않는다. 초안을 고치면 바로 반영돼야 하기 때문이다. 순수하게 추가된 줄은 12줄이다.

| 지표                                    | 메모이즈 없음 | 있음   | 변화   |
| --------------------------------------- | ------------- | ------ | ------ |
| 정적 페이지 생성 (Codespaces, 워커 3개) | 3.3min        | 11.4s  |        |
| 정적 페이지 생성 (M1, 워커 7개)         | 2.5min        | 7.9s   |        |
| 빌드 전체 wall (Codespaces)             | 232.1s        | 41.0s  | -82.3% |
| 빌드 전체 wall (M1)                     | 165.1s        | 22.3s  | -86.5% |
| user CPU (Codespaces)                   | 667.0s        | 107.5s | -83.9% |
| user CPU (M1)                           | 893.2s        | 84.8s  | -90.5% |

`.next`를 지우지 않고 이어서 돌린 두 번째 빌드도 같은 방향이었다. Codespaces는 219.8초 대 23.8초, M1은 166.5초 대 15.5초다.

두 환경의 절대값을 직접 비교하면 안 된다. 워커 수가 다르고(Codespaces 3개, M1 7개) CPU도 다르다. 볼 것은 같은 방향으로 8할 넘게 줄었다는 쪽이다. M1의 베이스라인 user CPU가 Codespaces보다 오히려 큰 것도 워커를 더 띄운 것과 관련이 있어 보이지만, 그 인과를 따로 확인하지는 않았다.

그런데 왜 렌더를 4배로 만들어 놓고도 빌드가 움직이지 않았을까. 빌드가 그리는 페이지의 구성을 보면 답이 나온다. 프리렌더된 334장을 종류별로 세면 이렇다.

| 종류                             | 장수 |
| -------------------------------- | ---- |
| 태그 페이지                      | 268  |
| 목록 페이지                      | 26   |
| 글 상세                          | 18   |
| 시리즈                           | 8    |
| 나머지(홈, 소개, 이력서, 404 등) | 14   |

**334장 중 마크다운 본문을 렌더하는 것은 18장뿐이다.** 나머지 316장은 제목과 날짜와 태그만 있으면 되니 본문 파서를 아예 부르지 않는다. 글 상세 18장 중 2장은 경로 껍데기이고, 본문까지 구워진 글은 16편이며 전부 최근 두 달치다. 나머지 글은 PPR 껍데기만 굽고 본문은 요청이 올 때 그린다. 벤치에서 잰 4배는 그 16편에만 걸리니 165초짜리 빌드에서는 보이지 않는다.

그러니 4배가 사라진 것은 아니고 자리가 다른 것이다. 글 451편 중 435편은 요청이 올 때 이 파이프라인을 탄다. 편당으로 보면 26.8ms가 6.3ms가 됐다(M1 기준, 벤치 값을 451로 나눈 것). 다만 이것은 렌더 함수 자체를 잰 값이지 요청 한 건의 응답 지연 전체가 아니다.

정직하게 말하면 **빌드 쪽 개선은 Rust와 관계가 없다.** `getAllPosts` 메모이즈는 기존 remark/rehype 파이프라인 위에서도 똑같이 할 수 있었다. 다만 순서를 뒤집어 생각하면 조금 다르게 읽힌다. 렌더가 4배 빨라졌는데도 빌드가 그대로였기 때문에 "렌더가 아닌 무언가"를 찾게 됐다. 파싱을 빠르게 만들지 않았다면 `getAllPosts`가 범인이라는 것은 한동안 가려져 있었을 것이다.

한 가지 더 밝혀둘 것이 있다. 작업 당시 기록에는 시리즈 페이지가 60초 타임아웃에 걸린 건수가 베이스라인에서 7건, 14건으로 남아 있고, 그 재시도가 워커를 잡아먹는 되먹임 때문에 wall time을 믿지 말라고 적어 두었다. 그런데 오늘 두 환경에서 다시 재보니 타임아웃이 양쪽 모두 0건이었다. 베이스라인 2회도 안정적으로 재현됐다. Codespaces가 232.1초와 219.8초, M1이 165.1초와 166.5초다. 당시 측정이 다른 프로세스와 CPU를 나눠 쓰고 있었을 가능성이 있지만, 확인한 것은 오늘 재현되지 않았다는 사실까지다.

## 옮기다 드러난 것들

이식 자체보다 이식하면서 눈에 띈 것이 더 실질적인 수확이었다.

**단계 하나를 지웠다.** `parseCodeSnippet`은 Prism이 붙인 `token tag` 같은 클래스를 Tailwind 클래스로 갈아끼우던 hast 변환 단계였다. 클래스를 그대로 두고 `tailwind.css`의 `.token.*` 규칙이 칠하게 바꾸니 이 단계가 통째로 필요 없어졌다([1bdfe859](https://github.com/yceffort/blog/commit/1bdfe859)). 색은 기존 팔레트를 `@apply`로 그대로 쓰므로 값이 같다.

그런데 이렇게 바꾸고 나서 색이 있는 토큰이 오히려 늘었다. 기존 JS는 `className[1]` 하나만 보고 판단해서 `token method function property-access`처럼 클래스가 셋 이상인 토큰을 놓치고 있었다. CSS 선택자는 클래스의 위치를 따지지 않으므로 이런 조합 28가지, 토큰 7,664개(전체 191,730개의 4%)가 새로 색을 받는다. 전수 조사로 확인해 보니 전부 "색 없음에서 맞는 색" 방향이고 색이 뒤바뀌는 경우는 없었다.

**alt 텍스트를 덮어쓰고 있었다.** `imageMetadata`가 이미지 크기를 읽어 붙이면서 `node.properties.alt = src`를 무조건 실행하고 있었다. `![first-wasm](./images/first-wasm.png)`이라고 쓴 글에서 렌더된 alt가 `./images/first-wasm.png`가 되는 식이다. img 노드 600개 중 563개(94%)가 여기 해당했다. alt가 비어 있을 때만 경로로 채우도록 고쳤다([b536d191](https://github.com/yceffort/blog/commit/b536d191)).

이런 것들이 파이프라인을 빠르게 만드는 과정에서 나왔다는 점이 조금 얄궂다. 성능 작업의 부산물로 4년치 글의 접근성 문제가 고쳐졌다.

## 남은 것과 정직한 평가

JS에 남은 네 단계 중 지금 wasm으로 옮길 수 있는 것은 없다. KaTeX는 파리티 기준이 막고, Prism은 이미 기각된 결정이고, `imageMetadata`는 파일 시스템이 없어 불가능하며, `parseCodeSnippet`은 아예 사라졌다.

그래서 다음에 볼 곳은 wasm이 아니다. 요청 시점 첫 렌더에 1초 가까이 걸리는데, 그 정체는 wasm이 아니라(파일 읽기 0.7ms, 컴파일 0.7ms, 인스턴스화 0.1ms) `rehype-katex`와 `rehype-prism-plus`와 `unified`의 모듈 import 307ms에 Next와 React 초기화가 붙은 것이다. hast JSON을 주고받는 비용도 아니다. 17.3MB를 `JSON.parse`하는 데 75ms로 전체의 5%다.

손대지 않은 개선거리도 하나 있다. `imageMetadata`가 `readFileSync`로 이미지를 통째로 읽어 `sharp`에 넘긴다. 필요한 것은 헤더뿐인데 451편 기준 67.2MB를 읽는다. 빌드 때 이미지 크기를 굽어 두고 렌더에서는 조회만 하는 쪽이 맞다고 보지만, 아직 재보지 않았다.

전체를 놓고 보면 이렇다. 파싱은 4배 빨라졌고 그 결과는 458개 글에서 기존 구현과 동일하다. 값으로 치른 것은 저장소에 들어간 740KB짜리 wasm 바이너리, 벤더링한 크레이트, 그리고 Rust를 고칠 때마다 wasm을 다시 빌드해 커밋해야 하는 규칙이다. 빌드 시간을 8할 넘게 줄인 것은 그 4배가 아니라 나중에 넣은 12줄이었고, 그 12줄은 Rust 없이도 넣을 수 있었다.

그럼에도 순서가 헛되지는 않았다고 생각한다. 렌더를 충분히 빠르게 만들어 두지 않았다면 "렌더가 아닌 곳에서 시간이 간다"는 문장에 도달하기 어려웠을 것이다. 성능 작업에서 가장 비싼 것은 대개 최적화 자체가 아니라 어디를 최적화할지 알아내는 일인데, 이번에는 파싱을 4배 빠르게 만드는 우회로를 한 바퀴 돌고 나서야 그 답이 나왔다.
