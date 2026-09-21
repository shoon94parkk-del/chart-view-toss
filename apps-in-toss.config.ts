import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'chartview',
  brand: {
    primaryColor: '#3182F6',
  },
  navigationBar: {
    withTitle: true,
    theme: 'light',
    transparentBackground: false,
    withBackButton: true,
    withHomeButton: false,
  },
  webView: {
    bounces: false,
    pullToRefreshEnabled: false,
    allowsBackForwardNavigationGestures: false,
    overScrollMode: 'never',
  },
  permissions: [],
  webBundleDir: 'dist',
});
