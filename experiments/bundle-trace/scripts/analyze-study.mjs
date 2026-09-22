import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {verifyReport} from './reference.mjs'

const experiment = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const root = resolve(experiment, '../..')
const artifactDir = resolve(experiment, 'artifacts/study')
const cases = [
  'baseline-initial',
  'baseline-no-prefetch',
  'baseline-about',
  'baseline-search',
  'lazy-initial',
  'lazy-search',
]
const runs = []
for (const name of cases) {
  const variant = name.split('-')[0]
  const dir = resolve(
    root,
    `.cache/bundle-trace-study/app/.next/${variant}/static`,
  )
  const coveragePath = resolve(artifactDir, `${name}.coverage.json`)
  const reportPath = resolve(artifactDir, `${name}.report.json`)
  execFileSync(
    resolve(experiment, 'target/release/bundle-trace'),
    [
      '--dir',
      dir,
      '--coverage',
      coveragePath,
      '--json',
      reportPath,
      '--limit',
      '0',
    ],
    {stdio: 'pipe'},
  )
  const artifactText = await readFile(coveragePath, 'utf8')
  const artifact = JSON.parse(artifactText)
  const report = JSON.parse(await readFile(reportPath, 'utf8'))
  const checked = await verifyReport(dir, [artifact], report)
  if (name === 'baseline-search') {
    const names = [
      'add',
      'addAll',
      'addAllAsync',
      'remove',
      'removeAll',
      'discard',
      'discardAll',
      'replace',
      'vacuum',
      'autoSuggest',
      'loadJSON',
      'loadJS',
      'toJSON',
      'search',
    ]
    const methods = []
    for (const script of artifact.scripts) {
      const source = await readFile(resolve(dir, script.path), 'utf8')
      for (const fn of script.functions) {
        const range = fn.ranges[0]
        const fragment = source.slice(range.startOffset, range.endOffset)
        if (
          !names.includes(fn.functionName) ||
          !fragment.startsWith(fn.functionName + '(') ||
          !source.includes('MiniSearch:')
        )
          continue
        methods.push({
          name: fn.functionName,
          script: script.path,
          sha256: script.sha256,
          startUtf16: range.startOffset,
          endUtf16: range.endOffset,
          generatedBytes: Buffer.byteLength(fragment),
          count: range.count,
          anyObservedSubrange: fn.ranges.some((r) => r.count > 0),
          prefix: fragment.slice(0, 100),
        })
      }
    }
    assert.equal(methods.filter((m) => m.name === 'add').length, 1)
    await writeFile(
      resolve(experiment, 'results/study-methods.json'),
      JSON.stringify(
        {
          method:
            'Exact named V8 function ranges in MiniSearch-bearing chunk; method syntax verified in generated JS; not package-wide source attribution',
          methods,
        },
        null,
        2,
      ) + '\n',
    )
  }
  const measured = report.bundles.filter((b) => b.observedUtf16Units !== null)
  runs.push({
    name,
    capturedAt: artifact.capturedAt,
    environment: artifact.environment,
    coverageSha256: createHash('sha256').update(artifactText).digest('hex'),
    checkedScripts: checked,
    totals: report.totals,
    measuredBytes: report.totals.observedBytes + report.totals.unobservedBytes,
    prefetchRequests: artifact.requests.filter((r) => r.prefetch),
    bundles: measured.map(
      ({
        generatedSource,
        sources,
        spans,
        verification,
        compression,
        ...summary
      }) => summary,
    ),
    packages: report.packages.filter((p) =>
      [
        'minisearch',
        '@panzoom/panzoom',
        'date-fns',
        'next',
        '[application]',
        '[unmapped]',
      ].includes(p.package),
    ),
    sources: report.sources.filter((s) =>
      /SiteSearch|AboutHero|TableOfContents|Mermaid.tsx|ImageZoom|MiniSearch.ts/.test(
        s.source,
      ),
    ),
    warningCount: report.warnings.length,
  })
  console.log(
    `${name}: ${checked} scripts verified; ${runs.at(-1).measuredBytes}B measured, ${report.totals.unobservedBytes}B unobserved`,
  )
}
const summary = {
  schemaVersion: 1,
  metric:
    'UTF-8 generated source bytes, not compressed transfer or execution time',
  verification:
    'Every measured script checked against independent per-UTF-16-code-unit oracle; UTF-8 totals reconciled across sources, packages, and bundles',
  buildInputs: JSON.parse(
    await readFile(resolve(artifactDir, 'build-inputs.json'), 'utf8'),
  ),
  runs,
}
await mkdir(resolve(experiment, 'results'), {recursive: true})
await writeFile(
  resolve(experiment, 'results/study-coverage.json'),
  JSON.stringify(summary, null, 2) + '\n',
)
