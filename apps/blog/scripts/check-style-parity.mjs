import assert from 'node:assert/strict'
import {readFile, writeFile, mkdir} from 'node:fs/promises'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {runInNewContext} from 'node:vm'

import {parseSync, transformSync} from '@babel/core'
import {chromium} from '@playwright/test'
import stylexPlugin from '@stylexjs/babel-plugin'
import stylexPostcss from '@stylexjs/postcss-plugin'
import * as stylex from '@stylexjs/stylex'
import postcss, {parse as parseCss} from 'postcss'

import config from '../postcss.config.js'

const blogRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cases = JSON.parse(
  await readFile(resolve(blogRoot, 'tests/styles/cases.json'), 'utf8'),
)
const baseline = await readFile(
  resolve(blogRoot, 'tests/styles/baseline.css'),
  'utf8',
)
const compiled = new Map()
for (const {file} of cases) {
  if (compiled.has(file)) continue
  const filename = resolve(blogRoot, '../..', file)
  const source = await readFile(filename, 'utf8')
  const ast = parseSync(source, {
    filename,
    configFile: false,
    babelrc: false,
    parserOpts: {plugins: ['typescript', 'jsx']},
  })
  const declaration = ast.program.body
    .map((node) =>
      node.type === 'ExportNamedDeclaration' ? node.declaration : node,
    )
    .find(
      (node) =>
        node?.type === 'VariableDeclaration' &&
        node.declarations.some((decl) => decl.id.name === 'sx'),
    )
  assert.ok(declaration, `Missing styles in ${file}`)
  const keyframeDeclarations = ast.program.body
    .filter(
      (node) =>
        node.type === 'VariableDeclaration' &&
        node.declarations.some(
          (decl) =>
            decl.init?.callee?.object?.name === 'stylex' &&
            decl.init?.callee?.property?.name === 'keyframes',
        ),
    )
    .map((node) => source.slice(node.start, node.end))
    .join('\n')
  const input = `import * as stylex from '@stylexjs/stylex';\n${keyframeDeclarations}\n${source.slice(declaration.start, declaration.end)}\nconst classes = Object.fromEntries(Object.keys(sx).map(key => [key, stylex.props(sx[key]).className]));`
  const result = transformSync(input, {
    filename,
    configFile: false,
    babelrc: false,
    plugins: [[stylexPlugin, {dev: false, runtimeInjection: false}]],
  })
  // Only execute the compiler output of the static style declaration, never component code.
  const code = result.code.replace(/^import .*?;\n/m, '')
  compiled.set(file, runInNewContext(`${code}\nclasses;`, {stylex}))
}
async function staticClasses(relativeFile) {
  const filename = resolve(blogRoot, 'src', relativeFile)
  const source = await readFile(filename, 'utf8')
  const transformed = transformSync(source, {
    filename,
    configFile: false,
    babelrc: false,
    parserOpts: {plugins: ['typescript']},
    plugins: [[stylexPlugin, {dev: false, runtimeInjection: false}]],
  })
  const names = [...transformed.code.matchAll(/export const (\w+)/g)].map(
    (match) => match[1],
  )
  const code = transformed.code
    .replace(/^import .*?;\n/gm, '')
    .replace(/export /g, '')
    .replace(/\.className!/g, '.className')
  return runInNewContext(`${code}\n({${names.join(',')}})`, {stylex})
}
const accessibilityClasses = await staticClasses(
  'styles/accessibility.styles.ts',
)
function keyframeDefinitions(css) {
  const definitions = {}
  parseCss(css).walkAtRules('keyframes', (node) => {
    definitions[node.params] = JSON.stringify(
      node.nodes
        .filter((child) => child.type === 'rule')
        .flatMap((child) =>
          child.selector.split(',').map((step) => ({
            step: step
              .trim()
              .replace(/^from$/, '0%')
              .replace(/^to$/, '100%'),
            declarations: child.nodes
              .filter((decl) => decl.type === 'decl')
              .map((decl) => [
                decl.prop,
                decl.value
                  .replace(/\s+/g, ' ')
                  .replace(/(^|[ (])0\.(\d)/g, '$1.$2'),
              ])
              .sort(([a], [b]) => a.localeCompare(b)),
          })),
        )
        .sort((a, b) => a.step.localeCompare(b.step)),
    )
  })
  return definitions
}
async function inlineImports(filename) {
  const root = parseCss(await readFile(filename, 'utf8'))
  const imports = root.nodes.filter(
    (node) => node.type === 'atrule' && node.name === 'import',
  )
  for (const node of imports) {
    const target = node.params.match(/^['"]([^'"]+)['"]$/)?.[1]
    assert.ok(target, `Unsupported import ${node.params}`)
    node.replaceWith(
      parseCss(await inlineImports(resolve(dirname(filename), target))).nodes,
    )
  }
  return root.toString()
}
const result = await postcss([
  stylexPostcss({...config.plugins['@stylexjs/postcss-plugin'], cwd: blogRoot}),
]).process(await inlineImports(resolve(blogRoot, 'src/styles/stylex.css')), {
  from: resolve(blogRoot, 'src/styles/stylex.css'),
})
const escapeAttribute = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
// AnnouncementBanner.tsx 는 링크에 `announcement-link` 와 StyleX 의 link 클래스를
// 함께 붙인다. --announcement-link-translate 를 hover 에서 세우는 쪽은 후자다.
const BANNER = 'apps/blog/src/components/layout/AnnouncementBanner.styles.ts'
const bannerLink = compiled.get(BANNER)?.link
assert.ok(bannerLink, `Missing ${BANNER}: link`)

function fixture(migrated) {
  return cases
    .map(({file, key, classes}, index) => {
      const generated = compiled.get(file)[key]
      assert.ok(generated, `Missing ${file}: ${key}`)
      const className = migrated
        ? `${generated} ${classes
            .filter((c) => ['font-mono', 'sr-only'].includes(c))
            .map((c) =>
              c === 'font-mono'
                ? 'monospace-text'
                : `visually-hidden ${accessibilityClasses.visuallyHidden}`,
            )
            .join(' ')}`
        : classes.join(' ')
      const wrapper = migrated ? `announcement-link ${bannerLink}` : 'group'
      return `<section class="${escapeAttribute(wrapper)}"><button id="case-${index}" class="${escapeAttribute(className)}"><span>Style parity · 한글 123</span></button></section>`
    })
    .join('\n')
}
// 글꼴은 기준 동결 이후 의도적으로 바꿨으므로 비교 대상에서 뺀다. 다만 글꼴이
// 다르면 글자 폭을 따라 width 와 transform-origin 까지 갈리므로, 두 페이지의
// 글꼴을 같은 값으로 고정해 나머지 기하 비교는 그대로 유효하게 둔다.
const IGNORED_PROPERTIES = new Set(['font-family'])
const freeze =
  '* {animation-play-state: paused !important; caret-color: transparent !important; font-family: sans-serif !important;}'
const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: {width: 1440, height: 900},
  reducedMotion: 'reduce',
})
const before = await context.newPage()
const after = await context.newPage()
await before.setContent(
  `<style>${baseline}\n${freeze}</style>${fixture(false)}`,
)
await after.setContent(
  `<html><head><style>${result.css}\n${freeze}</style></head><body>${fixture(true)}</body></html>`,
)
const pages = [before, after]
const sessions = await Promise.all(
  pages.map((page) => context.newCDPSession(page)),
)
const nodeIds = await Promise.all(
  sessions.map(async (session) => {
    await session.send('DOM.enable')
    await session.send('CSS.enable')
    const {root} = await session.send('DOM.getDocument')
    const {nodeIds: ids} = await session.send('DOM.querySelectorAll', {
      nodeId: root.nodeId,
      selector: cases
        .flatMap(({classes}, index) => {
          if (!classes.some((name) => /(?:hover|focus):/.test(name))) return []
          const selector = `#case-${index}`
          return classes.some((name) => name.startsWith('group-hover:'))
            ? [selector, `section:has(${selector})`]
            : [selector]
        })
        .join(', '),
    })
    return ids
  }),
)
async function snapshot(page) {
  const frameDefinitions =
    page === before
      ? keyframeDefinitions(baseline)
      : keyframeDefinitions(result.css)
  // Settle transitions without overriding their CSS declarations, which are also compared.
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      if (animation instanceof CSSTransition) animation.finish()
    }
  })
  return page.locator('button').evaluateAll(
    (nodes, frames) =>
      nodes.map((node) => {
        const css = getComputedStyle(node)
        return Object.fromEntries(
          Array.from(css)
            .filter((property) => !property.startsWith('--'))
            .map((property) => [
              property,
              property === 'animation-name'
                ? css
                    .getPropertyValue(property)
                    .split(',')
                    .map((name) => frames[name.trim()] || name.trim())
                    .join(',')
                : css.getPropertyValue(property),
            ]),
        )
      }),
    frameDefinitions,
  )
}
const differences = []
let checks = 0
try {
  for (const reducedMotion of ['reduce', 'no-preference']) {
    await Promise.all(pages.map((page) => page.emulateMedia({reducedMotion})))
    for (const width of [
      390, 639, 640, 767, 768, 1023, 1024, 1279, 1280, 1440,
    ]) {
      await Promise.all(
        pages.map((page) => page.setViewportSize({width, height: 900})),
      )
      for (const dark of [false, true]) {
        await Promise.all(
          pages.map((page) =>
            page.evaluate(
              (isDark) =>
                document.documentElement.classList.toggle('dark', isDark),
              dark,
            ),
          ),
        )
        for (const state of [[], ['hover'], ['focus'], ['hover', 'focus']]) {
          await Promise.all(
            sessions.flatMap((session, i) =>
              nodeIds[i].map((nodeId) =>
                session.send('CSS.forcePseudoState', {
                  nodeId,
                  forcedPseudoClasses: state,
                }),
              ),
            ),
          )
          const [a, b] = await Promise.all(pages.map(snapshot))
          for (let index = 0; index < cases.length; index++) {
            checks++
            for (const [property, value] of Object.entries(a[index])) {
              if (IGNORED_PROPERTIES.has(property)) continue
              // Only the three explicitly renamed gradient transition targets differ by name.
              const actual =
                property === 'transition-property'
                  ? b[index][property].replace(
                      /--blog-gradient-(from|via|to)\b/g,
                      '--tw-gradient-$1',
                    )
                  : b[index][property]
              if (value !== actual)
                differences.push({
                  case: cases[index],
                  reducedMotion,
                  width,
                  dark,
                  state,
                  property,
                  before: value,
                  after: b[index][property],
                })
            }
          }
        }
      }
    }
  }
} finally {
  await browser.close()
}
const reportDir = resolve(blogRoot, '.cache/style-parity')
await mkdir(reportDir, {recursive: true})
await writeFile(
  resolve(reportDir, 'report.json'),
  JSON.stringify({checks, differences}, null, 2),
)
assert.equal(
  differences.length,
  0,
  `${differences.length} CSS differences; see ${reportDir}/report.json`,
)
console.log(
  `${checks} style comparisons passed (${cases.length} style groups, 10 widths, 2 themes, 2 motion preferences, 4 interaction states).`,
)
console.log(
  `Not compared: ${[...IGNORED_PROPERTIES].join(', ')}. Both pages render with a pinned font so the remaining geometry stays comparable.`,
)
