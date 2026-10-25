import {test,expect,noOverflow} from './fixtures.mjs';

const workflowKeys=['chartview-toss-research-tasks-v1','chartview-toss-saved-sets-v1','chartview-toss-research-evidence-v1'];

test('device reset clears all personal workflow stores and explains the added records',async({page})=>{
 await page.goto('/#info');
 await page.evaluate(keys=>keys.forEach(key=>localStorage.setItem(key,JSON.stringify({version:1,rows:[],privateMarker:'private research'}))),workflowKeys);
 await expect(page.locator('.local-data-card')).toContainText('저장 세트');
 await expect(page.locator('.local-data-card')).toContainText('뉴스 근거');
 await page.locator('#clear-local-data').click();
 await page.locator('#clear-local-data').click();
 await expect(page.locator('#clear-local-data')).toHaveText('초기화 완료');
 expect(await page.evaluate(keys=>keys.map(key=>localStorage.getItem(key)),workflowKeys)).toEqual([null,null,null]);
 await noOverflow(page);
});

test('comparison and article research controls do not add provider calls on Home',async({page,qa})=>{
 await page.goto('/#home');
 await expect(page.locator('#home-watchlist')).toContainText('삼성전자');
 expect(qa.calls.some(call=>/research-evidence|saved-sets|research-tasks/.test(call.path))).toBe(false);
 await page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name:'수익률',exact:true}).click();
 await expect(page.locator('#chart-saved-sets [data-saved-sets="comparison"]')).toBeVisible();
 await page.goto('/#detail/NVDA');
 await expect(page.locator('#detail-research-evidence')).toBeAttached();
 await expect(page.locator('#detail-price')).toContainText('183.42');
 await noOverflow(page);
});
