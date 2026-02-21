#!/usr/bin/env node

/**
 * 블로그 포스트 썸네일 생성 스크립트
 *
 * Usage:
 *   node scripts/generate-thumbnail.mjs <post-file-path> [--prompt "custom prompt"]
 *
 * .env.local에서 GEMINI_API_KEY를 읽어 Gemini API로 이미지를 생성하고,
 * 포스트 슬러그 기반 컨벤션 경로(public/thumbnails/{year}/{month}/{slug}.png)에 저장한다.
 * 빌드 시 Post.ts가 파일 존재 여부로 자동 매칭하므로 frontmatter 수정은 불필요.
 */

import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs'
import {resolve, basename, dirname, relative} from 'node:path'

const BLOG_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..')
const POSTS_DIR = resolve(BLOG_ROOT, 'posts')
const THUMB_BASE = resolve(BLOG_ROOT, 'public/thumbnails')
const ENV_PATH = resolve(BLOG_ROOT, '../../.env.local')

const MODEL = 'gemini-2.5-flash-image'
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

function loadApiKey() {
  const env = readFileSync(ENV_PATH, 'utf-8')
  const match = env.match(/GEMINI_API_KEY=(.+)/)
  if (!match) throw new Error('GEMINI_API_KEY not found in .env.local')
  return match[1].trim()
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) throw new Error('No frontmatter found')
  const raw = match[1]
  const get = (key) => {
    const m = raw.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
    return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null
  }
  return {raw, fullMatch: match[0], title: get('title'), date: get('date'), description: get('description'), thumbnail: get('thumbnail')}
}

function buildPrompt(title, description) {
  return [
    'Generate a 1200x630 landscape wide thumbnail image.',
    'Dark background (#0c0c14).',
    `The image should visually represent the concept of: "${title}".`,
    description ? `Context: "${description}".` : '',
    'Use abstract, geometric, or symbolic elements. Indigo (#6366f1) as primary accent with complementary tones.',
    'Minimal, clean, abstract tech aesthetic.',
    'Absolutely NO text, NO letters, NO words, NO labels, NO numbers anywhere in the image.',
  ]
    .filter(Boolean)
    .join(' ')
}

async function generateImage(apiKey, prompt) {
  const res = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      contents: [{parts: [{text: prompt}]}],
      generationConfig: {responseModalities: ['TEXT', 'IMAGE']},
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Gemini API error: ${err.error?.message || res.statusText}`)
  }

  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts || []
  const imagePart = parts.find((p) => p.inlineData)
  if (!imagePart) throw new Error('No image returned from Gemini')

  return Buffer.from(imagePart.inlineData.data, 'base64')
}

function main() {
  const args = process.argv.slice(2)
  const postPath = args.find((a) => !a.startsWith('--'))
  const customPrompt = args.includes('--prompt') ? args[args.indexOf('--prompt') + 1] : null

  if (!postPath) {
    console.error('Usage: node scripts/generate-thumbnail.mjs <post-file-path> [--prompt "..."]')
    process.exit(1)
  }

  const absPath = resolve(postPath)
  if (!existsSync(absPath)) {
    console.error(`File not found: ${absPath}`)
    process.exit(1)
  }

  const content = readFileSync(absPath, 'utf-8')
  const fm = parseFrontmatter(content)

  // Derive slug from file path relative to posts dir (e.g. 2025/12/nextjs-caching-deep-dive)
  const slug = relative(POSTS_DIR, absPath).replace(/\.mdx?$/, '')
  const thumbFile = resolve(THUMB_BASE, `${slug}.png`)
  const thumbDir = dirname(thumbFile)

  if (existsSync(thumbFile) && !args.includes('--force')) {
    console.log(`Already exists: ${thumbFile}`)
    console.log('Use --force to regenerate')
    process.exit(0)
  }

  mkdirSync(thumbDir, {recursive: true})

  const apiKey = loadApiKey()
  const prompt = customPrompt || buildPrompt(fm.title, fm.description)

  console.log(`Post: ${fm.title}`)
  console.log(`Slug: ${slug}`)
  console.log(`Prompt: ${prompt.slice(0, 120)}...`)
  console.log('Generating...')

  generateImage(apiKey, prompt)
    .then((buf) => {
      writeFileSync(thumbFile, buf)
      console.log(`Saved: ${thumbFile} (${buf.length} bytes)`)
    })
    .catch((err) => {
      console.error(`Failed: ${err.message}`)
      process.exit(1)
    })
}

main()
