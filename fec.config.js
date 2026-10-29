/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const { dependencies, insights } = require('./package.json');
const { sentryWebpackPlugin } = require('@sentry/webpack-plugin');

const sassPrefix = insights.appname.replace(/-(\w)/g, (_, match) => match.toUpperCase());
const srcDir = path.resolve(__dirname, './src');
/** Must match chrome `useLightwellRouteSetup` / theme-bootstrap class on <html>. */
const KIT_CSS_SCOPE = 'html.lightwell-v1-theme';
const KIT_CSS_PATH_SEGMENT = `${path.sep}src${path.sep}kit${path.sep}`;

/**
 * Scope kit co-located CSS to Lightwell's html theme class instead of `.contentSources`.
 * Chrome adds `lightwell-v1-theme` on <html> for /lightwell* only. Kit rules should stay
 * under `.lw-*` hosts so bare PF selectors don't restyle Lightwell chrome chrome.
 */
class KitCssScopePlugin {
  apply(compiler) {
    // Do not put custom keys on sass-loader options — schema-utils rejects them.
    const patchedOptions = new WeakSet();
    const patchRules = (rules) => {
      let patched = 0;
      for (const rule of rules || []) {
        if (rule.oneOf) patched += patchRules(rule.oneOf);
        if (rule.rules) patched += patchRules(rule.rules);
        const useEntries = Array.isArray(rule.use) ? rule.use : rule.use ? [rule.use] : [];
        for (const entry of useEntries) {
          if (!entry || typeof entry !== 'object') continue;
          const loader = typeof entry.loader === 'string' ? entry.loader : '';
          if (!loader.includes('sass-loader') || typeof entry.options?.additionalData !== 'function') {
            continue;
          }
          if (patchedOptions.has(entry.options)) continue;
          const originalAdditionalData = entry.options.additionalData;
          entry.options.additionalData = (content, loaderContext) => {
            const resourcePath = loaderContext.resourcePath || '';
            if (resourcePath.includes(KIT_CSS_PATH_SEGMENT)) {
              // One wrapper per file (not per rule). Skip comment-only sheets.
              if (!content.includes('{')) {
                return content;
              }
              return `${KIT_CSS_SCOPE} {\n${content}\n}`;
            }
            return originalAdditionalData(content, loaderContext);
          };
          patchedOptions.add(entry.options);
          patched += 1;
        }
      }
      return patched;
    };

    const run = () => {
      const count = patchRules(compiler.options.module?.rules || []);
      if (count > 0) {
        console.log(`[KitCssScopePlugin] scoped ${count} sass-loader(s) → ${KIT_CSS_SCOPE} for src/kit/**`);
      }
    };

    // Patch immediately and again after environment (covers late rule injection).
    run();
    compiler.hooks.afterEnvironment.tap('KitCssScopePlugin', run);
  }
}

/**
 * Custom webpack plugin to add Istanbul coverage instrumentation.
 * Active when COVERAGE=true environment variable is set.
 */
class IstanbulCoveragePlugin {
  apply(compiler) {
    if (process.env.COVERAGE === 'true') {
      const options = compiler.options;
      options.module = options.module || {};
      options.module.rules = options.module.rules || [];

      // Guard against duplicate rules on incremental multi-run builds
      const hasIstanbulLoader = options.module.rules.some((rule) => {
        if (!rule) {
          return false;
        }

        // Handle the simple case where the loader is attached directly
        if (typeof rule.loader === 'string' && rule.loader.includes('istanbul')) {
          return true;
        }

        const useEntries = Array.isArray(rule.use)
          ? rule.use
          : rule.use
            ? [rule.use]
            : [];

        return useEntries.some((entry) => {
          if (!entry) {
            return false;
          }

          if (typeof entry === 'string') {
            return entry.includes('istanbul');
          }

          if (typeof entry === 'object') {
            const loaderName = typeof entry.loader === 'string' ? entry.loader : undefined;
            return !!loaderName && loaderName.includes('istanbul');
          }

          return false;
        });
      });

      if (hasIstanbulLoader) {
        return; // Already configured
      }

      console.log('[coverage] Adding Istanbul instrumentation using fec.config.js plugin');

      options.module.rules.push({
        test: /\.(ts|tsx|js|jsx)$/,
        include: srcDir,
        exclude: /node_modules|\.test\.|\.spec\./,
        enforce: 'post',
        use: {
          loader: '@jsdevtools/coverage-istanbul-loader',
          options: {
            esModules: true,
            coverageGlobalScope: 'window',
            coverageGlobalScopeFunc: false,
          },
        },
      });
    }
  }
}

module.exports = {
  sassPrefix: `.${sassPrefix}`,
  appUrl: '/insights/content',
  debug: true,
  // Local serve: inline maps via eval (avoids /apps/.../index.js.map 404 noise).
  // Production builds: hidden maps for Sentry/error tooling without exposing map URLs.
  devtool: process.env.NODE_ENV === 'production' ? 'hidden-source-map' : 'eval-source-map',
  useProxy: true,
  interceptChromeConfig: false,
  plugins: [
    new KitCssScopePlugin(),
    // Istanbul coverage plugin (active when COVERAGE=true)
    new IstanbulCoveragePlugin(),
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
      './LightwellApp': path.resolve(__dirname, './src/LightwellAppEntry.tsx'),
      './BeaconPdfEntry': path.resolve(__dirname, './src/moduleEntries/BeaconPdfEntry.tsx'),
      './CoveragePdfEntry': path.resolve(__dirname, './src/moduleEntries/CoveragePdfEntry.tsx'),
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
      // The lightwell clearinghouse API is served under its own base path
      // (lightwell.RegisterRoutes), not under /api/content-sources.
      '/api/lightwell/': {
        host: `http://127.0.0.1:${process.env.BACKEND_PORT}`,
      },
    }),
    ...(process.env.PDF_GENERATOR_PORT && {
      '/api/crc-pdf-generator': {
        host: `http://127.0.0.1:${process.env.PDF_GENERATOR_PORT}`,
      },
    }),
  },
};
