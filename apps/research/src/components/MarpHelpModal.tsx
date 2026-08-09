import type {MouseEvent as ReactMouseEvent} from 'react'

import {SHORTCUT_GROUPS} from './MarpSlides.constants'

import styles from './MarpSlides.module.scss'

interface MarpHelpModalProps {
  onClose: () => void
  onOverlayClick: (e: ReactMouseEvent<HTMLDivElement>) => void
}

export function MarpHelpModal({onClose, onOverlayClick}: MarpHelpModalProps) {
  return (
    <div
      className={styles.helpOverlay}
      role="presentation"
      onClick={onOverlayClick}
    >
      <dialog
        open
        className={styles.helpDialog}
        aria-label="키보드 단축키 도움말"
        aria-modal="true"
      >
        <div className={styles.helpHeader}>
          <h2>키보드 단축키</h2>
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
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item.desc}>
                    <span className={styles.helpDesc}>{item.desc}</span>
                    <span className={styles.helpKeys}>
                      {item.keys.map((k, i) => (
                        <kbd key={i}>{k}</kbd>
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
