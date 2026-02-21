---
title: 'Effect 시스템 심층 분석: 모나드에서 Algebraic Effects까지, 그리고 Effect-TS의 선택'
tags:
  - typescript
  - backend
published: true
date: 2026-02-20 10:00:00
description: 'Effect-TS가 대체 뭔데 다들 난리인지 직접 파헤쳐봤다.'
---

## Table of Contents

## 서론

프로그램은 순수한 계산만으로는 쓸모없다. 네트워크 요청, 파일 읽기, 데이터베이스 쿼리, 로깅 — 모두 side effect다. 문제는 side effect가 프로그램의 추론을 어렵게 만든다는 것이다. 같은 함수를 같은 인자로 호출해도 네트워크 상태에 따라 결과가 달라지고, 에러가 발생하는 위치와 종류를 타입 시그니처만으로는 알 수 없다. 다음 코드를 살펴보자.

```typescript
// 이 함수가 어떤 side effect를 가지는지, 어떤 에러를 던지는지는 함수 밖에서 알 수 없다
async function getUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error('HTTP error')
  return res.json()
}
```

"side effect를 타입 시스템으로 추적할 수 있으면 어떨까?" 이 질문에 대한 학계와 업계의 30년에 걸친 탐구가 이 글의 주제다. Moggi의 모나드에서 시작해, Plotkin과 Pretnar의 algebraic effect handler를 거쳐, TypeScript 생태계에서 Effect-TS가 어떤 현실적 타협을 했는지 살펴본다.

## Effect 시스템의 학술적 기원

"side effect를 타입으로 추적한다"는 아이디어는 하루아침에 나온 것이 아니다. 1991년부터 2009년까지, 약 20년에 걸친 학술 연구의 축적이 있었다.

### Moggi (1991): 모나드로 계산을 모델링하다

1991년, Eugenio Moggi는 ["Notions of Computation and Monads"](https://www.cs.cmu.edu/~crary/819-f09/Moggi91.pdf)라는 논문에서 혁신적인 관찰을 한다. **side effect가 있는 계산을 모나드(monad)라는 수학적 구조로 모델링할 수 있다**는 것이다.

핵심 아이디어는 이렇다. 순수 함수 `A → B`는 "A를 받아 B를 반환한다"는 의미다. 여기에 side effect를 추가하면 `A → T(B)`가 된다. `T`가 모나드이고, "B를 반환하긴 하는데, 그 과정에서 뭔가(effect)가 일어난다"는 것을 타입으로 표현한 것이다.

이 `T`에 무엇을 넣느냐에 따라 다양한 effect를 표현할 수 있다.

- `T(B) = B | Error` → 예외가 발생할 수 있는 계산
- `T(B) = State → (B, State)` → 상태를 변경하는 계산
- `T(B) = List<B>` → 비결정적 계산 (여러 결과 가능)
- `T(B) = IO<B>` → 외부 세계와 상호작용하는 계산

Haskell의 `IO` 모나드가 바로 이 아이디어의 직접적 산물이다. 하지만 모나드에는 근본적인 문제가 있었다. **서로 다른 모나드를 합성하기가 어렵다.** "예외가 발생할 수 있고 상태도 변경하는 계산"을 표현하려면 `EitherT[StateT[IO, S, _], E, A]` 같은 모나드 변환자(Monad Transformer) 스택을 쌓아야 했고, 이는 타입 추론을 망가뜨리고 성능을 저하시켰다.

### Plotkin & Power (2002): 모나드를 분해하다

Plotkin과 Power는 다른 관점을 제시했다. 모나드를 통째로 다루는 대신, **모나드를 개별 연산(operation)으로 분해할 수 있다**는 것이다. 예를 들어, State 모나드는 `get`과 `put` 두 연산으로 분해되고, Exception 모나드는 `raise` 연산으로 분해된다. 이 연산들을 "algebraic operation"이라 불렀다. "algebraic"이라는 이름은, 이 연산들이 대수학(algebra)에서의 연산처럼 일정한 법칙을 따르며 자유롭게 조합할 수 있다는 데서 붙었다. 따라서 **algebraic effect(대수적 효과)**란 "대수적 연산으로 분해할 수 있는 side effect"라는 뜻이다.

이 관찰이 중요한 이유는 **합성 문제를 해결했기 때문**이다. 모나드를 통째로 합성하는 건 어렵지만, 개별 연산들은 자유롭게 조합할 수 있다. "이 계산은 `get`, `put`, `raise`를 사용한다"라고 필요한 연산들을 나열하기만 하면, 그 연산들의 집합이 곧 이 계산의 effect 타입이 된다. 모나드 변환자 스택을 쌓을 필요 없이, 연산을 추가하고 싶으면 집합에 하나 더 넣으면 그만이다.

### Plotkin & Pretnar (2009): Algebraic Effect Handler의 탄생

2009년, Plotkin과 Pretnar는 ["Handlers of Algebraic Effects"](https://homepages.inf.ed.ac.uk/gdp/publications/Effect_Handlers.pdf)를 발표한다. 이 논문의 핵심 기여는 **exception handler를 일반화한 effect handler** 개념이다.

전통적인 exception handling을 생각해보자.

```typescript
try {
  // 예외가 발생할 수 있는 코드
  throw new Error('실패')
} catch (e) {
  // 예외를 처리하지만, 원래 위치로 돌아갈 수 없다
}
```

`throw`는 스택을 풀어버린다. 한 번 예외가 발생하면, 예외가 발생한 지점으로 돌아가 실행을 계속할 수 없다. Plotkin과 Pretnar의 effect handler는 이 제약을 깬다. **handler가 continuation을 받아서, 값을 돌려보내 원래 위치에서 실행을 재개할 수 있다.** 이것이 "resumable exception"이다.

여기서 **continuation**(계속, 연속)이란 "중단된 지점 이후에 남은 계산"을 가리킨다. 예를 들어 `let name = perform Ask; "Hello, " + name`에서 `perform Ask`가 실행을 중단시키면, 그 이후에 남은 계산인 `name을 받아서 "Hello, " + name을 반환하는 것`이 continuation이다. handler는 이 continuation을 값과 함께 호출해서 중단된 지점부터 실행을 이어갈 수 있다.

의사 코드(pseudocode)로 표현하면 이렇다.

```
function getName() {
  // perform: 이펙트를 발생시킨다. throw와 비슷하지만 돌아올 수 있다.
  let name = perform 'askName'
  return "Hello, " + name
}

// handle: 이펙트를 처리한다. catch와 비슷하지만 resume할 수 있다.
try {
  getName()
} handle (effect) {
  if (effect === 'askName') {
    resume with "World"  // getName()의 name에 "World"가 들어가고 실행 계속
  }
}
// 결과: "Hello, World"
```

`perform`은 `throw`처럼 제어를 handler에게 넘기지만, `resume with`로 값을 돌려보내 중단된 지점에서 실행을 재개할 수 있다. 이것이 `try-catch`와의 결정적 차이다.

Dan Abramov가 ["Algebraic Effects for the Rest of Us"](https://overreacted.io/algebraic-effects-for-the-rest-of-us/)에서 설명한 것처럼, 이 메커니즘의 핵심 이점은 **중간 함수가 effect를 인식할 필요가 없다**는 것이다. `getName()`을 호출하는 코드와 `askName` 이펙트를 처리하는 코드 사이에 아무리 많은 함수가 있어도, 중간 함수들은 변경 없이 그대로 둘 수 있다. `async/await`처럼 모든 중간 함수에 `async`를 붙여야 하는 "function coloring" 문제가 발생하지 않는다. Function coloring이란 "함수가 두 가지 색(종류)으로 나뉘어, 한 색의 함수를 호출하려면 호출하는 쪽도 같은 색이어야 하는" 문제를 말한다. `async` 함수를 호출하려면 호출하는 쪽도 `async`여야 하는 것이 대표적인 예다.

### 실제 구현: Koka, Eff, OCaml 5

이 이론은 여러 프로그래밍 언어에서 실제로 구현되었다.

**Koka** (Microsoft Research): Daan Leijen이 설계한 언어로, algebraic effect를 핵심 기능으로 내장한다. 모든 함수의 effect가 row-polymorphic(행 다형성) 타입으로 추적된다. row-polymorphic이란 "effect의 목록이 유연하게 확장 가능하다"는 뜻으로, 함수가 사용하는 effect만 타입에 나열하고 나머지는 열어둘 수 있다. 예를 들어 `fun foo(): <exn, io> int`는 "이 함수는 예외를 던질 수 있고(`exn`), I/O를 수행하며(`io`), `int`를 반환한다"는 뜻이다. 이 effect 타입들은 모나드 변환자 스택 없이 자유롭게 합성된다.

**OCaml 5**: 2022년 릴리스된 OCaml 5는 multicore 지원과 함께 effect handler를 언어에 추가했다. `perform`으로 effect를 발생시키고, handler에서 `continue k value`로 continuation을 resume한다. 다만 single-shot continuation(일회용 continuation)만 지원한다 — 한 번 resume하면 같은 continuation을 다시 사용할 수 없다는 제약이 있지만, 이 덕분에 mutable 데이터와의 상호작용이 예측 가능하고 성능도 좋다.

앞서 본 의사코드와 동일한 동작을 OCaml 5 문법으로 작성하면 이렇다.

```ocaml
(* "문자열을 반환하는 Ask라는 effect가 있다"고 선언 *)
effect Ask : string

(* greet 함수: Ask effect를 발생시키고, 돌아온 값으로 인사말을 만든다 *)
let greet () =
  let name = perform Ask in  (* perform = 앞의 의사코드에서 perform과 동일 *)
  "Hello, " ^ name            (* ^는 문자열 연결 연산자 *)

(* handler: greet()를 실행하되, Ask effect가 발생하면 "World"를 돌려보낸다 *)
let result =
  match_with greet ()
  { effc = fun (type a) (eff : a Effect.t) ->
      match eff with
      | Ask -> Some (fun (k : (a, _) continuation) ->
          continue k "World")  (* continue = 의사코드의 resume with *)
      | _ -> None }
(* result = "Hello, World" *)
```

`perform Ask`가 실행되면 handler에게 제어가 넘어가고, handler가 `continue k "World"`로 `"World"`를 돌려보내면 `name`에 `"World"`가 들어가 실행이 재개된다.

이들의 공통점은 **언어 런타임이 continuation을 지원한다**는 것이다. `perform`이 호출되면 런타임이 현재 실행 상태(continuation)를 캡처하고, handler가 이를 resume할 수 있게 한다. 이 메커니즘은 언어 수준의 지원 없이는 구현할 수 없다.

## Effect-TS는 Algebraic Effect가 아니다

이 지점에서 중요한 구분이 필요하다. **Effect-TS는 algebraic effect를 구현한 것이 아니다.** 모나드 기반으로 effect 추적을 시뮬레이션하는 것이다.

### 근본적 차이

| 관점              | 진짜 Algebraic Effects (Koka, OCaml 5) | Effect-TS                                           |
| ----------------- | -------------------------------------- | --------------------------------------------------- |
| 기반 메커니즘     | 런타임 continuation 캡처               | 모나드 `flatMap` 체이닝                             |
| effect 발생       | `perform` (런타임이 처리)              | `Effect.fail`, `yield*` (타입 수준 추적)            |
| handler의 resume  | continuation을 resume할 수 있음        | 불가능 — 에러를 잡거나 변환만 가능                  |
| function coloring | 없음 — 일반 함수에서 effect 발생 가능  | 있음 — effectful 함수는 `Effect<A, E, R>` 반환 필수 |
| 중간 함수 영향    | 변경 불필요                            | 모든 중간 함수가 Effect 체인에 참여해야 함          |

가장 큰 차이는 **resumption(실행 재개) 불가**다. Algebraic effect handler는 effect가 발생한 지점으로 값을 돌려보내 실행을 재개할 수 있다. Effect-TS에서는 이것이 불가능하다. `catchTag`로 에러를 잡아 다른 값으로 대체할 수는 있지만, 에러가 발생한 바로 그 지점으로 돌아가 계속 실행하는 것은 할 수 없다.

**function coloring** 문제도 존재한다. `async/await`에서 `async` 함수를 호출하려면 호출하는 쪽도 `async`여야 하듯, Effect-TS에서 `Effect<A, E, R>`를 반환하는 함수를 호출하려면 호출하는 쪽도 Effect 체인 안에 있어야 한다.

```typescript
// Effect-TS: function coloring이 존재한다
const getUser = (id: string): Effect.Effect<User, NotFoundError> => /* ... */

// 이 함수를 호출하려면 호출하는 쪽도 Effect 안에 있어야 한다
const program = Effect.gen(function* () {
  const user = yield* getUser('123')  // Effect 체인 안에서만 호출 가능
  return user.name
})

// 일반 함수에서는 직접 호출할 수 없다
function getName(id: string): string {
  const user = getUser(id) // ← 이건 Effect 객체지, User가 아니다
  return user.name         // 타입 에러
}
```

### 왜 모나드 기반인가

TypeScript(JavaScript)에는 algebraic effect를 구현하기 위한 런타임 기능이 없다. `perform`이 호출됐을 때 현재 실행 상태(continuation)를 캡처하고, 나중에 resume하는 메커니즘이 언어에 존재하지 않는다.

JavaScript의 Generator(`function*`)가 어느 정도 continuation의 역할을 하긴 한다. `yield`로 실행을 중단하고 `.next(value)`로 재개할 수 있으니까. 하지만 Generator는 single-frame continuation일 뿐, 전체 콜 스택을 캡처하지 못한다. Generator 안에서 호출한 일반 함수 내부에서 `yield`를 할 수 없다는 것이다. 이것이 바로 "function coloring"이 발생하는 원인이다.

Effect-TS는 이 제약 안에서 최대한의 효과를 끌어낸다. `flatMap`(이전 계산의 결과를 받아 다음 계산을 반환하는 연산 — `Array.flatMap`과 같은 원리지만, 배열 대신 Effect를 이어붙인다) 체이닝으로 계산을 연결하고, `Effect<A, E, R>` 타입의 세 파라미터로 성공 값, 에러, 의존성을 추적한다. Algebraic effect의 perform/handle/resume 메커니즘은 아니지만, **"이 계산이 어떤 effect를 가지는가"를 타입으로 추적한다**는 핵심 아이디어는 공유한다.

## ZIO에서 Effect-TS로: 모나드 기반 접근의 진화

Algebraic effect가 언어 런타임 지원을 필요로 한다면, 런타임 지원이 없는 언어에서는 어떻게 해야 할까. Scala의 ZIO가 먼저 답을 내놨고, Effect-TS는 그 답을 TypeScript로 가져왔다.

### ZIO의 설계 결정

2018년, Scala 생태계의 John De Goes는 모나드 변환자의 실질적 한계에 부딪혔다. `EitherT[Future, Error, A]` 같은 타입 스택은 추론을 망가뜨렸고, 일반 개발자에게 설명하기 어려웠다.

De Goes의 해법은 **세 가지 타입 파라미터를 가진 단일 모나드** `ZIO[R, E, A]`였다.

```scala
// R = 필요한 환경(의존성), E = 실패 타입, A = 성공 타입
ZIO[UserRepository, NotFoundError, User]
```

모나드 변환자 스택 대신, 하나의 타입에 세 가지 관심사를 담았다.

- **A (성공)**: 계산이 성공하면 반환하는 값
- **E (에러)**: 발생 가능한 에러 — `Throwable` 고정이 아니라 제네릭. 컴파일 타임에 어떤 에러가 가능한지 추적된다.
- **R (환경)**: 이 계산을 실행하기 위해 필요한 서비스들. 반변성(contravariance)을 이용해 여러 이펙트의 의존성을 컴파일러가 자동으로 합집합한다. 반변성이란 "소비하는 쪽의 타입은 합쳐질 때 합집합이 된다"는 타입 이론의 성질이다. `R`은 이펙트가 "요구하는(소비하는)" 의존성이므로, 두 이펙트를 합성하면 `R`이 자동으로 `R1 | R2`가 된다.

Haskell의 관습도 버렸다. `pure` 대신 `ZIO.succeed`, `>>=` 대신 `for` comprehension(Scala의 `async/await`에 해당하는 문법). "모나드를 알아야 쓸 수 있는 라이브러리"가 아니라, "모나드를 몰라도 쓸 수 있는 라이브러리"를 지향한 것이다.

### TS+ 컴파일러 포크의 실패

Effect-TS가 ZIO를 TypeScript로 이식하는 과정에서, TS+(ts-plus)라는 실험적 TypeScript 컴파일러 포크가 시도되었다. 파이프 연산자, 연산자 오버로딩, 향상된 Do 문법 등을 TypeScript에 추가하려는 프로젝트였다.

실패 원인은 기술적이면서도 생태계적이었다.

**tsc의 아키텍처 한계**: 현대 빌드 도구(Next.js, Vite, esbuild)는 병렬 컴파일로 속도를 달성한다. TypeScript 컴파일러의 단일 스레드 아키텍처는 이 패러다임과 맞지 않았고, TS+ 포크는 HMR 환경에서 개발 속도를 오히려 악화시켰다.

**도구 생태계와의 충돌**: ESLint, Prettier 같은 도구와의 호환성은 유지했지만, Next.js나 Vite의 빌드 파이프라인에 끼어들 수 없었다. 커스텀 컴파일러를 도입하는 비용이 얻는 편의를 압도한 것이다.

이 경험에서 얻은 교훈은 명확했다. **컴파일러를 건드리지 말고, 순수 라이브러리로 해결하자.** 현재의 Effect-TS는 별도의 컴파일러나 빌드 도구 없이, TypeScript의 타입 시스템만으로 동작한다.

### Effect-TS의 `Effect<A, E, R>`

Effect-TS는 ZIO의 `ZIO[R, E, A]`를 TypeScript에 맞게 재설계했다. 파라미터 순서가 `Effect<A, E, R>`로 바뀌었는데(성공 타입이 먼저), 이는 TypeScript의 제네릭 기본값 문법 때문이다. `E`와 `R`의 기본값을 `never`로 설정하면, 에러나 의존성이 없는 단순한 이펙트를 `Effect<number>`처럼 간결하게 쓸 수 있다.

```typescript
import {Effect, Data, Context} from 'effect'

// 에러 정의 — _tag 필드로 discriminated union 구성
class NotFoundError extends Data.TaggedError('NotFoundError')<{
  readonly id: string
}> {}

class NetworkError extends Data.TaggedError('NetworkError')<{
  readonly cause: unknown
}> {}

// 서비스 인터페이스 정의
class UserRepository extends Context.Tag('UserRepository')<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<User, NotFoundError>
  }
>() {}

// 이 함수의 타입이 모든 것을 말해준다:
// "UserRepository가 필요하고, NotFoundError 또는 NetworkError가 발생할 수 있고, 성공하면 User를 반환한다"
const getUser = (
  id: string,
): Effect.Effect<User, NotFoundError | NetworkError, UserRepository> =>
  Effect.gen(function* () {
    const repo = yield* UserRepository
    return yield* repo.findById(id)
  })
```

## Effect.gen의 내부: Generator로 do-notation 구현하기

`Effect.gen`은 Effect-TS에서 가장 많이 쓰이는 API다. `async/await`처럼 생긴 코드를 쓸 수 있게 해주는데, 내부적으로는 상당히 흥미로운 트릭을 사용한다.

### 왜 `yield*`인가

`yield`가 아니라 `yield*`를 쓰는 이유가 있다. JavaScript의 `yield*`는 다른 iterable/generator에게 **위임(delegation)**하는 연산자다. `yield`가 단일 값을 외부로 전달하는 것과 달리, `yield*`는 내부 generator의 모든 `yield`를 외부로 전파하고, **내부 generator의 return 값을 표현식의 결과로 받을 수 있다.**

```typescript
function* inner() {
  yield 1
  yield 2
  return 42 // ← 이 값이 yield*의 결과가 된다
}

function* outer() {
  const result = yield* inner()
  // result === 42
}
```

Effect-TS는 이 메커니즘을 활용한다. 모든 `Effect` 객체는 `Symbol.iterator`를 구현하고 있어서 `yield*`의 대상이 될 수 있다. 핵심은 Effect의 iterator 구현이 **자기 자신을 `yield`한 뒤, 주입받은 값을 `return`하는** 구조라는 점이다.

```typescript
// Effect 객체의 Symbol.iterator 구현을 단순화하면 이런 구조다
class EffectImpl<A, E, R> {
  *[Symbol.iterator]() {
    // 1. 자기 자신(Effect 객체)을 yield → gen 런타임에 전달
    // 2. 런타임이 이 Effect를 실행한 뒤 .next(result)로 결과를 주입
    // 3. 주입받은 값을 return → yield*의 결과값이 됨
    return (yield this) as A
  }
}
```

`yield* getUser(id)`가 실행되면 이런 일이 벌어진다.

1. `getUser(id)`가 반환한 Effect 객체의 `[Symbol.iterator]()`가 호출된다.
2. 내부 generator가 `yield this`를 실행 — Effect 객체 자체가 `Effect.gen` 런타임으로 전달된다.
3. 런타임이 이 Effect를 실행하고, 결과를 `.next(result)`로 내부 generator에 주입한다.
4. 내부 generator가 `return result` — 이 값이 `yield*`의 평가 결과가 되어 `const user`에 들어간다.

결국 `yield this` → `.next(result)` → `return result`라는 세 단계를 통해, Effect 객체의 "실행"과 "결과 주입"이 generator 프로토콜 안에서 깔끔하게 이루어진다. `Effect.gen` 런타임은 이 과정을 반복하는 루프다.

```typescript
// Effect.gen 런타임의 핵심 루프를 단순화하면 이렇다
function runGen(genFn) {
  const gen = genFn()
  let result = gen.next()

  while (!result.done) {
    const effect = result.value  // yield된 Effect 객체
    const value = runEffect(effect)  // Effect 실행
    result = gen.next(value)  // 결과를 generator에 주입, 다음 yield로 진행
  }

  return result.value  // generator의 return 값 = 최종 성공 값
}
```

코드상으로는 마치 동기적으로 값을 꺼내는 것처럼 보이지만, 실제로는 런타임이 generator 프로토콜을 통해 Effect를 하나씩 받아 실행하고 결과를 되돌려주는 루프가 돌고 있다.

### 타입 추론의 핵심

`yield*`가 Effect 객체를 런타임에 넘길 때, 각 Effect가 가진 에러 타입(`E`)과 의존성 타입(`R`) 정보도 함께 전파된다. `Effect.gen`은 generator 안에서 `yield*`된 모든 Effect의 `E`와 `R`을 모아서, 최종 Effect의 에러 타입과 의존성 타입을 자동으로 추론한다. generator의 return 값이 최종 Effect의 성공 타입 `A`가 된다.

결과적으로, 별도의 타입 어노테이션 없이도 전체 파이프라인의 타입이 정확하게 추론된다.

### 제약: single-shot

이 방식에는 중요한 제약이 있다. JavaScript의 Generator는 **한 번만 순회할 수 있다.** iterator가 진행하면 되돌릴 수 없다. 이 때문에 Effect.gen은 single-shot effect(하나의 결과를 반환하는 Effect)에만 사용할 수 있고, Stream 같은 multi-shot effect에는 쓸 수 없다. Stream을 처리하려면 `pipe`와 전용 연산자를 사용해야 한다.

## Effect-TS가 해결하려는 문제

이론적 배경을 살펴봤으니, 이제 Effect-TS가 실질적으로 어떤 문제를 해결하는지 구체적으로 짚어보자. Promise 기반 코드에서 반복적으로 마주치는 문제들이 Effect-TS의 설계 동기다.

### 에러 타입의 소실

Promise의 에러는 `unknown`이다. `catch` 블록에서 에러의 타입을 알 수 없고, 어떤 에러가 발생할 수 있는지 함수 시그니처에 드러나지 않는다.

```typescript
// Promise: 어떤 에러가 발생하는지 타입에 없다
async function getUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`)
  if (res.status === 404) throw new NotFoundError(id)
  if (!res.ok) throw new NetworkError(res.statusText)
  return res.json()
}

// 호출하는 쪽에서 어떤 에러를 처리해야 하는지 알 수 없다
try {
  const user = await getUser('123')
} catch (e) {
  // e는 unknown — NotFoundError? NetworkError? TypeError?
}
```

에러가 `unknown`이므로 팀 전체가 "이 함수는 이런 에러를 던진다"는 암묵적 규약에 의존하게 된다. 코드가 바뀌면 규약도 바뀌지만, 컴파일러가 알려주지 않는다.

### 암묵적 의존성

함수가 어떤 외부 서비스에 의존하는지 시그니처에 나타나지 않는다.

```typescript
// 이 함수는 DB, Redis, Logger에 의존하지만 시그니처에 없다
async function processOrder(order: Order): Promise<void> {
  const user = await db.findUser(order.userId) // DB 의존
  await redis.set(`order:${order.id}`, order) // Redis 의존
  logger.info('Order processed', {orderId: order.id}) // Logger 의존
  await emailService.send(user.email, 'Order confirmed') // Email 의존
}
```

테스트에서 이 함수를 호출하려면 `db`, `redis`, `logger`, `emailService`를 모킹해야 하는데, 함수 시그니처만 보고는 무엇을 모킹해야 하는지 알 수 없다. 함수 본문을 읽어야 한다.

### 리소스 누수

데이터베이스 커넥션, 파일 핸들 같은 리소스는 반드시 해제해야 한다. `try-finally`로 처리하지만, 여러 리소스가 중첩되면 보일러플레이트가 폭발한다.

```typescript
// 리소스가 늘어날수록 try-finally 중첩이 깊어진다
const conn = await pool.connect()
try {
  const file = await fs.open('/tmp/export.csv', 'w')
  try {
    await exportData(conn, file)
  } finally {
    await file.close()
  }
} finally {
  conn.release()
}
```

에러가 `finally` 안에서 발생하면 원래 에러가 삼켜지는 문제도 있다.

### 동시성 관리의 어려움

`Promise.all`로 병렬 실행할 수 있지만, 하나가 실패했을 때 나머지를 취소하는 것은 직접 구현해야 한다. `AbortController`를 수동으로 관리하는 코드는 읽기 어렵고 누락하기 쉽다.

Effect-TS는 이 네 가지 문제를 `Effect<A, E, R>` 타입 하나로 해결한다. 이제부터 각각을 어떻게 해결하는지 구체적으로 살펴보자.

## Effect-TS의 핵심 기능

앞서 Effect-TS가 해결하려는 문제를 봤다면, 이제 실제로 어떻게 해결하는지 하나씩 살펴보자. 에러 처리, 의존성 주입, 리소스 관리, 동시성까지 — 각 기능이 왜 그렇게 설계되었는지에 초점을 맞춘다.

### pipe와 Effect.gen: 두 가지 코드 스타일

Effect-TS에서 코드를 작성하는 방법은 크게 두 가지다.

**pipe 스타일**: 함수 합성 기반. 데이터 변환이 주된 로직일 때 간결하다.

```typescript
import {Effect, pipe} from 'effect'

const program = pipe(
  Effect.succeed(5),
  Effect.map((n) => n * 2),
  Effect.flatMap((n) => (n > 0 ? Effect.succeed(n) : Effect.fail('negative'))),
  Effect.catchAll((e) => Effect.succeed(0)),
)
```

**gen 스타일**: `async/await`와 유사한 형태. 분기, 반복, 중간 변수가 필요한 복잡한 로직에서 가독성이 좋다.

```typescript
const program = Effect.gen(function* () {
  const n = yield* Effect.succeed(5)
  const doubled = n * 2
  if (doubled <= 0) {
    return yield* Effect.fail('negative')
  }
  return doubled
})
```

두 스타일은 혼용할 수 있다. 실무에서는 비즈니스 로직을 `Effect.gen`으로 작성하고, 에러 처리나 재시도 같은 횡단 관심사를 `pipe`로 붙이는 패턴이 흔하다.

```typescript
const handled = pipe(
  getUser('123'),
  Effect.retry(Schedule.exponential('100 millis')),
  Effect.catchTag('NotFoundError', () => Effect.succeed(defaultUser)),
  Effect.timeout('5 seconds'),
)
```

### 구조화된 에러: Expected Error와 Defect

Effect는 에러를 두 종류로 구분한다. 이 구분은 단순한 관례가 아니라 타입 시스템에 내장되어 있다.

**Expected Error** (`E` 채널): `Effect.fail`로 생성하는 비즈니스 에러다. "사용자를 찾을 수 없음", "결제 실패" 같은 예상 가능한 실패를 타입으로 추적한다.

**Defect**: `Effect.die`로 생성하거나, 잡히지 않은 예외. 0으로 나누기, null 참조 같은 프로그래밍 버그다. `E` 타입에 나타나지 않으며 기본적으로 프로그램을 중단시킨다. Java의 checked vs unchecked exception과 유사한 구분이지만, union 타입 덕분에 checked exception의 "선언부 비대화" 문제가 발생하지 않는다.

에러 정의에는 `Data.TaggedError`를 쓴다. `_tag` 필드가 자동으로 추가되어 discriminated union(판별 유니온 — 공통 필드 값으로 타입을 구분하는 패턴)을 구성한다.

```typescript
import {Data} from 'effect'

class NotFoundError extends Data.TaggedError('NotFoundError')<{
  readonly id: string
}> {}

class NetworkError extends Data.TaggedError('NetworkError')<{
  readonly cause: unknown
}> {}

class ValidationError extends Data.TaggedError('ValidationError')<{
  readonly field: string
  readonly message: string
}> {}
```

에러 처리의 핵심은 `catchTag`와 `catchTags`다. 특정 에러만 선택적으로 처리하면, 처리한 에러가 타입에서 제거된다.

```typescript
// getUser의 타입: Effect<User, NotFoundError | NetworkError | ValidationError>

// catchTag: 특정 에러 하나를 처리
const withFallback = pipe(
  getUser('123'),
  Effect.catchTag('NotFoundError', (e) => Effect.succeed(defaultUser)),
)
// 타입: Effect<User, NetworkError | ValidationError>
// NotFoundError만 처리했으므로 나머지 에러는 그대로 남아있다

// catchTags: 여러 에러를 한 번에 처리
const withAllHandled = pipe(
  getUser('123'),
  Effect.catchTags({
    NotFoundError: (e) => Effect.succeed(defaultUser),
    NetworkError: () => Effect.retry(getUser('123'), Schedule.recurs(3)),
    ValidationError: (e) => Effect.fail(new BadRequestError({field: e.field})),
  }),
)
// 타입: Effect<User, BadRequestError>
// 원래의 세 에러가 모두 처리되고, 새로운 에러 하나로 변환됨
```

`mapError`로 에러를 변환할 수도 있다. 하위 모듈의 세부 에러를 상위 모듈의 추상 에러로 감싸는 패턴이 대표적이다.

```typescript
// 하위 모듈의 세부 에러를 상위 모듈 에러로 변환
const getOrder = (id: string) =>
  pipe(
    getOrderFromDb(id), // Effect<Order, DbConnectionError | DbQueryError>
    Effect.mapError((e) => new OrderServiceError({cause: e})),
  )
// 타입: Effect<Order, OrderServiceError>
```

### Layer와 의존성 주입

`R` 파라미터는 "이 계산을 실행하려면 무엇이 필요한가"를 타입으로 선언한다. 실제로 의존성을 제공하는 것이 `Layer`다.

서비스 정의부터 주입까지의 전체 흐름을 살펴보자.

```typescript
import {Effect, Context, Layer} from 'effect'

// 1. 서비스 인터페이스 정의
class UserRepository extends Context.Tag('UserRepository')<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<User, NotFoundError>
    readonly save: (user: User) => Effect.Effect<void, DbError>
  }
>() {}

class EmailService extends Context.Tag('EmailService')<
  EmailService,
  {
    readonly send: (to: string, body: string) => Effect.Effect<void, EmailError>
  }
>() {}
```

```typescript
// 2. 서비스 사용 — 구현을 모른 채로 인터페이스만 참조
const registerUser = (input: RegisterInput) =>
  Effect.gen(function* () {
    const repo = yield* UserRepository
    const email = yield* EmailService

    const user = createUser(input)
    yield* repo.save(user)
    yield* email.send(user.email, 'Welcome!')
    return user
  })
// 타입: Effect<User, NotFoundError | DbError | EmailError, UserRepository | EmailService>
// R에 UserRepository | EmailService가 자동으로 추론된다
```

```typescript
// 3. 서비스 구현 — Layer로 정의
const UserRepositoryLive = Layer.succeed(UserRepository, {
  findById: (id) =>
    Effect.gen(function* () {
      const result = yield* queryDb(`SELECT * FROM users WHERE id = $1`, [id])
      if (!result) return yield* Effect.fail(new NotFoundError({id}))
      return result
    }),
  save: (user) => queryDb(`INSERT INTO users ...`, [user]),
})

const EmailServiceLive = Layer.succeed(EmailService, {
  send: (to, body) =>
    Effect.tryPromise({
      try: () => sendgrid.send({to, body}),
      catch: (e) => new EmailError({cause: e}),
    }),
})
```

```typescript
// 4. Layer 합성 및 프로그램 실행
const AppLayer = Layer.mergeAll(UserRepositoryLive, EmailServiceLive)

Effect.runPromise(
  registerUser({name: 'Alice', email: 'alice@example.com'}).pipe(
    Effect.provide(AppLayer),
  ),
)
```

**Layer 메모이제이션**: Layer의 중요한 특성은 **참조 동등성 기반 메모이제이션**이다. 같은 Layer 인스턴스가 의존성 그래프의 여러 곳에서 참조되면 한 번만 생성되고 공유된다.

```typescript
// DatabaseLayer를 모듈 수준에서 한 번 정의
const DatabaseLayer = Layer.scoped(
  Database,
  Effect.acquireRelease(connectToDatabase(), (conn) =>
    Effect.sync(() => conn.close()),
  ),
)

// UserRepositoryLayer와 OrderRepositoryLayer가 둘 다 DatabaseLayer에 의존해도
// 데이터베이스 연결은 한 번만 만들어진다
const AppLayer = Layer.mergeAll(UserRepositoryLayer, OrderRepositoryLayer).pipe(
  Layer.provide(DatabaseLayer),
)
```

이는 DI 컨테이너의 singleton scope와 동일한 동작이다. 다만 "참조 동등성"이므로, `makeDbLayer()`를 두 번 호출하면 서로 다른 인스턴스가 되어 각각 생성된다는 점에 주의해야 한다.

**테스트에서의 교체**: Layer 기반 DI의 진짜 장점은 테스트에서 드러난다.

```typescript
// 테스트용 Layer — 실제 DB, Email 없이 순수 함수로 동작
const UserRepositoryTest = Layer.succeed(UserRepository, {
  findById: (id) =>
    id === '1'
      ? Effect.succeed({id: '1', name: 'Test', email: 'test@test.com'})
      : Effect.fail(new NotFoundError({id})),
  save: () => Effect.void,
})

const EmailServiceTest = Layer.succeed(EmailService, {send: () => Effect.void})

const TestLayer = Layer.mergeAll(UserRepositoryTest, EmailServiceTest)

// 같은 비즈니스 로직, 다른 의존성
const result = await Effect.runPromise(
  registerUser(input).pipe(Effect.provide(TestLayer)),
)
```

### 리소스 관리: acquireRelease와 Scope

리소스(데이터베이스 커넥션, 파일 핸들, 네트워크 소켓 등)는 반드시 해제해야 한다. `try-finally`의 중첩 문제를 Effect는 `acquireRelease`로 해결한다.

```typescript
import {Effect} from 'effect'

// acquire(획득)와 release(해제)를 쌍으로 정의
const withDbConnection = Effect.acquireRelease(
  connectToDatabase(), // acquire
  (conn) => Effect.sync(() => conn.close()), // release — 반드시 실행됨
)

// 사용: Effect.scoped로 리소스의 수명을 관리
const program = Effect.scoped(
  Effect.gen(function* () {
    const conn = yield* withDbConnection
    const data = yield* queryDb(conn, 'SELECT ...')
    return data
  }),
)
// conn.close()는 성공이든 실패든 자동으로 호출된다
```

여러 리소스를 중첩하면 LIFO(후입선출) 순서로 해제된다. `try-finally` 중첩 없이 선형적으로 작성할 수 있다.

```typescript
const program = Effect.scoped(
  Effect.gen(function* () {
    const conn = yield* withDbConnection // 1번째 acquire
    const file = yield* withFileHandle // 2번째 acquire
    const lock = yield* withDistributedLock // 3번째 acquire

    yield* exportData(conn, file)
    // 해제 순서: lock → file → conn (LIFO)
  }),
)
```

### 구조적 동시성과 파이버

Effect의 동시성은 **파이버(Fiber)** 기반이며, **구조적(structured)**이다. 파이버란 OS 스레드보다 훨씬 가벼운 "가상 실행 단위"다. 하나의 스레드 위에서 여러 파이버가 협력적으로 스케줄링되므로, 수천 개를 동시에 돌려도 부담이 적다. Go의 goroutine이나 Kotlin의 coroutine과 비슷한 개념이다. "구조적"이라는 것은 부모-자식 관계가 있다는 뜻이다. 부모 이펙트가 종료되면 자식 파이버도 자동으로 정리되어, "잊힌 파이버"가 떠도는 문제가 발생하지 않는다.

```typescript
import {Effect, Fiber} from 'effect'

// Effect.all: 여러 이펙트를 병렬로 실행
const [user, orders, notifications] =
  yield *
  Effect.all([getUser(id), getOrders(id), getNotifications(id)], {
    concurrency: 'unbounded',
  })
// 하나가 실패하면 나머지는 자동으로 중단된다

// concurrency 옵션으로 동시 실행 수를 제한할 수도 있다
const results =
  yield *
  Effect.all(urls.map(fetchUrl), {
    concurrency: 5, // 최대 5개씩 병렬 실행
  })
```

더 세밀한 제어가 필요하면 `fork`로 파이버를 직접 관리한다.

```typescript
const program = Effect.gen(function* () {
  // fork: 백그라운드에서 실행, Fiber 핸들을 반환
  const fiber = yield* Effect.fork(longRunningTask)

  // 다른 작업을 하면서...
  yield* doSomethingElse()

  // 필요할 때 결과를 가져오거나 취소
  const result = yield* Fiber.join(fiber) // 완료 대기
  // 또는
  yield* Fiber.interrupt(fiber) // 취소
})
```

### Schedule: 선언적 재시도 정책

재시도 정책은 `Schedule`이라는 추상화로 표현한다. Schedule은 독립적인 값이므로, 조합해서 복잡한 정책을 만들 수 있다.

```typescript
import {Effect, Schedule} from 'effect'

// 기본 스케줄들
Schedule.recurs(3) // 최대 3회 재시도
Schedule.spaced('1 second') // 1초 간격으로 반복
Schedule.exponential('100 millis') // 지수 백오프: 100ms → 200ms → 400ms → ...

// 이펙트에 재시도 정책 적용
const resilientFetch = pipe(
  fetchData(url),
  Effect.retry(
    Schedule.exponential('100 millis').pipe(
      Schedule.intersect(Schedule.recurs(3)),
    ),
  ),
)
```

Schedule의 세 가지 조합 방식은 각각 의미론이 다르다.

```typescript
// intersect: 두 스케줄 모두 "계속"이어야 진행. 더 긴 지연 사용.
// → "지수 백오프로 재시도하되, 최대 3회까지만"
Schedule.exponential('100 millis').pipe(Schedule.intersect(Schedule.recurs(3)))
// 100ms → 200ms → 400ms → 종료

// union: 하나라도 "계속"이면 진행. 더 짧은 지연 사용.
// → "3회 재시도 후에도 1초마다 계속 재시도"
Schedule.recurs(3).pipe(Schedule.union(Schedule.spaced('1 second')))

// andThen: 첫 번째를 끝낸 후 두 번째로 전환.
// → "처음 3회는 빠르게, 그 후에는 느리게"
Schedule.recurs(3).pipe(Schedule.andThen(Schedule.spaced('5 seconds')))
```

`intersect`는 교집합(둘 다 동의해야 계속)이고, `union`은 합집합(하나라도 동의하면 계속)이다.

### Schema: 외부 경계의 타입 안전성

Effect 생태계의 `Schema` 모듈은 [Zod](https://npmx.dev/package/zod)와 유사한 역할을 하지만, Effect 파이프라인과 깊이 통합되어 있다. 핵심 차이는 **양방향 변환(encode/decode)**을 일급으로 지원한다는 점이다.

```typescript
import {Schema} from 'effect'

const User = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  age: Schema.Number.pipe(Schema.between(0, 150)),
  createdAt: Schema.DateFromString, // 문자열 ↔ Date 양방향 변환
})

// TypeScript 타입 자동 추출
type User = typeof User.Type
// { id: string; name: string; age: number; createdAt: Date }

// decode: 외부 데이터 → 내부 타입 (유효성 검증 포함)
const parseUser = Schema.decodeUnknown(User)
// encode: 내부 타입 → 외부 데이터 (직렬화)
const serializeUser = Schema.encode(User)
```

Zod는 "외부 데이터를 파싱한다"에 초점을 맞추지만, Schema는 "파싱과 직렬화를 하나의 스키마로 정의한다"를 지향한다. `createdAt` 필드를 보면, decode 시에는 `"2024-01-01"` 문자열을 `Date` 객체로 변환하고, encode 시에는 `Date` 객체를 다시 문자열로 변환한다. API 응답 파싱과 API 요청 직렬화에 같은 스키마를 쓸 수 있다.

`Schema.decodeUnknown`의 반환 타입이 `Effect`이므로, 에러 처리가 Effect 파이프라인에 자연스럽게 합류한다.

```typescript
const handleRequest = (raw: unknown) =>
  Effect.gen(function* () {
    // 파싱 실패 시 ParseError가 E 채널에 자동으로 추가됨
    const user = yield* Schema.decodeUnknown(User)(raw)
    return yield* processUser(user)
  })
```

### Promise 생태계와의 상호운용

Effect-TS는 기존 Promise 기반 코드와의 상호운용을 염두에 두고 설계되었다. 경계(boundary)에서 Effect와 Promise 사이를 전환할 수 있다.

```typescript
// Promise → Effect: 기존 라이브러리를 Effect 세계로 가져오기
const fetchUser = (id: string) =>
  Effect.tryPromise({
    try: () => fetch(`/api/users/${id}`).then((r) => r.json()),
    catch: (e) => new NetworkError({cause: e}),
  })
// 타입: Effect<unknown, NetworkError>
// catch로 에러 타입을 명시할 수 있다

// Effect → Promise: Effect 세계에서 나가기
const main = async () => {
  const user = await Effect.runPromise(program)
  // 또는 에러를 Exit으로 받아 직접 처리
  const exit = await Effect.runPromiseExit(program)
}
```

이 경계 API 덕분에 기존 코드베이스에 Effect를 점진적으로 도입할 수 있다. 기존 Express 핸들러의 내부 로직만 Effect로 작성하고, 핸들러의 진입/출구에서 `Effect.tryPromise`와 `Effect.runPromise`로 전환하는 식이다.

## Promise와의 비교: 무엇을 얻고, 무엇을 잃는가

Effect가 Promise에 비해 얻는 것을 정리하면 이렇다.

| 관점        | Promise                    | Effect                        |
| ----------- | -------------------------- | ----------------------------- |
| 에러 타입   | `unknown` (추적 불가)      | 제네릭 `E` (컴파일 타임 추적) |
| 의존성      | 암묵적 (import, 전역 상태) | 명시적 `R` 파라미터           |
| 실행 시점   | 생성 즉시 실행 (eager)     | 실행 지시 시 실행 (lazy)      |
| 취소        | AbortController (수동)     | 구조적 동시성 (자동)          |
| 리소스 관리 | try-finally (수동)         | acquireRelease (자동)         |
| 재시도      | 직접 구현                  | Schedule (선언적)             |

**lazy evaluation**은 특히 중요하다. Promise는 생성과 동시에 실행되지만, Effect는 "실행 계획"일 뿐이다. 이 특성 덕분에 이펙트를 자유롭게 조합하고, 재시도하고, 스케줄링할 수 있다.

반면 잃는 것도 있다.

**학습 곡선**: `pipe`, `Effect.gen`, `Layer`, `Context.Tag`, `Schema` 등의 개념을 모두 익혀야 한다. 팀 전체가 이 패러다임에 동의하고 학습해야 하는 비용이 크다.

**function coloring**: 앞서 설명한 대로, 모든 effectful 함수가 `Effect` 타입을 반환해야 한다. 기존 코드베이스에 점진적으로 도입할 수는 있지만(`Effect.tryPromise`로 Promise를 감싸고, `Effect.runPromise`로 다시 꺼내는 방식), Effect 영역과 비-Effect 영역의 경계가 항상 존재한다.

**생태계 크기**: npm의 대부분의 라이브러리는 Promise 기반이다. 이들을 Effect로 감싸는 보일러플레이트가 필요하다.

솔직히 말하면, 이 trade-off가 정당화되는 시점은 **시스템 복잡도가 일정 수준을 넘었을 때**다. 간단한 CRUD API라면 Promise와 `try-catch`로 충분하다. 하지만 여러 외부 서비스와 통신하고, 복잡한 에러 복구 로직이 필요하고, 의존성 그래프가 깊어지는 시스템이라면, "에러가 타입으로 추적되고, 의존성이 명시되고, 리소스가 자동으로 관리되는" 이점이 학습 비용을 상쇄한다.

## 마치며

"side effect를 타입으로 추적한다"는 아이디어는 Moggi(1991)의 모나드에서 시작해, Plotkin과 Pretnar(2009)의 algebraic effect handler로 정교화되었고, Koka와 OCaml 5에서 언어 수준으로 구현되었다.

Effect-TS는 이 계보의 끝에 있지만, 중요한 선택을 했다. **진짜 algebraic effect가 아니라 모나드 기반 시뮬레이션**이라는 것이다. TypeScript 런타임이 continuation을 지원하지 않으므로, perform/handle/resume 대신 `flatMap` 체이닝과 `Effect<A, E, R>` 타입 파라미터로 effect를 추적한다. Function coloring 문제가 존재하고, resumable exception은 불가능하다.

그럼에도 Effect-TS가 가치 있는 이유는, **TypeScript의 타입 시스템만으로 할 수 있는 최대치를 보여주기 때문**이다. 에러가 타입으로 추적되고, 의존성이 컴파일 타임에 검증되고, 리소스 생명주기가 자동 관리된다. TS+ 컴파일러 포크의 실패 이후 "순수 라이브러리로, 기존 도구와 호환되게"라는 실용적 방향을 택한 것도 현명한 판단이었다.

그렇다면 실무에서 도입할 가치가 있을까? 솔직히 말하면 **대부분의 프로젝트에는 과하다.** React/Next.js 기반의 일반적인 프론트엔드 앱이나 간단한 CRUD API라면, `try-catch`와 Promise로 충분하다. 에러 타입 추적이 필요하면 [`neverthrow`](https://npmx.dev/package/neverthrow) 같은 가벼운 Result 타입 라이브러리로 80%는 해결되고, DI가 필요하면 NestJS의 DI나 [`tsyringe`](https://npmx.dev/package/tsyringe)로 충분하다. Effect-TS의 학습 곡선은 가파르고, 팀 전체가 이 패러다임에 동의하고 학습해야 하는 비용은 결코 작지 않다.

Effect-TS가 진가를 발휘하는 건 **시스템 복잡도가 일정 수준을 넘었을 때**다. 여러 외부 서비스(DB, Redis, 메시지큐, 외부 API)를 오케스트레이션해야 하고, 에러 복구 로직이 비즈니스의 핵심이며(결제, 주문 처리 등), 의존성 그래프가 깊은 백엔드 시스템이라면 — 에러 추적, DI, 리소스 관리, 재시도 정책이 하나의 일관된 시스템으로 통합되는 이점이 학습 비용을 상쇄할 수 있다. 결국 "에러를 타입으로, 의존성을 타입으로, 리소스를 타입으로" 추적하는 것이 **우리 프로젝트에 정말 필요한가**가 판단 기준이다.

한편으로는 JavaScript 언어 자체의 진화도 지켜볼 필요가 있다. `using` 선언(Explicit Resource Management)은 동기 버전이 이미 Stage 4로 표준에 포함되었고(TypeScript는 5.2부터 지원), 패턴 매칭 제안도 진행 중이다. 언어 수준의 지원이 늘어날수록, Effect-TS 같은 라이브러리가 직접 해결해야 하는 영역은 줄어들 것이다. Effect-TS는 훌륭한 기술적 성취이지만, 모든 프로젝트의 정답은 아니다. 도구의 가치는 그 도구가 해결하는 문제의 크기에 비례한다.

## 참고

- [Notions of Computation and Monads - Moggi (1991)](https://www.cs.cmu.edu/~crary/819-f09/Moggi91.pdf)
- [Handlers of Algebraic Effects - Plotkin & Pretnar (2009)](https://homepages.inf.ed.ac.uk/gdp/publications/Effect_Handlers.pdf)
- [Algebraic Effects for the Rest of Us - Dan Abramov](https://overreacted.io/algebraic-effects-for-the-rest-of-us/)
- [OCaml 5 Effect Handlers](https://ocaml.org/manual/5.4/effects.html)
- [Algebraic Effects for Functional Programming - Koka (Daan Leijen)](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/08/algeff-tr-2016-v2.pdf)
- [ZIO History - John De Goes](https://degoes.net/articles/zio-history)
- [TS+ Postmortem](https://effect.website/blog/ts-plus-postmortem/)
- [Effect 공식 문서](https://effect.website/docs/getting-started/introduction/)
- [Effect Patterns Hub](https://github.com/PaulJPhilp/EffectPatterns)
- [Exploring Effect in TypeScript - Tweag](https://www.tweag.io/blog/2024-11-07-typescript-effect/)
