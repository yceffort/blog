import {expect, test} from '@playwright/test'

const slug = 'feconf-2026-vendor-sdk'
const href = 'https://yceffort.kr'

for (const viewport of [
  {name: 'desktop', width: 1440, height: 900, touch: false},
  {name: 'phone', width: 390, height: 844, touch: true},
  {name: 'landscape phone', width: 844, height: 390, touch: true},
]) {
  test.describe(viewport.name, () => {
    test.use({
      viewport: {width: viewport.width, height: viewport.height},
      hasTouch: viewport.touch,
    })

    test('QR code fills the available screen and has a usable close button', async ({
      page,
    }, testInfo) => {
      await page.goto(`/slides/${slug}`, {waitUntil: 'domcontentloaded'})
      await expect(page.locator('.marp-slides')).toHaveAttribute(
        'data-transition',
        'glide',
      )
      await page.keyboard.press('q')
      const dialog = page.getByRole('dialog', {name: 'QR 코드', exact: true})
      await expect(dialog).toBeVisible()
      await expect(dialog.locator('..')).toHaveCSS('opacity', '1')
      await expect(dialog.locator('..')).toHaveCSS(
        'background-color',
        'rgb(255, 255, 255)',
      )
      const box = (await dialog.locator('svg').boundingBox())!
      const expected = Math.min(viewport.width - 32, viewport.height - 128)
      expect(box.width).toBeGreaterThanOrEqual(expected - 2)
      expect(Math.abs(box.width - box.height)).toBeLessThan(2)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
      await expect(
        dialog.getByRole('button', {name: 'QR 코드 닫기', exact: true}),
      ).toBeVisible()
      await page.screenshot({path: testInfo.outputPath('fullscreen-qr.png')})
      await dialog
        .getByRole('button', {name: 'QR 코드 닫기', exact: true})
        .click()
      await expect(dialog).toHaveCount(0)
      await page.keyboard.press('q')
      await expect(dialog).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
    })

    test('links inside the navigation edge open without changing the slide', async ({
      page,
      context,
    }) => {
      await context.route('https://yceffort.kr/**', (route) =>
        route.fulfill({
          contentType: 'text/html',
          body: '<h1>Link destination</h1>',
        }),
      )
      await page.goto(`/slides/${slug}`, {
        waitUntil: 'domcontentloaded',
      })
      await expect(page.locator('.marp-slides')).toHaveAttribute(
        'data-transition',
        'glide',
      )
      await page.keyboard.press('/')
      const search = page.getByRole('dialog', {name: '슬라이드 검색'})
      await search.getByRole('textbox', {name: '검색어'}).fill('DAN 24 연사')
      await search.getByRole('button').first().click()
      await expect(search).toHaveCount(0)
      const link = page
        .locator('.swiper-slide-active')
        .locator(`a[href="${href}"]`)
      await expect(link).toBeVisible()
      const slideNumber = Number(new URL(page.url()).hash.slice(1))
      expect(slideNumber).toBeGreaterThan(0)
      const surface = page.locator('.swiper-slide-active [data-slide-surface]')
      const edgeRatio = async () => {
        const start = (await link.boundingBox())!.x + 2
        const area = (await surface.boundingBox())!
        return (start - area.x) / area.width
      }
      // The start of this real link is underneath the old left-edge overlay.
      // Poll because the slide content is still gliding in right after the search.
      await expect.poll(edgeRatio).toBeLessThan(0.1)
      const target = (await link.boundingBox())!
      const bounds = (await surface.boundingBox())!
      const popup = context.waitForEvent('page')
      if (viewport.touch)
        await link.tap({position: {x: 2, y: target.height / 2}})
      else await link.click({position: {x: 2, y: target.height / 2}})
      const destination = await popup
      // The browser adds a trailing slash to a link without a path.
      await expect(destination).toHaveURL(`${href}/`)
      await expect(page).toHaveURL(new RegExp(`#${slideNumber}$`))
      await destination.close()
      await surface.click({
        position: {x: bounds.width - 4, y: bounds.height / 2},
      })
      await expect(page).toHaveURL(new RegExp(`#${slideNumber + 1}$`))
    })
  })
}
