import * as stylex from '@stylexjs/stylex'
import {MDXRemote} from 'next-mdx-remote-client/rsc'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeKatex from 'rehype-katex'
import prism from 'rehype-prism-plus'
import rehypeSlug from 'rehype-slug'
import remarkCjkFriendly from 'remark-cjk-friendly'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkToc from 'remark-toc'

import MDXComponents from '@/components/post/MDXComponents'
import imageMetadataPlugin from '@/utils/imageMetadata'
import {extractCodeFilename, parseCodeSnippet} from '@/utils/Markdown'
const sx = stylex.create({
  article: {
    '@layer utilities': {
      maxWidth: 'none',
    },
  },
})
export function PostArticle({body, path}: {body: string; path: string}) {
  return (
    <div className="post-layout">
      <article
        className={`post-article markdown-body markdown-dark ${stylex.props(sx.article).className}`}
      >
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
                [
                  prism,
                  {
                    showLineNumbers: true,
                  },
                ],
                parseCodeSnippet,
                rehypeAutolinkHeadings,
                [
                  imageMetadataPlugin,
                  {
                    path,
                  },
                ],
              ],
            },
          }}
        />
      </article>
    </div>
  )
}
