import {SocialIcon as SharedSocialIcon} from '@yceffort/shared/components'
import type {ComponentProps} from 'react'

import {socialIconClassNames} from '@/components/icons/SocialIcon.styles'

export default function SocialIcon(
  props: Omit<ComponentProps<typeof SharedSocialIcon>, 'classNames'>,
) {
  return <SharedSocialIcon {...props} classNames={socialIconClassNames} />
}
