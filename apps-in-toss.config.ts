import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'chartview',
  brand: {
    primaryColor: '#3182F6',
  },
  navigationBar: {
    withBackButton: true,
    withHomeButton: false,
  },
  webView: {
    bounces: false,
    pullToRefreshEnabled: false,
    allowsBackForwardNavigationGestures: true,
  },
  permissions: [],
  webBundleDir: 'dist',
});
