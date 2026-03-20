import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  webServer: [
    {
      command: 'cd .. && AZURE_MOCK=true pnpm --filter api dev',
      port: 3002,
      reuseExistingServer: true,
    },
    {
      command: 'cd .. && pnpm --filter web dev',
      port: 5173,
      reuseExistingServer: true,
    },
  ],
})
