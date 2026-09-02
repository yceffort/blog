// eh-vitals-vt.jsonl 을 2x2 로 정리한다. 엣지 HIT 인 회차만 쓴다.
const fs = require('fs')
const path = require('path')

const FILE = process.argv[2] || 'eh-vitals-vt.jsonl'
const SPLIT = Number(process.env.SPLIT || 350)
const rows = fs
  .readFileSync(path.join(__dirname, FILE), 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))

const p = (a, q) => {
  const s = a.filter((x) => x != null).sort((x, y) => x - y)
  if (!s.length) return null
  return Math.round(s[Math.floor(s.length * q)] * 10) / 10
}
const mean = (a) => {
  const s = a.filter((x) => x != null)
  return s.length
    ? Math.round((s.reduce((x, y) => x + y, 0) / s.length) * 10) / 10
    : null
}
const ok = (r) => r.cache === 'HIT'
const cells = ['nosw/on', 'nosw/off', 'sw/on', 'sw/off'].filter((c) =>
  rows.some((r) => r.cell === c),
)

console.log(
  'file:',
  FILE,
  '| rows:',
  rows.length,
  '| edge HIT:',
  rows.filter(ok).length,
)
console.log(
  'style 주입 실패 회차:',
  rows.filter((r) => !r.vtStyle).length,
  '| startViewTransition 호출 0회인 회차:',
  rows.filter((r) => !(r.vtCalls || []).length).length,
)

console.log()
console.log('=== 2x2 (edge HIT only) ===')
for (const c of cells) {
  const rs = rows.filter((r) => r.cell === c && ok(r))
  const lcp = rs.map((r) => r.lcp)
  const hi = lcp.filter((x) => x >= SPLIT).length
  console.log(
    c.padEnd(9),
    'n=' + String(rs.length).padStart(2),
    '| FCP p50',
    String(
      p(
        rs.map((r) => r.fcp),
        0.5,
      ),
    ).padStart(5),
    '| LCP p50',
    String(p(lcp, 0.5)).padStart(5),
    'p75',
    String(p(lcp, 0.75)).padStart(5),
    'max',
    String(Math.round(Math.max(...lcp))).padStart(5),
    'mean',
    String(mean(lcp)).padStart(6),
    '| LCP-FCP p50',
    String(
      p(
        rs.map((r) => r.lcp - r.fcp),
        0.5,
      ),
    ).padStart(5),
    '| 높은봉',
    String(hi + '/' + rs.length).padStart(6),
    '(' + Math.round((hi / rs.length) * 100) + '%)',
  )
}

console.log()
console.log('=== 조작이 실제로 걸렸는가: startViewTransition 호출 간격 ===')
for (const c of cells) {
  const rs = rows.filter((r) => r.cell === c && ok(r))
  const gaps = []
  const counts = []
  for (const r of rs) {
    const v = r.vtCalls || []
    counts.push(v.length)
    for (let i = 1; i < v.length; i++) gaps.push(v[i] - v[i - 1])
  }
  console.log(
    c.padEnd(9),
    '호출수 p50',
    p(counts, 0.5),
    '| 첫 호출 p50',
    String(
      p(
        rs.map((r) => (r.vtCalls || [])[0]),
        0.5,
      ),
    ).padStart(5),
    '| 연속 호출 간격 p50',
    String(p(gaps, 0.5)).padStart(5),
    'p25',
    String(p(gaps, 0.25)).padStart(5),
    'p75',
    String(p(gaps, 0.75)).padStart(5),
  )
}

console.log()
console.log('=== 카이제곱 (Yates) ===')
const chi2 = (a, b, c2, d) => {
  const n = a + b + c2 + d
  if (!n) return null
  const num = Math.abs(a * d - b * c2) - n / 2
  if (num <= 0) return 0
  return (n * num * num) / ((a + b) * (c2 + d) * (a + c2) * (b + d))
}
const erfc = (x) => {
  const z = Math.abs(x)
  const t = 1 / (1 + z / 2)
  const r =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t *
                                  (1.48851587 +
                                    t * (-0.82215223 + t * 0.17087277)))))))),
    )
  return x >= 0 ? r : 2 - r
}
const pv = (x2) => (x2 == null ? null : erfc(Math.sqrt(x2 / 2)))
const fmtp = (x) =>
  x == null ? '-' : x < 0.0001 ? '<0.0001' : Math.round(x * 10000) / 10000
const frac = (c) => {
  const rs = rows.filter((r) => r.cell === c && ok(r))
  return [
    rs.filter((r) => r.lcp >= SPLIT).length,
    rs.filter((r) => r.lcp < SPLIT).length,
  ]
}
for (const [x, y] of [
  ['nosw/on', 'nosw/off'],
  ['sw/on', 'sw/off'],
  ['nosw/on', 'sw/on'],
  ['nosw/off', 'sw/off'],
]) {
  if (!cells.includes(x) || !cells.includes(y)) continue
  const [ah, al] = frac(x)
  const [bh, bl] = frac(y)
  const x2 = chi2(ah, al, bh, bl)
  console.log(
    (x + ' vs ' + y).padEnd(22),
    ah + '/' + (ah + al),
    'vs',
    bh + '/' + (bh + bl),
    '| chi2',
    x2 == null ? '-' : Math.round(x2 * 100) / 100,
    '| p',
    fmtp(pv(x2)),
  )
}
// vt on 합산 대 off 합산
{
  const on = ['nosw/on', 'sw/on'].filter((c) => cells.includes(c)).map(frac)
  const off = ['nosw/off', 'sw/off'].filter((c) => cells.includes(c)).map(frac)
  const ah = on.reduce((a, x) => a + x[0], 0)
  const al = on.reduce((a, x) => a + x[1], 0)
  const bh = off.reduce((a, x) => a + x[0], 0)
  const bl = off.reduce((a, x) => a + x[1], 0)
  const x2 = chi2(ah, al, bh, bl)
  console.log(
    'vt on 합산 vs off 합산'.padEnd(22),
    ah + '/' + (ah + al),
    'vs',
    bh + '/' + (bh + bl),
    '| chi2',
    Math.round(x2 * 100) / 100,
    '| p',
    fmtp(pv(x2)),
  )
}

console.log()
console.log('=== LCP 원자료 (정렬) ===')
for (const c of cells) {
  console.log(
    c.padEnd(9),
    rows
      .filter((r) => r.cell === c && ok(r))
      .map((r) => Math.round(r.lcp))
      .sort((a, b) => a - b)
      .join(' '),
  )
}

console.log()
console.log('=== 높은 봉 회차에서 LCP 가 몇 번째 뷰 트랜지션과 붙는가 ===')
for (const c of cells) {
  const rs = rows.filter((r) => r.cell === c && ok(r) && r.lcp >= SPLIT)
  if (!rs.length) {
    console.log(c.padEnd(9), '높은 봉 없음')
    continue
  }
  const rel = rs.map((r) => {
    const v = r.vtCalls || []
    let best = null
    let bi = null
    for (let i = 0; i < v.length; i++) {
      const d = r.lcp - v[i]
      if (d >= 0 && (best == null || d < best)) {
        best = d
        bi = i
      }
    }
    return {d: best == null ? null : Math.round(best), i: bi}
  })
  console.log(
    c.padEnd(9),
    'n=' + rs.length,
    '| 직전 VT 호출로부터의 지연 p50',
    p(
      rel.map((x) => x.d),
      0.5,
    ),
    '| 몇 번째 호출인지',
    JSON.stringify(rel.map((x) => x.i)),
  )
}

console.log()
console.log('=== FCP 역전이 남아 있는가 (봉우리별 FCP) ===')
for (const c of cells) {
  const rs = rows.filter((r) => r.cell === c && ok(r))
  const lo = rs.filter((r) => r.lcp < SPLIT)
  const hi = rs.filter((r) => r.lcp >= SPLIT)
  console.log(
    c.padEnd(9),
    '낮은봉 n=' + String(lo.length).padStart(2),
    'FCP p50',
    String(
      p(
        lo.map((r) => r.fcp),
        0.5,
      ),
    ).padStart(5),
    '| 높은봉 n=' + String(hi.length).padStart(2),
    'FCP p50',
    String(
      p(
        hi.map((r) => r.fcp),
        0.5,
      ),
    ).padStart(5),
    '| 첫 VT 호출 p50 낮은봉',
    String(
      p(
        lo.map((r) => (r.vtCalls || [])[0]),
        0.5,
      ),
    ).padStart(5),
    '높은봉',
    String(
      p(
        hi.map((r) => (r.vtCalls || [])[0]),
        0.5,
      ),
    ).padStart(5),
  )
}
