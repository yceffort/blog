---
title: 'TypeScript에서 switch문의 모든 케이스를 빠짐없이 처리했는지 검사하는 방법'
tags:
  - typescript
published: false
date: 2026-01-17 20:00:00
description: 'never 타입을 활용한 exhaustive check 패턴'
---

## Table of Contents

## 서론

유니온 타입을 다룰 때, 모든 케이스를 빠짐없이 처리했는지 확인하고 싶을 때가 있다. 특히 switch문에서 새로운 케이스가 추가됐을 때, 해당 케이스를 처리하는 코드를 깜빡하고 작성하지 않으면 런타임에 예상치 못한 동작이 발생할 수 있다.

TypeScript의 `never` 타입을 활용하면 이런 실수를 컴파일 타임에 잡아낼 수 있다. 이 글에서는 exhaustive check 패턴이 무엇인지, 그리고 어떻게 활용하는지 살펴본다.

## 문제 상황

결제 수단을 처리하는 함수를 만든다고 가정해보자.

```typescript
type PaymentMethod = 'card' | 'bank'

function processPayment(method: PaymentMethod) {
  switch (method) {
    case 'card':
      console.log('카드 결제 처리')
      break
    case 'bank':
      console.log('계좌이체 처리')
      break
  }
}
```

여기까지는 문제가 없다. 그런데 시간이 지나 암호화폐 결제를 추가해야 한다면?

```typescript
type PaymentMethod = 'card' | 'bank' | 'crypto'
```

타입에는 `crypto`를 추가했지만, `processPayment` 함수는 수정하지 않았다. TypeScript는 아무런 에러도 내지 않는다. 왜냐하면 switch문에 default가 없어도 문법적으로 유효하기 때문이다.

```typescript
processPayment('crypto') // 아무것도 출력되지 않음
```

런타임에 `crypto`로 결제를 시도하면, switch문은 아무 케이스에도 매칭되지 않고 그냥 지나가버린다. 이런 버그는 테스트에서도 놓치기 쉽고, 프로덕션에서 발견되면 큰 문제가 될 수 있다.

## never 타입이란?

exhaustive check를 이해하려면 먼저 `never` 타입을 알아야 한다.

`never`는 TypeScript에서 **절대 발생할 수 없는 타입**을 의미한다. 수학에서 공집합(∅)과 같은 개념이다. 어떤 값도 `never` 타입에 할당할 수 없다.

```typescript
let value: never

value = 1 // ❌ 에러: Type 'number' is not assignable to type 'never'
value = 'hello' // ❌ 에러: Type 'string' is not assignable to type 'never'
value = null // ❌ 에러: Type 'null' is not assignable to type 'never'
```

`never`는 보통 다음과 같은 상황에서 나타난다.

```typescript
// 절대 반환하지 않는 함수
function throwError(message: string): never {
  throw new Error(message)
}

// 무한 루프
function infiniteLoop(): never {
  while (true) {}
}
```

## Control Flow Analysis

TypeScript의 강력한 기능 중 하나는 제어 흐름 분석(Control Flow Analysis)이다. 코드의 분기를 따라가면서 변수의 타입을 좁혀나간다.

```typescript
type PaymentMethod = 'card' | 'bank' | 'crypto'

function process(method: PaymentMethod) {
  if (method === 'card') {
    // 여기서 method의 타입은 'card'
  } else if (method === 'bank') {
    // 여기서 method의 타입은 'bank'
  } else {
    // 여기서 method의 타입은 'crypto'
  }
}
```

모든 케이스를 처리하면, 마지막 else 블록 이후에는 `method`가 가질 수 있는 타입이 없어진다. 즉, `never`가 된다.

```typescript
function process(method: PaymentMethod) {
  if (method === 'card') {
    return
  } else if (method === 'bank') {
    return
  } else if (method === 'crypto') {
    return
  }

  // 여기서 method의 타입은 never
  // 모든 케이스를 처리했으므로 이 코드에 도달할 수 없다
  method // never
}
```

## 컴파일 타임 검증의 원리

여기서 핵심적인 질문이 생긴다. TypeScript는 어떻게 **컴파일 타임에** 이런 검증을 수행할 수 있는 걸까?

### 1. 유니온 타입은 집합이다

TypeScript의 타입 시스템은 집합론에 기반한다. 유니온 타입 `'card' | 'bank' | 'crypto'`는 세 개의 원소를 가진 집합 `{'card', 'bank', 'crypto'}`과 같다.

```typescript
type PaymentMethod = 'card' | 'bank' | 'crypto'
// 집합으로 표현: { 'card', 'bank', 'crypto' }
```

### 2. 타입 좁히기는 집합 연산이다

제어 흐름에서 조건문을 만나면, TypeScript는 집합에서 원소를 제거하는 연산을 수행한다.

```typescript
function process(method: PaymentMethod) {
  // method: { 'card', 'bank', 'crypto' }

  if (method === 'card') {
    // method: { 'card' }  (다른 원소 제거됨)
    return
  }

  // method: { 'bank', 'crypto' }  ('card' 제거됨)

  if (method === 'bank') {
    // method: { 'bank' }
    return
  }

  // method: { 'crypto' }  ('bank'도 제거됨)

  if (method === 'crypto') {
    // method: { 'crypto' }
    return
  }

  // method: { }  (공집합 = never)
}
```

각 분기를 지날 때마다 가능한 타입의 집합에서 해당 케이스를 빼는 것이다. 모든 케이스를 처리하면 공집합, 즉 `never`가 된다.

### 3. 할당 가능성 검사는 부분집합 검사다

TypeScript에서 `A`를 `B`에 할당할 수 있다는 것은, 집합 `A`가 집합 `B`의 부분집합이라는 의미다.

```typescript
type A = 'card'
type B = 'card' | 'bank'

let b: B = 'card' as A  // ✅ { 'card' } ⊆ { 'card', 'bank' }
```

`never`는 공집합이므로, `never`는 모든 타입의 부분집합이다. 따라서 `never`는 어디에든 할당할 수 있다.

```typescript
declare const n: never
const a: string = n  // ✅ 공집합은 모든 집합의 부분집합
const b: number = n  // ✅
```

반대로, 공집합이 아닌 집합은 공집합의 부분집합이 될 수 없다. 따라서 어떤 값도 `never`에 할당할 수 없다.

```typescript
const x: never = 'card'  // ❌ { 'card' } ⊄ { }
```

### 4. 컴파일러의 타입 검사 과정

이제 전체 그림을 보자. TypeScript 컴파일러는 다음과 같은 과정을 거친다.

```typescript
type PaymentMethod = 'card' | 'bank' | 'crypto'

function processPayment(method: PaymentMethod) {
  switch (method) {
    case 'card':
      // ... 처리
      break
    case 'bank':
      // ... 처리
      break
    default:
      const _check: never = method
      //    ^^^^^^^^^^^^^^^^^^^^^^^
      //    컴파일러가 이 할당문을 검사한다
  }
}
```

1. **타입 수집**: 컴파일러는 `method`의 초기 타입이 `'card' | 'bank' | 'crypto'`임을 안다.

2. **분기 분석**: `case 'card'`를 지나면 `'card'`가 제거되고, `case 'bank'`를 지나면 `'bank'`가 제거된다.

3. **default 도달 시 타입 계산**: `default` 블록에서 `method`의 타입은 `'crypto'`다 (아직 처리되지 않은 케이스).

4. **할당 가능성 검사**: `const _check: never = method`에서 `'crypto'`를 `never`에 할당할 수 있는지 검사한다.

5. **에러 발생**: `{ 'crypto' } ⊄ { }` 이므로, 할당 불가능. 컴파일 에러.

이 모든 과정이 코드 실행 없이 **타입 정보만으로** 수행된다. 이것이 컴파일 타임 검증이 가능한 이유다.

### 5. 왜 런타임에도 throw가 필요한가?

그렇다면 컴파일 타임에 검증되는데, 왜 `throw new Error(...)`가 필요할까?

```typescript
default:
  const _check: never = method
  throw new Error(`Unhandled: ${method}`)  // 이건 왜?
```

두 가지 이유가 있다.

첫째, **방어적 프로그래밍**이다. TypeScript 타입은 컴파일 후 사라진다. 만약 런타임에 예상치 못한 값이 들어온다면 (예: 외부 API에서 새로운 결제 수단을 반환), 타입 시스템은 이를 막지 못한다.

```typescript
// API 응답을 any로 받는 경우
const method = apiResponse.paymentMethod as PaymentMethod
// 실제로는 'bitcoin'일 수도 있다!
```

둘째, **함수 반환 타입 만족**이다. 함수가 값을 반환해야 하는 경우, 컴파일러가 "모든 경로에서 값을 반환하지 않는다"고 경고할 수 있다. `throw`를 추가하면 이 경로가 절대 정상 반환하지 않음을 명시할 수 있다.

```typescript
function getLabel(method: PaymentMethod): string {
  switch (method) {
    case 'card': return '카드'
    case 'bank': return '계좌이체'
    default:
      const _: never = method
      throw new Error()  // 이 줄이 없으면 "모든 경로에서 반환하지 않음" 경고
  }
}
```

## Exhaustive Check 패턴

이제 `never` 타입과 제어 흐름 분석을 결합해서 exhaustive check를 구현할 수 있다.

```typescript
type PaymentMethod = 'card' | 'bank'

function processPayment(method: PaymentMethod) {
  switch (method) {
    case 'card':
      console.log('카드 결제 처리')
      break
    case 'bank':
      console.log('계좌이체 처리')
      break
    default:
      const _exhaustiveCheck: never = method
      throw new Error(`Unhandled payment method: ${_exhaustiveCheck}`)
  }
}
```

핵심은 `default` 케이스에서 `method`를 `never` 타입 변수에 할당하는 것이다.

모든 케이스를 처리했다면, `default`에 도달할 수 없으므로 `method`의 타입은 `never`가 된다. `never`를 `never`에 할당하는 것은 유효하므로 에러가 발생하지 않는다.

하지만 케이스를 놓치면?

```typescript
type PaymentMethod = 'card' | 'bank' | 'crypto'

function processPayment(method: PaymentMethod) {
  switch (method) {
    case 'card':
      console.log('카드 결제 처리')
      break
    case 'bank':
      console.log('계좌이체 처리')
      break
    default:
      const _exhaustiveCheck: never = method
      // ❌ 에러: Type 'string' is not assignable to type 'never'
      // 정확히는: Type '"crypto"' is not assignable to type 'never'
      throw new Error(`Unhandled payment method: ${_exhaustiveCheck}`)
  }
}
```

`crypto` 케이스를 처리하지 않았으므로, `default`에 도달할 때 `method`의 타입은 `'crypto'`다. `'crypto'`는 `never`에 할당할 수 없으므로 컴파일 에러가 발생한다.

이것이 바로 exhaustive check의 핵심이다. **컴파일 타임에** 누락된 케이스를 잡아낼 수 있다.

## 헬퍼 함수로 만들기

매번 이 패턴을 작성하는 건 번거로우니, 헬퍼 함수로 만들어두면 편하다.

```typescript
function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${value}`)
}
```

사용법은 간단하다.

```typescript
function processPayment(method: PaymentMethod) {
  switch (method) {
    case 'card':
      console.log('카드 결제 처리')
      break
    case 'bank':
      console.log('계좌이체 처리')
      break
    default:
      assertNever(method, `알 수 없는 결제 수단: ${method}`)
  }
}
```

`assertNever`의 반환 타입이 `never`이므로, TypeScript는 이 함수가 절대 정상적으로 반환하지 않는다는 것을 안다. 따라서 switch문 이후의 코드에서도 타입 추론이 올바르게 동작한다.

## 실전 예제

### Redux 리듀서

Redux 패턴에서 액션 타입을 처리할 때 유용하다.

```typescript
type Action =
  | {type: 'INCREMENT'}
  | {type: 'DECREMENT'}
  | {type: 'RESET'; payload: number}

function reducer(state: number, action: Action): number {
  switch (action.type) {
    case 'INCREMENT':
      return state + 1
    case 'DECREMENT':
      return state - 1
    case 'RESET':
      return action.payload
    default:
      return assertNever(action)
  }
}
```

새로운 액션을 추가하면, 리듀서에서 해당 액션을 처리하지 않으면 컴파일 에러가 발생한다.

### 상태 머신

상태 머신을 구현할 때도 exhaustive check가 빛을 발한다.

```typescript
type State = 'idle' | 'loading' | 'success' | 'error'

function getStatusMessage(state: State): string {
  switch (state) {
    case 'idle':
      return '대기 중'
    case 'loading':
      return '로딩 중...'
    case 'success':
      return '완료!'
    case 'error':
      return '오류 발생'
    default:
      return assertNever(state)
  }
}
```

### 판별 유니온 (Discriminated Union)

판별 유니온과 함께 사용하면 더욱 강력하다.

```typescript
type Shape =
  | {kind: 'circle'; radius: number}
  | {kind: 'rectangle'; width: number; height: number}
  | {kind: 'triangle'; base: number; height: number}

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2
    case 'rectangle':
      return shape.width * shape.height
    case 'triangle':
      return (shape.base * shape.height) / 2
    default:
      return assertNever(shape)
  }
}
```

## 다른 언어에서는?

사실 이런 패턴 매칭의 완전성 검사는 다른 언어에서는 기본으로 제공되는 경우가 많다.

Rust에서는 `match` 표현식이 모든 케이스를 처리하지 않으면 컴파일 에러가 발생한다.

```rust
enum PaymentMethod {
    Card,
    Bank,
    Crypto,
}

fn process(method: PaymentMethod) {
    match method {
        PaymentMethod::Card => println!("카드"),
        PaymentMethod::Bank => println!("계좌이체"),
        // ❌ 컴파일 에러: Crypto를 처리하지 않음
    }
}
```

Haskell, OCaml 같은 함수형 언어에서도 패턴 매칭은 기본적으로 완전성 검사를 수행한다.

TypeScript에서는 이런 기능이 언어 수준에서 강제되지 않기 때문에, `never` 타입을 활용한 패턴으로 직접 구현해야 한다. 조금 번거롭지만, 충분히 실용적인 해결책이다.

## 마치며

exhaustive check 패턴은 TypeScript에서 유니온 타입의 모든 케이스를 빠짐없이 처리했는지 컴파일 타임에 검증하는 강력한 방법이다. 핵심 원리는 간단하다.

1. TypeScript의 제어 흐름 분석으로 모든 케이스를 처리하면 타입이 `never`로 좁혀진다.
2. `never` 타입에는 어떤 값도 할당할 수 없다.
3. 따라서 처리하지 않은 케이스가 있으면 컴파일 에러가 발생한다.

코드베이스가 커지고 유니온 타입의 케이스가 늘어날수록, 이 패턴의 가치는 더욱 빛난다. 리팩토링할 때 놓친 부분을 컴파일러가 알려주니, 런타임 버그를 크게 줄일 수 있다.

## 참고

- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking)
- https://github.com/yceffort/blog/issues/773
