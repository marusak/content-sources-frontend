import {
  compareReleasesDesc,
  compareVersionsDesc,
  formatDistributionUrl,
  formatRepositoryName,
  getEcosystemFromContentType,
  getRepositoryDescription,
  getRepositoryNameFromPathSlug,
  getRepositoryPathSlug,
  lightwellReleaseNum,
  sortVersionsDesc,
  stripLightwellVersionSuffix,
} from './helpers';

describe('getEcosystemFromContentType', () => {
  it('returns the ecosystem for a known content type', () => {
    expect(getEcosystemFromContentType('maven')).toBe('Java');
    expect(getEcosystemFromContentType('python')).toBe('Python');
  });

  it('normalizes content type casing', () => {
    expect(getEcosystemFromContentType('MAVEN')).toBe('Java');
  });

  it('returns undefined for missing or unknown content type', () => {
    expect(getEcosystemFromContentType()).toBeUndefined();
    expect(getEcosystemFromContentType('unknown')).toBeUndefined();
  });
});

describe('getRepositoryDescription', () => {
  it('returns a description for known content type and security level', () => {
    expect(getRepositoryDescription('maven', 'validated')).toBeDefined();
  });

  it('normalizes content type and security level casing', () => {
    expect(getRepositoryDescription('MAVEN', 'VALIDATED')).toEqual(
      getRepositoryDescription('maven', 'validated'),
    );
  });

  it('returns undefined when content type or security level is missing', () => {
    expect(getRepositoryDescription()).toBeUndefined();
    expect(getRepositoryDescription('maven')).toBeUndefined();
    expect(getRepositoryDescription(undefined, 'validated')).toBeUndefined();
  });

  it('returns a description for predisclosure security level', () => {
    expect(getRepositoryDescription('maven', 'predisclosure')).toBeDefined();
    expect(getRepositoryDescription('maven', 'predisclosure')).toBeTruthy();
  });
});

describe('formatRepositoryName', () => {
  it('formats ecosystem and security level when both are available', () => {
    expect(formatRepositoryName('maven', 'validated')).toBe('Java Validated');
    expect(formatRepositoryName('python', 'remediated')).toBe('Python Remediated');
  });

  it('falls back to repository name when content type or security level is missing', () => {
    expect(formatRepositoryName(undefined, 'validated', 'fallback-repo')).toBe('fallback-repo');
    expect(formatRepositoryName('maven', undefined, 'fallback-repo')).toBe('fallback-repo');
  });

  it('returns dash when no formatted name or fallback is available', () => {
    expect(formatRepositoryName()).toBe('—');
  });

  it('formats predisclosure repository name correctly', () => {
    expect(formatRepositoryName('maven', 'predisclosure')).toBe('Java Predisclosure');
  });
});

describe('getRepositoryPathSlug', () => {
  it('creates a slug from ecosystem and security level', () => {
    expect(getRepositoryPathSlug('maven', 'validated')).toBe('java-validated');
    expect(getRepositoryPathSlug('python', 'remediated')).toBe('python-remediated');
  });

  it('returns empty string when content type or security level is missing', () => {
    expect(getRepositoryPathSlug()).toBe('');
    expect(getRepositoryPathSlug('maven')).toBe('');
    expect(getRepositoryPathSlug(undefined, 'validated')).toBe('');
  });

  it('creates a slug for predisclosure security level', () => {
    expect(getRepositoryPathSlug('maven', 'predisclosure')).toBe('java-predisclosure');
  });
});

describe('getRepositoryNameFromPathSlug', () => {
  it('converts a slug into a Lightwell repository name', () => {
    expect(getRepositoryNameFromPathSlug('java-validated')).toBe('lightwell/java/validated');
    expect(getRepositoryNameFromPathSlug('python-remediated')).toBe('lightwell/python/remediated');
  });

  it('returns empty string for invalid slugs', () => {
    expect(getRepositoryNameFromPathSlug('')).toBe('');
    expect(getRepositoryNameFromPathSlug('java')).toBe('');
    expect(getRepositoryNameFromPathSlug('-validated')).toBe('');
    expect(getRepositoryNameFromPathSlug('java-')).toBe('');
  });

  it('converts predisclosure slug into repository name', () => {
    expect(getRepositoryNameFromPathSlug('java-predisclosure')).toBe(
      'lightwell/java/predisclosure',
    );
  });
});

describe('stripLightwellVersionSuffix', () => {
  it('removes Lightwell release suffix from a version', () => {
    expect(stripLightwellVersionSuffix('1.2.3.rhlw-00001')).toBe('1.2.3');
  });

  it('returns the original version when no Lightwell suffix exists', () => {
    expect(stripLightwellVersionSuffix('1.2.3')).toBe('1.2.3');
  });
});

describe('lightwellReleaseNum', () => {
  it('extracts release number from a release', () => {
    expect(lightwellReleaseNum('1.2.3.rhlw-00012')).toBe(12);
  });

  it('extracts release number from a release suffix', () => {
    expect(lightwellReleaseNum('rhlw-00007')).toBe(7);
  });

  it('returns 0 when no trailing number exists', () => {
    expect(lightwellReleaseNum('rhlw')).toBe(0);
  });

  it('returns 0 when no Lightwell release or release exists', () => {
    expect(lightwellReleaseNum('1.2.3')).toBe(0);
  });
});

describe('sortVersionsDesc', () => {
  it('sorts dotted versions in descending numeric order', () => {
    expect(sortVersionsDesc(['1.10.2', '1.9.2', '1.11.1'])).toEqual(['1.11.1', '1.10.2', '1.9.2']);
  });
});

describe('compareVersionsDesc', () => {
  it('sorts Lightwell versions by base version descending', () => {
    const versions = ['1.9.1.rhlw-00001', '1.11.4.rhlw-00001', '1.10.1.rhlw-00001'];

    expect([...versions].sort(compareVersionsDesc)).toEqual([
      '1.11.4.rhlw-00001',
      '1.10.1.rhlw-00001',
      '1.9.1.rhlw-00001',
    ]);
  });

  it('treats versions with the same base version as equal', () => {
    expect(compareVersionsDesc('1.2.3.rhlw-00003', '1.2.3.rhlw-00002')).toBe(0);
  });
});

describe('compareReleasesDesc', () => {
  const release = (version: string, release: string) => ({
    version,
    release,
    created_at: '',
  });

  it('sorts releases by version descending first', () => {
    const releases = [
      release('1.2.2.rhlw-00009', 'rhlw-00009'),
      release('1.2.3.rhlw-00001', 'rhlw-00001'),
    ];

    expect([...releases].sort(compareReleasesDesc)).toEqual([
      release('1.2.3.rhlw-00001', 'rhlw-00001'),
      release('1.2.2.rhlw-00009', 'rhlw-00009'),
    ]);
  });

  it('uses release number as a tiebreaker when base versions match', () => {
    const releases = [
      release('1.2.2.rhlw-00008', 'rhlw-00008'),
      release('1.2.2.rhlw-00009', 'rhlw-00009'),
      release('1.2.2.rhlw-00003', 'rhlw-00003'),
    ];

    expect([...releases].sort(compareReleasesDesc)).toEqual([
      release('1.2.2.rhlw-00009', 'rhlw-00009'),
      release('1.2.2.rhlw-00008', 'rhlw-00008'),
      release('1.2.2.rhlw-00003', 'rhlw-00003'),
    ]);
  });
});

describe('formatDistributionUrl', () => {
  it('transforms Pulp API URL to Lightwell URL for production', () => {
    expect(
      formatDistributionUrl(
        'https://packages.redhat.com/api/pulp-content/lightwell/java/validated',
      ),
    ).toBe('https://packages.redhat.com/lightwell/java/validated');
  });

  it('transforms Pulp API URL to Lightwell URL for stage', () => {
    expect(
      formatDistributionUrl(
        'https://packages.stage.redhat.com/api/pulp-content/lightwell/python/remediated/',
      ),
    ).toBe('https://packages.stage.redhat.com/lightwell/python/remediated/');
  });

  it('handles URLs without trailing slash', () => {
    expect(
      formatDistributionUrl(
        'https://packages.redhat.com/api/pulp-content/lightwell/python/validated',
      ),
    ).toBe('https://packages.redhat.com/lightwell/python/validated');
  });

  it('returns empty string unchanged', () => {
    expect(formatDistributionUrl('')).toBe('');
  });

  it('transforms demo Pulp API URL to Lightwell URL', () => {
    expect(
      formatDistributionUrl(
        'https://packages.redhat.com/api/pulp-content/public-lightwell-demo/python/validated/simple',
      ),
    ).toBe('https://packages.redhat.com/lightwell/public-lightwell-demo/python/validated/simple');
  });

  it('transforms demo Pulp API URL to Lightwell URL with trailing slash', () => {
    expect(
      formatDistributionUrl(
        'https://packages.redhat.com/api/pulp-content/public-lightwell-demo/python/validated/simple/',
      ),
    ).toBe('https://packages.redhat.com/lightwell/public-lightwell-demo/python/validated/simple/');
  });

  it('returns URL unchanged if it does not contain the expected path', () => {
    expect(formatDistributionUrl('https://example.com/some/other/path')).toBe(
      'https://example.com/some/other/path',
    );
  });
});
