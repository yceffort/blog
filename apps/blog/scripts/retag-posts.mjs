/**
 * data/tag-vocabulary.json 의 태그 어휘로 글 태그를 다시 붙인다.
 *
 * Usage:
 *   node scripts/retag-posts.mjs <post-file-path|slug>... [--apply]  지정한 글을 다시 판정 (초안 포함)
 *   node scripts/retag-posts.mjs --all [--apply]                      published 글 전체 (캐시 사용)
 *
 * --apply 가 없으면 출력만 하고, 있으면 한국어/영어 frontmatter에 기록한다.
 * 글마다 어휘 전체를 Noul 질문으로 한 번에 묻고, 확률 THRESHOLD 이상 태그를
 * 높은 순으로 MAX_TAGS 개까지 붙인다. 넘는 게 없으면 최고 1개. 영어판은 한국어판 태그를 따른다.
 * 판정 결과는 data/tag-scores.json 에 캐시한다. 키: .env.local의 TYPESAFE_API_KEY
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import path from 'node:path'

import frontMatter from 'front-matter'
import {globSync} from 'glob'

const ROOT = path.resolve(import.meta.dirname, '..')
const POST_ROOT = path.join(ROOT, 'posts')
const VOCAB = JSON.parse(
  readFileSync(path.join(ROOT, 'data/tag-vocabulary.json'), 'utf8'),
).tags
const SCORES_PATH = path.join(ROOT, 'data/tag-scores.json')

const THRESHOLD = 0.5
const MAX_TAGS = 5
const CONCURRENCY = 8

const API_KEY =
  process.env.TYPESAFE_API_KEY ??
  readFileSync(path.join(ROOT, '.env.local'), 'utf8').match(
    /^TYPESAFE_API_KEY=(\S+)/m,
  )?.[1]

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const all = args.includes('--all')
const only = args
  .filter((a) => !a.startsWith('--'))
  .map((a) => a.replace(/^.*posts\//, '').replace(/(\.en)?\.mdx?$/, ''))

const posts = globSync(`${POST_ROOT}/**/*.md*`)
  .filter((f) => !/\.en\.mdx?$/.test(f))
  .map((file) => {
    const {attributes: fm, body} = frontMatter(readFileSync(file, 'utf8'))
    const slug = path.relative(POST_ROOT, file).replace(/\.mdx?$/, '')
    const headings = [...body.matchAll(/^#{2,3} (.+)$/gm)].map((m) => m[1])
    const text = body
      .replace(/```[\s\S]*?```/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
    return {
      file,
      slug,
      published: fm.published,
      oldTags: (fm.tags ?? []).map((t) => t.trim()),
      state: {
        title: fm.title,
        description: fm.description ?? '',
        headings: headings.slice(0, 40),
        opening: text.slice(0, 1500),
      },
    }
  })
  .filter((p) => (all ? p.published : only.some((s) => p.slug.endsWith(s))))

const questions = Object.fromEntries(
  Object.entries(VOCAB).map(([tag, meaning]) => [
    tag,
    {
      type: 'noul',
      // 정의문을 인용해 "중심 주제인가"로 물으면 javascript 같은 태그가 0.1대로 과소 판정됐다.
      // 태그명을 앞세워 "이 태그 아래 둘 글인가"로 물어야 분리가 된다.
      instructions: `Should this post be listed under the tag "${tag}"? The tag is for posts about ${meaning}.`,
      criteria: {
        true: 'This topic is a main purpose of the post.',
        false:
          'The topic is incidental: only the language or tool the work happens to use, background, or a passing mention.',
      },
    },
  ]),
)

async function judge(post, tags) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'jev-latest',
        state: post.state,
        questions: Object.fromEntries(tags.map((t) => [t, questions[t]])),
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
    return {
      scores: Object.fromEntries(
        Object.entries(json.answers).map(([t, a]) => [t, a.noul]),
      ),
      tokens: json.usage.input_tokens,
    }
  }
  throw new Error(`재시도 초과: ${post.slug}`)
}

const cache = existsSync(SCORES_PATH)
  ? JSON.parse(readFileSync(SCORES_PATH, 'utf8'))
  : {}
// 지정한 글은 본문이 바뀌었을 수 있으니 처음부터 다시 판정한다
if (!all) {
  posts.forEach((p) => delete cache[p.slug])
}
let inputTokens = 0
// 어휘에 태그가 추가되면 그 태그만 추가로 묻는다
const todo = posts
  .map((post) => ({
    post,
    missing: Object.keys(VOCAB).filter((t) => cache[post.slug]?.[t] == null),
  }))
  .filter(({missing}) => missing.length > 0)
let next = 0
await Promise.all(
  Array.from({length: CONCURRENCY}, async () => {
    while (next < todo.length) {
      const {post, missing} = todo[next++]
      const {scores, tokens} = await judge(post, missing)
      cache[post.slug] = {...cache[post.slug], ...scores}
      inputTokens += tokens
    }
  }),
)
writeFileSync(SCORES_PATH, JSON.stringify(cache, null, 2) + '\n')

function pick(scores) {
  // 어휘에서 빠진 태그의 옛 점수는 무시한다
  const ranked = Object.entries(scores)
    .filter(([t]) => t in VOCAB)
    .toSorted((a, b) => b[1] - a[1])
  const passed = ranked.filter(([, p]) => p >= THRESHOLD).slice(0, MAX_TAGS)
  return (passed.length > 0 ? passed : ranked.slice(0, 1)).map(([t]) => t)
}

function writeTags(file, tags) {
  const raw = readFileSync(file, 'utf8')
  // 블록 목록, `tags: []`, 빈 `tags:` 모두 덮어쓴다
  const block = /^tags:[^\n]*\n(?:[ \t]+- .*\n)*/m
  if (!block.test(raw)) {
    throw new Error(`tags 필드를 찾지 못함: ${file}`)
  }
  writeFileSync(
    file,
    raw.replace(block, `tags:\n${tags.map((t) => `  - ${t}\n`).join('')}`),
  )
}

for (const post of posts) {
  const scores = cache[post.slug]
  const tags = pick(scores)
  const shown = Object.entries(scores)
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([t, p]) => `${t} ${p.toFixed(2)}`)
    .join(', ')
  console.log(
    `${post.slug}\n  기존: ${post.oldTags.join(', ')}\n  새:   ${tags.join(', ')}\n  상위: ${shown}`,
  )
  if (
    Object.entries(scores).every(([t, p]) => !(t in VOCAB) || p < THRESHOLD)
  ) {
    console.log(
      '  ⚠ 어휘에 맞는 태그가 없습니다. node scripts/propose-tags.mjs 로 새 태그를 제안받으세요',
    )
  }
  if (apply) {
    writeTags(post.file, tags)
    const en = post.file.replace(/\.(mdx?)$/, '.en.$1')
    if (existsSync(en)) {
      writeTags(en, tags)
    }
  }
}
console.log(
  `\n글 ${posts.length}편, 새 판정 ${todo.length}편, 입력 토큰 ${inputTokens} (약 $${((inputTokens * 0.042) / 1e6).toFixed(3)})`,
)
