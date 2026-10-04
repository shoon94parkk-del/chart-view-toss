import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as exportModel from '../src/exportMomentumModel.js';
import {memoryMovements} from '../src/insightModel.js';
const loadView=(file,imports={})=>{const context=vm.createContext(imports);vm.runInContext(readFileSync(new URL('../src/'+file,import.meta.url),'utf8').replace(/^import[\s\S]*?;\r?\n/gm,'').replaceAll('export ',''),context);return context;};
test('item detail puts company investigation after summary and keeps country data in disclosures',()=>{
 const view=loadView('exportMomentumView.js',{...exportModel,memoryMovements});
 const html=view.renderItemDetail({key:'car',name:'자동차',note:'HS 87',period:'2026-08',history:[],countries:[]});
 assert.match(html,/data-export-research-jump/);
 assert.ok(html.indexOf('export-detail-summary')<html.indexOf('data-export-research-jump'));
 assert.ok(html.indexOf('export-research')<html.indexOf('export-detail-chart-stack'));
 assert.match(html,/<details[^>]*export-data-details/);
 assert.match(html,/지정 시장/);
});

import {investigationHtml} from '../src/insightView.js';
import {formatFinancialAmount} from '../src/dataPresentation.js';
import {revenueMixBasis} from '../src/experienceState.js';
test('investigation summary preserves critical limitations and keeps all evidence in an optional disclosure',()=>{
 const html=investigationHtml({kind:'export',title:'긴 회사·국가 제목',basisDate:'2026-08',observations:['수출액 +3%','물량 +2%','단위가치 +1%'],challenge:'기업 노출 미확인',source:'KRX',products:'모든 주요제품',productDate:'2026-10-02',warnings:['자료 범위 확인']});
 assert.match(html,/<details[^>]*insight-evidence-details/);
 const summary=html.slice(0,html.indexOf('<details'));
 assert.match(summary,/수혜는 확인되지/);assert.match(summary,/자료 범위 확인/);assert.match(summary,/2026-08/);assert.match(summary,/data-detail-jump/);
 assert.match(html,/단위가치 \+1%/);assert.match(html,/모든 주요제품/);assert.equal(investigationHtml(null),'');
});
test('business report uses readable KRW units while retaining original public values',()=>{
 const view=loadView('industryContextView.js',{formatFinancialAmount,revenueMixBasis});
 const html=view.reportRevenueHtml({available:true,unit:'백만원',items:[{name:'반도체',revenue:123456789,share:60}],source:'DART',reportYear:2025});
 assert.match(html,/123\.46조 원/);assert.match(html,/원값·공시 단위/);assert.match(html,/123,456,789 백만원/);
});
