import type {CSSProperties, ReactNode} from 'react'

export default function PageTitle({
  children,
  style,
}: {
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <h1
      className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-5xl md:leading-14"
      style={style}
    >
      {children}
    </h1>
  )
}
