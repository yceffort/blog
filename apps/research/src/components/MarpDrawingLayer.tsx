import type {useDrawing} from '@/hooks/useDrawing'

import * as styles from './MarpSlides.styles'

const TOOL_ICONS = {pen: '✎', highlighter: '◐', eraser: '⌫', text: 'T'} as const
const COLORS = [
  '#ef4444',
  '#3b82f6',
  '#facc15',
  '#22c55e',
  '#000000',
  '#ffffff',
]

interface MarpDrawingLayerProps {
  drawing: ReturnType<typeof useDrawing>
  onClose: () => void
}

export function MarpDrawingLayer({drawing, onClose}: MarpDrawingLayerProps) {
  const {
    canvasRef,
    textInputRef,
    drawTool,
    setDrawTool,
    drawColor,
    setDrawColor,
    handleDrawStart,
    handleDrawMove,
    handleDrawEnd,
    handleClearCanvas,
    textPos,
    commitText,
    cancelText,
  } = drawing

  return (
    <>
      <canvas
        ref={canvasRef}
        className={styles.drawingCanvas}
        onPointerDown={handleDrawStart}
        onPointerMove={handleDrawMove}
        onPointerUp={handleDrawEnd}
        onPointerCancel={handleDrawEnd}
      />
      {textPos && (
        <input
          className={styles.drawTextInput}
          style={{left: textPos.x, top: textPos.y, color: drawColor}}
          ref={(el) => {
            textInputRef.current = el
            el?.focus()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !e.nativeEvent.isComposing) {
              cancelText()
            }
          }}
          // 한글 IME 조합 중 Enter 는 keydown 시점에 isComposing 이라 무시된다.
          // keyup 은 조합이 끝난 뒤라 마지막 글자까지 담긴 값을 커밋할 수 있다
          onKeyUp={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              commitText(e.currentTarget.value)
            }
          }}
          onBlur={(e) => commitText(e.currentTarget.value)}
        />
      )}
      <div
        className={styles.drawToolbar}
        role="presentation"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.drawToolGroup}>
          {(Object.keys(TOOL_ICONS) as (keyof typeof TOOL_ICONS)[]).map((t) => (
            <button
              key={t}
              className={
                drawTool === t ? styles.drawToolBtnOn : styles.drawToolBtn
              }
              onClick={() => setDrawTool(t)}
              aria-label={t}
              title={t}
            >
              {TOOL_ICONS[t]}
            </button>
          ))}
        </div>
        <div className={styles.drawToolGroupLast}>
          {COLORS.map((c) => (
            <button
              key={c}
              className={
                drawColor === c ? styles.drawColorBtnOn : styles.drawColorBtn
              }
              style={{background: c}}
              onClick={() => {
                setDrawColor(c)
                if (drawTool === 'eraser') {
                  setDrawTool('pen')
                }
              }}
              aria-label={`color ${c}`}
              title={c}
            />
          ))}
        </div>
        <button
          className={styles.drawClearBtn}
          onClick={handleClearCanvas}
          title="전체 지우기"
        >
          clear
        </button>
        <button
          className={styles.drawCloseBtn}
          onClick={onClose}
          title="드로잉 종료"
        >
          ×
        </button>
      </div>
    </>
  )
}
