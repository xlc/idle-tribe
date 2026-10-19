import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:3019',
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'bun run build && bun tests/browser/serve.ts',
    url: 'http://127.0.0.1:3019',
  },
})
