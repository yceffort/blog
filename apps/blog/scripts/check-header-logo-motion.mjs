import assert from 'node:assert/strict'

import {chromium} from '@playwright/test'

// Run against an existing blog server: pnpm --filter blog test:header-motion [URL]
const baseUrl = process.argv[2] ?? 'http://localhost:3000'
const logoSelector = 'header a[aria-label="yceffort\'s blog"] > div:first-child'
const browser = await chromium.launch()

try {
  const context = await browser.newContext({
    reducedMotion: 'no-preference',
    serviceWorkers: 'block',
  })
  const page = await context.newPage()
  await page.goto(new URL('/', baseUrl).href, {waitUntil: 'load'})

  const initial = await page.evaluate((selector) => {
    const logo = document.querySelector(selector)
    const animation = logo
      ?.getAnimations()
      .find((item) => item instanceof CSSAnimation)
    if (!logo || !animation) {
      return null
    }

    // The root layout must keep this DOM node and CSS animation alive.
    window.__logoMotion = {logo, animation}
    return animation.effect?.getKeyframes().map((frame) => frame.rotate)
  }, logoSelector)

  assert.deepEqual(initial, ['0deg', '360deg'])

  for (const [label, path] of [
    ['About', '/about'],
    ['Posts', '/pages/1'],
    ['Series', '/series'],
  ]) {
    const before = await page.evaluate(
      () => window.__logoMotion.animation.currentTime,
    )
    await page
      .getByRole('navigation', {name: 'main'})
      .getByRole('link', {name: label, exact: true})
      .click()
    await page.waitForURL((url) => url.pathname === path)

    const after = await page.evaluate((selector) => {
      const {logo, animation} = window.__logoMotion ?? {}
      const currentLogo = document.querySelector(selector)
      return {
        sameElement: currentLogo === logo,
        sameAnimation:
          currentLogo
            ?.getAnimations()
            .some((item) => item === animation) ?? false,
        currentTime: animation?.currentTime,
      }
    }, logoSelector)

    assert.equal(after.sameElement, true, `logo remounted at ${path}`)
    assert.equal(
      after.sameAnimation,
      true,
      `logo animation restarted at ${path}`,
    )
    assert.ok(after.currentTime > before, `logo spin did not advance at ${path}`)
  }

  // The hover scale must work without overriding the rotation animation.
  const bounds = await page.locator(logoSelector).boundingBox()
  assert.ok(bounds)
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  )
  await page.waitForTimeout(450)

  const hovered = await page.evaluate(() => {
    const {logo, animation} = window.__logoMotion
    const style = getComputedStyle(logo)
    const matrix = new DOMMatrixReadOnly(style.transform)
    return {
      scale: Math.hypot(matrix.a, matrix.b),
      rotate: style.rotate,
      running: animation.playState === 'running',
    }
  })
  assert.ok(hovered.scale > 1.04, 'hover scale was overridden by the spin')
  assert.notEqual(hovered.rotate, 'none')
  assert.equal(hovered.running, true)

  await page.emulateMedia({reducedMotion: 'reduce'})
  assert.equal(
    await page.locator(logoSelector).evaluate((logo) => {
      return getComputedStyle(logo).animationName
    }),
    'none',
    'reduced motion must disable the spin',
  )

  console.log('Header logo motion: soft navigation, hover, reduced motion OK')
} finally {
  await browser.close()
}
