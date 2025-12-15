import {
  FacebookIcon,
  GithubIcon,
  LinkedinIcon,
  MailIcon,
  TwitterIcon,
  YoutubeIcon,
} from './icons/social'

import type {FC} from 'react'

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

const sizeClasses: Record<number, string> = {
  4: 'h-4 w-4',
  5: 'h-5 w-5',
  6: 'h-6 w-6',
  8: 'h-8 w-8',
  10: 'h-10 w-10',
}

const SocialIcon = ({
  kind,
  href,
  size = 8,
}: {
  kind: IconType
  href: string
  size?: 4 | 5 | 6 | 8 | 10
}) => {
  if (!href) {
    return null
  }

  const SocialSvg = Components[kind]

  return (
    <a
      className="text-sm text-gray-500 transition hover:text-gray-600"
      target="_blank"
      rel="noopener noreferrer"
      href={href}
    >
      <span className="sr-only">{kind}</span>
      <SocialSvg
        className={`fill-current text-gray-700 hover:text-blue-500 dark:text-gray-200 dark:hover:text-blue-400 ${sizeClasses[size]}`}
      />
    </a>
  )
}

export default SocialIcon
