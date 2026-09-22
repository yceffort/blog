import assert from 'node:assert/strict'
import {readFile, stat, writeFile} from 'node:fs/promises'
import {fileURLToPath, pathToFileURL} from 'node:url'

import {chromium} from '@playwright/test'

const root = new URL('../', import.meta.url)
const reportUrl = new URL('artifacts/reports/blog.html', root)
const summaryUrl = new URL('artifacts/reports/blog.json', root)
const report = JSON.parse(await readFile(summaryUrl, 'utf8'))
const bundle = report.bundles.find((b) =>
  b.sources.some((s) => s.package === 'minisearch'),
)
assert(bundle)
const source = bundle.sources
  .filter((s) => s.package === 'minisearch')
  .sort((a, b) => b.unobservedBytes - a.unobservedBytes)[0]
const browser = await chromium.launch({headless: true})
let sampling = false,
  samplingDone
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1100}})
  const errors = [],
    requests = []
  const cdp = await page.context().newCDPSession(page)
  const heapSamples = []
  sampling = true
  samplingDone = (async () => {
    while (sampling) {
      heapSamples.push((await cdp.send('Runtime.getHeapUsage')).usedSize)
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  })()
  const heapAfterGC = async () => {
    await cdp.send('HeapProfiler.collectGarbage')
    return (await cdp.send('Runtime.getHeapUsage')).usedSize
  }
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (request.url().startsWith('http')) requests.push(request.url())
  })
  await page.goto(pathToFileURL(fileURLToPath(reportUrl)).href)
  await page.locator('#rows tr').first().waitFor({timeout: 60000})
  const overviewReadyMs = await page.evaluate(
    () => performance.getEntriesByName('bundle-trace:overview')[0].startTime,
  )
  const decodedChunks = () =>
    page.locator('script[id^="chunk-data-"][data-decode-count]').count()
  assert.equal(
    await decodedChunks(),
    0,
    'overview must not decode code payloads',
  )
  const overviewHeapBytes = await heapAfterGC()
  assert.equal(await page.locator('#rows tr').count(), 10)
  assert.equal(await page.locator('#inspector').isVisible(), false)
  assert.equal(await page.locator('#map-details').getAttribute('open'), null)
  const firstFile = await page
    .locator('#rows .file-button')
    .first()
    .getAttribute('aria-label')
  await page.getByRole('button', {name: 'Next file page', exact: true}).click()
  assert.notEqual(
    await page.locator('#rows .file-button').first().getAttribute('aria-label'),
    firstFile,
  )
  await page
    .getByRole('button', {name: 'Previous file page', exact: true})
    .click()
  assert.equal(
    await page.locator('#rows .file-button').first().getAttribute('aria-label'),
    firstFile,
  )
  await page.screenshot({
    path: fileURLToPath(
      new URL('artifacts/reports/blog-overview-light.png', root),
    ),
    fullPage: true,
  })
  await page.locator('#map-details > summary').click()
  await page.locator('#treemap .tile').first().waitFor()
  assert((await page.locator('#treemap .tile').count()) <= 12)
  await page.locator('#map-details > summary').click()
  await page.getByRole('searchbox').fill('minisearch')
  assert.equal(
    await page.locator('#rows tr').count(),
    1,
    'find package without knowing chunk hash',
  )
  await page.getByRole('searchbox').fill('MiniSearch.ts')
  assert.equal(
    await page.locator('#rows tr').count(),
    1,
    'find source across chunks',
  )
  await page
    .getByRole('button', {name: bundle.path, exact: true})
    .click({timeout: 60000})
  await page.getByRole('searchbox').fill(source.source)
  await page.getByRole('button', {name: source.source, exact: true}).click()
  await page.locator('#original-code .source-line.active').waitFor()
  assert.equal(await decodedChunks(), 1)
  await page.getByRole('searchbox').fill('')
  await page.getByLabel('Coverage state').selectOption('unobserved')
  await page.waitForFunction(
    () =>
      document.getElementById('inspector').getAttribute('aria-busy') ===
      'false',
  )
  for (const mode of ['light', 'dark']) {
    await page.getByLabel('Color theme').selectOption(mode)
    for (const status of ['unobserved', 'observed']) {
      await page.getByLabel('Coverage state').selectOption(status)
      await page.waitForFunction(
        () =>
          document.getElementById('inspector').getAttribute('aria-busy') ===
          'false',
      )
      assert(
        await page.evaluate(() => {
          const root = getComputedStyle(document.documentElement),
            anchor = getComputedStyle(
              document.querySelector('.source-line.active'),
            )
          return (
            root.getPropertyValue('--selection').trim() !==
              root.getPropertyValue('--observed').trim() &&
            anchor.backgroundColor !==
              getComputedStyle(
                document.querySelector('#generated mark.observed') ||
                  document.querySelector('#generated mark.unobserved'),
              ).backgroundColor
          )
        }),
      )
    }
  }
  await page.getByLabel('Coverage state').selectOption('unobserved')
  await page.getByLabel('Color theme').selectOption('light')
  await page.waitForFunction(
    () =>
      document.getElementById('inspector').getAttribute('aria-busy') ===
      'false',
  )
  const selectedHeapBytes = await heapAfterGC()
  assert.match(
    await page.locator('#range-count').textContent(),
    new RegExp(source.unobservedBytes.toLocaleString('en-US') + ' B'),
  )
  assert(await page.locator('#generated mark.active').count())
  assert.match(
    await page.locator('#original-label').textContent(),
    /source-map anchor/,
  )
  assert((await page.locator('#original-code .source-line').count()) >= 20)
  assert((await page.locator('#original-code').boundingBox()).height >= 520)
  assert(
    (await page.locator('#inspector').boundingBox()).width >
      (await page.locator('#workspace').boundingBox()).width * 0.7,
  )
  await page.screenshot({
    path: fileURLToPath(
      new URL('artifacts/reports/blog-desktop-light.png', root),
    ),
    fullPage: true,
  })
  await page.getByLabel('Color theme').selectOption('dark')
  await page.screenshot({
    path: fileURLToPath(new URL('artifacts/reports/blog-desktop.png', root)),
    fullPage: true,
  })
  await page.getByRole('button', {name: 'Expand code', exact: true}).click()
  assert.equal(await page.locator('#explorer').isVisible(), false)
  assert(
    (await page.locator('#original-code').boundingBox()).width >
      (await page.locator('#workspace').boundingBox()).width * 0.9,
  )
  await page.screenshot({
    path: fileURLToPath(new URL('artifacts/reports/blog-focus-dark.png', root)),
    fullPage: true,
  })
  await page.setViewportSize({width: 390, height: 844})
  await page.waitForFunction(() => {
    const anchor = document
      .querySelector('#original-code .source-line.active')
      .getBoundingClientRect()
    const code = document
      .getElementById('original-code')
      .getBoundingClientRect()
    return anchor.top >= code.top && anchor.bottom <= code.bottom
  })
  const overflow = await page.evaluate(() =>
    Array.from(document.querySelectorAll('body *'))
      .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 8)
      .map((el) => ({
        tag: el.tagName,
        id: el.id,
        width: el.getBoundingClientRect().width,
        text: el.textContent.slice(0, 100),
      })),
  )
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    JSON.stringify(overflow),
  )
  await page.screenshot({
    path: fileURLToPath(new URL('artifacts/reports/blog-mobile.png', root)),
    fullPage: true,
  })
  await page.getByLabel('Color theme').selectOption('light')
  await page.screenshot({
    path: fileURLToPath(
      new URL('artifacts/reports/blog-mobile-light.png', root),
    ),
    fullPage: true,
  })
  assert.deepEqual(errors, [])
  assert.deepEqual(requests, [])
  // Returning to the overview must release decoded details. Reopening decodes
  // that chunk again; metadata and other chunks remain untouched.
  await page.getByRole('button', {name: 'Show file list', exact: true}).click()
  await page.getByRole('button', {name: '← All chunks', exact: true}).click()
  const returnedHeapBytes = await heapAfterGC()
  await page.getByRole('searchbox').fill('minisearch')
  await page.getByRole('button', {name: bundle.path, exact: true}).click()
  await page.getByRole('searchbox').fill(source.source)
  await page.getByRole('button', {name: source.source, exact: true}).click()
  await page.locator('#original-code .source-line.active').waitFor()
  assert.equal(await decodedChunks(), 1)
  assert.equal(
    await page
      .locator('script[id^="chunk-data-"][data-decode-count="2"]')
      .count(),
    1,
  )
  sampling = false
  await samplingDone
  const result = {
    scope:
      'Full blog build HTML opens offline; paginated file list, grouped optional treemap, wide MiniSearch source view, focus mode, unobserved intervals, mapping anchor, light/dark desktop/mobile layouts',
    bundles: report.bundles.length,
    totals: report.totals,
    summaryBytes: (await stat(summaryUrl)).size,
    htmlBytes: (await stat(reportUrl)).size,
    originalExpandedPrettyJsonMiBApprox: 517,
    note: 'The summary omits code and intervals; HTML keeps them using compact tuples and embedded gzip. Not a competitor performance benchmark.',
    selectedBundle: bundle.path,
    selectedSource: source.source,
    selectedUnobservedBytes: source.unobservedBytes,
    pageErrors: errors,
    networkRequests: requests,
    loading: {
      overviewReadyMs,
      decodedChunksAtOverview: 0,
      decodedChunksAfterSelection: 1,
      retainedDecodedChunks: 1,
      overviewHeapBytes,
      selectedHeapBytes,
      returnedHeapBytes,
      sampledPeakJsHeapBytes: Math.max(...heapSamples),
      note: 'One local headless run. Heap sampled approximately every 50 ms; not a process RSS peak or statistical benchmark. Post-GC snapshots are reported separately. All encoded chunks still reside in the HTML DOM.',
    },
  }
  await writeFile(
    new URL('results/report-size.json', root),
    JSON.stringify(result, null, 2) + '\n',
  )
  console.log(JSON.stringify(result, null, 2))
} finally {
  sampling = false
  await samplingDone
  await browser.close()
}
