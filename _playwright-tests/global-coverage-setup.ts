import { FullConfig } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Global setup for coverage collection
 * This ensures the coverage directory exists before tests run
 */
async function globalSetup(config: FullConfig) {
  if (process.env.COLLECT_COVERAGE === 'true') {
    const coverageDir = join(process.cwd(), 'coverage', 'playwright');
    mkdirSync(coverageDir, { recursive: true });
    console.log('Coverage collection enabled. Coverage directory created:', coverageDir);
  }
}

export default globalSetup;

