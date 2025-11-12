module.exports = {
  roots: ['<rootDir>/src/'],
  preset: 'ts-jest',
  maxWorkers: '50%',
  testResultsProcessor: 'jest-junit',
  reporters: ['default', 'jest-junit'],
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(t)s$': 'ts-jest',
    '^.+\\.(css|scss|sass|less)$': 'jest-preview/transforms/css',
    '^(?!.*\\.(js|jsx|mjs|cjs|ts|tsx|css|json)$)': 'jest-preview/transforms/file',
  },
  setupFiles: [],
  setupFilesAfterEnv: ['<rootDir>/config/setupAfterEnv.ts'],
  moduleDirectories: ['<rootDir>/node_modules', '<rootDir>/src'],
  // Below replaces things for speed
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/config/empty.js',
    '\\.(svg)$': 'identity-obj-proxy',
    '^uuid$': require.resolve('uuid'),
    // use cjs versions of patternfly packages, not esm
    '^(@patternfly/[a-zA-Z0-9_-]+)/dist/esm/(.*)$': '$1/dist/js/$2',
  },

  transformIgnorePatterns: [
    // '<rootDir>/node_modules/(?!@redhat-cloud-services|@openshift|lodash-es|uuid|@patternfly/react-icons)',
  ],
};
