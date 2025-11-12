/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const { dependencies, insights } = require('./package.json');
const { sentryWebpackPlugin } = require('@sentry/webpack-plugin');

const sassPrefix = insights.appname.replace(/-(\w)/g, (_, match) => match.toUpperCase());
const srcDir = path.resolve(__dirname, './src');

module.exports = {
  sassPrefix: `.${sassPrefix}`,
  appUrl: '/insights/content',
  debug: true,
  devtool: 'hidden-source-map',
  useProxy: true,
  interceptChromeConfig: false,
  plugins: [
    ...(process.env.ENABLE_SENTRY
      ? [
          sentryWebpackPlugin({
            ...(process.env.SENTRY_AUTH_TOKEN && {
              authToken: process.env.SENTRY_AUTH_TOKEN,
            }),
            org: 'red-hat-it',
            project: 'content-sources',
            moduleMetadata: ({ release }) => ({
              dsn: 'https://2578944726a33e0e2e3971c976a87e08@o490301.ingest.us.sentry.io/4510123991171072',
              org: 'red-hat-it',
              project: 'content-sources',
              release,
            }),
          }),
        ]
      : []),
  ],
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
  /**
   * Add additional webpack plugins
   */
  //   plugins: [...(process.env.VERBOSE ? [new WatchRunPlugin()] : []), new webpack.ProgressPlugin()],
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
