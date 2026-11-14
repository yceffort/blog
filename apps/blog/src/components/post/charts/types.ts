export interface ChartPoint {
  x: number | string
  y: number
  low?: number
  high?: number
  note?: string
}

export interface ChartSeries {
  id: string
  label: string
  color?: number
  values: ChartPoint[]
}

export interface ChartView {
  id: string
  label: string
  description?: string
  kind: 'line' | 'bar'
  horizontal?: boolean
  xLabel: string
  yLabel: string
  unit: string
  decimals: number
  domain: [number, number]
  ticks?: number[]
  xDomain?: [number, number]
  stepped?: boolean
  series: ChartSeries[]
}

export interface ChartDocument {
  version: 1
  locale: 'ko' | 'en'
  title: string
  description: string
  source?: string
  views: ChartView[]
}

export const chartFont =
  'system-ui, -apple-system, BlinkMacSystemFont, sans-serif'

export function chartTheme(dark: boolean) {
  return dark
    ? {
        ink: '#cbd5e1',
        grid: '#334155',
        background: '#151b26',
        colors: ['#a8b4c6', '#60a5fa', '#fb923c', '#4ade80'],
      }
    : {
        ink: '#475569',
        grid: '#e2e8f0',
        background: '#ffffff',
        colors: ['#64748b', '#2563eb', '#c65a12', '#16804a'],
      }
}

export function chartColor(series: ChartSeries, index: number, dark: boolean) {
  const colors = chartTheme(dark).colors
  return colors[(series.color ?? index) % colors.length]
}

export function formatValue(value: number, decimals: number, locale: string) {
  return value.toLocaleString(locale, {maximumFractionDigits: decimals})
}

export function chartHeight(view: ChartView) {
  return view.kind === 'bar' && view.horizontal
    ? Math.max(
        260,
        view.series[0].values.length * (view.series.length * 24 + 44) + 40,
      )
    : 280
}
