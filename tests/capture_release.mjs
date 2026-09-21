// Real backend only: these captures are suitable for the console, unlike QA fixtures.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const out = process.env.RELEASE_OUTPUT || 'artifacts/release';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 636, height: 1048 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror', error=>errors.push(error.message));
  // Local port 8080 is already allowed by the shared API's CORS configuration.
  const base=process.env.QA_BASE_URL || 'http://127.0.0.1:8080';
  for (const [route,name,ready] of [
    ['/', '01-home', '.quote-card'],
    ['/chartviewHome', '02-chart', '#chart-canvas canvas'],
    ['/#valuation', '03-valuation', '.valuation-compare-row'],
  ]) {
    await page.goto(base+route);
    await page.locator(ready).first().waitFor({timeout:45000});
    await page.screenshot({path:`${out}/${name}.png`});
  }
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('Live release screenshots captured:',out);
} finally { await browser.close(); }
