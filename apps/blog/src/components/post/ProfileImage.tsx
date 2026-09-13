import * as stylex from '@stylexjs/stylex'
import Image from 'next/image'
import {ViewTransition} from 'react'

import profile from '@/public/profile.jpeg'
const sx = stylex.create({
  size32: {
    '@layer utilities': {
      height: 'calc(var(--spacing) * 8)',
      width: 'calc(var(--spacing) * 8)',
    },
  },
  size36: {
    '@layer utilities': {
      height: 'calc(var(--spacing) * 9)',
      width: 'calc(var(--spacing) * 9)',
    },
  },
  size40: {
    '@layer utilities': {
      height: 'calc(var(--spacing) * 10)',
      width: 'calc(var(--spacing) * 10)',
    },
  },
  size192: {
    '@layer utilities': {
      height: 'calc(var(--spacing) * 48)',
      width: 'calc(var(--spacing) * 48)',
    },
  },
  image: {
    '@layer utilities': {
      borderRadius: 'calc(infinity * 1px)',
    },
  },
})
type ProfileImageSize = 32 | 36 | 40 | 192
const sizeClasses: Record<ProfileImageSize, string> = {
  32: stylex.props(sx.size32).className ?? '',
  36: stylex.props(sx.size36).className ?? '',
  40: stylex.props(sx.size40).className ?? '',
  192: stylex.props(sx.size192).className ?? '',
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
      className={
        sizeClasses[size] + ' ' + (stylex.props(sx.image).className ?? '')
      }
    />
  )
  if (transitionName) {
    return <ViewTransition name={transitionName}>{image}</ViewTransition>
  }
  return image
}
