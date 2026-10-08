import { test, expect, noOverflow, touchable } from './fixtures.mjs';
import { exportSnapshot, industryDetails } from './data.mjs';
import { normalizeExportItemDetail, formatUsdBillion } from '../../src/exportMomentumModel.js';

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const panel = (page, key) => page.locator(`[data-export-panel="${key}"]`);
const tab = (page, key) => page.locator(`[data-export-topic="${key}"]`);
const industryCalls = qa => qa.calls.filter(call => call.path === '/api/export-momentum/item-detail');
const monthlyCalls = qa => qa.calls.filter(call => call.path === '/api/export-momentum');

function holdMonthly(qa) {
  const gate = deferred(), arrived = deferred();
  qa.overrides.set('/api/export-momentum', async route => {
    arrived.resolve();
    await gate.promise;
    return route.fulfill({ json: exportSnapshot });
  });
  return { gate, arrived };
}

async function readyIndustry(page, key) {
  const current = panel(page, key);
  await expect(current).toBeVisible();
  await expect(current).toHaveAttribute('data-load-state', 'ready');
  const normalized = normalizeExportItemDetail(industryDetails[key]);
  await expect(current.getByTestId('industry-metrics')).toContainText(
    formatUsdBillion(normalized.history.at(-1).exportsUsdBillion, { digits: 1 }),
  );
  await expect(current.locator('.export-section-head').first()).toContainText('9월');
  await expect(current.getByTestId('export-month').last()).toHaveAttribute('aria-label', new RegExp(`^${normalized.history.at(-1).period} `));
  await expect(current.getByTestId('export-month')).toHaveCount(36);
  return current;
}

test('monthly delay: tabs and selected industry work before the monthly response', async ({ page, qa }, info) => {
  const { gate, arrived } = holdMonthly(qa);
  try {
    await page.goto('/#exports');
    await arrived.promise;
    for (const key of ['overview', 'products', 'countries', 'semiconductor', 'passenger-car', 'petroleum', 'cosmetics', 'ships', 'steel']) {
      await expect(tab(page, key)).toBeEnabled();
    }
    if(info.project.name==='desktop-chromium')await tab(page,'cosmetics').click({trial:true});
    else await touchable(tab(page,'cosmetics'));
    await tab(page, 'cosmetics').click();
    const current = await readyIndustry(page, 'cosmetics');
    const value = await current.getByTestId('industry-metrics').innerText();
    expect(industryCalls(qa).map(call => new URLSearchParams(call.query).get('key'))).toEqual(['cosmetics']);
    await expect(panel(page, 'overview')).toHaveAttribute('data-load-state', 'loading');
    gate.resolve();
    await expect(panel(page, 'overview')).toHaveAttribute('data-load-state', 'ready');
    await expect(current).toBeVisible();
    await expect(current.getByTestId('industry-metrics')).toHaveText(value,{useInnerText:true});
    await expect(tab(page, 'cosmetics')).toHaveAttribute('aria-selected', 'true');
    await noOverflow(page);
  } finally { gate.resolve(); }
});

test('monthly failure: direct industry remains usable and retry is confined to monthly data', async ({ page, qa }) => {
  let failMonthly = true;
  qa.overrides.set('/api/export-momentum', route => failMonthly
    ? route.fulfill({ status: 503, json: { detail: 'monthly unavailable' } })
    : route.fulfill({ json: exportSnapshot }));
  await page.goto('/#exports/steel');
  await readyIndustry(page, 'steel');
  await expect(panel(page, 'overview')).toHaveAttribute('data-load-state', 'error');
  await expect(tab(page, 'steel')).toBeEnabled();
  await tab(page, 'overview').click();
  await expect(panel(page, 'overview')).toHaveAttribute('data-load-state', 'error');
  const retry = panel(page, 'overview').locator('[data-export-retry]');
  await touchable(retry);
  const count = monthlyCalls(qa).length;
  failMonthly = false;
  await retry.click();
  await expect(panel(page, 'overview')).toHaveAttribute('data-load-state', 'ready');
  expect(monthlyCalls(qa).length).toBe(count + 1);
  expect(industryCalls(qa).length).toBe(1);
  await tab(page, 'steel').click();
  await readyIndustry(page, 'steel');
  expect(industryCalls(qa).length).toBe(1);
  await noOverflow(page);
});

test('industry failure retries its endpoint while monthly data remains pending', async ({ page, qa }) => {
  const { gate } = holdMonthly(qa);
  let failIndustry = true;
  qa.overrides.set('/api/export-momentum/item-detail', (route, url) => failIndustry
    ? route.fulfill({ status: 503, json: { detail: 'industry unavailable' } })
    : route.fulfill({ json: industryDetails[url.searchParams.get('key')] }));
  try {
    await page.goto('/#exports/cosmetics');
    await expect(panel(page, 'cosmetics')).toHaveAttribute('data-load-state', 'error');
    const retry = panel(page, 'cosmetics').locator('[data-export-industry-retry="cosmetics"]');
    await touchable(retry);
    failIndustry = false;
    await retry.click();
    await readyIndustry(page, 'cosmetics');
    expect(industryCalls(qa).map(call => new URLSearchParams(call.query).get('key'))).toEqual(['cosmetics', 'cosmetics']);
    expect(monthlyCalls(qa).length).toBe(1);
    await expect(panel(page, 'overview')).toHaveAttribute('data-load-state', 'loading');
    await noOverflow(page);
  } finally { gate.resolve(); }
});

test('late previous industry response cannot replace a newly selected industry', async ({ page, qa }) => {
  const { gate: monthly } = holdMonthly(qa);
  const cosmetics = deferred(), arrived = deferred();
  qa.overrides.set('/api/export-momentum/item-detail', async (route, url) => {
    const key = url.searchParams.get('key');
    if (key === 'cosmetics') { arrived.resolve(); await cosmetics.promise; }
    return route.fulfill({ json: industryDetails[key] });
  });
  try {
    await page.goto('/#exports/cosmetics');
    await arrived.promise;
    await tab(page, 'steel').click();
    const current = await readyIndustry(page, 'steel');
    const response = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/api/export-momentum/item-detail')
      && new URL(response.url()).searchParams.get('key') === 'cosmetics');
    cosmetics.resolve();
    expect((await response).status()).toBe(200);
    await expect(tab(page, 'steel')).toHaveAttribute('aria-selected', 'true');
    await expect(current).toBeVisible();
    await tab(page, 'cosmetics').click();
    await readyIndustry(page, 'cosmetics');
    expect(industryCalls(qa).map(call => new URLSearchParams(call.query).get('key'))).toEqual(['cosmetics', 'steel']);
  } finally { cosmetics.resolve(); monthly.resolve(); }
});

test('manual keyboard tab activation preserves focus after late monthly completion', async ({ page, qa }) => {
  const { gate } = holdMonthly(qa);
  try {
    await page.goto('/#exports');
    await tab(page, 'overview').focus();
    await page.keyboard.press('ArrowRight');
    await expect(tab(page, 'products')).toBeFocused();
    expect(industryCalls(qa).length).toBe(0);
    await expect(tab(page, 'overview')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Enter');
    await expect(tab(page, 'products')).toHaveAttribute('aria-selected', 'true');
    await expect(tab(page, 'products')).toBeFocused();
    gate.resolve();
    await expect(panel(page, 'products')).toHaveAttribute('data-load-state', 'ready');
    await expect(tab(page, 'products')).toBeFocused();
    await page.keyboard.press('End');
    await expect(tab(page, 'steel')).toBeFocused();
    expect(industryCalls(qa).length).toBe(0);
    await page.keyboard.press('Enter');
    await readyIndustry(page, 'steel');
    await expect(tab(page, 'steel')).toBeFocused();
  } finally { gate.resolve(); }
});

test('monthly failure does not block independent semiconductor DRAM analysis', async ({ page, qa }) => {
  qa.overrides.set('/api/export-momentum', route => route.fulfill({ status: 503, json: { detail: 'monthly unavailable' } }));
  await page.goto('/#exports/memory');
  const current = panel(page, 'semiconductor');
  await expect(current).toHaveAttribute('data-load-state', 'ready');
  await expect(current.locator('[data-export-monthly-semiconductor]')).toContainText('수출 데이터를 표시하지 못했어요.');
  const dram = current.locator('[data-export-semi-segment="dram"]');
  await touchable(dram);
  await dram.click();
  await expect(current.locator('#export-semi-chart-focus')).toContainText('DRAM');
  await expect(current.getByTestId('semiconductor-month')).toHaveCount(12);
  expect(industryCalls(qa).length).toBe(0);
  await noOverflow(page);
});
