import type {FC} from 'react'

import {
  FacebookIcon,
  GithubIcon,
  LinkedinIcon,
  MailIcon,
  TwitterIcon,
  YoutubeIcon,
} from './icons/social'

export interface SocialIconClassNames {
  size4: string
  size5: string
  size6: string
  size8: string
  size10: string
  link: string
  label: string
  icon: string
}

type IconType =
  | 'mail'
  | 'github'
  | 'facebook'
  | 'youtube'
  | 'linkedin'
  | 'twitter'

const Components: Record<IconType, FC<{className: string}>> = {
  mail: MailIcon,
  github: GithubIcon,
  facebook: FacebookIcon,
  youtube: YoutubeIcon,
  linkedin: LinkedinIcon,
  twitter: TwitterIcon,
}

const SocialIcon = ({
  kind,
  href,
  size = 8,
  classNames,
}: {
  kind: IconType
  href: string
  size?: 4 | 5 | 6 | 8 | 10
  classNames: SocialIconClassNames
}) => {
  const sizeClasses: Record<number, string> = {
    4: classNames.size4,
    5: classNames.size5,
    6: classNames.size6,
    8: classNames.size8,
    10: classNames.size10,
  }
  if (!href) {
    return null
  }

  const SocialSvg = Components[kind]

  return (
    <a
      className={classNames.link}
      target="_blank"
      rel="noopener noreferrer"
      href={href}
    >
      <span className={classNames.label}>{kind}</span>
      <SocialSvg className={`${classNames.icon} ${sizeClasses[size]}`} />
    </a>
  )
}

export default SocialIcon
