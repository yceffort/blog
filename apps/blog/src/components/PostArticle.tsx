import {MDXRemote} from 'next-mdx-remote-client/rsc'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeKatex from 'rehype-katex'
import prism from 'rehype-prism-plus'
import rehypeSlug from 'rehype-slug'
import remarkCjkFriendly from 'remark-cjk-friendly'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkToc from 'remark-toc'

import MDXComponents from '@/components/MDXComponents'
import imageMetadataPlugin from '@/utils/imageMetadata'
import {extractCodeFilename, parseCodeSnippet} from '@/utils/Markdown'

export function PostArticle({body, path}: {body: string; path: string}) {
  return (
    <div className="post-layout">
      <article className="post-article prose max-w-none dark:prose-dark">
        <MDXRemote
          source={body}
          components={MDXComponents}
          options={{
            mdxOptions: {
              remarkPlugins: [
                remarkMath,
                remarkToc,
                remarkGfm,
                remarkCjkFriendly,
              ],
              rehypePlugins: [
                rehypeKatex,
                rehypeSlug,
                extractCodeFilename,
                [prism, {showLineNumbers: true}],
                parseCodeSnippet,
                rehypeAutolinkHeadings,
                [imageMetadataPlugin, {path}],
              ],
            },
          }}
        />
      </article>
    </div>
  )
}
