import {test,expect,noOverflow,touchable} from './fixtures.mjs';

const noteKey='chartview-toss-research-v1',reviewKey='chartview-toss-review-v1',taskKey='chartview-toss-research-tasks-v1';
const notes={
 AAPL:{question:'전기 매출과 비교',reviewOn:'2026-10-06',updatedAt:'2026-10-05T00:00:00Z'},
 NVDA:{question:'현금흐름과 비교',reviewOn:'2026-10-07',updatedAt:'2026-10-05T00:00:00Z'},
 MSFT:{question:'영업이익과 비교',reviewOn:'2026-10-08',updatedAt:'2026-10-05T00:00:00Z'},
 '005930.KS':{question:'저장한 반기 근거와 비교',reviewOn:'',updatedAt:'2026-10-05T00:00:00Z'},
 '000660.KS':{question:'날짜 오류가 있는 질문',reviewOn:'2026-02-30',updatedAt:'2026-10-05T00:00:00Z'},
};
test.beforeEach(async({page})=>{
 await page.addInitScript(({notes,noteKey,reviewKey})=>{
  if(sessionStorage.getItem('research-task-fixture'))return;
  localStorage.setItem(noteKey,JSON.stringify(notes));
  localStorage.setItem(reviewKey,JSON.stringify({'005930.KS':{filing:{label:'2026년 반기'},reviewedAt:'2026-10-05T00:00:00Z'}}));
  sessionStorage.setItem('research-task-fixture','1');
 },{notes,noteKey,reviewKey});
});
const queue=page=>page.locator('.saved-research[data-revisit-compact="false"]');
const row=(page,symbol)=>queue(page).locator(`[data-research-task-symbol="${symbol}"]`);
const filter=(page,value)=>queue(page).locator(`[data-research-task-filter="${value}"]`);
async function openActions(page,symbol){const summary=row(page,symbol).locator('summary');await touchable(summary);await summary.click();}

test('KST due queue keeps undated and invalid source dates accessible and controls fit mobile',async({page})=>{
 await page.goto('/#watch');await expect(queue(page).locator('[data-research-task-symbol]')).toHaveCount(5);
 for(const [kind,symbol] of [['overdue','AAPL'],['today','NVDA'],['future','MSFT']]){
  await touchable(filter(page,kind));await filter(page,kind).click();await expect(row(page,symbol)).toBeVisible();await expect(queue(page).locator('[data-research-task-symbol]:visible')).toHaveCount(1);
 }
 await filter(page,'all').click();await expect(row(page,'005930.KS')).toBeVisible();await expect(row(page,'000660.KS')).toContainText('저장된 날짜를 확인');
 await expect(row(page,'MSFT').locator('[data-research-task-action]')).toBeHidden();
 await openActions(page,'MSFT');await touchable(row(page,'MSFT').getByRole('button',{name:'확인 완료',exact:true}));await touchable(row(page,'MSFT').getByRole('button',{name:'날짜 미루기',exact:true}));await touchable(row(page,'MSFT').getByLabel('다시 볼 날짜'));
 await noOverflow(page);
});

test('complete, undo and postpone survive reload without changing source evidence or requesting a filing recheck',async({page,qa})=>{
 await page.goto('/#watch');await expect(row(page,'AAPL')).toBeVisible();
 const sources=await page.evaluate(({noteKey,reviewKey})=>[localStorage.getItem(noteKey),localStorage.getItem(reviewKey)],{noteKey,reviewKey});
 const count=()=>qa.calls.filter(call=>/financial|dart|report/.test(call.path)).length,before=count();
 await openActions(page,'AAPL');await row(page,'AAPL').getByRole('button',{name:'확인 완료',exact:true}).click();
 await expect(row(page,'AAPL')).toHaveAttribute('data-research-task-kind','completed');
 await expect(row(page,'AAPL').locator('details')).toHaveAttribute('open','');
 await expect(row(page,'AAPL').getByRole('button',{name:'완료 취소',exact:true})).toBeFocused();
 await filter(page,'completed').click();await expect(queue(page).locator('[data-research-task-symbol]:visible')).toHaveCount(1);
 await page.reload();await filter(page,'completed').click();await expect(row(page,'AAPL')).toBeVisible();
 await openActions(page,'AAPL');await row(page,'AAPL').getByRole('button',{name:'완료 취소',exact:true}).click();
 await expect(row(page,'AAPL')).toBeHidden();await expect(filter(page,'completed')).toBeFocused();
 await filter(page,'all').click();await expect(row(page,'AAPL').locator('details')).toHaveAttribute('open','');
 await row(page,'AAPL').getByLabel('다시 볼 날짜').fill('2026-10-09');await row(page,'AAPL').getByRole('button',{name:'날짜 미루기',exact:true}).click();
 await expect(row(page,'AAPL')).toHaveAttribute('data-research-task-kind','future');await expect(row(page,'AAPL')).toContainText('다시 볼 날짜 2026-10-09');
 await page.reload();await expect(row(page,'AAPL')).toHaveAttribute('data-research-task-kind','future');
 expect(await page.evaluate(({noteKey,reviewKey})=>[localStorage.getItem(noteKey),localStorage.getItem(reviewKey)],{noteKey,reviewKey})).toEqual(sources);expect(count()).toBe(before);await noOverflow(page);
});

test('changed question or newly observed filing reopens a completed item and home remains one row',async({page})=>{
 await page.goto('/#watch');await openActions(page,'005930.KS');await row(page,'005930.KS').getByRole('button',{name:'확인 완료',exact:true}).click();await expect(row(page,'005930.KS')).toHaveAttribute('data-research-task-kind','completed');
 await page.evaluate(reviewKey=>{const value=JSON.parse(localStorage.getItem(reviewKey));value['005930.KS'].observation={checkedAt:'2026-10-07T06:00:00Z',filing:{label:'2026년 3분기'}};localStorage.setItem(reviewKey,JSON.stringify(value));},reviewKey);
 await page.reload();await expect(row(page,'005930.KS')).toHaveAttribute('data-research-task-kind','undated');
 await openActions(page,'AAPL');await row(page,'AAPL').getByRole('button',{name:'확인 완료',exact:true}).click();await expect(row(page,'AAPL')).toHaveAttribute('data-research-task-kind','completed');
 await page.evaluate(noteKey=>{const value=JSON.parse(localStorage.getItem(noteKey));value.AAPL.question='새로 저장한 질문';localStorage.setItem(noteKey,JSON.stringify(value));},noteKey);
 await page.reload();await expect(row(page,'AAPL')).toHaveAttribute('data-research-task-kind','overdue');
 await page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name:'홈',exact:true}).click();await expect(page.locator('.saved-research[data-revisit-compact="true"] .saved-research-row')).toHaveCount(1);await noOverflow(page);
});

test('concurrent company completions both update the connected queue and preserve another date draft',async({page})=>{
 await page.goto('/#watch');await openActions(page,'AAPL');await openActions(page,'NVDA');await openActions(page,'MSFT');
 await row(page,'MSFT').getByLabel('다시 볼 날짜').fill('2026-11-03');
 await page.evaluate(()=>{
  for(const symbol of ['AAPL','NVDA'])document.querySelector(`[data-research-task-symbol="${symbol}"] [data-research-task-action="complete"]`).click();
 });
 for(const symbol of ['AAPL','NVDA']){
  await expect(row(page,symbol)).toHaveAttribute('data-research-task-kind','completed');await expect(row(page,symbol).getByRole('button',{name:'완료 취소',exact:true})).toBeEnabled();
 }
 await expect(row(page,'MSFT').getByLabel('다시 볼 날짜')).toHaveValue('2026-11-03');await expect(row(page,'MSFT').locator('details')).toHaveAttribute('open','');await noOverflow(page);
});

test('an unseen changed question must be shown before completion can acknowledge it',async({page})=>{
 await page.goto('/#watch');await openActions(page,'AAPL');
 await page.evaluate(noteKey=>{const value=JSON.parse(localStorage.getItem(noteKey));value.AAPL.question='화면을 그린 뒤 저장한 새 질문';localStorage.setItem(noteKey,JSON.stringify(value));},noteKey);
 await row(page,'AAPL').getByRole('button',{name:'확인 완료',exact:true}).click();
 await expect(row(page,'AAPL').locator('[data-research-task-notice]')).toContainText('변경됐어요');await expect(row(page,'AAPL')).toContainText('화면을 그린 뒤 저장한 새 질문');
 expect(await page.evaluate(taskKey=>localStorage.getItem(taskKey),taskKey)).toBeNull();
 await row(page,'AAPL').getByRole('button',{name:'확인 완료',exact:true}).click();await expect(row(page,'AAPL')).toHaveAttribute('data-research-task-kind','completed');await noOverflow(page);
});

test('failed completion keeps input and permits retry; corrupted task map stays intact',async({page})=>{
 await page.goto('/#watch');await openActions(page,'NVDA');
 await page.evaluate(taskKey=>{const original=Storage.prototype.setItem;window.__restoreTaskWrite=()=>{Storage.prototype.setItem=original;};Storage.prototype.setItem=function(key,value){if(key===taskKey)throw Error('확인 기록 저장 실패');return original.call(this,key,value);};},taskKey);
 await row(page,'NVDA').getByRole('button',{name:'확인 완료',exact:true}).click();await expect(row(page,'NVDA').locator('[data-research-task-notice]')).toContainText('저장 실패');await expect(row(page,'NVDA')).toHaveAttribute('data-research-task-kind','today');
 await page.evaluate(()=>window.__restoreTaskWrite());await row(page,'NVDA').getByRole('button',{name:'확인 완료',exact:true}).click();await expect(row(page,'NVDA')).toHaveAttribute('data-research-task-kind','completed');
 await page.evaluate(taskKey=>localStorage.setItem(taskKey,'{broken'),taskKey);await page.reload();await expect(queue(page)).toContainText('확인 기록을 읽지 못했어요');await openActions(page,'NVDA');await expect(row(page,'NVDA').getByRole('button',{name:'확인 완료',exact:true})).toBeDisabled();expect(await page.evaluate(taskKey=>localStorage.getItem(taskKey),taskKey)).toBe('{broken');await noOverflow(page);
});
