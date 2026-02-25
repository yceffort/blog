#!/usr/bin/env node

/**
 * 블로그 포스트 영어 번역 스크립트
 *
 * Usage:
 *   node scripts/translate.mjs posts/2026/02/slug.md          # 단일 파일
 *   node scripts/translate.mjs --recent 10                     # 최근 10개
 *   node scripts/translate.mjs --dry-run posts/2026/02/slug.md # 미리보기
 */

import {readFileSync, writeFileSync, existsSync} from 'node:fs'
import {resolve, dirname, basename} from 'node:path'
import {sync} from 'glob'
import Anthropic from '@anthropic-ai/sdk'

const BLOG_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..')
const ENV_PATH = resolve(BLOG_ROOT, '.env.local')
const POST_PATH = resolve(BLOG_ROOT, 'posts')

function loadApiKey() {
  const env = readFileSync(ENV_PATH, 'utf-8')
  const match = env.match(/ANTHROPIC_API_KEY=(.+)/)
  if (!match) throw new Error('ANTHROPIC_API_KEY not found in .env.local')
  return match[1].trim()
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) throw new Error('No frontmatter found')
  return {raw: match[1], fullMatch: match[0], body: content.slice(match[0].length).trim()}
}

function fixFrontmatterQuotes(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return content
  const fixed = match[1].replace(
    /^(title|description):\s*'(.*)'$/gm,
    (_, key, val) => val.includes("'") ? `${key}: "${val}"` : `${key}: '${val}'`,
  )
  return content.replace(match[1], fixed)
}

function getEnPath(mdPath) {
  const ext = mdPath.endsWith('.mdx') ? '.mdx' : '.md'
  return mdPath.replace(new RegExp(`${ext.replace('.', '\\.')}$`), `.en${ext}`)
}

function getRecentPosts(count) {
  const files = sync(`${POST_PATH}/**/*.md*`)
    .filter((f) => !/\.en\.mdx?$/.test(f))
    .sort()
    .reverse()

  // Parse and sort by date
  const posts = files.map((f) => {
    const content = readFileSync(f, 'utf-8')
    const match = content.match(/^---\n([\s\S]*?)\n---/)
    const dateMatch = match?.[1].match(/^date:\s*['"]?(.+?)['"]?\s*$/m)
    return {path: f, date: dateMatch?.[1] || ''}
  })

  posts.sort((a, b) => b.date.localeCompare(a.date))

  return posts.slice(0, count).map((p) => p.path)
}

const TRANSLATE_RULES = `Rules:
- NEVER translate code blocks (fenced with \`\`\` or indented) or inline code (wrapped in \`)
- NEVER translate or modify URLs, image paths, or HTML tags
- Keep technical terms in their original English form (e.g., React, Virtual DOM, SSR)
- Preserve the exact markdown structure: headings, lists, links, images, footnotes, etc.
- Write natural, idiomatic English — not literal word-for-word translation
- Maintain the author's tone and style
- For Korean-specific cultural references, add brief context if needed
- Return ONLY the translated content. No additional commentary.`

const CHAR_LIMIT = 12000

function splitIntoChunks(content) {
  const {fullMatch, body} = parseFrontmatter(content)
  const sections = body.split(/(?=^## )/m)

  const chunks = []
  let current = ''

  for (const section of sections) {
    if (current.length + section.length > CHAR_LIMIT && current.length > 0) {
      chunks.push(current)
      current = section
    } else {
      current += section
    }
  }
  if (current) chunks.push(current)

  // Prepend frontmatter to first chunk
  chunks[0] = fullMatch + '\n\n' + chunks[0]
  return chunks
}

async function callTranslate(client, prompt) {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16384,
    messages: [{role: 'user', content: prompt}],
  })
  return msg.content[0].text.trim()
}

async function translatePost(apiKey, content) {
  const client = new Anthropic({apiKey})

  // Short posts: single request
  if (content.length <= CHAR_LIMIT) {
    return callTranslate(
      client,
      `You are a professional translator specializing in frontend/web development technical blogs. Translate this Korean blog post into natural, fluent English.

${TRANSLATE_RULES}
- In the frontmatter (between ---), translate ONLY the "title" and "description" fields. Keep everything else exactly as-is.

---

${content}`,
    )
  }

  // Long posts: chunk by ## headings
  const chunks = splitIntoChunks(content)
  console.log(`  Splitting into ${chunks.length} chunks`)

  const results = []
  for (let i = 0; i < chunks.length; i++) {
    console.log(`  Translating chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`)
    const isFirst = i === 0
    const prompt = isFirst
      ? `You are a professional translator specializing in frontend/web development technical blogs. Translate this Korean blog post section into natural, fluent English.

${TRANSLATE_RULES}
- In the frontmatter (between ---), translate ONLY the "title" and "description" fields. Keep everything else exactly as-is.
- This is part 1 of a multi-part translation. Translate completely up to the end.

---

${chunks[i]}`
      : `Continue translating the next section of the same Korean technical blog post into English.

${TRANSLATE_RULES}

---

${chunks[i]}`

    results.push(await callTranslate(client, prompt))
  }

  // First result includes frontmatter, rest are body continuations
  return results.join('\n\n')
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const recentIdx = args.indexOf('--recent')
  const force = args.includes('--force')

  let files = []

  if (recentIdx !== -1) {
    const count = parseInt(args[recentIdx + 1]) || 10
    files = getRecentPosts(count)
    console.log(`Found ${files.length} recent posts`)
  } else {
    const filePath = args.find((a) => !a.startsWith('--'))
    if (!filePath) {
      console.error(
        'Usage:\n' +
          '  node scripts/translate.mjs <post-file-path>\n' +
          '  node scripts/translate.mjs --recent 10\n' +
          '  node scripts/translate.mjs --dry-run <post-file-path>\n' +
          '  node scripts/translate.mjs --force <post-file-path>',
      )
      process.exit(1)
    }
    files = [resolve(filePath)]
  }

  const apiKey = loadApiKey()

  for (const file of files) {
    const enPath = getEnPath(file)

    if (existsSync(enPath) && !force) {
      console.log(`Skip (already exists): ${basename(enPath)}`)
      continue
    }

    console.log(`Translating: ${file}`)
    const content = readFileSync(file, 'utf-8')

    const translated = await translatePost(apiKey, content)

    if (dryRun) {
      console.log('--- Translated preview ---')
      console.log(translated.slice(0, 500))
      console.log('...')
      continue
    }

    writeFileSync(enPath, fixFrontmatterQuotes(translated))
    console.log(`Written: ${enPath}`)
  }

  console.log('Done.')
}

main().catch((err) => {
  console.error(`Failed: ${err.message}`)
  process.exit(1)
})
