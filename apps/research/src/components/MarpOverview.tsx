import {Marp} from './Marp'
import * as styles from './MarpSlides.styles'

interface MarpOverviewProps {
  rendered: {html: string[]; css: string; fonts: string[]}
  slideIndices: number[]
  hiddenIndices: number[]
  activeIndex: number
  onSelect: (index: number) => void
  onClose: () => void
}

export function MarpOverview({
  rendered,
  slideIndices,
  hiddenIndices,
  activeIndex,
  onSelect,
  onClose,
}: MarpOverviewProps) {
  return (
    <div
      className={styles.overview}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <dialog open className={styles.overviewGrid} aria-label="슬라이드 오버뷰">
        {slideIndices.map((i) => (
          <button
            key={i}
            className={
              i === activeIndex
                ? styles.overviewItemActive
                : styles.overviewItem
            }
            onClick={() => onSelect(i)}
            aria-label={`슬라이드 ${i + 1}로 이동`}
            aria-current={i === activeIndex ? 'true' : undefined}
          >
            <div className={styles.overviewThumbnail}>
              <Marp
                rendered={rendered}
                page={i + 1}
                className={styles.overviewThumbnailInner}
              />
            </div>
            <span className={styles.overviewNumber}>
              {i + 1}
              {hiddenIndices.includes(i) ? ' · 숨김' : ''}
            </span>
          </button>
        ))}
      </dialog>
      <div className={styles.overviewHint}>ESC 또는 G 키로 닫기</div>
    </div>
  )
}
