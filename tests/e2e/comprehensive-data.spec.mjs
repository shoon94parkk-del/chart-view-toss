import { test, expect, noOverflow } from './fixtures.mjs';
import { payloadFor, symbol } from './data.mjs';
import { finiteNumber } from '../../src/analysisData.js';
import { macroSparklineSvg } from '../../src/dataPresentation.js';

const valuationKeys=['forwardPE','trailingPE','pbr','roe','operatingMargin','dividendYield'];

test('integration 상세 지표: 결측·비수치·실제 0 구분과 정상 시세 유지',async({page,qa})=>{
 test.setTimeout(60_000);
 let value;
 qa.overrides.set('/api/valuation',(route,url)=>{
   const payload=payloadFor(url);
   payload.stocks=payload.stocks.map(row=>({...row,...Object.fromEntries(valuationKeys.map(key=>[key,value]))}));
   return route.fulfill({json:payload});
 });
 for(const [index,input] of [null,'',' ','N/A',0,'0'].entries()){
   value=input;
   const response=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/valuation');
   if(index===0)await page.goto(`/#detail/${symbol}`);
   else await page.reload();
   const raw=(await(await response).json()).stocks[0];
   expect(raw.forwardPE).toBe(input);
   const processed=finiteNumber(raw.forwardPE);
   await expect(page.locator('#detail-metrics .detail-metric strong')).toHaveText(valuationKeys.map((key,index)=>processed===null?'-':`${processed}${index<3?'배':'%'}`));
   await expect(page.locator('#detail-price')).toContainText('103,700원');
   await expect(page.locator('#detail-price')).toContainText('+2.37%');
 }
 await noOverflow(page);
});

test('integration 경제지표 차트: 결측 구간을 연결하지 않고 실제 0 보존',async({page,qa})=>{
 test.setTimeout(60_000);
 let values;
 qa.overrides.set('/api/macro',(route,url)=>{
   const payload=payloadFor(url);
   payload.results=[{symbol:'T10Y2Y',name:'장단기 금리차',value:.45,delta:.05,asOf:'2026-10-07',source:'FRED',chart_data:values.map((value,index)=>({time:`2026-09-${String(index+1).padStart(2,'0')}`,value}))}];
   return route.fulfill({json:payload});
 });
 for(const [index,input] of [[null,.45],[null,' ',null],[1,2,null,3,4],[null,1,2,null],[1,null,2],[0,'0',-1]].entries()){
   values=input;
   const response=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/macro');
   if(index===0)await page.goto('/#macro');
   else await page.reload();
   const raw=(await(await response).json()).results[0];
   expect(raw.chart_data.map(row=>row.value)).toEqual(input);
   const processed=macroSparklineSvg(raw.chart_data,true);
   const tile=page.locator('.macro-tile').filter({hasText:'장단기 금리차'});
   await expect(tile).toContainText('0.45%p');
   if(!processed){
     await expect(tile.locator('.macro-sparkline')).toHaveCount(0);
     await expect(tile).toContainText('시계열 없음');
   }else{
     const d=processed.match(/<path d="([^"]+)"/)[1];
     await expect(tile.locator('.macro-sparkline path')).toHaveAttribute('d',d);
     if(input.includes(null)){
       expect((d.match(/M/g)||[]).length).toBe(input[0]===null?1:2);
       expect(d).not.toContain('50.00,');
     }else expect((d.match(/L/g)||[]).length).toBe(2);
     if(input.length===3&&input[1]===null){
       const dots=tile.locator('.macro-sparkline circle');
       await expect(dots).toHaveCount(2);
       await expect(dots.nth(0)).toBeVisible();
       await expect(dots.nth(1)).toBeVisible();
       await expect(dots.nth(0)).toHaveAttribute('cx','0.00');
       await expect(dots.nth(1)).toHaveAttribute('cx','100.00');
       expect(d).not.toContain('L');
     }
   }
 }
 await noOverflow(page);
});

test('integration 메모리 가격: 공백 결측과 실제 0의 금액·변동·누적 그래프 구분',async({page,qa})=>{
 test.setTimeout(60_000);
 let value;
 qa.overrides.set('/api/memory-prices',(route,url)=>{
   const payload=payloadFor(url);
   payload.groups[0].items[0]={...payload.groups[0].items[0],average:value,changePct:value,dailyLow:value,dailyHigh:value};
   payload.history=payload.history.map(row=>({...row,values:{...row.values,ddr5:value}}));
   return route.fulfill({json:payload});
 });
 for(const [index,input] of [' ','\t',null,0,'0'].entries()){
   value=input;
   const response=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/memory-prices');
   if(index===0)await page.goto('/#memory');
   else await page.reload();
   const raw=(await(await response).json()).groups[0].items[0];
   expect(raw.average).toBe(input);
   const processed=finiteNumber(raw.average),card=page.locator('.dram-spot-card').first();
   await expect(card.locator('.dram-spot-price')).toHaveText(processed===null?'-':'$0.00');
   await expect(card.locator('.dram-spot-card-head em')).toHaveText(processed===null?'변동률 미제공':'0.00%');
   await expect(card.locator('.dram-spot-range strong')).toHaveText(processed===null?'-':'$0.00 ~ $0.00');
   await expect(card.locator('.dram-spot-line')).toHaveCount(processed===null?0:1);
   await expect(card).toContainText(processed===null?'차트뷰 누적 데이터가 아직 없어요.':'3회 누적');
   await expect(page.locator('.memory-price-group-head')).toContainText('2026. 10. 7.');
 }
 await noOverflow(page);
});
