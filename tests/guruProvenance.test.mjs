import {test} from 'node:test';
import assert from 'node:assert/strict';
import {greenblattCurrentCheck} from '../src/guruInvestingModel.js';
import {extensionEvidence} from '../src/guruInvestingExtensions.js';
import {formatKst} from '../src/dataPresentation.js';

const observed={ticker:'171090.KQ',roa:2.48,trailingPE:40.98,forwardPE:null,trailingEPS:1674,dataSource:'Yahoo Chart + Fundamentals',generatedAt:'2026-10-09T08:39:01.602944+00:00',fieldMeta:{roa:{source:'Yahoo Fundamentals',asOf:null,period:'TTM net income / latest reported assets',method:'trailing net income / latest assets'},trailingPE:{source:'Yahoo Fundamentals',asOf:null,period:'TTM'},forwardPE:{source:'Yahoo QuoteSummary',asOf:null,period:'provider forward period (not independently verified)'}}};
const proof={basis:'CFS',tradeDate:'2026-10-08',strategies:{greenblatt:{status:'matched',metrics:{valueRank:1},checks:[]}},annual:[]};
const row={symbol:observed.ticker,annualReportYear:2025,metrics:{annualROA:26.4,annualPE:6.84}};

test('Greenblatt TTM model preserves source metadata without substituting annual or price timestamps',()=>{
 const checked=greenblattCurrentCheck(observed);
 assert.equal(checked.status,'failed');
 assert.equal(checked.roa,2.48);assert.equal(checked.trailingPE,40.98);
 assert.equal(checked.dataSource,observed.dataSource);
 assert.equal(checked.generatedAt,observed.generatedAt);
 assert.deepEqual(checked.fieldMeta,observed.fieldMeta);
 assert.equal(checked.asOf,null);
 assert.equal(checked.fieldMeta.roa.asOf,null);
});

test('Greenblatt evidence exposes each TTM provider and actual retrieval time while marking unavailable observation times',()=>{
 const html=extensionEvidence(proof,'greenblatt',row,greenblattCurrentCheck(observed));
 assert.match(html,/TTM ROA 2.5%.*TTM PER 41배/);
 assert.match(html,/Yahoo Fundamentals/);assert.match(html,/Yahoo QuoteSummary/);
 assert.ok(html.includes(formatKst(observed.generatedAt)));
 assert.match(html,/자료 기준시각 미제공/);
 assert.match(html,/2025년 확정 실적 \+ 2026-10-08 종가/);
 const ttm=html.match(/<div class="guru-current-check">([\s\S]*?)<\/div>/)[1];
 assert.doesNotMatch(ttm,/2025|2026-10-08/);
});

test('TTM provenance renders supplied field observation times and explicit missing metadata without inventing a source',()=>{
 const asOf='2026-09-30T02:30:00Z';
 const checked=greenblattCurrentCheck({...observed,fieldMeta:{...observed.fieldMeta,roa:{...observed.fieldMeta.roa,asOf}}});
 const html=extensionEvidence(proof,'greenblatt',row,checked);
 assert.ok(html.includes(formatKst(asOf)));
 const missing=greenblattCurrentCheck({roa:30,trailingPE:10});
 assert.equal(missing.generatedAt,null);assert.deepEqual(missing.fieldMeta,{});
 const noMeta=extensionEvidence(proof,'greenblatt',row,missing);
 assert.match(noMeta,/출처 미제공/);assert.match(noMeta,/조회시각 미제공/);
 assert.doesNotMatch(noMeta,/Yahoo Fundamentals/);
});

test('TTM provenance never treats a general quote date as a metric observation date',()=>{
 const priceTime='2026-10-08T06:30:00Z';
 const checked=greenblattCurrentCheck({roa:30,trailingPE:10,asOf:priceTime,fieldMeta:{roa:{source:'Yahoo Fundamentals',period:'TTM'},trailingPE:{source:'Yahoo Fundamentals',period:'TTM'}}});
 const html=extensionEvidence(proof,'greenblatt',row,checked);
 const provenance=html.match(/<details class="guru-current-provenance">([\s\S]*?)<\/details>/)[1];
 assert.doesNotMatch(provenance,new RegExp(formatKst(priceTime)));
 assert.equal((provenance.match(/자료 기준시각 미제공/g)||[]).length,3);
});

test('TTM explicit missing values differ from provider errors or absent metric fields',()=>{
 assert.equal(greenblattCurrentCheck({roa:null,trailingPE:null}).status,'unknown');
 assert.equal(greenblattCurrentCheck({ticker:'171090.KQ'}).status,'error');
 assert.equal(greenblattCurrentCheck({...observed,error:'provider timeout'}).status,'error');
 assert.equal(greenblattCurrentCheck(null).status,'error');
});
