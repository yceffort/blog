/**
 * 관련 글을 TypeSafe Jev로 골라 data/related-posts.json 에 기록한다.
 *
 * Usage:
 *   node scripts/generate-related-posts.mjs
 *
 * 1) 글마다 후보를 모은다: 태그 겹침 상위 15편 + minisearch(제목/태그 OR 검색) 상위 15편
 * 2) (현재 글, 후보) 쌍마다 "다음에 읽을 가치가 있는가" Noul 확률을 받는다
 * 3) 확률순 상위 RELATED_LIMIT 편을 기록한다
 *
 * 쌍 점수는 data/related-scores.json 에 캐시하고, 캐시에 없는 쌍만 호출한다.
 * 글 내용을 크게 고쳐 다시 매기려면 캐시에서 그 글의 키를 지우면 된다.
 * 키: .env.local의 TYPESAFE_API_KEY
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import path from 'node:path'

import frontMatter from 'front-matter'
import {globSync} from 'glob'
import MiniSearch from 'minisearch'

const ROOT = path.resolve(import.meta.dirname, '..')
const POST_ROOT = path.join(ROOT, 'posts')
const DATA_DIR = path.join(ROOT, 'data')
const SCORES_PATH = path.join(DATA_DIR, 'related-scores.json')
const RELATED_PATH = path.join(DATA_DIR, 'related-posts.json')

const CANDIDATES_PER_SOURCE = 15
const RELATED_LIMIT = 8
const CONCURRENCY = 8

const API_KEY =
  process.env.TYPESAFE_API_KEY ??
  readFileSync(path.join(ROOT, '.env.local'), 'utf8').match(
    /^TYPESAFE_API_KEY=(\S+)/m,
  )?.[1]
if (!API_KEY) {
  throw new Error('TYPESAFE_API_KEY가 없습니다')
}

const QUESTION = {
  type: 'noul',
  instructions:
    'Both are posts on a Korean frontend engineering blog. A reader has just finished `current_post`. Would `candidate_post` be a valuable next read for that reader because it deepens, extends, or gives needed background for the specific technical problem `current_post` covers?',
  criteria: {
    true: 'The candidate covers the same concrete technology, mechanism, or problem, or directly complements it, so the reader would likely want it next.',
    false:
      'The candidate only shares a broad area (for example both are about React or JavaScript) or is unrelated to the specific problem.',
  },
}

function loadPosts(locale) {
  return globSync(`${POST_ROOT}/**/*.md*`)
    .filter((f) => /\.en\.mdx?$/.test(f) === (locale === 'en'))
    .map((f) => {
      const {attributes: fm, body} = frontMatter(readFileSync(f, 'utf8'))
      const text = body
        .replace(/```[\s\S]*?```/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
      return {
        slug: path
          .relative(POST_ROOT, f)
          .replace(/\.en\.mdx?$/, '')
          .replace(/\.mdx?$/, ''),
        title: fm.title,
        description: fm.description ?? '',
        tags: (fm.tags ?? []).map((t) => t.trim()),
        series: fm.series,
        date: new Date(fm.date).toISOString(),
        published: fm.published,
        opening: text.slice(0, 700),
      }
    })
    .filter((p) => p.published)
}

function collectCandidates(cur, posts, search) {
  const eligible = (p) =>
    p.slug !== cur.slug && (cur.series == null || p.series !== cur.series)
  const tagSet = new Set(cur.tags)
  const byTag = posts
    .filter(eligible)
    .map((p) => ({p, n: p.tags.filter((t) => tagSet.has(t)).length}))
    .filter(({n}) => n > 0)
    .toSorted((a, b) => b.n - a.n || (a.p.date < b.p.date ? 1 : -1))
    .slice(0, CANDIDATES_PER_SOURCE)
    .map(({p}) => p)
  const bySearch = search
    .search(`${cur.title} ${cur.tags.join(' ')}`, {
      combineWith: 'OR',
      boost: {title: 3, tags: 2},
    })
    .map((r) => posts.find((p) => p.slug === r.id))
    .filter(eligible)
    .slice(0, CANDIDATES_PER_SOURCE)
  return [...new Set([...byTag, ...bySearch])]
}

const view = ({title, description, tags, opening}) => ({
  title,
  description,
  tags,
  opening,
})

async function askNoul(cur, cand) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'jev-latest',
        state: {current_post: view(cur), candidate_post: view(cand)},
        questions: {next: QUESTION},
      }),
    })
    if (res.status === 429 || res.status === 529 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt))
      continue
    }
    if (!res.ok) {
      throw new Error(`${res.status} ${await res.text()}`)
    }
    const json = await res.json()
    return {noul: json.answers.next.noul, tokens: json.usage.input_tokens}
  }
  throw new Error(`재시도 초과: ${cur.slug} -> ${cand.slug}`)
}

mkdirSync(DATA_DIR, {recursive: true})
const scores = existsSync(SCORES_PATH)
  ? JSON.parse(readFileSync(SCORES_PATH, 'utf8'))
  : {}
const saveScores = () =>
  writeFileSync(SCORES_PATH, JSON.stringify(scores, null, 2) + '\n')

const related = {}
let inputTokens = 0
const startedAt = Date.now()

for (const locale of ['ko', 'en']) {
  const posts = loadPosts(locale)
  const search = new MiniSearch({
    idField: 'slug',
    fields: ['title', 'description', 'tags', 'opening'],
    processTerm: (t) => t.normalize('NFC').toLowerCase(),
  })
  search.addAll(posts)

  const pairs = posts.map((cur) => ({
    cur,
    cands: collectCandidates(cur, posts, search),
  }))
  const key = (cur, cand) => `${locale}:${cur.slug}|${cand.slug}`
  const todo = pairs.flatMap(({cur, cands}) =>
    cands.filter((c) => scores[key(cur, c)] == null).map((c) => [cur, c]),
  )
  console.log(`[${locale}] 글 ${posts.length}편, 새로 매길 쌍 ${todo.length}개`)

  let next = 0
  let done = 0
  await Promise.all(
    Array.from({length: CONCURRENCY}, async () => {
      while (next < todo.length) {
        const [cur, cand] = todo[next++]
        const {noul, tokens} = await askNoul(cur, cand)
        scores[key(cur, cand)] = noul
        inputTokens += tokens
        if (++done % 500 === 0) {
          saveScores()
          console.log(`[${locale}] ${done}/${todo.length}`)
        }
      }
    }),
  )
  saveScores()

  related[locale] = Object.fromEntries(
    pairs.map(({cur, cands}) => [
      cur.slug,
      cands
        .map((c) => ({slug: c.slug, score: scores[key(cur, c)]}))
        .toSorted((a, b) => b.score - a.score)
        .slice(0, RELATED_LIMIT),
    ]),
  )
}

writeFileSync(RELATED_PATH, JSON.stringify(related, null, 2) + '\n')
console.log(
  `입력 토큰 ${inputTokens} (약 $${((inputTokens * 0.042) / 1e6).toFixed(3)}), ${((Date.now() - startedAt) / 1000).toFixed(0)}s`,
)
