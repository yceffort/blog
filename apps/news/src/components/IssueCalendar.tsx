import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import Link from 'next/link'

import * as styles from '@/components/IssueCalendar.styles'
import type {Issue} from '@/lib/content'
import {issueHref} from '@/lib/format'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function Month({month, byDate}: {month: Date; byDate: Map<string, Issue>}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  })
  return (
    <section className={styles.month}>
      <h2 className={styles.title}>{format(month, 'yyyy년 M월')}</h2>
      <div className={styles.grid}>
        {WEEKDAYS.map((d) => (
          <span key={d} className={styles.weekday}>
            {d}
          </span>
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          if (day.getMonth() !== month.getMonth()) {
            return <span key={key} aria-hidden="true" />
          }
          const issue = byDate.get(key)
          return issue ? (
            <Link
              key={key}
              href={issueHref(issue)}
              className={styles.issue}
              title={issue.lead}
            >
              <span>{day.getDate()}</span>
              <span className={styles.count}>{`${issue.count}편`}</span>
            </Link>
          ) : (
            <span key={key} className={styles.empty}>
              {day.getDate()}
            </span>
          )
        })}
      </div>
    </section>
  )
}

// 호가 있는 달만 최신 달부터 그린다.
export default function IssueCalendar({issues}: {issues: Issue[]}) {
  const byDate = new Map(issues.map((issue) => [issue.date, issue]))
  const months = [...new Set(issues.map((issue) => issue.date.slice(0, 7)))]
  return (
    <div className={styles.months}>
      {months.map((m) => (
        <Month key={m} month={parseISO(`${m}-01`)} byDate={byDate} />
      ))}
    </div>
  )
}
