import AxeBuilder from '@axe-core/playwright';
import {test,expect,noOverflow} from './fixtures.mjs';

async function audit(page,info,name){
 const result=await new AxeBuilder({page}).options({runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']},rules:{'meta-viewport':{enabled:false}}}).analyze();
 await info.attach(`axe-${name}`,{body:JSON.stringify(result,null,2),contentType:'application/json'});
 expect.soft(result.violations,`axe violations in ${name}`).toEqual([]);await noOverflow(page);
 await page.screenshot({path:info.outputPath(`${name}.png`),fullPage:true});
}

test('personal research expanded controls keep accessible labels, contrast and mobile layout',async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem('chartview-toss-research-v1',JSON.stringify({NVDA:{question:'매출 근거 확인',reviewOn:'2026-10-07',updatedAt:'2026-10-05T00:00:00Z'}})));
 await page.goto('/#watch');
 const task=page.locator('[data-research-task-symbol="NVDA"]');await expect(task).toBeVisible();await task.locator('summary').click();
 await audit(page,info,'research-due');
 await page.goto('/#chart');
 const comparison=page.locator('[data-saved-sets="comparison"]');await comparison.locator(':scope > summary').click();
 await comparison.locator('[name="setName"]').fill('내 비교');await comparison.locator('[data-saved-set-save]').click();await expect(comparison.locator('[data-saved-set-name]')).toHaveText('내 비교');
 await comparison.locator('[data-saved-set-rename]').click();await audit(page,info,'comparison-rename');
 await page.goto('/#discover');
 const screener=page.locator('[data-saved-sets="screener"]');await screener.locator(':scope > summary').click();await audit(page,info,'screener-sets');
 await page.goto('/#news');await page.locator('[data-news-save-evidence]').first().click();
 const editor=page.locator('[data-evidence-editor]');await expect(editor).toBeVisible();await audit(page,info,'news-evidence-editor');
 const symbol=await editor.locator('[name="symbol"] option').nth(1).getAttribute('value');await editor.locator('[name="symbol"]').selectOption(symbol);
 await editor.locator('[name="memo"]').fill('다음 실적 발표 후 원문과 비교');await editor.locator('[data-evidence-save]').click();await expect(page.locator('[data-evidence-editor-status]')).toContainText('저장했어요');
 await page.goto(`/#detail/${symbol}`);const evidence=page.locator('#detail-research-evidence');await evidence.locator('[data-evidence-edit]').click();await audit(page,info,'evidence-memo');
});
