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

import {selectionKey} from '../src/valueDiscovery.js';
import {technicalWarning} from '../src/insightModel.js';
test('selection thesis is shown once only when equal and warnings link to their own dated records',()=>{
 const view=loadView('pickLedger.js',{selectionKey,technicalWarning});
 const a={symbol:'005930.KS',recommendedDate:'2026-10-02',name:'삼성전자',reason:'메모리 수요',monitor:{originalThesis:{summary:'메모리 수요'},technical:{reasons:['RSI 하락']}}};
 assert.equal((view.rowMarkup(a,0,()=>a.name).match(/메모리 수요/g)||[]).length,1);
 assert.match(view.rowMarkup({...a,monitor:{originalThesis:{summary:'재고 개선'}}},0,()=>a.name),/메모리 수요.*재고 개선/s);
 const b={...a,symbol:'000660.KS',name:'SK하이닉스',monitor:{technical:{reasons:['거래량 약화']}}};
 const html=view.technicalAlertRows([a,b],x=>x);
 assert.match(html,/2026-10-02:005930[^>]*>.*RSI 하락/s);assert.match(html,/2026-10-02:000660[^>]*>.*거래량 약화/s);
 assert.doesNotMatch(html.split('data-pick-alert-key="2026-10-02:000660"')[1],/RSI 하락/);
});

test('heatmap list reuses map targets and retains exact prices, changes and source dates',()=>{
 const view=loadView('heatmapView.js',{HOME_LOGOS:{}}),payload={generatedAt:'2026-10-02T06:30:00Z',results:[{ticker:'005930.KS',price:100000,change:2,marketCap:300,sessionDate:'2026-10-02'},{ticker:'NVDA',price:150.5,change:-1,marketCap:400,sessionDate:'2026-10-01'}]};
 for(const market of ['KR','US']){
  const map=view.renderSharedHeatmap(payload,{scope:'full',market});
  const list=view.renderHeatmapList(payload,{market});
  const expected=market==='KR'?'005930.KS':'NVDA';assert.match(list,new RegExp('data-stock-detail="'+expected+'"'));assert.match(map,new RegExp('data-stock-detail="'+expected+'"'));
  assert.match(list,market==='KR'?/100,000원.*\+2\.00%.*2026-10-02/s:/150\.5.*-1\.00%.*2026-10-01/s);
  assert.doesNotMatch(list,new RegExp('data-stock-detail="'+(market==='KR'?'NVDA':'005930.KS')+'"'));
 }
});
test('empty saved research provides one action to start investigating a stock',()=>{
 const view=loadView('savedResearchView.js',{savedResearch:()=>({rows:[],error:false})});
 assert.match(view.savedResearchHtml(x=>x),/data-open-stock-search/);assert.equal(view.savedResearchHtml(x=>x,{compact:true}),'');
});

import {recentSelections,selectionCardMarkup} from '../src/valueDiscovery.js';
test('Home shows two recent records even when the source supplies three',()=>{
 const view=loadView('homeExtras.js',{HOME_STOCK_META:{},recentSelections,selectionCardMarkup,window:{},document:{readyState:'loading',addEventListener(){}},MutationObserver:class{}});
 const host={isConnected:true,innerHTML:'',querySelectorAll:()=>[]};view.paintPicks(host,{day:{tradeDate:'2026-10-02',top3:['005930.KS','000660.KS','373220.KS'].map(symbol=>({symbol,name:symbol}))}});
 assert.equal((host.innerHTML.match(/home-selection-link/g)||[]).length,2);
});
