import {stripTitleEmphasis} from '@yceffort/shared/utils'
import Link from 'next/link'

import type {Post} from '@/type'

interface SeriesNavigationProps {
  seriesName: string
  seriesSlug?: string
  seriesPosts: Post[]
  currentSlug: string
  pathPrefix?: string
  locale?: 'ko' | 'en'
}

const LABELS = {
  ko: {kicker: '시리즈', list: '목록 보기'},
  en: {kicker: 'Series', list: 'View all'},
}

export default function SeriesNavigation({
  seriesName,
  seriesSlug,
  seriesPosts,
  currentSlug,
  pathPrefix = '',
  locale = 'ko',
}: SeriesNavigationProps) {
  const labels = LABELS[locale]
  const currentIndex = seriesPosts.findIndex(
    (post) => post.fields.slug === currentSlug,
  )
  const prevPost = currentIndex > 0 ? seriesPosts[currentIndex - 1] : null
  const nextPost =
    currentIndex < seriesPosts.length - 1 ? seriesPosts[currentIndex + 1] : null

  return (
    <div className="post-series-nav">
      <div className="series-nav-head">
        <span className="series-nav-kicker">{labels.kicker}</span>
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
          <span>{labels.list}</span>
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
                <Link href={`${pathPrefix}/${post.fields.slug}`}>
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
              href={`${pathPrefix}/${prevPost.fields.slug}`}
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
              href={`${pathPrefix}/${nextPost.fields.slug}`}
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
