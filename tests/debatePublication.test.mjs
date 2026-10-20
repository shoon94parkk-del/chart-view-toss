import test from 'node:test';
import assert from 'node:assert/strict';
import * as dashboard from '../src/debateDashboard.js';
import {tenResearchResults,partialLimitation} from './fixtures/debate-ten-results.mjs';

const now=Date.parse('2026-10-20T07:00:00Z');
const phase=(role,stage)=>({role,stage,title:'공개 근거',text:'실적과 가격의 차이를 확인합니다.',source_path:`records/debates/20261020/${role}-${stage}.md`});
const archive=()=>({schema_version:1,kind:'debate_archive',publication_status:'EXPLICITLY_APPROVED',generated_at:'2026-10-20T06:55:00Z',debates:[{id:'new-stock-20261020',company:'새 연구 종목',ticker:'123456',date:'2026-10-20',status:'COMPLETED',verdict:'WAIT',audit_verified:false,summary:'추가 실적 확인이 필요한 공개 연구 결과입니다.',updated_at:'2026-10-20T06:50:00Z',phases:[phase('mer','phase1'),phase('nonggu','phase1'),phase('meng','phase1'),phase('other','attack'),phase('other','rebuttal'),phase('other','final')]}]});

test('public research accepts HOLD and preserves that source verdict in list and details',()=>{
 const d=archive();d.debates[0].verdict='HOLD';
 const result=dashboard.validateDebateArchive(d,now);
 assert.equal(result.status,'ready');
 assert.equal(result.document.debates[0].verdict,'HOLD');
 assert.match(dashboard.debateListMarkup(result.document.debates),/>HOLD</);
 assert.match(dashboard.debateDetailMarkup(result.document.debates[0]),/>HOLD</);
});

test('ten research results retain three HOLD and seven WAIT verdicts and disclose a partial record',()=>{
 const source=tenResearchResults(),before=structuredClone(source);
 const result=dashboard.validateDebateArchive(source,now);assert.equal(result.status,'ready');
 assert.equal(result.document.debates.length,10);
 assert.equal(result.document.debates.filter(d=>d.verdict==='HOLD').length,3);
 assert.equal(result.document.debates.filter(d=>d.verdict==='WAIT').length,7);
 const html=dashboard.debateListMarkup(result.document.debates);
 assert.equal((html.match(/>HOLD</g)||[]).length,3);assert.equal((html.match(/>WAIT</g)||[]).length,7);
 const partial=result.document.debates.find(d=>d.status==='PARTIAL');
 assert.match(dashboard.debateListMarkup([partial]),/일부 결과/);
 assert.ok(dashboard.debateDetailMarkup(partial).includes(partialLimitation));
 assert.deepEqual(source,before);
 const invalid=tenResearchResults();invalid.debates[0].verdict='HOLDING';assert.equal(dashboard.validateDebateArchive(invalid,now).status,'invalid');
});

test('completed public research requires paired summary/update and completed three-agent rounds',()=>{
 assert.equal(dashboard.validateDebateArchive(archive(),now).status,'ready');
 for(const change of [d=>delete d.debates[0].updated_at,d=>delete d.debates[0].summary,d=>d.debates[0].summary=' ',d=>d.debates[0].summary='a'.repeat(601),d=>d.debates[0].updated_at='2026-10-20T06:59:00Z',d=>d.debates[0].updated_at='2026-10-20T06:50:00',d=>d.debates[0].phases.splice(2,1),d=>d.debates[0].phases.pop()]){
  const d=archive();change(d);assert.equal(dashboard.validateDebateArchive(d,now).status,'invalid');
 }
 for(const status of ['PARTIAL','BLOCKED']){const d=archive();d.debates[0].status=status;d.debates[0].phases=[phase('mer','phase1')];assert.equal(dashboard.validateDebateArchive(d,now).status,'ready');}
 const legacy=archive();delete legacy.debates[0].summary;delete legacy.debates[0].updated_at;legacy.debates[0].phases=[phase('mer','phase1')];assert.equal(dashboard.validateDebateArchive(legacy,now).status,'ready');
});

test('calendar dates, bounded metadata and private content anywhere reject the whole public archive',()=>{
 for(const change of [d=>d.debates[0].date='2026-02-30',d=>d.generated_at='2026-02-30T06:55:00Z',d=>d.debates[0].company='',d=>d.debates[0].topic='x'.repeat(241),d=>d.notice='contact test@example.com',d=>d.debates[0].company='내 보유 삼성전자',d=>d.debates[0].summary='보유 수량 500주',d=>d.debates[0].phases[0].title='010-1234-5678',d=>d.extra={positions:[]},d=>d.extra={metadata:{cost_basis:100}},d=>d.extra={watchlist:[]},d=>d.extra={value:'sk-'+'a'.repeat(25)}]){
  const d=archive();change(d);assert.equal(dashboard.validateDebateArchive(d,now).status,'invalid');
 }
});

test('generic labeled credentials and personal account text cannot leak through optional metadata',()=>{
 for(const value of ['api_key: ABCD123456','password=abcde','access-token: abcd1234','계좌번호 1234-5678','매입수량 500주','평균매수단가 10000원','평단가 10000원','my portfolio contains Samsung','personal account balances']){
  const d=archive();d.metadata={display_note:value};assert.equal(dashboard.validateDebateArchive(d,now).status,'invalid',value);
 }
});

test('public rendering exposes concise summary and truthful state, and summary is searchable',()=>{
 const d=archive();const html=dashboard.debateListMarkup(d.debates,'추가 실적');
 assert.match(html,/추가 실적 확인/);assert.match(html,/분석 완료/);
 assert.doesNotMatch(dashboard.debateListMarkup(d.debates,'없는 검색어'),/new-stock-20261020/);
 for(const [status,label] of [['PARTIAL','일부 결과'],['BLOCKED','분석 중단']]){d.debates[0].status=status;assert.match(dashboard.debateListMarkup(d.debates),new RegExp(label));}
 d.debates[0].summary='<img src=x onerror=alert(1)> 공개';const escaped=dashboard.debateListMarkup(d.debates);assert.doesNotMatch(escaped,/<img/);assert.match(escaped,/&lt;img/);
});

test('newest publication uses actual instants and failed/older sources preserve last-good',()=>{
 assert.equal(typeof dashboard.choosePublicPublication,'function');
 const old={status:'ready',document:archive(),source:'published_api'};
 const newer=structuredClone(old);newer.document.generated_at='2026-10-20T16:00:00+09:00';
 const stale=structuredClone(old);stale.document.generated_at='2026-10-20T06:45:00Z';
 assert.equal(dashboard.choosePublicPublication(old,newer),newer);
 assert.equal(dashboard.choosePublicPublication(newer,old),newer);
 assert.equal(dashboard.choosePublicPublication(old,stale),old);
 assert.equal(dashboard.choosePublicPublication(old,{status:'unavailable'}),old);
});

test('conflicting equal-time research cannot replace last-good; equivalent projections can verify it',()=>{
 assert.equal(typeof dashboard.choosePublicPublication,'function');
 const good={status:'ready',document:archive(),source:'published_snapshot'};
 const conflicting=structuredClone(good);conflicting.document.debates[0].summary='다른 결과로 바뀐 충돌 게시입니다.';
 assert.equal(dashboard.choosePublicPublication(good,conflicting),good);
 const equivalent=structuredClone(good);equivalent.source='published_api';equivalent.document.generated_at='2026-10-20T15:55:00+09:00';equivalent.document.debates[0].updated_at='2026-10-20T15:50:00+09:00';equivalent.document.notice='공개 연구 요약';equivalent.document.read_mode='CURATED_PUBLIC_SUMMARIES';
 equivalent.document=Object.fromEntries(Object.entries(equivalent.document).reverse());
 assert.equal(dashboard.choosePublicPublication(good,equivalent),equivalent);
});

test('refresh reads independently published API data without legacy gated endpoints or personal parameters',async()=>{
 const previous=globalThis.fetch;const calls=[];
 try{
  globalThis.fetch=async(url,init)=>{calls.push({url:String(url),init});return new Response(JSON.stringify(archive()),{headers:{'content-type':'application/json'}});};
  const result=await dashboard.loadDebateArchive({preferLive:true,dataBase:''});
  assert.equal(result.status,'ready');assert.equal(result.source,'published_api');
  assert.equal(new URL(calls[0].url).pathname,'/api/published-data/intelligence_debates_public.json');
  assert.equal(new URL(calls[0].url).search,'');assert.equal(calls[0].init.cache,'no-store');
  assert.equal(calls.length,1);
 }finally{globalThis.fetch=previous;}
});

test('configured public CDN revalidation rotates query and rejects oversized documents before parsing',async()=>{
 const previous=globalThis.fetch;const calls=[];
 try{
  globalThis.fetch=async(url,init)=>{calls.push({url:String(url),init});return new Response(JSON.stringify(archive()));};
  const a=await dashboard.loadDebateArchive({preferLive:true,dataBase:'https://public.example/data'});
  assert.equal(a.status,'ready');assert.equal(a.source,'published_cdn');
  assert.match(calls[0].url,/^https:\/\/public\.example\/data\/intelligence_debates_public\.json\?publication_check=\d+/);
  assert.equal(calls[0].init.cache,'no-store');
  globalThis.fetch=async()=>new Response('x',{headers:{'content-length':String(4*1024*1024+1)}});
  assert.equal((await dashboard.loadDebateArchive({preferLive:true,dataBase:'https://public.example/data'})).status,'unavailable');
 }finally{globalThis.fetch=previous;}
});

test('invalid live publication never silently returns an older bootstrap as a successful verification',async()=>{
 const previous=globalThis.fetch;const calls=[];
 try{
  globalThis.fetch=async url=>{calls.push(String(url));return new Response(JSON.stringify({publication_status:'DRAFT'}));};
  assert.equal((await dashboard.loadDebateArchive({preferLive:true,dataBase:''})).status,'unavailable');
  assert.equal(calls.length,1);assert.ok(calls.every(url=>url.includes('/api/published-data/')));
 }finally{globalThis.fetch=previous;}
});
