// cargo 로 wasm 을 빌드한다. 커밋 대상인 pkg/ 에 쓰는 것은 MARKDOWN_RS_WRITE_PKG=1
// 일 때뿐이다. 커밋된 바이너리는 Linux CI 산출물이므로 다른 플랫폼에서 덮어쓰면
// 소스를 고치지 않아도 워킹트리가 더러워진다. rust-toolchain.toml 이 wasm32 타깃을 요구한다.
import {execFileSync} from 'node:child_process'
import {copyFileSync, existsSync, mkdirSync, statSync} from 'node:fs'
import {homedir} from 'node:os'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cargoHome = resolve(
  process.env.CARGO_HOME ?? resolve(homedir(), '.cargo'),
)
const rustFlags = process.env.CARGO_ENCODED_RUSTFLAGS
  ? process.env.CARGO_ENCODED_RUSTFLAGS.split('\x1f')
  : (process.env.RUSTFLAGS ?? '').split(/\s+/).filter(Boolean)
rustFlags.push(
  `--remap-path-prefix=${cargoHome}=/cargo`,
  `--remap-path-prefix=${root}=/src/markdown-rs`,
)
const sdk =
  process.env.WASI_SDK_PATH ??
  resolve(
    root,
    '../../.cache/wasi-sdk',
    `wasi-sdk-27.0-${process.arch === 'arm64' ? 'arm64' : 'x86_64'}-${process.platform === 'darwin' ? 'macos' : process.platform}`,
  )
if (!existsSync(resolve(sdk, 'bin/clang'))) {
  throw new Error(
    'Install wasi-sdk 27 and set WASI_SDK_PATH to its directory. See packages/markdown-rs/README.md.',
  )
}
execFileSync(
  'cargo',
  ['build', '--locked', '--release', '--target', 'wasm32-wasip1', '--lib'],
  {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      CARGO_ENCODED_RUSTFLAGS: rustFlags.join('\x1f'),
      CC_wasm32_wasip1: resolve(sdk, 'bin/clang'),
      AR_wasm32_wasip1: resolve(sdk, 'bin/llvm-ar'),
    },
  },
)
const built = resolve(root, 'target/wasm32-wasip1/release/markdown_rs.wasm')
if (process.env.MARKDOWN_RS_WRITE_PKG !== '1') {
  console.log(
    `built ${(statSync(built).size / 1024 / 1024).toFixed(2)} MB; pkg/markdown_rs.wasm left untouched (set MARKDOWN_RS_WRITE_PKG=1 to update it)`,
  )
  process.exit(0)
}
mkdirSync(resolve(root, 'pkg'), {recursive: true})
const out = resolve(root, 'pkg/markdown_rs.wasm')
copyFileSync(built, out)
console.log(
  `pkg/markdown_rs.wasm ${(statSync(out).size / 1024 / 1024).toFixed(2)} MB`,
)
