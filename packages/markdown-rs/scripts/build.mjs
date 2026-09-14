// cargo 로 wasm 을 빌드해 pkg/ 에 복사한다. rust-toolchain.toml 이 wasm32 타깃을 요구한다.
import {execFileSync} from 'node:child_process'
import {copyFileSync, mkdirSync, statSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
execFileSync(
  'cargo',
  ['build', '--release', '--target', 'wasm32-unknown-unknown'],
  {
    cwd: root,
    stdio: 'inherit',
  },
)
const built = resolve(
  root,
  'target/wasm32-unknown-unknown/release/markdown_rs.wasm',
)
mkdirSync(resolve(root, 'pkg'), {recursive: true})
const out = resolve(root, 'pkg/markdown_rs.wasm')
copyFileSync(built, out)
console.log(
  `pkg/markdown_rs.wasm ${(statSync(out).size / 1024 / 1024).toFixed(2)} MB`,
)
