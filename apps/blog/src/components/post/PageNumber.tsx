import Link from 'next/link'

import * as paginationStyles from '@/components/post/pagination.styles'

export default function PageNumber({
  pageNo,
  hasNextPage,
  next,
  prev,
}: {
  pageNo: number
  next: string
  prev?: string
  hasNextPage?: boolean
}) {
  return (
    <nav
      className={`pagination ${paginationStyles.pagination}`}
      aria-label="pagination"
    >
      <div className={`pagination-slot ${paginationStyles.pagination_slot}`}>
        {pageNo !== 1 && prev && (
          <Link
            href={prev}
            className={`pagination-link ${paginationStyles.pagination_link}`}
          >
            <span aria-hidden="true">←</span>
            <span>Page {pageNo - 1}</span>
          </Link>
        )}
      </div>
      <div
        className={`pagination-slot end ${paginationStyles.pagination_slot}`}
      >
        {hasNextPage && (
          <Link
            href={next}
            className={`pagination-link ${paginationStyles.pagination_link}`}
          >
            <span>Page {pageNo + 1}</span>
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </nav>
  )
}
