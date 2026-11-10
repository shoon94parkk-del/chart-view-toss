import AxeBuilder from '@axe-core/playwright';
import {test,expect,noOverflow,touchable} from './fixtures.mjs';
import {memoryPrices} from './data.mjs';

const fixture=()=>{
 const raw=structuredClone(memoryPrices),group=raw.groups[0];
 group.sourceDate='2026-11-09';group.updatedAt='2026-11-09T18:10:00+08:00';
 group.items=[{key:'ddr5',name:'DDR5 16Gb (2Gx8) 4800/5600',average:40,changePct:2,dailyLow:35,dailyHigh:45,sessionLow:38,sessionHigh:42,unit:'USD'},
 {key:'ddr4',name:'DDR4 8Gb',average:5,changePct:0,dailyLow:4,dailyHigh:6,unit:'USD'}];
 raw.items=group.items;
 raw.history=['2026-07-01','2026-09-01','2026-10-20','2026-11-01','2026-11-09','2026-11-10'].map((date,i)=>({date,values:{ddr5:[10,20,25,30,40,999][i],ddr4:[2,3,0,4,5,999][i]}}));
 return raw;
};
const setup=(qa,raw)=>qa.overrides.set('/api/memory-prices',route=>route.fulfill({json:raw}));

test('integration memory detail: actual history → range statistics, date selection and source details',async({page,qa},info)=>{
 setup(qa,fixture());await page.goto('/#memory');
 const detail=page.locator('[data-memory-detail]');
 await expect(detail).toContainText('DDR5 16Gb (2Gx8) 4800/5600');
 await expect(detail.locator('[data-memory-stat="count"]')).toHaveText('5회');
 await expect(detail.locator('[data-memory-stat="change"]')).toHaveText('+300.00%');
 await expect(detail.locator('[data-memory-stat="average"]')).toHaveText('$25.00');
 await expect(detail.locator('[data-memory-stat="low"]')).toContainText('$10.00');
 await expect(detail.locator('[data-memory-stat="high"]')).toContainText('$40.00');
 const slider=page.getByRole('slider',{name:'관측일 선택'});
 await slider.focus();await page.keyboard.press('Home');
 await expect(detail.locator('[data-memory-observation]')).toContainText('2026. 7. 1.');
 await expect(detail.locator('[data-memory-observation]')).toContainText('$10.00');
 await page.keyboard.press('ArrowRight');
 await expect(detail.locator('[data-memory-observation]')).toContainText('+100.00%');
 const chart=detail.locator('[data-memory-chart]'),bounds=await chart.boundingBox();
 const action=info.project.use.hasTouch?'tap':'click';
 await chart[action]({position:{x:bounds.width*.29,y:bounds.height*.4}});
 await expect(detail.locator('[data-memory-observation]')).toContainText('2026. 7. 1.');
 await chart[action]({position:{x:bounds.width*.96,y:bounds.height*.4}});
 await expect(detail.locator('[data-memory-observation]')).toContainText('2026. 11. 9.');
 await page.getByText('날짜별 누적 이력', {exact:false}).click();
 await expect(detail.locator('tbody tr')).toHaveCount(5);
 await expect(detail.locator('tbody tr').first()).toContainText('$40.00');
 await expect(detail.locator('tbody tr').first()).toContainText('+33.33%');
 await page.getByText('품목·가격 기준 자세히', {exact:false}).click();
 await expect(detail.locator('[data-memory-metadata]')).toContainText('USD');
 await expect(detail.locator('[data-memory-metadata]')).toContainText('$38.00');
 await expect(detail.locator('[data-memory-metadata]')).toContainText('공급자 게시');
 await noOverflow(page);
 await info.attach('memory-detail',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
});

test('integration memory detail: period and index recalculate visible data without fetching',async({page,qa})=>{
 setup(qa,fixture());await page.goto('/#memory');
 const period=page.getByRole('button',{name:'1개월',exact:true});await touchable(period);await period.click();
 await expect(period).toBeFocused();
 await expect(page.locator('[data-memory-stat="count"]')).toHaveText('3회');
 await expect(page.locator('[data-memory-stat="change"]')).toHaveText('+60.00%');
 await page.getByRole('button',{name:'시작값 100',exact:true}).click();
 await expect(page.locator('[data-memory-plot]')).toHaveAttribute('data-mode','index');
 await expect(page.locator('[data-memory-observation]')).toContainText('지수 160.00');
 const select=page.getByLabel('상세 품목 선택');await select.selectOption('ddr4');
 await expect(page.locator('[data-memory-stat="count"]')).toHaveText('3회');
 await expect(page.locator('[data-memory-stat="change"]')).toHaveText('계산 불가');
 await expect(page.getByRole('button',{name:'시작값 100',exact:true})).toBeDisabled();
 await expect(page.locator('[data-memory-detail]')).toContainText('시작 가격이 0');
 await page.getByRole('tab',{name:'NAND 칩',exact:true}).click();
 await page.getByRole('tab',{name:'DRAM 칩',exact:true}).click();
 await expect(page.getByLabel('상세 품목 선택')).toHaveValue('ddr4');
 expect(qa.calls.filter(call=>call.path==='/api/memory-prices')).toHaveLength(1);
 await noOverflow(page);
});

test('memory detail: no observations and single observation remain explicit',async({page,qa})=>{
 const raw=fixture();raw.history=[{date:'2026-11-09',values:{ddr5:' ',ddr4:0}}];setup(qa,raw);
 await page.goto('/#memory');await expect(page.locator('[data-memory-detail]')).toContainText('이 기간에 수집된 가격이 없어요');
 await expect(page.getByRole('slider',{name:'관측일 선택'})).toHaveCount(0);
 await page.getByLabel('상세 품목 선택').selectOption('ddr4');
 await expect(page.locator('[data-memory-stat="count"]')).toHaveText('1회');
 await expect(page.locator('[data-memory-detail]')).toContainText('관측값 1개');
 await expect(page.locator('[data-memory-observation]')).toContainText('$0.00');
 await noOverflow(page);
});

test('integration memory detail: a real zero previous price is not a missing observation',async({page,qa})=>{
 setup(qa,fixture());await page.goto('/#memory');
 await page.getByLabel('상세 품목 선택').selectOption('ddr4');
 const slider=page.getByRole('slider',{name:'관측일 선택'});
 await slider.focus();await page.keyboard.press('Home');
 for(let i=0;i<3;i++)await page.keyboard.press('ArrowRight');
 await expect(page.locator('[data-memory-observation]')).toContainText('직전 가격이 0');
 await expect(page.locator('[data-memory-observation]')).toContainText('$4.00');
 await page.getByText('날짜별 누적 이력',{exact:false}).click();
 await expect(page.locator('.memory-history-table tbody tr').nth(1)).toContainText('계산 불가');
 await noOverflow(page);
});

test('accessibility memory detail expanded: product controls, chart and history at mobile widths',async({page,qa},info)=>{
 setup(qa,fixture());await page.goto('/#memory');
 await expect(page.locator('[data-memory-detail]')).toBeVisible();
 const sizes=await page.locator('[data-memory-chart] text').evaluateAll(nodes=>nodes.map(node=>parseFloat(getComputedStyle(node).fontSize)*node.getScreenCTM().a));
 expect(Math.min(...sizes)).toBeGreaterThanOrEqual(12);
 for(const control of [page.getByRole('button',{name:'3개월',exact:true}),page.getByLabel('상세 품목 선택')])await touchable(control);
 await page.getByText('날짜별 누적 이력',{exact:false}).click();
 await page.getByText('품목·가격 기준 자세히',{exact:false}).click();
 await page.evaluate(()=>scrollTo(0,0));
 const results=await new AxeBuilder({page}).options({runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']},rules:{'meta-viewport':{enabled:false}}}).analyze();
 await info.attach('axe-memory-detail',{body:JSON.stringify(results),contentType:'application/json'});
 expect(results.violations).toEqual([]);await noOverflow(page);
});
