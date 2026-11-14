import {mkdir, readFile, writeFile} from 'node:fs/promises'

const source = '/demos/nextjs-page-preservation-memory/measurements.json'
const measurement = JSON.parse(
  await readFile(new URL(`../public${source}`, import.meta.url), 'utf8'),
)
const destination = new URL('../public/charts/nextjs-memory/', import.meta.url)
const conditions = ['pair', 'same_year', 'mixed_years']
const text = {
  ko: {
    conditions: {
      pair: '두 글 반복',
      same_year: '같은 연도',
      mixed_years: '3개 연도',
    },
    navigationDescription:
      '선은 3회 측정의 중앙값, 옅은 영역은 최솟값~최댓값이다. 방문 후 1.2초 대기하고 강제 GC를 2회 실행했다. 첫 진입도 방문 횟수에 포함한다.',
    heapTitle: '방문 횟수에 따른 JS 힙',
    retainedTitle: '방문 횟수에 따른 보존된 글 수',
    visits: '방문 횟수',
    heapLabel: 'GC 후 JS 힙 (MiB)',
    retainedLabel: '보존된 글 (개)',
    postUnit: '개',
    baseline: '기준',
    evictionDescription:
      '3개 연도를 오가며 글 20개를 방문한 상태가 기준이다. 이후 새 연도를 하나씩 방문했다. 추가 실험 1회.',
    evictionTitle: '새 연도를 방문한 뒤 남은 글',
    evictionHeapTitle: '새 연도를 방문한 뒤의 JS 힙',
    addedYear: '추가 방문 연도',
  },
  en: {
    conditions: {
      pair: 'Two posts, repeated',
      same_year: 'Same year',
      mixed_years: 'Three years',
    },
    navigationDescription:
      'Lines show the median of three runs; shaded areas show minimum to maximum. Each visit was followed by a 1.2-second wait and two forced GCs. The visit count includes the first entry.',
    heapTitle: 'JS heap by visit count',
    retainedTitle: 'Retained posts by visit count',
    visits: 'Visits',
    heapLabel: 'JS heap after GC (MiB)',
    retainedLabel: 'Retained posts',
    postUnit: 'posts',
    baseline: 'Baseline',
    evictionDescription:
      'The baseline is the state after visiting 20 posts across three years. Posts from new years were then visited one at a time. One additional run.',
    evictionTitle: 'Retained posts after visiting new years',
    evictionHeapTitle: 'JS heap after visiting new years',
    addedYear: 'Year of the added visit',
  },
}

function navigationSeries(labels, valueOf) {
  return conditions.map((id) => {
    const runs = measurement.runs.filter(
      (run) => run.phase === 'main' && run.scenario === id,
    )
    if (runs.length !== 3 || runs.some((run) => !run.complete))
      throw new Error(`Incomplete trials: ${id}`)
    const trials = runs.map((run) =>
      run.samples.filter((sample) => sample.label.startsWith('visit-')),
    )
    if (trials.some((trial) => trial.length !== trials[0].length))
      throw new Error(`Unmatched visits: ${id}`)
    return {
      id,
      label: labels[id],
      values: trials[0].map((sample, index) => {
        if (
          trials.some(
            (trial) =>
              trial[index].label !== sample.label ||
              trial[index].path !== sample.path,
          )
        )
          throw new Error('Unmatched sample')
        const values = trials
          .map((trial) => valueOf(trial[index]))
          .toSorted((a, b) => a - b)
        return {
          x: Number(sample.label.slice(6)),
          y: values[1],
          low: values[0],
          high: values[2],
        }
      }),
    }
  })
}

async function write(locale, name, title, description, view) {
  await writeFile(
    new URL(`${name}${locale === 'ko' ? '' : `.${locale}`}.json`, destination),
    JSON.stringify(
      {
        version: 1,
        locale,
        title,
        description,
        source,
        generatedBy: 'apps/blog/scripts/generate-memory-charts.mjs',
        views: [{id: 'default', label: title, ...view}],
      },
      null,
      2,
    ) + '\n',
  )
}

await mkdir(destination, {recursive: true})
const heap = (sample) => sample.heap.usedSize / 1048576
const retained = (sample) => sample.retained.length

const eviction = measurement.runs.find((run) => run.phase === 'eviction')
if (!eviction?.complete) throw new Error('Incomplete eviction trial')
const samples = eviction.samples
  .filter((sample) => sample.label.startsWith('visit-'))
  .slice(19, 23)
if (samples.map(retained).join(',') !== '9,7,5,3')
  throw new Error('Unexpected eviction counts')

for (const [locale, t] of Object.entries(text)) {
  await write(locale, 'heap', t.heapTitle, t.navigationDescription, {
    kind: 'line',
    xLabel: t.visits,
    yLabel: t.heapLabel,
    unit: 'MiB',
    decimals: 2,
    xDomain: [1, 21],
    domain: [8, 20],
    ticks: [8, 12, 16, 20],
    series: navigationSeries(t.conditions, heap),
  })
  await write(locale, 'retained', t.retainedTitle, t.navigationDescription, {
    kind: 'line',
    xLabel: t.visits,
    yLabel: t.retainedLabel,
    unit: t.postUnit,
    decimals: 0,
    xDomain: [1, 21],
    domain: [0, 10],
    ticks: [0, 3, 6, 9],
    stepped: true,
    series: navigationSeries(t.conditions, retained),
  })

  const labels = [t.baseline, '2021', '2020', '2019']
  for (const [name, title, yLabel, unit, decimals, domain, ticks, valueOf] of [
    [
      'eviction',
      t.evictionTitle,
      t.retainedLabel,
      t.postUnit,
      0,
      [0, 10],
      [0, 3, 6, 9],
      retained,
    ],
    [
      'eviction-heap',
      t.evictionHeapTitle,
      t.heapLabel,
      'MiB',
      2,
      [0, 20],
      [0, 5, 10, 15, 20],
      heap,
    ],
  ]) {
    await write(locale, name, title, t.evictionDescription, {
      kind: 'bar',
      xLabel: t.addedYear,
      yLabel,
      unit,
      decimals,
      domain,
      ticks,
      series: [
        {
          id: 'eviction',
          label: yLabel,
          color: 1,
          values: samples.map((sample, i) => ({
            x: labels[i],
            y: valueOf(sample),
          })),
        },
      ],
    })
  }
}
console.log('Generated 8 memory charts from the recorded trials.')
