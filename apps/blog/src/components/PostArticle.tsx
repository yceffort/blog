import {renderPost} from '@/utils/renderPost'

export async function PostArticle({body, path}: {body: string; path: string}) {
  const content = await renderPost(body, path)
  return (
    <div className="post-layout">
      <article className="post-article prose max-w-none dark:prose-dark">
        {content}
      </article>
    </div>
  )
}
