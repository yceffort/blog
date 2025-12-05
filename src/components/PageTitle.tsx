import {ViewTransition} from 'react'

import type {ReactNode} from 'react'

export default function PageTitle({
  children,
  transitionName,
}: {
  children: ReactNode
  transitionName?: string
}) {
  const title = (
    <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-5xl md:leading-14">
      {children}
    </h1>
  )

  if (transitionName) {
    return <ViewTransition name={transitionName}>{title}</ViewTransition>
  }

  return title
}
