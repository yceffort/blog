import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {fileURLToPath} from 'node:url'
import {gzipSync} from 'node:zlib'

import {chromium, devices} from '@playwright/test'

const origin = 'http://127.0.0.1:3222'
const path = '/2020/07/math-for-programmer-chapter1-2-set'
const fontUrl = `${origin}/fonts/math/LibertinusMath-Regular.woff2`
const output = resolve(process.argv[2] ?? '.cache/series-performance/lcp-pilot')
const cases = (
  process.env.LCP_CASES ?? 'control,instant-font,delayed-font'
).split(',')
const rounds = Number(process.env.LCP_ROUNDS ?? 1)
const screenshotsDuringLoad = process.env.LCP_SNAPSHOTS === '1'
assert.ok(Number.isInteger(rounds) && rounds > 0)
assert.ok(
  cases.every((name) =>
    [
      'control',
      'instant-font',
      'delayed-font',
      'no-view-transition',
      'system-ui',
    ].includes(name),
  ),
)
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const font = Buffer.from(await (await fetch(fontUrl)).arrayBuffer())
const contextOptions = {
  viewport: {width: 390, height: 844},
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: devices['Pixel 7'].userAgent,
  colorScheme: 'light',
  serviceWorkers: 'block',
}
await mkdir(output, {recursive: true})
const results = []
const metadata = {
  commit: '118a94668cfd9d7032ded2c0186138bc72bcd71b',
  startedAt: new Date().toISOString(),
  rounds,
  cases,
  contextOptions,
  screenshotsDuringLoad,
  fontSha256: sha(font),
  fontBytes: font.length,
  harnessSha256: sha(await readFile(fileURLToPath(import.meta.url))),
  cpu: 4,
  latencyMs: 150,
  downloadBytesPerSecond: 200000,
  notes: [
    'All cases intercept only the math font with CDP Fetch. Control continues immediately; instant-font fulfills the identical bytes locally; delayed-font waits 1500ms once per network request before continuing.',
    'no-view-transition disables document.startViewTransition. system-ui overrides the three common font variables and blocks their preloaded WOFF2 URLs; MathML and its font remain unchanged.',
    'This isolates browser behavior on the existing 118a9466 production build. It does not measure a rebuilt application with next/font removed.',
    'Runs with screenshotsDuringLoad enabled are separate visual diagnostics and must not be pooled with the measurement runs.',
  ],
}
await writeFile(
  resolve(output, 'harness.mjs'),
  await readFile(fileURLToPath(import.meta.url)),
)

const warmBrowser = await chromium.launch({headless: true})
try {
  const page = await warmBrowser.newPage(contextOptions)
  await page.goto(origin + path, {waitUntil: 'networkidle'})
  await page.evaluate(() => document.fonts.ready)
} finally {
  await warmBrowser.close()
}

for (let round = 1; round <= rounds; round++) {
  const order = round % 2 ? cases : cases.toReversed()
  for (const variant of order) {
    const name = `${variant}-${round}`
    const browser = await chromium.launch({headless: true})
    try {
      const context = await browser.newContext(contextOptions)
      await context.addInitScript(() => localStorage.setItem('theme', 'light'))
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.addInitScript(
        ({variant: browserVariant}) => {
          window.__lcpProbe = {
            bodyReadyMs: null,
            lcp: [],
            fonts: [],
            transitions: [],
          }
          if (browserVariant === 'system-ui') {
            const style = document.createElement('style')
            style.textContent =
              'html { --font-sans: system-ui !important; --font-mono: ui-monospace !important; --font-serif: ui-serif !important; }'
            const install = () => {
              if (document.documentElement) {
                document.documentElement.append(style)
                observer.disconnect()
              }
            }
            const observer = new MutationObserver(install)
            observer.observe(document, {childList: true, subtree: true})
            install()
          }
          const start = document.startViewTransition?.bind(document)
          if (browserVariant === 'no-view-transition')
            document.startViewTransition = undefined
          else if (start)
            document.startViewTransition = function (options) {
              const record = {
                start: performance.now(),
                fonts: document.fonts.status,
              }
              window.__lcpProbe.transitions.push(record)
              const transition = start(options)
              transition.ready.then(
                () => {
                  record.ready = performance.now()
                  return null
                },
                (error) => {
                  record.error = error.message
                  return null
                },
              )
              transition.finished.then(
                () => {
                  record.finished = performance.now()
                  return null
                },
                () => null,
              )
              return transition
            }
          const observer = new MutationObserver(() => {
            const article = document.querySelector(
              'article.post-article:not([aria-hidden="true"])',
            )
            if (article?.textContent.length > 100) {
              window.__lcpProbe.bodyReadyMs = performance.now()
              observer.disconnect()
            }
          })
          observer.observe(document, {childList: true, subtree: true})
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              window.__lcpProbe.lcp.push({
                time: entry.startTime,
                size: entry.size,
                tag: entry.element?.tagName,
                text: entry.element?.textContent.slice(0, 150),
                url: entry.url,
                rect: entry.element?.getBoundingClientRect().toJSON(),
              })
          }).observe({type: 'largest-contentful-paint', buffered: true})
          document.fonts.addEventListener('loadingdone', (event) => {
            window.__lcpProbe.fonts.push({
              time: performance.now(),
              families: [...event.fontfaces].map((f) => f.family),
            })
          })
        },
        {variant},
      )
      const session = await context.newCDPSession(page)
      metadata.browser ??= await session.send('Browser.getVersion')
      await session.send('Network.enable')
      await session.send('Network.setBlockedURLs', {
        urls: [
          '*://*.google-analytics.com/*',
          '*://*.googletagmanager.com/*',
          ...(variant === 'system-ui'
            ? ['*://*/_next/static/media/*.woff2']
            : []),
        ],
      })
      await session.send('Network.setBypassServiceWorker', {bypass: true})
      await session.send('Network.setCacheDisabled', {cacheDisabled: false})
      await session.send('Network.clearBrowserCache')
      await session.send('Emulation.setCPUThrottlingRate', {rate: 4})
      const network = {
        latency: 150,
        downloadThroughput: 200000,
        uploadThroughput: 200000,
        connectionType: 'cellular3g',
      }
      const {ruleIds} = await session.send(
        'Network.emulateNetworkConditionsByRule',
        {
          offline: false,
          matchedNetworkConditions: [{urlPattern: '', ...network}],
        },
      )
      await session.send('Network.overrideNetworkState', {
        offline: false,
        ...network,
      })
      const applied = new Set()
      session.on('Network.requestWillBeSentExtraInfo', (event) => {
        if (event.appliedNetworkConditionsId)
          applied.add(event.appliedNetworkConditionsId)
      })
      let fontRequestId
      const interceptions = []
      const delayed = new Set()
      session.on('Network.responseReceived', (event) => {
        if (event.response.url === fontUrl) fontRequestId = event.requestId
      })
      await session.send('Fetch.enable', {
        patterns: [{urlPattern: fontUrl, requestStage: 'Request'}],
      })
      session.on('Fetch.requestPaused', async (event) => {
        try {
          assert.equal(event.request.url, fontUrl)
          interceptions.push({
            requestId: event.requestId,
            networkId: event.networkId,
            frameId: event.frameId,
            resourceType: event.resourceType,
          })
          if (variant === 'instant-font') {
            await session.send('Fetch.fulfillRequest', {
              requestId: event.requestId,
              responseCode: 200,
              responseHeaders: [
                {name: 'Content-Type', value: 'font/woff2'},
                {name: 'Content-Length', value: String(font.length)},
              ],
              body: font.toString('base64'),
            })
          } else {
            if (variant === 'delayed-font' && !delayed.has(event.networkId)) {
              delayed.add(event.networkId)
              await delay(1500)
            }
            await session.send('Fetch.continueRequest', {
              requestId: event.requestId,
            })
          }
        } catch (error) {
          errors.push(error.message)
        }
      })
      await session.send('Tracing.start', {
        categories:
          'devtools.timeline,v8.execute,blink.user_timing,loading,disabled-by-default-devtools.timeline',
        transferMode: 'ReturnAsStream',
      })
      const navigation = page.goto(origin + path, {
        waitUntil: 'load',
        timeout: 180000,
      })
      const snapshots = []
      const capture = screenshotsDuringLoad
        ? (async () => {
            for (const index of [1, 2]) {
              await delay(2000)
              snapshots.push(
                await page.evaluate(() => ({
                  time: performance.now(),
                  fonts: document.fonts.status,
                  heading: document
                    .querySelector('h1')
                    ?.getBoundingClientRect()
                    .toJSON(),
                  paragraph: document.querySelector('article.post-article p')
                    ?.outerHTML,
                })),
              )
              const screenshot = await session.send('Page.captureScreenshot', {
                format: 'png',
              })
              await writeFile(
                resolve(output, `${name}-during-${index}.png`),
                Buffer.from(screenshot.data, 'base64'),
              )
            }
          })()
        : Promise.resolve()
      const response = await navigation
      assert.equal(response.status(), 200)
      await page.evaluate(() => document.fonts.ready)
      await page.waitForLoadState('networkidle')
      await delay(5000)
      await capture
      const metrics = await page.evaluate(() => ({
        ...window.__lcpProbe,
        fcp: performance.getEntriesByName('first-contentful-paint')[0]
          ?.startTime,
        article: document.querySelector(
          'article.post-article:not([aria-hidden="true"])',
        )?.outerHTML,
        mathNodes: document.querySelectorAll('article.post-article math')
          .length,
        bodyFont: getComputedStyle(document.body).fontFamily,
        mathFont: getComputedStyle(document.querySelector('math')).fontFamily,
        resources: performance.getEntriesByType('resource').map((r) => ({
          url: r.name,
          start: r.startTime,
          end: r.responseEnd,
          bytes: r.transferSize,
        })),
      }))
      assert.equal(metrics.mathNodes, 31)
      assert.ok(interceptions.length > 0)
      assert.ok(applied.has(ruleIds[0]))
      assert.deepEqual(errors, [])
      const body = await session.send('Network.getResponseBody', {
        requestId: fontRequestId,
      })
      assert.equal(
        sha(Buffer.from(body.body, body.base64Encoded ? 'base64' : 'utf8')),
        sha(font),
      )
      const done = new Promise((resolveEvent) =>
        session.once('Tracing.tracingComplete', resolveEvent),
      )
      await session.send('Tracing.end')
      const {stream} = await done
      const chunks = []
      for (;;) {
        const chunk = await session.send('IO.read', {handle: stream})
        chunks.push(
          Buffer.from(chunk.data, chunk.base64Encoded ? 'base64' : 'utf8'),
        )
        if (chunk.eof) break
      }
      await session.send('IO.close', {handle: stream})
      await writeFile(
        resolve(output, `${name}.trace.json.gz`),
        gzipSync(Buffer.concat(chunks)),
      )
      const {article, ...rest} = metrics
      const result = {
        variant,
        round,
        ...rest,
        snapshots,
        interceptions,
        frames: await session.send('Page.getFrameTree'),
        articleSha256: sha(article),
      }
      results.push(result)
      await writeFile(
        resolve(output, 'results.json'),
        JSON.stringify({metadata, results}, null, 2),
      )
      console.log(
        name,
        JSON.stringify({
          fcp: metrics.fcp,
          body: metrics.bodyReadyMs,
          lcp: metrics.lcp.at(-1),
          font: metrics.resources.find((r) => r.url === fontUrl),
        }),
      )
      await session.send('Emulation.setCPUThrottlingRate', {rate: 1})
      await page.screenshot({path: resolve(output, `${name}.png`)})
    } finally {
      await browser.close()
    }
  }
}
