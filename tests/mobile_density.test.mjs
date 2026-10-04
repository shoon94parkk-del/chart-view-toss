import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const discovery=readFileSync(new URL('../src/valueDiscovery.css',import.meta.url),'utf8');
const picks=readFileSync(new URL('../src/pickLedger.css',import.meta.url),'utf8');
const styles=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');\nconst exportsCss=readFileSync(new URL('../src/exportMomentum.css',import.meta.url),'utf8');

test('mobile screener rows keep a compact base height and typography',()=>{
  assert.match(discovery,/@media\(max-width:600px\)[\s\S]*\.discovery-results \.analysis-stock\{[\s\S]*min-height:68px/);
  assert.match(discovery,/\.discovery-results \.analysis-stock>span:first-child strong\{[\s\S]*font-size:13px/);
  assert.match(discovery,/\.discovery-results \.analysis-match-reasons i\{[\s\S]*font-size:8\.5px/);
});

test('mobile pick ledger keeps collapsed records compact without hiding core fields',()=>{
  assert.match(picks,/@media\(max-width:600px\)[\s\S]*\.pick-ledger-row\{[\s\S]*min-height:62px/);
  assert.match(picks,/\.pick-ledger-stock strong\{font-size:12\.5px/);
  assert.match(picks,/\.pick-ledger-return\{font-size:13px/);
});

test('mobile export views use reduced card spacing and chart height',()=>{
  assert.match(exportsCss,/@media\(max-width:600px\)[\s\S]*\.export-hero\{padding:15px/);
  assert.match(exportsCss,/\.export-driver-card\{padding:10px 11px/);
  assert.match(exportsCss,/\.dram-spot-card\{padding:10px 11px/);
  assert.match(exportsCss,/\.dram-spot-chart svg\{height:78px/);
});


test('narrow analysis headers reduce title size instead of wrapping by default',()=>{\n  assert.match(styles,/@media\\(max-width:360px\\)\\{\\.brand-lockup h1\\{font-size:17px/);\n});\n