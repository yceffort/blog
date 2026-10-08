/**
 * unDraw 일러스트로 포스트와 시리즈 썸네일을 만든다. 동작은 packages/shared/scripts/undraw-thumbnail.mjs 참고.
 *
 * Usage:
 *   node scripts/generate-undraw-thumbnail.mjs <post-or-series-file-path>... [--force]
 *   node scripts/generate-undraw-thumbnail.mjs --all [--force]
 *
 * --force  frontmatter의 undraw 이름을 무시하고 다시 고른다
 * 키: .env.local의 ANTHROPIC_API_KEY, ANTHROPIC_WORKSPACE_ID
 */
import {dirname, resolve} from 'node:path'

import {generateUndrawThumbnails} from '@yceffort/shared/scripts/undraw-thumbnail'
import {sync} from 'glob'

const BLOG_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..')
const args = process.argv.slice(2)

generateUndrawThumbnails({
  files: args.includes('--all')
    ? sync(`${BLOG_ROOT}/posts/**/*.md`, {ignore: '**/*.en.md'})
    : args.filter((a) => !a.startsWith('--')).map((p) => resolve(p)),
  force: args.includes('--force'),
  usage:
    'Usage: node scripts/generate-undraw-thumbnail.mjs <post-file-path>... | --all [--force]',
  envPaths: [resolve(BLOG_ROOT, '.env.local')],
  thumbDir: resolve(BLOG_ROOT, 'public/thumbnails'),
  slugOf: (path) =>
    path
      .replace(/^.*\/(posts|series)\//, (_, dir) =>
        dir === 'series' ? 'series/' : '',
      )
      .replace(/\.md$/, ''),
  translationsOf: (path) => [path.replace(/\.md$/, '.en.md')],
  wording: {subject: '블로그 글', noun: '글'},
}).catch((err) => {
  console.error(err)
  process.exit(1)
})
