import assert from 'node:assert/strict'
import {mkdir, rm, writeFile} from 'node:fs/promises'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {chromium, devices} from '@playwright/test'
import sharp from 'sharp'

const [baselineUrl, migratedUrl] = process.argv.slice(2)
assert.ok(
  baselineUrl && migratedUrl,
  'Usage: node scripts/check-page-style-parity.mjs <baseline URL> <migrated URL>',
)
const reportDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  process.env.STYLE_PARITY_DIR || '../.cache/style-parity/pages',
)
await mkdir(reportDir, {recursive: true})
const routes = process.env.STYLE_PARITY_ROUTES?.split(',') || [
  '/',
  '/en',
  '/pages/1',
  '/tags',
  '/archive',
  '/series',
  '/series/k8s-for-frontend',
  '/about',
  '/resume',
  '/offline',
  '/not-a-real-route',
  '/2026/08/k8s-for-frontend-1',
  '/2020/07/math-for-programmer-chapter2-3-rational-irrational-real-number',
]
// Software rasterization makes gradient/text pixels deterministic across pages.
const browserOptions = {
  args: [
    '--disable-gpu',
    '--font-render-hinting=none',
    '--disable-font-subpixel-positioning',
    '--run-all-compositor-stages-before-draw',
    '--disable-partial-raster',
    '--disable-skia-runtime-opts',
    '--disable-lcd-text',
    '--blink-settings=textAutosizingEnabled=false',
  ],
}
const results = []
const freeze = `*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; view-transition-name: none !important; } nextjs-portal { display: none !important; }`
function normalize(property, value) {
  if (value === undefined) return value
  if (property.endsWith('transition-property'))
    return value.replace(/--blog-gradient-(from|via|to)\b/g, '--tw-gradient-$1')
  // Mermaid's generated IDs and the test server's origin are not presentation differences.
  return property.startsWith('marker-')
    ? value
        .replace(/https?:\/\/[^/#]+/g, '')
        .replace(/mermaid-[\w-]+?_(?=flowchart)/g, 'mermaid_')
    : value
}
async function capture(page, filename) {
  await page.bringToFront()
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('.mermaid')).every(
      (node) =>
        node.querySelector('svg') && getComputedStyle(node).opacity === '1',
    ),
  )
  if (await page.locator('.about-hero').count()) {
    await page.waitForFunction(() => {
      const canvases = document.querySelectorAll('.about-hero canvas')
      return (
        canvases.length === 2 &&
        Array.from(canvases).every(
          (canvas) =>
            canvas.hasAttribute('width') && canvas.hasAttribute('height'),
        )
      )
    })
  }
  await page.addStyleTag({content: freeze})
  await page.waitForTimeout(500)
  const styles = await page.locator('body *').evaluateAll((nodes) =>
    nodes
      .filter(
        (node) =>
          !['SCRIPT', 'STYLE', 'LINK', 'NEXTJS-PORTAL'].includes(
            node.tagName.toUpperCase(),
          ) && node.getRootNode() === document,
      )
      .map((node) => {
        // Resolve layout before obtaining the live style declaration. After a
        // palette change Chromium can otherwise expose a stale used auto margin.
        const rect = node.getBoundingClientRect().toJSON()
        const css = getComputedStyle(node)
        const pseudoStyles = [
          '::before',
          '::after',
          '::marker',
          '::placeholder',
        ].flatMap((pseudo) => {
          const computed = getComputedStyle(node, pseudo)
          const rendered =
            pseudo === '::marker'
              ? css.display === 'list-item'
              : pseudo === '::placeholder'
                ? node.hasAttribute('placeholder')
                : !['none', 'normal'].includes(computed.content)
          if (!rendered) return []
          return Array.from(computed)
            .filter((property) => !property.startsWith('--'))
            .map((property) => [
              `${pseudo}/${property}`,
              computed.getPropertyValue(property),
            ])
        })
        return {
          tag: node.tagName,
          text: node.childElementCount ? null : node.textContent,
          rect,
          styles: Object.fromEntries(
            Array.from(css)
              .filter((property) => !property.startsWith('--'))
              .map((property) => [property, css.getPropertyValue(property)])
              .concat(pseudoStyles),
          ),
        }
      }),
  )
  // WebGL scene pixels depend on frame timing; compare the canvas CSS above and mask its content here.
  let png
  for (let attempt = 0; attempt < 6; attempt++) {
    const current = await page.screenshot({
      fullPage: true,
      animations: 'disabled',
      // Flatten idle tag layers only for rasterization; actual CSS was recorded above.
      style:
        '.tag-grid { perspective: none !important; } .tchip { transform-style: flat !important; will-change: auto !important; }',
      mask: [page.locator('canvas')],
    })
    if (png?.equals(current)) {
      png = current
      break
    }
    assert.ok(attempt < 5, `Screenshot did not settle: ${filename}`)
    png = current
    await page.waitForTimeout(100)
  }
  await writeFile(resolve(reportDir, filename), png)
  return {styles, png}
}
async function compare(pages, name) {
  const before = await capture(pages[0], `${name}-before.png`)
  const after = await capture(pages[1], `${name}-after.png`)
  const differences = []
  if (before.styles.length !== after.styles.length)
    differences.push({
      type: 'node-count',
      before: before.styles.length,
      after: after.styles.length,
    })
  else
    for (let index = 0; index < before.styles.length; index++) {
      const a = before.styles[index]
      const b = after.styles[index]
      if (a.tag !== b.tag || a.text !== b.text)
        differences.push({
          type: 'content',
          index,
          before: {tag: a.tag, text: a.text},
          after: {tag: b.tag, text: b.text},
        })
      if (JSON.stringify(a.rect) !== JSON.stringify(b.rect))
        differences.push({
          type: 'geometry',
          index,
          tag: a.tag,
          before: a.rect,
          after: b.rect,
        })
      for (const property of new Set([
        ...Object.keys(a.styles),
        ...Object.keys(b.styles),
      ])) {
        const value = a.styles[property]
        if (
          normalize(property, value) !== normalize(property, b.styles[property])
        )
          differences.push({
            type: 'style',
            index,
            tag: a.tag,
            property,
            before: value,
            after: b.styles[property],
          })
      }
    }
  const decoded = await Promise.all(
    [before.png, after.png].map((png) =>
      sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject: true}),
    ),
  )
  let pixels = 0
  const [a, b] = decoded
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
    pixels = null
    differences.push({type: 'image-size', before: a.info, after: b.info})
  } else {
    const diff = Buffer.alloc(a.data.length)
    for (let offset = 0; offset < a.data.length; offset += 4) {
      const changed = [0, 1, 2, 3].some(
        (channel) => a.data[offset + channel] !== b.data[offset + channel],
      )
      if (changed) pixels++
      diff[offset] = 255
      diff[offset + 1] = changed ? 0 : 255
      diff[offset + 2] = changed ? 0 : 255
      diff[offset + 3] = 255
    }
    if (pixels)
      await sharp(diff, {raw: a.info})
        .png()
        .toFile(resolve(reportDir, `${name}-diff.png`))
    else await rm(resolve(reportDir, `${name}-diff.png`), {force: true})
  }
  results.push({name, pixels, differences})
  await writeFile(
    resolve(reportDir, 'report.json'),
    JSON.stringify(results, null, 2),
  )
  console.log(
    `${name}: ${differences.length} computed/content differences, ${pixels === null ? 'different image dimensions' : `${pixels} changed pixels`}`,
  )
}
async function createPair(width, theme) {
  // Isolate browser-wide font and raster caches as well as page state.
  const browser = await chromium.launch(browserOptions)
  try {
    const contexts = await Promise.all(
      [0, 1].map(() =>
        browser.newContext({
          viewport: {width, height: 900},
          deviceScaleFactor: 1,
          isMobile: width === 390,
          hasTouch: width === 390,
          userAgent: width === 390 ? devices['Pixel 7'].userAgent : undefined,
          reducedMotion: 'reduce',
          colorScheme: theme,
          serviceWorkers: 'block',
        }),
      ),
    )
    for (const context of contexts) {
      await context.addInitScript(
        (value) => localStorage.setItem('theme', value),
        theme,
      )
      await context.route(
        /google-analytics\.com|googletagmanager\.com/,
        (route) => route.abort(),
      )
    }
    const pages = await Promise.all(
      contexts.map((context) => context.newPage()),
    )
    for (const page of pages) {
      assert.equal(
        await page.evaluate(() => matchMedia('(hover: none)').matches),
        width === 390,
        'Mobile comparisons must emulate touch input, not just a narrow viewport',
      )
    }
    // Keep resource origins identical while serving the real migrated response.
    await pages[1].route(`${baselineUrl}/**`, async (route) => {
      const url = new URL(route.request().url())
      await route.fulfill({
        response: await route.fetch({
          url: `${migratedUrl}${url.pathname}${url.search}`,
        }),
      })
    })
    return {
      pages,
      close: async () => {
        await Promise.all(
          pages.map((page) => page.unrouteAll({behavior: 'ignoreErrors'})),
        )
        await browser.close()
      },
    }
  } catch (error) {
    await browser.close()
    throw error
  }
}
async function navigate(pages, route = '/') {
  await Promise.all(
    pages.map(async (page) => {
      const response = await page.goto(`${baselineUrl}${route}`, {
        waitUntil: 'networkidle',
        timeout: 120000,
      })
      assert.equal(
        response.status(),
        route === '/not-a-real-route' ? 404 : 200,
        route,
      )
    }),
  )
}
try {
  for (const width of process.env.STYLE_PARITY_WIDTHS?.split(',').map(
    Number,
  ) || [390, 1440]) {
    for (const theme of process.env.STYLE_PARITY_THEMES?.split(',') || [
      'light',
      'dark',
    ]) {
      for (const route of routes) {
        // Each route starts with fresh font/image/compositor caches on both sides.
        const pair = await createPair(width, theme)
        try {
          await navigate(pair.pages, route)
          await compare(
            pair.pages,
            `${width}-${theme}-${route.replaceAll('/', '_')}`,
          )
        } finally {
          await pair.close()
        }
      }
      if (process.env.STYLE_PARITY_STATES === '0') continue
      const pair = await createPair(width, theme)
      try {
        const {pages} = pair
        await navigate(pages)
        if (width === 390) {
          await Promise.all(
            pages.map((page) =>
              page.getByRole('button', {name: 'Toggle Menu'}).tap(),
            ),
          )
          await compare(pages, `${width}-${theme}-menu`)
          await Promise.all(
            pages.map((page) =>
              page.getByRole('button', {name: 'Close', exact: true}).tap(),
            ),
          )
        }
        await Promise.all(
          pages.map((page) =>
            width === 390
              ? page.getByRole('button', {name: '검색', exact: true}).tap()
              : page.keyboard.press('Control+k'),
          ),
        )
        await compare(pages, `${width}-${theme}-search`)
        await Promise.all(
          pages.map((page) =>
            width === 390
              ? page.locator('.search-esc').tap()
              : page.locator('.search-esc').click(),
          ),
        )
        await Promise.all(
          pages.map((page) =>
            width === 390
              ? page.getByRole('button', {name: 'Tweaks', exact: true}).tap()
              : page.getByRole('button', {name: 'Tweaks', exact: true}).click(),
          ),
        )
        await compare(pages, `${width}-${theme}-settings`)
        for (const accent of ['rose', 'emerald', 'amber', 'cyan', 'violet']) {
          await Promise.all(
            pages.map((page) =>
              page.getByRole('button', {name: accent, exact: true}).click(),
            ),
          )
          await compare(pages, `${width}-${theme}-accent-${accent}`)
        }
        for (const setting of ['film grain', 'minimal mode']) {
          await Promise.all(
            pages.map((page) =>
              page.getByRole('switch', {name: setting, exact: true}).click(),
            ),
          )
          await compare(
            pages,
            `${width}-${theme}-${setting.replaceAll(' ', '-')}`,
          )
        }
      } finally {
        await pair.close()
      }
    }
  }
} finally {
  await writeFile(
    resolve(reportDir, 'report.json'),
    JSON.stringify(results, null, 2),
  )
}
assert.ok(
  results.every(
    (result) => result.pixels === 0 && result.differences.length === 0,
  ),
  `Page differences found; see ${reportDir}/report.json`,
)
console.log(
  `${results.length} page/state comparisons passed with zero changed pixels.`,
)
