import { test as base, expect } from '@playwright/test';
import { payloadFor, quotes } from './data.mjs';
import { noOverflow, touchable } from './fixtures.mjs';
import { observeWatchRuntimeErrors, assertNoWatchRuntimeErrors } from './watch-runtime-errors.mjs';

const key='chartview-toss-watchlist-v1';
const selectedKey='chartview-toss-selected-v1';
const original=quotes.map((row,index)=>({symbol:row.ticker,name:row.name,metadata:{savedIndex:index}}));
const test=base.extend({
  watchRows:[original,{option:true}],
  selectedRows:[[quotes[0].ticker],{option:true}],
  watchQA:[async({context,page,watchRows,selectedRows},use,testInfo)=>{
    const runtime=await observeWatchRuntimeErrors(context),unexpected=[],calls=[];
    await context.addInitScript(({watchRows,selectedRows,key,selectedKey})=>{
      if(!['http:','https:'].includes(location.protocol)||sessionStorage.getItem('watch-qa-seeded'))return;
      localStorage.setItem(key,JSON.stringify(watchRows));
      localStorage.setItem(selectedKey,JSON.stringify(selectedRows));
      sessionStorage.setItem('watch-qa-seeded','1');
    },{watchRows,selectedRows,key,selectedKey});
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url()),path=url.pathname.replace(/^\/backend/,'');
      if(path.startsWith('/api/')||path.startsWith('/static/data/')){
        calls.push({path,query:url.search,method:route.request().method()});
        try{return await route.fulfill({json:payloadFor(url)});}
        catch(error){
          unexpected.push(error.message);
          return route.fulfill({status:500,json:{detail:error.message}});
        }
      }
      const baseURL=testInfo.project.use.baseURL||process.env.E2E_BASE_URL||'http://127.0.0.1:4173';
      if(!['127.0.0.1','localhost'].includes(url.hostname)&&url.origin!==new URL(baseURL).origin){
        unexpected.push(`Unexpected external request: ${url.origin}${path}`);
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    await use({calls});
    await testInfo.attach('watch-browser-errors',{body:JSON.stringify({...runtime,unexpected},null,2),contentType:'application/json'});
    await testInfo.attach('watch-api-calls',{body:JSON.stringify(calls,null,2),contentType:'application/json'});
    assertNoWatchRuntimeErrors(runtime);
    expect(unexpected,'Every external request must have an explicit deterministic contract').toEqual([]);
  },{auto:true}],
});

async function saved(page,storageKey=key){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);}
async function failStorage(page,storageKey=key){
  await page.evaluate(key=>{
    const write=Storage.prototype.setItem;
    window.__watchQARecover=()=>{Storage.prototype.setItem=write;};
    Storage.prototype.setItem=function(k,value){if(k===key)throw new DOMException('Quota exceeded','QuotaExceededError');return write.call(this,k,value);};
  },storageKey);
}
const recover=page=>page.evaluate(()=>window.__watchQARecover());

async function nativeStorage(context){
  await context.addInitScript(()=>{
    window.__appsInTossConstants={operationalEnvironment:'sandbox',platformOS:'android',tossAppVersion:'5.270.0'};
    window.__bridgeMethods__=['getAnonymousKey','getStorageItem','setStorageItem','removeStorageItem','__subscribeAppEvent','__unsubscribeAppEvent'];
    window.__nativeWatchQA={hold:false,fail:false,pending:[],key:'chartview-toss-watchlist-v1:watch-qa'};
    window.__nativeWatchRelease=()=>{
      const qa=window.__nativeWatchQA;
      qa.hold=false;qa.pending.splice(0).forEach(complete=>complete());
    };
    window.ReactNativeWebView={postMessage(raw){
      const request=JSON.parse(raw);
      if(request.type!=='bridge')return;
      const {method,eventId,args}=request.body,params=args[0]||{};
      const complete=()=>{
        let result=null;
        if(method==='getAnonymousKey')result={type:'HASH',hash:'watch-qa'};
        if(method==='getStorageItem')result=localStorage.getItem(params.key);
        if(method==='removeStorageItem')localStorage.removeItem(params.key);
        if(method==='setStorageItem'){
          if(window.__nativeWatchQA.fail&&params.key===window.__nativeWatchQA.key)result={__instanceof:'Error',name:'Error',message:'native storage full'};
          else localStorage.setItem(params.key,params.value);
        }
        window.nativeEmitterMap[request.bridgeId].emit(`${method}-${eventId}`,result,false);
      };
      if(method==='setStorageItem'&&params.key===window.__nativeWatchQA.key&&window.__nativeWatchQA.hold)window.__nativeWatchQA.pending.push(complete);
      else queueMicrotask(complete);
    }};
  });
}

for(const destination of ['sort','home','watch reentry'])test(`pending native deletion refreshes ${destination} after confirmation`,async({context,page})=>{
  await nativeStorage(context);
  await page.goto('/#watch');
  await expect(page.locator('[data-unwatch]')).toHaveCount(3);
  await page.evaluate(()=>{window.__nativeWatchQA.hold=true;});
  await page.locator('[data-unwatch="005930.KS"]').click();
  await expect.poll(()=>page.evaluate(()=>window.__nativeWatchQA.pending.length)).toBe(1);
  if(destination==='sort')await page.getByRole('button',{name:'이름',exact:true}).click();
  else{
    await page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name:'홈',exact:true}).click();
    if(destination==='watch reentry')await page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name:'관심',exact:true}).click();
  }
  expect(await saved(page,`${key}:watch-qa`)).toEqual(original);
  await page.evaluate(()=>window.__nativeWatchRelease());
  await expect.poll(()=>saved(page,`${key}:watch-qa`)).toEqual(original.filter(row=>row.symbol!=='005930.KS'));
  const rows=page.locator(destination==='home'?'#home-watchlist [data-stock-detail]':'[data-unwatch]');
  await expect(rows).toHaveCount(2);
  await page.reload();
  await expect(page.locator(destination==='home'?'#home-watchlist [data-stock-detail]':'[data-unwatch]')).toHaveCount(2);
});

for(const destination of ['home','detail reentry'])test(`pending native comparison refreshes ${destination} after confirmation`,async({context,page})=>{
  await nativeStorage(context);
  await page.goto('/#detail/NVDA');
  await expect(page.locator('#detail-compare')).toHaveText('비교 추가');
  await page.evaluate(key=>{window.__nativeWatchQA.hold=true;window.__nativeWatchQA.key=`${key}:watch-qa`;},selectedKey);
  await page.locator('#detail-compare').click();
  await expect.poll(()=>page.evaluate(()=>window.__nativeWatchQA.pending.length)).toBe(1);
  await page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name:'홈',exact:true}).click();
  if(destination==='detail reentry')await page.locator('#home-watchlist [data-stock-detail="NVDA"]').click();
  await page.evaluate(()=>window.__nativeWatchRelease());
  await expect.poll(()=>saved(page,`${selectedKey}:watch-qa`)).toEqual([quotes[0].ticker,'NVDA']);
  if(destination==='home')await expect(page.locator('.ticker-strip [data-go-chart]')).toHaveCount(2);
  else await expect(page.locator('#detail-compare')).toHaveText('비교 열기');
  expect(await saved(page,`${key}:watch-qa`)).toEqual(original);
});

test('pending native deletion failure preserves rows through sorting and reload',async({context,page})=>{
  await nativeStorage(context);
  await page.goto('/#watch');
  await expect(page.locator('[data-unwatch]')).toHaveCount(3);
  await page.evaluate(()=>{window.__nativeWatchQA.hold=true;window.__nativeWatchQA.fail=true;});
  await page.locator('[data-unwatch="005930.KS"]').click();
  await expect.poll(()=>page.evaluate(()=>window.__nativeWatchQA.pending.length)).toBe(1);
  await page.getByRole('button',{name:'이름',exact:true}).click();
  await page.evaluate(()=>window.__nativeWatchRelease());
  await expect(page.locator('.app-toast')).toContainText('저장하지 못');
  await expect(page.locator('[data-unwatch]')).toHaveCount(3);
  expect(await saved(page,`${key}:watch-qa`)).toEqual(original);
  await page.reload();
  await expect(page.locator('[data-unwatch]')).toHaveCount(3);
});

test('watch deletion failure preserves list through sort, Home and reload; undo also rolls back',async({page})=>{
  await page.goto('/#watch');
  await expect(page.locator('[data-unwatch]')).toHaveCount(3);
  await failStorage(page);
  await page.locator('[data-unwatch="005930.KS"]').click();
  await expect(page.locator('.app-toast')).toContainText('저장하지 못');
  await page.getByRole('button',{name:'이름',exact:true}).click();
  await expect(page.locator('[data-unwatch]')).toHaveCount(3);
  expect(await saved(page)).toEqual(original);
  await page.reload();
  await expect(page.locator('[data-unwatch]')).toHaveCount(3);
  await page.locator('[data-unwatch="005930.KS"]').click();
  await expect(page.locator('[data-unwatch]')).toHaveCount(2);
  await failStorage(page);
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();
  await expect(page.locator('.app-toast')).toContainText('저장하지 못');
  await page.getByRole('button',{name:'이름',exact:true}).click();
  await expect(page.locator('[data-unwatch]')).toHaveCount(2);
  expect((await saved(page)).some(row=>row.symbol==='005930.KS')).toBe(false);
  await page.reload();
  await expect(page.locator('[data-unwatch]')).toHaveCount(2);
});

test('watch editor failed save keeps the unsaved draft open for retry and preserves metadata',async({page})=>{
  await page.goto('/#watch');
  await page.getByRole('button',{name:'편집',exact:true}).click();
  await page.locator('[data-selected-remove="NVDA"]').click();
  await failStorage(page);
  await page.getByRole('button',{name:'2개 종목 적용',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#selector-message')).toContainText('저장하지 못');
  await expect(page.locator('[data-selected-remove]')).toHaveCount(2);
  expect(await saved(page)).toEqual(original);
  await recover(page);
  await page.getByRole('button',{name:'2개 종목 적용',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-unwatch]')).toHaveCount(2);
  expect(await saved(page)).toEqual(original.filter(row=>row.symbol!=='NVDA'));
  await page.reload();
  await expect(page.locator('[data-unwatch]')).toHaveCount(2);
});

test('watch undo after Home navigation restores the exact saved row and Home order',async({page})=>{
  await page.goto('/#watch');
  await page.locator('[data-unwatch="NVDA"]').click();
  await expect(page.locator('[data-unwatch]')).toHaveCount(2);
  await page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name:'홈',exact:true}).click();
  await expect(page.locator('#home-watchlist [data-stock-detail]')).toHaveCount(2);
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();
  await expect(page.locator('#home-watchlist [data-stock-detail]')).toHaveCount(3);
  expect(await saved(page)).toEqual(original);
  await expect(page.locator('#home-watchlist [data-stock-detail]').nth(original.findIndex(row=>row.symbol==='NVDA'))).toHaveAttribute('data-stock-detail','NVDA');
});

test('comparison save failure preserves watch bytes and retains the comparison draft for retry',async({page})=>{
  await page.goto('/#detail/NVDA');
  await failStorage(page,selectedKey);
  await page.locator('#detail-compare').click();
  await expect(page.locator('.app-toast')).toContainText('저장하지 못');
  await expect(page.locator('#detail-name')).toHaveText(quotes.find(row=>row.ticker==='NVDA').name);
  expect(await saved(page,selectedKey)).toEqual([quotes[0].ticker]);
  expect(await saved(page)).toEqual(original);
  await page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name:'수익률',exact:true}).click();
  await page.locator('#open-compare-selector').click();
  await page.locator('[data-selector-symbol="NVDA"]').click();
  await page.getByRole('button',{name:'2개 종목 적용',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#selector-message')).toContainText('저장하지 못');
  await expect(page.locator('[data-selected-remove]')).toHaveCount(2);
  await recover(page);
  await page.getByRole('button',{name:'2개 종목 적용',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await saved(page,selectedKey)).toEqual([quotes[0].ticker,'NVDA']);
  expect(await saved(page)).toEqual(original);
});

test('watch saved order controls are reachable, persist to Home/reload, and roll back on failure',async({page})=>{
  await page.goto('/#watch');
  await expect(page.getByRole('button',{name:'저장순서',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'순서 편집',exact:true}).click();
  const down=page.getByRole('button',{name:'삼성전자 아래로',exact:true});
  await touchable(down);
  await down.click();
  await expect.poll(async()=>(await saved(page)).map(row=>row.symbol)).toEqual([original[1].symbol,original[0].symbol,original[2].symbol]);
  await failStorage(page);
  await page.getByRole('button',{name:'삼성전자 아래로',exact:true}).click();
  await expect(page.locator('.app-toast')).toContainText('저장하지 못');
  await expect(page.locator('#watch-rich-list [data-stock-detail]').nth(1)).toHaveAttribute('data-stock-detail','005930.KS');
  await page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name:'홈',exact:true}).click();
  await expect(page.locator('#home-watchlist [data-stock-detail]').first()).toHaveAttribute('data-stock-detail',original[1].symbol);
  await page.reload();
  await expect(page.locator('#home-watchlist [data-stock-detail]').first()).toHaveAttribute('data-stock-detail',original[1].symbol);
  await noOverflow(page);
});

const full=Array.from({length:20},(_,index)=>({symbol:`STOCK${index}`,name:`Company ${index}`,metadata:index}));
for(const count of [20,40])test.describe(`six comparisons with ${count} watch rows`,()=>{
  const rows=Array.from({length:count},(_,index)=>({symbol:`STOCK${index}`,name:`Company ${index}`,metadata:index}));
  const six=['NVDA','AAPL','MSFT','AMZN','META','GOOG'];
  test.use({watchRows:[rows,{scope:'test'}],selectedRows:[six,{scope:'test'}]});
  test('seventh comparison is rejected independently of the watch limit',async({page})=>{
    await page.goto('/#detail/005930.KS');
    await page.locator('#detail-compare').click();
    await expect(page.locator('.app-toast')).toContainText('6개');
    expect(await saved(page,selectedKey)).toEqual(six);
    await page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name:'수익률',exact:true}).click();
    await page.locator('#open-compare-selector').click();
    await page.locator('[data-selector-symbol="STOCK0"]').click();
    await expect(page.locator('#selector-message')).toContainText('6개');
    await expect(page.locator('[data-selected-remove]')).toHaveCount(6);
    await page.getByRole('button',{name:'6개 종목 적용',exact:true}).click();
    expect(await saved(page,selectedKey)).toEqual(six);
    expect(await saved(page)).toEqual(rows);
  });
});
test.describe('watch additions at capacity',()=>{
  test.use({watchRows:[full,{scope:'test'}],selectedRows:[[],{scope:'test'}]});
  test('detail rejects a new 21st watch row but comparison remains independent and editor can replace a removed row',async({page})=>{
    await page.goto('/#detail/005930.KS');
    await expect(page.locator('#detail-name')).toHaveText('삼성전자');
    await page.locator('#detail-watch').click();
    await expect(page.locator('.app-toast')).toContainText('20개');
    await expect(page.locator('#detail-watch')).toHaveAttribute('aria-pressed','false');
    expect(await saved(page)).toEqual(full);
    await page.locator('#detail-compare').click();
    await expect(page.locator('#chart-selected-summary')).toContainText('1개 종목');
    expect(await saved(page,selectedKey)).toEqual(['005930.KS']);
    expect(await saved(page)).toEqual(full);
    await page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name:'관심',exact:true}).click();
    await page.getByRole('button',{name:'편집',exact:true}).click();
    await page.locator('[data-selected-remove="STOCK0"]').click();
    await page.getByRole('textbox',{name:'종목명, 코드 또는 티커 검색'}).fill('삼성전자');
    await page.locator('[data-selector-symbol="005930.KS"]').click();
    await page.getByRole('button',{name:'20개 종목 적용',exact:true}).click();
    await expect.poll(async()=>await saved(page)).toEqual([...full.slice(1),{symbol:'005930.KS',name:'삼성전자'}]);
  });
});

for(const count of [21,40])test.describe(`legacy watch ${count}`,()=>{
  const rows=Array.from({length:count},(_,index)=>({symbol:`STOCK${index}`,name:`Company ${index}`,metadata:index}));
  test.use({watchRows:[rows,{scope:'test'}]});
  test('legacy lists remain intact with quote scope and editable order',async({page,watchQA})=>{
    await page.goto('/#watch');
    await expect(page.locator('[data-unwatch]')).toHaveCount(count);
    await expect(page.locator('#watch-coverage')).toContainText(`저장순서의 앞 20개`);
    expect(await saved(page)).toEqual(rows);
    await page.getByRole('button',{name:'편집',exact:true}).click();
    await expect(page.locator('[data-selected-remove]')).toHaveCount(count);
    await page.getByRole('button',{name:`${count}개 종목 적용`,exact:true}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await saved(page)).toEqual(rows);
    await page.getByRole('button',{name:'순서 편집',exact:true}).click();
    await page.getByRole('button',{name:'Company 0 아래로',exact:true}).click();
    await expect.poll(async()=>(await saved(page))[0].symbol).toBe('STOCK1');
    await page.reload();
    await expect(page.locator('[data-unwatch]')).toHaveCount(count);
    expect((await saved(page)).length).toBe(count);
    const reordered=[rows[1],rows[0],...rows.slice(2)];
    await page.locator('[data-unwatch="STOCK0"]').click();
    await expect(page.locator('[data-unwatch]')).toHaveCount(count-1);
    await page.getByRole('button',{name:'실행 취소',exact:true}).click();
    await expect(page.locator('[data-unwatch]')).toHaveCount(count);
    expect(await saved(page)).toEqual(reordered);
    const quoteCalls=watchQA.calls.filter(call=>call.path==='/api/quotes');
    expect(quoteCalls.length).toBeGreaterThan(0);
    for(const call of quoteCalls)expect(new URLSearchParams(call.query).get('tickers').split(',').length).toBeLessThanOrEqual(20);
    const scopes=quoteCalls.map(call=>new URLSearchParams(call.query).get('tickers').split(','));
    expect(scopes).toContainEqual(rows.slice(0,20).map(row=>row.symbol));
    expect(scopes).toContainEqual(reordered.slice(0,20).map(row=>row.symbol));
    await noOverflow(page);
  });
});
