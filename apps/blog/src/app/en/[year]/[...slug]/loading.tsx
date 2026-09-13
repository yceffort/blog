import * as stylex from '@stylexjs/stylex'

import * as heroStyles from '@/components/home/hero.styles'
import * as ambientStyles from '@/components/layout/ambient.styles'
import * as readingProgressStyles from '@/components/post/reading-progress.styles'

const pulseAnimation = stylex.keyframes({
  '50%': {
    opacity: '0.5',
  },
})
const sx = stylex.create({
  span: {
    '@layer utilities': {
      display: 'block',
      animationName: pulseAnimation,
      animationDuration: '2s',
      animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)',
      animationIterationCount: 'infinite',
      borderRadius: '0.25rem',
    },
  },
  div: {
    '@layer utilities': {
      position: 'relative',
    },
  },
  span2: {
    '@layer utilities': {
      display: 'block',
      animationName: pulseAnimation,
      animationDuration: '2s',
      animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)',
      animationIterationCount: 'infinite',
      borderRadius: 'calc(infinity * 1px)',
    },
  },
  span3: {
    '@layer utilities': {
      marginTop: 'var(--spacing)',
      display: 'block',
    },
  },
  span4: {
    '@layer utilities': {
      animationName: pulseAnimation,
      animationDuration: '2s',
      animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)',
      animationIterationCount: 'infinite',
      borderRadius: 'calc(infinity * 1px)',
    },
  },
  span5: {
    '@layer utilities': {
      marginTop: 'calc(var(--spacing) * 3)',
      display: 'block',
    },
  },
  article: {
    '@layer utilities': {
      maxWidth: 'none',
    },
  },
  span6: {
    '@layer utilities': {
      marginTop: {
        default: 'calc(var(--spacing) * 2)',
        ':first-child': '0px',
      },
      display: 'block',
      animationName: pulseAnimation,
      animationDuration: '2s',
      animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)',
      animationIterationCount: 'infinite',
      borderRadius: '0.25rem',
    },
  },
})
const block = {
  background: 'var(--surface-2)',
} as const
function Line({width, height = '1em'}: {width: string; height?: string}) {
  return (
    <span
      className={stylex.props(sx.span).className}
      style={{
        ...block,
        width,
        height,
      }}
    />
  )
}
export default function EnPostLoading() {
  return (
    <div
      className={`page-view ${ambientStyles.page_view} ${stylex.props(sx.div).className}`}
      aria-busy="true"
    >
      <div
        className={`post-back ${readingProgressStyles.post_back}`}
        aria-hidden="true"
      >
        <span
          className={`dot ${heroStyles.dot} ${readingProgressStyles.dot}`}
        />
        <span
          style={{
            visibility: 'hidden',
          }}
        >
          BACK TO INDEX
        </span>
      </div>

      <section
        className={`post-masthead ${readingProgressStyles.post_masthead}`}
      >
        <div className="info">
          <div className={`post-eyebrow ${readingProgressStyles.post_eyebrow}`}>
            ◆ ESSAY
          </div>
          <div className={`post-author ${readingProgressStyles.post_author}`}>
            <span
              className={stylex.props(sx.span2).className}
              style={{
                ...block,
                width: 40,
                height: 40,
              }}
              aria-hidden="true"
            />
            <div>
              <Line width="80px" height="14px" />
              <span className={stylex.props(sx.span3).className}>
                <Line width="140px" height="11.5px" />
              </span>
            </div>
          </div>
          <div
            className={`post-tags-row ${readingProgressStyles.post_tags_row}`}
            aria-hidden="true"
          >
            {[64, 84, 52, 72].map((w, i) => (
              <span
                key={i}
                className={stylex.props(sx.span4).className}
                style={{
                  ...block,
                  width: w,
                  height: 22,
                }}
              />
            ))}
          </div>
          <div
            className={`post-stats ${readingProgressStyles.post_stats}`}
            aria-hidden="true"
          >
            <div>
              <b className={readingProgressStyles.element_b}>--</b>
              min read
            </div>
            <div>
              <b className={readingProgressStyles.element_b}>--</b>
              year
            </div>
            <div>
              <b className={readingProgressStyles.element_b}>EN</b>
              translated
            </div>
          </div>
        </div>

        <div
          className={`post-title ${readingProgressStyles.post_title}`}
          aria-hidden="true"
        >
          <Line width="88%" height="1.05em" />
          <span className={stylex.props(sx.span5).className}>
            <Line width="52%" height="1.05em" />
          </span>
        </div>
      </section>

      <div className="post-layout">
        <article
          className={`post-article markdown-body markdown-dark ${stylex.props(sx.article).className}`}
          aria-hidden="true"
        >
          {[
            ['100%', '95%', '60%'],
            ['100%', '88%'],
            ['92%', '96%', '78%', '40%'],
            ['100%', '82%'],
            ['90%', '70%'],
          ].map((widths, i) => (
            <p key={i}>
              {widths.map((w, j) => (
                <span
                  key={j}
                  className={stylex.props(sx.span6).className}
                  style={{
                    ...block,
                    width: w,
                    height: '1em',
                  }}
                />
              ))}
            </p>
          ))}
        </article>
      </div>
    </div>
  )
}
