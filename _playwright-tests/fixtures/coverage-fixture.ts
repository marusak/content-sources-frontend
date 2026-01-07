import { test as testUtils } from 'test-utils';
import { mergeTests } from '@playwright/test';
import { collectJSCoverage, setupCoverage } from '../helpers/coverage-helper';
import type { Page } from '@playwright/test';

// Create a coverage fixture that extends the page fixture from test-utils
// This automatically adds coverage collection to the 'page' fixture
const coverageTest = testUtils.extend<{ page: Page }>({
  page: async ({ page }, use, testInfo) => {
    // Start coverage collection if enabled
    if (process.env.COLLECT_COVERAGE === 'true') {
      await page.coverage.startJSCoverage();
      await setupCoverage(page);
    }

    // Use the page as normal - this is the standard page fixture
    // All existing tests using 'page' will work without changes
    await use(page);

    // Collect coverage after test completes
    if (process.env.COLLECT_COVERAGE === 'true') {
      await collectJSCoverage(page, testInfo.title);
    }
  },
});

// Merge with test-utils - this extends the page fixture automatically
// When imported, this provides the same API as test-utils but with coverage
export const test = mergeTests(testUtils, coverageTest);
export { expect } from '@playwright/test';

// Re-export everything from test-utils so this is a complete drop-in replacement
export * from 'test-utils';


