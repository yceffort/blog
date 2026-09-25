---
title: 'export default를 쓰지 말아야 할 이유'
tags:
  - javascript
  - bundler
published: true
date: 2020-11-09 23:05:08
description: '근데 쓰는게 뭔가 더 안정적인 기분이야'
---

`export default` 구문은 보통 파일 내에서 한개만 `export`하거나, 대표로 `export`할 것이 있을 때 많이 쓴다.

```typescript
function Foo {
  // ...
}

export default Foo
```

```typescript
export default function Foo {
  // ...
}
```

그리고 쓰는 쪽에서는 이렇게 `import`할 것이다.

```typescript
import Foo from './foo'
```

그런데 왜 이것을 않으면 좋은지 몇 가지 이유를 들어서 설득해보자.

## Table of Contents

## 예제

`foo.ts`

```typescript
export default function Foo() {
  console.log('foo')
}
```

`bar.ts`

```typescript
export function hello() {
  console.log('hello')
}

export function hi() {
  console.log('hi')
}
```

## 검색이 어렵다.

```typescript
import {h} from './bar'
```

default export를 하게 되면 내보내기가 있는지 여부가 불투명하다.

```typescript
import {Foo} from 'something'
```

그러나 기본값이 없으면 코드 intellisense로 내부에 어떤 것을 import 할 수 있는지 쉽게 알 수 있다.

![export](./images/export1.png)

## commonjs

`default`는 `commonjs`를 쓰는 사람들에게는 혼동을 준다. 위의 default export를 `commonjs`로 바꾸면

```javascript
export default function Foo() {
  console.log('foo')
}

module.exports = {
  Foo,
  default: Foo,
}
```

방식으로 해야하는 어려움이 있다.

## re-export

```typescript
export {default as Foo} from './foo'
```

```typescript
export * from './bar'
```

named export 쪽이 다시 export 하는데 있어서 훨씬 편하다.

## 다이나믹 import

```typescript
const foo = await import('./foo')
foo.default()
```

```typescript
const {hello} = await import('./bar')
hello()
```

`default` 한단계를 더 거쳐야 한다.

## 클래스나 함수가 아니면 한줄이 더 필요함.

```typescript
// 이건 안된다
export default const hello = 'hello'

// 이건 가능
export const hi = "hi";
```

```typescript
// 이렇게 해야한다.
const hello = 'hello'

export default hello
```

## 리팩토링의 어려움

`default export`는 가져다 쓰는 곳에서 네이밍을 제멋대로 할 수 있으므로, 리팩토링 하기가 어렵다.

```typescript
import Foo from './foo'
import Wow from './foo'
import Bye from './foo'
```

위 세개는 모두 동일하게 동작하기 때문에, 오타를 수정하는 등의 작업이 어려워 진다.

## 트리 쉐이킹

만약 여러개의 object를 하나의 `default export`로 내보내는 코드가 있다고 가정해보자.

`foo.ts`

```javascript
export default {
  foo1: 'foo1',
  bar1: 'bar1',
}
```

`bar.ts`

```javascript
export const bar2 = 'bar2'
export const foo2 = 'foo2'
```

`index.ts`

```javascript
import Foo from './foo'
import {foo2} from './bar'

console.log(Foo.foo1)
console.log(foo2)
```

[이를 트리쉐이킹을 거치게 되면 아래와 같은 결과가 나온다.](https://rollupjs.org/repl/?version=2.33.1&shareable=JTdCJTIybW9kdWxlcyUyMiUzQSU1QiU3QiUyMm5hbWUlMjIlM0ElMjJtYWluLmpzJTIyJTJDJTIyY29kZSUyMiUzQSUyMmltcG9ydCUyMEZvbyUyMGZyb20lMjAnLiUyRmZvbyclNUNuaW1wb3J0JTIwJTdCJTIwZm9vMiUyMCU3RCUyMGZyb20lMjAnLiUyRmJhciclNUNuJTVDbmNvbnNvbGUubG9nKEZvby5mb28xKSU1Q25jb25zb2xlLmxvZyhmb28yKSUyMiUyQyUyMmlzRW50cnklMjIlM0F0cnVlJTdEJTJDJTdCJTIybmFtZSUyMiUzQSUyMmJhci5qcyUyMiUyQyUyMmNvZGUlMjIlM0ElMjJleHBvcnQlMjBjb25zdCUyMGJhcjIlMjAlM0QlMjAnYmFyMiclNUNuZXhwb3J0JTIwY29uc3QlMjBmb28yJTIwJTNEJTIwJ2ZvbzInJTIyJTdEJTJDJTdCJTIybmFtZSUyMiUzQSUyMmZvby5qcyUyMiUyQyUyMmNvZGUlMjIlM0ElMjJleHBvcnQlMjBkZWZhdWx0JTIwJTdCJTVDbiUyMCUyMGZvbzElM0ElMjAnZm9vMSclMkMlNUNuJTIwJTIwYmFyMSUzQSUyMCdiYXIxJyUyQyU1Q24lN0QlMjIlN0QlNUQlMkMlMjJvcHRpb25zJTIyJTNBJTdCJTIyZm9ybWF0JTIyJTNBJTIyZXMlMjIlMkMlMjJuYW1lJTIyJTNBJTIybXlCdW5kbGUlMjIlMkMlMjJhbWQlMjIlM0ElN0IlMjJpZCUyMiUzQSUyMiUyMiU3RCUyQyUyMmdsb2JhbHMlMjIlM0ElN0IlN0QlN0QlMkMlMjJleGFtcGxlJTIyJTNBbnVsbCU3RA==)

```javascript
var Foo = {
  foo1: 'foo1',
  bar1: 'bar1',
}

const foo2 = 'foo2'

console.log(Foo.foo1)
console.log(foo2)
```

`named exports`를 하는게 번들 사이즈를 더 줄이는데 도움을 준다.

## 결론

그럼에도 불구하고 default export를 쓰는 것을 그만두지는 않을 것 같다. `eslint-config-airbnb` 만 보더라도 [내보낼 것이 한개인 경우에는 default를 쓰는 것을 권장하고 있고](https://github.com/airbnb/javascript#modules--prefer-default-export) `nextjs` 등의 라이브러리에서도 `default export`를 하지 않고서는 할 수 없는 기능들이 더러 있다.

[물론 여전히 두 export 방식에 대해서는 논란이 많지만](https://github.com/airbnb/javascript/issues/1365) 아무래도 `default` 가 깔끔한 건 기분 탓일까, 습관 탓일까 🤔

그래도 **가급적이면** named exports를 하는 방향으로 코드를 써보자. 그럼에도 `default`는 죄가 없는 것 같다.
