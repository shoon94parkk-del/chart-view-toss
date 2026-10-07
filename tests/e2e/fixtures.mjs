import { test as base, expect } from '@playwright/test';
import { payloadFor, quotes } from './data.mjs';

export { expect };
export const test = base.extend({
  qa: [async ({ context, page }, use, testInfo) => {
    const errors = [], unexpected = [], calls = [];
    const overrides = new Map();
    const observe = opened => {
      opened.on('pageerror', error => errors.push(error.message));
      opened.on('console', message => {
        if (message.type() === 'error' && /hydration|uncaught|chunkload|syntaxerror/i.test(message.text())) errors.push(message.text());
      });
    };
    observe(page);
    context.on('page', observe);
    // The fixture is installed before navigation, including early requests in index.html.
    await page.clock.setFixedTime(new Date('2026-10-07T06:35:00Z'));
    await context.addInitScript(rows => {
      // axe's result collector opens about:blank, where localStorage has no
      // origin. Seed actual HTTP app pages only; app errors remain observable.
      if (!['http:', 'https:'].includes(location.protocol)) return;
      localStorage.setItem('chartview-toss-watchlist-v1', JSON.stringify(rows.map(row => ({ symbol: row.ticker, name: row.name }))));
      localStorage.setItem('chartview-toss-selected-v1', JSON.stringify([rows[0].ticker]));
    }, quotes);
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace(/^\/backend/, '');
      if (path.startsWith('/api/') || path.startsWith('/static/data/')) {
        calls.push({ path, query: url.search, method: route.request().method() });
        try {
          const override = overrides.get(path) || overrides.get('*');
          if (override) return await override(route, url);
          return await route.fulfill({ json: payloadFor(url) });
        } catch (error) {
          unexpected.push(error.message);
          return route.fulfill({ status: 500, json: { detail: error.message } });
        }
      }
      // CI must never silently make provider/LLM requests through a missing mock.
      if (!['127.0.0.1', 'localhost'].includes(url.hostname) && url.origin !== new URL(testInfo.project.use.baseURL || process.env.E2E_BASE_URL || 'http://127.0.0.1:4173').origin) {
        unexpected.push(`Unexpected external request: ${url.origin}${path}`);
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    await use({ calls, overrides });
    await testInfo.attach('api-calls', { body: JSON.stringify(calls, null, 2), contentType: 'application/json' });
    await testInfo.attach('browser-errors', { body: JSON.stringify({ errors, unexpected }, null, 2), contentType: 'application/json' });
    expect(errors, 'No fatal JavaScript/hydration errors').toEqual([]);
    expect(unexpected, 'Every data request must have an explicit deterministic contract').toEqual([]);
  }, { auto: true }],
});

export async function noOverflow(page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
}
export async function contained(locator) {
  const bounds = await locator.evaluate(el => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, width: innerWidth };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(-1);
  expect(bounds.right).toBeLessThanOrEqual(bounds.width + 1);
}
export async function touchable(locator, { min = 44 } = {}) {
  await locator.scrollIntoViewIfNeeded();
  // Browser viewport visibility alone ignores the fixed bottom navigation.
  // Scroll a content target to the usable center, as a user would.
  await locator.evaluate(el => {
    if (!el.closest('nav[aria-label="주요 메뉴"]')) el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  });
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();
  await expect.poll(() => locator.evaluate((el, min) => {
    const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { sized: r.width >= 44 && r.height >= min, reachable: !!hit && (hit === el || el.contains(hit)) };
  }, min)).toEqual({ sized: true, reachable: true });
  await locator.click({ trial: true });
}
export async function openHome(page) {
  const response = await page.goto('/#home');
  expect(response.status()).toBe(200);
  await expect(page.locator('#market-card [data-stock-detail="^KS11"]')).toBeVisible();
}
export async function fromMenu(page, route) {
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '분석', exact: true }).click();
  await page.locator(`button[data-tab="${route}"]`).click();
  await expect(page.locator(`[data-surface="${route}"]`)).toBeVisible();
}
