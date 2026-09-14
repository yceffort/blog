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

const entry = resolve(blogRoot, 'src/styles/stylex.css')
const styles = await postcss([
  stylexPostcss({...config.plugins['@stylexjs/postcss-plugin'], cwd: blogRoot}),
]).process(await inlineImports(entry), {from: entry})
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
} finally {
  await browser.close()
}
console.log(
  `${checks} block-code typography checks passed (3 widths, 2 themes, 2 contexts).`,
)
