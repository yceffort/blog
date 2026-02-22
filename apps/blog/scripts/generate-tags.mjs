#!/usr/bin/env node

/**
 * 블로그 포스트 태그 자동 생성 스크립트
 *
 * Usage:
 *   node scripts/generate-tags.mjs <post-file-path>
 *
 * .env.local에서 ANTHROPIC_API_KEY를 읽어 Claude API로 포스트를 분석하고,
 * frontmatter의 tags 필드를 자동 생성/업데이트한다.
 */

import {readFileSync, writeFileSync} from 'node:fs'
import {resolve, dirname} from 'node:path'
import Anthropic from '@anthropic-ai/sdk'

const BLOG_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..')
const ENV_PATH = resolve(BLOG_ROOT, '.env.local')

function loadApiKey() {
  const env = readFileSync(ENV_PATH, 'utf-8')
  const match = env.match(/ANTHROPIC_API_KEY=(.+)/)
  if (!match) throw new Error('ANTHROPIC_API_KEY not found in .env.local')
  return match[1].trim()
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) throw new Error('No frontmatter found')
  return {raw: match[1], fullMatch: match[0]}
}

function extractExistingTags(raw) {
  const tagsMatch = raw.match(/^tags:\n((?:\s+- .+\n?)*)/m)
  if (!tagsMatch) return []
  return tagsMatch[1]
    .split('\n')
    .map((l) => l.replace(/^\s+- /, '').trim())
    .filter(Boolean)
}

async function generateTags(apiKey, content, existingTags) {
  const client = new Anthropic({apiKey})

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Analyze this blog post and generate 2-5 relevant tags.

Rules:
- Tags should be lowercase, kebab-case (e.g. "react", "web-performance", "nodejs")
- Use well-known technology names or concepts
- Be specific but not overly narrow
${existingTags.length ? `- Current tags for reference (you may keep, replace, or add): ${existingTags.join(', ')}` : ''}

Return ONLY a JSON array of strings. No explanation.

Post content:
${content.slice(0, 8000)}`,
      },
    ],
  })

  const text = msg.content[0].text.trim()
  const jsonMatch = text.match(/\[[\s\S]*?\]/)
  if (!jsonMatch) throw new Error(`Unexpected response: ${text}`)
  return JSON.parse(jsonMatch[0])
}

function updateTags(content, tags) {
  const fm = parseFrontmatter(content)
  const tagsYaml = tags.map((t) => `  - ${t}`).join('\n')

  let newRaw
  if (fm.raw.match(/^tags:/m)) {
    newRaw = fm.raw.replace(/^tags:\n((?:\s+- .+\n?)*)/m, `tags:\n${tagsYaml}\n`)
  } else {
    newRaw = fm.raw + `\ntags:\n${tagsYaml}`
  }

  return content.replace(fm.fullMatch, `---\n${newRaw}\n---`)
}

async function main() {
  const postPath = process.argv.slice(2).find((a) => !a.startsWith('--'))

  if (!postPath) {
    console.error('Usage: node scripts/generate-tags.mjs <post-file-path>')
    process.exit(1)
  }

  const absPath = resolve(postPath)
  const content = readFileSync(absPath, 'utf-8')
  const fm = parseFrontmatter(content)
  const existingTags = extractExistingTags(fm.raw)

  console.log(`Post: ${absPath}`)
  if (existingTags.length) console.log(`Existing tags: ${existingTags.join(', ')}`)
  console.log('Generating tags...')

  const apiKey = loadApiKey()
  const tags = await generateTags(apiKey, content, existingTags)

  console.log(`Generated tags: ${tags.join(', ')}`)

  if (process.argv.includes('--dry-run')) {
    console.log('(dry-run, not writing)')
    return
  }

  const updated = updateTags(content, tags)
  writeFileSync(absPath, updated)
  console.log('Tags updated in frontmatter.')
}

main().catch((err) => {
  console.error(`Failed: ${err.message}`)
  process.exit(1)
})
