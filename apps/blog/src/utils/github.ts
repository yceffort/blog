import {unstable_cache} from 'next/cache'

const GITHUB_USERNAME = 'yceffort'
const GITHUB_API = 'https://api.github.com/graphql'

interface ContributionDay {
  date: string
  contributionCount: number
  contributionLevel:
    | 'NONE'
    | 'FIRST_QUARTILE'
    | 'SECOND_QUARTILE'
    | 'THIRD_QUARTILE'
    | 'FOURTH_QUARTILE'
}

interface ContributionWeek {
  contributionDays: ContributionDay[]
}

interface ContributionData {
  totalContributions: number
  weeks: ContributionWeek[]
}

const query = `
  query($username: String!) {
    user(login: $username) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
            }
          }
        }
      }
    }
  }
`

async function fetchContributions(): Promise<ContributionData | null> {
  const token = process.env.GITHUB_TOKEN

  if (!token) {
    console.warn('GITHUB_TOKEN is not set')
    return null
  }

  try {
    const response = await fetch(GITHUB_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {username: GITHUB_USERNAME},
      }),
    })

    if (!response.ok) {
      console.error('GitHub API error:', response.status)
      return null
    }

    const data = await response.json()
    return data.data?.user?.contributionsCollection?.contributionCalendar ?? null
  } catch (error) {
    console.error('Failed to fetch GitHub contributions:', error)
    return null
  }
}

export const getContributions = unstable_cache(
  fetchContributions,
  ['github-contributions'],
  {revalidate: 3600},
)

export type {ContributionData, ContributionWeek, ContributionDay}
