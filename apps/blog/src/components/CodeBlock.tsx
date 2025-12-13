'use client'

import {memo, useCallback, useRef, useState} from 'react'

interface CodeBlockProps {
  children: React.ReactNode
  className?: string
  filename?: string
}

const CopyButton = memo(function CopyButton({text}: {text: string}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy')
    }
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="absolute right-2 top-2 rounded-md px-2 py-1 text-xs bg-gray-300 text-gray-700 hover:bg-gray-400 hover:text-gray-900 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white"
      aria-label="Copy code"
    >
      {copied ? (
        <span className="flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

const CodeBlock = memo(function CodeBlock({children, className, filename}: CodeBlockProps) {
  const preRef = useRef<HTMLPreElement>(null)

  const getCodeText = useCallback(() => {
    if (!preRef.current) return ''
    const codeElement = preRef.current.querySelector('code')
    return codeElement?.textContent || ''
  }, [])

  return (
    <div className="relative">
      {filename && (
        <div className="rounded-t-lg bg-gray-200 px-4 py-2 font-mono text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {filename}
        </div>
      )}
      <pre ref={preRef} className={`${className || ''} ${filename ? '!mt-0 rounded-t-none' : ''}`}>
        {children}
      </pre>
      <CopyButton text={getCodeText()} />
    </div>
  )
})

export default CodeBlock
