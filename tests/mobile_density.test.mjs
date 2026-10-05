import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const discovery=readFileSync(new URL('../src/valueDiscovery.css',import.meta.url),'utf8');
const picks=readFileSync(new URL('../src/pickLedger.css',import.meta.url),'utf8');
const styles=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const exportsCss=readFileSync(new URL('../src/exportMomentum.css',import.meta.url),'utf8');

test('mobile screener rows keep a compact base height and typography',()=>{
  assert.match(discovery,/@media\(max-width:600px\)[\s\S]*\.discovery-results \.analysis-stock\{[\s\S]*min-height:68px/);
  assert.match(discovery,/\.discovery-results \.analysis-stock>span:first-child strong\{[\s\S]*font-size:13px/);
  assert.match(discovery,/\.discovery-results \.analysis-match-reasons i\{[\s\S]*font-size:8\.5px/);
});

test('mobile pick ledger keeps collapsed records compact without hiding core fields',()=>{
  const emphasis=readFileSync(new URL('../src/emphasis.css',import.meta.url),'utf8');
  assert.match(emphasis,/data-surface="picks"[\s\S]*\.pick-ledger-row\{[\s\S]*min-height:56px!important/);
  assert.match(emphasis,/\.pick-ledger-stock strong\{[\s\S]*font-size:13\.5px!important/);
  assert.match(emphasis,/\.pick-ledger-return\{[\s\S]*font-size:11\.5px!important/);
  assert.match(emphasis,/grid-template-areas:'stock status' 'prices performance'!important/);
});

test('mobile export views use reduced card spacing and chart height',()=>{
  assert.match(exportsCss,/@media\(max-width:600px\)[\s\S]*\.export-hero\{padding:15px/);
  assert.match(exportsCss,/\.export-driver-card\{padding:10px 11px/);
  assert.match(exportsCss,/\.dram-spot-card\{padding:10px 11px/);
  assert.match(exportsCss,/\.dram-spot-chart svg\{height:78px/);
});


test('narrow analysis headers reduce title size instead of wrapping by default',()=>{
  assert.match(styles,/@media\(max-width:360px\)\{\.brand-lockup h1\{font-size:17px/);
});


test('pick warning details live inside individual records',()=>{
  const js=readFileSync(new URL('../src/pickLedger.js',import.meta.url),'utf8');
  assert.doesNotMatch(js,/<details class="pick-ledger-tech-alert"/);
  assert.match(js,/<details class="pick-ledger-policy"/);
  assert.doesNotMatch(js,/pick-ledger-tech-status/);
  assert.doesNotMatch(js,/<details class="pick-ledger-tech-alert"[^>]* open/);
  assert.doesNotMatch(js,/<details class="pick-ledger-policy"[^>]* open/);
});


test('pick ledger mobile chrome keeps notices and filtering in compact rows',()=>{
  const js=readFileSync(new URL('../src/pickLedger.js',import.meta.url),'utf8');
  const emphasis=readFileSync(new URL('../src/emphasis.css',import.meta.url),'utf8');
  assert.match(js,/class="pick-ledger-notices"/);
  assert.match(js,/class="pick-ledger-list-tools"/);
  assert.match(js,/<summary>검색·필터<\/summary>/);
  assert.match(emphasis,/\.pick-ledger-notices\{[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(emphasis,/\.pick-ledger-list-tools\{[\s\S]*min-height:34px/);
  assert.match(js,/<section class="pick-ledger-overview" aria-label="성과·상태 요약">/);
  assert.doesNotMatch(js,/<details class="pick-ledger-overview"/);
});

test('always-visible pick overview remains compact on mobile',()=>{
  const emphasis=readFileSync(new URL('../src/emphasis.css',import.meta.url),'utf8');
  assert.match(emphasis,/\.pick-ledger-overview\{[\s\S]*padding:6px 8px 5px!important/);
  assert.match(emphasis,/\.pick-ledger-kpis>div\{[\s\S]*min-height:45px!important/);
  assert.match(emphasis,/\.pick-ledger-status-kpis\{[\s\S]*display:flex!important/);
  assert.match(emphasis,/\.pick-ledger-status-kpis>div\{[\s\S]*min-height:28px!important/);
  assert.match(emphasis,/\.pick-ledger-summary>\.pick-ledger-basis\{display:none!important\}/);
  assert.match(emphasis,/\.pick-ledger-status-strip>\.pick-ledger-basis\{display:none!important\}/);
});


test('pick header remains constrained to the mobile viewport',()=>{
  const emphasis=readFileSync(new URL('../src/emphasis.css',import.meta.url),'utf8');
  assert.match(emphasis,/\.pick-ledger-head>div\{min-width:0!important;width:100%!important;max-width:100%!important\}/);
  assert.match(emphasis,/\.pick-ledger-head p\{[\s\S]*max-width:100%!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis/);
});
