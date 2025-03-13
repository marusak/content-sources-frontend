import { Page, Locator, expect } from '@playwright/test';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

export const snapshotTimestampFormat = 'DD MMM YYYY - HH:mm:ss';

export const closePopupsIfExist = async (page: Page) => {
  const locatorsToCheck = [
    page.locator('.pf-v5-c-alert.notification-item button'), // This closes all toast pop-ups
    page.locator(`button[id^="pendo-close-guide-"]`), // This closes the pendo guide pop-up
    page.locator(`button[id="truste-consent-button"]`), // This closes the trusted consent pop-up
    page.getByLabel('close-notification'), // This closes a one off info notification (May be covered by the toast above, needs recheck.)
  ];

  for (const locator of locatorsToCheck) {
    await page.addLocatorHandler(locator, async () => {
      try {
        await locator.first().click(); // There can be multiple toast pop-ups
      } catch {
        return;
      }
    });
  }
};
export const filterByNameOrUrl = async (page: Page, name: string) => {
  await page.getByPlaceholder(/^Filter by name.*$/).fill(name);
  // We are expecting the first item in the table to contain the name
  // Ensure that your filter is unique to your repository!
  await expect(page.getByRole('row').filter({ has: page.getByText(name) })).toBeVisible();
};

export const clearFilters = async (page: Page) => {
  try {
    await page.getByRole('button', { name: 'Clear filters' }).waitFor({ timeout: 5000 });
  } catch {
    return;
  }

  await page.getByRole('button', { name: 'Clear filters' }).click();
};

export const getRowByNameOrUrl = async (page: Page, name: string): Promise<Locator> => {
  await clearFilters(page);
  await filterByNameOrUrl(page, name);
  return page.getByRole('row').filter({ has: page.getByText(name) });
};

export const getRowCellByHeader = async (page: Page, row: Locator, name: string) => {
  await expect(page.getByRole('columnheader', { name: name })).toBeVisible();
  const table = row.locator('xpath=ancestor::*[@role="grid" or @role="table"][1]');
  const headers = table.getByRole('columnheader');
  const headerCount = await headers.count();

  let index = -1;
  for (let i = 0; i < headerCount; i++) {
    let headerContent = (await headers.nth(i).textContent()) || '';
    headerContent = headerContent.trim();

    if (headerContent.includes(name)) {
      index = i;
      break;
    }
  }

  if (index == -1) {
    throw new Error(`Header "${name}" not found in the table/grid.`);
  }

  return row.getByRole('gridcell').nth(index);
};

export const validateSnapshotTimestamp = async (timestamp: string, howRecent: number) => {
  /**
   * Checks whether the Snaphot timestamp is recent to validate if the Snapshot was created successfully
   * @param timestamp - Snapshot timestamp in string format
   * @param howRecent - How recent the timestamp should be in minutes
   * @returns true if the timestamp is less recent than howRecent, false otherwise
   */
  dayjs.extend(customParseFormat);
  const formattedTimestamp = dayjs(timestamp, snapshotTimestampFormat);
  const currentTime = dayjs();
  // Compare the timestamp difference to current time in minutes
  const difference = formattedTimestamp.diff(currentTime, 'minute');
  if (difference > howRecent) {
    return false;
  }
  return true;
};

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForTaskPickup = async (page: Page, repoUrl: string, type: string) => {
  const response = await page.request.get(`/api/content-sources/v1/repositories/?url=${repoUrl}`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(Array.isArray(body.data)).toBeTruthy();
  const uuidList = body.data.map((data: { uuid: string }) => data.uuid) as string[];
  expect(uuidList.length).toEqual(1);
  const repoUuid = uuidList[0];

  await expect
    .poll(
      async () => {
        const response = await page.request.get(
          `/api/content-sources/v1/tasks/?repository_uuid=${repoUuid}&type=${type}&status=pending&limit=1`,
        );
        const body = await response.json();
        const data = Array.from(body.data);
        return data.length == 0;
      },
      {
        message: 'make sure the task gets picked up',
        intervals: [1_000, 2_000, 5_000, 10_000],
        timeout: 300_000, // 5 min
      },
    )
    .toBeTruthy();
};

export const retry = async (
  page: Page,
  callback: (page: Page) => Promise<void>,
  tries = 3,
  delay?: number,
) => {
  let rc = tries;
  while (rc >= 0) {
    if (delay) {
      sleep(delay);
    }

    rc -= 1;
    if (rc === 0) {
      return await callback(page);
    } else {
      try {
        await callback(page);
      } catch {
        continue;
      }
      break;
    }
  }
};
