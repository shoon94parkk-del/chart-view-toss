import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:320,height:844}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://chart-view-pkv8.onrender.com/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({results:[],stocks:[],items:[],sectors:[]})}));
 const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
 for(const [path,title] of [['chartviewHome','수익률 비교'],['chartview/chartviewHome','수익률 비교'],['heatmap','시장 히트맵'],['consensus','실적 전망 조회'],['bands','역사적 밸류에이션'],['discover','시장 스크리너']]){
  await page.goto(`${base}/${path}?diagnostics=1`);
  await page.getByRole('heading',{name:title,exact:true,level:2}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${path} overflow`);
 }
 await page.goto(`${base}/?diagnostics=1#detail/%ZZ`);
 await page.locator('[data-tab="more"]').first().click();
 await page.getByRole('heading',{name:'전체',exact:true,level:2}).waitFor();
 // Large text and long labels must remain reachable at the narrow supported width.
 await page.addStyleTag({content:'body,button,input,select{font-size:24px!important}'});
 await page.locator('[data-tab="info"]').first().click();
 await page.locator('#clear-local-data').waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'large-text overflow');
 const report=await page.evaluate(()=>window.chartviewDiagnostics());
 assert.ok(report.metrics.startup);
 assert.ok(Object.keys(report.metrics).some(key=>key.startsWith('view.')));
 assert.ok(!JSON.stringify(report).includes('005930'));
 assert.deepEqual(errors,[]);
 await mkdir('artifacts/release-gates',{recursive:true});
 await writeFile('artifacts/release-gates/metrics.json',JSON.stringify(report,null,2));
 await page.screenshot({path:'artifacts/release-gates/large-text.png',fullPage:true});
 console.log('Feature re-entry, malformed URL, 320px large text and local diagnostics passed');
}finally{await browser.close();}
