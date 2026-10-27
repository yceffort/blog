import type {Metadata} from 'next'

import * as styles from '@/components/Issue.styles'
import IssueCalendar from '@/components/IssueCalendar'
import {IssueArchive} from '@/components/IssueList'
import {listIssues} from '@/lib/content'
import {summarize} from '@/lib/summary'

export const metadata: Metadata = {title: '일간'}

export default function Page() {
  const issues = listIssues('daily')
  return (
    <>
      <header className={styles.header}>
        <div className={styles.eyebrow}>Daily</div>
        <h1 className={styles.title}>일간</h1>
        <p className={styles.subtitle}>
          {`매일 아침 10시에 발행합니다. 지금까지 ${issues.length}호.`}
        </p>
      </header>
      <IssueCalendar issues={issues.map(summarize)} />
      <IssueArchive issues={issues} />
    </>
  )
}
