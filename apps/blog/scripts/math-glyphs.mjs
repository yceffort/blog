// 수식 글꼴 서브셋이 덮어야 하는 코드포인트를 hast 트리에서 뽑는다.
// subset-math-font.mjs 가 서브셋을 만들 때와 check-markdown.mjs 가 새 글을 검사할 때
// 같은 규칙을 써야 하므로 한곳에 둔다.

import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

export const UNICODES_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  '../public/fonts/math/unicodes.txt',
)

// 글에 없어도 브라우저가 수식을 그릴 때 쓰는 글자.
// U+221A: msqrt 의 근호는 텍스트 노드 없이 이 글리프를 늘려 그린다.
const ALWAYS = [0x0020, 0x221a]

// 글자 하나짜리 <mi> 는 mathvariant="normal" 이 없으면 브라우저가 수학 이탤릭 코드포인트로
// 바꿔 그린다(MathML Core "italic mapping"). 그리는 것은 바뀐 글자지만 Chromium 은 원래 글자의
// 글리프도 상자 크기 계산에 쓴다. 원래 글자가 글꼴에 없으면 시스템 글꼴로 재서 <mi> 높이가 달라지므로
// 둘 다 남긴다(전체 글꼴과 대조한 실측으로 확인했다).
const ITALIC_SINGLES = {
  0x0068: 0x210e, // h (U+1D455 는 미배정)
  0x0131: 0x1d6a4, // ı
  0x0237: 0x1d6a5, // ȷ
  0x03d1: 0x1d717, // ϑ
  0x03d5: 0x1d719, // ϕ
  0x03d6: 0x1d71b, // ϖ
  0x03f0: 0x1d718, // ϰ
  0x03f1: 0x1d71a, // ϱ
  0x03f4: 0x1d6f3, // ϴ
  0x03f5: 0x1d716, // ϵ
  0x2202: 0x1d715, // ∂
  0x2207: 0x1d6fb, // ∇
}

function italicMapping(codepoint) {
  if (ITALIC_SINGLES[codepoint]) return ITALIC_SINGLES[codepoint]
  if (codepoint >= 0x41 && codepoint <= 0x5a) return 0x1d434 + codepoint - 0x41
  if (codepoint >= 0x61 && codepoint <= 0x7a) return 0x1d44e + codepoint - 0x61
  if (codepoint >= 0x391 && codepoint <= 0x3a9)
    return 0x1d6e2 + codepoint - 0x391
  if (codepoint >= 0x3b1 && codepoint <= 0x3c9)
    return 0x1d6fc + codepoint - 0x3b1
  return codepoint
}

function textOf(node) {
  return node.type === 'text'
    ? node.value
    : (node.children ?? []).map(textOf).join('')
}

/**
 * 트리의 <math> 아래 텍스트가 필요로 하는 코드포인트. annotation(TeX 원문)과 공백은 뺀다.
 * @param {import('hast').Node} tree
 * @returns {Set<number>}
 */
export function collectMathCodepoints(tree) {
  const codepoints = new Set(ALWAYS)
  const visit = (node, inMath) => {
    if (node.type === 'element') {
      if (node.tagName === 'annotation') return
      if (node.tagName === 'math') inMath = true
      if (inMath && node.tagName === 'mi') {
        const chars = [...textOf(node)]
        if (chars.length === 1 && node.properties?.mathvariant !== 'normal') {
          codepoints.add(italicMapping(chars[0].codePointAt(0)))
        }
      }
    }
    if (inMath && node.type === 'text') {
      for (const char of node.value) {
        if (!/\s/.test(char)) codepoints.add(char.codePointAt(0))
      }
    }
    for (const child of node.children ?? []) visit(child, inMath)
  }
  visit(tree, false)
  return codepoints
}

export function formatUnicode(codepoint) {
  return `U+${codepoint.toString(16).toUpperCase().padStart(4, '0')}`
}

/** unicodes.txt 에 적힌 코드포인트. 파일이 없으면 null (서브셋을 만든 적이 없다). */
export function readSubsetCodepoints() {
  let text
  try {
    text = readFileSync(UNICODES_FILE, 'utf8')
  } catch {
    return null
  }
  return new Set(
    text
      .split('\n')
      .map((line) => line.replace(/#.*/, '').trim())
      .filter(Boolean)
      .map((line) => Number.parseInt(line.replace(/^U\+/, ''), 16)),
  )
}
