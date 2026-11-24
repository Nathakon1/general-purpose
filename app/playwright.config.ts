import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  expect: { timeout: 120_000 },
  workers: 1,
  use: { baseURL: 'http://localhost:4173/', ...devices['Pixel 7'], locale: 'th-TH', timezoneId: 'Asia/Bangkok' },
  webServer: { command: 'npm run preview -- --strictPort', url: 'http://localhost:4173/', reuseExistingServer: true },
});
