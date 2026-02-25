'use client'

import Link from 'next/link'

import {useLocale} from '#src/hooks/useLocale'

export default function LanguageSwitch() {
  const {locale, alternatePath} = useLocale()

  return (
    <Link
      href={alternatePath}
      onClick={() => {
        document.cookie = `locale=${locale === 'ko' ? 'en' : 'ko'};path=/;max-age=${60 * 60 * 24 * 365}`
      }}
      className="ml-1 flex h-10 items-center justify-center rounded-md px-2 text-sm font-medium text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800 sm:ml-4"
      aria-label={locale === 'ko' ? 'Switch to English' : '한국어로 전환'}
    >
      {locale === 'ko' ? 'EN' : 'KO'}
    </Link>
  )
}
