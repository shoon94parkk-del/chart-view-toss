import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');

test('stock detail includes non-blocking company sector supply-chain context',()=>{
 assert.match(main,/id="detail-industry-block"/);
 assert.match(main,/주요제품부터 섹터와 공급망까지/);
 assert.match(main,/screenerData\(\)\.catch\(\(\)=>null\)/);
 assert.match(main,/if\(!current\|\|!current\.industry\|\|!current\.mainProducts\)/);
 assert.match(main,/const companyMeta=await companyContextData\(\)\.catch\(\(\)=>null\)/);
 assert.match(main,/import\('\.\/industryContext\.js'\)/);
 assert.match(main,/import\('\.\/industryContextView\.js'\)/);
 assert.doesNotMatch(main,/^import .*industryContext(View)?\.js/m);
});

test('missing Korean company context removes the optional panel instead of breaking detail',()=>{
 assert.match(main,/if\(!current\)return null/);
 assert.match(main,/industryRes\.status!==['"]fulfilled['"]\|\|!industryRes\.value/);
 assert.match(main,/block\.remove\(\)/);
});

test('Korean detail tickers enter DART enrichment branch',()=>{
 assert.match(main,/const koreanDetail=\/\\\.\(KS\|KQ\)\$\/i\.test\(symbol\)/);
 assert.match(main,/if\(koreanDetail\)/);
 assert.match(main,/businessReportData\(symbol,knownName\)/);
});

