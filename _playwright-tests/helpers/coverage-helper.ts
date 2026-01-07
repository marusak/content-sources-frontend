import { Page } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Helper to collect and save coverage data from Playwright tests
 */
export async function collectCoverage(page: Page, testName: string) {
  try {
    // Collect coverage from the page
    const coverage = await page.evaluate(() => {
      // @ts-ignore - Coverage API is available in browser
      if (window.__coverage__) {
        // @ts-ignore
        return window.__coverage__;
      }
      return null;
    });

    if (coverage) {
      // Ensure coverage directory exists
      const coverageDir = join(process.cwd(), 'coverage', 'playwright');
      mkdirSync(coverageDir, { recursive: true });

      // Save coverage data
      const safeTestName = testName.replace(/[^a-zA-Z0-9]/g, '-');
      const coverageFile = join(coverageDir, `${safeTestName}-${Date.now()}.json`);
      writeFileSync(coverageFile, JSON.stringify(coverage, null, 2));
      return coverageFile;
    }
  } catch (error) {
    console.warn('Could not collect coverage:', error);
  }
  return null;
}

/**
 * Setup coverage collection for a page
 */
export async function setupCoverage(page: Page) {
  await page.addInitScript(() => {
    // Enable coverage collection
    // @ts-ignore
    window.__coverage__ = {};
  });
}

/**
 * Collect JavaScript coverage using Playwright's built-in API
 */
export async function collectJSCoverage(page: Page, testName: string): Promise<string | null> {
  try {
    const coverage = await page.coverage.stopJSCoverage();
    
    if (coverage && coverage.length > 0) {
      // Ensure coverage directory exists
      const coverageDir = join(process.cwd(), 'coverage', 'playwright');
      mkdirSync(coverageDir, { recursive: true });

      // Save coverage data
      const safeTestName = testName.replace(/[^a-zA-Z0-9]/g, '-');
      const coverageFile = join(coverageDir, `js-coverage-${safeTestName}-${Date.now()}.json`);
      writeFileSync(coverageFile, JSON.stringify(coverage, null, 2));
      return coverageFile;
    }
  } catch (error) {
    console.warn('Could not collect JS coverage:', error);
  }
  return null;
}


