import {test,expect,noOverflow} from './fixtures.mjs';
import {quotes} from './data.mjs';

test('fast canonical watch quotes appear while another stock is held, without replacing focused row controls',async({page,qa})=>{
 let release;const gate=new Promise(r=>release=r);
 qa.overrides.set('/api/quotes',async(route,url)=>{const tickers=(url.searchParams.get('tickers')||'').split(',');if(tickers.includes('NVDA'))await gate;await route.fulfill({json:{results:quotes.filter(row=>tickers.includes(row.ticker))}});});
 try{
  await page.goto('/#watch');const samsung=page.locator('#watch-rich-list [data-stock-detail="005930.KS"]');await expect(samsung.locator('.watch-card-price strong')).toHaveText('103,700원',{timeout:3500});
  await expect(page.locator('#watch-rich-list')).toHaveAttribute('data-load-state','loading');await samsung.focus();
  await page.evaluate(()=>{window.__watchFocusNode=document.activeElement;});release();
  await expect(page.locator('#watch-rich-list [data-stock-detail="NVDA"] .watch-card-price strong')).toHaveText('$183.42');await expect(page.locator('#watch-rich-list')).toHaveAttribute('data-load-state','ready');
  expect(await page.evaluate(()=>document.activeElement===window.__watchFocusNode)).toBe(true);await noOverflow(page);
 }finally{release();}
});

test('one failed quote preserves successful stocks and exposes a retry after pending work ends',async({page,qa})=>{
 qa.overrides.set('/api/quotes',async(route,url)=>{const tickers=(url.searchParams.get('tickers')||'').split(',');return tickers.includes('NVDA')?route.fulfill({status:503,json:{detail:'temporary'}}):route.fulfill({json:{results:quotes.filter(row=>tickers.includes(row.ticker))}});});
 await page.goto('/#watch');await expect(page.locator('#watch-rich-list [data-stock-detail="005930.KS"] .watch-card-price strong')).toHaveText('103,700원');await expect(page.locator('#watch-rich-list')).toHaveAttribute('data-load-state','error');await expect(page.locator('#retry-watch')).toBeVisible();await noOverflow(page);
});

test('a held watch click survives late terminal quotes and keeps the stock navigation',async({page,qa})=>{
 let release;const gate=new Promise(r=>release=r);
 qa.overrides.set('/api/quotes',async(route,url)=>{const tickers=(url.searchParams.get('tickers')||'').split(',');if(tickers.includes('NVDA'))await gate;return route.fulfill({json:{results:quotes.filter(row=>tickers.includes(row.ticker))}});});
 try{
  await page.goto('/#watch');const samsung=page.locator('#watch-rich-list [data-stock-detail="005930.KS"]');await expect(samsung.locator('.watch-card-price strong')).toHaveText('103,700원');await samsung.scrollIntoViewIfNeeded();const rect=await samsung.boundingBox();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();
  const incoming=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/quotes'&&new URL(r.url()).searchParams.get('tickers')==='NVDA');release();await (await incoming).finished();await page.evaluate(()=>new Promise(requestAnimationFrame));
  await expect(page.locator('#watch-rich-list')).toHaveAttribute('data-load-state','loading');await page.mouse.up();await expect(page).toHaveURL(/#detail\/005930.KS/);await expect(page.locator('#detail-name')).toHaveText('삼성전자');
 }finally{release();}
});

test('an explicit retry bypasses only cached HTTP200 failed symbols and preserves successful quote caches',async({page,qa})=>{
 let recovered=false;
 qa.overrides.set('/api/quotes',async(route,url)=>{
  const tickers=(url.searchParams.get('tickers')||'').split(',');
  if(tickers.includes('NVDA')&&!recovered)return route.fulfill({json:{results:[],errors:[{ticker:'NVDA',message:'temporarily unavailable'}]}});
  return route.fulfill({json:{results:quotes.filter(row=>tickers.includes(row.ticker)),errors:[]}});
 });
 const calls=()=>qa.calls.filter(call=>call.path==='/api/quotes');
 await page.goto('/#watch');await expect(page.locator('#watch-rich-list')).toHaveAttribute('data-load-state','error');
 await expect(page.locator('[data-stock-detail="005930.KS"] .watch-card-price strong')).toHaveText('103,700원');
 const before=[...calls()];expect(before.filter(call=>new URLSearchParams(call.query).get('tickers')==='NVDA')).toHaveLength(1);
 recovered=true;await page.locator('#retry-watch').click();
 await expect(page.locator('[data-stock-detail="NVDA"] .watch-card-price strong')).toHaveText('$183.42');await expect(page.locator('#watch-rich-list')).toHaveAttribute('data-load-state','ready');
 const extra=calls().slice(before.length);expect(extra).toHaveLength(1);expect(new URLSearchParams(extra[0].query).get('tickers')).toBe('NVDA');expect(new URLSearchParams(extra[0].query).has('fresh')).toBe(false);
 for(const row of quotes.filter(row=>row.ticker!=='NVDA'))expect(calls().filter(call=>new URLSearchParams(call.query).get('tickers')===row.ticker)).toHaveLength(before.filter(call=>new URLSearchParams(call.query).get('tickers')===row.ticker).length);
 await noOverflow(page);
});
