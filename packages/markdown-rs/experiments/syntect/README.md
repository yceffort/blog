# syntect 파싱 비용 재측정

2026-09-14, `feat/blog-performance`의 `f27162bd` 작업 상태에서 실행했다. Node 24.20.0, Apple M1, Rust 1.88.0을 사용했다. 기존 문서의 syntect 13.2초와 Prism 3.3초 비교는 당시 구현과 원시 측정 기록을 복원하지 못했다. 아래는 해당 숫자의 재현 결과가 아니라, 느려질 수 있는 구간을 나누어 확인한 새 실험이다.

## 비교 범위

현재 글 453개의 코드 블록 4,629개 중 두 엔진이 모두 지원하는 2,587개, UTF-8 기준 781,021바이트를 사용했다. 실제 마크다운 파이프라인이 만든 `pre > code`에서 문자열을 추출했다. 파일 읽기, frontmatter 처리, 마크다운 파싱, 입력 선택과 검증은 측정 전에 끝낸다.

Prism은 현재 `rehype-prism-plus`가 사용하는 refractor의 `tokenize`를 호출한다. syntect는 `ParseState::parse_line`을 호출한다. 두 엔진은 문법 정의와 출력 형식이 다르다. Prism의 토큰 배열과 syntect의 scope operation을 비교하므로, 이 결과를 전체 하이라이터 교체의 속도 비율로 해석하면 안 된다. 테마 적용, HTML/HAST 생성, 줄 번호 처리, 출력 JSON 변환은 양쪽 모두 포함하지 않는다.

syntect 5.3.0, fancy-regex 0.16.2는 원래 작업 디렉터리에 남은 WASM 빌드 기록과 맞췄다. 나머지 Rust 의존성은 이 실험의 `Cargo.lock`에 고정했다. 모든 Rust 실행 파일은 `opt-level = 3`, LTO, `codegen-units = 1`의 release 빌드다. 네이티브 Oniguruma 비교에는 onig 6.5.3을 사용했다.

syntect 기본 문법에 없는 TypeScript, TSX, JSX 등을 JavaScript로 대체하지 않고 제외했다. 제외 내역은 `results.json`의 `corpus.skipped`에 기록했다. 따라서 블로그의 모든 코드 블록을 포함한 비교는 아니다.

## 측정 결과

| 실행 경로                      | 초기화 후 6회 중앙값 |    최솟값 |    최댓값 |
| ------------------------------ | -------------------: | --------: | --------: |
| Prism, Node                    |              125.3ms |   124.6ms |   131.3ms |
| syntect, fancy-regex, WASM     |            2,341.5ms | 2,332.2ms | 2,351.3ms |
| syntect, fancy-regex, 네이티브 |            1,662.8ms | 1,626.2ms | 1,685.4ms |
| syntect, Oniguruma, 네이티브   |              593.5ms |   585.0ms |   607.0ms |

Prism과 WASM은 같은 Node 프로세스에서 전체 입력으로 준비 실행을 마친 뒤 순서를 번갈아 6쌍 측정했다. 네이티브는 별도 프로세스에서 첫 실행 후 각각 6회 측정했다. 네이티브 두 엔진은 fancy, Oniguruma 순서로 실행했으므로 교차 실행으로 순서 효과를 통제한 비교는 아니다. 일반 작업 중인 개발 컴퓨터에서 측정했고, 벤치마크끼리 또는 컴파일과 동시에 실행하지 않았다.

| 분리해서 측정한 구간                                         |      시간 |
| ------------------------------------------------------------ | --------: |
| WASM 모듈 컴파일                                             |     1.5ms |
| WASM 인스턴스 생성                                           |    0.21ms |
| SyntaxSet 최초 초기화                                        |     2.0ms |
| 전체 입력 복사와 JSON 파싱, 최초                             |     4.1ms |
| 전체 입력 복사와 JSON 파싱, 6회 중앙값                       |     2.3ms |
| 문법 정규식 캐시가 비어 있는 첫 전체 파싱                    | 2,993.5ms |
| 사전 로드한 전체 입력을 한 번의 WASM 호출로 파싱, 6회 중앙값 | 2,341.5ms |
| 사전 로드한 입력을 블록마다 WASM 호출하여 파싱, 1회          | 2,409.8ms |

첫 32개 블록으로 인스턴스 재사용도 별도로 비교했다. 이미 준비된 인스턴스로 파싱하면 17.8ms, 블록마다 새 인스턴스를 만들고 문법과 입력을 로드한 뒤 파싱하면 587.9ms였다. 초기화 반복은 큰 비용을 만들 수 있다. 다만 과거 실험이 인스턴스를 반복 생성했는지는 확인하지 못했다.

언어별 진단에서는 `javascript` 1,454개 블록에 WASM 1,468.1ms, Prism 87.1ms가 걸렸다. `js` 164개에는 각각 254.8ms와 12.9ms가 걸렸다. 전체 차이는 JSON 같은 특정 소수 언어에만 나타난 현상이 아니다. 언어별 수치는 각 언어를 따로 3회 측정한 중앙값이므로 전체 측정값과 정확히 합산되지는 않는다.

## 네 후보에서 확인한 것

1. **정규식 엔진과 문법 처리 비용:** 같은 syntect 코드와 입력에서 네이티브 정규식 엔진만 Oniguruma로 바꾸면 중앙값이 1,662.8ms에서 593.5ms로 줄었다. 이 실험에서는 fancy-regex 선택이 상당한 비용을 만든다. Oniguruma를 사용해도 Prism과는 문법과 처리 방식이 다르므로, 남은 차이를 특정 문법 규칙 하나의 탓으로 단정하지 않는다.
2. **초기화 재사용:** SyntaxSet과 WASM 인스턴스를 재사용하고 정규식 캐시를 준비해도 2,341.5ms가 걸렸다. 재구성 실험의 차이를 초기화 비용만으로 설명할 수 없다. 첫 실행과 이후 실행의 차이에는 정규식 지연 컴파일 외에 WASM 최적화나 메모리 상태도 영향을 줄 수 있으므로, 652ms 전체를 정규식 컴파일 시간으로 부르지 않는다.
3. **WASM 실행과 호출 경계:** 같은 fancy-regex 코드의 네이티브 중앙값은 1,662.8ms, WASM은 2,341.5ms였다. 실행 대상과 코드 생성 차이도 영향을 준다. 전체 입력을 한 번 호출한 경우와 2,587번 호출한 경우는 비슷해서, 이 입력에서 JS와 WASM 사이의 함수 호출이 큰 차이를 설명하지는 못한다. 실제 전체 파이프라인의 HAST 출력 변환 비용은 측정하지 않았다.
4. **측정 범위와 빌드 설정:** 양쪽에서 마크다운 파싱과 출력 변환을 제외했고, Rust는 최적화한 release 빌드로 실행했다. 따라서 새 실험의 차이가 JS만 추가 후처리를 하거나 Rust가 debug 빌드였기 때문에 생긴 것은 아니다. 원래 13.2초 비교의 조건까지 검증한 것은 아니다.

초기 fancy-regex 실험에서는 색상 변경을 허용해도 속도 개선 근거를 찾지 못했다. 이어서 Oniguruma를 WASI로 빌드한 결과는 다음과 같다.

## Oniguruma WASM 후속 실험

같은 입력 해시의 2,587개 블록으로 `wasm32-wasip1` 바이너리를 실행했다. wasi-sdk 27의 Clang과 libc로 C 라이브러리를 빌드하고 Node의 WASI preview1을 사용했다. 테마와 HAST, 출력 JSON은 포함하지 않으며, 첫 실행 후 6회 실행한 중앙값은 689.7ms, 최솟값은 687.6ms, 최댓값은 701.5ms였다. 블록 수와 체크섬 8,842,021이 초기 실험과 같았다. 실행별 기록과 바이너리 해시는 [wasm-onig.json](wasm-onig.json)에 남겼다.

이 측정은 초기 fancy-regex/Prism 비교와 다른 시점의 별도 프로세스에서 실행했다. 정규식 엔진 변경의 가능성을 확인하는 실험이며 전체 교체 성능은 아니다. TypeScript, TSX, JSX를 two-face 문법으로 처리하는 실제 WASM 렌더러의 전체 글 벤치는 [BENCHMARK.md](../../BENCHMARK.md)에 별도로 기록했다. 전체 구성에서는 기존 JS 체인과 비슷한 변환 시간이 나왔다.

기존 `target/corpus.json`과 `WASI_SDK_PATH`가 준비된 상태에서 재실행한다. 아래 명령 전의 입력 준비는 이 문서 끝의 `benchmark.mjs --prepare`로도 할 수 있지만, 글이 바뀌면 이전 기록과 입력 해시가 달라진다.

```sh
CC_wasm32_wasip1="$WASI_SDK_PATH/bin/clang" AR_wasm32_wasip1="$WASI_SDK_PATH/bin/llvm-ar" cargo +1.88.0 build --locked --release --target wasm32-wasip1 --no-default-features --features onig --lib
node wasm-onig.mjs
```

## 검증과 원시 기록

- `results.json`: Node와 WASM의 6회 결과, 언어별 결과, 초기화와 호출 경계 실험, 입력 해시와 소스 해시.
- `native-fancy.json`, `native-onig.json`: 네이티브 실행의 초기화, 첫 실행, 이후 6회 결과.
- Prism 토큰을 다시 문자열로 합쳤을 때 모든 입력과 일치하는지 측정 전에 확인했다.
- 세 syntect 실행의 블록 수 2,587개와 파싱 위치 체크섬 8,842,021이 일치했다. 이 체크섬은 모든 토큰이나 색상의 완전한 동등성 검증이 아니다.
- 입력 파일은 `target/corpus.json`에 생성한다. 전체 글 내용은 결과 파일에 중복 저장하지 않는다.

## 재실행

저장소 의존성을 설치한 상태에서 다음 명령을 순서대로 실행한다. 기존 블로그 WASM 파일은 교체하지 않는다.

```sh
cd packages/markdown-rs/experiments/syntect
cargo +1.88.0 build --locked --release
cp target/release/syntect-probe target/fancy-probe
cargo +1.88.0 build --locked --release --target wasm32-unknown-unknown --lib
cargo +1.88.0 build --locked --release --no-default-features --features onig
cp target/release/syntect-probe target/onig-probe
node benchmark.mjs
target/fancy-probe target/corpus.json > native-fancy.json
target/onig-probe target/corpus.json > native-onig.json
```

이 컴퓨터에서는 Xcode 명령 선택 경로가 실패해서 Rust 빌드 시 `SDKROOT`, `CC`, `AR`, `CARGO_TARGET_AARCH64_APPLE_DARWIN_LINKER`를 설치된 Xcode의 실제 SDK와 도구 경로로 지정했고, `MACOSX_DEPLOYMENT_TARGET=15.0`을 사용했다. 비교 대상의 소스 코드를 바꾸어 해결한 것은 아니다.
