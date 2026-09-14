// 새 파이프라인(Rust hast + JS 후처리)과 기존 JS 파이프라인의 hast 를 포스트 전체에서
// 그대로 비교한다. 하이라이트까지 JS 로 같으므로 차이가 있으면 안 된다.
//
// 사용법: node scripts/parity.mjs [--verbose] [file...]
import {globSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'

import rehypeKatex from 'rehype-katex'
import prism from 'rehype-prism-plus'
import {unified} from 'unified'

import {renderMarkdown} from '../index.js'
import {
  runJsPipeline,
  splitFrontMatter,
  stripPositions,
} from './js-pipeline.mjs'

const args = process.argv.slice(2)
const verbose = args.includes('--verbose')
const targets = args.filter((a) => !a.startsWith('--'))
const root = resolve(import.meta.dirname, '../../..')
const files = targets.length
  ? targets.map((f) => resolve(f))
  : globSync('apps/blog/posts/**/*.md', {cwd: root})
      .concat(globSync('apps/blog/series/*.md', {cwd: root}))
      .map((f) => resolve(root, f))
      .toSorted()

// apps/blog/src/utils/renderPost.tsx 의 JS 후처리와 같은 구성(sharp 를 쓰는
// imageMetadata 는 두 쪽 모두에서 빼고 비교한다).
const post = unified().use(rehypeKatex).use(prism, {showLineNumbers: true})

function normalize(node) {
  if (Array.isArray(node)) {
    return node
      .filter(
        (n) =>
          !(
            n?.type?.startsWith('mdx') &&
            n.type.endsWith('Expression') &&
            n.value.trim() === ''
          ),
      )
      .map(normalize)
  }
  if (!node || typeof node !== 'object') return node
  // MDX 속성 표현식: Rust 는 리터럴로 평가해 둔다. JS 쪽 값도 같은 모양으로 맞춘다.
  if (node.type === 'mdxJsxAttributeValueExpression') {
    try {
      return JSON.parse(node.value)
    } catch {
      return node.value
    }
  }
  const out = {}
  for (const [k, v] of Object.entries(node)) {
    if (k === 'position') continue
    if (k === 'data' && node.type?.startsWith('mdx')) continue
    out[k] = normalize(v)
  }
  return out
}

function firstDiff(a, b, path = '$') {
  if (a === b) return null
  if (
    typeof a !== typeof b ||
    a === null ||
    b === null ||
    Array.isArray(a) !== Array.isArray(b)
  ) {
    return {path, a, b}
  }
  if (Array.isArray(a)) {
    if (a.length !== b.length) {
      const i = a.findIndex(
        (x, j) => JSON.stringify(x) !== JSON.stringify(b[j]),
      )
      return {
        path: `${path}.length(${a.length} vs ${b.length}) first mismatch at [${i}]`,
        a: a[i],
        b: b[i],
      }
    }
    for (let i = 0; i < a.length; i++) {
      const d = firstDiff(a[i], b[i], `${path}[${i}]`)
      if (d) return d
    }
    return null
  }
  if (typeof a === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = firstDiff(a[k], b[k], `${path}.${k}`)
      if (d) return d
    }
    return null
  }
  return {path, a, b}
}

let pass = 0
const failures = []
const t0 = performance.now()
let rustMs = 0
for (const file of files) {
  const body = splitFrontMatter(readFileSync(file, 'utf8'))
  const js = await runJsPipeline(body, file)
  if (js.error) {
    failures.push({file, diff: {path: 'js error', b: js.error}})
    continue
  }
  let now
  const r0 = performance.now()
  try {
    now = await post.run(renderMarkdown(body))
  } catch (error) {
    rustMs += performance.now() - r0
    failures.push({file, diff: {path: 'new pipeline error', a: String(error)}})
    continue
  }
  rustMs += performance.now() - r0

  const diff = firstDiff(normalize(now), normalize(stripPositions(js.hast2)))
  if (diff) {
    failures.push({file, diff})
  } else {
    pass++
  }
}
const cut = verbose ? 2000 : 300
for (const {file, diff} of failures) {
  console.log(
    `FAIL ${file.replace(root + '/', '')}\n  at ${diff.path}\n  new: ${JSON.stringify(diff.a)?.slice(0, cut)}\n  old: ${JSON.stringify(diff.b)?.slice(0, cut)}`,
  )
}
console.log(
  `\n${pass} pass, ${failures.length} fail (${files.length} files, new ${Math.round(rustMs)}ms, total ${Math.round(performance.now() - t0)}ms)`,
)
process.exit(failures.length ? 1 : 0)
