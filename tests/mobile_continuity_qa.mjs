import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
await fs.mkdir('artifacts/mobile-continuity',{recursive:true});
const browser=await chromium.launch({headless:true});
try{for(const width of [320,390,430]){
 const page=await browser.newPage({viewport:{width,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://chart-view-pkv8.onrender.com/**',route=>{
  const path=new URL(route.request().url()).pathname;let body={};
  if(path==='/api/consensus')body={name:'검증 기업',source:'Yahoo Finance earningsTrend · cached fallback',currency:'KRW',asOf:'2026-10-02T06:00:00Z',periods:{'0y':{endDate:'2026-12-31',earnings:{avg:47789,low:40609,high:60367,analysts:33},revenue:{avg:723269936280000},epsTrend:{current:47789,'30daysAgo':48589},revisions:{up30:5,down30:7}}}};
  if(path==='/api/macro')body={generatedAt:'2026-10-02T06:00:00Z',summary:{level:'red',text:'물가 압력 높음(PCE 3.4%) | Fed 3.75~4.00% · 최근 +25bp · EFFR 3.88% | 신용스프레드 안정 | VIX 16 안정 → 현재는 물가·정책·금융 스트레스 중 부정 압력이 넓게 나타납니다.',notice:'시장 환경을 설명하기 위한 요약이며 투자 행동을 권유하지 않습니다. 향후 FOMC 결정을 예측하는 신호도 아닙니다.'},results:[{symbol:'T10Y2Y',name:'장단기 금리차 (10Y-2Y)',value:0.45,delta:-0.01,unit:'%',asOf:'2026-10-02',source:'Federal Reserve / FRED mirror · 긴 제공처 이름',sourceUrl:'https://fred.stlouisfed.org/series/T10Y2Y',desc:'10년-2년 미국 국채 금리차입니다.',chart_data:[{time:'2026-09-01',value:0.5},{time:'2026-10-02',value:0.45}]}]};
  if(path==='/api/valuation-band')body={source:'Yahoo Finance',generatedAt:'2026-10-02',method:'재무자료 시차 적용',per:{points:[{time:'2025-01-01',value:10},{time:'2026-01-01',value:20}],stats:{current:20,median:15,p20:12,p80:18,observations:2,start:'2025-01-01',end:'2026-01-01'}}};
  if(path==='/api/memory-prices')body={available:true,source:'TrendForce',groups:[{key:'dram-chip',name:'DRAM 칩',sourceDate:'2026-10-02',sourceUrl:'https://www.trendforce.com/price/dram/dram_spot',items:[{key:'ddr5',name:'DDR5 16Gb (2Gx8) 4800/5600',average:58,changePct:1,dailyLow:43.5,dailyHigh:69.5}]}],history:[{date:'2026-10-02',values:{ddr5:58}}]};
  return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
 });
 const noOverflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}px outer overflow`);
 const height=selector=>page.locator(selector).first().evaluate(x=>x.getBoundingClientRect().height);
 const fonts=selector=>page.locator(selector).evaluateAll(xs=>xs.map(x=>parseFloat(getComputedStyle(x).fontSize)));
 await page.goto(base+'/#more');
 assert.ok(await height('.tab-usage-guide')<=48,'tab help must be one compact 44px disclosure');
 for(const tab of ['discover','ideas','heatmap','chart','valuation','consensus','bands','exports','memory','macro','news','picks','watch']){
  const row=page.locator(`.feature-row[data-tab="${tab}"]`);if(!await row.count())continue;
  assert.ok(await row.evaluate(x=>x.getBoundingClientRect().height)>=44,'menu touch target');
  const color=await row.locator('.feature-icon').evaluate(x=>getComputedStyle(x).color);
  const expected=['exports','memory','macro','news'].includes(tab)?'rgb(8, 123, 119)':tab==='picks'?'rgb(102, 80, 172)':tab==='watch'?'rgb(147, 96, 24)':'rgb(36, 102, 208)';
  assert.equal(color,expected,`${tab} menu purpose must match destination`);
 }
 await noOverflow();await page.screenshot({path:`artifacts/mobile-continuity/${width}-analysis.png`});
 await page.goto(base+'/#consensus');await page.locator('.analysis-metrics').first().waitFor();
 assert.ok(await height('.analysis-card')<=380,'first estimate fits a compact mobile card');
 assert.ok((await fonts('.analysis-card .analysis-meta')).every(x=>x>=12),'estimate source readable');
 assert.match(await page.locator('.consensus-caution').innerText(),/確定|확정/);
 assert.match(await page.locator('.analysis-metrics').first().innerText(),/원값.*723,269,936,280,000/s);
 await noOverflow();await page.screenshot({path:`artifacts/mobile-continuity/${width}-consensus.png`});
 await page.goto(base+'/#macro');await page.locator('.macro-observations').waitFor();
 assert.ok(await height('.macro-summary')<=320,'summary must not consume a mobile screen');
 assert.equal(await page.locator('.macro-observations li').count(),4,'retain every observation');
 assert.equal(await page.locator('.status-badge.red').innerText(),'위험 신호 많음');
 assert.ok((await fonts('.macro-summary-copy>small,.macro-tile .source-line,.macro-mini-dates')).every(x=>x>=12),'macro dates/source/notice readable');
 assert.ok(await page.locator('.source-line').first().evaluate(x=>getComputedStyle(x).whiteSpace!=='nowrap'),'long source must wrap');
 assert.ok(await page.locator('.source-row button').first().isVisible(),'original series stays accessible');
 await noOverflow();await page.screenshot({path:`artifacts/mobile-continuity/${width}-macro.png`});
 await page.goto(base+'/#bands');await page.locator('#band-metric').waitFor();
 assert.ok(await height('.analysis-filters')<=84,'three band choices use one mobile row');
 for(const id of ['#band-symbol','#band-years','#band-metric'])assert.ok(await height(id)>=44,'band touch target');
 await noOverflow();
 await page.goto(base+'/#memory');await page.locator('.memory-price-tabs').waitFor();
 assert.ok(await height('.memory-price-tabs button')>=44,'price family touch target');
 assert.ok((await fonts('.memory-price-attribution,.memory-price-group-head span,.dram-spot-chart-labels')).every(x=>x>=12),'price provenance readable');
 assert.equal(await page.locator('.memory-price-tabs button[aria-selected="true"]').evaluate(x=>getComputedStyle(x).color),'rgb(8, 123, 119)','price active family uses evidence tone');
 await noOverflow();await page.screenshot({path:`artifacts/mobile-continuity/${width}-memory.png`});
 await page.goto(base+'/#news');assert.equal(await page.locator('.brand-title h1').innerText(),'관심종목 뉴스');
 await noOverflow();assert.deepEqual(errors,[]);await page.close();
 console.log(`${width}px: menu/destination identities, card density, readable sources and touch targets passed`);
}}finally{await browser.close();}
