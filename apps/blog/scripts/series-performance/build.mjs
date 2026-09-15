import assert from 'node:assert/strict'
import {execFileSync, spawn} from 'node:child_process'
import {createHash} from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import {cpus} from 'node:os'
import {resolve} from 'node:path'

const root = resolve(import.meta.dirname, '../../../..')
const workspace = resolve(root, '.cache/series-performance')
const variants = ['before', 'after']
const git = (...args) =>
  execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim()
const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const rounds = Number(process.env.SERIES_BUILD_ROUNDS ?? 4)
const buildsOnly = process.argv.includes('--builds')
assert.equal(
  process.platform,
  'darwin',
  'CPU/RSS collection uses macOS /usr/bin/time',
)
assert.equal(process.version, 'v24.20.0')
assert.ok(Number.isInteger(rounds) && rounds > 0)
assert.ok(
  buildsOnly || !existsSync(workspace),
  `Move the previous benchmark directory before starting: ${workspace}`,
)
mkdirSync(workspace, {recursive: true})
const env = {
  ...process.env,
  NODE_ENV: 'production',
  NEXT_TELEMETRY_DISABLED: '1',
  GA4_PROPERTY_ID: '',
  GOOGLE_APPLICATION_CREDENTIALS_JSON: '',
}
const prepared = buildsOnly
  ? JSON.parse(readFileSync(resolve(workspace, 'builds.json'), 'utf8'))
  : null
const report = {
  startedAt: new Date().toISOString(),
  refs: {
    // 두 마이그레이션 브랜치의 공통 조상. 다른 기준과 비교하려면 SERIES_BEFORE_REF 로 바꾼다.
    before: git(
      'rev-parse',
      process.env.SERIES_BEFORE_REF ??
        '322601592c28d3094207a071f20d0d4df452d779',
    ),
    after: git('rev-parse', 'HEAD'),
  },
  host: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpu: cpus()[0].model,
  },
  conditions:
    'Each variant uses its own frozen lockfile and production code. Current posts, series and public assets are copied identically to both. Each next build removes .next. Installation and Rust/WASM compilation excluded. GA4 credentials empty. Sequential AB/BA ordering.',
  rounds,
  harnessSha256: sha256(readFileSync(import.meta.filename)),
  inputs: prepared?.inputs ?? {},
  builds: [],
}
if (prepared) {
  report.refs = prepared.refs
  report.preparedAt = prepared.startedAt
  writeFileSync(
    resolve(workspace, 'previous-builds.json'),
    JSON.stringify(prepared, null, 2) + '\n',
  )
}
const save = () =>
  writeFileSync(
    resolve(workspace, 'builds.json'),
    JSON.stringify(report, null, 2) + '\n',
  )
async function command(commandName, args, cwd, logName) {
  const start = performance.now()
  const child = spawn(commandName, args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let log = ''
  child.stdout.on('data', (chunk) => {
    log += chunk
  })
  child.stderr.on('data', (chunk) => {
    log += chunk
  })
  const code = await new Promise((resolveExit, reject) => {
    child.once('error', reject)
    child.once('exit', resolveExit)
  })
  writeFileSync(resolve(workspace, logName), log)
  assert.equal(code, 0, `Failed: ${logName}`)
  return {wallMs: performance.now() - start, log}
}
for (const variant of buildsOnly ? [] : variants) {
  const directory = resolve(workspace, variant)
  git('worktree', 'add', '--detach', directory, report.refs[variant])
  for (const name of ['posts', 'series', 'public']) {
    const dest = resolve(directory, 'apps/blog', name)
    rmSync(dest, {recursive: true, force: true})
    cpSync(resolve(root, 'apps/blog', name), dest, {
      recursive: true,
      preserveTimestamps: true,
    })
  }
  await command(
    'corepack',
    ['pnpm', 'install', '--frozen-lockfile'],
    directory,
    `install-${variant}.log`,
  )
  const files = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    {cwd: directory},
  )
    .toString()
    .split('\0')
    .filter((file) => file && existsSync(resolve(directory, file)))
  report.inputs[variant] = Object.fromEntries(
    files.map((file) => [file, sha256(readFileSync(resolve(directory, file)))]),
  )
  save()
  console.log(`Prepared ${variant}: ${report.refs[variant]}`)
}
for (const directory of ['posts', 'series', 'public']) {
  const select = (variant) =>
    Object.fromEntries(
      Object.entries(report.inputs[variant]).filter(([file]) =>
        file.startsWith(`apps/blog/${directory}/`),
      ),
    )
  assert.deepEqual(
    select('before'),
    select('after'),
    `Different ${directory} inputs`,
  )
}
report.publicMtimeSeconds = Object.fromEntries(
  variants.map((variant) => [
    variant,
    Object.fromEntries(
      Object.keys(report.inputs[variant])
        .filter((file) => file.startsWith('apps/blog/public/'))
        .map((file) => [
          file,
          Math.floor(
            statSync(resolve(workspace, variant, file)).mtimeMs / 1000,
          ),
        ]),
    ),
  ]),
)
assert.deepEqual(
  report.publicMtimeSeconds.before,
  report.publicMtimeSeconds.after,
  'Different public timestamps change thumbnail cache keys',
)
report.measurementStartedAt = new Date().toISOString()
save()
for (let round = 1; round <= rounds; round++) {
  const order = round % 2 ? variants : variants.toReversed()
  for (const variant of order) {
    const app = resolve(workspace, variant, 'apps/blog')
    rmSync(resolve(app, '.next'), {recursive: true, force: true})
    const {wallMs, log} = await command(
      '/usr/bin/time',
      [
        '-l',
        '-p',
        process.execPath,
        resolve(app, 'node_modules/next/dist/bin/next'),
        'build',
      ],
      app,
      `build-${variant}-${round}.log`,
    )
    const value = (pattern) => Number(log.match(pattern)?.[1])
    const row = {
      variant,
      round,
      wallMs,
      userSeconds: value(/^user\s+([\d.]+)/m),
      systemSeconds: value(/^sys\s+([\d.]+)/m),
      maxRssBytes: value(/(\d+)\s+maximum resident set size/),
      buildId: readFileSync(resolve(app, '.next/BUILD_ID'), 'utf8').trim(),
    }
    report.builds.push(row)
    save()
    console.log(`Build ${round} ${variant}: ${(wallMs / 1000).toFixed(2)} s`)
  }
}
report.finishedAt = new Date().toISOString()
save()
console.log(`Results: ${workspace}/builds.json`)
