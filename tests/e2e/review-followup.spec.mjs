import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test, expect, noOverflow } from './fixtures.mjs';
import { quotes, asOf } from './data.mjs';

async function audit(page, info, name, contrastOnly = false) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  const result = await new AxeBuilder({ page }).options(contrastOnly ? {
    runOnly: { type: 'rule', values: ['color-contrast'] },
  } : {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'meta-viewport': { enabled: false } },
  }).analyze();
  await info.attach(`axe-${name}`, { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  return result;
}

test('review accessibility expanded PICK: technical context and missing evidence stay readable', async ({ page }, info) => {
  await page.goto('/#picks');
  const row = page.locator('.pick-ledger-row').first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(row).toHaveAttribute('aria-expanded', 'true');
  const explanation = page.locator('.pick-ledger-tech-detail small').first();
  const missing = page.locator('.pick-ledger-muted').first();
  await expect(explanation).toBeVisible();
  await expect(missing).toBeVisible();
  // Prove the real expanded content is audited: the original unreadable
  // foreground must fail, including content below the initial viewport.
  const explanationText = (await explanation.textContent()).trim();
  const original = await explanation.getAttribute('style');
  try {
    await explanation.evaluate(el => el.style.setProperty('color', '#8b95a1', 'important'));
    const negative = await audit(page, info, 'pick-original-color', true);
    expect(negative.violations.flatMap(v => v.nodes).some(n => n.html.includes(explanationText))).toBe(true);
  } finally {
    await explanation.evaluate((el, value) => value === null ? el.removeAttribute('style') : el.setAttribute('style', value), original);
  }
  expect((await audit(page, info, 'pick-expanded')).violations).toEqual([]);
  await noOverflow(page);
});

test('review accessibility tools: favicon failure keeps readable local fallback names', async ({ page }, info) => {
  await page.route('**/s2/favicons?*', route => route.abort('failed'));
  await page.goto('/#tools');
  await expect(page.locator('.investment-tool-card')).toHaveCount(12);
  const logos = page.locator('.investment-tool-logo');
  await expect.poll(() => logos.locator('img:not([hidden])').count()).toBe(0);
  for (const color of ['green', 'purple']) {
    const letters = page.locator(`.investment-tool-logo.${color}>span`).first();
    await expect(letters).toBeVisible();
    expect((await letters.textContent()).trim()).not.toBe('');
  }
  expect((await audit(page, info, 'tools-favicon-failure')).violations).toEqual([]);
  await noOverflow(page);
});

test('review diagnostics: performance probes recognize the actual grouped full heatmap', async ({ page, qa }) => {
  const us = Array.from({ length: 40 }, (_, i) => ({ ...quotes[2], ticker: i ? `US${i}` : 'NVDA', name: i ? `미국 기업 ${i}` : '엔비디아', marketCap: 1e12 - i * 1e9 }));
  qa.overrides.set('/api/heatmap/full', route => route.fulfill({ json: { generatedAt: asOf, results: us, complete: true } }));
  await page.goto('/#heatmap');
  await page.getByRole('button', { name: '미국', exact: true }).click();
  await expect(page.locator('.market-map-stock')).toHaveCount(40);
  await expect(page.locator('.home-heatmap-cell')).toHaveCount(0);
  const configs = path => {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    const declaration = source.match(/const routes=\[[\s\S]*?\];/)[0];
    return runInNewContext(`${declaration}\nroutes;`);
  };
  const selector = configs('../../scripts/measure-site.mjs').find(row => row[0] === 'heatmap')[2];
  await expect(page.locator(selector).first()).toBeVisible();
  const ready = configs('../production_performance_audit.mjs').find(row => row.route === 'heatmap').ready;
  expect(await page.evaluate(ready), 'The public performance audit must not time out on a valid grouped map').toBe(true);
  // A mounted shell alone cannot be reported as ready.
  await page.locator('.market-map-stock').evaluateAll(nodes => nodes.forEach(node => node.remove()));
  expect(await page.evaluate(ready)).toBe(false);
});
