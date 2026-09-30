import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import http from 'node:http'
import {createRequire} from 'node:module'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

// Run after `pnpm --filter research build` and `next start --port 3312`.
// Only a temporary browser context and the local reverse proxy are modified.
const root = fileURLToPath(new URL('../..', import.meta.url))
const require = createRequire(path.join(root, 'apps/research/package.json'))
const {chromium, expect} = require('@playwright/test')
const output = path.join(
  root,
  'apps/blog/public/2026/09/images/offline-marp-slides',
)
const git = (...args) =>
  execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim()
const commit = git('rev-parse', 'HEAD')
const oldCommit = git('rev-parse', '399f7c75')
const workers = {
  'network-first': git('show', `${oldCommit}:apps/research/public/sw.js`),
  'saved-shell-first': await readFile(
    path.join(root, 'apps/research/public/sw.js'),
    'utf8',
  ),
}
const manifest = JSON.parse(
  await readFile(
    path.join(root, 'apps/research/public/offline-runtime.json'),
    'utf8',
  ),
)
const repetitions = Number(process.env.OFFLINE_MEASURE_RUNS ?? 3)
assert(Number.isInteger(repetitions) && repetitions > 0)
const slug = 'suspense-error-boundary-deep-dive'
const base = 'http://localhost:3313'
const state = {strategy: 'saved-shell-first', condition: 'normal', documents: 0}
const timers = new Set()
const proxy = http.createServer((request, response) => {
  const pathname = new URL(request.url, base).pathname
  if (pathname === '/sw.js') {
    response.writeHead(200, {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store',
    })
    response.end(workers[state.strategy])
    return
  }
  const forward = () => {
    const upstream = http.request(
      {
        hostname: 'localhost',
        port: 3312,
        path: request.url,
        method: request.method,
        headers: {...request.headers, host: 'localhost:3313'},
      },
      (result) => {
        response.writeHead(result.statusCode, result.headers)
        result.pipe(response)
      },
    )
    upstream.on('error', () => {
      if (!response.headersSent) response.writeHead(502)
      response.end()
    })
    response.on('close', () => upstream.destroy())
    request.pipe(upstream)
  }
  if (pathname === `/offline/${slug}` && state.condition !== 'normal') {
    state.documents++
    if (state.condition === 'stalled') return
    if (state.condition === 'delay-8000ms') {
      const timer = setTimeout(() => {
        timers.delete(timer)
        forward()
      }, 8000)
      timers.add(timer)
      response.on('close', () => {
        clearTimeout(timer)
        timers.delete(timer)
      })
      return
    }
  }
  forward()
})
await new Promise((resolve, reject) => {
  proxy.once('error', reject)
  proxy.listen(3313, 'localhost', resolve)
})
const browser = await chromium.launch({headless: true})
const results = []
async function save(context, deckSlug) {
  const page = await context.newPage()
  await page.goto(`${base}/slides/${deckSlug}`, {waitUntil: 'domcontentloaded'})
  await page
    .locator('.marp-slides')
    .click({button: 'right', position: {x: 350, y: 250}})
  await page
    .getByRole('button', {name: `${deckSlug} 오프라인 저장`, exact: true})
    .click()
  await expect(page.locator('.offline-toast')).toContainText('저장 완료:', {
    timeout: 60000,
  })
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  return page
}
try {
  await mkdir(output, {recursive: true})
  // Alternate strategy order between repetitions to reduce order bias.
  for (let run = 1; run <= repetitions; run++) {
    for (const condition of ['offline', 'delay-8000ms', 'stalled']) {
      const strategies =
        run % 2 ? Object.keys(workers) : Object.keys(workers).toReversed()
      for (const strategy of strategies) {
        state.strategy = strategy
        state.condition = 'normal'
        const context = await browser.newContext({
          viewport: {width: 1280, height: 800},
        })
        try {
          const setup = await save(context, slug)
          await setup.close()
          state.condition = condition
          state.documents = 0
          await context.setOffline(condition === 'offline')
          const page = await context.newPage()
          const start = performance.now()
          let status = 'visible'
          let fromServiceWorker = null
          try {
            const response = await page.goto(`${base}/offline/${slug}`, {
              waitUntil: 'domcontentloaded',
              timeout: 20000,
            })
            fromServiceWorker = response.fromServiceWorker()
            await page.locator('.marp-slides').waitFor({
              state: 'visible',
              timeout: Math.max(1, 20000 - (performance.now() - start)),
            })
          } catch (error) {
            if (error.name !== 'TimeoutError') throw error
            status = 'timeout'
          }
          const elapsedMs = Math.round(performance.now() - start)
          const result = {
            run,
            strategy,
            condition,
            status,
            elapsedMs,
            documentNetworkRequests: state.documents,
            fromServiceWorker,
          }
          results.push(result)
          console.log(JSON.stringify(result))
          if (strategy === 'saved-shell-first') {
            assert.equal(status, 'visible')
            assert.equal(fromServiceWorker, true)
            assert.equal(state.documents, 0)
          } else if (condition === 'stalled') {
            assert.equal(status, 'timeout')
            assert.equal(state.documents, 1)
          } else if (condition === 'delay-8000ms') {
            assert(elapsedMs >= 8000)
            assert.equal(state.documents, 1)
          }
        } finally {
          await context.close()
        }
      }
    }
  }
  state.strategy = 'saved-shell-first'
  state.condition = 'normal'
  const context = await browser.newContext({
    viewport: {width: 1200, height: 800},
    deviceScaleFactor: 2,
    colorScheme: 'light',
  })
  const page = await save(context, 'feconf-2026-vendor-sdk')
  await page.goto(`${base}/offline`, {waitUntil: 'domcontentloaded'})
  await expect(page.locator('.offline-deck')).toHaveCount(1)
  await expect(page.locator('.offline-update-status')).toContainText(
    '마지막 확인',
    {timeout: 30000},
  )
  await page.evaluate(() => document.fonts.ready)
  const saved = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('research-offline', 1)
        request.addEventListener('error', () => reject(request.error))
        request.addEventListener('success', () => {
          const db = request.result
          const transaction = db.transaction('decks')
          const query = transaction.objectStore('decks').getAll()
          transaction.addEventListener('complete', () => {
            db.close()
            resolve(query.result)
          })
          transaction.addEventListener('error', () => {
            db.close()
            reject(transaction.error)
          })
        })
      }),
  )
  assert.equal(saved.length, 1)
  assert(!('runtimeRevision' in saved[0]))
  await page.screenshot({
    path: path.join(output, 'offline-library.png'),
    fullPage: true,
  })
  await context.close()
  let runtimeBytes = 0
  for (const asset of manifest.assets) {
    const file = asset.url.startsWith('/_next/static/')
      ? path.join(
          root,
          'apps/research/.next/static',
          asset.url.slice('/_next/static/'.length),
        )
      : path.join(root, 'apps/research/public', asset.url)
    runtimeBytes += (await readFile(file)).byteLength
  }
  const report = {
    measuredAt: new Date().toISOString(),
    commit,
    oldWorkerCommit: oldCommit,
    node: process.version,
    playwright: require('@playwright/test/package.json').version,
    chromium: browser.version(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    cpu: os.cpus()[0].model,
    memoryGiB: Math.round(os.totalmem() / 2 ** 30),
    runtime: {
      revision: manifest.revision,
      files: manifest.assets.length,
      uncompressedBytes: runtimeBytes,
    },
    workerSha256: Object.fromEntries(
      Object.entries(workers).map(([name, content]) => [
        name,
        createHash('sha256').update(content).digest('hex'),
      ]),
    ),
    method:
      'Same production build and deck; worker script only varies. Each sample starts with a fresh browser context, saves via the UI, closes that page, then opens a new tab without restarting Chromium. Timer: immediately before page.goto until .marp-slides is visible. 20-second observation limit. Local proxy delays or holds document requests reaching the network; cached responses never reach the proxy. No CPU throttling. Save time excluded.',
    screenshot: {
      slug: saved[0].slug,
      slides: saved[0].html.length,
      bytes: saved[0].bytes,
      fields: Object.keys(saved[0]).toSorted(),
    },
    results,
  }
  await writeFile(
    path.join(output, 'navigation-measurements.json'),
    JSON.stringify(report, null, 2) + '\n',
  )
  console.log(
    JSON.stringify({
      runtime: report.runtime,
      screenshot: report.screenshot,
      chromium: report.chromium,
    }),
  )
} finally {
  await browser.close()
  for (const timer of timers) clearTimeout(timer)
  proxy.closeAllConnections()
  await new Promise((resolve) => proxy.close(resolve))
}
