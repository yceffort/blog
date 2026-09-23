import {defineConfig} from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: {timeout: 15000},
  workers: 1,
  use: {baseURL: 'http://localhost:3011', trace: 'retain-on-failure'},
  webServer: {
    command: 'node node_modules/next/dist/bin/next start --port 3011',
    url: 'http://localhost:3011/offline',
    reuseExistingServer: false,
  },
})
