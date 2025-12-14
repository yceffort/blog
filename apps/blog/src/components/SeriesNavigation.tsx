import Link from 'next/link'

import type {Post} from '#src/type'

interface SeriesNavigationProps {
  seriesName: string
  seriesPosts: Post[]
  currentSlug: string
}

export default function SeriesNavigation({
  seriesName,
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
    <div className="my-8 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-medium text-green-600 dark:text-green-400">
          시리즈
        </span>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {seriesName}
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          ({currentIndex + 1}/{seriesPosts.length})
        </span>
      </div>

      <details className="group">
        <summary className="cursor-pointer list-none text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
          <span className="flex items-center gap-1">
            <svg
              className="h-4 w-4 transition-transform group-open:rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            목록 보기
          </span>
        </summary>
        <ol className="mt-3 space-y-1 pl-4">
          {seriesPosts.map((post, index) => (
            <li key={post.fields.slug} className="text-sm">
              {post.fields.slug === currentSlug ? (
                <span className="font-medium text-green-600 dark:text-green-400">
                  {index + 1}. {post.frontMatter.title}
                </span>
              ) : (
                <Link
                  href={`/${post.fields.slug}`}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  {index + 1}. {post.frontMatter.title}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </details>

      {(prevPost || nextPost) && (
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-gray-200 pt-4 dark:border-gray-700">
          {prevPost ? (
            <Link
              href={`/${prevPost.fields.slug}`}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="line-clamp-1">{prevPost.frontMatter.title}</span>
            </Link>
          ) : (
            <div />
          )}
          {nextPost ? (
            <Link
              href={`/${nextPost.fields.slug}`}
              className="flex items-center gap-1 text-right text-sm text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400"
            >
              <span className="line-clamp-1">{nextPost.frontMatter.title}</span>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          ) : (
            <div />
          )}
        </div>
      )}
    </div>
  )
}
