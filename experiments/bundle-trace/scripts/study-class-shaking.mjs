import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdir, readFile, readdir, symlink, writeFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {runInNewContext} from 'node:vm'

import {build} from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repo = resolve(root, '../..')
const app = join(root, 'artifacts/class-shaking/app')
const requireBlog = createRequire(join(repo, 'apps/blog/package.json'))
const cases = [
  {
    name: 'named-exports',
    body: 'export function search(){return USED} export function add(){return UNUSED}',
    call: "import {search} from './library.js'; globalThis.__result = search()",
  },
  {
    name: 'class-direct',
    body: 'export class Search {search(){return USED} add(){return UNUSED}}',
    call: "import {Search} from './library.js'; globalThis.__result = new Search().search()",
  },
  {
    name: 'class-dynamic',
    body: 'export class Search {search(){return USED} add(){return UNUSED}}',
    call: "import {Search} from './library.js'; globalThis.__result = new Search()[globalThis.__method || 'search']()",
  },
  {
    name: 'class-unused',
    body: 'export function search(){return USED} export class Unused {add(){return UNUSED}}',
    call: "import {search} from './library.js'; globalThis.__result = search()",
  },
  {
    name: 'class-local',
    body: '',
    call: 'class Search {search(){return USED} add(){return UNUSED}} globalThis.__result = new Search().search()',
  },
]
await mkdir(join(app, 'app'), {recursive: true})
try {
  await symlink(
    join(repo, 'apps/blog/node_modules'),
    join(app, 'node_modules'),
    'dir',
  )
} catch (error) {
  if (error.code !== 'EEXIST') throw error
}
await writeFile(
  join(app, 'package.json'),
  JSON.stringify({name: 'bundle-trace-class-study', private: true}),
)
await writeFile(
  join(app, 'next.config.mjs'),
  `export default {turbopack: {root: ${JSON.stringify(repo)}}, productionBrowserSourceMaps: true, experimental: {cpus: 2}}`,
)
await writeFile(
  join(app, 'app/layout.jsx'),
  'export default function Layout({children}) {return <html><body>{children}</body></html>}',
)
await writeFile(
  join(app, 'app/page.jsx'),
  'export default function Page(){return <p>Class shaking experiment</p>}',
)
const results = []
for (const test of cases) {
  const directory = join(app, 'app', test.name)
  await mkdir(directory, {recursive: true})
  const marker = 'TRACE_UNUSED_' + test.name.replaceAll('-', '_')
  const replace = (text) =>
    text.replace(/\b(UNUSED|USED)\b/g, (name) =>
      JSON.stringify(name === 'UNUSED' ? marker : 'TRACE_USED_' + test.name),
    )
  const library = replace(test.body),
    entry = replace(test.call)
  await writeFile(join(directory, 'library.js'), library)
  await writeFile(join(directory, 'entry.js'), entry)
  // The same invocation is retained in a user event, outside server rendering.
  const imports = entry.match(/^import[^;]+;/)?.[0] || ''
  await writeFile(
    join(directory, 'page.jsx'),
    `'use client';\n${imports}\nexport default function Page(){return <button onClick={()=>{${entry.slice(imports.length)}}}>Run ${test.name}</button>}`,
  )
  const output = await build({
    entryPoints: [join(directory, 'entry.js')],
    bundle: true,
    minify: true,
    treeShaking: true,
    format: 'iife',
    write: false,
  })
  const generated = output.outputFiles[0].text
  const context = {}
  runInNewContext(generated, context)
  assert.equal(context.__result, 'TRACE_USED_' + test.name)
  if (test.name === 'class-dynamic') {
    const dynamic = {__method: 'add'}
    runInNewContext(generated, dynamic)
    assert.equal(dynamic.__result, marker)
  }
  results.push({
    name: test.name,
    marker,
    library,
    entry,
    inputSha256: createHash('sha256')
      .update(library + '\n' + entry)
      .digest('hex'),
    esbuild: {
      bytes: Buffer.byteLength(generated),
      unusedBodyRetained: generated.includes(marker),
      generated,
    },
  })
}
execFileSync(
  process.execPath,
  [requireBlog.resolve('next/dist/bin/next'), 'build'],
  {
    cwd: app,
    stdio: 'inherit',
    env: {...process.env, NEXT_TELEMETRY_DISABLED: '1'},
  },
)
async function files(dir) {
  const result = []
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) result.push(...(await files(path)))
    else if (entry.name.endsWith('.js')) result.push(path)
  }
  return result
}
const chunks = await Promise.all(
  (await files(join(app, '.next/static'))).map(async (path) => ({
    path: path.slice(app.length + 1),
    source: await readFile(path, 'utf8'),
  })),
)
for (const result of results) {
  const matches = chunks.filter((chunk) => chunk.source.includes(result.marker))
  const used = chunks.filter((chunk) =>
    chunk.source.includes('TRACE_USED_' + result.name),
  )
  assert(used.length > 0, 'used marker missing: ' + result.name)
  result.turbopack = {
    unusedBodyRetained: matches.length > 0,
    matchingChunks: matches.map(({path, source}) => ({
      path,
      sha256: createHash('sha256').update(source).digest('hex'),
    })),
  }
}
for (const name of ['named-exports', 'class-unused']) {
  const row = results.find((r) => r.name === name)
  assert.equal(row.esbuild.unusedBodyRetained, false)
  assert.equal(row.turbopack.unusedBodyRetained, false)
}
assert(
  results.find((r) => r.name === 'class-dynamic').turbopack.unusedBodyRetained,
)
const summary = {
  scope:
    'Controlled API-shape ablation using unique method-body markers in emitted client JavaScript, excluding source maps. No execution-time or package-wide savings claim.',
  node: process.version,
  next: requireBlog('next/package.json').version,
  esbuild: (await import('esbuild')).version,
  results,
}
await writeFile(
  join(root, 'results/class-shaking.json'),
  JSON.stringify(summary, null, 2) + '\n',
)
console.log(
  JSON.stringify(
    results.map(({name, esbuild, turbopack}) => ({
      name,
      esbuild: esbuild.unusedBodyRetained,
      turbopack: turbopack.unusedBodyRetained,
    })),
    null,
    2,
  ),
)
