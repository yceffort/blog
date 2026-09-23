import {createHash} from 'node:crypto'

import {expect, test} from '@playwright/test'
import type {APIRequestContext, BrowserContext, Page} from '@playwright/test'

import type {
  OfflineDeck,
  RuntimeManifest,
  SavedDeck,
} from '../src/lib/offline/types'

const slug = 'suspense-error-boundary-deep-dive'
const assetPath = '/automatic-update-fixture.svg'

async function fixture(context: BrowserContext, request: APIRequestContext) {
  const original = (await (
    await request.get(`/api/slides/${slug}/offline`)
  ).json()) as OfflineDeck
  const manifest = (await (
    await request.get('/offline-runtime.json')
  ).json()) as RuntimeManifest
  const state = {
    deck: {...original, html: [...original.html], notes: [...original.notes]},
    manifest: {
      ...manifest,
      assets: manifest.assets.filter((asset) => !asset.url.endsWith('.ico')),
    },
    image:
      '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="red"/></svg>',
    failImage: false,
    imageRequests: 0,
    unchangedRequests: 0,
  }
  state.deck.html[0] += `<p class="auto-version">version one</p><img alt="automatic update fixture" src="${assetPath}">`
  state.deck.notes[0] = 'version one notes'
  await context.route('**/offline-runtime.json', (route) =>
    route.fulfill({json: state.manifest}),
  )
  await context.route(`**${assetPath}`, (route) => {
    state.imageRequests++
    return route.fulfill({
      status: state.failImage ? 503 : 200,
      contentType: 'image/svg+xml',
      body: state.image,
    })
  })
  await context.route(`**/api/slides/${slug}/offline`, (route) => {
    const body = JSON.stringify(state.deck)
    const etag = `"${createHash('sha256').update(body).digest('hex')}"`
    if (route.request().headers()['if-none-match'] === etag) {
      state.unchangedRequests++
      return route.fulfill({status: 304, headers: {ETag: etag}})
    }
    return route.fulfill({
      body,
      contentType: 'application/json',
      headers: {ETag: etag},
    })
  })
  return state
}

async function savedDeck(page: Page) {
  return page.evaluate(
    (savedSlug) =>
      new Promise<SavedDeck | undefined>((resolve, reject) => {
        const open = indexedDB.open('research-offline', 1)
        open.addEventListener('error', () => reject(open.error))
        open.addEventListener('success', () => {
          const db = open.result
          const tx = db.transaction('decks', 'readonly')
          const request = tx.objectStore('decks').get(savedSlug)
          tx.addEventListener('complete', () => {
            db.close()
            resolve(request.result)
          })
          tx.addEventListener('error', () => {
            db.close()
            reject(tx.error)
          })
        })
      }),
    slug,
  )
}

async function save(page: Page) {
  await page.goto(`/slides/${slug}`, {waitUntil: 'domcontentloaded'})
  await page
    .locator('.marp-slides')
    .click({button: 'right', position: {x: 350, y: 250}})
  await page
    .getByRole('button', {name: `${slug} 오프라인 저장`, exact: true})
    .click()
  await expect(page.locator('.offline-toast')).toContainText('저장 완료:')
  await page.goto('/offline', {waitUntil: 'domcontentloaded'})
  await expect(page.locator('.offline-update-status')).toContainText(
    '마지막 확인',
  )
}

test('reconnect updates saved content and notes without interrupting an open presentation', async ({
  page,
  context,
  request,
}) => {
  const state = await fixture(context, request)
  await save(page)
  const initial = (await savedDeck(page))!
  expect(state.unchangedRequests).toBeGreaterThan(0)
  expect(state.imageRequests).toBe(1)
  await context.setOffline(true)
  await page.goto(`/offline/${slug}#1`, {waitUntil: 'domcontentloaded'})
  await expect(page.locator('.swiper-slide-active .auto-version')).toHaveText(
    'version one',
  )
  const popup = context.waitForEvent('page')
  await page.keyboard.press('p')
  const presenter = await popup
  const notes = presenter.locator('.marp-presenter-notes-content').last()
  await expect(notes).toHaveText('version one notes')
  state.deck.title = 'automatically updated title'
  state.deck.html[0] = state.deck.html[0].replace('version one', 'version two')
  state.deck.notes[0] = 'version two notes'
  state.image = state.image.replace('red', 'blue')
  await page.bringToFront()
  await context.setOffline(false)
  await expect
    .poll(async () => (await savedDeck(page))?.title)
    .toBe(state.deck.title)
  const updated = (await savedDeck(page))!
  expect(updated.assetCache).not.toBe(initial.assetCache)
  expect(state.imageRequests).toBe(2)
  await expect(page.locator('.swiper-slide-active .auto-version')).toHaveText(
    'version one',
  )
  await expect(notes).toHaveText('version one notes')
  await expect(page.locator('.offline-toast')).toHaveCount(0)
  expect(
    await page.evaluate((name) => caches.has(name), initial.assetCache),
  ).toBe(true)
  await presenter.close()
  await context.setOffline(true)
  await page.reload({waitUntil: 'domcontentloaded'})
  await expect(page.locator('.swiper-slide-active .auto-version')).toHaveText(
    'version two',
  )
  const updatedPopup = context.waitForEvent('page')
  await page.keyboard.press('p')
  const updatedPresenter = await updatedPopup
  await expect(
    updatedPresenter.locator('.marp-presenter-notes-content').last(),
  ).toHaveText('version two notes')
  await updatedPresenter.close()
  await page.goto('/offline', {waitUntil: 'domcontentloaded'})
  await expect(page.locator('.offline-deck')).toHaveCount(1)
  await expect(page.locator('.offline-deck h2')).toHaveText(state.deck.title)
})

test('failed automatic updates retain the saved version and retry after reconnect', async ({
  page,
  context,
  request,
}) => {
  const state = await fixture(context, request)
  await save(page)
  const initial = (await savedDeck(page))!
  await context.setOffline(true)
  state.deck.title = 'retried update'
  state.failImage = true
  await context.setOffline(false)
  await expect(page.locator('.offline-deck .offline-status')).toContainText(
    '자동 업데이트 실패',
  )
  expect((await savedDeck(page))?.revision).toBe(initial.revision)
  await expect(page.locator('.offline-deck h2')).toHaveText(initial.title)
  await context.setOffline(true)
  state.failImage = false
  await context.setOffline(false)
  await expect(page.locator('.offline-deck h2')).toHaveText(state.deck.title)
  await expect(page.locator('.offline-deck .offline-status')).toHaveText('')
})

test('a new deployment refreshes same-URL assets and older downloads are upgraded', async ({
  page,
  context,
  request,
}) => {
  const state = await fixture(context, request)
  await save(page)
  const initial = (await savedDeck(page))!
  await context.setOffline(true)
  state.manifest.revision = 'aabbcc001122334455'
  state.image = state.image.replace('red', 'green')
  await context.setOffline(false)
  await expect
    .poll(async () => (await savedDeck(page))?.runtimeRevision)
    .toBe(state.manifest.revision)
  const updated = (await savedDeck(page))!
  expect(updated.sourceRevision).toBe(initial.sourceRevision)
  expect(updated.revision).not.toBe(initial.revision)
  expect(state.imageRequests).toBe(2)
  await context.setOffline(true)
  await page.evaluate(
    (savedSlug) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('research-offline', 1)
        open.addEventListener('error', () => reject(open.error))
        open.addEventListener('success', () => {
          const db = open.result
          const tx = db.transaction('decks', 'readwrite')
          const store = tx.objectStore('decks')
          const read = store.get(savedSlug)
          read.addEventListener('success', () => {
            const old = read.result
            delete old.sourceRevision
            delete old.runtimeRevision
            store.put(old)
          })
          tx.addEventListener('complete', () => {
            db.close()
            resolve()
          })
          tx.addEventListener('error', () => {
            db.close()
            reject(tx.error)
          })
        })
      }),
    slug,
  )
  await context.setOffline(false)
  await expect
    .poll(async () => (await savedDeck(page))?.sourceRevision)
    .toBe(initial.sourceRevision)
  expect(state.imageRequests).toBe(3)
})

test('an open library checks for changes every five minutes', async ({
  page,
  context,
  request,
}) => {
  const state = await fixture(context, request)
  await page.clock.install()
  await save(page)
  state.deck.title = 'periodic update'
  await page.clock.fastForward(5 * 60 * 1000)
  await expect(page.locator('.offline-deck h2')).toHaveText(state.deck.title)
})

test('the server returns a body only when the deck has changed', async ({
  request,
}) => {
  const response = await request.get(`/api/slides/${slug}/offline`)
  const etag = response.headers().etag
  expect(etag).toMatch(/^"[a-f0-9]{64}"$/)
  const unchanged = await request.get(`/api/slides/${slug}/offline`, {
    headers: {'If-None-Match': etag},
  })
  expect(unchanged.status()).toBe(304)
  expect(await unchanged.text()).toBe('')
  const changed = await request.get(`/api/slides/${slug}/offline`, {
    headers: {'If-None-Match': '"old-version"'},
  })
  expect(changed.status()).toBe(200)
  expect((await changed.json()).notes).toEqual((await response.json()).notes)
})
