---
title: '자바스크립트 개발자를 위한 AST 이해하기 (2026년 업데이트)'
tags:
  - javascript
  - compiler
published: true
date: 2021-05-10 09:40:39
description: 'AST의 개념부터 파싱 과정, 주요 노드 타입, 그리고 Babel·ESLint 같은 도구에서의 활용까지 정리합니다.'
---

요즘 자바스크립트 프로젝트를 하다보면, `devDependencies`에 정말 많은 의존성이 있음을 알 수 있다. 자바스크립트 트랜스파일링, 코드 최소화, CSS pre-processor, eslint, prettier 등등등. 이러한 기능들은 실제 프로덕션 코드로 올라가는 것은 아니지만, 개발 과정에서 중요한 것들을 담당한다. 그리고 이러한 툴들은 AST processing을 기반으로 작동한다.

## Table of Contents

## AST 란 무엇인가?

> 컴퓨터 과학에서 추상 구문 트리(abstract syntax tree, AST), 또는 간단히 구문 트리(syntax tree)는 프로그래밍 언어로 작성된 소스 코드의 추상 구문 구조의 트리이다. 이 트리의 각 노드는 소스 코드에서 발생되는 구조를 나타낸다.
>
> https://ko.wikipedia.org/wiki/%EC%B6%94%EC%83%81_%EA%B5%AC%EB%AC%B8_%ED%8A%B8%EB%A6%AC

쉽게 말하면, 코드라는 문자열을 컴퓨터가 이해할 수 있는 트리 구조의 데이터로 변환한 것이다. 코드에 있는 각 요소(변수 선언, 함수 호출, 연산자 등)가 트리의 노드가 된다. 예제를 보면 바로 감이 올 것이다.

> 모든 예제는 https://astexplorer.net/ 에서 확인해볼 수 있다.

```javascript
function square(n) {
  return n * n
}
```

이 코드를 AST로 변환하면, 트리 구조로 보면 대략 이런 모양이다.

```
Program
└── FunctionDeclaration (name: "square")
    ├── params
    │   └── Identifier (name: "n")
    └── body (BlockStatement)
        └── ReturnStatement
            └── BinaryExpression (operator: "*")
                ├── left: Identifier (name: "n")
                └── right: Identifier (name: "n")
```

코드의 모든 요소가 트리의 노드에 1:1로 매핑되는 것을 볼 수 있다. `function square(n)`은 `FunctionDeclaration` 노드가 되고, 그 안의 `return n * n`은 `ReturnStatement` 아래 `BinaryExpression`이 된다.

실제로 파서가 만들어내는 AST JSON은 위치 정보(`loc`, `range`, `start`, `end`)같은 메타데이터가 잔뜩 포함되어 있어서 훨씬 장황하다. 핵심 구조만 뽑아보면 이렇다.

```json
{
  "type": "Program",
  "body": [
    {
      "type": "FunctionDeclaration",
      "id": { "type": "Identifier", "name": "square" },
      "params": [{ "type": "Identifier", "name": "n" }],
      "body": {
        "type": "BlockStatement",
        "body": [
          {
            "type": "ReturnStatement",
            "argument": {
              "type": "BinaryExpression",
              "operator": "*",
              "left": { "type": "Identifier", "name": "n" },
              "right": { "type": "Identifier", "name": "n" }
            }
          }
        ]
      }
    }
  ]
}
```

> 전체 AST JSON이 궁금하다면 [AST Explorer](https://astexplorer.net/)에 위 코드를 붙여넣으면 바로 확인할 수 있다.

## 코드에서 AST가 만들어지는 과정

그런데 어떻게 코드 문자열에서 이런 트리가 만들어지는 걸까? 크게 두 단계를 거친다.

### 1단계: 렉시컬 분석 (Lexical Analysis)

렉시컬 분석기(scanner, tokenizer라고도 한다)는 코드 문자열을 **토큰(token)** 단위로 쪼갠다. 토큰은 의미를 가지는 가장 작은 단위라고 보면 된다.

```javascript
function square(n) {
  return n * n
}
```

위 코드를 토큰화하면 이런 결과가 나온다.

```
[
  { type: 'keyword',    value: 'function' },
  { type: 'identifier', value: 'square' },
  { type: 'punctuator', value: '(' },
  { type: 'identifier', value: 'n' },
  { type: 'punctuator', value: ')' },
  { type: 'punctuator', value: '{' },
  { type: 'keyword',    value: 'return' },
  { type: 'identifier', value: 'n' },
  { type: 'punctuator', value: '*' },
  { type: 'identifier', value: 'n' },
  { type: 'punctuator', value: '}' },
]
```

렉시컬 분석기가 코드를 글자 단위로 읽으면서, `function`같은 키워드, `square`같은 식별자, `(`같은 구두점을 구분해낸다. 공백이나 줄바꿈은 이 과정에서 제거된다.

실제로 아주 단순한 토크나이저가 어떻게 동작하는지 살펴보자. 아래는 숫자와 사칙연산만 처리하는 미니 토크나이저다.

```javascript
function tokenize(code) {
  const tokens = []
  let i = 0

  while (i < code.length) {
    const char = code[i]

    // 공백은 건너뛴다
    if (/\s/.test(char)) {
      i++
      continue
    }

    // 숫자: 연속된 숫자를 하나의 토큰으로
    if (/[0-9]/.test(char)) {
      let value = ''
      while (i < code.length && /[0-9]/.test(code[i])) {
        value += code[i++]
      }
      tokens.push({ type: 'number', value })
      continue
    }

    // 연산자
    if ('+-*/'.includes(char)) {
      tokens.push({ type: 'operator', value: char })
      i++
      continue
    }

    throw new Error(`알 수 없는 문자: ${char}`)
  }

  return tokens
}

tokenize('12 + 3 * 45')
// [
//   { type: 'number', value: '12' },
//   { type: 'operator', value: '+' },
//   { type: 'number', value: '3' },
//   { type: 'operator', value: '*' },
//   { type: 'number', value: '45' },
// ]
```

핵심은 간단하다. 현재 글자를 보고 "이게 숫자의 시작인지, 연산자인지, 공백인지" 판단한 뒤, 적절한 토큰으로 분류한다. 실제 자바스크립트 파서의 토크나이저는 문자열(`'...'`, `"..."`), 정규식(`/.../`), 템플릿 리터럴(`` `...` ``) 등 훨씬 복잡한 케이스를 처리해야 하지만, 기본 원리는 동일하다.

### 2단계: 구문 분석 (Syntax Analysis)

구문 분석기(parser)는 위에서 나온 토큰 목록을 받아서, 언어의 문법 규칙에 따라 **트리 구조**로 조립한다. `function` 키워드 다음에 식별자가 오고, 괄호 안에 파라미터가 있고... 이런 문법 규칙을 적용해서 토큰들 사이의 관계를 트리로 만든다. 문법에 맞지 않는 코드가 들어오면 여기서 `SyntaxError`가 발생한다. 그리고 이 결과물이 바로 `Abstract Syntax Tree`다.

파서가 하는 일 중 가장 흥미로운 부분은 **연산자 우선순위** 처리다. `1 + 2 * 3`을 생각해보자. 단순히 왼쪽에서 오른쪽으로 읽으면 `(1 + 2) * 3 = 9`가 되겠지만, 수학적으로 올바른 결과는 `1 + (2 * 3) = 7`이다. 파서는 이 우선순위를 트리 구조로 표현한다.

```
// 1 + 2 * 3 의 AST
// 곱셈이 더 깊은 위치에 있으므로 먼저 계산된다

BinaryExpression (+)
├── left: NumericLiteral (1)
└── right: BinaryExpression (*)
    ├── left: NumericLiteral (2)
    └── right: NumericLiteral (3)
```

`*`가 `+`보다 트리의 더 아래(깊은 곳)에 위치한다. 트리를 아래에서 위로 평가하면, `2 * 3`이 먼저 계산되고 그 결과에 `1`을 더하게 된다. 괄호를 명시적으로 쓰지 않아도 연산 순서가 트리 구조에 자연스럽게 인코딩되는 것이다.

"Abstract(추상)"이라는 이름이 붙은 이유는, 괄호나 세미콜론 같은 구문적 장식은 트리 구조 자체에 암시적으로 포함되기 때문에 별도의 노드로 표현하지 않기 때문이다. 위 예시에서 `(2 * 3)`이라고 괄호를 써도 AST 구조는 동일하다. 괄호의 의미(우선순위)가 이미 트리 구조에 반영되어 있기 때문이다.

> 참고: 괄호나 세미콜론까지 모든 구문 요소를 포함하는 트리를 CST(Concrete Syntax Tree)라고 한다. prettier처럼 원본 코드의 형태를 최대한 보존해야 하는 도구는 CST에 가까운 표현을 사용하기도 한다.

### 자바스크립트 파서들

자바스크립트 생태계에는 여러 파서가 존재한다. 대부분 [ESTree](https://github.com/estree/estree) 라는 AST 스펙을 따르기 때문에, 기본적인 노드 구조는 파서가 달라도 호환된다.

| 파서 | 언어 | 특징 |
|------|------|------|
| [acorn](https://github.com/acornjs/acorn) | JS | 가볍고 빠름. webpack, eslint의 기본 파서 |
| [@babel/parser](https://github.com/babel/babel/tree/master/packages/babel-parser) | JS | JSX, TypeScript, Stage 0 제안까지 지원. ESTree 호환 모드 제공 |
| [typescript](https://github.com/microsoft/TypeScript) | TS | TypeScript 컴파일러 내장 파서. 자체 AST 포맷 사용 (ESTree 아님) |
| [SWC](https://swc.rs/) | Rust | Rust로 작성. Babel 대비 수십 배 빠름 |
| [oxc](https://oxc-project.github.io/) | Rust | Rust로 작성. ESLint 대체를 목표로 하는 프로젝트의 파서 |

어떤 파서를 쓰든 "코드 → 토큰 → AST" 파이프라인의 기본 구조는 같다. 다만 지원하는 문법 범위, 성능, 에러 복구 능력 등에서 차이가 난다.

### 더 알아보기

- 컴파일러에 대해서 배우고 싶다면, [The-super-tiny-compiler](https://github.com/jamiebuilds/the-super-tiny-compiler)를 보는 것을 추천한다. 자바스크립트로 쓰여진 가장 간단한 컴파일러 예제를 구현해두었다.
- [AST Explorer](https://astexplorer.net/) - 코드를 붙여넣으면 바로 AST를 볼 수 있다. 파서도 여러 개 골라볼 수 있다.
- [@babel/parser](https://github.com/babel/babel/tree/master/packages/babel-parser) 구 babylon

## AST 노드 타입 이해하기

AST를 다루려면 주요 노드 타입을 알아야 한다. [ESTree 스펙](https://github.com/estree/estree)을 기준으로 자바스크립트 AST 노드는 크게 세 가지로 나뉜다.

### Statement vs Expression

이 두 가지 구분이 가장 중요하다.

- **Statement(문)**: 동작을 수행한다. 값을 만들어내지 않는다. `if`, `for`, `return`, `변수 선언` 등.
- **Expression(식)**: 값을 만들어낸다. `1 + 2`, `foo()`, `a ? b : c` 등.

```javascript
// Statement: 값을 만들지 않는다 (변수에 담을 수 없다)
if (true) { }
for (let i = 0; i < 10; i++) { }

// Expression: 값을 만든다 (변수에 담을 수 있다)
const x = 1 + 2
const y = condition ? 'a' : 'b'
const z = foo()
```

이 구분이 중요한 이유는 AST를 순회할 때 "어떤 노드 타입을 찾을 것인가"를 결정하기 때문이다. 예를 들어 함수 호출을 모두 찾고 싶다면 `CallExpression`을, 변수 선언을 찾고 싶다면 `VariableDeclaration`(Statement)을 타겟으로 잡으면 된다.

### 주요 노드 타입

실제로 자주 만나는 노드 타입들을 코드와 함께 정리하면 이렇다.

```javascript
// VariableDeclaration + VariableDeclarator
const x = 1
// { type: "VariableDeclaration", kind: "const",
//   declarations: [{ type: "VariableDeclarator",
//     id: Identifier("x"), init: NumericLiteral(1) }] }

// FunctionDeclaration
function foo(a, b) { return a + b }
// { type: "FunctionDeclaration", id: Identifier("foo"),
//   params: [Identifier("a"), Identifier("b")],
//   body: BlockStatement }

// ArrowFunctionExpression
const add = (a, b) => a + b
// { type: "ArrowFunctionExpression",
//   params: [Identifier("a"), Identifier("b")],
//   body: BinaryExpression("+") }

// CallExpression
console.log('hello')
// { type: "CallExpression",
//   callee: MemberExpression(console, log),
//   arguments: [StringLiteral("hello")] }

// MemberExpression
obj.prop
obj['prop']
// { type: "MemberExpression", object: Identifier("obj"),
//   property: Identifier("prop"), computed: false | true }

// ConditionalExpression (삼항 연산자)
a ? b : c
// { type: "ConditionalExpression",
//   test: Identifier("a"),
//   consequent: Identifier("b"),
//   alternate: Identifier("c") }

// IfStatement
if (condition) { doA() } else { doB() }
// { type: "IfStatement",
//   test: Identifier("condition"),
//   consequent: BlockStatement,
//   alternate: BlockStatement }
```

패턴이 보이는가? 모든 노드는 `type` 필드로 구분되고, 노드 타입에 따라 정해진 프로퍼티들이 있다. `BinaryExpression`이면 `left`, `operator`, `right`가 있고, `IfStatement`면 `test`, `consequent`, `alternate`가 있다. 이 구조를 알면 AST 기반 도구를 훨씬 수월하게 다룰 수 있다.

> ESTree 스펙 전체는 [estree/estree](https://github.com/estree/estree/blob/master/es2015.md)에서 확인할 수 있다.

## 유즈케이스 1: 트랜스파일링 (Babel)

가장 대표적인 AST 활용 사례는 트랜스파일링이다. https://babeljs.io/ 바벨은 자바스크립트 컴파일러로, 크게 3단계로 이루어진다.

1. **Parsing**: 코드를 AST로 변환
2. **Transforming**: AST를 순회하면서 원하는 형태로 변환
3. **Generation**: 변환된 AST를 다시 코드 문자열로 출력

### Parse & Generate

가장 기본적인 형태는 파싱하고 다시 코드를 생성하는 것이다.

```javascript
import * as parser from '@babel/parser'
import generate from '@babel/generator'

const code = `const welcome = 'hello world'`

// 1. 코드 → AST
const ast = parser.parse(code)

// 2. AST → 코드
const output = generate(ast)
console.log(output.code) // const welcome = 'hello world'
```

이것만 보면 "그래서 뭐?" 싶을 수 있다. 핵심은 1단계와 2단계 사이에서 AST를 변환하는 것이다.

### Traverse & Transform

바벨의 진짜 힘은 `@babel/traverse`로 AST를 순회하면서 노드를 수정하는 데 있다. 간단한 예제를 보자. 모든 `const`를 `let`으로 바꾸는 코드다.

```javascript
import * as parser from '@babel/parser'
import _traverse from '@babel/traverse'
import _generate from '@babel/generator'

const traverse = _traverse.default
const generate = _generate.default

const code = `
  const a = 1
  const b = 2
`

const ast = parser.parse(code)

// AST를 순회하면서 const → let으로 변환
traverse(ast, {
  VariableDeclaration(path) {
    if (path.node.kind === 'const') {
      path.node.kind = 'let'
    }
  },
})

const output = generate(ast)
console.log(output.code)
// let a = 1;
// let b = 2;
```

`traverse`에 전달하는 객체의 키가 바로 AST 노드 타입이다. `VariableDeclaration`이라는 타입의 노드를 만날 때마다 콜백이 실행된다. 이 구조를 **visitor 패턴**이라고 하는데, AST 기반 도구들이 거의 다 이 패턴을 쓴다.

### path 객체 이해하기

위 예제에서 콜백이 받는 `path`는 단순한 노드 래퍼가 아니다. AST 트리 안에서의 위치와 관계 정보를 모두 담고 있는 객체다.

```javascript
traverse(ast, {
  Identifier(path) {
    path.node             // 현재 AST 노드 자체
    path.parent           // 부모 노드
    path.parentPath       // 부모의 path 객체
    path.scope            // 현재 스코프 정보

    // 조작 메서드
    path.replaceWith(newNode)    // 현재 노드를 다른 노드로 교체
    path.remove()                // 현재 노드 삭제
    path.insertBefore(newNode)   // 현재 노드 앞에 새 노드 삽입
    path.insertAfter(newNode)    // 현재 노드 뒤에 새 노드 삽입

    // 탐색 메서드
    path.findParent(p => p.isFunction())  // 조건에 맞는 부모 찾기
    path.getSibling(0)                     // 형제 노드 접근
  }
})
```

`path.scope`도 강력한 기능이다. 변수가 어디서 선언되었는지, 어디서 참조되고 있는지를 추적할 수 있다.

```javascript
traverse(ast, {
  Identifier(path) {
    const binding = path.scope.getBinding(path.node.name)
    if (binding) {
      console.log(binding.kind)           // 'const', 'let', 'var', 'param' 등
      console.log(binding.referenced)     // 참조되고 있는지
      console.log(binding.references)     // 참조 횟수
      console.log(binding.referencePaths) // 참조 위치들
    }
  }
})
```

이런 기능이 있기 때문에 "사용되지 않는 변수 찾기", "변수 이름 안전하게 바꾸기" 같은 작업이 가능해진다.

### 바벨 플러그인

좀 더 실용적인 예를 하나 더 보자. `console.log`를 모두 제거하는 바벨 플러그인이다.

```javascript
// babel-plugin-remove-console.js
export default function () {
  return {
    visitor: {
      CallExpression(path) {
        const { callee } = path.node
        if (
          callee.type === 'MemberExpression' &&
          callee.object.name === 'console' &&
          callee.property.name === 'log'
        ) {
          path.remove()
        }
      },
    },
  }
}
```

`CallExpression` 노드 중에서 `console.log` 호출을 찾아서 `path.remove()`로 삭제한다. 프로덕션 빌드에서 콘솔 로그를 제거하는 실제 플러그인들이 이런 식으로 동작한다.

> babel과 관련된 자세한 내용은 https://github.com/jamiebuilds/babel-handbook 에서 공부해볼 수 있다.

## 유즈케이스 2: 코드 자동 리팩토링 (JSCodeShift)

다음으로 알아볼 유즈케이스는, 코드를 자동으로 리팩토링 해주는 [JSCodeShift](https://github.com/facebook/jscodeshift)다. 예를 들어, 아래와 같은 변환을 하고 싶다고 하자.

```javascript
// before
load().then(function (response) {
  return response.data
})

// after
load().then((response) => response.data)
```

단순한 찾아 바꾸기가 아니기 때문에, 일반적인 텍스트 에디터에서는 이러한 리팩토링이 불가능하다. 이것을 가능하게 하는 것이 `jscodeshift`다.

`jscodeshift`는 `codemods`를 실행시키는 툴킷이다. `codemods`에서 실제 AST를 활용한 변환이 일어난다. 기본적인 아이디어는 babel과 하위 플러그인의 관계와 유사하다.

실제로 위 변환을 수행하는 codemod를 작성하면 이렇다.

```javascript
// function-to-arrow.js
export default function transformer(file, api) {
  const j = api.jscodeshift

  return j(file.source)
    .find(j.FunctionExpression)
    .replaceWith((path) => {
      const { params, body } = path.node

      // body가 return 문 하나뿐이면 간결한 arrow function으로
      if (
        body.body.length === 1 &&
        body.body[0].type === 'ReturnStatement'
      ) {
        return j.arrowFunctionExpression(params, body.body[0].argument)
      }

      return j.arrowFunctionExpression(params, body)
    })
    .toSource()
}
```

```bash
npx jscodeshift -t function-to-arrow.js src/
```

이렇게 실행하면 `src/` 아래 모든 파일에서 function expression을 arrow function으로 변환해준다. 파일 수가 수백 개든 수천 개든 상관없다. 이런 대규모 리팩토링에서 AST 기반 변환이 빛을 발한다.

react에서도 메이저 버전 업데이트 시 codemod를 제공한다. [react-codemod](https://github.com/reactjs/react-codemod)를 보면 createClass → ES6 class, PropTypes 분리 등의 변환을 자동으로 해주는 codemod들이 있다.

## 유즈케이스 3: 린팅 (ESLint)

ESLint도 AST 기반으로 동작한다. 코드를 AST로 파싱한 뒤, 각 룰이 visitor 패턴으로 특정 노드 타입을 순회하면서 문제를 찾아낸다. 구조가 바벨 플러그인과 거의 동일하다.

간단한 커스텀 룰을 하나 만들어보자. `var` 사용을 금지하는 룰이다.

```javascript
// no-var.js
module.exports = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
  },
  create(context) {
    return {
      VariableDeclaration(node) {
        if (node.kind === 'var') {
          context.report({
            node,
            message: 'var 대신 let 또는 const를 사용하세요.',
            fix(fixer) {
              return fixer.replaceTextRange(
                [node.range[0], node.range[0] + 3],
                'let',
              )
            },
          })
        }
      },
    }
  },
}
```

바벨 플러그인의 visitor 구조와 비교해보면 놀라울 정도로 닮아있다. `create` 함수가 반환하는 객체의 키가 AST 노드 타입이고, 해당 타입의 노드를 만날 때마다 콜백이 실행된다. 차이점이라면 바벨은 AST를 직접 수정하지만, ESLint는 `context.report()`로 문제를 보고하고, 자동 수정이 필요하면 `fix` 함수를 통해 텍스트 레벨에서 수정한다는 것이다.

> 커스텀 ESLint 룰을 직접 만들어보고 싶다면 [나만의 eslint 룰 만들어보기](/2022/06/how-to-write-my-own-eslint-rules)도 참고해보자.

## 유즈케이스 4: 코드 포맷팅 (Prettier)

[Prettier](https://prettier.io/)도 AST를 활용한다. 코드를 받아서 AST를 만들고, AST를 기반으로 일관된 스타일로 다시 출력한다. 다만 prettier는 한 단계가 더 있다.

1. 코드 → AST
2. AST → IR(Intermediate Representation, `Doc`이라고 부른다)
3. IR → 포맷팅된 코드

2단계가 핵심이다. AST 노드를 `Doc`이라는 중간 표현으로 변환하면서, "이 부분은 한 줄에 들어가면 한 줄로, 안 들어가면 여러 줄로 쪼개라" 같은 포맷팅 힌트를 함께 넣는다. 그 다음 `printer`라는 알고리즘이 `Doc`을 순회하면서 전체적인 줄 길이를 고려해 최적의 포맷을 결정한다.

`Doc`이 실제로 어떻게 생겼는지 보면 이해가 빠르다. `foo(arg1, arg2, arg3)` 라는 코드의 Doc은 개념적으로 이런 구조다.

```
group([
  "foo(",
  indent([
    softline,
    "arg1,",
    line,
    "arg2,",
    line,
    "arg3",
  ]),
  softline,
  ")"
])
```

여기서 `group`은 "가능하면 한 줄에 넣되, 안 되면 여러 줄로 쪼개라"는 의미다. `line`은 한 줄 모드에서는 공백, 여러 줄 모드에서는 줄바꿈이 된다. `softline`은 한 줄 모드에서는 아무것도 안 넣고, 여러 줄 모드에서만 줄바꿈이 된다.

이 구조 덕분에 prettier는 `printWidth`에 맞춰 같은 코드를 상황에 따라 다르게 포맷팅할 수 있다.

```javascript
// printWidth 안에 들어갈 때 → 한 줄
foo(arg1, arg2, arg3)

// printWidth를 초과할 때 → 여러 줄
foo(
  arg1,
  arg2,
  arg3,
)
```

이 판단을 단순히 문자열 길이만 보고 하는 게 아니라, AST 구조를 이해한 상태에서 하기 때문에 중첩된 구조에서도 일관된 결과를 만들어낸다.

> prettier의 알고리즘에 대해 더 자세히 알고 싶다면, Philip Wadler의 논문 [A prettier printer](https://homepages.inf.ed.ac.uk/wadler/papers/prettier/prettier.pdf)를 참고하면 좋다.

## 유즈케이스 5: 코드 시각화

AST를 활용하면 코드를 시각적으로 표현하는 것도 가능하다. [js2flowchart](https://github.com/Bogdan-Lyashenko/js-code-to-svg-flowchart)는 자바스크립트 코드를 플로우차트 SVG로 변환해주는 라이브러리다.

동작 원리는 지금까지 살펴본 것과 같은 맥락이다.

1. 코드 → AST
2. AST → FlowTree (불필요한 노드를 생략한 단순화된 트리)
3. FlowTree → ShapesTree (각 노드의 시각적 타입, 위치, 관계 정보)
4. ShapesTree → SVG

결국 AST를 중간 표현으로 삼아서 코드를 다른 형태로 변환하는 패턴은 동일하다.

## 정리

지금까지 살펴본 도구들의 공통 패턴을 정리해보면 이렇다.

```
코드 (문자열)
  ↓ Lexical Analysis (토큰화)
토큰 목록
  ↓ Syntax Analysis (구문 분석)
AST
  ↓ 변환/분석/출력
결과물 (새로운 코드, 에러 리포트, SVG 등)
```

그리고 AST를 다루는 도구들은 거의 예외 없이 **visitor 패턴**을 사용한다. Babel, ESLint, jscodeshift 모두 "관심 있는 노드 타입을 키로, 콜백 함수를 값으로" 하는 객체를 넘기는 동일한 구조다.

```javascript
// Babel 플러그인
{ visitor: { CallExpression(path) { ... } } }

// ESLint 룰
{ create() { return { CallExpression(node) { ... } } } }

// jscodeshift
j(source).find(j.CallExpression).forEach(path => { ... })
```

결국 핵심은 하나다. **코드를 문자열이 아닌 구조화된 데이터로 다루면, 텍스트 치환으로는 불가능한 정교한 작업이 가능해진다.** AST는 그 구조화된 데이터를 만드는 가장 보편적인 방법이다.
