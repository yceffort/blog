#!/usr/bin/env node

/**
 * 본문이 바뀐 포스트의 frontmatter `updated`를 지금 시각(KST)으로 갱신하는 pre-commit 훅
 *
 * Usage:
 *   node scripts/stamp-post-updated.mjs [staged-file...]
 *
 * - HEAD에서 이미 발행된(published: true) 포스트만 대상이다. 새 파일과 초안은 건너뛴다.
 * - 본문의 글자와 숫자가 바뀌어야 수정으로 본다. frontmatter, 공백, 마크다운 기호만 바뀐 경우는 무시한다.
 * - 6편 이상을 한꺼번에 고친 커밋은 일괄 수정으로 보고 건너뛴다. 한국어와 영문은 한 편으로 센다.
 */

import {execFileSync} from 'node:child_process'
import {readFileSync, writeFileSync} from 'node:fs'

const BULK_LIMIT = 5
const FM_RE = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/

function show(rev) {
  try {
    return execFileSync('git', ['show', rev], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    return null
  }
}

const frontMatter = (text) => text.match(FM_RE)?.[0] ?? ''
const letters = (text) => text.replace(FM_RE, '').replace(/[^\p{L}\p{N}]/gu, '')

const changed = process.argv.slice(2).filter((file) => {
  if (!/apps\/blog\/posts\/.+\.mdx?$/.test(file)) return false
  const head = show(`HEAD:${file}`)
  if (!head || !/^published:\s*true\s*$/m.test(frontMatter(head))) return false
  const staged = show(`:${file}`)
  return staged != null && letters(head) !== letters(staged)
})

const posts = new Set(changed.map((f) => f.replace(/\.en(\.mdx?)$/, '$1')))
if (posts.size > BULK_LIMIT) {
  console.log(
    `포스트 ${posts.size}편의 본문을 한꺼번에 고친 커밋이라 updated를 갱신하지 않습니다.`,
  )
  process.exit(0)
}

const now = new Date(Date.now() + 9 * 3600e3)
  .toISOString()
  .slice(0, 19)
  .replace('T', ' ')

for (const file of changed) {
  const text = readFileSync(file, 'utf8')
  const fm = frontMatter(text)
  const stamped = /^updated:.*$/m.test(fm)
    ? fm.replace(/^updated:.*$/m, `updated: ${now}`)
    : fm.replace(/^(date:.*)$/m, `$1\nupdated: ${now}`)
  writeFileSync(file, stamped + text.slice(fm.length))
}
