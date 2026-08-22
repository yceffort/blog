#!/usr/bin/env node

/**
 * research 슬라이드에서 의도대로 렌더링되지 않는 강조를 잡는 lint 스크립트
 *
 * Usage:
 *   node scripts/check-slides-markdown.mjs [file...]   인자가 없으면 research 전체
 *
 * 실제 서비스와 같은 구성(marp-core + markdown-it-cjk-friendly)으로 렌더한 뒤,
 * 결과 HTML의 텍스트에 리터럴 ** 나 ~~ 가 남아 있으면 구분자 짝이 맞지 않아
 * 슬라이드에 그대로 노출된다는 뜻이다. 한글 조사 인접 케이스는 cjk-friendly가
 * 구제하므로 여기까지 걸리는 것은 진짜 오타다.
 * 파서 구성이 바뀌면 src/lib/marp.ts와 맞출 것.
 */

import {readdirSync, readFileSync} from 'node:fs'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {Marp} from '@marp-team/marp-core'
import markdownItCjkFriendly from 'markdown-it-cjk-friendly'

const RESEARCH_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../research',
)

function renderText(markdown) {
  const marp = new Marp({container: false, script: false, printable: false})
  marp.use(markdownItCjkFriendly)
  const {html} = marp.render(markdown, {htmlAsArray: true})
  // 코드 안쪽의 ** 는 정상이므로 검사에서 뺀다.
  return html
    .join('\n')
    .replace(/<pre[\s\S]*?<\/pre>/g, '')
    .replace(/<code[\s\S]*?<\/code>/g, '')
}

function checkFile(file) {
  const source = readFileSync(file, 'utf8')
  const sourceLines = source.split('\n')
  const found = []

  for (const match of renderText(source).matchAll(
    /[^<>\n]*(\*\*|~~)[^<>\n]*/g,
  )) {
    const text = match[0]
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim()
    if (!text) {
      continue
    }
    // 깨진 구분자부터 시작하는 조각으로 원본 줄을 찾는다. 못 찾으면 1행으로 보고한다.
    const needle = text.slice(text.indexOf(match[1])).slice(0, 20)
    const line = sourceLines.findIndex((l) => l.includes(needle)) + 1 || 1
    found.push({line, text})
  }

  return found
}

const targets = process.argv
  .slice(2)
  .map((file) => resolve(file))
  .filter((file) => file.startsWith(RESEARCH_DIR) && file.endsWith('.md'))
const files = process.argv.slice(2).length
  ? targets
  : readdirSync(RESEARCH_DIR)
      .filter((name) => name.endsWith('.md'))
      .map((name) => join(RESEARCH_DIR, name))

let errorCount = 0

for (const file of files) {
  for (const {line, text} of checkFile(file)) {
    errorCount += 1
    console.error(
      `${file}:${line} 파싱되지 않은 강조: "${text.slice(0, 60)}" (** 또는 ~~ 짝이 맞는지 확인할 것)`,
    )
  }
}

process.exit(errorCount > 0 ? 1 : 0)
