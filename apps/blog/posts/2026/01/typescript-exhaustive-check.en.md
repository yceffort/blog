---
title: 'How to Check if All Cases Are Handled in TypeScript Switch Statements'
tags:
  - typescript
published: true
date: 2026-01-17 20:00:00
description: 'Exhaustive check pattern using the never type'
art:
  layout: glyph
  hue: violet
  tone: light
  hero: 'assertNever'
---

## Table of Contents

## Introduction

When working with union types, there are times when you want to ensure that all cases are handled without exception. Particularly in switch statements, if you forget to write code to handle a newly added case, unexpected behavior can occur at runtime.

By leveraging TypeScript's `never` type, you can catch these mistakes at compile time. This article explores what the exhaustive check pattern is and how to use it.

## The Problem

Let's say you're creating a function to handle payment methods.

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

So far, there's no problem. But what if you need to add cryptocurrency payment later?

```typescript
type PaymentMethod = 'card' | 'bank' | 'crypto'
```

You added `crypto` to the type, but didn't modify the `processPayment` function. TypeScript won't throw any errors because a switch statement without a default case is still syntactically valid.

```typescript
processPayment('crypto') // Nothing gets printed
```

At runtime, when attempting to pay with `crypto`, the switch statement won't match any cases and will simply pass through. Such bugs are easy to miss in testing and can cause major issues if discovered in production.

## What is the never Type?

To understand exhaustive checking, you first need to understand the `never` type.

`never` in TypeScript represents a **type that can never occur**. It's like the empty set (∅) in mathematics. No value can be assigned to the `never` type.

```typescript
let value: never

value = 1 // ❌ Error: Type 'number' is not assignable to type 'never'
value = 'hello' // ❌ Error: Type 'string' is not assignable to type 'never'
value = null // ❌ Error: Type 'null' is not assignable to type 'never'
```

`never` typically appears in situations like these:

```typescript
// Functions that never return
function throwError(message: string): never {
  throw new Error(message)
}

// Infinite loops
function infiniteLoop(): never {
  while (true) {}
}
```

## Control Flow Analysis

One of TypeScript's powerful features is Control Flow Analysis. It follows code branches to narrow down variable types.

```typescript
type PaymentMethod = 'card' | 'bank' | 'crypto'

function process(method: PaymentMethod) {
  if (method === 'card') {
    // Here, method's type is 'card'
  } else if (method === 'bank') {
    // Here, method's type is 'bank'
  } else {
    // Here, method's type is 'crypto'
  }
}
```

When all cases are handled, after the final else block, there are no possible types left for `method`. In other words, it becomes `never`.

```typescript
function process(method: PaymentMethod) {
  if (method === 'card') {
    return
  } else if (method === 'bank') {
    return
  } else if (method === 'crypto') {
    return
  }

  // Here, method's type is never
  // This code is unreachable since all cases have been handled
  method // never
}
```

## The Principle of Compile-time Validation

This raises a crucial question: How can TypeScript perform this validation at **compile time**?

### 1. Union Types Are Sets

TypeScript's type system is based on set theory. The union type `'card' | 'bank' | 'crypto'` is equivalent to the set `{'card', 'bank', 'crypto'}` with three elements.

```typescript
type PaymentMethod = 'card' | 'bank' | 'crypto'
// Represented as a set: { 'card', 'bank', 'crypto' }
```

### 2. Type Narrowing Is Set Operations

When encountering conditional statements in control flow, TypeScript performs operations that remove elements from the set.

```typescript
function process(method: PaymentMethod) {
  // method: { 'card', 'bank', 'crypto' }

  if (method === 'card') {
    // method: { 'card' }  (other elements removed)
    return
  }

  // method: { 'bank', 'crypto' }  ('card' removed)

  if (method === 'bank') {
    // method: { 'bank' }
    return
  }

  // method: { 'crypto' }  ('bank' also removed)

  if (method === 'crypto') {
    // method: { 'crypto' }
    return
  }

  // method: { }  (empty set = never)
}
```

Each branch removes the corresponding case from the set of possible types. When all cases are handled, you get an empty set, which is `never`.

### 3. Assignability Checking Is Subset Checking

In TypeScript, being able to assign `A` to `B` means that set `A` is a subset of set `B`.

```typescript
type A = 'card'
type B = 'card' | 'bank'

let b: B = 'card' as A // ✅ { 'card' } ⊆ { 'card', 'bank' }
```

Since `never` is the empty set, `never` is a subset of every type. Therefore, `never` can be assigned to anything.

```typescript
declare const n: never
const a: string = n // ✅ Empty set is a subset of every set
const b: number = n // ✅
```

Conversely, a non-empty set cannot be a subset of the empty set. Therefore, no value can be assigned to `never`.

```typescript
const x: never = 'card' // ❌ { 'card' } ⊄ { }
```

### 4. The Compiler's Type Checking Process

Now let's see the complete picture. The TypeScript compiler goes through the following process:

```typescript
type PaymentMethod = 'card' | 'bank' | 'crypto'

function processPayment(method: PaymentMethod) {
  switch (method) {
    case 'card':
      // ... handle
      break
    case 'bank':
      // ... handle
      break
    default:
      const _check: never = method
    //    ^^^^^^^^^^^^^^^^^^^^^^^
    //    Compiler checks this assignment
  }
}
```

1. **Type Collection**: The compiler knows that `method`'s initial type is `'card' | 'bank' | 'crypto'`.

2. **Branch Analysis**: After passing `case 'card'`, `'card'` is removed, and after `case 'bank'`, `'bank'` is removed.

3. **Type Calculation When Reaching Default**: In the `default` block, `method`'s type is `'crypto'` (the unhandled case).

4. **Assignability Check**: Check if `'crypto'` can be assigned to `never` in `const _check: never = method`.

5. **Error Generation**: Since `{ 'crypto' } ⊄ { }`, assignment is impossible. Compile error.

This entire process is performed **using only type information** without code execution. This is why compile-time validation is possible.

### 5. Why Is Runtime throw Still Needed?

If it's validated at compile time, why is `throw new Error(...)` still necessary?

```typescript
default:
  const _check: never = method
  throw new Error(`Unhandled: ${method}`)  // Why this?
```

There are two reasons.

First, **defensive programming**. TypeScript types disappear after compilation. If an unexpected value enters at runtime (e.g., an external API returns a new payment method), the type system cannot prevent this.

```typescript
// When receiving API response as any
const method = apiResponse.paymentMethod as PaymentMethod
// Could actually be 'bitcoin'!
```

Second, **satisfying function return types**. When a function must return a value, the compiler might warn that "not all paths return a value." Adding `throw` makes it explicit that this path never returns normally.

```typescript
function getLabel(method: PaymentMethod): string {
  switch (method) {
    case 'card':
      return '카드'
    case 'bank':
      return '계좌이체'
    default:
      const _: never = method
      throw new Error() // Without this line, "not all paths return" warning
  }
}
```

## The Exhaustive Check Pattern

Now we can implement exhaustive checking by combining the `never` type with control flow analysis.

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

The key is assigning `method` to a `never` type variable in the `default` case.

If all cases are handled, the `default` is unreachable, so `method`'s type becomes `never`. Assigning `never` to `never` is valid, so no error occurs.

But what if you miss a case?

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
      // ❌ Error: Type 'string' is not assignable to type 'never'
      // More precisely: Type '"crypto"' is not assignable to type 'never'
      throw new Error(`Unhandled payment method: ${_exhaustiveCheck}`)
  }
}
```

Since the `crypto` case wasn't handled, when reaching `default`, `method`'s type is `'crypto'`. `'crypto'` cannot be assigned to `never`, so a compile error occurs.

This is the essence of exhaustive checking. You can catch missing cases at **compile time**.

## Creating a Helper Function

Since writing this pattern every time is cumbersome, it's convenient to create a helper function.

```typescript
function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${value}`)
}
```

Usage is simple:

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

Since `assertNever`'s return type is `never`, TypeScript knows this function never returns normally. Therefore, type inference works correctly even in code after the switch statement.

## Real-world Examples

### Redux Reducers

This is useful when handling action types in the Redux pattern.

```typescript
type Action =
  {type: 'INCREMENT'} | {type: 'DECREMENT'} | {type: 'RESET'; payload: number}

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

When adding a new action, if the reducer doesn't handle that action, a compile error occurs.

### State Machines

Exhaustive checking also shines when implementing state machines.

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

### Discriminated Unions

When used with discriminated unions, it becomes even more powerful.

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

## What About Other Languages?

Actually, such completeness checking for pattern matching is often provided by default in other languages.

In Rust, if a `match` expression doesn't handle all cases, a compile error occurs.

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
        // ❌ Compile error: Crypto not handled
    }
}
```

Functional languages like Haskell and OCaml also perform completeness checking by default for pattern matching.

In TypeScript, since this feature isn't enforced at the language level, you need to implement it yourself using the `never` type pattern. While slightly cumbersome, it's a sufficiently practical solution.

## Conclusion

The exhaustive check pattern is a powerful way to verify at compile time that all cases of a union type are handled without exception in TypeScript. The core principle is simple:

1. TypeScript's control flow analysis narrows the type to `never` when all cases are handled.
2. No value can be assigned to the `never` type.
3. Therefore, if there are unhandled cases, a compile error occurs.

As codebases grow and union type cases increase, this pattern's value becomes even more apparent. During refactoring, the compiler tells you about missed parts, significantly reducing runtime bugs.

## References

- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking)
- https://github.com/yceffort/blog/issues/773
