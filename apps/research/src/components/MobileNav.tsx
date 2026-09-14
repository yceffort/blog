'use client'

import {MobileNav as SharedMobileNav} from '@yceffort/shared/components'
import type {ComponentProps} from 'react'

import {SiteConfig} from '@/config'

const classNames: ComponentProps<typeof SharedMobileNav>['classNames'] = {
  root: 'sm:hidden',
  toggle:
    'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
  toggleIcon: 'h-6 w-6',
  visible: 'opacity-100',
  hidden: 'pointer-events-none opacity-0',
  backdrop: 'fixed inset-0 z-[100] transition-opacity duration-300',
  sheetVisible: 'translate-y-0 opacity-100',
  sheetHidden: 'pointer-events-none translate-y-full opacity-0',
  sheet:
    'fixed inset-x-0 bottom-0 z-[101] transition-[translate,opacity] duration-300 ease-out',
  dialog: 'block w-full rounded-t-[28px] px-5 pb-7 pt-3',
  handleContainer: 'mb-5 flex justify-center',
  handle: 'h-[5px] w-11 rounded-full',
  heading: 'mb-3 px-3 text-[10px] font-medium uppercase',
  nav: 'flex flex-col gap-1',
  link: 'group relative flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-colors',
  index: 'text-[11px] tabular-nums',
  label: 'flex-1 text-[17px] font-semibold',
  activeDot: 'h-1.5 w-1.5 rounded-full',
  close: 'mt-5 w-full rounded-2xl py-3.5 text-sm font-medium transition-colors',
}

export default function MobileNav() {
  return <SharedMobileNav menu={SiteConfig.menu} classNames={classNames} />
}
