import {test,expect,noOverflow,touchable} from './fixtures.mjs';
import {quotes,asOf} from './data.mjs';

const us=Array.from({length:40},(_,i)=>({...quotes[2],ticker:i?'US'+i:'NVDA',name:i?'미국 기업 '+i:'엔비디아',price:183.42+i,change:i/10,marketCap:1e12-i*1e9,sector:'Technology'}));
const full={generatedAt:asOf,results:[...quotes.slice(0,2),...us],complete:true,refreshing:false};
const saved={...full,source:'canonical-provider-full-heatmap',snapshotVersion:1,snapshotCapturedAt:'2026-10-07T06:34:00Z',counts:{KR:20,US:40},results:[...Array.from({length:20},(_,i)=>({...quotes[0],ticker:`${String(200000+i).padStart(6,'0')}.KS`,name:'한국 기업 '+i})),...us].map(row=>({...row,quoteBasis:'provider-canonical'}))};

for(const order of ['snapshot-first','API-first'])test(`US 첫방문 ${order}: 검증된60행스냅샷→처리→40타일, live17새가격보존`,async({page,qa})=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});
 qa.overrides.set('/static/data/full_heatmap_snapshot.json',async route=>{if(order==='API-first')await gate;return route.fulfill({json:saved});});
 qa.overrides.set('/api/heatmap/full',async route=>{if(order==='snapshot-first')await gate;return route.fulfill({json:{...full,complete:false,refreshing:true,results:us.slice(0,17).map(row=>({...row,price:row.price+3,asOf:'2026-10-07T06:31:00Z'}))}});});
 await page.goto('/#heatmap');await page.getByRole('button',{name:'미국',exact:true}).click();
 const tiles=page.locator('.market-map-stock');
 await expect(tiles).toHaveCount(order==='snapshot-first'?40:17);
 if(order==='snapshot-first')await expect(page.locator('[data-heatmap-progress]')).toContainText('이전 수집 시세 40종목');
 release();
 await expect(tiles).toHaveCount(40);await expect(page.locator('[data-heatmap-progress]')).toContainText('17 / 40종목 응답');
 const payload=await page.evaluate(()=>JSON.parse(localStorage.getItem('chartview-home-fast-v1:full-heatmap')).value);
 expect(payload.results.find(row=>row.ticker==='NVDA').price).toBe(186.42);
 expect(payload.results.find(row=>row.ticker==='NVDA').asOf).toBe('2026-10-07T06:31:00Z');
 expect(payload.results.find(row=>row.ticker==='US39').price).toBe(saved.results.find(row=>row.ticker==='US39').price);
 expect(payload.results.find(row=>row.ticker==='US39').asOf).toBe(saved.results.find(row=>row.ticker==='US39').asOf);
 expect(payload.results.find(row=>row.ticker==='US39').stale).toBe(true);
 await noOverflow(page);
});

test('US 히트맵: 저장40→응답17→21에서도40유지, 실제 시세·기준일·진행수 구분',async({page,qa})=>{
 await page.addInitScript(value=>localStorage.setItem('chartview-home-fast-v1:full-heatmap',JSON.stringify({savedAt:Date.now(),value})),full);
 let count=17;
 qa.overrides.set('/api/heatmap/full',route=>route.fulfill({json:{...full,complete:count===40,refreshing:count!==40,results:[...quotes.slice(0,2),...us.slice(0,count).map(row=>({...row,price:row.price+3,change:row.change+1,asOf:'2026-10-07T06:31:00Z'}))]}}));
 await page.goto('/#heatmap');
 const market=page.getByRole('group',{name:'히트맵 시장'}).getByRole('button',{name:'미국',exact:true});
 await touchable(market);await market.click();
 const tiles=page.locator('.market-map-stock');
 await expect(tiles).toHaveCount(40);
 await expect(page.locator('[data-heatmap-progress]')).toContainText('17 / 40종목 응답');
 await expect(page.locator('[data-heatmap-progress]')).toContainText('이전 시세 23종목 유지');
 const cached=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('chartview-home-fast-v1:full-heatmap')).value);
 expect((await cached()).results.filter(row=>row.market==='US')).toHaveLength(40);
 expect((await cached()).results.find(row=>row.ticker==='NVDA').price).toBe(186.42);
 expect((await cached()).results.find(row=>row.ticker==='US39').price).toBe(222.42);
 const sector=page.getByRole('button',{name:'기술 종목 목록',exact:true});await touchable(sector);await sector.click();
 const member=page.getByRole('region',{name:'선택한 업종 종목 목록'}).locator('[data-stock-detail="NVDA"]');
 await expect(member).toContainText('186.42 달러');await expect(member).toContainText('거래일 2026-10-07');
 count=21;await expect(page.locator('[data-heatmap-progress]')).toContainText('21 / 40종목 응답');await expect(tiles).toHaveCount(40);
 count=40;await expect(page.locator('[data-heatmap-progress]')).toHaveCount(0);await expect(tiles).toHaveCount(40);
 expect((await cached()).results.find(row=>row.ticker==='US39').price).toBe(225.42);
 await noOverflow(page);
});

test('US 히트맵 첫 접속: 부분응답은17개와갱신중으로표시, 가짜0%·빈타일없음',async({page,qa})=>{
 qa.overrides.set('/api/heatmap/full',route=>route.fulfill({json:{...full,complete:false,refreshing:true,results:us.slice(0,17)}}));
 await page.goto('/#heatmap');await page.getByRole('button',{name:'미국',exact:true}).click();
 await expect(page.locator('.market-map-stock')).toHaveCount(17);
 await expect(page.locator('[data-heatmap-progress]')).toContainText('17 / 40종목 응답');
 await expect(page.locator('[data-heatmap-progress]')).not.toContainText('이전 시세');
 await noOverflow(page);
});
