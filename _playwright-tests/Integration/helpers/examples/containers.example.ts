import { killContainer, runCommand, startNewContainer } from '../containers';
import { test } from '@playwright/test';

test('Container example', async ({}) => {
  await startNewContainer('my_container', 'quay.io/jlsherri/client-rhel9:latest');

  const stream = await runCommand('my_container', ['ls', '-l']);
  if (stream != undefined) {
    console.log(stream.stdout);
    console.log(stream.stderr);
    console.log(stream.exitCode);
  }

  const stream2 = await runCommand('my_container', ['ls', '-z']);
  if (stream2 != undefined) {
    console.log(stream2.stdout);
    console.log(stream2.stderr);
    console.log(stream2.exitCode);
  }

  await killContainer('my_container');
});
