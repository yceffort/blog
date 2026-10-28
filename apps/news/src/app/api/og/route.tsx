import {createOgImageRoute} from '@yceffort/shared/og'

import {SiteConfig} from '@/config'

export const GET = createOgImageRoute(SiteConfig.url)
