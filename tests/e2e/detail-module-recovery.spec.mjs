import {test,expect,noOverflow,touchable} from './fixtures.mjs';

for(const item of [
  {chunk:'researchCard',host:'#research-card-body',ready:'.research-form'},
  {chunk:'quarterView',host:'#detail-financial-quarters',ready:'.financial-empty'},
]) {
  test(`detail optional ${item.chunk}: failed chunk preserves price/chart and explicit retry recovers`,async({page},info)=>{
    let requests=0;
    await page.route(new RegExp(`/assets/${item.chunk}-[^/]+\\.js(?:\\?.*)?$`),route=>++requests===1?route.abort('failed'):route.continue());
    await page.goto('/#detail/005930.KS');
    const host=page.locator(item.host);
    await expect(host.getByRole('alert')).toBeVisible();
    await expect(page.locator('#detail-price .quote-main strong').first()).toContainText(/[0-9]/);
    await expect(page.locator('#detail-chart canvas').first()).toBeVisible();
    const retry=host.locator('[data-retry-detail-module]');
    await touchable(retry);await noOverflow(page);
    await info.attach(`${item.chunk}-local-failure`,{body:await page.screenshot(),contentType:'image/png'});
    const reload=page.waitForEvent('domcontentloaded');await retry.click();await reload;
    await expect(page).toHaveURL(/#detail\/005930.KS$/);
    await expect(host.getByRole('alert')).toHaveCount(0);
    await expect(host.locator(item.ready).first()).toBeVisible();
    await expect(page.locator('#detail-price .quote-main strong').first()).toContainText(/[0-9]/);
    expect(requests).toBeGreaterThanOrEqual(2);await noOverflow(page);
  });
}
