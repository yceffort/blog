import Link from 'next/link'
import type {HTMLProps, ReactElement} from 'react'

import CodeBlock from '@/components/CodeBlock'
import ImageZoom from '@/components/ImageZoom'
import LiveDemo from '@/components/LiveDemo'
import Mermaid from '@/components/Mermaid'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(node: any): string {
  if (typeof node === 'string') {
    return node
  }
  if (typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join('')
  }
  if (node && typeof node === 'object' && 'props' in node) {
    return extractText(node.props.children)
  }
  return ''
}

function NextImage(props: HTMLProps<HTMLImageElement>) {
  const {src} = props
  const width = Number(props.width)
  const height = Number(props.height)

  if (src) {
    const isExternal = src.startsWith('http')
    return (
      <ImageZoom
        src={src}
        alt={props.alt || ''}
        width={width}
        height={height}
        isExternal={isExternal}
      />
    )
  } else {
    return <p>Currently, image is not available. {src}</p>
  }
}

const MdxComponents = {
  LiveDemo,
  img: NextImage,
  table: (props: HTMLProps<HTMLTableElement>) => {
    return (
      <div className="overflow-x-auto">
        <table {...props} />
      </div>
    )
  },
  a: (props: HTMLProps<HTMLAnchorElement>) => {
    const {href, children, ...rest} = props

    if (!href) {
      return null
    }

    if (href.startsWith('#')) {
      return (
        <a href={href} {...rest}>
          {children}
        </a>
      )
    }

    const isExternal =
      /^https?:\/\//.test(href) && !href.includes('yceffort.kr')

    if (isExternal) {
      const {className, ...anchorRest} = rest
      return (
        <a
          {...anchorRest}
          href={href}
          className={className ? `${className} external-link` : 'external-link'}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      )
    }

    return (
      <Link
        href={href}
        className={rest.className}
        target={rest.target}
        rel={rest.rel}
      >
        {children}
      </Link>
    )
  },
  pre: (props: HTMLProps<HTMLPreElement>) => {
    const children = props.children as ReactElement<{
      className?: string
      children?: React.ReactNode
      'data-filename'?: string
    }>

    if (
      children &&
      children.props &&
      children.props.className &&
      children.props.className.includes('language-mermaid')
    ) {
      const chartCode = extractText(children.props.children).trim()
      return <Mermaid chart={chartCode} />
    }

    const filename = children?.props?.['data-filename']

    return (
      <CodeBlock className={props.className} filename={filename}>
        {props.children}
      </CodeBlock>
    )
  },
}

export default MdxComponents
