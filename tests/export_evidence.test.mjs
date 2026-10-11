import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../src/exportMomentumModel.js';
import * as view from '../src/exportMomentumView.js';
import * as data from '../src/exportMomentumData.js';
import {clearApiCache} from '../src/api.js';
import {semiconductorTrends, matrix, companyContext, industryDetails} from './fixtures/export-recovery.mjs';

// Removing the same-month join guard would let an August country delta enter September research.
test('country evidence only joins a selected trend when every provided month agrees',()=>{
 assert.equal(typeof model.semiconductorCountryEvidence,'function');
 const trends=model.normalizeSemiconductorTrends(semiconductorTrends);
 const countries=model.normalizeSemiconductorCountryMatrix(matrix);
 assert.equal(model.semiconductorCountryEvidence(trends,countries,'dram').compatible,true);
 for(const period of ['2026-08','']){
  const result=model.semiconductorCountryEvidence(trends,{...countries,period},'dram');
  assert.equal(result.compatible,false);
  assert.equal(result.segment,null);
 }
 assert.equal(model.semiconductorCountryEvidence({...trends,period:''},countries,'dram').compatible,false);
 assert.equal(model.semiconductorCountryEvidence(trends,{...countries,segments:countries.segments.map(row=>({...row,period:'2026-08'}))},'dram').compatible,false);
});

test('independent item and trend normalization preserves its own source and update evidence',()=>{
 for(const [normalize,raw] of [[model.normalizeExportItemDetail,industryDetails.cosmetics],[model.normalizeSemiconductorTrends,semiconductorTrends]]){
  const value=normalize({...raw,updatedAt:'2026-10-07T00:00:00Z',source:{name:'관세청 품목 API',url:'https://example.org/customs'},sources:[{name:'원자료',url:'https://example.org/data'}]});
  assert.equal(value.updatedAt,'2026-10-07T00:00:00Z');
  assert.equal(value.source.name,'관세청 품목 API');
  assert.equal(value.sources[0].url,'https://example.org/data');
 }
});

// Existing independent APIs supply the Customs provider in meta without a source URL or timestamp.
test('independent export sources retain the production meta provider without inventing update times',()=>{
 for(const [normalize,raw,render] of [
  [model.normalizeExportItemDetail,industryDetails.cosmetics,view.renderIndustryTab],
  [model.normalizeSemiconductorTrends,semiconductorTrends,view.semiconductorTrendView],
 ]){
  const input={...raw,meta:{provider:'Korea Customs Service / data.go.kr',cacheStatus:'fresh',cacheTtlSec:21600}};
  const value=normalize(input);
  assert.equal(value.source.name,input.meta.provider);
  assert.equal(value.source.url,'');
  assert.equal(value.updatedAt,'');
  const html=render(value);
  assert.match(html,/Korea Customs Service \/ data.go.kr/);
  assert.match(html,/갱신 시각 미제공/);
  assert.equal(normalize({...input,source:{name:'직접 제공한 출처',url:'https://example.org/source'}}).source.name,'직접 제공한 출처');
 }
});

test('breadth renders 52 up 26 down 2 flat from counts instead of assigning flat items to down',()=>{
 assert.equal(typeof view.breadth,'function');
 const html=view.breadth(model.normalizeExportSnapshot({breadth:{comparableCount:80,risingCount:52,fallingCount:26,flatCount:2,risingBreadthPct:99}}));
 assert.match(html,/class="up" style="width:65.0%"/);
 assert.match(html,/class="down" style="width:32.5%"/);
 assert.match(html,/class="flat" style="width:2.5%"/);
 assert.match(html,/aria-label="[^"]*증가 52개 · 65.0%[^"]*감소 26개 · 32.5%[^"]*보합 2개 · 2.5%/);
 const absent=view.breadth(model.normalizeExportSnapshot({breadth:{comparableCount:80,risingCount:52,fallingCount:null,flatCount:0}}));
 assert.match(absent,/감소 미제공/);
 assert.match(absent,/보합 0개 · 0.0%/);
 assert.doesNotMatch(absent,/class="down" style=/);
});

test('independent source disclosure includes month HS units and honest missing timestamps',()=>{
 assert.equal(typeof view.renderIndustryTab,'function');
 const html=view.renderIndustryTab(model.normalizeExportItemDetail(industryDetails.cosmetics));
 assert.match(html,/데이터 기준·원자료/);
 assert.match(html,/기준월 2026-09/);
 assert.match(html,/HS 3304/);
 assert.match(html,/출처 미제공/);
 assert.match(html,/갱신 시각 미제공/);
 assert.match(html,/억달러/);
 assert.match(html,/순중량/);
});

test('country mismatch keeps the chart but labels both months and company errors separately',()=>{
 assert.equal(typeof view.semiconductorTrendView,'function');
 const html=view.semiconductorTrendView(model.normalizeSemiconductorTrends(semiconductorTrends),{countryMatrix:model.normalizeSemiconductorCountryMatrix({...matrix,period:'2026-08'}),countryState:'ready',companyState:'error'});
 assert.match(html,/DRAM 최근 12개월 수출액 추이/);
 assert.match(html,/추이 2026-09 · 국가 2026-08/);
 assert.doesNotMatch(html,/export-semi-country-mini/);
 assert.match(html,/기업 근거 자료 확인 실패/);
 assert.match(html,/data-export-semi-company-retry/);
 assert.doesNotMatch(html,/기업 후보를 찾지 못했어요/);
});

test('company context distinguishes valid empty data from malformed 200 and retries its cached failure',async()=>{
 assert.equal(typeof data.loadExportCompanyContext,'function');
 const original=globalThis.fetch;
 let payload={error:'provider unavailable'},calls=0;
 globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify(payload),{status:200,headers:{'Content-Type':'application/json'}});};
 clearApiCache();
 try{
  await assert.rejects(data.loadExportCompanyContext(),/기업 근거/);
  payload={companies:[]};
  assert.deepEqual((await data.loadExportCompanyContext({force:true})).companies,[]);
  payload=companyContext;
  assert.equal((await data.loadExportCompanyContext({force:true})).companies.length,companyContext.companies.length);
  assert.equal(calls,3);
 }finally{globalThis.fetch=original;clearApiCache();}
});

test('malformed company identity rows are retryable errors while valid companies without product evidence stay ready',async()=>{
 const original=globalThis.fetch;
 let payload;
 globalThis.fetch=async()=>new Response(JSON.stringify(payload),{status:200});
 clearApiCache();
 try{
  for(const row of [null,'invalid',{}, {symbol:'005930.KS'}, {name:'삼성전자'}, {symbol:7,name:'삼성전자'}, {symbol:'005930.KS',name:' '}]){
   payload={companies:[row]};
   await assert.rejects(data.loadExportCompanyContext({force:true}),/기업 근거/);
  }
  payload={companies:[{symbol:'005930.KS',name:'삼성전자'}]};
  assert.deepEqual((await data.loadExportCompanyContext({force:true})).companies,payload.companies);
 }finally{globalThis.fetch=original;clearApiCache();}
});

// Removing export-level pending sharing would reuse the malformed cached 200 during recovery.
test('new export readers share an in-flight company recovery instead of the failed cached response',async()=>{
 const original=globalThis.fetch;
 let calls=0,release,arrive;
 const gate=new Promise(resolve=>{release=resolve;});
 const arrived=new Promise(resolve=>{arrive=resolve;});
 globalThis.fetch=async()=>{
  calls++;
  if(calls===1)return new Response(JSON.stringify({error:'unavailable'}),{status:200});
  arrive();await gate;
  return new Response(JSON.stringify(companyContext),{status:200});
 };
 clearApiCache();
 try{
  await assert.rejects(data.loadExportCompanyContext(),/기업 근거/);
  const retry=data.loadExportCompanyContext({force:true});
  await arrived;
  const readers=Promise.allSettled([retry,data.loadExportCompanyContext(),data.loadExportCompanyContext({force:true})]);
  release();
  const results=await readers;
  assert.deepEqual(results.map(result=>result.status),['fulfilled','fulfilled','fulfilled']);
  for(const result of results)assert.equal(result.value.companies.length,companyContext.companies.length);
  assert.equal(calls,2);
 }finally{release();globalThis.fetch=original;clearApiCache();}
});
