import {QRCodeSVG} from 'qrcode.react'
import type {MouseEvent as ReactMouseEvent} from 'react'

import * as styles from './MarpSlides.styles'

interface MarpQrModalProps {
  qrUrl: string
  onOverlayClick: (e: ReactMouseEvent<HTMLDivElement>) => void
  onCopy: () => void
  onClose: () => void
}

export function MarpQrModal({
  qrUrl,
  onOverlayClick,
  onCopy,
  onClose,
}: MarpQrModalProps) {
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
        <button
          type="button"
          className={styles.qrClose}
          onClick={onClose}
          aria-label="QR 코드 닫기"
        >
          닫기 ×
        </button>
        <div className={styles.qrCode}>
          <QRCodeSVG
            value={qrUrl}
            size={1024}
            style={{display: 'block', width: '100%', height: '100%'}}
            level="M"
            marginSize={4}
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
