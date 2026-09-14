// cargo 로 wasm 을 빌드해 pkg/ 에 복사한다. rust-toolchain.toml 이 wasm32 타깃을 요구한다.
import {execFileSync} from 'node:child_process'
import {copyFileSync, existsSync, mkdirSync, statSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
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
      CC_wasm32_wasip1: resolve(sdk, 'bin/clang'),
      AR_wasm32_wasip1: resolve(sdk, 'bin/llvm-ar'),
    },
  },
)
const built = resolve(root, 'target/wasm32-wasip1/release/markdown_rs.wasm')
mkdirSync(resolve(root, 'pkg'), {recursive: true})
const out = resolve(root, 'pkg/markdown_rs.wasm')
copyFileSync(built, out)
console.log(
  `pkg/markdown_rs.wasm ${(statSync(out).size / 1024 / 1024).toFixed(2)} MB`,
)
