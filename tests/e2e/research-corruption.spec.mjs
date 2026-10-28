import {test,expect,noOverflow} from './fixtures.mjs';

test('corrupt saved questions remain intact and a failed save retains the typed draft',async({page})=>{
 const raw='{"005930.KS":{"question":"recoverable question"}';
 await page.addInitScript(raw=>localStorage.setItem('chartview-toss-research-v1',raw),raw);
 await page.goto('/#detail/005930.KS');
 const input=page.locator('#research-question');
 await input.fill('확인하고 싶은 새로운 질문');
 await page.locator('[data-research-save]').click();
 await expect(page.locator('#research-save-state')).toContainText('손상되어 변경하지 않았어요');
 await expect(input).toHaveValue('확인하고 싶은 새로운 질문');
 await expect(page.locator('[data-research-save]')).toBeEnabled();
 expect(await page.evaluate(()=>localStorage.getItem('chartview-toss-research-v1'))).toBe(raw);
 await noOverflow(page);
});
