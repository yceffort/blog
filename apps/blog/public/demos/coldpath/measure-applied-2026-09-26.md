# 블로그 변경 전후 응답 본문 측정 스크립트

[블로그의 JavaScript가 언제 실행되는지 추적해보기](/2026/09/tracing-bundle-waste-with-v8-coverage-and-sourcemaps)의 "변경 전후의 응답 본문" 표를 만든 스크립트다. 블로그 커밋 `27fc9749`(변경 전)와 `cb27fb0a`(변경 후)를 각각 프로덕션 빌드해 `next start -p 4317`, `next start -p 4318`로 띄운 뒤 실행했다. 커버리지와 네트워크 감속 없이 Resource Timing의 JS 응답 본문 크기만 더한다. 결과는 [측정 결과 JSON](/demos/coldpath/applied-2026-09-26.json)에 있다.

```bash
npm install --save-dev playwright@1.63.0
npx playwright install chromium
PW_FROM="$PWD" OUT=applied.json ROUNDS=3 node measure-applied.mjs
```

`measure-applied.mjs`:

```js
// Before/after JS response bodies for the 2026-09-25 lazy-loading commits.
// No coverage, no throttling: only Resource Timing body sizes per scenario.
import assert from 'node:assert/strict'
import {writeFileSync} from 'node:fs'
import {createRequire} from 'node:module'

const require = createRequire(process.env.PW_FROM + '/')
const {chromium} = require('playwright')
const variants = {before: 'http://localhost:4317', after: 'http://localhost:4318'}
const post = '/2026/08/k8s-for-frontend-1'
const rounds = Number(process.env.ROUNDS ?? 3)

const jsEntries = () =>
  performance
    .getEntriesByType('resource')
    .filter((e) => new URL(e.name).pathname.endsWith('.js'))
    .map((e) => ({
      url: new URL(e.name).pathname,
      encoded: e.encodedBodySize,
      decoded: e.decodedBodySize,
    }))

async function run(browser, origin, path, action) {
  const context = await browser.newContext({
    viewport: {width: 1280, height: 900},
    serviceWorkers: 'block',
  })
  // Routing every request disables the HTTP cache; other origins are blocked.
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
  )
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const res = await page.goto(origin + path, {waitUntil: 'networkidle', timeout: 60000})
  assert(res.ok())
  await page.waitForTimeout(1000)
  const initial = await page.evaluate(jsEntries)
  let after = initial
  if (action) {
    await action(page)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    after = await page.evaluate(jsEntries)
  }
  await context.close()
  return {initial, after, errors}
}

const search = async (page) => {
  await page.getByRole('button', {name: '검색', exact: true}).first().click()
  await page.getByPlaceholder('글 검색…').fill('react')
  await page.locator('.search-result').first().waitFor({timeout: 60000})
}
const zoom = async (page) => {
  const open = page.getByRole('button', {name: '다이어그램 확대'}).first()
  await open.waitFor()
  await open.click()
  await page.waitForFunction(() =>
    [...document.querySelectorAll('div')].some((n) => n.style.cursor === 'move'),
  )
  await page.getByRole('button', {name: 'Zoom in'}).click()
}
const scenarios = {
  home: ['/', null],
  post: [post, null],
  'post+search': [post, search],
  'post+zoom': [post, zoom],
}

const sum = (list, k) => list.reduce((a, e) => a + e[k], 0)
const browser = await chromium.launch({headless: true})
const out = {browser: browser.version(), rounds, results: {}}
for (let r = 0; r < rounds; r++) {
  const order = r % 2 ? ['after', 'before'] : ['before', 'after']
  for (const [name, [path, action]] of Object.entries(scenarios)) {
    for (const v of order) {
      const {initial, after, errors} = await run(browser, variants[v], path, action)
      const added = after.filter((e) => !initial.some((i) => i.url === e.url))
      const row = {
        initialEncoded: sum(initial, 'encoded'),
        initialDecoded: sum(initial, 'decoded'),
        initialFiles: initial.length,
        addedEncoded: sum(added, 'encoded'),
        addedDecoded: sum(added, 'decoded'),
        addedFiles: added.map((e) => e.url),
        errors,
      }
      ;((out.results[name] ??= {})[v] ??= []).push(row)
    }
  }
}
await browser.close()
writeFileSync(process.env.OUT, JSON.stringify(out, null, 2))
for (const [name, byV] of Object.entries(out.results)) {
  for (const [v, rows] of Object.entries(byV)) {
    const keys = ['initialEncoded', 'initialDecoded', 'addedEncoded', 'addedDecoded']
    const vals = keys.map((k) => [...new Set(rows.map((x) => x[k]))].join('/'))
    console.log(name.padEnd(12), v.padEnd(7), keys.map((k, i) => `${k}=${vals[i]}`).join(' '), rows[0].errors.length ? 'ERR' : '')
  }
}
```
