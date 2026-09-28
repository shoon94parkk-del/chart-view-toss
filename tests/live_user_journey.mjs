import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base=process.env.QA_BASE_URL||'https://chart-view-toss.onrender.com';
const out='artifacts/live-user-journey';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  await context.addInitScript(()=>{
    localStorage.setItem('chartview-toss-watchlist-v1',JSON.stringify([{symbol:'000660.KS',name:'SK하이닉스'}]));
    localStorage.setItem('chartview-toss-selected-v1',JSON.stringify(['000660.KS']));
  });
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().includes('chart-view-pkv8.onrender.com')&&r.status()>=500)errors.push(`${r.status()} ${new URL(r.url()).pathname}`);});
  const rows=[];
  const visit=async(route,selector)=>{
    await page.goto(`${base}/#${route}`,{waitUntil:'domcontentloaded'});
    await page.locator(selector).first().waitFor({timeout:25000});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
    if(overflow)throw new Error(`${route}: horizontal overflow`);
    await page.screenshot({path:`${out}/${route.replaceAll('/','-')}.png`,fullPage:true});
    rows.push({route,visible:(await page.locator('body').innerText()).slice(0,220)});
  };
  await visit('watch','#watch-rich-list .watch-detail-card');
  await page.waitForFunction(()=>/\d[\d,]*원/.test(document.querySelector('#watch-rich-list .watch-card-price strong')?.textContent||''),{timeout:20000});
  const watchPrice=await page.locator('#watch-rich-list .watch-card-price strong').first().innerText();
  await page.screenshot({path:`${out}/watch-loaded.png`,fullPage:true});
  await page.locator('#watch-rich-list .watch-main').first().click();
  await page.locator('#detail-price strong').first().waitFor({timeout:20000});
  const detailPrice=await page.locator('#detail-price strong').first().innerText();
  await page.screenshot({path:`${out}/detail-from-watch.png`,fullPage:true});
  await visit('home','#home-watchlist .watch-price strong');
  const homePrice=await page.locator('#home-watchlist .watch-price strong').first().innerText();
  await page.locator('#home-daily-heatmap [data-stock-detail="000660.KS"]').waitFor({timeout:20000});
  const homeHeatmap=await page.locator('#home-daily-heatmap [data-stock-detail="000660.KS"]').getAttribute('aria-label');
  await page.screenshot({path:`${out}/home-loaded.png`,fullPage:true});
  await visit('heatmap','#analysis-body .home-heatmap-cell');
  const fullHeatmap=await page.locator('#analysis-body [data-stock-detail="000660.KS"]').getAttribute('aria-label');
  await visit('chart','#chart-canvas canvas');
  await page.locator('#open-compare-selector').click();
  await page.locator('#selector-search-input').fill('하이닉스');
  await page.locator('[data-selector-symbol="000660.KS"]').waitFor({timeout:15000});
  const searchResult=await page.locator('[data-selector-symbol="000660.KS"]').innerText();
  await page.screenshot({path:`${out}/search-hynix.png`,fullPage:true});
  if(!searchResult.includes('SK하이닉스'))throw new Error(`Hynix search identity missing: ${searchResult}`);
  if(errors.length)throw new Error(`Live browser/API errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify({watchPrice,detailPrice,homePrice,homeHeatmap,fullHeatmap,searchResult:searchResult.slice(0,90),routes:rows.map(x=>x.route),errors}));
  await context.close();
}finally{await browser.close();}
