# @yceffort/markdown-rs

블로그 포스트의 마크다운을 hast(HTML AST)로 바꾸는 Rust 구현이다. wasm 으로 빌드해 Node 에서 쓴다.

```js
import {renderMarkdown} from '@yceffort/markdown-rs'

const tree = renderMarkdown('## 제목\n\n본문')
```

## 왜

`next-mdx-remote-client` + remark/rehype 체인이 포스트 451개를 도는 데 10.6초가 걸렸다. 파싱을 Rust 로 옮겨 3.3초가 됐다(3.2배). 출력은 기존 체인과 완전히 같다. `scripts/parity.mjs` 가 포스트와 시리즈 458개를 두 구현으로 돌려 hast 를 통째로 비교한다.

## 파이프라인 분담

Rust(이 패키지)가 하는 일:

| 단계                                            | 대응하는 기존 구현                                           |
| ----------------------------------------------- | ------------------------------------------------------------ |
| 마크다운 파싱 (CommonMark, GFM, 수식, MDX 문법) | `remark-parse` + `remark-gfm` + `remark-math` + `remark-mdx` |
| 한글 강조 판정                                  | `remark-cjk-friendly`                                        |
| JSX 한 줄 문단 풀기                             | `@mdx-js/mdx` 의 `remark-mark-and-unravel`                   |
| 목차 생성                                       | `remark-toc` (`mdast-util-toc`)                              |
| mdast -> hast                                   | `mdast-util-to-hast` (`remark-rehype`)                       |
| 제목 id                                         | `rehype-slug` (`github-slugger`)                             |
| ` ```json:package.json ` 의 파일명 분리         | `apps/blog/src/utils/Markdown.ts` 의 `extractCodeFilename`   |
| 제목 앞 링크 아이콘                             | `rehype-autolink-headings`                                   |

JS 에 남긴 일 (`apps/blog/src/utils/renderPost.tsx`):

- `rehype-katex`: 수식 렌더. KaTeX 와 같은 출력을 내는 Rust 구현이 없다.
- `rehype-prism-plus`: 코드 하이라이트. syntect 로 해봤더니 토큰 경계가 달라 기존 글 4555개 중 코드 문자의 12%가 색이 바뀌었고, wasm 이 2.2MB 커지는데 Prism 보다 4배 느렸다. 그대로 둔다.
- `imageMetadata`: `sharp` 로 이미지 크기를 읽는다. wasm 에는 파일 시스템이 없어 옮길 수 없다.

Prism 토큰 색은 예전에 `parseCodeSnippet` 이 hast 에서 클래스를 갈아끼웠는데, 지금은 `apps/blog/src/app/tailwind.css` 의 `.token.*` 규칙이 칠한다. 단계가 하나 없어졌다.

## 빌드

```bash
pnpm --filter @yceffort/markdown-rs build   # cargo build --release --target wasm32-unknown-unknown -> pkg/
pnpm --filter @yceffort/markdown-rs test    # cargo test
node scripts/parity.mjs                     # 포스트 전체를 기존 구현과 대조
node scripts/bench.mjs                      # 두 구현 속도 비교
```

`pkg/markdown_rs.wasm`(0.6MB)은 저장소에 커밋한다. Vercel 빌드에 Rust 툴체인을 넣지 않기 위해서다. **Rust 코드를 고치면 `build` 를 돌려 `pkg/` 를 같이 커밋해야 한다.**

## MDX 지원 범위

본문은 MDX 문법으로 읽지만 JS 를 실행하지는 않는다. 다음은 렌더 시점에 에러로 막는다.

- `import` / `export`
- 내용이 있는 표현식 (`{someValue}`). 빈 표현식과 주석(`{/* ... */}`)은 무시한다.
- 리터럴이 아닌 속성 표현식 (`<C prop={a + b} />`). 숫자, 불리언, null, 문자열 리터럴만 받는다.

`apps/blog/scripts/check-markdown.mjs` 가 커밋 전에 같은 렌더러를 돌리므로, lint 를 통과한 글은 빌드에서도 렌더된다.

## vendor/markdown-rs

`markdown` 크레이트 1.0.0 을 복사해 두 군데를 고쳤다. `vendor/markdown-rs/PATCHES.md` 에 표로 적어 두었다.
