import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRoute} from '../src/routes.js';
import {encodeSharedView} from '../src/experienceState.js';
import {companyLearningSummary,learningSourceContext} from '../src/learningStockLinks.js';

test('learning deep links validate company/session targets and keep private IDs out of shared state',()=>{
 assert.deepEqual(resolveRoute({hash:'#learning'}),{tab:'learning',detailSymbol:null,learningRoute:{kind:'dashboard',id:null}});
 assert.equal(resolveRoute({pathname:'/learning/'}).tab,'learning');
 assert.deepEqual(resolveRoute({hash:'#learning/company/278470.KS'}).learningRoute,{kind:'company',id:'278470.KS'});
 const id='4a38157c-3178-4d54-98e5-4cd8e11d1db1';
 assert.deepEqual(resolveRoute({hash:`#learning/session/${id}`}).learningRoute,{kind:'session',id});
 for(const hash of ['#learning/session/not-a-uuid','#learning/company/%3Cscript%3E','#learning/unknown','#learning/session/'+id+'/extra'])assert.equal(resolveRoute({hash}).tab,'notfound');
 assert.equal(encodeSharedView({tab:'learning',token:'private-token',learningRoute:{kind:'session',id},notes:'personal'}),'');
});

test('company summary distinguishes empty, draft, zero self-understanding and actual quiz submission',()=>{
 const ws={sessions:[{id:'one',symbols:['278470.KS'],status:'completed',lessonDate:'2026-11-02',understanding:0,updatedAt:'2026-11-02T12:00:00Z',revision:2}],attempts:[]};
 assert.equal(companyLearningSummary(ws,'003230.KS').count,0);
 let s=companyLearningSummary(ws,'278470.KS');
 assert.equal(s.understanding,0);assert.equal(s.quizScore,null);assert.equal(s.status,'completed');
 ws.attempts.push({sessionId:'one',sessionRevision:1,score:100,submittedAt:'2026-11-02T11:00:00Z'});
 assert.equal(companyLearningSummary(ws,'278470.KS').quizScore,null);
 ws.attempts.push({sessionId:'one',sessionRevision:2,score:0,submittedAt:'2026-11-02T12:00:00Z'});
 assert.equal(companyLearningSummary(ws,'278470.KS').quizScore,0);
});

test('learning source context allowlists existing analysis metadata and excludes personal notes/secrets',()=>{
 const context=learningSourceContext({kind:'picks',symbol:'278470.KS',name:'에이피알',date:'2026-11-02',key:'2026-11-02:278470',reason:'공개 선정 근거',token:'secret',notes:'private note'});
 assert.deepEqual(context,{kind:'picks',symbol:'278470.KS',name:'에이피알',date:'2026-11-02',key:'2026-11-02:278470',reason:'공개 선정 근거'});
});
