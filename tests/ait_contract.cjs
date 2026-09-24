const assert = require('node:assert/strict');
const fs = require('node:fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const config = fs.readFileSync('apps-in-toss.config.ts', 'utf8');
const main = fs.readFileSync('src/main.js', 'utf8');
const api = fs.readFileSync('src/api.js', 'utf8');
const client = fs.readFileSync('src/requestClient.js', 'utf8');
const bridge = fs.readFileSync('src/tossBridge.js', 'utf8');
const selector = fs.readFileSync('src/stockSelector.js', 'utf8');
const presentation = fs.readFileSync('src/dataPresentation.js', 'utf8');
const homeExtras = fs.readFileSync('src/homeExtras.js', 'utf8');
const pickLedger = fs.readFileSync('src/pickLedger.js', 'utf8');
const routes = fs.readFileSync('src/routes.js', 'utf8');

assert.equal(pkg.version, '0.9.1');
assert.equal(pkg.dependencies['@apps-in-toss/web-framework'], '3.5.0');
assert.equal(pkg.engines.node, '24.x');
assert.match(pkg.engines.npm, />=10 <12/);
assert.match(pkg.scripts['build:ait'], /ait build/);
assert.match(config, /appName:\s*'chartview'/);
assert.match(config, /webBundleDir:\s*'dist'/);
assert.match(config, /withBackButton:\s*true/);
assert.match(main, /syncNativeBackHandler/);
assert.match(main, /data-external-url/);
assert.match(main, /dataDisclosure/);
assert.match(main, /renderInfo/);
assert.match(main, /openStockSelector/);
assert.match(main, /chartLoadSeq/);
assert.match(main, /계산 기준/);
assert.match(main, /같은 지표를 종목별로 나란히 비교해요/);
assert.match(main, /관심종목 관리/);
assert.match(main, /직접 관련/);
assert.match(api, /quoteSnapshots/);
assert.match(api, /homeBootstrap/);
assert.match(api, /homeHeatmap/);
assert.match(main, /homeExtras\.js/);
assert.match(homeExtras, /오늘의 종목발굴/);
assert.doesNotMatch(homeExtras, /오늘의 종목발굴 TOP3/);
assert.match(homeExtras, /오늘 등락 히트맵/);
assert.match(homeExtras, /추천 평균 수익률/);
assert.match(homeExtras, /플러스 비율/);
assert.match(homeExtras, /data-home-extra-route="picks"/);
assert.match(pickLedger, /추천 기록/);
assert.match(pickLedger, /recommendedPrice/);
assert.match(pickLedger, /currentPrice/);
assert.match(pickLedger, /bestReturnPct/);
assert.match(routes, /'picks'/);
assert.match(main, /renderPickLedger/);
assert.match(selector, /최대 .*개까지 선택할 수 있어요/);
assert.match(selector, /syncNativeBackHandler/);
assert.match(presentation, /formatMacroChange/);
assert.match(presentation, /newsRelation/);
assert.doesNotMatch(main, /history\.replaceState/);
assert.match(api, /DEFAULT_TIMEOUT_MS/);
assert.match(api, /DEFAULT_RETRIES/);
assert.match(client, /navigator\.onLine/);
assert.match(client, /AbortController/);
assert.match(bridge, /graniteEvent\.addEventListener\('backEvent'/);
assert.match(bridge, /Device\.openURL/);
assert.match(bridge, /Device\.triggerHaptic/);

for (const path of ['public/privacy.html', 'public/terms.html', 'public/data-guide.html']) {
  assert.equal(fs.existsSync(path), true, `${path} must exist`);
}

console.log('AIT release contract checks passed');
