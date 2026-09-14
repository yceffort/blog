// 기존 파이프라인과 새 파이프라인(Rust hast + JS 후처리)의 처리 시간을 비교한다.
import {globSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'

import rehypeKatex from 'rehype-katex'
import prism from 'rehype-prism-plus'
import {unified} from 'unified'

import {renderMarkdown} from '../index.js'
import {runJsPipeline, splitFrontMatter} from './js-pipeline.mjs'

const root = resolve(import.meta.dirname, '../../..')
const bodies = globSync('apps/blog/posts/**/*.md', {cwd: root}).map((f) =>
  splitFrontMatter(readFileSync(resolve(root, f), 'utf8')),
)

const post = unified().use(rehypeKatex).use(prism, {showLineNumbers: true})

async function time(label, fn) {
  const start = performance.now()
  for (const body of bodies) await fn(body)
  const ms = performance.now() - start
  console.log(`${label.padEnd(30)} ${Math.round(ms).toString().padStart(6)} ms`)
  return ms
}

for (const body of bodies.slice(0, 20)) {
  await runJsPipeline(body)
  await post.run(renderMarkdown(body))
}

const before = await time('기존 (remark/rehype)', (b) => runJsPipeline(b))
const after = await time('새 (Rust hast + katex/prism)', (b) =>
  post.run(renderMarkdown(b)),
)
await time('  그중 Rust 파싱만', (b) => renderMarkdown(b))
console.log(`\n${bodies.length}개 포스트, ${(before / after).toFixed(2)}배`)
