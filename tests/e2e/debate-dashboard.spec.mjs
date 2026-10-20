import {test,expect,noOverflow} from './fixtures.mjs';
import {readFileSync} from 'node:fs';

const bootstrap=JSON.parse(readFileSync(new URL('../../public/data/intelligence_debates_public.json',import.meta.url),'utf8'));
const publication=()=>({...structuredClone(bootstrap),generated_at:'2026-10-20T06:55:00Z',debates:[...structuredClone(bootstrap.debates),{...structuredClone(bootstrap.debates[0]),id:'fresh-stock-20261020',company:'새 연구 종목',ticker:'123456',summary:'추가 실적 확인이 필요한 공개 연구입니다.',updated_at:'2026-10-20T06:50:00Z'}]});
const archivePath='/api/published-data/intelligence_debates_public.json';
const shadowPath='/api/published-data/intelligence_shadow_status.json';

test('Analysis menu opens AI debate archive without backend availability',async({page,qa})=>{
  await page.clock.setFixedTime(new Date('2026-10-20T07:00:00Z'));
  await page.goto('/#more');
  const menu=page.locator('button[data-tab="debates"]');
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(page.locator('[data-surface="debates"]')).toBeVisible();
  await expect(page.locator('.debate-card')).toHaveCount(3);
  await expect(page.locator('.debate-shadow')).toContainText('스모크 실증');
  await expect(page.locator('[data-debate-feed-meta]')).toContainText('게시된 정적 스냅샷');
  expect(qa.calls.filter(row=>row.path==='/api/intelligence/debates')).toHaveLength(0);
  await page.locator('[data-debate-search]').fill('272210');
  await expect(page.locator('.debate-card')).toHaveCount(1);
  await expect(page.locator('.debate-card')).toContainText('한화시스템');
  await page.locator('.debate-card summary').click();
  await expect(page.locator('.debate-phase').first()).toBeVisible();
  await expect(page.locator('.debate-panel > .debate-warning')).toContainText('비공개 원문');
  await noOverflow(page);
});

test('Direct /debates path and refresh survive denied live APIs',async({page,qa})=>{
  await page.clock.setFixedTime(new Date('2026-10-20T07:00:00Z'));
  qa.overrides.set(archivePath,route=>route.fulfill({status:503,json:{detail:'not configured'}}));
  qa.overrides.set(shadowPath,route=>route.fulfill({status:503,json:{detail:'not configured'}}));
  await page.goto('/debates/');
  await expect(page.locator('.debate-card')).toHaveCount(3);
  await page.locator('[data-debate-refresh]').click();
  await expect(page.locator('.debate-card')).toHaveCount(3);
  await expect(page.locator('[data-shadow-status]')).toContainText('스모크 실증');
});

test('completed public research arrives after bootstrap without waiting for Shadow or reloading',async({page,qa})=>{
 await page.clock.setFixedTime(new Date('2026-10-20T07:00:00Z'));
 let releaseArchive,releaseShadow;
 qa.overrides.set(archivePath,route=>new Promise(resolve=>{releaseArchive=()=>route.fulfill({json:publication()}).then(resolve);}));
 qa.overrides.set(shadowPath,route=>new Promise(resolve=>{releaseShadow=()=>route.fulfill({status:503,json:{detail:'delayed'}}).then(resolve);}));
 await page.goto('/debates/');
 await expect(page.locator('.debate-card')).toHaveCount(3);
 await expect.poll(()=>typeof releaseArchive).toBe('function');
 await releaseArchive();
 await expect(page.locator('.debate-card')).toHaveCount(4);
 const card=page.locator('[data-debate-id="fresh-stock-20261020"]');
 await expect(card).toContainText('추가 실적 확인');
 await expect(card).toContainText('분석 완료');
 await expect(page.locator('[data-debate-feed-meta]')).toContainText('게시 데이터 API');
 await expect.poll(()=>typeof releaseShadow).toBe('function');await releaseShadow();
 await page.locator('[data-debate-search]').fill('추가 실적');
 await expect(page.locator('.debate-card')).toHaveCount(1);
 await card.locator(':scope > summary').click();
 await expect(card.locator('.debate-phase')).toHaveCount(7);
 expect(qa.calls.filter(row=>row.path.startsWith('/api/intelligence/'))).toHaveLength(0);
 expect(qa.calls.filter(row=>[archivePath,shadowPath].includes(row.path)).every(row=>row.query==='')).toBe(true);
 await noOverflow(page);
});

test('refresh retains current filters, nested disclosures and keyboard focus; unchanged content keeps its DOM',async({page,qa})=>{
 await page.clock.setFixedTime(new Date('2026-10-20T07:00:00Z'));
 let current=publication();qa.overrides.set(archivePath,route=>route.fulfill({json:current}));
 await page.goto('/debates/');await expect(page.locator('.debate-card')).toHaveCount(4);
 await page.locator('[data-debate-search]').fill('123456');
 const card=page.locator('[data-debate-id="fresh-stock-20261020"]');
 await card.locator(':scope > summary').click();
 const phase=card.locator('.debate-phase').first();await phase.locator('summary').click();await phase.locator('summary').focus();
 await phase.evaluate(el=>el.dataset.preserved='yes');
 await page.locator('[data-debate-refresh]').evaluate(el=>el.click());
 await expect(page.locator('[data-debate-refresh]')).toBeEnabled();
 await expect(phase).toHaveAttribute('data-preserved','yes');
 current=publication();current.generated_at='2026-10-20T06:56:00Z';current.debates.at(-1).summary='새로운 근거를 포함한 공개 연구입니다.';
 await page.locator('[data-debate-refresh]').evaluate(el=>el.click());
 await expect(card).toContainText('새로운 근거');
 await expect(page.locator('[data-debate-search]')).toHaveValue('123456');
 await expect(phase).toHaveAttribute('open','');
 await expect(phase.locator('summary')).toBeFocused();
 await noOverflow(page);
});

test('older, private and failed publications retain newer last-good research with a delayed notice',async({page,qa})=>{
 await page.clock.setFixedTime(new Date('2026-10-20T07:00:00Z'));
 let current=publication(),failed=false;
 qa.overrides.set(archivePath,route=>route.fulfill(failed?{status:503,json:{detail:'not ready'}}:{json:current}));
 await page.goto('/debates/');await expect(page.locator('.debate-card')).toHaveCount(4);
 for(const variant of ['older','private','failed']){
  current=variant==='older'?structuredClone(bootstrap):publication();
  if(variant==='private'){current.generated_at='2026-10-20T06:56:00Z';current.debates.at(-1).summary='보유 수량 500주';}
  failed=variant==='failed';
  await page.locator('[data-debate-refresh]').click();await expect(page.locator('[data-debate-refresh]')).toBeEnabled();
  await expect(page.locator('.debate-card')).toHaveCount(4);
  await expect(page.locator('[data-debate-feed-meta]')).toContainText('확인 지연');
  await expect(page.locator('.debate-list')).not.toContainText('500주');
 }
});

test('visible polling refreshes every minute, resumes promptly and stops after navigation',async({page,qa})=>{
 await page.clock.install({time:new Date('2026-10-20T07:00:00Z')});
 qa.overrides.set(archivePath,route=>route.fulfill({json:publication()}));
 const checks=()=>qa.calls.filter(row=>row.path===archivePath).length;
 await page.goto('/debates/');await expect(page.locator('.debate-card')).toHaveCount(4);
 const initial=checks();await page.clock.runFor(60001);await expect.poll(checks).toBe(initial+1);
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
 const hidden=checks();await page.clock.runFor(120001);expect(checks()).toBe(hidden);
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});
 await expect.poll(checks).toBe(hidden+1);await expect(page.locator('[data-debate-refresh]')).toBeEnabled();
 await page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name:'분석',exact:true}).click();
 await expect(page.locator('[data-surface="more"]')).toBeVisible();
 const left=checks();await page.clock.runFor(60001);expect(checks()).toBe(left);
});

test('late bootstrap cannot overwrite a newer independently loaded publication',async({page,qa})=>{
 await page.clock.setFixedTime(new Date('2026-10-20T07:00:00Z'));
 let releaseBootstrap;
 await page.route('**/data/intelligence_debates_public.json',route=>new Promise(resolve=>{releaseBootstrap=()=>route.fulfill({json:bootstrap}).then(resolve);}));
 qa.overrides.set(archivePath,route=>route.fulfill({json:publication()}));
 await page.goto('/debates/');await expect(page.locator('.debate-card')).toHaveCount(4);
 await expect.poll(()=>typeof releaseBootstrap).toBe('function');await releaseBootstrap();
 await expect(page.locator('.debate-card')).toHaveCount(4);
 await expect(page.locator('[data-debate-feed-meta]')).toContainText('게시 데이터 API');
});

test('a newer late bootstrap never inherits verification from an older live publication',async({page,qa})=>{
 await page.clock.setFixedTime(new Date('2026-10-20T07:00:00Z'));
 let releaseBootstrap;
 const newer=publication();newer.generated_at='2026-10-20T06:56:00Z';newer.debates.at(-1).summary='더 새로 게시된 부트스트랩 연구입니다.';
 await page.route('**/data/intelligence_debates_public.json',route=>new Promise(resolve=>{releaseBootstrap=()=>route.fulfill({json:newer}).then(resolve);}));
 qa.overrides.set(archivePath,route=>route.fulfill({json:publication()}));
 await page.goto('/debates/');await expect(page.locator('.debate-card')).toHaveCount(4);
 await expect(page.locator('[data-debate-feed-meta]')).toContainText(' · 확인 2026-10-20T07:00:00.000Z');
 await expect.poll(()=>typeof releaseBootstrap).toBe('function');await releaseBootstrap();
 await expect(page.locator('.debate-list')).toContainText('더 새로 게시된 부트스트랩');
 await expect(page.locator('[data-debate-feed-meta]')).not.toContainText(' · 확인 2026-10-20T07:00:00.000Z');
 await expect(page.locator('[data-debate-feed-meta]')).toContainText('확인 지연');
});
