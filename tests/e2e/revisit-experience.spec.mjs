import {test,expect,noOverflow,touchable} from './fixtures.mjs';
import {quotes} from './data.mjs';
test.use({storedLists:{watchlist:quotes.filter(q=>q.ticker!=='005930.KS').map(q=>({symbol:q.ticker,name:q.name})),selected:['005930.KS']}});
const nav=(page,name)=>page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name,exact:true});

test('completed detail is available in recent stocks without a search request',async({page,qa})=>{
 await page.goto('/#detail/005930.KS');
 await expect(page.locator('#detail-price')).toContainText('103,700');
 await nav(page,'홈').click();
 const before=qa.calls.filter(c=>c.path==='/api/search').length;
 await page.locator('#home-search-open').click();
 await expect(page.locator('[data-selector-recent]')).toContainText('삼성전자');
 const recent=page.locator('[data-selector-recent] [data-selector-symbol="005930.KS"]');
 await touchable(recent);await recent.click();
 await expect(page.locator('#detail-name')).toHaveText('삼성전자');
 expect(qa.calls.filter(c=>c.path==='/api/search').length).toBe(before);
 await noOverflow(page);
});

test('watch sort preference survives reload and does not reorder saved stocks',async({page})=>{
 await page.goto('/#watch');
 const saved=await page.evaluate(()=>localStorage.getItem('chartview-toss-watchlist-v1'));
 await page.locator('[data-watch-sort="name"]').click();
 await expect(page.locator('[data-watch-sort="name"]')).toHaveAttribute('aria-pressed','true');
 await page.reload();
 await expect(page.locator('[data-watch-sort="name"]')).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>localStorage.getItem('chartview-toss-watchlist-v1'))).toBe(saved);
});

test('long detail keeps company and applied period visible with existing section controls',async({page})=>{
 await page.goto('/#detail/005930.KS');
 await expect(page.locator('#detail-name')).toHaveText('삼성전자');
 await page.locator('[data-detail-jump="detail-research-card"]').click();
 await expect(page.locator('[data-detail-reading-context]')).toBeVisible();
 await expect(page.locator('[data-detail-reading-context]')).toContainText('삼성전자');
 await expect(page.locator('[data-detail-reading-context]')).toContainText('3개월');
 const top=await page.locator('[data-detail-reading-context]').evaluate(el=>el.getBoundingClientRect().top);
 expect(top).toBeGreaterThanOrEqual(0);
 await noOverflow(page);
});
