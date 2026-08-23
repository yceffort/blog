// GA4 성과 리포트용 데이터 조회 스크립트.
// 사용법: node .claude/skills/ga4-report/scripts/fetch-ga4.cjs [--days 28] [--trend 91] [--out ./ga4-data.json]
// 자격증명은 apps/blog/.env.local의 GA4_PROPERTY_ID, GOOGLE_APPLICATION_CREDENTIALS_JSON을 사용한다.
const {createRequire} = require('module')
const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '../../../..')
const blogDir = path.join(repoRoot, 'apps/blog')
const blogRequire = createRequire(path.join(blogDir, 'package.json'))

// @next/env는 pnpm 스토어에만 있으므로 버전 무관하게 탐색한다.
const pnpmDir = path.join(repoRoot, 'node_modules/.pnpm')
const nextEnvDir = fs
  .readdirSync(pnpmDir)
  .find((d) => d.startsWith('@next+env@'))
if (!nextEnvDir) {
  console.error(
    '@next/env를 찾을 수 없습니다. pnpm install 후 다시 실행하세요.',
  )
  process.exit(1)
}
const {loadEnvConfig} = require(
  path.join(pnpmDir, nextEnvDir, 'node_modules/@next/env'),
)
loadEnvConfig(blogDir, true, {info: () => {}, error: console.error})

const {BetaAnalyticsDataClient} = blogRequire('@google-analytics/data')

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : fallback
}
const DAYS = Number(arg('days', 28))
const TREND = Number(arg('trend', 91))
const OUT = arg('out', path.join(process.cwd(), 'ga4-data.json'))

// dotenv가 큰따옴표 값의 \n을 실제 개행으로 확장하는 경우 재시도 (apps/blog/src/utils/analytics.ts와 동일)
function parseCredentials(credentialsJson) {
  try {
    return JSON.parse(credentialsJson)
  } catch {
    return JSON.parse(credentialsJson.replace(/\r?\n/g, '\\n'))
  }
}

const propertyId = process.env.GA4_PROPERTY_ID
const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
if (!propertyId || !credentialsJson) {
  console.error(
    'GA4_PROPERTY_ID 또는 GOOGLE_APPLICATION_CREDENTIALS_JSON이 없습니다. apps/blog/.env.local을 확인하세요.',
  )
  process.exit(1)
}
const client = new BetaAnalyticsDataClient({
  credentials: parseCredentials(credentialsJson),
})
const property = `properties/${propertyId}`

async function run(name, req) {
  const [res] = await client.runReport({property, ...req})
  const rows = (res.rows || []).map((r) => ({
    d: (r.dimensionValues || []).map((v) => v.value),
    m: (r.metricValues || []).map((v) => v.value),
  }))
  return {name, rows}
}

// 최근 2개월(YYYY/MM) 경로 프리픽스 → 신규 글 성과 조회용
function recentMonthPrefixes() {
  const now = new Date()
  const prefixes = []
  for (const offset of [0, 1]) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    prefixes.push(
      `/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`,
    )
  }
  return prefixes
}

async function main() {
  const range = [{startDate: `${DAYS}daysAgo`, endDate: 'today'}]
  const reports = [
    run('daily', {
      dateRanges: [{startDate: `${TREND}daysAgo`, endDate: 'today'}],
      dimensions: [{name: 'date'}],
      metrics: [
        {name: 'activeUsers'},
        {name: 'sessions'},
        {name: 'screenPageViews'},
      ],
      orderBys: [{dimension: {dimensionName: 'date'}}],
      limit: TREND + 5,
    }),
    run('totalsCompare', {
      dateRanges: [
        {startDate: `${DAYS}daysAgo`, endDate: 'today', name: 'current'},
        {
          startDate: `${DAYS * 2}daysAgo`,
          endDate: `${DAYS + 1}daysAgo`,
          name: 'previous',
        },
      ],
      metrics: [
        {name: 'activeUsers'},
        {name: 'sessions'},
        {name: 'screenPageViews'},
        {name: 'engagementRate'},
        {name: 'averageSessionDuration'},
        {name: 'newUsers'},
      ],
    }),
    run('topPosts', {
      dateRanges: range,
      dimensions: [{name: 'pagePath'}],
      metrics: [
        {name: 'screenPageViews'},
        {name: 'activeUsers'},
        {name: 'userEngagementDuration'},
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: {matchType: 'BEGINS_WITH', value: '/20'},
        },
      },
      orderBys: [{metric: {metricName: 'screenPageViews'}, desc: true}],
      limit: 30,
    }),
    run('channels', {
      dateRanges: range,
      dimensions: [{name: 'sessionDefaultChannelGroup'}],
      metrics: [{name: 'sessions'}, {name: 'activeUsers'}],
      orderBys: [{metric: {metricName: 'sessions'}, desc: true}],
      limit: 15,
    }),
    run('sources', {
      dateRanges: range,
      dimensions: [{name: 'sessionSource'}],
      metrics: [{name: 'sessions'}],
      orderBys: [{metric: {metricName: 'sessions'}, desc: true}],
      limit: 15,
    }),
    // 레퍼럴 유입만 (source/medium). 채널 그룹의 Referral 내역 확인용
    run('referrals', {
      dateRanges: range,
      dimensions: [{name: 'sessionSource'}, {name: 'sessionMedium'}],
      metrics: [{name: 'sessions'}, {name: 'activeUsers'}],
      orderBys: [{metric: {metricName: 'sessions'}, desc: true}],
      limit: 40,
    }),
    // 실제 레퍼러 URL (이벤트 스코프). 어느 페이지에서 링크를 타고 왔는지
    run('referrerUrls', {
      dateRanges: range,
      dimensions: [{name: 'pageReferrer'}],
      metrics: [{name: 'screenPageViews'}, {name: 'activeUsers'}],
      orderBys: [{metric: {metricName: 'screenPageViews'}, desc: true}],
      limit: 40,
    }),
    // 채널 → 랜딩 글 교차. 사용자 흐름 다이어그램의 뼈대
    run('channelLanding', {
      dateRanges: range,
      dimensions: [
        {name: 'sessionDefaultChannelGroup'},
        {name: 'landingPagePlusQueryString'},
      ],
      metrics: [{name: 'sessions'}, {name: 'activeUsers'}],
      orderBys: [{metric: {metricName: 'sessions'}, desc: true}],
      limit: 150,
    }),
    // 소스 → 랜딩 글 교차. "어디서 어느 글로" 표
    run('sourceLanding', {
      dateRanges: range,
      dimensions: [
        {name: 'sessionSource'},
        {name: 'landingPagePlusQueryString'},
      ],
      metrics: [{name: 'sessions'}],
      orderBys: [{metric: {metricName: 'sessions'}, desc: true}],
      limit: 150,
    }),
    // 랜딩 글별 세션 깊이·참여. 흐름의 마지막 단계(더 읽었나 / 한 장만 보고 떠났나)
    run('landingDepth', {
      dateRanges: range,
      dimensions: [{name: 'landingPagePlusQueryString'}],
      metrics: [
        {name: 'sessions'},
        {name: 'engagedSessions'},
        {name: 'screenPageViews'},
        {name: 'bounceRate'},
      ],
      orderBys: [{metric: {metricName: 'sessions'}, desc: true}],
      limit: 40,
    }),
    run('countries', {
      dateRanges: range,
      dimensions: [{name: 'country'}],
      metrics: [{name: 'activeUsers'}, {name: 'sessions'}],
      orderBys: [{metric: {metricName: 'activeUsers'}, desc: true}],
      limit: 10,
    }),
    run('devices', {
      dateRanges: range,
      dimensions: [{name: 'deviceCategory'}],
      metrics: [{name: 'activeUsers'}],
      orderBys: [{metric: {metricName: 'activeUsers'}, desc: true}],
      limit: 5,
    }),
    run('newReturning', {
      dateRanges: range,
      dimensions: [{name: 'newVsReturning'}],
      metrics: [{name: 'activeUsers'}],
      limit: 5,
    }),
    run('recentPosts', {
      dateRanges: range,
      dimensions: [{name: 'pagePath'}],
      metrics: [{name: 'screenPageViews'}, {name: 'activeUsers'}],
      dimensionFilter: {
        orGroup: {
          expressions: recentMonthPrefixes().map((p) => ({
            filter: {
              fieldName: 'pagePath',
              stringFilter: {matchType: 'BEGINS_WITH', value: p},
            },
          })),
        },
      },
      orderBys: [{metric: {metricName: 'screenPageViews'}, desc: true}],
      limit: 30,
    }),
  ]

  const out = {
    meta: {generatedAt: new Date().toISOString(), days: DAYS, trend: TREND},
  }
  for (const r of await Promise.all(reports)) out[r.name] = r.rows
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1))
  console.log(`wrote ${OUT}`)
  console.log(
    Object.keys(out)
      .filter((k) => k !== 'meta')
      .map((k) => `${k}:${out[k].length}`)
      .join(' '),
  )
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
