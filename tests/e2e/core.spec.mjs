import { test, expect, openHome, fromMenu, noOverflow, contained, touchable } from './fixtures.mjs';
import { quotes, symbol, payloadFor } from './data.mjs';

test('01 앱 기본 진입과 주요 메뉴', async ({ page }) => {
  await openHome(page);
  const menu = page.getByRole('navigation', { name: '주요 메뉴' });
  for (const name of ['홈', '수익률', '관심', '분석']) await expect(menu.getByRole('button', { name, exact: true })).toBeVisible();
  await expect(page.locator('#home-search-open')).toBeVisible();
  await noOverflow(page);
});

test('02 모바일 홈: 카드 경계·버튼 가림·하단 터치', async ({ page }, info) => {
  await openHome(page);
  const nav = page.getByRole('navigation', { name: '주요 메뉴' });
  for (const button of await nav.getByRole('button').all()) await touchable(button);
  await touchable(page.locator('#home-search-open'));
  for (const button of await page.locator('.home-value-entries button').all()) await touchable(button);
  for (const card of await page.locator('#market-card [data-stock-detail]').all()) await contained(card);
  await page.locator('#home-search-open').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await noOverflow(page);
  await info.attach('home', { body: await page.screenshot(), contentType: 'image/png' });
});

test('03 관심종목 정보와 상세 왕복', async ({ page }) => {
  await openHome(page);
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '관심', exact: true }).click();
  const list = page.locator('#watch-rich-list');
  for (const quote of quotes) {
    const row = list.locator(`[data-stock-detail="${quote.ticker}"]`);
    await expect(row).toContainText(quote.name);
    await expect(row).toContainText(quote.ticker);
    await expect(row).toContainText(quote.price.toLocaleString(quote.currency === 'KRW' ? 'ko-KR' : 'en-US'));
    await expect(row).toContainText(`${quote.change > 0 ? '+' : ''}${quote.change.toFixed(2)}%`);
    await contained(row);
  }
  await list.locator(`[data-stock-detail="${symbol}"]`).click();
  await expect(page.locator('#detail-name')).toHaveText('삼성전자');
  await page.getByRole('button', { name: '뒤로가기', exact: true }).click();
  await expect(list.locator(`[data-stock-detail="${symbol}"]`)).toBeVisible();
});

for (const query of ['삼성전자', '005930.KS']) {
  test(`04 종목 검색: ${query} → 상세`, async ({ page }) => {
    await openHome(page);
    await page.locator('#home-search-open').click();
    const response = page.waitForResponse(response => new URL(response.url()).pathname === '/api/search' && new URL(response.url()).searchParams.get('q') === query);
    await page.getByRole('textbox', { name: '종목명, 코드 또는 티커 검색' }).fill(query);
    // A saved favorite cannot substitute for a successful search response.
    expect((await (await response).json()).results.some(row => row.symbol === symbol)).toBe(true);
    await expect(page.getByRole('dialog').getByRole('status')).toHaveCount(0);
    const result = page.getByRole('dialog').locator(`[data-selector-symbol="${symbol}"]`);
    await expect(result).toContainText('삼성전자');
    await expect(result).toContainText(symbol);
    await result.click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('#detail-name')).toHaveText('삼성전자');
    await expect(page).toHaveURL(/#detail\/005930.KS/);
  });
}

test('05 종목 상세: 시세·차트·지표·공시·산업·뉴스·관심 저장', async ({ page }) => {
  await page.goto(`/#detail/${symbol}`);
  await expect(page.locator('#detail-name')).toHaveText('삼성전자');
  await expect(page.locator('#detail-price')).toContainText('103,700원');
  await expect(page.locator('#detail-chart canvas').first()).toBeVisible();
  await expect(page.locator('#detail-metrics')).toContainText('15.2');
  await expect(page.locator('#detail-financial-block')).toContainText('2025');
  await page.locator('[data-detail-jump="detail-industry-block"]').click();
  await expect(page.locator('#detail-industry-block')).toContainText('DRAM');
  await page.locator('[data-detail-jump="detail-news-section"]').click();
  await expect(page.locator('#detail-news')).toContainText('삼성전자 실적 공시 확인');
  const interest = page.locator('#detail-watch');
  await expect(interest).toHaveAttribute('aria-pressed', 'true');
  await interest.click();
  await expect(interest).toHaveAttribute('aria-pressed', 'false');
  await interest.click();
  await expect(interest).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(interest).toHaveAttribute('aria-pressed', 'true');
  await noOverflow(page);
});

test('08 선정 기록: 항상 펼쳐진 성과·상태와 모바일 목록', async ({ page }, info) => {
  await openHome(page);
  await fromMenu(page, 'picks');
  const performance = page.getByTestId('pick-performance');
  const status = page.getByTestId('pick-status');
  await expect(performance).toBeVisible();
  await expect(status).toBeVisible();
  await expect(page.locator('[data-pick-expand]')).toHaveCount(4);
  for (const overview of [performance, status]) {
    await contained(overview);
    if (info.project.name !== 'desktop-chromium') {
      const box = await overview.boundingBox();
      const nav = await page.getByRole('navigation', { name: '주요 메뉴' }).boundingBox();
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThan(nav.y);
    }
  }
  const rows = page.locator('[data-pick-expand]');
  for (const row of await rows.all()) {
    await contained(row);
    if (info.project.name !== 'desktop-chromium') expect((await row.boundingBox()).height).toBeLessThanOrEqual(64);
  }
  await touchable(rows.first());
  await rows.first().click();
  await expect(rows.first()).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-pick-detail]:visible')).toContainText('추천 당시 이유');
  await noOverflow(page);
  await info.attach('picks', { body: await page.screenshot(), contentType: 'image/png' });
});

test('09 실제 메뉴 순회와 직접 진입 HTTP 상태', async ({ page, request }) => {
  await openHome(page);
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '수익률', exact: true }).click();
  await expect(page.locator('#chart-canvas canvas').first()).toBeVisible();
  for (const route of ['exports', 'discover', 'ideas', 'picks']) {
    await fromMenu(page, route);
    const ready = { exports: '[data-export-topic="semiconductor"]', discover: '[data-stock-detail="005930.KS"]', ideas: '[data-idea-symbol="005930.KS"]', picks: '[data-pick-expand]' }[route];
    await expect(page.locator(ready).first()).toBeVisible();
    await noOverflow(page);
    await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '홈', exact: true }).click();
    await expect(page.locator('#home-search-open')).toBeVisible();
  }
  for (const path of ['/chart/', '/watch/', '/exports/', '/discover/', '/ideas/', '/picks/']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(await response.text()).toContain('id="app"');
  }
  await page.goto('/#unknown-qa-route');
  await expect(page.getByRole('heading', { name: /화면.*찾|페이지.*없/, level: 2 })).toBeVisible();
});

for (const mode of ['503', 'empty', 'delayed']) {
  test(`10 선택 데이터 ${mode}: 시세 유지·독립 복구`, async ({ page, qa }) => {
    let recover = false, release;
    const pending = new Promise(resolve => { release = resolve; });
    qa.overrides.set('/api/financial-history', async (route, url) => {
      if (mode === 'delayed') await pending;
      if (!recover && mode === '503') return route.fulfill({ status: 503, json: { detail: 'temporary outage' } });
      if (!recover && mode === 'empty') return route.fulfill({ json: { available: false } });
      return route.fulfill({ json: payloadFor(url) });
    });
    try {
      await page.goto(`/#detail/${symbol}`);
      await expect(page.locator('#detail-price')).toContainText('103,700원');
      await expect(page.locator('#detail-news')).toContainText('삼성전자 실적 공시 확인');
      if (mode === 'delayed') {
        await expect(page.locator('#detail-financial-block').getByRole('status').first()).toBeVisible();
        recover = true; release();
      } else {
        const financial = page.locator('#detail-financial-block');
        await expect(financial).toContainText(mode === '503' ? /불러오지 못|실패/ : /없|미제공|확인.*어려/);
        if (mode === '503') {
          recover = true;
          const before = qa.calls.filter(call => call.path === '/api/quotes').length;
          await financial.locator('[data-retry-financial]').click();
          await expect(financial).toContainText('2025');
          expect(qa.calls.filter(call => call.path === '/api/quotes').length).toBe(before);
        }
      }
      if (mode === 'delayed') await expect(page.locator('#detail-financial-block')).toContainText('2025');
      await noOverflow(page);
    } finally { release(); }
  });
}

test('10 홈 전체 API 장애: 흰 화면 방지와 실제 재시도 복구', async ({ page, qa }) => {
  let recover = false;
  qa.overrides.set('*', (route, url) => recover ? route.fulfill({ json: payloadFor(url) }) : route.fulfill({ status: 503, json: { detail: 'QA service unavailable' } }));
  await page.goto('/#home');
  await expect(page.locator('#retry-market')).toBeVisible();
  await expect(page.locator('#home-search-open')).toBeVisible();
  const nav = page.getByRole('navigation', { name: '주요 메뉴' });
  await expect(nav.getByRole('button', { name: '홈', exact: true })).toBeVisible();
  await expect(page.locator('#home-watchlist')).toContainText('삼성전자');
  recover = true;
  await page.locator('#retry-market').click();
  await expect(page.locator('#market-card [data-stock-detail="^KS11"]')).toBeVisible();
  await noOverflow(page);
});
