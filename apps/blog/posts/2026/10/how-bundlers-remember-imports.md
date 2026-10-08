---
title: '번들러는 import를 어떻게 기억하는가'
tags:
  - bundler
  - debugging
  - compiler
published: true
date: 2026-10-08 23:04:00
description: 'Turbopack 분석 파일의 동기 의존성을 정적 import로 해석한 coldpath의 분류 오류를 추적했다. webpack, Turbopack, Vite, esbuild의 그래프 정보와 산출물을 비교하고, 원래 구문을 판별할 수 있는 단서와 복원할 수 없는 경우를 살펴본다.'
series: 'coldpath 제작기'
seriesOrder: 4
art:
  undraw: buggy-code
---

## Table of Contents

## `require()`를 정적 import라고 설명한 제안

coldpath 0.6.0으로 Turbopack 빌드를 분석하다가 이상한 제안을 발견했다. `require()`로 가져온 모듈에 "정적 import 체인이 닿는다"는 설명이 붙어 있었다. 아래는 이 문제를 재현한 페이지다. ESM 모듈은 정적 import로, CommonJS 모듈은 `require()`로 가져오고, 두 모듈의 계산 함수는 각각 버튼을 눌러야 실행된다.

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

첫 진입과 CommonJS 버튼 클릭의 실행 기록을 각각 수집해 분석하자 `heavy-cjs.js`에 다음 제안이 붙었다. 출력에서 제안의 종류와 설명만 옮겼다.

```json
{
  "kind": "split-review",
  "explanation": "A static import chain reaches this source, and part of it executes initially. Consider separating the later-only functionality before introducing import(); deferring the whole module may break initial behavior."
}
```

페이지에서 `heavy-cjs.js`를 가져오는 코드는 3번 줄의 `require()`다. 그런데 coldpath는 이 의존성을 그래프에 정적 import로 기록했고, 그 분류를 바탕으로 설명을 만들었다. 소스의 구문과 분석 결과가 어긋난 이유부터 찾아야 했다.

이 차이가 어디서 사라지는지 확인하려면 번들러가 내보낸 기록과 산출물을 함께 봐야 했다. [소스맵 없이 토스증권의 JavaScript를 추적한 글](/2026/09/tracing-third-party-javascript-without-sourcemaps)에서는 coldpath의 복원 그래프를 설명하며 이렇게 적었다.

> webpack의 생성 코드에서는 정적 import와 `require()`가 같은 호출이 되므로 대부분 `unknown`이다.

토스증권의 청크는 Next.js가 쓰는 `webpackChunk_N_E` 전역에 등록돼 있었고, 당시 살펴본 모듈 호출에는 이 설명이 맞았다. 그런데 같은 입력을 여러 번들러로 빌드해 보니 호출 자체가 최적화로 사라지기도 했고, Turbopack처럼 분석 파일에 없는 구분이 런타임 호출에는 남기도 했다. 처음 발견한 설명의 오류도 Turbopack의 분석 파일에 기록된 동기 의존성을 모두 정적 import로 해석한 데서 생겼다.

이번에는 번들러가 `import`와 `require()`의 차이를 어디에 남기는지 살펴봤다. webpack의 stats, Turbopack의 분석 파일, Vite 플러그인의 모듈 정보, esbuild의 metafile을 브라우저가 받는 산출물과 비교했다. 여기서 원래 구문을 어디까지 알아낼 수 있는지 확인하고, 그 결과를 바탕으로 coldpath의 분류를 고친 뒤 제안이 어떻게 바뀌는지 버전별로 따라갔다.

> 기본 실험은 2026년 10월 4일, macOS(arm64)와 Node.js 24.20.0에서 진행했다. 번들러 버전은 webpack [`v5.111.1`](https://github.com/webpack/webpack/tree/v5.111.1), Next.js [`v16.3.8`](https://github.com/vercel/next.js/tree/v16.3.8)(Turbopack, 내장 webpack 5.98.0), Vite 8.3.2와 그 빌드를 맡는 Rolldown [`v1.2.12`](https://github.com/rolldown/rolldown/tree/v1.2.12), esbuild [`v0.28.2`](https://github.com/evanw/esbuild/tree/v0.28.2)로 고정했다.
>
> coldpath는 npm 배포본을 썼다. 10월 8일에, 10월 4일 수집한 실행 기록과 분석 파일을 0.6.0, 0.6.1, 0.8.0, 0.8.1, 0.8.2로 각각 다시 분석해 버전별 결과를 비교했다. Vite의 부수 효과 import 반례는 10월 5일에 확인했다. 실험 코드와 측정값은 `yceffort/blog-experiments` 저장소의 [`bundler-import-memory`](https://github.com/yceffort/blog-experiments/tree/main/bundler-import-memory)에 있다.

이 글에서 자주 쓰는 용어는 다음 뜻으로 쓴다.

- **간선**: 의존성 그래프에서 한 모듈이 다른 모듈을 가져오는 연결 하나다. `entry.js`가 `esm-dep.js`를 가져오면 `entry.js -> esm-dep.js`가 간선 하나이고, 그 연결을 만든 구문(정적 import, `require()`, 동적 `import()`)을 간선의 종류라고 부른다.
- **정적 import 체인**: 진입점에서 어떤 모듈까지 정적 import 간선만으로 이어진 경로다.
- **복원 그래프**: 번들러의 그래프 정보 없이 산출물의 모듈 호출만 읽어 다시 만든 의존성 그래프다. coldpath의 `modules --graph`가 만든다.
- **어댑터**: 번들러마다 다른 그래프 정보를 coldpath의 그래프 형식으로 옮기는 coldpath의 코드다.
- **지정자**: `'./cjs-dep.js'`처럼 import나 `require()`에 넘기는 경로 문자열(specifier)이다.
- **최상위**: 함수 안이 아니라 모듈 본문에서 바로 실행되는 자리다. 최상위 `require()`는 그 모듈이 실행될 때 함께 실행된다.
- **모듈 함수**: 번들러가 모듈 하나의 코드를 감싸 만든 함수다. webpack과 Turbopack 산출물은 이 함수를 id로 찾아 실행한다.
- **네임스페이스 객체**: `import * as ns`로 받는, 모듈의 export를 모은 객체다.
- **orphan**: webpack stats에서 어느 청크에도 들어가지 않은 모듈이다.
- **추적(traced) 대상**: Turbopack이 번들에 넣지 않지만 실행할 때 필요해서 배포 파일 목록에 남기는 파일이다. 정적 자산이나 번들 밖 외부 패키지가 여기에 해당한다.
- **조건부 해석**: `package.json` `exports`의 조건(`import`, `require`, `browser` 등)에 따라 다른 파일을 고르는 해석이다.

## 일곱 가지 경우를 담은 입력

비교에 쓴 입력은 아래 `entry.js` 하나다. import와 `require()`로 ESM과 CommonJS를 가져오는 경우를 넣고, 부수 효과 import와 쓰지 않는 import, 동적 import도 추가했다. 각 의존 모듈에는 `'M_ESM_DEP'` 같은 고유한 문자열을 넣어 산출물에서도 찾을 수 있게 했다.

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

`package.json`에는 `type` 필드를 두지 않았고, `"sideEffects": ["./src/side-effect.js"]`로 부수 효과가 있는 파일을 하나만 선언했다. 번들러에 넘긴 진입점 `src/index.js`는 `run()`을 호출해 결과를 전역 변수에 담기만 한다. Next.js 빌드에서는 `pages/index.jsx`에서 `run()`을 호출해 그 결과를 화면에 표시한다.

그래프 정보는 아래 방법으로 읽었다. 프로덕션 산출물은 코드를 축소한 버전과 축소하지 않은 버전으로 만들었고, Next.js 내장 webpack만 축소본으로 비교했다.

| 번들러                    | 그래프 정보                                   | 얻는 방법                                                 |
| ------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| webpack 5.111.1           | stats JSON의 `modules[].reasons`              | `stats.toJson({reasons: true, orphanModules: true, ...})` |
| Turbopack(Next.js 16.3.8) | `.next/diagnostics/analyze/data/modules.data` | `next experimental-analyze --output`                      |
| Vite 8.3.2(Rolldown)      | 플러그인 훅의 `this.getModuleInfo(id)`        | `generateBundle` 훅에서 모든 모듈을 조회                  |
| esbuild 0.28.2            | metafile의 `inputs[].imports`                 | `metafile: true`                                          |

## webpack: stats와 산출물에 남는 정보

### stats의 reason에 남는 것

webpack stats의 `reasons`에는 해당 모듈을 가져오는 모듈과 의존성의 종류가 기록된다. 아래는 모듈 연결(module concatenation, 여러 모듈을 한 함수 범위로 합치는 최적화)을 끈 빌드(`optimization.concatenateModules: false`)에서 `entry.js`와 연결된 reason만 모은 것이다. 모듈 연결을 켠 기본 빌드와의 차이는 뒤에서 다룬다.

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

import는 `harmony`로 시작하는 문자열로, `require()`는 `cjs require`로 남고, 모든 reason에 `줄:열-열` 위치가 붙는다. 이 문자열은 의존성 클래스마다 정의된 `type` 게터에서 온다. stats를 만들 때는 그 값을 그대로 옮겨 적는다.[^1]

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

1번 줄의 import 문에는 reason이 두 개 붙어 있다. `harmony side effect evaluation`은 import 선언의 위치(`1:0-35`), `harmony import specifier`는 가져온 이름을 실제로 쓰는 위치(`9:10-16`)를 가리킨다. `sideEffects`로 부수 효과가 없다고 선언된 모듈은 선언 위치의 reason이 `inactive`가 되고 사용 위치만 활성으로 남는다.

쓰지 않아서 번들에서 빠진 `unused-dep.js`도 orphan 모듈로 stats에 남아 있다. stats에서는 산출물에 포함되지 않은 import까지 확인할 수 있다. 다만 orphan 표시만으로 번들에서 빠졌다고 판단할 수는 없다. 모듈 연결을 켠 기본 빌드에서는 진입점에 합쳐진 `entry.js`, `esm-dep.js`, `esm-required.js`도 orphan으로 표시됐다.

### 산출물의 모듈 호출은 같아질 수 있다

같은 페이지를 Next.js 16.3.8의 webpack 모드로 빌드하면 페이지 모듈의 앞부분이 이렇게 된다. Next.js에 내장된 webpack은 5.98.0이다.

```js
var E=n(72),t=n(5138),r=n.n(t);n(2199);let{cjsDep:s}=n(8030),{esmRequired:u}=n(4979);
```

`n`은 모듈 함수의 세 번째 인자로 들어오는 `__webpack_require__`를 축소한 이름이다. `n(5138)`은 2번 줄의 default import, `n(2199)`는 3번 줄의 부수 효과 import, `n(8030)`과 `n(4979)`는 5번과 6번 줄의 `require()`다. 1번 줄의 `esm-dep.js`는 페이지 모듈에 합쳐졌고, 함수 호출도 최적화로 사라져 `"M_ESM_DEP"`라는 문자열만 남았다.

stats에서 `harmony`와 `cjs require`로 구분되던 의존성이 산출물에서는 모두 `n(id)`라는 같은 모양의 호출이 됐다. 이 예제에서 default import의 흔적은 뒤에 붙은 `n.n(t)`에 남아 있다. CommonJS 모듈의 `module.exports`를 default로 꺼내는 호환 함수다.

두 구문이 같은 호출이 되는 과정은 webpack 5.111.1의 소스에서 확인했다. Next.js에 내장된 5.98.0의 소스까지 확인한 것은 아니다. import 문은 `RuntimeTemplate.importStatement`에서 전체를 새로 만든다.[^2]

```js
importContent = `/* harmony import */ ${optDeclaration}${importVar} = ${RuntimeGlobals.require}(${moduleId});\n`;
```

`require()`는 원래 코드를 부분적으로 치환한다. `CommonJsRequireDependency`가 인자 자리를 모듈 id로 바꾸고, 함께 등록되는 `RequireHeaderDependency`가 `require`라는 이름을 `__webpack_require__`로 바꾼다.[^3]

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

동적 import의 모양도 달랐다. Next.js 내장 webpack 산출물에서는 `n.e(990).then(n.bind(n,6990))`였고, coldpath 0.6.0은 이 `bind` 형태만 동적 간선으로 인식했다. webpack 5.111.1을 단독으로 쓰면 같은 자리가 `r.e(132).then(()=>r(132))`가 된다. 대상 환경이 화살표 함수를 지원하면 `bind` 대신 화살표 함수를 쓰기 때문이다.[^4] coldpath 0.6.0은 이 `r(132)`를 평범한 호출로 보고 `unknown`으로 분류했다.

수정한 복원 로직은 `n.e(chunk)`나 청크 로드 호출만 담은 `Promise.all([n.e(a), ...])` 뒤의 `.then`에 넘긴 화살표 함수도 동적 간선으로 인식한다. 다만 `Promise.resolve().then(() => n(id))`는 `unknown`으로 남긴다. 새 청크를 받지 않는 `import()`와 사용자가 작성한 `Promise.resolve().then(() => require(...))`가 같은 모양이 될 수 있기 때문이다. [수정 커밋 `90b7baa`](https://github.com/yceffort/coldpath/commit/90b7baa263b605e03a64969874b9b0dd44415577)에 이 구분과 검증 사례가 있다.

### 모듈 연결이 CommonJS로 확장된 뒤

모듈 연결이 적용되면 비교할 호출 자체가 사라질 수도 있다. 5.109.0(2026년 7월 23일)부터 정적으로 분석할 수 있는 CommonJS 모듈도 모듈 연결 대상이 됐고, 5.110.0(2026년 8월 27일)부터는 합친 모듈을 `__webpack_require__.cw`라는 지연 접근자로 감싸고 `require()`를 그 자리에 인라인한다.[^5] 같은 입력을 5.111.1 기본 설정으로 빌드한 결과는 이렇다.

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

이 빌드에서 `__webpack_require__(id)` 형태로 남은 호출은 동적 import의 `r(132)` 하나뿐이다. 2번 줄의 default import는 `__webpack_require__.n(cjs_default_namespaceFn())`로, 5번 줄의 `require()`는 `cjs_dep_namespaceFn()`로 남는다. 이 두 사례에서는 호환 함수가 단서가 되지만, 그 단서는 앞서 본 5.98.0의 `n.n(t)`에도 있었다.

CommonJS도 모듈 연결 대상이 되면서 산출물에서 모듈 경계와 호출이 사라지는 경우가 늘었다. ESM에서는 이전 버전에도 있던 최적화이고, 최신 버전에서도 연결 대상에서 빠진 모듈은 `__webpack_require__(id)`로 남는다. 결국 호출 모양으로 원래 구문을 알아낼 수 있는지는 버전만으로 정할 수 없다. 산출물에 어떤 호출이 남았고, 거기에 호환 처리가 붙어 있는지를 함께 봐야 한다.

### `"type": "module"` 패키지 안의 `require()`

같은 입력을 `"type": "module"`인 패키지에 넣고, CommonJS 파일 두 개만 `.cjs`로 바꿔 다시 빌드했다. 이번에는 `entry.js`가 ESM으로 판정되므로, 그 안의 `require()`를 번들러가 어떻게 처리하는지 볼 수 있다.

webpack 5.111.1은 에러 0건, 경고 0건으로 빌드를 마쳤다. 그런데 산출물에는 `require('./cjs-dep.cjs')`와 `require('./esm-required.js')`가 원래 코드 그대로 남아 있었고, stats 그래프에서는 두 모듈이 아예 빠져 있었다. `require`가 없는 환경(Node.js의 `vm` 컨텍스트)에서 이 산출물을 실행하면 `ReferenceError: require is not defined`가 난다.

원인은 webpack의 기본 규칙에 있다. `"type": "module"`인 패키지 안의 `.js`는 `javascript/esm` 타입으로 판정되고,[^6] CommonJS 구문을 해석하는 파서 훅은 `javascript/auto`와 `javascript/dynamic`에만 등록된다.[^7] 그래서 `javascript/esm` 모듈 안의 `require(...)`는 의존성으로 인식되지 않고 평범한 함수 호출로 남는다. Node.js에서도 ESM에는 `require`가 없다. 다만 webpack 빌드에서는 이 호출을 경고 없이 남겨 둔다.

| 번들러                      | 빌드                  | 산출물                                                               |
| --------------------------- | --------------------- | -------------------------------------------------------------------- |
| webpack 5.111.1             | 성공, 에러와 경고 0건 | `require()`가 그대로 남음, 실행 시 `ReferenceError`                  |
| Next.js 내장 webpack 5.98.0 | 실패                  | 페이지 데이터를 모으는 단계에서 `Cannot find module './cjs-dep.cjs'` |
| Turbopack                   | 성공, 경고 없음       | `require()`를 번들                                                   |
| Rolldown                    | 성공, 경고 없음       | 번들, `__toESM(..., 1)`로 Node.js 호환 방식의 default 처리           |
| esbuild                     | 성공, 경고 없음       | 번들, `__toESM(require_cjs_default(), 1)`                            |

Next.js의 webpack 모드에서 빌드가 실패한 것은 서버 번들에도 `require()`가 남았고, 빌드 중 페이지 데이터를 모으는 단계(`Failed to collect page data for /`)에서 그 서버 번들이 실행됐기 때문이다.

## Turbopack: 분석 파일에서 빠진 구분이 모듈 호출에 남는다

### `modules.data`의 구조

Next.js의 번들 분석기는 `next experimental-analyze`로 실행하고, `--output`을 붙이면 결과를 `.next/diagnostics/analyze/data/`에 파일로 남긴다. 모듈 사이의 의존성은 그중 `modules.data`에 들어 있다. JSON 헤더의 `modules`에는 모듈마다 `ident`와 `path`가 있고, 간선 목록은 별도의 이진 영역에 저장된다.[^8]

간선은 `module_dependencies`, `async_module_dependencies`, `traced_module_dependencies`와 그 역방향인 `*_dependents`까지 여섯 목록으로 나뉜다. 앞의 입력에서 클라이언트용 `entry.js`에 연결된 간선을 읽으면 다음과 같다.

```text
module_dependencies        src/entry.js -> src/esm-dep.js
                           src/entry.js -> src/cjs-default.js
                           src/entry.js -> src/side-effect.js
                           src/entry.js -> src/cjs-dep.js
                           src/entry.js -> src/esm-required.js
async_module_dependencies  src/entry.js -> src/lazy-dep.js
```

동기 의존성 다섯 개가 한 목록에 들어 있다. 각 간선에는 import와 `require()`를 구분하는 정보도, 소스의 위치나 지정자도 없다. 쓰지 않은 `unused-dep.js`는 목록에서 아예 빠져 있다. webpack stats에서 orphan으로 볼 수 있었던 import가 여기에는 기록되지 않는다.

### 내부 그래프에는 구분이 있었다

Turbopack 내부에서는 import와 `require()`를 서로 다른 참조 타입으로 다룬다. 각 참조의 `ChunkingType`에는 청크에 포함되는 방식이 정해져 있다. ESM import(`EsmAssetReference`)와 CommonJS `require()`(`CjsRequireAssetReference`)는 모두 `Parallel`이지만 필드 값이 다르다.[^9]

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

`ChunkingType`의 주석을 보면 `inherit_async`는 의존하는 모듈이 비동기일 때 이를 가져오는 모듈도 비동기가 되는지를 나타낸다. 최상위 `await`를 쓰는 모듈이 이런 경우에 해당한다. 주석에는 "ESM import에서는 그래야 하지만 CommonJS require에서는 아니다"라고 적혀 있다. `hoisted`는 가져온 모듈을 항상 먼저 실행하는지, 즉 ESM import의 실행 순서를 따르는지를 나타낸다. 같은 파일의 다른 CommonJS 참조(`CjsAssetReference`, `require.resolve()`의 `CjsRequireResolveAssetReference`)도 `require()`와 같은 값을 쓴다. 따라서 이 값으로는 ESM import와 CommonJS 참조를 구분할 수 있고, CommonJS 참조끼리는 구분할 수 없다.

이 차이는 분석기에서 `modules.data`를 만들 때 사라진다. `analyze_module_graphs`는 그래프를 순회하면서 추적(traced) 대상인지를 먼저 확인한다. 나머지 간선은 `chunking_type`에 따라 목록에 넣는다.[^10]

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

`Async`가 아닌 간선은 `Parallel`의 두 필드 값에 관계없이 모두 `_` 분기에서 처리된다. 저장하는 값도 `(부모, 자식)` 쌍뿐이어서 `inherit_async`와 `hoisted`의 차이는 분석 파일에 남지 않는다.

### 산출물에는 `e.i`와 `e.r`로 남는다

같은 페이지를 Turbopack으로 빌드한 산출물에서 페이지 모듈은 다음과 같다.

```js
350,e=>{"use strict";var t=e.i(1398),r=e.i(9422);e.i(1323);let{cjsDep:n}=e.r(1934),{esmRequired:o}=e.r(2989);e.s(["default",0,function(){return(0,t.jsx)("p",{children:String(["M_ESM_DEP",(0,r.default)(),n(),o(),globalThis.M_SIDE_EFFECT,()=>e.A(3105).then(e=>e.lazyDep())].slice(0,5))})}],350)}
```

`e`는 모듈 함수가 받는 `__turbopack_context__`다. 2번 줄의 default import는 `e.i(9422)`, 3번 줄의 부수 효과 import는 `e.i(1323)`, 5번과 6번 줄의 `require()`는 `e.r(1934)`와 `e.r(2989)`가 됐다. 1번 줄의 `esm-dep.js`는 scope hoisting(여러 ESM 모듈을 한 모듈 함수로 합치는 최적화)으로 페이지 모듈에 합쳐져 문자열만 남았고, 동적 import는 `e.A(3105)`다. 3105번은 청크를 내려받은 뒤 실제 모듈을 불러오는 로더 모듈이다.

```js
3105,e=>{e.v(t=>Promise.all(["static/chunks/0214m9_id9iur.js"].map(t=>e.l(t))).then(()=>t(9131)))}
```

어떤 호출을 쓸지는 모듈을 가져오는 구문에 따라 달라진다. CommonJS 모듈을 import한 2번 줄은 `e.i`이고, ESM 모듈을 `require()`한 6번 줄은 `e.r`이다. 한 글자짜리 이름은 코드 생성기의 상수에 정의돼 있다.[^11]

```rust
pub const TURBOPACK_REQUIRE: &TurbopackRuntimeFunctionShortcut = make_shortcut!("r");
pub const TURBOPACK_ASYNC_LOADER: &TurbopackRuntimeFunctionShortcut = make_shortcut!("A");
pub const TURBOPACK_MODULE_CONTEXT: &TurbopackRuntimeFunctionShortcut = make_shortcut!("f");
pub const TURBOPACK_IMPORT: &TurbopackRuntimeFunctionShortcut = make_shortcut!("i");
```

두 호출의 역할은 런타임에서 확인할 수 있다. `i`는 네임스페이스 객체를 제공하고, `r`은 `module.exports`를 반환한다. CommonJS 모듈을 가져올 때는 같은 모듈을 가리켜도 반환값이 달라질 수 있다.[^12]

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

`i`는 네임스페이스 객체가 없으면 `interopEsm`으로 `module.exports`를 감싸고, 그 결과를 저장해 다음 호출에 재사용한다. 2번 줄처럼 CommonJS가 함수를 직접 내보낸 경우에는 `default`를 만들어 주므로 `(0,r.default)()`로 함수를 부를 수 있다. `r`은 `module.exports`를 그대로 돌려준다.

일반적인 동기 ESM에서는 `i`와 `r`이 같은 객체를 반환할 수도 있다. `esmExport`에서 `module.namespaceObject = exports`로 지정하기 때문이다.[^13] 호환 처리가 필요한 경우에 Turbopack은 `i` 안에서 처리하고, webpack은 `n.n(...)` 같은 함수를 호출 밖에 붙인다. 이번 Turbopack 산출물에서는 이 차이 덕분에 `i`와 `r` 호출로 간선 종류를 구분할 수 있었다. 다만 다른 모듈에 합쳐진 ESM import는 호출 자체가 사라져 복원 대상에서 빠진다.

### 블로그 빌드에서 확인한 차이

이 블로그(Next.js 16.3.5, 커밋 `f1ff09a9`)에서도 `next experimental-analyze --output`과 `next build`를 실행해 분석 파일과 산출물을 비교했다. `modules.data`에는 모듈이 6,659개 있었다. 클라이언트 동기 간선을 서로 다른 경로 쌍으로 세면 3,600개였다. 각 파일의 소스를 파싱하고 지정자를 Node.js의 `require` 해석 규칙으로 풀어, 그래프에 연결된 모듈과 일치하는지 확인했다.[^14] 산출물에서는 소스맵을 뺀 `.next/static`의 JavaScript 109개를 coldpath의 `modules --graph`로 분석해 간선을 복원했다.

| 관측 지점                                      |  간선 |     import | `require()` | 그 밖          |
| ---------------------------------------------- | ----: | ---------: | ----------: | -------------- |
| `modules.data`의 클라이언트 동기 간선(경로 쌍) | 3,600 |      2,051 |         588 | 판정 못 함 961 |
| 산출물에서 복원한 간선                         |   986 | 456(`e.i`) |  496(`e.r`) | 동적 34        |

소스의 `require()` 호출과 연결 대상을 모두 확인한 간선은 588개로, 전체 경로 쌍의 16.3%였다. 모두 `node_modules` 안에 있었고, 주로 `next/dist`의 CommonJS 산출물에서 나왔다.

판정하지 못한 961개 중 201개는 가져오는 파일에 문자열 지정자의 `require()`가 있었지만, 어느 호출에서 나온 간선인지는 찾지 못했다. 나머지에는 `process` 폴리필, SWC가 주입한 `@swc/helpers`, JSX 변환이 주입한 `jsx-runtime`, `react`를 `next/dist/compiled/react`로 바꾸는 별칭처럼 소스와 맞추기 어려운 간선도 있다. 따라서 이 집계로 확인한 것은 588개이고, 전체 `require()` 간선이 최대 몇 개인지까지는 알 수 없다.

블로그 코드(`apps/blog`와 `packages/shared`)에서 나가는 경로 쌍 193개는 판정하기가 더 어려웠다. import로 확인한 것은 16개뿐이고 177개는 판정하지 못했다. 대상이 블로그 파일인 91개 중 74개는 `@/` 경로 별칭(46개)이나 확장자를 생략한 상대 경로(28개)라서 Node.js 규칙으로 풀리지 않았다. 패키지를 가리키는 46개에는 앞의 `react` 별칭이나, pnpm이 피어 의존성 조합마다 따로 설치한 `next`처럼 번들러가 고른 파일과 Node.js 규칙으로 푼 파일이 다른 경우가 섞여 있었다. 나머지 40개는 JSX 변환이 주입한 `jsx-runtime`(38개)과 폴리필(2개)이다. 이 블로그 코드에는 `require()`가 없으므로 종류를 잘못 고를 일은 없지만, 소스와 맞춰 확인할 수 있는 간선은 그만큼 적었다.

산출물에서 복원한 간선 중에는 `e.r`이 절반을 넘었다. scope hoisting으로 ESM 모듈끼리 한 모듈 함수로 합쳐지면 그 사이의 import 간선은 사라진다. 반면 별도 모듈 함수로 남은 CommonJS 모듈을 부르는 `e.r`은 복원 대상에 남는다.

이 차이가 비율에 영향을 줄 수는 있지만, 표의 두 행은 집계 대상부터 다르다. 산출물에서 복원한 모듈 함수는 청크 91개에 걸쳐 677개(중복을 빼면 339개)였고, 복원하지 못한 id를 가리키는 호출 527개는 간선에서 빠졌다. 따라서 비율 차이를 모두 scope hoisting의 효과로 보기는 어렵다.

## Vite: 형식 호환 처리가 남기는 단서

### `getModuleInfo`는 import와 `require()`를 한 목록에 담는다

Vite 8은 빌드에 Rolldown을 쓴다. 플러그인에서는 Rollup과 같은 API인 `this.getModuleInfo(id)`로 그래프를 읽을 수 있다. 앞의 입력에서 `entry.js`의 모듈 정보를 조회하면 다음과 같다.

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

`importedIds` 7개에는 import 4개, `require()` 2개, 그리고 Vite가 동적 import를 처리하면서 주입한 `\0vite/preload-helper.js`가 함께 들어 있다. Rolldown이 이 목록을 채우는 코드를 보면, 의존성 기록의 종류 중 `Import`, `Require`, `NewUrl`(`new URL(..., import.meta.url)`)을 같은 집합에 넣는다.[^15]

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

Rolldown 내부에서는 의존성의 종류를 기록하지만, 플러그인에 공개하는 목록에서는 Turbopack처럼 import와 `require()`를 합친다. 소스의 위치도 기록하지 않는다. 다만 쓰지 않은 `unused-dep.js`는 Turbopack과 달리 목록에 남아 있다. `inputFormat`의 `es`와 `cjs`는 조회한 모듈 자체의 형식이다. 형식을 판단할 구문이 없는 `side-effect.js`는 `unknown`으로 나온다. 이 값으로 해당 모듈을 어떤 구문으로 가져왔는지는 알 수 없다.

coldpath의 Vite 분석에서는 처음에 본 분류 오류가 없었다. Vite와 Rollup용 플러그인은 `transform` 훅에서 각 모듈의 소스를 미리 파싱한다. 이후 `getModuleInfo`에서 읽은 간선과 소스 구문을 맞춰 종류와 위치를 붙인다.[^16] 0.6.0으로 같은 입력의 그래프를 만들어 보면 `cjs-dep.js`와 `esm-required.js`가 각각 5행 18열과 6행 23열의 `require`로 나온다. `entry.js`에서 나가는 간선 중 위치가 없는 것은 소스에 없는 `preload-helper.js` 하나뿐이었다.

### 산출물의 도우미 함수가 알려 주는 범위

같은 입력의 산출물에서는 동기로 가져오는 ESM 모듈의 선언이 최상위로 올라가고, CommonJS 모듈은 지연 실행 래퍼로 감싸진다. 축소하지 않은 산출물에서 해당 부분을 옮기면 다음과 같다.

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

이 예제에서는 도우미 함수에서 원래 구문의 흔적을 찾을 수 있다. CommonJS 모듈을 import한 2번 줄은 `__toESM(...)`로 감싸 `default`를 만든다. `require()`한 5번 줄은 `require_cjs_dep()`를 그 자리에서 호출한다. ESM 모듈을 `require()`한 6번 줄에는 네임스페이스를 CommonJS 객체 모양으로 바꾸는 `__toCommonJS(...)`가 붙는다.

ESM끼리의 import인 1번 줄은 별도 모듈 호출 없이 함수 선언만 최상위로 올라왔다. CommonJS 모듈을 감싼 `__commonJSMin`은 처음 호출될 때 모듈 본문을 한 번 실행하는 래퍼다.[^17]

```js
export var __commonJSMin = (cb, mod) => () => (
  mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports
);
```

도우미 함수만으로 원래 구문을 알아낼 수 없는 경우도 있다. 다음은 전역 변수에 값을 쓰는 CommonJS 모듈이다.

```js
// dep.cjs
'use strict'
globalThis.CJS_SIDE_EFFECT = Math.random()
module.exports = {value: 1}
```

이 모듈을 부수 효과 import로 가져오는 입력 A와 `require()`로 가져오는 입력 B를 비교했다. 두 입력 모두 이어서 `globalThis.finished = true`를 실행한다.

```js
// 입력 A
import './dep.cjs'
globalThis.finished = true
```

```js
// 입력 B
require('./dep.cjs')
globalThis.finished = true
```

Vite 8.3.2(Rolldown 1.2.12)의 프로덕션 빌드에서 두 입력의 축소 산출물은 완전히 같았다.[^18] 두 산출물 모두 `dep.cjs`의 부수 효과와 CommonJS 래퍼 호출을 포함했고, 네임스페이스 변환 함수는 없었다. 이 경우에는 산출물만 보고 원래 구문을 구분할 수 없다.

`//#region` 주석도 모듈 경계와 정확히 일치하지는 않는다. 앞의 산출물에서는 원본 2번 줄에서 나온 `import_cjs_default` 선언이 `side-effect.js` 구간에 들어가 있다. 코드를 축소하면 도우미 이름도 한 글자로 바뀌므로 `v=o(...)`, `u(y)` 같은 호출 형태를 보고 역할을 추적해야 한다. 모듈별 함수 등록부도 없어서 coldpath의 `modules`로는 이 산출물의 모듈 경계를 복원하지 못했다.

앞서 일곱 가지 경우를 넣은 `entry.js`를 esbuild로 빌드해도 비슷한 호환 처리가 남았다. 기본 입력의 결과를 나란히 놓으면 다음과 같다.

| 줄  | 경우                      | Rolldown                               | esbuild                                                     |
| --- | ------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| 1   | ESM에서 import            | 최상위로 끌어올림                      | 최상위로 끌어올림                                           |
| 2   | CommonJS를 default import | `__toESM(__commonJSMin(...)())`        | `__toESM(require_cjs_default())`                            |
| 3   | 부수 효과 import          | 문장을 그대로 인라인                   | 문장을 그대로 인라인                                        |
| 5   | CommonJS를 `require()`    | `require_cjs_dep()`                    | `require_cjs_dep()`                                         |
| 6   | ESM을 `require()`         | `__toCommonJS(esm_required_exports)`   | `(init_esm_required(), __toCommonJS(esm_required_exports))` |
| 9   | 동적 `import()`           | `__vitePreload(() => import(...), [])` | `import(...)`                                               |

esbuild는 `require()`로 가져온 ESM 모듈을 `__esm` 래퍼로 감싸 `require()` 시점에 초기화한다. 그래프 정보에서도 원래 구문을 구분할 수 있다. metafile의 `imports`에는 `import-statement`, `require-call`, `dynamic-import`가 구분돼 있고 원래 지정자(`original`)도 있다. 다만 metafile에 기록하는 값은 `path`, `kind`, `original`과 import 속성뿐이고, 외부 모듈이면 `original` 대신 `external: true`가 붙는다. 소스의 위치는 알 수 없다.[^19]

## coldpath에서 고친 것

### 소스를 읽어 간선의 종류와 위치를 고치기

coldpath 0.6.0의 Turbopack 어댑터는 `modules.data`의 세 목록을 이렇게 옮겼다.[^20]

```ts
for (const [field, kind] of [
  ['module_dependencies', 'static'],
  ['async_module_dependencies', 'dynamic'],
  ['traced_module_dependencies', 'unknown'],
] as const) {
```

이 코드에서는 동기 간선이 모두 `static`이 된다. 이후 소스를 파싱해 위치를 붙이는 단계(`enrichLocations`)에서도 종류가 같은 구문만 연결했다. 그래서 소스에 있는 `require()`를 찾고도 그 위치를 붙이지 못했다. coldpath는 분석 경로의 모든 간선이 `static`일 때 "정적 import 체인"을 전제로 제안한다. 처음 본 `page-loader -> index.jsx -> heavy-cjs.js` 경로에는 두 간선 모두 `static`으로 기록돼 있었다.

0.6.1에서는 소스에서 확인할 수 있는 동기 간선부터 다시 분류했다. 가져오는 파일을 파싱해 `require()` 호출의 대상과 그래프의 대상이 같으면 `require`로 바꾼다. 이 파일에 인식한 `require()`가 있지만 어느 import나 `require()`로도 연결 대상을 설명할 수 없으면 `unknown`으로 두고 경고에 개수를 남긴다. 나머지는 기존의 `static`을 유지한다. 구현은 [분류 수정 `58b1a6a`](https://github.com/yceffort/coldpath/commit/58b1a6a8395d4a95fdf46b6decc985dafadcbca6)와 [패키지 지정자 대응 수정 `fec91ef`](https://github.com/yceffort/coldpath/commit/fec91ef351ea732a547051f1682ccc1bbbea2b97)에서 볼 수 있다.

패키지 이름은 가져오는 파일을 기준으로 Node.js의 `require` 해석 규칙에 따라 풀고, 패키지의 `exports`에 선언된 대상 파일도 후보로 비교한다. 상대 경로는 확장자를 생략한 경우까지 후보를 차례로 대 본다. 번들러의 별칭과 조건부 해석을 모두 재현하지는 않는다. 그래프에 이미 연결된 모듈을 소스의 어느 구문에서 가져왔는지 찾는 데 이 후보들을 쓴다.

앞에서 본 것처럼 산출물의 `e.i`와 `e.r`로도 간선 종류를 구분할 수 있다. 그래도 수정에는 소스를 읽는 방법을 썼다. `modules.data`의 모듈 항목에는 `ident`와 `path`만 있어서 `e.r(1934)` 같은 산출물의 숫자 id와 바로 이어지지 않고, 분석 파일과 산출물은 따로 실행한 결과다. 블로그 빌드에서 본 것처럼 산출물에서 복원할 수 있는 간선은 일부이고, 다른 모듈에 합쳐진 ESM import는 호출 자체가 남지 않는다. 산출물의 호출에는 소스 위치도 없다. 제안에서 해당 코드를 찾아가려면 어차피 소스를 읽어야 했고, 소스를 읽으면 구문의 종류도 함께 알 수 있었다.

수정 전후의 그래프를 비교하면 다음과 같다. 앞에서는 클라이언트 경로 쌍만 셌지만, 여기서는 어댑터가 만든 그래프 전체에서 위치별 간선까지 세었다. 오른쪽 열은 0.8.2로 다시 내보낸 결과이고, 간선 수와 종류, 위치는 0.6.1부터 같았다.

| 측정                                    | coldpath 0.6.0               | 0.8.2                                                      |
| --------------------------------------- | ---------------------------- | ---------------------------------------------------------- |
| 재현 페이지 그래프에서 위치가 붙은 간선 | 284개 중 3                   | 284개 중 245                                               |
| 블로그 그래프 간선 종류                 | `static` 3,881, `dynamic` 64 | `static` 3,052, `require` 678, `unknown` 172, `dynamic` 64 |
| 블로그 그래프에서 위치가 붙은 간선      | 2,083                        | 2,895                                                      |
| 블로그 코드에서 나가는 간선             | `static` 208, `dynamic` 4    | 같음                                                       |
| 그중 위치가 붙은 간선                   | 212개 중 28                  | 212개 중 51                                                |

블로그 그래프의 간선이 3,945개에서 3,966개로 늘어난 이유는 한 파일에서 같은 모듈을 여러 번 가져오면 위치마다 간선을 남기기 때문이다. 서로 다른 모듈 쌍은 수정 전후 모두 3,941개로 같다. `unknown` 172개에는 `require()`를 쓰는 파일에 JSX 변환으로 주입된 `jsx-runtime`처럼 소스에서 찾을 수 없는 간선도 섞여 있다.

읽을 소스가 없거나 인식한 `require()`가 없는 파일에는 기존의 `static` 추정이 남아 있다. Next.js가 만든 가상 모듈 `[next]/entry/page-loader.ts`에서 페이지로 가는 간선이 그런 경우다. 산출물에서는 `e.r` 호출이지만 여전히 `static`으로 기록된다. 따라서 남은 `static` 간선을 모두 소스에서 확인한 정적 import로 볼 수는 없다.

블로그 코드는 위치를 붙이기도 어려웠다. 블로그 코드끼리 잇는 간선 109개 중 위치가 붙은 것은 31개뿐이다. 위치가 없는 78개 중 47개는 `@/` 경로 별칭으로, 10개는 `@yceffort/shared` 하위 경로로 가져온 간선이다. 둘 다 Node.js 규칙으로는 풀리지 않는 지정자다.

### 간선을 고친 뒤 제안이 바뀐 과정

간선의 종류와 위치를 바로잡았다고 처음의 제안이 바로 나아지지는 않았다. 10월 4일에 수집한 같은 실행 기록을 coldpath 버전마다 다시 분석하면 `heavy-cjs.js`의 제안은 이렇게 바뀐다. 그래프도 각 버전으로 다시 내보냈다.[^21]

| coldpath     | `index.jsx -> heavy-cjs.js` 간선 | `heavy-cjs.js` 제안 |
| ------------ | -------------------------------- | ------------------- |
| 0.6.0        | `static`, 위치 없음              | `split-review`      |
| 0.6.1, 0.8.0 | `require`, 3행 18열              | `inspect-imports`   |
| 0.8.1        | 최상위 `require`, 3행 18열       | `split-review`      |
| 0.8.2        | 최상위 `require`, 3행 18열       | `defer-review`      |

0.6.1의 `inspect-imports`는 경로가 정적 import 체인도 아니고 `import()`를 지나지도 않을 때 내는 마지막 분기다. 0.6.1은 경로의 간선이 모두 `static`일 때만 정적 import 체인으로 봤기 때문에, `require` 간선이 하나라도 끼면 이 분기로 넘어갔다.[^22] 설명도 "import 그래프와 부수 효과를 살펴본 뒤 지연 로딩 경계를 정하라"는 일반적인 문장이다. 간선 종류는 바로잡았지만 제안은 오히려 근거를 잃은 셈이다.

최상위에서 호출한 `require()`는 import처럼, 가져오는 모듈이 실행될 때 대상 모듈을 바로 실행한다. 지연 로딩을 검토할 때 정적 import 체인과 다르게 볼 이유가 없다. 그래서 0.8.1([`0e83423`](https://github.com/yceffort/coldpath/commit/0e834233526653d643f26b23d0acfab1dcfa4607))부터는 어댑터가 `require` 간선이 최상위 호출인지를 `topLevel`로 기록하고, 분석기는 정적 import와 최상위 `require()`로만 이어진 경로를 동기 체인으로 본다.[^23]

```rust
impl ImportStep {
    /// Static imports and top-level require() calls evaluate the target while the importer evaluates.
    pub fn synchronous(&self) -> bool {
        self.kind == ImportKind::Static
            || (self.kind == ImportKind::Require && self.top_level == Some(true))
    }
}
```

블로그 그래프의 `require` 678개 중 661개가 최상위 호출이었다. 나머지 17개 중 8개는 UMD 래퍼 안의 호출이다. 최상위가 아닌 `require()`나 `unknown` 간선이 낀 경로에는 동기 체인을 전제로 하는 제안이 붙지 않는다.

0.8.1에서 제안은 다시 `split-review`가 됐고, 설명의 앞부분도 "A synchronous import chain (static imports or top-level require() calls)"로 바뀌었다. 다만 "part of it executes initially"라는 뒷부분은 남았다. 첫 진입에서 이 모듈이 실행한 것은 모듈 함수가 `t.exports`에 객체를 대입하는 코드뿐이었는데, Turbopack 산출물에서 `heavy-cjs.js`의 마지막 소스맵 매핑이 바로 뒤 `index.jsx` 모듈 함수의 시작 부분까지 이어져 그 실행이 이 모듈의 함수 실행으로 집계됐기 때문이다.[^24] 매핑 범위를 모듈 함수의 경계에서 자르는 수정([`9c89cbc`](https://github.com/yceffort/coldpath/commit/9c89cbc9239a04e29d14e35e591895a0a74733df))과 CommonJS 내보내기 대입을 최상위 부수 효과에서 빼는 수정([`34f908b`](https://github.com/yceffort/coldpath/commit/34f908bbc186503a31f58352f353e84bdc825a30))이 들어간 0.8.2에서 `heavy-cjs.js`에는 다음 제안이 붙었다.

```json
{
  "kind": "defer-review",
  "explanation": "A synchronous import chain (static imports or top-level require() calls) reaches this source. Initially only its top-level declarations were evaluated, with no calls, constructions or property writes other than CommonJS exports; its functions execute in this interaction. Review moving the import behind this interaction and rebuild to measure transfer savings."
}
```

간선 종류만 고친 0.6.1에서는 제안이 일반적인 문장으로 물러났고, 최상위 `require()`를 동기 간선으로 다루고 실행 판정까지 고친 뒤에야 버튼을 누를 때만 쓰이는 모듈이라는 재현 페이지의 의도에 맞는 제안이 나왔다.

이 제안은 `require()`를 버튼 클릭 뒤로 옮기는 것을 검토해 보라는 뜻이다. 이번에는 제안이 바뀌는 과정까지 확인했고, 실제로 코드를 옮겼을 때 동작이나 전송량이 어떻게 달라지는지는 측정하지 않았다.

## import와 `require()`의 차이가 남는 곳

같은 입력을 빌드해도 원래 구문을 확인할 수 있는 곳은 번들러마다 달랐다. 그래프에 구문 종류가 기록돼 있는지, 산출물에 이를 알아볼 단서가 남는지를 정리하면 다음과 같다.

| 번들러         | 그래프 정보                                              | 산출물의 단서와 한계                                                                                 |
| -------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| webpack        | stats의 reason에 종류와 위치가 있음                      | 모듈 호출 자체는 같아질 수 있고, 일부 호환 처리는 단서가 됨. 모듈 연결로 호출과 경계가 사라지기도 함 |
| Turbopack      | `modules.data`는 import와 `require()`를 동기 목록에 합침 | 남은 `e.i`와 `e.r` 호출은 구분 가능. 합쳐진 ESM import는 별도 호출이 없음                            |
| Vite(Rolldown) | `importedIds`는 import와 `require()`를 합침              | 일부 형식 호환 함수가 단서가 됨. 부수 효과 import와 `require()`가 같은 산출물이 되는 반례가 있음     |
| esbuild        | metafile의 `kind`는 구분되지만 위치는 없음               | 기본 입력의 형식 호환 함수는 단서가 됨. 합쳐진 ESM import는 별도 호출이 없음                         |

산출물에서 import와 `require()`를 구분하는 데에는 호환 처리가 단서가 됐다. Turbopack은 이를 `i` 안에서 처리했고, webpack은 모듈을 가져온 뒤 `n.n(...)` 같은 함수를 붙였다. 다만 Vite에서 부수 효과 import와 `require()`가 같은 산출물이 된 것처럼, 실행에 필요한 동작이 같으면 원래 구문의 차이는 남지 않을 수 있다.

그래프를 읽을 때도 API가 무엇을 기록하는지 확인해야 했다. webpack stats의 `reasons`에서는 구문의 종류와 위치, 활성 여부를 알 수 있었지만, Next.js의 `modules.data`에서는 동기와 비동기, 추적 대상인지만 구분할 수 있었다. Rolldown의 `getModuleInfo`는 Rollup 플러그인 API를 따라 의존 대상을 `importedIds`와 `dynamicallyImportedIds`로 나눈다.[^25] Rollup은 CommonJS를 플러그인으로 처리하고,[^26] Rolldown은 직접 처리하는 `require()`도 `importedIds`에 넣는다. 같은 목록에 들어 있다는 이유로 소스의 구문까지 같다고 가정하면, coldpath에서 겪은 것과 같은 분류 오류가 생긴다.

coldpath에서는 그래프에 연결된 모듈을 소스의 어느 구문에서 가져오는지 확인해 분류를 고쳤다. 다만 구문의 종류를 바로잡는 것만으로는 제안이 나아지지 않았다. 최상위 `require()`가 import와 같은 시점에 실행된다는 점을 반영하고, 첫 진입에서 실행된 코드를 모듈 경계에 맞게 나눈 뒤에야 `heavy-cjs.js`에 `defer-review`가 붙었다. 이제 제안에서 해당 모듈을 가져오는 3행 18열의 `require()`까지 찾아갈 수 있다.

이번 문제를 풀 때는 그래프에서 연결된 모듈을 찾고, 산출물에서 실제 호출을 확인하고, 소스에서 구문과 위치를 찾았다. 분리를 검토할 때도 이렇게 찾은 코드를 첫 진입과 상호작용에서 수집한 실행 기록과 함께 봐야 한다. 어떤 모듈이 연결돼 있는지에서 시작해, 어디서 가져오고 언제 실행되는지까지 확인할 수 있어야 분리할 코드를 구체적으로 짚을 수 있다.

[^1]: [`HarmonyImportSideEffectDependency.js#L53-L55`](https://github.com/webpack/webpack/blob/v5.111.1/lib/dependencies/HarmonyImportSideEffectDependency.js#L53-L55), [`CommonJsRequireDependency.js#L102-L104`](https://github.com/webpack/webpack/blob/v5.111.1/lib/dependencies/CommonJsRequireDependency.js#L102-L104). stats에 옮기는 코드는 [`DefaultStatsFactoryPlugin.js#L1548`](https://github.com/webpack/webpack/blob/v5.111.1/lib/stats/DefaultStatsFactoryPlugin.js#L1548)의 `object.type = dep ? dep.type : null;`이다.

[^2]: [`RuntimeTemplate.js#L2394`](https://github.com/webpack/webpack/blob/v5.111.1/lib/RuntimeTemplate.js#L2394)

[^3]: [`CommonJsRequireDependency.js#L330-L337`](https://github.com/webpack/webpack/blob/v5.111.1/lib/dependencies/CommonJsRequireDependency.js#L330-L337), [`RequireHeaderDependency.js#L106-L107`](https://github.com/webpack/webpack/blob/v5.111.1/lib/dependencies/RequireHeaderDependency.js#L106-L107)

[^4]: [`RuntimeTemplate.js#L1593-L1597`](https://github.com/webpack/webpack/blob/v5.111.1/lib/RuntimeTemplate.js#L1593-L1597)의 `deferredCall`. `supportsArrowFunction()`이 참이면 화살표 함수를, 아니면 `bind`를 쓴다.

[^5]: [webpack v5.109.0](https://github.com/webpack/webpack/releases/tag/v5.109.0)의 "Concatenate CommonJS modules with statically analyzable exports", [v5.110.0](https://github.com/webpack/webpack/releases/tag/v5.110.0)의 "Wrap concatenated modules in lazy `__webpack_require__.cw` accessors and inline `require()`".

[^6]: [`config/defaults.js#L1275-L1281`](https://github.com/webpack/webpack/blob/v5.111.1/lib/config/defaults.js#L1275-L1281)에서 `descriptionData: {type: "module"}`인 `.js`에 `esm` 규칙을 적용하고, 그 규칙의 타입은 [`#L1244-L1245`](https://github.com/webpack/webpack/blob/v5.111.1/lib/config/defaults.js#L1244-L1245)의 `JAVASCRIPT_MODULE_TYPE_ESM`이다.

[^7]: [`CommonJsPlugin.js#L260-L265`](https://github.com/webpack/webpack/blob/v5.111.1/lib/dependencies/CommonJsPlugin.js#L260-L265)

[^8]: [`crates/next-api/src/analyze.rs#L368-L375`](https://github.com/vercel/next.js/blob/v16.3.8/crates/next-api/src/analyze.rs#L368-L375). 헤더 구조체는 [`#L110-L125`](https://github.com/vercel/next.js/blob/v16.3.8/crates/next-api/src/analyze.rs#L110-L125), 모듈 항목은 [`#L70-L74`](https://github.com/vercel/next.js/blob/v16.3.8/crates/next-api/src/analyze.rs#L70-L74)에 있다.

[^9]: [`references/esm/base.rs#L672-L686`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript/src/references/esm/base.rs#L672-L686), [`references/cjs.rs#L152-L162`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript/src/references/cjs.rs#L152-L162). 같은 파일의 `CjsAssetReference`는 [`#L85-L90`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript/src/references/cjs.rs#L85-L90), `CjsRequireResolveAssetReference`는 [`#L301-L311`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript/src/references/cjs.rs#L301-L311)에서 같은 값을 쓴다. 필드의 주석은 [`turbopack-core/src/chunk/mod.rs#L347-L356`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-core/src/chunk/mod.rs#L347-L356)에 있다.

[^10]: [`crates/next-api/src/analyze.rs#L534-L541`](https://github.com/vercel/next.js/blob/v16.3.8/crates/next-api/src/analyze.rs#L534-L541). 추적 대상을 거르는 조건은 바로 위 [`#L519-L532`](https://github.com/vercel/next.js/blob/v16.3.8/crates/next-api/src/analyze.rs#L519-L532)에 있다.

[^11]: [`turbopack-ecmascript/src/runtime_functions.rs#L69-L72`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript/src/runtime_functions.rs#L69-L72)

[^12]: [`runtime-utils.ts#L467-L484`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript-runtime/js/src/shared/runtime/runtime-utils.ts#L467-L484), [`#L509-L515`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript-runtime/js/src/shared/runtime/runtime-utils.ts#L509-L515)

[^13]: [`runtime-utils.ts#L221-L239`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript-runtime/js/src/shared/runtime/runtime-utils.ts#L221-L239)의 `esmExport`. 236행에서 `module.namespaceObject = exports`로 지정한다.

[^14]: 판정 스크립트는 [`scripts/blog-edges.mjs`](https://github.com/yceffort/blog-experiments/blob/main/bundler-import-memory/scripts/blog-edges.mjs)에 있다. 한 파일에서 갈라진 부분 모듈끼리 잇는 간선은 세지 않았다.

[^15]: [`crates/rolldown/src/module_loader/module_task.rs#L157-L171`](https://github.com/rolldown/rolldown/blob/v1.2.12/crates/rolldown/src/module_loader/module_task.rs#L157-L171)

[^16]: [`lib/rollup.ts#L30-L38`](https://github.com/yceffort/coldpath/blob/v0.6.0/lib/rollup.ts#L30-L38), [`#L65-L78`](https://github.com/yceffort/coldpath/blob/v0.6.0/lib/rollup.ts#L65-L78)

[^17]: [`crates/rolldown/src/runtime/runtime-base.js#L31-L33`](https://github.com/rolldown/rolldown/blob/v1.2.12/crates/rolldown/src/runtime/runtime-base.js#L31-L33). `__toESM`은 [`#L61-L70`](https://github.com/rolldown/rolldown/blob/v1.2.12/crates/rolldown/src/runtime/runtime-base.js#L61-L70), `__toCommonJS`는 [`#L71-L74`](https://github.com/rolldown/rolldown/blob/v1.2.12/crates/rolldown/src/runtime/runtime-base.js#L71-L74)에 있다.

[^18]: 2026년 10월 5일에 Node.js 24.20.0, Vite 8.3.2, Rolldown 1.2.12로 추가 실험을 진행했다. 재현 스크립트는 [`scripts/interop-counterexample.mjs`](https://github.com/yceffort/blog-experiments/blob/main/bundler-import-memory/scripts/interop-counterexample.mjs), 입력과 산출물 원문은 [`results/interop-counterexample.json`](https://github.com/yceffort/blog-experiments/blob/main/bundler-import-memory/results/interop-counterexample.json)에 있다. 실험 디렉터리에서 `node scripts/interop-counterexample.mjs`로 실행한다.

[^19]: 종류 문자열은 [`internal/ast/ast.go#L43-L64`](https://github.com/evanw/esbuild/blob/v0.28.2/internal/ast/ast.go#L43-L64), metafile을 쓰는 코드는 [`internal/bundler/bundler.go#L2516-L2521`](https://github.com/evanw/esbuild/blob/v0.28.2/internal/bundler/bundler.go#L2516-L2521)에, 외부 모듈을 쓰는 코드는 [`#L2478-L2482`](https://github.com/evanw/esbuild/blob/v0.28.2/internal/bundler/bundler.go#L2478-L2482)에 있다.

[^20]: [`lib/graph.ts#L295-L299`](https://github.com/yceffort/coldpath/blob/v0.6.0/lib/graph.ts#L295-L299). 종류가 같은 자리만 받아들이는 조건은 [`#L140`](https://github.com/yceffort/coldpath/blob/v0.6.0/lib/graph.ts#L140)에 있다.

[^21]: 버전별 그래프와 분석 결과는 [`results/coldpath-versions`](https://github.com/yceffort/blog-experiments/tree/main/bundler-import-memory/results/coldpath-versions)에 있고, [`scripts/coldpath-versions.sh`](https://github.com/yceffort/blog-experiments/blob/main/bundler-import-memory/scripts/coldpath-versions.sh)로 다시 만들 수 있다. 실행 기록과 같은 10월 4일 빌드의 `.next`가 있어야 한다.

[^22]: [`src/recommendations.rs#L45-L47`](https://github.com/yceffort/coldpath/blob/v0.6.1/src/recommendations.rs#L45-L47)에서 모든 간선이 `static`인 경로만 정적 import 체인으로 보고, [`#L89-L94`](https://github.com/yceffort/coldpath/blob/v0.6.1/src/recommendations.rs#L89-L94)의 마지막 분기에서 `inspect-imports`를 낸다.

[^23]: [`src/graph.rs#L38-L45`](https://github.com/yceffort/coldpath/blob/v0.8.2/src/graph.rs#L38-L45). 이 판정을 쓰는 분기는 [`src/recommendations.rs#L49-L98`](https://github.com/yceffort/coldpath/blob/v0.8.2/src/recommendations.rs#L49-L98)에 있다.

[^24]: 청크 `0mlnz1g9-icsv.js`에서 `heavy-cjs.js`의 마지막 매핑(1376열 `}},`)은 다음 매핑인 `index.jsx`의 1417열 직전까지 이어지고, 그 사이에 첫 진입에서 실행된 `index.jsx` 모듈 함수의 시작(1384열 `e=>{`)이 들어 있다. `heavy-cjs.js` 모듈 함수의 실행 횟수는 1이고 안쪽 `compute`는 0이다. 확인 과정은 [`FINDINGS.md`](https://github.com/yceffort/blog-experiments/blob/main/bundler-import-memory/FINDINGS.md)의 8-1절에 있다.

[^25]: [`src/rollup/types.d.ts#L193-L212`](https://github.com/rollup/rollup/blob/v4.64.0/src/rollup/types.d.ts#L193-L212)(Rollup v4.64.0)

[^26]: Rollup 문서의 [Importing CommonJS](https://rollupjs.org/introduction/#importing-commonjs): "Rollup can import existing CommonJS modules through a plugin."
