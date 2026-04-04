---
title: 패키지 가이드 4탄) dependencies, devDependencies, peerDependencies
marp: true
paginate: true
theme: default
tags:
  - javascript
date: 2026-04-04
description: '세 가지 의존성 필드의 역사, 정의, 그리고 현대적 의미'
published: true
---

# 패키지 가이드 4탄) dependencies, devDependencies, peerDependencies

<!-- _class: invert -->

@yceffort

---

## 이 발표의 목표

- `dependencies`, `devDependencies`, `peerDependencies`가 **왜 생겼는지** 역사적 배경
- 각 필드의 **정확한 정의**
- 일반적인 서비스 프로젝트에서 **왜 구분이 중요하지 않은지**
- `peerDependencies`의 진짜 의미와 **mocha 플러그인 사례**
- 현대에 와서 **의미가 변질된 이유**
- 패키지 개발자로서 **주의할 점**
- `pnpm`으로 **올바르게 의존성 검사하는 법**

---

## 역사: npm 초기에는 `dependencies` 하나뿐이었다

<style scoped>section { font-size: 22px; }</style>

| 시기 | 버전    | 변화                                                |
| ---- | ------- | --------------------------------------------------- |
| 2010 | npm 0.x | `dependencies`만 존재. 모든 의존성을 한 곳에        |
| 2011 | npm 1.x | `devDependencies` 추가. 개발 도구와 런타임 분리     |
| 2013 | npm 1.3 | `peerDependencies` 추가. 플러그인 문제 해결         |
| 2015 | npm 3   | flat `node_modules` 도입, peerDeps 자동설치 제거    |
| 2020 | npm 7   | peerDeps 자동설치 부활, `peerDependenciesMeta` 추가 |

- 핵심: 처음부터 세 개가 있던 게 아니라, **문제가 생길 때마다 하나씩 추가**된 것

---

## `devDependencies`는 왜 생겼나?

<style scoped>section { font-size: 22px; }</style>

npm 초기에는 테스트 도구(`mocha`), 빌드 도구(`grunt`)도 전부 `dependencies`에 넣었음

```json
{
  "name": "my-library",
  "dependencies": {
    "lodash": "^1.0.0",
    "mocha": "^1.0.0",
    "grunt": "^0.4.0"
  }
}
```

**문제**: `npm install my-library` 하면 `mocha`, `grunt`까지 딸려옴

- 사용자는 `lodash`만 필요한데 테스트/빌드 도구까지 설치됨
- 설치 시간 증가, `node_modules` 비대화
- **해결**: 개발 시에만 필요한 것을 분리할 필드가 필요 → `devDependencies`

---

## 과거에는 `npm install --production`이 있었다

<style scoped>section { font-size: 20px; }</style>

번들러 없이 `node server.js`로 직접 실행하던 시절, devDeps를 빼서 이미지를 줄이는 패턴

```dockerfile
COPY package.json package-lock.json ./
RUN npm install --production    # devDependencies 제외
COPY dist/ ./dist/
CMD ["node", "dist/server.js"]
```

하지만 이 패턴은 **거의 사라지는 추세**:

- **Docker 멀티스테이지**: 빌드 스테이지에서 전부 설치 → 런타임 스테이지엔 결과물만 복사. 빌드 스테이지는 버려지므로 devDeps가 있어도 상관없음
- **서버리스 / Edge**: Vercel, Lambda, Workers 등은 **번들된 단일 파일**을 배포. `node_modules` 자체가 아티팩트에 포함되지 않음
- **프레임워크가 관리**: Next.js `output: 'standalone'`은 필요한 모듈만 자동으로 추림. 개발자가 직접 분류할 필요 없음

> `--production`이 유효한 건 번들러 없이 `node`로 직접 실행하는 레거시 서버 정도

---

## 각 필드의 정의

<style scoped>section { font-size: 20px; }</style>

### `dependencies`

> **이 패키지가 동작하기 위해 런타임에 반드시 필요한 패키지**

- `npm install my-package` 시 함께 설치됨
- 예: `lodash`, `express`, `react` (라이브러리가 직접 import하는 것)

### `devDependencies`

> **개발, 테스트, 빌드 시에만 필요한 패키지**

- `npm install my-package` 시 설치되지 **않음**
- `npm install` (패키지 자체 개발 시) 에서만 설치됨
- 예: `typescript`, `jest`, `eslint`, `rollup`

### `peerDependencies`

> **이 패키지가 동작하려면 호스트 프로젝트가 직접 설치해야 하는 패키지**

- 뒤에서 자세히 다룸

---

## 서비스 프로젝트에서는 왜 구분이 중요하지 않을까?

<style scoped>section { font-size: 22px; }</style>

```
                  ┌─────────────────────────┐
  패키지 A ──────►│                         │
  패키지 B ──────►│   서비스 (Next.js 앱)    │──── 번들 ───► 사용자
  패키지 C ──────►│                         │
                  └─────────────────────────┘
                    ▲ 의존성 체인의 "끝"
```

- 서비스 프로젝트는 **누군가에 의해 `npm install`되는 대상이 아님**
- `dependencies`에 넣든 `devDependencies`에 넣든 **빌드 시 전부 설치**됨
- webpack, vite 등 번들러는 `import` 그래프를 따라갈 뿐, `package.json` 필드를 구분하지 않음
- 대부분의 현대 배포(Vercel, Docker 멀티스테이지)는 **전체 설치 → 빌드 → 결과물만 배포**
- deps/devDeps를 잘못 분류했다고 서비스에 버그가 나는 경우는 거의 없음
- 관례적으로 분리하는 것이 **가독성** 면에서 좋을 뿐

> **패키지** 를 만들 때는 이야기가 완전히 달라진다

---

## `peerDependencies`는 왜 생겼나? — mocha로 이해하기

<style scoped>section { font-size: 20px; }</style>

`mocha`는 Node.js 테스트 러너. 요즘의 `jest`나 `vitest` 같은 역할

```js
// test/math.test.js
describe('add 함수', () => {
  it('1 + 2 = 3', () => {
    assert.strictEqual(add(1, 2), 3)
  })
})
```

여기서 핵심: **`describe`와 `it`을 어디서도 import하지 않았다**

- mocha는 테스트 파일을 실행하기 전에 `describe`, `it`, `before`, `after` 등을 **글로벌에 주입**
- 테스트 파일은 mocha가 만들어 놓은 글로벌 환경 위에서 동작
- 이건 jest도 마찬가지 — `describe`, `it`, `expect` 전부 import 없이 사용

> import 없이 동작한다 = **어떤 mocha 인스턴스가 글로벌을 세팅했느냐**가 중요하다

---

## mocha 플러그인의 문제

<style scoped>section { font-size: 18px; }</style>

mocha용 플러그인 `mocha-sugar`를 만든다고 가정. mocha의 글로벌 `it`을 확장하는 패키지

```js
// mocha-sugar/index.js — mocha의 글로벌 it을 감싸서 기능을 추가
const originalIt = global.it // ← mocha가 주입한 글로벌 it을 가져옴

global.it.todo = (title) => {
  originalIt(title, function () {
    this.skip() // ← mocha의 skip() API를 사용
  })
}
```

```js
// 사용하는 쪽
require('mocha-sugar')          // 글로벌 it을 확장
describe('my test', () => {
  it.todo('나중에 구현')         // ← mocha-sugar가 추가한 기능
  it('동작하는 테스트', () => { ... })
})
```

**`mocha-sugar`는 mocha를 직접 import하지 않지만, mocha가 세팅한 글로벌 환경에 의존한다**

---

## mocha가 두 벌이면 무슨 일이 생기나?

<style scoped>section { font-size: 18px; }</style>

`mocha-sugar`가 `mocha`를 `dependencies`에 넣으면?

```
my-project
├── mocha@10.0.0                     ← npx mocha가 실행하는 mocha (글로벌 세팅)
└── node_modules/mocha-sugar/
    └── node_modules/mocha@8.0.0     ← mocha-sugar가 가져온 다른 mocha
```

- `npx mocha`는 mocha@10이 `describe`, `it`을 글로벌에 세팅
- `mocha-sugar`는 자기 `node_modules`의 mocha@8을 참조
- **두 mocha의 글로벌 컨텍스트가 다름** → `this.skip()`이 mocha@10의 러너와 연결 안 됨
- 결과: 플러그인이 정상 동작하지 않거나, 알 수 없는 에러 발생

### peerDependencies로 해결

```json
{
  "name": "mocha-sugar",
  "peerDependencies": {"mocha": ">=6"}
}
```

→ mocha-sugar는 mocha를 직접 갖지 않음 → 호스트의 mocha@10 하나만 존재
→ 글로벌 `it`, `describe`가 **단일 mocha 인스턴스**에서 온 것이 보장됨

---

## peerDependencies의 핵심 원리

<!-- _class: invert -->

> **"나는 이 패키지가 필요하지만, 내가 가져오면 안 된다. 호스트가 가져와야 한다."**

이것이 필요한 패턴:

- **플러그인**: eslint-plugin-\*, babel-plugin-\*, mocha reporter
- **프레임워크 확장**: React 컴포넌트 라이브러리, Next.js 플러그인
- **싱글턴이 보장되어야 하는 패키지**: react, react-dom

---

## npm 3 — peerDeps의 혼란기 (2015)

<style scoped>section { font-size: 22px; }</style>

npm 3에서 `node_modules`를 **flat** 구조로 바꾸면서 큰 변화가 생김

**npm 1~2**: `peerDependencies`를 **자동으로 설치**해줌
**npm 3~6**: 자동 설치를 **제거**하고, 경고만 출력

```
npm WARN mocha-junit-reporter@2.0.0 requires a peer of mocha@>=6
but none is installed. You must install peer dependencies yourself.
```

- 이유: peerDeps 자동 설치가 버전 충돌을 유발하는 경우가 많았음
- 결과: 많은 개발자들이 peerDeps 경고를 **무시**하기 시작
- peerDependencies의 의미가 흐려지기 시작한 시점

---

## npm 7 — peerDeps 자동 설치 부활 (2020)

<style scoped>section { font-size: 22px; }</style>

npm 7에서 다시 peerDependencies를 **자동 설치**하도록 변경

```bash
npm install mocha-junit-reporter
# → mocha도 함께 설치됨 (peerDep이므로)
```

- 이 시점에서 많은 프로젝트가 깨지기 시작
- `--legacy-peer-deps` 플래그가 등장한 이유

```bash
npm install --legacy-peer-deps  # npm 3~6 방식으로 돌아감
```

동시에 `peerDependenciesMeta`도 추가:

```json
{
  "peerDependencies": {"react": "^18 || ^19"},
  "peerDependenciesMeta": {
    "react": {"optional": true}
  }
}
```

---

## 현대에 와서 의미가 변질된 이유

<style scoped>section { font-size: 20px; }</style>

### 1. 패키지 매니저마다 동작이 다름

| 패키지 매니저   | peerDeps 자동 설치 | 동작                                         |
| --------------- | ------------------ | -------------------------------------------- |
| npm 3~6         | ❌                 | 경고만                                       |
| npm 7+          | ✅                 | 자동 설치, 충돌 시 에러                      |
| yarn 1          | ❌                 | 경고만                                       |
| yarn berry (2+) | ❌                 | 자동 설치 안 함. PnP에서 누락 시 런타임 에러 |
| pnpm 7          | ❌                 | `auto-install-peers` 기본값 `false`          |
| pnpm 8+         | ✅                 | `auto-install-peers` 기본값 `true`로 변경    |

### 2. 원래 의도와 다른 사용

- 원래: "플러그인이 호스트 패키지를 참조"하기 위한 메커니즘
- 현재: "이 패키지를 같이 설치해야 한다"는 **단순한 알림** 용도로 변질
- `react`를 peerDep에 넣는 것은 원래 의미에 부합하지만, 단순히 "함께 쓰면 좋은 패키지"를 peerDep에 넣는 사례도 증가

---

## 요즘 peerDependencies 사례

<style scoped>section { font-size: 20px; }</style>

### 올바른 사용 — 싱글턴 / 플러그인 패턴

```json
// React 컴포넌트 라이브러리
{ "peerDependencies": { "react": "^18 || ^19", "react-dom": "^18 || ^19" } }

// ESLint 플러그인
{ "peerDependencies": { "eslint": ">=8" } }

// Tailwind 플러그인
{ "peerDependencies": { "tailwindcss": ">=3" } }
```

### 논쟁적 사용 — "같이 쓰면 좋은 것"

```json
// 어떤 상태관리 라이브러리의 React 바인딩
{
  "peerDependencies": {
    "react": "^18 || ^19", // ← 이건 맞음 (싱글턴)
    "immer": ">=9" // ← 이건 논쟁적 (dependencies로도 가능)
  }
}
```

- `immer`가 두 벌이어도 문제는 없지만, 번들 크기 최적화를 위해 peerDep으로 선언하는 경우도 있음

### 실용적 사용 — 사내 공통 패키지

```json
// @my-company/design-system
{
  "peerDependencies": {
    "react": "^19.0.0",
    "@my-company/tokens": "^2.0.0",
    "lodash": "^4.17.0"
  }
}
```

- 여러 서비스가 공유하는 사내 패키지에서, **버전 불일치와 중복 설치를 방지**하고 싶을 때
- `lodash`처럼 두 벌이어도 동작은 하지만, 번들에 중복 포함되면 **크기가 낭비**되는 패키지도 대상

**peerDeps는 책임의 선언이기도 하다**

- `dependencies` = "이 버전은 **내가(패키지 팀이) 책임**진다. 사용자는 신경 쓰지 마라"
- `peerDependencies` = "이 버전은 **호스트(서비스 팀)가 책임**져라. 나는 호스트가 준 것을 쓰겠다"
- lodash를 peerDep으로 → **"lodash 버전 관리는 각 서비스 팀의 몫"**
- lodash를 dependencies에 → 패키지 팀이 올릴 때마다 모든 서비스에 영향 → 책임이 패키지 팀에 집중

---

## 패키지 개발자로서 주의할 점 (1)

<style scoped>section { font-size: 20px; }</style>

### 런타임 의존성을 `devDependencies`에 넣지 말 것

```json
// ❌ 잘못된 예
{
  "devDependencies": {
    "lodash": "^4.17.0" // 런타임에 import 하는데 devDeps에 있음
  }
}
```

- 패키지를 `npm install`하는 사용자는 `lodash`가 설치되지 않아 **런타임 에러** 발생
- 서비스 프로젝트에서는 괜찮지만, **패키지에서는 치명적**

### 프레임워크를 `dependencies`에 넣지 말 것

```json
// ❌ 잘못된 예 — React 컴포넌트 라이브러리
{
  "dependencies": {
    "react": "^19.0.0" // 호스트와 다른 버전의 react가 설치될 수 있음
  }
}
```

- React가 두 벌 → hooks 에러, context 공유 불가 등 심각한 버그

### `@types/*`를 `dependencies`에 넣지 말 것

```json
// ❌ 잘못된 예
{
  "dependencies": {
    "@types/node": "^20.0.0"
  }
}
```

- `npm install my-package` 시 `@types/node`가 사용자에게 딸려옴
- 사용자 프로젝트에 **의도하지 않은 Node.js 타입이 주입**되어 타입 오염 발생
- 불필요한 설치 용량 낭비
- `@types/*`는 빌드 시에만 필요하므로 반드시 **devDependencies**에

---

## 패키지 개발자로서 주의할 점 (2)

<style scoped>section { font-size: 20px; }</style>

### peerDeps + devDependencies 패턴

peerDeps에 넣은 패키지는 **개발 시에는** devDependencies에도 넣어야 한다

```json
{
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "react": "^19.0.0"
  }
}
```

- peerDeps만 선언하면 `npm install`(패키지 개발 시)에서 react가 설치되지 않음
- 로컬 개발, 테스트, 빌드를 위해 **devDependencies에도** 넣어야 함
- 배포 시에는 devDeps가 제외되므로, 사용자에게 중복 설치되지 않음

> peerDeps = "사용자에게 요구하는 것", devDeps = "내가 개발할 때 필요한 것"
> 둘은 역할이 다르므로 **같은 패키지가 양쪽에 있어도 정상**

---

## 패키지 개발자로서 주의할 점 (3)

<style scoped>section { font-size: 22px; }</style>

### peerDependencies 버전 범위는 최대한 넓게

```json
// ❌ 너무 좁은 범위
{ "peerDependencies": { "react": "^19.0.0" } }

// ✅ 넓은 범위
{ "peerDependencies": { "react": "^18.0.0 || ^19.0.0" } }
```

- 좁은 범위 → 호스트 프로젝트에서 버전 충돌 발생 확률 증가
- 실제로 지원하는 범위만큼 넓게 선언할 것

### 선택적 peerDependencies 활용

```json
{
  "peerDependencies": {"webpack": "^5.0.0"},
  "peerDependenciesMeta": {
    "webpack": {"optional": true}
  }
}
```

- "webpack이 있으면 활용하고, 없어도 동작한다"는 의미
- 불필요한 설치 강요를 줄일 수 있음

---

## pnpm으로 올바르게 의존성 검사하기 (1)

<style scoped>section { font-size: 20px; }</style>

### pnpm은 기본적으로 **엄격한** 의존성 관리

- npm/yarn의 flat `node_modules`와 달리, pnpm은 **symlink 기반** 구조
- `dependencies`에 선언하지 않은 패키지는 **접근 불가** (phantom dependency 방지)

```
node_modules/
├── .pnpm/                    ← 실제 패키지가 여기에 설치됨
│   ├── lodash@4.17.21/
│   └── express@4.18.2/
├── lodash -> .pnpm/lodash@4.17.21/   ← symlink
└── express -> .pnpm/express@4.18.2/  ← symlink
```

```bash
# npm에서는 되지만 pnpm에서는 에러
import chalk from 'chalk'  // dependencies에 없으면 못 찾음
```

→ pnpm을 쓰는 것 자체가 의존성을 올바르게 선언하도록 **강제**하는 효과

---

## pnpm으로 올바르게 의존성 검사하기 (2)

<style scoped>section { font-size: 20px; }</style>

### `.npmrc` 설정

```ini
# peerDependencies 자동 설치 (기본값: true, pnpm v8+)
auto-install-peers=true

# peerDependencies 불일치 시 에러로 처리 (기본값: false)
strict-peer-dependencies=true
```

### `pnpm catalog` — 모노레포에서 버전을 한 곳에서 관리

```yaml
# pnpm-workspace.yaml
catalog:
  react: ^19.0.0
  react-dom: ^19.0.0
  lodash: ^4.17.0
```

```json
// packages/ui/package.json
{
  "peerDependencies": { "react": "catalog:" },
  "devDependencies": { "react": "catalog:" }
}
// packages/hooks/package.json
{
  "peerDependencies": { "react": "catalog:" }
}
```

- 모든 workspace 패키지가 **동일한 버전 범위**를 참조 → peerDeps 충돌 원천 차단
- 버전 올릴 때 `pnpm-workspace.yaml` **한 곳만** 수정하면 전체 반영
- 단, **모노레포 내부에서만** 유효 — 외부 사용자가 설치할 때는 catalog이 resolve된 실제 버전 범위가 `package.json`에 들어가므로, 외부 peerDeps 충돌까지 해결해주진 않음

---

### 유용한 검사 명령어

```bash
# 특정 패키지가 왜 설치되었는지 확인
pnpm why react

# 의존성 트리 확인
pnpm ls --depth 2

# 전체 의존성 중 outdated 확인
pnpm outdated

# 보안 취약점 검사
pnpm audit
```

---

## pnpm으로 올바르게 의존성 검사하기 (3)

<style scoped>section { font-size: 20px; }</style>

### `publint` — 패키지 배포 전 필수 검사 도구

```bash
# 패키지 디렉토리에서 실행
pnpm dlx publint

# 결과 예시
┌ publint results
│
│ ✗ pkg.main is ./dist/index.js but the file does not exist.
│ ✗ pkg.module is ESM but pkg.type is not "module".
│ ✓ pkg.exports["."].import is valid
│
└ 1 error, 1 warning
```

- `dependencies`에 선언한 것과 실제 `import`하는 것이 일치하는지도 검사
- 배포 전에 반드시 실행할 것

### `arethetypeswrong` (attw) — 타입 선언 검사

```bash
pnpm dlx @arethetypeswrong/cli --pack .
```

- 2탄에서 다룬 내용과 연계하여, 타입과 의존성이 올바르게 구성되었는지 함께 검증

---

## 정리

<style scoped>section { font-size: 20px; }</style>

| 필드               | 설치 시점     | 핵심 질문                                     |
| ------------------ | ------------- | --------------------------------------------- |
| `dependencies`     | 항상          | "이 패키지 없이 내 코드가 런타임에 돌아가나?" |
| `devDependencies`  | 개발 시에만   | "빌드/테스트/린트에만 필요한가?"              |
| `peerDependencies` | 호스트가 설치 | "호스트와 같은 인스턴스를 공유해야 하나?"     |

### 서비스 프로젝트

- deps vs devDeps 구분은 **관례적** 의미만 있음. 실질적 차이 없음.

### 패키지 개발

- deps/devDeps/peerDeps 구분이 **치명적으로 중요**
- 잘못 넣으면 사용자의 앱이 깨짐
- pnpm + `publint` + `attw`로 배포 전 반드시 검증할 것

---

<!-- _class: invert -->

## 한 줄 요약

> 서비스에서는 신경 안 써도 되지만,
> 패키지에서는 잘못 넣으면 **남의 앱이 터진다**.

---

## Q&A — 예상 질문

<!-- _class: invert -->

---

## Q. 모노레포에서 workspace 패키지끼리는 deps? peerDeps?

<style scoped>section { font-size: 20px; }</style>

**상황에 따라 다르다**

```json
// packages/ui (사내 디자인 시스템)
{
  "peerDependencies": {"react": "^19.0.0"},
  "dependencies": {"@my-company/tokens": "workspace:*"}
}
```

- **같은 모노레포 안의 유틸 패키지** → `dependencies` + `workspace:*`
  - 항상 함께 배포되고, 버전을 모노레포가 통제하므로 dependencies가 자연스러움
- **호스트가 직접 설치해야 하는 프레임워크** → `peerDependencies`
  - react, vue 등은 모노레포 안이라도 peerDeps가 맞음
- 핵심 기준: "이 패키지를 모노레포 **밖에서** 설치할 때, 누가 버전을 통제해야 하는가?"

---

## Q. `--legacy-peer-deps`를 계속 쓰고 있는데 괜찮나요?

<style scoped>section { font-size: 22px; }</style>

**괜찮지 않다.** 기술 부채를 쌓고 있는 것

```bash
npm install --legacy-peer-deps   # peerDeps 충돌을 무시
```

- 충돌을 무시한다 = 런타임에 **어떤 버전이 쓰일지 보장할 수 없다**
- React 18과 19가 공존하거나, ESLint 8과 9의 플러그인이 섞이는 등의 문제가 잠복
- 당장은 동작하지만, 어느 날 갑자기 알 수 없는 에러로 터질 수 있음

**해결 방법**: 충돌의 원인을 찾아서 해소하는 것이 올바른 접근

```bash
npm ls react              # 어떤 패키지가 어떤 버전을 요구하는지 확인
npm explain react         # 왜 이 버전이 설치되었는지 추적
```

충돌 해소가 어렵다면 `overrides`로 버전을 **명시적으로 고정**:

```json
{
  "overrides": {"react": "^19.0.0"}
}
```

- npm 8.3+: `overrides` / yarn berry: `resolutions` / pnpm: `pnpm.overrides`
- `--legacy-peer-deps`는 충돌을 **무시**, `overrides`는 충돌을 **해소** — 결정적 차이

---

## Q. 라이브러리가 peerDeps를 안 올려주면?

<style scoped>section { font-size: 20px; }</style>

예: 내 서비스는 React 19인데, 어떤 라이브러리가 `"react": "^18.0.0"`만 peerDep으로 선언

```
npm warn ERESOLVE Could not resolve dependency:
npm warn peer react@"^18.0.0" from some-ui-lib@3.2.1
```

**사용하는 쪽이 "이 라이브러리는 React 19에서도 문제없다"고 확신이 있다면** → `overrides`로 해결 가능

```json
{
  "pnpm": {
    "overrides": {
      "some-ui-lib>react": "^19.0.0"
    }
  }
}
```

- 특정 패키지의 peerDep 요구사항만 **선택적으로 덮어쓸 수 있음**
- 라이브러리 팀이 peerDeps를 업데이트해줄 때까지의 **임시 조치**로 적합
- 단, 실제로 호환되는지는 **사용하는 쪽이 검증할 책임**이 있음
- 라이브러리에 이슈/PR을 올려서 peerDeps 범위를 넓혀달라고 요청하는 것이 근본적 해결

---

## Q. dependencies와 peerDependencies에 같은 패키지를 넣으면?

<style scoped>section { font-size: 22px; }</style>

```json
{
  "dependencies": {"lodash": "^4.17.0"},
  "peerDependencies": {"lodash": "^4.17.0"}
}
```

- npm: peerDeps를 우선하여 호스트의 lodash를 사용. 호스트에 없으면 dependencies 것을 사용
- pnpm: 둘 다 설치하지만 **호스트 것을 우선** 참조
- 실무에서는 거의 쓸 일이 없음. 대부분 **의도가 불명확한 실수**
- peerDeps에 넣을 거면 dependencies에서 빼고, **devDependencies에 넣을 것**

---

## Q. `optionalDependencies`와 `peerDependenciesMeta.optional`의 차이는?

<style scoped>section { font-size: 18px; }</style>

이름이 비슷해서 혼동하기 쉽지만, **완전히 다른 메커니즘**

### `optionalDependencies` — 설치 실패를 허용

```json
{"optionalDependencies": {"fsevents": "^2.3.0"}}
```

- npm이 설치를 **시도**하되, 실패해도 에러 없이 넘어감
- 주로 **플랫폼 종속** 네이티브 바이너리에 사용 (예: `fsevents`는 macOS 전용)
- 코드에서 `try { require('fsevents') } catch {}` 패턴으로 분기해야 함
- 패키지가 **직접 설치 책임**을 지되, 환경에 따라 없을 수 있음을 인정

### `peerDependenciesMeta.optional` — 호스트에게 선택권 부여

```json
{
  "peerDependencies": {"react-native": ">=0.70"},
  "peerDependenciesMeta": {"react-native": {"optional": true}}
}
```

- 호스트에게 "있으면 활용하고, 없어도 동작한다"고 알림
- 없어도 **peerDeps 경고/에러가 발생하지 않음**
- 주로 **멀티 플랫폼 지원** 패키지에서 사용 (예: web + react-native 동시 지원)

---

## 언제 어떤 걸 써야 하나?

<style scoped>section { font-size: 20px; }</style>

|           | `optionalDependencies` | `peerDependenciesMeta.optional` |
| --------- | ---------------------- | ------------------------------- |
| 설치 주체 | **패키지가** 설치 시도 | **호스트가** 직접 설치          |
| 실패 시   | 조용히 넘어감          | 경고/에러 없음                  |
| 주요 용도 | 플랫폼 종속 바이너리   | 선택적 통합                     |
| 버전 통제 | 패키지 팀              | 호스트(서비스 팀)               |

### 실전 예시

```json
// @my-company/analytics — web, react-native, node 모두 지원
{
  "peerDependencies": {
    "react": "^18 || ^19",
    "react-native": ">=0.70"
  },
  "peerDependenciesMeta": {
    "react-native": {"optional": true}
  },
  "optionalDependencies": {
    "@my-company/analytics-native": "^1.0.0"
  }
}
```

- `react`: 필수 — 없으면 에러
- `react-native`: 있으면 네이티브 최적화, 없어도 웹에서 동작
- `@my-company/analytics-native`: 설치를 시도하되, 네이티브 환경이 아니면 실패해도 OK

---

## Q. React 19 신규 API를 쓰려면 peerDeps 범위를 좁혀야 하지 않나요?

<style scoped>section { font-size: 18px; }</style>

**꼭 그렇지는 않다.** feature detection으로 넓은 범위를 유지하면서 신규 API를 활용할 수 있음

```js
// ❌ peerDeps를 "react": "^19.0.0"으로 좁히는 대신
// ✅ 런타임에 API 존재 여부를 확인
import * as React from 'react'

const useStore =
  typeof React.useSyncExternalStore === 'function'
    ? React.useSyncExternalStore // React 18+
    : require('./shims/useSyncExternalStore') // React 17 이하 폴백

// React.use() — React 19 전용
function usePromise(promise) {
  if (typeof React.use === 'function') {
    return React.use(promise) // React 19+
  }
  // React 18 이하 폴백...
}
```

```json
// peerDeps는 넓게 유지
{"peerDependencies": {"react": "^17.0.0 || ^18.0.0 || ^19.0.0"}}
```

**이 접근의 장점:**

- peerDeps 범위를 좁히지 않아도 됨 → 사용자의 React 업그레이드를 강제하지 않음
- 새 API가 있으면 쓰고, 없으면 폴백 → **점진적 개선**

**그래도 버전을 올려야 하는 경우:**

- 신규 API가 핵심 동작에 필수적이고, 폴백이 불가능하거나 의미 없을 때
- breaking change로 인해 구버전과 동시 지원이 **코드 복잡성 대비 가치가 없을 때**

> 버전 범위를 좁히는 건 최후의 수단. **feature detection이 가능하면 먼저 시도할 것**

---

## Q. 특정 버전에 버그가 있으면 peerDeps에서 제외해야 하나요?

<style scoped>section { font-size: 20px; }</style>

**아니요.** peerDeps는 그런 용도가 아닙니다.

```json
// ❌ 이렇게 하고 싶은 유혹
{"peerDependencies": {"react": "^19.0.0, !19.0.1"}}
```

**하면 안 되는 이유:**

- peerDeps는 **호환 가능한 버전 범위**를 선언하는 것이지, 특정 버전의 버그를 차단하는 도구가 아님
- 그 버그가 내 패키지와 관련 없는 곳에서 발생한 것일 수 있음
- 해당 버전이 패치되면 의미 없는 제약만 남음
- 제외할 버전이 쌓이면 peerDeps가 점점 복잡해지고 관리 불가능

**대신:**

- **README / CHANGELOG**에 "X 버전에 알려진 이슈가 있으니 Y 이상으로 업데이트를 권장합니다" 안내
- 심각한 경우 **GitHub 이슈에 pinned comment**로 고정
- peerDeps는 넓게 유지하되, **문서로 소통**하는 것이 올바른 접근

---

<!-- _class: invert -->

# 감사합니다

@yceffort
