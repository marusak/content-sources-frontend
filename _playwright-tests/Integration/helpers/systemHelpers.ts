import { Page } from '@playwright/test';

// sleep in ms, must await e.g. await sleep(num)
export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Polls the API to check if a system with the given host name is attached to a template.
 * @param page - Playwright Page object
 * @param hostname - The display name of the system to check
 * @param expectedAttachment - Whether to expect the system to be attached (true) or not attached (false) (default: true)
 * @param delayMs - Delay between polling attempts in milliseconds (default: 10000ms / 10s)
 * @param maxAttempts - Number of times to poll (default: 10)
 * @returns Promise<boolean> - true if system is in the expected state, false otherwise
 */
export const pollForSystemTemplateAttachment = async (
  page: Page,
  hostname: string,
  expectedAttachment: boolean = true,
  delayMs: number = 10_000,
  maxAttempts: number = 10,
): Promise<boolean> => {
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    let shouldRetry = false;

    try {
      // Query the systems API with search filter for the host name
      const response = await page.request.get(
        `/api/patch/v3/systems?search=${encodeURIComponent(hostname)}&limit=100`,
      );

      if (response.status() !== 200) {
        console.log(
          `API request failed with status ${response.status()}, attempt ${attempts}/${maxAttempts}`,
        );
        shouldRetry = true;
      } else {
        const body = await response.json();

        if (!body.data || !Array.isArray(body.data)) {
          console.log(`Invalid response format, attempt ${attempts}/${maxAttempts}`);
          shouldRetry = true;
        } else {
          // Find the system with matching host name
          const system = body.data.find(
            (sys: { attributes: { display_name: string } }) =>
              sys.attributes.display_name === hostname,
          );

          if (!system) {
            // System not found in inventory
            if (expectedAttachment === false) {
              // The system is expected to not be attached and so if it's not in inventory,
              // that's a success (system was removed)
              console.log(
                `System '${hostname}' not found in inventory (as expected - system removed)`,
              );
              return true;
            } else {
              // If we expect the system to be attached but it's not found,
              // continue polling as it might be slow to appear
              console.log(
                `System '${hostname}' not found in inventory, attempt ${attempts}/${maxAttempts}`,
              );
              shouldRetry = true;
            }
          } else {
            // Check if system has a template_uuid assigned
            const hasTemplate = !!system.attributes?.template_uuid;

            // If the system is in the expected state, return early
            if (hasTemplate === expectedAttachment) {
              const message = hasTemplate
                ? `System '${hostname}' is attached to template: ${system.attributes.template_name} (as expected)`
                : `System '${hostname}' is not attached to any template (as expected)`;
              console.log(message);
              return true;
            } else {
              const message = hasTemplate
                ? `System '${hostname}' is attached to template but expected not to be, attempt ${attempts}/${maxAttempts}`
                : `System '${hostname}' is not attached to template but expected to be, attempt ${attempts}/${maxAttempts}`;
              console.log(message);
              shouldRetry = true;
            }
          }
        }
      }
    } catch (error) {
      console.log(
        `Error checking system template attachment: ${error}, attempt ${attempts}/${maxAttempts}`,
      );
      shouldRetry = true;
    }

    // Check if we should retry with delay
    if (shouldRetry && attempts < maxAttempts) {
      await sleep(delayMs);
    }
  }

  return false;
};
