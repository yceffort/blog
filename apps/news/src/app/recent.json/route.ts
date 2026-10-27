import {NextResponse} from 'next/server'

import {listIssues} from '@/lib/content'
import {issueHref} from '@/lib/format'

// 설치한 앱이 오프라인용으로 미리 받아 두는 최근 호. 호는 배포할 때만 바뀐다.
export const dynamic = 'force-static'

export function GET() {
  const issues = [
    ...listIssues('daily').slice(0, 7),
    ...listIssues('weekly').slice(0, 2),
  ]
  return NextResponse.json(issues.map(issueHref))
}
