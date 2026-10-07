import { defineConfig } from '@playwright/test'

const baseURL = process.env.MEDIAPHILE_E2E_BASE_URL
if (!baseURL) throw new Error('Use npm run e2e:real to create and launch the isolated server fixture')

export default defineConfig({
  testDir: './e2e/real',
  workers: 1,
  retries: 0,
  timeout: 35000,
  use: {
    baseURL,
    browserName: 'chromium',
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  },
})
