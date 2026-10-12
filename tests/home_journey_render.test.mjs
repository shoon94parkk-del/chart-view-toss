import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

async function renderHome(watchlist) {
  const nodes = new Map();
  const node = id => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', hidden: false }); return nodes.get(id); };
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const render = source.slice(source.indexOf('async function renderHome(){'), source.indexOf('\nasync function renderChart(){'));
  const noop = () => {};
  const context = vm.createContext({
    state: { watchlist, selected: ['NVDA'] }, viewEpoch: 1, SHOW_SPOTLIGHT: true, homeMarketCached: false,
    usageOperation:'test-home',usageStarted:0,reportUsableScreen:noop,HOME_MARKET_PRIMARY:[{symbol:'^KS11'}],
    finiteNumber:value=>value==null?null:Number(value),
    document: { querySelector: node }, shell: html => html, esc: String, displayName: (symbol, name) => name || symbol,
    sectionTitle: (title, action) => `<h2>${title}</h2>${action}`, uiIcon: () => '', iconSvg: () => '',
    savedResearchHtml: () => '<section data-saved-research>저장한 조사</section>', valueEntriesMarkup: () => '<section class="home-value-entries">기존 핵심 입구</section>',
    loadingIndicator: () => '확인 중', bindNav: noop, cleanupChart: noop, openHomeSearch: noop, bindHomeMarketToggle: noop,
    readHomeFast: () => null, seedWatchQuoteCache: noop, rememberLiveQuotes: noop, getLiveQuote: () => null,
    paintHomeWatch: noop, paintHomeBrief: noop, paintHomeMarket: noop, writeHomeFast: noop, saveWatchQuoteCache: noop,
    mergeRowsWithLive: rows => rows, newsCard: () => '',
    marketNow: async () => ({ results: [] }), quoteSnapshots: async () => ({ results: [] }),
    homeSnapshot: async () => ({ heatmap: { results: [] } }), personalizedNews: async () => ({ items: [] }),
  });
  vm.runInContext(`${render}\nthis.renderHome=renderHome;`, context);
  await context.renderHome();
  return node('#app').innerHTML;
}

test('newcomer Home exposes search, value and the actual detail-heart save guide before existing markets', async () => {
  const html = await renderHome([]);
  assert.match(html, /id="home-search-open"/);
  assert.match(html, /종목 검색.*상세.*관심/s);
  assert.ok(html.indexOf('home-start-guide') < html.indexOf('market-section'));
  assert.ok(html.indexOf('market-section') < html.indexOf('home-value-entries'));
  assert.ok(html.indexOf('home-value-entries') < html.indexOf('home-discovery-feed'));
  assert.ok(html.indexOf('home-discovery-feed') < html.indexOf('watch-section'));
});

test('saved interests are the first Home data section while every established entry remains reachable', async () => {
  const html = await renderHome([{ symbol: 'NVDA', name: '엔비디아' }]);
  assert.ok(html.indexOf('watch-section') < html.indexOf('market-section'), 'saved stocks appear before the market dashboard');
  assert.doesNotMatch(html, /home-start-guide/);
  for (const marker of ['home-search-open', 'market-card', 'home-value-entries', 'home-discovery-feed', 'data-saved-research', 'brief-card', 'data-go-chart', 'home-news-section']) assert.ok(html.includes(marker), `${marker} preserved`);
  assert.equal((html.match(/id="home-watchlist"/g) || []).length, 1);
});
