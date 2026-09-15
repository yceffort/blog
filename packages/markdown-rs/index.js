// @yceffort/markdown-rs: Rust(wasm) 마크다운 파이프라인의 Node 바인딩.
// wasm-bindgen 없이 최소 ABI 로 붙는다 (lib.rs 의 wasm ABI 주석 참고).
import {existsSync, readFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {WASI} from 'node:wasi'

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
    const publicDir = resolve('public')
    const wasi = new WASI({
      version: 'preview1',
      preopens: existsSync(publicDir) ? {'/public': publicDir} : {},
    })
    instance = new WebAssembly.Instance(wasmModule, wasi.getImportObject())
    wasi.initialize(instance)
  }
  return instance
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/**
 * 마크다운 본문(frontmatter 제외)을 hast 트리로 바꾼다.
 * 코드 하이라이트와 수식도 WASM에서 처리한다. 포스트 경로가 있으면 로컬 이미지도 처리한다.
 * @param {string} body
 * @param {string} [path]
 * @returns {import('hast').Root}
 */
export function renderMarkdown(body, path) {
  const exports = getInstance().exports
  const input = encoder.encode(JSON.stringify({body, path}))
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
  return result.hast
}
