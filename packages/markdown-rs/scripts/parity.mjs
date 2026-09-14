// 사용법: node scripts/parity.mjs [--verbose] [file...]
import {globSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {renderMarkdown} from '../index.js'
import {
  normalizeHast,
  runJsPipeline,
  splitFrontMatter,
  stripPositions,
} from './js-pipeline.mjs'
import {normalizeRendered} from './normalize-rendered.mjs'

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

// 렌더 경로(renderPost.tsx)와 같은 조건으로 맞춘다. 바인딩은 최초 호출 시
// 작업 디렉터리의 public 을 WASI 에 연결하므로 그 전에 옮겨야 한다.
const blogRoot = resolve(root, 'apps/blog')
const publicDir = resolve(blogRoot, 'public')
process.chdir(blogRoot)

// 코드의 원문과 줄 메타데이터, 수식의 TeX와 표시 모드, 이미지 경로와 크기,
// 나머지 HAST를 비교한다. 토큰 색상과 수식 내부 마크업, React 렌더는 별도 검증 대상이다.
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
  const js = await runJsPipeline(body, file, {publicDir})
  if (js.error) {
    failures.push({file, diff: {path: 'js error', b: js.error}})
    continue
  }
  let now
  const r0 = performance.now()
  try {
    now = renderMarkdown(body, file)
  } catch (error) {
    rustMs += performance.now() - r0
    failures.push({file, diff: {path: 'new pipeline error', a: String(error)}})
    continue
  }
  rustMs += performance.now() - r0

  const diff = firstDiff(
    normalizeRendered(normalizeHast(now)),
    normalizeRendered(normalizeHast(stripPositions(js.hast2))),
  )
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
