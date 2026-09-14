import * as stylex from '@stylexjs/stylex'

import {renderPost} from '@/utils/renderPost'

import '@/styles/reading.css'
const sx = stylex.create({
  article: {
    '@layer utilities': {
      maxWidth: 'none',
    },
  },
})
export async function PostArticle({body, path}: {body: string; path: string}) {
  const content = await renderPost(body, path)
  return (
    <div className="post-layout">
      <article
        className={`post-article markdown-body markdown-dark ${stylex.props(sx.article).className}`}
      >
        {content}
      </article>
    </div>
  )
}
