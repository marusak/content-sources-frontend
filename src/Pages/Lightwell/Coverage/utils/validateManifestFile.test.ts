import { validateManifestFile } from './validateManifestFile';

const fileWith = (name: string) => new File([''], name);

describe('validateManifestFile', () => {
  it.each([
    'pom.xml',
    'requirements.txt',
    'dev-requirements.txt',
    'test-requirements.txt',
    'inventory.csv',
    'bom.json',
    'bom.xml',
    'my-app.cdx.json',
    'my-app.cdx.xml',
    'my-app.pom',
    'my-app.spdx',
    'my-app.spdx.json',
    'my-app.spdx.tag',
    'sbom.json',
    'sbom.xml',
  ])('accepts %s', (name) => {
    expect(validateManifestFile(fileWith(name))).toBe(true);
  });

  it.each(['document.pdf', 'Dockerfile', 'not-pom.xml.bak', 'report.rdf', 'sbom.spdx.rdf'])(
    'rejects %s',
    (name) => {
      expect(validateManifestFile(fileWith(name))).toBe(false);
    },
  );
});
