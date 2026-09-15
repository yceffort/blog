import {fileURLToPath} from 'node:url'

import babelConfig from './.babelrc.json' with {type: 'json'}

export default {
  plugins: {
    [fileURLToPath(new URL('./scripts/postcss-imports.cjs', import.meta.url))]:
      {},
    '@stylexjs/postcss-plugin': {
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      babelConfig: {
        babelrc: false,
        configFile: false,
        parserOpts: {plugins: ['typescript', 'jsx']},
        plugins: babelConfig.plugins,
      },
      // Authored layers in browser.css order typography, UI, and preferences.
      // Do not add another generated layer hierarchy around those layers.
      useCSSLayers: false,
    },
    [fileURLToPath(new URL('./scripts/postcss-optimize.cjs', import.meta.url))]:
      {},
  },
}
