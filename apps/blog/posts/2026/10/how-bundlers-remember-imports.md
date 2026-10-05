---
title: '번들러는 import를 어떻게 기억하는가'
tags:
  - bundler
  - javascript
  - nextjs
  - debugging
published: false
date: 2026-10-04 22:00:00
description: '같은 import와 require()를 webpack, Turbopack, Vite로 빌드해, 각 번들러가 그 차이를 그래프 정보와 산출물 중 어디에 남기는지 비교했다. webpack은 그래프에서 구분하고 산출물에서 합쳤고, Turbopack은 반대였다. 이 차이 때문에 coldpath가 잘못 낸 분리 제안과 그 수정까지 다룬다.'
series: 'coldpath 제작기'
seriesOrder: 4
---

## Table of Contents

## 지난 글에 쓴 문장 하나

[소스맵 없이 토스증권의 JavaScript를 추적한 글](/2026/09/tracing-third-party-javascript-without-sourcemaps)에서 coldpath로 복원한 의존성 그래프를 설명하며 이렇게 적었다.

> webpack의 생성 코드에서는 정적 import와 `require()`가 같은 호출이 되므로 대부분 `unknown`이다.

토스증권의 청크는 Next.js가 쓰는 `webpackChunk_N_E` 전역에 등록돼 있었고, 그 산출물에서는 이 문장이 맞았다. 그런데 같은 입력을 여러 번들러로 직접 빌드해 보니 이 문장을 webpack 전체의 설명으로 쓰기는 어려웠다. webpack 5.111.1의 기본 설정에서는 정적 의존성을 부르는 호출이 산출물에서 아예 사라지는 경우가 있었다. Turbopack은 반대로 산출물에 import와 `require()`를 서로 다른 호출로 남겼는데, Turbopack이 내보내는 분석용 그래프 파일에서는 그 구분이 없었다. coldpath는 그 그래프 파일을 그대로 믿고, `require()`로만 닿는 모듈에 "정적 import 체인이 닿는다"는 분리 제안을 붙이고 있었다.

그래서 이번에는 질문을 하나로 좁혔다. 번들러는 `import`와 `require()`의 차이를 어디에 기억할까. 기억할 수 있는 자리는 두 곳이다. 하나는 번들러가 빌드하면서 바깥으로 내보내는 그래프 정보(webpack의 stats, Turbopack의 분석 파일, Vite 플러그인이 읽는 모듈 정보)이고, 다른 하나는 브라우저가 실제로 받는 산출물이다. webpack, Turbopack, Vite를 같은 입력으로 빌드해 두 자리를 비교해 보니, 번들러마다 기억하는 자리가 달랐다.

> 소스 인용과 측정은 2026년 10월 4일 기준이다. webpack [`v5.111.1`](https://github.com/webpack/webpack/tree/v5.111.1), Next.js [`v16.3.8`](https://github.com/vercel/next.js/tree/v16.3.8)(Turbopack, 내장 webpack 5.98.0), Vite 8.3.2와 그 빌드를 맡는 Rolldown [`v1.2.12`](https://github.com/rolldown/rolldown/tree/v1.2.12), esbuild [`v0.28.2`](https://github.com/evanw/esbuild/tree/v0.28.2)를 고정했다. macOS(arm64), Node.js 24.20.0에서 빌드했고, coldpath는 npm에 배포된 0.6.0으로 쟀다. 실험 코드와 원자료는 [`experiments/bundler-import-memory`](https://github.com/yceffort/blog/tree/main/experiments/bundler-import-memory)에 있다.

## 일곱 가지 경우를 담은 입력

비교에 쓴 입력은 아래 `entry.js` 하나다. import와 `require()`가 섞일 수 있는 경우를 한 줄씩 넣었고, 각 의존 모듈은 산출물에서 찾을 수 있도록 `'M_ESM_DEP'` 같은 고유한 문자열을 반환한다.

```js
import {esmDep} from './esm-dep.js'
import cjsDefault from './cjs-default.js'
import './side-effect.js'
import {unusedDep} from './unused-dep.js'
const {cjsDep} = require('./cjs-dep.js')
const {esmRequired} = require('./esm-required.js')

export function run() {
  return [esmDep(), cjsDefault(), cjsDep(), esmRequired(), globalThis.M_SIDE_EFFECT, () => import('./lazy-dep.js').then((m) => m.lazyDep())]
}
```

| 줄  | 경우                    | 가져오는 모듈의 형식                  |
| --- | ----------------------- | ------------------------------------- |
| 1   | ESM에서 import          | ESM                                   |
| 2   | ESM에서 default import  | CommonJS(`module.exports = function`) |
| 3   | 부수 효과만 있는 import | 전역 변수에 값을 쓰는 스크립트        |
| 4   | import했지만 쓰지 않음  | ESM                                   |
| 5   | `require()`             | CommonJS                              |
| 6   | `require()`             | ESM                                   |
| 9   | 동적 `import()`         | ESM                                   |

`package.json`에는 `type` 필드를 두지 않았고, `"sideEffects": ["./src/side-effect.js"]`로 부수 효과가 있는 파일을 하나만 선언했다. Next.js 빌드에서는 `pages/index.jsx`가 이 `run()`을 불러 화면에 그린다.

그래프 정보는 번들러마다 다음 자리에서 읽었다. 산출물은 각 번들러의 프로덕션 빌드를 축소한 것과 축소하지 않은 것 두 가지로 만들었다.

| 번들러                    | 그래프 정보                                   | 얻는 방법                                                 |
| ------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| webpack 5.111.1           | stats JSON의 `modules[].reasons`              | `stats.toJson({reasons: true, orphanModules: true, ...})` |
| Turbopack(Next.js 16.3.8) | `.next/diagnostics/analyze/data/modules.data` | `next experimental-analyze --output`                      |
| Vite 8.3.2(Rolldown)      | 플러그인 훅의 `this.getModuleInfo(id)`        | `generateBundle` 훅에서 모든 모듈을 조회                  |
| esbuild 0.28.2            | metafile의 `inputs[].imports`                 | `metafile: true`                                          |

## webpack: 그래프에서는 구분하고 산출물에서는 합친다

### stats의 reason에 남는 것

webpack stats에서 모듈마다 붙는 `reasons`는 그 모듈을 누가 어떤 의존성으로 불렀는지를 적은 목록이다. 위 입력에서 `entry.js`가 남긴 reason만 모으면 다음과 같다.

```text
./src/esm-dep.js       harmony side effect evaluation  1:0-35    inactive
                       harmony import specifier        9:10-16
./src/cjs-default.js   harmony side effect evaluation  2:0-41    inactive
                       harmony import specifier        9:20-30
./src/side-effect.js   harmony side effect evaluation  3:0-25
./src/unused-dep.js    harmony side effect evaluation  4:0-41    inactive, orphan
./src/cjs-dep.js       cjs require                     5:17-40
./src/esm-required.js  cjs require                     6:22-50
./src/lazy-dep.js      import()                        9:91-114
```

import는 `harmony`로 시작하는 문자열로, `require()`는 `cjs require`로 남고, 모든 reason에 `줄:열-열` 위치가 붙는다. 이 문자열은 의존성 클래스마다 정의된 `type` 게터에서 온다. stats를 만들 때는 그 값을 그대로 옮겨 적는다.[^stats-type]

```js
// lib/dependencies/HarmonyImportSideEffectDependency.js
get type() {
  return "harmony side effect evaluation";
}

// lib/dependencies/CommonJsRequireDependency.js
get type() {
  return "cjs require";
}
```

표에서 두 가지를 더 볼 수 있다. 첫째, import 문 하나가 reason 두 개를 남긴다. `harmony side effect evaluation`은 import 선언의 위치(`1:0-35`)이고, `harmony import specifier`는 가져온 이름을 실제로 쓰는 위치(`9:10-16`)다. `sideEffects`로 부수 효과가 없다고 선언된 모듈은 선언 위치의 reason이 `inactive`가 되고 사용 위치만 활성으로 남는다. 둘째, 쓰지 않아서 번들에서 빠진 `unused-dep.js`도 orphan 모듈로 stats에 남아 있다. webpack의 그래프 정보는 산출물에 들어가지 않은 import까지 기억한다.

### 산출물에서는 같은 호출이 된다

같은 페이지를 Next.js 16.3.8의 webpack 모드로 빌드하면 페이지 모듈의 앞부분이 이렇게 된다. Next.js에 내장된 webpack은 5.98.0이다.

```js
var E=n(72),t=n(5138),r=n.n(t);n(2199);let{cjsDep:s}=n(8030),{esmRequired:u}=n(4979);
```

`n`은 모듈 함수의 세 번째 인자로 들어오는 `__webpack_require__`를 축소한 이름이다. `n(5138)`은 2번 줄의 default import, `n(2199)`는 3번 줄의 부수 효과 import, `n(8030)`과 `n(4979)`는 5번과 6번 줄의 `require()`다. 1번 줄의 `esm-dep.js`는 페이지 모듈에 합쳐진 뒤 함수 호출까지 접혀서 `"M_ESM_DEP"`라는 문자열만 남았다. stats에서는 `harmony`와 `cjs require`로 갈렸던 의존성이 여기서는 모두 `n(id)`라는 같은 모양의 호출이다. 두 의존성을 구분할 단서는 default import에 붙은 `n.n(t)`(CommonJS 모듈의 `module.exports`를 default로 꺼내는 호환 함수) 정도다.

두 경로가 같은 호출로 모이는 과정은 소스에서 확인할 수 있다. 인용은 webpack 5.111.1이고, Next.js에 내장된 5.98.0의 소스는 따로 확인하지 않았다. import는 `RuntimeTemplate.importStatement`가 문장 전체를 새로 만든다.[^import-statement]

```js
importContent = `/* harmony import */ ${optDeclaration}${importVar} = ${RuntimeGlobals.require}(${moduleId});\n`;
```

`require()`는 원래 코드를 부분적으로 치환한다. `CommonJsRequireDependency`가 인자 자리를 모듈 id로 바꾸고, 함께 등록되는 `RequireHeaderDependency`가 `require`라는 이름을 `__webpack_require__`로 바꾼다.[^require-header]

```js
// lib/dependencies/CommonJsRequireDependency.js
const content = runtimeTemplate.moduleId({
  module: importedModule,
  chunkGraph,
  request: dep.request,
  weak: dep.weak
});
source.replace(dep.range[0], dep.range[1] - 1, content);

// lib/dependencies/RequireHeaderDependency.js
runtimeRequirements.add(RuntimeGlobals.require);
source.replace(dep.range[0], dep.range[1] - 1, RuntimeGlobals.require);
```

하나는 문장을 새로 쓰고 다른 하나는 기존 호출을 고쳐 쓰는데, 결과 문자열은 둘 다 `__webpack_require__(id)`가 된다. 지난 글에서 coldpath의 복원 그래프 간선이 대부분 `unknown`이었던 이유가 여기에 있다.

같은 자리에서 coldpath의 복원 로직이 놓친 경우도 하나 찾았다. 동적 import는 Next.js 내장 webpack 산출물에서 `n.e(990).then(n.bind(n,6990))`였고, coldpath는 이 `bind` 형태만 동적 간선으로 인식했다. webpack 5.111.1을 단독으로 쓰면 같은 자리가 `r.e(132).then(()=>r(132))`가 된다. 대상 환경이 화살표 함수를 지원하면 `bind` 대신 화살표 함수를 쓰기 때문이다.[^deferred-call] coldpath 0.6.0은 이 `r(132)`를 평범한 호출로 보고 `unknown`으로 분류했다. 지금은 `n.e(chunk)`, `Promise.all(...)`, `Promise.resolve()` 뒤의 `.then`에 넘긴 화살표 함수도 동적 import로 인식하도록 고쳤다. [coldpath 수정 커밋 링크 필요]

### webpack 5.109 이후에는 호출 자체가 사라진다

위의 설명은 webpack 5.111.1의 기본 설정에서 그대로 성립하지 않는다. 5.109.0(2026년 7월 23일)부터 정적으로 분석할 수 있는 CommonJS 모듈도 모듈 연결(module concatenation, 여러 모듈을 한 함수 범위로 합치는 최적화) 대상이 됐고, 5.110.0(2026년 8월 27일)부터는 합친 모듈을 `__webpack_require__.cw`라는 지연 접근자로 감싸고 `require()`를 그 자리에 인라인한다.[^releases] 같은 입력을 5.111.1 기본 설정으로 빌드한 결과는 이렇다.

```js
var t=r.cw(function(t,e){function o(){return"M_ESM_REQUIRED"}r.d(e,{esmRequired:()=>o})}),e=r(678),o=r.n(e);r(19);const{cjsDep:n}=r(234),{esmRequired:s}=t();
```

`require()`로 가져온 ESM 모듈(`esm-required.js`)은 `r.cw(...)`로 감싸져 entry 안에 합쳐졌고, 원래 `require()`가 있던 자리에서 `t()`로 호출된다. CommonJS 파일 세 개는 여전히 `r(678)`, `r(19)`, `r(234)`로 남았는데, stats의 `optimizationBailout`을 보면 이유가 `ModuleConcatenation bailout: Module is not in strict mode`다. 이 세 파일 맨 앞에 `'use strict'`만 붙여 다시 빌드하면 stats에는 orphan을 빼고 `./src/index.js + 6 modules` 하나와 동적으로 불러오는 `lazy-dep.js`만 남는다. 축소하지 않은 산출물에서 `cjs-dep.js` 부분은 다음과 같다.

```js
// MODULE: ./src/cjs-dep.js
var cjs_dep_namespaceFn = /*#__PURE__*/__webpack_require__.cw(function(module, exports) {

module.exports = {
  cjsDep() {
    return 'M_CJS_DEP'
  },
}

});

// (중략)
const {cjsDep: entry_cjsDep} = (cjs_dep_namespaceFn())
```

이 빌드에서 `__webpack_require__(id)` 형태로 남은 호출은 동적 import의 `r(132)` 하나뿐이다. 비교할 호출이 사라졌으니 "import와 `require()`가 같은 호출이 된다"는 문장은 성립할 자리가 없다. 대신 2번 줄의 default import는 `__webpack_require__.n(cjs_default_namespaceFn())`로, 5번 줄의 `require()`는 `cjs_dep_namespaceFn()`로 남아서, 호환 함수가 붙었는지로 두 경우를 구분할 수 있다. 뒤에서 볼 Vite와 esbuild의 산출물에 가까운 모양이다. 지난 글의 문장은 Next.js에 내장된 webpack처럼 이 변화 이전의 버전이거나, 모듈 연결에서 빠지는 모듈에 한해 맞는 설명이었다고 보는 것이 정확할 것이다.

### `"type": "module"` 패키지 안의 `require()`

같은 입력을 `"type": "module"`인 패키지에 넣고, CommonJS 파일 두 개만 `.cjs`로 옮겨서 다시 빌드했다. 남는 차이는 ESM으로 판정된 `entry.js` 안에 `require()`가 있다는 것 하나다.

webpack 5.111.1은 에러 0건, 경고 0건으로 빌드를 마쳤다. 그런데 산출물에는 `require('./cjs-dep.cjs')`와 `require('./esm-required.js')`가 원래 코드 그대로 남아 있었고, stats 그래프에서는 두 모듈이 아예 빠져 있었다. `require`가 없는 환경(Node.js의 `vm` 컨텍스트)에서 이 산출물을 실행하면 `ReferenceError: require is not defined`가 난다.

원인은 webpack의 기본 규칙에 있다. `"type": "module"`인 패키지 안의 `.js`는 `javascript/esm` 타입으로 판정되고,[^esm-rule] CommonJS 구문을 해석하는 파서 훅은 `javascript/auto`와 `javascript/dynamic`에만 등록된다.[^commonjs-plugin] `javascript/esm` 모듈 안의 `require(...)`는 의존성으로 인식되지 않고 평범한 함수 호출로 남는다. Node.js에서도 ESM에는 `require`가 없으니 규칙 자체는 Node.js와 일치한다. 다만 아무 경고 없이 지나간다는 점은 알아 둘 필요가 있다.

| 번들러                      | 빌드                  | 산출물                                                               |
| --------------------------- | --------------------- | -------------------------------------------------------------------- |
| webpack 5.111.1             | 성공, 에러와 경고 0건 | `require()`가 그대로 남음, 실행 시 `ReferenceError`                  |
| Next.js 내장 webpack 5.98.0 | 실패                  | 페이지 데이터를 모으는 단계에서 `Cannot find module './cjs-dep.cjs'` |
| Turbopack                   | 성공, 경고 없음       | `require()`를 번들                                                   |
| Rolldown                    | 성공, 경고 없음       | 번들, `__toESM(..., 1)`로 Node.js 호환 방식의 default 처리           |
| esbuild                     | 성공, 경고 없음       | 번들, `__toESM(require_cjs_default(), 1)`                            |

Next.js의 webpack 모드에서 빌드가 실패한 것은 서버 번들에도 `require()`가 남았고, 빌드 중 페이지 데이터를 모으는 단계(`Failed to collect page data for /`)에서 그 서버 번들이 실행됐기 때문이다. 클라이언트 번들만 만드는 설정이었다면 webpack 5.111.1처럼 실행할 때까지 드러나지 않았을 것이다.

## Turbopack: 그래프에서는 합치고 산출물에서는 구분한다

### `modules.data`의 구조

Next.js의 번들 분석기는 `next experimental-analyze`로 실행하고, `--output`을 붙이면 결과를 `.next/diagnostics/analyze/data/`에 파일로 남긴다. 모듈 사이의 의존성은 그중 `modules.data`에 들어 있다. 파일 앞 4바이트는 JSON 헤더의 길이를 빅 엔디언 정수로 적은 것이고, 그 뒤에 JSON 헤더와 이진 영역이 이어진다.[^modules-data]

```rust
let header_json = serde_json::to_vec(&header).unwrap();

let mut rope = RopeBuilder::default();
rope.push_bytes(&(header_json.len() as u32).to_be_bytes());
rope.reserve_bytes(header_json.len() + binary_section.data.len());
rope.push_bytes(&header_json);
rope.push_bytes(&binary_section.data);
```

헤더의 `modules`는 모듈마다 `ident`와 `path` 두 필드만 가진다. 간선은 `module_dependencies`, `async_module_dependencies`, `traced_module_dependencies`와 그 역방향인 `*_dependents`까지 여섯 목록으로 나뉘고, 헤더에는 각 목록이 이진 영역의 어디에 있는지(`offset`, `length`)만 적힌다. 이진 영역의 목록은 모듈 수, 모듈별 간선의 끝 위치, 대상 모듈 번호를 차례로 담은 인접 리스트다. 같은 입력에서 클라이언트용 `entry.js`가 가진 간선을 풀면 다음과 같다.

```text
module_dependencies        src/entry.js -> src/esm-dep.js
                           src/entry.js -> src/cjs-default.js
                           src/entry.js -> src/side-effect.js
                           src/entry.js -> src/cjs-dep.js
                           src/entry.js -> src/esm-required.js
async_module_dependencies  src/entry.js -> src/lazy-dep.js
```

정적 의존성 다섯 개가 한 목록에 들어 있고, 간선에는 종류도 위치도 지정자도 없다. 쓰지 않은 `unused-dep.js`는 목록에서 아예 빠져 있다. webpack이 orphan으로 남겨 두던 import를 이 파일은 기록하지 않는다.

### 내부 그래프에는 구분이 있었다

Turbopack 안에서 import와 `require()`는 서로 다른 참조 타입이다. 각 참조는 자신이 청크에 어떤 방식으로 들어가야 하는지를 `ChunkingType`으로 알리는데, ESM import(`EsmAssetReference`)와 CommonJS `require()`(`CjsRequireAssetReference`)는 같은 `Parallel`이면서 필드 값이 다르다.[^chunking-type]

```rust
// turbopack-ecmascript/src/references/esm/base.rs
fn chunking_type(&self) -> Option<ChunkingType> {
    self.extras
        .as_deref()
        .and_then(|e| e.chunking_type)
        .map_or_else(
            || {
                Some(ChunkingType::Parallel {
                    inherit_async: true,
                    hoisted: true,
                })
            },
            |c| c.as_chunking_type(true, true),
        )
}

// turbopack-ecmascript/src/references/cjs.rs
fn chunking_type(&self) -> Option<ChunkingType> {
    self.chunking_type_attribute.map_or_else(
        || {
            Some(ChunkingType::Parallel {
                inherit_async: false,
                hoisted: false,
            })
        },
        |c| c.as_chunking_type(false, false),
    )
}
```

`ChunkingType`의 주석에 따르면 `inherit_async`는 가져온 모듈이 비동기 모듈(최상위 `await`를 쓰는 모듈 등)일 때 가져오는 모듈도 비동기가 되는지를 뜻하고, "ESM import에서는 그래야 하지만 CommonJS require에서는 아니다"라고 적혀 있다. `hoisted`는 가져온 모듈이 가져오는 모듈보다 항상 먼저 실행되는지, 즉 ESM import의 의미를 따르는지다. 모듈 그래프의 간선은 이 값을 들고 있으니, Turbopack 내부에서는 import와 `require()`를 구분할 수 있다.

구분이 사라지는 곳은 분석기가 `modules.data`를 쓰는 자리다. `analyze_module_graphs`는 그래프를 순회하면서 추적(traced) 대상인지를 먼저 거르고, 나머지 간선은 `chunking_type`만 보고 목록을 고른다.[^analyze-match]

```rust
match reference.chunking_type {
    ChunkingType::Async => {
        all_async_edges.insert((parent_node, node));
    }
    _ => {
        all_edges.insert((parent_node, node));
    }
}
```

`Async`가 아닌 간선은 `Parallel`의 두 필드가 무엇이든 모두 `_` 갈래로 들어간다. 간선은 `(부모, 자식)` 쌍의 집합으로 저장되므로, 같은 모듈을 import와 `require()`로 함께 가져오면 간선 하나로 합쳐질 것이다. 이 마지막 경우는 소스로만 확인했고 빌드로 재 보지는 않았다. 분석기 화면의 목적은 모듈 크기와 의존 관계를 보여 주는 것이니, 이 구분이 필요하지 않았을 가능성이 높다고 생각한다.

### 산출물에는 `e.i`와 `e.r`로 남는다

같은 페이지를 Turbopack으로 빌드한 산출물에서 페이지 모듈은 다음과 같다.

```js
350,e=>{"use strict";var t=e.i(1398),r=e.i(9422);e.i(1323);let{cjsDep:n}=e.r(1934),{esmRequired:o}=e.r(2989);e.s(["default",0,function(){return(0,t.jsx)("p",{children:String(["M_ESM_DEP",(0,r.default)(),n(),o(),globalThis.M_SIDE_EFFECT,()=>e.A(3105).then(e=>e.lazyDep())].slice(0,5))})}],350)}
```

`e`는 모듈 함수가 받는 `__turbopack_context__`다. 2번 줄의 default import는 `e.i(9422)`, 3번 줄의 부수 효과 import는 `e.i(1323)`, 5번과 6번 줄의 `require()`는 `e.r(1934)`와 `e.r(2989)`가 됐다. 1번 줄의 `esm-dep.js`는 scope hoisting(여러 ESM 모듈을 한 모듈 함수로 합치는 최적화)으로 페이지 모듈에 합쳐져 문자열만 남았고, 동적 import는 `e.A(3105)`다. 3105번은 청크를 내려받은 뒤 실제 모듈을 불러오는 로더 모듈이다.

```js
3105,e=>{e.v(t=>Promise.all(["static/chunks/0214m9_id9iur.js"].map(t=>e.l(t))).then(()=>t(9131)))}
```

호출은 가져오는 모듈의 형식이 아니라 간선의 종류를 따른다. CommonJS 모듈을 import한 2번 줄은 `e.i`이고, ESM 모듈을 `require()`한 6번 줄은 `e.r`이다. 한 글자짜리 이름은 코드 생성기의 상수에 정의돼 있다.[^shortcuts]

```rust
pub const TURBOPACK_REQUIRE: &TurbopackRuntimeFunctionShortcut = make_shortcut!("r");
pub const TURBOPACK_ASYNC_LOADER: &TurbopackRuntimeFunctionShortcut = make_shortcut!("A");
pub const TURBOPACK_MODULE_CONTEXT: &TurbopackRuntimeFunctionShortcut = make_shortcut!("f");
pub const TURBOPACK_IMPORT: &TurbopackRuntimeFunctionShortcut = make_shortcut!("i");
```

두 호출을 합칠 수 없는 이유는 런타임에 있다. `i`와 `r`은 같은 모듈을 가리켜도 서로 다른 값을 돌려준다.[^runtime-utils]

```ts
function esmImport(
  this: TurbopackBaseContext<Module>,
  id: ModuleId
): Exclude<Module['namespaceObject'], undefined> {
  const module = getOrInstantiateModuleFromParent(id, this.m)

  // any ES module has to have `module.namespaceObject` defined.
  if (module.namespaceObject) return module.namespaceObject

  // only ESM can be an async module, so we don't need to worry about exports being a promise here.
  const raw = module.exports
  return (module.namespaceObject = interopEsm(
    raw,
    createNS(raw),
    raw && (raw as any).__esModule
  ))
}
contextPrototype.i = esmImport

// (중략)

function commonJsRequire(
  this: TurbopackBaseContext<Module>,
  id: ModuleId
): Exports {
  return getOrInstantiateModuleFromParent(id, this.m).exports
}
contextPrototype.r = commonJsRequire
```

`i`는 ESM 네임스페이스 객체를 돌려준다. 가져온 모듈이 CommonJS면 `interopEsm`으로 `module.exports`를 감싸 `default`를 만들어 주고, 그 결과를 모듈에 저장해 다음 호출에 재사용한다. 2번 줄이 `(0,r.default)()`로 CommonJS 함수를 부를 수 있는 것은 이 덕분이다. `r`은 `module.exports`를 그대로 돌려준다. webpack은 호출은 하나로 두고 default import가 필요한 자리에 `n.n(...)` 같은 호환 함수를 따로 붙였고, Turbopack은 호환 처리를 호출 자체에 넣었다. 그래서 Turbopack의 코드 생성기는 두 호출을 구분해서 남길 수밖에 없다.

### 블로그에서 잰 차이

이 블로그(Next.js 16.3.5, 커밋 `f1ff09a9`)에서 같은 커밋으로 `next experimental-analyze --output`과 `next build`를 실행해 두 지점을 비교했다. `modules.data`에는 모듈이 6,659개 있었다. 클라이언트 동기 간선을 서로 다른 경로 쌍으로 세면 3,600개였고, 가져오는 파일의 소스를 파싱해 지정자를 Node.js의 `require` 해석 규칙으로 풀어 대상과 맞춰 보았다.[^blog-edges] 산출물에서는 소스맵을 뺀 `.next/static`의 JavaScript 109개에서 coldpath의 `modules --graph`로 간선을 복원했다.

| 관측 지점                                      |  간선 |     import | `require()` | 그 밖          |
| ---------------------------------------------- | ----: | ---------: | ----------: | -------------- |
| `modules.data`의 클라이언트 동기 간선(경로 쌍) | 3,600 |      2,051 |         588 | 판정 못 함 961 |
| 산출물에서 복원한 간선                         |   986 | 456(`e.i`) |  496(`e.r`) | 동적 34        |

그래프 파일에서 판정하지 못한 961개 중 201개는 가져오는 파일에 `require()`가 있어서, `require()` 간선은 최소 588개(16.3%)에서 최대 789개(21.9%)로 볼 수 있다. 판정하지 못한 간선에는 `process` 폴리필, SWC가 주입한 `@swc/helpers`, JSX 변환이 주입한 `jsx-runtime`, `react`를 `next/dist/compiled/react`로 바꾸는 별칭처럼 소스에 그 모양 그대로는 없는 간선이 섞여 있다. `require()` 588개는 모두 `node_modules` 안쪽, 주로 `next/dist`의 CommonJS 산출물에서 나왔고, 블로그 코드에서 나간 간선에는 없었다.

산출물에서는 `e.r`이 절반을 넘었다. 같은 앱인데 비율이 달라지는 것은 scope hoisting 때문으로 보인다. ESM 모듈끼리의 import는 한 모듈 함수 안으로 합쳐지면서 간선이 사라지고, CommonJS 모듈은 따로 모듈 함수로 남아 `e.r` 호출을 남긴다. 복원한 모듈 함수는 청크 91개에 걸쳐 677개(중복을 빼면 339개)였고, 복원하지 못한 id를 가리키는 호출 527개는 간선에서 빠졌다.

### coldpath가 걸려 있던 자리

coldpath 0.6.0의 Turbopack 어댑터는 `modules.data`의 세 목록을 이렇게 옮겼다.[^coldpath-v060]

```ts
for (const [field, kind] of [
  ['module_dependencies', 'static'],
  ['async_module_dependencies', 'dynamic'],
  ['traced_module_dependencies', 'unknown'],
] as const) {
```

동기 간선은 모두 `static`이 된다. 이후 소스를 파싱해 위치를 붙이는 단계(`enrichLocations`)도 간선과 종류가 같은 자리만 받아들였기 때문에, `require()` 자리를 찾고도 버렸다. coldpath는 체인의 모든 간선이 `static`일 때만 "정적 import 체인"으로 보고 분리 제안을 내므로, 이 오분류는 제안 자체를 바꿀 수 있다.

실제로 바뀌는지 확인하려고 페이지 하나를 만들었다. 무거운 ESM 모듈은 정적 import로, 무거운 CommonJS 모듈은 `require()`로 가져오고, 둘 다 버튼을 눌러야 쓰인다.

```jsx
import {useState} from 'react'
import {esmHeavy} from '../../src/heavy-esm.js'
const cjsHeavy = require('../../src/heavy-cjs.js')

export default function Page() {
  const [text, setText] = useState('ready')
  return (
    <main>
      <button id="esm" onClick={() => setText(esmHeavy())}>esm</button>
      <button id="cjs" onClick={() => setText(cjsHeavy.compute())}>cjs</button>
      <p id="out">{text}</p>
    </main>
  )
}
```

첫 진입과 CommonJS 버튼 클릭을 각각 수집해 0.6.0으로 분석하자 `heavy-cjs.js`에 다음 제안이 붙었다(필드 일부만 옮겼다).

```json
{
  "kind": "split-review",
  "source": "turbopack:///[project]/fixtures/impact/src/heavy-cjs.js",
  "path": [
    "[next]/entry/page-loader.ts",
    "fixtures/impact/next-app/pages/index.jsx",
    "fixtures/impact/src/heavy-cjs.js"
  ],
  "edges": [
    "static",
    "static"
  ],
  "explanation": "A static import chain reaches this source, and part of it executes initially. Consider separating the later-only functionality before introducing import(); deferring the whole module may break initial behavior."
}
```

`heavy-cjs.js`에 닿는 간선은 `require()`인데 설명은 "정적 import 체인"이다. 그래프에서 이 간선 하나만 `require`로 바꿔 다시 분석하면 같은 모듈의 제안은 `inspect-imports`(가져오는 경로와 부수 효과를 먼저 살펴보라는 제안)로 바뀐다. `require()` 간선은 안전하게 미룰 수 있는 경계가 되지 못한다는 coldpath 자신의 규칙대로라면 `inspect-imports`가 맞는 결과다.

그래서 동기 간선의 종류를 소스에서 정하도록 고쳤다. 가져오는 파일을 파싱해서 `require()` 자리와 대상이 맞으면 `require`, `require()`를 쓰는 파일인데 어느 자리와도 맞지 않으면 `unknown`(경고에 개수를 남긴다), 나머지는 이전처럼 `static`으로 둔다. `'react'` 같은 패키지 이름은 가져오는 파일에서 Node.js의 `require` 해석 규칙으로 풀어 대상과 비교한다. [coldpath 수정 커밋 링크 필요]

| 측정                                 | coldpath 0.6.0               | 수정 후                                                    |
| ------------------------------------ | ---------------------------- | ---------------------------------------------------------- |
| 픽스처의 `index.jsx -> heavy-cjs.js` | `static`, 위치 없음          | `require`, 3행 18열                                        |
| 픽스처의 `heavy-cjs.js` 제안         | `split-review`               | `inspect-imports`                                          |
| 픽스처 그래프에서 위치가 붙은 간선   | 284개 중 3                   | 284개 중 222                                               |
| 블로그 그래프 간선 종류              | `static` 3,881, `dynamic` 64 | `static` 3,051, `require` 624, `unknown` 226, `dynamic` 64 |
| 블로그 그래프에서 위치가 붙은 간선   | 2,083                        | 2,799                                                      |
| 블로그 코드에서 나가는 간선          | `static` 208, `dynamic` 4    | 같음                                                       |

블로그 그래프의 간선이 3,945개에서 3,965개로 늘어난 것은 한 파일이 같은 모듈을 여러 자리에서 부르면 자리마다 간선을 남기기 때문이고, 서로 다른 모듈 쌍은 수정 전후 모두 3,941개다. 이 규칙에도 한계는 있다. `unknown` 226개에는 JSX 변환이 주입한 `jsx-runtime`처럼 소스에 없는 간선이 `require()`를 쓰는 파일에서 나온 경우가 섞여 있고, 이런 간선을 지나는 체인에는 분리 제안이 붙지 않는다. Next.js가 만든 가상 모듈 `[next]/entry/page-loader.ts`에서 페이지로 가는 간선은 읽을 소스가 없어 여전히 `static`인데, 산출물에서는 이 간선도 `e.r` 호출이었다.

## Vite: 호출이 아니라 도우미 함수로 남긴다

### `getModuleInfo`는 import와 `require()`를 한 목록에 담는다

Vite 8은 빌드를 Rolldown으로 하고, 플러그인은 Rollup과 같은 모양의 `this.getModuleInfo(id)`로 그래프를 읽는다. 같은 입력에서 `entry.js`의 모듈 정보는 다음과 같다.

```json
{
  "importedIds": [
    "src/esm-dep.js",
    "src/cjs-default.js",
    "src/side-effect.js",
    "src/unused-dep.js",
    "\u0000vite/preload-helper.js",
    "src/cjs-dep.js",
    "src/esm-required.js"
  ],
  "dynamicallyImportedIds": [
    "src/lazy-dep.js"
  ],
  "inputFormat": "es"
}
```

`importedIds` 7개에는 import 4개, `require()` 2개, 그리고 Vite가 동적 import를 처리하면서 주입한 `\0vite/preload-helper.js`가 함께 들어 있다. Rolldown이 이 목록을 채우는 코드를 보면, 의존성 기록의 종류 중 `Import`, `Require`, `NewUrl`(`new URL(..., import.meta.url)`)을 같은 집합에 넣는다.[^rolldown-imported]

```rust
for (record, info) in raw_import_records.iter().zip(&resolved_deps) {
  match record.kind {
    ImportKind::Import | ImportKind::Require | ImportKind::NewUrl => {
      ecma_view.imported_ids.insert(info.id.clone());
    }
    ImportKind::DynamicImport => {
      ecma_view.dynamically_imported_ids.insert(info.id.clone());
    }
    ImportKind::HotAccept => {
      ecma_view.hmr_info.deps.insert(info.id.clone());
    }
    // for a none css module, we should not have `at-import` or `url-import`
    ImportKind::AtImport | ImportKind::UrlImport => unreachable!(),
  }
}
```

Rolldown 내부의 의존성 기록에는 종류가 있지만, 플러그인에 보이는 목록에서는 Turbopack과 마찬가지로 합쳐진다. 위치도 없다. 쓰지 않은 `unused-dep.js`는 Turbopack과 달리 목록에 남아 있다. `inputFormat`은 모듈 자신의 형식(`es`, `cjs`, 형식을 판단할 구문이 없는 `side-effect.js`는 `unknown`)을 알려 주지만 간선의 종류는 알려 주지 않는다.

coldpath는 Vite에서는 이 문제를 겪지 않았다. Vite와 Rollup용 플러그인은 `transform` 훅에서 각 모듈의 소스를 직접 파싱해 두었다가, `getModuleInfo`의 간선과 맞춰 종류와 위치를 붙이기 때문이다.[^coldpath-vite] 0.6.0으로 같은 입력의 그래프를 만들어 보면 `cjs-dep.js`와 `esm-required.js`가 각각 5행 18열과 6행 23열의 `require`로 나온다. `entry.js`에서 나가는 간선 중 위치가 없는 것은 소스에 없는 `preload-helper.js` 하나뿐이었다.

### 산출물은 도우미 함수의 선택으로 갈린다

산출물에서는 ESM 모듈이 모두 최상위로 끌어올려지고, CommonJS 모듈은 지연 실행 래퍼로 감싸진다. 축소하지 않은 산출물에서 해당 부분을 옮기면 다음과 같다.

```js
//#region work/auto/src/esm-dep.js
function esmDep() {
  return "M_ESM_DEP";
}
//#endregion
//#region work/auto/src/side-effect.js
var import_cjs_default = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
  module.exports = function cjsDefault() {
    return "M_CJS_DEFAULT";
  };
})))());
globalThis.M_SIDE_EFFECT = "M_SIDE_EFFECT";
//#endregion
//#region work/auto/src/cjs-dep.js
var require_cjs_dep = /* @__PURE__ */ __commonJSMin(((exports, module) => {
  module.exports = { cjsDep() {
    return "M_CJS_DEP";
  } };
}));
//#endregion
//#region work/auto/src/esm-required.js
var esm_required_exports = /* @__PURE__ */ __exportAll({ esmRequired: () => esmRequired$1 });
function esmRequired$1() {
  return "M_ESM_REQUIRED";
}
//#endregion
//#region work/auto/src/entry.js
var { cjsDep } = require_cjs_dep();
var { esmRequired } = __toCommonJS(esm_required_exports);
```

import와 `require()`의 차이는 어떤 도우미 함수가 붙었는지로 남는다. CommonJS 모듈을 import한 2번 줄은 `__toESM(...)`로 감싸 `default`를 만들고, `require()`한 5번 줄은 `require_cjs_dep()`를 그 자리에서 호출하며, ESM 모듈을 `require()`한 6번 줄은 `__toCommonJS(...)`로 네임스페이스를 CommonJS 객체 모양으로 바꾼다. ESM끼리의 import인 1번 줄은 흔적이 없다. 함수가 최상위로 올라왔을 뿐이다. `__commonJSMin`은 처음 호출될 때 한 번만 모듈 본문을 실행하는 래퍼다.[^rolldown-runtime]

```js
export var __commonJSMin = (cb, mod) => () => (
  mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports
);
```

`//#region` 주석이 모듈 경계를 정확히 알려 주지 않는다는 점도 눈에 띄었다. 2번 줄의 `import_cjs_default` 선언이 `side-effect.js` 구간 안에 들어가 있다. 축소하면 도우미 이름까지 한 글자로 바뀌어(`v=o(...)`, `u(y)`) 모양으로만 알아볼 수 있고, 모듈마다 함수를 등록하는 표가 없으니 coldpath의 `modules`도 이 산출물에서는 모듈 경계를 복원하지 못한다. 복원할 모듈이 하나도 없을 때 출력 디렉터리가 없으면 `ENOENT`로 멈추던 문제도 이번에 함께 고쳤다.

esbuild도 같은 방식을 쓴다. 차이는 크지 않아 표로 대신한다.

| 줄  | 경우                      | Rolldown                               | esbuild                                                     |
| --- | ------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| 1   | ESM에서 import            | 최상위로 끌어올림                      | 최상위로 끌어올림                                           |
| 2   | CommonJS를 default import | `__toESM(__commonJSMin(...)())`        | `__toESM(require_cjs_default())`                            |
| 3   | 부수 효과 import          | 문장을 그대로 인라인                   | 문장을 그대로 인라인                                        |
| 5   | CommonJS를 `require()`    | `require_cjs_dep()`                    | `require_cjs_dep()`                                         |
| 6   | ESM을 `require()`         | `__toCommonJS(esm_required_exports)`   | `(init_esm_required(), __toCommonJS(esm_required_exports))` |
| 9   | 동적 `import()`           | `__vitePreload(() => import(...), [])` | `import(...)`                                               |

esbuild는 `require()`로 가져온 ESM 모듈을 `__esm` 래퍼로 감싸 `require()` 시점에 초기화한다. 그래프 정보는 Rolldown보다 많이 남긴다. metafile의 `imports`에는 `import-statement`, `require-call`, `dynamic-import`가 구분돼 있고 원래 지정자(`original`)도 있다. 다만 metafile을 쓰는 코드는 `path`, `kind`, `original`과 import 속성만 적어서 위치는 없다.[^esbuild-metafile]

## import와 `require()`의 차이가 남는 곳

네 번들러에서 import와 `require()`의 구분을 얻을 수 있는 자리를 정리하면 다음과 같다. 어느 번들러든 소스 자체에는 구분과 위치가 모두 있다.

| 번들러         | 구분이 남는 곳                                                  | 구분이 남지 않는 곳                                                 |
| -------------- | --------------------------------------------------------------- | ------------------------------------------------------------------- |
| webpack        | stats의 reason(위치 포함), 5.111.1 기본 설정 산출물의 호환 함수 | 5.98.0 산출물과 모듈 연결에서 빠진 모듈의 `__webpack_require__(id)` |
| Turbopack      | 산출물의 `e.i`와 `e.r`                                          | `modules.data`                                                      |
| Vite(Rolldown) | 산출물의 도우미 함수                                            | `getModuleInfo()`의 `importedIds`                                   |
| esbuild        | metafile의 `kind`, 산출물의 도우미 함수                         | 없음. 다만 metafile에는 위치가 없다                                 |

이 표는 하나의 규칙으로 설명할 수 있을 것 같다. 번들러는 import와 `require()`의 차이를, 그 기록을 읽는 대상이 필요로 하는 만큼만 남긴다.

산출물을 읽는 것은 런타임이다. Turbopack의 `e.i`와 `e.r`은 같은 모듈을 가리켜도 네임스페이스 객체와 `module.exports`라는 다른 값을 돌려주므로 두 호출을 남겨야 한다. webpack의 `__webpack_require__`는 언제나 `module.exports`를 돌려주고, ESM 모듈은 내보내는 이름을 그 객체의 게터로 달아 두며(`n.d`), default 처리가 필요한 자리에만 `n.n(...)`을 붙인다. 호출이 하나여도 실행 결과가 틀어지지 않으니 호출을 나눌 이유가 없다. Rolldown과 esbuild도 형식을 바꿔야 하는 경계에만 `__toESM`이나 `__toCommonJS`를 두고, 바꿀 것이 없는 ESM끼리의 import에는 아무것도 남기지 않는다. 산출물에 남는 것은 import와 `require()`라는 문법의 차이 자체가 아니라, 그 차이 때문에 실행 중에 달라져야 하는 동작이었다.

그래프 정보를 읽는 것은 도구다. webpack stats의 `reasons`는 이름 그대로 모듈이 번들에 들어온 이유를 설명하는 기록이라, 의존성마다 종류와 위치, 활성 여부까지 남긴다. Next.js의 `modules.data`는 번들 분석기 화면이 내려받는 파일이다. Next.js 16.3.8 패키지에 들어 있는 분석기 화면 코드는 `useSWR("data/modules.data", fetchModulesData)`로 이 파일을 읽는다. 파일에는 모듈 목록과, 동기와 비동기, 추적 대상으로 나눈 의존 관계만 들어 있다. Rolldown의 `getModuleInfo`는 Rollup 플러그인 API를 따르는데, Rollup의 `ModuleInfo`에서 가져오는 모듈을 담는 자리는 정적 의존성(`importedIds`)과 동적 의존성(`dynamicallyImportedIds`) 두 갈래뿐이다.[^rollup-moduleinfo] Rollup은 CommonJS 모듈을 플러그인으로 가져오므로[^rollup-commonjs] `require()`를 위한 자리가 따로 필요하지 않았을 것이다. CommonJS를 직접 처리하는 Rolldown은 같은 모양의 API를 지키면서 `require()`를 정적 의존성 목록에 넣은 것으로 보인다.

coldpath가 필요로 한 정보는 이 두 독자 어디에도 해당하지 않았다. 분리 제안을 내려면 간선마다 "이 자리를 `import()`로 바꿔 미룰 수 있는가"를 알아야 하는데, 런타임은 그런 질문을 하지 않고 분석 화면도 그 질문에 답할 필요가 없다. Vite 플러그인은 처음부터 소스를 파싱해 위치와 종류를 함께 붙였기 때문에 문제가 없었고, 분석 파일을 그대로 믿은 Turbopack 어댑터에서 잘못된 제안이 나왔다. 지금은 두 어댑터 모두 간선의 종류를 소스에서 정하고, 번들러의 기록은 어떤 모듈이 연결돼 있는지를 확인하는 데 쓴다.

지난 글의 문장도 같은 방식으로 다시 읽을 수 있다. "정적 import와 `require()`가 같은 호출이 된다"는 것은 webpack 5.98.0의 런타임이 두 경우를 다르게 다룰 필요가 없었다는 사실을 산출물에서 본 것이었다. 5.109와 5.110에서 CommonJS 모듈 연결과 지연 접근자가 들어오면서 산출물의 모양이 바뀌었고, 같은 5.111.1 안에서도 대상 환경에 따라 동적 import가 `bind`와 화살표 함수로 갈리는데 coldpath의 복원 로직은 그중 하나만 알고 있었다. 산출물에서 의존성을 복원하는 일은 번들러 런타임의 설계를 거꾸로 읽는 일에 가깝다고 생각한다. 그래서 그 설계가 바뀔 수 있는 버전마다 다시 확인해야 하고, 그래프 정보를 읽을 때는 그 파일이 누구에게 읽히려고 만들어졌는지를 먼저 보면 무엇이 빠져 있을지 미리 짐작할 수 있다.

[^stats-type]: [`HarmonyImportSideEffectDependency.js#L53-L55`](https://github.com/webpack/webpack/blob/v5.111.1/lib/dependencies/HarmonyImportSideEffectDependency.js#L53-L55), [`CommonJsRequireDependency.js#L102-L104`](https://github.com/webpack/webpack/blob/v5.111.1/lib/dependencies/CommonJsRequireDependency.js#L102-L104). stats에 옮기는 코드는 [`DefaultStatsFactoryPlugin.js#L1548`](https://github.com/webpack/webpack/blob/v5.111.1/lib/stats/DefaultStatsFactoryPlugin.js#L1548)의 `object.type = dep ? dep.type : null;`이다.

[^import-statement]: [`RuntimeTemplate.js#L2394`](https://github.com/webpack/webpack/blob/v5.111.1/lib/RuntimeTemplate.js#L2394)

[^require-header]: [`CommonJsRequireDependency.js#L330-L337`](https://github.com/webpack/webpack/blob/v5.111.1/lib/dependencies/CommonJsRequireDependency.js#L330-L337), [`RequireHeaderDependency.js#L106-L107`](https://github.com/webpack/webpack/blob/v5.111.1/lib/dependencies/RequireHeaderDependency.js#L106-L107)

[^deferred-call]: [`RuntimeTemplate.js#L1593-L1597`](https://github.com/webpack/webpack/blob/v5.111.1/lib/RuntimeTemplate.js#L1593-L1597)의 `deferredCall`. `supportsArrowFunction()`이 참이면 화살표 함수를, 아니면 `bind`를 쓴다.

[^releases]: [webpack v5.109.0](https://github.com/webpack/webpack/releases/tag/v5.109.0)의 "Concatenate CommonJS modules with statically analyzable exports", [v5.110.0](https://github.com/webpack/webpack/releases/tag/v5.110.0)의 "Wrap concatenated modules in lazy `__webpack_require__.cw` accessors and inline `require()`".

[^esm-rule]: [`config/defaults.js#L1275-L1281`](https://github.com/webpack/webpack/blob/v5.111.1/lib/config/defaults.js#L1275-L1281)에서 `descriptionData: {type: "module"}`인 `.js`에 `esm` 규칙을 적용하고, 그 규칙의 타입은 [`#L1244-L1245`](https://github.com/webpack/webpack/blob/v5.111.1/lib/config/defaults.js#L1244-L1245)의 `JAVASCRIPT_MODULE_TYPE_ESM`이다.

[^commonjs-plugin]: [`CommonJsPlugin.js#L260-L265`](https://github.com/webpack/webpack/blob/v5.111.1/lib/dependencies/CommonJsPlugin.js#L260-L265)

[^modules-data]: [`crates/next-api/src/analyze.rs#L368-L375`](https://github.com/vercel/next.js/blob/v16.3.8/crates/next-api/src/analyze.rs#L368-L375). 헤더 구조체는 [`#L110-L125`](https://github.com/vercel/next.js/blob/v16.3.8/crates/next-api/src/analyze.rs#L110-L125), 모듈 항목은 [`#L70-L74`](https://github.com/vercel/next.js/blob/v16.3.8/crates/next-api/src/analyze.rs#L70-L74)에 있다.

[^chunking-type]: [`references/esm/base.rs#L672-L686`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript/src/references/esm/base.rs#L672-L686), [`references/cjs.rs#L152-L162`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript/src/references/cjs.rs#L152-L162). 필드의 주석은 [`turbopack-core/src/chunk/mod.rs#L347-L356`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-core/src/chunk/mod.rs#L347-L356)에 있다.

[^analyze-match]: [`crates/next-api/src/analyze.rs#L534-L541`](https://github.com/vercel/next.js/blob/v16.3.8/crates/next-api/src/analyze.rs#L534-L541). 추적 대상을 거르는 조건은 바로 위 [`#L519-L532`](https://github.com/vercel/next.js/blob/v16.3.8/crates/next-api/src/analyze.rs#L519-L532)에 있다.

[^shortcuts]: [`turbopack-ecmascript/src/runtime_functions.rs#L69-L72`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript/src/runtime_functions.rs#L69-L72)

[^runtime-utils]: [`runtime-utils.ts#L467-L484`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript-runtime/js/src/shared/runtime/runtime-utils.ts#L467-L484), [`#L509-L515`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript-runtime/js/src/shared/runtime/runtime-utils.ts#L509-L515)

[^blog-edges]: 판정 스크립트는 [`scripts/blog-edges.mjs`](https://github.com/yceffort/blog/blob/main/experiments/bundler-import-memory/scripts/blog-edges.mjs)에 있다. 한 파일에서 갈라진 부분 모듈끼리 잇는 간선은 세지 않았다.

[^coldpath-v060]: [`lib/graph.ts#L295-L299`](https://github.com/yceffort/coldpath/blob/v0.6.0/lib/graph.ts#L295-L299). 종류가 같은 자리만 받아들이는 조건은 [`#L140`](https://github.com/yceffort/coldpath/blob/v0.6.0/lib/graph.ts#L140)에 있다.

[^rolldown-imported]: [`crates/rolldown/src/module_loader/module_task.rs#L157-L171`](https://github.com/rolldown/rolldown/blob/v1.2.12/crates/rolldown/src/module_loader/module_task.rs#L157-L171)

[^coldpath-vite]: [`lib/rollup.ts#L30-L38`](https://github.com/yceffort/coldpath/blob/v0.6.0/lib/rollup.ts#L30-L38), [`#L65-L78`](https://github.com/yceffort/coldpath/blob/v0.6.0/lib/rollup.ts#L65-L78)

[^rolldown-runtime]: [`crates/rolldown/src/runtime/runtime-base.js#L31-L33`](https://github.com/rolldown/rolldown/blob/v1.2.12/crates/rolldown/src/runtime/runtime-base.js#L31-L33). `__toESM`은 [`#L61-L70`](https://github.com/rolldown/rolldown/blob/v1.2.12/crates/rolldown/src/runtime/runtime-base.js#L61-L70), `__toCommonJS`는 [`#L71-L74`](https://github.com/rolldown/rolldown/blob/v1.2.12/crates/rolldown/src/runtime/runtime-base.js#L71-L74)에 있다.

[^esbuild-metafile]: 종류 문자열은 [`internal/ast/ast.go#L43-L64`](https://github.com/evanw/esbuild/blob/v0.28.2/internal/ast/ast.go#L43-L64), metafile을 쓰는 코드는 [`internal/bundler/bundler.go#L2516-L2521`](https://github.com/evanw/esbuild/blob/v0.28.2/internal/bundler/bundler.go#L2516-L2521)에 있다.

[^rollup-moduleinfo]: [`src/rollup/types.d.ts#L193-L212`](https://github.com/rollup/rollup/blob/v4.64.0/src/rollup/types.d.ts#L193-L212)(Rollup v4.64.0)

[^rollup-commonjs]: Rollup 문서의 [Importing CommonJS](https://rollupjs.org/introduction/#importing-commonjs): "Rollup can import existing CommonJS modules through a plugin."
