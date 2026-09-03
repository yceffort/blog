#!/usr/bin/env node

/**
 * 블로그 포스트 썸네일 이미지 생성 스크립트
 *
 * Usage:
 *   node scripts/generate-thumbnail.mjs <post-file-path>... [--force] [--rescene] [--dry-run]
 *   node scripts/generate-thumbnail.mjs --all [--force]
 *
 * --force   이미지가 있어도 다시 그린다 (frontmatter의 scene/composition은 그대로 씀. 손으로 고치고 돌리면 됨)
 * --rescene Claude에게 장면과 구도를 다시 뽑게 한다
 *
 * 1) Claude가 본문에서 장면 문장과 구도를 뽑아 frontmatter `art.scene`, `art.composition`에 쓴다
 * 2) 색 구성은 frontmatter `art.hue`, `art.tone`(generate-art-spec.mjs가 만든 값)으로 정한다
 * 3) Gemini(Nano Banana Pro)가 16:9 일러스트를 그리고, hero가 수치일 때만 코드로 글자를 얹어
 *    public/thumbnails/{slug}.webp 에 저장한다. Post.ts는 이 파일이 있으면 코드 아트보다 우선한다.
 * 키: .env.local의 ANTHROPIC_API_KEY, ANTHROPIC_WORKSPACE_ID, GEMINI_API_KEY
 */

import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'

import Anthropic from '@anthropic-ai/sdk'
import {sync} from 'glob'
import sharp from 'sharp'

const BLOG_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..')
const ENV_PATH = resolve(BLOG_ROOT, '.env.local')
const THUMB_DIR = resolve(BLOG_ROOT, 'public/thumbnails')
const IMAGE_MODEL = 'gemini-3-pro-image'
const CONCURRENCY = 3
const WIDTH = 1200
const HEIGHT = 630

const COMPOSITIONS = {
  cutaway:
    'strict side-view cutaway cross-section like an architectural drawing, subject spanning the full width',
  flatlay:
    'top-down flat lay seen from directly above, objects arranged on a grid',
  vast: 'vast empty space, the subject tiny in one upper corner, nine tenths of the frame is plain background',
  macro:
    'extreme macro close-up, subject cropped by all four edges so only a fragment is visible',
  pattern:
    'a repeating pattern of the same small object tiled across the whole frame in neat rows, with exactly one of them different',
  lowangle:
    'dramatic low angle looking up at a towering subject against the sky',
  split:
    'frame split vertically down the middle, before on the left and after on the right, same object in both halves',
  plate:
    'subject centered and perfectly symmetrical like a botanical specimen plate',
  diagonal:
    'strong diagonal motion frozen mid-action, subject entering from one corner',
}

// hue/tone → 색 구성 후보. 같은 hue 안에서는 slug 해시로 고른다
const SCHEMES = {
  warm: {
    light: [
      'full-bleed mustard yellow background (#f5c451), subject in black ink with cream highlights, no other colors',
      'warm cream paper, subject in burnt orange (#c2410c) and black ink',
    ],
    dark: [
      'deep brown background (#2a1608), subject in orange (#fb923c) and cream, thin cream outlines',
    ],
  },
  rose: {
    light: [
      'pale pink paper (#fbe9e7), subject in crimson (#b91c1c) and black ink',
    ],
    dark: [
      'near-black background (#0f0a0c), subject in hot pink (#ec4899) and white',
    ],
  },
  violet: {
    light: [
      'lavender paper (#ede9fe), subject in deep purple (#6d28d9) and black ink',
    ],
    dark: [
      'deep violet background (#2e1065), subject in lime green (#a3e635) and pale lavender, complementary contrast',
    ],
  },
  blue: {
    light: [
      'pale sky paper (#e0f2fe), subject in cobalt blue (#1d4ed8) and black ink',
    ],
    dark: [
      'deep navy background (#0f172a), subject in bright cyan (#38bdf8) and white, thin white outlines',
    ],
  },
  cyan: {
    light: [
      'mint paper (#ecfeff), subject in teal (#0e7490) with one coral (#f87171) accent',
    ],
    dark: [
      'teal background (#0f766e), subject in cream (#fef3c7) and black ink',
    ],
  },
  green: {
    light: ['cream paper, subject in emerald (#047857) and black ink'],
    dark: [
      'forest green background (#14532d), subject in cream and yellow (#facc15)',
    ],
  },
  slate: {
    light: [
      'warm beige paper (#efe6d8), monochrome graphite pencil grays only, no color',
    ],
    dark: ['charcoal background (#1f2937), white chalk lines only, no color'],
  },
}

function loadEnv(key) {
  const env = readFileSync(ENV_PATH, 'utf-8')
  const match = env.match(new RegExp(`^${key}=(.+)$`, 'm'))
  if (!match) {
    throw new Error(`${key} not found in .env.local`)
  }
  return match[1].trim()
}

function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function parsePost(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) {
    throw new Error('No frontmatter found')
  }
  const raw = match[1]
  const get = (key) =>
    raw
      .match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]
      .trim()
      .replace(/^'(.*)'$/, '$1')
      .replace(/''/g, "'") ?? null
  const artBlock = raw.match(/^art:\n((?:[ \t]+.+\n?)*)/m)?.[1] ?? ''
  const art = {}
  for (const line of artBlock.split('\n')) {
    const m = line.match(/^\s+(\w+):\s*(.+)$/)
    if (m) {
      art[m[1]] = m[2]
        .trim()
        .replace(/^'(.*)'$/, '$1')
        .replace(/''/g, "'")
    }
  }
  return {
    raw,
    fullMatch: match[0],
    title: get('title')?.replace(/<\/?em>/g, ''),
    description: get('description'),
    art,
    body: content.slice(match[0].length),
  }
}

function yamlString(s) {
  return `'${s.replace(/'/g, "''")}'`
}

// art 블록에 scene, composition 을 쓴다(있으면 교체)
function writeSceneToFrontmatter(path, scene, composition) {
  const content = readFileSync(path, 'utf-8')
  const fm = parsePost(content)
  let raw = fm.raw
  if (!/^art:/m.test(raw)) {
    raw += '\nart:'
  }
  raw = raw.replace(/^[ \t]+(scene|composition):.*\n?/gm, '')
  raw = raw
    .replace(
      /^art:\n?/m,
      `art:\n  scene: ${yamlString(scene)}\n  composition: ${composition}\n`,
    )
    .replace(/\n$/, '')
  writeFileSync(path, content.replace(fm.fullMatch, `---\n${raw}\n---`))
}

// 도식형 그림에서 split(같은 그림 반복), vast(구석에 작게), pattern(반복)은 주제를 가리므로 선택지에서 뺀다
const PICKABLE = [
  'cutaway',
  'flatlay',
  'plate',
  'diagonal',
  'lowangle',
  'macro',
]

function buildScenePrompt(fm) {
  const comps = PICKABLE.map((k) => `- ${k}: ${COMPOSITIONS[k]}`).join('\n')
  return `아래 블로그 글의 썸네일 일러스트 스펙을 정한다. 이미지 생성 모델에 넘길 장면 문장(영어)과 구도 이름이다.

## scene
- 은유 금지. 글이 다루는 기술의 실제 사물과 메커니즘을 도식처럼 문자 그대로 그린다. 독자가 그림만 보고 "아, 그 주제"라고 알아봐야 한다.
- 허용되는 사물의 예: 브라우저 창, 서버 상자, 컨테이너와 그 안의 파드 상자들, 모듈 그래프의 노드와 선, 캐시 선반, 요청과 응답 화살표, 링크 미리보기 카드, 타임라인 막대, 번들 덩어리, 키보드, 터미널 창. 글의 주제가 되는 사물을 중심에 둔다.
- 무엇이 무엇과 어떻게 연결되고 무엇이 잘못됐거나 좋아졌는지가 그림에 드러나야 한다(예: 하나였던 노드가 둘로 쪼개짐, 큰 상자 옆의 작은 상자, 브라우저와 서버 사이에 낀 중계 장치가 응답을 가로챔).
- 사물은 최대 4개. 두 문장, 40단어 이내. 추상적 형용사("modern", "tech", "digital") 금지.
- 절대 금지: 글자, 숫자, URL, 로고, 사람 얼굴. 장면 문장 안에 숫자나 URL을 쓰지 말 것.
- 스타일과 색은 쓰지 않는다(따로 붙인다). 장면만.

## composition (하나 선택, 장면과 어울리는 것)
${comps}

JSON 하나만 출력한다. 설명 없음.
{"scene": "...", "composition": "..."}

## 글
제목: ${fm.title}
설명: ${fm.description ?? ''}

${fm.body.slice(0, 12000)}`
}

function validateScene(scene) {
  if (typeof scene !== 'string') {
    return '장면이 문자열이 아님'
  }
  if (/\d|https?:|www\./i.test(scene)) {
    return '장면에 숫자나 URL이 있음'
  }
  if (scene.split(/\s+/).length > 48) {
    return '장면이 너무 김'
  }
  return null
}

async function requestScene(client, fm) {
  const messages = [{role: 'user', content: buildScenePrompt(fm)}]
  for (let attempt = 0; attempt < 2; attempt++) {
    const msg = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 600,
      thinking: {type: 'adaptive'},
      output_config: {effort: 'medium'},
      messages,
    })
    const text = msg.content.find((b) => b.type === 'text')?.text.trim() ?? ''
    const json = text.match(/\{[\s\S]*\}/)
    const spec = json ? JSON.parse(json[0]) : {}
    const problem =
      validateScene(spec.scene) ??
      (PICKABLE.includes(spec.composition) ? null : '구도 이름이 목록에 없음')
    if (!problem) {
      return spec
    }
    messages.push(
      {role: 'assistant', content: text},
      {
        role: 'user',
        content: `${problem}. 규칙을 지켜 같은 JSON 형식으로 다시 출력한다.`,
      },
    )
  }
  throw new Error('scene validation failed twice')
}

async function generateImage(apiKey, prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        contents: [{parts: [{text: prompt}]}],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {aspectRatio: '16:9', imageSize: '1K'},
        },
      }),
    },
  )
  const data = await res.json()
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)
  if (!part) {
    throw new Error(`Gemini: ${JSON.stringify(data).slice(0, 300)}`)
  }
  return Buffer.from(part.inlineData.data, 'base64')
}

function widthUnits(s) {
  let units = 0
  for (const ch of s) {
    units += ch.charCodeAt(0) > 0x2e7f ? 1 : 0.62
  }
  return units
}

// hero가 수치일 때만 좌하단에 얹는다
function heroOverlay(hero, dark) {
  const paper = dark ? '#0b0b12' : '#fbf8f2'
  const ink = dark ? '#f2f2f7' : '#0a0a0f'
  const size = Math.min(92, 760 / widthUnits(hero))
  const text = hero.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${paper}" stop-opacity="0"/><stop offset="1" stop-color="${paper}" stop-opacity="0.9"/></linearGradient></defs>
  <rect x="0" y="420" width="${WIDTH}" height="210" fill="url(#g)"/>
  <text x="72" y="574" font-family="Apple SD Gothic Neo, Helvetica Neue, Arial" font-weight="700" font-size="${size}" fill="${ink}">${text}</text>
</svg>`)
}

async function processPost(clients, path, {force, rescene, dryRun}) {
  const content = readFileSync(path, 'utf-8')
  const fm = parsePost(content)
  const slug = path
    .replace(`${BLOG_ROOT}/posts/`, '')
    .replace(`${BLOG_ROOT}/`, '')
    .replace(/\.md$/, '')
  const outPath = `${THUMB_DIR}/${slug}.webp`
  if (existsSync(outPath) && !force) {
    console.log(`skip  ${slug} (exists)`)
    return
  }
  // 시리즈 리드미처럼 art 스펙이 없으면 색군은 해시로 고른다
  const hueNames = Object.keys(SCHEMES)
  const hue =
    fm.art.hue in SCHEMES
      ? fm.art.hue
      : hueNames[hashCode(slug) % hueNames.length]
  const tone = fm.art.tone === 'dark' ? 'dark' : 'light'
  const candidates = SCHEMES[hue][tone]
  const scheme = candidates[hashCode(slug) % candidates.length]

  let {scene, composition} = fm.art
  if (!scene || !(composition in COMPOSITIONS) || rescene) {
    const spec = await requestScene(clients.claude, fm)
    scene = spec.scene
    composition = spec.composition
    if (!dryRun) {
      writeSceneToFrontmatter(path, scene, composition)
      const enPath = path.replace(/\.md$/, '.en.md')
      if (existsSync(enPath)) {
        writeSceneToFrontmatter(enPath, scene, composition)
      }
    }
  }
  console.log(
    `${dryRun ? 'dry  ' : 'gen  '} ${slug}  [${composition}/${hue}/${tone}]  ${scene}`,
  )
  if (dryRun) {
    return
  }

  const prompt = `Flat editorial illustration of a technical concept, drawn like a clear explanatory diagram, 16:9, clean outlines, simple shapes, subtle risograph grain. Color scheme: ${scheme}. No text, no letters, no numbers, no logos, no human faces. Composition: ${COMPOSITIONS[composition]}\n\nScene: ${scene}`
  const raw = await generateImage(clients.geminiKey, prompt)
  const hero = fm.art.hero
  const layers =
    hero && /\d/.test(hero)
      ? [{input: heroOverlay(hero, tone === 'dark'), left: 0, top: 0}]
      : []
  mkdirSync(dirname(outPath), {recursive: true})
  await sharp(raw)
    .resize(WIDTH, HEIGHT, {fit: 'cover'})
    .composite(layers)
    .webp({quality: 82})
    .toFile(outPath)
  console.log(`done  ${slug}`)
}

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const rescene = args.includes('--rescene')
  const dryRun = args.includes('--dry-run')
  const paths = args.includes('--all')
    ? sync(`${BLOG_ROOT}/posts/**/*.md`).filter((p) => !p.endsWith('.en.md'))
    : args.filter((a) => !a.startsWith('--')).map((p) => resolve(p))
  if (paths.length === 0) {
    console.error(
      'Usage: node scripts/generate-thumbnail.mjs <post-file-path>... | --all [--force] [--rescene] [--dry-run]',
    )
    process.exit(1)
  }
  const clients = {
    claude: new Anthropic({
      apiKey: loadEnv('ANTHROPIC_API_KEY'),
      defaultHeaders: {
        'anthropic-workspace-id': loadEnv('ANTHROPIC_WORKSPACE_ID'),
      },
    }),
    geminiKey: loadEnv('GEMINI_API_KEY'),
  }
  const queue = [...paths]
  const failures = []
  await Promise.all(
    Array.from({length: CONCURRENCY}, async () => {
      while (queue.length) {
        const path = queue.shift()
        try {
          await processPost(clients, path, {force, rescene, dryRun})
        } catch (err) {
          failures.push(path)
          console.error(`fail  ${path}: ${err.message}`)
        }
      }
    }),
  )
  if (failures.length) {
    console.error(`\n${failures.length} failed`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(`Failed: ${err.message}`)
  process.exit(1)
})
