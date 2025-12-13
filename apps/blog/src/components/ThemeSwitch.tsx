'use client'

import dynamic from 'next/dynamic'

const SharedThemeSwitch = dynamic(
  () =>
    import('@yceffort/shared/components').then((mod) => mod.ThemeSwitch),
  {
    ssr: false,
    loading: () => (
      <div className="ml-1 mr-1 flex h-10 w-10 items-center justify-center rounded-md p-2 sm:ml-4">
        <div className="h-6 w-6 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    ),
  },
)

export default function ThemeSwitch() {
  return <SharedThemeSwitch />
}
