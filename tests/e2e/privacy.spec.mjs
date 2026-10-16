import AxeBuilder from '@axe-core/playwright';
import {test,expect,noOverflow} from './fixtures.mjs';

test('privacy: local checkpoint retention and deletion are readable without app data requests',async({page,qa},info)=>{
 const response=await page.goto('/privacy.html');expect(response.status()).toBe(200);
 await expect(page.getByRole('heading',{name:'개인정보 처리 안내',exact:true})).toBeVisible();
 await expect(page.locator('main')).toContainText('종목별 최근 20개의 연구 체크포인트');
 await expect(page.locator('main')).toContainText('해당 질문 삭제 또는 기기 데이터 초기화로 함께 삭제');
 const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 await info.attach('privacy-axe',{body:JSON.stringify(audit),contentType:'application/json'});
 expect(audit.violations,'Static policy text and contact links meet contrast and structural requirements').toEqual([]);
 await noOverflow(page);
 expect(qa.calls,'Opening the standalone policy must not request app/market/analytics data').toEqual([]);
});
