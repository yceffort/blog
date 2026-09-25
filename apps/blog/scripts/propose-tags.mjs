/**
 * 어휘에 맞는 태그가 없는 글을 모아 Claude에게 새 태그를 제안받는다.
 *
 * Usage:
 *   node scripts/propose-tags.mjs
 *
 * data/tag-scores.json 에서 어휘 태그 점수가 모두 THRESHOLD 미만인 글이 대상이다
 * (먼저 retag-posts.mjs 로 판정해 둘 것). 제안은 출력만 한다. 받아들일 태그는
 * data/tag-vocabulary.json 에 손으로 넣고 retag-posts.mjs 를 다시 돌리면 새 태그만 판정한다.
 * 키: .env.local의 ANTHROPIC_API_KEY, ANTHROPIC_WORKSPACE_ID
 */
import {readFileSync} from 'node:fs'
import path from 'node:path'

import Anthropic from '@anthropic-ai/sdk'
import frontMatter from 'front-matter'
import {globSync} from 'glob'

const ROOT = path.resolve(import.meta.dirname, '..')
const THRESHOLD = 0.5

const env = readFileSync(path.join(ROOT, '.env.local'), 'utf8')
const loadEnv = (key) => env.match(new RegExp(`^${key}=(\\S+)`, 'm'))?.[1]

const vocab = JSON.parse(
  readFileSync(path.join(ROOT, 'data/tag-vocabulary.json'), 'utf8'),
).tags
const scores = JSON.parse(
  readFileSync(path.join(ROOT, 'data/tag-scores.json'), 'utf8'),
)

const gaps = Object.entries(scores)
  .filter(([, s]) =>
    Object.entries(s).every(([t, p]) => !(t in vocab) || p < THRESHOLD),
  )
  .map(([slug]) => {
    const file = globSync(`${ROOT}/posts/${slug}.md*`).find(
      (f) => !/\.en\.mdx?$/.test(f),
    )
    const {attributes: fm, body} = frontMatter(readFileSync(file, 'utf8'))
    return {
      slug,
      title: fm.title,
      description: fm.description ?? '',
      opening: body.replace(/\s+/g, ' ').slice(0, 1500),
    }
  })

if (gaps.length === 0) {
  console.log('어휘에 맞는 태그가 없는 글이 없습니다')
  process.exit(0)
}

const claude = new Anthropic({
  apiKey: loadEnv('ANTHROPIC_API_KEY'),
  defaultHeaders: {'anthropic-workspace-id': loadEnv('ANTHROPIC_WORKSPACE_ID')},
})

const res = await claude.messages.create({
  model: 'claude-sonnet-5',
  max_tokens: 16000,
  thinking: {type: 'adaptive'},
  output_config: {
    format: {
      type: 'json_schema',
      schema: {
        type: 'object',
        properties: {
          proposals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                tag: {type: 'string'},
                meaning: {type: 'string'},
                slugs: {type: 'array', items: {type: 'string'}},
                reason: {type: 'string'},
              },
              required: ['tag', 'meaning', 'slugs', 'reason'],
              additionalProperties: false,
            },
          },
        },
        required: ['proposals'],
        additionalProperties: false,
      },
    },
  },
  messages: [
    {
      role: 'user',
      content: `Korean frontend engineering blog. Each post below matched none of the existing tags. Propose new tags so each post gets a fitting one.

Rules:
- tag: lowercase kebab-case English, same style as existing tags. Prefer one tag that covers several of these posts over one tag per post, but do not force unrelated posts together.
- meaning: one line in the same style as existing meanings, describing what posts belong under the tag. It will be used as a classifier definition, so make its boundary clear.
- Do not propose a tag whose meaning overlaps an existing tag.
- slugs: which of the posts below the tag is for.
- reason: one short sentence in Korean.

Existing tags:
${JSON.stringify(vocab, null, 2)}

Posts:
${JSON.stringify(gaps, null, 2)}`,
    },
  ],
})

const text = res.content.find((b) => b.type === 'text')?.text
if (res.stop_reason !== 'end_turn' || !text) {
  throw new Error(`응답 이상: ${res.stop_reason}`)
}
for (const p of JSON.parse(text).proposals) {
  console.log(`\n${p.tag}: ${p.meaning}\n  ${p.reason}`)
  p.slugs.forEach((s) => console.log(`  - ${s}`))
}
console.log(
  `\n대상 ${gaps.length}편, 토큰 입력 ${res.usage.input_tokens} 출력 ${res.usage.output_tokens}`,
)
