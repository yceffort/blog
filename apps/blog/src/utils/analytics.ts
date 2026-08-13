import {BetaAnalyticsDataClient} from '@google-analytics/data'

const propertyId = process.env.GA4_PROPERTY_ID

// dotenv(@next/env)는 큰따옴표 값의 \n을 실제 개행으로 확장하므로,
// private_key에 개행이 생겨 JSON.parse가 깨지면 이스케이프로 되돌려 재시도한다.
function parseCredentials(credentialsJson: string) {
  try {
    return JSON.parse(credentialsJson)
  } catch {
    return JSON.parse(credentialsJson.replace(/\r?\n/g, '\\n'))
  }
}

function getClient(): BetaAnalyticsDataClient | null {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (!propertyId || !credentialsJson) {
    return null
  }

  try {
    const credentials = parseCredentials(credentialsJson)
    return new BetaAnalyticsDataClient({credentials})
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[analytics] invalid GA4 credentials:', error)
    return null
  }
}

export async function getPopularPostViews(
  limit: number,
  days = 30,
): Promise<{slug: string; views: number}[]> {
  const client = getClient()
  if (!client) {
    return []
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{startDate: `${days}daysAgo`, endDate: 'today'}],
      dimensions: [{name: 'pagePath'}],
      metrics: [{name: 'screenPageViews'}],
      orderBys: [{metric: {metricName: 'screenPageViews'}, desc: true}],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: {matchType: 'BEGINS_WITH', value: '/20'},
        },
      },
      limit,
    })

    if (!response.rows) {
      return []
    }

    return response.rows
      .map((row) => ({
        slug: row.dimensionValues?.[0]?.value?.replace(/^\//, '') ?? '',
        views: Number(row.metricValues?.[0]?.value ?? 0),
      }))
      .filter((row) => row.slug !== '')
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[analytics] getPopularPostViews failed:', error)
    return []
  }
}

export async function getPopularPostSlugs(
  count: number,
  days = 30,
): Promise<string[]> {
  const views = await getPopularPostViews(count * 2, days)
  return views.map((row) => row.slug).slice(0, count)
}
