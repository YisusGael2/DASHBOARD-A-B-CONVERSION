import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:8080',
    headless: true,
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:8080/api/health',
    reuseExistingServer: !process.env.CI,
    env: { NODE_ENV: 'production', PORT: '8080', DEMO_MODE: 'true' },
    timeout: 30_000,
  },
});
