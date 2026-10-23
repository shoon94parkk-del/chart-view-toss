import {test} from 'node:test';
import assert from 'node:assert/strict';
import {investmentNewsFixture} from './fixtures/investment-news.mjs';
import {resolveRoute} from '../src/routes.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequestClient} from '../src/requestClient.js';
const now=Date.parse('2026-10-21T02:00:00Z');
test('public investment-news direct and hash routes resolve independently of stock news',()=>{
 for(const location of [{pathname:'/investment-news/'},{pathname:'/chartview/investment-news/'},{hash:'#investment-news'}])assert.equal(resolveRoute(location).tab,'investment-news');
 assert.equal(resolveRoute({hash:'#news/005930.KS'}).newsSymbol,'005930.KS');
});
test('validates REVIEW_ONLY news and refuses malformed, private or uncited evidence',async()=>{
 const {validateInvestmentNews}=await import('../src/investmentNewsModel.js');
 assert.equal(validateInvestmentNews(investmentNewsFixture(),now).status,'ready');
 for(const mutate of [d=>d.schemaVersion='other',d=>d.capabilities.telegram_input_enabled=true,d=>d.as_of_date='2026-10-20',d=>d.events[0].trade_action='BUY',d=>d.generated_at='2099-01-01T00:00:00Z',d=>d.events[0].importance=101,d=>d.events[0].account_id='private',d=>d.events[0].facts[0].source_url='https://invented.test/source',d=>d.events[0].sources[0].url='https://t.me/channel/1']){
  const d=investmentNewsFixture();mutate(d);assert.equal(validateInvestmentNews(d,now).status,'invalid');
 }
 const empty={schemaVersion:'investment-news.v1',generated_at:'2026-10-21T01:00:00Z',as_of_date:'2026-10-21',status:'NOT_STARTED',collection:{},capabilities:{},events:[],briefings:[]};
 assert.equal(validateInvestmentNews(empty,now).status,'ready');
});
test('filters and ranks received events with actual dates and preserves corrected revisions',async()=>{
 const {filterInvestmentEvents,chooseInvestmentPublication}=await import('../src/investmentNewsModel.js');
 const d=investmentNewsFixture();assert.deepEqual(filterInvestmentEvents(d.events).map(e=>e.event_id),['memory-release','policy-release']);
 assert.equal(filterInvestmentEvents(d.events,{sector:'반도체',ticker:'005930.KS',date:'2026-10-21',thesis:'review'}).length,1);
 assert.equal(filterInvestmentEvents(d.events,{sector:'금융',date:'2026-10-21'}).length,0);
 const older=structuredClone(d);older.generated_at='2026-10-20T00:00:00Z';assert.equal(chooseInvestmentPublication(d,older),d);
 const conflict=structuredClone(d);conflict.events[0].title='충돌';assert.equal(chooseInvestmentPublication(d,conflict),d);
 const newer=structuredClone(d);newer.generated_at='2026-10-21T01:30:00Z';assert.equal(chooseInvestmentPublication(d,newer),newer);
});
test('markup separates facts, conditional inferences, unavailable AI and missing performance',async()=>{
 const {investmentEventMarkup}=await import('../src/investmentNewsView.js');
 const event=investmentNewsFixture().events[0];event.title='<script>뉴스</script>';
 const html=investmentEventMarkup(event,1);
 for(const value of ['확인된 사실','조건부 해석','10%','수요가 유지될 때','AI 미실행','시장 기대 미확인','성과 자료 미연결','REVIEW_ONLY','개정 2'])assert.ok(html.includes(value),value);
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
 assert.ok(html.includes('data-investment-source'));
 assert.ok(!html.includes('0.00%'));
});
test('public agent evidence and unknowns remain visible without inventing completed agents',async()=>{
 const {investmentEventMarkup}=await import('../src/investmentNewsView.js');
 const event=investmentNewsFixture().events[0];event.analysis_status='completed';event.agents={mer:{summary:'공급 계획 분석',status:'completed',unknowns:['가격 반영 불명'],next_checks:['다음 공시'],inferences:[{text:'이익률 경로',condition:'수요 유지',horizon:'medium'}]}};
 const html=investmentEventMarkup(event,1);for(const text of ['가격 반영 불명','다음 공시','이익률 경로','3인 결과 일부 미연결'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('3인 분석 완료'));
});
test('observed fractional returns show dated percentages while missing returns stay missing',async()=>{
 const {investmentEventMarkup}=await import('../src/investmentNewsView.js');
 const event=investmentNewsFixture().events[0];event.performance=[{ticker:'005930.KS',baseline_at:'2026-10-21T00:30:00Z',followup_at:'2026-10-22T06:30:00Z',stock_return:0.05,benchmark_return:null,excess_return:null,source_urls:['https://example.com/prices']}];
 const html=investmentEventMarkup(event,1);for(const value of ['5.00%','2026-10-22T06:30:00Z','벤치마크 미제공'])assert.ok(html.includes(value),value);
 assert.ok(!html.includes('0.00%'));
});
test('official SK Telecom URL is public while genuine secret text and credential URLs are refused',async()=>{
 const {validateInvestmentNews}=await import('../src/investmentNewsModel.js');
 const d=investmentNewsFixture(),url='https://news.samsung.com/global/samsung-sk-telecom-and-hana-financial-group-build-koreas-first-private-office';d.events[0].sources[0].url=url;d.events[0].facts[0].source_url=url;
 assert.equal(validateInvestmentNews(d,now).status,'ready');
 d.events[0].summary=['sk-'+ 'a'.repeat(32)];assert.equal(validateInvestmentNews(d,now).status,'invalid');
 d.events[0].summary=['안전한 요약'];d.events[0].sources[0].url='https://source.test/release?api_key=abcd';assert.equal(validateInvestmentNews(d,now).status,'invalid');
});
test('CDN validation refuses fabricated completion and future reversed or unsupported performance',async()=>{
 const {validateInvestmentNews}=await import('../src/investmentNewsModel.js');
 const outcome={ticker:'005930.KS',baseline_at:'2026-10-20T00:00:00Z',followup_at:'2026-10-21T00:00:00Z',stock_return:0.2,benchmark_return:null,excess_return:null,source_urls:['https://example.com/price']};
 const mutations=[
  d=>{d.events[0].analysis_status='completed';d.events[0].agents=Object.fromEntries(['mer','nonggu','meng'].map(role=>[role,{summary:'분석 결과'}]));},
  d=>{d.events[0].performance=[{...outcome,baseline_at:'2099-01-01T00:00:00Z',followup_at:'2000-01-01T00:00:00Z'}];},
  d=>{d.events[0].performance=[{...outcome,baseline_at:'2026-10-21T01:00:00Z',followup_at:'2026-10-20T00:00:00Z'}];},
  d=>{d.events[0].performance=[{...outcome,source_urls:[]}];},
  d=>{d.events[0].performance=[{...outcome,benchmark_return:Infinity}];},
  d=>{d.events[0].performance=[{...outcome,stock_return:'0.2'}];},
  d=>{d.events[0].performance=[{...outcome,return_pct:20}];},
  d=>{d.events[0].performance=[{...outcome,source_url:'https://t.me/channel/1'}];},
  d=>{d.events[0].performance=[{...outcome,benchmark_source_url:'https://source.test/price?token=abcd'}];},
  d=>{d.events[0].thesis_reviews=[{status:'review_required',evidence_urls:['https://t.me/channel/1']}];},
  d=>{d.capabilities.telegram_input=true;},
 ];
 for(const mutate of mutations){const d=investmentNewsFixture();mutate(d);assert.equal(validateInvestmentNews(d,now).status,'invalid');}
 const d=investmentNewsFixture();d.events[0].performance=[outcome];d.events[0].analysis_status='completed';d.events[0].agents=Object.fromEntries(['mer','nonggu','meng'].map(role=>[role,{role,summary:'분석 결과',evidence_ids:['E1']}]));assert.equal(validateInvestmentNews(d,now).status,'ready');
});
test('malformed optional public fields fail closed and genuine zero source numbers remain visible',async()=>{
 const {validateInvestmentNews}=await import('../src/investmentNewsModel.js');const {investmentEventMarkup}=await import('../src/investmentNewsView.js');
 for(const mutate of [d=>d.capabilities.ai_configured='false',d=>d.collection.sources=[null],d=>d.briefings=[null],d=>d.events[0].thesis_reviews=[null],d=>d.events[0].agents={mer:{summary:5}},d=>d.events[0].private_thesis='개인 원문']){const d=investmentNewsFixture();mutate(d);assert.equal(validateInvestmentNews(d,now).status,'invalid');}
 const e=investmentNewsFixture().events[0];e.facts[0].numbers=[0,'10%'];const html=investmentEventMarkup(e,1);assert.ok(html.includes('0, 10%'));
});
test('source dates and URLs preserve calendar validity and Telegram host boundaries',async()=>{
 const {validateInvestmentNews,investmentSourceUrl}=await import('../src/investmentNewsModel.js');
 for(const value of ['2026-02-31T00:00:00Z','2026-10-20T25:00:00Z']){const d=investmentNewsFixture();d.events[0].published_at=value;assert.equal(validateInvestmentNews(d,now).status,'invalid');}
 for(const value of ['https://t.me./channel/1','https://telegram.dog/channel/1','https://source.test:8443/article',' https://source.test/article'])assert.equal(investmentSourceUrl(value),'');
 assert.equal(investmentSourceUrl('https://source.test:443/article'),'https://source.test:443/article');
});
test('public fallback refuses unsourced events and private prose in otherwise allowed fields',async()=>{
 const {validateInvestmentNews}=await import('../src/investmentNewsModel.js');
 const unsourced=investmentNewsFixture();unsourced.events[0].sources=[];unsourced.events[0].facts=[];assert.equal(validateInvestmentNews(unsourced,now).status,'invalid');
 for(const value of ['내 보유 금액 100만원','my portfolio contains private investments','access_token=abcd1234','AKIA'+'A'.repeat(16)]){const d=investmentNewsFixture();d.events[0].thesis_reviews=[{status:'review_required',reason:value}];assert.equal(validateInvestmentNews(d,now).status,'invalid');}
});
test('a stalled public CDN fallback reaches the shared request deadline',async(t)=>{
 const source=readFileSync(new URL('../src/investmentNewsView.js',import.meta.url),'utf8');
 const loader=source.slice(source.indexOf('async function loadNews('),source.indexOf('export function mountInvestmentNews('));
 t.mock.timers.enable({apis:['setTimeout']});
 const context={api:async()=>{throw Error('API unavailable');},STATIC_DATA_BASE:'https://data.test',fetch:()=>new Promise(()=>{}),createRequestClient,validateInvestmentNews:()=>({status:'invalid'}),Date,AbortController};
 vm.createContext(context);vm.runInContext(loader,context);
 let outcome='pending';context.loadNews({signal:new AbortController().signal}).then(()=>{outcome='ready';},error=>{outcome=error.code;});
 await new Promise(resolve=>setImmediate(resolve));t.mock.timers.tick(3000);await new Promise(resolve=>setImmediate(resolve));assert.equal(outcome,'timeout');
});
