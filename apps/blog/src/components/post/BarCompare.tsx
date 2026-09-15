import * as stylex from '@stylexjs/stylex'

const sx = stylex.create({
  figure: {
    '@layer utilities': {
      marginBlock: 'calc(var(--spacing) * 8)',
      marginInline: 0,
    },
  },
  head: {
    '@layer utilities': {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 'calc(var(--spacing) * 2) calc(var(--spacing) * 4)',
      marginBottom: 'calc(var(--spacing) * 4)',
    },
  },
  caption: {
    '@layer utilities': {
      fontSize: 'var(--text-base)',
      fontWeight: 'var(--font-weight-semibold)',
      color: {
        default: 'oklch(27.4% 0.006 286.033)',
        ':is(.dark *)': 'oklch(92% 0.004 286.32)',
      },
    },
  },
  unit: {
    '@layer utilities': {
      marginLeft: 'calc(var(--spacing) * 1.5)',
      fontWeight: 'var(--font-weight-normal)',
      fontSize: 'var(--text-sm)',
      color: {
        default: 'oklch(55.2% 0.016 285.938)',
        ':is(.dark *)': 'oklch(70.5% 0.015 286.067)',
      },
    },
  },
  legend: {
    '@layer utilities': {
      display: 'flex',
      gap: 'calc(var(--spacing) * 4)',
      fontSize: 'var(--text-sm)',
      color: {
        default: 'oklch(55.2% 0.016 285.938)',
        ':is(.dark *)': 'oklch(70.5% 0.015 286.067)',
      },
    },
  },
  legendItem: {
    '@layer utilities': {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'calc(var(--spacing) * 1.5)',
    },
  },
  swatch: {
    '@layer utilities': {
      display: 'inline-block',
      width: '10px',
      height: '10px',
      borderRadius: '2px',
    },
  },
  rows: {
    '@layer utilities': {
      display: 'grid',
      gridTemplateColumns: {
        default: 'minmax(5rem, max-content) minmax(0, 1fr)',
        '@media (max-width: 480px)': '1fr',
      },
      rowGap: {
        default: 'calc(var(--spacing) * 3)',
        '@media (max-width: 480px)': 'calc(var(--spacing) * 1)',
      },
      columnGap: 'calc(var(--spacing) * 4)',
      alignItems: 'center',
    },
  },
  label: {
    '@layer utilities': {
      fontSize: 'var(--text-sm)',
      textAlign: {
        default: 'right',
        '@media (max-width: 480px)': 'left',
      },
      marginTop: {
        default: null,
        '@media (max-width: 480px)': 'calc(var(--spacing) * 3)',
      },
      color: {
        default: 'oklch(37% 0.013 285.805)',
        ':is(.dark *)': 'oklch(87.1% 0.006 286.286)',
      },
    },
  },
  pair: {
    '@layer utilities': {
      display: 'grid',
      rowGap: '3px',
    },
  },
  // 막대 칸과 값 칸을 나눠 가장 긴 막대도 값이 잘리지 않게 한다. 값은 한 열로 정렬된다.
  track: {
    '@layer utilities': {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) max-content',
      alignItems: 'center',
      columnGap: 'calc(var(--spacing) * 2)',
      minWidth: 0,
    },
  },
  barTrack: {
    '@layer utilities': {
      minWidth: 0,
    },
  },
  bar: {
    '@layer utilities': {
      height: '14px',
      minWidth: '2px',
      borderRadius: '3px',
    },
  },
  barBefore: {
    '@layer utilities': {
      backgroundColor: {
        default: 'oklch(80% 0.01 286)',
        ':is(.dark *)': 'oklch(45% 0.012 286)',
      },
    },
  },
  barMid: {
    '@layer utilities': {
      backgroundColor: {
        default: 'oklch(74% 0.1 255)',
        ':is(.dark *)': 'oklch(60% 0.1 255)',
      },
    },
  },
  barAfter: {
    '@layer utilities': {
      backgroundColor: {
        default: 'var(--color-blue-500)',
        ':is(.dark *)': 'var(--color-blue-400)',
      },
    },
  },
  value: {
    '@layer utilities': {
      fontSize: 'var(--text-sm)',
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
      color: {
        default: 'oklch(37% 0.013 285.805)',
        ':is(.dark *)': 'oklch(87.1% 0.006 286.286)',
      },
    },
  },
  delta: {
    '@layer utilities': {
      marginLeft: 'calc(var(--spacing) * 1)',
      fontSize: 'var(--text-xs)',
      fontVariantNumeric: 'tabular-nums',
    },
  },
  deltaDown: {
    '@layer utilities': {
      color: {
        default: 'oklch(52.7% 0.154 150.069)',
        ':is(.dark *)': 'oklch(72.3% 0.219 149.579)',
      },
    },
  },
  deltaUp: {
    '@layer utilities': {
      color: {
        default: 'oklch(57.7% 0.245 27.325)',
        ':is(.dark *)': 'oklch(70.4% 0.191 22.216)',
      },
    },
  },
  deltaFlat: {
    '@layer utilities': {
      color: {
        default: 'oklch(55.2% 0.016 285.938)',
        ':is(.dark *)': 'oklch(70.5% 0.015 286.067)',
      },
    },
  },
})

interface BarCompareProps {
  title: string
  /** 값의 단위. 제목 옆에 한 번만 표시한다 */
  unit?: string
  /** 앞 막대의 이름 (예: Tailwind, 변경 전) */
  before?: string
  /** 뒤 막대의 이름 (예: StyleX, 변경 후) */
  after?: string
  /** 계열이 셋 이상일 때 "이름|이름|이름". 있으면 before/after 대신 쓴다 */
  series?: string
  /** "라벨|값|값|..." 을 세미콜론으로 이은 문자열. MDX 속성은 리터럴만 받으므로 문자열로 전달한다 */
  rows: string
}

const numberFormat = new Intl.NumberFormat('en-US', {maximumFractionDigits: 2})

function parseRows(rows: string) {
  return rows
    .split(';')
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const [label, ...values] = row.split('|').map((cell) => cell.trim())
      return {label, values: values.map(Number)}
    })
}

function Delta({before, after}: {before: number; after: number}) {
  if (!before) {
    return null
  }
  const ratio = ((after - before) / before) * 100
  const text = `${ratio > 0 ? '+' : ''}${ratio.toFixed(1)}%`
  const tone =
    Math.abs(ratio) < 0.05
      ? sx.deltaFlat
      : ratio < 0
        ? sx.deltaDown
        : sx.deltaUp
  return <span className={stylex.props(sx.delta, tone).className}>{text}</span>
}

/**
 * 같은 라벨의 값 여러 개를 행마다 가로 막대로 비교한다. 첫 계열은 회색, 마지막 계열은 파란색이고
 * 변화율은 첫 계열 기준이다. 본문 폭을 그대로 쓰고, 막대 길이는 그래프 안의 최댓값 기준이다.
 * 표를 대신하지 않고 표 위에 놓는 용도다.
 */
export default function BarCompare({
  title,
  unit,
  before,
  after,
  series,
  rows,
}: BarCompareProps) {
  const names = series
    ? series.split('|').map((name) => name.trim())
    : [before ?? '전', after ?? '후']
  const data = parseRows(rows)
  const max = Math.max(...data.flatMap((row) => row.values), 0)
  const width = (value: number) =>
    `${max > 0 ? Math.max((value / max) * 100, 0) : 0}%`
  const tone = (index: number) =>
    index === 0
      ? sx.barBefore
      : index === names.length - 1
        ? sx.barAfter
        : sx.barMid

  return (
    <figure className={stylex.props(sx.figure).className}>
      <div className={stylex.props(sx.head).className}>
        <figcaption className={stylex.props(sx.caption).className}>
          {title}
          {unit ? (
            <span className={stylex.props(sx.unit).className}>{unit}</span>
          ) : null}
        </figcaption>
        <div className={stylex.props(sx.legend).className} aria-hidden="true">
          {names.map((name, index) => (
            <span key={name} className={stylex.props(sx.legendItem).className}>
              <span
                className={stylex.props(sx.swatch, tone(index)).className}
              />
              {name}
            </span>
          ))}
        </div>
      </div>
      <div className={stylex.props(sx.rows).className}>
        {data.map((row) => (
          <div key={row.label} style={{display: 'contents'}}>
            <div className={stylex.props(sx.label).className}>{row.label}</div>
            <div className={stylex.props(sx.pair).className}>
              {row.values.map((value, index) => (
                <div
                  key={names[index] ?? index}
                  className={stylex.props(sx.track).className}
                  aria-label={`${row.label} ${names[index] ?? ''} ${numberFormat.format(value)}${unit ?? ''}`}
                >
                  <div className={stylex.props(sx.barTrack).className}>
                    <div
                      className={stylex.props(sx.bar, tone(index)).className}
                      style={{width: width(value)}}
                    />
                  </div>
                  <span className={stylex.props(sx.value).className}>
                    {numberFormat.format(value)}
                    {index > 0 ? (
                      <Delta before={row.values[0]} after={value} />
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </figure>
  )
}
