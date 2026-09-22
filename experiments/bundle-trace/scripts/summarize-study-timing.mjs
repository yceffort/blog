import assert from 'node:assert/strict'
import {readFile, writeFile} from 'node:fs/promises'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const data = JSON.parse(
  await readFile(resolve(root, 'artifacts/study/timing-complete.json'), 'utf8'),
)
assert(!data.failure)
assert.equal(data.samples.length, data.rounds * 2)
const median = (values) => {
  const sorted = values.toSorted((a, b) => a - b)
  return (
    (sorted[Math.floor((sorted.length - 1) / 2)] +
      sorted[Math.ceil((sorted.length - 1) / 2)]) /
    2
  )
}
const {samples, ...conditions} = data
const summary = {
  ...conditions,
  metric:
    'Resource Timing response-body bytes; click event to search-result DOM insertion, not paint or INP',
  pilot:
    'A previous run completed 4 samples then timed out waiting for an additional requestAnimationFrame marker; the cause was not established. The complete run waits for visible results and the DOM timestamp instead; pilot timings are excluded.',
  samples: samples.map(({resources, ...sample}) => ({
    ...sample,
    searchModules: resources.filter(
      (r) => r.phase === 'search' && r.path.endsWith('.js'),
    ),
  })),
  medians: Object.fromEntries(
    ['baseline', 'lazy'].map((variant) => {
      const selected = samples.filter((sample) => sample.variant === variant)
      assert.equal(selected.length, data.rounds)
      return [
        variant,
        {
          clickToResultsMs: median(selected.map((s) => s.clickToResultsMs)),
          minMs: Math.min(...selected.map((s) => s.clickToResultsMs)),
          maxMs: Math.max(...selected.map((s) => s.clickToResultsMs)),
          indexEndFromClickMs: median(
            selected.map((s) => s.index.endMs - s.clickMs),
          ),
        },
      ]
    }),
  ),
}
await writeFile(
  resolve(root, 'results/study-timing.json'),
  JSON.stringify(summary, null, 2) + '\n',
)
console.log(summary.medians)
