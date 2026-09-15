import {readFileSync} from 'node:fs'
import {join} from 'node:path'

// 교체 전 JS 파이프라인(next-mdx-remote-client 설정과 동일)을 그대로 돌려
// 중간 산출물(mdast, hast)을 뽑는다. Rust 구현의 parity 기준.
import {createProcessor} from '@mdx-js/mdx'
import frontMatter from 'front-matter'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeKatex from 'rehype-katex'
import prism from 'rehype-prism-plus'
import rehypeSlug from 'rehype-slug'
import remarkCjkFriendly from 'remark-cjk-friendly'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkToc from 'remark-toc'
import sharp from 'sharp'
import {visit} from 'unist-util-visit'
import {VFile} from 'vfile'

// apps/blog/src/utils/Markdown.ts 에 있던 플러그인 (Rust 로 옮기기 전 원본).
export function extractCodeFilename() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'pre' || !parent || typeof index !== 'number') return
      const codeElement = node.children.find(
        (child) => child.type === 'element' && child.tagName === 'code',
      )
      if (!codeElement) return
      const className = codeElement.properties?.className
      if (!Array.isArray(className)) return
      const langClass = className.find(
        (c) => typeof c === 'string' && c.startsWith('language-'),
      )
      if (typeof langClass !== 'string') return
      const match = langClass.match(/^language-(\w+):(.+)$/)
      if (match) {
        const [, lang, filename] = match
        codeElement.properties.className = [`language-${lang}`]
        codeElement.properties['data-filename'] = filename
      }
    })
  }
}

// katex 없이 비교할 때 수식 노드를 자리표시자로 바꿔 prism 이 건드리지 않게 한다.
// Rust 출력은 normalizeHast가 같은 모양으로 맞춘다.
function mathStub() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      const classes = node.properties?.className
      if (
        !Array.isArray(classes) ||
        !classes.includes('language-math') ||
        !parent
      )
        return
      const value = node.children.map((c) => c.value ?? '').join('')
      const display = classes.includes('math-display')
      const stub = {
        type: 'element',
        tagName: 'math-stub',
        properties: {display},
        children: [{type: 'text', value}],
      }
      if (display && parent.tagName === 'pre') {
        return
      }
      parent.children[index] = stub
    })
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'pre' || !parent) return
      const code = node.children[0]
      if (
        node.children.length === 1 &&
        code?.properties?.className?.includes?.('language-math')
      ) {
        const value = code.children.map((c) => c.value ?? '').join('')
        parent.children[index] = {
          type: 'element',
          tagName: 'math-stub',
          properties: {display: true},
          children: [{type: 'text', value}],
        }
      }
    })
  }
}

// apps/blog/src/utils/imageMetadata.ts 에 있던 플러그인 (b536d191 의 alt 수정 반영).
// Rust 의 src/images.rs 가 대체한 단계이므로 parity 기준에 반드시 있어야 한다.
export function imageMetadata({publicDir}) {
  return async (tree, file) => {
    const postPath = file.path ?? ''
    const start = postPath.indexOf('/posts')
    const end = postPath.lastIndexOf('/')
    if (start === -1 || end === -1) return
    const segments = postPath.slice(start + '/posts'.length, end).split('/')
    const directory =
      segments.length > 2
        ? [segments[1], segments[2]].join('/')
        : postPath.slice(start + '/posts'.length, end)
    const nodes = []
    visit(tree, 'element', (node) => {
      if (node.tagName === 'img' && typeof node.properties?.src === 'string') {
        nodes.push(node)
      }
    })
    for (const node of nodes) {
      const {src} = node.properties
      if (!src || src.startsWith('http')) continue
      const url = `/${directory}/${src.slice(src.indexOf('/') + 1)}`
      try {
        const {width, height} = await sharp(
          readFileSync(join(publicDir, url)),
        ).metadata()
        if (width && height) {
          node.properties.width = width
          node.properties.height = height
        }
      } catch {
        // 원본과 같이 읽기 실패는 무시한다.
      }
      if (!node.properties.alt) {
        node.properties.alt = src
      }
      node.properties.src = url
    }
  }
}

function capture(key) {
  return () => (tree, file) => {
    file.data[key] = structuredClone(tree)
  }
}

export function stripPositions(node) {
  if (Array.isArray(node)) return node.map(stripPositions)
  if (node && typeof node === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(node)) {
      if (k === 'position') continue
      out[k] = stripPositions(v)
    }
    return out
  }
  return node
}

export function normalizeHast(node) {
  if (Array.isArray(node)) {
    return node
      .filter(
        (n) =>
          !(
            n?.type?.startsWith('mdx') &&
            n.type.endsWith('Expression') &&
            n.value.trim() === ''
          ),
      )
      .map(normalizeHast)
  }
  if (!node || typeof node !== 'object') return node
  // MDX 속성 표현식: Rust는 리터럴로 평가해 둔다. JS 쪽도 같은 모양으로 맞춘다.
  if (node.type === 'mdxJsxAttributeValueExpression') {
    try {
      return JSON.parse(node.value)
    } catch {
      return node.value
    }
  }
  const out = {}
  for (const [k, v] of Object.entries(node)) {
    if (k === 'position') continue
    if (k === 'data' && node.type?.startsWith('mdx')) continue
    out[k] = normalizeHast(v)
  }
  return out
}

function createPipeline({katex = true, publicDir} = {}) {
  return createProcessor({
    remarkPlugins: [
      remarkMath,
      remarkToc,
      remarkGfm,
      remarkCjkFriendly,
      capture('mdast'),
    ],
    rehypePlugins: [
      capture('hast0'),
      katex ? rehypeKatex : mathStub,
      rehypeSlug,
      extractCodeFilename,
      capture('hast1'),
      [prism, {showLineNumbers: true}],
      rehypeAutolinkHeadings,
      ...(publicDir ? [[imageMetadata, {publicDir}]] : []),
      capture('hast2'),
    ],
  })
}

const pipelines = new Map()

/** @returns {Promise<{mdast, hast0, hast1, hast2, error?}>} */
export async function runJsPipeline(body, path = 'post.md', options = {}) {
  const key = JSON.stringify(options)
  if (!pipelines.has(key)) pipelines.set(key, createPipeline(options))
  const file = new VFile({value: body, path})
  try {
    await pipelines.get(key).process(file)
  } catch (error) {
    return {error: String(error.reason ?? error.message), ...file.data}
  }
  return file.data
}

export function splitFrontMatter(raw) {
  return frontMatter(raw).body
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [, , target, key = 'hast2'] = process.argv
  const body = splitFrontMatter(readFileSync(target, 'utf8'))
  const data = await runJsPipeline(body, target)
  if (data.error) console.error('ERROR', data.error)
  console.log(JSON.stringify(stripPositions(data[key]), null, 1))
}
