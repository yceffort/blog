import {SHORTCUT_GROUPS} from './MarpSlides.constants'
import * as styles from './MarpSlides.styles'

export function MarpHelpModal({onClose}: {onClose: () => void}) {
  return (
    <div
      className={styles.helpOverlay}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <dialog
        open
        className={styles.helpDialog}
        aria-label="키보드 단축키 도움말"
        aria-modal="true"
      >
        <div className={styles.helpHeader}>
          <h2 className={styles.helpTitle}>키보드 단축키</h2>
          <button
            className={styles.helpClose}
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        <div className={styles.helpContent}>
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title} className={styles.helpGroup}>
              <h3 className={styles.helpGroupTitle}>{group.title}</h3>
              <ul className={styles.helpList}>
                {group.items.map((item) => (
                  <li key={item.desc} className={styles.helpItem}>
                    <span className={styles.helpDesc}>{item.desc}</span>
                    <span className={styles.helpKeys}>
                      {item.keys.map((k, i) => (
                        <kbd key={i} className={styles.helpKbd}>
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className={styles.helpHint}>ESC 또는 ? 로 닫기</div>
      </dialog>
    </div>
  )
}
