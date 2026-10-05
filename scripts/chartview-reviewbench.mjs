import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const base = arg('--base', 'origin/main');
const head = arg('--head', 'HEAD');
const enforce = argv.includes('--enforce');
const manifestPath = path.join(root, '.reviewbench', 'chartview-golden.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function changedFiles() {
  try {
    return execFileSync('git', ['diff', '--name-only', `${base}...${head}`], {
      cwd: root,
      encoding: 'utf8'
    }).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  } catch (error) {
    console.error('ReviewBench guard could not read git diff:', error.message);
    process.exit(2);
  }
}

function matches(file, rule) {
  if (rule.endsWith('/')) return file.startsWith(rule);
  if (rule.endsWith('*')) return file.startsWith(rule.slice(0, -1));
  return file === rule;
}

const files = changedFiles();
const rows = [];

for (const item of manifest.cases) {
  const touched = files.filter(file => item.riskPaths.some(rule => matches(file, rule)));
  if (!touched.length) continue;

  const changedEvidence = item.evidence.filter(file => files.includes(file));
  const status = changedEvidence.length ? 'covered' : 'review-needed';
  rows.push({
    id: item.id,
    severity: item.severity,
    category: item.category,
    status,
    touched,
    changedEvidence,
    contract: item.contract
  });
}

const needsReview = rows.filter(row => row.status === 'review-needed');
const criticalNeedsReview = needsReview.filter(row => row.severity === 'critical');

console.log(`ChartView ReviewBench: ${files.length} changed file(s), ${rows.length} risk case(s) touched.`);
for (const row of rows) {
  console.log(`- [${row.status}] ${row.severity}/${row.category} ${row.id}`);
  console.log(`  touched: ${row.touched.join(', ')}`);
  if (row.changedEvidence.length) console.log(`  evidence: ${row.changedEvidence.join(', ')}`);
  else console.log(`  evidence: no mapped regression test changed; review the golden findings before merge`);
}

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  const lines = [
    '# ChartView ReviewBench',
    '',
    `Mode: **${enforce ? 'enforce' : 'advisory'}**`,
    `Changed files: **${files.length}**`,
    `Touched risk cases: **${rows.length}**`,
    '',
    '| Case | Severity | Category | Result |',
    '|---|---|---|---|',
    ...rows.map(row => `| ${row.id} | ${row.severity} | ${row.category} | ${row.status} |`),
    '',
    needsReview.length
      ? 'Review-needed means a protected area changed without one of its mapped regression tests changing in the same PR. Existing tests still run separately.'
      : 'No mapped risk case needs additional review evidence.'
  ];
  fs.appendFileSync(summaryPath, lines.join('\n') + '\n');
}

if (enforce && criticalNeedsReview.length) {
  console.error(`Blocking: ${criticalNeedsReview.length} critical ReviewBench case(s) need review evidence.`);
  process.exit(1);
}
