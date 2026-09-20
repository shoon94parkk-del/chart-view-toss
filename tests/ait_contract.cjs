const assert = require('node:assert/strict');
const fs = require('node:fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const config = fs.readFileSync('apps-in-toss.config.ts', 'utf8');
const main = fs.readFileSync('src/main.js', 'utf8');
const bridge = fs.readFileSync('src/tossBridge.js', 'utf8');

assert.equal(pkg.dependencies['@apps-in-toss/web-framework'], '3.4.1');
assert.match(pkg.scripts['build:ait'], /ait build/);
assert.match(config, /appName:\s*'chartview'/);
assert.match(config, /webBundleDir:\s*'dist'/);
assert.match(config, /withBackButton:\s*true/);
assert.match(main, /syncNativeBackHandler/);
assert.match(main, /data-external-url/);
assert.doesNotMatch(main, /history\.replaceState/);
assert.match(bridge, /graniteEvent\.addEventListener\('backEvent'/);
assert.match(bridge, /Device\.openURL/);
assert.match(bridge, /Device\.triggerHaptic/);

console.log('AIT contract checks passed');
