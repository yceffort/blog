import {createHash} from 'node:crypto'
import {appendFile, mkdir, readFile, writeFile} from 'node:fs/promises'
import os from 'node:os'
import {setTimeout as delay} from 'node:timers/promises'

import {chromium} from 'playwright'

import {root} from './build.mjs'
import {startServer} from './server.mjs'

const option = (name, fallback) =>
  process.argv
    .find((x) => x.startsWith(`--${name}=`))
    ?.split('=')
    .slice(1)
    .join('=') ?? fallback
const repetitions = Number(option('repetitions', '15'))
const runName = option('run', new Date().toISOString().replaceAll(':', '-'))
const out = `${root}/results/${runName}`
const profiles = [
  {name: 'local-1x', cpu: 1},
  {name: 'local-4x', cpu: 4},
].filter((x) => option('profiles', 'local-1x,local-4x').split(',').includes(x.name))
const excluded = option('exclude', '').split(',').filter(Boolean)
const seed = Number(option('seed', '20260916'))

let randomState = seed >>> 0
function random() {
  randomState ^= randomState << 13
  randomState ^= randomState >>> 17
  randomState ^= randomState << 5
  return (randomState >>> 0) / 4294967296
}
function shuffled(array) {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const metricMap = (response) =>
  Object.fromEntries(response.metrics.map((x) => [x.name, x.value]))
const metricDelta = (a, b, name) => ((b[name] ?? 0) - (a[name] ?? 0)) * 1000

await mkdir(`${root}/results`, {recursive: true})
await mkdir(out)
const {server, origin, manifest, versions} = await startServer()
let browser
try {
  browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ],
  })
  await writeFile(
    `${out}/environment.json`,
    JSON.stringify(
      {
        startedAt: new Date().toISOString(),
        browser: browser.version(),
        browserExecutable: chromium.executablePath(),
        playwright: JSON.parse(
          await readFile(
            new URL('../node_modules/playwright/package.json', import.meta.url),
            'utf8',
          ),
        ).version,
        node: process.version,
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        cpus: os.cpus().map((x) => ({model: x.model, speed: x.speed})),
        memoryBytes: os.totalmem(),
        availableParallelism: os.availableParallelism(),
        libraries: versions,
        profiles,
        repetitions,
        seed,
        sourceHashes: Object.fromEntries(
          await Promise.all(
            ['build.mjs', 'server.mjs', 'measure.mjs'].map(async (file) => [
              file,
              createHash('sha256')
                .update(await readFile(`${root}/scripts/${file}`))
                .digest('hex'),
            ]),
          ),
        ),
      },
      null,
      2,
    ) + '\n',
  )
  await writeFile(
    `${out}/manifest.json`,
    JSON.stringify(manifest, null, 2) + '\n',
  )

  const cases = profiles.flatMap((profile) =>
    manifest
      .filter((item) => !excluded.includes(item.name))
      .map((item) => ({profile, item})),
  )
  let completed = 0
  for (let repetition = 0; repetition < repetitions; repetition++) {
    for (const {profile, item} of shuffled(cases)) {
      const context = await browser.newContext({
        viewport: {width: 1000, height: 700},
        serviceWorkers: 'block',
      })
      const page = await context.newPage()
      const cdp = await context.newCDPSession(page)
      await cdp.send('Network.enable')
      await cdp.send('Network.setCacheDisabled', {cacheDisabled: true})
      await cdp.send('Emulation.setCPUThrottlingRate', {rate: profile.cpu})
      await cdp.send('Performance.enable')
      const url = `${origin}/${item.name}.js?nonce=${repetition}-${completed}`
      try {
        await page.goto(origin, {waitUntil: 'load'})
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        )
        const before = metricMap(await cdp.send('Performance.getMetrics'))
        const injected = []
        const sendClick = async (label) => {
          const timestamp = Date.now() / 1000
          injected.push({label, sentEpochSec: timestamp})
          // Explicit timestamps keep queuing delay visible while the main thread is busy.
          await Promise.all([
            cdp.send('Input.dispatchMouseEvent', {
              type: 'mousePressed',
              x: 120,
              y: 130,
              button: 'left',
              clickCount: 1,
              timestamp,
            }),
            cdp.send('Input.dispatchMouseEvent', {
              type: 'mouseReleased',
              x: 120,
              y: 130,
              button: 'left',
              clickCount: 1,
              timestamp: timestamp + 0.001,
            }),
          ])
        }
        await page.evaluate((payloadUrl) => window.startBenchmark(payloadUrl), url)
        const loadingClicks = []
        // Pulse until the script is ready; a single fixed instant misses later long tasks.
        const pulseTimer = setInterval(() => {
          loadingClicks.push(sendClick(`pulse-${loadingClicks.length + 1}`))
        }, 25)
        await page.evaluate(() => window.bench.done)
        clearInterval(pulseTimer)
        const atReady = metricMap(await cdp.send('Performance.getMetrics'))
        await Promise.all(loadingClicks)
        await delay(150)
        for (const label of ['settled-1', 'settled-2', 'settled-3']) {
          await sendClick(label)
          await delay(75)
        }
        const raw = await page.evaluate(() => {
          const {done: _done, ...state} = window.bench
          return {
            ...state,
            resources: performance
              .getEntriesByType('resource')
              .map((e) => e.toJSON()),
            libResultType: typeof globalThis.__libResult,
          }
        })
        if (
          raw.errors.length ||
          raw.clicks.length !== injected.length ||
          raw.clicks.some((x) => !x.isTrusted)
        )
          throw new Error(`Invalid run: ${JSON.stringify(raw.errors)}`)
        const resource = raw.resources.find((x) => x.name === url)
        if (!resource || resource.decodedBodySize !== item.sourceBytes)
          throw new Error(`Payload size mismatch: ${JSON.stringify(resource)}`)
        const loading = raw.clicks.filter((x) => x.phase === 'loading')
        const settled = raw.clicks.filter((x) => x.phase === 'settled')
        const sorted = (values) => [...values].sort((a, b) => a - b)
        const median = (values) =>
          values.length
            ? sorted(values)[Math.floor((values.length - 1) / 2)]
            : null
        await appendFile(
          `${out}/raw.jsonl`,
          JSON.stringify({
            repetition,
            profile: profile.name,
            name: item.name,
            sourceBytes: item.sourceBytes,
            gzipBytes: item.gzipBytes,
            readyMs: raw.ready - raw.start,
            mainThreadTaskMs: metricDelta(before, atReady, 'TaskDuration'),
            scriptDurationMs: metricDelta(before, atReady, 'ScriptDuration'),
            heapDeltaMiB:
              ((atReady.JSHeapUsedSize ?? 0) - (before.JSHeapUsedSize ?? 0)) /
              1048576,
            loadingClickCount: loading.length,
            loadingMaxInputDelayMs: loading.length
              ? Math.max(...loading.map((x) => x.inputDelayMs))
              : null,
            settledMedianInputDelayMs: median(
              settled.map((x) => x.inputDelayMs),
            ),
            longTaskMaxMs: raw.longTasks.length
              ? Math.max(...raw.longTasks.map((x) => x.duration))
              : 0,
            libResultType: raw.libResultType,
          }) + '\n',
        )
      } finally {
        await context.close()
      }
      completed++
      if (completed % 20 === 0)
        console.log(`${completed} / ${cases.length * repetitions}`)
    }
  }
  console.log(`Done: ${completed} runs in ${out}`)
} finally {
  await browser?.close()
  server.close()
}
