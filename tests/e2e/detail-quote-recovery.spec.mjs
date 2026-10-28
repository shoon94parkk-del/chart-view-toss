import {test,expect,noOverflow,touchable} from './fixtures.mjs';
import {quotes,symbol,screener} from './data.mjs';

const snapshotKey='chartview-home-fast-v1:snapshot';
const cached={...quotes[0],price:100000,change:3,asOf:'2026-10-06T06:30:00Z',sessionDate:'2026-10-06',source:'Dated cached close'};
const fresh={...quotes[0],price:104000,change:1,asOf:'2026-10-07T06:31:00Z',marketStatus:'OPEN',priceBasis:'regular_live',source:'Fresh quote recovery'};
const price=page=>page.locator('#detail-price .quote-main strong').first();
const change=page=>page.locator('#detail-price .quote-change strong');
const retry=page=>page.getByRole('button',{name:'시세 다시 시도',exact:true});
const freshCalls=qa=>qa.calls.filter(row=>row.path==='/api/quotes'&&row.query.includes('fresh=true'));
const otherCalls=qa=>qa.calls.filter(row=>!['/api/quotes','/api/activity'].includes(row.path));
async function prepare(page,context){
 await page.clock.install({time:new Date('2026-10-07T06:35:00Z')});
 await page.clock.pauseAt(new Date('2026-10-07T06:35:01Z'));
 await context.addInitScript(({key,rows})=>localStorage.setItem(key,JSON.stringify({savedAt:Date.now(),value:{heatmap:{results:rows}}})),{key:snapshotKey,rows:[cached,quotes[1]]});
}

test('cached CLOSE retains a quote retry through a slower screener and retry refreshes only the quote',async({page,context,qa},info)=>{
 await prepare(page,context);
 let releaseScreener,releaseQuote,attempts=0;
 qa.overrides.set('/static/data/screener.json',async route=>{
  await new Promise(resolve=>{releaseScreener=resolve;});
  return route.fulfill({json:screener});
 });
 qa.overrides.set('/api/quotes',async route=>{
  if(++attempts===1)return route.fulfill({status:503,json:{detail:'quote provider unavailable'}});
  await new Promise(resolve=>{releaseQuote=resolve;});
  return route.fulfill({json:{results:[{...fresh,marketStatus:'CLOSE'}]}});
 });
 await page.goto(`/#detail/${symbol}`);
 await expect(price(page)).toHaveText('100,000원');
 await expect(retry(page)).toBeVisible();
 await expect.poll(()=>Boolean(releaseScreener)).toBe(true);
 releaseScreener();
 await expect(page.locator('#detail-price .quote-provenance')).toContainText('스크리너 장마감 수집 종가');
 await expect(retry(page)).toBeVisible();
 await expect(page.locator('#detail-chart canvas').first()).toBeVisible();
 await expect(page.locator('#detail-metrics')).toContainText('12.3배');
 await expect(page.locator('#detail-news')).toContainText('삼성전자 실적 공시 확인');
 await expect(page.locator('#research-card-body .research-form')).toBeVisible();
 const canvas=await page.locator('#detail-chart canvas').first().elementHandle();
 const unrelated=otherCalls(qa).length;
 await touchable(retry(page));await noOverflow(page);
 await info.attach('cached-quote-retry',{body:await page.screenshot(),contentType:'image/png'});
 await retry(page).dblclick();
 await expect.poll(()=>Boolean(releaseQuote)).toBe(true);
 await expect(retry(page)).toBeDisabled();
 expect(freshCalls(qa)).toHaveLength(2);
 releaseQuote();
 await expect(price(page)).toHaveText('104,000원');
 await expect(retry(page)).toHaveCount(0);
 expect(await canvas.evaluate(el=>el.isConnected)).toBe(true);
 expect(otherCalls(qa)).toHaveLength(unrelated);
 expect(freshCalls(qa)).toHaveLength(2);
 await page.clock.runFor(5_001);
 expect(freshCalls(qa)).toHaveLength(2);
});

for(const [label,body] of [
 ['empty',{results:[]}],
 ['malformed',{results:[{...fresh,price:'unavailable',marketStatus:'CLOSE'}]}],
 ['malformed-boolean',{results:[{...fresh,price:true,marketStatus:'CLOSE'}]}],
 ['malformed-array',{results:[{...fresh,price:[104000],marketStatus:'CLOSE'}]}],
 ['different-symbol',{results:[{...fresh,ticker:'000660.KS',marketStatus:'CLOSE'}]}],
])test(`cached CLOSE keeps polling after a fresh ${label} quote and accepts the next valid result`,async({page,context,qa})=>{
 await prepare(page,context);
 let attempts=0;
 qa.overrides.set('/api/quotes',route=>route.fulfill({json:++attempts===1?body:{results:[{...fresh,marketStatus:'CLOSE'}]}}));
 await page.goto(`/#detail/${symbol}`);
 await expect(retry(page)).toBeVisible();
 await expect(price(page)).toHaveText('100,000원');
 await page.clock.runFor(5_001);
 await expect(price(page)).toHaveText('104,000원');
 await expect(retry(page)).toHaveCount(0);
 expect(freshCalls(qa)).toHaveLength(2);
 await noOverflow(page);
});

test('a later quote polling failure exposes a working retry without reloading optional Detail data',async({page,context,qa})=>{
 await prepare(page,context);
 let attempts=0;
 qa.overrides.set('/api/quotes',route=>++attempts===2?route.fulfill({status:503,json:{detail:'later quote failure'}}):route.fulfill({json:{results:[attempts===1?fresh:{...fresh,price:105000,asOf:'2026-10-07T06:32:00Z',marketStatus:'CLOSE'}]}}));
 await page.goto(`/#detail/${symbol}`);
 await expect(price(page)).toHaveText('104,000원');
 await expect(page.locator('#detail-chart canvas').first()).toBeVisible();
 await expect(page.locator('#detail-metrics')).toContainText('12.3배');
 await expect(page.locator('#detail-news')).toContainText('삼성전자 실적 공시 확인');
 const canvas=await page.locator('#detail-chart canvas').first().elementHandle();
 const unrelated=otherCalls(qa).length;
 await page.clock.runFor(5_001);
 await expect(retry(page)).toBeVisible();
 await expect(price(page)).toHaveText('104,000원');
 await retry(page).click();
 await expect(price(page)).toHaveText('105,000원');
 await expect(retry(page)).toHaveCount(0);
 expect(await canvas.evaluate(el=>el.isConnected)).toBe(true);
 expect(otherCalls(qa)).toHaveLength(unrelated);
 expect(freshCalls(qa)).toHaveLength(3);
});

test('a fresh valid Korean CLOSE quote stops polling',async({page,context,qa})=>{
 await prepare(page,context);
 qa.overrides.set('/api/quotes',route=>route.fulfill({json:{results:[{...fresh,marketStatus:'CLOSE'}]}}));
 await page.goto(`/#detail/${symbol}`);
 await expect(price(page)).toHaveText('104,000원');
 await page.clock.runFor(10_001);
 expect(freshCalls(qa)).toHaveLength(1);
 await expect(retry(page)).toHaveCount(0);
});

test('inherited or rejected stale CLOSE status cannot stop fresh quote polling',async({page,context,qa})=>{
 await prepare(page,context);
 let attempts=0;
 qa.overrides.set('/api/quotes',route=>{
  const rows=[{...fresh,marketStatus:undefined},{...fresh,price:105000,asOf:'2026-10-07T06:32:00Z'},{...fresh,price:103000,asOf:'2026-10-07T06:30:00Z',marketStatus:'CLOSE'},{...fresh,price:106000,asOf:'2026-10-07T06:33:00Z',marketStatus:'CLOSE'}];
  return route.fulfill({json:{results:[rows[Math.min(attempts++,3)]]}});
 });
 await page.goto(`/#detail/${symbol}`);
 await expect(price(page)).toHaveText('104,000원');
 await page.clock.runFor(5_001);
 await expect(price(page)).toHaveText('105,000원');
 const stale=page.waitForResponse(response=>response.url().includes('/api/quotes')&&response.url().includes('fresh=true'));
 await page.clock.runFor(5_001);
 await (await stale).finished();
 await expect(price(page)).toHaveText('105,000원');
 await page.clock.runFor(5_001);
 await expect(price(page)).toHaveText('106,000원');
 expect(freshCalls(qa)).toHaveLength(4);
 await expect(retry(page)).toHaveCount(0);
});

test('a quote resolved after leaving its Detail cannot update the current screen or saved snapshot',async({page,context,qa})=>{
 await prepare(page,context);
 let release;
 qa.overrides.set('/api/quotes',async(route,url)=>{
  if(url.searchParams.get('tickers')===symbol){await new Promise(resolve=>{release=resolve;});return route.fulfill({json:{results:[{...fresh,marketStatus:'CLOSE'}]}});}
  return route.fulfill({json:{results:[quotes[1]]}});
 });
 await page.goto(`/#detail/${symbol}`);
 await expect(price(page)).toHaveText('100,000원');
 await expect.poll(()=>Boolean(release)).toBe(true);
 await page.evaluate(()=>{location.hash='detail/000660.KS';});
 await expect(price(page)).toHaveText('276,500원');
 const settled=page.waitForResponse(response=>response.url().includes('/api/quotes')&&response.url().includes('005930.KS'));
 release();await settled;
 await expect(page.locator('#detail-name')).toHaveText('SK하이닉스');
 await expect(price(page)).toHaveText('276,500원');
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).value.heatmap.results.find(row=>row.ticker==='005930.KS').price,snapshotKey)).toBe(100000);
 await page.clock.runFor(5_001);
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).value.heatmap.results.find(row=>row.ticker==='005930.KS').price,snapshotKey)).toBe(100000);
 expect(freshCalls(qa)).toHaveLength(2);
});

test('integration a newer null daily change clears cached +3% while a genuine zero remains visible',async({page,context,qa})=>{
 await prepare(page,context);
 let attempts=0;
 qa.overrides.set('/api/quotes',route=>route.fulfill({json:{results:[{...fresh,change:++attempts===1?null:0,price:attempts===1?104000:105000,asOf:attempts===1?fresh.asOf:'2026-10-07T06:32:00Z'}]}}));
 await page.goto(`/#detail/${symbol}`);
 await expect(price(page)).toHaveText('104,000원');
 await expect(change(page)).toHaveText('확인 불가');
 await expect(page.locator('#detail-price')).not.toContainText('+3.00%');
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).value.heatmap.results.find(row=>row.ticker==='005930.KS').change,snapshotKey)).toBeNull();
 await page.clock.runFor(5_001);
 await expect(price(page)).toHaveText('105,000원');
 await expect(change(page)).toHaveText('0.00%');
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).value.heatmap.results.find(row=>row.ticker==='005930.KS').change,snapshotKey)).toBe(0);
 await noOverflow(page);
});
