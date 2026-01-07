import { test as base } from 'test-utils';
import { collectJSCoverage, setupCoverage } from '../helpers/coverage-helper';

type CoverageFixtures = {
  coveragePage: any;
};

export const test = base.extend<CoverageFixtures>({
  coveragePage: async ({ page }, use, testInfo) => {
    await page.coverage.startJSCoverage();
    await setupCoverage(page);

    await use(page);

    if (process.env.COLLECT_COVERAGE === 'true') {
      await collectJSCoverage(page, testInfo.title);
    }
  },
});

export { expect } from '@playwright/test';


