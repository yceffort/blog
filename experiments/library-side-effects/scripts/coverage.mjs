// How much of each bundle actually runs when the page loads it once.
import {writeFile} from 'node:fs/promises'

import {chromium} from 'playwright'

import {root} from './build.mjs'
import {startServer} from './server.mjs'

const {server, origin, manifest} = await startServer()
const browser = await chromium.launch({headless: true})
const report = []
try {
  for (const item of manifest) {
    const context = await browser.newContext({serviceWorkers: 'block'})
    const page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    await cdp.send('Profiler.enable')
    await page.goto(origin, {waitUntil: 'load'})
    await cdp.send('Profiler.startPreciseCoverage', {
      callCount: true,
      detailed: true,
    })
    const url = `${origin}/${item.name}.js?coverage=1`
    await page.evaluate(async (payloadUrl) => {
      window.startBenchmark(payloadUrl)
      await window.bench.done
    }, url)
    const runtimeErrors = await page.evaluate(() => window.bench.errors)
    const {result} = await cdp.send('Profiler.takePreciseCoverage')
    await cdp.send('Profiler.stopPreciseCoverage')
    const script = result.find((x) => x.url === url)
    const functions = script?.functions ?? []
    // V8 은 함수와 블록 범위를 중첩해서 보고한다. count 가 0 인 범위의 합집합을
    // 구해 전체에서 빼야 실제로 실행된 바이트가 나온다.
    const cold = functions
      .flatMap((fn) => fn.ranges)
      .filter((range) => range.count === 0)
      .map((range) => [range.startOffset, range.endOffset])
      .sort((a, b) => a[0] - b[0])
    const merged = []
    for (const [start, end] of cold) {
      const last = merged[merged.length - 1]
      if (last && start <= last[1]) last[1] = Math.max(last[1], end)
      else merged.push([start, end])
    }
    const coldBytes = merged.reduce((sum, [start, end]) => sum + (end - start), 0)
    const executedBytes = Math.max(item.sourceBytes - coldBytes, 0)
    const state = await page.evaluate(() => ({
      isArray: Array.isArray(globalThis.__libResult),
      length: Array.isArray(globalThis.__libResult)
        ? globalThis.__libResult.length
        : null,
      isNull: globalThis.__libResult === null,
    }))
    report.push({
      name: item.name,
      sourceBytes: item.sourceBytes,
      functionCount: functions.length,
      executedFunctionCount: functions.filter((fn) =>
        fn.ranges.some((range) => range.count > 0),
      ).length,
      // Top-level code is reported as one function range covering the whole script.
      executedBytes,
      executedRatio: item.sourceBytes ? executedBytes / item.sourceBytes : 0,
      runtimeErrors,
      libResult: state,
    })
    await context.close()
  }
} finally {
  await browser.close()
  server.close()
}
await writeFile(
  `${root}/analysis/coverage.json`,
  JSON.stringify(report, null, 2) + '\n',
)
console.log(
  `${'조건'.padEnd(18)}${'원본 B'.padStart(9)}${'함수'.padStart(7)}${'실행함수'.padStart(9)}${'실행 B'.padStart(9)}${'실행비율'.padStart(9)}  결과`,
)
for (const row of report)
  console.log(
    row.name.padEnd(18) +
      String(row.sourceBytes).padStart(9) +
      String(row.functionCount).padStart(7) +
      String(row.executedFunctionCount).padStart(9) +
      String(row.executedBytes).padStart(9) +
      `${(row.executedRatio * 100).toFixed(1)}%`.padStart(9) +
      `  ${row.runtimeErrors.length ? `실패: ${row.runtimeErrors[0]}` : row.libResult.isNull ? 'null' : `배열 ${row.libResult.length}개`}`,
  )
