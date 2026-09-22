// Build variants use one copied source path, identical dependencies and inputs.
// The user's running app and its build outputs are not modified.
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {cp, mkdir, readFile, symlink, writeFile} from 'node:fs/promises'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const app = join(root, '.cache/bundle-trace-study/app')
await mkdir(app, {recursive: true})
for (const path of [
  'src',
  'posts',
  'series',
  'scripts',
  'package.json',
  'tsconfig.json',
  '.babelrc.json',
  'postcss.config.js',
  'next.config.ts',
]) {
  await cp(join(root, 'apps/blog', path), join(app, path), {
    recursive: true,
    preserveTimestamps: true,
  })
}
for (const path of ['node_modules', 'public']) {
  try {
    await symlink(join(root, 'apps/blog', path), join(app, path), 'dir')
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
  }
}
const configPath = join(app, 'next.config.ts')
const config = await readFile(configPath, 'utf8')
assert(config.includes("distDir: '.next/bundle-trace'"))
await writeFile(
  configPath,
  config.replace(
    "distDir: '.next/bundle-trace'",
    "distDir: `.next/${process.env.BUNDLE_TRACE_VARIANT ?? 'baseline'}`",
  ),
)
const component = join(app, 'src/components/search/SiteSearch.tsx')
const baseline = await readFile(component, 'utf8')
const oldFetch = `const res = await fetch(
        locale === 'en' ? '/api/search-index/en' : '/api/search-index',
      )`
assert(baseline.includes(oldFetch))
const lazy = baseline
  .replace(
    "import MiniSearch from 'minisearch'",
    "import type MiniSearch from 'minisearch'",
  )
  .replace(
    oldFetch,
    `const [{default: MiniSearch}, res] = await Promise.all([
        import('minisearch'),
        fetch(locale === 'en' ? '/api/search-index/en' : '/api/search-index'),
      ])`,
  )
assert.notEqual(lazy, baseline)
const env = {
  ...process.env,
  BUNDLE_TRACE: '1',
  GA4_PROPERTY_ID: '',
  GOOGLE_APPLICATION_CREDENTIALS_JSON: '',
}
const next = join(root, 'apps/blog/node_modules/next/dist/bin/next')
const artifacts = join(root, 'experiments/bundle-trace/artifacts/study')
await mkdir(artifacts, {recursive: true})
for (const [variant, source] of [
  ['baseline', baseline],
  ['lazy', lazy],
]) {
  await writeFile(component, source)
  await writeFile(join(artifacts, `SiteSearch.${variant}.tsx`), source)
  console.log(`Building ${variant} at the same source path`)
  execFileSync(process.execPath, [next, 'build'], {
    cwd: app,
    env: {...env, BUNDLE_TRACE_VARIANT: variant},
    stdio: 'inherit',
  })
}
await writeFile(
  join(artifacts, 'build-inputs.json'),
  JSON.stringify(
    {
      preparedAt: new Date().toISOString(),
      node: process.version,
      sourcePath: '.cache/bundle-trace-study/app',
      changes:
        'MiniSearch value import becomes type-only; dynamic import runs concurrently with index fetch',
      componentHashes: Object.fromEntries(
        [
          ['baseline', baseline],
          ['lazy', lazy],
        ].map(([name, source]) => [
          name,
          createHash('sha256').update(source).digest('hex'),
        ]),
      ),
      productionSourceUnchanged:
        (await readFile(
          join(root, 'apps/blog/src/components/search/SiteSearch.tsx'),
          'utf8',
        )) === baseline,
    },
    null,
    2,
  ) + '\n',
)
