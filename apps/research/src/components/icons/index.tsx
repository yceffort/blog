import {SocialIcon as SharedSocialIcon} from '@yceffort/shared/components'
import type {ComponentProps} from 'react'

const classNames: ComponentProps<typeof SharedSocialIcon>['classNames'] = {
  size4: 'h-4 w-4',
  size5: 'h-5 w-5',
  size6: 'h-6 w-6',
  size8: 'h-8 w-8',
  size10: 'h-10 w-10',
  link: 'text-sm text-gray-500 transition hover:text-gray-600',
  label: 'sr-only',
  icon: 'fill-current text-gray-700 hover:text-blue-500 dark:text-gray-200 dark:hover:text-blue-400',
}

export default function SocialIcon(
  props: Omit<ComponentProps<typeof SharedSocialIcon>, 'classNames'>,
) {
  return <SharedSocialIcon {...props} classNames={classNames} />
}
