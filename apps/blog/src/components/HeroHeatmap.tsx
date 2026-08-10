export interface HeatmapYear {
  year: number
  counts: number[]
}

const MONTH_LABELS = [
  'J',
  'F',
  'M',
  'A',
  'M',
  'J',
  'J',
  'A',
  'S',
  'O',
  'N',
  'D',
]

export default function HeroHeatmap({years}: {years: HeatmapYear[]}) {
  const max = Math.max(1, ...years.flatMap((y) => y.counts))

  return (
    <aside className="hero-heatmap" aria-label="연도별 집필 활동">
      <div className="hero-heatmap-head">
        <span className="series-nav-kicker">WRITING ACTIVITY</span>
        <span className="series-nav-progress">
          {years[0].year}–{years[years.length - 1].year}
        </span>
      </div>
      <div className="hero-heatmap-grid">
        <div
          className="hero-heatmap-row hero-heatmap-months"
          aria-hidden="true"
        >
          <em />
          {MONTH_LABELS.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
        {years.map(({year, counts}) => (
          <div key={year} className="hero-heatmap-row">
            <em>{year}</em>
            {counts.map((count, month) => (
              <span
                key={month}
                data-level={
                  count === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4))
                }
                title={`${year}.${String(month + 1).padStart(2, '0')} · ${count} posts`}
              />
            ))}
          </div>
        ))}
      </div>
    </aside>
  )
}
