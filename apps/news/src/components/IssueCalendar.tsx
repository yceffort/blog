'use client'

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import {ko} from 'date-fns/locale'
import Link from 'next/link'
import {useState} from 'react'

import * as styles from '@/components/IssueCalendar.styles'
import type {IssueSummary} from '@/lib/summary'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const TOP_ORIGINS = 5

function Month({
  month,
  byDate,
  selected,
  onSelect,
}: {
  month: Date
  byDate: Map<string, IssueSummary>
  selected: string
  onSelect: (date: string) => void
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  })
  return (
    <section>
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
              href={issue.href}
              className={styles.issue}
              data-selected={selected === key ? 'true' : 'false'}
              onMouseEnter={() => onSelect(key)}
              onFocus={() => onSelect(key)}
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

function Preview({issue}: {issue: IssueSummary}) {
  return (
    <section className={styles.card}>
      <p className={styles.cardLabel}>
        {format(parseISO(issue.date), 'M월 d일 EEEE', {locale: ko})}
      </p>
      <ol className={styles.items}>
        {issue.items.map((item, i) => (
          <li key={item.title} className={styles.item}>
            <span className={styles.itemTitle}>
              {i === 0 && <span className={styles.pick}>오늘의 하나</span>}
              {item.title}
            </span>
            <span className={styles.itemOrigin}>
              {item.via ? `${item.origin} (${item.via} 경유)` : item.origin}
            </span>
          </li>
        ))}
      </ol>
      <Link href={issue.href} className={styles.read}>
        이 호 읽기
      </Link>
    </section>
  )
}

function MonthStats({issues, month}: {issues: IssueSummary[]; month: string}) {
  const inMonth = issues.filter((issue) => issue.date.startsWith(month))
  const items = inMonth.flatMap((issue) => issue.items)
  const origins = new Map<string, number>()
  for (const item of items) {
    if (item.origin)
      origins.set(item.origin, (origins.get(item.origin) ?? 0) + 1)
  }
  const top = [...origins].toSorted((a, b) => b[1] - a[1]).slice(0, TOP_ORIGINS)
  const community = items.filter((item) => item.via).length
  return (
    <section className={styles.card}>
      <p className={styles.cardLabel}>
        {`${format(parseISO(`${month}-01`), 'M월')} 통계`}
      </p>
      <dl className={styles.stats}>
        <div>
          <dt className={styles.statLabel}>발행</dt>
          <dd className={styles.statValue}>{`${inMonth.length}호`}</dd>
        </div>
        <div>
          <dt className={styles.statLabel}>실린 글</dt>
          <dd className={styles.statValue}>{`${items.length}편`}</dd>
        </div>
        <div>
          <dt className={styles.statLabel}>커뮤니티 경유</dt>
          <dd className={styles.statValue}>{`${community}편`}</dd>
        </div>
      </dl>
      <p className={styles.statLabel}>많이 실린 출처</p>
      <ol className={styles.origins}>
        {top.map(([origin, n]) => (
          <li key={origin} className={styles.originRow}>
            <span>{origin}</span>
            <span className={styles.count}>{`${n}편`}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

// 호가 있는 달만 최신 달부터 그린다. 오른쪽에는 고른 날의 호와 그달의 통계를 보여 준다.
export default function IssueCalendar({issues}: {issues: IssueSummary[]}) {
  const [selected, setSelected] = useState(issues[0]?.date ?? '')
  const byDate = new Map(issues.map((issue) => [issue.date, issue]))
  const months = [...new Set(issues.map((issue) => issue.date.slice(0, 7)))]
  const current = byDate.get(selected)
  if (!current) return null
  return (
    <div className={styles.layout}>
      <div className={styles.months}>
        {months.map((m) => (
          <Month
            key={m}
            month={parseISO(`${m}-01`)}
            byDate={byDate}
            selected={selected}
            onSelect={setSelected}
          />
        ))}
      </div>
      <aside className={styles.side}>
        <Preview issue={current} />
        <MonthStats issues={issues} month={selected.slice(0, 7)} />
      </aside>
    </div>
  )
}
