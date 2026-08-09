import Link from 'next/link'

import {stripTitleEmphasis} from '@yceffort/shared/utils'

import type {Post} from '@/type'

interface SeriesPrevNextProps {
  seriesPosts: Post[]
  currentSlug: string
  pathPrefix?: string
  locale?: 'ko' | 'en'
}

const LABELS = {
  ko: {aria: '시리즈 이전/다음 글', prev: '← 이전 편', next: '다음 편 →'},
  en: {
    aria: 'Previous/next post in series',
    prev: '← Previous',
    next: 'Next →',
  },
}

export default function SeriesPrevNext({
  seriesPosts,
  currentSlug,
  pathPrefix = '',
  locale = 'ko',
}: SeriesPrevNextProps) {
  const labels = LABELS[locale]
  const currentIndex = seriesPosts.findIndex(
    (post) => post.fields.slug === currentSlug,
  )
  const prevPost = currentIndex > 0 ? seriesPosts[currentIndex - 1] : null
  const nextPost =
    currentIndex < seriesPosts.length - 1 ? seriesPosts[currentIndex + 1] : null

  if (!prevPost && !nextPost) {
    return null
  }

  return (
    <nav className="series-endnav" aria-label={labels.aria}>
      {prevPost ? (
        <Link
          href={`${pathPrefix}/${prevPost.fields.slug}`}
          className="series-endnav-card prev"
        >
          <span className="series-endnav-label">{labels.prev}</span>
          <strong>{stripTitleEmphasis(prevPost.frontMatter.title)}</strong>
        </Link>
      ) : (
        <span className="series-endnav-card empty" aria-hidden="true" />
      )}
      {nextPost ? (
        <Link
          href={`${pathPrefix}/${nextPost.fields.slug}`}
          className="series-endnav-card next"
        >
          <span className="series-endnav-label">{labels.next}</span>
          <strong>{stripTitleEmphasis(nextPost.frontMatter.title)}</strong>
        </Link>
      ) : (
        <span className="series-endnav-card empty" aria-hidden="true" />
      )}
    </nav>
  )
}
