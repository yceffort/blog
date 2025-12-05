---
title: '문자열 리터럴 유니온에 string을 추가하면 자동완성이 사라지는 이유'
tags:
  - typescript
published: true
date: 2025-12-05 22:30:00
description: 'type Color = "red" | "blue" | string // 자동완성: 🦗...'
---

## Table of Contents

## 서론

`'red' | 'blue' | string` 타입을 정의하면 자동완성이 사라지는 현상이 있다. 이 문제는 TypeScript GitHub [#29729](https://github.com/microsoft/TypeScript/issues/29729)에 등록되어 있고, 244개의 👍를 받았지만 "설계적 한계"로 분류되어 해결되지 않고 있다.

이 글에서는 왜 이런 현상이 발생하는지, 그리고 커뮤니티에서 발견한 `string & {}` 트릭이 어떤 원리로 작동하는지 살펴본다.

## 문제 상황

예를 들어, CSS 색상을 다루는 인터페이스를 만든다고 가정해보자.

```typescript
interface Options {
  borderColor: 'black' | 'red' | 'green' | 'yellow' | 'blue'
}
```

이렇게 하면 자동완성이 잘 된다. `borderColor:`를 입력하는 순간 IDE가 친절하게 `'black'`, `'red'` 등을 보여준다. 그런데 문제가 있다. 16진수 색상 코드 (`#ff5500`)나 `rgb(255, 0, 0)` 같은 값은 어떻게 할 것인가? 가능한 모든 색상 값을 나열할 수는 없다. (1670만개의 hex 색상 조합을 나열할 자신이 있다면 뭐...)

그래서 자연스럽게 이렇게 수정하게 된다.

```typescript
interface Options {
  borderColor: 'black' | 'red' | 'green' | 'yellow' | 'blue' | string
}
```

그리고 신나게 `borderColor:`를 입력하면...

```typescript
const opts: Options = {
  borderColor: // 🦗 자동완성이 없다
}
```

자동완성이 증발해버렸다. 분명 `'black'`, `'red'` 같은 리터럴을 넣어뒀는데, IDE는 아무것도 제안하지 않는다.

## 왜 이런 일이 발생하는가?

타입스크립트 관점에서 생각해보자. `'red' | 'blue' | string`이라는 타입을 보면 어떻게 될까?

타입 시스템에서 `'red'`는 `string`의 서브타입이다. 즉, 모든 `'red'`는 `string`이다. 유니온 타입에서 서브타입은 상위 타입에 흡수되어 버린다. 마치 수학에서 `{1, 2} ∪ 자연수 = 자연수`인 것처럼.

```typescript
type Color = 'red' | 'blue' | string
// 실제로는 그냥 string과 동일하다
```

타입스크립트 팀의 Ryan Cavanaugh는 이에 대해 이렇게 말했다:

> "컴파일러 관점에서 이는 `string`을 쓰는 복잡한 방식일 뿐입니다"

타입 시스템의 관점에서는 완벽하게 맞는 말이다. 문제는 개발자 경험(DX) 관점에서 리터럴 정보가 사라져버린다는 것이다. 이 이슈는 TypeScript GitHub에서 [#29729](https://github.com/microsoft/TypeScript/issues/29729)로 등록되어 있고, 244개의 👍를 받았다. 그만큼 많은 개발자들이 이 문제로 고통받고 있다는 뜻이다.

## 해결책: `& {}` 트릭

커뮤니티에서 발견한 해결책이 있다. 바로 `& {}`를 활용하는 것이다.

```typescript
type LiteralUnion<T extends string> = T | (string & {})

type Color = LiteralUnion<'red' | 'blue' | 'green'>

const color: Color = '' // 'red', 'blue', 'green' 자동완성이 된다! ✅
```

뭔가 해킹 같은 느낌이지만, 작동한다. 원리를 살펴보자.

### 왜 `string & {}`가 작동하는가?

이 트릭이 작동하는 원리를 이해하려면, 타입스크립트가 유니온 타입을 어떻게 단순화(simplify)하는지 알아야 한다.

#### 1. 유니온 타입의 단순화 규칙

타입스크립트는 유니온 타입을 만들 때, 서브타입 관계에 있는 타입들을 자동으로 정리한다. `A`가 `B`의 서브타입이면, `A | B`는 그냥 `B`로 단순화된다.

```typescript
type T1 = 'red' | string // string (리터럴이 흡수됨)
type T2 = number | 1 // number (리터럴이 흡수됨)
type T3 = string | unknown // unknown (string이 흡수됨)
```

`'red'`는 `string`의 서브타입이므로, `'red' | string`은 `string`으로 단순화된다. 이 과정에서 `'red'`라는 정보가 완전히 사라져버린다.

#### 2. `{}`는 무엇인가?

타입스크립트에서 `{}`는 "빈 객체 타입"이 아니라 **"null과 undefined를 제외한 모든 값"** 을 의미한다. 이게 좀 헷갈리는 부분인데, 타입스크립트의 구조적 타이핑 때문에 그렇다.

```typescript
type A = {}

const a: A = 'hello' // ✅ 문자열도 {}에 할당 가능
const b: A = 123 // ✅ 숫자도 {}에 할당 가능
const c: A = {foo: 1} // ✅ 객체도 당연히 가능
const d: A = null // ❌ null은 불가
const e: A = undefined // ❌ undefined도 불가
```

자바스크립트에서 원시 타입도 래퍼 객체를 통해 프로퍼티에 접근할 수 있기 때문이다. `'hello'.length`가 동작하는 것처럼.

#### 3. `string & {}`는 왜 `string`과 다른가?

여기서 핵심이 나온다. 타입 시스템 관점에서 `string & {}`는 `string`과 **구조적으로 동등(structurally equivalent)** 하다. 모든 문자열은 `{}`를 만족하므로, `string & {}`에 할당할 수 있는 값의 집합은 `string`과 완전히 동일하다.

```typescript
type Test = string & {}

const a: Test = 'hello' // ✅
const b: Test = '#ff5500' // ✅

// 반대 방향도 마찬가지
const c: string = 'hello' as Test // ✅
```

그러나 타입스크립트 컴파일러 내부에서는 이 둘을 **다른 타입 객체(different type identity)** 로 취급한다. 유니온 타입을 단순화할 때, 타입스크립트는 "이 타입이 저 타입의 서브타입인가?"를 체크하는데, `string`과 `string & {}`는 서로 다른 타입 ID를 가지고 있어서 단순화 대상이 되지 않는다.

```typescript
type Color1 = 'red' | string // string (단순화됨)
type Color2 = 'red' | (string & {}) // 'red' | (string & {}) (단순화 안됨!)
```

#### 4. IDE가 자동완성을 제공하는 방식

IDE(정확히는 TypeScript Language Service)는 유니온 타입에서 리터럴 멤버를 추출해서 자동완성 후보로 제공한다.

- `'red' | string` → 단순화되어 `string`만 남음 → 리터럴 없음 → 자동완성 없음
- `'red' | (string & {})` → 단순화되지 않음 → `'red'`가 살아있음 → 자동완성 제공

#### 5. 정리

| 타입                     | 값의 집합   | 타입 ID     | 자동완성 |
| ------------------------ | ----------- | ----------- | -------- |
| `string`                 | 모든 문자열 | A           | ❌       |
| `string & {}`            | 모든 문자열 | B           | -        |
| `'red' \| string`        | 모든 문자열 | A (단순화)  | ❌       |
| `'red' \| (string & {})` | 모든 문자열 | 유니온 유지 | ✅       |

결국 이 트릭은 타입의 **구조적 동등성** 과 **타입 ID** 가 다르다는 점을 이용한 것이다. 값의 집합은 동일하지만, 컴파일러가 내부적으로 다르게 처리하기 때문에 단순화를 피할 수 있다.

## 실전 예제

### CSS 색상 타입

```typescript
type LiteralUnion<T extends string> = T | (string & {})

type CSSColor = LiteralUnion<
  'black' | 'white' | 'red' | 'green' | 'blue' | 'transparent' | 'currentColor'
>

function setBackground(color: CSSColor) {
  // ...
}

setBackground('red') // ✅ 자동완성 됨
setBackground('#ff5500') // ✅ 임의의 문자열도 허용
setBackground('rgb(255, 0, 0)') // ✅
```

### HTTP 메서드

```typescript
type HTTPMethod = LiteralUnion<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>

function request(method: HTTPMethod, url: string) {
  // ...
}

request('GET', '/api/users') // ✅ 자동완성
request('OPTIONS', '/api/users') // ✅ 비표준 메서드도 허용
```

### 이벤트 이름

```typescript
type EventName = LiteralUnion<'click' | 'submit' | 'change' | 'input'>

function on(event: EventName, handler: () => void) {
  // ...
}

on('click', () => {}) // ✅ 자동완성
on('custom-event', () => {}) // ✅ 커스텀 이벤트도 허용
```

## 제네릭으로 확장하기

문자열 외에 다른 타입에도 적용할 수 있도록 제네릭 버전을 만들 수 있다.

```typescript
type LiteralUnion<T extends U, U = string> = T | (U & {})

// 문자열
type Color = LiteralUnion<'red' | 'blue'>

// 숫자
type Port = LiteralUnion<80 | 443 | 8080, number>

const port: Port = 3000 // ✅ 임의의 숫자 허용, 80/443/8080 자동완성
```

## 왜 TypeScript 팀은 이 문제를 해결하지 않았을까?

이 이슈는 "Design Limitation"(설계적 한계)으로 분류되어 닫혔다. 244개의 👍를 받을 만큼 많은 개발자들이 원했지만, TypeScript 팀이 해결하지 않은 데는 몇 가지 이유가 있다.

### 1. 타입 시스템의 일관성

타입스크립트의 타입 시스템은 집합론에 기반한다. `'red'`는 `string`의 부분집합이고, 유니온 타입은 합집합 연산이다. `{1, 2} ∪ 자연수 = 자연수`인 것처럼, `'red' | string = string`이 되는 것은 수학적으로 올바른 동작이다.

이 원칙을 깨면 타입 시스템의 다른 부분에서 예상치 못한 문제가 발생할 수 있다. 예를 들어, 조건부 타입이나 타입 추론에서 일관성이 깨질 수 있다.

### 2. 성능 문제

리터럴 타입 정보를 유지하려면 컴파일러가 더 많은 정보를 추적해야 한다. 대규모 코드베이스에서 `'a' | 'b' | 'c' | ... | string` 같은 타입이 수천 개 있다면, 단순화하지 않고 모든 리터럴을 유지하는 것은 메모리와 성능에 부담이 된다.

현재 구조에서는 `'red' | string`을 만나면 바로 `string`으로 단순화해버리기 때문에 효율적이다.

### 3. "올바른" 해결책의 부재

이 문제를 제대로 해결하려면 타입 시스템에 새로운 개념을 도입해야 한다. 예를 들어:

```typescript
// 가상의 문법
type Color = 'red' | 'blue' | (string as suggestions)
```

"타입 체크는 string으로 하되, IDE에는 리터럴 힌트를 제공한다"는 개념이 필요하다. 하지만 이는 타입 시스템과 IDE 힌트를 분리하는 것인데, 타입스크립트는 지금까지 이 둘을 동일시해왔다. 타입이 곧 IDE가 아는 정보였다.

이런 이원화는 새로운 복잡성을 야기하고, "타입은 맞는데 자동완성은 틀리다"거나 그 반대 상황을 만들 수 있다.

### 4. 커뮤니티 해결책의 존재

`string & {}` 트릭이 이미 널리 알려져 있고, `type-fest` 같은 라이브러리에서 제공하고 있다. 완벽하진 않지만 실용적인 해결책이 존재하는 상황에서, 타입 시스템을 근본적으로 변경하는 것은 리스크 대비 이득이 크지 않다고 판단한 것으로 보인다.

### 개인적인 의견

솔직히 아쉬운 결정이다. 타입 시스템의 순수성을 지키는 것도 중요하지만, 타입스크립트의 존재 이유 중 하나는 개발자 경험(DX) 향상이다. 자동완성은 DX의 핵심 기능이고, 이 문제는 실제로 많은 개발자들이 겪는 pain point다.

다만 TypeScript 팀의 입장도 이해는 된다. 타입 시스템은 한번 변경하면 되돌리기 어렵고, 수백만 개의 프로젝트에 영향을 미친다. "완벽하지 않지만 동작하는 해결책"이 있는 상황에서 보수적으로 접근하는 것도 합리적인 선택이다.

## 주의사항

`string & {}` 트릭은 어디까지나 해킹에 가깝다. 타입스크립트의 내부 구현에 의존하고 있기 때문에, 미래 버전에서 동작이 달라질 수 있다. (지금까지는 잘 작동하고 있지만)

또한 이 패턴은 이미 많은 유명 라이브러리에서 사용되고 있다:

- [csstype](https://github.com/frenic/csstype): CSS 타입 정의
- [type-fest](https://github.com/sindresorhus/type-fest): `LiteralUnion` 유틸리티 제공

직접 구현하기보다는 `type-fest`의 `LiteralUnion`을 사용하는 것도 좋은 방법이다.

```bash
npm install type-fest
```

```typescript
import type {LiteralUnion} from 'type-fest'

type Color = LiteralUnion<'red' | 'blue', string>
```

## 마치며

`'red' | string`이 그냥 `string`으로 축소되어 버리는 것은 타입 이론 관점에서는 올바른 동작이다. 하지만 개발자 경험 측면에서는 분명히 아쉬운 부분이 있다. 타입스크립트 팀도 이를 인지하고 있지만, 아키텍처적인 제약으로 인해 쉽게 해결할 수 없다고 한다.

다행히 `& {}` 트릭으로 이 문제를 우회할 수 있다. 타입 안전성을 유지하면서도 편리한 자동완성을 제공하는, 꽤 괜찮은 해결책이다. 물론 조금 이상해 보이는 건 사실이지만, 때로는 실용성이 아름다움보다 중요한 법이다.

> 참고: https://github.com/microsoft/TypeScript/issues/29729
