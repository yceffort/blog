import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {parseArgs} from 'node:util'

import {verifyReport} from './reference.mjs'

const {values} = parseArgs({
  options: {
    dir: {type: 'string'},
    artifacts: {type: 'string', default: 'experiments/bundle-trace/artifacts'},
  },
})
if (!values.dir) throw new Error('--dir is required')
for (const name of ['initial', 'search']) {
  const artifact = JSON.parse(
    await readFile(
      resolve(values.artifacts, `blog-${name}.coverage.json`),
      'utf8',
    ),
  )
  const report = JSON.parse(
    await readFile(resolve(values.artifacts, `blog-${name}.json`), 'utf8'),
  )
  const checked = await verifyReport(values.dir, [artifact], report)
  console.log(
    `${name}: ${checked} scripts agree with the independent UTF-16/UTF-8 oracle`,
  )
}
