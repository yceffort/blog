import * as stylex from '@stylexjs/stylex'

const sx = stylex.create({
  months: {
    '@layer site': {
      display: 'grid',
      gridTemplateColumns: {
        default: '1fr',
        '@media (min-width: 720px)': 'repeat(2, 1fr)',
        '@media (min-width: 1100px)': 'repeat(3, 1fr)',
      },
      gap: '32px',
      marginTop: '32px',
    },
  },
  month: {
    '@layer site': {
      minWidth: 0,
    },
  },
  title: {
    '@layer site': {
      marginBottom: '10px',
      fontSize: '13px',
      fontWeight: '600',
      color: 'var(--ink-3)',
    },
  },
  grid: {
    '@layer site': {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '4px',
    },
  },
  weekday: {
    '@layer site': {
      paddingBlock: '4px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '11px',
      textAlign: 'center',
      color: 'var(--ink-4)',
    },
  },
  cell: {
    '@layer site': {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      aspectRatio: '1',
      borderRadius: '8px',
      fontSize: '13px',
    },
  },
  empty: {
    '@layer site': {
      color: 'var(--ink-4)',
    },
  },
  issue: {
    '@layer site': {
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
      },
      backgroundColor: 'var(--surface)',
      fontWeight: '600',
      color: 'var(--ink)',
      transition: 'border-color 160ms',
    },
  },
  count: {
    '@layer site': {
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '10px',
      fontWeight: '500',
      color: 'var(--primary)',
    },
  },
})

export const months = stylex.props(sx.months).className ?? ''
export const month = stylex.props(sx.month).className ?? ''
export const title = stylex.props(sx.title).className ?? ''
export const grid = stylex.props(sx.grid).className ?? ''
export const weekday = stylex.props(sx.weekday).className ?? ''
export const empty = stylex.props(sx.cell, sx.empty).className ?? ''
export const issue = stylex.props(sx.cell, sx.issue).className ?? ''
export const count = stylex.props(sx.count).className ?? ''
