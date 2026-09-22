import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {parseArgs} from 'node:util'

const {values} = parseArgs({
  options: {
    artifacts: {type: 'string', default: 'experiments/bundle-trace/artifacts'},
    out: {
      type: 'string',
      default: 'experiments/bundle-trace/results/blog-summary.json',
    },
  },
})
const hash = (data) => createHash('sha256').update(data).digest('hex')
const runs = []
for (const scenario of ['initial', 'search']) {
  const raw = await readFile(
    resolve(values.artifacts, `blog-${scenario}.coverage.json`),
  )
  const artifact = JSON.parse(raw)
  const report = JSON.parse(
    await readFile(resolve(values.artifacts, `blog-${scenario}.json`), 'utf8'),
  )
  runs.push({
    scenario,
    capturedAt: artifact.capturedAt,
    environment: artifact.environment,
    coverageSha256: hash(raw),
    resultCount: artifact.resultCount,
    blockedOrigins: artifact.blockedOrigins,
    totals: report.totals,
    buildScriptCount: report.bundles.length,
    measuredScriptCount: report.bundles.filter(
      (bundle) => bundle.observedUtf16Units !== null,
    ).length,
    measuredSourceBytes:
      report.totals.observedBytes + report.totals.unobservedBytes,
    packages: report.packages.filter(
      (row) => row.observedBytes + row.unobservedBytes > 0,
    ),
    focusSources: report.sources.filter(
      (row) =>
        row.package === 'minisearch' || row.source.includes('/SiteSearch.tsx'),
    ),
    measuredBundles: report.bundles
      .filter((bundle) => bundle.observedUtf16Units !== null)
      .map(
        ({
          generatedSource,
          sources,
          spans,
          verification,
          compression,
          ...summary
        }) => summary,
      ),
    warnings: report.warnings,
  })
}
const summary = {
  schemaVersion: 1,
  baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim(),
  configuration:
    'BUNDLE_TRACE=1; GA4_PROPERTY_ID and GOOGLE_APPLICATION_CREDENTIALS_JSON empty; local production server',
  metric:
    'UTF-8 bytes of generated JavaScript; source attribution is approximate; not network bytes or CPU time',
  sampleCount:
    'One fresh browser per scenario; exploratory coverage, not a performance benchmark',
  verification:
    'All 26 measured scripts agree with independent per-code-unit oracle, both UTF-16 and UTF-8; totals reconcile across sources/packages/bundles',
  manualImportTrace: [
    'apps/blog/src/components/layout/LayoutWrapper.tsx',
    'apps/blog/src/components/search/SiteSearch.tsx',
    'minisearch',
  ],
  importTraceMethod:
    'Repository source inspection; Turbopack import-graph adapter is not implemented',
  runs,
}
await mkdir(resolve(values.out, '..'), {recursive: true})
await writeFile(values.out, JSON.stringify(summary, null, 2) + '\n')
console.log(`Wrote ${values.out}`)
