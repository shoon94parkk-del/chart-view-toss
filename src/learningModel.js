// Learning records come only from the private service; no market/research stores are read here.
export const NOTE_FIELDS = [['business','사업·제품과 수익 구조'],['customers','고객·경쟁사'],['financials','매출·이익·마진과 출처 기간'],['growthDrivers','성장 동력·위험'],['macro','금리·환율·경기 민감도'],['newFacts','새로 알게 된 사실'],['unknowns','아직 모르는 개념'],['judgment','투자 판단과 근거'],['indicators','다음에 확인할 지표']];
export const INSIGHT_FIELDS = [['growth','성장하는 이유'],['risk','가장 큰 위험'],['metrics','반드시 확인할 지표']];
export const STATUS_LABELS = {not_started:'시작 전',in_progress:'작성 중',completed:'공부 완료',evaluated:'퀴즈 제출 완료'};
const list = value => Array.isArray(value) ? value : [];
export const LEARNING_IMPORT_MAX_BYTES = 160 * 1024 * 1024;
const real = value => typeof value === 'number' && Number.isFinite(value);
export function kstDate(value = new Date()) {
 const date = new Date(value); if (!Number.isFinite(date.getTime())) return '';
 return new Date(date.getTime()+9*3600000).toISOString().slice(0,10);
}
export function dateShift(date, count) { const value=new Date(date+'T00:00:00Z');value.setUTCDate(value.getUTCDate()+count);return value.toISOString().slice(0,10); }
export function validLearningDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value||'') && Number.isFinite(Date.parse(value+'T00:00:00Z')) && new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value; }
export function learningSchedule(curriculum) {
 if(!validLearningDate(curriculum?.startDate)) return [];
 return list(curriculum.weeks).flatMap((week,index)=>['company','company','company','value_chain','comparison','scenario','review'].map((kind,day)=>({date:dateShift(curriculum.startDate,index*7+day),kind,week:index+1,industry:week.industry,company:day<3?week.companies?.[day]:null,companies:list(week.companies),title:day<3?week.companies?.[day]?.name||'기업 공부':{value_chain:'산업 가치사슬',comparison:'기업 비교',scenario:'거시 시나리오',review:'주간 복습'}[kind]})));
}
export const nativeLearningAttempt = attempt => !!attempt && real(attempt.score) && !attempt.imported && !attempt.importedAt && (!attempt.provenance||attempt.provenance==='native') && attempt.assessment!=='external';
export function learningStatus(session,attempts=[]) {
 if(!session)return 'not_started'; if(session.status==='in_progress')return 'in_progress';
 if(list(attempts).some(a=>a.sessionId===session.id&&a.sessionRevision===session.revision&&nativeLearningAttempt(a)))return 'evaluated';
 return session.completedAt||['completed','evaluated'].includes(session.status)?'completed':'in_progress';
}
export function learningDashboard(workspace={},today=kstDate()) {
 const sessions=list(workspace.sessions),attempts=list(workspace.attempts),nativeAttempts=attempts.filter(nativeLearningAttempt),completed=sessions.filter(s=>learningStatus(s,attempts)!=='in_progress');
 const completionDate=s=>{const date=s.completedAt?kstDate(s.completedAt):s.provenance==='imported'&&validLearningDate(s.lessonDate)?s.lessonDate:null;return date&&date<=today?date:null;};
 const datedCompleted=completed.filter(s=>completionDate(s)),days=[...new Set([...datedCompleted.map(completionDate),...nativeAttempts.map(a=>a.submittedAt?kstDate(a.submittedAt):'').filter(date=>date&&date<=today)])].sort(),schedule=learningSchedule(workspace.curriculum),todayLesson=schedule.find(d=>d.date===today)||schedule.find(d=>d.date>today)||null;
 let cursor=days.includes(today)?today:dateShift(today,-1),streak=0;while(days.includes(cursor)){streak++;cursor=dateShift(cursor,-1);}
 const understood=datedCompleted.map(s=>s.understanding).filter(real),groups=new Map(),weeks=new Map(),months=new Map(),scoresBySession=new Map(),reviewsBySession=new Map(),validationsBySession=new Map(),validationOutcomes={supported:0,contradicted:0,inconclusive:0};
 for(const attempt of nativeAttempts){const values=scoresBySession.get(attempt.sessionId)||[];values.push(attempt.score);scoresBySession.set(attempt.sessionId,values);}
 for(const review of list(workspace.reviews).filter(nativeLearningAttempt))reviewsBySession.set(review.sessionId,(reviewsBySession.get(review.sessionId)||0)+1);
 for(const validation of list(workspace.validations)){if(!(validation.outcome in validationOutcomes))continue;validationOutcomes[validation.outcome]++;const outcomes=validationsBySession.get(validation.sessionId)||{supported:0,contradicted:0,inconclusive:0};outcomes[validation.outcome]++;validationsBySession.set(validation.sessionId,outcomes);}
 for(const s of datedCompleted){
  const group=groups.get(s.industry)||{industry:s.industry||'기타',sampleCount:0,values:[],quizzes:[],reviewCount:0,validationOutcomes:{supported:0,contradicted:0,inconclusive:0}};group.sampleCount++;if(real(s.understanding))group.values.push(s.understanding);group.quizzes.push(...(scoresBySession.get(s.id)||[]));group.reviewCount+=reviewsBySession.get(s.id)||0;for(const outcome of Object.keys(group.validationOutcomes))group.validationOutcomes[outcome]+=validationsBySession.get(s.id)?.[outcome]||0;groups.set(s.industry,group);
  const completedDate=completionDate(s),date=new Date(completedDate+'T00:00:00Z'),weekday=(date.getUTCDay()+6)%7,key=dateShift(completedDate,-weekday),month=completedDate.slice(0,7);
  weeks.set(key,(weeks.get(key)||0)+1);months.set(month,(months.get(month)||0)+1);
 }
 const average=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
 const trend=(map,monthly=false)=>{for(const attempt of nativeAttempts){const date=attempt.submittedAt?kstDate(attempt.submittedAt):'';if(!date)continue;const key=monthly?date.slice(0,7):dateShift(date,-((new Date(date+'T00:00:00Z').getUTCDay()+6)%7));if(!map.has(key))map.set(key,0);}return [...map].sort().map(([date,count])=>{const scores=nativeAttempts.filter(a=>{const at=a.submittedAt?kstDate(a.submittedAt):'';return at&&(monthly?at.slice(0,7)===date:at>=date&&at<=dateShift(date,6));}).map(a=>a.score);return {date,count,quizCount:scores.length,quizTotal:scores.reduce((a,b)=>a+b,0),quizAverage:average(scores)};});};
 return {validationOutcomes,today:todayLesson,completedDays:days.length,streak,companyCount:new Set(datedCompleted.flatMap(s=>list(s.symbols))).size,quizCount:nativeAttempts.length,quizTotal:nativeAttempts.reduce((total,a)=>total+a.score,0),quizAverage:average(nativeAttempts.map(a=>a.score)),importedAttemptCount:attempts.length-nativeAttempts.length,averageUnderstanding:average(understood),recent:[...sessions].sort((a,b)=>(b.updatedAt||b.lessonDate).localeCompare(a.updatedAt||a.lessonDate)).slice(0,6),due:sessions.filter(s=>s.nextReviewDate&&s.nextReviewDate<=today).sort((a,b)=>a.nextReviewDate.localeCompare(b.nextReviewDate)),wrong:attempts.filter(a=>list(a.wrongAnswers).length),industries:[...groups.values()].map(g=>({industry:g.industry,sampleCount:g.sampleCount,understanding:average(g.values),score:average(g.quizzes),quizCount:g.quizzes.length,reviewCount:g.reviewCount,validationOutcomes:g.validationOutcomes})),weekly:trend(weeks),monthly:trend(months,true),schedule};
}
export function selectLearningRoute(route={},workspace={},catalog={}) {
 if(route.kind==='session')return {kind:'session',session:list(workspace.sessions).find(s=>s.id===route.id)||null};
 if(route.kind==='company')return {kind:'company',company:list(catalog.companies).find(c=>c.symbol===route.id)||list(workspace.sessions).find(s=>s.company?.symbol===route.id)?.company||null,sessions:list(workspace.sessions).filter(s=>list(s.symbols).includes(route.id)).sort((a,b)=>b.lessonDate.localeCompare(a.lessonDate))};
 return {kind:'dashboard'};
}
export function safeLearningContext(value) { if(!value||typeof value!=='object')return null;return Object.fromEntries(['kind','symbol','name','date','key','reason'].filter(k=>typeof value[k]==='string').map(k=>[k,value[k].slice(0,500)])); }
export function makeLearningDraft({session,lesson,company,sourceContext}={}) {
 if(session)return {id:session.id,lessonDate:session.lessonDate,company:session.company||undefined,topic:session.topic||'',notes:Object.fromEntries(NOTE_FIELDS.map(([key])=>[key,session.notes?.[key]||''])),insight:Object.fromEntries(INSIGHT_FIELDS.map(([key])=>[key,session.insight?.[key]||''])),understanding:session.understanding??null,minutes:session.minutes??25,sourceContext:safeLearningContext(session.sourceContext)};
 return {lessonDate:lesson?.date||kstDate(),company:company||undefined,topic:lesson?.title||'',notes:Object.fromEntries(NOTE_FIELDS.map(([key])=>[key,''])),insight:{growth:'',risk:'',metrics:''},understanding:null,minutes:25,sourceContext:safeLearningContext(sourceContext)};
}
export function validateLearningDraft(draft,complete) {
 if(!validLearningDate(draft?.lessonDate))return '올바른 공부 날짜를 선택해 주세요.';
 if(complete)for(const [key,title] of INSIGHT_FIELDS)if(!draft.insight?.[key]?.trim())return title+'를 적어야 공부를 완료할 수 있어요.';
 for(const [key,title] of NOTE_FIELDS)if(typeof draft.notes?.[key]!=='string'||draft.notes[key].length>20000)return title+'는 20,000자 이내로 적어 주세요.';
 if(draft.understanding!==null&&(!real(draft.understanding)||draft.understanding<0||draft.understanding>100))return '이해도는 비워 두거나 0~100으로 적어 주세요.';
 if(!Number.isInteger(draft.minutes)||draft.minutes<0||draft.minutes>240)return '공부 시간은 0~240분으로 적어 주세요.';
 return null;
}
export function safeLearningUrl(value) { try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!/[?&](?:token|key|secret|password|authorization)=/i.test(url.search)?url.href:null;}catch{return null;} }
export function compareLearningRevision(previous,current) {
 const before=previous?.session||previous||{},after=current?.session||current||{};
 return [...NOTE_FIELDS,...INSIGHT_FIELDS].filter(([key])=>(before.notes?.[key]??before.insight?.[key]??'')!==(after.notes?.[key]??after.insight?.[key]??'')).map(([field])=>({field,before:before.notes?.[field]??before.insight?.[field]??'',after:after.notes?.[field]??after.insight?.[field]??''}));
}
export function previewLearningImport(text,{maxBytes=LEARNING_IMPORT_MAX_BYTES}={}) {
 try {
  if(typeof text!=='string'||new TextEncoder().encode(text).length>maxBytes)throw Error('JSON은 UTF-8 기준 160MiB 이내로 가져와 주세요.');
  const payload=JSON.parse(text);if(!payload||payload.schemaVersion!==1||!['chartview-learning-backup','chartview-learning-result'].includes(payload.format))throw Error('지원하는 schemaVersion 1 공부 결과 또는 백업 JSON이 아니에요.');
  const inspect=value=>{if(!value||typeof value!=='object')return;for(const [key,entry]of Object.entries(value)){if(/^(?:token|recoveryKey|authorization|password|secret|accessToken)$/i.test(key))throw Error('인증 정보가 포함된 JSON은 가져올 수 없어요.');inspect(entry);}};inspect(payload);
  if(payload.format==='chartview-learning-result'&&(!payload.session||!validLearningDate(payload.session.lessonDate)))throw Error('결과에 올바른 session.lessonDate가 필요해요.');
  if(payload.format==='chartview-learning-backup'&&(!payload.workspace||!Array.isArray(payload.workspace.sessions)))throw Error('백업 workspace.sessions가 필요해요.');
  const external=payload.externalAssessment;if(external?.score!=null&&(!real(external.score)||external.score<0||external.score>100))throw Error('외부 점수는 0~100이어야 해요.');
  return {error:null,payload,format:payload.format,count:payload.format==='chartview-learning-backup'?payload.workspace.sessions.length:1,externalScore:external?.score??null,nativeEvaluation:false};
 } catch(error){return {error:error instanceof SyntaxError?'JSON 형식을 확인해 주세요.':error.message,payload:null};}
}
export function validateLearningCurriculum(value) {
 if(!value||typeof value.title!=='string'||!validLearningDate(value.startDate)||new Date(value.startDate+'T00:00:00Z').getUTCDay()!==1)return '제목과 월요일 시작 날짜가 필요해요.';
 if(!Array.isArray(value.weeks)||!value.weeks.length||value.weeks.length>104)return '주차는 1~104개로 설정해 주세요.';
 if(value.weeks.some(w=>!w.id||!w.industry||!Array.isArray(w.companies)||w.companies.length!==3||w.companies.some(c=>!c.symbol||!c.name||!c.industry)))return '각 주차에는 id, 산업과 기업 3개의 symbol·name·industry가 필요해요.';
 return null;
}
// Editor state stays in memory under the current cloud account + device storage context.
export function learningEditorKey(draft) { return draft?.id?'session:'+draft.id:'new:'+draft?.lessonDate+':'+(draft?.company?.symbol||'curriculum'); }
export function rememberLearningEditor(ui,routeKey,entry) {
 ui.editors||={};ui.activeEditors||={};ui.editors[entry.key]=entry;ui.activeEditors[routeKey]=entry.key;return entry;
}
export function restoreLearningEditor(ui,routeKey,sessionId) { const key=sessionId?'session:'+sessionId:ui.activeEditors?.[routeKey];return key?ui.editors?.[key]||null:null; }
export function learningMutationDecision(pending,fingerprint) { return !pending?'new':pending.fingerprint===fingerprint?'reuse':pending.uncertain?'resolve':'new'; }
