/**
 * iOS 홈 화면 앱의 스플래시 이미지를 만든다. 동작은 packages/shared/scripts/splash.mjs 참고.
 *
 * 사용법: node scripts/generate-splash.mjs
 */
import {fileURLToPath} from 'node:url'

import {generateSplash} from '@yceffort/shared/scripts/splash'

await generateSplash({
  appDir: fileURLToPath(new URL('..', import.meta.url)),
  name: 'yceffort',
  tagline: 'Frontend-focused full stack engineer',
})
