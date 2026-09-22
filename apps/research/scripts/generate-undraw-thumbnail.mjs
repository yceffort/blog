/**
 * unDraw 일러스트로 슬라이드 덱 OG 썸네일을 만든다. (apps/blog/scripts/generate-undraw-thumbnail.mjs 와 같은 방식)
 *
 * Usage:
 *   node scripts/generate-undraw-thumbnail.mjs <deck-file-path>... [--force]
 *   node scripts/generate-undraw-thumbnail.mjs --all [--force]
 *
 * 1) Claude가 덱 제목/설명을 보고 unDraw 카탈로그(사람 없는 그림만)에서 이름 하나를 고른다
 *    → frontmatter `art.undraw`에 기록(있으면 그대로 쓴다. 손으로 바꾸고 다시 돌리면 됨)
 * 2) 그 SVG를 frontmatter `art.hue` 색으로 칠해 public/thumbnails/{slug}.webp 로 저장
 *
 * --force  frontmatter의 undraw 이름을 무시하고 다시 고른다
 * 키: ANTHROPIC_API_KEY, ANTHROPIC_WORKSPACE_ID (apps/research/.env.local, 없으면 apps/blog/.env.local)
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import {dirname, resolve} from 'node:path'

import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'

const APP_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..')
const ENV_PATHS = [
  resolve(APP_ROOT, '.env.local'),
  resolve(APP_ROOT, '../blog/.env.local'),
]
const DECK_DIR = resolve(APP_ROOT, 'research')
const THUMB_DIR = resolve(APP_ROOT, 'public/thumbnails')
const SVG_DIR = resolve(APP_ROOT, 'node_modules/undraw-svg/svgs')
const WIDTH = 1200
const HEIGHT = 630
const BATCH = 40

const ACCENT = {
  warm: '#d97706',
  rose: '#be185d',
  violet: '#6d28d9',
  blue: '#1d4ed8',
  cyan: '#0e7490',
  green: '#047857',
  slate: '#334155',
}
const PAPER = {
  warm: '#fbf6ee',
  rose: '#fbf1f4',
  violet: '#f4f1fb',
  blue: '#eff4fb',
  cyan: '#edf7f8',
  green: '#eef8f2',
  slate: '#f3f4f6',
}
const HUES = Object.keys(ACCENT)

// 사람 피부색 fill이 있는 그림과 이름에 사람이 드러나는 그림은 뺀다
const SKIN =
  /fill="#(a0616a|ffb6b6|ffb8b8|9f616a|ffb7b7|feb8b8|ffb9b9|e8a3a3|9e616a|fbbebe|be6f72|a06e6e|d0b0a0|f2a7a7|ed9da0|fed2b1|ffb5b5|ffd7ba)"/i
const PEOPLE_NAME =
  /walk|people|person|team|together|\bman\b|woman|girl|boy|friend|couple|family|selfie|yoga|fitness|danc|jogging|love|wedding|portrait|profile|avatar|hiring|interview|meditat|relax|sleep|hang/i

function loadEnv(key) {
  const envPath = ENV_PATHS.find((p) => existsSync(p))
  if (!envPath) {
    throw new Error(`.env.local not found: ${ENV_PATHS.join(', ')}`)
  }
  const env = readFileSync(envPath, 'utf-8')
  const match = env.match(new RegExp(`^${key}=(.+)$`, 'm'))
  if (!match) {
    throw new Error(`${key} not found in ${envPath}`)
  }
  return match[1].trim()
}

function loadCatalog() {
  return readdirSync(SVG_DIR)
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.replace(/\.svg$/, ''))
    .filter(
      (name) =>
        !PEOPLE_NAME.test(name) &&
        !SKIN.test(readFileSync(resolve(SVG_DIR, `${name}.svg`), 'utf-8')),
    )
}

function hashCode(str) {
  let h = 0
  for (const ch of str) {
    h = (h * 31 + ch.charCodeAt(0)) | 0
  }
  return Math.abs(h)
}

function readDeck(path) {
  const content = readFileSync(path, 'utf-8')
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) {
    throw new Error(`frontmatter not found: ${path}`)
  }
  const fm = match[1]
  const field = (key) =>
    (fm.match(new RegExp(`^${key}: (.*)$`, 'm')) || [])[1]
      ?.replace(/^'|'$/g, '')
      .replace(/''/g, "'") ?? ''
  const artField = (key) =>
    (fm.match(new RegExp(`^  ${key}: (.*)$`, 'm')) || [])[1]
  const slug = path.replace(/^.*\//, '').replace(/\.md$/, '')
  return {
    path,
    slug,
    title: field('title'),
    description: field('description'),
    hue: HUES.includes(artField('hue'))
      ? artField('hue')
      : HUES[hashCode(slug) % HUES.length],
    undraw: artField('undraw'),
  }
}

function writeUndrawToFrontmatter(path, name) {
  const content = readFileSync(path, 'utf-8')
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) {
    return
  }
  let fm = match[1].replace(/^  undraw: .*\n?/m, '')
  if (/^art:\s*$/m.test(fm)) {
    fm = fm.replace(/^art:\s*$/m, `art:\n  undraw: ${name}`)
  } else {
    fm = `${fm}\nart:\n  undraw: ${name}`
  }
  writeFileSync(path, content.replace(match[0], `---\n${fm}\n---`))
}

async function pickNames(claude, decks, catalog, used) {
  const res = await claude.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 16000,
    messages: [
      {
        role: 'user',
        content: `아래 발표 슬라이드 덱 각각에 가장 어울리는 unDraw 일러스트를 카탈로그에서 하나씩 고른다. 사물 위주 카탈로그다. 덱의 핵심 사물이나 행위(서버, 컨테이너, 브라우저, 코드 창, 파일, 캐시, 네트워크, 번들, 애니메이션, 차트, 책, 열쇠 등)에 가장 가까운 이름을 고른다. 이 목록 안에서는 같은 이름을 두 덱에 쓰지 않는다. "이미 쓰인 이름"은 가능하면 피하되 훨씬 더 어울리면 써도 된다. 카탈로그에 없는 이름은 절대 쓰지 않는다.
JSON 배열만 출력: [{"slug": "...", "pick": "<catalog name>"}]

## 카탈로그
${catalog.join(', ')}

## 이미 쓰인 이름
${used.length ? used.join(', ') : '(없음)'}

## 덱
${decks.map((d) => `- slug: ${d.slug}\n  title: ${d.title}\n  description: ${d.description.slice(0, 200)}`).join('\n')}`,
      },
    ],
  })
  const text = res.content.map((c) => c.text ?? '').join('')
  const picks = JSON.parse(
    text.slice(text.indexOf('['), text.lastIndexOf(']') + 1),
  )
  const map = new Map(picks.map((p) => [p.slug, p.pick]))
  for (const d of decks) {
    if (!catalog.includes(map.get(d.slug))) {
      throw new Error(`pick not in catalog: ${d.slug} → ${map.get(d.slug)}`)
    }
  }
  return map
}

async function render(deck) {
  const svg = readFileSync(
    resolve(SVG_DIR, `${deck.undraw}.svg`),
    'utf-8',
  ).replace(/<svg /, `<svg color="${ACCENT[deck.hue]}" `)
  const illo = await sharp(Buffer.from(svg))
    .resize({width: 920, height: 540, fit: 'inside'})
    .png()
    .toBuffer()
  const meta = await sharp(illo).metadata()
  mkdirSync(THUMB_DIR, {recursive: true})
  await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 3,
      background: PAPER[deck.hue],
    },
  })
    .composite([
      {
        input: illo,
        left: Math.round((WIDTH - meta.width) / 2),
        top: Math.round((HEIGHT - meta.height) / 2),
      },
    ])
    .webp({quality: 85})
    .toFile(resolve(THUMB_DIR, `${deck.slug}.webp`))
}

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const paths = args.includes('--all')
    ? readdirSync(DECK_DIR)
        .filter((f) => f.endsWith('.md'))
        .map((f) => resolve(DECK_DIR, f))
    : args.filter((a) => !a.startsWith('--')).map((p) => resolve(p))
  if (paths.length === 0) {
    console.error(
      'Usage: node scripts/generate-undraw-thumbnail.mjs <deck-file-path>... | --all [--force]',
    )
    process.exit(1)
  }

  const claude = new Anthropic({
    apiKey: loadEnv('ANTHROPIC_API_KEY'),
    defaultHeaders: {
      'anthropic-workspace-id': loadEnv('ANTHROPIC_WORKSPACE_ID'),
    },
  })
  const catalog = loadCatalog()
  const decks = paths
    .map(readDeck)
    .toSorted((a, b) => b.slug.localeCompare(a.slug))
  const used = new Set(
    decks.filter((d) => !force && d.undraw).map((d) => d.undraw),
  )
  const pending = decks.filter((d) => force || !d.undraw)
  console.log(
    `catalog ${catalog.length}, decks ${decks.length}, to pick ${pending.length}`,
  )

  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH)
    const picks = await pickNames(claude, batch, catalog, [...used])
    for (const deck of batch) {
      deck.undraw = picks.get(deck.slug)
      used.add(deck.undraw)
      writeUndrawToFrontmatter(deck.path, deck.undraw)
    }
    console.log(
      `picked ${Math.min(i + BATCH, pending.length)}/${pending.length}`,
    )
  }

  for (const deck of decks) {
    await render(deck)
    console.log(`done  ${deck.slug}  [${deck.hue}]  ${deck.undraw}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
