#!/usr/bin/env node

/**
 * 포스트에서 의도대로 렌더링되지 않는 마크다운을 잡는 lint 스크립트
 *
 * Usage:
 *   node scripts/check-markdown.mjs [file...]   인자가 없으면 posts와 series 전체
 *   node scripts/check-markdown.mjs --quiet     경고는 건수만 요약하고 오류만 출력
 *
 * 검사는 두 등급이다.
 * - error: 빌드가 깨지거나, 렌더가 틀리거나, 링크가 죽는 것. exit code 1.
 * - warn:  고쳐두면 좋지만 기존 글에 이미 많은 것. exit code에 영향 없음.
 *
 * 링크와 시리즈 검증은 저장소 전체를 알아야 하므로, 인자로 파일을 넘겨도
 * 목록 자체는 항상 전부 읽고 리포트만 넘긴 파일로 좁힌다.
 */

import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs'
import {basename, dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import frontMatter from 'front-matter'
import GithubSlugger, {slug as slugify} from 'github-slugger'
import remarkCjkFriendly from 'remark-cjk-friendly'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import {unified} from 'unified'

const BLOG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const POSTS_DIR = join(BLOG_DIR, 'posts')
const SERIES_DIR = join(BLOG_DIR, 'series')
const PUBLIC_DIR = join(BLOG_DIR, 'public')
// research 슬라이드는 marp로 렌더되어 파이프라인이 다르다. slide 필드 대조용으로만 읽는다.
const SLIDES_DIR = resolve(BLOG_DIR, '../research/research')

const REQUIRED_POST_FIELDS = [
  'title',
  'tags',
  'published',
  'date',
  'description',
]

function* walkFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      yield* walkFiles(path)
    } else if (/\.mdx?$/.test(name)) {
      yield path
    }
  }
}

function* walkNodes(node) {
  yield node
  // 코드 안쪽 내용은 검사하지 않는다. 노드 자체는 언어 태그를 보려고 넘긴다.
  if (node.type === 'code' || node.type === 'inlineCode') {
    return
  }
  for (const child of node.children ?? []) {
    yield* walkNodes(child)
  }
}

function textOf(node) {
  return node.value ?? (node.children ?? []).map(textOf).join('')
}

/** posts/2026/08/foo.md -> 2026/08/foo. postPaths.ts의 pathToSlug와 같은 규칙이다. */
function pathToSlug(file) {
  return file
    .slice(POSTS_DIR.length + 1)
    .replace(/\.en\.mdx?$/, '')
    .replace(/\.mdx?$/, '')
}

/** imageMetadata.ts가 상대 경로를 public 아래 어디로 바꾸는지 그대로 재현한다. */
function toPublicPath(postPath, src) {
  const dir = postPath.slice(
    postPath.indexOf('/posts') + '/posts'.length,
    postPath.lastIndexOf('/'),
  )
  const parts = dir.split('/')
  const imgDir = parts.length > 2 ? [parts[1], parts[2]].join('/') : dir
  return `/${imgDir}/${src.slice(src.indexOf('/') + 1)}`
}

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkCjkFriendly)
// MDXRemote가 md를 MDX로 읽으므로 파싱 가능 여부는 실제 remark 플러그인 구성 그대로 본다.
const mdxParser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkMdx)

const postFiles = [...walkFiles(POSTS_DIR)]
const seriesFiles = readdirSync(SERIES_DIR)
  .filter((name) => name.endsWith('.md'))
  .map((name) => join(SERIES_DIR, name))

const postSlugs = new Set(postFiles.map(pathToSlug))
const seriesSlugs = new Set(seriesFiles.map((file) => basename(file, '.md')))
const seriesNames = new Set(
  seriesFiles.map(
    (file) => frontMatter(readFileSync(file, 'utf8')).attributes.name,
  ),
)
const slideSlugs = new Set(
  existsSync(SLIDES_DIR)
    ? readdirSync(SLIDES_DIR)
        .filter((name) => name.endsWith('.md'))
        .map((name) => basename(name, '.md'))
    : [],
)

function checkFrontMatter(file, attributes, report) {
  const isSeries = file.startsWith(SERIES_DIR)

  if (isSeries) {
    for (const field of ['name', 'description']) {
      if (!attributes[field]) {
        report('error', 0, `시리즈 frontmatter에 ${field}가 없다`)
      }
    }
    return
  }

  for (const field of REQUIRED_POST_FIELDS) {
    if (attributes[field] === undefined) {
      report('error', 0, `frontmatter에 ${field}가 없다`)
    }
  }

  // Post.ts가 new Date(date).toISOString()을 무조건 호출하므로 파싱에 실패하면 빌드가 죽는다.
  if (attributes.date !== undefined) {
    const date = new Date(attributes.date)
    if (Number.isNaN(date.getTime())) {
      report('error', 0, `date를 파싱할 수 없다: ${attributes.date}`)
    } else {
      // Post.ts가 toISOString()으로 UTC 날짜를 쓰므로 여기도 UTC로 읽는다.
      // 로컬 시간대로 읽으면 같은 글이 KST와 CI에서 다른 달로 떨어진다.
      const pathYearMonth = file.slice(POSTS_DIR.length + 1).slice(0, 7)
      const dateYearMonth = date.toISOString().slice(0, 7).replace('-', '/')
      if (
        /^\d{4}\/\d{2}$/.test(pathYearMonth) &&
        pathYearMonth !== dateYearMonth
      ) {
        report(
          'warn',
          0,
          `date(${dateYearMonth})가 경로(${pathYearMonth})와 다르다`,
        )
      }
    }
  }

  if (attributes.tags !== undefined && !Array.isArray(attributes.tags)) {
    report('error', 0, 'tags가 배열이 아니다')
  }

  // 시리즈명이 어긋나면 Series.ts가 조용히 그 글을 시리즈에서 빼버린다.
  // 번역본은 영문 시리즈명을 쓰고 /en/series 라우트가 없으므로 원문만 대조한다.
  if (attributes.series) {
    if (!/\.en\.mdx?$/.test(file) && !seriesNames.has(attributes.series)) {
      report('error', 0, `series/*.md에 없는 시리즈다: ${attributes.series}`)
    }
    if (attributes.seriesOrder === undefined) {
      report('error', 0, 'series를 쓰면 seriesOrder도 있어야 한다')
    }
  }

  if (attributes.slide && !slideSlugs.has(attributes.slide)) {
    report('error', 0, `research에 없는 슬라이드다: ${attributes.slide}`)
  }
}

function checkBody(file, body, tree, report) {
  const isPost = file.startsWith(POSTS_DIR)
  const slugger = new GithubSlugger()
  const headingSlugs = new Set()
  const seenHeadings = new Set()

  for (const node of walkNodes(tree)) {
    if (node.type !== 'heading') {
      continue
    }
    const text = textOf(node)
    headingSlugs.add(slugger.slug(text))
    // rehype-slug이 중복 제목에 -1을 붙여 앵커가 흔들린다.
    if (seenHeadings.has(slugify(text))) {
      report(
        'warn',
        node.position.start.line,
        `제목이 중복된다: "${text.slice(0, 40)}"`,
      )
    }
    seenHeadings.add(slugify(text))
  }

  for (const node of walkNodes(tree)) {
    if (!node.position) {
      continue
    }
    const line = node.position.start.line

    if (node.type === 'delete') {
      // "0~~9", "10~~30개"처럼 범위 표기로 쓴 물결이 취소선으로 파싱되는 실수.
      // 의도적인 취소선(~~농담~~)은 구분자 밖이 공백이라 걸리지 않는다.
      const before = body[node.position.start.offset - 1] ?? ' '
      const after = body[node.position.end.offset] ?? ' '
      if (!/\s/.test(before) && !/\s/.test(after)) {
        report(
          'error',
          line,
          `의도치 않은 취소선: "${textOf(node).slice(0, 60).replace(/\n/g, ' ')}" (범위 표기라면 \\~ 로 이스케이프할 것)`,
        )
      }
    }

    // 파싱 후에도 text 노드에 리터럴 ** 나 ~~ 가 남아 있으면 구분자 짝이 맞지 않아
    // 본문에 그대로 노출된다는 뜻이다. 한글 조사 인접 케이스는 remark-cjk-friendly가
    // 구제하므로 여기까지 걸리는 것은 진짜 오타다.
    if (
      node.type === 'text' &&
      (node.value.includes('**') || node.value.includes('~~'))
    ) {
      const source = body.slice(
        node.position.start.offset,
        node.position.end.offset,
      )
      const leftover = source.match(/(?<!\\)(\*\*|~~)/)
      if (leftover) {
        report(
          'error',
          line,
          `파싱되지 않은 강조: "${node.value.slice(0, 60).replace(/\n/g, ' ')}" (${leftover[1]} 짝이 맞는지 확인할 것)`,
        )
      }
    }

    if (node.type === 'code' && !node.lang) {
      report('warn', line, '코드 블록에 언어가 없어 하이라이팅되지 않는다')
    }

    if (node.type === 'table') {
      const columns = node.children[0]?.children.length ?? 0
      const broken = node.children.find(
        (row) => row.children.length !== columns,
      )
      if (broken) {
        report(
          'error',
          broken.position.start.line,
          `표의 열 수가 어긋난다 (${broken.children.length}칸, 머리글은 ${columns}칸)`,
        )
      }
    }

    if (node.type === 'image' && isPost && !/^https?:/.test(node.url)) {
      const publicPath = toPublicPath(file, node.url)
      if (!existsSync(join(PUBLIC_DIR, publicPath))) {
        report(
          'error',
          line,
          `이미지가 public에 없다: ${node.url} -> public${publicPath}`,
        )
      }
    }

    if (node.type === 'link') {
      const url = node.url ?? ''
      if (url === '') {
        report('error', line, '링크 주소가 비어 있다')
      } else if (url.startsWith('#')) {
        if (!headingSlugs.has(decodeURIComponent(url.slice(1)))) {
          report('error', line, `이 글에 없는 제목을 가리킨다: ${url}`)
        }
      } else if (/^\/(?:en\/)?\d{4}\//.test(url)) {
        const target = url
          .replace(/^\/(?:en\/)?/, '')
          .replace(/[#?].*$/, '')
          .replace(/\/$/, '')
        if (!postSlugs.has(target)) {
          report('error', line, `없는 글을 가리킨다: ${url}`)
        }
      } else if (url.startsWith('/series/')) {
        const target = url.replace('/series/', '').replace(/[#?/].*$/, '')
        if (!seriesSlugs.has(target)) {
          report('error', line, `없는 시리즈를 가리킨다: ${url}`)
        }
      } else if (url.startsWith('http://')) {
        report('warn', line, `https가 아닌 링크다: ${url}`)
      }
    }
  }
}

function checkFile(file) {
  const raw = readFileSync(file, 'utf8')
  const {attributes, body} = frontMatter(raw)
  const lineOffset = raw.split('\n').length - body.split('\n').length

  const found = []
  const report = (severity, line, message) => {
    found.push({severity, line: line ? line + lineOffset : 1, message})
  }

  checkFrontMatter(file, attributes, report)

  // MDXRemote가 md를 MDX로 파싱하므로 본문의 { 나 < 하나가 빌드를 통째로 깨뜨린다.
  try {
    mdxParser.parse(body)
  } catch (error) {
    const line = (error.line ?? 1) + lineOffset
    found.push({
      severity: 'error',
      line,
      message: `MDX로 파싱할 수 없다: ${error.reason ?? error.message}`,
    })
  }

  checkBody(file, body, parser.parse(body), report)

  return found.toSorted((a, b) => a.line - b.line)
}

const args = process.argv.slice(2)
const quiet = args.includes('--quiet')
const targets = args.filter((arg) => /\.mdx?$/.test(arg))
// posts와 series만 이 파이프라인으로 렌더된다. README 같은 문서는 검사 대상이 아니다.
const files = targets.length
  ? targets
      .map((file) => resolve(file))
      .filter(
        (file) => file.startsWith(POSTS_DIR) || file.startsWith(SERIES_DIR),
      )
  : [...postFiles, ...seriesFiles]

let errorCount = 0
let warnCount = 0

for (const file of files) {
  for (const {severity, line, message} of checkFile(file)) {
    if (severity === 'error') {
      errorCount += 1
      console.error(`${file}:${line} ${message}`)
    } else {
      warnCount += 1
      if (!quiet) {
        console.warn(`${file}:${line} [warn] ${message}`)
      }
    }
  }
}

if (quiet && warnCount > 0) {
  console.warn(`경고 ${warnCount}건 (--quiet 없이 실행하면 전부 출력된다)`)
}

process.exit(errorCount > 0 ? 1 : 0)
