// Timing runs deliberately never enable Profiler/Debugger or precise coverage.
import assert from 'node:assert/strict'
import {mkdir, writeFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {dirname, resolve} from 'node:path'
import {parseArgs} from 'node:util'

const require = createRequire(import.meta.url)
const {chromium} = require('@playwright/test')
const {values} = parseArgs({
  options: {
    rounds: {type: 'string', default: '8'},
    out: {type: 'string', default: 'artifacts/study/timing.json'},
  },
})
const rounds = Number(values.rounds)
assert(Number.isInteger(rounds) && rounds > 0)
const variants = {
  baseline: 'http://localhost:4317',
  lazy: 'http://localhost:4318',
}
const settings = {
  cpuSlowdown: 4,
  latencyMs: 150,
  downloadKbps: 1600,
  uploadKbps: 750,
}
const browser = await chromium.launch({headless: true})
const samples = []
const report = {
  capturedAt: new Date().toISOString(),
  browser: browser.version(),
  node: process.version,
  playwright: require('@playwright/test/package.json').version,
  settings,
  rounds,
  coverageEnabled: false,
  conditions:
    'Fresh context per sample; routing disables HTTP cache; service workers and external origins blocked; prefetch enabled; warm server; alternating AB/BA rounds',
  samples,
}
async function measure(variant, round, throttle) {
  const origin = variants[variant]
  const context = await browser.newContext({
    viewport: {width: 1280, height: 900},
    serviceWorkers: 'block',
  })
  try {
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === origin
        ? route.continue()
        : route.abort(),
    )
    await context.addInitScript(() => {
      window.__study = {lcp: null}
      new PerformanceObserver((list) => {
        window.__study.lcp = list.getEntries().at(-1).startTime
      }).observe({type: 'largest-contentful-paint', buffered: true})
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    const appliedRules = new Set()
    cdp.on('Network.requestWillBeSentExtraInfo', (event) => {
      if (event.appliedNetworkConditionsId)
        appliedRules.add(event.appliedNetworkConditionsId)
    })
    let ruleIds = []
    if (throttle) {
      await cdp.send('Emulation.setCPUThrottlingRate', {
        rate: settings.cpuSlowdown,
      })
      const network = {
        latency: settings.latencyMs,
        downloadThroughput: (settings.downloadKbps * 1000) / 8,
        uploadThroughput: (settings.uploadKbps * 1000) / 8,
        connectionType: 'cellular3g',
      }
      ;({ruleIds} = await cdp.send('Network.emulateNetworkConditionsByRule', {
        offline: false,
        matchedNetworkConditions: [{urlPattern: '', ...network}],
      }))
      await cdp.send('Network.overrideNetworkState', {
        offline: false,
        ...network,
      })
    }
    const response = await page.goto(origin, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    assert(response.ok())
    await page.waitForTimeout(1000)
    const initial = await page.evaluate(() => ({
      lcp: window.__study.lcp,
      resources: performance
        .getEntriesByType('resource')
        .map((e) => e.toJSON()),
    }))
    await page.evaluate(() => {
      document.addEventListener(
        'click',
        (event) => {
          if (event.target.closest('button[aria-label="검색"]'))
            window.__study.click = performance.now()
        },
        {capture: true},
      )
      document.addEventListener(
        'input',
        (event) => {
          if (event.target.matches('input[type="search"]'))
            window.__study.input = performance.now()
        },
        {capture: true},
      )
      const observer = new MutationObserver(() => {
        const result = document.querySelector('a.search-result')
        if (
          !result ||
          result.getClientRects().length === 0 ||
          window.__study.result !== undefined
        )
          return
        window.__study.result = performance.now()
        observer.disconnect()
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            window.__study.paint = performance.now()
          }),
        )
      })
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
      })
    })
    await page.getByRole('button', {name: '검색', exact: true}).click()
    const dialog = page.getByRole('dialog', {name: '글 검색'})
    await dialog.getByRole('searchbox').fill('javascript')
    try {
      await dialog
        .locator('a.search-result')
        .first()
        .waitFor({state: 'visible', timeout: 60000})
      await page.waitForFunction(() => window.__study.result !== undefined)
    } catch (error) {
      report.failure = {
        variant,
        round,
        message: error.message,
        errors,
        page: await page.evaluate(() => ({
          study: window.__study,
          dialog: document.querySelector('[role="dialog"]')?.textContent,
          resources: performance
            .getEntriesByType('resource')
            .map((e) => e.toJSON()),
        })),
      }
      await writeFile(values.out, JSON.stringify(report, null, 2) + '\n')
      throw error
    }
    const searched = await page.evaluate(() => ({
      ...window.__study,
      results: [...document.querySelectorAll('a.search-result')].map((a) =>
        a.getAttribute('href'),
      ),
      resources: performance
        .getEntriesByType('resource')
        .map((e) => e.toJSON()),
    }))
    assert(searched.results.length > 0)
    assert(Number.isFinite(searched.click) && Number.isFinite(searched.input))
    assert.deepEqual(errors, [])
    if (throttle)
      assert(
        ruleIds.some((id) => appliedRules.has(id)),
        'network throttle rule was not applied',
      )
    const resources = searched.resources
      .filter((r) => new URL(r.name).origin === origin)
      .map((r) => ({
        path: new URL(r.name).pathname,
        startMs: r.startTime,
        endMs: r.responseEnd,
        encodedBodyBytes: r.encodedBodySize,
        decodedBodyBytes: r.decodedBodySize,
        transferBytes: r.transferSize,
        phase: initial.resources.some(
          (i) => i.name === r.name && i.startTime === r.startTime,
        )
          ? 'initial'
          : 'search',
      }))
    const scripts = (phase) =>
      resources.filter((r) => r.phase === phase && r.path.endsWith('.js'))
    const scriptTotals = (phase) => ({
      count: scripts(phase).length,
      encodedBodyBytes: scripts(phase).reduce(
        (n, r) => n + r.encodedBodyBytes,
        0,
      ),
      decodedBodyBytes: scripts(phase).reduce(
        (n, r) => n + r.decodedBodyBytes,
        0,
      ),
    })
    return {
      variant,
      round,
      initialLcpMs: initial.lcp,
      clickToResultsMs: searched.result - searched.click,
      inputToResultsMs: searched.result - searched.input,
      clickMs: searched.click,
      initialScripts: scriptTotals('initial'),
      searchScripts: scriptTotals('search'),
      index: resources.find((r) => r.path === '/api/search-index'),
      results: searched.results,
      resources,
    }
  } finally {
    await context.close()
  }
}
try {
  for (const variant of Object.keys(variants)) {
    await measure(variant, -1, false)
    console.log(`Warmed ${variant}`)
  }
  for (let round = 0; round < rounds; round++) {
    for (const variant of round % 2 === 0
      ? ['baseline', 'lazy']
      : ['lazy', 'baseline']) {
      const sample = await measure(variant, round, true)
      samples.push(sample)
      assert.deepEqual(
        sample.results,
        samples[0].results,
        'search results differ',
      )
      await mkdir(dirname(resolve(values.out)), {recursive: true})
      await writeFile(values.out, JSON.stringify(report, null, 2) + '\n')
      console.log(
        `${round + 1} ${variant}: initial JS ${sample.initialScripts.encodedBodyBytes}B encoded, first search ${sample.clickToResultsMs.toFixed(1)}ms`,
      )
    }
  }
} finally {
  await browser.close()
}
