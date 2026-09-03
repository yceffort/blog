---
title: 'PR diff에서는 <em>보이지 않는 비용</em>: 우리는 사용자가 받는 코드를 리뷰하고 있지 않다'
tags:
  - frontend
  - bundle-analysis
  - performance
  - tree-shaking
  - code-review
published: true
date: 2026-05-03 15:50:00
description: '코드 리뷰가 놓치는 bundle 비용, PR에 어떻게 띄울 것인가.'
thumbnail: /thumbnails/2026/05/pr-diff-vs-bundle.png
art:
  layout: bands
  hue: cyan
  tone: light
  hero: 'PR diff → +200KB'
---

## Table of Contents

## 서론

코드 리뷰는 frontend에서 필요조건이지 충분조건이 아니다. 백엔드는 컴파일 산출물이 사용자에게 직접 도달하지 않는다. JVM bytecode가 어떻게 생겼는지, JIT가 어떻게 inlining했는지를 PR에서 따지는 사람은 없다. 그러나 frontend는 다르다. 사용자에게 도착하는 건 source가 아니라 bundle이고, 그 bundle은 PR diff에 나타나지 않는다.

리뷰어가 본 `import { Button } from '@/components'` 한 줄이 bundle에서 200KB가 되기도 하고, `package.json`에 추가된 한 줄이 의존성 트리 전체를 끌고 들어오기도 한다. PR diff의 +1줄과 production bundle의 +200KB 사이에는 사람이 보지 않으면 닫히지 않는 간극이 있다.

해법은 특정 import 패턴을 외워서 사람이 더 꼼꼼히 리뷰하는 것이 아니다. 그런 방식은 오래 가지 않는다. **source review만으로는 부족하다. PR에는 source diff뿐 아니라 artifact diff의 요약이 같이 올라와야 한다.** 그 계측이 빠져 있을 때 어디서 비용이 새는지 먼저 보고, 그다음에 어떻게 PR에 노출시킬지로 넘어간다.

## 왜 frontend에서는 이 문제가 더 직접적인가

백엔드에서도 산출물 크기는 운영 비용에 영향을 준다. cold start latency, 메모리 사용량, container image pull 시간 같은 것들. 그러나 일반적인 웹 요청에서 사용자가 그 코드를 직접 다운로드하고 파싱하고 실행하지는 않는다. 사용자에게 도착하는 건 HTTP response body다. JIT가 어떤 inline을 했든, GraalVM이 dead code를 어떻게 정리했든, 사용자 입장에서는 모르는 일이다.

frontend는 다르다. 사용자가 받는 것은 source 그 자체가 아니라 다음 변환을 거친 결과다.

1. 번들러가 모듈 그래프에서 추출한 chunk
2. tree-shaker가 살린 export
3. minifier가 mangling/scope hoisting/dead-code elimination 후 남긴 결과
4. compressor가 brotli/gzip으로 압축한 바이트
5. 브라우저가 parse → compile → execute해야 하는 JavaScript

PR diff는 1번 위쪽, source code만 보여준다. 그 이후의 변환은 PR에 나타나지 않는다. 변환 과정 어디에서든 한 줄 추가가 +200KB로 부풀어 오를 수 있고, 사람의 눈에는 그 부풀음이 보이지 않는다. 이 비용은 그대로 사용자 브라우저의 네트워크·파싱·컴파일·실행으로 전가된다.

게다가 이 변환은 환경에 민감하다. 같은 source가 다음 조건에 따라 다른 산출물을 낸다.

- 번들러 버전 (minor version 차이만으로도 chunking이나 최적화 결과가 달라질 수 있다)
- 번들러 종류 (Webpack, Turbopack, Rollup, esbuild의 tree-shaking 정책이 각자 다르다)
- 의존하는 패키지의 `sideEffects` 선언
- 환경 변수 (NODE_ENV, browserslist target)
- 번들러의 chunk 분할과 plugin 실행 순서
- 툴체인 버전 또는 플랫폼 의존 plugin 차이

같은 PR이 다른 환경에서 다른 bundle을 만든다. 산출물에 대한 가시성이 없으면 비용을 측정할 수 없을 뿐만 아니라 재현조차 안 된다.

## Bundle size는 사용자 비용의 일부일 뿐이다

카탈로그로 들어가기 전에 비용 모델을 먼저 잡아두자. 아래 패턴들은 모두 "bundle이 커진다"는 결과로 수렴하는데, 사용자에게 가는 진짜 비용은 bundle size 그 자체가 아니다. bundle size는 간접 지표다.

사용자에게 가는 비용은 네 단계로 쪼갤 수 있다.

1. **Network**: 다운로드 시간. 압축된 byte size에 비례, 사용자 네트워크에 따라 가변.
2. **Parse**: JavaScript engine이 파싱하는 시간. 원본 byte size에 비례, CPU에 따라 가변.
3. **Compile**: V8/JSC가 bytecode로 컴파일하는 시간. JavaScript의 양과 복잡도에 비례.
4. **Execute**: 실제 코드 실행 시간. 코드의 동작에 비례.

Brotli/gzip 통계로 "+12KB 늘었다"고 보고할 때, 실제로는 원본이 +60KB일 수 있고, parse/compile 비용은 그 원본 크기에 비례한다. 모바일 저사양 기기에서는 parse + compile만으로 수백 ms가 추가되기도 한다. 이게 LCP(Largest Contentful Paint)와 TBT(Total Blocking Time)를 직접 끌어내린다.

압축 후 bundle size는 lower bound이지 실제 비용이 아니다. 더 정확한 측정은 CrUX(Chrome User Experience Report) 데이터나 Real User Monitoring으로 LCP/INP의 분포 변화를 보는 쪽이다. 다만 PR 단의 빠른 피드백으로는 bundle size diff가 가장 싸고 가장 효과적인 proxy다. 진짜 비용까지 보려면 그 위에 RUM 모니터링이 따로 있어야 한다.

이걸 짚어두지 않으면 카탈로그가 "size에 영향을 주는 패턴들"로만 읽히고, 결론은 "size-limit 켰으니 끝"으로 흐른다. Network/Parse/Compile/Execute 4단계를 머리에 두고 카탈로그로 들어가자.

## 카탈로그: 코드에서는 무해하고, bundle에서는 터지는 것들

### 1. Barrel file (index.ts re-export)

```ts
// src/components/index.ts
export * from './Button'
export * from './Modal'
export * from './Chart' // 무거운 dependency 포함
```

사용처에서는 한 줄이다.

```ts
import {Button} from '@/components'
```

리뷰어 눈에는 깨끗하다. 그런데 bundle에는 `Chart`와 그 transitive dependency까지 들어갈 수 있다.

#### 왜 이렇게 되는가

tree-shaking이 작동하려면 번들러가 "이 export를 살리지 않아도 안전하다"는 것을 정적으로 증명할 수 있어야 한다. 그 증명의 첫 번째 조건이 `sideEffects` 선언이다. `package.json`에 `"sideEffects": false`가 명시되어 있고, 모든 모듈이 ESM `import`/`export`만 쓰고, top-level에서 부수효과(IIFE, register 호출, polyfill 패치 등)를 일으키지 않으면, 번들러는 안 쓴 export를 떼어낸다.

barrel은 번들러가 "이 re-export 경로를 제거해도 안전하다"고 증명해야 하는 범위를 넓힌다. `sideEffects` 선언이 없거나, re-export 대상 모듈에 top-level side effect가 있거나(예: `console.log`, `register()` 호출, polyfill 패치), CommonJS가 섞여 있으면 번들러는 보수적으로 해당 경로를 살린다. 모든 조건이 잘 맞으면 tree-shaking이 작동하지만, 조건 하나만 어긋나도 가지가 통째로 살아남는다.

ESM 표준 자체도 보수적이다. `export * from`은 namespace를 합치는 의미이고, 번들러가 "어떤 이름이 실제로 쓰이는지" 추적하지 못하면 전부 살린다. webpack은 `usedExports` 분석으로 이를 어느 정도 줄이지만, 모든 가지를 따라 들어가서 증명하는 비용이 들기 때문에 한계가 있다.

다만 barrel 자체가 늘 비용을 만드는 건 아니다. tree-shaking이 필요 없는 의도적인 구조, 예컨대 Node.js 서버 코드처럼 번들링을 하지 않는 환경이나 모든 export가 실제로 사용되는 작은 internal 모듈에서는 정당하다. 문제는 client bundle로 향하는 코드에서 barrel을 쓸 때다.

#### 실제로 얼마나 터지는가

같은 함수를 lodash와 lodash-es로 import해서 비교하면 차이가 명확하게 드러난다.

```ts
// lodash (CommonJS): 라이브러리 거의 전체가 들어옴
import {debounce} from 'lodash'

// lodash-es (ESM): debounce가 필요로 하는 helper만
import {debounce} from 'lodash-es'

// 또는 더 안전하게
import debounce from 'lodash/debounce'
```

전자는 `lodash` 전체에 가까운 양이 bundle에 들어가고, 후자는 `debounce` 구현과 그것이 의존하는 내부 helper만 가져온다. 차이는 자릿수 단위다. ESM이냐 CommonJS냐의 차이가 하나, barrel을 거치느냐가 둘이다.

Vercel 팀이 Next.js에 [`optimizePackageImports`](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports)를 넣은 이유가 정확히 이것이다. barrel을 가진 패키지를 빌드 타임에 직접 import로 자동 변환한다. 자동 적용 패키지 리스트에 `lucide-react`, `@mui/material`, `date-fns`, `lodash-es` 같은 이름이 들어 있다는 사실이, 이 패턴이 얼마나 흔한지를 거꾸로 증명한다. 다만 이 옵션은 여전히 `experimental.optimizePackageImports`로 안내되는 영역이라, 근본 해결이라기보다는 우회책에 가깝다.

실제로 [성능 분석 3편](/2025/06/web-performance-analysis-3)에서 비슷한 케이스를 추적한 적이 있다. `@web-memo/ui`라는 내부 UI 패키지가 `sideEffects: false`도 명시했고 실제 사용처도 없는데, `recharts` 전체가 client bundle에 들어와 있었다. 원인은 여러 단계로 중첩된 barrel export 구조였고, webpack이 정확한 dependency graph를 만들지 못해 barrel 파일을 통째 블록으로 간주한 결과였다. `optimizePackageImports`로 우회는 가능하지만, 근본 해결은 `exports` 필드로 각 컴포넌트를 명시적으로 내보내는 것이다.

#### 어떻게 발견하는가

- `eslint-plugin-barrel-files`[^barrel-files]나 `eslint-plugin-no-barrel-files`[^no-barrel-files]로 정적 차단
- bundle analyzer treemap에서 import한 적 없는 컴포넌트가 chunk에 들어와 있는지 확인
- direct import와 barrel import로 같은 컴포넌트를 import하고 size-limit으로 차이 측정

세 번째가 가장 확실한 증명이고, 첫 번째가 가장 싸다.

### 2. Tree-shaking 안 되는 라이브러리 설치

`package.json`에 한 줄 추가했을 뿐인 PR을 본 적이 있을 것이다.

```diff
+ "moment": "^2.30.0"
```

코드 리뷰 코멘트는 보통 "라이브러리 추가 OK". 그런데 `moment`는 CommonJS 기반이고 locale 처리도 무거운 편이라 tree-shaking이 잘 작동하지 않는다. 빌드 설정과 locale 포함 여부에 따라 다르지만, gzip 기준으로도 수십 KB에서 100KB 이상까지 bundle을 늘릴 수 있다.

[성능 분석 2편](/2025/05/web-performance-analysis-2)에서도 같은 패턴을 추적한 적이 있다. production bundle을 펴 보니 사용하지도 않는 lodash 유틸들이 `__app` 변수에 통째로 박혀 있었다. lodash가 트리쉐이킹이 안 되는 라이브러리이기 때문이고, 이런 라이브러리는 한 줄 import가 사실상 "전체 import"로 작동한다.

#### 어떤 신호를 보고 의심해야 하는가

라이브러리 `package.json`을 펴서 다음을 확인한다.

- `"main"`만 있고 `"module"` 또는 `"exports"`가 없음 → CommonJS-only. tree-shaking 거의 불가능
- `"sideEffects"` 미선언 또는 `true` → 번들러는 "전부 살려야 안전하다"고 가정
- `"exports"` 필드에 ESM entry가 있어도 내부 구현이 dynamic require를 쓰면 무력화됨
- 라이브러리 자체가 barrel과 side effect를 같이 가짐 (예: top-level에서 plugin 등록)

#### 발견 방법

PR 시점에 잡는 도구는 [bundlephobia](https://bundlephobia.com)나 에디터의 [Import Cost extension](https://marketplace.visualstudio.com/items?itemName=wix.vscode-import-cost). CI에 size-limit이 깔려 있다면 추가 PR이 budget을 초과해서 fail하는 시점에 잡힌다. 라이브러리 추가 PR에 대한 별도 정책은 뒤에서 다시 다룬다.

### 3. 동적 import 경로

```ts
const mod = await import(`./locales/${lang}.json`)
```

번들러는 `./locales/*` 전체를 하나의 chunk 그룹으로 잡는다. 사용자가 한국어만 쓰는데, 30개 언어 JSON이 모두 production bundle에 chunk로 존재한다.

#### 왜 이렇게 되는가

`import()`의 인자가 정적 문자열이면 번들러는 정확히 한 모듈만 코드 분할한다. 인자가 template literal이나 변수면 번들러는 컴파일 타임에 어떤 모듈이 필요한지 결정할 수 없다. 그래서 "이 패턴에 매칭될 수 있는 모든 모듈"을 후보로 잡고 각각을 별도 chunk로 만들어둔다. 런타임에 어떤 lang이 들어오든 즉시 fetch 가능하게 하려는 보수적 결정이다.

코드 한 줄로는 의도가 보이지 않는다. "동적 import니까 lazy load겠지"라는 직관이 오히려 발목을 잡는다. lazy하게 fetch되긴 하지만, 그 chunk들이 빌드 산출물에 모두 존재한다.

#### 해결

가장 간단한 해결은 매니페스트를 명시적으로 두는 것이다.

```ts
const loaders = {
  ko: () => import('./locales/ko.json'),
  en: () => import('./locales/en.json'),
} as const

const mod = await loaders[lang]()
```

이러면 번들러가 정확히 두 chunk를 만든다. 또는 빌드 타임에 어떤 locale을 포함할지를 환경 변수로 fix하고, 그 외는 dynamic import 자체를 제거하는 방법도 있다. 어느 쪽이든 핵심은 어떤 모듈이 필요한지를 사람이 명시하는 것이다. 이 결정이 코드에 없으면, 번들러는 "다 포함해야 안전하다"는 쪽을 택한다.

[성능 분석 3편](/2025/06/web-performance-analysis-3)에서는 같은 패턴이 빌드 산출물뿐 아니라 런타임으로도 번지는 걸 확인한 적이 있다. `import('./locales/${lang}/translation.json')` 형태가 i18next 초기화에 걸려 있었는데, 매 SSR 요청마다 I/O와 초기화 비용이 다시 발생했다. 서버리스 환경에서는 cold start 비용까지 같이 늘어났다. dynamic 경로 한 줄의 비용은 client bundle에만 머물지 않는다.

### 4. RSC에서 'use client' 경계 침범

App Router에서 가장 조용히 새는 비용이고, 가장 잡기 어렵다.

```tsx
// app/page.tsx (server component)
import {ProductCard} from './ProductCard'
```

`ProductCard`가 client component이고, 그 안에서 무거운 차트 라이브러리를 import한다고 하자.

```tsx
// ProductCard.tsx
'use client'
import {Chart} from 'recharts'
```

서버 컴포넌트 트리에서 client component를 import하는 순간, 그 client component와 그것이 의존하는 모든 모듈이 client bundle에 들어간다.

#### 모듈 그래프 시점에서 본 메커니즘

Next.js의 RSC bundler는 모듈을 두 그래프로 분리한다. server graph와 client graph. `'use client'` 디렉티브는 그 경계를 표시하는 marker다. server module이 client module을 import하면 그 client module은 client graph의 진입점(entry)이 된다. 그리고 client module이 transitive하게 의존하는 모든 모듈이 그 entry의 chunk에 묶인다.

transitive 의존성이 자동으로 client로 따라온다는 것이 핵심이다. server에서만 쓰려고 했던 무거운 유틸리티가, client component 한 곳에서 import되는 순간 client로 넘어간다.

```ts
// utils/heavy-parser.ts (의도상 server-only)
import { parser } from 'fast-xml-parser' // 70KB

export function parseXml(input: string) { ... }
```

이 모듈을 client component에서 무심코 import하면:

```tsx
'use client'
import {parseXml} from '@/utils/heavy-parser'
```

`fast-xml-parser` 70KB가 client bundle로 따라온다. PR diff에서는 import 한 줄이고, 그 한 줄이 server graph에 있던 모듈 전체를 client로 넘긴다.

#### 크기 문제가 보안 문제로 바뀌는 경우

같은 RSC 경계에서 보안/데이터 노출 문제로 번지는 변형도 있다.

```ts
// shared/config.ts (server에서만 import한다고 가정)
export const internalSecret = process.env.SECRET
```

`process.env.SECRET`은 `NEXT_PUBLIC_` prefix가 없으므로 client build에서는 인라이닝되지 않는다. 거기까지는 안전하다. 그러나 이 모듈이 server에서 평가될 때는 실제 secret 값이 모듈 top-level 상수 `internalSecret`에 박힌다. 그 값이 server component를 거쳐 어떤 형태로든 렌더 결과로 흘러가면, 예를 들어 `<div data-config={internalSecret}>` 같은 형태로 props에 들어가거나 client component의 prop으로 전달되면, server-side 렌더링 결과 HTML과 RSC payload에 그대로 실린다. 사용자에게 노출된다.

PR diff에서는 그저 "server에서 환경 변수를 읽어 export하는 모듈"일 뿐이고, 그 export가 어디까지 흘러가는지는 호출 그래프를 따라가야 보인다. 이런 경로는 PR diff로는 잡히지 않는다.

#### 어떻게 잡는가

- [`server-only`](https://www.npmjs.com/package/server-only) / [`client-only`](https://www.npmjs.com/package/client-only) 패키지로 경계를 강제. 모듈 top에 `import 'server-only'`만 적어두면 client에서 import할 때 빌드가 깨진다. secret을 다루는 모듈에는 반드시 붙인다.
- [eslint-plugin-react-server-components](https://www.npmjs.com/package/eslint-plugin-react-server-components) 같은 lint 규칙
- Next.js Bundle Analyzer(Turbopack)나 `@next/bundle-analyzer`(Webpack)로 client chunk treemap을 직접 확인
- `next build` 출력의 First Load JS를 정기적으로 모니터링

그래도 transitive하게 새는 경우는 잡기 어렵다. server-only 마커가 모든 보호용 모듈에 일관되게 붙어 있어야 효력이 생긴다.

### 5. Transitive dependency duplication

A 라이브러리가 `zod@3.22`, B 라이브러리가 `zod@3.23`을 요구하면 npm/pnpm은 둘 다 설치한다. lockfile에서는 보이지만 PR diff에서는 안 보인다. bundle에는 zod가 두 번 들어간다.

#### 단순 중복이 아니라 버그가 되는 경우

이게 React, Vue 같은 큰 라이브러리에서 발생하면 단순한 크기 문제가 아니라 런타임 버그가 된다. 서로 다른 인스턴스의 React가 한 트리 안에서 동작하면 hooks가 깨지고, context가 안 통하고, `instanceof` 검사가 false가 된다. peer dependency가 정확히 이 문제를 막기 위한 메커니즘이지만, 잘못된 peer 범위 선언이나 강제 install로 우회되는 경우가 있다.

zod 같은 schema 라이브러리도 비슷하다. 한쪽에서 만든 schema 인스턴스를 다른 쪽에서 검증하려고 하면 `instanceof` 검사가 false가 되어 이상한 에러가 난다.

#### 발견과 해결

- `pnpm why <pkg>`나 `npm ls <pkg>`로 어떤 의존성 트리를 통해 들어오는지 확인
- pnpm/npm은 `overrides`, yarn은 `resolutions`로 강제 통일
- bundle analyzer treemap에서 두 번 등장하는 모듈을 시각적으로 확인
- CI에서 lockfile 기반으로 dedup 가능 여부를 정기 점검 (`pnpm dedupe --check`)

사람이 PR마다 자발적으로 하지는 않는다. CI 파이프라인에 한 번 깔아두면 된다.

### 6. 그 외에 짧게 짚을 패턴들

각각이 깊은 분석을 요구하기보다 위 패턴들과 같은 가족이라 묶어서 짧게 짚는다. 코드에서는 한 줄, bundle에서는 자릿수 단위 비용이라는 구조다.

**런타임 CSS-in-JS의 첫 사용 비용.** styled-components, emotion 같은 런타임 CSS-in-JS는 첫 사용 컴포넌트가 만들어지는 순간 런타임 라이브러리를 통째로 끌어온다. 이미 들어 있으면 무료, 없으면 갑자기 30KB+. App Router에서는 server component와의 호환성 문제 때문에 별도 wrapping이 추가로 필요해서, bundle size와 hydration cost가 같이 누적된다.

**Polyfill 자동 주입.** `core-js` 자동 주입은 `browserslist` 설정에 따라 수십 KB씩 흔들린다. 코드에는 흔적이 없다. browserslist 한 줄을 바꾼 PR이 bundle을 50KB 늘리거나 줄이는 일이 자주 있다.

**process.env 인라이닝과 secret leak.** `NEXT_PUBLIC_*` 환경 변수는 빌드 타임에 그대로 문자열로 박힌다. 실수로 `NEXT_PUBLIC_` prefix를 붙인 secret이 client bundle에 그대로 노출되는 사고가 가끔 일어난다. PR diff에서는 환경 변수 이름만 보이고, 그 값이 client bundle에 인라이닝된다는 사실은 보이지 않는다. 추가로, bundle에 박힌 환경 변수는 deploy 시점에 고정되므로 Vercel 같은 플랫폼에서 환경 변수만 바꿔도 새 build를 트리거하지 않으면 옛 값이 남는다.

**정적 자산의 namespace import.** `import * as Icons from '@/assets/icons'`로 200개 SVG를 통째로 import하면, 사용자가 한 화면에서 5개만 보는데 200개 전부가 빌드 산출물에 들어간다. 동적 import 경로 문제와 같은 구조다. 어떤 자산이 필요한지를 사람이 명시하지 않으면 번들러는 다 포함한다.

**dev와 prod의 동작 차이.** dev 모드는 HMR runtime 포함, minification 끔, tree-shaking 약하게 적용, React.lazy chunking 정책 다름 같은 차이가 있다. dev에서는 모든 client component가 한 chunk에 묶여 보이지만 prod에서는 route 단위로 쪼개진다. 그 결과 dev에서는 보이지 않던 "특정 route 진입 시 +120KB chunk fetch"가 prod에서만 발생한다. PR을 dev로만 검증하면 이 비용이 안 보인다.

## 그래서 어떻게 할 것인가

이 모든 것을 사람이 PR에서 일일이 잡는 운영은 오래 못 간다. 결론은 하나다.

> **코드만 리뷰하지 말고, 산출물의 변화도 PR에서 보이게 만들어라.**

사람이 bundle을 읽는 게 아니라, bundle의 변화를 사람이 읽을 수 있는 형태로 PR에 노출시키는 게 진짜 해법이다. 신뢰도 순으로 정리한다.

### 1. Bundle size diff를 PR comment로 (필수)

"+12KB" 같은 숫자가 PR에 자동으로 찍히는 순간, barrel 추가나 무거운 라이브러리 설치는 자동으로 가시화된다.

#### size-limit + size-limit-action

[size-limit](https://github.com/ai/size-limit)이 가장 일반적인 선택이다. `package.json`에 다음과 같이 budget을 정의한다.

```json
{
  "size-limit": [
    {
      "name": "main bundle",
      "path": ".next/static/chunks/main-*.js",
      "limit": "120 KB",
      "gzip": true
    },
    {
      "name": "page: /products",
      "path": ".next/static/chunks/pages/products-*.js",
      "limit": "40 KB"
    }
  ]
}
```

[size-limit-action](https://github.com/andresz1/size-limit-action)을 GitHub Action에 붙이면 PR마다 base branch와 비교한 size delta를 코멘트로 단다. budget을 초과하면 CI가 fail이다. budget이 fail의 근거이기 때문에, "왜 +30KB가 OK인가"를 PR에서 명시적으로 정당화하게 된다. 이게 사회적 압력으로 작동한다.

#### Next.js + Vercel 환경

Next.js 프로젝트라면 `next build` 출력, [Next.js Bundle Analyzer (Turbopack)](https://nextjs.org/docs/app/guides/package-bundling), `@next/bundle-analyzer` (Webpack)을 조합해 route별 client bundle 변화를 확인할 수 있다. Vercel에 배포한다면 GitHub integration이 PR마다 deploy preview를 코멘트로 달아주므로 preview URL과 deploy 정보가 같이 노출된다. 다만 bundle 정보가 PR 코멘트에 어떤 형태로 자동 노출되는지는 CI/Vercel 설정과 버전에 따라 달라지므로, 한 번 확인하고 켜는 것이 좋다.

#### bundlewatch

[bundlewatch](https://bundlewatch.io)는 size-limit과 비슷한 컨셉이지만 별도 서비스에 history를 누적해두는 구조다. base branch와의 비교가 더 정확하고, 시계열 변화를 대시보드로 본다.

어느 도구를 쓰든 핵심은 같다. 숫자가 PR 안에 들어와 있어야 한다. 외부 대시보드를 보러 가야 보이는 정보는 결국 안 보는 정보가 된다.

### 2. 작성 시점의 import 비용 가시화

CI보다 빠른 방어선은 에디터다. [vscode-import-cost](https://marketplace.visualstudio.com/items?itemName=wix.vscode-import-cost) 같은 extension은 import 한 줄 옆에 그 모듈의 크기를 표시한다.

```ts
import {debounce} from 'lodash' // 71.5K (gzipped: 25.3K)
import {debounce} from 'lodash-es' // 1.8K  (gzipped: 0.9K)
```

작성하는 그 순간에 옆에 숫자가 떠 있으면, 그 다음 줄을 적기 전에 멈추게 된다. CI보다 훨씬 싸고 훨씬 빠른 피드백이다. 단점은 강제력이 없다는 것. extension을 안 깔고 일하는 사람에게는 효력이 없다. 그래서 CI 단의 size-limit과 같이 가야 한다.

### 3. 정적 lint로 차단

도구 단에서 미리 막을 수 있는 것들.

- `eslint-plugin-import` (특히 `no-cycle`, `no-self-import`, `no-unused-modules`)
- `eslint-plugin-barrel-files`나 `eslint-plugin-no-barrel-files`
- `depcheck` / `knip`: 안 쓰는 의존성 탐지
- `server-only` / `client-only`: RSC 경계 강제
- `eslint-plugin-react-server-components`: RSC 규칙
- Next.js 자체의 [`optimizePackageImports`](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports): barrel을 가진 패키지를 자동 변환

PR comment보다 한 단계 위. 아예 코드에 들어오지 못하게 막는 단계다. 첫 번째 방어선으로 깔아두는 게 비용 대비 가장 효율이 좋다.

### 4. package.json 변경 PR에 대한 별도 정책

`package.json`이 변경된 PR에는 별도 reviewer나 별도 체크리스트가 필요하다. 도구가 아니라 프로세스 권고다. 의존성 한 줄을 추가하는 것은 코드 한 줄을 추가하는 것과 비용 구조가 다르다는 걸 팀이 합의해두는 것 자체가 의미가 있다.

체크리스트의 최소 항목은 다음 정도면 충분하다.

- bundlephobia나 packagephobia에서 size 확인 ([성능 분석 1편](/2025/05/web-performance-analysis-1)에서 늘 권하는 첫 단계)
- ESM 지원 여부 (`"module"` 또는 `"exports"` 필드)
- `sideEffects` 선언 여부
- 같은 기능을 하는 더 가벼운 대안이 있는지
- transitive dependency가 이미 들어 있는 라이브러리와 충돌하지 않는지

GitHub Action으로 "package.json이 diff에 있으면 별도 라벨을 붙이고 designated reviewer에게 ping" 같은 자동화를 걸면, 사람이 까먹어도 프로세스가 자동으로 작동한다.

### 5. Production 산출물에 대한 정기 점검

PR 단의 도구가 잡지 못하는 누적 비용이 있다. 이건 정기적으로 들여다보는 수밖에 없다.

- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)를 staging에 붙여서 LCP/TBT regression 추적
- Sentry source map 업로드해서 production에서 실제 어떤 코드가 도는지 추적
- 정기적으로 [`source-map-explorer`](https://github.com/danvk/source-map-explorer)나 webpack-bundle-analyzer로 treemap 점검
- RUM 도구 (Vercel Speed Insights, Sentry Performance, DataDog RUM 등)로 LCP/INP 분포 모니터링

PR 단의 size-limit이 이번 변경의 비용을 잡는다면, 정기 점검은 쌓여서 임계점을 넘은 비용을 잡는다. 둘은 보완 관계다.

## 그냥 매번 산출물을 push해서 빌드 결과를 비교하는 건 어떨까

여기까지 따라온 사람이라면 자연스럽게 떠오르는 발상이다. PR diff에서 산출물이 안 보이는 게 문제라면, 매 PR마다 빌드 결과까지 같이 push해서 git diff로 산출물의 변화를 보면 되지 않나? 가장 단순하고 직관적인 해법처럼 들린다.

권하지 않는다. 왜 안 되는지를 짚어두면 결론이 더 단단해진다.

### 1. Minified bundle은 인간이 읽을 수 있는 단위로 diff되지 않는다

`git diff`로 두 bundle을 비교하면 한 줄짜리 거대한 문자열 전체가 통째로 바뀐 것처럼 보인다. 변수명이 `a`, `b`, `c`로 mangling되어 있고, scope hoisting 때문에 함수 경계가 사라져 있고, 번들러의 chunk 분할이나 plugin 실행 순서에 따라 mangle 결과 자체가 달라질 수 있다. "이전과 이후의 비교"라는 행위가 의미 있는 단위로 정렬되지 않는다. 한 줄 코드 변경이 mangled bundle에서는 수백 줄 diff로 나타나고, 반대로 큰 의미 변화가 작은 diff로 보일 수도 있다.

이걸 해결하려고 unminified로 커밋하면 size가 자릿수 단위로 부풀어서 다음 문제로 직행한다.

### 2. Repo 크기 폭발

일반적인 SPA bundle은 압축 후 200KB~2MB. 매 PR마다 git에 들어가면 1년이면 수 GB 단위로 git history가 비대해진다. clone 시간이 폭증하고, GitHub LFS 비용이 들고, CI checkout 시간이 늘어난다. 모노레포에서는 더 빠르게 누적된다.

git은 같은 binary blob을 dedup하지만, minifier 출력처럼 매번 미세하게 다른 산출물에는 dedup이 거의 효과가 없다. shallow clone으로 임시방편 가능하지만, 그건 history를 보지 않겠다는 뜻이다. 그게 이 접근의 원래 목적이었으니 자기모순이 된다.

### 3. Source of truth 혼란

빌드 산출물이 repo에 있으면 누군가 산출물만 직접 수정하는 사고가 일어난다. 핫픽스 상황에서 "지금 빌드 돌릴 시간이 없으니 dist만 잠깐 고치자"가 발생한다. 그 순간 산출물이 source와 sync되어 있는지를 다시 검증해야 한다. 또 다른 검증 layer가 필요해진다는 뜻이다.

게다가 툴체인 버전이나 플랫폼 의존 plugin 차이로 환경 간 미세한 산출물 차이가 발생하는 경우가 있다. CI 환경과 로컬 환경이 같은 lockfile을 써도 OS별 binary 의존이나 plugin 동작 차이로 byte-level identical을 보장하기 어렵고, 그 결과 매 PR이 의미 없는 false-positive diff로 가득 찰 수 있다. 이걸 막으려면 빌드 환경을 docker로 완전히 고정해야 하는데, 그 비용을 들일 가치가 있는지는 별개의 질문이다.

### 4. 애플리케이션 frontend에서는 권장 관행이 아니다

라이브러리 배포 영역에서는 여전히 `dist/`를 커밋하는 프로젝트가 있다. CDN 직접 배포, 빌드 환경 없는 소비자 지원, generated artifact 리뷰 같은 목적에서다. 그러나 애플리케이션 frontend에서 빌드 산출물을 git history에 계속 누적하는 방식은 PR 리뷰 전략으로 권하기 어렵다. jQuery·Bootstrap 시대의 라이브러리 배포 관행에서는 흔했지만, 애플리케이션 bundle diff를 사람이 검토하기 위한 방법으로는 비용 대비 효용이 낮다. `.gitignore`에 `dist/`, `build/`, `.next/`를 넣는 것이 애플리케이션 쪽 표준이 된 데에는 이유가 있다.

### "그럼 deploy에는 안 쓰고, 비교 용도로만 push하면?"

여기까지 읽으면 더 좁은 변형이 떠오른다. dist를 deploy artifact로 쓰지 말고, 순수하게 비교 용도로만 매 PR마다 push해서 git diff로 산출물 변화를 확인하면 어떨까. 가장 합리적인 절충안처럼 보이지만, 위 반박들 중 핵심은 거의 그대로 살아 있다.

- minified bundle diff는 비교 용도라도 사람이 의미 단위로 못 읽는다. byte가 변했다는 건 알 수 있지만 "왜 +18KB인지"는 보이지 않는다. 비교의 정보 가치가 거의 없다.
- "비교용으로만"이라고 해서 git history에 누적되는 binary blob이 사라지지는 않는다. 별도 브랜치나 LFS로 분리하면 main history는 보호되지만, 그 시점에는 "그냥 git에 넣는다"의 단순함이 이미 사라진다.
- false positive가 비교 용도일수록 더 치명적이다. 환경 차이로 byte 차이가 한두 번 발생하는 순간 비교 신호 전체가 오염되고, 팀은 알람을 무시하기 시작한다.

unminified로 빌드해서 push하면 첫 번째 문제(diff 가독성)는 풀리지만, repo 크기가 자릿수 단위로 더 악화되고, minified production과 다른 산출물을 비교하게 되어 글의 출발점인 "사용자가 받는 코드"에서 오히려 멀어진다.

비교의 가치를 진짜로 살리려면 의미 단위로 비교 가능한 형태가 필요하다. 그건 stats JSON, size metric, module graph다. 그 시점에는 dist 자체를 git에 넣을 이유가 사라진다. 외부 시계열 서비스(RelativeCI, Codecov)가 정확히 이 발상이 정련된 형태다.

### 그런데 이 직관 자체는 절반 맞다

빌드 결과를 이전과 이후로 비교한다는 방향성은 옳다. 다만 비교 대상이 bundle 파일 자체가 아니라 bundle의 메타데이터여야 한다.

#### Bundle stats JSON

webpack/vite/rollup 모두 build 시 stats JSON을 뽑을 수 있다.

```json
{
  "entrypoints": {
    "main": { "size": 245678, "assets": ["main.abc123.js"] }
  },
  "modules": [
    { "name": "node_modules/lodash/index.js", "size": 71234 },
    { "name": "node_modules/react-dom/index.js", "size": 134567 }
  ],
  "chunks": [...]
}
```

bundle 파일 본체가 아니라 그래프와 size 정보만 들어 있는 JSON이다. bundle의 1/100 크기로 의미 단위 비교가 가능하다. 별도 브랜치(`bundle-stats`)에 누적하거나 외부 저장소에 보내는 식으로 history를 만들 수 있다. 직접 구축하면 도구가 빈약하다는 단점이 있다.

#### 외부 시계열 서비스

[RelativeCI](https://relative-ci.com)와 [Codecov Bundle Analysis](https://docs.codecov.com/docs/javascript-bundle-analysis)가 정확히 이 모델이다. bundle을 git에 넣지 않고 외부 저장소에 시계열로 누적하면서, PR마다 "지난 main 대비 +18KB, lodash가 새로 들어왔음" 같은 코멘트를 자동으로 단다. "이전과 이후의 비교"라는 원래 직관이 정확히 이런 형태로 구현되어 있다.

#### GitHub Actions artifact

매 빌드마다 webpack-bundle-analyzer의 HTML treemap을 90일 보관. git history에는 안 들어가지만, 언제든지 과거 시점의 산출물 구조를 시각적으로 볼 수 있다. 외부 서비스 도입이 부담스러운 환경에서 가장 가볍게 시작할 수 있는 형태다.

#### 정리

| 접근                                   | 권할 만한가               |
| -------------------------------------- | ------------------------- |
| Bundle 파일 자체를 git history에 커밋  | ❌ 한 세대 전 실패한 패턴 |
| Bundle stats JSON을 별도 브랜치에 누적 | △ 가능하지만 도구가 빈약  |
| RelativeCI / Codecov Bundle Analysis   | ✅ 가장 현실적            |
| GitHub Actions artifact로 treemap 보관 | ✅ 보조 수단으로 좋음     |

빌드 산출물 자체가 아니라 빌드 산출물의 그림자를 history에 남기는 것. 이 한 보정이 직관과 실무 사이의 거리를 메운다.

## 그래도 잘 안 켜져 있는 이유

여기까지의 도구들은 다 무료이고, 셋업도 한나절이면 된다. 그런데 실제로 frontend 프로젝트들을 둘러보면 이 중 하나도 안 켜져 있는 경우가 많다. 왜인가.

첫째, **단일 PR의 비용이 보이지 않기 때문이다.** "이번 PR이 +5KB"는 아무도 신경 쓰지 않는다. 그게 100번 쌓여야 +500KB가 되고, 그 시점에는 어느 PR이 원인이었는지 추적이 불가능하다. 누적 비용은 책임 소재가 분산되기 때문에 누구도 막지 않는다.

둘째, **도구를 켜는 순간 budget을 정해야 한다.** budget을 정하면 budget을 깨는 PR이 발생하고, 그 PR을 막을지 통과시킬지를 결정해야 한다. 결정 비용이 들기 시작하면 도구를 끄게 된다. 이걸 방지하려면 budget을 "현재 size + 약간의 여유"로 시작해서 점진적으로 조이는 운영 정책이 필요하다.

셋째, **false positive에 대한 피로다.** 툴체인 차이, lockfile 변경 없는 transitive update, 압축 전 입력의 미세한 차이가 압축 후 byte size에 비선형적으로 반영되는 경우 등으로 의미 없는 +1KB 알람이 가끔 발생한다. 이게 두세 번 반복되면 팀이 "또 그거"로 흘려버리기 시작한다. 막으려면 alarm 임계값을 적절히 잡아야 한다. 1KB 미만은 무시, 5KB 이상이면 코멘트, 50KB 이상이면 fail 같은 식의 단계적 대응.

이 세 가지를 모두 해결하지 못하면 도구는 도입되었다가 무력화된다.

## 마치며

frontend에서 "코드 리뷰가 충분하다"는 말은 절반만 참이다. 우리는 사용자가 받는 코드를 리뷰하고 있지 않다. PR diff에 +1줄로 보이는 변경이 사용자 브라우저에서 +200KB가 되는 비대칭은, 그 비용을 사람이 보는 자리로 끌어올리지 않는 한 닫히지 않는다.

여기서 제안한 해법은 새롭지 않다. 다 알려진 도구이고, 다 무료이고, 다 셋업이 어렵지 않다. 빠져 있는 건 그 도구들이 어디에 어떻게 배치되어야 하는지에 대한 관점이다. 사람이 bundle을 읽는 게 아니라 bundle의 변화가 사람의 시야에 강제로 들어와야 한다. 이 관점이 빠지면 도구 추천 글로 끝나고, 도구는 켜졌다가 꺼진다.

AI 에이전트가 자동으로 dependency를 추가하고 컴포넌트를 리팩토링하는 시대에는 이 비대칭이 사람의 속도가 아니라 에이전트의 속도로 누적된다. PR 한 개로 라이브러리 셋이 추가되고 barrel이 두 개 생기는 일이 일상이 될 때, "리뷰어가 꼼꼼히 보면 된다"는 방어선은 더 빠르게 무너진다. bundle size diff를 PR에 자동으로 띄우는 일은 그 시점에는 nice-to-have가 아니라 default가 되어 있어야 한다. 컴파일러 출력을 신뢰할 수 있게 만든 건 컴파일러가 아니라 그 주변의 검증 인프라였다는 사실을 받아들인다면, frontend에는 그 인프라가 절반만 있다는 사실부터 인정해야 한다.

[^barrel-files]: [eslint-plugin-barrel-files](https://npmx.dev/package/eslint-plugin-barrel-files) — barrel file과 관련된 흔한 실수를 잡는 ESLint 플러그인.

[^no-barrel-files]: [eslint-plugin-no-barrel-files](https://npmx.dev/package/eslint-plugin-no-barrel-files) — barrel file 자체를 disallow하는 ESLint 플러그인.
