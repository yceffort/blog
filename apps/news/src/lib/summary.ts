import type {Issue} from '@/lib/content'
import {issueHref} from '@/lib/format'

export interface IssueItem {
  title: string
  origin: string
  via: string | null
}

export interface IssueSummary {
  date: string
  href: string
  count: number
  items: IssueItem[]
}

// 항목은 "### 제목" 다음 줄의 "`출처` (경유지 경유) [원문](URL)"로 출처를 밝힌다.
export function summarize(issue: Issue): IssueSummary {
  const lines = issue.body.split('\n')
  const items: IssueItem[] = []
  for (const [i, line] of lines.entries()) {
    const title = line.match(/^### (.+)$/)?.[1]?.trim()
    if (!title) continue
    const source = lines.slice(i + 1).find((l) => l.trim() !== '') ?? ''
    items.push({
      title,
      origin: source.match(/^`([^`]+)`/)?.[1] ?? '',
      via:
        source
          .match(/\(([^()]*?)\s*경유\)/)?.[1]
          ?.split(',')
          .at(-1)
          ?.trim() ?? null,
    })
  }
  return {date: issue.date, href: issueHref(issue), count: issue.count, items}
}
