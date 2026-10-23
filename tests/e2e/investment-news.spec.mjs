import {test,expect,noOverflow,touchable} from './fixtures.mjs';
import AxeBuilder from '@axe-core/playwright';
import {investmentNewsFixture} from '../fixtures/investment-news.mjs';
const endpoint='/api/intelligence/news';
const setup=async(page,qa,payload=investmentNewsFixture())=>{
 await page.clock.setFixedTime(new Date('2026-10-21T02:00:00Z'));
 qa.overrides.set(endpoint,route=>route.fulfill({json:payload}));
};
test('investment news ranks actual published events and filters sector ticker date thesis without PICK requests',async({page,qa})=>{
 await setup(page,qa);await page.goto('/investment-news/');
 await expect(page.locator('[data-investment-event]')).toHaveCount(2);
 const initialPickCalls=qa.calls.filter(c=>/feed\/v2|home-bootstrap|pick_monitor/.test(c.path));
 await expect(page.locator('[data-investment-event]').first()).toContainText('메모리 공급 계획 변경');
 await expect(page.locator('[data-investment-meta]')).toContainText('2026-10-21T01:00:00Z');
 await page.getByLabel('섹터').selectOption('반도체');await page.getByLabel('종목',{exact:true}).selectOption('005930.KS');await page.getByLabel('발행일 KST').selectOption('2026-10-21');await page.getByLabel('가설 점검').selectOption('review');
 await expect(page.locator('[data-investment-event]')).toHaveCount(1);
 await page.locator('[data-investment-event] > summary').click();
 await expect(page.locator('[data-investment-event]')).toContainText('투자 규모 10% 변경');
 await expect(page.locator('[data-investment-event]')).toContainText('수요가 유지될 때');
 await expect(page.locator('[data-investment-event]')).toContainText('AI 미실행');
 await expect(page.locator('[data-investment-event]')).toContainText('개정 2');
 await expect(page.locator('[data-investment-briefings]')).toContainText('생산 계획의 변경');
 expect(qa.calls.filter(c=>/feed\/v2|home-bootstrap|pick_monitor/.test(c.path))).toEqual(initialPickCalls);
 expect(qa.calls.filter(c=>/feed\/v2|pick_monitor/.test(c.path))).toHaveLength(0);
 await touchable(page.getByRole('button',{name:'필터 초기화'}));await noOverflow(page);
 const audit=await new AxeBuilder({page}).options({runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']},rules:{'meta-viewport':{enabled:false}}}).analyze();expect(audit.violations).toEqual([]);
 await page.context().route('https://news.samsung.com/**',route=>route.fulfill({contentType:'text/html',body:'<h1>공식 자료</h1>'}));
 const popupPromise=page.waitForEvent('popup');await page.locator('[data-investment-event="memory-release:2"] [data-investment-source]').first().click();const popup=await popupPromise;await popup.waitForURL('https://news.samsung.com/global/release');await popup.close();
});
test('analysis entry is lazy and refresh keeps filters disclosures and last good publication on failure or rollback',async({page,qa})=>{
 let doc=investmentNewsFixture(),fail=false;await setup(page,qa);
 qa.overrides.set(endpoint,route=>fail?route.fulfill({status:503,json:{detail:'unavailable'}}):route.fulfill({json:doc}));
 await page.goto('/#more');expect(qa.calls.some(c=>c.path===endpoint)).toBe(false);
 await page.locator('button[data-tab="investment-news"]').click();await expect(page.locator('[data-investment-event]')).toHaveCount(2);
 await page.getByLabel('섹터').selectOption('반도체');const card=page.locator('[data-investment-event="memory-release:2"]');await card.locator(':scope > summary').click();
 fail=true;await page.getByRole('button',{name:'게시 다시 확인'}).click();await expect(page.locator('[data-investment-meta]')).toContainText('마지막 정상 자료');await expect(card).toHaveAttribute('open','');
 fail=false;doc={...investmentNewsFixture(),generated_at:'2026-10-20T00:00:00Z',as_of_date:'2026-10-20',events:[]};await page.getByRole('button',{name:'게시 다시 확인'}).click();await expect(page.locator('[data-investment-meta]')).toContainText('이전 게시');await expect(card).toBeVisible();
 doc=investmentNewsFixture();doc.generated_at='2026-10-21T01:30:00Z';doc.events[0].summary=['갱신한 공식 자료'];await page.getByRole('button',{name:'게시 다시 확인'}).click();await expect(card).toContainText('갱신한 공식 자료');await expect(card).toHaveAttribute('open','');await expect(page.getByLabel('섹터')).toHaveValue('반도체');await noOverflow(page);
});
test('not started and unavailable are distinct and a late response cannot replace another route',async({page,qa})=>{
 const empty={schemaVersion:'investment-news.v1',generated_at:'2026-10-21T01:00:00Z',as_of_date:'2026-10-21',status:'NOT_STARTED',collection:{},capabilities:{},events:[],briefings:[]};await setup(page,qa,empty);await page.goto('/investment-news/');await expect(page.locator('[data-investment-list]')).toContainText('아직 수집을 시작하지 않았어요');
 qa.overrides.set(endpoint,route=>route.fulfill({status:503,json:{detail:'failed'}}));await page.reload();await expect(page.locator('[data-investment-list]')).toContainText('불러오지 못했어요');
 let release;qa.overrides.set(endpoint,route=>new Promise(resolve=>{release=()=>route.fulfill({json:investmentNewsFixture()}).catch(()=>{}).then(resolve);}));await page.reload();await expect.poll(()=>typeof release).toBe('function');
 await page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name:'분석',exact:true}).click();await release();await expect(page.locator('.more-intro')).toBeVisible();await expect(page.locator('[data-investment-event]')).toHaveCount(0);
});
test('malformed outcome and unverified completed agents cannot replace a good publication',async({page,qa})=>{
 await setup(page,qa);await page.goto('/investment-news/');await expect(page.locator('[data-investment-event]')).toHaveCount(2);
 const invalid=investmentNewsFixture();invalid.generated_at='2026-10-21T01:30:00Z';invalid.events[0].performance=[{stock_return:0.2,baseline_at:'2099-01-01T00:00:00Z',followup_at:'2000-01-01T00:00:00Z',source_urls:['https://example.com/price']}];invalid.events[0].analysis_status='completed';invalid.events[0].agents=Object.fromEntries(['mer','nonggu','meng'].map(role=>[role,{summary:'제공되지 않은 분석'}]));
 qa.overrides.set(endpoint,route=>route.fulfill({json:invalid}));await page.getByRole('button',{name:'게시 다시 확인'}).click();await expect(page.locator('[data-investment-meta]')).toContainText('마지막 정상 자료');
 await page.locator('[data-investment-event]').first().locator(':scope > summary').click();await expect(page.locator('[data-investment-list]')).not.toContainText('20.00%');await expect(page.locator('[data-investment-list]')).not.toContainText('3인 분석 완료');await expect(page.locator('[data-investment-event]')).toHaveCount(2);
});
