import {BetaAnalyticsDataClient} from '@google-analytics/data'

const propertyId = process.env.GA4_PROPERTY_ID

function getClient(): BetaAnalyticsDataClient | null {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (!propertyId || !credentialsJson) {
    return null
  }

  try {
    const credentials = JSON.parse(credentialsJson)
    return new BetaAnalyticsDataClient({credentials})
  } catch {
    return null
  }
}

export async function getPopularPostSlugs(count: number): Promise<string[]> {
  const client = getClient()
  if (!client) {
    return []
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{startDate: '30daysAgo', endDate: 'today'}],
      dimensions: [{name: 'pagePath'}],
      metrics: [{name: 'screenPageViews'}],
      orderBys: [{metric: {metricName: 'screenPageViews'}, desc: true}],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: {matchType: 'BEGINS_WITH', value: '/20'},
        },
      },
      limit: count * 2,
    })

    if (!response.rows) {
      return []
    }

    return response.rows
      .map((row) => row.dimensionValues?.[0]?.value?.replace(/^\//, '') ?? '')
      .filter(Boolean)
      .slice(0, count)
  } catch {
    return []
  }
}
