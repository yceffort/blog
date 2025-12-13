import Image from 'next/image'
import {ViewTransition} from 'react'

import profile from '#public/profile.jpeg'

type ProfileImageSize = 32 | 40 | 192

const sizeClasses: Record<ProfileImageSize, string> = {
  32: 'h-8 w-8',
  40: 'h-10 w-10',
  192: 'h-48 w-48',
}

export default function ProfileImage({
  size = 40,
  transitionName,
}: {
  size?: ProfileImageSize
  transitionName?: string
}) {
  const image = (
    <Image
      src={profile}
      alt="avatar"
      width={size}
      height={size}
      className={`${sizeClasses[size]} rounded-full`}
    />
  )

  if (transitionName) {
    return <ViewTransition name={transitionName}>{image}</ViewTransition>
  }

  return image
}
