import { test, expect } from 'test-utils';
import { ExecReturn } from './containers';
import { RHSMClient } from './rhsmClient';

/**
 * Execute command on client. Log it as separate test step.
 * In case that return code is not as expected, log stdout, stderr and fail the step.
 **/
export const runCmd = async (
  stepName: string,
  cmd: string[],
  client: RHSMClient,
  timeout?: number,
  expectedRC: number = 0,
): Promise<ExecReturn | void> =>
  await test.step(stepName, async () => {
    const res = await client.Exec(cmd, timeout);

    if (!res) {
      console.error(`❌ ${stepName} failed with unknown error`);
      expect(false, `${stepName} failed`).toBeTruthy();
    } else if (res.exitCode !== expectedRC) {
      console.error(`❌ ${stepName} failed with exit code ${res.exitCode}`);
      console.error(res.stdout);
      console.error(res.stderr);

      expect(res.exitCode, `${stepName} failed`).toBe(expectedRC);
    } else {
      console.log(`✅ ${stepName} succeeded`);
      expect(res.exitCode, `${stepName} succeeded`).toBe(expectedRC);
    }

    return res;
  });
