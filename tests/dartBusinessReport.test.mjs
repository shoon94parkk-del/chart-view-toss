import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const api=readFileSync(new URL('../src/api.js',import.meta.url),'utf8');
const view=readFileSync(new URL('../src/industryContextView.js',import.meta.url),'utf8');

test('detail loads DART revenue only after the base industry context can render',()=>{
 assert.match(main,/const industryBasePromise=koreanDetail\?Promise\.all/);
 assert.match(main,/jobs\.push\(settle\(industryBasePromise/);
 // Resolved-name and independent retry behavior is exercised by insight_flow_qa.
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

test('financial-history failure can retry without reloading stock detail',()=>{
 assert.match(main,/const loadFinancial=\(\)=>/);
 assert.match(main,/data-retry-financial/);
 const financial=readFileSync(new URL('../src/financialHistoryView.js',import.meta.url),'utf8');
 assert.match(financial,/data-retry-financial/);
 assert.match(financial,/연간 실적/);
 assert.match(financial,/전년 같은 기간 대비/);
});

test('IDEA LAB keeps industry context collapsed and loads DART only on expand',()=>{
 const idea=readFileSync(new URL('../src/ideaView.js',import.meta.url),'utf8');
 assert.match(idea,/industryContextHtml\(row\.context,\{collapsible:true,open:false\}\)/);
 assert.match(idea,/details\.addEventListener\('toggle'/);
 // Lazy and independent request behavior is covered by insight_research_qa.
 assert.doesNotMatch(idea,/const \[report,evidence\]=await Promise\.all/);
});

test('slow DART and direct evidence show independent loading and failure states',()=>{
 assert.match(main,/현재가를 확인하고 있어요/);
 assert.match(main,/회사·산업 정보를 불러오고 있어요/);
 assert.match(main,/reportState:koreanDetail\?'loading':'idle'/);
 // Loading/error transitions are exercised with delayed/failed API responses in insight_flow_qa.
 assert.match(view,/DART 사업보고서 매출 구조 확인 중/);
 assert.match(view,/첫 조회는 공시 확인에 시간이 걸릴 수 있어요/);
 assert.match(view,/DART 공시를 불러오지 못했어요/);
 assert.match(view,/직접 관계 근거 확인 중/);
});

test('direct supply-chain UI is evidence-backed and separate from inferred adjacency',()=>{
 assert.match(view,/기사에서 확인한 거래 단서/);
 assert.match(view,/계약·납품 표현 확인/);
 assert.match(view,/같은 산업 분류 후보/);
 assert.match(view,/거래 관계 미확인/);
 assert.match(view,/실제 고객·납품 관계가 확인된 목록/);
 assert.match(view,/기사 제공처가 지연되어 거래 단서를 지금 확인하지 못했어요/);
 assert.match(view,/최근 기사에서 두 회사의 구체적 계약·납품 단서를 찾지 못했어요/);
 assert.match(readFileSync(new URL('../src/api.js',import.meta.url),'utf8'),/relationshipEvidenceData=.*timeoutMs:18000/);
});
