'use client'

import * as stylex from '@stylexjs/stylex'
import {useEffect, useState} from 'react'
const sx = stylex.create({
  button: {
    '@layer utilities': {
      '--blog-translate-y': '0px',
      translate: 'var(--blog-translate-x) var(--blog-translate-y)',
      opacity: '100%',
    },
  },
  button2: {
    '@layer utilities': {
      '--blog-translate-y': 'calc(var(--spacing) * 10)',
      translate: 'var(--blog-translate-x) var(--blog-translate-y)',
      opacity: '0%',
    },
  },
  button3: {
    '@layer utilities': {
      position: 'fixed',
      right: 'calc(var(--spacing) * 8)',
      bottom: 'calc(var(--spacing) * 8)',
      zIndex: '50',
      borderRadius: 'calc(infinity * 1px)',
      backgroundColor: {
        default: 'oklch(92% 0.004 286.32)',
        '@media (hover: hover)': {
          default: null,
          ':hover': 'oklch(87.1% 0.006 286.286)',
          ':is(.dark *):hover': 'oklch(44.2% 0.017 285.786)',
        },
        ':is(.dark *)': 'oklch(37% 0.013 285.805)',
      },
      padding: 'calc(var(--spacing) * 2)',
      color: {
        default: 'oklch(55.2% 0.016 285.938)',
        ':is(.dark *)': 'oklch(70.5% 0.015 286.067)',
      },
      transitionProperty: 'all',
      transitionTimingFunction:
        'var(--blog-ease, var(--default-transition-timing-function))',
      transitionDuration:
        'var(--blog-duration, var(--default-transition-duration))',
    },
  },
  svg: {
    '@layer utilities': {
      height: 'calc(var(--spacing) * 5)',
      width: 'calc(var(--spacing) * 5)',
    },
  },
})
const handleScrollTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}
export default function ScrollTop() {
  const [show, setShow] = useState(false)
  const [hasTOC, setHasTOC] = useState(false)
  useEffect(() => {
    const handleWindowScroll = () => {
      if (window.scrollY > 50) {
        setShow(true)
      } else {
        setShow(false)
      }
    }
    const checkTOC = () => {
      setHasTOC(document.body.hasAttribute('data-has-toc'))
    }
    const observer = new MutationObserver(checkTOC)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-has-toc'],
    })
    checkTOC()
    window.addEventListener('scroll', handleWindowScroll)
    return () => {
      window.removeEventListener('scroll', handleWindowScroll)
      observer.disconnect()
    }
  }, [])
  if (hasTOC) {
    return null
  }
  return (
    <button
      aria-label="Scroll To Top"
      type="button"
      onClick={handleScrollTop}
      className={
        stylex.props(sx.button3, show ? sx.button : sx.button2).className
      }
    >
      <svg
        className={stylex.props(sx.svg).className}
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  )
}
