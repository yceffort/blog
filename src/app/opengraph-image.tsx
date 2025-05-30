import {ImageResponse} from 'next/og'

import OpenGraphComponent, {OpenGraphImageSize} from '#components/OpenGraph'
import {SiteConfig} from '#src/config'

export const runtime = 'edge'

export const alt = SiteConfig.author.name
export const size = OpenGraphImageSize

export const contentType = 'image/png'

// https://github.com/vercel/next.js/issues/48162#issuecomment-1540040105
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <OpenGraphComponent
        title="Welcome to yceffort's blog"
        url="https://yceffort.kr"
        tags={['blog', 'frontend']}
      />
    ),
    {...size},
  )
}
