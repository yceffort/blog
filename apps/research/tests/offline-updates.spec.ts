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

function activeRuntime(page: Page) {
  return page.evaluate(
    async () =>
      (
        await (
          await caches.match('/__research_offline_runtime__', {
            cacheName: 'research-offline-meta-v1',
          })
        )?.json()
      )?.cacheName,
  )
}

function runtimeCaches(page: Page) {
  return page.evaluate(async () =>
    (await caches.keys())
      .filter((name) => name.startsWith('research-runtime-v1-'))
      .toSorted(),
  )
}

async function cleanUp(page: Page) {
  const {assetCache} = (await savedDeck(page))!
  await page.evaluate(
    (keep) =>
      new Promise<void>((resolve) => {
        const channel = new MessageChannel()
        channel.port1.addEventListener('message', () => resolve(), {
          once: true,
        })
        channel.port1.start()
        navigator.serviceWorker.controller!.postMessage(
          {type: 'research-cleanup', keep: [keep]},
          [channel.port2],
        )
      }),
    assetCache,
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
  // A reload stays on its snapshot; opening the deck again uses the update.
  await page.reload({waitUntil: 'domcontentloaded'})
  await expect(page.locator('.swiper-slide-active .auto-version')).toHaveText(
    'version one',
  )
  await page.goto(`/offline/${slug}#1`, {waitUntil: 'domcontentloaded'})
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

test('a presenter opened after an update keeps the audience snapshot and its own sync channel', async ({
  page,
  context,
  request,
}) => {
  const state = await fixture(context, request)
  await save(page)
  const original = (await savedDeck(page))!
  // Previously saved records have no snapshot; opening one upgrades it locally.
  await page.evaluate(async (name) => {
    await (
      await caches.open(name)
    ).delete('/__research_offline_deck_snapshot__')
  }, original.assetCache)
  await context.setOffline(true)
  await page.goto(`/offline/${slug}#1`, {waitUntil: 'domcontentloaded'})
  await expect(page.locator('.swiper-slide-active .auto-version')).toHaveText(
    'version one',
  )

  state.deck.title = 'new version for the next presentation'
  state.deck.html[0] = state.deck.html[0].replace('version one', 'version two')
  state.deck.notes[0] = 'version two notes'
  await context.setOffline(false)
  await expect
    .poll(async () => (await savedDeck(page))?.title)
    .toBe(state.deck.title)
  const popup = context.waitForEvent('page')
  await page.keyboard.press('p')
  const presenter = await popup
  const notes = presenter.locator('.marp-presenter-notes-content').last()
  await expect(notes).toHaveText('version one notes')
  await expect(
    presenter.locator('.marp-presenter-slide .auto-version'),
  ).toHaveText('version one')
  await presenter.getByRole('button', {name: '다음 ▶', exact: true}).click()
  await expect(page).toHaveURL(/#2$/)
  await page.keyboard.press('ArrowLeft')
  await expect(notes).toHaveText('version one notes')

  await context.setOffline(true)
  await presenter.reload({waitUntil: 'domcontentloaded'})
  await expect(notes).toHaveText('version one notes')
  // Reloading the audience keeps the presenter's snapshot and sync channel.
  await page.reload({waitUntil: 'domcontentloaded'})
  await expect(page).toHaveURL(
    new RegExp(`\\?snapshot=${original.assetCache}#1$`),
  )
  await expect(page.locator('.swiper-slide-active .auto-version')).toHaveText(
    'version one',
  )
  await presenter.getByRole('button', {name: '다음 ▶', exact: true}).click()
  await expect(page).toHaveURL(/#2$/)
  await page.keyboard.press('ArrowLeft')
  await expect(page).toHaveURL(/#1$/)
  const nextAudience = await context.newPage()
  await nextAudience.goto(`/offline/${slug}#1`, {waitUntil: 'domcontentloaded'})
  await expect(
    nextAudience.locator('.swiper-slide-active .auto-version'),
  ).toHaveText('version two')
  await nextAudience.keyboard.press('ArrowRight')
  await expect(nextAudience).toHaveURL(/#2$/)
  await expect(page).toHaveURL(/#1$/)
  await expect(notes).toHaveText('version one notes')

  // An expired snapshot must not silently switch the presenter to the new deck.
  await page.evaluate((name) => caches.delete(name), original.assetCache)
  await presenter.reload({waitUntil: 'domcontentloaded'})
  await expect(presenter.locator('.offline-error')).toContainText(
    '이 발표의 저장본을 찾을 수 없습니다',
  )
  await expect(presenter.locator('.marp-presenter-notes')).toHaveCount(0)
})

test('cancelling an update after a partial asset download preserves the saved deck', async ({
  page,
  context,
  request,
}) => {
  const state = await fixture(context, request)
  await save(page)
  const original = (await savedDeck(page))!
  const originalCaches = await page.evaluate(() => caches.keys())
  state.deck.title = 'cancelled update'
  state.deck.html[0] +=
    '<img src="/a-completed-update.svg" alt="completed update asset">'
  await context.route('**/a-completed-update.svg', (route) =>
    route.fulfill({contentType: 'image/svg+xml', body: state.image}),
  )
  // Hold a later asset until cancellation, after another response reached the cache.
  let held = false
  await context.route(`**${assetPath}`, () => {
    held = true
  })
  await page
    .getByRole('button', {
      name: `${slug} 오프라인 저장본 업데이트`,
      exact: true,
    })
    .click()
  await expect.poll(() => held).toBe(true)
  await expect
    .poll(() =>
      page.evaluate(async (previous) => {
        const staging = (await caches.keys()).find(
          (name) => name.startsWith('research-deck-v1-') && name !== previous,
        )
        return staging ? (await (await caches.open(staging)).keys()).length : 0
      }, original.assetCache),
    )
    .toBeGreaterThan(0)
  await page
    .getByRole('button', {name: `${slug} 다운로드 취소`, exact: true})
    .click()
  await expect(page.locator('.offline-toast')).toContainText(
    '다운로드를 취소했습니다',
  )
  expect(await savedDeck(page)).toEqual(original)
  expect(await page.evaluate(() => caches.keys())).toEqual(originalCaches)
  await context.setOffline(true)
  await page.goto(`/offline/${slug}#1`, {waitUntil: 'domcontentloaded'})
  await expect(page.locator('.swiper-slide-active .auto-version')).toHaveText(
    'version one',
  )
  await expect
    .poll(() =>
      page
        .getByAltText('automatic update fixture')
        .evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
    )
    .toBe(true)
})

test('a snapshot write failure leaves the previous complete download available', async ({
  page,
  context,
  request,
}) => {
  const state = await fixture(context, request)
  await save(page)
  const original = (await savedDeck(page))!
  const originalCaches = await page.evaluate(() => caches.keys())
  state.deck.title = 'update without space for its snapshot'
  await page.evaluate(() => {
    // oxlint-disable-next-line typescript/unbound-method -- Restored receiver via call below.
    const put = Cache.prototype.put
    Cache.prototype.put = function (resource, response) {
      const url = resource instanceof Request ? resource.url : String(resource)
      if (url.endsWith('/__research_offline_deck_snapshot__')) {
        return Promise.reject(new DOMException('Full', 'QuotaExceededError'))
      }
      return put.call(this, resource, response)
    }
  })
  await page
    .getByRole('button', {
      name: `${slug} 오프라인 저장본 업데이트`,
      exact: true,
    })
    .click()
  await expect(page.locator('.offline-toast')).toContainText(
    '저장 공간이 부족합니다',
  )
  expect(await savedDeck(page)).toEqual(original)
  expect(await page.evaluate(() => caches.keys())).toEqual(originalCaches)
  await context.setOffline(true)
  await page.goto(`/offline/${slug}#1`, {waitUntil: 'domcontentloaded'})
  await expect(page.locator('.swiper-slide-active .auto-version')).toHaveText(
    'version one',
  )
})

test('saving preserves quoted SVG data URLs in theme, inline and embedded CSS', async ({
  page,
  context,
  request,
}) => {
  const state = await fixture(context, request)
  const data =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>'
  const declaration = `background-image: url('${data}');`
  state.deck.css += `.data-url-theme { ${declaration} }`
  state.deck.html[0] += `<div class="data-url-theme"></div><div class="data-url-inline" style="${declaration.replaceAll('"', '&quot;')}"></div><style>.data-url-embedded { ${declaration} }</style><div class="data-url-embedded"></div>`
  await save(page)
  await context.setOffline(true)
  await page.goto(`/offline/${slug}#1`, {waitUntil: 'domcontentloaded'})
  for (const selector of [
    '.data-url-theme',
    '.data-url-inline',
    '.data-url-embedded',
  ]) {
    await expect(page.locator(selector)).toHaveCSS(
      'background-image',
      /^url\("data:image\/svg\+xml,/,
    )
  }
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

test('a new deployment keeps unchanged decks and older downloads are upgraded', async ({
  page,
  context,
  request,
}) => {
  const state = await fixture(context, request)
  await save(page)
  const initial = (await savedDeck(page))!
  const unchanged = state.unchangedRequests
  await context.setOffline(true)
  state.manifest.revision = 'aabbcc001122334455'
  await context.setOffline(false)
  await expect
    .poll(() => activeRuntime(page))
    .toBe('research-runtime-v1-aabbcc001122334455')
  await expect.poll(() => state.unchangedRequests).toBeGreaterThan(unchanged)
  expect(await savedDeck(page)).toEqual(initial)
  expect(state.imageRequests).toBe(1)
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
  expect(state.imageRequests).toBe(2)
})

test('a new deployment removes the previous shared viewer once no saved deck is open', async ({
  page,
  context,
  request,
}) => {
  const state = await fixture(context, request)
  await save(page)
  const previous = `research-runtime-v1-${state.manifest.revision}`
  const current = 'research-runtime-v1-aabbcc001122334455'
  const viewer = await context.newPage()
  await viewer.goto(`/offline/${slug}`, {waitUntil: 'domcontentloaded'})
  await expect(viewer.locator('.marp-slides')).toBeVisible()
  await context.setOffline(true)
  state.manifest.revision = 'aabbcc001122334455'
  await context.setOffline(false)
  await expect.poll(() => activeRuntime(page)).toBe(current)
  // The open deck may still lazy-load chunks from the viewer it started with.
  await cleanUp(page)
  expect(await runtimeCaches(page)).toEqual([current, previous].toSorted())
  await viewer.close()
  await page.goto('/', {waitUntil: 'domcontentloaded'})
  await expect.poll(() => runtimeCaches(page)).toEqual([current])
})

test('a new deployment downloads only the shared viewer files that changed', async ({
  page,
  context,
  request,
}) => {
  const state = await fixture(context, request)
  await save(page)
  const shell = `${await (await request.get('/offline-shell.html')).text()}<!-- next deployment -->`
  await context.route('**/offline-shell.html', (route) =>
    route.fulfill({body: shell, contentType: 'text/html; charset=utf-8'}),
  )
  state.manifest.assets = state.manifest.assets.map((asset) =>
    asset.url === '/offline-shell.html'
      ? {...asset, sha256: createHash('sha256').update(shell).digest('hex')}
      : asset,
  )
  const urls = new Set(state.manifest.assets.map((asset) => asset.url))
  const downloads: string[] = []
  page.on('request', (sent) => {
    const {pathname} = new URL(sent.url())
    if (sent.resourceType() === 'fetch' && urls.has(pathname))
      downloads.push(pathname)
  })
  await context.setOffline(true)
  state.manifest.revision = 'aabbcc001122334455'
  await context.setOffline(false)
  await expect
    .poll(() => activeRuntime(page))
    .toBe('research-runtime-v1-aabbcc001122334455')
  expect(downloads).toEqual(['/offline-shell.html'])
  expect(
    await page.evaluate(async () =>
      (
        await caches.match('/offline-shell.html', {
          cacheName: 'research-runtime-v1-aabbcc001122334455',
        })
      )?.text(),
    ),
  ).toBe(shell)
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
