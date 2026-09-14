import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFile, writeFile} from 'node:fs/promises'
import {createServer} from 'node:http'

import {chromium} from '@playwright/test'

const output = process.argv[2]
assert.ok(output, 'Pass an output JSON path')
const server = createServer((_request, response) => {
  response.writeHead(200, {
    'Content-Type': 'text/html',
    'Cache-Control': 'no-store',
  })
  response.end('<html><body><h1>Network timing check</h1></body></html>')
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const report = {
  measuredAt: new Date().toISOString(),
  harnessSha256: createHash('sha256')
    .update(await readFile(import.meta.filename))
    .digest('hex'),
  purpose:
    'Check whether Navigation Timing includes CDP synthetic latency. Isolated HTTP 200 response, no early hints, no-store, fresh browser per case. Separate from the blog measurements.',
  cases: [],
}
try {
  for (const latency of [0, 150, 500]) {
    const browser = await chromium.launch({headless: true})
    try {
      report.browser ??= browser.version()
      const page = await browser.newPage({serviceWorkers: 'block'})
      const session = await page.context().newCDPSession(page)
      await session.send('Network.enable')
      await session.send('Network.setCacheDisabled', {cacheDisabled: true})
      const applied = new Set()
      session.on('Network.requestWillBeSentExtraInfo', (event) => {
        if (event.appliedNetworkConditionsId)
          applied.add(event.appliedNetworkConditionsId)
      })
      const {ruleIds} = await session.send(
        'Network.emulateNetworkConditionsByRule',
        {
          offline: false,
          matchedNetworkConditions: [
            {
              urlPattern: '',
              latency,
              downloadThroughput: 200000,
              uploadThroughput: 200000,
            },
          ],
        },
      )
      await page.goto(`http://127.0.0.1:${server.address().port}`, {
        waitUntil: 'networkidle',
      })
      assert.ok(ruleIds.some((id) => applied.has(id)))
      const timing = await page.evaluate(() => ({
        navigation: performance.getEntriesByType('navigation')[0].toJSON(),
        paints: performance
          .getEntriesByType('paint')
          .map((entry) => entry.toJSON()),
      }))
      report.cases.push({latency, ruleIds, applied: [...applied], ...timing})
    } finally {
      await browser.close()
    }
  }
} finally {
  server.close()
}
await writeFile(output, JSON.stringify(report, null, 2) + '\n')
console.log(`Timing calibration: ${output}`)
