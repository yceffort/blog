import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {dirname, resolve} from 'node:path'

import {chromium} from '@playwright/test'
import stylexPostcss from '@stylexjs/postcss-plugin'
import postcss from 'postcss'

import config from '../postcss.config.js'

const blogRoot = resolve(import.meta.dirname, '..')
const fixture = await readFile(
  resolve(blogRoot, 'tests/styles/markdown.html'),
  'utf8',
)

async function inlineImports(filename) {
  const root = postcss.parse(await readFile(filename, 'utf8'))
  const imports = root.nodes.filter(
    (node) => node.type === 'atrule' && node.name === 'import',
  )
  for (const node of imports) {
    if (node.type !== 'atrule' || node.name !== 'import') continue
    const target = node.params.match(/^['"]([^'"]+)['"]$/)?.[1]
    assert.ok(target, `Unsupported import ${node.params}`)
    node.replaceWith(await inlineImports(resolve(dirname(filename), target)))
  }
  return root
}

// 본문 스타일은 reading.css 쪽에 있다. 이걸 빼면 markdown.html 픽스처에
// 아무 규칙도 걸리지 않아 아래 단언이 전부 공허하게 통과한다.
const entry = resolve(blogRoot, 'src/styles/stylex.css')
const sheet = await inlineImports(entry)
sheet.append(
  (await inlineImports(resolve(blogRoot, 'src/styles/reading.css'))).nodes,
)
const styles = await postcss([
  stylexPostcss({...config.plugins['@stylexjs/postcss-plugin'], cwd: blogRoot}),
]).process(sheet, {from: entry})
// 1bdfe859 이전에는 Prism 토큰 색이 .styles.ts 에 있어 cases.json 이 대조했다.
// CSS 로 옮기면서 그 케이스가 갈 곳을 잃었으므로 여기서 같은 대조를 이어받는다.
const baseline = await readFile(
  resolve(blogRoot, 'tests/styles/baseline.css'),
  'utf8',
)
const tokens = [
  ['tag', 'text-code-light-red', 'dark:text-code-red'],
  ['attr-name', 'text-code-light-yellow', 'dark:text-code-yellow'],
  ['attr-value', 'text-code-light-green', 'dark:text-code-green'],
  ['punctuation', 'text-code-light-black', 'dark:text-code-white'],
  ['keyword', 'text-code-light-purple', 'dark:text-code-purple'],
  ['function', 'text-code-light-blue', 'dark:text-code-blue'],
  ['comment', 'text-gray-500 italic', 'dark:text-gray-400 italic'],
]

const browser = await chromium.launch()
let checks = 0
try {
  for (const width of [390, 768, 1440]) {
    for (const theme of ['light', 'dark']) {
      for (const article of [false, true]) {
        const context = await browser.newContext({
          viewport: {width, height: 900},
          colorScheme: theme,
        })
        try {
          const page = await context.newPage()
          await page.setContent(
            `<html class="${theme === 'dark' ? 'dark' : ''}"><head><style>${styles.css}</style></head><body><article class="${article ? 'post-article ' : ''}markdown-body markdown-dark">${fixture.replaceAll('CONTENT_EXEMPT', 'markdown-exempt')}</article></body></html>`,
          )
          // Block code must inherit the pre's typography. The inline-code rule
          // must not shrink it by another 0.875em or make the whole block bold.
          const actual = await page.locator('pre > code').evaluate((code) => {
            const css = getComputedStyle(code)
            const parent = getComputedStyle(code.parentElement)
            return {
              code: [
                css.fontFamily,
                css.fontSize,
                css.fontWeight,
                css.lineHeight,
              ],
              pre: [
                parent.fontFamily,
                parent.fontSize,
                parent.fontWeight,
                parent.lineHeight,
              ],
              padding: css.padding,
              borderWidth: css.borderWidth,
              background: css.backgroundColor,
            }
          })
          const label = `${width}px / ${theme} / ${article ? 'article' : 'typography'}`
          assert.deepEqual(actual.code, actual.pre, label)
          assert.equal(actual.padding, '0px', label)
          assert.equal(actual.borderWidth, '0px', label)
          assert.equal(actual.background, 'rgba(0, 0, 0, 0)', label)
          checks++
        } finally {
          await context.close()
        }
      }
    }
  }
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({
      viewport: {width: 1440, height: 900},
      colorScheme: theme,
    })
    try {
      const page = await context.newPage()
      const dark = theme === 'dark'
      const body = tokens
        .map(
          ([kind, light, night], index) =>
            `<span id="t${index}" class="token ${kind}">x</span>` +
            `<span id="r${index}" class="${dark ? night : light}">x</span>`,
        )
        .join('')
      await page.setContent(
        `<html class="${dark ? 'dark' : ''}"><head><style>${styles.css}</style><style>${baseline}</style></head><body><article class="post-article markdown-body"><pre><code>${body}</code></pre></article></body></html>`,
      )
      for (const [index, [kind]] of tokens.entries()) {
        const actual = await page.evaluate((i) => {
          const pick = (id) => {
            const css = getComputedStyle(document.getElementById(id))
            return [css.color, css.fontStyle]
          }
          return {token: pick(`t${i}`), reference: pick(`r${i}`)}
        }, index)
        assert.deepEqual(
          actual.token,
          actual.reference,
          `token.${kind} / ${theme}`,
        )
        checks++
      }
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
console.log(
  `${checks} checks passed (block-code typography: 3 widths x 2 themes x 2 contexts; Prism token colors: ${tokens.length} tokens x 2 themes).`,
)
