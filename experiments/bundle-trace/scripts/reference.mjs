// Deliberately slow point-by-point oracle, independent of the Rust interval sweep.
// Used only in verification, never in the analyzer or report generation.
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

export async function measuredDetails(
  root,
  artifacts,
  binary = fileURLToPath(
    new URL('../target/release/bundle-trace', import.meta.url),
  ),
) {
  const directory = await mkdtemp(resolve(tmpdir(), 'bundle-trace-intervals-'))
  try {
    const paths = [
      ...new Set(
        artifacts.flatMap((artifact) =>
          artifact.scripts.map((script) => script.path),
        ),
      ),
    ]
    assert(paths.length, 'no measured scripts to verify')
    const inputs = []
    for (const [index, artifact] of artifacts.entries()) {
      const path = resolve(directory, index + '.coverage.json')
      await writeFile(path, JSON.stringify(artifact))
      inputs.push('--coverage', path)
    }
    const output = resolve(directory, 'details.json')
    execFileSync(
      binary,
      [
        '--dir',
        root,
        ...inputs,
        ...paths.flatMap((path) => ['--include', path]),
        '--details',
        '--json',
        output,
        '--limit',
        '0',
      ],
      {stdio: 'pipe'},
    )
    return JSON.parse(await readFile(output, 'utf8'))
  } finally {
    await rm(directory, {recursive: true, force: true})
  }
}

function stateRuns(points) {
  const runs = []
  for (let start = 0; start < points.length;) {
    let end = start + 1
    while (end < points.length && points[end] === points[start]) end++
    runs.push([start, end, points[start] ? 'observed' : 'unobserved'])
    start = end
  }
  return runs
}

export function assertIntervals(bundle, source, points) {
  assert.equal(
    bundle.generatedSource,
    source,
    bundle.path + ': generated source',
  )
  assert(
    Array.isArray(bundle.spans),
    bundle.path + ': detailed intervals required',
  )
  const boundaries = new Map([[0, 0]])
  let unit = 0,
    byte = 0
  for (const char of source) {
    unit += char.length
    byte += Buffer.byteLength(char)
    boundaries.set(unit, byte)
  }
  let cursor = 0
  const actual = []
  for (const span of bundle.spans) {
    assert.equal(
      span.startUtf16,
      cursor,
      bundle.path + ': interval gap/overlap',
    )
    assert(span.endUtf16 > span.startUtf16)
    assert.equal(
      span.start,
      boundaries.get(span.startUtf16),
      bundle.path + ': UTF-8 start',
    )
    assert.equal(
      span.end,
      boundaries.get(span.endUtf16),
      bundle.path + ': UTF-8 end',
    )
    assert(['observed', 'unobserved'].includes(span.status))
    const last = actual.at(-1)
    if (last && last[2] === span.status) last[1] = span.endUtf16
    else actual.push([span.startUtf16, span.endUtf16, span.status])
    cursor = span.endUtf16
  }
  assert.equal(cursor, source.length, bundle.path + ': incomplete intervals')
  assert.deepEqual(
    actual,
    stateRuns(points),
    bundle.path + ': interval positions/statuses disagree',
  )
}

export function checkShiftedIntervalRejection() {
  const span = (start, end, status) => ({
    start,
    end,
    startUtf16: start,
    endUtf16: end,
    status,
  })
  const source = 'abcdefghij',
    points = Uint8Array.from([1, 1, 1, 1, 1, 0, 0, 0, 0, 0])
  const bundle = {
    path: 'negative-control.js',
    generatedSource: source,
    spans: [span(0, 5, 'observed'), span(5, 10, 'unobserved')],
  }
  assertIntervals(bundle, source, points)
  const shifted = {
    ...bundle,
    spans: [span(0, 5, 'unobserved'), span(5, 10, 'observed')],
  }
  assert.throws(
    () => assertIntervals(shifted, source, points),
    /interval positions\/statuses disagree/,
  )
}

export async function verifyReport(root, artifacts, report, binary) {
  const byPath = new Map()
  for (const artifact of artifacts) {
    for (const script of artifact.scripts) {
      const source = await readFile(resolve(root, script.path), 'utf8')
      assert.equal(
        createHash('sha256').update(source).digest('hex'),
        script.sha256,
      )
      const points = new Uint8Array(source.length)
      const ranges = script.functions
        .flatMap((fn) => fn.ranges)
        .toSorted(
          (a, b) => b.endOffset - b.startOffset - (a.endOffset - a.startOffset),
        )
      for (const range of ranges)
        points.fill(range.count > 0 ? 1 : 0, range.startOffset, range.endOffset)
      let merged = byPath.get(script.path)
      if (!merged) {
        merged = {source, points: new Uint8Array(source.length)}
        byPath.set(script.path, merged)
      }
      for (let i = 0; i < points.length; i++) merged.points[i] |= points[i]
    }
  }
  const details = byPath.size
    ? report.details
      ? report
      : await measuredDetails(root, artifacts, binary)
    : null
  const detailedBundles = new Map(
    details?.bundles.map((bundle) => [bundle.path, bundle]) || [],
  )
  let checked = 0
  for (const bundle of report.bundles) {
    const data = byPath.get(bundle.path)
    if (!data) {
      assert.equal(bundle.unmeasuredBytes, bundle.bytes)
      continue
    }
    const units = data.points.reduce((sum, value) => sum + value, 0)
    let bytes = 0
    let offset = 0
    for (const character of data.source) {
      if (character.length === 2)
        assert.equal(
          data.points[offset],
          data.points[offset + 1],
          'coverage splits a surrogate pair',
        )
      if (data.points[offset]) bytes += Buffer.byteLength(character)
      offset += character.length
    }
    assert.equal(
      bundle.observedUtf16Units,
      units,
      `${bundle.path}: UTF-16 disagreement`,
    )
    assert.equal(
      bundle.observedBytes,
      bytes,
      `${bundle.path}: UTF-8 disagreement`,
    )
    assert.equal(bundle.observedBytes + bundle.unobservedBytes, bundle.bytes)
    assertIntervals(detailedBundles.get(bundle.path), data.source, data.points)
    checked++
  }
  assert.equal(checked, byPath.size)
  for (const key of [
    'bytes',
    'observedBytes',
    'unobservedBytes',
    'unmeasuredBytes',
  ]) {
    for (const rows of [report.bundles, report.sources, report.packages]) {
      assert.equal(
        rows.reduce((sum, row) => sum + row[key], 0),
        report.totals[key],
        `${key}: totals must reconcile`,
      )
    }
  }
  return checked
}
