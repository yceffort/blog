import {QRCodeSVG} from 'qrcode.react'
import type {MouseEvent as ReactMouseEvent} from 'react'

import styles from './MarpSlides.module.scss'

interface MarpQrModalProps {
  qrUrl: string
  onOverlayClick: (e: ReactMouseEvent<HTMLDivElement>) => void
  onCopy: () => void
}

export function MarpQrModal({qrUrl, onOverlayClick, onCopy}: MarpQrModalProps) {
  return (
    <div
      className={styles.qrOverlay}
      role="presentation"
      onClick={onOverlayClick}
    >
      <dialog
        open
        className={styles.qrDialog}
        aria-label="QR 코드"
        aria-modal="true"
      >
        <div className={styles.qrCode}>
          <QRCodeSVG
            value={qrUrl}
            size={240}
            level="M"
            marginSize={2}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
        <button className={styles.qrUrl} onClick={onCopy} title="클릭하여 복사">
          {qrUrl}
        </button>
        <div className={styles.qrHint}>
          클릭하여 URL 복사 · ESC 또는 Q로 닫기
        </div>
      </dialog>
    </div>
  )
}
