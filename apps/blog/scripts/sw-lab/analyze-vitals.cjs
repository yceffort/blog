// eh-vitals.jsonl 을 조건별 p50 으로 정리한다. 엣지 HIT 인 회차만 쓴다.
const fs = require('fs')
const path = require('path')
const rows = fs
  .readFileSync(path.join(__dirname, 'eh-vitals.jsonl'), 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))

const p = (a, q) => {
  const s = a.filter((x) => x != null).sort((x, y) => x - y)
  if (!s.length) return null
  return Math.round(s[Math.floor(s.length * q)] * 10) / 10
}
const pick = (cond, phase, key) =>
  rows
    .filter(
      (r) =>
        r.cond === cond &&
        r[phase] &&
        r[phase + 'Doc'] &&
        r[phase + 'Doc'].cache === 'HIT',
    )
    .map((r) => r[phase][key])

for (const phase of ['warm', 'cold']) {
  console.log('=== ' + phase + ' (edge HIT only) ===')
  const row = (cond) => {
    const n = pick(cond, phase, 'fcp').length
    const ctrl = rows.filter(
      (r) =>
        r.cond === cond &&
        r[phase] &&
        r[phase + 'Doc'] &&
        r[phase + 'Doc'].cache === 'HIT' &&
        r[phase].controlled,
    ).length
    console.log(
      cond.padEnd(5),
      'n=' + n,
      'controlled=' + ctrl,
      '| TTFB p50',
      p(pick(cond, phase, 'responseStart'), 0.5),
      '| FCP p50',
      p(pick(cond, phase, 'fcp'), 0.5),
      'p75',
      p(pick(cond, phase, 'fcp'), 0.75),
      '| LCP p50',
      p(pick(cond, phase, 'lcp'), 0.5),
      'p75',
      p(pick(cond, phase, 'lcp'), 0.75),
      '| DCL p50',
      p(pick(cond, phase, 'domContentLoaded'), 0.5),
    )
  }
  row('nosw')
  row('sw')
  for (const k of ['fcp', 'lcp']) {
    const a = p(pick('nosw', phase, k), 0.5)
    const b = p(pick('sw', phase, k), 0.5)
    console.log(
      '   ' + k + ' delta p50:',
      Math.round((b - a) * 10) / 10 + 'ms',
      '(' + a + ' -> ' + b + ')',
    )
  }
}
const els = new Set(
  rows.flatMap((r) => [r.warm && r.warm.lcpEl, r.cold && r.cold.lcpEl]),
)
console.log('LCP elements:', [...els].filter(Boolean).join(', '))
const nonHit = rows.filter(
  (r) =>
    (r.warmDoc && r.warmDoc.cache !== 'HIT') ||
    (r.coldDoc && r.coldDoc.cache !== 'HIT'),
).length
console.log('rows=' + rows.length, 'rows with a non-HIT phase=' + nonHit)
