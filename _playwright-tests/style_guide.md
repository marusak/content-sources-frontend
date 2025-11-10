# Playwright Style Guide 💅

This style guide outlines the standards and best practices for writing Playwright tests based on the experience gathered during the creation of the Playwright PoC and further efforts.

Most of the things here are in-line with the [official Playwright best practices/guidelines](https://playwright.dev/docs/best-practices).

> [!TIP]
> The official Playwright documentation is **awesome** and should be your first stop for any questions you have about Playwright. Often this will pay off more than jumping into AI chat-bots first.

## Table of Contents 📜

- [Playwright Style Guide 💅](#playwright-style-guide-)
  - [Table of Contents 📜](#table-of-contents-)
  - [Best Practices ✨](#best-practices-)
  - [Test Structure 🏗](#test-structure-)
  - [Selectors 🎯](#selectors-)
  - [Assertions 🔍](#assertions-)
    - [Common Assertions](#common-assertions)
    - [Non-DOM Assertions](#non-dom-assertions)
  - [Debugging 🐛](#debugging-)
    - [Playwright Inspector](#playwright-inspector)
    - [Trace Viewer](#trace-viewer)
    - [`page.pause()`](#pagepause)
    - [VS Code Extension](#vs-code-extension)
  - [Caveats, gotchas and things to be aware of ⚠](#caveats-gotchas-and-things-to-be-aware-of-)

## Best Practices ✨

1. **Test isolation**: \
   Each test should be independent and shouldn't rely on state from other tests.

2. **Test idempotency**: \
   Each test should be idempotent, i.e. be able to run on repeat with the same _(successful)_ outcome.

3. **Parallelization**: \
   Structure tests to run in parallel for faster execution. Optimize and review the length of tests, as you want a speedy feedback loop.

4. **Use playwright's capturing features**: \
   Configure Playwright to take screenshots, videos, and record test traces on test failures. Ideally use some tool to collect and visualize them.

5. **Don't try to reinvent the wheel**: \
   Simplicity is king, tests can be simple. Only reach for custom (complicated and hard to maintain) things if there isn't a good solution out of the box. _(for vast majority of things there is)_

6. **Keep abstractions to minimum**: \
   To keep tests readable and maintainable, define selectors directly within the test where they are used. Avoid abstracting selectors into separate files and don't use page objects. The test should be easy to understand and readable as an article, after which you know what it does and don't have more questions than answers.

7. **Helpers and fixtures**: \
   Extend Playwright with custom functionality only when the abstracted thing is generic enough.
   - Good examples: cleanup of resources before and after a test, navigation to your app with auto retrying, locating a row in a table.
   - Bad examples: page objects, clicking on a button, filling in a form (that's the core of the test, if you want to use that for setting up the test environment use the API).

8. **Use the built-in Playwright auto-waiting functionality and not sleep:** \
   Playwright provides [auto-waiting](https://playwright.dev/docs/actionability) for actions inside tests (e.g. clicking a button is an action). These perform a range of actionability checks on the elements before making actions to ensure these actions behave as expected.
   This eliminates the need to use manual wait or sleep statements that make tests flaky and slow.

9. **Describe tests**:
   - Use clear descriptive test names that explain what you're testing.
   - Group tests in describe blocks if they relate to the overarching feature.
   - Use steps to describe what the test does in more detail, these show up in the test report.
   - Don't use comments to describe the test, as they will not be visible in the report (only use them if you need to explain the code further, not the test).

10. **API tests**: \
    If you are heavily interacting with your API, or writing API tests, consider using an openapi generator to generate the API client and a fixture to set up the API client for all tests that need it.

## Test Structure 🏗

A good test structure makes it easier to locate, run, and maintain tests. Consider organizing your tests by feature or page.

Recommended directory and file structure:

```sh
/_playwright-tests
  /utils                 # Testing utilities
    /helpers             # Helper functions/snippets
    /fixtures            # Playwright automatic fixtures
  /UI                    # UI/API depending on the repository, containing the tests (used in PR checks)
    some-feature.spec.ts
  /Integration           # Integration tests (used in nightly longer running tests)
    integration-workflow.spec.ts
```

Each test file should follow this general structure:

```typescript name=example.spec.ts
import { test, expect } from '@playwright/test';
import { someHelper, closePopups } from '../utils/helpers';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Common setup for each test, like logging in or navigating to a base URL
    await page.goto('/some-page');
    await closePopups(page);
  });

  test('should perform some action correctly', async ({ page }) => {
    await test.step('Fill out the form', async () => {
      await page.getByRole('textbox', { name: 'Username' }).fill('user');
      await page.getByRole('textbox', { name: 'Password' }).fill('password');
      await page.getByRole('button', { name: 'Log in' }).click();
    });

    await test.step('Verify successful login', async () => {
      await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
    });
  });
});
```

## Selectors 🎯

In order of preference, use these selector strategies (ideally just stick to the first two):

1. **Roles with name**

   This is highly preferred, because this selector actually reflects how
   users and assistive technology perceive the page, i.e. tests user-visible behavior.
   Keep in mind that the name is an [accessible name](https://w3c.github.io/accname/#dfn-accessible-name), not just the HTML 'name' attribute.

   ```typescript
   page.getByRole('button', { name: 'Submit' });
   ```

2. **Text content** (when applicable)
   If possible, use with the `exact` option set to true.

   ```typescript
   page.getByText('Welcome to the application');
   ```

3. **Test IDs** (only for hard to locate elements)

   ```typescript
   page.getByTestId('submit-button');
   ```

4. **CSS selectors** (only when necessary)

   ```typescript
   page.locator('.card-container .card-title');
   ```

For more complex scenarios, you can chain locators or use `locator.filter()` to narrow down the results.

Avoid using:

- XPath selectors unless absolutely necessary
- Selectors that depend on specific layout or styling that might change

## Assertions 🔍

Use Playwright's web-first assertions to create more reliable tests. These assertions automatically wait for the expected condition to be met before passing or failing, which helps eliminate flakiness.

```typescript
// Good: Playwright waits for the element to be visible
await expect(page.getByText('Success!')).toBeVisible();

// Bad: Does not wait, might be flaky
expect(await page.getByText('Success!').isVisible()).toBe(true);
```

### Common Assertions

- `toBeVisible()`: Checks if an element is in the DOM and visible.
- `toHaveText()`: Checks if an element has the specified text content.
- `toHaveCount()`: Checks if a locator resolves to a specific number of elements.
- `toBeEnabled()`: Checks if an element is enabled.

For negative assertions, use the appropriate negative matcher rather than the `not` modifier when available:
Negative assertions: `await expect(page.getByText('Error')).toBeHidden();`

### Non-DOM Assertions

For checks that don't involve the DOM (e.g. API responses, or other async operations that don't have a UI expression), you can use `expect.poll`.

```typescript
await expect
  .poll(
    async () => {
      const response = await page.request.get('/api/status');
      return response.status();
    },
    {
      message: 'Expected API to return 200',
      timeout: 10000,
    },
  )
  .toBe(200);
```

For assertion of one out of many, or multiple checks at once, you can also use the `race` and `all` from the JS promises.
Example:

```typescript
await Promise.all([
  page.waitForResponse(
    (resp) => resp.url().includes('bulk_delete') && resp.status() >= 200 && resp.status() < 300,
  ),
  page.getByRole('button', { name: 'Remove' }).click(),
]);
```

## Debugging 🐛

Playwright offers several powerful tools for debugging your tests (ex. headed and debug mode, trace viewer, codegen). These tools can be accessed through Playwright's CLI or IDE extension. Some examples:

### Playwright Inspector

The Inspector is a GUI tool that helps you step through your tests, see what Playwright is doing, and explore selectors.
The editable selector explorer at the bottom of the page can be really useful for creating good selectors.💡

Run your tests with the `--debug` flag to open the Inspector:

```bash
npx playwright test --debug
```

### Trace Viewer

The Trace Viewer provides a detailed trace of your test execution, including screenshots, actions, and logs. It's invaluable for diagnosing failures after a test run.

Enable it in your `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    trace: 'on', // or 'on-first-retry', 'retain-on-failure'
  },
});
```

Then view the trace with:

```bash
npx playwright show-trace trace.zip
```

### `page.pause()`

Insert `await page.pause()` into your test to pause execution and open a browser window with debugging tools. This allows you to inspect the page state at a specific point in your test.

### VS Code Extension

The official [Playwright Test for VS Code](https://playwright.dev/docs/getting-started-vs-code) extension offers a great debugging experience directly within your editor, including running tests with a single click, setting breakpoints, and live debugging.
But don't worry, the vast majority if not everything can be achieved through the CLI, so you can use your preferred editor of choice.

## Caveats, gotchas and things to be aware of ⚠

- When working with PF modals, wizards, and dialogs, there is a problem where they can incorrectly 'hide' or disable the page behind them.
  - This can cause issues with Playwright, as it might try to interact with elements that are and should not visible or enabled.
  - To work around this, you can target the dialog and save it to a variable, then use that variable to interact with any elements inside the dialog.

    ```typescript
    const modal = page.getByRole('dialog', { name: 'Title' });
    modal.getByRole('button', { name: 'Submit' }).click();
    ```

- Navigation inside Insights (stage and proxy especially) can be flaky.
  - This can be caused by multiple reasons (stage or proxy instability, sentry errors, cache failures, slow loading).
  - If you are experiencing this, try to add retry logic to auth and navigation steps.
