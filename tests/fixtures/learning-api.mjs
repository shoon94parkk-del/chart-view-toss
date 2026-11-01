import assert from 'node:assert/strict';
import { payloadFor } from '../e2e/data.mjs';

// Public lesson/catalog snapshot is captured from learning_content.py. Private
// grading metadata remains in this test-only helper and never enters GET JSON.
export const learningNow = '2026-11-02T06:30:00Z';
export const learningSessionKey = 'chartview-toss-learning-session-v1';
const clone = value => structuredClone(value);
const uuid = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noteKeys = ['business','customers','financials','growthDrivers','macro','newFacts','unknowns','judgment','indicators'];
const insightKeys = ['growth','risk','metrics'];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const keys = (value, required, optional=[]) => {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value));
  for (const key of required) assert.ok(Object.hasOwn(value,key), `Missing ${key}`);
  assert.deepEqual(Object.keys(value).filter(key=>!required.includes(key)&&!optional.includes(key)), [], 'Unexpected mutation fields');
};
const dateShift = (date, days) => new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);

export function blankLearningNotes() { return Object.fromEntries(noteKeys.map(key=>[key,''])); }
export function emptyLearningWorkspace() {
  return {schemaVersion:1,version:0,curriculum:clone(learningCatalog.curriculum),sessions:[],attempts:[],reviews:[],validations:[],revisions:[],imports:[]};
}
export const completeInsights = {growth:'해외 고객의 재구매와 유통망 확대를 확인한다.',risk:'고객 획득 비용 증가와 재고 누적이 수익성을 낮출 수 있다.',metrics:'분기 해외 매출, 재고 회전율과 영업이익률'};
export function externalLearningResult() {
  return {format:'chartview-learning-result',schemaVersion:1,session:{lessonDate:'2026-11-03',company:clone(learningCatalog.companies[1]),topic:'외부 공부 결과',notes:{...blankLearningNotes(),business:'ODM 고객의 신규 주문과 제품별 수익성 확인'},insight:clone(completeInsights),understanding:0,minutes:25},externalAssessment:{score:88,notes:'대화에서 작성한 외부 자기점검'}};
}

export function createLearningApi({configured=true, workspace=emptyLearningWorkspace()}={}) {
  let document=clone(workspace), serial=100;
  const tokens=new Map(), accounts=new Map(), workspaces=new Map(), requests=new Map(), calls=[], mutations=[];
  const account={accountId:uuid(1),token:'T'.repeat(43),recoveryKey:'R'.repeat(43),expiresAt:'2027-11-02T06:30:00Z'};
  tokens.set(account.token,account.accountId); accounts.set(account.recoveryKey,account);workspaces.set(account.accountId,document);
  let failSave=0, conflictSave=false,committedSaveFailure=0;
  const sessionCredentials = ({accountId,token,expiresAt}) => ({accountId,token,expiresAt});
  const lessonFor = (date, symbol, identity) => {
    if(!symbol&&date==='2026-11-02')return clone(learningLesson);
    if(!symbol&&(date<'2026-11-02'||date>'2026-12-13'))return null;
    const lesson=learningAdditionalLessons[date+':'+symbol];
    assert.ok(lesson, `Fixture needs explicit captured lesson ${date}:${symbol||'scheduled'}`);
    if(identity)assert.deepEqual(lesson.companies[0],identity);
    return clone(lesson);
  };
  const validateEditable = value => {
    keys(value,['lessonDate','notes','insight','understanding','minutes'],['id','company','topic','sourceContext']);
    assert.match(value.lessonDate,datePattern); keys(value.notes,noteKeys); keys(value.insight,insightKeys);
    for(const text of [...Object.values(value.notes),...Object.values(value.insight)])assert.equal(typeof text,'string');
    assert.ok(value.understanding===null||(typeof value.understanding==='number'&&value.understanding>=0&&value.understanding<=100));
    assert.ok(Number.isInteger(value.minutes)&&value.minutes>=0&&value.minutes<=240);
    if(value.id)assert.match(value.id,uuidPattern);
    if(value.company)keys(value.company,['symbol','name','industry']);
    if(value.sourceContext)keys(value.sourceContext,[],['kind','symbol','name','date','key','reason']);
  };
  const save = (value, complete, imported=false, document=workspaces.get(account.accountId)) => {
    validateEditable(value);
    const existing=value.id?document.sessions.find(row=>row.id===value.id):null;
    if(value.id)assert.ok(existing,'Saved session belongs to account');
    const completed=complete||!!existing?.completedAt;
    if(completed)for(const key of insightKeys)assert.ok(value.insight[key].trim(),`Completion requires ${key}`);
    const lesson=existing?.lesson||lessonFor(value.lessonDate,value.company?.symbol,value.company);
    assert.ok(lesson,'Scheduled or explicit company lesson required');
    const id=existing?.id||uuid(++serial);
    const row={...clone(value),id,company:clone(value.company||null),lessonId:lesson.id,lesson:clone(lesson),symbols:lesson.companies.map(row=>row.symbol),industry:lesson.industry,topic:value.topic||lesson.title,status:completed?'completed':'in_progress',completedAt:completed?(existing?.completedAt||learningNow):null,createdAt:existing?.createdAt||learningNow,updatedAt:learningNow,revision:(existing?.revision||0)+1,nextReviewDate:existing?.nextReviewDate||null,sourceContext:clone(value.sourceContext||null),...(imported?{provenance:'imported'}:{})};
    if(existing)document.sessions[document.sessions.indexOf(existing)]=row;else document.sessions.push(row);
    document.revisions.push({id:uuid(++serial),sessionId:id,revision:row.revision,session:clone(row),createdAt:learningNow,...(imported?{provenance:'imported'}:{})});
    return id;
  };
  const grade = (sid,body,isReview,document=workspaces.get(account.accountId)) => {
    keys(body,['requestId','expectedVersion','answers','judgment']);
    const session=document.sessions.find(row=>row.id===sid);assert.ok(session?.completedAt,'Quiz requires completed notes');
    assert.equal(session.lesson.id,learningLesson.id,'Fixture needs explicit grading metadata for this lesson');
    keys(body.answers,learningAnswerKey.map(row=>row.id));keys(body.judgment,['answer','rubric']);keys(body.judgment.rubric,['evidence','logic','indicators']);
    assert.ok(body.judgment.answer.trim(),'Actual judgment reasoning required');
    for(const n of Object.values(body.judgment.rubric))assert.ok(Number.isInteger(n)&&n>=0&&n<=4);
    const wrongAnswers=[],dimensions={business:[],inference:[]};let correct=0;
    for(const q of learningAnswerKey) {
      const selected=body.answers[q.id];assert.ok(Number.isInteger(selected)&&selected>=0&&selected<q.options.length);
      const hit=selected===q.correctIndex;correct+=Number(hit);dimensions[q.dimension].push(Number(hit));
      if(!hit)wrongAnswers.push({questionId:q.id,prompt:q.prompt,chosen:selected,expected:q.correctIndex,explanation:q.explanation,concept:q.concept});
    }
    const score=Math.round(correct/learningAnswerKey.length*100),nextReviewDate=dateShift('2026-11-02',score<60?1:score<80?3:7);
    const attempt={id:uuid(++serial),sessionId:sid,sessionRevision:session.revision,submittedAt:learningNow,score,dimensions:Object.fromEntries(Object.entries(dimensions).map(([key,values])=>[key,Math.round(values.reduce((sum,n)=>sum+n,0)/values.length*100)])),answers:clone(body.answers),wrongAnswers,judgment:{...clone(body.judgment),score:Math.round(Object.values(body.judgment.rubric).reduce((sum,n)=>sum+n,0)/12*100),assessment:'self'},isReview};
    document.attempts.push(attempt);
    if(isReview)document.reviews.push({id:uuid(++serial),sessionId:sid,attemptId:attempt.id,date:'2026-11-02',score,nextReviewDate});
    Object.assign(session,{status:'evaluated',nextReviewDate,updatedAt:learningNow});return sid;
  };
  const fallback = async (route,url) => {
    const path=url.pathname.replace(/^\/backend/,'');
    if(path.startsWith('/api/published-data/'))return route.fulfill({status:503,json:{detail:'publication not configured in this test'}});
    if(/^\/static\/data\/guru_evidence\/[^/]+\/\d{6}\.(KS|KQ)\.json$/.test(path))return route.fulfill({status:404,json:{detail:'proof not published'}});
    return route.fulfill({json:payloadFor(url)});
  };
  const handle = async (route,url=new URL(route.request().url())) => {
    const path=url.pathname.replace(/^\/backend/,'');
    if(!path.startsWith('/api/learning/'))return fallback(route,url);
    const request=route.request(),method=request.method(),apiPath=path.slice('/api/learning'.length),body=request.postDataJSON();
    calls.push({path:apiPath,method,body:clone(body),authorization:request.headers().authorization||null});
    const fulfill=(json,status=200)=>route.fulfill({status,json:clone(json),headers:{'Cache-Control':'no-store'}});
    if(apiPath==='/status')return fulfill({configured,storage:configured?'postgres':null});
    if(apiPath==='/catalog')return fulfill(learningCatalog);
    if(!configured)return fulfill({detail:'permanent storage unavailable'},503);
    if(apiPath==='/accounts'&&method==='POST'){keys(body,[]);return fulfill(account);}
    if(apiPath==='/auth'&&method==='POST') {
      keys(body,['recoveryKey']);const found=accounts.get(body.recoveryKey);
      if(!found)return fulfill({detail:'invalid recovery key'},401);
      const result={...sessionCredentials(found),token:'N'.repeat(42)+(++serial%10)};tokens.set(result.token,result.accountId);return fulfill(result);
    }
    const token=(request.headers().authorization||'').replace(/^Bearer /,'');
    if(!tokens.has(token))return fulfill({detail:'login required'},401);
    const owner=tokens.get(token),activeWorkspace=workspaces.get(owner);
    if(apiPath==='/auth'&&method==='DELETE'){tokens.delete(token);return fulfill({ok:true});}
    if(apiPath==='/workspace'&&method==='GET')return fulfill(activeWorkspace);
    if(apiPath.startsWith('/lessons/')&&method==='GET') {const lesson=lessonFor(apiPath.split('/').at(-1),url.searchParams.get('symbol'));return lesson?fulfill(lesson):fulfill({detail:'no scheduled lesson'},404);}
    if(apiPath==='/export'&&method==='GET')return fulfill({format:'chartview-learning-backup',schemaVersion:1,exportedAt:learningNow,workspace:activeWorkspace});
    assert.ok(['POST','PUT'].includes(method),`Unexpected learning method ${method} ${apiPath}`);
    assert.match(body.requestId,uuidPattern,'Mutations require UUID requestId');assert.ok(Number.isInteger(body.expectedVersion));
    const fingerprint=JSON.stringify({path:apiPath,body}),old=requests.get(owner+body.requestId);
    if(old){assert.equal(old.fingerprint,fingerprint,'Idempotent request content must remain identical');return fulfill(old.result);}
    if(apiPath==='/sessions'&&conflictSave){conflictSave=false;activeWorkspace.version++;return fulfill({detail:'version conflict'},409);}
    if(body.expectedVersion!==activeWorkspace.version)return fulfill({detail:'version conflict'},409);
    if(apiPath==='/sessions'&&failSave){const status=failSave;failSave=0;return fulfill({detail:'temporary save failure'},status);}
    mutations.push({path:apiPath,body:clone(body)});
    let sessionId;
    if(apiPath==='/sessions') {keys(body,['requestId','expectedVersion','session','complete']);assert.equal(typeof body.complete,'boolean');sessionId=save(body.session,body.complete,false,activeWorkspace);}
    else if(/^\/sessions\/[^/]+\/(quiz|reviews)$/.test(apiPath))sessionId=grade(apiPath.split('/')[2],body,apiPath.endsWith('/reviews'),activeWorkspace);
    else if(apiPath.endsWith('/validations')) {
      keys(body,['requestId','expectedVersion','revision','assumption','observed','evidenceUrl','evidenceDate','outcome','currentJudgment'],['priceContext']);sessionId=apiPath.split('/')[2];
      assert.ok(activeWorkspace.revisions.some(row=>row.sessionId===sessionId&&row.revision===body.revision));assert.match(body.evidenceUrl,/^https:\/\//);assert.match(body.evidenceDate,datePattern);assert.ok(['supported','contradicted','inconclusive'].includes(body.outcome));
      const {requestId,expectedVersion,...validation}=body;activeWorkspace.validations.push({...clone(validation),id:uuid(++serial),sessionId,createdAt:learningNow});
    } else if(apiPath==='/import') {
      keys(body,['requestId','expectedVersion','payload']);assert.equal(body.payload.format,'chartview-learning-result');assert.equal(body.payload.schemaVersion,1);
      sessionId=save(body.payload.session,Object.values(body.payload.session.insight).every(value=>value.trim()),true,activeWorkspace);
      activeWorkspace.imports.push({id:uuid(++serial),format:body.payload.format,importedAt:learningNow,sessionIds:[sessionId],...(body.payload.externalAssessment?{externalAssessment:{...clone(body.payload.externalAssessment),assessment:'external'}}:{})});
    } else if(apiPath==='/curriculum'){keys(body,['requestId','expectedVersion','curriculum']);activeWorkspace.curriculum=clone(body.curriculum);}
    else assert.fail(`Unhandled learning fixture ${method} ${apiPath}`);
    activeWorkspace.version++;
    const result={workspace:clone(activeWorkspace),...(sessionId?{sessionId}:{})};requests.set(owner+body.requestId,{fingerprint,result:clone(result)});
    if(apiPath==='/sessions'&&committedSaveFailure){const status=committedSaveFailure;committedSaveFailure=0;return fulfill({detail:'committed but response unavailable'},status);}
    return fulfill(result);
  };
  return {account,calls,mutations,handle,addAccount(){const extra={accountId:uuid(++serial),token:'B'.repeat(42)+(serial%10),recoveryKey:'S'.repeat(42)+(serial%10),expiresAt:account.expiresAt};tokens.set(extra.token,extra.accountId);accounts.set(extra.recoveryKey,extra);workspaces.set(extra.accountId,emptyLearningWorkspace());return clone(extra);},get workspace(){return clone(document);},setFailSave(status=503){failSave=status;},commitNextSaveThenFail(status=503){committedSaveFailure=status;},conflictNextSave(){conflictSave=true;},install(qa){qa.overrides.set('*',handle);},async seedSession(context){await context.addInitScript(({key,value})=>{if(['http:','https:'].includes(location.protocol)&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(value));},{key:learningSessionKey,value:sessionCredentials(account)});},async installContext(context){await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.pathname.replace(/^\/backend/,'').startsWith('/api/')||url.pathname.startsWith('/static/data/'))return handle(route,url);return route.continue();});}};
}

// Captured 2026-11-01 from the shared backend default curriculum and lesson.
export const learningCatalog = {
  "schemaVersion": 1,
  "curriculum": {
    "id": "investment-learning-2026-11",
    "title": "6주 기업 공부 — 사업 구조에서 투자 판단까지",
    "startDate": "2026-11-02",
    "weeks": [
      {
        "id": "week-1",
        "industry": "화장품",
        "companies": [
          {
            "symbol": "278470.KS",
            "name": "에이피알",
            "industry": "화장품"
          },
          {
            "symbol": "192820.KS",
            "name": "코스맥스",
            "industry": "화장품"
          },
          {
            "symbol": "161890.KS",
            "name": "한국콜마",
            "industry": "화장품"
          }
        ]
      },
      {
        "id": "week-2",
        "industry": "K-푸드",
        "companies": [
          {
            "symbol": "003230.KS",
            "name": "삼양식품",
            "industry": "K-푸드"
          },
          {
            "symbol": "004370.KS",
            "name": "농심",
            "industry": "K-푸드"
          },
          {
            "symbol": "097950.KS",
            "name": "CJ제일제당",
            "industry": "K-푸드"
          }
        ]
      },
      {
        "id": "week-3",
        "industry": "조선·LNG",
        "companies": [
          {
            "symbol": "042660.KS",
            "name": "한화오션",
            "industry": "조선·LNG"
          },
          {
            "symbol": "010140.KS",
            "name": "삼성중공업",
            "industry": "조선·LNG"
          },
          {
            "symbol": "009540.KS",
            "name": "HD한국조선해양",
            "industry": "조선·LNG"
          }
        ]
      },
      {
        "id": "week-4",
        "industry": "방산",
        "companies": [
          {
            "symbol": "012450.KS",
            "name": "한화에어로스페이스",
            "industry": "방산"
          },
          {
            "symbol": "079550.KS",
            "name": "LIG넥스원",
            "industry": "방산"
          },
          {
            "symbol": "064350.KS",
            "name": "현대로템",
            "industry": "방산"
          }
        ]
      },
      {
        "id": "week-5",
        "industry": "원전",
        "companies": [
          {
            "symbol": "034020.KS",
            "name": "두산에너빌리티",
            "industry": "원전"
          },
          {
            "symbol": "000720.KS",
            "name": "현대건설",
            "industry": "원전"
          },
          {
            "symbol": "051600.KS",
            "name": "한전KPS",
            "industry": "원전"
          }
        ]
      },
      {
        "id": "week-6",
        "industry": "전력기기",
        "companies": [
          {
            "symbol": "267260.KS",
            "name": "HD현대일렉트릭",
            "industry": "전력기기"
          },
          {
            "symbol": "010120.KS",
            "name": "LS ELECTRIC",
            "industry": "전력기기"
          },
          {
            "symbol": "062040.KS",
            "name": "산일전기",
            "industry": "전력기기"
          }
        ]
      }
    ]
  },
  "companies": [
    {
      "symbol": "278470.KS",
      "name": "에이피알",
      "industry": "화장품"
    },
    {
      "symbol": "192820.KS",
      "name": "코스맥스",
      "industry": "화장품"
    },
    {
      "symbol": "161890.KS",
      "name": "한국콜마",
      "industry": "화장품"
    },
    {
      "symbol": "003230.KS",
      "name": "삼양식품",
      "industry": "K-푸드"
    },
    {
      "symbol": "004370.KS",
      "name": "농심",
      "industry": "K-푸드"
    },
    {
      "symbol": "097950.KS",
      "name": "CJ제일제당",
      "industry": "K-푸드"
    },
    {
      "symbol": "042660.KS",
      "name": "한화오션",
      "industry": "조선·LNG"
    },
    {
      "symbol": "010140.KS",
      "name": "삼성중공업",
      "industry": "조선·LNG"
    },
    {
      "symbol": "009540.KS",
      "name": "HD한국조선해양",
      "industry": "조선·LNG"
    },
    {
      "symbol": "012450.KS",
      "name": "한화에어로스페이스",
      "industry": "방산"
    },
    {
      "symbol": "079550.KS",
      "name": "LIG넥스원",
      "industry": "방산"
    },
    {
      "symbol": "064350.KS",
      "name": "현대로템",
      "industry": "방산"
    },
    {
      "symbol": "034020.KS",
      "name": "두산에너빌리티",
      "industry": "원전"
    },
    {
      "symbol": "000720.KS",
      "name": "현대건설",
      "industry": "원전"
    },
    {
      "symbol": "051600.KS",
      "name": "한전KPS",
      "industry": "원전"
    },
    {
      "symbol": "267260.KS",
      "name": "HD현대일렉트릭",
      "industry": "전력기기"
    },
    {
      "symbol": "010120.KS",
      "name": "LS ELECTRIC",
      "industry": "전력기기"
    },
    {
      "symbol": "062040.KS",
      "name": "산일전기",
      "industry": "전력기기"
    }
  ]
};
export const learningLesson = {
  "id": "lesson-85e3d71c2137dbadb5236e28",
  "date": "2026-11-02",
  "kind": "company",
  "title": "에이피알 — 사업 구조와 투자 가설",
  "industry": "화장품",
  "companies": [
    {
      "symbol": "278470.KS",
      "name": "에이피알",
      "industry": "화장품"
    }
  ],
  "duration": 25,
  "sections": [
    {
      "title": "사업 구조 기초 읽기",
      "minutes": 3,
      "body": "자체 화장품 브랜드와 홈 뷰티 디바이스를 소비자에게 판매하는 사업 구조입니다. 브랜드·제품 기획과 판매 채널 운영을 함께 살펴보세요.\n최종 소비자와 온라인·오프라인 유통 채널을 구분하고, 직접 판매와 유통사 판매의 매출 인식·비용 차이를 확인하세요.",
      "prompts": [
        "누가 어떤 제품·서비스의 대가를 지불하나요?",
        "고객 유형과 경쟁사는 무엇이며 확인된 거래 근거가 있나요?"
      ]
    },
    {
      "title": "공식 근거 확인",
      "minutes": 6,
      "body": "이 자료는 사업 구조를 읽기 위한 기초 안내이며 최신 실적·고객 계약·시장점유율을 검증한 자료가 아닙니다. 학습일 기준 공시된 가장 최근 사업·분기보고서와 IR 자료를 직접 열어 공시일, 대상 기간, 연결/별도, 통화·단위를 기록하세요. 아직 공시되지 않은 기간과 확인하지 못한 수치는 '미확인'으로 남기고, 결측치를 0으로 채우지 마세요.\n화장품과 뷰티 디바이스의 판매량·제품 구성, 해외 채널 확대, 광고비와 판매 수수료가 수익성의 주요 검토 항목입니다.",
      "prompts": [
        "자료의 기준일·공시일·대상 기간, 연결/별도, 통화·단위와 원문 URL을 적으세요.",
        "매출·영업이익·마진과 영업현금흐름을 같은 기준으로 확인했나요?"
      ]
    },
    {
      "title": "내 기록과 지표",
      "minutes": 6,
      "body": "유행 변화, 광고 효율 저하, 특정 제품·채널 집중, 디바이스 품질·규제와 반품 위험을 확인하세요.\n확인할 지표: 화장품/디바이스 및 지역별 매출, 판매관리비율, 광고비 대비 매출, 재고·반품 추이\n비교 관점: 자체 브랜드 업체와 비교하고, 코스맥스·한국콜마 같은 ODM 업체와는 고객과 비용 구조가 다름을 먼저 확인하세요.",
      "prompts": [
        "새로 알게 된 사실과 아직 모르는 개념을 구분해 적으세요.",
        "성장 이유·가장 큰 위험·필수 지표를 한 문장씩 적으세요."
      ]
    },
    {
      "title": "객관식으로 이해 확인",
      "minutes": 5,
      "body": "사업 구조와 거시 변수의 전달 경로를 묻는 객관식 네 문항에 답하세요. 정답·해설은 실제 제출 후 표시됩니다.",
      "prompts": [
        "각 선택에 사용한 사업 근거와 조건을 생각하세요."
      ]
    },
    {
      "title": "판단과 다음 확인",
      "minutes": 5,
      "body": "성장 이유·가장 큰 위험·반드시 확인할 지표를 근거와 함께 쓰고, 증거·논리·지표의 0~4점 자기평가를 따로 기록하세요. 주가 변화만으로 사업 판단의 정오를 판정하지 마세요.",
      "prompts": [
        "가설이 틀렸음을 보여줄 반증 지표와 다음 확인 날짜는?"
      ]
    }
  ],
  "sources": [
    {
      "title": "DART 전자공시 — 회사명·기간·정정공시 확인",
      "url": "https://dart.fss.or.kr/dsab001/main.do"
    },
    {
      "title": "에이피알 공식 사업·IR — 최신 공시와 대조",
      "url": "https://www.apr-in.com/"
    }
  ],
  "judgmentPrompt": "확인된 사업 근거와 자료 기준일·기간·원문 URL을 바탕으로 성장 이유, 가장 큰 위험, 반드시 확인할 지표를 쓰세요. 거시 조건이 매출·원가·현금에 전달되는 경로와 반증 조건을 설명하고, 미확인 사실을 표시하세요. 증거·논리·지표를 각각 0~4점으로 직접 평가하세요. 이는 자기평가이며 AI나 서버가 판단의 정답을 채점한 점수가 아닙니다.",
  "questions": [
    {
      "id": "business-structure",
      "dimension": "business",
      "prompt": "에이피알의 사업을 공시에서 검증할 때 적절한 출발점은?",
      "options": [
        "주가가 같은 방향으로 움직이는 기업은 모두 서로의 직접 고객이므로 거래 관계를 확정한다.",
        "자체 화장품 브랜드와 홈 뷰티 디바이스를 소비자에게 판매하는 사업 구조입니다. 브랜드·제품 기획과 판매 채널 운영을 함께 살펴보세요.",
        "이름에 같은 업종이 들어가면 제품·고객과 비용 구조도 같다고 본다.",
        "소비자에게 유명한 제품 하나의 인기가 연결 전체 매출과 이익을 모두 설명한다고 본다."
      ]
    },
    {
      "id": "business-economics",
      "dimension": "business",
      "prompt": "사업 성장을 이익의 질과 함께 확인할 자료 조합은?",
      "options": [
        "화장품/디바이스 및 지역별 매출, 판매관리비율, 광고비 대비 매출, 재고·반품 추이; 동일 기간·연결 범위의 매출·영업이익과 영업현금흐름을 함께 확인한다.",
        "주가 상승률만 비교하면 사업의 판매량·수익성과 현금 회수도 확인된다.",
        "수주·주문 또는 매출 총액만 늘면 비용·계약 조건 없이도 이익 증가를 확정한다.",
        "연결 연간 매출과 별도 분기 이익을 그대로 나누고 결측치는 0으로 채운다."
      ]
    },
    {
      "id": "inference-transmission",
      "dimension": "inference",
      "prompt": "해외 화장품 수요가 늘었지만 광고비·판매 수수료와 제조 원가도 상승했다고 가정합니다. 이는 학습용 조건이며 실제 발생한 사건이 아닙니다. 가장 타당한 해석은?",
      "options": [
        "브랜드는 채널별 매출·광고비·수수료, ODM은 주문·가동률·원가를 나누어 비교해야 이익 영향을 판단할 수 있습니다.",
        "업종 수요가 늘면 모든 기업의 영업이익은 즉시 같은 비율로 늘어난다.",
        "환율과 원가는 매출에 영향을 줄 수 있어도 이익·현금에는 영향을 주지 않는다.",
        "정책 발표나 주문 증가는 확정 매출·현금 수령과 같으므로 추가 자료는 필요 없다."
      ]
    },
    {
      "id": "inference-verification",
      "dimension": "inference",
      "prompt": "'업종 호재가 이 기업의 이익을 개선한다'는 가설을 검증하는 가장 적절한 방법은?",
      "options": [
        "다음 날 주가가 오르면 다른 사업 근거 없이 가설을 맞았다고 판정한다.",
        "좋은 기사만 모으고 반대 지표와 기존 가설의 작성 날짜는 제외한다.",
        "개선 경로와 반증 조건을 먼저 쓰고, 날짜·기간이 있는 공시의 사업별 지표·원가·현금으로 이후 결과를 대조한다.",
        "확인되지 않은 고객·수익 수치를 채워 넣어 분석의 빈칸을 없앤다."
      ]
    }
  ],
  "quizVersion": "learning-quiz-v1:98a084ef5aa2d080e72b5d8a275b05e1415097965115660f8ec864d7845e564c"
};
export const learningAnswerKey = [
  {
    "id": "business-structure",
    "dimension": "business",
    "prompt": "에이피알의 사업을 공시에서 검증할 때 적절한 출발점은?",
    "options": [
      "주가가 같은 방향으로 움직이는 기업은 모두 서로의 직접 고객이므로 거래 관계를 확정한다.",
      "자체 화장품 브랜드와 홈 뷰티 디바이스를 소비자에게 판매하는 사업 구조입니다. 브랜드·제품 기획과 판매 채널 운영을 함께 살펴보세요.",
      "이름에 같은 업종이 들어가면 제품·고객과 비용 구조도 같다고 본다.",
      "소비자에게 유명한 제품 하나의 인기가 연결 전체 매출과 이익을 모두 설명한다고 본다."
    ],
    "correctIndex": 1,
    "explanation": "자체 화장품 브랜드와 홈 뷰티 디바이스를 소비자에게 판매하는 사업 구조입니다. 브랜드·제품 기획과 판매 채널 운영을 함께 살펴보세요. 최신 사업 범위와 매출 구성은 원문 공시로 다시 확인해야 합니다.",
    "concept": "사업·고객·가치사슬의 구분"
  },
  {
    "id": "business-economics",
    "dimension": "business",
    "prompt": "사업 성장을 이익의 질과 함께 확인할 자료 조합은?",
    "options": [
      "화장품/디바이스 및 지역별 매출, 판매관리비율, 광고비 대비 매출, 재고·반품 추이; 동일 기간·연결 범위의 매출·영업이익과 영업현금흐름을 함께 확인한다.",
      "주가 상승률만 비교하면 사업의 판매량·수익성과 현금 회수도 확인된다.",
      "수주·주문 또는 매출 총액만 늘면 비용·계약 조건 없이도 이익 증가를 확정한다.",
      "연결 연간 매출과 별도 분기 이익을 그대로 나누고 결측치는 0으로 채운다."
    ],
    "correctIndex": 0,
    "explanation": "매출·이익·현금은 다릅니다. 기간, 연결/별도, 통화·단위를 맞추고 사업별 지표와 운전자본을 함께 봐야 합니다. 화장품과 뷰티 디바이스의 판매량·제품 구성, 해외 채널 확대, 광고비와 판매 수수료가 수익성의 주요 검토 항목입니다.",
    "concept": "비교 가능한 재무 기간·범위와 현금흐름"
  },
  {
    "id": "inference-transmission",
    "dimension": "inference",
    "prompt": "해외 화장품 수요가 늘었지만 광고비·판매 수수료와 제조 원가도 상승했다고 가정합니다. 이는 학습용 조건이며 실제 발생한 사건이 아닙니다. 가장 타당한 해석은?",
    "options": [
      "브랜드는 채널별 매출·광고비·수수료, ODM은 주문·가동률·원가를 나누어 비교해야 이익 영향을 판단할 수 있습니다.",
      "업종 수요가 늘면 모든 기업의 영업이익은 즉시 같은 비율로 늘어난다.",
      "환율과 원가는 매출에 영향을 줄 수 있어도 이익·현금에는 영향을 주지 않는다.",
      "정책 발표나 주문 증가는 확정 매출·현금 수령과 같으므로 추가 자료는 필요 없다."
    ],
    "correctIndex": 0,
    "explanation": "브랜드는 채널별 매출·광고비·수수료, ODM은 주문·가동률·원가를 나누어 비교해야 이익 영향을 판단할 수 있습니다. 거시 변수는 계약·제품·지역과 비용 구조를 거쳐 시차를 두고 전달되며 결과를 보장하지 않습니다.",
    "concept": "브랜드와 ODM의 수요 전달·비용 구조"
  },
  {
    "id": "inference-verification",
    "dimension": "inference",
    "prompt": "'업종 호재가 이 기업의 이익을 개선한다'는 가설을 검증하는 가장 적절한 방법은?",
    "options": [
      "다음 날 주가가 오르면 다른 사업 근거 없이 가설을 맞았다고 판정한다.",
      "좋은 기사만 모으고 반대 지표와 기존 가설의 작성 날짜는 제외한다.",
      "개선 경로와 반증 조건을 먼저 쓰고, 날짜·기간이 있는 공시의 사업별 지표·원가·현금으로 이후 결과를 대조한다.",
      "확인되지 않은 고객·수익 수치를 채워 넣어 분석의 빈칸을 없앤다."
    ],
    "correctIndex": 2,
    "explanation": "주가는 여러 요인의 결과입니다. 사업 가정과 관찰 결과의 기간·출처를 보존하고 지지·반박·판단 보류를 구분해야 합니다.",
    "concept": "사업 가설의 근거·반증·불확실성"
  }
];

// Company imports and custom stock studies retain their actual server lesson IDs/content.
const learningAdditionalLessons = {
  "2026-11-03:192820.KS": {
    "id": "lesson-1c31f8e18889fce360cd6af1",
    "date": "2026-11-03",
    "kind": "company",
    "title": "코스맥스 — 사업 구조와 투자 가설",
    "industry": "화장품",
    "companies": [
      {
        "symbol": "192820.KS",
        "name": "코스맥스",
        "industry": "화장품"
      }
    ],
    "duration": 25,
    "sections": [
      {
        "title": "사업 구조 기초 읽기",
        "minutes": 3,
        "body": "화장품 브랜드 고객에게 연구개발·제형 설계·생산을 제공하는 화장품 ODM 사업이 핵심입니다. 브랜드의 소비자 판매와 제조사의 납품 매출을 구분하세요.\n주요 고객 유형은 화장품 브랜드사입니다. 고객명·거래 비중이 공시되지 않으면 특정 브랜드와의 관계를 추정하지 마세요.",
        "prompts": [
          "누가 어떤 제품·서비스의 대가를 지불하나요?",
          "고객 유형과 경쟁사는 무엇이며 확인된 거래 근거가 있나요?"
        ]
      },
      {
        "title": "공식 근거 확인",
        "minutes": 6,
        "body": "이 자료는 사업 구조를 읽기 위한 기초 안내이며 최신 실적·고객 계약·시장점유율을 검증한 자료가 아닙니다. 학습일 기준 공시된 가장 최근 사업·분기보고서와 IR 자료를 직접 열어 공시일, 대상 기간, 연결/별도, 통화·단위를 기록하세요. 아직 공시되지 않은 기간과 확인하지 못한 수치는 '미확인'으로 남기고, 결측치를 0으로 채우지 마세요.\n고객의 주문량, 공장 가동률, 지역별 제품 구성과 원가·인건비가 ODM 수익성을 좌우할 수 있습니다.",
        "prompts": [
          "자료의 기준일·공시일·대상 기간, 연결/별도, 통화·단위와 원문 URL을 적으세요.",
          "매출·영업이익·마진과 영업현금흐름을 같은 기준으로 확인했나요?"
        ]
      },
      {
        "title": "내 기록과 지표",
        "minutes": 6,
        "body": "고객 주문 변동, 국가별 수요·규제, 공장 수율과 품질 문제, 신규 생산능력의 고정비 부담을 검토하세요.\n확인할 지표: 지역별 매출·영업이익, 생산능력·가동률, 원가율, 매출채권·재고 회전\n비교 관점: 한국콜마 등 ODM 업체와 같은 회계기간·사업 범위로 비교하고 에이피알의 브랜드 판매 구조와 구분하세요.",
        "prompts": [
          "새로 알게 된 사실과 아직 모르는 개념을 구분해 적으세요.",
          "성장 이유·가장 큰 위험·필수 지표를 한 문장씩 적으세요."
        ]
      },
      {
        "title": "객관식으로 이해 확인",
        "minutes": 5,
        "body": "사업 구조와 거시 변수의 전달 경로를 묻는 객관식 네 문항에 답하세요. 정답·해설은 실제 제출 후 표시됩니다.",
        "prompts": [
          "각 선택에 사용한 사업 근거와 조건을 생각하세요."
        ]
      },
      {
        "title": "판단과 다음 확인",
        "minutes": 5,
        "body": "성장 이유·가장 큰 위험·반드시 확인할 지표를 근거와 함께 쓰고, 증거·논리·지표의 0~4점 자기평가를 따로 기록하세요. 주가 변화만으로 사업 판단의 정오를 판정하지 마세요.",
        "prompts": [
          "가설이 틀렸음을 보여줄 반증 지표와 다음 확인 날짜는?"
        ]
      }
    ],
    "sources": [
      {
        "title": "DART 전자공시 — 회사명·기간·정정공시 확인",
        "url": "https://dart.fss.or.kr/dsab001/main.do"
      },
      {
        "title": "코스맥스 공식 사업·IR — 최신 공시와 대조",
        "url": "https://www.cosmax.com/"
      }
    ],
    "judgmentPrompt": "확인된 사업 근거와 자료 기준일·기간·원문 URL을 바탕으로 성장 이유, 가장 큰 위험, 반드시 확인할 지표를 쓰세요. 거시 조건이 매출·원가·현금에 전달되는 경로와 반증 조건을 설명하고, 미확인 사실을 표시하세요. 증거·논리·지표를 각각 0~4점으로 직접 평가하세요. 이는 자기평가이며 AI나 서버가 판단의 정답을 채점한 점수가 아닙니다.",
    "questions": [
      {
        "id": "business-structure",
        "dimension": "business",
        "prompt": "코스맥스의 사업을 공시에서 검증할 때 적절한 출발점은?",
        "options": [
          "주가가 같은 방향으로 움직이는 기업은 모두 서로의 직접 고객이므로 거래 관계를 확정한다.",
          "화장품 브랜드 고객에게 연구개발·제형 설계·생산을 제공하는 화장품 ODM 사업이 핵심입니다. 브랜드의 소비자 판매와 제조사의 납품 매출을 구분하세요.",
          "이름에 같은 업종이 들어가면 제품·고객과 비용 구조도 같다고 본다.",
          "소비자에게 유명한 제품 하나의 인기가 연결 전체 매출과 이익을 모두 설명한다고 본다."
        ]
      },
      {
        "id": "business-economics",
        "dimension": "business",
        "prompt": "사업 성장을 이익의 질과 함께 확인할 자료 조합은?",
        "options": [
          "주가 상승률만 비교하면 사업의 판매량·수익성과 현금 회수도 확인된다.",
          "지역별 매출·영업이익, 생산능력·가동률, 원가율, 매출채권·재고 회전; 동일 기간·연결 범위의 매출·영업이익과 영업현금흐름을 함께 확인한다.",
          "수주·주문 또는 매출 총액만 늘면 비용·계약 조건 없이도 이익 증가를 확정한다.",
          "연결 연간 매출과 별도 분기 이익을 그대로 나누고 결측치는 0으로 채운다."
        ]
      },
      {
        "id": "inference-transmission",
        "dimension": "inference",
        "prompt": "해외 화장품 수요가 늘었지만 광고비·판매 수수료와 제조 원가도 상승했다고 가정합니다. 이는 학습용 조건이며 실제 발생한 사건이 아닙니다. 가장 타당한 해석은?",
        "options": [
          "업종 수요가 늘면 모든 기업의 영업이익은 즉시 같은 비율로 늘어난다.",
          "브랜드는 채널별 매출·광고비·수수료, ODM은 주문·가동률·원가를 나누어 비교해야 이익 영향을 판단할 수 있습니다.",
          "환율과 원가는 매출에 영향을 줄 수 있어도 이익·현금에는 영향을 주지 않는다.",
          "정책 발표나 주문 증가는 확정 매출·현금 수령과 같으므로 추가 자료는 필요 없다."
        ]
      },
      {
        "id": "inference-verification",
        "dimension": "inference",
        "prompt": "'업종 호재가 이 기업의 이익을 개선한다'는 가설을 검증하는 가장 적절한 방법은?",
        "options": [
          "개선 경로와 반증 조건을 먼저 쓰고, 날짜·기간이 있는 공시의 사업별 지표·원가·현금으로 이후 결과를 대조한다.",
          "다음 날 주가가 오르면 다른 사업 근거 없이 가설을 맞았다고 판정한다.",
          "좋은 기사만 모으고 반대 지표와 기존 가설의 작성 날짜는 제외한다.",
          "확인되지 않은 고객·수익 수치를 채워 넣어 분석의 빈칸을 없앤다."
        ]
      }
    ],
    "quizVersion": "learning-quiz-v1:8814960ad4f04a0aa437cb348ba2edd8350d630e4c905d2801af17eb5094bee1"
  },
  "2026-11-02:005930.KS": {
    "id": "lesson-0486bd653f050e1e65dd4c77",
    "date": "2026-11-02",
    "kind": "company",
    "title": "삼성전자 — 사업 구조와 투자 가설",
    "industry": "직접 선택",
    "companies": [
      {
        "symbol": "005930.KS",
        "name": "삼성전자",
        "industry": "직접 선택"
      }
    ],
    "duration": 25,
    "sections": [
      {
        "title": "사업 구조 기초 읽기",
        "minutes": 3,
        "body": "이 기업의 제품·사업 구조·고객·경쟁사와 매출·이익 수치는 미확인입니다. 직접 공시와 공식 IR 자료를 찾아 사업 구조부터 작성하세요.\n고객·경쟁사·거래 관계는 미확인입니다. 공식 공시에 명시된 범위만 적고 추정은 따로 표시하세요.",
        "prompts": [
          "누가 어떤 제품·서비스의 대가를 지불하나요?",
          "고객 유형과 경쟁사는 무엇이며 확인된 거래 근거가 있나요?"
        ]
      },
      {
        "title": "공식 근거 확인",
        "minutes": 6,
        "body": "이 자료는 사업 구조를 읽기 위한 기초 안내이며 최신 실적·고객 계약·시장점유율을 검증한 자료가 아닙니다. 학습일 기준 공시된 가장 최근 사업·분기보고서와 IR 자료를 직접 열어 공시일, 대상 기간, 연결/별도, 통화·단위를 기록하세요. 아직 공시되지 않은 기간과 확인하지 못한 수치는 '미확인'으로 남기고, 결측치를 0으로 채우지 마세요.\n가격·판매량·원가·계약·현금 회수 구조가 미확인입니다. 확인된 사업별 매출과 비용을 같은 기간·회계 기준으로 읽으세요.",
        "prompts": [
          "자료의 기준일·공시일·대상 기간, 연결/별도, 통화·단위와 원문 URL을 적으세요.",
          "매출·영업이익·마진과 영업현금흐름을 같은 기준으로 확인했나요?"
        ]
      },
      {
        "title": "내 기록과 지표",
        "minutes": 6,
        "body": "회사 고유 위험은 미확인입니다. 원문 위험요인과 매출·비용·차입·환율 노출을 확인한 뒤 가설을 작성하세요.\n확인할 지표: 공시로 확인할 사업별 매출·이익, 원가, 재고·채권, 현금흐름과 자료 기준일\n비교 관점: 동종 기업과 비교 가능성도 미확인입니다. 제품·고객·기간·연결 범위가 맞는지 직접 확인하세요.",
        "prompts": [
          "새로 알게 된 사실과 아직 모르는 개념을 구분해 적으세요.",
          "성장 이유·가장 큰 위험·필수 지표를 한 문장씩 적으세요."
        ]
      },
      {
        "title": "객관식으로 이해 확인",
        "minutes": 5,
        "body": "사업 구조와 거시 변수의 전달 경로를 묻는 객관식 네 문항에 답하세요. 정답·해설은 실제 제출 후 표시됩니다.",
        "prompts": [
          "각 선택에 사용한 사업 근거와 조건을 생각하세요."
        ]
      },
      {
        "title": "판단과 다음 확인",
        "minutes": 5,
        "body": "성장 이유·가장 큰 위험·반드시 확인할 지표를 근거와 함께 쓰고, 증거·논리·지표의 0~4점 자기평가를 따로 기록하세요. 주가 변화만으로 사업 판단의 정오를 판정하지 마세요.",
        "prompts": [
          "가설이 틀렸음을 보여줄 반증 지표와 다음 확인 날짜는?"
        ]
      }
    ],
    "sources": [
      {
        "title": "DART 전자공시 — 회사명·기간·정정공시 확인",
        "url": "https://dart.fss.or.kr/dsab001/main.do"
      }
    ],
    "judgmentPrompt": "확인된 사업 근거와 자료 기준일·기간·원문 URL을 바탕으로 성장 이유, 가장 큰 위험, 반드시 확인할 지표를 쓰세요. 거시 조건이 매출·원가·현금에 전달되는 경로와 반증 조건을 설명하고, 미확인 사실을 표시하세요. 증거·논리·지표를 각각 0~4점으로 직접 평가하세요. 이는 자기평가이며 AI나 서버가 판단의 정답을 채점한 점수가 아닙니다.",
    "questions": [
      {
        "id": "business-structure",
        "dimension": "business",
        "prompt": "이 사용자 지정 기업의 사업 구조가 아직 미확인일 때 첫 단계는?",
        "options": [
          "주가가 같은 방향으로 움직이는 기업은 모두 서로의 직접 고객이므로 거래 관계를 확정한다.",
          "이름에 같은 업종이 들어가면 제품·고객과 비용 구조도 같다고 본다.",
          "공식 보고서에서 제품·고객·매출 인식 구조를 직접 확인하고 미확인 사항을 구분한다.",
          "소비자에게 유명한 제품 하나의 인기가 연결 전체 매출과 이익을 모두 설명한다고 본다."
        ]
      },
      {
        "id": "business-economics",
        "dimension": "business",
        "prompt": "사업 성장을 이익의 질과 함께 확인할 자료 조합은?",
        "options": [
          "주가 상승률만 비교하면 사업의 판매량·수익성과 현금 회수도 확인된다.",
          "공시로 확인할 사업별 매출·이익, 원가, 재고·채권, 현금흐름과 자료 기준일; 동일 기간·연결 범위의 매출·영업이익과 영업현금흐름을 함께 확인한다.",
          "수주·주문 또는 매출 총액만 늘면 비용·계약 조건 없이도 이익 증가를 확정한다.",
          "연결 연간 매출과 별도 분기 이익을 그대로 나누고 결측치는 0으로 채운다."
        ]
      },
      {
        "id": "inference-transmission",
        "dimension": "inference",
        "prompt": "수요가 늘면서 원재료비·금리·환율도 변했다고 가정합니다. 회사의 실제 노출과 계약 조건은 미확인이며 학습용 조건입니다. 가장 타당한 해석은?",
        "options": [
          "공시로 제품·고객·통화 노출과 가격 전가·비용·시차를 먼저 확인하고 조건별 이익·현금흐름을 구분해야 합니다.",
          "업종 수요가 늘면 모든 기업의 영업이익은 즉시 같은 비율로 늘어난다.",
          "환율과 원가는 매출에 영향을 줄 수 있어도 이익·현금에는 영향을 주지 않는다.",
          "정책 발표나 주문 증가는 확정 매출·현금 수령과 같으므로 추가 자료는 필요 없다."
        ]
      },
      {
        "id": "inference-verification",
        "dimension": "inference",
        "prompt": "'업종 호재가 이 기업의 이익을 개선한다'는 가설을 검증하는 가장 적절한 방법은?",
        "options": [
          "다음 날 주가가 오르면 다른 사업 근거 없이 가설을 맞았다고 판정한다.",
          "좋은 기사만 모으고 반대 지표와 기존 가설의 작성 날짜는 제외한다.",
          "개선 경로와 반증 조건을 먼저 쓰고, 날짜·기간이 있는 공시의 사업별 지표·원가·현금으로 이후 결과를 대조한다.",
          "확인되지 않은 고객·수익 수치를 채워 넣어 분석의 빈칸을 없앤다."
        ]
      }
    ],
    "quizVersion": "learning-quiz-v1:44619881fd39d488776f1bed0e2ef557392f0a5892a298fb9a4cb6b4e2215c57"
  },
  "2026-11-03:005930.KS": {
    "id": "lesson-9216062d6806cf5cad4be5b2",
    "date": "2026-11-03",
    "kind": "company",
    "title": "삼성전자 — 사업 구조와 투자 가설",
    "industry": "직접 선택",
    "companies": [
      {
        "symbol": "005930.KS",
        "name": "삼성전자",
        "industry": "직접 선택"
      }
    ],
    "duration": 25,
    "sections": [
      {
        "title": "사업 구조 기초 읽기",
        "minutes": 3,
        "body": "이 기업의 제품·사업 구조·고객·경쟁사와 매출·이익 수치는 미확인입니다. 직접 공시와 공식 IR 자료를 찾아 사업 구조부터 작성하세요.\n고객·경쟁사·거래 관계는 미확인입니다. 공식 공시에 명시된 범위만 적고 추정은 따로 표시하세요.",
        "prompts": [
          "누가 어떤 제품·서비스의 대가를 지불하나요?",
          "고객 유형과 경쟁사는 무엇이며 확인된 거래 근거가 있나요?"
        ]
      },
      {
        "title": "공식 근거 확인",
        "minutes": 6,
        "body": "이 자료는 사업 구조를 읽기 위한 기초 안내이며 최신 실적·고객 계약·시장점유율을 검증한 자료가 아닙니다. 학습일 기준 공시된 가장 최근 사업·분기보고서와 IR 자료를 직접 열어 공시일, 대상 기간, 연결/별도, 통화·단위를 기록하세요. 아직 공시되지 않은 기간과 확인하지 못한 수치는 '미확인'으로 남기고, 결측치를 0으로 채우지 마세요.\n가격·판매량·원가·계약·현금 회수 구조가 미확인입니다. 확인된 사업별 매출과 비용을 같은 기간·회계 기준으로 읽으세요.",
        "prompts": [
          "자료의 기준일·공시일·대상 기간, 연결/별도, 통화·단위와 원문 URL을 적으세요.",
          "매출·영업이익·마진과 영업현금흐름을 같은 기준으로 확인했나요?"
        ]
      },
      {
        "title": "내 기록과 지표",
        "minutes": 6,
        "body": "회사 고유 위험은 미확인입니다. 원문 위험요인과 매출·비용·차입·환율 노출을 확인한 뒤 가설을 작성하세요.\n확인할 지표: 공시로 확인할 사업별 매출·이익, 원가, 재고·채권, 현금흐름과 자료 기준일\n비교 관점: 동종 기업과 비교 가능성도 미확인입니다. 제품·고객·기간·연결 범위가 맞는지 직접 확인하세요.",
        "prompts": [
          "새로 알게 된 사실과 아직 모르는 개념을 구분해 적으세요.",
          "성장 이유·가장 큰 위험·필수 지표를 한 문장씩 적으세요."
        ]
      },
      {
        "title": "객관식으로 이해 확인",
        "minutes": 5,
        "body": "사업 구조와 거시 변수의 전달 경로를 묻는 객관식 네 문항에 답하세요. 정답·해설은 실제 제출 후 표시됩니다.",
        "prompts": [
          "각 선택에 사용한 사업 근거와 조건을 생각하세요."
        ]
      },
      {
        "title": "판단과 다음 확인",
        "minutes": 5,
        "body": "성장 이유·가장 큰 위험·반드시 확인할 지표를 근거와 함께 쓰고, 증거·논리·지표의 0~4점 자기평가를 따로 기록하세요. 주가 변화만으로 사업 판단의 정오를 판정하지 마세요.",
        "prompts": [
          "가설이 틀렸음을 보여줄 반증 지표와 다음 확인 날짜는?"
        ]
      }
    ],
    "sources": [
      {
        "title": "DART 전자공시 — 회사명·기간·정정공시 확인",
        "url": "https://dart.fss.or.kr/dsab001/main.do"
      }
    ],
    "judgmentPrompt": "확인된 사업 근거와 자료 기준일·기간·원문 URL을 바탕으로 성장 이유, 가장 큰 위험, 반드시 확인할 지표를 쓰세요. 거시 조건이 매출·원가·현금에 전달되는 경로와 반증 조건을 설명하고, 미확인 사실을 표시하세요. 증거·논리·지표를 각각 0~4점으로 직접 평가하세요. 이는 자기평가이며 AI나 서버가 판단의 정답을 채점한 점수가 아닙니다.",
    "questions": [
      {
        "id": "business-structure",
        "dimension": "business",
        "prompt": "이 사용자 지정 기업의 사업 구조가 아직 미확인일 때 첫 단계는?",
        "options": [
          "주가가 같은 방향으로 움직이는 기업은 모두 서로의 직접 고객이므로 거래 관계를 확정한다.",
          "공식 보고서에서 제품·고객·매출 인식 구조를 직접 확인하고 미확인 사항을 구분한다.",
          "이름에 같은 업종이 들어가면 제품·고객과 비용 구조도 같다고 본다.",
          "소비자에게 유명한 제품 하나의 인기가 연결 전체 매출과 이익을 모두 설명한다고 본다."
        ]
      },
      {
        "id": "business-economics",
        "dimension": "business",
        "prompt": "사업 성장을 이익의 질과 함께 확인할 자료 조합은?",
        "options": [
          "주가 상승률만 비교하면 사업의 판매량·수익성과 현금 회수도 확인된다.",
          "공시로 확인할 사업별 매출·이익, 원가, 재고·채권, 현금흐름과 자료 기준일; 동일 기간·연결 범위의 매출·영업이익과 영업현금흐름을 함께 확인한다.",
          "수주·주문 또는 매출 총액만 늘면 비용·계약 조건 없이도 이익 증가를 확정한다.",
          "연결 연간 매출과 별도 분기 이익을 그대로 나누고 결측치는 0으로 채운다."
        ]
      },
      {
        "id": "inference-transmission",
        "dimension": "inference",
        "prompt": "수요가 늘면서 원재료비·금리·환율도 변했다고 가정합니다. 회사의 실제 노출과 계약 조건은 미확인이며 학습용 조건입니다. 가장 타당한 해석은?",
        "options": [
          "업종 수요가 늘면 모든 기업의 영업이익은 즉시 같은 비율로 늘어난다.",
          "환율과 원가는 매출에 영향을 줄 수 있어도 이익·현금에는 영향을 주지 않는다.",
          "정책 발표나 주문 증가는 확정 매출·현금 수령과 같으므로 추가 자료는 필요 없다.",
          "공시로 제품·고객·통화 노출과 가격 전가·비용·시차를 먼저 확인하고 조건별 이익·현금흐름을 구분해야 합니다."
        ]
      },
      {
        "id": "inference-verification",
        "dimension": "inference",
        "prompt": "'업종 호재가 이 기업의 이익을 개선한다'는 가설을 검증하는 가장 적절한 방법은?",
        "options": [
          "개선 경로와 반증 조건을 먼저 쓰고, 날짜·기간이 있는 공시의 사업별 지표·원가·현금으로 이후 결과를 대조한다.",
          "다음 날 주가가 오르면 다른 사업 근거 없이 가설을 맞았다고 판정한다.",
          "좋은 기사만 모으고 반대 지표와 기존 가설의 작성 날짜는 제외한다.",
          "확인되지 않은 고객·수익 수치를 채워 넣어 분석의 빈칸을 없앤다."
        ]
      }
    ],
    "quizVersion": "learning-quiz-v1:da2acfadf6e1761f4f48c8acdf849ede93285d531336bdee2c855b019d34e049"
  }
};
