import {visit} from 'unist-util-visit'

import type {Element, Root} from 'hast'

type TokenType =
  | 'tag'
  | 'attr-name'
  | 'attr-value'
  | 'deleted'
  | 'inserted'
  | 'punctuation'
  | 'keyword'
  | 'string'
  | 'function'
  | 'boolean'
  | 'comment'

const tokenClassNames: Record<TokenType, string> = {
  tag: 'text-code-red',
  'attr-name': 'text-code-yellow',
  'attr-value': 'text-code-green',
  deleted: 'text-code-red',
  inserted: 'text-code-green',
  punctuation: 'text-code-white',
  keyword: 'text-code-purple',
  string: 'text-code-green',
  function: 'text-code-blue',
  boolean: 'text-code-red',
  comment: 'text-gray-400 italic',
} as const

export function parseCodeSnippet() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const className = node.properties?.className
      if (!Array.isArray(className)) {
        return
      }

      const [token, type] = className as [string, TokenType]
      if (token === 'token' && type in tokenClassNames) {
        node.properties.className = [tokenClassNames[type]]
      }
    })
  }
}
