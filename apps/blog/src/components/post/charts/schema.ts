import type {ChartDocument, ChartView} from './types'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid chart: ${message}`)
}

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object'
const text = (value: unknown): value is string => typeof value === 'string'
const domain = (value: unknown) =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every(finite) &&
  value[0] < value[1]

/** Fail during prerendering instead of publishing an empty or misleading plot. */
export function parseChart(value: unknown): ChartDocument {
  assert(record(value) && value.version === 1, 'version')
  assert(value.locale === 'ko' || value.locale === 'en', 'locale')
  assert(text(value.title) && text(value.description), 'caption')
  assert(
    value.source === undefined ||
      (text(value.source) &&
        value.source.startsWith('/') &&
        !value.source.startsWith('//')),
    'source',
  )
  assert(Array.isArray(value.views) && value.views.length > 0, 'views')
  const viewIds = new Set<string>()
  for (const view of value.views) {
    assert(
      record(view) &&
        text(view.id) &&
        !viewIds.has(view.id) &&
        text(view.label),
      'view id or label',
    )
    viewIds.add(view.id)
    assert(view.kind === 'line' || view.kind === 'bar', 'kind')
    assert(
      text(view.xLabel) && text(view.yLabel) && text(view.unit),
      'axis labels',
    )
    assert(
      view.description === undefined || text(view.description),
      'description',
    )
    assert(
      finite(view.decimals) &&
        Number.isInteger(view.decimals) &&
        view.decimals >= 0 &&
        view.decimals <= 6,
      'decimals',
    )
    assert(domain(view.domain), 'value domain')
    assert(
      view.ticks === undefined ||
        (Array.isArray(view.ticks) &&
          view.ticks.length > 1 &&
          view.ticks.every(finite)),
      'ticks',
    )
    assert(view.xDomain === undefined || domain(view.xDomain), 'x domain')
    assert(
      view.horizontal === undefined || typeof view.horizontal === 'boolean',
      'horizontal',
    )
    assert(
      view.stepped === undefined || typeof view.stepped === 'boolean',
      'stepped',
    )
    assert(Array.isArray(view.series) && view.series.length > 0, 'series')
    const seriesIds = new Set<string>()
    for (const series of view.series) {
      assert(
        record(series) &&
          text(series.id) &&
          !seriesIds.has(series.id) &&
          text(series.label),
        'series id or label',
      )
      seriesIds.add(series.id)
      assert(
        series.color === undefined ||
          (finite(series.color) &&
            Number.isInteger(series.color) &&
            series.color >= 0),
        'color',
      )
      assert(Array.isArray(series.values) && series.values.length > 0, 'points')
      for (const point of series.values) {
        assert(
          record(point) &&
            (finite(point.x) || text(point.x)) &&
            finite(point.y),
          'point',
        )
        assert(
          view.kind !== 'line' || finite(point.x),
          'line x must be numeric',
        )
        assert(point.note === undefined || text(point.note), 'point note')
        assert(
          (point.low === undefined && point.high === undefined) ||
            (finite(point.low) &&
              finite(point.high) &&
              point.low <= point.y &&
              point.y <= point.high),
          'range must contain value',
        )
        const [min, max] = view.domain as number[]
        assert(
          (point.low ?? point.y) >= min && (point.high ?? point.y) <= max,
          'value outside domain',
        )
        if (view.xDomain && finite(point.x)) {
          const [left, right] = view.xDomain as number[]
          assert(point.x >= left && point.x <= right, 'x outside domain')
        }
      }
    }
    if (view.kind === 'bar') {
      const rows = (view as unknown as ChartView).series.map((series) =>
        series.values.map((point) => point.x),
      )
      assert(
        rows.every((row) => JSON.stringify(row) === JSON.stringify(rows[0])),
        'bar categories must align',
      )
      assert((view.domain as number[])[0] === 0, 'bars must start at zero')
    }
  }
  return value as unknown as ChartDocument
}
