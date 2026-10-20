import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDebateArchive,debateDetailMarkup,debateListMarkup,formatDebateMarkdown,readPublishedJson,validateShadowStatus,shadowStatusMarkup} from '../src/debateDashboard.js';
const now=Date.parse('2026-10-19T23:00:00+09:00');
const valid=()=>({schema_version:1,kind:'debate_archive',publication_status:'EXPLICITLY_APPROVED',
 generated_at:'2026-10-19T22:00:00+09:00',debates:[{id:'apr-20261013',company:'에이피알',ticker:'278470',
 date:'2026-10-13',status:'COMPLETED',verdict:'WAIT',audit_verified:false,
 phases:[{stage:'phase1',role:'mer',title:'독립 분석',text:'근거 기반 분석',source_path:'records/debates/20261013-picks/apr-mer-phase1.md'},
 {stage:'attack',role:'meng',title:'공격',text:'관측 근거?',source_path:'records/debates/20261013-picks/apr-phase2.md'}]}]});
test('approved archive with real phase structure renders',()=>{
 const x=validateDebateArchive(valid(),now);assert.equal(x.status,'ready');
 assert.match(debateDetailMarkup(x.document.debates[0]),/메르/);
 assert.match(debateListMarkup(x.document.debates,'278470','attack'),/에이피알/);
 assert.doesNotMatch(debateListMarkup(x.document.debates,'NVDA'),/에이피알/);
});
test('unapproved publication, future timestamps, fake audits blocked',()=>{
 for(const variant of ['draft','future','audit']){
  const d=valid();
  if(variant==='draft')d.publication_status='DRAFT';
  if(variant==='future')d.generated_at='2026-10-20T22:00:00+09:00';
  if(variant==='audit')d.debates[0].audit_verified=true;
  assert.equal(validateDebateArchive(d,now).status,'invalid');
 }
});
test('malformed source paths or oversized phases rejected',()=>{
 const d=valid();d.debates[0].phases[0].source_path='../secrets.txt';
 assert.equal(validateDebateArchive(d,now).status,'invalid');
 const e=valid();e.debates[0].phases[0].text='a'.repeat(16001);
 assert.equal(validateDebateArchive(e,now).status,'invalid');
});
test('untrusted markdown is escaped instead of becoming HTML',()=>{
 const d=valid();d.debates[0].phases[0].text='<script>alert(1)</script>';
 const html=debateDetailMarkup(d.debates[0]);
 assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
});

test('safe readable Markdown and stage filters',()=>{
 const html=formatDebateMarkdown('# 투자 분석\n**핵심** 근거\n- 주장\n<script>alert("x")</script>');
 assert.match(html, /debate-md-heading/);
 assert.match(html, /<strong>핵심<\/strong>/);
 assert.match(html, /debate-md-list/);
 assert.doesNotMatch(html, /<script>/);
 assert.match(html, /&lt;script&gt;/);
 const doc=valid();
 const onlyAttack=debateDetailMarkup(doc.debates[0],'attack');
 assert.match(onlyAttack, /관측 근거/);
 assert.doesNotMatch(onlyAttack, /근거 기반 분석/);
});

test('Shadow progress requires approved aggregation and genuine timestamps',()=>{
 const t='2026-10-20T00:00:00+00:00';
 const value={schema_version:1,kind:'shadow_status',
  publication_status:'EXPLICITLY_APPROVED',generated_at:t,state:'RUNNING',
  period_started_at:t,last_execution_at:t,runs_total:8,
  screenings_total:3,debates_total:2,audits_approved:1,audits_blocked:1,failures_total:0,
  smoke_runs_total:1,smoke_audits_approved:1};
 const ready=validateShadowStatus(value,Date.parse('2026-10-20T01:00:00+00:00'));
 assert.equal(ready.status,'ready');
 assert.match(shadowStatusMarkup(ready),/관찰 진행 중/);
 assert.match(shadowStatusMarkup(ready),/8/);
 assert.equal(validateShadowStatus({...value,last_execution_at:null}).status,'invalid');
 assert.equal(validateShadowStatus({...value,audits_approved:4}).status,'invalid');
 assert.equal(validateShadowStatus({...value,publication_status:'DRAFT'}).status,'invalid');
 assert.equal(validateShadowStatus({...value,failures_total:-1}).status,'invalid');
 assert.equal(validateShadowStatus({...value,smoke_audits_approved:2}).status,'invalid');
 assert.match(shadowStatusMarkup(ready),/스모크 실증/);
 const late=validateShadowStatus(value,Date.parse('2026-10-22T01:00:00+00:00'));
 assert.equal(late.stale,true);
 assert.match(shadowStatusMarkup(late),/보고 지연/);
});

test('a completed smoke does not masquerade as fourteen days of recurring logs',()=>{
 const generated='2026-10-20T07:00:00+00:00';
 const archived={schema_version:1,kind:'shadow_status',
  publication_status:'EXPLICITLY_APPROVED',generated_at:generated,
  state:'NOT_STARTED',period_started_at:null,last_execution_at:null,
  runs_total:0,screenings_total:0,debates_total:0,audits_approved:0,
  audits_blocked:0,failures_total:0,smoke_runs_total:1,smoke_audits_approved:1};
 const o=validateShadowStatus(archived,Date.parse('2026-10-20T07:10:00+00:00'));
 assert.equal(o.status,'ready');
 const markup=shadowStatusMarkup(o);
 assert.match(markup,/정기 로그 미연결/);
 assert.match(markup,/0\/14일/);
 assert.match(markup,/스모크 성공 기록/);
});

test('published public summaries are valid and do not impersonate audited picks',async()=>{
 const {readFileSync}=await import('node:fs');
 const archive=JSON.parse(readFileSync(new URL('../public/data/intelligence_debates_public.json',import.meta.url),'utf8'));
 const parsed=validateDebateArchive(archive,Date.parse('2026-10-20T15:00:00+09:00'));
 assert.equal(parsed.status,'ready');
 assert.equal(parsed.document.debates.length,3);
 assert.ok(parsed.document.debates.some(d=>d.ticker==='272210'));
 assert.ok(parsed.document.debates.some(d=>d.ticker==='085910'));
 assert.ok(parsed.document.debates.every(d=>d.audit_verified===false));
 assert.match(debateListMarkup(parsed.document.debates,'한화시스템'),/한화시스템/);
 const shadow=JSON.parse(readFileSync(new URL('../public/data/intelligence_shadow_status.json',import.meta.url),'utf8'));
 const status=validateShadowStatus(shadow,Date.parse('2026-10-20T15:00:00+09:00'));
 assert.equal(status.status,'ready');
 assert.equal(status.document.smoke_runs_total,1);
 assert.equal(status.document.runs_total,0);
});
test('readPublishedJson rejects malformed or unapproved network data',async()=>{
 const old=globalThis.fetch;
 try{
   globalThis.fetch=async()=>({ok:true,json:async()=>({publication_status:'DRAFT'})});
   await assert.rejects(()=>readPublishedJson('intelligence_debates_public.json',validateDebateArchive));
   globalThis.fetch=async()=>({ok:false});
   await assert.rejects(()=>readPublishedJson('intelligence_debates_public.json',validateDebateArchive));
 }finally{globalThis.fetch=old;}
});
