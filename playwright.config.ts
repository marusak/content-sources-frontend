import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(__dirname, './.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './_playwright-tests/',
  fullyParallel: false,
  forbidOnly: false,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 3 : undefined,
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
  globalTimeout: (process.env.INTEGRATION ? 35 : 20) * 60 * 1000,
  timeout: (process.env.INTEGRATION ? 6 : 4) * 60 * 1000, // 6m || 4m
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
    ...(process.env.PROXY
      ? {
          proxy: {
            server: process.env.PROXY,
          },
        }
      : {}),
    testIdAttribute: 'data-ouia-component-id',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/, use: { trace: 'off' } },
    process.env.INTEGRATION
      ? {
          name: 'integration',
          grepInvert: process.env.PROD
            ? [/preview-only/, /switch-to-preview/, /local-only/]
            : [/switch-to-preview/, /local-only/],
          use: {
            ...devices['Desktop Chrome'],
            storageState: `.auth/admin_user.json`,
          },
          testIgnore: ['**/UI/**'],
          testDir: './_playwright-tests/Integration/',
          dependencies: ['setup'],
        }
      : {
          name: 'UI',
          use: {
            ...devices['Desktop Chrome'],
            storageState: '.auth/admin_user.json',
          },
          testIgnore: ['**/Integration/**'],
          testDir: './_playwright-tests/UI/',
          dependencies: ['setup'],
        },
    ...(process.env.INTEGRATION && process.env.PROD
      ? [
          {
            name: 'Switch to preview',
            grep: [/switch-to-preview/],
            use: {
              ...devices['Desktop Chrome'],
              storageState: `.auth/admin_user.json`,
            },
            dependencies: ['setup', 'integration'],
          },
          {
            name: 'Run preview only',
            grep: [/preview-only/],
            use: {
              ...devices['Desktop Chrome'],
              storageState: `.auth/admin_user.json`,
            },
            testDir: './_playwright-tests/Integration',
            dependencies: ['Switch to preview'],
          },
        ]
      : []),
  ],
});
