import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './_playwright-tests/',
  fullyParallel: false,
  forbidOnly: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [
        ['html', { outputFolder: 'playwright-report' }],
        [
          'playwright-ctrf-json-reporter',
          { outputDir: 'playwright-ctrf', outputFile: 'playwright-ctrf.json' },
        ],
        ['@currents/playwright'],
      ]
    : 'list',
  globalTimeout: 29.5 * 60 * 1000, // 29.5m, Set because of codebuild, we want PW to timeout before CB to get the results.
  timeout: 10 * 60 * 1000, // 10m
  expect: { timeout: 30_000 }, // 30s
  use: {
    actionTimeout: 30_000, // 30s
    navigationTimeout: 30_000, // 30s
    launchOptions: {
      args: ['--use-fake-device-for-media-stream'],
    },
    ...(process.env.TOKEN
      ? {
          extraHTTPHeaders: {
            Authorization: process.env.TOKEN,
          },
        }
      : {}),
    baseURL: process.env.BASE_URL,
    ignoreHTTPSErrors: true,
          ...process.env.PROXY ? {
          proxy: {
              server: process.env.PROXY,
          }
      } : {},
    testIdAttribute: 'data-ouia-component-id',
    screenshot: 'on',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
