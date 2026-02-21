---
title: '자바스크립트 개발자를 위한 AST 이해하기 (2026년 업데이트)'
tags:
  - javascript
  - compiler
published: true
date: 2021-05-10 09:40:39
description: '이걸 이제 하네 완전 게을러짐'
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

### 2단계: 구문 분석 (Syntax Analysis)

구문 분석기(parser)는 위에서 나온 토큰 목록을 받아서, 언어의 문법 규칙에 따라 **트리 구조**로 조립한다. `function` 키워드 다음에 식별자가 오고, 괄호 안에 파라미터가 있고... 이런 문법 규칙을 적용해서 토큰들 사이의 관계를 트리로 만든다. 문법에 맞지 않는 코드가 들어오면 여기서 `SyntaxError`가 발생한다. 그리고 이 결과물이 바로 `Abstract Syntax Tree`다.

"Abstract(추상)"이라는 이름이 붙은 이유는, 괄호나 세미콜론 같은 구문적 장식(syntactic sugar)은 트리 구조 자체에 암시적으로 포함되기 때문에 별도의 노드로 표현하지 않기 때문이다.

### 더 알아보기

- 컴파일러에 대해서 배우고 싶다면, [The-super-tiny-compiler](https://github.com/jamiebuilds/the-super-tiny-compiler)를 보는 것을 추천한다. 자바스크립트로 쓰여진 가장 간단한 컴파일러 예제를 구현해두었다.
- [AST Explorer](https://astexplorer.net/) - 코드를 붙여넣으면 바로 AST를 볼 수 있다. 파서도 여러 개 골라볼 수 있다.
- [@babel/parser](https://github.com/babel/babel/tree/master/packages/babel-parser) 구 babylon

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

## 유즈케이스 3: 코드 포맷팅 (Prettier)

[Prettier](https://prettier.io/)도 AST를 활용한다. 코드를 받아서 AST를 만들고, AST를 기반으로 일관된 스타일로 다시 출력한다. 다만 prettier는 한 단계가 더 있다.

1. 코드 → AST
2. AST → IR(Intermediate Representation, `Doc`이라고 부른다)
3. IR → 포맷팅된 코드

2단계가 핵심이다. AST 노드를 `Doc`이라는 중간 표현으로 변환하면서, "이 부분은 한 줄에 들어가면 한 줄로, 안 들어가면 여러 줄로 쪼개라" 같은 포맷팅 힌트를 함께 넣는다. 그 다음 `printer`라는 알고리즘이 `Doc`을 순회하면서 전체적인 줄 길이를 고려해 최적의 포맷을 결정한다.

예를 들어 이런 코드가 있으면

```javascript
foo(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8)
```

한 줄에 들어가면 그대로 두고, `printWidth`를 초과하면

```javascript
foo(
  arg1,
  arg2,
  arg3,
  arg4,
  arg5,
  arg6,
  arg7,
  arg8,
)
```

이렇게 변환한다. 이 판단을 단순히 문자열 길이만 보고 하는 게 아니라, AST 구조를 이해한 상태에서 하기 때문에 중첩된 구조에서도 일관된 결과를 만들어낸다.

> prettier의 알고리즘에 대해 더 자세히 알고 싶다면, Philip Wadler의 논문 [A prettier printer](https://homepages.inf.ed.ac.uk/wadler/papers/prettier/prettier.pdf)를 참고하면 좋다.

## 유즈케이스 4: 코드 시각화

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

사실 이 글에서 다루진 않았지만, ESLint도 똑같은 구조다. 코드를 AST로 만들고, AST 노드를 순회하면서 룰에 맞지 않는 패턴을 찾아 경고를 띄운다. 궁금하다면 [나만의 eslint 룰 만들어보기](/2022/06/how-to-write-my-own-eslint-rules)도 참고해보자.

결국 핵심은 하나다. **코드를 문자열이 아닌 구조화된 데이터로 다루면, 텍스트 치환으로는 불가능한 정교한 작업이 가능해진다.** AST는 그 구조화된 데이터를 만드는 가장 보편적인 방법이다.
