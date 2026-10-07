import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // A retry produces extra evidence; a flaky retry still blocks deployment in CI.
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: Boolean(process.env.CI),
  workers: process.env.CI ? 2 : 3,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  outputDir: 'test-results',
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
    { name: 'narrow-chromium', use: { browserName: 'chromium', viewport: { width: 320, height: 693 }, isMobile: true, hasTouch: true } },
    { name: 'android-chromium', use: { ...devices['Pixel 5'] } },
    { name: 'iphone-small-webkit', use: { ...devices['iPhone SE'], defaultBrowserType: 'webkit', browserName: 'webkit' } },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
    url: `${baseURL}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
