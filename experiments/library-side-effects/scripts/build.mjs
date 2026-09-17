// Bundle each entry the way a production build would, then record what survived.
import {createHash} from 'node:crypto'
import {mkdir, readdir, readFile, writeFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {gzipSync} from 'node:zlib'

import {build} from 'esbuild'

export const root = fileURLToPath(new URL('../', import.meta.url))

// webpack 의 resolve.fallback 처럼 Node 내장 모듈을 빈 모듈로 대체한다.
// 서버 전용 라이브러리가 클라이언트 번들에 실려 나가는 상황을 재현하기 위한 것이다.
const nodeBuiltinShim = {
  name: 'node-builtin-shim',
  setup(build) {
    const builtins =
      /^(node:)?(util|os|fs|path|events|stream|string_decoder|buffer|crypto|http|https|http2|zlib|tty|net|tls|dns|child_process|url|querystring|assert|constants|timers|process|worker_threads|async_hooks|perf_hooks|v8|vm|readline|repl|cluster|dgram|module|inspector|diagnostics_channel)$/
    build.onResolve({filter: builtins}, (args) => ({
      path: args.path,
      namespace: 'node-shim',
    }))
    build.onLoad({filter: /.*/, namespace: 'node-shim'}, () => ({
      contents: 'module.exports = {}',
      loader: 'js',
    }))
  },
}

const names = (await readdir(`${root}/entries`))
  .filter((file) => file.endsWith('.js'))
  .map((file) => file.replace(/\.js$/, ''))
  .sort()

await mkdir(`${root}/fixtures`, {recursive: true})
const manifest = []
for (const name of names) {
  const result = await build({
    entryPoints: [`${root}/entries/${name}.js`],
    bundle: true,
    minify: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.API_MOCKING': '"disabled"',
    },
    // webpack 이 클라이언트 번들에 넣어 주던 것과 같은 최소 process 폴리필.
    // 모든 조건에 동일하게 들어가므로 기준선 대비 비교에는 영향이 없다.
    banner: {
      js: 'globalThis.process=globalThis.process||{env:{},argv:[],platform:"browser",version:"",versions:{},nextTick:function(f){queueMicrotask(f)},cwd:function(){return"/"},emitWarning:function(){},on:function(){},off:function(){},listeners:function(){return[]}};',
    },
    plugins: [nodeBuiltinShim],
    write: false,
    logLevel: 'silent',
  })
  const source = Buffer.from(result.outputFiles[0].contents)
  const gzip = gzipSync(source, {level: 6})
  await writeFile(`${root}/fixtures/${name}.js`, source)
  await writeFile(`${root}/fixtures/${name}.js.gz`, gzip)
  manifest.push({
    name,
    entry: (await readFile(`${root}/entries/${name}.js`, 'utf8')).trim(),
    sourceBytes: source.length,
    gzipBytes: gzip.length,
    sha256: createHash('sha256').update(source).digest('hex'),
  })
}

const versions = Object.fromEntries(
  await Promise.all(
    ['lodash', 'moment', 'msw', 'esbuild'].map(async (pkg) => [
      pkg,
      JSON.parse(
        await readFile(`${root}/node_modules/${pkg}/package.json`, 'utf8'),
      ).version,
    ]),
  ),
)
await writeFile(
  `${root}/fixtures/manifest.json`,
  JSON.stringify({versions, payloads: manifest}, null, 2) + '\n',
)

const baseline = manifest.find((x) => x.name === 'baseline')
for (const item of manifest) {
  const delta = item.sourceBytes - baseline.sourceBytes
  console.log(
    `${item.name.padEnd(16)} ${String(item.sourceBytes).padStart(8)} B  gzip ${String(item.gzipBytes).padStart(7)} B  (+${delta} B over baseline)`,
  )
}
