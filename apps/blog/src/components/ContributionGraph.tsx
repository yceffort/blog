import {getContributions} from '#src/utils/github'

import type {ContributionDay} from '#src/utils/github'

const LEVEL_COLORS: Record<ContributionDay['contributionLevel'], string> = {
  NONE: 'bg-gray-200 dark:bg-gray-700',
  FIRST_QUARTILE: 'bg-green-400 dark:bg-green-800',
  SECOND_QUARTILE: 'bg-green-500 dark:bg-green-600',
  THIRD_QUARTILE: 'bg-green-600 dark:bg-green-500',
  FOURTH_QUARTILE: 'bg-green-700 dark:bg-green-400',
}

export default async function ContributionGraph() {
  const data = await getContributions()

  if (!data) {
    return null
  }

  const recentWeeks = data.weeks.slice(-15)

  return (
    <a
      href="https://github.com/yceffort"
      target="_blank"
      rel="noopener noreferrer"
      className="block font-mono transition-opacity hover:opacity-80"
    >
      <div className="mb-2 text-gray-500 dark:text-gray-400">
        <span className="text-green-600 dark:text-green-400">➜</span>{' '}
        <span className="text-cyan-600 dark:text-cyan-400">~</span>{' '}
        <span className="text-gray-500">gh contribution</span>
      </div>
      <div className="flex gap-[3px]">
        {recentWeeks.map((week, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-[3px]">
            {week.contributionDays.map((day, dayIdx) => (
              <div
                key={dayIdx}
                className={`h-[14px] w-[14px] rounded-sm ${LEVEL_COLORS[day.contributionLevel]}`}
                title={`${day.date}: ${day.contributionCount} contributions`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {data.totalContributions.toLocaleString()} contributions
      </div>
    </a>
  )
}
