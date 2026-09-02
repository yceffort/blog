// eh-vitals-pfcache.jsonl 을 조건별로 정리한다. 엣지 HIT 인 회차만 쓴다.
// LCP 가 이봉분포라 p50 만으로는 갈리지 않는다. 두 봉우리의 비율도 같이 낸다.
const fs = require('fs')
const path = require('path')

const FILE = process.argv[2] || 'eh-vitals-pfcache.jsonl'
const SPLIT = Number(process.env.SPLIT || 350) // 두 봉우리를 가르는 선
const rows = fs
  .readFileSync(path.join(__dirname, FILE), 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))

// 기존 스크립트와 같은 방식의 분위수
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

const conds = [...new Set(rows.map((r) => r.cond))]
const ok = (r) => r.cache === 'HIT'

console.log(
  'file:',
  FILE,
  '| rows:',
  rows.length,
  '| edge HIT:',
  rows.filter(ok).length,
)
console.log(
  'dropped (non-HIT):',
  rows.filter((r) => !ok(r)).length,
  '| sw rows with patch lost:',
  rows.filter((r) => r.cond.startsWith('sw') && !r.patched).length,
)
console.log()

console.log('=== 조건별 (edge HIT only) ===')
for (const c of conds) {
  const rs = rows.filter((r) => r.cond === c && ok(r))
  const lcp = rs.map((r) => r.lcp)
  const hi = lcp.filter((x) => x >= SPLIT).length
  console.log(
    c.padEnd(11),
    'n=' + String(rs.length).padStart(2),
    '| TTFB p50',
    String(
      p(
        rs.map((r) => r.responseStart),
        0.5,
      ),
    ).padStart(6),
    '| FCP p50',
    String(
      p(
        rs.map((r) => r.fcp),
        0.5,
      ),
    ).padStart(6),
    'p75',
    String(
      p(
        rs.map((r) => r.fcp),
        0.75,
      ),
    ).padStart(6),
    '| LCP p50',
    String(p(lcp, 0.5)).padStart(6),
    'p75',
    String(p(lcp, 0.75)).padStart(6),
    'mean',
    String(mean(lcp)).padStart(6),
    '| LCP>=' + SPLIT,
    String(hi + '/' + rs.length).padStart(6),
    '(' + Math.round((hi / rs.length) * 100) + '%)',
  )
}

console.log()
console.log('=== 프리페치 실제 처리 (sw 조건, 측정 내비게이션 구간의 델타) ===')
for (const c of conds.filter((c) => c.startsWith('sw'))) {
  const rs = rows.filter((r) => r.cond === c && ok(r))
  console.log(
    c.padEnd(11),
    'hit p50',
    p(
      rs.map((r) => r.pfHit),
      0.5,
    ),
    'miss p50',
    p(
      rs.map((r) => r.pfMiss),
      0.5,
    ),
    'net p50',
    p(
      rs.map((r) => r.pfNet),
      0.5,
    ),
    '| 전부 히트인 회차',
    rs.filter((r) => r.pfHit === 31 && r.pfNet === 0).length + '/' + rs.length,
    '| patched',
    [...new Set(rs.map((r) => r.patched))].join(','),
  )
}

console.log()
console.log('=== RSC 리소스 타이밍 (측정 내비게이션) ===')
for (const c of conds) {
  const rs = rows.filter((r) => r.cond === c && ok(r))
  console.log(
    c.padEnd(11),
    'rscCount p50',
    String(
      p(
        rs.map((r) => r.rscCount),
        0.5,
      ),
    ).padStart(5),
    '| durTotal p50',
    String(
      p(
        rs.map((r) => r.rscDurTotal),
        0.5,
      ),
    ).padStart(7),
    '| lastEnd p50',
    String(
      p(
        rs.map((r) => r.rscLastEnd),
        0.5,
      ),
    ).padStart(7),
    '| rscBytes p50',
    String(
      p(
        rs.map((r) => r.rscBytes),
        0.5,
      ),
    ).padStart(7),
    '| staticBytes p50',
    String(
      p(
        rs.map((r) => r.staticBytes),
        0.5,
      ),
    ).padStart(7),
    '| fontLastEnd p50',
    String(
      p(
        rs.map((r) => r.fontLastEnd),
        0.5,
      ),
    ).padStart(6),
  )
}

console.log()
console.log('=== LCP 원자료 (정렬) ===')
for (const c of conds) {
  const rs = rows
    .filter((r) => r.cond === c && ok(r))
    .map((r) => Math.round(r.lcp))
    .sort((a, b) => a - b)
  console.log(c.padEnd(11), rs.join(' '))
}

console.log()
console.log('=== 높은 봉우리와 중간 LCP 후보의 관계 ===')
// 원본 데이터에서 높은 봉우리는 항상 size 4522 SPAN 후보를 끼고 있었다
for (const c of conds) {
  const rs = rows.filter((r) => r.cond === c && ok(r))
  const withMid = rs.filter((r) =>
    (r.lcpAll || []).some((e) => e.size > 3000 && e.el === 'SPAN'),
  )
  const hi = rs.filter((r) => r.lcp >= SPLIT)
  const both = rs.filter(
    (r) =>
      r.lcp >= SPLIT &&
      (r.lcpAll || []).some((e) => e.size > 3000 && e.el === 'SPAN'),
  )
  console.log(
    c.padEnd(11),
    '중간 SPAN 후보 있는 회차',
    String(withMid.length + '/' + rs.length).padStart(6),
    '| LCP>=' + SPLIT,
    String(hi.length + '/' + rs.length).padStart(6),
    '| 둘 다',
    both.length,
  )
}

console.log()
console.log('=== 봉우리별 내부 분포 (봉우리 자체는 움직이는가) ===')
for (const c of conds) {
  const rs = rows.filter((r) => r.cond === c && ok(r))
  const lo = rs.filter((r) => r.lcp < SPLIT).map((r) => r.lcp)
  const hi = rs.filter((r) => r.lcp >= SPLIT).map((r) => r.lcp)
  console.log(
    c.padEnd(11),
    '낮은 봉 n=' + String(lo.length).padStart(2),
    'p50',
    String(p(lo, 0.5)).padStart(5),
    '| 높은 봉 n=' + String(hi.length).padStart(2),
    'p50',
    String(p(hi, 0.5)).padStart(5),
  )
}

console.log()
console.log('=== 높은 봉 비율 비교 (2x2, 카이제곱) ===')
const chi2 = (a, b, c2, d) => {
  const n = a + b + c2 + d
  if (!n) return null
  const num = Math.abs(a * d - b * c2) - n / 2
  if (num <= 0) return 0
  return (n * num * num) / ((a + b) * (c2 + d) * (a + c2) * (b + d))
}
// 카이제곱 1자유도 -> p 값 (오차함수 근사)
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
const pval = (x2) =>
  x2 == null ? null : Math.round(erfc(Math.sqrt(x2 / 2)) * 1000) / 1000
const frac = (c) => {
  const rs = rows.filter((r) => r.cond === c && ok(r))
  return [
    rs.filter((r) => r.lcp >= SPLIT).length,
    rs.filter((r) => r.lcp < SPLIT).length,
  ]
}
for (const [x, y] of [
  ['sw', 'sw-pfcache'],
  ['nosw', 'sw'],
  ['nosw', 'noswblock'],
  ['sw', 'noswblock'],
  ['sw-pfcache', 'noswblock'],
]) {
  if (!conds.includes(x) || !conds.includes(y)) continue
  const [ah, al] = frac(x)
  const [bh, bl] = frac(y)
  const x2 = chi2(ah, al, bh, bl)
  console.log(
    (x + ' vs ' + y).padEnd(26),
    ah + '/' + (ah + al),
    'vs',
    bh + '/' + (bh + bl),
    '| chi2(Yates)',
    x2 == null ? '-' : Math.round(x2 * 100) / 100,
    '| p ~',
    pval(x2),
  )
}

console.log()
console.log('=== 봉우리와 다른 지표의 상관 (조건 합산) ===')
const all = rows.filter(ok)
for (const key of [
  'responseStart',
  'fcp',
  'fontLastEnd',
  'longTaskTotal',
  'rscFirstStart',
  'staticBytes',
]) {
  const lo = all.filter((r) => r.lcp < SPLIT).map((r) => r[key])
  const hi = all.filter((r) => r.lcp >= SPLIT).map((r) => r[key])
  console.log(
    key.padEnd(15),
    '낮은 봉 p50',
    String(p(lo, 0.5)).padStart(8),
    '| 높은 봉 p50',
    String(p(hi, 0.5)).padStart(8),
  )
}

console.log()
console.log('=== p50 의 불안정성: 조건별 부트스트랩 (LCP p50 의 2.5~97.5%) ===')
for (const c of conds) {
  const v = rows.filter((r) => r.cond === c && ok(r)).map((r) => r.lcp)
  if (!v.length) continue
  const boot = []
  for (let b = 0; b < 2000; b++) {
    const s = Array.from(
      {length: v.length},
      () => v[(Math.random() * v.length) | 0],
    )
    boot.push(p(s, 0.5))
  }
  boot.sort((a, b) => a - b)
  console.log(
    c.padEnd(11),
    'LCP p50',
    String(p(v, 0.5)).padStart(6),
    '| 부트스트랩 95% 구간',
    Math.round(boot[50]),
    '~',
    Math.round(boot[1949]),
  )
}
