---
title: '타입스크립트 type과 interface의 공통점과 차이점'
tags:
  - typescript
published: true
date: 2021-03-21 17:43:42
updated: 2021-03-22 21:15:52
description: 'typescript is coming again........'
---

타입스크립트의 type과 interface의 차이점을 찾아보던 중, 몇 가지 잘못된 사실들을 보면서 진짜로 둘의 차이점이 무엇인지 정리하기 위해서 포스팅한다. (물론 이것도 시간이 지나면 (2021년 3월 기준) 잘못된 사실이 될 수도 있다... 🤪)

## 예제

```typescript
interface PeopleInterface {
  name: string
  age: number
}

const me1: PeopleInterface = {
  name: 'yc',
  age: 34,
}

type PeopleType = {
  name: string
  age: number
}

const me2: PeopleType = {
  name: 'yc',
  age: 31,
}
```

위에서 볼 수 있는 것 처럼, `interface`는 타입과 마찬가지로 객체의 타입의 이름을 지정하는 또 다른 방법이다.

## 차이점

### 확장하는 방법

```typescript
interface PeopleInterface {
  name: string
  age: number
}

interface StudentInterface extends PeopleInterface {
  school: string
}
```

```typescript
type PeopleType = {
  name: string
  age: number
}

type StudentType = PeopleType & {
  school: string
}
```

### 선언적 확장

`interface`에서 할 수 있는 대부분의 기능들은 `type`에서 가능하지만, 한 가지 중요한 차이점은 `type`은 새로운 속성을 추가하기 위해서 다시 같은 이름으로 선언할 수 없지만, `interface`는 항상 선언적 확장이 가능하다는 것이다. 그 차이에 대한 예제가 바로 밑에 있는 것이다.

```typescript
interface Window {
  title: string
}

interface Window {
  ts: TypeScriptAPI
}

// 같은 interface 명으로 Window를 다시 만든다면, 자동으로 확장이 된다.

const src = 'const a = "Hello World"'
window.ts.transpileModule(src, {})
```

```typescript
type Window = {
  title: string
}

type Window = {
  ts: TypeScriptAPI
}

// Error: Duplicate identifier 'Window'.
// 타입은 안된다.
```

### ~~type은 이름이 없다?~~

https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#interfaces 에 다음과 같은 내용이 나와있다.

> Type alias names may appear in error messages, sometimes in place of the equivalent anonymous type (which may or may not be desirable). Interfaces will always be named in error messages.

`type`은 무명의 타입으로 선언되어서 에러메시지에서 뜨지 않을 때가 있고, `interface`는 에러에 항상 이름이 나와 있다고 하지만 이는 더 이상 사실이 아니다. (하단 참조)

### interface는 객체에만 사용이 가능하다.

당연한거 아님? 🤔

```typescript
interface FooInterface {
  value: string
}

type FooType = {
  value: string
}

type FooOnlyString = string
type FooTypeNumber = number

// 불가능
interface X extends string {}
```

### computed value의 사용

`type`은 가능하지만 `interface`는 불가능

```typescript
type names = 'firstName' | 'lastName'

type NameTypes = {
  [key in names]: string
}

const yc: NameTypes = {firstName: 'hi', lastName: 'yc'}

interface NameInterface {
  // error
  [key in names]: string
}
```

### 성능을 위해서는 interface를 사용하는 것이 좋다.

라는 취지의 문서를 본적이 있는데, 이것에 대해서 조금 이야기 해볼까 한다.

https://github.com/microsoft/TypeScript/wiki/Performance#preferring-interfaces-over-intersections

> Interfaces create a single flat object type that detects property conflicts, which are usually important to resolve! Intersections on the other hand just recursively merge properties, and in some cases produce never.

여러 `type` 혹은 `interface`를 `&`하거나 `extends`할 때를 생각해보자. `interface`는 속성간 충돌을 해결하기 위해 단순한 객체 타입을 만든다. 왜냐하면 interface는 객체의 타입을 만들기 위한 것이고, 어차피 객체 만 오기 때문에 단순히 합치기만 하면 되기 때문이다. 그러나 타입의 경우, 재귀적으로 순회하면서 속성을 머지하는데, 이 경우에 일부 `never`가 나오면서 제대로 머지가 안될 수 있다. `interface`와는 다르게, `type`은 원시 타입이 올수도 있으므로, 충돌이 나서 제대로 머지가 안되는 경우에는 `never`가 떨어진다. 아래 예제를 살펴보자.

```typescript
type type2 = {a: 1} & {b: 2} // 잘 머지됨
type type3 = {a: 1; b: 2} & {b: 3} // resolved to `never`

const t2: type2 = {a: 1, b: 2} // good
const t3: type3 = {a: 1, b: 3} // Type 'number' is not assignable to type 'never'.(2322)
const t3: type3 = {a: 1, b: 2} // Type 'number' is not assignable to type 'never'.(2322)
```

따라서 타입 간 속성을 머지 할 때는 주의를 필요로 한다. 어차피 객체에서만 쓰는 용도라면, `interface`를 쓰는 것이 훨씬 낫다.

> Interfaces also display consistently better, whereas type aliases to intersections can't be displayed in part of other intersections.

그러나 위의 명제는 이제 더 이상 사실이 아니다. 이제 type의 경우에도 어디에서 에러가 났는지 잘 알려준다. (어째 문서 업데이트가 못따라가는 느낌이다)

```typescript
type t1 = {
  a: number
}

type t2 = t1 & {
  b: string
}

const typeSample: t2 = {a: 1, b: 2} // error
// before(3.x): Type 'number' is not assignable to type 'string'.
// after(4.x): Type 'number' is not assignable to type 'string'.(2322) input.tsx(14, 5): The expected type comes from property 'b' which is declared here on type 't2'
```

> Type relationships between interfaces are also cached, as opposed to intersection types as a whole.

`interface` 들을 합성할 경우 이는 캐시가 되지만, 타입의 경우에는 그렇지 못하다.

> A final noteworthy difference is that when checking against a target intersection type, every constituent is checked before checking against the "effective"/"flattened" type.

타입 합성의 경우, 합성에 자체에 대한 유효성을 판단하기 전에, 모든 구성요소에 대한 타입을 체크하므로 컴파일 시에 상대적으로 성능이 좋지 않다.

## 결론?

무엇이 되었건 간에, 프로젝트 전반에서 `type`을 쓸지 `interface`를 쓸지 통일은 필요해보인다. 그러나 객체, 그리고 타입간의 합성등을 고려해 보았을 때 `interface`를 쓰는 것이 더 나을지 않을까 싶다.
