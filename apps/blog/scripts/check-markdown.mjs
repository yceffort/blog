#!/usr/bin/env node

/**
 * 포스트에서 의도대로 렌더링되지 않는 마크다운을 잡는 lint 스크립트
 *
 * Usage:
 *   node scripts/check-markdown.mjs [file...]
 *
 * 실제 렌더링 파이프라인(remark-gfm + remark-cjk-friendly)과 같은 파서로
 * AST를 만들어 두 가지를 검사한다.
 *
 * 1. 의도치 않은 취소선: "0~~9", "10~~30개"처럼 범위 표기로 쓴 물결이
 *    취소선(delete)으로 파싱되는 실수. 여는 ~~ 바로 앞과 닫는 ~~ 바로
 *    뒤가 모두 공백이 아닌 delete 노드(단어 사이에 낀 물결)만 오류로
 *    본다. 의도적인 취소선(~~농담~~)은 구분자 밖이 공백이라 걸리지
 *    않는다. 범위 표기가 필요하면 \~ 로 이스케이프한다.
 *
 * 2. 깨진 볼드·취소선 잔해: 파싱 후에도 text 노드에 리터럴 ** 나 ~~ 가
 *    남아 있으면 구분자 짝이 맞지 않아 본문에 그대로 노출된다는 뜻이다.
 *    한글 조사 인접 케이스는 remark-cjk-friendly가 렌더 단계에서
 *    구제하므로, 여기까지 걸리는 것은 진짜 오타다. \*\* 처럼 이스케이프한
 *    리터럴은 소스를 확인해 제외한다.
 */

import {readdirSync, readFileSync, statSync} from 'node:fs'
import {join, dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import remarkCjkFriendly from 'remark-cjk-friendly'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import {unified} from 'unified'

const POSTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../posts')

function* walkFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      yield* walkFiles(path)
    } else if (name.endsWith('.md')) {
      yield path
    }
  }
}

function* walkNodes(node) {
  if (node.type === 'code' || node.type === 'inlineCode') {
    return
  }
  yield node
  for (const child of node.children ?? []) {
    yield* walkNodes(child)
  }
}

function textOf(node) {
  return node.value ?? (node.children ?? []).map(textOf).join('')
}

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkCjkFriendly)

function checkFile(file) {
  const raw = readFileSync(file, 'utf8')
  if (!raw.includes('~') && !raw.includes('**')) {
    return []
  }

  const frontmatter = raw.match(/^---\n[\s\S]*?\n---\n/)
  const body = frontmatter ? raw.slice(frontmatter[0].length) : raw
  const lineOffset = frontmatter ? frontmatter[0].split('\n').length - 1 : 0

  const errors = []
  for (const node of walkNodes(parser.parse(body))) {
    if (!node.position) {
      continue
    }
    const line = node.position.start.line + lineOffset

    if (node.type === 'delete') {
      const before = body[node.position.start.offset - 1] ?? ' '
      const after = body[node.position.end.offset] ?? ' '
      if (!/\s/.test(before) && !/\s/.test(after)) {
        errors.push({
          line,
          message: `의도치 않은 취소선: "${textOf(node).slice(0, 60).replace(/\n/g, ' ')}" (범위 표기라면 \\~ 로 이스케이프할 것)`,
        })
      }
    }

    if (
      node.type === 'text' &&
      (node.value.includes('**') || node.value.includes('~~'))
    ) {
      const source = body.slice(
        node.position.start.offset,
        node.position.end.offset,
      )
      const leftover = source.match(/(?<!\\)(\*\*|~~)/)
      if (leftover) {
        errors.push({
          line,
          message: `파싱되지 않은 강조: "${node.value.slice(0, 60).replace(/\n/g, ' ')}" (${leftover[1]} 짝이 맞는지 확인할 것)`,
        })
      }
    }
  }
  return errors
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2).filter((f) => f.endsWith('.md'))
  : [...walkFiles(POSTS_DIR)]

let failed = false
for (const file of files) {
  for (const {line, message} of checkFile(file)) {
    failed = true
    console.error(`${file}:${line} ${message}`)
  }
}

process.exit(failed ? 1 : 0)
