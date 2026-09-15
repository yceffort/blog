import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname, relative, resolve} from 'node:path'

export const root = resolve(import.meta.dirname, '../../../..')
export const workspace = resolve(root, '.cache/markdown-experience')
export const variants = ['js', 'hybrid', 'wasm']
export const app = (variant) => resolve(workspace, variant, 'apps/blog')
export const sha256 = (data) => createHash('sha256').update(data).digest('hex')
const git = (...args) => execFileSync('git', args, {cwd: root})
const put = (directory, path, data) => {
  const dest = resolve(directory, path)
  mkdirSync(dirname(dest), {recursive: true})
  writeFileSync(dest, data)
}
function link(directory, name, target) {
  const dest = resolve(directory, name)
  if (existsSync(dest)) return
  mkdirSync(dirname(dest), {recursive: true})
  symlinkSync(relative(dirname(dest), target), dest)
}
function linkDependencies(source, dest) {
  mkdirSync(dest, {recursive: true})
  for (const entry of readdirSync(source)) {
    if (entry === '@yceffort') continue
    link(dest, entry, realpathSync(resolve(source, entry)))
  }
}

export function prepare() {
  assert.ok(
    !existsSync(resolve(workspace, 'manifest.json')),
    `Snapshot already exists: ${workspace}`,
  )
  const files = git(
    'ls-files',
    '-z',
    '--cached',
    '--others',
    '--exclude-standard',
  )
    .toString()
    .split('\0')
    .filter(
      (file) =>
        file &&
        existsSync(resolve(root, file)) &&
        !file.split('/').some((part) => part.startsWith('.env')),
    )
  const sourceHashes = Object.fromEntries(
    files.map((file) => [file, sha256(readFileSync(resolve(root, file)))]),
  )
  const commonRestore = [
    'apps/blog/src/utils/imageMetadata.ts',
    'apps/blog/src/utils/Markdown.ts',
    'apps/blog/src/components/post/math.tsx',
    'apps/blog/src/components/post/markdown.css',
    'apps/blog/src/app/[year]/[...slug]/page.tsx',
    'apps/blog/src/app/en/[year]/[...slug]/page.tsx',
  ]
  const oldPackage = JSON.parse(git('show', 'cb40957f:apps/blog/package.json'))
  const nextMdxDir = realpathSync(
    resolve(root, 'packages/markdown-rs/node_modules/next-mdx-remote-client'),
  )
  assert.equal(
    JSON.parse(readFileSync(resolve(nextMdxDir, 'package.json'))).version,
    '2.1.12',
  )
  for (const variant of variants) {
    const snapshot = resolve(workspace, variant)
    for (const file of files) {
      const dest = resolve(snapshot, file)
      mkdirSync(dirname(dest), {recursive: true})
      cpSync(resolve(root, file), dest, {preserveTimestamps: true})
    }
    link(snapshot, 'node_modules', resolve(root, 'node_modules'))
    for (const project of [
      'apps/blog',
      'apps/research',
      'packages/shared',
      'packages/markdown-rs',
    ]) {
      const source = resolve(root, project, 'node_modules')
      if (existsSync(source))
        linkDependencies(source, resolve(snapshot, project, 'node_modules'))
    }
    for (const project of ['blog', 'research']) {
      link(
        resolve(snapshot, `apps/${project}/node_modules`),
        '@yceffort/shared',
        resolve(snapshot, 'packages/shared'),
      )
      link(
        resolve(snapshot, `apps/${project}/node_modules`),
        '@yceffort/markdown-rs',
        resolve(snapshot, 'packages/markdown-rs'),
      )
    }
    if (variant !== 'wasm') {
      for (const file of commonRestore)
        put(snapshot, file, git('show', `f27162bd:${file}`))
      const pkg = JSON.parse(
        readFileSync(resolve(app(variant), 'package.json')),
      )
      Object.assign(pkg.dependencies, oldPackage.dependencies)
      put(snapshot, 'apps/blog/package.json', JSON.stringify(pkg, null, 2))
      for (const name of Object.keys(oldPackage.dependencies)) {
        if (existsSync(resolve(app(variant), 'node_modules', name))) continue
        if (name === 'next-mdx-remote-client') {
          link(resolve(app(variant), 'node_modules'), name, nextMdxDir)
        } else {
          link(
            resolve(app(variant), 'node_modules'),
            name,
            realpathSync(
              resolve(root, 'packages/markdown-rs/node_modules', name),
            ),
          )
        }
      }
    }
    if (variant === 'hybrid') {
      for (const file of ['index.js', 'index.d.ts', 'pkg/markdown_rs.wasm'])
        put(
          snapshot,
          `packages/markdown-rs/${file}`,
          git('show', `f27162bd:packages/markdown-rs/${file}`),
        )
      put(
        snapshot,
        'apps/blog/src/utils/renderPost.tsx',
        git('show', 'f27162bd:apps/blog/src/utils/renderPost.tsx'),
      )
    }
    if (variant === 'js') {
      put(
        snapshot,
        'apps/blog/src/utils/Markdown.ts',
        git('show', 'cb40957f:apps/blog/src/utils/Markdown.ts'),
      )
      const original = git(
        'show',
        'cb40957f:apps/blog/src/components/post/PostArticle.tsx',
      ).toString()
      const imports = original.slice(
        original.indexOf('import {MDXRemote}'),
        original.indexOf("import '@/styles/reading.css'"),
      )
      const options = original.slice(
        original.indexOf('mdxOptions: {'),
        original.indexOf('\n          }}'),
      )
      put(
        snapshot,
        'apps/blog/src/utils/renderPost.tsx',
        `${imports}\nexport async function renderPost(body: string, path: string) {\n  return MDXRemote({source: body, components: MDXComponents, options: {${options}}})\n}\n`,
      )
    }
    // The wrapper is identical across variants. The flag is unset during builds.
    const component = resolve(
      app(variant),
      'src/components/post/PostArticle.tsx',
    )
    let source = readFileSync(component, 'utf8')
    source = `import {appendFileSync} from 'node:fs'\n${source}`
    source = source.replace(
      '  const content = await renderPost(body, path)',
      `  const log = process.env.MARKDOWN_BENCH_LOG\n  const start = log ? performance.now() : 0\n  const content = await renderPost(body, path)\n  if (log) appendFileSync(log, JSON.stringify({pid: process.pid, path, bodyBytes: Buffer.byteLength(body), renderCallMs: performance.now() - start}) + '\\n')`,
    )
    writeFileSync(component, source)
    const resolution = createRequire(
      resolve(app(variant), 'package.json'),
    ).resolve('@yceffort/markdown-rs')
    assert.equal(resolution, resolve(snapshot, 'packages/markdown-rs/index.js'))
  }
  const manifest = {
    createdAt: new Date().toISOString(),
    baseRef: git('rev-parse', 'HEAD').toString().trim(),
    sourceHashes,
    recipes: {
      js: 'Current app, cb40957f MDXRemote configuration, current getAllPosts memoization, f27162bd image metadata and KaTeX resources.',
      hybrid:
        'Current app, f27162bd renderPost and WASM binding/binary, f27162bd image metadata and KaTeX resources.',
      wasm: 'Current working tree. All Markdown transformations use WASM.',
    },
    instrumentation:
      'Identical PostArticle wrapper records renderPost call duration only when MARKDOWN_BENCH_LOG is set. This duration excludes static imports. Browser navigation includes cold route/module loading.',
    resolvedNextMdx: JSON.parse(
      readFileSync(resolve(nextMdxDir, 'package.json')),
    ).version,
    snapshotHashes: Object.fromEntries(
      variants.map((variant) => [
        variant,
        Object.fromEntries(
          [
            'src/utils/renderPost.tsx',
            'src/components/post/PostArticle.tsx',
            'src/utils/Post.ts',
            'src/components/post/markdown.css',
          ].map((file) => [
            file,
            sha256(readFileSync(resolve(app(variant), file))),
          ]),
        ),
      ]),
    ),
  }
  put(workspace, 'manifest.json', JSON.stringify(manifest, null, 2) + '\n')
  return manifest
}
