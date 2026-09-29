import test from 'node:test';
import assert from 'node:assert/strict';
import { INVESTMENT_TOOLS, investmentToolsMarkup } from '../src/investmentTools.js';

test('analysis investment tools retain all original Chart View destinations', () => {
  assert.deepEqual(INVESTMENT_TOOLS.map(tool => tool.name), [
    'Finviz','FRED','Investing','TradingView','DART','KRX','Yahoo Finance',
    '네이버 금융','Koyfin','Macrotrends','Trading Economics','Seeking Alpha',
  ]);
  assert.equal(new Set(INVESTMENT_TOOLS.map(tool => tool.url)).size, 12);
  assert.ok(INVESTMENT_TOOLS.every(tool => new URL(tool.url).protocol === 'https:'));
  const markup = investmentToolsMarkup();
  assert.equal((markup.match(/data-external-url=/g) || []).length, 12);
  assert.equal((markup.match(/investment-tool-logo/g) || []).length, 12);
  assert.match(markup, /Finviz 외부 사이트 열기/);
});
