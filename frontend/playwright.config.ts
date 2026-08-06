import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: { timeout: 15000 },
  retries: 0,
  use: {
    baseURL: 'http://localhost:9000',
    headless: true,
    viewport: { width: 1400, height: 1000 },
    actionTimeout: 15000,
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        channel: undefined,
        launchOptions: {
          executablePath:
            process.env.HOME +
            '/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell',
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    },
  ],
  reporter: [['list']],
});
