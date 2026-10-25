import {test,expect,noOverflow,touchable} from './fixtures.mjs';
import {commonArticle} from '../fixtures/moneytoring-ux.mjs';

const evidenceKey='chartview-toss-research-evidence-v1';
const article={...commonArticle,title:'삼성전자와 엔비디아 원문 조사',publishedAt:'2026-10-07'};
const sharedPayload={items:[article],groups:[{symbol:'NVDA',name:'엔비디아',items:[{...article,symbol:'NVDA',name:'엔비디아',relationType:'related'}]}]};
const expectEvidenceArrival=async(page,{symbol,memo})=>{
 const target=page.locator('#detail-research-evidence');
 await expect(page).toHaveURL(new RegExp(`#detail/${symbol.replaceAll('.','\\.')}`));
 await expect(target).toContainText(memo);
 await expect(page.locator('#detail-price .quote-main')).toBeVisible();
 await expect(page.locator('#detail-metrics .detail-metric').first()).toBeVisible();
 await expect(page.locator('#detail-chart-loading')).toHaveCount(0);
 await expect(page.locator('#detail-news')).toContainText(article.title);
 if(symbol==='005930.KS'){
  await expect(page.locator('#research-question')).toBeVisible();
  await expect(page.locator('#detail-financial-history .financial-history')).toBeVisible();
  await expect(page.locator('#detail-financial-quarters .loading-indicator')).toHaveCount(0);
 }
 // Wait for layout and the application's smooth jump to settle without moving focus or scrolling in the test.
 await target.evaluate(element=>new Promise((resolve,reject)=>{
  let previous='',stable=0;
  const timeout=setTimeout(()=>reject(Error('Detail evidence arrival did not settle')),2500);
  const frame=()=>{
   const bounds=element.getBoundingClientRect();
   const current=[scrollY,bounds.top,bounds.height].map(value=>Math.round(value)).join(':');
   stable=current===previous?stable+1:0;previous=current;
   if(stable>=6){clearTimeout(timeout);resolve();}else requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
 }));
 await expect(target).toBeFocused();
 await expect(target).toBeInViewport({ratio:.5});
 const heading=target.locator('[data-research-evidence] > summary');
 const geometry=await heading.evaluate(element=>{
  const bounds=element.getBoundingClientRect();
  const hit=document.elementFromPoint(bounds.left+bounds.width/2,bounds.top+bounds.height/2);
  return {top:bounds.top,bottom:bounds.bottom,usableBottom:document.querySelector('.bottom-nav')?.getBoundingClientRect().top??innerHeight,reachable:hit===element||element.contains(hit)};
 });
 expect(geometry.top,'saved evidence heading remains inside the viewport after lazy detail layout settles').toBeGreaterThanOrEqual(0);
 expect(geometry.bottom,'saved evidence heading stays above the fixed navigation').toBeLessThanOrEqual(geometry.usableBottom);
 expect(geometry.reachable,'saved evidence heading is not covered by sticky navigation').toBe(true);
};
const openEditor=async page=>{
 await page.locator('[data-news-save-evidence]').first().click();
 await expect(page.locator('[data-evidence-editor]')).toBeVisible();
};
const saveEvidence=async(page,symbol,memo)=>{
 const form=page.locator('[data-evidence-editor]');
 await form.locator('[name="symbol"]').selectOption(symbol);
 await form.locator('[name="memo"]').fill(memo);
 await form.locator('[data-evidence-save]').click();
 await expect(page.locator('[data-evidence-editor-status]')).toContainText(/저장했어요|이미 저장/);
};

test('loaded news paginates without transport and keeps the visible count through a stock detail return',async({page,qa},info)=>{
 const items=Array.from({length:31},(_,i)=>({...commonArticle,url:`https://example.com/pagination-${i}`,title:`조사 기사 ${i}`,score:100-i,publishedTs:i,source:i%2?'경제':'공시뉴스'}));
 qa.overrides.set('/api/personalized-news',route=>route.fulfill({json:{items}}));
 await page.goto('/#news');
 const cards=page.locator('[data-news-reader-card]');await expect(cards).toHaveCount(12);
 const count=qa.calls.filter(call=>call.path==='/api/personalized-news').length;
 await touchable(page.locator('[data-news-more]'));await page.locator('[data-news-more]').click();await expect(cards).toHaveCount(24);
 expect(qa.calls.filter(call=>call.path==='/api/personalized-news')).toHaveLength(count);
 expect(qa.calls.filter(call=>call.path==='/api/news-summary')).toHaveLength(0);
 await cards.first().locator('[data-news-reader-stock="005930.KS"]').click();await expect(page.locator('#detail-price')).toContainText('103,700');
 await page.goBack();await expect(cards).toHaveCount(24);
 await page.locator('[data-news-sort="latest"]').click();await expect(cards).toHaveCount(12);
 await page.locator('[data-news-more]').click();await expect(cards).toHaveCount(24);
 await page.locator('[data-news-source="공시뉴스"]').click();await expect(cards).toHaveCount(12);
 await page.locator('[data-news-more]').click();await expect(cards).toHaveCount(16);await expect(page.locator('[data-news-more]')).toHaveCount(0);
 expect(qa.calls.filter(call=>call.path==='/api/news-summary')).toHaveLength(0);
 await noOverflow(page);await page.screenshot({path:info.outputPath('news-pagination.png'),fullPage:true});
});

test('explicit KR and US evidence saves survive reload, preserve research questions, and support memo edit/delete from detail and Watch',async({page,qa},info)=>{
 qa.overrides.set('/api/personalized-news',route=>route.fulfill({json:sharedPayload}));
 await page.goto('/#news');
 const questionRaw=JSON.stringify({'005930.KS':{question:'원래 공시 질문',createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-02T00:00:00Z',support:'기존 원문 출처'}});
 await page.evaluate(raw=>localStorage.setItem('chartview-toss-research-v1',raw),questionRaw);
 await openEditor(page);const form=page.locator('[data-evidence-editor]');await expect(form.locator('[name="symbol"]')).toHaveValue('');
 await expect(form.locator('option')).toHaveCount(3);await touchable(form.locator('[name="symbol"]'));
 await saveEvidence(page,'005930.KS','한국 원문을 다음 분기에 확인');
 await saveEvidence(page,'005930.KS','중복 저장으로 덮어쓰면 안 되는 메모');await expect(page.locator('[data-evidence-editor-status]')).toContainText('이미 저장');
 await saveEvidence(page,'NVDA','미국 원문 메모 <script>');
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),evidenceKey);
 expect(saved.rows).toHaveLength(2);expect(saved.rows.find(row=>row.symbol==='005930.KS').memo).toBe('한국 원문을 다음 분기에 확인');
 expect(saved.rows[0].publishedAt).toBe('2026-10-07');
 expect(await page.evaluate(()=>localStorage.getItem('chartview-toss-research-v1'))).toBe(questionRaw);
 await page.goto('/#detail/NVDA');const evidence=page.locator('#detail-research-evidence');await expect(evidence).toContainText('미국 원문 메모 <script>');await expect(evidence).toContainText('시각 미제공');
 await touchable(evidence.locator('[data-evidence-original]'));await touchable(evidence.locator('[data-evidence-edit]'));
 await evidence.locator('[data-evidence-edit]').click();await evidence.locator('[name="memo"]').fill('새 미국 메모');await evidence.locator('[data-evidence-memo-save]').click();await expect(evidence.locator('.research-evidence-memo')).toHaveText('새 미국 메모');
 await page.reload();await expect(page.locator('#detail-research-evidence .research-evidence-memo')).toHaveText('새 미국 메모');
 await page.goto('/#watch');const watch=page.locator('#watch-research-evidence');await expect(watch.locator('[data-evidence-stock]')).toHaveCount(2);await expect(watch).not.toContainText('새 미국 메모');
 await watch.getByRole('button',{name:/^삼성전자 · 1개/}).click();
 await expectEvidenceArrival(page,{symbol:'005930.KS',memo:'한국 원문을 다음 분기에 확인'});
 await expect(page.locator('#research-question')).toHaveValue('원래 공시 질문');
 await page.goto('/#watch');await expect(watch.locator('[data-evidence-stock]')).toHaveCount(2);
 await watch.getByRole('button',{name:/^엔비디아 · 1개/}).click();
 await expectEvidenceArrival(page,{symbol:'NVDA',memo:'새 미국 메모'});
 await noOverflow(page);await page.screenshot({path:info.outputPath('us-evidence-detail.png'),fullPage:true});
 await page.locator('#detail-research-evidence [data-evidence-delete]').click();await expect(page.locator('#detail-research-evidence')).toContainText('아직 저장한 조사 근거가 없어요');
 await page.reload();await expect(page.locator('#detail-research-evidence [data-evidence-row]')).toHaveCount(0);
 const remaining=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).rows,evidenceKey);expect(remaining).toHaveLength(1);expect(remaining[0].symbol).toBe('005930.KS');
 expect(qa.calls.some(call=>call.query.includes('새 미국 메모')||call.query.includes('한국 원문'))).toBe(false);
});

test('evidence quota failure keeps the editor draft and retry confirms persistence',async({page,qa})=>{
 qa.overrides.set('/api/personalized-news',route=>route.fulfill({json:sharedPayload}));await page.goto('/#news');await openEditor(page);
 await page.evaluate(key=>{const original=Storage.prototype.setItem;window.evidenceWriteBlocked=true;Storage.prototype.setItem=function(k,v){if(k===key&&window.evidenceWriteBlocked)throw Error('저장 공간 부족');return original.call(this,k,v);};},evidenceKey);
 const form=page.locator('[data-evidence-editor]');await form.locator('[name="symbol"]').selectOption('NVDA');await form.locator('[name="memo"]').fill('실패 후에도 유지할 메모');await form.locator('[data-evidence-save]').click();
 await expect(page.locator('[data-evidence-editor-status]')).toContainText('저장 공간 부족');await expect(form.locator('[name="memo"]')).toHaveValue('실패 후에도 유지할 메모');
 expect(await page.evaluate(key=>localStorage.getItem(key),evidenceKey)).toBeNull();
 await page.evaluate(()=>{window.evidenceWriteBlocked=false;});await form.locator('[data-evidence-save]').click();await expect(page.locator('[data-evidence-editor-status]')).toContainText('저장했어요');
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).rows[0].memo,evidenceKey)).toBe('실패 후에도 유지할 메모');await noOverflow(page);
});

test('corrupt saved evidence remains intact and warns on detail and attempted news save',async({page,qa})=>{
 qa.overrides.set('/api/personalized-news',route=>route.fulfill({json:sharedPayload}));await page.goto('/#news');
 const damaged=JSON.stringify({version:1,rows:[{id:'malicious',symbol:'NVDA',url:'https://user:secret@example.com/article',title:'<img src=x onerror=alert(1)>',sources:['매체'],publishedAt:'2026-10-07',savedAt:'2026-10-07T00:00:00Z',memo:''}]});
 await page.evaluate(({key,damaged})=>localStorage.setItem(key,damaged),{key:evidenceKey,damaged});await page.goto('/#detail/NVDA');
 await expect(page.locator('#detail-research-evidence [role="alert"]')).toContainText('덮어쓰지 않았어요');await expect(page.locator('#detail-research-evidence img')).toHaveCount(0);
 await page.goto('/#news');await openEditor(page);const form=page.locator('[data-evidence-editor]');await form.locator('[name="symbol"]').selectOption('NVDA');await form.locator('[data-evidence-save]').click();
 await expect(page.locator('[data-evidence-editor-status]')).toContainText('덮어쓰지 않았어요');expect(await page.evaluate(key=>localStorage.getItem(key),evidenceKey)).toBe(damaged);await noOverflow(page);
});
