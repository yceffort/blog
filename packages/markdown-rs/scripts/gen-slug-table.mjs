// github-slugger 2.0.0 의 제거 문자 정규식을 그대로 코드포인트 범위 테이블로 뽑아
// src/slug_table.rs 를 생성한다. (단일 사실의 원천: node_modules 의 regex.js)
import {writeFileSync} from 'node:fs'

import {regex} from 'github-slugger/regex.js'

const plain = new RegExp(regex.source, regex.flags.replace('g', ''))
const ranges = []
let start = -1
for (let cp = 0; cp <= 0x10ffff; cp++) {
  if (cp >= 0xd800 && cp <= 0xdfff) continue
  const removed = plain.test(String.fromCodePoint(cp))
  if (removed && start < 0) start = cp
  if (!removed && start >= 0) {
    ranges.push([start, cp - 1])
    start = -1
  }
}
if (start >= 0) ranges.push([start, 0x10ffff])
const body = ranges
  .map(([a, b]) => `    (0x${a.toString(16)}, 0x${b.toString(16)}),`)
  .join('\n')
writeFileSync(
  new URL('../src/slug_table.rs', import.meta.url),
  `//! github-slugger 2.0.0 의 regex.js 에서 생성. \`scripts/gen-slug-table.mjs\` 로 재생성한다.\n//! 슬러그에서 제거되는 코드포인트의 닫힌 구간 목록 (오름차순).\n\npub static REMOVED: [(u32, u32); ${ranges.length}] = [\n${body}\n];\n`,
)
console.log('ranges', ranges.length)
