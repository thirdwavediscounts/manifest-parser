import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.pw.test.ts',
  timeout: 60_000,
  retries: 1,
  use: {
    channel: 'chromium',
  },
  projects: [
    {
      name: 'chromium',
      use: { channel: 'chromium' },
    },
  ],
})
