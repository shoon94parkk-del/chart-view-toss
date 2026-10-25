import {test,expect,noOverflow,touchable} from './fixtures.mjs';
import {commonArticle,summary} from '../fixtures/moneytoring-ux.mjs';

test.use({storedLists:{watchlist:[{symbol:'005930.KS',name:'삼성전자'},{symbol:'NVDA',name:'엔비디아'}],selected:['005930.KS']}});
const articles=Array.from({length:25},(_,index)=>({...commonArticle,url:`https://example.com/progressive-${index}`,title:`먼저 준비된 기사 ${index}`,source:'공시뉴스',score:100-index}));
const late={...commonArticle,symbol:'NVDA',name:'엔비디아',url:'https://example.com/progressive-late',title:'나중에 준비된 주요 기사',source:'공시뉴스',score:200};
const groups=(pending=false)=>[{symbol:'005930.KS',name:'삼성전자',status:'success',items:articles},{symbol:'NVDA',name:'엔비디아',status:pending?'pending':'success',items:pending?[]:[late]}];

const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const normalNewsResponse=response=>{const url=new URL(response.url());return url.pathname.replace(/^\/backend/,'')==='/api/personalized-news' && !url.searchParams.has('delivery');};

async function holdPending(qa) {
 const requests=[],ready=deferred(),released=deferred(),delivered=deferred(),finalResponse=deferred();
 qa.overrides.set('/api/news-summary',route=>route.fulfill({json:summary}));
 qa.overrides.set('/api/personalized-news',async(route,url)=>{
  requests.push(url);
  if(!url.searchParams.has('delivery')) {
   try{await route.fulfill({json:{groups:groups(),items:[late,...articles],errors:[]}});finalResponse.resolve({status:'fulfilled'});}
   catch(error){finalResponse.resolve({status:'rejected',error});throw error;}
   return;
  }
  if(url.searchParams.get('tickers')==='NVDA') {
   ready.resolve();await released.promise;
   try{await route.fulfill({json:{groups:[groups()[1]],items:[late],errors:[],complete:true,pendingSymbols:[]}});delivered.resolve({status:'fulfilled'});}
   catch(error){delivered.resolve({status:'rejected',error});throw error;}
   return;
  }
  return route.fulfill({json:{groups:groups(true),items:articles,errors:[],complete:false,pendingSymbols:['NVDA']}});
 });
 return {requests,ready:ready.promise,finalResponse:finalResponse.promise,release:async()=>{
  await ready.promise;released.resolve();
  const outcome=await delivered.promise;if(outcome.status==='rejected')throw outcome.error;
 }};
}

test('first available articles remain usable before a held group, preserve local reader state and finish with authoritative ordering',async({page,qa})=>{
 const held=await holdPending(qa);await page.goto('/#news');
 const cards=page.locator('[data-news-reader-card]');await expect(cards).toHaveCount(12);await expect(page.locator('[data-news-pending]')).toContainText('1개 종목');await held.ready;
 expect(held.requests).toHaveLength(2);expect(held.requests[1].searchParams.get('tickers')).toBe('NVDA');expect(held.requests[1].searchParams.get('names')).toBe('엔비디아');expect(held.requests.some(url=>url.searchParams.has('force'))).toBe(false);
 expect(qa.calls.filter(call=>call.path==='/api/news-summary')).toHaveLength(0);
 await page.locator('[data-news-source="공시뉴스"]').click();await page.locator('[data-news-more]').click();await expect(cards).toHaveCount(24);
 const existing=cards.filter({hasText:'먼저 준비된 기사 0'});await existing.locator('[data-news-summary-toggle]').click();await expect(existing.locator('[data-news-summary-toggle]')).toHaveAttribute('aria-expanded','true');await expect(existing).toContainText(summary.summary);expect(qa.calls.filter(call=>call.path==='/api/news-summary')).toHaveLength(1);
 const source=page.locator('[data-news-source="공시뉴스"]');await source.focus();await held.release();expect((await held.finalResponse).status).toBe('fulfilled');
 await expect(cards.first()).toContainText(late.title);await expect(cards).toHaveCount(24);await expect(source).toHaveAttribute('aria-pressed','true');await expect(source).toBeFocused();await expect(existing.locator('[data-news-summary-toggle]')).toHaveAttribute('aria-expanded','true');await expect(page.locator('[data-news-pending]')).toHaveCount(0);await expect(page.locator('#news-list')).not.toContainText('일부 종목의 뉴스를 불러오지 못했어요');
 expect(held.requests).toHaveLength(3);expect(held.requests[2].searchParams.has('delivery')).toBe(false);expect(qa.calls.filter(call=>call.path==='/api/news-summary')).toHaveLength(1);await noOverflow(page);
});

test('a final news update held between pointer down and up preserves the clicked summary control',async({page,qa})=>{
 const held=await holdPending(qa);await page.goto('/#news');const cards=page.locator('[data-news-reader-card]');await expect(cards.first()).toContainText('먼저 준비된 기사 0');await held.ready;expect(held.requests).toHaveLength(2);expect(qa.calls.filter(call=>call.path==='/api/news-summary')).toHaveLength(0);
 const control=cards.first().locator('[data-news-summary-toggle]');await touchable(control);const bounds=await control.boundingBox();await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();
 const responsePromise=page.waitForResponse(normalNewsResponse);
 await held.release();expect((await held.finalResponse).status).toBe('fulfilled');expect(held.requests).toHaveLength(3);
 const response=await responsePromise;expect(response.ok()).toBe(true);expect(await response.finished()).toBeNull();
 // Let the browser consume the completed body and attempt its deferred paint
 // while the pointer is still held, then verify the original control survives.
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect(cards.first()).toContainText('먼저 준비된 기사 0');expect(qa.calls.filter(call=>call.path==='/api/news-summary')).toHaveLength(0);await page.mouse.up();
 await expect(cards.first()).toContainText(late.title);await expect(cards.filter({hasText:'먼저 준비된 기사 0'}).locator('[data-news-summary-toggle]')).toHaveAttribute('aria-expanded','true');await expect(cards.filter({hasText:'먼저 준비된 기사 0'})).toContainText(summary.summary);await expect(page.locator('[data-news-pending]')).toHaveCount(0);await expect(page.locator('#news-list')).not.toContainText('일부 종목의 뉴스를 불러오지 못했어요');expect(qa.calls.filter(call=>call.path==='/api/news-summary')).toHaveLength(1);await noOverflow(page);
});

test('leaving news while the remaining request is held prevents late rows from replacing the next screen',async({page,qa})=>{
 const held=await holdPending(qa);await page.goto('/#news');await expect(page.locator('[data-news-pending]')).toBeVisible();await held.ready;await page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name:'분석',exact:true}).click();await held.release();
 await expect(page.locator('.more-intro')).toBeVisible();await expect(page.locator('[data-news-reader-card]')).toHaveCount(0);expect(held.requests).toHaveLength(2);
});

test('a completed partial news visit survives offline Back with its canonical articles and no extra HTTP',async({page,qa})=>{
 const held=await holdPending(qa);await page.goto('/#news');const cards=page.locator('[data-news-reader-card]');await expect(cards).toHaveCount(12);await expect(page.locator('[data-news-pending]')).toContainText('1개 종목');await held.ready;
 expect(held.requests).toHaveLength(2);await page.locator('[data-news-source="공시뉴스"]').click();await page.locator('[data-news-more]').click();await expect(cards).toHaveCount(24);
 await held.release();expect((await held.finalResponse).status).toBe('fulfilled');await expect(cards.first()).toContainText(late.title);await expect(page.locator('[data-news-pending]')).toHaveCount(0);await expect(cards).toHaveCount(24);expect(held.requests).toHaveLength(3);
 const before=await cards.evaluateAll(rows=>rows.map(row=>row.dataset.newsReaderCard));expect(qa.calls.filter(call=>call.path==='/api/news-summary')).toHaveLength(0);
 await page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name:'분석',exact:true}).click();await expect(page.locator('.more-intro')).toBeVisible();
 await page.context().setOffline(true);
 try {
  expect(await page.evaluate(()=>navigator.onLine)).toBe(false);await page.goBack();await expect(page).toHaveURL(/#news$/);await expect(cards).toHaveCount(24);await expect(cards.first()).toContainText(late.title);await expect(page.locator('[data-news-source="공시뉴스"]')).toHaveAttribute('aria-pressed','true');
  expect(await cards.evaluateAll(rows=>rows.map(row=>row.dataset.newsReaderCard))).toEqual(before);expect(held.requests).toHaveLength(3);expect(qa.calls.filter(call=>call.path==='/api/personalized-news')).toHaveLength(3);expect(qa.calls.filter(call=>call.path==='/api/news-summary')).toHaveLength(0);await expect(page.locator('[data-news-pending]')).toHaveCount(0);await expect(page.locator('#news-list')).not.toContainText('뉴스를 불러오지 못했어요');await noOverflow(page);
 } finally { await page.context().setOffline(false); }
});
