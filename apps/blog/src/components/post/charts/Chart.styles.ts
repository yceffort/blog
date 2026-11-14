import * as stylex from '@stylexjs/stylex'

export const sx = stylex.create({
  figure: {
    '@layer utilities': {
      marginBlock: '28px',
      marginInline: 0,
      minWidth: 0,
      padding: {default: '24px', '@media (max-width: 480px)': '18px 12px'},
      border: '1px solid',
      borderColor: {default: '#e2e8f0', ':is(.dark *)': '#334155'},
      borderRadius: '12px',
      backgroundColor: {default: '#ffffff', ':is(.dark *)': '#151b26'},
      color: {default: '#475569', ':is(.dark *)': '#cbd5e1'},
      fontSize: '14px',
      lineHeight: 1.6,
    },
  },
  caption: {
    '@layer utilities': {
      fontSize: '17px',
      fontWeight: 650,
      letterSpacing: '-0.02em',
      color: {default: '#1e293b', ':is(.dark *)': '#f1f5f9'},
      marginBottom: '12px',
    },
  },
  legend: {
    '@layer utilities': {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px 18px',
      marginBottom: '20px',
      fontSize: '14px',
    },
  },
  item: {
    '@layer utilities': {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '7px',
    },
  },
  color0: {
    '@layer utilities': {
      color: {default: '#64748b', ':is(.dark *)': '#a8b4c6'},
    },
  },
  color1: {
    '@layer utilities': {
      color: {default: '#2563eb', ':is(.dark *)': '#60a5fa'},
    },
  },
  color2: {
    '@layer utilities': {
      color: {default: '#c65a12', ':is(.dark *)': '#fb923c'},
    },
  },
  color3: {
    '@layer utilities': {
      color: {default: '#16804a', ':is(.dark *)': '#4ade80'},
    },
  },
  axis: {
    '@layer utilities': {
      fontSize: '14px',
      fontWeight: 500,
    },
  },
  xAxis: {
    '@layer utilities': {
      textAlign: 'right',
      marginTop: '2px',
      paddingRight: '12px',
    },
  },
  plot: {
    '@layer utilities': {
      position: 'relative',
      width: '100%',
      minWidth: 0,
      marginTop: '4px',
    },
  },
  canvasHost: {'@layer utilities': {width: '100%', height: '100%'}},
  placeholder: {
    '@layer utilities': {
      display: 'grid',
      placeItems: 'center',
      height: '100%',
      fontSize: '14px',
    },
  },
  footer: {
    '@layer utilities': {
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: {default: '#eef2f6', ':is(.dark *)': '#334155'},
      marginTop: '20px',
      paddingTop: '12px',
      fontSize: '14px',
    },
  },
  summary: {
    '@layer utilities': {
      cursor: 'pointer',
      width: 'fit-content',
      paddingBlock: '10px',
    },
  },
  tableWrap: {
    '@layer utilities': {
      overflow: 'auto',
      maxHeight: '288px',
      marginBlock: '12px',
    },
  },
  table: {
    '@layer utilities': {
      width: '100%',
      borderCollapse: 'collapse',
      textAlign: 'left',
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
      fontSize: '14px',
      lineHeight: 2,
    },
  },
  cell: {
    '@layer utilities': {
      paddingInline: '8px',
      borderBottom: '1px solid',
      borderColor: {default: '#eef2f6', ':is(.dark *)': '#334155'},
    },
  },
  controls: {
    '@layer utilities': {
      minWidth: 0,
      padding: 0,
      borderWidth: 0,
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginBlock: '16px',
    },
  },
  button: {
    '@layer utilities': {
      padding: '10px 14px',
      minHeight: '44px',
      borderRadius: '8px',
      border: '1px solid',
      borderColor: {default: '#cbd5e1', ':is(.dark *)': '#475569'},
      color: 'inherit',
      backgroundColor: 'transparent',
      font: 'inherit',
      cursor: 'pointer',
      outlineOffset: '3px',
    },
  },
  buttonSelected: {
    '@layer utilities': {
      backgroundColor: {default: '#eff6ff', ':is(.dark *)': '#1e3a5f'},
      color: {default: '#1d4ed8', ':is(.dark *)': '#93c5fd'},
      borderColor: {default: '#2563eb', ':is(.dark *)': '#60a5fa'},
    },
  },
  description: {'@layer utilities': {marginBlock: '0 12px'}},
  tableCaption: {
    '@layer utilities': {
      textAlign: 'left',
      whiteSpace: 'normal',
      fontWeight: 600,
    },
  },
  links: {
    '@layer utilities': {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px 16px',
      marginTop: '8px',
    },
  },
})
