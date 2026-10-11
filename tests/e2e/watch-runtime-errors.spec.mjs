import { test, expect } from '@playwright/test';
import { observeWatchRuntimeErrors, assertNoWatchRuntimeErrors } from './watch-runtime-errors.mjs';

test('watch runtime oracle rejects uncaught errors across reload and retains caught-fetch diagnostics',async({browser,context,page},testInfo)=>{
  const runtime=await observeWatchRuntimeErrors(context);
  await context.route('**/watch-runtime-oracle*',route=>{
    const scenario=new URL(route.request().url()).searchParams.get('case');
    const script={
      sync:"throw new Error('oracle sync failure');",
      async:"Promise.reject(new Error('oracle async failure'));",
      closing:"Promise.reject(new Error('oracle closing failure'));setTimeout(()=>location.href='/watch-runtime-oracle?case=after',0);",
    }[scenario]||'';
    return route.fulfill({contentType:'text/html',body:`<!doctype html><script>${script}</script><p>Runtime oracle control</p>`});
  });
  for(const scenario of ['sync','async']){
    await page.goto(`/watch-runtime-oracle?case=${scenario}`);
    await expect.poll(()=>runtime.errors.map(error=>error.message)).toContain(`oracle ${scenario} failure`);
    expect(()=>assertNoWatchRuntimeErrors(runtime)).toThrow();
  }
  await page.goto('/watch-runtime-oracle?case=closing',{waitUntil:'commit'});
  await page.waitForURL('**/watch-runtime-oracle?case=after');
  await expect.poll(()=>runtime.errors.map(({kind,message})=>({kind,message}))).toEqual([
    {kind:'error',message:'oracle sync failure'},
    {kind:'unhandledrejection',message:'oracle async failure'},
    {kind:'unhandledrejection',message:'oracle closing failure'},
  ]);
  expect(()=>assertNoWatchRuntimeErrors(runtime)).toThrow();
  await testInfo.attach('uncaught-runtime-controls',{body:JSON.stringify(runtime,null,2),contentType:'application/json'});

  if(testInfo.project.use.browserName==='webkit'){
    const probeContext=await browser.newContext({baseURL:testInfo.project.use.baseURL,serviceWorkers:'block'});
    try{
      const probePage=await probeContext.newPage(),caught=[],apiRequests=[];
      const probeRuntime=await observeWatchRuntimeErrors(probeContext);
      await probeContext.exposeBinding('__watchCaughtFetch',(_source,message)=>caught.push(message));
      let documents=0,releaseDocument,documentRequested;
      const heldDocument=new Promise(resolve=>{releaseDocument=resolve;});
      const requestedDocument=new Promise(resolve=>{documentRequested=resolve;});
      await probeContext.route('**/*',async route=>{
        const url=new URL(route.request().url());
        if(url.pathname==='/watch-runtime-provisional'){
          if(++documents>1){documentRequested();await heldDocument;}
          return route.fulfill({contentType:'text/html',body:`<!doctype html><script>window.startProbe=()=>window.addEventListener('beforeunload',()=>setTimeout(async()=>{try{await fetch('https://chart-view-pkv8.onrender.com/api/market-now');}catch(error){void window.__watchCaughtFetch(String(error)).catch(()=>{});}},100),{once:true});</script><p>Provisional reload control</p>`});
        }
        if(url.pathname==='/api/market-now'){
          apiRequests.push(url.href);
          return route.fulfill({json:{results:[]}});
        }
        return route.abort('blockedbyclient');
      });
      await probePage.goto('/watch-runtime-provisional');
      await probePage.evaluate(()=>window.startProbe());
      const reload=probePage.reload();
      await requestedDocument;
      try{
        await expect.poll(()=>caught.length).toBe(1);
        expect(apiRequests).toEqual([]);
        expect(probeRuntime.pageErrors.length).toBeGreaterThan(0);
        assertNoWatchRuntimeErrors(probeRuntime);
      }finally{
        releaseDocument();
        await reload;
      }
      await testInfo.attach('caught-provisional-fetch-diagnostics',{body:JSON.stringify({caught,...probeRuntime},null,2),contentType:'application/json'});
    }finally{
      await probeContext.close();
    }
  }
});
