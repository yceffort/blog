import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartDataset,
  type ChartItem,
  type Plugin,
  type Scale,
} from 'chart.js'

import {
  chartColor,
  chartFont,
  chartTheme,
  formatValue,
  type ChartView,
} from './types'

ChartJS.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
)

type Dataset = ChartDataset<
  'bar' | 'line',
  (number | {x: number; y: number})[]
> & {seriesIndex: number; rangeOnly?: boolean}

// Wrap labels at their normal font size; never scale the whole chart down for phones.
function wrapLabel(
  value: string,
  width: number,
  context: CanvasRenderingContext2D,
  bold = false,
): string[] {
  context.save()
  context.font = `${bold ? '600 ' : ''}14px ${chartFont}`
  const lines: string[] = []
  let line = ''
  for (const word of value.split(' ')) {
    if (line && context.measureText(`${line} ${word}`).width > width) {
      lines.push(line)
      line = ''
    }
    if (line) line += ' '
    for (const character of word) {
      if (line && context.measureText(line + character).width > width) {
        lines.push(line)
        line = ''
      }
      line += character
    }
  }
  if (line) lines.push(line)
  context.restore()
  return lines
}

export interface RenderInput {
  view: ChartView
  dark: boolean
  locale: 'ko' | 'en'
}

export interface CanvasSize {
  width: number
  height: number
  dpr: number
}

/** The same configuration runs on the worker and on unsupported browsers. */
export function createChart(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  {view, dark, locale}: RenderInput,
  size: CanvasSize,
) {
  canvas.width = size.width
  canvas.height = size.height
  const theme = chartTheme(dark)
  const horizontal = view.kind === 'bar' && !!view.horizontal
  const fmt = (value: number) => formatValue(value, view.decimals, locale)
  const datasets: Dataset[] = []
  view.series.forEach((series, index) => {
    const color = chartColor(series, index, dark)
    if (
      view.kind === 'line' &&
      series.values.some((point) => point.low !== undefined)
    ) {
      for (const edge of ['low', 'high'] as const) {
        datasets.push({
          type: 'line',
          label: '',
          seriesIndex: index,
          rangeOnly: true,
          data: series.values.map((point) => ({
            x: Number(point.x),
            y: point[edge] ?? point.y,
          })),
          borderWidth: 0,
          pointRadius: 0,
          pointHitRadius: 0,
          backgroundColor: `${color}1f`,
          fill: edge === 'low' ? '+1' : false,
          stepped: view.stepped,
          order: 1,
        })
      }
    }
    datasets.push({
      type: view.kind,
      label: series.label,
      seriesIndex: index,
      data: series.values.map((point) =>
        view.kind === 'line' ? {x: Number(point.x), y: point.y} : point.y,
      ),
      backgroundColor: color,
      borderColor: color,
      borderWidth: view.kind === 'line' ? 2 : 0,
      pointStyle: (['circle', 'rect', 'triangle'] as const)[index % 3],
      pointRadius: 2.5,
      pointHoverRadius: 5,
      pointHitRadius: 12,
      stepped: view.stepped,
      tension: 0,
      fill: false,
      borderRadius: 2,
      maxBarThickness: 18,
    })
  })
  const annotations: Plugin = {
    id: 'measurementLabels',
    afterDatasetsDraw(chart) {
      if (view.kind !== 'bar') return
      const {ctx, scales} = chart
      const valueScale = horizontal ? scales.x : scales.y
      ctx.save()
      ctx.font = `500 14px ${chartFont}`
      ctx.fillStyle = theme.ink
      ctx.strokeStyle = theme.ink
      ctx.lineWidth = 1.5
      datasets.forEach((dataset, datasetIndex) => {
        const series = view.series[dataset.seriesIndex]
        chart
          .getDatasetMeta(datasetIndex)
          .data.forEach((element, pointIndex) => {
            const point = series.values[pointIndex]
            const {x, y} = element.getProps(['x', 'y'], true)
            if (point.low !== undefined && point.high !== undefined) {
              const low = valueScale.getPixelForValue(point.low)
              const high = valueScale.getPixelForValue(point.high)
              ctx.beginPath()
              if (horizontal) {
                ctx.moveTo(low, y)
                ctx.lineTo(high, y)
                ctx.moveTo(low, y - 4)
                ctx.lineTo(low, y + 4)
                ctx.moveTo(high, y - 4)
                ctx.lineTo(high, y + 4)
              } else {
                ctx.moveTo(x, low)
                ctx.lineTo(x, high)
                ctx.moveTo(x - 4, low)
                ctx.lineTo(x + 4, low)
                ctx.moveTo(x - 4, high)
                ctx.lineTo(x + 4, high)
              }
              ctx.stroke()
            }
            const end = valueScale.getPixelForValue(point.high ?? point.y)
            ctx.textAlign = horizontal ? 'left' : 'center'
            ctx.textBaseline = horizontal ? 'middle' : 'bottom'
            ctx.fillText(
              fmt(point.y),
              horizontal ? end + 6 : x,
              horizontal ? y : end - 6,
            )
          })
      })
      ctx.restore()
    },
  }
  const valueAxis = {
    type: 'linear' as const,
    min: view.domain[0],
    max: view.domain[1],
    border: {display: false},
    grid: {color: theme.grid, drawTicks: false},
    ticks: {
      color: theme.ink,
      font: {size: 14, family: chartFont},
      padding: 8,
      maxTicksLimit: 4,
    },
    ...(view.ticks
      ? {
          afterBuildTicks: (scale: Scale) => {
            scale.ticks = view.ticks!.map((value) => ({value}))
          },
        }
      : {}),
  }
  const categoryAxis = {
    type: 'category' as const,
    border: {display: false},
    grid: {display: false},
    ticks: {
      color: theme.ink,
      font: {size: 14, family: chartFont},
      autoSkip: false,
      maxRotation: 0,
      padding: 8,
      callback(this: Scale, value: string | number) {
        return wrapLabel(
          this.getLabelForValue(Number(value)),
          horizontal
            ? this.chart.width < 480
              ? 78
              : 180
            : this.chart.width / view.series[0].values.length - 12,
          this.chart.ctx,
        )
      },
    },
  }
  const chart = new ChartJS(canvas as ChartItem, {
    type: view.kind,
    data: {
      labels:
        view.kind === 'bar'
          ? view.series[0].values.map((point) => String(point.x))
          : undefined,
      datasets,
    },
    plugins: [annotations],
    options: {
      responsive: false,
      devicePixelRatio: size.dpr,
      events: [],
      maintainAspectRatio: false,
      animation: false,
      locale,
      indexAxis: horizontal ? 'y' : 'x',
      layout: {padding: {top: 20, right: horizontal ? 42 : 12}},
      interaction: {
        mode: view.kind === 'line' ? 'nearest' : 'index',
        axis: horizontal ? 'y' : 'x',
        intersect: false,
      },
      plugins: {
        legend: {display: false},
        tooltip: {
          backgroundColor: dark ? '#f1f5f9' : '#0f172a',
          titleColor: dark ? '#0f172a' : '#f8fafc',
          bodyColor: dark ? '#0f172a' : '#f8fafc',
          bodyFont: {size: 14, family: chartFont},
          titleFont: {size: 14, family: chartFont},
          padding: 12,
          filter: (item) => !datasets[item.datasetIndex].rangeOnly,
          callbacks: {
            title: (items) =>
              items.length
                ? wrapLabel(
                    `${view.xLabel}: ${view.series[datasets[items[0].datasetIndex].seriesIndex].values[items[0].dataIndex].x}`,
                    items[0].chart.width - 52,
                    items[0].chart.ctx,
                    true,
                  )
                : '',
            label: (item) => {
              const series =
                view.series[datasets[item.datasetIndex].seriesIndex]
              const point = series.values[item.dataIndex]
              const lines = [`${series.label}: ${fmt(point.y)} ${view.unit}`]
              if (point.low !== undefined && point.high !== undefined)
                lines.push(
                  `${locale === 'en' ? 'Range' : '범위'}: ${fmt(point.low)} ~ ${fmt(point.high)}`,
                )
              if (point.note) lines.push(point.note)
              return lines.flatMap((line) =>
                wrapLabel(line, item.chart.width - 52, item.chart.ctx),
              )
            },
          },
        },
      },
      scales:
        view.kind === 'bar'
          ? horizontal
            ? {x: valueAxis, y: categoryAxis}
            : {x: categoryAxis, y: valueAxis}
          : {
              x: {
                type: 'linear',
                min: view.xDomain?.[0],
                max: view.xDomain?.[1],
                border: {display: false},
                grid: {display: false},
                ticks: {
                  color: theme.ink,
                  font: {size: 14, family: chartFont},
                  maxTicksLimit: 5,
                  precision: 0,
                  maxRotation: 0,
                  padding: 8,
                },
              },
              y: valueAxis,
            },
    },
  })
  return chart
}

export function resizeChart(chart: ChartJS, size: CanvasSize) {
  chart.options.devicePixelRatio = size.dpr
  chart.resize(size.width, size.height)
}

/** Chart.js accepts normalized coordinates when `native` is present. */
export function movePointer(
  chart: ChartJS,
  x: number,
  y: number,
  leave: boolean,
) {
  const interaction = chart.options.interaction!
  const event = {type: 'mousemove', native: null, x, y}
  const active = leave
    ? []
    : chart
        .getElementsAtEventForMode(
          event as unknown as Event,
          interaction.mode ?? 'nearest',
          {axis: interaction.axis, intersect: false},
          false,
        )
        .filter(
          (item) =>
            !(chart.data.datasets[item.datasetIndex] as Dataset).rangeOnly,
        )
  chart.setActiveElements(active)
  chart.tooltip?.setActiveElements(active, {x, y})
  chart.draw()
}
