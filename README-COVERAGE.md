# Playwright Coverage Metrics

This document explains how to use code coverage metrics with Playwright tests in the content-sources-frontend project.

## Overview

The coverage setup uses:
- **Playwright's built-in coverage API** for collecting JavaScript coverage during test execution
- **NYC (Istanbul)** for coverage reporting and threshold checking
- **v8-to-istanbul** for format conversion

## Installation

Dependencies are already included in `package.json`. If you need to install them:

```bash
yarn install
```

## Running Tests with Coverage

### Basic Test Run (without coverage)
```bash
yarn test-ui
```

### Run Tests with Coverage Collection
```bash
yarn test-ui:coverage
```

This will:
1. Run all Playwright tests with coverage collection enabled
2. Merge coverage reports from multiple test runs
3. Generate HTML, LCOV, and JSON coverage reports

### View Coverage Report
After running tests with coverage, open the HTML report:
```bash
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

## Coverage Configuration

### Coverage Thresholds
Coverage thresholds are configured in `.nycrc.json`:
- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

### Included Files
Coverage is collected for:
- `src/**/*.{ts,tsx}`

### Excluded Files
- Test files (`*.spec.ts`, `*.test.ts`)
- Node modules
- Build artifacts (`dist/`)
- Playwright test files (`_playwright-tests/`)
- Configuration files

## Using Coverage in Tests

### Option 1: Use Coverage Helper Functions

```typescript
import { test, expect } from '@playwright/test';
import { collectJSCoverage } from './helpers/coverage-helper';

test('My test with coverage', async ({ page }) => {
  await page.coverage.startJSCoverage();
  
  // Your test code here
  await page.goto('/some-page');
  
  // Collect coverage
  await collectJSCoverage(page, 'My test with coverage');
});
```

### Option 2: Use Coverage Fixture

```typescript
import { test, expect } from './fixtures/coverage-fixture';

test('My test with coverage', async ({ coveragePage }) => {
  // Coverage is automatically collected
  await coveragePage.goto('/some-page');
});
```

### Option 3: Manual Coverage Collection

```typescript
import { test, expect } from '@playwright/test';

test('My test with coverage', async ({ page }) => {
  await page.coverage.startJSCoverage();
  
  // Your test code
  await page.goto('/some-page');
  
  // Stop and save coverage
  const coverage = await page.coverage.stopJSCoverage();
  // Save coverage data...
});
```

## Coverage Reports

Reports are generated in the `coverage/` directory:

1. **HTML Report** (`coverage/index.html`)
   - Interactive browser-based report
   - Shows line-by-line coverage
   - Highlights covered/uncovered code

2. **LCOV Report** (`coverage/lcov.info`)
   - Standard format for CI/CD integration
   - Compatible with Codecov, Coveralls, etc.

3. **JSON Report** (`coverage/coverage-final.json`)
   - Machine-readable format
   - Used for programmatic analysis

4. **Text Summary** (console output)
   - Quick overview of coverage percentages

## CI/CD Integration

### GitHub Actions
The existing workflow can be extended to include coverage:

```yaml
- name: Run Playwright tests with coverage
  run: yarn test-ui:coverage
  env:
    COLLECT_COVERAGE: true

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    file: ./coverage/lcov.info
    flags: frontend
    name: frontend-coverage
```

### Other CI Platforms
Upload the `coverage/lcov.info` file to your coverage service:
- **Codecov**: `codecov -f coverage/lcov.info`
- **Coveralls**: `coveralls < coverage/lcov.info`
- **SonarQube**: Configure to read `coverage/lcov.info`

## Coverage Best Practices

1. **Run coverage regularly**: Include in your development workflow
2. **Set realistic thresholds**: Start lower and increase over time
3. **Focus on critical paths**: Prioritize coverage for important features
4. **Review uncovered code**: Identify gaps in test coverage
5. **Track trends**: Monitor coverage over time

## Troubleshooting

### No Coverage Data Collected
- Ensure `COLLECT_COVERAGE=true` is set
- Check that tests are using `page.coverage.startJSCoverage()`
- Verify the application is running and accessible

### Coverage Report Not Generated
- Run `yarn coverage:merge` manually
- Check that coverage files exist in `coverage/playwright/`
- Verify NYC is properly configured

### Low Coverage Scores
- Review uncovered files in HTML report
- Add tests for missing coverage
- Consider adjusting thresholds if needed

## Example Test File

See `_playwright-tests/coverage-example.spec.ts` for a complete example of how to collect coverage in your tests.

## Resources

- [Playwright Coverage API](https://playwright.dev/docs/api/class-coverage)
- [NYC Documentation](https://github.com/istanbuljs/nyc)
- [Istanbul Coverage](https://istanbul.js.org/)


