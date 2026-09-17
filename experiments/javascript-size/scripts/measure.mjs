import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {appendFile, mkdir, readFile, writeFile} from 'node:fs/promises'
import os from 'node:os'
import {setTimeout as delay} from 'node:timers/promises'

import {chromium} from 'playwright'

import {root} from './generate.mjs'
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
const selectedSizes = option('sizes', '0,128,512,1024,2048,5120,10240')
  .split(',')
  .map(Number)
const selectedKinds = option('kinds', 'comment,functions,initialized').split(
  ',',
)
const profiles = [
  {name: 'local-1x', cpu: 1, encoding: 'plain', network: null},
  {name: 'local-4x', cpu: 4, encoding: 'plain', network: null},
  {
    name: 'network-4x',
    cpu: 4,
    encoding: 'gzip',
    network: {
      latency: 80,
      downloadThroughput: 500000,
      uploadThroughput: 500000,
    },
  },
].filter((x) =>
  option('profiles', 'local-1x,local-4x,network-4x')
    .split(',')
    .includes(x.name),
)
const mode = option('mode', 'cold')
const trace = option('trace', 'false') === 'true'
const coverage = option('coverage', 'false') === 'true'
const interactionMode = option('interaction', 'fixed')
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
function safeRead(path) {
  try {
    return execFileSync('cat', [path], {encoding: 'utf8'}).trim()
  } catch {
    return null
  }
}
function metricMap(response) {
  return Object.fromEntries(response.metrics.map((x) => [x.name, x.value]))
}
function metricDelta(a, b, name) {
  return ((b[name] ?? 0) - (a[name] ?? 0)) * 1000
}

await mkdir(`${root}/results`, {recursive: true})
// Never append a second invocation to an existing dataset.
await mkdir(out)
const {server, origin, manifest} = await startServer()
let browser
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: chromium.executablePath(),
    args: [
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ],
  })
  const environment = {
    startedAt: new Date().toISOString(),
    codespace: process.env.CODESPACE_NAME ?? null,
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
    osRelease: safeRead('/etc/os-release'),
    cgroupCpuMax: safeRead('/sys/fs/cgroup/cpu.max'),
    cgroupMemoryMax: safeRead('/sys/fs/cgroup/memory.max'),
    profiles,
    repetitions,
    mode,
    trace,
    coverage,
    interactionMode,
    seed,
    selectedSizes,
    selectedKinds,
    sourceHashes: Object.fromEntries(
      await Promise.all(
        ['generate.mjs', 'server.mjs', 'measure.mjs'].map(async (file) => [
          file,
          createHash('sha256')
            .update(await readFile(`${root}/scripts/${file}`))
            .digest('hex'),
        ]),
      ),
    ),
  }
  await writeFile(
    `${out}/environment.json`,
    JSON.stringify(environment, null, 2) + '\n',
  )
  await writeFile(
    `${out}/manifest.json`,
    JSON.stringify(manifest, null, 2) + '\n',
  )
  const cases = profiles.flatMap((profile) =>
    manifest
      .filter(
        (item) =>
          selectedSizes.includes(item.kib) &&
          (item.kib === 0 || selectedKinds.includes(item.kind)),
      )
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
      await cdp.send('Network.setCacheDisabled', {
        cacheDisabled: mode === 'cold',
      })
      await cdp.send('Emulation.setCPUThrottlingRate', {rate: profile.cpu})
      await cdp.send('Performance.enable')
      if (profile.network)
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false,
          ...profile.network,
          connectionType: 'cellular4g',
        })
      const url = `${origin}/${item.name}.js?encoding=${profile.encoding}&${mode === 'warm' ? 'warm=1' : `nonce=${repetition}-${completed}`}`
      const phases =
        mode === 'warm'
          ? ['prime-1', 'prime-2', 'prime-3', 'measured']
          : ['measured']
      try {
        for (const phase of phases) {
          await page.goto(origin, {waitUntil: 'load'})
          await page.evaluate(
            () =>
              new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
              ),
          )
          if (coverage && phase === 'measured') {
            await cdp.send('Profiler.enable')
            await cdp.send('Profiler.startPreciseCoverage', {
              callCount: true,
              detailed: true,
            })
          }
          if (trace && phase === 'measured')
            await cdp.send('Tracing.start', {
              categories:
                'devtools.timeline,v8,disabled-by-default-v8.compile,blink.user_timing',
              transferMode: 'ReturnAsStream',
            })
          const before = metricMap(await cdp.send('Performance.getMetrics'))
          const injected = []
          const sendClick = async (label) => {
            const timestamp = Date.now() / 1000
            injected.push({label, sentEpochSec: timestamp})
            // Explicit event timestamps preserve queuing delay even while JS is busy.
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
          const start = await page.evaluate(
            (payloadUrl) => window.startBenchmark(payloadUrl),
            url,
          )
          const loadingClicks = []
          let pulseTimer
          if (interactionMode === 'pulse') {
            pulseTimer = setInterval(() => {
              loadingClicks.push(sendClick(`pulse-${loadingClicks.length + 1}`))
            }, 50)
          } else {
            loadingClicks.push(
              ...[25, 100].map((ms) =>
                delay(ms).then(() => sendClick(`start+${ms}ms`)),
              ),
            )
          }
          await page.evaluate(() => window.bench.done)
          clearInterval(pulseTimer)
          const atReady = metricMap(await cdp.send('Performance.getMetrics'))
          await Promise.all(loadingClicks)
          await delay(150)
          await sendClick('settled-1')
          await delay(75)
          await sendClick('settled-2')
          await delay(75)
          await sendClick('settled-3')
          await delay(75)
          const raw = await page.evaluate(() => {
            const {done: _done, ...state} = window.bench
            return {
              ...state,
              timeOrigin: performance.timeOrigin,
              resources: performance
                .getEntriesByType('resource')
                .map((e) => e.toJSON()),
              marks: performance
                .getEntriesByType('mark')
                .map((e) => e.toJSON()),
              unusedCalls: globalThis.__unusedCalls,
              unusedDataLength: globalThis.__unusedData?.length,
            }
          })
          const after = metricMap(await cdp.send('Performance.getMetrics'))
          if (
            raw.errors.length ||
            raw.clicks.length !== injected.length ||
            raw.clicks.some((x) => !x.isTrusted)
          )
            throw new Error(
              `Invalid run: ${JSON.stringify({errors: raw.errors, clicks: raw.clicks})}`,
            )
          if (
            raw.unusedCalls !== (item.kind === 'initialized' ? item.count : 0)
          )
            throw new Error(`Unexpected calls: ${raw.unusedCalls}`)
          const resource = raw.resources.find((x) => x.name === url)
          if (!resource || resource.decodedBodySize !== item.sourceBytes)
            throw new Error(
              `Payload size mismatch: ${JSON.stringify(resource)}`,
            )
          let coverageResult
          if (coverage && phase === 'measured') {
            const result = await cdp.send('Profiler.takePreciseCoverage')
            coverageResult = result.result.filter((x) => x.url === url)
            await cdp.send('Profiler.stopPreciseCoverage')
          }
          if (trace && phase === 'measured') {
            const completion = new Promise((resolve) =>
              cdp.once('Tracing.tracingComplete', resolve),
            )
            await cdp.send('Tracing.end')
            const {stream} = await completion
            const chunks = []
            while (true) {
              const part = await cdp.send('IO.read', {handle: stream})
              chunks.push(
                Buffer.from(part.data, part.base64Encoded ? 'base64' : 'utf8'),
              )
              if (part.eof) break
            }
            await cdp.send('IO.close', {handle: stream})
            await mkdir(`${out}/traces`, {recursive: true})
            await writeFile(
              `${out}/traces/${profile.name}-${item.name}-${repetition}.json`,
              Buffer.concat(chunks),
            )
          }
          const loadingTasks = raw.longTasks.filter(
            (x) => x.startTime >= start && x.startTime < raw.ready,
          )
          const frames = raw.frames.slice(1).map((value, index) => ({
            start: raw.frames[index],
            end: value,
            gap: value - raw.frames[index],
          }))
          const record = {
            repetition,
            phase,
            profile: profile.name,
            kind: item.kind,
            kib: item.kib,
            mode,
            interactionMode,
            sourceBytes: item.sourceBytes,
            gzipBytes: item.gzipBytes,
            functionCount: item.count,
            readyMs: raw.ready - start,
            resourceMs: resource.duration,
            responseBodyMs: resource.responseEnd - resource.responseStart,
            afterResponseMs: raw.ready - resource.responseEnd,
            mainThreadTaskMs: metricDelta(before, atReady, 'TaskDuration'),
            scriptDurationMs: metricDelta(before, atReady, 'ScriptDuration'),
            longTaskCount: loadingTasks.length,
            longTaskMaxMs: Math.max(0, ...loadingTasks.map((x) => x.duration)),
            blockingOver50Ms: loadingTasks.reduce(
              (sum, x) => sum + Math.max(0, x.duration - 50),
              0,
            ),
            heapAtReadyBytes: atReady.JSHeapUsedSize,
            heapAfterBytes: after.JSHeapUsedSize,
            heapDeltaBytes: atReady.JSHeapUsedSize - before.JSHeapUsedSize,
            loadingFrameMaxMs: Math.max(
              0,
              ...frames
                .filter((x) => x.end >= start && x.start <= raw.ready)
                .map((x) => x.gap),
            ),
            settledFrameMaxMs: Math.max(
              0,
              ...frames
                .filter((x) => x.start > raw.ready + 150)
                .map((x) => x.gap),
            ),
            clicks: raw.clicks.map((x, index) => ({
              ...x,
              ...injected[index],
              sinceStartMs: x.timestamp - start,
              occurredDuringLoad: x.timestamp < raw.ready,
            })),
            raw,
            coverage: coverageResult,
            loadAverage: os.loadavg(),
            freeMemoryBytes: os.freemem(),
            recordedAt: new Date().toISOString(),
          }
          if (phase === 'measured') {
            await appendFile(`${out}/raw.jsonl`, JSON.stringify(record) + '\n')
            completed++
            process.stdout.write(
              `${completed}/${cases.length * repetitions} ${profile.name} ${item.name} ready=${record.readyMs.toFixed(1)}ms task=${record.mainThreadTaskMs.toFixed(1)}ms block=${record.blockingOver50Ms.toFixed(1)}ms\n`,
            )
          } else
            await appendFile(
              `${out}/priming.jsonl`,
              JSON.stringify(record) + '\n',
            )
        }
      } finally {
        await context.close()
      }
    }
  }
  await writeFile(
    `${out}/complete.json`,
    JSON.stringify({finishedAt: new Date().toISOString(), completed}) + '\n',
  )
} finally {
  if (browser) await browser.close()
  await new Promise((resolve) => server.close(resolve))
}
