import {test,expect,openHome,noOverflow,touchable} from './fixtures.mjs';
import {asOf,quotes,symbol} from './data.mjs';
import {clearLiveQuotes,rememberLiveQuotes,mergeRowsWithLive} from '../../src/liveQuoteStore.js';

test('integration 새 시세의 결측 등락은 홈·전체 지도·업종 목록에서 미제공, 실제 0은 보합으로 유지',async({page,qa})=>{
 const older=quotes.slice(0,2).map((row,index)=>({...row,change:index===0?3:0,changePercent:index===0?3:0,industry:'반도체 제조업',mainProducts:'DRAM NAND'}));
 const latest=older.map(row=>({...row,change:row.ticker===symbol?null:0,asOf:'2026-10-07T06:31:00Z'}));
 qa.overrides.set('/api/quotes',(route,url)=>{
  const tickers=(url.searchParams.get('tickers')||symbol).split(',');
  return route.fulfill({json:{results:[...latest,quotes[2]].filter(row=>tickers.includes(row.ticker))}});
 });
 qa.overrides.set('/api/home-snapshot',route=>route.fulfill({json:{generatedAt:asOf,heatmap:{results:older}}}));
 qa.overrides.set('/api/heatmap/full',route=>route.fulfill({json:{generatedAt:asOf,results:older,complete:true,refreshing:false}}));
 const response=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/quotes');
 await openHome(page);
 const raw=(await(await response).json()).results.find(row=>row.ticker===symbol);
 expect(raw.change).toBeNull();
 clearLiveQuotes();
 try{
  rememberLiveQuotes(older,{priority:20});rememberLiveQuotes([raw],{priority:40});
  const canonical=mergeRowsWithLive(older);
  expect(canonical.find(row=>row.ticker===symbol).change).toBeNull();
  expect(canonical.find(row=>row.ticker===symbol).marketCap).toBe(1e12);
 }finally{clearLiveQuotes();}
 const section=page.locator('#home-daily-heatmap-section');
 await section.scrollIntoViewIfNeeded();
 const homeMissing=section.locator(`.home-heatmap-cell[data-stock-detail="${symbol}"]`);
 const homeZero=section.locator('.home-heatmap-cell[data-stock-detail="000660.KS"]');
 await expect(homeMissing).toHaveAccessibleName(/삼성전자.*등락률 미제공/);
 await expect(homeMissing.locator('.home-heatmap-change')).toHaveText('—');
 await expect(homeMissing).toHaveClass(/home-hm-flat/);
 await expect(homeZero.locator('.home-heatmap-change')).toHaveText('0.00%');
 await noOverflow(page);
 const fullResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/heatmap/full');
 const openMap=section.getByRole('button',{name:'히트맵 보기',exact:true});
 await touchable(openMap);await openMap.click();
 const olderRaw=(await(await fullResponse).json()).results.find(row=>row.ticker===symbol);
 expect(olderRaw.change).toBe(3);expect(olderRaw.changePercent).toBe(3);
 const missing=page.locator(`.market-map-stock[data-stock-detail="${symbol}"]`);
 const zero=page.locator('.market-map-stock[data-stock-detail="000660.KS"]');
 await expect(page.locator('.market-map-stock')).toHaveCount(2);
 await expect(missing).toHaveAccessibleName(/삼성전자.*등락률 미제공/);
 await expect(missing.locator('span')).toHaveText('—');
 await expect(missing).toHaveClass(/map-flat/);
 await expect(zero.locator('span')).toHaveText('0.00%');
 const sector=page.getByRole('button',{name:'반도체 종목 목록',exact:true});
 await touchable(sector);await sector.click();
 const members=page.getByRole('region',{name:'선택한 업종 종목 목록'});
 const missingMember=members.locator(`[data-stock-detail="${symbol}"]`);
 await expect(missingMember).toContainText('103,700원');
 await expect(missingMember).toContainText('거래일 2026-10-07');
 await expect(missingMember.locator('b')).toHaveText('—');
 await expect(missingMember.locator('b')).toHaveAttribute('title','등락률 미제공');
 await expect(members.locator('[data-stock-detail="000660.KS"] b')).toHaveText('0.00%');
 await noOverflow(page);
});
