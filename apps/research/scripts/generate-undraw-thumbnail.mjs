/**
 * unDraw 일러스트로 슬라이드 덱 OG 썸네일을 만든다. 동작은 packages/shared/scripts/undraw-thumbnail.mjs 참고.
 *
 * Usage:
 *   node scripts/generate-undraw-thumbnail.mjs <deck-file-path>... [--force]
 *   node scripts/generate-undraw-thumbnail.mjs --all [--force]
 *
 * --force  frontmatter의 undraw 이름을 무시하고 다시 고른다
 * 키: ANTHROPIC_API_KEY, ANTHROPIC_WORKSPACE_ID (apps/research/.env.local에 없으면 apps/blog/.env.local)
 */
import {readdirSync} from 'node:fs'
import {dirname, resolve} from 'node:path'

import {generateUndrawThumbnails} from '@yceffort/shared/scripts/undraw-thumbnail'

const APP_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..')
const DECK_DIR = resolve(APP_ROOT, 'research')
const args = process.argv.slice(2)

generateUndrawThumbnails({
  files: args.includes('--all')
    ? readdirSync(DECK_DIR)
        .filter((f) => f.endsWith('.md'))
        .map((f) => resolve(DECK_DIR, f))
    : args.filter((a) => !a.startsWith('--')).map((p) => resolve(p)),
  force: args.includes('--force'),
  usage:
    'Usage: node scripts/generate-undraw-thumbnail.mjs <deck-file-path>... | --all [--force]',
  envPaths: [
    resolve(APP_ROOT, '.env.local'),
    resolve(APP_ROOT, '../blog/.env.local'),
  ],
  thumbDir: resolve(APP_ROOT, 'public/thumbnails'),
  slugOf: (path) => path.replace(/^.*\//, '').replace(/\.md$/, ''),
  wording: {subject: '발표 슬라이드 덱', noun: '덱'},
}).catch((err) => {
  console.error(err)
  process.exit(1)
})
