import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const api=readFileSync(new URL('../src/api.js',import.meta.url),'utf8');
const view=readFileSync(new URL('../src/industryContextView.js',import.meta.url),'utf8');

test('detail loads DART revenue only after the base industry context can render',()=>{
 assert.match(main,/const industryBasePromise=Promise\.all/);
 assert.match(main,/jobs\.push\(settle\(industryBasePromise/);
 assert.match(main,/resolvedName\.then\(name=>businessReportData\(symbol,name\)\)\.catch/);
 assert.match(main,/report\?\.available/);
 assert.match(main,/KRX \+ DART/);
});

test('DART detail call is restricted to Korean exchange tickers',()=>{
 assert.match(main,/const koreanDetail=\/\\\.\(KS\|KQ\)\$\/i\.test\(symbol\)/);
 assert.match(main,/if\(koreanDetail\)/);
});

test('business report client keeps a short stale-safe cache and no retry storm',()=>{
 assert.match(api,/\/api\/business-report\?ticker=/);
 assert.match(api,/ttlMs:300000/);
 assert.match(api,/businessReportData=.*timeoutMs:45000,retries:0/);
 assert.match(api,/retries:0/);
});

test('revenue UI labels the value as report-derived and exposes source',()=>{
 assert.match(view,/사업보고서 매출 구조/);
 assert.match(view,/매출 1위/);
 assert.match(view,/공시 표에서 직접 확인한 값만 표시/);
 assert.match(view,/data-external-url/);
});

test('IDEA LAB keeps industry context collapsed and loads DART only on expand',()=>{
 const idea=readFileSync(new URL('../src/ideaView.js',import.meta.url),'utf8');
 assert.match(idea,/industryContextHtml\(row\.context,\{collapsible:true,open:false\}\)/);
 assert.match(idea,/details\.addEventListener\('toggle'/);
 assert.match(idea,/businessReportData\(symbol,name\)\.then/);
 assert.match(idea,/relationshipEvidenceData\(symbol,name\)\.then/);
 assert.match(idea,/\.then\(repaint\)/);
 assert.doesNotMatch(idea,/const \[report,evidence\]=await Promise\.all/);
});

test('slow DART and direct evidence show independent loading and failure states',()=>{
 assert.match(main,/현재가 확인 중/);
 assert.match(main,/회사·산업 정보 불러오는 중/);
 assert.match(main,/reportState:koreanDetail\?'loading':'idle'/);
 assert.match(main,/report\?\.loadError\?'error':report\?\.available\?'ready':'unavailable'/);
 assert.match(view,/DART 사업보고서 매출 구조 확인 중/);
 assert.match(view,/첫 조회는 공시 확인에 시간이 걸릴 수 있어요/);
 assert.match(view,/DART 공시를 불러오지 못했어요/);
 assert.match(view,/직접 관계 근거 확인 중/);
});

test('direct supply-chain UI is evidence-backed and separate from inferred adjacency',()=>{
 assert.match(view,/확인된 직접 관계/);
 assert.match(view,/뉴스·수주·고객사 근거/);
 assert.match(view,/산업상 연관 후보/);
 assert.match(view,/직접 고객·납품 관계로 해석하지 않아요/);
});

