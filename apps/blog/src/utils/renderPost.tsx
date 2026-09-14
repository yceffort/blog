import {renderMarkdown} from '@yceffort/markdown-rs'
import type {Evaluater} from 'hast-util-to-jsx-runtime'
import {toJsxRuntime} from 'hast-util-to-jsx-runtime'
import {Fragment, jsx, jsxs} from 'react/jsx-runtime'
import rehypeKatex from 'rehype-katex'
import prism from 'rehype-prism-plus'
import {unified} from 'unified'

import MDXComponents from '@/components/MDXComponents'
import imageMetadataPlugin from '@/utils/imageMetadata'

// 마크다운 -> hast 는 Rust(wasm) 가 만든다: 파싱(GFM, 수식, MDX 문법, CJK 강조),
// 목차, 제목 id, 코드 파일명, 제목 링크까지. 나머지 세 단계는 JS 에 남는다.
// 코드 하이라이트는 Prism 을 그대로 써야 기존 글의 색이 바뀌지 않는다.
// Prism 토큰 색은 tailwind.css 의 `.token.*` 규칙이 칠한다.
export async function renderPost(body: string, path: string) {
  const tree = await unified()
    .use(rehypeKatex)
    .use(prism, {showLineNumbers: true})
    .use(imageMetadataPlugin, {path})
    .run(renderMarkdown(body))

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
