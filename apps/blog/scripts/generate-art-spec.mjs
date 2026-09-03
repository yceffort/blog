#!/usr/bin/env node

/**
 * 블로그 포스트 썸네일 아트 스펙 생성 스크립트
 *
 * Usage:
 *   node scripts/generate-art-spec.mjs <post-file-path>... [--dry-run] [--force]
 *   node scripts/generate-art-spec.mjs --all [--force]
 *
 * .env.local의 ANTHROPIC_API_KEY로 Claude API를 호출해 본문에서 레이아웃, 색군, 명도,
 * hero 문자열을 뽑아 frontmatter `art:` 블록에 쓴다. 영문본(.en.md)이 있으면 같은 스펙을 쓴다.
 * api/og/art 라우트가 이 값을 받아 렌더링한다. 이미 art가 있는 글은 --force 없이는 건너뛴다.
 */

import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'

import Anthropic from '@anthropic-ai/sdk'
import {sync} from 'glob'

const BLOG_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..')
const ENV_PATH = resolve(BLOG_ROOT, '.env.local')
const CONCURRENCY = 6

// api/og/art/route.tsx 의 LAYOUT_BY_NAME, HUES 와 맞출 것
const LAYOUTS = {
  bands: '굵은 띠와 노드 연결선. 흐름, 파이프라인, 요청과 응답, 라이프사이클',
  rings: '동심원 또는 겹친 사각형. 캐시, 레이어, 계층, 스코프, 래핑',
  field:
    '흩어진 작은 조각들. 분산, 파티클, 마이크로프론트엔드, 다수의 인스턴스',
  columns: '굵은 세로 기둥. 플랫폼, 기반, 프레임워크 선택, 아키텍처 축',
  codePanel: '코드 에디터 패널. 코드 딥다이브, 린트 규칙, API 사용법, 문법',
  contours: '겹친 파도 곡선. 성능, 지연, 렌더링 파형, 스트리밍, 시간 축',
  gridChart: '격자 위 꺾은선 그래프. 실측 데이터, 벤치마크, 지표, 리포트',
  glyph: '큰 외곽선 도형 하나와 점. 단일 개념, 정의, 원리 하나를 파고드는 글',
  halftone:
    '점 크기가 변하는 망점 패턴. 이미지, 렌더링, 픽셀, 그래픽, 브라우저 페인트',
  stripes: '사선 줄무늬. 장애, 경고, 보안, 위험, 회고',
  bauhaus: '큰 원들의 겹침. 설계, 추상, 조직, 사람, 에세이',
  steps: '높이가 변하는 계단 막대. 마이그레이션, 버전 업, 단계별 절차, 성장',
}

const HUES = {
  warm: '주황, 호박. 열, 속도, 성능 개선, 빌드',
  rose: '빨강, 분홍. 장애, 에러, 보안, 경고',
  violet: '보라, 인디고. AI, 추상, 설계, 언어 내부',
  blue: '파랑. 인프라, 플랫폼, 쿠버네티스, 네트워크',
  cyan: '청록, 하늘. 캐시, 데이터 흐름, 브라우저, 서비스 워커',
  green: '초록, 에메랄드. 측정 결과, 개선 확인, 테스트, 안정',
  slate: '회색. 회고, 에세이, 커리어, 공지',
}

function loadEnv(key) {
  const env = readFileSync(ENV_PATH, 'utf-8')
  const match = env.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return match ? match[1].trim() : null
}

function createClient() {
  const apiKey = loadEnv('ANTHROPIC_API_KEY')
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not found in .env.local')
  }
  // identity-linked 키는 workspace id 헤더가 필수
  const workspaceId = loadEnv('ANTHROPIC_WORKSPACE_ID')
  return new Anthropic({
    apiKey,
    defaultHeaders: workspaceId ? {'anthropic-workspace-id': workspaceId} : {},
  })
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) {
    throw new Error('No frontmatter found')
  }
  const raw = match[1]
  const get = (key) => {
    const m = raw.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
    return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null
  }
  const tagBlock = raw.match(/^tags:\n((?:\s+-\s+.+\n?)+)/m)
  const tags = tagBlock
    ? tagBlock[1]
        .split('\n')
        .map((l) => l.trim().replace(/^-\s+/, ''))
        .filter(Boolean)
    : []
  return {
    raw,
    fullMatch: match[0],
    title: get('title')?.replace(/<\/?em>/g, ''),
    description: get('description'),
    tags,
    hasArt: /^art:/m.test(raw),
    body: content.slice(match[0].length),
  }
}

function buildPrompt(fm) {
  const layoutList = Object.entries(LAYOUTS)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')
  const hueList = Object.entries(HUES)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')
  return `아래 블로그 글의 썸네일 스펙을 정한다. 썸네일은 코드로 그리는 추상 도형 위에 짧은 문자열(hero) 하나를 얹는 구조다.

## layouts (어울리는 순서로 3개)
${layoutList}
같은 레이아웃만 몰리지 않게 전체 글 단위로 배분하므로, 1순위가 밀리면 2, 3순위가 쓰인다. 셋 다 이 글에 말이 되는 것으로 고른다.

## hues (어울리는 순서로 2개)
${hueList}

## tone
light 또는 dark. 딥다이브, 내부 구조, 장애, 야간 작업 느낌이면 dark. 그 외는 light. 전체의 3할 정도만 dark가 되도록 확실할 때만 dark를 고른다.

## hero
이 글을 대표하는 문자열 하나. 독자가 썸네일만 보고 "아, 그 글"이라고 떠올릴 것.
우선순위: (1) 글에서 실제로 측정한 인상적인 수치나 비교(예: "752s → 0.4s", "+85%", "0.3ms") (2) 글이 다루는 핵심 API, 옵션, 규칙 이름(예: "use cache", "no-unused-vars") (3) 핵심 용어 한두 단어.
규칙:
- 본문 또는 제목에 글자 그대로 존재하는 문자열이어야 한다. 단위를 붙이거나 어순을 바꿔 새로 만들지 말 것. 문장이나 슬로건을 지어내지 말 것.
- 예외로 "A → B" 형태의 전후 비교는 A와 B가 각각 본문에 글자 그대로 있으면 된다(예: "1.72GB → 208MB").
- 한글 14자 또는 영문 22자 이하. 마크다운, 따옴표, 백틱 없음. 마이너스는 하이픈(-)으로 쓸 것.
- 제목을 그대로 쓰지 말 것. 제목 전체보다 짧고 구체적이어야 한다.
- 적절한 것이 없으면 null.

JSON 하나만 출력한다. 설명 없음.
{"layouts": ["...", "...", "..."], "hues": ["...", "..."], "tone": "light|dark", "hero": "..." | null}

## 글
제목: ${fm.title}
설명: ${fm.description ?? ''}
태그: ${fm.tags.join(', ')}

${fm.body}`
}

function normalize(s) {
  return s
    .replace(/[\u2212\u2013\u2014]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// 한글 1, 그 외 0.62 로 환산한 표시 폭. 라우트의 estimateWidthUnits 와 같은 기준
function widthUnits(s) {
  let units = 0
  for (const ch of s) {
    units += ch.charCodeAt(0) > 0x2e7f ? 1 : 0.62
  }
  return units
}

// 앞뒤가 영숫자가 아닌 자리에서 등장해야 한다 ("752ms" 안의 "752" 같은 부분 일치 방지)
function occursAsToken(needle, haystack) {
  let from = 0
  while (true) {
    const i = haystack.indexOf(needle, from)
    if (i < 0) {
      return false
    }
    const before = haystack[i - 1] ?? ' '
    const after = haystack[i + needle.length] ?? ' '
    if (!/[0-9A-Za-z]/.test(before) && !/[0-9A-Za-z]/.test(after)) {
      return true
    }
    from = i + 1
  }
}

// "A → B" 는 A, B 가 각각 본문에 있으면 허용한다 (수치 비교는 대개 한 줄에 같이 안 나온다).
// 단 숫자만 있는 조각은 아무 표에서나 주워 올 수 있으므로 단위나 단어가 붙어 있어야 한다
function existsInPost(hero, haystack) {
  if (occursAsToken(hero, haystack)) {
    return true
  }
  const parts = hero.split('→').map((p) => p.trim())
  if (parts.length !== 2 || parts.some((p) => !p || /^[\d.,]+$/.test(p))) {
    return false
  }
  return parts.every((p) => occursAsToken(p, haystack))
}

function validate(spec, fm) {
  const out = {}
  const layouts = Array.isArray(spec.layouts) ? spec.layouts : [spec.layout]
  const hues = Array.isArray(spec.hues) ? spec.hues : [spec.hue]
  out.layouts = layouts.filter((l) => l in LAYOUTS)
  out.hues = hues.filter((h) => h in HUES)
  if (out.layouts.length === 0 || out.hues.length === 0) {
    throw new Error(`No valid layout/hue: ${JSON.stringify(spec)}`)
  }
  out.tone = spec.tone === 'dark' ? 'dark' : 'light'
  const hero = typeof spec.hero === 'string' ? normalize(spec.hero) : ''
  const haystack = normalize(`${fm.title}\n${fm.description ?? ''}\n${fm.body}`)
  if (
    hero &&
    widthUnits(hero) <= 15 &&
    hero !== normalize(fm.title) &&
    existsInPost(hero, haystack)
  ) {
    out.hero = hero
  } else {
    out.hero = null
    if (hero) {
      out.rejectedHero = hero
    }
  }
  return out
}

async function requestSpec(client, messages) {
  const msg = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    thinking: {type: 'adaptive'},
    output_config: {effort: 'low'},
    messages,
  })
  const text = msg.content.find((b) => b.type === 'text')?.text.trim() ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`Unexpected response (${msg.stop_reason}): ${text}`)
  }
  return {text, spec: JSON.parse(jsonMatch[0])}
}

// hero 가 본문에 없으면 한 번 되물어 본문에 있는 것으로 고치게 한다
async function generateArt(client, fm) {
  const messages = [{role: 'user', content: buildPrompt(fm)}]
  let first
  try {
    first = await requestSpec(client, messages)
  } catch (err) {
    // 보안 취약점 글 등은 본문 전체를 주면 응답이 비는 경우가 있어 앞부분만으로 다시 묻는다
    if (!/Unexpected response/.test(err.message)) {
      throw err
    }
    messages[0] = {
      role: 'user',
      content: buildPrompt({...fm, body: fm.body.slice(0, 3000)}),
    }
    first = await requestSpec(client, messages)
  }
  const art = validate(first.spec, fm)
  if (!art.rejectedHero) {
    return art
  }
  messages.push(
    {role: 'assistant', content: first.text},
    {
      role: 'user',
      content: `hero "${art.rejectedHero}"는 본문에 글자 그대로 없거나 너무 길다. 지어내지 말고 본문에 실제로 있는 짧은 문자열(수치, API 이름, 용어)을 골라라. 마땅한 것이 없으면 null. 같은 JSON 형식으로 다시 출력한다.`,
    },
  )
  const second = await requestSpec(client, messages)
  const retried = validate(second.spec, fm)
  if (retried.rejectedHero) {
    retried.rejectedHero = `${art.rejectedHero} / ${retried.rejectedHero}`
  }
  return retried
}

function yamlString(s) {
  return `'${s.replace(/'/g, "''")}'`
}

function writeArt(path, art) {
  const content = readFileSync(path, 'utf-8')
  const fm = parseFrontmatter(content)
  const lines = [
    `art:`,
    `  layout: ${art.layout}`,
    `  hue: ${art.hue}`,
    `  tone: ${art.tone}`,
  ]
  if (art.hero) {
    lines.push(`  hero: ${yamlString(art.hero)}`)
  }
  const block = lines.join('\n')
  const newRaw = fm.hasArt
    ? fm.raw
        .replace(/^art:\n(?:[ \t]+.+\n?)*/m, `${block}\n`)
        .replace(/\n$/, '')
    : `${fm.raw}\n${block}`
  writeFileSync(path, content.replace(fm.fullMatch, `---\n${newRaw}\n---`))
}

function relPath(path) {
  return path.replace(`${BLOG_ROOT}/posts/`, '')
}

async function collectSpec(client, path, {force, cache}) {
  const content = readFileSync(path, 'utf-8')
  const fm = parseFrontmatter(content)
  const rel = relPath(path)
  if (fm.hasArt && !force) {
    console.log(`skip  ${rel} (art exists)`)
    return null
  }
  if (cache[rel]) {
    return cache[rel]
  }
  const art = await generateArt(client, fm)
  cache[rel] = art
  return art
}

// 1순위가 전체의 cap 비율을 넘으면 2, 3순위로 내린다. 전부 넘치면 1순위
function balance(entries, key, cap) {
  const limit = Math.ceil(entries.length * cap)
  const counts = {}
  for (const {art} of entries) {
    const list = art[`${key}s`]
    const chosen = list.find((v) => (counts[v] ?? 0) < limit) ?? list[0]
    counts[chosen] = (counts[chosen] ?? 0) + 1
    art[key] = chosen
  }
}

function persist(path, art, dryRun) {
  const note = art.rejectedHero ? `  [hero rejected: ${art.rejectedHero}]` : ''
  console.log(
    `${dryRun ? 'dry  ' : 'write'} ${relPath(path)}  ${art.layout}/${art.hue}/${art.tone}  hero=${art.hero ?? '-'}${note}`,
  )
  if (dryRun) {
    return
  }
  writeArt(path, art)
  const enPath = path.replace(/\.md$/, '.en.md')
  if (existsSync(enPath)) {
    writeArt(enPath, art)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const force = args.includes('--force')
  const all = args.includes('--all')
  const cacheIdx = args.indexOf('--cache')
  const cachePath = cacheIdx >= 0 ? resolve(args[cacheIdx + 1]) : null
  const positional = args.filter(
    (a, i) => !a.startsWith('--') && args[i - 1] !== '--cache',
  )
  const paths = all
    ? sync(`${BLOG_ROOT}/posts/**/*.md`).filter((p) => !p.endsWith('.en.md'))
    : positional.map((p) => resolve(p))

  if (paths.length === 0) {
    console.error(
      'Usage: node scripts/generate-art-spec.mjs <post-file-path>... | --all [--dry-run] [--force] [--cache <json>]',
    )
    process.exit(1)
  }

  // --cache: API 응답(후보 목록)을 저장해 두면 재배분만 다시 할 수 있다
  const cache =
    cachePath && existsSync(cachePath)
      ? JSON.parse(readFileSync(cachePath, 'utf-8'))
      : {}
  const client = createClient()
  const queue = [...paths]
  const entries = []
  const failures = []
  const workers = Array.from({length: CONCURRENCY}, async () => {
    while (queue.length) {
      const path = queue.shift()
      try {
        const art = await collectSpec(client, path, {force, cache})
        if (art) {
          entries.push({path, art})
        }
      } catch (err) {
        failures.push(path)
        console.error(`fail  ${relPath(path)}: ${err.message}`)
      }
    }
  })
  await Promise.all(workers)
  if (cachePath) {
    writeFileSync(cachePath, JSON.stringify(cache, null, 2))
  }

  entries.sort((a, b) => (a.path < b.path ? 1 : -1))
  balance(entries, 'layout', all ? 0.14 : 1)
  balance(entries, 'hue', all ? 0.24 : 1)
  for (const {path, art} of entries) {
    persist(path, art, dryRun)
  }
  if (failures.length) {
    console.error(`\n${failures.length} failed`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(`Failed: ${err.message}`)
  process.exit(1)
})
