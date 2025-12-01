import { Page, Locator, expect } from '@playwright/test';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {
  ApiTaskInfoCollectionResponse,
  Configuration,
  ListTasksRequest,
  poll,
  TasksApi,
} from 'test-utils';

export const snapshotTimestampFormat = 'DD MMM YYYY - HH:mm:ss';

export const randomName = () => (Math.random() + 1).toString(36).substring(2, 6);

export const closeGenericPopupsIfExist = async (page: Page) => {
  const locatorsToCheck = [
    page.locator(`button[id^="pendo-close-guide-"]`), // This closes the pendo guide pop-up
    page.locator(`button[id="truste-consent-button"]`), // This closes the trusted consent pop-up
  ];

  for (const locator of locatorsToCheck) {
    await page.addLocatorHandler(locator, async () => {
      try {
        await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 1000 });
        await locator.first().click({ timeout: 10_000, noWaitAfter: true }); // There can be multiple toast pop-ups
      } catch {
        return;
      }
    });
  }
};

export const closeNotificationPopup = async (
  page: Page,
  popupText: string | RegExp,
  type: 'success' | 'danger' = 'success', // add other types like info, warning as needed
  timeout: number = 60000,
) => {
  const alertSelector = `.pf-v6-c-alert.pf-m-${type}`;
  const locator = page.locator(alertSelector).filter({ hasText: popupText });

  await expect(locator.first()).toBeVisible({ timeout });
  await locator.first().getByRole('button').first().click();
  await expect(locator.first()).toBeHidden();
};

export const filterByNameOrUrl = async (locator: Locator | Page, name: string) => {
  await locator.getByPlaceholder(/^Filter by name.*$/).fill(name);
  // We are expecting the first item in the table to contain the name
  // Ensure that your filter is unique to your repository!
  await expect(locator.getByRole('row').filter({ hasText: name })).toBeVisible();
};

export const clearFilters = async (locator: Locator | Page) => {
  try {
    await locator.getByRole('button', { name: 'Clear filters' }).waitFor({ timeout: 5000 });
  } catch {
    return;
  }

  await locator.getByRole('button', { name: 'Clear filters' }).click();
};

/**
 * Returns the locator for a given named row.
 * Conditionally filters if row is not present.
 * Set "forceFilter" to enforce filtering logic.
 **/
export const getRowByNameOrUrl = async (
  locator: Locator | Page,
  name: string,
  forceFilter: boolean = false,
): Promise<Locator> => {
  // First check if the row is visible, if so don't filter, and just return the target
  const target = locator.getByRole('row').filter({ hasText: name });
  if (await target.isVisible()) return target;

  await clearFilters(locator);
  if (!forceFilter && (await target.isVisible())) return target;

  // Now run the filter
  await filterByNameOrUrl(locator, name);
  return target;
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

export const waitForLastTaskStatus = async (
  client: Configuration,
  type: string,
  status: string,
) => {
  const waitCondition = (resp: ApiTaskInfoCollectionResponse) =>
    (resp.data?.filter((t) => t.status === status).length ?? 0) !== 1;
  const getTask = () =>
    new TasksApi(client).listTasks(<ListTasksRequest>{
      type: type,
      limit: 1,
    });

  return poll(getTask, waitCondition, 1000);
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
