import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const privacy = readFileSync('public/privacy.html', 'utf8');
test('privacy discloses existing anonymous activity transport separately from official quality metrics', () => {
  assert.match(privacy, /접속 상태.*Chart View.*백엔드/s);
  assert.match(privacy, /토스.*공식.*SDK.*anonymous_key/s);
  assert.doesNotMatch(privacy, /이 값은 자체 서버나 분석 업체로 전송하지 않습니다/);
});
test('privacy excludes personal research content from metrics and discloses optional review cooldown controls', () => {
  assert.match(privacy, /검색어.*종목 코드.*질문.*메모.*이용 품질.*포함하지/s);
  assert.match(privacy, /후기.*30일/s);
  assert.match(privacy, /다시 안내하지 않기/);
});
