// Mirrors the backend's detectFormat + content-sniffing fallback:
// https://github.com/content-services/content-sources-backend/blob/main/pkg/coverage/parser/parser.go
const ACCEPTED_SUFFIXES = [
  '.csv',
  '.json',
  '.xml',
  '.pom',
  '.spdx',
  '.spdx.tag',
  'requirements.txt',
];

export const validateManifestFile = (file: File): boolean => {
  const name = file.name.toLowerCase();
  return ACCEPTED_SUFFIXES.some((suffix) => name.endsWith(suffix));
};
