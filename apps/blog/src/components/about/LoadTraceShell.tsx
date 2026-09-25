// three.js 청크를 받기 전에도 같은 크기로 자리를 잡아 둔다. 그래픽이 들어와도 아래 내용이 밀리지 않는다.
import * as aboutStyles from '@/components/about/about.styles'
import {useTraceText} from '@/components/about/traceText'

export function TraceLoading() {
  const t = useTraceText()
  return (
    <div className={aboutStyles.trace_loading}>
      <span className={aboutStyles.trace_loading_line} />
      <span className={aboutStyles.trace_loading_text}>{t.loading}</span>
    </div>
  )
}

export function TraceCaption({
  stats,
  onReplay,
}: {
  stats: string
  onReplay?: () => void
}) {
  const t = useTraceText()
  return (
    <figcaption className={aboutStyles.trace_caption}>
      <p className={aboutStyles.trace_caption_text}>{t.caption}</p>
      <button
        type="button"
        className={aboutStyles.trace_replay}
        onClick={onReplay}
        disabled={!onReplay}
      >
        {t.replay}
      </button>
      <p className={aboutStyles.trace_stats}>{stats}</p>
    </figcaption>
  )
}

export default function LoadTraceShell() {
  const t = useTraceText()
  return (
    <figure className={aboutStyles.trace_figure}>
      <div className={aboutStyles.trace_viewport} aria-hidden="true">
        <TraceLoading />
      </div>
      <TraceCaption stats={t.reading} />
    </figure>
  )
}
