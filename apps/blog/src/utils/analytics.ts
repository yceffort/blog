import {BetaAnalyticsDataClient} from '@google-analytics/data'

const POST_PATH_PATTERN = /^\/\d{4}\//

async function getAnalyticsClient(): Promise<BetaAnalyticsDataClient | null> {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (!credentialsJson) {
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
  const propertyId = process.env.GA4_PROPERTY_ID
  if (!propertyId) {
    return []
  }

  const client = await getAnalyticsClient()
  if (!client) {
    return []
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{startDate: '30daysAgo', endDate: 'today'}],
      dimensions: [{name: 'pagePath'}],
      metrics: [{name: 'screenPageViews'}],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: {
            matchType: 'FULL_REGEXP',
            value: '^/\\d{4}/',
          },
        },
      },
      orderBys: [
        {
          metric: {metricName: 'screenPageViews'},
          desc: true,
        },
      ],
      limit: count * 3,
    })

    const slugs: string[] = []
    for (const row of response.rows ?? []) {
      const pagePath = row.dimensionValues?.[0]?.value ?? ''
      if (!POST_PATH_PATTERN.test(pagePath)) {
        continue
      }
      const slug = pagePath.replace(/^\//, '').replace(/\/$/, '')
      if (slug && !slugs.includes(slug)) {
        slugs.push(slug)
        if (slugs.length >= count) {
          break
        }
      }
    }

    return slugs
  } catch {
    return []
  }
}
