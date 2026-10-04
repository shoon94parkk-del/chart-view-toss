import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('Apps in Toss 첫 진입 영역에 참고용·비권유 면책이 명확히 노출된다', () => {
  assert.match(main, /class="ait-review-disclaimer"[^>]*role="note"/);
  assert.match(main, /<strong>참고용<\/strong><span>투자 정보는 투자 권유가 아닙니다<\/span>/);
  assert.match(styles, /html\[data-ait-runtime="true"\] \.ait-share-row\{display:flex/);
  assert.match(styles, /\.ait-review-disclaimer\{/);
});

test('전역 데이터 안내와 상세 안내가 투자 권유 아님과 책임 주체를 명시한다', () => {
  assert.match(main, /참고용 정보 · 투자 권유 아님/);
  assert.match(main, /일반적인 정보 제공을 위한 참고 자료이며 특정 종목의 매수·매도 또는 투자 판단을 권유하지 않아요/);
  assert.match(main, /일반적인 정보 제공을 위한 참고 자료이며 투자 권유가 아닙니다/);
  assert.match(main, /최종 투자 판단과 책임은 이용자에게 있습니다/);
});
