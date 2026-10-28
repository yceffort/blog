import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import IssueView from '@/components/IssueView'
import {getIssue, getNeighbors, listIssues} from '@/lib/content'
import {issueHref, issueSubtitle, issueTitle} from '@/lib/format'
import {pageMetadata} from '@/lib/metadata'

interface Params {
  week: string
}

export function generateStaticParams(): Params[] {
  return listIssues('weekly').map((issue) => ({week: issue.slug}))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const {week} = await params
  const issue = getIssue('weekly', week)
  if (!issue) {
    return {}
  }
  return pageMetadata({
    title: `${issue.slug.slice(0, 4)}년 ${issueTitle(issue)}`,
    description: issueSubtitle(issue) ?? undefined,
    path: issueHref(issue),
  })
}

export default async function Page({params}: {params: Promise<Params>}) {
  const {week} = await params
  const issue = getIssue('weekly', week)
  if (!issue) {
    notFound()
  }
  const {prev, next} = getNeighbors('weekly', week)
  return <IssueView issue={issue} prev={prev} next={next} />
}
