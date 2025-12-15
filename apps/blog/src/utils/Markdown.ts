import {visit} from 'unist-util-visit'

import type {Element, Root, Text} from 'hast'

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
  tag: 'text-code-light-red dark:text-code-red',
  'attr-name': 'text-code-light-yellow dark:text-code-yellow',
  'attr-value': 'text-code-light-green dark:text-code-green',
  deleted: 'text-code-light-red dark:text-code-red',
  inserted: 'text-code-light-green dark:text-code-green',
  punctuation: 'text-code-light-black dark:text-code-white',
  keyword: 'text-code-light-purple dark:text-code-purple',
  string: 'text-code-light-green dark:text-code-green',
  function: 'text-code-light-blue dark:text-code-blue',
  boolean: 'text-code-light-red dark:text-code-red',
  comment: 'text-gray-500 dark:text-gray-400 italic',
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

export function addCodeTitle() {
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

      const filename = codeElement.properties?.['data-filename']
      if (!filename) {
        return
      }

      const titleNode: Element = {
        type: 'element',
        tagName: 'div',
        properties: {className: ['remark-code-title']},
        children: [{type: 'text', value: filename as string} as Text],
      }

      parent.children.splice(index, 0, titleNode)
    })
  }
}
