#!/usr/bin/env node

/**
 * 한국어 포스트가 수정될 때 대응 영문 번역(.en.md)이 함께 커밋되는지 검사하는
 * pre-commit 가드
 *
 * Usage:
 *   node scripts/check-translation-sync.mjs [staged-file...]
 *
 * 스테이징된 한국어 포스트(apps/blog/posts/**의 .md, .en.md 제외)에 대해,
 * 대응 .en.md 파일이 디스크에 존재하는데 함께 스테이징되지 않았으면 exit 1.
 * .en.md가 아예 없는 글(번역 전 초안)은 검사 대상이 아니다.
 */

import {existsSync} from 'node:fs'

const staged = process.argv.slice(2)
const stagedSet = new Set(staged)
const outOfSync = []

for (const file of staged) {
  if (!file.includes('apps/blog/posts/')) continue
  if (!file.endsWith('.md') || file.endsWith('.en.md')) continue
  const en = file.replace(/\.md$/, '.en.md')
  if (existsSync(en) && !stagedSet.has(en)) outOfSync.push(en)
}

if (outOfSync.length > 0) {
  console.error('한국어 포스트가 수정되었지만 대응 영문 번역이 함께 스테이징되지 않았습니다:')
  for (const en of outOfSync) console.error(`  - ${en}`)
  console.error('번역을 동기화해 함께 커밋하거나, 의도된 커밋이면 --no-verify로 건너뛰세요.')
  process.exit(1)
}
