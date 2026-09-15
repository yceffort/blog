import {nodeTypes} from '@mdx-js/mdx'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeKatex from 'rehype-katex'
import prism from 'rehype-prism-plus'
import rehypeSlug from 'rehype-slug'
import remarkCjkFriendly from 'remark-cjk-friendly'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import remarkToc from 'remark-toc'
import {unified} from 'unified'
import {VFile} from 'vfile'

import {extractCodeFilename} from './js-pipeline.mjs'

// @mdx-js/mdx 3.1.1의 JSX 문단 처리도 그대로 사용한다. 벤치 시작 전에
// 기존 createProcessor의 HAST와 전수 대조하므로 내부 구현 변경도 감지된다.
const {remarkMarkAndUnravel} = await import(
  new URL(
    './lib/plugin/remark-mark-and-unravel.js',
    import.meta.resolve('@mdx-js/mdx'),
  ).href
)

export function createJsHastPipeline() {
  const pipeline = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkMarkAndUnravel)
    .use(remarkMath)
    .use(remarkToc)
    .use(remarkGfm)
    .use(remarkCjkFriendly)
    .use(remarkRehype, {allowDangerousHtml: true, passThrough: nodeTypes})
    .use(rehypeKatex)
    .use(rehypeSlug)
    .use(extractCodeFilename)
    .use(prism, {showLineNumbers: true})
    .use(rehypeAutolinkHeadings)
    .freeze()

  return (body) => {
    const file = new VFile({value: body, path: 'post.md'})
    return pipeline.run(pipeline.parse(file), file)
  }
}
