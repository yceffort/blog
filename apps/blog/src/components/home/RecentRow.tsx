import {stripTitleEmphasis} from '@yceffort/shared/utils'
import {format} from 'date-fns'
import Link from 'next/link'

import * as recentStyles from '@/components/home/recent.styles'
import {EmphasizedTitle} from '@/components/post/EmphasizedTitle'
import type {Post} from '@/type'
export default function RecentRow({
  post,
  index,
  variant = 'default',
  pathPrefix = '',
}: {
  post: Post
  index: number
  variant?: 'default' | 'series'
  pathPrefix?: string
}) {
  const {
    fields: {slug},
    frontMatter: {date, title: rawTitle, description, tags},
    readingTime,
  } = post
  const plainTitle = stripTitleEmphasis(rawTitle)
  const isoDate = format(new Date(date), 'yyyy-MM-dd')
  return (
    <div
      className={`rec-row ${variant === 'series' ? recentStyles.series_row : recentStyles.rec_row}`}
    >
      <Link
        href={`${pathPrefix}/${slug}`}
        aria-label={plainTitle}
        prefetch={false}
        className={recentStyles.element_a}
      />
      <div className={`rn ${recentStyles.rn}`}>
        {String(index + 1).padStart(2, '0')}
      </div>
      <div>
        <h4 className={recentStyles.element_h4}>
          <EmphasizedTitle title={rawTitle} />
        </h4>
        <div className={`rtags ${recentStyles.rtags}`}>
          {tags.slice(0, 3).map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>
      </div>
      <div className={`rd ${recentStyles.rd}`}>{description}</div>
      <div className={`rmeta ${recentStyles.rmeta}`}>
        <b className={recentStyles.element_b}>{isoDate}</b>
        {pathPrefix ? `${readingTime} min · read` : `${readingTime}분 · read`}
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
