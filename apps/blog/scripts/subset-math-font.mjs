#!/usr/bin/env node

/**
 * 수식 글꼴(Libertinus Math)을 글에서 실제로 쓰는 글리프만 남긴 서브셋으로 다시 만든다.
 *
 * Usage:
 *   node scripts/subset-math-font.mjs
 *
 * posts 와 series 를 전부 렌더해 <math> 안의 코드포인트를 모으고 public/fonts/math/unicodes.txt 에
 * 적은 뒤, fonts/ 의 원본 글꼴에서 그 글리프만 남긴 woff2 를 public/fonts/math/ 에 쓴다.
 * 새 글이 서브셋에 없는 글자를 쓰면 check-markdown.mjs 가 경고하므로 그때 다시 돌린다.
 *
 * fontTools 가 필요하다: pip install fonttools brotli (PYTHON 환경 변수로 인터프리터를 바꿀 수 있다)
 */

import {execFileSync} from 'node:child_process'
import {readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {renderMarkdown} from '@yceffort/markdown-rs'
import frontMatter from 'front-matter'

import {
  collectMathCodepoints,
  formatUnicode,
  UNICODES_FILE,
} from './math-glyphs.mjs'

const BLOG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_FONT = join(BLOG_DIR, 'fonts/LibertinusMath-Regular.woff2')
const OUTPUT_FONT = join(
  BLOG_DIR,
  'public/fonts/math/LibertinusMath-Regular.woff2',
)

function* walkFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      yield* walkFiles(path)
    } else if (/\.mdx?$/.test(name)) {
      yield path
    }
  }
}

// 바인딩이 최초 호출 시 작업 디렉터리의 public 을 WASI 에 연결한다.
process.chdir(BLOG_DIR)

const codepoints = new Set()
for (const file of [
  ...walkFiles(join(BLOG_DIR, 'posts')),
  ...walkFiles(join(BLOG_DIR, 'series')),
]) {
  const {body} = frontMatter(readFileSync(file, 'utf8'))
  const found = collectMathCodepoints(renderMarkdown(body, file))
  for (const codepoint of found) codepoints.add(codepoint)
}

const sorted = [...codepoints].toSorted((a, b) => a - b)
writeFileSync(
  UNICODES_FILE,
  [
    '# subset-math-font.mjs 가 만든다. 글의 <math> 텍스트와 브라우저의 italic mapping 결과다.',
    ...sorted.map((codepoint) => formatUnicode(codepoint)),
    '',
  ].join('\n'),
)
console.log(`코드포인트 ${sorted.length}개`)

// 서브셋과 검증은 fontTools 로 한다. MATH 테이블(근호와 괄호를 늘리는 변형 글리프, 첨자 배치 상수)이
// 빠지면 분수와 근호가 깨지므로 서브셋 뒤에 남았는지 원본과 대조한다.
const python = String.raw`
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

source, output, unicodes = sys.argv[1:4]
subset.main([
    source,
    f"--unicodes-file={unicodes}",
    f"--output-file={output}",
    "--flavor=woff2",
    "--layout-features=*",  # 기본값에는 첨자용 ssty 가 없다
    "--name-IDs=*",  # OFL 고지(저작권, 라이선스 name 레코드)를 그대로 둔다
    "--notdef-outline",
])

before = TTFont(source)
after = TTFont(output)
requested = {
    int(line.split("#")[0].strip()[2:], 16)
    for line in open(unicodes)
    if line.split("#")[0].strip()
}
missing = sorted(requested - set(after.getBestCmap()))
print(f"글리프 {before['maxp'].numGlyphs} -> {after['maxp'].numGlyphs}")
print("원본에도 없어 시스템 글꼴로 떨어지는 글자:", " ".join(f"U+{c:04X}" for c in missing) or "없음")

assert "MATH" in after, "MATH 테이블이 사라졌다"
def variants(font):
    table = font["MATH"].table.MathVariants
    names = set(font.getReverseGlyphMap())
    result = {}
    for coverage, constructions in (
        (table.VertGlyphCoverage, table.VertGlyphConstruction),
        (table.HorizGlyphCoverage, table.HorizGlyphConstruction),
    ):
        for glyph, construction in zip(coverage.glyphs, constructions):
            if glyph in names:
                parts = construction.GlyphAssembly.PartRecords if construction.GlyphAssembly else []
                result[glyph] = (
                    [r.VariantGlyph for r in construction.MathGlyphVariantRecord],
                    [p.glyph for p in parts],
                )
    return result

kept = set(after.getGlyphOrder())
lost = []
for glyph, (variant_glyphs, parts) in variants(before).items():
    if glyph not in kept:
        continue
    for name in variant_glyphs + parts:
        if name not in kept:
            lost.append((glyph, name))
assert not lost, f"늘어나는 글리프의 변형이 빠졌다: {lost[:5]}"
stretchy = sorted(g for g in variants(after) if g in kept)
print(f"늘어나는 글리프 {len(stretchy)}개 유지: {' '.join(stretchy)}")
assert after["MATH"].table.MathConstants, "MathConstants 가 없다"
`

execFileSync(
  process.env.PYTHON ?? 'python3',
  ['-', SOURCE_FONT, OUTPUT_FONT, UNICODES_FILE],
  {input: python, stdio: ['pipe', 'inherit', 'inherit']},
)
console.log(
  `${OUTPUT_FONT}: ${statSync(SOURCE_FONT).size.toLocaleString()} -> ${statSync(OUTPUT_FONT).size.toLocaleString()} bytes`,
)
