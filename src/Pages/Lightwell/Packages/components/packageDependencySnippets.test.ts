import { getPythonPackageUsageSnippetTabs } from './packageDependencySnippets';

it.each([
  ['validated', '2.21.2'],
  ['remediated', '3.0.1+rhlw.2'],
])('keeps the Python snippet URLs for %s packages', (securityLevel, version) => {
  const sourceUrl = `https://packages.redhat.com/lightwell/python/${securityLevel}`;
  const tabs = getPythonPackageUsageSnippetTabs({
    name: 'lightwell-fixture',
    release: version,
    sourceUrl,
  });

  expect(tabs.find((tab) => tab.eventKey === 'pip')?.snippets[0].code).toContain(
    `pip install --index-url ${sourceUrl}/simple lightwell-fixture==${version}`,
  );
  expect(tabs.find((tab) => tab.eventKey === 'uv')?.snippets[0].code).toContain(
    `uv pip install --system-certs --index-url ${sourceUrl}/simple lightwell-fixture==${version}`,
  );
  expect(tabs.find((tab) => tab.eventKey === 'requirements.txt')?.snippets[0].code).toContain(
    `--index-url ${sourceUrl}\nlightwell-fixture==${version}`,
  );
  expect(tabs.find((tab) => tab.eventKey === 'pip.conf')?.snippets[0].code).toContain(
    `index-url = ${sourceUrl}`,
  );
});

it.each(['validated', 'remediated'])(
  'adds one slash before simple for %s packages with a trailing slash',
  (securityLevel) => {
    const sourceUrl = `https://packages.redhat.com/lightwell/python/${securityLevel}/`;
    const tabs = getPythonPackageUsageSnippetTabs({
      name: 'lightwell-fixture',
      release: '3.0.1+rhlw.2',
      sourceUrl,
    });

    expect(tabs.find((tab) => tab.eventKey === 'pip')?.snippets[0].code).toContain(
      `pip install --index-url ${sourceUrl}simple lightwell-fixture==3.0.1+rhlw.2`,
    );
    expect(tabs.find((tab) => tab.eventKey === 'uv')?.snippets[0].code).toContain(
      `uv pip install --system-certs --index-url ${sourceUrl}simple lightwell-fixture==3.0.1+rhlw.2`,
    );
  },
);
