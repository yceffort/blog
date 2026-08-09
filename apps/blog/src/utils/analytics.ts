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

export async function getPopularPostViews(
  limit: number,
): Promise<{slug: string; views: number}[]> {
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
  } catch {
    return []
  }
}

export async function getPopularPostSlugs(count: number): Promise<string[]> {
  const views = await getPopularPostViews(count * 2)
  return views.map((row) => row.slug).slice(0, count)
}
