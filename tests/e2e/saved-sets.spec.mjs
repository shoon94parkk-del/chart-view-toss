import {test,expect,noOverflow,touchable} from './fixtures.mjs';
import {quotes,payloadFor} from './data.mjs';

const key='chartview-toss-saved-sets-v1';
const panel=(page,kind)=>page.locator(`[data-saved-sets="${kind}"]`);
async function openSets(page,kind){
 const box=panel(page,kind);await expect(box).toBeVisible();
 if(!await box.evaluate(el=>el.open))await box.locator(':scope > summary').click();
 return box;
}
async function saveSet(box,name){await box.locator('[name="setName"]').fill(name);await box.locator('[data-saved-set-save]').click();await expect(box.locator('[data-saved-set-name]').filter({hasText:name})).toBeVisible();}
const rowFor=(box,name)=>box.locator('[data-saved-set-id]').filter({has:box.page().locator('[data-saved-set-name]').filter({hasText:name})});

test('saved screen sets preserve filters through reload, inline rename/delete and detail Back',async({page})=>{
 await page.goto('/#discover');await expect(page.locator('.analysis-stock').first()).toBeVisible();
 await page.locator('.screener-advanced > summary').click();await page.locator('[name="query"]').fill('삼성전자');
 const box=await openSets(page,'screener');await touchable(box.locator('[data-saved-set-save]'));await saveSet(box,'삼성 검색');
 await page.locator('[name="query"]').fill('SK');await saveSet(box,'SK 검색');
 await expect(box.locator('[data-saved-set-id]')).toHaveCount(2);
 await rowFor(box,'삼성 검색').locator('[data-saved-set-rename]').click();
 await box.locator('[name="renameSet"]').fill('삼성 재점검');await box.locator('[data-saved-set-rename-confirm]').click();
 await expect(rowFor(box,'삼성 재점검')).toBeVisible();
 await page.reload();const restored=await openSets(page,'screener');await expect(restored.locator('[data-saved-set-id]')).toHaveCount(2);
 await rowFor(restored,'삼성 재점검').locator('[data-saved-set-apply]').click();
 await expect(rowFor(restored,'삼성 재점검').locator('[data-saved-set-apply]')).toBeFocused();
 await expect(page.locator('[name="query"]')).toHaveValue('삼성전자');await expect(page.locator('.analysis-stock')).toHaveCount(1);
 await page.locator('.analysis-stock').click();await expect(page.locator('#detail-name')).toHaveText('삼성전자');await page.goBack();
 await expect(page.locator('[name="query"]')).toHaveValue('삼성전자');await expect(page.locator('.analysis-stock')).toBeFocused();
 const back=await openSets(page,'screener');await rowFor(back,'SK 검색').locator('[data-saved-set-delete]').click();
 await expect(back.locator('[data-saved-set-id]')).toHaveCount(1);
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).sets[0].name,key)).toBe('삼성 재점검');
 await noOverflow(page);
});

test('saved comparisons apply selected stocks and custom period without changing interests',async({page,qa})=>{
 await page.goto('/#chart');await expect(page.locator('#chart-table-wrap')).toContainText('삼성전자');
 const watch=await page.evaluate(()=>localStorage.getItem('chartview-toss-watchlist-v1'));
 let box=await openSets(page,'comparison');await saveSet(box,'삼성 기본');
 await page.locator('#open-compare-selector').click();await page.locator('[data-selector-symbol="NVDA"]').click();
 await page.getByRole('button',{name:'2개 종목 적용',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.locator('#custom-range').locator('..').locator(':scope > summary').click();
 await page.locator('#custom-range [name="start"]').fill('2026-09-01');await page.locator('#custom-range [name="end"]').fill('2026-10-07');
 await page.locator('#custom-range button').click();await expect(page.locator('#chart-table-wrap')).toContainText(quotes.find(row=>row.ticker==='NVDA').name);
 box=await openSets(page,'comparison');await saveSet(box,'두 종목 기간');
 await page.reload();box=await openSets(page,'comparison');
 await rowFor(box,'두 종목 기간').locator('[data-saved-set-apply]').click();
 await expect(rowFor(box,'두 종목 기간').locator('[data-saved-set-apply]')).toBeFocused();
 await expect(page.locator('#chart-selected-summary')).toContainText(quotes.find(row=>row.ticker==='NVDA').name);
 await expect(page.locator('#custom-range [name="start"]')).toHaveValue('2026-09-01');
 await expect.poll(()=>qa.calls.some(call=>call.path==='/api/compare'&&new URLSearchParams(call.query).get('start')==='2026-09-01'&&new URLSearchParams(call.query).get('tickers')?.includes('NVDA'))).toBe(true);
 expect(await page.evaluate(()=>localStorage.getItem('chartview-toss-watchlist-v1'))).toBe(watch);
 await rowFor(box,'두 종목 기간').locator('[data-saved-set-rename]').click();await box.locator('[name="renameSet"]').fill('내 기간');await box.locator('[data-saved-set-rename-confirm]').click();
 await rowFor(box,'삼성 기본').locator('[data-saved-set-delete]').click();await expect(box.locator('[data-saved-set-id]')).toHaveCount(1);
 await noOverflow(page);
});

test('invalid screen input cannot silently save default conditions and failed writes retain the draft',async({page})=>{
 await page.goto('/#discover');await expect(page.locator('.analysis-stock').first()).toBeVisible();
 await page.locator('.screener-advanced > summary').click();await page.locator('.screener-extra > summary').click();
 await page.locator('[name="rsiMin"]').fill('70');await page.locator('[name="rsiMax"]').fill('30');
 const box=await openSets(page,'screener');await box.locator('[name="setName"]').fill('범위 수정');await box.locator('[data-saved-set-save]').click();
 await expect(box.locator('[data-saved-sets-status]')).toContainText('조건');await expect(box.locator('[data-saved-set-id]')).toHaveCount(0);
 await page.locator('[name="rsiMin"]').fill('0');
 await page.evaluate(key=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw Error('disk full');return original.call(this,k,v);};window.__restoreSetsStorage=()=>{Storage.prototype.setItem=original;};},key);
 await box.locator('[data-saved-set-save]').click();await expect(box.locator('[data-saved-sets-status]')).toContainText('저장');
 await expect(box.locator('[name="setName"]')).toHaveValue('범위 수정');await expect(box.locator('[data-saved-set-id]')).toHaveCount(0);
 await page.evaluate(()=>window.__restoreSetsStorage());await box.locator('[data-saved-set-save]').click();await expect(box.locator('[data-saved-set-id]')).toHaveCount(1);
 await rowFor(box,'범위 수정').locator('[data-saved-set-rename]').click();await box.locator('[name="renameSet"]').fill('다시 저장할 이름');
 await page.evaluate(key=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw Error('rename disk full');return original.call(this,k,v);};window.__restoreSetsStorage=()=>{Storage.prototype.setItem=original;};},key);
 await box.locator('[data-saved-set-rename-confirm]').click();await expect(box.locator('[data-saved-sets-status]')).toContainText('rename disk full');
 await expect(box.locator('[name="renameSet"]')).toHaveValue('다시 저장할 이름');await expect(box.locator('[data-saved-set-rename-confirm]')).toBeFocused();
 await page.evaluate(()=>window.__restoreSetsStorage());await box.locator('[data-saved-set-rename-confirm]').click();await expect(rowFor(box,'다시 저장할 이름')).toBeVisible();
});

test('corrupt saved sets display an error and preserve existing bytes',async({page})=>{
 await page.addInitScript(key=>localStorage.setItem(key,'{"version":99,"sets":[]}'),key);
 await page.goto('/#chart');const box=await openSets(page,'comparison');await expect(box.locator('[data-saved-sets-status]')).toContainText('읽지 못');
 await expect(box.locator('[data-saved-set-save]')).toBeDisabled();
 expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe('{"version":99,"sets":[]}');await noOverflow(page);
});

test('failed saved comparison clears prior stocks and reports failure only after its request settles',async({page,qa})=>{
 const saved={version:1,sets:[{id:'review-nvda',kind:'comparison',name:'엔비디아 1년',value:{selected:['NVDA'],period:'1y',customRange:null},savedAt:'2026-10-07T06:30:00.000Z',updatedAt:'2026-10-07T06:30:00.000Z'}]};
 await page.addInitScript(({key,saved})=>localStorage.setItem(key,JSON.stringify(saved)),{key,saved});
 let release;
 qa.overrides.set('/api/compare',async(route,url)=>{
  if(url.searchParams.get('tickers')==='NVDA'){await new Promise(resolve=>{release=resolve;});return route.fulfill({status:503,json:{detail:'unavailable'}});}
  return route.fulfill({json:payloadFor(url)});
 });
 await page.goto('/#chart');await expect(page.locator('#chart-table-wrap')).toContainText('삼성전자');
 const box=await openSets(page,'comparison');await rowFor(box,'엔비디아 1년').locator('[data-saved-set-apply]').click();
 await expect.poll(()=>Boolean(release)).toBe(true);
 try{
  await expect(box.locator('[data-saved-sets-status]')).not.toContainText('적용했어요');
  await expect(page.locator('#chart-selected-summary')).toContainText('엔비디아');
  await expect(page.locator('#chart-table-wrap')).not.toContainText('삼성전자');
  await expect(page.locator('#chart-canvas canvas')).toHaveCount(0);
  await page.locator('#custom-range').locator('..').locator(':scope > summary').click();
  await page.locator('#custom-range [name="start"]').focus();
 }finally{release();}
 await expect(page.locator('#retry-chart')).toBeVisible();await expect(box.locator('[data-saved-sets-status]')).toContainText('불러오지 못');
 await expect(page.locator('.app-toast')).not.toContainText('적용했어요');
 await expect(page.locator('#custom-range [name="start"]')).toBeFocused();
 await expect(page.locator('#chart-table-wrap')).not.toContainText('삼성전자');await expect(page.locator('#chart-legend')).not.toContainText('삼성전자');
 await expect(page.locator('[data-period="1y"]')).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('chartview-toss-selected-v1')))).toEqual(['NVDA']);
 qa.overrides.delete('/api/compare');await page.locator('#retry-chart').click();await expect(page.locator('#chart-table-wrap')).toContainText('엔비디아');await noOverflow(page);
});
