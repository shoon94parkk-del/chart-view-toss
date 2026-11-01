import { readFile } from 'node:fs/promises';
import { test, expect, noOverflow, contained, touchable } from './fixtures.mjs';
import { createLearningApi, learningNow, learningAnswerKey, learningSessionKey, completeInsights, externalLearningResult } from '../fixtures/learning-api.mjs';

test.beforeEach(async ({page})=> { await page.clock.setFixedTime(new Date(learningNow)); });

async function signedIn({context,qa},options) {
  const api=createLearningApi(options);api.install(qa);await api.seedSession(context);return api;
}
async function dashboard(page) {
  await page.goto('/#learning');await expect(page.locator('.learning-today h2')).toHaveText('에이피알');
}
async function start(page) {
  await page.locator('.learning-today [data-learning-start="2026-11-02"]').click();
  await expect(page.locator('[data-learning-editor]')).toBeVisible();
  await expect(page.locator('[data-learning-notes-form] [name="understanding"]')).toHaveValue('');
}
async function insights(page) {
  for(const [key,value] of Object.entries(completeInsights))await page.locator(`[data-learning-notes-form] [name="insight.${key}"]`).fill(value);
}
async function complete(page,api) {
  await page.locator('[data-learning-notes-form] [name="notes.business"]').fill('제품별 매출과 고객 재구매율을 공시에서 확인한다.');
  await insights(page);await page.locator('[data-learning-save="complete"]').click();
  await expect(page.locator('[data-learning-status]')).toContainText('클라우드에 저장했어요');
  expect(api.workspace.sessions.at(-1).status).toBe('completed');
  expect(api.workspace.attempts).toHaveLength(0);
}
async function answerQuiz(page,{correct=true}={}) {
  const form=page.locator('[data-learning-quiz-form]');
  if(!await form.isVisible())await form.locator('..').locator(':scope > summary').click();
  for(const q of learningAnswerKey) {
    const choice=correct||q.dimension==='business'?q.correctIndex:(q.correctIndex+1)%q.options.length;
    await form.locator(`input[name="answer.${q.id}"][value="${choice}"]`).check();
  }
  await form.locator('[name="judgmentAnswer"]').fill('공식 매출과 비용 구조를 연결하고 재구매 둔화가 관측되면 성장 가정을 다시 검토한다.');
  for(const [key,value]of Object.entries({evidence:2,logic:3,indicators:1}))await form.locator(`[name="rubric.${key}"]`).selectOption(String(value));
  return form;
}
async function openSettings(page) {
  const settings=page.locator('[data-learning-settings]');
  if(await settings.getAttribute('open')===null)await settings.locator(':scope > summary').click();
  return settings;
}
function metric(page,label) {return page.locator('.learning-stats > div').filter({has:page.getByText(label,{exact:true})}).locator('dd');}

// A note completion, an actual server-graded attempt and an external assessment
// deliberately have different assertions throughout these scenarios.
test('learning starts empty and draft save/reload is separate from completion and quiz',async({page,qa},testInfo)=>{
  const api=createLearningApi();api.install(qa);
  await page.goto('/#home');await expect(page.locator('#market-card')).toBeVisible();
  expect(api.calls).toEqual([]);
  await page.locator('.home-learning-entry [data-tab="learning"]').click();
  await page.locator('[data-learning-new-account]').click();
  await expect(page.locator('[data-learning-recovery-key]')).toHaveText(api.account.recoveryKey);
  expect(await page.evaluate(key=>localStorage.getItem(key),learningSessionKey)).toBeNull();
  await page.locator('[data-learning-recovery-ack]').click();
  await expect(page.locator('[data-learning-status]')).toContainText('복구 키를 저장한 뒤');
  expect(api.calls.filter(row=>row.path==='/workspace')).toHaveLength(0);
  await page.locator('[data-learning-recovery-saved]').check();
  await touchable(page.locator('[data-learning-recovery-ack]'));await page.locator('[data-learning-recovery-ack]').click();
  await expect(metric(page,'공부한 날짜')).toHaveText('0일');
  await expect(metric(page,'기본 퀴즈·복습')).toHaveText('0회');
  await expect(metric(page,'평균 자기 이해도')).toHaveText('이해도 미기록');
  await start(page);
  const notes=page.locator('[data-learning-notes-form]');
  await notes.locator('[name="topic"]').fill('처음 작성한 사업 노트');
  await notes.locator('[name="notes.business"]').fill('화장품과 기기의 매출 비중을 먼저 확인한다.');
  await notes.locator('[name="understanding"]').fill('0');await notes.locator('[name="minutes"]').fill('0');
  await page.locator('[data-learning-save="complete"]').click();
  await expect(page.locator('[data-learning-status]')).toContainText('성장하는 이유');
  expect(api.mutations).toHaveLength(0);
  await page.locator('[data-learning-save="draft"]').click();
  await expect(page.locator('.learning-editor-heading')).toContainText('작성 중');
  const draft=api.workspace.sessions[0];
  expect(draft).toMatchObject({status:'in_progress',understanding:0,minutes:0,revision:1,completedAt:null,notes:{business:'화장품과 기기의 매출 비중을 먼저 확인한다.'},insight:{growth:'',risk:'',metrics:''}});
  expect(api.workspace.attempts).toHaveLength(0);await expect(page.locator('[data-learning-quiz-form]')).toHaveCount(0);
  await page.reload();await expect(metric(page,'공부한 날짜')).toHaveText('0일');
  await page.locator(`a.learning-row[href="#learning/session/${draft.id}"]`).click();
  await expect(notes.locator('[name="notes.business"]')).toHaveValue(draft.notes.business);
  await expect(notes.locator('[name="understanding"]')).toHaveValue('0');
  await insights(page);await page.locator('[data-learning-save="complete"]').click();
  await expect(page.locator('.learning-editor-heading')).toContainText('공부 완료');
  expect(api.workspace.sessions[0]).toMatchObject({id:draft.id,status:'completed',revision:2});
  expect(api.workspace.revisions).toHaveLength(2);expect(api.workspace.attempts).toHaveLength(0);
  expect(api.calls.filter(row=>row.path.endsWith('/quiz'))).toHaveLength(0);
  await page.locator('.learning-topline a').click();
  await expect(metric(page,'공부한 날짜')).toHaveText('1일');await expect(metric(page,'공부한 기업')).toHaveText('1개');
  await expect(metric(page,'평균 자기 이해도')).toHaveText('0 / 100');await noOverflow(page);
  const dashboardImage=testInfo.outputPath('learning-dashboard.png');
  await page.screenshot({path:dashboardImage,fullPage:true});
  await testInfo.attach('learning-dashboard',{path:dashboardImage,contentType:'image/png'});
});

test('actual answers create server scores, wrong concepts and an append-only review',async({page,context,qa},testInfo)=>{
  const api=await signedIn({context,qa});await dashboard(page);await start(page);await complete(page,api);
  const emptyQuiz=page.locator('[data-learning-quiz-form]');await emptyQuiz.locator('..').locator(':scope > summary').click();
  await emptyQuiz.locator('[data-learning-quiz]').click();
  expect(await emptyQuiz.evaluate(form=>form.checkValidity())).toBe(false);
  expect(api.calls.filter(row=>row.path.endsWith('/quiz'))).toHaveLength(0);
  const form=await answerQuiz(page,{correct:false});
  // Server payload contains indices and reasoning; no client-supplied score.
  await touchable(form.locator('[data-learning-quiz]'));await form.locator('[data-learning-quiz]').click();
  const history=page.locator('[data-learning-attempt-history]');
  await expect(history).toContainText('퀴즈 50점');await expect(history).toContainText('사업 구조 100 · 추론 0');
  await expect(history).toContainText('판단 근거 자기평가 50점');
  await expect(page.locator('.learning-editor-heading')).toContainText('퀴즈 제출 완료');
  const first=api.workspace.attempts[0];expect(first).toMatchObject({score:50,dimensions:{business:100,inference:0},judgment:{score:50,assessment:'self'},isReview:false});
  expect(first.wrongAnswers).toHaveLength(2);expect(api.workspace.sessions[0].nextReviewDate).toBe('2026-11-03');
  const sent=api.mutations.find(row=>row.path.endsWith('/quiz')).body;
  expect(Object.keys(sent).sort()).toEqual(['answers','expectedVersion','judgment','requestId']);expect(sent.expectedVersion).toBe(1);
  const wrong=history.locator('.learning-wrong').first();await wrong.locator('summary').click();
  await expect(wrong).toContainText(first.wrongAnswers[0].explanation);
  const review=await answerQuiz(page);await touchable(review.locator('[data-learning-review]'));await review.locator('[data-learning-review]').click();
  await expect(history).toContainText('복습 100점');await expect(history.locator('.learning-attempt')).toHaveCount(2);
  await expect(history).toContainText('다음 2026-11-09');expect(api.workspace.attempts[0]).toEqual(first);
  expect(api.workspace.attempts[1]).toMatchObject({score:100,isReview:true,wrongAnswers:[]});expect(api.workspace.reviews).toHaveLength(1);
  await noOverflow(page);await contained(history);
  await history.scrollIntoViewIfNeeded();
  const quizImage=testInfo.outputPath('learning-quiz-result.png');
  await page.screenshot({path:quizImage});
  await testInfo.attach('learning-quiz-result',{path:quizImage,contentType:'image/png'});
  await page.locator('.learning-topline a').click();
  await expect(metric(page,'기본 퀴즈·복습')).toHaveText('2회');
  await expect(page.locator('.learning-page')).toContainText('기본 퀴즈·복습 누적 150점 · 평균 75점');
});

test('historical edits retain the original attempt and compare revisions before business evidence validation',async({page,context,qa})=>{
  const api=await signedIn({context,qa});await dashboard(page);await start(page);await complete(page,api);
  const quiz=await answerQuiz(page);await quiz.locator('[data-learning-quiz]').click();
  await expect(page.locator('.learning-editor-heading')).toContainText('퀴즈 제출 완료');
  const first=api.workspace.sessions[0],original=first.notes.business;
  await page.locator('.learning-topline a').click();
  await page.locator('a[href="#learning/company/278470.KS"]').click();
  await expect(page).toHaveURL(/#learning\/company\/278470.KS$/);
  await page.locator(`a.learning-row[href="#learning/session/${first.id}"]`).click();
  await expect(page.locator('[name="notes.business"]')).toHaveValue(original);
  await page.getByRole('button',{name:'뒤로가기',exact:true}).click();
  await expect(page).toHaveURL(/#learning\/company\/278470.KS$/);
  await expect(page.locator('h2').first()).toHaveText('에이피알 공부 기록');
  await page.locator(`a.learning-row[href="#learning/session/${first.id}"]`).click();
  await expect(page.locator('[name="notes.business"]')).toHaveValue(original);
  await page.locator('[name="notes.business"]').fill('신규 공시를 확인해 고객 반복 구매 가정을 수정했다.');
  await page.locator('[data-learning-save="complete"]').click();
  await expect(page.locator('.learning-editor-heading')).toContainText('공부 완료');
  await expect(page.locator('[data-learning-attempt-history]')).toContainText('현재 노트와 개정 다름');
  expect(api.workspace.attempts).toHaveLength(1);expect(api.workspace.revisions[0].session.notes.business).toBe(original);
  const revisions=page.locator('[data-learning-revision-history]');await revisions.locator(':scope > summary').click();
  await revisions.getByText('개정 1 · '+learningNow,{exact:true}).click();
  await expect(revisions).toContainText('과거: '+original);await expect(revisions).toContainText('현재: 신규 공시를 확인해');
  const validation=page.locator('[data-learning-validation-form]');await validation.locator('../..').locator(':scope > summary').click();
  await validation.locator('[name="revision"]').selectOption('1');
  for(const [name,value]of Object.entries({assumption:'해외 고객 재구매가 성장을 이끈다.',observed:'분기 공시에서 기존 고객 매출 둔화를 확인했다.',evidenceUrl:'https://dart.fss.or.kr/',evidenceDate:'2026-11-02',currentJudgment:'신규 주문과 재구매를 구분해 다음 분기를 확인한다.',priceContext:'주가 관측은 판단 점수에서 제외'}))await validation.locator(`[name="${name}"]`).fill(value);
  await validation.locator('[name="outcome"]').selectOption('contradicted');await touchable(validation.locator('[data-learning-validate]'));await validation.locator('[data-learning-validate]').click();
  await expect(page.locator('.learning-validation')).toContainText('개정 1 · 가정 반박');
  await expect(page.locator('.learning-validation')).toContainText('해외 고객 재구매가 성장을 이끈다.');
  expect(api.workspace.validations[0]).toMatchObject({sessionId:first.id,revision:1,outcome:'contradicted',evidenceDate:'2026-11-02'});
  expect(api.workspace.sessions[0].notes.business).toBe('신규 공시를 확인해 고객 반복 구매 가정을 수정했다.');
  expect(api.workspace.revisions).toHaveLength(2);await noOverflow(page);
});

test('a version conflict retains the draft and refreshes version before explicit retry',async({page,context,qa})=>{
  const api=await signedIn({context,qa});await dashboard(page);await start(page);
  const input=page.locator('[name="notes.business"]');await input.fill('충돌 중에도 이 사업 가설을 잃으면 안 된다.');
  api.conflictNextSave();await page.locator('[data-learning-save="draft"]').click();
  await expect(page.locator('[data-learning-status]')).toContainText('다른 창에서 기록이 변경');
  await expect(input).toHaveValue('충돌 중에도 이 사업 가설을 잃으면 안 된다.');expect(api.workspace.sessions).toHaveLength(0);
  await touchable(page.locator('[data-learning-refresh]'));await page.locator('[data-learning-refresh]').click();
  await expect(page.locator('[data-learning-status]')).toContainText('최신 기록을 확인했어요');
  await expect(input).toHaveValue('충돌 중에도 이 사업 가설을 잃으면 안 된다.');
  await page.locator('[data-learning-save="draft"]').click();await expect(page.locator('[data-learning-status]')).toContainText('클라우드에 저장했어요');
  expect(api.workspace.sessions[0].notes.business).toBe('충돌 중에도 이 사업 가설을 잃으면 안 된다.');
  const saves=api.calls.filter(row=>row.path==='/sessions');expect(saves.map(row=>row.body.expectedVersion)).toEqual([0,1]);expect(saves[1].body.requestId).not.toBe(saves[0].body.requestId);
  await noOverflow(page);
});

test('manual import previews external scores before confirmation and exports only persisted study records',async({page,context,qa})=>{
  const api=await signedIn({context,qa});await dashboard(page);const settings=await openSettings(page),payload=externalLearningResult();
  await settings.locator('[data-learning-import-json]').fill(JSON.stringify(payload));await touchable(settings.locator('[data-learning-import-preview]'));await settings.locator('[data-learning-import-preview]').click();
  const preview=settings.locator('[data-learning-import-result]');await expect(preview).toContainText('외부 점수 88 / 100');await expect(preview).toContainText('ODM 고객의 신규 주문');
  expect(api.calls.filter(row=>row.path==='/import')).toHaveLength(0);expect(api.workspace.sessions).toHaveLength(0);
  await touchable(settings.locator('[data-learning-import-confirm]'));await settings.locator('[data-learning-import-confirm]').click();
  await expect(page.locator('[data-learning-status]')).toContainText('클라우드에 저장했어요');
  expect(api.workspace.sessions[0]).toMatchObject({status:'completed',understanding:0,provenance:'imported'});expect(api.workspace.attempts).toHaveLength(0);
  await expect(metric(page,'기본 퀴즈·복습')).toHaveText('0회');await expect(metric(page,'평균 자기 이해도')).toHaveText('0 / 100');
  const opened=await openSettings(page);await opened.getByText('가져온 출처 이력 · 1회',{exact:true}).click();await expect(opened).toContainText('외부 점수 88');
  await touchable(opened.locator('[data-learning-export]'));
  const downloadEvent=page.waitForEvent('download');await opened.locator('[data-learning-export]').click();const download=await downloadEvent;
  const backup=JSON.parse(await readFile(await download.path(),'utf8'));
  expect(backup).toMatchObject({format:'chartview-learning-backup',schemaVersion:1,workspace:{version:1,sessions:[{notes:{business:payload.session.notes.business}}],attempts:[]}});
  expect(backup.workspace).toEqual(api.workspace);expect(JSON.stringify(backup)).not.toMatch(/recoveryKey|authorization|"token"|"password"/i);
  await noOverflow(page);await contained(opened.locator('[data-learning-import-json]'));
});

test('stock learning links keep source context and a new dated company record preserves older studies',async({page,context,qa})=>{
  const api=await signedIn({context,qa});await page.goto('/#detail/005930.KS');
  await expect(page.locator('#detail-price .quote-main')).toBeVisible();expect(api.calls).toEqual([]);
  const links=page.locator('[data-learning-stock-links]');await links.locator(':scope > summary').click();
  const candidate=links.locator('[data-learning-stock="005930.KS"]');await expect(candidate).toContainText('미학습');await touchable(candidate);await candidate.click();
  await expect(page).toHaveURL(/#learning\/company\/005930.KS$/);await expect(page.locator('.learning-section h2').first()).toHaveText('삼성전자 공부 기록');
  await page.locator('[data-learning-company-date]').fill('2026-11-02');await page.locator('[data-learning-company-start]').click();
  await expect(page.locator('[data-learning-editor]')).toContainText('공부를 시작한 곳 · detail 삼성전자');
  await complete(page,api);const first=api.workspace.sessions[0];expect(first.sourceContext).toMatchObject({kind:'detail',symbol:'005930.KS',name:'삼성전자'});
  await page.goto('/#home');await page.goto('/#learning/company/005930.KS');
  await page.locator('[data-learning-company-date]').fill('2026-11-03');await page.locator('[data-learning-company-start]').click();
  await page.locator('[name="notes.business"]').fill('새 분기의 수주와 이익 구조를 다시 조사한다.');await insights(page);await page.locator('[data-learning-save="complete"]').click();
  await expect(page.locator('[data-learning-status]')).toContainText('클라우드에 저장했어요');
  expect(api.workspace.sessions).toHaveLength(2);expect(api.workspace.sessions[0]).toEqual(first);expect(api.workspace.sessions[1].lessonDate).toBe('2026-11-03');expect(api.workspace.sessions[1].id).not.toBe(first.id);
  await noOverflow(page);await contained(page.locator('[data-learning-notes-form]'));await touchable(page.locator('[data-learning-save="draft"]'));await touchable(page.locator('[data-learning-save="complete"]'));
});

test('an independent browser context recovers cloud records with the saved key and can revoke its session',async({page,context,qa,browser},testInfo)=>{
  const api=await signedIn({context,qa});await dashboard(page);await start(page);await complete(page,api);
  const stored=api.workspace.sessions[0];const separate=await browser.newContext({baseURL:testInfo.project.use.baseURL||process.env.E2E_BASE_URL||'http://127.0.0.1:4173',locale:'ko-KR',timezoneId:'Asia/Seoul',viewport:testInfo.project.use.viewport,serviceWorkers:'block'});
  const errors=[];await api.installContext(separate);
  try {
    const restored=await separate.newPage();restored.on('pageerror',error=>errors.push(error.message));await restored.clock.setFixedTime(new Date(learningNow));await restored.goto('/#learning');
    await expect(restored.locator('[data-learning-new-account]')).toBeVisible();expect(await restored.evaluate(key=>localStorage.getItem(key),learningSessionKey)).toBeNull();
    const login=restored.locator('[data-learning-login-form]');if(await login.locator('..').getAttribute('open')===null)await login.locator('..').locator(':scope > summary').click();await login.locator('[name="recoveryKey"]').fill(api.account.recoveryKey);await touchable(login.locator('[data-learning-login]'));await login.locator('[data-learning-login]').click();
    await expect(metric(restored,'공부한 날짜')).toHaveText('1일');await restored.locator(`a.learning-row[href="#learning/session/${stored.id}"]`).click();
    await expect(restored.locator('[name="notes.business"]')).toHaveValue(stored.notes.business);
    const credentials=JSON.parse(await restored.evaluate(key=>localStorage.getItem(key),learningSessionKey));expect(credentials.accountId).toBe(api.account.accountId);expect(credentials.token).not.toBe(api.account.token);expect(credentials).not.toHaveProperty('recoveryKey');
    await noOverflow(restored);const settings=await openSettings(restored);await settings.locator('[data-learning-logout]').click();await expect(restored.locator('[data-learning-new-account]')).toBeVisible();expect(api.workspace.sessions).toHaveLength(1);
    await expect.poll(()=>api.calls.filter(row=>row.path==='/auth'&&row.method==='DELETE').length).toBe(1);expect(errors).toEqual([]);
  } finally {await separate.close();}
});

test('unconfigured storage is explicit and a failed cloud save keeps draft input for retry',async({page,context,qa})=>{
  const unavailable=createLearningApi({configured:false});unavailable.install(qa);await page.goto('/#learning');
  await expect(page.getByRole('heading',{name:'영구 저장소 연결이 필요해요'})).toBeVisible();await expect(page.locator('[data-learning-status]')).toContainText('저장소 미설정');
  expect(unavailable.calls.map(row=>row.path)).toEqual(['/status']);await expect(page.locator('[data-learning-new-account]')).toHaveCount(0);await noOverflow(page);
  const api=await signedIn({context,qa});await page.reload();await expect(page.locator('.learning-today')).toBeVisible();await start(page);
  await page.locator('[name="notes.business"]').fill('서버가 실패해도 유지할 조사 메모');api.setFailSave();await page.locator('[data-learning-save="draft"]').click();
  await expect(page.locator('[data-learning-status]')).toContainText('영구 저장소가 연결되지 않았어요');await expect(page.locator('[name="notes.business"]')).toHaveValue('서버가 실패해도 유지할 조사 메모');expect(api.workspace.sessions).toHaveLength(0);
  await page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name:'홈',exact:true}).click();
  await expect(page.locator('#market-card')).toBeVisible();
  await page.locator('.home-learning-entry [data-tab="learning"]').click();
  await expect(page.locator('[data-learning-editor]')).toBeVisible();
  await expect(page.locator('[name="notes.business"]')).toHaveValue('서버가 실패해도 유지할 조사 메모');
  await expect(page.locator('[data-learning-status]')).toContainText('아직 저장하지 않은');
  await page.locator('[data-learning-save="draft"]').click();await expect(page.locator('[data-learning-status]')).toContainText('클라우드에 저장했어요');
  expect(api.workspace.sessions[0].notes.business).toBe('서버가 실패해도 유지할 조사 메모');const saves=api.calls.filter(row=>row.path==='/sessions');expect(saves[1].body.requestId).toBe(saves[0].body.requestId);
  await noOverflow(page);
});

test('a second tab switching accounts blocks stale draft save, export and cloud deletion before transport',async({page,context,qa})=>{
  const api=await signedIn({context,qa}),otherAccount=api.addAccount();
  const exportPage=await context.newPage(),deletePage=await context.newPage(),switchPage=await context.newPage();
  const stalePages=[page,exportPage,deletePage];
  try {
    for(const stale of stalePages) {
      await stale.clock.setFixedTime(new Date(learningNow));await dashboard(stale);await start(stale);
      await stale.locator('[name="notes.business"]').fill('계정 A에서만 볼 수 있는 비공개 사업 가설');
    }
    const exportSettings=await openSettings(exportPage),deleteSettings=await openSettings(deletePage);
    const deleteInput=deleteSettings.locator('[data-learning-delete-confirm]');
    await deleteInput.locator('../..').locator(':scope > summary').click();await deleteInput.fill('DELETE');
    await switchPage.goto('/#home');
    await switchPage.evaluate(({key,accountId,token,expiresAt})=>localStorage.setItem(key,JSON.stringify({accountId,token,expiresAt})),{key:learningSessionKey,...otherAccount});
    await switchPage.goto('/#learning');await expect(metric(switchPage,'공부한 날짜')).toHaveText('0일');
    expect(api.calls.filter(row=>row.path==='/workspace').at(-1).authorization).toBe('Bearer '+otherAccount.token);
    const privateActionCount=()=>api.calls.filter(row=>row.path==='/sessions'||row.path==='/export'||(row.path==='/account'&&row.method==='DELETE')).length;
    const before=privateActionCount();
    for(const [stale,button]of [[page,page.locator('[data-learning-save="draft"]')],[exportPage,exportSettings.locator('[data-learning-export]')],[deletePage,deleteSettings.locator('[data-learning-delete]')]]) {
      await button.click();await expect(stale.locator('[data-learning-status]')).toContainText('공부 계정이 변경됐어요');
      await expect(stale.locator('[data-learning-notes-form]')).toHaveCount(0);
      expect(privateActionCount()).toBe(before);
      const current=JSON.parse(await switchPage.evaluate(key=>localStorage.getItem(key),learningSessionKey));
      expect(current.accountId).toBe(otherAccount.accountId);
    }
    expect(api.workspace.sessions).toHaveLength(0);
    expect(api.calls.filter(row=>row.authorization==='Bearer '+otherAccount.token&&['/sessions','/export','/account'].includes(row.path))).toEqual([]);
    await noOverflow(page);await noOverflow(switchPage);
  } finally {await Promise.all([exportPage.close(),deletePage.close(),switchPage.close()]);}
});

test('an uncertain committed create resolves its original receipt before an edited draft updates the same record',async({page,context,qa})=>{
  const api=await signedIn({context,qa});await dashboard(page);await start(page);
  const business=page.locator('[name="notes.business"]');
  await business.fill('서버에 먼저 도착한 최초 사업 가설');api.commitNextSaveThenFail();
  await page.locator('[data-learning-save="draft"]').click();
  await expect(page.locator('[data-learning-status]')).toContainText('영구 저장소가 연결되지 않았어요');
  expect(api.workspace.sessions).toHaveLength(1);
  const original=api.workspace.sessions[0];expect(original).toMatchObject({revision:1,notes:{business:'서버에 먼저 도착한 최초 사업 가설'}});
  await business.fill('저장 응답이 불확실한 동안 추가로 작성한 새 근거');
  await page.locator('[data-learning-save="draft"]').click();
  await expect(page.locator('[data-learning-status]')).toContainText('이전 저장 결과를 확인했어요');
  await expect(business).toHaveValue('저장 응답이 불확실한 동안 추가로 작성한 새 근거');
  expect(api.workspace.sessions).toHaveLength(1);expect(api.workspace.sessions[0]).toEqual(original);
  const receiptRequests=api.calls.filter(row=>row.path==='/sessions');expect(receiptRequests).toHaveLength(2);expect(receiptRequests[1].body).toEqual(receiptRequests[0].body);
  await touchable(page.locator('[data-learning-save="draft"]'));await page.locator('[data-learning-save="draft"]').click();
  await expect(page.locator('[data-learning-status]')).toContainText('클라우드에 저장했어요');
  expect(api.workspace.sessions).toHaveLength(1);expect(api.workspace.sessions[0]).toMatchObject({id:original.id,revision:2,notes:{business:'저장 응답이 불확실한 동안 추가로 작성한 새 근거'}});
  expect(api.workspace.revisions.map(row=>row.session.notes.business)).toEqual(['서버에 먼저 도착한 최초 사업 가설','저장 응답이 불확실한 동안 추가로 작성한 새 근거']);
  const finalSave=api.calls.filter(row=>row.path==='/sessions').at(-1).body;expect(finalSave.session.id).toBe(original.id);expect(finalSave.expectedVersion).toBe(1);expect(finalSave.requestId).not.toBe(receiptRequests[0].body.requestId);
  await noOverflow(page);
});


test('illustrated primer explains concepts and checks an answer without writing a scored attempt',async({page,context,qa})=>{
  const api=await signedIn({context,qa});
  await dashboard(page);await start(page);
  const visual=page.locator('[data-learning-visual]');
  await expect(visual.locator('[data-visual-card]')).toHaveCount(5);
  await expect(visual).toContainText('먼저 그림으로 이해해요');
  await expect(visual.locator('svg[role="img"]')).toHaveCount(1);
  const check=visual.locator('[data-visual-correct]');
  await check.scrollIntoViewIfNeeded();
  await check.locator('input[value="0"]').check();
  await expect(check.locator('[data-visual-feedback]')).toContainText('다시 생각해 보세요');
  await check.locator('input[value="1"]').check();
  await expect(check.locator('[data-visual-feedback]')).toContainText('정답입니다');
  expect(api.calls.filter(call=>call.path.endsWith('/quiz')||call.path.endsWith('/reviews'))).toHaveLength(0);
  expect(api.workspace.attempts).toHaveLength(0);
  await noOverflow(page);
});
