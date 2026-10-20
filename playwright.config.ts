import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    {
      name: 'ios-webkit',
      testMatch: [
        '**/pwa.spec.ts',
        '**/responsive.spec.ts',
        '**/opening.spec.ts',
        '**/indicators.spec.ts',
      ],
      use: { ...devices['iPhone 13'], browserName: 'webkit' },
    },
  ],
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
