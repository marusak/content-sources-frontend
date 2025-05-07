/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const { dependencies, insights } = require('./package.json');

const sassPrefix = insights.appname.replace(/-(\w)/g, (_, match) => match.toUpperCase());
const srcDir = path.resolve(__dirname, './src');

module.exports = {
  sassPrefix: `.${sassPrefix}`,
  appUrl: '/insights/content',
  debug: true,
  devtool: 'hidden-source-map',
  useProxy: true,
  interceptChromeConfig: false,
  plugins: [],
  moduleFederation: {
    exposes: {
      './RootApp': path.resolve(__dirname, './src/AppEntry.tsx'),
    },
    exclude: ['react-router-dom'],
    shared: [
      {
        'react-router-dom': {
          singleton: true,
          import: false,
          version: dependencies['react-router-dom'],
          requiredVersion: '>=6.0.0 <7.0.0',
        },
      },
      {
        '@unleash/proxy-client-react': {
          version: dependencies['@unleash/proxy-client-react'],
          singleton: true,
        },
      },
    ],
  },
  resolve: {
    modules: [srcDir, path.resolve(__dirname, './node_modules')],
  },
  routes: {
  },
};
