import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {cpus, platform, arch} from 'node:os'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {gzipSync} from 'node:zlib'

import {chromium, devices} from '@playwright/test'

const blogRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const [beforeUrl, afterUrl, output] = process.argv.slice(2)
assert.ok(
  beforeUrl && afterUrl,
  'Usage: node scripts/compare-performance.mjs <before URL> <after URL> [output directory]',
)
const outputDir = resolve(output ?? resolve(blogRoot, '.cache/performance'))
const settings = {
  rounds: Number(process.env.PERF_ROUNDS ?? 5),
  repeatVisit: process.env.PERF_REPEAT_VISIT === '1',
  cpuSlowdown: Number(process.env.PERF_CPU ?? 20),
  latencyMs: Number(process.env.PERF_LATENCY_MS ?? 400),
  downloadKbps: Number(process.env.PERF_DOWNLOAD_KBPS ?? 400),
  uploadKbps: Number(process.env.PERF_UPLOAD_KBPS ?? 400),
  settleMs: 5000,
  viewport: {width: 390, height: 844},
  deviceScaleFactor: 2,
  routes: process.env.PERF_ROUTES?.split(',') ?? [
    '/',
    '/2026/08/k8s-for-frontend-1',
  ],
}
assert.ok(Number.isInteger(settings.rounds) && settings.rounds > 0)
for (const name of ['cpuSlowdown', 'latencyMs', 'downloadKbps', 'uploadKbps'])
  assert.ok(Number.isFinite(settings[name]) && settings[name] > 0, name)
await mkdir(outputDir, {recursive: true})
const blockedUrls = [
  '*://*.google-analytics.com/*',
  '*://*.googletagmanager.com/*',
]
const browserOptions = {
  executablePath: chromium.executablePath(),
  headless: true,
}
const contextOptions = {
  viewport: settings.viewport,
  deviceScaleFactor: settings.deviceScaleFactor,
  isMobile: true,
  hasTouch: true,
  userAgent: devices['Pixel 7'].userAgent,
  colorScheme: 'light',
  reducedMotion: 'no-preference',
  serviceWorkers: 'block',
}
const variants = {before: beforeUrl, after: afterUrl}
const results = []
const metadata = {
  startedAt: new Date().toISOString(),
  harnessSha256: createHash('sha256')
    .update(await readFile(fileURLToPath(import.meta.url)))
    .digest('hex'),
  settings,
  variants,
  host: {platform: platform(), arch: arch(), cpu: cpus()[0]?.model},
  browserExecutable: browserOptions.executablePath,
  headless: browserOptions.headless,
  emulatedUserAgent: contextOptions.userAgent,
  blockedUrls,
  notes: [
    settings.repeatVisit
      ? 'Production servers; each first/repeat pair launches a fresh Chrome with an isolated profile.'
      : 'Production servers; each trial launches a fresh Chrome with an isolated profile.',
    settings.repeatVisit
      ? 'Server routes/assets are warmed once. Each pair uses a fresh Chrome/profile with cache enabled: first navigation then the same-page navigation via about:blank, retaining HTTP cache. Service workers stay blocked.'
      : 'Server routes/assets are warmed once; browser HTTP cache is disabled and cleared every trial.',
    'CPU and network throttling use Chrome DevTools Protocol, not simulated Lighthouse throttling.',
    'Animations and canvas rendering run normally. Tracing is enabled equally for both variants.',
    'All metrics stop five seconds after load, document.fonts.ready, and network idle.',
    'loadBlockingMs sums long-task time beyond 50 ms from FCP to the measurement end; it is not Lighthouse TBT.',
    'LCP/CLS are lab observations within this window, not field Core Web Vitals or an INP measurement.',
    'Main-thread Performance counters are cumulative over each trial observation window, and that window varies per trial; compare them only alongside observationEndMs. Throttling is relative to this host CPU.',
    'transferBytes and the per-type byte counts include only requests that finished inside the window; unfinishedRequests reports how many were dropped.',
  ],
}
for (const [variant, directory] of Object.entries({
  before: process.env.PERF_BEFORE_DIR,
  after: process.env.PERF_AFTER_DIR,
})) {
  if (!directory) continue
  metadata[variant] = {
    buildId: (
      await readFile(resolve(directory, '.next/BUILD_ID'), 'utf8')
    ).trim(),
    commit: execFileSync('git', ['-C', directory, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim(),
    workingTree: execFileSync(
      'git',
      ['-C', directory, 'status', '--porcelain'],
      {encoding: 'utf8'},
    ).trim(),
  }
}
function observe() {
  const data = {lcp: null, shifts: [], longTasks: [], bodyReadyMs: null}
  window.__blogPerformance = data
  const bodyObserver = new MutationObserver(() => {
    const article = document.querySelector(
      'article.post-article:not([aria-hidden="true"])',
    )
    if (article && article.textContent.length > 100) {
      data.bodyReadyMs = performance.now()
      bodyObserver.disconnect()
    }
  })
  bodyObserver.observe(document, {subtree: true, childList: true})
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries())
      data.lcp = {
        time: entry.startTime,
        size: entry.size,
        tag: entry.element?.tagName,
        text: entry.element?.textContent?.slice(0, 120),
        url: entry.url,
      }
  }).observe({type: 'largest-contentful-paint', buffered: true})
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries())
      if (!entry.hadRecentInput)
        data.shifts.push({time: entry.startTime, value: entry.value})
  }).observe({type: 'layout-shift', buffered: true})
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries())
      data.longTasks.push({start: entry.startTime, duration: entry.duration})
  }).observe({type: 'longtask', buffered: true})
}
async function attachSession(context, page) {
  const session = await context.newCDPSession(page)
  await session.send('Network.enable')
  await session.send('Network.setBlockedURLs', {urls: blockedUrls})
  await session.send('Network.setBypassServiceWorker', {bypass: true})
  return session
}
async function createBrowser() {
  const browser = await chromium.launch(browserOptions)
  const context = await browser.newContext(contextOptions)
  await context.addInitScript(() => localStorage.setItem('theme', 'light'))
  const page = await context.newPage()
  page.setDefaultNavigationTimeout(180000)
  await page.addInitScript(observe)
  const session = await attachSession(context, page)
  return {browser, context, page, session}
}
async function stopTrace(session, filename) {
  const completed = new Promise((resolveEvent) =>
    session.once('Tracing.tracingComplete', resolveEvent),
  )
  await session.send('Tracing.end')
  const {stream} = await completed
  const chunks = []
  for (;;) {
    const chunk = await session.send('IO.read', {handle: stream})
    chunks.push(
      Buffer.from(chunk.data, chunk.base64Encoded ? 'base64' : 'utf8'),
    )
    if (chunk.eof) break
  }
  await session.send('IO.close', {handle: stream})
  await writeFile(filename, gzipSync(Buffer.concat(chunks)))
}
async function warmServers() {
  console.log(
    'Warming server routes and assets; these visits are not measured.',
  )
  for (const route of settings.routes) {
    for (const url of Object.values(variants)) {
      const {browser, page} = await createBrowser()
      try {
        const response = await page.goto(new URL(route, url).href, {
          waitUntil: 'networkidle',
        })
        assert.equal(response.status(), 200)
        await page.evaluate(() => document.fonts.ready.then(() => undefined))
      } finally {
        await browser.close()
      }
    }
  }
}
async function measureVisit(variant, route, round, visit, {page, session}) {
  const name = `${route === '/' ? 'home' : route.slice(1).replaceAll('/', '_')}-${variant}-${round + 1}${settings.repeatVisit ? `-${visit}` : ''}`
  const requests = new Map(),
    failures = [],
    pageErrors = []
  const appliedRules = new Set()
  const cacheHits = new Set()
  const onPageError = (error) => pageErrors.push(error.message)
  let tracing = false
  try {
    metadata.browser ??= await session.send('Browser.getVersion')
    await session.send('Network.setCacheDisabled', {
      cacheDisabled: !settings.repeatVisit,
    })
    if (visit === 'first') await session.send('Network.clearBrowserCache')
    session.on('Network.requestServedFromCache', ({requestId}) =>
      cacheHits.add(requestId),
    )
    await session.send('Emulation.setCPUThrottlingRate', {
      rate: settings.cpuSlowdown,
    })
    const network = {
      latency: settings.latencyMs,
      downloadThroughput: (settings.downloadKbps * 1000) / 8,
      uploadThroughput: (settings.uploadKbps * 1000) / 8,
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
    session.on('Network.requestWillBeSentExtraInfo', (event) => {
      if (event.appliedNetworkConditionsId)
        appliedRules.add(event.appliedNetworkConditionsId)
    })
    session.on('Network.responseReceived', ({requestId, response, type}) =>
      requests.set(requestId, {
        url: response.url,
        type,
        status: response.status,
        mimeType: response.mimeType,
        fromDiskCache: response.fromDiskCache ?? false,
        fromServiceWorker: response.fromServiceWorker ?? false,
        encodedBytes: response.encodedDataLength ?? 0,
        finished: false,
      }),
    )
    session.on('Network.dataReceived', ({requestId, encodedDataLength}) => {
      const request = requests.get(requestId)
      if (request) request.encodedBytes += encodedDataLength
    })
    session.on('Network.loadingFinished', ({requestId, encodedDataLength}) => {
      const request = requests.get(requestId)
      if (!request) return
      request.encodedBytes = encodedDataLength
      request.finished = true
    })
    session.on('Network.loadingFailed', (event) => {
      if (event.blockedReason !== 'inspector')
        failures.push({
          requestId: event.requestId,
          error: event.errorText,
          canceled: event.canceled ?? false,
        })
    })
    page.on('pageerror', onPageError)
    await session.send('Performance.enable', {timeDomain: 'timeTicks'})
    const start = Object.fromEntries(
      (await session.send('Performance.getMetrics')).metrics.map(
        ({name: metric, value}) => [metric, value],
      ),
    )
    await session.send('Tracing.start', {
      categories:
        'devtools.timeline,v8.execute,blink.user_timing,loading,disabled-by-default-devtools.timeline',
      transferMode: 'ReturnAsStream',
    })
    tracing = true
    const response = await page.goto(new URL(route, variants[variant]).href, {
      waitUntil: 'load',
    })
    assert.equal(response.status(), 200)
    if (route !== '/')
      await page.waitForFunction(
        () => window.__blogPerformance.bodyReadyMs !== null,
      )
    await page.evaluate(() => document.fonts.ready.then(() => undefined))
    await page.waitForLoadState('networkidle', {timeout: 180000})
    await page.waitForTimeout(settings.settleMs)
    const timing = await page.evaluate(() => {
      const data = window.__blogPerformance
      const article = document.querySelector(
        'article.post-article:not([aria-hidden="true"])',
      )
      const navigation = performance.getEntriesByType('navigation')[0]
      const fcp = performance.getEntriesByName('first-contentful-paint')[0]
        ?.startTime
      let cls = 0,
        windowValue = 0,
        windowStart = 0,
        previous = 0
      for (const shift of data.shifts) {
        if (
          previous === 0 ||
          shift.time - previous > 1000 ||
          shift.time - windowStart > 5000
        ) {
          windowValue = 0
          windowStart = shift.time
        }
        windowValue += shift.value
        previous = shift.time
        cls = Math.max(cls, windowValue)
      }
      const end = performance.now()
      return {
        ttfbMs: navigation.responseStart,
        responseEndMs: navigation.responseEnd,
        bodyReadyMs: data.bodyReadyMs,
        bodyTextLength: article?.textContent.length ?? 0,
        mathNodes: article?.querySelectorAll('math').length ?? 0,
        codeLines: article?.querySelectorAll('.code-line').length ?? 0,
        fonts: [...document.fonts].map((font) => ({
          family: font.family,
          status: font.status,
        })),
        fcpMs: fcp,
        lcpMs: data.lcp?.time,
        lcpElement: data.lcp,
        cls,
        domContentLoadedMs: navigation.domContentLoadedEventEnd,
        loadMs: navigation.loadEventEnd,
        observationEndMs: end,
        loadBlockingMs: data.longTasks.reduce(
          (sum, task) =>
            sum +
            Math.max(
              0,
              Math.min(task.start + task.duration, end) -
                Math.max(task.start + 50, fcp ?? 0),
            ),
          0,
        ),
        longTaskCount: data.longTasks.length,
        longTaskMs: data.longTasks.reduce(
          (sum, task) => sum + task.duration,
          0,
        ),
        touch: matchMedia('(hover: none)').matches,
        connection: {
          downlink: navigator.connection?.downlink,
          rtt: navigator.connection?.rtt,
        },
      }
    })
    const end = Object.fromEntries(
      (await session.send('Performance.getMetrics')).metrics.map(
        ({name: metric, value}) => [metric, value],
      ),
    )
    const resources = [...requests.entries()].map(([id, item]) => ({
      ...item,
      fromCache: cacheHits.has(id) || item.fromDiskCache,
    }))
    await stopTrace(session, resolve(outputDir, `${name}.trace.json.gz`))
    tracing = false
    await session.send('Emulation.setCPUThrottlingRate', {rate: 1})
    // 관찰 창이 닫힐 때 아직 전송 중이던 요청은 헤더와 일부 청크만 남는다. 그걸
    // 완료 요청과 함께 더하면 전송량이 빌드가 아니라 창이 언제 닫혔는지의 함수가 된다.
    const unfinished = resources.filter((item) => !item.finished)
    const total = (type) =>
      resources
        .filter((item) => item.finished && (!type || item.type === type))
        .reduce((sum, item) => sum + item.encodedBytes, 0)
    assert.ok(
      ruleIds.some((id) => appliedRules.has(id)) ||
        (visit === 'repeat' &&
          resources.length > 0 &&
          resources.every((item) => item.fromCache)),
      'No network request confirmed the configured throttle and this was not a fully cached repeat',
    )
    assert.ok(
      timing.touch && timing.fcpMs > 0 && timing.lcpMs > 0,
      'Missing mobile/paint measurements',
    )
    if (route.includes('math-for-programmer'))
      assert.equal(timing.mathNodes, 31)
    if (route.includes('k8s-for-frontend')) assert.ok(timing.codeLines > 0)
    assert.deepEqual(pageErrors, [], 'JavaScript errors invalidate the trial')
    assert.ok(
      resources.every(
        (item) =>
          item.status < 400 &&
          (visit === 'repeat' || !item.fromDiskCache) &&
          !item.fromServiceWorker,
      ),
      'Failed or cached resources invalidate the trial',
    )
    assert.ok(
      failures.every((item) => item.canceled),
      'Unexpected network failures invalidate the trial',
    )
    const result = {
      name,
      variant,
      route,
      visit,
      round: round + 1,
      ...timing,
      taskMs: (end.TaskDuration - start.TaskDuration) * 1000,
      scriptMs: (end.ScriptDuration - start.ScriptDuration) * 1000,
      layoutMs: (end.LayoutDuration - start.LayoutDuration) * 1000,
      styleMs: (end.RecalcStyleDuration - start.RecalcStyleDuration) * 1000,
      heapBytes: end.JSHeapUsedSize,
      requestCount: resources.length,
      cachedRequests: resources.filter((item) => item.fromCache).length,
      // 전송량 집계에서 빠진 요청 수. 0 이 아니면 그 그룹의 바이트 수는 하한이다.
      unfinishedRequests: unfinished.length,
      unfinishedUrls: unfinished.map((item) => item.url),
      transferBytes: total(),
      cssBytes: total('Stylesheet'),
      jsBytes: total('Script'),
      fontBytes: total('Font'),
      imageBytes: total('Image'),
      resources,
      canceledRequests: failures,
      trace: `${name}.trace.json.gz`,
    }
    await page.screenshot({path: resolve(outputDir, `${name}.png`)})
    results.push(result)
    await writeFile(
      resolve(outputDir, 'results.json'),
      JSON.stringify({metadata, results}, null, 2),
    )
    console.log(
      `${name}: FCP ${timing.fcpMs.toFixed(0)} ms, LCP ${timing.lcpMs.toFixed(0)} ms, main thread ${result.taskMs.toFixed(0)} ms, ${(result.transferBytes / 1024).toFixed(1)} KiB`,
    )
  } finally {
    if (tracing) await session.send('Tracing.end').catch(() => {})
    page.off('pageerror', onPageError)
  }
}
async function measure(variant, route, round) {
  const client = await createBrowser()
  try {
    await measureVisit(variant, route, round, 'first', client)
    if (settings.repeatVisit) {
      await client.session.detach()
      await client.page.goto('about:blank')
      client.session = await attachSession(client.context, client.page)
      await measureVisit(variant, route, round, 'repeat', client)
    }
  } finally {
    await client.browser.close()
  }
}
function summary() {
  const fields = [
    'ttfbMs',
    'responseEndMs',
    'bodyReadyMs',
    'fcpMs',
    'lcpMs',
    'cls',
    'loadMs',
    'taskMs',
    'scriptMs',
    'styleMs',
    'layoutMs',
    'loadBlockingMs',
    'observationEndMs',
    'transferBytes',
    'cssBytes',
    'jsBytes',
    'fontBytes',
    'imageBytes',
    'requestCount',
    'cachedRequests',
    'unfinishedRequests',
  ]
  const groups = []
  for (const route of settings.routes) {
    for (const variant of Object.keys(variants)) {
      for (const visit of settings.repeatVisit
        ? ['first', 'repeat']
        : ['first']) {
        const rows = results.filter(
          (row) =>
            row.route === route &&
            row.variant === variant &&
            row.visit === visit,
        )
        const values = Object.fromEntries(
          fields.map((field) => {
            const sorted = rows
              .map((row) => row[field])
              .filter((value) => Number.isFinite(value))
              .toSorted((a, b) => a - b)
            if (!sorted.length) return [field, null]
            return [
              field,
              {
                median:
                  (sorted[Math.floor((sorted.length - 1) / 2)] +
                    sorted[Math.ceil((sorted.length - 1) / 2)]) /
                  2,
                min: sorted[0],
                max: sorted.at(-1),
              },
            ]
          }),
        )
        groups.push({route, variant, visit, runs: rows.length, values})
      }
    }
  }
  return groups
}
await warmServers()
for (let round = 0; round < settings.rounds; round++) {
  for (const [index, route] of settings.routes.entries()) {
    // Alternate AB/BA to reduce systematic warm-up and thermal-order bias.
    const order =
      (round + index) % 2 ? ['after', 'before'] : ['before', 'after']
    for (const variant of order) await measure(variant, route, round)
  }
}
const report = {
  metadata: {...metadata, finishedAt: new Date().toISOString()},
  summary: summary(),
  results,
}
await writeFile(
  resolve(outputDir, 'results.json'),
  JSON.stringify(report, null, 2),
)
console.log(
  `Completed ${results.length} throttled trials. Results and DevTools traces: ${outputDir}`,
)
