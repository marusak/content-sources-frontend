import { getConnectSnippetTabs } from './connectSnippets';

it.each(['validated', 'remediated'])(
  'uses the existing Python URL behavior for %s repositories',
  (securityLevel) => {
    const distributionUrl = `https://packages.redhat.com/lightwell/python/${securityLevel}/`;
    const tabs = getConnectSnippetTabs({
      name: `lightwell/python/${securityLevel}`,
      content_type: 'python',
      published_distribution_url: `https://packages.redhat.com/api/pulp-content/lightwell/python/${securityLevel}/`,
    });

    expect(tabs.find((tab) => tab.eventKey === 'pip')?.snippets[1].code).toBe(
      `pip config set global.index-url ${distributionUrl}simple`,
    );
    expect(tabs.find((tab) => tab.eventKey === 'pipenv')?.snippets[1].code).toBe(
      `pipenv install --index ${distributionUrl}simple`,
    );
    expect(tabs.find((tab) => tab.eventKey === 'poetry')?.snippets[1].code).toBe(
      `poetry source add --priority=default lightwell ${distributionUrl}`,
    );
    expect(tabs.find((tab) => tab.eventKey === 'uv')?.snippets[0].code).toBe(
      'machine packages.redhat.com login <service_account_username> password <service_account_token>',
    );
    expect(tabs.find((tab) => tab.eventKey === 'uv')?.snippets[1].code).toBe(
      `system-certs = true

[[index]]
name = "lightwell"
url = "${distributionUrl}simple"
default = true`,
    );
  },
);
