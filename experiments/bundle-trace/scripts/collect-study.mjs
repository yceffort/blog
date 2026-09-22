import {execFileSync} from 'node:child_process'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
for (const [variant, name, scenario, extra] of [
  ['baseline', 'initial', 'initial', []],
  ['baseline', 'no-prefetch', 'initial', ['--block-prefetch']],
  ['baseline', 'about', 'about', []],
  ['baseline', 'search', 'search', []],
  ['lazy', 'initial', 'initial', []],
  ['lazy', 'search', 'search', []],
]) {
  execFileSync(
    process.execPath,
    [
      resolve(root, 'scripts/collect.mjs'),
      '--url',
      `http://localhost:${variant === 'baseline' ? 4317 : 4318}`,
      '--dir',
      resolve(
        root,
        `../../.cache/bundle-trace-study/app/.next/${variant}/static`,
      ),
      '--out',
      resolve(root, `artifacts/study/${variant}-${name}.coverage.json`),
      '--scenario',
      scenario,
      ...extra,
    ],
    {stdio: 'inherit'},
  )
}
