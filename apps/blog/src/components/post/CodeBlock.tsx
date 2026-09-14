'use client'

import {memo, useCallback, useRef, useState} from 'react'

import * as codeBlockStyles from './CodeBlock.styles'
interface CodeBlockProps {
  children: React.ReactNode
  className?: string
  filename?: string
}
const CopyButton = memo(function CopyButtonBase({
  getText,
}: {
  getText: () => string
}) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    try {
      const text = getText()
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // eslint-disable-next-line no-console
      console.error('Failed to copy')
    }
  }, [getText])
  return (
    <button
      onClick={handleCopy}
      className={codeBlockStyles.button}
      aria-label="Copy code"
    >
      {copied ? (
        <span className={codeBlockStyles.span}>
          <svg
            className={codeBlockStyles.svg}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Copied
        </span>
      ) : (
        <span className={codeBlockStyles.span}>
          <svg
            className={codeBlockStyles.svg}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Copy
        </span>
      )}
    </button>
  )
})
const CodeBlock = memo(function CodeBlockBase({
  children,
  className,
  filename,
}: CodeBlockProps) {
  const preRef = useRef<HTMLPreElement>(null)
  const getCodeText = useCallback(() => {
    if (!preRef.current) {
      return ''
    }
    const codeElement = preRef.current.querySelector('code')
    return codeElement?.textContent || ''
  }, [])
  return (
    <div className={codeBlockStyles.div}>
      {filename && (
        <div className={`monospace-text ${codeBlockStyles.div2}`}>
          {filename}
        </div>
      )}
      <pre
        ref={preRef}
        className={`${className || ''} ${filename ? codeBlockStyles.pre : ''}`}
      >
        {children}
      </pre>
      <CopyButton getText={getCodeText} />
    </div>
  )
})
export default CodeBlock
