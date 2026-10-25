import {test,expect,noOverflow} from './fixtures.mjs';
import {screener} from './data.mjs';

const path='/api/home-screener-summary';
const summary={schemaVersion:1,tradeDate:screener.tradeDate,counts:{volumeSurge:3}};
const summaryCalls=qa=>qa.calls.filter(row=>row.path===path);
const fullCalls=qa=>qa.calls.filter(row=>row.path==='/api/published-data/screener.json'||row.path==='/static/data/screener.json');
const card=page=>page.locator('.home-change-card').filter({has:page.locator('[data-feature-target="volume-surge"]')});

test('Home uses a small independent summary and opens the original full screener conditions',async({page,qa})=>{
 let release;const held=new Promise(resolve=>{release=resolve;});
 qa.overrides.set(path,async route=>{await held;await route.fulfill({json:summary});});
 try{
  await page.goto('/#home');
  await page.locator('.home-changes').scrollIntoViewIfNeeded();
  const exportAction=page.locator('.home-change-card [data-feature-target="items"]');
  await expect(exportAction).toBeVisible();
  await expect.poll(()=>summaryCalls(qa).length).toBe(1);
  expect(fullCalls(qa)).toHaveLength(0);
  await exportAction.focus();release();
  await expect(card(page)).toHaveCount(1);
  await expect(exportAction).toBeFocused();
  // The shared export fixture has no itemPeriod, so it produces one export
  // card. Its summary is the second visible card and needs no expansion.
  await expect(page.locator('[data-home-change-toggle]')).toBeHidden();
  await expect(card(page)).toBeVisible();
  await expect(card(page)).toContainText('3개');
  await expect(card(page)).toContainText(screener.tradeDate);
  expect(fullCalls(qa)).toHaveLength(0);
  await card(page).locator('button').click();
  await expect(page.locator('[data-surface="discover"]')).toBeVisible();
  await expect(page.locator('.analysis-stock')).toHaveCount(3);
  await expect(page.locator('[data-screener-preset="volume-surge"]')).toHaveAttribute('aria-pressed','true');
  expect(fullCalls(qa).length).toBeGreaterThan(0);
  const loadedFull=fullCalls(qa).length;
  await page.goBack();
  await page.locator('.home-changes').scrollIntoViewIfNeeded();
  await expect(card(page)).toHaveCount(1);
  expect(fullCalls(qa)).toHaveLength(loadedFull);
  expect(summaryCalls(qa)).toHaveLength(1);
  await noOverflow(page);
 }finally{release();}
});

test('summary failure offers a source-only retry while the export observations stay usable',async({page,qa})=>{
 let failed=true;
 qa.overrides.set(path,route=>route.fulfill(failed?{status:503,json:{detail:'summary unavailable'}}:{json:summary}));
 await page.goto('/#home');
 await page.locator('.home-changes').scrollIntoViewIfNeeded();
 await expect(page.locator('[data-home-change-retry]')).toBeVisible();
 await expect(page.locator('.home-change-card [data-feature-target="items"]')).toBeVisible();
 expect(summaryCalls(qa)).toHaveLength(1);
 expect(fullCalls(qa)).toHaveLength(0);
 const exportCalls=qa.calls.filter(row=>row.path==='/api/export-momentum').length;
 failed=false;await page.locator('[data-home-change-retry]').click();
 await expect(card(page)).toHaveCount(1);
 await expect(page.locator('[data-home-change-retry]')).toBeHidden();
 expect(summaryCalls(qa)).toHaveLength(2);
 expect(qa.calls.filter(row=>row.path==='/api/export-momentum')).toHaveLength(exportCalls);
 expect(fullCalls(qa)).toHaveLength(0);
 await noOverflow(page);
});

test('a late summary cannot publish into a departed Home and the next Home reuses the settled source',async({page,qa})=>{
 let release;const held=new Promise(resolve=>{release=resolve;});
 qa.overrides.set(path,async route=>{await held;await route.fulfill({json:summary});});
 try{
  await page.goto('/#home');
  await page.locator('.home-changes').scrollIntoViewIfNeeded();
  await expect.poll(()=>summaryCalls(qa).length).toBe(1);
  await page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name:'분석',exact:true}).click();
  await expect(page.locator('[data-surface="more"]')).toBeVisible();
  const responseReady=page.waitForResponse(response=>new URL(response.url()).pathname===path);
  release();await (await responseReady).finished();
  await expect(page.locator('.home-change-card')).toHaveCount(0);
  await page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name:'홈',exact:true}).click();
  await page.locator('.home-changes').scrollIntoViewIfNeeded();
  await expect(card(page)).toHaveCount(1);
  expect(summaryCalls(qa)).toHaveLength(1);
  expect(fullCalls(qa)).toHaveLength(0);
 }finally{release();}
});
