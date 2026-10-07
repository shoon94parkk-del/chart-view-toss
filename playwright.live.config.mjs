import { defineConfig, devices } from '@playwright/test';
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
export default defineConfig({
  testDir: './tests/live-e2e',
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 45_000 },
  outputDir: 'test-results/live',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/live', open: 'never' }]],
  use: {
    ...devices['Pixel 5'], browserName: 'chromium', baseURL, locale: 'ko-KR',
    trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure',
    // Only needed inside proxy-based Codex environments. GitHub runners omit this.
    ...(process.env.E2E_PROXY_SERVER ? { proxy: { server: process.env.E2E_PROXY_SERVER, bypass: '127.0.0.1,localhost' } } : {}),
  },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
    url: `${baseURL}/`, reuseExistingServer: !process.env.CI,
  },
});
