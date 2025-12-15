import naverpay from '@naverpay/eslint-config'
import naverpayPlugin from '@naverpay/eslint-plugin'
import {defineConfig} from 'eslint/config'

export default defineConfig([
  ...naverpay.configs.react,
  {
    plugins: {
      '@naverpay': naverpayPlugin,
    },
  },
])
