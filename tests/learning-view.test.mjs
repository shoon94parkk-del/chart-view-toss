import {test} from 'node:test';
import assert from 'node:assert/strict';
import {learningDashboardMarkup, learningEditorMarkup, learningHistoryMarkup, learningImportMarkup, learningTrendMarkup} from '../src/learningView.js';
import {makeLearningDraft,previewLearningImport} from '../src/learningModel.js';
const company={symbol:'005930.KS',name:'삼성전자',industry:'반도체'};
const lesson={id:'lesson',date:'2026-11-02',title:'삼성전자 공부',companies:[company],sections:[{title:'사업',minutes:5,body:'<script>alert(1)</script>',prompts:['무엇을 파나요?']}],sources:[{title:'공식',url:'https://example.com/ir'},{title:'위험',url:'javascript:alert(1)'}],questions:[{id:'q1',prompt:'사업 구조?',options:['칩','식품']}],judgmentPrompt:'성장 근거를 적으세요.'};
test('dashboard renders empty metrics honestly and a scheduled lesson with date',()=>{
 const html=learningDashboardMarkup({curriculum:{startDate:'2026-11-02',weeks:[{industry:'반도체',companies:[company,company,company]}]},sessions:[],attempts:[]},{companies:[company]},'2026-11-01');
 assert.match(html,/2026-11-02/);assert.match(html,/0일/);assert.match(html,/이해도 미기록/);assert.doesNotMatch(html,/100점/);assert.match(html,/#learning\/company\/005930.KS/);
});
test('real editor exposes all note fields and self-report while keeping assessment distinct',()=>{
 const html=learningEditorMarkup({lesson,draft:makeLearningDraft({lesson,company}),session:null,workspace:{attempts:[]}});
 for(const field of ['business','customers','financials','growthDrivers','macro','newFacts','unknowns','judgment','indicators'])assert.match(html,new RegExp('name="notes.'+field+'"'));
 assert.match(html,/name="insight.growth"/);assert.match(html,/data-learning-save="draft"/);assert.match(html,/data-learning-save="complete"/);assert.match(html,/직접 입력/);assert.doesNotMatch(html,/<script>/);assert.doesNotMatch(html,/href="javascript:/);assert.doesNotMatch(html,/data-learning-quiz/);
});
test('completed study offers an actual quiz submit with all questions and separately labelled self rubric',()=>{
 const session={id:'s',status:'completed',revision:1,completedAt:'2026-11-02',lesson};
 const html=learningEditorMarkup({lesson,draft:makeLearningDraft({session}),session,workspace:{attempts:[]}});
 assert.match(html,/name="answer.q1"/);assert.match(html,/name="rubric.evidence"/);assert.match(html,/자기평가/);assert.match(html,/data-learning-quiz/);
});
test('history renders append-only actual attempts, revision comparison and evidence form',()=>{
 const session={id:'s',revision:2,notes:{business:'현재 주장'},insight:{risk:'위험'}};
 const workspace={attempts:[{sessionId:'s',sessionRevision:1,score:0,submittedAt:'2026-11-02',dimensions:{business:0,inference:0},wrongAnswers:[{prompt:'사업?',chosen:'식품',expected:'칩',explanation:'매출 구조',concept:'사업 구조'}],judgment:{answer:'근거',assessment:'self',score:50,rubric:{evidence:2,logic:2,indicators:2}}}],revisions:[{sessionId:'s',revision:1,session:{notes:{business:'과거 주장'}}}],reviews:[],validations:[]};
 const html=learningHistoryMarkup(session,workspace);assert.match(html,/0점/);assert.match(html,/과거 주장/);assert.match(html,/현재 주장/);assert.match(html,/매출 구조/);assert.match(html,/name="evidenceUrl"/);assert.match(html,/name="revision"/);assert.match(html,/자기평가/);
});
test('manual import shows explicit external assessment and requires confirmation',()=>{
 const preview=previewLearningImport(JSON.stringify({format:'chartview-learning-result',schemaVersion:1,session:{lessonDate:'2026-11-02'},externalAssessment:{score:85}}));
 const html=learningImportMarkup(preview);assert.match(html,/외부 점수 85/);assert.match(html,/기본 퀴즈/);assert.match(html,/data-learning-import-confirm/);assert.doesNotMatch(html,/퀴즈 제출 완료/);
});
test('an existing scheduled study resumes its saved session instead of creating another record',()=>{
 const html=learningDashboardMarkup({curriculum:{startDate:'2026-11-02',weeks:[{industry:'반도체',companies:[company,company,company]}]},sessions:[{id:'saved-id',lessonDate:'2026-11-02',lesson:{kind:'company'},symbols:[company.symbol],company,status:'completed',revision:1,completedAt:'2026-11-02'}],attempts:[]},{companies:[company]},'2026-11-02');assert.match(html,/href="#learning\/session\/saved-id"[^>]*>공부 이어서 보기/);assert.match(html,/공부 완료/);
});
test('official evidence uses the existing native external navigation control',()=>{
 const html=learningEditorMarkup({lesson,draft:makeLearningDraft({lesson,company}),session:null,workspace:{attempts:[]}});assert.match(html,/<button[^>]*data-external-url="https:\/\/example.com\/ir"/);assert.doesNotMatch(html,/target="_blank"/);
});

test('weekly SVG displays real zero and leaves missing quiz weeks as gaps',()=>{
 const html=learningTrendMarkup([{date:'2026-11-02',quizAverage:0,quizCount:1},{date:'2026-11-09',quizAverage:null,quizCount:0},{date:'2026-11-16',quizAverage:100,quizCount:2}]);assert.match(html,/<svg[^>]*role="img"/);assert.match(html,/2026-11-02.*0점/);assert.match(html,/cy="64"/);assert.equal((html.match(/<circle /g)||[]).length,2);assert.doesNotMatch(html,/<path[^>]*L/);assert.doesNotMatch(learningTrendMarkup([]),/<svg/);
});
