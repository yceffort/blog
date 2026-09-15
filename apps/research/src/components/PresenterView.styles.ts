import * as stylex from '@stylexjs/stylex'

const styles = stylex.create({
  presenterView: {
    '@layer site': {
      display: 'grid',
      gridTemplateRows: 'auto 1fr auto auto',
      height: '100vh',
      background: '#1a1a1a',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflow: 'hidden',
    },
  },
  timerBar: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '12px 24px',
      background: '#2a2a2a',
      borderBottom: '1px solid #333',
    },
  },
  timer: {
    '@layer site': {
      fontSize: '32px',
      fontWeight: '600',
      fontVariantNumeric: 'tabular-nums',
      minWidth: '100px',
      textAlign: 'center',
    },
  },
  timerButton: {
    '@layer site': {
      padding: '8px 16px',
      background: {default: '#444', ':hover': '#555'},
      border: 'none',
      borderRadius: '6px',
      color: '#fff',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'background 0.2s',
    },
  },
  timerButtonRunning: {
    '@layer site': {
      background: {default: '#c53030', ':hover': '#e53e3e'},
    },
  },
  slidesContainer: {
    '@layer site': {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: '16px',
      padding: '16px',
      minHeight: 0,
    },
  },
  slideWrapper: {
    '@layer site': {
      background: '#2a2a2a',
      borderRadius: '8px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    },
  },
  slideLabel: {
    '@layer site': {
      padding: '8px 12px',
      background: '#333',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      color: '#888',
    },
  },
  // 다음 슬라이드 쪽 라벨만 흐리다
  slideLabelNext: {
    '@layer site': {
      color: '#666',
    },
  },
  slideContent: {
    '@layer site': {
      flex: 1,
      minHeight: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px',
      overflow: 'hidden',
    },
  },
  // min-height 는 부모(현재/다음)에 따라 다르다
  slideContentCurrent: {
    '@layer site': {
      minHeight: '300px',
    },
  },
  slideContentNext: {
    '@layer site': {
      minHeight: '200px',
    },
  },
  noNextSlide: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#666',
      fontSize: '14px',
    },
  },
  notesPanel: {
    '@layer site': {
      padding: '16px 24px',
      background: '#2a2a2a',
      borderTop: '1px solid #333',
      maxHeight: '200px',
      overflowY: 'auto',
    },
  },
  notesLabel: {
    '@layer site': {
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      color: '#888',
      marginBottom: '8px',
    },
  },
  notesContent: {
    '@layer site': {
      fontSize: '16px',
      lineHeight: '1.6',
      whiteSpace: 'pre-wrap',
      color: '#ccc',
    },
  },
  noNotes: {
    '@layer site': {
      color: '#666',
      fontStyle: 'italic',
    },
  },
  controlBar: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '16px 24px',
      background: '#2a2a2a',
      borderTop: '1px solid #333',
    },
  },
  navButton: {
    '@layer site': {
      padding: '12px 24px',
      background: {default: '#444', ':hover:not(:disabled)': '#555'},
      border: 'none',
      borderRadius: '6px',
      color: '#fff',
      fontSize: '16px',
      cursor: {default: 'pointer', ':disabled': 'not-allowed'},
      opacity: {default: null, ':disabled': 0.4},
      transition: 'background 0.2s',
    },
  },
  pageIndicator: {
    '@layer site': {
      fontSize: '18px',
      fontWeight: '600',
      minWidth: '80px',
      textAlign: 'center',
      fontVariantNumeric: 'tabular-nums',
    },
  },
  keyHints: {
    '@layer site': {
      position: 'fixed',
      bottom: '80px',
      right: '24px',
      fontSize: '12px',
      color: '#666',
      textAlign: 'right',
      lineHeight: '1.8',
    },
  },
  marpContainer: {
    '@layer site': {
      width: '100%',
      height: '100%',
    },
  },
})

export const presenterView = stylex.props(styles.presenterView).className!
export const timerBar = stylex.props(styles.timerBar).className!
export const timer = stylex.props(styles.timer).className!
export const timerButton = stylex.props(styles.timerButton).className!
export const timerButtonRunning = stylex.props(
  styles.timerButton,
  styles.timerButtonRunning,
).className!
export const slidesContainer = stylex.props(styles.slidesContainer).className!
export const slideWrapper = stylex.props(styles.slideWrapper).className!
export const slideLabel = stylex.props(styles.slideLabel).className!
export const slideLabelNext = stylex.props(
  styles.slideLabel,
  styles.slideLabelNext,
).className!
export const slideContentCurrent = stylex.props(
  styles.slideContent,
  styles.slideContentCurrent,
).className!
export const slideContentNext = stylex.props(
  styles.slideContent,
  styles.slideContentNext,
).className!
export const noNextSlide = stylex.props(styles.noNextSlide).className!
export const notesPanel = stylex.props(styles.notesPanel).className!
export const notesLabel = stylex.props(styles.notesLabel).className!
export const notesContent = stylex.props(styles.notesContent).className!
export const noNotes = stylex.props(styles.noNotes).className!
export const controlBar = stylex.props(styles.controlBar).className!
export const navButton = stylex.props(styles.navButton).className!
export const pageIndicator = stylex.props(styles.pageIndicator).className!
export const keyHints = stylex.props(styles.keyHints).className!
export const marpContainer = stylex.props(styles.marpContainer).className!
