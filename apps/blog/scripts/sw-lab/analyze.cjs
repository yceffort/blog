const fs = require('fs')
const pct = (a, p) => {
  const s = a.toSorted((x, y) => x - y)
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null
}
const stat = (a) => ({
  n: a.length,
  p50: Math.round(pct(a, 0.5)),
  p75: Math.round(pct(a, 0.75)),
  p90: Math.round(pct(a, 0.9)),
  min: Math.round(Math.min(...a)),
  max: Math.round(Math.max(...a)),
})
const conds = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['sw', 'nosw', 'sw-nopreload']
const data = {}
for (const c of conds) {
  if (!fs.existsSync(`runs-${c}.jsonl`)) continue
  data[c] = fs
    .readFileSync(`runs-${c}.jsonl`, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(JSON.parse)
}
for (const phase of ['warm', 'cold', 'reload']) {
  console.log(`\n== ${phase}`)
  const rows = []
  for (const [c, runs] of Object.entries(data)) {
    const xs = runs.map((r) => r[phase]).filter(Boolean)
    for (const k of [
      'workerStart',
      'fetchStart',
      'responseStart',
      'responseEnd',
      'fcp',
      'lcp',
      'domContentLoaded',
      'load',
    ]) {
      rows.push({cond: c, metric: k, ...stat(xs.map((x) => x[k]))})
    }
    rows.push({
      cond: c,
      metric: 'swStartup(fs-ws)',
      ...stat(xs.map((x) => x.fetchStart - x.workerStart)),
    })
    rows.push({
      cond: c,
      metric: 'static.fetched',
      ...stat(xs.map((x) => x.static.fetched)),
    })
    rows.push({
      cond: c,
      metric: 'static.viaSW',
      ...stat(xs.map((x) => x.static.viaSW)),
    })
    rows.push({
      cond: c,
      metric: 'controlled%',
      n: xs.length,
      p50: Math.round(
        (100 * xs.filter((x) => x.controlled).length) / xs.length,
      ),
    })
    rows.push({
      cond: c,
      metric: 'ws>0%',
      n: xs.length,
      p50: Math.round(
        (100 * xs.filter((x) => x.workerStart > 0).length) / xs.length,
      ),
    })
  }
  console.table(rows)
}
console.log('\n== RSC prefetch (home, step5) per-request')
const rows = []
for (const [c, runs] of Object.entries(data)) {
  const es = runs.flatMap((r) => r.softNav?.prefetch ?? [])
  rows.push({cond: c, what: 'duration', ...stat(es.map((e) => e.duration))})
  rows.push({
    cond: c,
    what: 'ttfb(rs-st)',
    ...stat(es.map((e) => e.responseStart - e.startTime)),
  })
  rows.push({
    cond: c,
    what: 'fs-ws (sw only)',
    ...stat(
      es
        .filter((e) => e.workerStart > 0)
        .map((e) => e.fetchStart - e.workerStart),
    ),
  })
  rows.push({
    cond: c,
    what: 'ws>0%',
    n: es.length,
    p50: Math.round(
      (100 * es.filter((e) => e.workerStart > 0).length) /
        Math.max(1, es.length),
    ),
  })
  rows.push({
    cond: c,
    what: 'transferSize>0%',
    n: es.length,
    p50: Math.round(
      (100 * es.filter((e) => e.transferSize > 0).length) /
        Math.max(1, es.length),
    ),
  })
  const after = runs.flatMap((r) => r.softNav?.afterClick ?? [])
  rows.push({
    cond: c,
    what: 'afterClick.duration',
    ...stat(after.map((e) => e.duration)),
  })
  rows.push({
    cond: c,
    what: 'afterClick.n/run',
    ...stat(runs.map((r) => r.softNav?.afterClick?.length ?? 0)),
  })
}
console.table(rows)
