import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifestPath = path.join(root, '.reviewbench', 'chartview-golden.json');

test('ChartView ReviewBench golden set is valid and points to real regression evidence', () => {
  assert.equal(fs.existsSync(manifestPath), true);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.mode, 'advisory');
  assert.ok(Array.isArray(manifest.cases) && manifest.cases.length >= 5);

  const ids = new Set();
  const severities = new Set(['critical', 'medium', 'low']);
  const categories = new Set(['correctness', 'security', 'reliability', 'maintainability', 'testing']);

  for (const item of manifest.cases) {
    assert.equal(typeof item.id, 'string');
    assert.equal(ids.has(item.id), false, `duplicate id: ${item.id}`);
    ids.add(item.id);
    assert.equal(severities.has(item.severity), true, `invalid severity: ${item.id}`);
    assert.equal(categories.has(item.category), true, `invalid category: ${item.id}`);
    assert.ok(item.contract?.length > 20, `missing contract: ${item.id}`);
    assert.ok(Array.isArray(item.riskPaths) && item.riskPaths.length > 0, `missing riskPaths: ${item.id}`);
    assert.ok(Array.isArray(item.evidence) && item.evidence.length > 0, `missing evidence: ${item.id}`);
    assert.ok(Array.isArray(item.goldenFindings) && item.goldenFindings.length > 0, `missing goldenFindings: ${item.id}`);

    for (const evidence of item.evidence) {
      assert.equal(fs.existsSync(path.join(root, evidence)), true, `missing evidence file ${evidence} for ${item.id}`);
    }
    for (const riskPath of item.riskPaths) {
      if (riskPath.endsWith('*') || riskPath.endsWith('/')) continue;
      assert.equal(fs.existsSync(path.join(root, riskPath)), true, `missing risk path ${riskPath} for ${item.id}`);
    }
  }
});
