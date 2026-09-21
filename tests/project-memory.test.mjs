import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const text = path => fs.readFileSync(new URL(path, root), 'utf8');

test('durable Toss project memory is present', () => {
  for (const path of ['AGENTS.md','docs/project-memory.md','docs/regression-guardrails.md','docs/decision-log.md']) {
    assert.equal(fs.existsSync(new URL(path, root)), true, path);
  }
  const agents = text('AGENTS.md');
  const memory = text('docs/project-memory.md');
  const guard = text('docs/regression-guardrails.md');

  for (const path of ['docs/project-memory.md','docs/regression-guardrails.md','docs/decision-log.md']) {
    assert.equal(agents.includes(path), true, path);
  }
  assert.equal(memory.includes('https://chart-view-toss.onrender.com'), true);
  assert.equal(memory.includes('https://chart-view-pkv8.onrender.com'), true);
  assert.equal(memory.includes('Device.openURL'), true);
  assert.equal(memory.includes('Real Android and iOS Sandbox/QR'), true);
  assert.equal(guard.includes('Native navigation bar'), true);
  assert.equal(guard.includes('Late/stale responses'), true);
  assert.equal(guard.includes('real-device Sandbox/QR'), true);
});
