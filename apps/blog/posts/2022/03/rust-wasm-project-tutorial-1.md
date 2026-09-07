---
title: 'Rust로 web assembly로 game of life 만들어보기 (1)'
tags:
  - rust
  - webassembly
published: true
date: 2022-03-18 23:56:56
description: '코로나 휴가를 틈탄 러스트 뻘짓'
---

## Table of Contents

## Introduction

이 튜토리얼은 [https://rustwasm.github.io/docs/book/game-of-life/introduction.html](https://rustwasm.github.io/docs/book/game-of-life/introduction.html) 에서 제공하는 Rust WebAssembly로 만드는 Game of Life 을 기반으로 작성되었습니다. 직접 튜토리얼을 따라하면서 단순히 번역 이외에도 최신 라이브러리 버전 기준으로 재작성하였으며, 설명이 부족하거나 생략된 부분에 대해서도 별도로 주석을 달았습니다.

기본적으로 러스트에 대한 완벽한 이해를 기반으로 하지 않고 작성되었기 때문에, 일부 러스트 문법에 대한 설명이 적혀있을 수도 있습니다.

## Game of Life?

[라이프 게임, 또는 생명 게임](https://ko.wikipedia.org/wiki/%EB%9D%BC%EC%9D%B4%ED%94%84_%EA%B2%8C%EC%9E%84)은 처음에 입력된 초기값을 기준으로 알아서 시작되는 게임이다.

이 게임은 무한한 개수의 사각형 (이하 세포)로 이루어진 격자위에서 실행된다. 각 세포 주위에는 8개의 이웃 세포가 있으며, 각 세포는 살아있거나 죽어있는 상태를 가진다. 그리고 이 세포의 다음 상태는 다음과 같이 결정된다.

- 죽은 세포 이웃 중 딱 세개 가 살아 있으면 살아난다.
- 살아 있는 세포 중 이웃이 두 개나 세개가 살아있으면 그 세포는 살아있고, 그외에는 죽는다.

## 1. Setup

시작에 앞서 설치해야 하는 기본 언어와 라이브러리는 다음과 같다.

- `rust`
- `rustup`
- `cargo`
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)
- [cargo-generate](https://github.com/ashleygwilliams/cargo-generate): 이 라이브러리는 이미 존재하는 깃 저장소를 기본 템플릿으로 사용하여 빠르게 러스트 프로젝트를 만드는데 도움을 준다.
- `npm`

## 2. Hello, World

### 프로젝트 클론

`wasm-pack` 을 기반으로 한 프로젝트를 빠르게 만들기 위해, 기본적으로 제공하는 프로젝트 템플릿이 존재하는데, 이를 기본으로 프로젝트를 만든다.

```shell
cargo generate --git https://github.com/rustwasm/wasm-pack-template
```

그리고 게임 이름을 입력한다. `wasm-game-of-life`

### 내부 살펴보기

```text
.
├── Cargo.toml
├── LICENSE_APACHE
├── LICENSE_MIT
├── README.md
├── src
│   ├── lib.rs
│   └── utils.rs
└── tests
    └── web.rs
```

### `Cargo.toml`

`Cargo.toml`은 이 패키지에서 필요로하는 의존성과, cargo metadata를 포함하고 있다.

### `src/lib.rs`

```rust
mod utils;

use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn greet() {
    alert("Hello, wasm-game-of-life!");
}
```

우리가 이제 만들려고 하는 webassembly의 루트 파일이다. `wasm-bindgen`을 사용하여 자바스크립트 인터페이스와 연결하는 것을 볼 수 있다. 이전에 예제에서 살펴본 것처럼, 이 경우에는 `window.alert`를 구현한 것으로 볼 수 있다.

#### `src/utils.rs`

```rust
pub fn set_panic_hook() {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function at least once during initialization, and then
    // we will get better error messages if our code ever panics.
    //
    // For more details see
    // https://github.com/rustwasm/console_error_panic_hook#readme
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}
```

작업을 좀더 용이하게 하기 위한 공통 유틸리티를 관리하는 파일이다. wasm 코드 디버깅 등 다양한 일을 할 수 있는데, 일단 이단계에서는 무시한다.

### 빌드

`wasm-pack`을 사용하여 빌드할 경우, 다음의 단계를 거친다.

- rust 1.30 이상이 설치되어 있는지, 그리고 wasm32-unknown-unknown 타깃이 rustup을 통해 설치되어 있는지 확인
- rust 소스를 webassembly .wasm 바이너리로 컴파일
- `wasm-bindgen`을 사용하여 rust webassembly에서 사용할 수 있는 자바스크립트 api를 생성

`wasm-pack build`

빌드가 끝나면, `pkg` 디렉토리 아래에 다음과 같은 내용을 확인할 수 있을 것이다.

```text
./pkg/
├── package.json
├── README.md
├── wasm_game_of_life_bg.js
├── wasm_game_of_life_bg.wasm
├── wasm_game_of_life_bg.wasm.d.ts
├── wasm_game_of_life.d.ts
└── wasm_game_of_life.js
```

#### `pkg/wasm_game_of_life_bg.wasm`

`.wasm` 파일은 러스트 컴파일러가 러스트 소스에서 생성한 WebAssembly 바이러니다. 여기에는 우리가 만든 러스트 함수와 데이터가 wasm 버전으로 컴파일 되어있다. 이 경우에는, `greet()`함수가 있을 것이다.

#### `pkg/wasm_game_of_life.js`

`.js`는 `wasm-bindgen`에 의해 생성되며, DOM 및 자바스크립트 함수를 rust로 import하고, WebAssembly 함수에 대한 api를 자바스크립트에 노출하기 위한 연결 고리를 제공한다. 방금 예제에서는, webassembly에서 보낸 `greet` 함수를 감싸는 javascript `greet` 함수가 존재한다. wasm과 javascript 간에 값을 주고받기 시작하면 이러한 경계를 넘어서는데 도움이 될 것이다.

#### `pkg/wasm_game_of_life.d.ts`

다들 아는 것처럼 `d.ts`는 타입스크립트 코드의 타입 추론을 돕는 파일이다. 만약 타입스크립트를 사용한다면, webassembly 함수를 Import 할 때 도움이 될 것이다. 타입스크립트를 사용하지 않는다면 무시해도 된다.

#### `pkg/package.json`

```json
{
  "name": "wasm-game-of-life",
  "collaborators": ["GitHub <noreply@github.com>"],
  "version": "0.1.0",
  "files": [
    "wasm_game_of_life_bg.wasm",
    "wasm_game_of_life.js",
    "wasm_game_of_life_bg.js",
    "wasm_game_of_life.d.ts"
  ],
  "module": "wasm_game_of_life.js",
  "types": "wasm_game_of_life.d.ts",
  "sideEffects": false
}
```

`package.json`은 자바스크립트와 webassembly 패키지를 만드는데 필요한 메타데이터를 가진 파일이다. `npm`이 이 `package.json`을 사용하고, 자바스크립트 번들러는 이 패키지 내의 의존성, 버전 등을 관리할 수 있게 된다.

### 웹 페이지에서 보기

디렉토리에서, 아래 명령어를 실행하자.

`npm init wasm-app www`

```text
@yceffort ➜ /workspaces/rust-playground/wasm-game-of-life (main ✗) $ npm init wasm-app www
npx: installed 1 in 3.952s
🦀 Rust + 🕸 Wasm = ❤
```

`www` 디렉토리 아래 npm package가 생성된 것을 볼 수 있다.

```text
./www/
├── bootstrap.js
├── index.html
├── index.js
├── LICENSE-APACHE
├── LICENSE-MIT
├── package.json
├── package-lock.json
├── README.md
└── webpack.config.js
```

이 패키지에서, 우리가 사용할 webassembly를 사용할 수 있도록 `dependencies`에 의존성으로 걸어두어야 한다.

```text
...
"dependencies": {
    "wasm-game-of-life": "file:../pkg"
  },
```

그리고 `index.js`를 아래 내용으로 바꾼다.

```javascript
import * as wasm from 'wasm-game-of-life'

wasm.greet()
```

그리고 의존성을 설치한 뒤에, 실행해보면 `alert`가 정상적으로 뜨는 것을 확인할 수 있다.

![wasm-alert](./images/wasm-alert.png)

다음 포스트에서, 이제 구체적으로 game-of-life를 러스트를 통해서 구현해 보자.
