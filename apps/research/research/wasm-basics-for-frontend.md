---
title: 'FE 개발자를 위한 Wasm 기초'
marp: true
paginate: true
theme: midnight
tags:
  - web-performance
date: 2026-10-06
description: 'JavaScript에서 Wasm 함수를 호출하는 것부터 메모리 전달, Web Worker, 성능 측정까지. FE 개발자가 WebAssembly를 붙이기 전에 알아야 할 기초와 블로그 적용 사례.'
published: false
---

# FE 개발자를 위한 Wasm 기초

함수 하나 불러보고, 그 경계를 이해하기

<!-- _class: invert -->

@yceffort

<!--
대상은 JavaScript와 비동기 코드에 익숙하고 Wasm은 처음인 FE 개발자다. 40분 안팎 분량이다.
WAT 예제는 문법을 외우려는 것이 아니고, JS와 Wasm이 무엇을 주고받는지 보려는 것이라고 먼저 말해 둔다.
-->

---

## 이미지 변환 버튼을 눌렀더니 화면이 멈춘다

브라우저에서 큰 이미지를 변환하는 기능을 만든다고 해보자.

- 파일을 읽고, 픽셀을 계산하고, 결과를 화면에 보여준다
- 변환하는 동안 클릭과 스크롤이 밀린다
- 마침 같은 일을 하는 C++ 라이브러리가 있다

**Wasm으로 가져오면 빨라질까? 화면도 안 멈출까?**

이 둘에 따로 답할 수 있으면 오늘 목표는 달성한 셈이다.

<!--
가상의 요구사항으로 시작한다. 발표 내내 이 기능을 기준으로 이야기한다.
두 질문은 서로 다르다. 앞은 계산이 얼마나 빠른지, 뒤는 메인 스레드를 누가 쓰는지의 문제다.
마지막에 이 두 질문으로 돌아온다. 첫 질문에는 이 블로그에서 실제로 잰 답이 있다.
-->

---

## 오늘은 이 순서로 따라가 본다

1. **실행 구조**: 브라우저는 `.wasm` 파일로 무엇을 하나
2. **함수 호출**: JS에서 부르고, JS 함수를 넘겨준다
3. **데이터 전달**: 숫자는 간단한데 문자열은 왜 까다로운가
4. **앱에 붙이기**: Worker, 로딩 비용, 실제 측정

준비물은 **JavaScript 지식**. Rust와 C++ 경험은 없어도 된다.

---

# Part 1. 브라우저에서 어디에 놓이는가

<!-- _class: invert -->

컴파일된 모듈을 JavaScript 옆에서 실행한다

---

## Wasm은 여러 언어가 도착하는 컴파일 타깃

```text
Rust / C / C++ 등의 소스
          ↓ 빌드 도구
       .wasm 바이너리
          ↓ 브라우저 엔진이 검증하고 컴파일
       실행 가능한 코드
```

- **WebAssembly(Wasm)**는 이 바이너리 형식과 실행 규칙을 정의한다
- 배포된 `.wasm`을 실행 환경이 자기 CPU에 맞게 처리한다
- JS로 다시 번역해서 실행하는 방식이 아니다

> 출처: [WebAssembly의 설계 목표](https://webassembly.org/docs/high-level-goals/)

---

## FE에서는 계산 모듈을 붙이는 것부터 시작한다

| 맡길 일                            | 일반적인 위치        |
| ---------------------------------- | -------------------- |
| 클릭 처리, 네트워크 요청, DOM 갱신 | JavaScript와 Web API |
| 이미지 코덱, 압축, 파싱 같은 계산  | Wasm으로 가져올 후보 |
| 서로 호출하고 데이터를 주고받기    | JS 바인딩 코드       |

Wasm 코어에는 `document.querySelector`나 `fetch`가 없다.
필요한 기능은 **호스트가 제공하는 함수**를 통해 연결한다.

> 출처: [WebAssembly의 이식성과 호스트 인터페이스](https://webassembly.org/docs/portability/)

<!--
호스트는 Wasm을 실행하고 바깥 기능을 제공하는 환경이다. 오늘은 브라우저의 JS 환경을 말한다.
Wasm을 쓰려면 앱 전체를 다시 짜야 하느냐는 질문이 자주 나온다. 계산 하나를 떼어 붙이는 것부터 시작한다고 답한다.
질문이 나오면 덧붙인다. Rust의 web-sys로 DOM을 만지는 코드도 결국 바인딩을 거쳐 브라우저 API를 부른다.
-->

---

## 브라우저 밖에서도 같은 원리로 실행한다

- 브라우저: JS가 Web API를 연결한다
- Node.js: JS가 서버 쪽 기능을 연결한다
- 다른 Wasm 런타임: 그 환경이 지원하는 기능을 연결한다

**바이너리가 같아도, 요구하는 import는 실행 환경에 있어야 한다.**

WASI는 파일 같은 시스템 기능을 연결하는 표준 인터페이스다.
WASI용 모듈을 브라우저에 가져왔다고 파일 API가 저절로 생기지는 않는다.

> 출처: [WebAssembly의 이식성](https://webassembly.org/docs/portability/), [WASI](https://wasi.dev/)

<!--
뒤에서 볼 이 블로그의 마크다운 렌더러가 WASI 모듈이다. 파일 읽기를 Node의 WASI가 연결해 주기 때문에 서버에서 돈다.
-->

---

# Part 2. 함수 하나 호출해 보기

<!-- _class: invert -->

다운로드 → 컴파일 → 인스턴스 → 호출

---

## 우선, 두 정수를 더하는 모듈

`add.wat` 파일은 Wasm을 사람이 읽을 수 있게 쓴 텍스트 형식이다.

```wat
(module
  (func (export "add")
    (param $a i32) (param $b i32) (result i32)
    local.get $a
    local.get $b
    i32.add))
```

인자 둘을 꺼내 더하고, 결과를 반환한다.
`export "add"`는 **밖에서 이 함수를 부를 이름**을 정한다.

<!--
i32는 32비트 정수다. local.get이 인자를 스택에 올리고, i32.add가 두 값을 꺼내 더한다.
실무에서 WAT를 직접 쓸 일은 거의 없다. 언어별 도구를 보기 전에 가장 작은 모듈로 경계부터 본다.
-->

---

## 텍스트를 `.wasm` 파일로 바꾼다

[WABT](https://github.com/WebAssembly/wabt)의 `wat2wasm`을 설치한 환경에서 실행한다.

```sh
wat2wasm add.wat -o add.wasm
python3 -m http.server 8080
```

- `add.wat`, `add.wasm`, 다음 장의 `index.html`을 같은 폴더에 둔다
- `http://localhost:8080`에서 연다
- `.wasm` 응답의 `Content-Type`은 **`application/wasm`**이어야 한다

> 출처: [wat2wasm 사용법](https://webassembly.github.io/wabt/doc/wat2wasm.1.html)

<!--
설치는 링크의 배포 안내를 따른다.
파일을 더블클릭해서 열면 fetch가 실패한다. 반드시 HTTP 서버로 연다.
Network 패널에서 add.wasm 응답의 Content-Type을 같이 확인한다. Python 3.14의 http.server는 application/wasm으로 보낸다. 다른 서버라면 MIME 설정을 확인한다.
-->

---

## JS에서 불러서 `42`를 출력한다

`index.html`

```html
<!doctype html>
<meta charset="utf-8" />
<script type="module">
  const {instance} = await WebAssembly.instantiateStreaming(fetch('./add.wasm'))
  document.body.textContent = instance.exports.add(20, 22)
</script>
```

파일을 받으면서 컴파일하고, 준비된 인스턴스의 함수를 호출한다.

> 출처: [instantiateStreaming](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/instantiateStreaming_static)

<!--
instantiateStreaming은 응답의 Content-Type이 application/wasm이 아니면 TypeError로 거부한다. 앞 장에서 MIME을 확인한 이유다.
-->

---

## 파일, 모듈, 인스턴스는 서로 다르다

| 이름                   | 담고 있는 것                             |
| ---------------------- | ---------------------------------------- |
| `.wasm` 파일           | 배포할 바이너리 바이트                   |
| `WebAssembly.Module`   | 컴파일된 코드. 다시 인스턴스화할 수 있다 |
| `WebAssembly.Instance` | 코드와 연결된 import, 실행에 필요한 상태 |
| `instance.exports`     | 모듈이 밖으로 공개한 함수, 메모리 등     |

**Module을 재사용하는 것과 Instance를 재사용하는 것은 다르다.**
같은 인스턴스를 쓰면 그 인스턴스의 메모리와 전역 상태도 이어진다.

<!--
Module은 컴파일 결과라서 여러 번 인스턴스로 만들 수 있다. Instance는 메모리와 전역 변수 같은 상태를 들고 있다.
뒤에서 에러를 다룰 때, 실제 코드가 이 차이 때문에 인스턴스를 버리는 장면이 나온다.
질문이 나오면 덧붙인다. 모듈이 메모리를 직접 정의하면 인스턴스마다 새로 생기고, 같은 Memory를 import로 넣으면 인스턴스끼리 공유할 수도 있다.
-->

---

## 반대로 Wasm이 JS 함수를 부를 수도 있다

`notify.wat`은 `host.log`를 외부에서 받겠다고 선언한다.

```wat
(module
  (import "host" "log" (func $log (param i32)))
  (func (export "run")
    i32.const 42
    call $log))
```

```sh
wat2wasm notify.wat -o notify.wasm
```

**import는 필요한 것, export는 제공하는 것.** 방향은 모듈 기준이다.

---

## import에 실제 JS 함수를 연결한다

앞의 `index.html`에서 `<script type="module">` 안을 바꿔본다.

```js
const imports = {
  host: {log: (value) => console.log('Wasm에서 받은 값:', value)},
}

const {instance} = await WebAssembly.instantiateStreaming(
  fetch('./notify.wasm'),
  imports,
)
instance.exports.run() // Wasm에서 받은 값: 42
```

이런 연결을 통해 로그를 남기거나 브라우저 기능을 사용할 수 있다.

> 출처: [WebAssembly JavaScript API](https://www.w3.org/TR/wasm-js-api-2/)

---

# Part 3. 진짜 일은 데이터를 넘길 때 시작된다

<!-- _class: invert -->

문자열과 이미지가 함수의 경계를 건너는 방법

---

## 숫자 하나는 간단하다

| Wasm의 숫자 타입 | JS에서 주고받는 값 | 참고                          |
| ---------------- | ------------------ | ----------------------------- |
| `i32`            | `Number`           | 넘길 때 32비트 정수로 바뀐다  |
| `f32`, `f64`     | `Number`           | `f32`는 정밀도가 줄어든다     |
| `i64`            | `BigInt`           | 64비트 정수라 `BigInt`를 쓴다 |

하지만 JS 문자열이나 객체의 내부 구조가
**C++의 문자열, Rust의 구조체와 같지는 않다.**

여기서는 C, C++, Rust 라이브러리에서 흔한 **선형 메모리 전달**을 본다.

<!--
숫자는 그대로 넘어가지만 문자열과 객체는 그렇지 않다는 것이 이 파트의 출발점이다.
질문이 나오면 덧붙인다. Wasm에도 참조 타입(externref)과 GC 기능이 있다. 다만 externref로 JS 객체를 넘겨도 Wasm 코드가 그 내부를 구조체처럼 읽을 수는 없다. 오늘은 C, C++, Rust 라이브러리가 주로 쓰는 선형 메모리 방식만 다룬다.
-->

---

## 선형 메모리는 바이트를 담는 연속된 공간

```js
const memory = new WebAssembly.Memory({initial: 1})
const bytes = new Uint8Array(memory.buffer)

bytes[0] = 65
console.log(bytes[0]) // 65
console.log(memory.buffer.byteLength) // 65536
```

- 일반적인 Wasm 메모리는 **64 KiB 페이지** 단위로 늘어난다
- JS는 `ArrayBuffer` 위에 뷰를 만들어 바이트를 읽고 쓴다
- 모듈은 메모리를 import하거나, 직접 만든 메모리를 export할 수 있다

<!--
앞의 add 모듈과는 상관없는 독립 예제다. Memory 객체만 만들어 JS에서 바이트를 읽고 쓴다.
Uint8Array를 만든다고 바이트가 복사되지는 않는다. 같은 바이트를 보는 창을 하나 더 여는 것이다. 복사는 set으로 다른 버퍼의 내용을 써 넣을 때 일어난다.
-->

---

## 문자열은 인코딩한 바이트와 위치로 넘긴다

아래는 **새로 만든 연습용 메모리**에 문자열을 쓰는 예제다.

```js
const memory = new WebAssembly.Memory({initial: 1})
const input = new TextEncoder().encode('안녕')
const ptr = 0
new Uint8Array(memory.buffer, ptr, input.length).set(input)

console.log('안녕'.length) // 2
console.log(input.length) // 6 (UTF-8 바이트 수)
```

**포인터는 메모리 안의 위치, 길이는 읽을 바이트 수.**
실제 라이브러리는 할당받은 위치에 쓰고 `(ptr, length)`를 넘긴다. 다음 장에서 실물을 본다.

<!--
ptr을 0으로 둔 것은 아무도 쓰지 않는 새 메모리라서 가능하다. 실제 모듈의 0번지에 마음대로 쓰면 정적 데이터나 다른 할당을 덮어쓸 수 있다.
-->

---

## 호출 규약에는 해제 책임도 포함된다

이 블로그의 마크다운 렌더러가 Wasm에 입력을 넘기는 코드다.

```js
const input = encoder.encode(JSON.stringify({body, path}))
const inputPtr = exports.alloc(input.length)
new Uint8Array(exports.memory.buffer, inputPtr, input.length).set(input)
let outputPtr
try {
  outputPtr = exports.render_json_ptr(inputPtr, input.length)
} catch (error) {
  // ... (에러를 다룰 때 다시 본다)
}
exports.dealloc(inputPtr, input.length)
```

`alloc`으로 자리를 받아 복사하고, 다 쓴 입력은 `dealloc`으로 돌려준다.
이런 약속을 **ABI(Application Binary Interface)**라고 한다. 이름과 규칙은 **라이브러리마다 다르다.**

> 출처: [packages/markdown-rs/index.js](https://github.com/yceffort/blog/blob/33f9d4ba7fd38800dac41a68ca9d1693603447d6/packages/markdown-rs/index.js#L49-L76)

<!--
앞 장의 (ptr, length) 전달을 실제 코드로 본다. 이 렌더러는 wasm-bindgen 없이 이 ABI를 직접 정의했다.
입력은 JSON 문자열을 UTF-8로 인코딩해서 한 번에 넘긴다. 글 한 편에 호출 한 번이다.
Wasm 표준이 alloc이나 free 같은 함수를 정해 주지는 않는다. 입력을 넘겨주는지 빌려주는지, 결과는 언제까지 유효한지, 실패하면 누가 정리하는지까지가 라이브러리와의 약속이다.
JS의 GC는 Wasm 메모리 안의 개별 할당을 대신 해제해 주지 않는다.
-->

---

## 메모리가 커지면 기존 뷰를 다시 확인한다

```js
const memory = new WebAssembly.Memory({initial: 1})
const before = new Uint8Array(memory.buffer)

memory.grow(1)

console.log(before.byteLength) // 0 (이전 버퍼는 분리됨)
const after = new Uint8Array(memory.buffer)
console.log(after.byteLength) // 131072
```

이 예제처럼 **공유하지 않는 기본 메모리**에서는 이전 뷰가 무효가 된다.
Wasm 함수 안에서 할당했어도 커질 수 있으니, 호출 뒤 뷰를 다시 얻는다.

> 출처: [Memory.grow의 버퍼 동작](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/Memory/grow)

<!--
메모리가 커지면 JS 쪽 ArrayBuffer가 새것으로 바뀌고, 예전 뷰는 길이 0인 빈 껍데기가 된다.
JS에서 grow를 부르지 않아도, Wasm 함수 안에서 할당하다가 메모리가 늘 수 있다. 다음 장의 실제 코드가 그래서 호출 뒤에 buffer를 다시 읽는다.
-->

---

## 결과를 읽기 전에 버퍼를 다시 얻는다

앞의 렌더러가 호출을 마친 뒤 결과를 꺼내는 부분이다.

```js
// 호출 중 메모리가 늘어났을 수 있으므로 buffer 를 다시 읽는다.
const memory = new Uint8Array(exports.memory.buffer)
const length = new DataView(exports.memory.buffer).getUint32(outputPtr, true)
const json = decoder.decode(
  memory.subarray(outputPtr + 4, outputPtr + 4 + length),
)
exports.free_result(outputPtr)
```

- 결과는 앞 4바이트에 길이를, 그 뒤에 JSON 바이트를 담는다
- 입력은 `dealloc(ptr, length)`, 결과는 `free_result(ptr)`로 돌려준다

> 출처: [packages/markdown-rs/index.js](https://github.com/yceffort/blog/blob/33f9d4ba7fd38800dac41a68ca9d1693603447d6/packages/markdown-rs/index.js#L49-L76)

<!--
앞 장의 문제를 실제 코드가 어떻게 피하는지 보여 준다. 호출 전에 만든 뷰를 재사용하지 않고, 호출이 끝난 뒤 memory.buffer를 다시 읽는다.
길이를 앞 4바이트에 리틀 엔디언으로 적는 것도 이 라이브러리가 정한 형식이다. 결과를 반납할 때는 위치만 넘긴다.
같은 라이브러리 안에서도 입력과 결과를 돌려주는 함수가 다르다. 호출 규약을 문서로 읽어야 하는 이유다.
-->

---

## 바인딩 도구가 이 변환을 대신 만들어준다

Rust의 `wasm-bindgen`을 사용한 라이브러리 코드:

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("안녕하세요, {}님", name)
}
```

JS에서 문자열로 호출할 수 있도록 **JS 래퍼와 Wasm을 함께 생성**한다.
앞에서 손으로 쓴 인코딩, 할당, 해제를 래퍼가 맡는다.

> 출처: [wasm-bindgen 가이드](https://wasm-bindgen.github.io/wasm-bindgen/)

<!--
앞의 렌더러는 이 도구 없이 ABI를 직접 정의했다. wasm-bindgen을 쓰면 그 부분을 도구가 생성한다.
wasm-pack의 web 타깃으로 빌드한 패키지는 보통 init을 import해서 await init()을 먼저 부른 뒤 함수를 호출한다. 실행 예제는 마지막 장의 링크에 있다.
래퍼가 생겨도 인코딩과 복사 비용은 그대로 있다. 코드에서 안 보일 뿐이다.
-->

---

## 한 픽셀씩 넘길지, 이미지 한 장을 넘길지

이미지 처리 API를 설계한다고 해보자.

```js
// 호출 경계를 픽셀 수만큼 넘는다
for (const pixel of pixels) wasm.transformPixel(pixel)

// 버퍼를 한 번 전달하고 내부에서 반복한다
wasm.transformImage(pixelBuffer, width, height)
```

위 코드는 **가상의 래퍼 API**다. 앞의 렌더러도 글 한 편을 한 번에 넘긴다.
호출 횟수와 데이터 변환, 복사를 함께 줄일 수 있는 경계를 찾는다.

<!--
항상 묶어서 넘기라는 말로 들리지 않게 한다. 버퍼 크기와 복사 방식, 실제 작업량에 따라 달라지므로 결국 재 봐야 한다.
픽셀마다 JS 객체를 넘기는 인터페이스라면 바인딩의 변환 비용도 픽셀 수만큼 반복된다.
-->

---

# Part 4. 앱에 붙였을 때 생기는 일

<!-- _class: invert -->

실행 속도, 화면 반응, 첫 로딩을 따로 본다

---

## 퀴즈: `await`를 붙이면 화면이 안 멈출까?

동기식 이미지 변환 함수를 export한 모듈이 있다고 하자.

```js
const {instance} = await WebAssembly.instantiateStreaming(fetch('./codec.wasm'))

await instance.exports.encode(ptr, length)
```

`encode`에 300ms가 걸린다고 가정하면,
그동안 메인 스레드는 다른 클릭을 처리할 수 있을까?

<!--
codec.wasm과 encode는 설명용 가상 인터페이스이고, 300ms도 가정한 값이다.
답을 보여 주기 전에 손을 들게 한다. await가 붙어 있으니 비동기라고 생각하기 쉽다는 점을 짚는다.
-->

---

## 답: 계산은 호출한 스레드를 점유한다

- `instantiateStreaming`으로 **준비하는 과정**은 비동기다
- 일반적인 Wasm export의 **함수 호출**은 동기다
- `await`는 `encode(...)`가 반환한 뒤 그 반환값을 받는다

메인 스레드에서 호출하면 **Wasm 계산도 메인 스레드에서 돈다.**

UI와 계산을 분리하려면 Worker 안에서 호출한다.
JS 계산을 Worker로 옮기는 것만으로도 UI 반응은 개선될 수 있다.

<!--
Promise.resolve().then(() => encode(...))처럼 감싸도 같은 스레드에서 조금 나중에 돌 뿐이다.
질문이 나오면 덧붙인다. JS Promise Integration(JSPI)처럼 Wasm과 Promise를 잇는 기능은 따로 있다. 오늘은 일반적인 동기 export만 다룬다.
-->

---

## Worker 안에 인스턴스를 둔다

`worker.js`를 만들고, 앞에서 만든 `add.wasm`을 같은 폴더에 둔다.

```js
const ready = WebAssembly.instantiateStreaming(fetch('./add.wasm'))
ready.catch(() => {}) // 초기화 실패는 요청 처리에서 전달한다

self.onmessage = async ({data: {a, b}}) => {
  try {
    const {instance} = await ready
    self.postMessage({result: instance.exports.add(a, b)})
  } catch (error) {
    self.postMessage({error: String(error)})
  }
}
```

초기화 Promise를 공유하고, 준비가 끝나면 같은 인스턴스를 사용한다.

<!--
덧셈에 Worker가 필요한 것은 아니다. 이미 동작을 확인한 함수를 그대로 옮겨서 구조만 본다.
ready.catch 한 줄은 요청이 오기 전에 초기화가 실패해도 처리되지 않은 거부(unhandled rejection)로 남지 않게 한다. 실패는 요청을 처리할 때 에러 메시지로 돌려준다.
한 번 실패한 ready는 다음 요청도 실패시킨다. 재시도가 필요하면 Worker를 새로 만드는 식의 정책을 따로 정한다.
-->

---

## 메인 스레드는 메시지로 결과를 받는다

`index.html`의 모듈 스크립트 안을 바꿔본다.

```js
const worker = new Worker('./worker.js', {type: 'module'})

worker.onmessage = ({data}) => {
  document.body.textContent = data.error ?? String(data.result)
  worker.terminate() // 이 예제는 한 번만 계산한다
}
worker.onerror = () => {
  document.body.textContent = 'Worker를 실행하지 못했습니다'
  worker.terminate()
}
worker.postMessage({a: 20, b: 22})
```

반복 작업이라면 Worker를 재사용하고, 요청 ID로 응답을 구분한다.

> 출처: [Web Worker 사용법](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)

---

## Worker로 옮겨도 데이터 전달은 남는다

- `postMessage`의 일반적인 객체 전달은 **구조화 복제**를 거친다
- 일반 `ArrayBuffer`는 transfer 목록으로 **소유권을 넘길 수 있다**
- 그 버퍼를 Wasm의 선형 메모리에 넣는 데는 **별도 복사**가 필요할 수 있다

**메인 스레드 ↔ Worker**와 **JS ↔ Wasm**은 다른 경계다.

보통의 Worker 사용만으로 `SharedArrayBuffer`가 필요한 것은 아니다.
공유 메모리와 Wasm 스레드를 쓸 때는 별도의 격리 요건을 확인한다.

<!--
Worker로 옮기면 메시지를 주고받는 비용이 새로 생긴다는 점을 강조한다.
transfer로 넘긴 ArrayBuffer는 보낸 쪽에서 분리되어 더는 쓸 수 없다.
Wasm Memory의 buffer는 transfer 목록에 넣으면 DataCloneError가 난다(Node 24.20.0에서 확인). 받은 버퍼를 Wasm 메모리에 넣으려면 보통 한 번 복사한다.
SharedArrayBuffer로 공유하려면 cross-origin isolation이 필요하다. 일반 Worker에는 필요 없다.
-->

---

## 체감 시간에는 함수 밖의 비용도 들어간다

```text
첫 실행: 다운로드 + 준비 + 데이터 전달 + 계산 + 결과 표시
재실행:                   데이터 전달 + 계산 + 결과 표시
```

- 스트리밍 때문에 다운로드와 컴파일 일부는 **겹칠 수 있다**
- 함수가 빨라도 큰 `.wasm`을 처음 받는 비용은 남는다
- 입력을 복사하고, 결과를 디코딩하는 비용도 포함한다

**계산 시간, 첫 결과까지의 시간, UI 반응성을 각각 측정한다.**

<!--
위 식은 빠뜨리기 쉬운 비용을 나열한 개념도다. 실제로는 구간이 겹치므로 더해서 실측값처럼 읽지 않는다.
뒤에서 볼 이 블로그 측정에서도 함수 호출 시간만으로는 차이가 안 보였다. 코드 글의 renderPost 호출은 파싱만 옮긴 구성과 전체를 옮긴 구성이 39.7ms와 41.0ms로 비슷했는데, 브라우저가 본문을 받은 시간은 약 202ms 차이가 났다.
모바일 CPU, 네트워크, 캐시 상태에 따라 첫 실행의 비중이 달라진다.
-->

---

## `add(1, 2)` 벤치로 도입을 결정할 수는 없다

| 확인할 것         | 실제로 비교할 조건                       |
| ----------------- | ---------------------------------------- |
| 같은 일을 했나    | 같은 입력, 출력, 정밀도와 오류 처리      |
| 처음에도 괜찮나   | 다운로드와 초기화를 포함한 첫 실행       |
| 반복하면 어떤가   | 인스턴스를 재사용한 실행, 여러 번의 분포 |
| 사용자에게 좋은가 | 대표 기기에서 결과 도착과 화면 반응      |

가능하면 **JS / JS + Worker / Wasm + Worker**를 비교한다.
실행 위치를 바꾼 이득과 계산 구현을 바꾼 이득을 구분할 수 있다.

<!--
계산 구현을 바꾼 효과를 따로 봐야 하는 이유는 바로 뒤의 하이라이터 사례에서 드러난다.
-->

---

## 실제 사례: 이 블로그의 마크다운 파이프라인

앞에서 본 바인딩이 이 저장소의 `packages/markdown-rs`다. Rust로 만든 Wasm을 쓴다.

```text
Node.js: 마크다운 → JSON 문자열 → UTF-8 바이트 → Wasm 메모리
Wasm:    파싱 → HAST 생성 → 코드 하이라이트, 수식, 이미지 처리
Node.js: 결과 디코딩과 JSON 파싱 → React 요소로 변환
```

- Wasm은 **Next.js 서버에서 실행**한다. 브라우저로 내려보내지 않는다
- WASI 모듈이라, 이미지 크기를 읽는 `public` 디렉터리는 Node의 WASI가 연결한다
- 인스턴스는 재사용하고, 계산은 동기식으로 호출한다

> 출처: [블로그의 마크다운 파이프라인을 Rust/WASM으로 옮기기](https://yceffort.kr/2026/09/markdown-pipeline-to-rust-wasm)

<!--
프론트엔드 저장소에 Wasm이 있어도 브라우저에서 돈다고 단정할 수 없다는 예다. 이 렌더러는 서버에서만 돈다.
Part 1의 WASI 설명과 이어진다. 파일 접근을 Node의 WASI가 채워 주므로, 이 모듈을 브라우저에서 돌리려면 그 import를 대신 채울 무언가가 필요하다.
-->

---

## 가져온 Rust 하이라이터는 JS보다 느렸다

코드 블록 2,587개를 미리 넘겨 두고, 토큰을 나누는 계산만 잰 중앙값이다.

| 구현                  | 실행     |      시간 |
| --------------------- | -------- | --------: |
| syntect + fancy-regex | Wasm     | 2,341.5ms |
| syntect + fancy-regex | 네이티브 | 1,662.8ms |
| syntect + Oniguruma   | Wasm     |   689.7ms |
| syntect + Oniguruma   | 네이티브 |   593.5ms |
| Prism (JS)            | Node     |   125.3ms |

네이티브로 빌드해도 Prism보다 느렸다.
**느린 이유를 Wasm이라는 실행 형식 하나로 설명할 수 없었다.**

> 조건: Apple M1, 각 6회. 전체 코드 블록 4,629개 중 두 구현이 모두 지원하는 블록만. 2,341.5ms와 Prism은 Node 26.0.0, 689.7ms는 Node 24.20.0. [측정 원문](https://yceffort.kr/2026/09/markdown-pipeline-to-rust-wasm)

<!--
처음 질문인 "가져오면 빨라질까"에 대한 실제 답이다. C나 Rust 라이브러리를 가져왔다고 JS보다 빠르다는 보장은 없다.
네이티브 행이 핵심이다. Wasm을 빼고 같은 코드를 기계어로 돌려도 Prism보다 느렸다. 그래서 정규식 엔진을 C 라이브러리인 Oniguruma로 바꿨고 3.4배 빨라졌지만, 여전히 Prism의 5.5배다.
조건도 말로 짚는다. TypeScript, TSX, JSX처럼 syntect 기본 문법에 없는 블록은 빠졌고, 두 Wasm 측정은 Node 버전이 달라서 엔진 교체 효과와 완전히 분리하지 못했다.
이 비용을 안고도 전체를 옮긴 결과는 다음 장에서 본다.
-->

---

## 같은 교체도 어디를 재느냐에 따라 답이 달랐다

| 측정 범위                |        JS |    Wasm | 결과          |
| ------------------------ | --------: | ------: | ------------- |
| 하이라이트 계산만        |   125.3ms | 689.7ms | 5.5배 느림    |
| 처음 여는 글의 본문 도착 | 1,163.8ms | 917.2ms | 약 247ms 빠름 |
| 전체 빌드                |   20.88초 | 20.33초 | 범위가 겹친다 |

본문 도착은 서버가 그 자리에서 렌더링하는 코드 글을 처음 열어 잰 값이다.
렌더러 구성 전체의 비교라서 JS 쪽에는 당시의 MDX 컴파일도 들어 있다.

> 조건: Apple M1 로컬, 각 6회 중앙값. 본문 도착과 빌드는 Node 24.20.0. [측정 원문](https://yceffort.kr/2026/09/markdown-pipeline-to-rust-wasm)

<!--
앞 장에서 하이라이트가 느렸는데 왜 글은 빨리 열렸는지가 자연스러운 질문이다. 본문 도착은 파서 하나의 비교가 아니고 페이지를 만드는 렌더러 구성 전체의 비교다. JS 쪽에는 당시 쓰던 MDX 컴파일과 실행이 들어 있었다.
이 본문 도착은 서버 렌더링 시간이다. 브라우저가 .wasm을 받는 비용과는 관계가 없다.
수식 글도 본문 도착이 1,247.6ms에서 896.0ms로 약 352ms 줄었다. 수식은 KaTeX를 MathML로 바꾼 차이도 함께 들어 있다.
전체 빌드는 중앙값이 0.55초 줄었지만 6회의 범위가 겹친다. 빨라졌다고 말하지 않는다.
글 두 편을 로컬에서 잰 값이므로 실서비스 개선율로 옮겨 말하지 않는다.
-->

---

## 배포할 때는 JS와 Wasm을 같이 본다

- **파일 경로**: 배포된 `.wasm` 요청이 실제 바이너리를 반환하는가
- **응답 헤더**: streaming 로더에 맞는 `application/wasm`인가
- **정책**: 다른 origin이면 CORS, CSP가 있으면 Wasm 컴파일 허용 확인
- **버전**: JS 래퍼와 Wasm이 같은 빌드의 산출물인가
- **시점**: 필요한 기능을 열 때 로드하고, 준비와 실패 상태를 표시하는가

경로가 틀렸는데 SPA의 `index.html`이 200으로 내려오는 경우도 확인한다.

<!--
CSP가 script-src를 제한한다면 'wasm-unsafe-eval'이 필요한지 확인한다. 정책 전체를 느슨하게 풀지 않는다.
일반 Worker에는 COOP/COEP가 필요 없다. SharedArrayBuffer를 쓸 때만 따진다.
SPA 서버가 없는 경로에 index.html을 200으로 돌려주면 브라우저는 MIME 오류를 낸다. 404가 아니라서 원인을 찾기 어렵다.
-->

---

## 에러가 나면 어느 단계인지부터 찾는다

| 단서                             | 먼저 확인할 것                                   |
| -------------------------------- | ------------------------------------------------ |
| HTTP 실패, MIME 관련 `TypeError` | URL, 응답 본문과 헤더                            |
| `CompileError`                   | 유효한 Wasm인지, 엔진이 필요한 기능을 지원하는지 |
| `LinkError`                      | 요구한 import와 제공한 값의 타입이 맞는지        |
| `RuntimeError`                   | 실행 중 trap: 메모리 범위 초과 등                |

JS 바인딩이 던진 예외나 라이브러리의 실패 반환값은 또 다른 경로다.
**네트워크 응답 → 초기화 → 호출** 순서로 범위를 좁힌다.

<!--
범위를 좁히는 순서를 기억하게 한다. 네트워크 응답, 초기화, 호출 순서다.
질문이 나오면 덧붙인다. import 객체의 모양 자체가 틀리면 TypeError도 난다. 0으로 정수 나누기나 unreachable 실행도 trap이라 RuntimeError가 된다. import로 넘긴 JS 함수가 던진 예외는 원래 JS 예외로 올라올 수 있다.
-->

---

## trap이 난 인스턴스는 다시 쓰지 않는다

앞의 렌더러가 호출 실패를 처리하는 부분이다.

```js
try {
  outputPtr = exports.render_json_ptr(inputPtr, input.length)
} catch (error) {
  // trap 이후의 인스턴스 상태는 믿지 않는다. 입력 버퍼도 해제하지 않고 인스턴스째 버린다.
  // (trap 난 인스턴스에 dealloc 을 부르면 그 trap 이 원래 오류를 덮는다.)
  instance = undefined
  throw error
}
```

trap은 그때까지 바꾼 메모리를 되돌리지 않는다.
다음 호출의 `getInstance()`가 인스턴스를 새로 만든다.

> 출처: [packages/markdown-rs/index.js](https://github.com/yceffort/blog/blob/33f9d4ba7fd38800dac41a68ca9d1693603447d6/packages/markdown-rs/index.js#L49-L76)

<!--
Part 2의 "Instance는 상태를 들고 있다"와 이어진다. 계산 도중에 멈춘 인스턴스는 할당기나 내부 상태가 중간 모양으로 남아 있을 수 있다.
그래서 이 바인딩은 입력 버퍼를 해제하지 않고 인스턴스를 통째로 버린다. 주석대로, trap이 난 인스턴스에 dealloc을 부르면 그 호출이 다시 실패해서 원래 오류를 가린다.
-->

---

## Wasm을 검토할 만한 조건

- 프로파일러에서 **계산 자체가 병목**으로 확인됐다
- 가져오고 싶은 C, C++, Rust 라이브러리가 있다
- 입력을 모아 처리할 수 있고, JS와 왕복하는 횟수가 적다
- 로딩, 메모리, 빌드 도구의 비용을 감수할 이유가 있다

네트워크 대기, DOM 배치, 불필요한 렌더가 병목이라면
그 원인을 줄이는 작업이 먼저다.

---

## 처음의 이미지 변환 기능으로 돌아가면

**Wasm으로 가져오면 빨라질까?**

가져온 구현이 JS보다 빠르다는 보장은 없다. 이 블로그의 하이라이터는 네이티브로 돌려도 느렸다.
실제 이미지로 계산, 전달, 첫 로딩을 따로 재고, 기존 코덱을 재사용하는 이점과 함께 판단한다.

**화면도 안 멈출까?**

Wasm 호출도 메인 스레드를 쓴다. 긴 계산은 Worker로 옮기고,
결과 전달과 화면 갱신까지 확인한다.

---

## 확인 퀴즈

1. Wasm은 브라우저에서 JS로 변환되어 실행된다. **O / X**
2. `await wasm.encode()`는 계산을 Worker로 옮긴다. **O / X**
3. UTF-8로 넘길 때 `'안녕'.length`를 바이트 길이로 써도 된다. **O / X**
4. 같은 Instance를 재사용하면 내부 상태가 다음 호출에 남을 수 있다. **O / X**
5. 반복 실행이 빨라졌다면 첫 실행도 반드시 빨라진다. **O / X**

<!--
맞혔는지보다 왜 그렇게 생각했는지를 한 문장으로 말하게 한다.
-->

---

## 정답: X / X / X / O / X

1. 엔진이 Wasm 바이너리를 검증하고 컴파일해서 실행한다
2. 일반적인 export 호출은 동기다. 실행 위치는 직접 옮겨야 한다
3. JS 문자열 길이는 2지만, 이 문자열의 UTF-8 바이트 수는 6이다
4. 인스턴스에 연결된 메모리와 전역 상태는 재사용될 수 있다
5. 브라우저가 `.wasm`을 받는다면 첫 실행에는 다운로드, 컴파일, 초기화 비용이 더해진다

---

## 직접 확인할 자료

- [WebAssembly 설계 목표](https://webassembly.org/docs/high-level-goals/), [JavaScript API 명세](https://www.w3.org/TR/wasm-js-api-2/)
- [WABT: WAT를 Wasm으로 변환](https://github.com/WebAssembly/wabt)
- [MDN: instantiateStreaming](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/instantiateStreaming_static), [Memory.grow](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/Memory/grow)
- [wasm-bindgen: 브라우저에서 불러오기](https://wasm-bindgen.github.io/wasm-bindgen/examples/without-a-bundler.html)
- [MDN: Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [이 블로그의 Rust/Wasm 이식 기록](https://yceffort.kr/2026/09/markdown-pipeline-to-rust-wasm), [바인딩 코드](https://github.com/yceffort/blog/blob/33f9d4ba7fd38800dac41a68ca9d1693603447d6/packages/markdown-rs/index.js)

---

# Wasm은 계산을 맡길 수 있는 선택지

<!-- _class: invert -->

함수 하나를 호출하고,
데이터가 경계를 건너는 비용을 이해하고,
**사용자가 기다리는 시간을 측정하자.**

@yceffort
