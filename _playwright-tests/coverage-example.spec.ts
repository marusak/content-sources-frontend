import { test, expect } from '@playwright/test';

/**
 * Example test file demonstrating coverage collection
 * 
 * To run with coverage:
 * COLLECT_COVERAGE=true yarn playwright test coverage-example
 */
test.describe('Coverage Collection Example', () => {
  test.beforeEach(async ({ page }) => {
    // Start JavaScript coverage collection
    if (process.env.COLLECT_COVERAGE === 'true') {
      await page.coverage.startJSCoverage();
    }
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Stop coverage and collect results
    if (process.env.COLLECT_COVERAGE === 'true') {
      const coverage = await page.coverage.stopJSCoverage();
      
      // Save coverage data
      if (coverage && coverage.length > 0) {
        const fs = require('fs');
        const path = require('path');
        const coverageDir = path.join(process.cwd(), 'coverage', 'playwright');
        fs.mkdirSync(coverageDir, { recursive: true });
        
        const safeTestName = testInfo.title.replace(/[^a-zA-Z0-9]/g, '-');
        const coverageFile = path.join(coverageDir, `coverage-${safeTestName}-${Date.now()}.json`);
        fs.writeFileSync(coverageFile, JSON.stringify(coverage, null, 2));
        console.log(`Coverage saved to: ${coverageFile}`);
      }
    }
  });

  test('Example: Navigate and collect coverage', async ({ page }) => {
    // Navigate to a page to collect coverage
    await page.goto(process.env.BASE_URL || 'http://localhost:8003');
    
    // Perform some actions that will exercise the code
    await page.waitForLoadState('networkidle');
    
    // Verify page loaded
    await expect(page).toHaveURL(/.*/);
  });
});


