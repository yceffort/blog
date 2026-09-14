// @yceffort/markdown-rs: Rust(wasm) 마크다운 파이프라인의 Node 바인딩.
// wasm-bindgen 없이 최소 ABI 로 붙는다 (lib.rs 의 wasm ABI 주석 참고).
import {readFileSync} from 'node:fs'
import {join} from 'node:path'

// Next 빌드 샌드박스는 URL 을 다른 realm 의 클래스로 바꿔 놓아 fileURLToPath 가 거부한다.
// URL 을 거치지 않고 경로 문자열만 다룬다.
const here =
  import.meta.dirname ??
  join(decodeURIComponent(import.meta.url.replace(/^file:\/\//, '')), '..')
const wasmPath = join(here, 'pkg/markdown_rs.wasm')

let instance
function getInstance() {
  if (!instance) {
    const wasmModule = new WebAssembly.Module(readFileSync(wasmPath))
    instance = new WebAssembly.Instance(wasmModule, {})
  }
  return instance
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/**
 * 마크다운 본문(frontmatter 제외)을 hast 트리로 바꾼다.
 * 코드 하이라이트, 수식, 이미지 크기는 호출한 쪽에서 rehype 플러그인으로 이어 붙인다.
 * @param {string} body
 * @returns {import('hast').Root}
 */
export function renderMarkdown(body) {
  const exports = getInstance().exports
  const input = encoder.encode(JSON.stringify({body}))
  const inputPtr = exports.alloc(input.length)
  new Uint8Array(exports.memory.buffer, inputPtr, input.length).set(input)
  let outputPtr
  try {
    outputPtr = exports.render_json_ptr(inputPtr, input.length)
  } catch (error) {
    // trap 이후의 인스턴스 상태는 믿지 않는다. 다음 호출에서 새로 만든다.
    instance = undefined
    throw error
  } finally {
    exports.dealloc(inputPtr, input.length)
  }
  // 호출 중 메모리가 늘어났을 수 있으므로 buffer 를 다시 읽는다.
  const memory = new Uint8Array(exports.memory.buffer)
  const length = new DataView(exports.memory.buffer).getUint32(outputPtr, true)
  const json = decoder.decode(
    memory.subarray(outputPtr + 4, outputPtr + 4 + length),
  )
  exports.free_result(outputPtr)
  const result = JSON.parse(json)
  if (!result.ok) {
    throw new Error(result.error)
  }
  return resolveMdx(result.hast)
}

// MDX 표현식은 JS 로 평가하지 않는다. 속성 표현식은 Rust 가 평가한 리터럴로 바꾸고
// (`height={680}` -> 680), 빈 표현식 노드(`{}`)와 주석은 지우며, 그 밖의 표현식은
// hast-util-to-jsx-runtime 이 처리할 수 없으므로 여기서 바로 실패시킨다.
function resolveMdx(node) {
  if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
    for (const attribute of node.attributes) {
      if (attribute.type === 'mdxJsxExpressionAttribute') {
        throw new Error(
          `MDX spread attribute is not supported: <${node.name} {${attribute.value}}>`,
        )
      }
      const value = attribute.value
      if (value && typeof value === 'object') {
        if (!value.data || !('literal' in value.data)) {
          throw new Error(
            `MDX attribute expression must be a literal: <${node.name} ${attribute.name}={${value.value}}>`,
          )
        }
        attribute.value = value.data.literal
      }
    }
  }
  if (node.children) {
    node.children = node.children.filter((child) => {
      if (
        child.type === 'mdxFlowExpression' ||
        child.type === 'mdxTextExpression'
      ) {
        if (child.value.trim() === '' || child.value.trim().startsWith('/*')) {
          return false
        }
        throw new Error(
          `MDX expression is not supported: {${child.value.slice(0, 80)}}`,
        )
      }
      return true
    })
    for (const child of node.children) {
      resolveMdx(child)
    }
  }
  return node
}
