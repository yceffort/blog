import {renderMarkdown} from '@yceffort/markdown-rs'
import type {Evaluater} from 'hast-util-to-jsx-runtime'
import {toJsxRuntime} from 'hast-util-to-jsx-runtime'
import {Fragment, jsx, jsxs} from 'react/jsx-runtime'

import MDXComponents from '@/components/post/MDXComponents'

// 마크다운 처리와 이미지 메타데이터는 WASM에서 끝내고 HAST를 React에 연결한다.
export function renderPost(body: string, path: string) {
  const tree = renderMarkdown(body, path)

  return toJsxRuntime(tree, {
    Fragment,
    jsx,
    jsxs,
    components: MDXComponents,
    createEvaluater,
  })
}

// hast-util-to-jsx-runtime 은 대문자로 시작하는 JSX 이름을 estree Identifier 로 바꾸고,
// evaluater 가 없으면 components 를 보지 않고 그대로 실패한다(`<LiveDemo />` 가 여기 걸린다).
// JS 를 실행하지 않고 이름만 컴포넌트로 이어 준다. 다른 MDX 표현식은 @yceffort/markdown-rs 가
// hast 를 만들 때 막으므로 여기까지 오지 않는다.
function createEvaluater(): Evaluater {
  return {
    evaluateExpression(expression) {
      if (expression.type !== 'Identifier') {
        throw new Error(`MDX expression is not supported: ${expression.type}`)
      }
      const name = expression.name as keyof typeof MDXComponents
      const component = MDXComponents[name]
      if (!component) {
        throw new Error(`MDX component is not defined: <${expression.name} />`)
      }
      return component
    },
    evaluateProgram() {
      throw new Error('MDX import/export is not supported')
    },
  }
}
