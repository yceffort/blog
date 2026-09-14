import assert from 'node:assert/strict'
import {mkdir, writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'

import {chromium, devices} from '@playwright/test'

const [beforeUrl, afterUrl] = process.argv.slice(2)
assert.ok(
  beforeUrl && afterUrl,
  'Usage: node scripts/check-page-motion-parity.mjs <before URL> <after URL>',
)
const output = resolve(
  import.meta.dirname,
  '../.cache/style-parity/motion.json',
)
const browser = await chromium.launch()
const results = []
try {
  for (const width of [390, 1440])
    for (const theme of ['light', 'dark']) {
      for (const {route, minimal} of [
        {route: '/', minimal: false},
        {route: '/about', minimal: false},
        {route: '/2026/08/k8s-for-frontend-1', minimal: false},
        {route: '/', minimal: true},
      ]) {
        const samples = []
        for (const url of [beforeUrl, afterUrl]) {
          const context = await browser.newContext({
            viewport: {width, height: 900},
            isMobile: width === 390,
            hasTouch: width === 390,
            userAgent: width === 390 ? devices['Pixel 7'].userAgent : undefined,
            colorScheme: theme,
            reducedMotion: 'no-preference',
            serviceWorkers: 'block',
          })
          try {
            await context.addInitScript(
              (value) => localStorage.setItem('theme', value),
              theme,
            )
            await context.route(
              /google-analytics\.com|googletagmanager\.com/,
              (request) => request.abort(),
            )
            const page = await context.newPage()
            await page.goto(`${url}${route}`, {
              waitUntil: 'networkidle',
              timeout: 120000,
            })
            await page.evaluate(() => document.fonts.ready)
            if (minimal) {
              await page
                .getByRole('button', {name: 'Tweaks', exact: true})
                .click()
              await page
                .getByRole('switch', {name: 'minimal mode', exact: true})
                .click()
              await page.waitForFunction(
                () => document.body.dataset.minimal === 'true',
              )
              await page
                .getByRole('dialog', {name: 'Tweaks'})
                .getByRole('button', {name: '닫기', exact: true})
                .click()
            }
            await page.waitForTimeout(1500)
            samples.push(
              await page.evaluate(() => {
                const nodes = [...document.querySelectorAll('*')].filter(
                  (node) => !['SCRIPT', 'STYLE', 'LINK'].includes(node.tagName),
                )
                const animations = document
                  .getAnimations()
                  .filter((animation) => animation instanceof CSSAnimation)
                for (const animation of animations) {
                  animation.pause()
                  animation.currentTime = 0
                }
                return animations
                  .map((animation) => {
                    const effect = animation.effect
                    const timing = effect.getTiming()
                    return {
                      node: nodes.indexOf(effect.target),
                      tag: effect.target.tagName,
                      pseudo: effect.pseudoElement,
                      timing: {
                        ...timing,
                        iterations: String(timing.iterations),
                      },
                      frames: effect
                        .getKeyframes()
                        .map((frame) =>
                          Object.fromEntries(
                            Object.entries(frame).toSorted(([a], [b]) =>
                              a.localeCompare(b),
                            ),
                          ),
                        ),
                    }
                  })
                  .toSorted(
                    (a, b) =>
                      a.node - b.node ||
                      JSON.stringify(a.frames).localeCompare(
                        JSON.stringify(b.frames),
                      ),
                  )
              }),
            )
          } finally {
            await context.close()
          }
        }
        const passed = JSON.stringify(samples[0]) === JSON.stringify(samples[1])
        results.push({
          width,
          theme,
          route,
          minimal,
          passed,
          before: samples[0],
          after: samples[1],
        })
        console.log(
          `${width}-${theme}-${route}${minimal ? '-minimal' : ''}: ${passed ? 'matched' : 'DIFFERENT'} (${samples[0].length}/${samples[1].length} CSS animations)`,
        )
      }
    }
} finally {
  await browser.close()
  await mkdir(resolve(output, '..'), {recursive: true})
  await writeFile(output, JSON.stringify(results, null, 2))
}
assert.ok(
  results.every((result) => result.passed),
  `Animation differences: ${output}`,
)
