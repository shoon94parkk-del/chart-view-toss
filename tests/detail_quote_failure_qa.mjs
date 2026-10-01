import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 for(const mode of ['empty','http','timeout']){
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];let recovered=false;
  page.on('pageerror',e=>errors.push(e.message));
  const mock=async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.endsWith('/api/quotes')){
    if(!recovered&&mode==='timeout'){await new Promise(resolve=>setTimeout(resolve,6000));return route.abort().catch(()=>{});}
    return route.fulfill({status:!recovered&&mode==='http'?503:200,contentType:'application/json',body:JSON.stringify({results:recovered?[{ticker:'NVDA',price:190,change:1,currency:'USD'}]:[]})});
   }
   return route.fulfill({contentType:'application/json',body:'{"stocks":[],"results":[]}'});
  };
  await page.route('https://chart-view-pkv8.onrender.com/**',mock);await page.route('**/backend/**',mock);
  await page.goto((process.env.QA_BASE_URL||'http://127.0.0.1:4173')+'/#detail/NVDA');
  await page.locator('#detail-price [data-retry-detail]').waitFor({timeout:10000});
  assert.match(await page.locator('.quote-main').innerText(),/시세 확인 필요|확인 불가/);
  recovered=true;await page.locator('#detail-price [data-retry-detail]').click();
  await page.waitForFunction(()=>document.querySelector('.quote-main')?.textContent.includes('190'));
  assert.deepEqual(errors,[]);console.log(mode+' quote failure/retry passed');await context.close();
 }
}finally{await browser.close();}
