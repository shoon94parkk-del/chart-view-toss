import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const api=readFileSync(new URL('../src/api.js',import.meta.url),'utf8');
const view=readFileSync(new URL('../src/industryContextView.js',import.meta.url),'utf8');

test('detail loads DART revenue only after the base industry context can render',()=>{
 assert.match(main,/const industryBasePromise=Promise\.all/);
 assert.match(main,/jobs\.push\(settle\(industryBasePromise/);
 assert.match(main,/businessReportData\(symbol,knownName\)\.catch/);
 assert.match(main,/report\?\.available/);
 assert.match(main,/KRX \+ DART/);
});

test('DART detail call is restricted to Korean exchange tickers',()=>{
 assert.match(main,/if\(\/\\\\\.\(KS\|KQ\)\$\/i\.test\(symbol\)\)/);
});

test('business report client has a long cache and no retry storm',()=>{
 assert.match(api,/\/api\/business-report\?ticker=/);
 assert.match(api,/ttlMs:86400000/);
 assert.match(api,/retries:0/);
});

test('revenue UI labels the value as report-derived and exposes source',()=>{
 assert.match(view,/사업보고서 매출 구조/);
 assert.match(view,/매출 1위/);
 assert.match(view,/공시 표에서 직접 계산\/추출한 값만 표시/);
 assert.match(view,/data-external-url/);
});
