# @yceffort/markdown-rs

블로그의 마크다운을 React에 전달할 HAST로 바꾸는 Rust/WASM 구현이다. 파싱부터 하이라이트, 수식, 이미지 메타데이터와 MDX 속성 처리까지 WASM에서 끝낸다. Node 바인딩은 메모리와 JSON을 전달하며, 앱의 `renderPost`는 반환된 트리를 `toJsxRuntime`으로 React에 연결한다.

```js
import {renderMarkdown} from '@yceffort/markdown-rs'

const tree = renderMarkdown(
  '## 제목\n\n본문',
  '/repo/apps/blog/posts/2026/09/post.md',
)
```

두 번째 인자인 글 경로를 생략하면 이미지 경로와 크기를 처리하지 않는다. 이미지를 처리할 때는 `apps/blog`를 작업 디렉터리로 사용한다. 바인딩이 최초 호출 시 작업 디렉터리의 `public`을 WASI의 `/public`에 연결한다. WASM은 서버에서 실행되며 브라우저에 전송하지 않는다.

## 구현과 출력

| 단계                                                   | 구현                                           |
| ------------------------------------------------------ | ---------------------------------------------- |
| CommonMark, GFM, 수식과 MDX 파싱, 한글 강조            | 벤더링한 `markdown` 1.0.0                      |
| JSX 문단 정리, 목차, HAST, 제목 id와 링크, 코드 파일명 | Rust 변환 함수                                 |
| 코드 토큰과 줄 번호, 강조 범위, diff 줄                | syntect 5.3.0, Oniguruma, two-face 0.5.2       |
| TeX 수식                                               | math-core 0.5.0의 MathML, TeX annotation 포함  |
| 로컬 이미지 경로와 크기, alt 보존                      | WASI, imagesize, SVG width/height 또는 viewBox |
| MDX 리터럴과 지원 범위 검사                            | `mdx.rs`                                       |

코드의 토큰 경계와 색은 Prism과 다르다. two-face 문법으로 TypeScript, TSX와 JSX를 처리하며, 찾을 수 없는 언어는 평문으로 남긴다. 토큰 색은 `apps/blog/src/components/post/markdown.css`에서 정의한다. 수식은 KaTeX의 HTML 대신 MathML을 사용하므로 글꼴과 배치가 달라진다. `apps/blog/public/fonts/math`에 Libertinus Math와 OFL 라이선스를 함께 보관한다.

앱의 렌더 경로에서는 rehype-katex, rehype-prism-plus, unified와 이미지 후처리, parseCodeSnippet을 제거했다. 기존 JS 체인과 관련 의존성은 이 패키지의 개발 의존성에 비교 기준으로 남아 있다. 이미지 최적화 등 다른 앱 기능에서 사용하는 sharp는 유지한다.

## 빌드와 배포

Rust 1.88.0과 `wasm32-wasip1`을 사용한다. Oniguruma의 C 코드를 빌드하려면 [wasi-sdk 27](https://github.com/WebAssembly/wasi-sdk/releases/tag/wasi-sdk-27)을 내려받아 압축을 풀고 경로를 지정한다.

```sh
export WASI_SDK_PATH=/absolute/path/to/wasi-sdk-27.0-arm64-macos
corepack pnpm --filter @yceffort/markdown-rs build
corepack pnpm --filter @yceffort/markdown-rs test
corepack pnpm --filter @yceffort/markdown-rs parity
corepack pnpm lint
corepack pnpm --filter blog build
```

환경 변수를 생략하면 저장소의 `.cache/wasi-sdk/wasi-sdk-27.0-{arch}-{platform}`에서 찾는다. macOS 플랫폼 이름은 `macos`다. Apple Silicon 배포 파일의 SHA-256은 `055c3dc2766772c38e71a05d353e35c322c7b2c6458a36a26a836f9808a550f8`이다. 빌드는 SDK의 Clang과 llvm-ar를 지정하고 `cargo build --locked --release --target wasm32-wasip1 --lib`를 실행한다.

빌드 스크립트는 Rust의 `--remap-path-prefix`로 Cargo 홈과 패키지 경로를 각각 `/cargo`와 `/src/markdown-rs`로 고정한다. 패닉 메시지 등에 개발자 홈의 절대 경로가 들어가면 같은 소스라도 CI에서 다시 만든 WASM과 바이트가 달라지므로, 커밋할 바이너리는 이 스크립트로 생성한다.

`Cargo.lock`에서 math-core의 내부 렌더러도 0.5.0에 고정했다. 같은 0.5 계열의 후속 내부 렌더러는 더 높은 Rust 버전을 요구하므로 lockfile 없이 의존성을 다시 해결하지 않는다. Xcode 명령 선택 경로가 깨진 로컬 환경에서는 설치된 Xcode의 SDK와 Clang 경로를 `SDKROOT`, `CC`, `AR`, `CARGO_TARGET_AARCH64_APPLE_DARWIN_LINKER`로 지정해 검증했다.

`pkg/markdown_rs.wasm`은 약 2.49MiB이며 저장소에 포함한다. Rust를 수정하면 바이너리도 다시 빌드해 함께 반영한다. 일반 Next.js 배포 빌드는 이 파일을 사용하므로 Rust와 wasi-sdk가 필요 없다. Next.js는 패키지를 `serverExternalPackages`로 불러오며 `outputFileTracingIncludes`에 WASM 파일을 포함한다.

런타임에는 Node의 [WASI preview1 API](https://nodejs.org/docs/v24.20.0/api/wasi.html)를 사용한다. Node 24에서 이 API는 실험적 기능이며 초기화 시 경고가 출력된다. 이전 `wasm32-unknown-unknown` 바이너리와 달리 호스트 import가 있다. 노출하는 ABI는 `alloc`, `dealloc`, `render_json_ptr`, `free_result`이며 메모리 소유권은 `src/lib.rs`와 `index.js`에 정의되어 있다.

## 호환성 검사

`parity`는 글과 시리즈 461개를 기존 JS 구현과 비교한다. 위치 정보와 MDX 메타데이터를 정규화하고, 코드 줄 안의 토큰 span은 원문으로 합친다. 코드 원문과 줄 번호, 강조 줄, 파일명은 비교한다. 수식은 TeX annotation과 인라인/블록 표시 모드를 비교하므로 수식 내부 마크업과 시각적 동일성은 검사하지 않는다.

2026-09-14 작업 트리에서 Rust 테스트 21개와 461개 HAST 비교가 통과했다. 이미지 메타데이터는 교체 전 JS 플러그인을 별도로 불러 600개 노드의 속성을 대조했고 모두 일치했다. 실제 수식 노드 145개가 변환됐으며, 그중 두 개는 기존 파서가 달러 기호가 있는 금액 문장을 수식으로 인식한 경우다. `\space`는 공백 명령으로 확장하는 매크로를 등록했다.

`apps/blog/scripts/check-markdown.mjs`는 글을 `toJsxRuntime`까지 변환해 확인한다. 컴포넌트는 스텁이므로 실제 데모 동작이나 브라우저의 MathML 배치를 보장하지 않는다. 프로덕션 HTTP 검사에서는 수식, 코드, 데모를 포함한 페이지 5개와 글꼴 파일의 200 응답, MathML과 TeX annotation, iframe과 코드 줄, CSS의 글꼴과 토큰 규칙을 확인했다. `/fonts` 정적 파일이 차단되지 않도록 앱의 프록시에 경로 접두어를 허용했다. 추가로 Chromium 153의 첫 방문 측정에서 코드 글과 수식 글을 각 구성별 6회 열어 오류와 캐시 재사용이 없는지 검사했다. 수식 글의 MathML 31개와 글꼴 응답, 첫 화면도 확인했다. 다른 브라우저와 모든 수식의 화면을 대조한 것은 아니다.

## MDX 지원 범위

숫자, 불리언, null과 이스케이프가 없는 단순한 따옴표 문자열을 속성값으로 받는다. 계산식 속성과 펼침 속성, 내용이 있는 본문 표현식은 Rust에서 거부한다. 빈 표현식과 주석은 제거한다. `import`와 `export`는 실행하지 않으며 파서에서 평문으로 남을 수 있어 작성 단계의 마크다운 검사에서 차단한다.

React 컴포넌트 구현과 이름 연결은 앱의 책임이다. JSX 변환 검사 통과가 실제 컴포넌트 동작의 보장은 아니다.

## 측정과 출처

실제 앱에서 기존 JS, 파싱 WASM과 JS 후처리의 혼합 구성, 전체 WASM을 비교했다. 전체 빌드는 각 6회, 코드 글과 수식 글의 콜드 방문은 조합별 6회씩 측정했다. 전체 빌드 중앙값은 JS 20.88초, 혼합 20.62초, WASM 20.33초로 실행 범위가 겹쳤다. JS에서 전체 WASM으로 바꾸자 본문 DOM 도착 중앙값은 코드 글 1,163.8ms에서 917.2ms, 수식 글 1,247.6ms에서 896.0ms로 줄었다. 서버와 브라우저를 매번 새로 실행한 로컬 측정이며 실서비스 지연을 뜻하지 않는다.

조건과 재실행 방법은 [BENCHMARK.md](BENCHMARK.md), 원시 기록은 [experience-results.json](experience-results.json)에 있다. 예열한 글 453편의 HAST 변환은 JS 4,490.5ms, WASM 4,464.0ms로 거의 같았지만, 이를 빌드나 첫 방문 시간으로 해석할 수는 없다. 초기 혼합 구성의 기록은 [bench-results.json](bench-results.json), 전체 WASM의 예열 기록은 [bench-wasi-results.json](bench-wasi-results.json)으로 구분해 보존한다.

파서의 수정 내역은 `vendor/markdown-rs/PATCHES.md`에 있다. two-face에 포함된 문법의 저작권과 라이선스는 `SYNTAX-LICENSES.txt`에 보관했으며 [고정 버전의 고지](https://codeberg.org/CosmicHarper/two-face/src/tag/v0.5.2+bat-0.26.1/generated/acknowledgements_full.md)를 따른다. MathML 글꼴은 math-core의 `d4a64feff32bf2ff45bf09823192e4a77448a03a` 커밋의 `playground/fonts/LibertinusMath-Regular.woff2`에서 가져왔고, OFL 라이선스는 math-core-fonts의 `d581bb50a8e15c5f08c59f6ba5f213e188753fa1` 버전과 함께 보관한다.
