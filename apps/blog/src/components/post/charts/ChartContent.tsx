'use client'

import * as stylex from '@stylexjs/stylex'
import {useTheme} from 'next-themes'
import dynamic from 'next/dynamic'
import {useEffect, useId, useRef, useState} from 'react'

import {sx} from './Chart.styles'
import {
  chartHeight,
  formatValue,
  type ChartDocument,
  type ChartView,
} from './types'

const ChartCanvas = dynamic(() => import('./ChartCanvas'), {ssr: false})

function DataTable({view, data}: {view: ChartView; data: ChartDocument}) {
  const en = data.locale === 'en'
  const range = view.series.some((series) =>
    series.values.some((point) => point.low !== undefined),
  )
  const notes = view.series.some((series) =>
    series.values.some((point) => point.note),
  )
  const headers = [
    view.xLabel,
    en ? 'Series' : '조건',
    view.yLabel,
    ...(range ? [en ? 'Minimum' : '최솟값', en ? 'Maximum' : '최댓값'] : []),
    ...(notes ? [en ? 'Note' : '비고'] : []),
  ]
  const fmt = (value: number | undefined) =>
    value === undefined
      ? ''
      : formatValue(value, Math.max(3, view.decimals), data.locale)
  return (
    <div {...stylex.props(sx.tableWrap)}>
      <table {...stylex.props(sx.table)}>
        <caption {...stylex.props(sx.tableCaption)}>
          {data.title}: {view.label}
        </caption>
        <thead>
          <tr>
            {headers.map((header, i) => (
              <th key={i} scope="col" {...stylex.props(sx.cell)}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.series.flatMap((series) =>
            series.values.map((point, i) => (
              <tr key={`${series.id}-${i}`}>
                {[
                  point.x,
                  series.label,
                  fmt(point.y),
                  ...(range ? [fmt(point.low), fmt(point.high)] : []),
                  ...(notes ? [point.note ?? ''] : []),
                ].map((value, column) => (
                  <td key={column} {...stylex.props(sx.cell)}>
                    {value}
                  </td>
                ))}
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function ChartContent({
  src,
  data,
}: {
  src: string
  data: ChartDocument
}) {
  const {resolvedTheme} = useTheme()
  const container = useRef<HTMLDivElement>(null)
  const [nearby, setNearby] = useState(false)
  const [selected, setSelected] = useState(data.views[0].id)
  const captionId = useId()
  const descriptionId = useId()
  const plotId = useId()
  const en = data.locale === 'en'
  const dark = resolvedTheme === 'dark'
  const view = data.views.find((item) => item.id === selected) ?? data.views[0]

  useEffect(() => {
    const element = container.current
    if (!element) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearby(true)
          observer.disconnect()
        }
      },
      {rootMargin: '400px'},
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <figure
      className={`markdown-exempt ${stylex.props(sx.figure).className}`}
      data-chart-renderer="chartjs"
      data-chart-src={src}
      aria-labelledby={captionId}
      aria-describedby={descriptionId}
    >
      <figcaption id={captionId} {...stylex.props(sx.caption)}>
        {data.title}
      </figcaption>
      {data.views.length > 1 ? (
        <fieldset
          aria-label={en ? 'Chart view' : '차트 조건'}
          {...stylex.props(sx.controls)}
        >
          {data.views.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={selected === item.id}
              aria-controls={plotId}
              onClick={() => setSelected(item.id)}
              {...stylex.props(
                sx.button,
                selected === item.id && sx.buttonSelected,
              )}
            >
              {item.label}
            </button>
          ))}
        </fieldset>
      ) : null}
      <div {...stylex.props(sx.legend)} aria-label={en ? 'Legend' : '범례'}>
        {view.series.map((series, index) => (
          <span key={series.id} {...stylex.props(sx.item)}>
            <svg
              width="20"
              height="14"
              viewBox="0 0 20 14"
              aria-hidden="true"
              {...stylex.props(
                [sx.color0, sx.color1, sx.color2, sx.color3][
                  (series.color ?? index) % 4
                ],
              )}
            >
              {view.kind === 'bar' ? (
                <rect
                  x="1"
                  y="3"
                  width="18"
                  height="8"
                  rx="2"
                  fill="currentColor"
                />
              ) : (
                <>
                  <path d="M0 7H20" stroke="currentColor" strokeWidth="2" />
                  {index % 3 === 0 ? (
                    <circle cx="10" cy="7" r="3.5" fill="currentColor" />
                  ) : index % 3 === 1 ? (
                    <rect
                      x="6.5"
                      y="3.5"
                      width="7"
                      height="7"
                      fill="currentColor"
                    />
                  ) : (
                    <path d="M10 2L15 11H5Z" fill="currentColor" />
                  )}
                </>
              )}
            </svg>
            {series.label}
          </span>
        ))}
      </div>
      {view.description ? (
        <p {...stylex.props(sx.description)}>{view.description}</p>
      ) : null}
      <div {...stylex.props(sx.axis)}>{view.yLabel}</div>
      <div
        id={plotId}
        ref={container}
        {...stylex.props(sx.plot)}
        style={{height: chartHeight(view)}}
      >
        {nearby ? (
          <ChartCanvas
            view={view}
            dark={dark}
            locale={data.locale}
            label={`${data.title}: ${view.label}`}
          />
        ) : (
          <span {...stylex.props(sx.placeholder)}>
            {en
              ? 'Chart loads when in view. Data table below.'
              : '화면에 들어오면 그래프를 표시합니다. 아래 표에서도 값을 볼 수 있습니다.'}
          </span>
        )}
      </div>
      {!view.horizontal ? (
        <div {...stylex.props(sx.axis, sx.xAxis)}>{view.xLabel}</div>
      ) : null}
      <div id={descriptionId} {...stylex.props(sx.footer)}>
        <p {...stylex.props(sx.description)}>{data.description}</p>
        <details>
          <summary {...stylex.props(sx.summary)}>
            {en ? 'View data table' : '측정값 표로 보기'}
          </summary>
          <DataTable view={view} data={data} />
        </details>
        <div {...stylex.props(sx.links)}>
          <a href={src} download>
            {en ? 'Chart data (JSON)' : '차트 데이터 (JSON)'}
          </a>
          {data.source ? (
            <a href={data.source}>
              {en ? 'Source measurements' : '원본 측정 자료'}
            </a>
          ) : null}
        </div>
      </div>
    </figure>
  )
}
