import {readFileSync} from 'node:fs'

import {BetaAnalyticsDataClient} from '@google-analytics/data'

// .env.local 수동 로딩 (JSON 값에 따옴표가 있어 --env-file 파싱이 깨질 수 있음)
const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
for (const line of raw.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (!m) continue
  let val = m[2].trim()
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
  if (!process.env[m[1]]) process.env[m[1]] = val
}

const propertyId = process.env.GA4_PROPERTY_ID
const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
const client = new BetaAnalyticsDataClient({credentials})
const property = `properties/${propertyId}`

const CUR = {startDate: '30daysAgo', endDate: 'yesterday'}
const PREV = {startDate: '60daysAgo', endDate: '31daysAgo'}

async function run(opts) {
  const [res] = await client.runReport({property, ...opts})
  return res
}

const num = (r, i = 0) => Number(r.metricValues?.[i]?.value ?? 0)
const dim = (r, i = 0) => r.dimensionValues?.[i]?.value ?? ''
const pct = (cur, prev) =>
  prev === 0
    ? cur === 0
      ? '0%'
      : '신규'
    : `${(((cur - prev) / prev) * 100).toFixed(1)}%`

async function main() {
  // 1. 전체 트래픽 비교
  const totals = async (range) =>
    run({
      dateRanges: [range],
      metrics: [
        {name: 'totalUsers'},
        {name: 'sessions'},
        {name: 'screenPageViews'},
        {name: 'averageSessionDuration'},
        {name: 'engagementRate'},
        {name: 'newUsers'},
      ],
    })
  const cur = await totals(CUR)
  const prev = await totals(PREV)
  const cr = cur.rows?.[0]
  const pr = prev.rows?.[0]

  console.log('=== [1] 전체 트래픽 (최근 30일 vs 직전 30일) ===')
  const metrics = [
    ['총 사용자', 0],
    ['세션', 1],
    ['페이지뷰', 2],
    ['신규 사용자', 5],
  ]
  for (const [label, i] of metrics) {
    console.log(
      `${label}: ${num(cr, i).toLocaleString()} (이전 ${num(pr, i).toLocaleString()}, ${pct(num(cr, i), num(pr, i))})`,
    )
  }
  console.log(
    `평균 세션 시간: ${num(cr, 3).toFixed(1)}초 (이전 ${num(pr, 3).toFixed(1)}초)`,
  )
  console.log(
    `참여율: ${(num(cr, 4) * 100).toFixed(1)}% (이전 ${(num(pr, 4) * 100).toFixed(1)}%)`,
  )

  // 2. 인기 포스트 TOP 20
  console.log('\n=== [2] 인기 포스트 TOP 20 (페이지뷰) ===')
  const top = await run({
    dateRanges: [CUR],
    dimensions: [{name: 'pagePath'}, {name: 'pageTitle'}],
    metrics: [
      {name: 'screenPageViews'},
      {name: 'totalUsers'},
      {name: 'averageSessionDuration'},
    ],
    orderBys: [{metric: {metricName: 'screenPageViews'}, desc: true}],
    dimensionFilter: {
      filter: {
        fieldName: 'pagePath',
        stringFilter: {matchType: 'BEGINS_WITH', value: '/20'},
      },
    },
    limit: 20,
  })
  top.rows?.forEach((r, idx) => {
    const title = dim(r, 1)
      .replace(/ \| yceffort.*$/, '')
      .slice(0, 45)
    console.log(
      `${String(idx + 1).padStart(2)}. ${num(r, 0).toLocaleString().padStart(6)}pv  ${dim(r, 0)}  「${title}」`,
    )
  })

  // 3. 신규 유입 포스트 비교 (직전 30일 대비 신규 상승)
  console.log('\n=== [3] 직전 30일 대비 트래픽 급상승 포스트 ===')
  const curByPath = await run({
    dateRanges: [CUR],
    dimensions: [{name: 'pagePath'}],
    metrics: [{name: 'screenPageViews'}],
    dimensionFilter: {
      filter: {
        fieldName: 'pagePath',
        stringFilter: {matchType: 'BEGINS_WITH', value: '/20'},
      },
    },
    limit: 200,
  })
  const prevByPath = await run({
    dateRanges: [PREV],
    dimensions: [{name: 'pagePath'}],
    metrics: [{name: 'screenPageViews'}],
    dimensionFilter: {
      filter: {
        fieldName: 'pagePath',
        stringFilter: {matchType: 'BEGINS_WITH', value: '/20'},
      },
    },
    limit: 200,
  })
  const prevMap = new Map(prevByPath.rows?.map((r) => [dim(r), num(r)]) ?? [])
  const risers = (curByPath.rows ?? [])
    .map((r) => ({path: dim(r), cur: num(r), prev: prevMap.get(dim(r)) ?? 0}))
    .filter((x) => x.cur >= 100)
    .map((x) => ({...x, delta: x.cur - x.prev}))
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 10)
  risers.forEach((x) => {
    console.log(
      `+${x.delta.toLocaleString().padStart(6)}  (${x.prev}→${x.cur})  ${x.path}`,
    )
  })

  // 4. 트래픽 소스 / 채널
  console.log('\n=== [4] 트래픽 채널 ===')
  const ch = await run({
    dateRanges: [CUR],
    dimensions: [{name: 'sessionDefaultChannelGroup'}],
    metrics: [{name: 'sessions'}, {name: 'totalUsers'}],
    orderBys: [{metric: {metricName: 'sessions'}, desc: true}],
  })
  ch.rows?.forEach((r) =>
    console.log(
      `${dim(r).padEnd(18)} ${num(r).toLocaleString().padStart(7)} 세션  (사용자 ${num(r, 1).toLocaleString()})`,
    ),
  )

  // 5. 검색 유입 소스 TOP
  console.log('\n=== [5] 유입 소스(source/medium) TOP 12 ===')
  const src = await run({
    dateRanges: [CUR],
    dimensions: [{name: 'sessionSourceMedium'}],
    metrics: [{name: 'sessions'}],
    orderBys: [{metric: {metricName: 'sessions'}, desc: true}],
    limit: 12,
  })
  src.rows?.forEach((r) =>
    console.log(
      `${dim(r).padEnd(30)} ${num(r).toLocaleString().padStart(7)} 세션`,
    ),
  )

  // 6. 국가 / 기기
  console.log('\n=== [6] 국가 TOP 8 ===')
  const geo = await run({
    dateRanges: [CUR],
    dimensions: [{name: 'country'}],
    metrics: [{name: 'totalUsers'}],
    orderBys: [{metric: {metricName: 'totalUsers'}, desc: true}],
    limit: 8,
  })
  geo.rows?.forEach((r) =>
    console.log(
      `${dim(r).padEnd(18)} ${num(r).toLocaleString().padStart(7)} 사용자`,
    ),
  )

  console.log('\n=== [7] 기기 카테고리 ===')
  const dev = await run({
    dateRanges: [CUR],
    dimensions: [{name: 'deviceCategory'}],
    metrics: [{name: 'totalUsers'}, {name: 'sessions'}],
    orderBys: [{metric: {metricName: 'totalUsers'}, desc: true}],
  })
  dev.rows?.forEach((r) =>
    console.log(
      `${dim(r).padEnd(10)} ${num(r).toLocaleString().padStart(7)} 사용자  (세션 ${num(r, 1).toLocaleString()})`,
    ),
  )
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})
