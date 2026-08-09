import Link from 'next/link'

import {stripTitleEmphasis} from '@yceffort/shared/utils'

import type {Post} from '@/type'

interface SeriesNavigationProps {
  seriesName: string
  seriesSlug?: string
  seriesPosts: Post[]
  currentSlug: string
}

export default function SeriesNavigation({
  seriesName,
  seriesSlug,
  seriesPosts,
  currentSlug,
}: SeriesNavigationProps) {
  const currentIndex = seriesPosts.findIndex(
    (post) => post.fields.slug === currentSlug,
  )
  const prevPost = currentIndex > 0 ? seriesPosts[currentIndex - 1] : null
  const nextPost =
    currentIndex < seriesPosts.length - 1 ? seriesPosts[currentIndex + 1] : null

  return (
    <div className="post-series-nav">
      <div className="series-nav-head">
        <span className="series-nav-kicker">시리즈</span>
        <h3 className="series-nav-title">
          {seriesSlug ? (
            <Link href={`/series/${seriesSlug}`}>{seriesName}</Link>
          ) : (
            seriesName
          )}
        </h3>
        <span className="series-nav-progress">
          {currentIndex + 1} / {seriesPosts.length}
        </span>
      </div>

      <details className="series-nav-list group">
        <summary>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
          <span>목록 보기</span>
        </summary>
        <ol>
          {seriesPosts.map((post, index) => (
            <li
              key={post.fields.slug}
              data-current={post.fields.slug === currentSlug}
            >
              {post.fields.slug === currentSlug ? (
                <span>
                  <em>{String(index + 1).padStart(2, '0')}</em>
                  {stripTitleEmphasis(post.frontMatter.title)}
                </span>
              ) : (
                <Link href={`/${post.fields.slug}`}>
                  <em>{String(index + 1).padStart(2, '0')}</em>
                  {stripTitleEmphasis(post.frontMatter.title)}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </details>

      {(prevPost || nextPost) && (
        <div className="series-nav-prevnext">
          {prevPost ? (
            <Link
              href={`/${prevPost.fields.slug}`}
              className="series-nav-link prev"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 19l-7-7 7-7" />
              </svg>
              <span>{stripTitleEmphasis(prevPost.frontMatter.title)}</span>
            </Link>
          ) : (
            <span />
          )}
          {nextPost ? (
            <Link
              href={`/${nextPost.fields.slug}`}
              className="series-nav-link next"
            >
              <span>{stripTitleEmphasis(nextPost.frontMatter.title)}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  )
}
