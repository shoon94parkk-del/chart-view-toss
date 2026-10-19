import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDebateArchive,debateDetailMarkup,debateListMarkup} from '../src/debateDashboard.js';
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
