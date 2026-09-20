const assert = require('node:assert/strict');
const fs = require('node:fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const config = fs.readFileSync('apps-in-toss.config.ts', 'utf8');
const main = fs.readFileSync('src/main.js', 'utf8');
const api = fs.readFileSync('src/api.js', 'utf8');
const bridge = fs.readFileSync('src/tossBridge.js', 'utf8');

assert.equal(pkg.dependencies['@apps-in-toss/web-framework'], '3.4.1');
assert.equal(pkg.engines.node, '22.x');
assert.equal(pkg.packageManager, 'npm@10.9.8');
assert.match(pkg.scripts['build:ait'], /ait build/);
assert.match(config, /appName:\s*'chartview'/);
assert.match(config, /webBundleDir:\s*'dist'/);
assert.match(config, /withBackButton:\s*true/);
assert.match(main, /syncNativeBackHandler/);
assert.match(main, /data-external-url/);
assert.match(main, /dataDisclosure/);
assert.match(main, /renderInfo/);
assert.doesNotMatch(main, /history\.replaceState/);
assert.match(api, /DEFAULT_TIMEOUT_MS/);
assert.match(api, /DEFAULT_RETRIES/);
assert.match(api, /navigator\.onLine/);
assert.match(api, /AbortController/);
assert.match(bridge, /graniteEvent\.addEventListener\('backEvent'/);
assert.match(bridge, /Device\.openURL/);
assert.match(bridge, /Device\.triggerHaptic/);

for (const path of ['public/privacy.html', 'public/terms.html', 'public/data-guide.html']) {
  assert.equal(fs.existsSync(path), true, `${path} must exist`);
}

console.log('AIT release contract checks passed');
