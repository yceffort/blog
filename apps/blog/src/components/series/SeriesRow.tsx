import {format} from 'date-fns'
import Link from 'next/link'

import * as recentStyles from '@/components/home/recent.styles'
import {EmphasizedTitle} from '@/components/post/EmphasizedTitle'
import type {Series} from '@/type'
export default function SeriesRow({
  series,
  index,
}: {
  series: Series
  index: number
}) {
  const {slug, name, title, description, posts} = series
  const latest = posts.reduce(
    (acc, p) => (p.frontMatter.date > acc ? p.frontMatter.date : acc),
    posts[0].frontMatter.date,
  )
  const firstYear = Math.min(
    ...posts.map((p) => new Date(p.frontMatter.date).getFullYear()),
  )
  const lastYear = new Date(latest).getFullYear()
  const period =
    firstYear === lastYear ? `${firstYear}` : `${firstYear}–${lastYear}`
  return (
    <div className={`rec-row ${recentStyles.rec_row}`}>
      <Link
        href={`/series/${slug}`}
        aria-label={name}
        prefetch={false}
        className={recentStyles.element_a}
      />
      <div className={`rn ${recentStyles.rn}`}>
        {String(index + 1).padStart(2, '0')}
      </div>
      <div>
        <h4 className={recentStyles.element_h4}>
          <EmphasizedTitle title={title} />
        </h4>
        <div className={`rtags ${recentStyles.rtags}`}>
          <span>{String(posts.length).padStart(2, '0')} POSTS</span>
          <span>· {period}</span>
        </div>
      </div>
      <div className={`rd ${recentStyles.rd}`}>{description}</div>
      <div className={`rmeta ${recentStyles.rmeta}`}>
        <b className={recentStyles.element_b}>
          {format(new Date(latest), 'yyyy-MM-dd')}
        </b>
        마지막 업데이트
      </div>
      <div className={`rarrow ${recentStyles.rarrow}`} aria-hidden="true">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}
