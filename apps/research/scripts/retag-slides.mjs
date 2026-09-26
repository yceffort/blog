/**
 * data/tag-vocabulary.json 의 태그 어휘로 덱 태그를 다시 붙인다.
 *
 * Usage:
 *   node scripts/retag-slides.mjs [<deck-file-path|slug>...] [--apply]
 *
 * 인자가 없으면 research/ 의 덱 전체를 판정한다. --apply 가 없으면 출력만 하고,
 * 있으면 frontmatter에 기록한다. 덱마다 어휘 전체를 Noul 질문으로 한 번에 묻고,
 * 확률 THRESHOLD 이상 태그를 높은 순으로 MAX_TAGS 개까지 붙인다. 넘는 게 없으면 최고 1개.
 * 키: TYPESAFE_API_KEY 환경 변수 또는 .env.local
 */
import {existsSync, readFileSync, readdirSync, writeFileSync} from 'node:fs'
import path from 'node:path'

import matter from 'gray-matter'

const ROOT = path.resolve(import.meta.dirname, '..')
const DECK_ROOT = path.join(ROOT, 'research')
const VOCAB = JSON.parse(
  readFileSync(path.join(ROOT, 'data/tag-vocabulary.json'), 'utf8'),
).tags

const THRESHOLD = 0.5
const MAX_TAGS = 5
const CONCURRENCY = 8

const envFile = path.join(ROOT, '.env.local')
const API_KEY =
  process.env.TYPESAFE_API_KEY ??
  (existsSync(envFile)
    ? readFileSync(envFile, 'utf8').match(/^TYPESAFE_API_KEY=(\S+)/m)?.[1]
    : undefined)
if (!API_KEY) {
  throw new Error('TYPESAFE_API_KEY 가 없습니다')
}

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const only = args
  .filter((a) => !a.startsWith('--'))
  .map((a) => path.basename(a, '.md'))

const decks = readdirSync(DECK_ROOT)
  .filter((f) => f.endsWith('.md'))
  .map((f) => {
    const file = path.join(DECK_ROOT, f)
    const {data, content} = matter(readFileSync(file, 'utf8'))
    // 발표자 노트(주석)와 코드는 빼고 슬라이드 제목과 본문만 넘긴다
    const body = content
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/```[\s\S]*?```/g, '')
    const headings = [...body.matchAll(/^#{1,3} (.+)$/gm)].map((m) => m[1])
    const text = body
      .replace(/<[^>]+>/g, '')
      .replace(/^---$/gm, '')
      .replace(/\s+/g, ' ')
    return {
      file,
      slug: path.basename(f, '.md'),
      oldTags: data.tags ?? [],
      state: {
        title: data.title ?? '',
        description: data.description ?? '',
        headings: headings.slice(0, 60),
        opening: text.slice(0, 1500),
      },
    }
  })
  .filter((d) => only.length === 0 || only.includes(d.slug))

const questions = Object.fromEntries(
  Object.entries(VOCAB).map(([tag, meaning]) => [
    tag,
    {
      type: 'noul',
      // 블로그와 같은 이유로 정의문 인용 대신 "이 태그 아래 둘 덱인가"로 묻는다
      instructions: `Should this slide deck be listed under the tag "${tag}"? The tag is for decks about ${meaning}.`,
      criteria: {
        true: 'This topic is a main purpose of the deck.',
        false:
          'The topic is incidental: only the language or tool the work happens to use, background, or a passing mention.',
      },
    },
  ]),
)

async function judge(deck) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'jev-latest',
        state: deck.state,
        questions,
      }),
    })
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt))
      continue
    }
    if (!res.ok) {
      throw new Error(`${res.status} ${await res.text()}`)
    }
    const json = await res.json()
    deck.scores = Object.fromEntries(
      Object.entries(json.answers).map(([t, a]) => [t, a.noul]),
    )
    return json.usage.input_tokens
  }
  throw new Error(`재시도 초과: ${deck.slug}`)
}

let inputTokens = 0
let next = 0
await Promise.all(
  Array.from({length: CONCURRENCY}, async () => {
    while (next < decks.length) {
      inputTokens += await judge(decks[next++])
    }
  }),
)

function writeTags(file, tags) {
  const raw = readFileSync(file, 'utf8')
  const block = /^tags:[^\n]*\n(?:[ \t]+- .*\n)*/m
  if (!block.test(raw)) {
    throw new Error(`tags 필드를 찾지 못함: ${file}`)
  }
  writeFileSync(
    file,
    raw.replace(block, `tags:\n${tags.map((t) => `  - ${t}\n`).join('')}`),
  )
}

for (const deck of decks) {
  const ranked = Object.entries(deck.scores).toSorted((a, b) => b[1] - a[1])
  const passed = ranked.filter(([, p]) => p >= THRESHOLD).slice(0, MAX_TAGS)
  const tags = (passed.length > 0 ? passed : ranked.slice(0, 1)).map(([t]) => t)
  const shown = ranked
    .slice(0, 6)
    .map(([t, p]) => `${t} ${p.toFixed(2)}`)
    .join(', ')
  console.log(
    `${deck.slug}\n  기존: ${deck.oldTags.join(', ')}\n  새:   ${tags.join(', ')}\n  상위: ${shown}`,
  )
  if (apply) {
    writeTags(deck.file, tags)
  }
}
console.log(
  `\n덱 ${decks.length}개, 입력 토큰 ${inputTokens} (약 $${((inputTokens * 0.042) / 1e6).toFixed(4)})`,
)
