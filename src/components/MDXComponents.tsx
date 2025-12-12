import Image from 'next/image'
import Link from 'next/link'

import type {HTMLProps} from 'react'

import Mermaid from '#components/Mermaid'

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
    if (src.startsWith('http')) {
      return <img src={src} alt={src} width={width} height={height} />
    } else {
      return (
        <Image
          width={width}
          height={height}
          alt={props.alt || ''}
          crossOrigin="anonymous"
          src={src}
          placeholder="empty"
        />
      )
    }
  } else {
    return <p>Currently, image is not available. {src}</p>
  }
}

const MdxComponents = {
  img: NextImage,
  a: (props: HTMLProps<HTMLAnchorElement>) => {
    const {href, ...rest} = props

    if (!href) {
      return null
    }

    const isAnchorLink = href.startsWith('#')

    if (isAnchorLink) {
      return <a href={href} {...rest} />
    }

    return (
      <Link
        href={href}
        className={props.className}
        target={props.target}
        rel={props.rel}
      >
        {props.children}
      </Link>
    )
  },
  pre: (props: HTMLProps<HTMLPreElement>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children = props.children as any

    if (
      children &&
      children.props &&
      children.props.className &&
      children.props.className.includes('language-mermaid')
    ) {
      const chartCode = extractText(children.props.children).trim()
      return <Mermaid chart={chartCode} />
    }

    return <pre {...props} />
  },
}

export default MdxComponents
