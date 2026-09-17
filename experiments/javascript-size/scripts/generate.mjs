import {createHash} from 'node:crypto'
import {mkdir, writeFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {gzipSync} from 'node:zlib'

export const root = fileURLToPath(new URL('../', import.meta.url))
export const sizesKiB = [0, 128, 512, 1024, 2048, 5120, 10240]
export const kinds = ['comment', 'functions', 'initialized']

export function generate(kind, kib) {
  const target = kib * 1024
  const prefix = 'globalThis.__unusedCalls=0;globalThis.__unusedData=[];\n'
  const suffix = '\nperformance.mark("payload-evaluated");\n'
  const chunks = [prefix]
  let length = prefix.length + suffix.length
  let count = 0
  if (kind === 'comment') {
    // Same source as the functions variant, enclosed in one block comment.
    // This controls lexical content better than megabytes of repeated spaces.
    chunks.push('/*\n')
    length += 6
  }
  while (length + 6 < target) {
    const id = count.toString().padStart(6, '0')
    const salt = createHash('sha256').update(id).digest('hex').slice(0, 24)
    const fn = `function feature_${id}(input){globalThis.__unusedCalls++;const scale=${(count % 997) + 1};const label="feature_${salt}";const value=(input.value??0)*scale;return {id:${count},label,value,enabled:value>scale,tags:[label,"group_${count % 97}"]};}\n`
    const initialization =
      kind === 'initialized'
        ? `globalThis.__unusedData.push(feature_${id}({value:${count % 131}}));\n`
        : ''
    const chunk = fn + initialization
    if (length + chunk.length + 6 > target) break
    chunks.push(chunk)
    length += chunk.length
    count++
  }
  if (kind === 'comment') chunks.push('*/\n')
  if (target > 0) chunks.push('/*' + '.'.repeat(target - length - 4) + '*/')
  chunks.push(suffix)
  const body = Buffer.from(chunks.join(''))
  if (target && body.length !== target)
    throw new Error(`Size mismatch ${kind}/${kib}`)
  return {body, count}
}

export async function generateAll() {
  await mkdir(`${root}/fixtures`, {recursive: true})
  const manifest = []
  for (const kib of sizesKiB) {
    for (const kind of kib === 0 ? ['comment'] : kinds) {
      const {body, count} = generate(kind, kib)
      const gzip = gzipSync(body, {level: 6, mtime: 0})
      const name = `${kind}-${kib}`
      await writeFile(`${root}/fixtures/${name}.js`, body)
      await writeFile(`${root}/fixtures/${name}.js.gz`, gzip)
      manifest.push({
        name,
        kind,
        kib,
        count,
        sourceBytes: body.length,
        gzipBytes: gzip.length,
        sha256: createHash('sha256').update(body).digest('hex'),
      })
    }
  }
  await writeFile(
    `${root}/fixtures/manifest.json`,
    JSON.stringify(manifest, null, 2) + '\n',
  )
  return manifest
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = await generateAll()
  process.stdout.write(JSON.stringify(manifest, null, 2) + '\n')
}
