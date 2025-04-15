/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');

const srcDir = path.resolve(__dirname, './src');

module.exports = {
  sassPrefix: '.contentSources',
  debug: true,
  useFileHash: true,
  devtool: 'hidden-source-map',
  appUrl: '/insights/content/repositories',
  useProxy: true,
  useAgent: true,
  bounceProd: false,
  proxyVerbose: true,
  moduleFederation: {
    exposes: {
      './RootApp': path.resolve(__dirname, './src/AppEntry.tsx'),
    },
    shared: [{ 'react-router-dom': { singleton: true, version: '*' } }],
    exclude: ['react-router-dom']
  },
  resolve: {
    modules: [srcDir, path.resolve(__dirname, './node_modules')],
  },
  routes: {
    ...(process.env.BACKEND_PORT && {
      '/api/content-sources/': {
        host: `http://127.0.0.1:${process.env.BACKEND_PORT}`,
      },
    }),
  },
};
