import * as stylex from '@stylexjs/stylex'

const sx = stylex.create({
  layout: {
    '@layer site': {
      display: 'grid',
      gridTemplateColumns: {
        default: '1fr',
        '@media (min-width: 1024px)': 'minmax(0, 26rem) minmax(0, 1fr)',
      },
      gap: '40px',
      alignItems: 'start',
      marginTop: '32px',
    },
  },
  months: {
    '@layer site': {
      display: 'grid',
      gap: '32px',
    },
  },
  side: {
    '@layer site': {
      position: {
        default: 'static',
        '@media (min-width: 1024px)': 'sticky',
      },
      top: '96px',
      display: 'grid',
      gap: '16px',
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
        ':is([data-selected="true"])': 'var(--primary)',
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
  card: {
    '@layer site': {
      padding: '20px 22px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'var(--border)',
      borderRadius: '12px',
      backgroundColor: 'var(--surface)',
    },
  },
  cardLabel: {
    '@layer site': {
      marginBottom: '12px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '11px',
      fontWeight: '600',
      letterSpacing: '0.1em',
      color: 'var(--primary)',
    },
  },
  items: {
    '@layer site': {
      display: 'grid',
      gap: '12px',
      listStyle: 'none',
    },
  },
  item: {
    '@layer site': {
      display: 'grid',
      gap: '2px',
    },
  },
  itemTitle: {
    '@layer site': {
      fontSize: '14.5px',
      fontWeight: '600',
      lineHeight: '1.5',
      color: 'var(--ink)',
    },
  },
  pick: {
    '@layer site': {
      marginRight: '8px',
      padding: '1px 6px',
      borderRadius: '4px',
      backgroundColor: 'var(--primary)',
      fontSize: '11px',
      fontWeight: '600',
      color: 'var(--surface)',
      verticalAlign: '1px',
    },
  },
  itemOrigin: {
    '@layer site': {
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '11.5px',
      color: 'var(--ink-3)',
    },
  },
  read: {
    '@layer site': {
      display: 'inline-block',
      marginTop: '16px',
      fontSize: '13px',
      fontWeight: '600',
      color: {
        default: 'var(--primary)',
        ':hover': 'var(--ink)',
      },
    },
  },
  stats: {
    '@layer site': {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
      marginBottom: '16px',
    },
  },
  statLabel: {
    '@layer site': {
      marginBottom: '4px',
      fontSize: '12px',
      color: 'var(--ink-3)',
    },
  },
  statValue: {
    '@layer site': {
      fontSize: '20px',
      fontWeight: '700',
      color: 'var(--ink)',
    },
  },
  origins: {
    '@layer site': {
      display: 'grid',
      gap: '6px',
      listStyle: 'none',
      fontSize: '13px',
      color: 'var(--ink-2)',
    },
  },
  originRow: {
    '@layer site': {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px',
    },
  },
})

export const layout = stylex.props(sx.layout).className ?? ''
export const months = stylex.props(sx.months).className ?? ''
export const side = stylex.props(sx.side).className ?? ''
export const title = stylex.props(sx.title).className ?? ''
export const grid = stylex.props(sx.grid).className ?? ''
export const weekday = stylex.props(sx.weekday).className ?? ''
export const empty = stylex.props(sx.cell, sx.empty).className ?? ''
export const issue = stylex.props(sx.cell, sx.issue).className ?? ''
export const count = stylex.props(sx.count).className ?? ''
export const card = stylex.props(sx.card).className ?? ''
export const cardLabel = stylex.props(sx.cardLabel).className ?? ''
export const items = stylex.props(sx.items).className ?? ''
export const item = stylex.props(sx.item).className ?? ''
export const itemTitle = stylex.props(sx.itemTitle).className ?? ''
export const pick = stylex.props(sx.pick).className ?? ''
export const itemOrigin = stylex.props(sx.itemOrigin).className ?? ''
export const read = stylex.props(sx.read).className ?? ''
export const stats = stylex.props(sx.stats).className ?? ''
export const statLabel = stylex.props(sx.statLabel).className ?? ''
export const statValue = stylex.props(sx.statValue).className ?? ''
export const origins = stylex.props(sx.origins).className ?? ''
export const originRow = stylex.props(sx.originRow).className ?? ''
