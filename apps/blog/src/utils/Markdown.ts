import * as stylex from '@stylexjs/stylex'
import type {Element, Root} from 'hast'
import {visit} from 'unist-util-visit'
const sx = stylex.create({
  tag: {
    '@layer utilities': {
      color: {
        default: '#dc2626',
        ':is(.dark *)': '#ff9999',
      },
    },
  },
  attr_name: {
    '@layer utilities': {
      color: {
        default: '#ca8a04',
        ':is(.dark *)': '#ffeb99',
      },
    },
  },
  attr_value: {
    '@layer utilities': {
      color: {
        default: '#16a34a',
        ':is(.dark *)': '#a4f4c0',
      },
    },
  },
  punctuation: {
    '@layer utilities': {
      color: {
        default: '#1f2937',
        ':is(.dark *)': '#ffffff',
      },
    },
  },
  keyword: {
    '@layer utilities': {
      color: {
        default: '#9333ea',
        ':is(.dark *)': '#d7a9ff',
      },
    },
  },
  function: {
    '@layer utilities': {
      color: {
        default: '#2563eb',
        ':is(.dark *)': '#98dcff',
      },
    },
  },
  comment: {
    '@layer utilities': {
      color: {
        default: 'oklch(55.2% 0.016 285.938)',
        ':is(.dark *)': 'oklch(70.5% 0.015 286.067)',
      },
      fontStyle: 'italic',
    },
  },
})
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
  tag: stylex.props(sx.tag).className ?? '',
  'attr-name': stylex.props(sx.attr_name).className ?? '',
  'attr-value': stylex.props(sx.attr_value).className ?? '',
  deleted: stylex.props(sx.tag).className ?? '',
  inserted: stylex.props(sx.attr_value).className ?? '',
  punctuation: stylex.props(sx.punctuation).className ?? '',
  keyword: stylex.props(sx.keyword).className ?? '',
  string: stylex.props(sx.attr_value).className ?? '',
  function: stylex.props(sx.function).className ?? '',
  boolean: stylex.props(sx.tag).className ?? '',
  comment: stylex.props(sx.comment).className ?? '',
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
        node.properties.className = tokenClassNames[type].split(' ')
      }
    })
  }
}
export function extractCodeFilename() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'pre') {
        return
      }
      if (!parent || typeof index !== 'number') {
        return
      }
      const codeElement = node.children.find(
        (child): child is Element =>
          child.type === 'element' && child.tagName === 'code',
      )
      if (!codeElement) {
        return
      }
      const className = codeElement.properties?.className
      if (!Array.isArray(className)) {
        return
      }
      const langClass = className.find(
        (c) => typeof c === 'string' && c.startsWith('language-'),
      )
      if (typeof langClass !== 'string') {
        return
      }
      const match = langClass.match(/^language-(\w+):(.+)$/)
      if (match) {
        const [, lang, filename] = match
        codeElement.properties.className = [`language-${lang}`]
        codeElement.properties['data-filename'] = filename
      }
    })
  }
}

// KaTeX ships a 66 KB font set and a render-blocking CDN stylesheet, so only
// posts that can contain math should load it. remark-math reads `$...$` and
// `$$...$$`; this check is deliberately wider than the parser (a dollar sign in
// prose or a shell snippet also counts) so it can never miss real math.
export function hasMath(body: string): boolean {
  return /\$\$/.test(body) || /\$[^$\n]+\$/.test(body)
}
