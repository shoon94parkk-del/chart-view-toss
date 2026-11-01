import {test,expect} from './fixtures.mjs';
import {commonArticle} from '../fixtures/moneytoring-ux.mjs';

test.use({storedLists:{watchlist:[{symbol:'005930.KS',name:'삼성전자'}],selected:['005930.KS']}});

test('Back restores the news reading position after an expired cache finishes loading',async({page,qa})=>{
 const items=Array.from({length:12},(_,index)=>({...commonArticle,url:`https://example.com/back-${index}`,title:`복귀 위치 기사 ${index}`,score:100-index}));
 const payload={items,groups:[{symbol:'005930.KS',name:'삼성전자',status:'success',items}],errors:[]};
 let hold=false,release;
 qa.overrides.set('/api/personalized-news',async route=>{
  if(hold)await new Promise(resolve=>{release=resolve;});
  return route.fulfill({json:payload});
 });
 await page.goto('/#news');
 const cards=page.locator('[data-news-reader-card]');
 await expect(cards).toHaveCount(12);
 const stock=cards.nth(8).locator('[data-news-reader-stock]').first();
 await stock.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 const position=await page.evaluate(()=>scrollY);
 expect(position).toBeGreaterThan(1000);
 await stock.click();
 await expect(page).toHaveURL(/#detail\/005930.KS$/);
 await expect(page.locator('#detail-price')).toContainText('103,700원');
 // Date advances the real API cache age without waiting for a minute or
 // changing its TTL. Hold the Back response until its skeleton has painted.
 await page.clock.setFixedTime(new Date('2026-10-07T06:37:00Z'));
 hold=true;
 await page.goBack();
 await expect(page).toHaveURL(/#news$/);
 await expect.poll(()=>typeof release).toBe('function');
 await expect(cards).toHaveCount(0);
 release();hold=false;
 await expect(cards).toHaveCount(12);
 await expect.poll(async()=>Math.abs(await page.evaluate(()=>scrollY)-position)).toBeLessThan(3);
});

test('a summary response preserves focus on the same article stock control',async({page,qa})=>{
 const items=Array.from({length:2},(_,index)=>({...commonArticle,url:`https://example.com/focus-${index}`,title:`초점 유지 기사 ${index}`,score:100-index}));
 qa.overrides.set('/api/personalized-news',route=>route.fulfill({json:{items,groups:[{symbol:'005930.KS',name:'삼성전자',status:'success',items}],errors:[]}}));
 let release;
 qa.overrides.set('/api/news-summary',async route=>{
  await new Promise(resolve=>{release=resolve;});
  return route.fulfill({json:{summary:'요약 완료',basis:'provider_snippet',qualityStatus:'ok'}});
 });
 await page.goto('/#news');
 const cards=page.locator('[data-news-reader-card]');
 await expect(cards).toHaveCount(2);
 await cards.first().locator('[data-news-summary-toggle]').click();
 await expect.poll(()=>typeof release).toBe('function');
 const stock=cards.nth(1).locator('[data-news-reader-stock]').first();
 await stock.focus();
 await expect(stock).toBeFocused();
 release();
 await expect(cards.first()).toContainText('요약 완료');
 await expect(stock).toBeFocused();
});

async function holdNewsOnBack(page,qa){
 const items=Array.from({length:12},(_,index)=>({...commonArticle,url:`https://example.com/held-back-${index}`,title:`대기 복귀 기사 ${index}`,score:100-index}));
 const payload={items,groups:[{symbol:'005930.KS',name:'삼성전자',status:'success',items}],errors:[]};
 let returning=false,release,requested;
 const gate=new Promise(resolve=>{release=resolve;});
 const started=new Promise(resolve=>{requested=resolve;});
 let next=payload;
 qa.overrides.set('/api/personalized-news',async route=>{
  if(returning){requested();await gate;}
  return route.fulfill({status:next.httpStatus||200,json:next});
 });
 await page.goto('/#news');
 const cards=page.locator('[data-news-reader-card]');
 await expect(cards).toHaveCount(12);
 const stock=cards.nth(8).locator('[data-news-reader-stock]').first();
 await stock.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 const saved=await page.evaluate(()=>scrollY);
 expect(saved).toBeGreaterThan(1000);
 await stock.click();
 await expect(page.locator('#detail-price')).toContainText('103,700원');
 await page.clock.setFixedTime(new Date('2026-10-07T06:37:00Z'));
 returning=true;
 await page.goBack();await started;
 await expect(page).toHaveURL(/#news$/);
 await expect(cards).toHaveCount(0);
 return {cards,saved,payload,release:(value=payload)=>{next=value;release();}};
}

async function installRestoreFrameGate(page){
 await page.addInitScript(()=>{
  const nativeFrame=requestAnimationFrame.bind(window),nativeCancel=cancelAnimationFrame.bind(window),nativeScroll=scrollTo.bind(window);
  const held=new Map();let next=-1,restoreCall=null,restore,flushing=null;
  const gate=window.__newsRestoreFrameGate={armed:false,terminalMax:null,applied:[],
   get terminalCount(){return [...held.values()].filter(frame=>frame.restore?.clamp).length;},
   flush(){
    gate.armed=false;const frames=[...held.values()];held.clear();
    for(const frame of frames){flushing=frame;try{frame.callback(performance.now());}finally{flushing=null;}}
   },
  };
  window.requestAnimationFrame=callback=>{
   if(!gate.armed)return nativeFrame(callback);
   const id=next--,frame={callback,restore:restoreCall};held.set(id,frame);
   if(restoreCall?.clamp&&gate.terminalMax===null)gate.terminalMax=Math.max(0,document.documentElement.scrollHeight-innerHeight);
   return id;
  };
  window.cancelAnimationFrame=id=>id<0?held.delete(id):nativeCancel(id);
  window.scrollTo=(...args)=>{if(flushing?.restore)gate.applied.push(args);return nativeScroll(...args);};
  Object.defineProperty(window,'__chartviewRestoreScroll',{configurable:true,get:()=>restore,set:callback=>{
   restore=options=>{const previous=restoreCall;restoreCall=options||{};try{return callback(options);}finally{restoreCall=previous;}};
  }});
 });
}

async function holdTerminalError(page,qa){
 await installRestoreFrameGate(page);
 const back=await holdNewsOnBack(page,qa);
 const pendingMax=await page.evaluate(()=>Math.max(0,document.documentElement.scrollHeight-innerHeight));
 expect(back.saved-pendingMax,'The held layout must not already reach the saved position').toBeGreaterThan(100);
 await page.evaluate(()=>{window.__newsRestoreFrameGate.armed=true;});
 back.release({httpStatus:503,detail:'provider unavailable'});
 await expect(page.locator('#news-list strong')).toContainText('불러오지 못했어요');
 await expect.poll(()=>page.evaluate(()=>window.__newsRestoreFrameGate.terminalCount)).toBeGreaterThan(0);
 return back;
}

for(const input of ['wheel','touchstart','pointerdown','keydown']){
 test(`Back news restoration yields to ${input} input while its response is held`,async({page,qa})=>{
  const {cards,saved,release}=await holdNewsOnBack(page,qa);
  try{
   await page.locator('#news-list').dispatchEvent(input,input==='keydown'?{key:'ArrowUp'}:{});
   const chosen=await page.evaluate(()=>scrollY);
   expect(Math.abs(chosen-saved)).toBeGreaterThan(100);
   release();
   await expect(cards).toHaveCount(12);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   expect(Math.abs(await page.evaluate(()=>scrollY)-chosen)).toBeLessThan(3);
  }finally{release();}
 });
}

test('a final shorter news feed clamps Back once and cannot jump when a summary later expands',async({page,qa})=>{
 const {cards,saved,payload,release}=await holdNewsOnBack(page,qa);
 const items=payload.items.slice(0,2);
 qa.overrides.set('/api/news-summary',route=>route.fulfill({json:{summary:'확인한 근거\n'.repeat(180),basis:'provider_snippet',qualityStatus:'ok'}}));
 try{
  release({...payload,items,groups:[{...payload.groups[0],items}]});
  await expect(cards).toHaveCount(2);
  await expect.poll(()=>page.evaluate(()=>Math.abs(scrollY-Math.max(0,document.documentElement.scrollHeight-innerHeight)))).toBeLessThan(3);
  const clamped=await page.evaluate(()=>scrollY);
  expect(saved-clamped).toBeGreaterThan(100);
  // Programmatic activation adds no new pointer/key intent, so an uncleared
  // terminal restore would jump as soon as this summary makes it reachable.
  await cards.first().locator('[data-news-summary-toggle]').evaluate(el=>el.click());
  await expect(cards.first().locator('.news-reader-summary-text')).toContainText('확인한 근거');
  await expect.poll(()=>page.evaluate(target=>document.documentElement.scrollHeight-innerHeight-target,saved)).toBeGreaterThan(1);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  expect(Math.abs(await page.evaluate(()=>scrollY)-clamped)).toBeLessThan(3);
 }finally{release();}
});

for(const status of ['empty','error','network-error']){
 test(`a final ${status} news response consumes the pending Back position`,async({page,qa})=>{
  const {cards,saved,payload,release}=await holdNewsOnBack(page,qa);
  try{
   release(status==='network-error'?{httpStatus:503,detail:'provider unavailable'}:{items:[],groups:[{symbol:'005930.KS',name:'삼성전자',status:status==='error'?'error':'success',items:[]}],errors:status==='error'?[{symbol:'005930.KS',code:'provider_unavailable'}]:[]});
   await expect(page.locator('#news-list strong')).toContainText(status==='empty'?'표시할 관련 뉴스가 없어요':'불러오지 못했어요');
   await expect(cards).toHaveCount(0);
   await expect.poll(()=>page.evaluate(()=>Math.abs(scrollY-Math.max(0,document.documentElement.scrollHeight-innerHeight)))).toBeLessThan(3);
   // A later render with taller content must not inherit the completed Back.
   release(payload);
   await page.clock.setFixedTime(new Date('2026-10-07T06:39:00Z'));
   await page.locator('[data-news-sort="latest"]').evaluate(el=>el.click());
   await expect(cards).toHaveCount(12);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   expect(Math.abs(await page.evaluate(()=>scrollY)-saved)).toBeGreaterThan(100);
  }finally{release();}
 });
}

for(const status of ['empty','error','network-error']){
 test(`terminal ${status} news consumes its intent before a queued frame can be superseded by sorting`,async({page,qa})=>{
  await installRestoreFrameGate(page);
  const {cards,saved,payload,release}=await holdNewsOnBack(page,qa);
  try{
   const pendingMax=await page.evaluate(()=>Math.max(0,document.documentElement.scrollHeight-innerHeight));
   expect(saved-pendingMax,'The held layout must not already reach the saved position').toBeGreaterThan(100);
   // Hold both the terminal root frame and its owner cleanup. The separate
   // natural-paint regressions above retain their original clamp assertions.
   await page.evaluate(()=>{window.__newsRestoreFrameGate.armed=true;});
   release(status==='network-error'?{httpStatus:503,detail:'provider unavailable'}:{items:[],groups:[{symbol:'005930.KS',name:'삼성전자',status:status==='error'?'error':'success',items:[]}],errors:status==='error'?[{symbol:'005930.KS',code:'provider_unavailable'}]:[]});
   await expect(page.locator('#news-list strong')).toContainText(status==='empty'?'표시할 관련 뉴스가 없어요':'불러오지 못했어요');
   await expect(cards).toHaveCount(0);
   await expect.poll(()=>page.evaluate(()=>window.__newsRestoreFrameGate.terminalCount)).toBeGreaterThan(0);
   release(payload);
   await page.evaluate(()=>{window.__newsRestoreFrameGate.armed=false;});
   await page.clock.setFixedTime(new Date('2026-10-07T06:39:00Z'));
   await page.locator('[data-news-sort="latest"]').evaluate(el=>el.click());
   await expect(cards).toHaveCount(12);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   expect(Math.abs(await page.evaluate(()=>scrollY)-saved)).toBeGreaterThan(100);
   const beforeOldFrame=await page.evaluate(()=>scrollY);
   await page.evaluate(()=>window.__newsRestoreFrameGate.flush());
   expect(Math.abs(await page.evaluate(()=>scrollY)-beforeOldFrame)).toBeLessThan(3);
  }finally{release();await page.evaluate(()=>window.__newsRestoreFrameGate.flush());}
 });
}

test('a terminal news frame keeps its decided clamp when the same view grows before paint',async({page,qa})=>{
 const {release}=await holdTerminalError(page,qa);
 try{
  const terminal=await page.evaluate(()=>window.__newsRestoreFrameGate.terminalMax);
  await page.locator('#news-list').evaluate(host=>{const later=document.createElement('div');later.style.height='1800px';host.append(later);});
  await page.evaluate(()=>window.__newsRestoreFrameGate.flush());
  expect(Math.abs(await page.evaluate(()=>scrollY)-terminal)).toBeLessThan(3);
  expect(await page.evaluate(()=>window.__newsRestoreFrameGate.applied)).toEqual([[{top:terminal,behavior:'instant'}]]);
 }finally{release();await page.evaluate(()=>window.__newsRestoreFrameGate.flush());}
});

test('user input cancels a queued terminal news frame after its target has been consumed',async({page,qa})=>{
 const {payload,release}=await holdTerminalError(page,qa);
 try{
  // Grow this same view after the terminal decision so a canceled, captured
  // target differs from the user's chosen position even on tall viewports.
  await page.locator('#news-list').evaluate(host=>{const later=document.createElement('div');later.style.height='1800px';host.append(later);});
  const terminal=await page.evaluate(()=>window.__newsRestoreFrameGate.terminalMax);
  await page.locator('#news-list').dispatchEvent('wheel');
  const chosen=await page.evaluate(target=>{window.scrollTo({top:target>150?0:400,behavior:'instant'});return scrollY;},terminal);
  expect(Math.abs(chosen-terminal)).toBeGreaterThan(100);
  await page.evaluate(()=>window.__newsRestoreFrameGate.flush());
  expect(Math.abs(await page.evaluate(()=>scrollY)-chosen)).toBeLessThan(3);
  expect(await page.evaluate(()=>window.__newsRestoreFrameGate.applied)).toEqual([]);
  release(payload);
 }finally{release();await page.evaluate(()=>window.__newsRestoreFrameGate.flush());}
});

test('a queued terminal news frame cannot scroll a newer route',async({page,qa})=>{
 const {release}=await holdTerminalError(page,qa);
 try{
  // Programmatic navigation adds no pointer cancellation: this checks the
  // obsolete view epoch independently of the user-input guard.
  await page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name:'홈',exact:true}).evaluate(button=>button.click());
  await expect(page).toHaveURL(/#home$/);
  await expect(page.locator('#market-card')).toBeVisible();
  await page.evaluate(()=>window.__newsRestoreFrameGate.flush());
  expect(await page.evaluate(()=>window.__newsRestoreFrameGate.applied)).toEqual([]);
  expect(await page.evaluate(()=>scrollY)).toBe(0);
 }finally{release();await page.evaluate(()=>window.__newsRestoreFrameGate.flush());}
});

test('a newer explicit target supersedes a queued terminal scroll in the same view',async({page,qa})=>{
 await installRestoreFrameGate(page);
 qa.overrides.set('/api/personalized-news',route=>route.fulfill({json:{items:[],groups:[{symbol:'005930.KS',name:'삼성전자',status:'success',items:[]}],errors:[]}}));
 await page.goto('/#news');
 await expect(page.locator('#news-list strong')).toContainText('표시할 관련 뉴스가 없어요');
 await expect(page.locator('[data-news-reader-card]')).toHaveCount(0);
 // The default feed has enough room after extending its layout; no route
 // change can hide a missing generation check behind an epoch change.
 await page.locator('#news-list').evaluate(host=>{const later=document.createElement('div');later.style.height='1800px';host.append(later);});
 await page.evaluate(()=>{
  window.__newsRestoreFrameGate.armed=true;
  window.__chartviewRestoreScroll({top:400,clamp:true});
  window.__chartviewRestoreScroll({top:700});
  window.__newsRestoreFrameGate.flush();
 });
 expect(await page.evaluate(()=>scrollY)).toBe(700);
 const applied=await page.evaluate(()=>window.__newsRestoreFrameGate.applied);
 expect(applied).toEqual([[{top:700,behavior:'instant'}]]);
});
