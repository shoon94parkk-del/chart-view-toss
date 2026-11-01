import {test} from 'node:test';
import assert from 'node:assert/strict';
import {kstDate, learningSchedule, learningDashboard, learningStatus, selectLearningRoute, makeLearningDraft, validateLearningDraft, previewLearningImport, compareLearningRevision, safeLearningContext} from '../src/learningModel.js';
const company={symbol:'005930.KS',name:'삼성전자',industry:'반도체'};
const curriculum={id:'test',title:'기업 공부',startDate:'2026-11-02',weeks:Array.from({length:6},(_,i)=>({id:'w'+i,industry:'반도체',companies:[company,{...company,symbol:'000660.KS'}, {...company,symbol:'NVDA'}]}))};
const session={id:'a',lessonDate:'2026-11-02',symbols:['005930.KS'],company,industry:'반도체',status:'completed',revision:2,understanding:0,completedAt:'2026-11-02T11:00:00Z'};
test('KST boundary and complete six-week schedule keep weekday kinds and exact ending',()=>{
 assert.equal(kstDate('2026-11-01T15:00:00Z'),'2026-11-02');
 const days=learningSchedule(curriculum);assert.equal(days.length,42);assert.equal(days[0].date,'2026-11-02');assert.equal(days.at(-1).date,'2026-12-13');
 assert.deepEqual(days.slice(0,7).map(d=>d.kind),['company','company','company','value_chain','comparison','scenario','review']);
 assert.equal(days[0].company.symbol,'005930.KS');
});
test('only a native graded attempt against the current completed revision is evaluated',()=>{
 assert.equal(learningStatus(null,[]),'not_started');
 assert.equal(learningStatus({...session,status:'in_progress'},[]),'in_progress');
 assert.equal(learningStatus(session,[{sessionId:'a',sessionRevision:1,score:100}]),'completed');
 assert.equal(learningStatus(session,[{sessionId:'a',sessionRevision:2,score:0}]),'evaluated');
 assert.equal(learningStatus(session,[{sessionId:'a',sessionRevision:2,score:100,provenance:'external'}]),'completed');
});
test('empty dashboard has no invented results and missing understanding differs from real zero',()=>{
 const empty=learningDashboard({curriculum,sessions:[],attempts:[]},'2026-11-01');
 assert.equal(empty.today.date,'2026-11-02');assert.equal(empty.completedDays,0);assert.equal(empty.streak,0);assert.equal(empty.averageUnderstanding,null);assert.equal(empty.quizTotal,0);
 const data=learningDashboard({curriculum,sessions:[session,{...session,id:'b',lessonDate:'2026-11-03',completedAt:'2026-11-03T11:00:00Z',understanding:null}],attempts:[{sessionId:'a',score:0}]},'2026-11-03');
 assert.equal(data.averageUnderstanding,0);assert.equal(data.streak,2);assert.equal(data.quizCount,1);assert.equal(data.quizTotal,0);assert.equal(data.industries[0].sampleCount,2);assert.equal(data.weekly[0].count,2);
});
test('company route shows all dated records and a new draft never reuses an old id',()=>{
 assert.equal(selectLearningRoute({kind:'company',id:'005930.KS'},{sessions:[session]},{companies:[company]}).sessions.length,1);
 const draft=makeLearningDraft({lesson:{date:'2026-11-03',companies:[company]},company});assert.equal(draft.id,undefined);assert.equal(draft.lessonDate,'2026-11-03');
 assert.equal(validateLearningDraft(draft,false),null);assert.match(validateLearningDraft(draft,true),/성장/);
 draft.insight={growth:'수요',risk:'경쟁',metrics:'점유율'};assert.equal(validateLearningDraft(draft,true),null);
});
test('manual import previews external provenance and rejects unsupported formats and private credentials',()=>{
 const payload={format:'chartview-learning-result',schemaVersion:1,session:{lessonDate:'2026-11-02',notes:{business:'칩'},insight:{growth:'성장',risk:'위험',metrics:'지표'}},externalAssessment:{score:85,notes:'ChatGPT 수동 결과'}};
 const preview=previewLearningImport(JSON.stringify(payload));assert.equal(preview.error,null);assert.equal(preview.externalScore,85);assert.equal(preview.nativeEvaluation,false);
 assert.ok(previewLearningImport(JSON.stringify({...payload,token:'private-token'})).error);
 assert.ok(previewLearningImport('{bad').error);assert.ok(previewLearningImport('{}').error);
});
test('revision comparisons preserve original claims and context only contains allowlisted public identity',()=>{
 assert.deepEqual(compareLearningRevision({notes:{business:'과거'},insight:{risk:'경쟁'}},{notes:{business:'현재'},insight:{risk:'경쟁'}}),[{field:'business',before:'과거',after:'현재'}]);
 assert.deepEqual(safeLearningContext({kind:'stock',symbol:'NVDA',reason:'후보 확인',privateNotes:'비밀',token:'x'}),{kind:'stock',symbol:'NVDA',reason:'후보 확인'});
});
test('restored or external attempts cannot create native evaluation or inflate cumulative native scores',()=>{
 const imported={sessionId:'a',sessionRevision:2,score:100,provenance:'imported',submittedAt:'2026-11-03T01:00:00Z'};
 assert.equal(learningStatus(session,[imported]),'completed');
 const native={sessionId:'a',sessionRevision:2,score:0,submittedAt:'2026-11-03T01:00:00Z'};
 const data=learningDashboard({curriculum,sessions:[session],attempts:[imported,native,{...native,score:50,submittedAt:'2026-11-04T01:00:00Z'}]},'2026-11-04');
 assert.equal(data.quizCount,2);assert.equal(data.quizTotal,50);assert.equal(data.quizAverage,25);assert.equal(data.importedAttemptCount,1);assert.equal(data.weekly[0].quizAverage,25);assert.equal(data.monthly[0].quizTotal,50);assert.equal(data.industries[0].score,25);
});
test('actual KST completion day drives progress even when a future lesson was studied early',()=>{
 const future={...session,lessonDate:'2099-01-05',completedAt:'2026-11-01T15:10:00Z',updatedAt:'2026-11-01T15:10:00Z'};
 const data=learningDashboard({curriculum,sessions:[future],attempts:[]},'2026-11-02');assert.equal(data.streak,1);assert.equal(data.completedDays,1);assert.equal(data.weekly[0].date,'2026-11-02');assert.equal(data.monthly[0].date,'2026-11');
 const missingFuture={...future,completedAt:null,provenance:'imported'};const fallback=learningDashboard({curriculum,sessions:[missingFuture],attempts:[]},'2026-11-02');assert.equal(fallback.streak,0);assert.equal(fallback.completedDays,0);
});
test('manual import limit is measured in UTF8 bytes and accepts backups larger than the old 5MB cap',()=>{
 const payload={format:'chartview-learning-result',schemaVersion:1,session:{lessonDate:'2026-11-02',notes:{business:'공부'}}};const text=JSON.stringify(payload);assert.ok(previewLearningImport(text,{maxBytes:new TextEncoder().encode(text).length-1}).error);
 const large=JSON.stringify({...payload,session:{...payload.session,notes:{business:'a'.repeat(5_000_001)}}});assert.equal(previewLearningImport(large).error,null);
});
test('industry evidence and review counts are actual records with separately named outcomes',()=>{
 const data=learningDashboard({curriculum,sessions:[session],attempts:[],reviews:[{sessionId:'a',score:0},{sessionId:'a',score:100,provenance:'imported'}],validations:[{sessionId:'a',outcome:'supported'},{sessionId:'a',outcome:'contradicted'},{sessionId:'a',outcome:'inconclusive'}]},'2026-11-02');assert.equal(data.industries[0].reviewCount,1);assert.deepEqual(data.industries[0].validationOutcomes,{supported:1,contradicted:1,inconclusive:1});assert.deepEqual(data.validationOutcomes,{supported:1,contradicted:1,inconclusive:1});
});
test('each company/date editor retains its pinned lesson and draft across route visits',async()=>{
 const {learningEditorKey,rememberLearningEditor,restoreLearningEditor}=await import('../src/learningModel.js');
 const ui={},draft=makeLearningDraft({lesson:{date:'2026-11-02',title:'사업'},company});draft.notes.business='아직 저장하지 못한 가정';
 const key=learningEditorKey(draft);rememberLearningEditor(ui,'dashboard',{key,draft,lesson:{id:'lesson-a',date:draft.lessonDate},sessionId:null});
 const other=makeLearningDraft({lesson:{date:'2026-11-03'},company});rememberLearningEditor(ui,'company:'+company.symbol,{key:learningEditorKey(other),draft:other,lesson:{id:'lesson-b'},sessionId:null});
 assert.equal(restoreLearningEditor(ui,'dashboard').draft.notes.business,'아직 저장하지 못한 가정');assert.equal(restoreLearningEditor(ui,'dashboard').lesson.id,'lesson-a');assert.notEqual(learningEditorKey(draft),learningEditorKey(other));
 assert.equal(learningEditorKey({...draft,id:'saved'}),'session:saved');
});
test('an uncertain receipt is replayed before an edited create can become a new mutation',async()=>{
 const {learningMutationDecision}=await import('../src/learningModel.js');
 const pending={fingerprint:'original',uncertain:true,requestId:'same-receipt'};
 assert.equal(learningMutationDecision(pending,'edited'),'resolve');assert.equal(learningMutationDecision(pending,'original'),'reuse');assert.equal(learningMutationDecision(null,'original'),'new');assert.equal(learningMutationDecision({...pending,uncertain:false},'edited'),'new');
});
