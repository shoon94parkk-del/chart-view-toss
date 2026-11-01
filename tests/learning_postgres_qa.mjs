#!/usr/bin/env node
/**
 * Opt-in integration QA against the actual learning router and local PostgreSQL.
 * This is deliberately outside tests/e2e: ordinary CI remains deterministic.
 *
 * DATABASE_URL=postgresql://...@127.0.0.1:5432/test_database \
 *   node tests/learning_postgres_qa.mjs
 *
 * Options (environment): LEARNING_QA_BACKEND_DIR (sibling chart_View),
 * LEARNING_QA_PYTHON (python), LEARNING_QA_API_PORT (8790),
 * LEARNING_QA_WEB_PORT (4191), LEARNING_QA_ARTIFACT_DIR (unique /tmp directory),
 * LEARNING_QA_BUILD_DIR (build into artifacts/frontend by default),
 * LEARNING_QA_SKIP_BUILD=1 (use an existing production build),
 * LEARNING_QA_POSTGRES_RESTART_SCRIPT (optional, coordinated local restart).
 *
 * The process starts its own minimal FastAPI application, without provider
 * startup. Learning requests are proxied byte-for-byte to that real API;
 * unrelated market requests use the existing deterministic market fixtures.
 * External network requests are blocked. Auth/recovery values live only in
 * memory. Screenshots occur only after recovery-key onboarding is dismissed.
 * Only accounts created by this run are deleted in finally, including failures.
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { chromium, webkit, devices, expect } from '@playwright/test';
import { payloadFor } from './e2e/data.mjs';
import { learningDashboard, kstDate } from '../src/learningModel.js';
import { LEARNING_SESSION_KEY } from '../src/learningClient.js';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(process.env.LEARNING_QA_BACKEND_DIR || join(repo, '..', 'chart_View'));
const artifacts = resolve(process.env.LEARNING_QA_ARTIFACT_DIR || join(tmpdir(), `chartview-learning-postgres-qa-${randomUUID()}`));
const buildDir = resolve(process.env.LEARNING_QA_BUILD_DIR || join(artifacts, 'frontend'));
const python = process.env.LEARNING_QA_PYTHON || 'python';
const db = process.env.LEARNING_DATABASE_URL || process.env.DATABASE_URL;
assert.ok(db, 'Set DATABASE_URL or LEARNING_DATABASE_URL to a disposable local PostgreSQL database.');
const databaseUrl = new URL(db);
assert.ok(['postgresql:', 'postgres:'].includes(databaseUrl.protocol), 'This check requires actual PostgreSQL.');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname), 'Only local PostgreSQL is permitted.');
const apiPort = Number(process.env.LEARNING_QA_API_PORT || 8790);
// WebKit refuses the registered Sieve port 4190 before issuing a request.
const webPort = Number(process.env.LEARNING_QA_WEB_PORT || 4191);
assert.ok([apiPort, webPort].every(p => Number.isInteger(p) && p > 1024 && p < 65536) && apiPort !== webPort);
assert.notEqual(webPort, 4190, 'WebKit blocks port 4190; use 4191 or another browser-safe port.');
const apiOrigin = `http://127.0.0.1:${apiPort}`;
const webOrigin = `http://127.0.0.1:${webPort}`;
const accounts = new Map(), browsers = [], traffic = [], checks = [], browserErrors = [], blocked = [];
let apiProcess, webServer, successful = false, cleanupComplete = false;
const evidence = { actualApi: true, actualPostgres: true, externalProviderCalls: 0, checks, artifacts: [], requests: traffic };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const safeFailure = error => `${error.name || 'Error'}: ${error.message || 'verification failed'}`
  .replace(/[A-Za-z0-9_-]{43,}/g, '[redacted]');
function pass(name, detail = {}) { checks.push({ name, ...detail }); console.log(`PASS ${name}`); }

function runPython(code, value) {
  const result = spawnSync(python, ['-c', code], {
    cwd: backend, env: { ...process.env, LEARNING_DATABASE_URL: db },
    input: value === undefined ? undefined : JSON.stringify(value), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  });
  assert.equal(result.status, 0, `Python integration helper failed: ${safeFailure({ message: result.stderr })}`);
  return JSON.parse(result.stdout);
}

async function api(path, { token, body, method = 'GET', status = 200 } = {}) {
  const response = await fetch(`${apiOrigin}/api/learning${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  assert.equal(response.status, status, `Actual learning API ${method} ${path} returned ${response.status}, expected ${status}`);
  assert.match(response.headers.get('cache-control') || '', /no-store/);
  return data;
}

async function startApi() {
  // Fail if a service already owns the port; never silently verify stale code.
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(apiPort, '127.0.0.1', resolve); });
  await new Promise(resolve => probe.close(resolve));
  const code = `from fastapi import FastAPI\nfrom fastapi.middleware.cors import CORSMiddleware\nfrom learning_service import create_router\nfrom learning_store import LearningStore\nimport os, uvicorn\napp=FastAPI()\napp.add_middleware(CORSMiddleware,allow_origins=[os.environ['LEARNING_QA_WEB_ORIGIN']],allow_methods=['*'],allow_headers=['*'])\napp.include_router(create_router(LearningStore(database_url=os.environ['LEARNING_DATABASE_URL'])))\nuvicorn.run(app,host='127.0.0.1',port=int(os.environ['LEARNING_QA_API_PORT']),log_level='error',access_log=False)\n`;
  apiProcess = spawn(python, ['-c', code], {
    cwd: backend, env: { ...process.env, LEARNING_DATABASE_URL: db, LEARNING_QA_WEB_ORIGIN: webOrigin, LEARNING_QA_API_PORT: String(apiPort) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  apiProcess.stdout.resume();
  apiProcess.stderr.on('data', chunk => { stderr += chunk.toString(); });
  for (let n = 0; n < 100; n++) {
    if (apiProcess.exitCode !== null) throw Error(`Fresh backend exited: ${safeFailure({ message: stderr })}`);
    try {
      const status = await api('/status');
      assert.deepEqual(status, { configured: true, storage: 'postgres' });
      return;
    } catch { await delay(100); }
  }
  throw Error(`Fresh PostgreSQL learning router did not become ready: ${safeFailure({ message: stderr })}`);
}

async function stopApi() {
  if (!apiProcess || apiProcess.exitCode !== null) return;
  const exited = once(apiProcess, 'exit');
  apiProcess.kill('SIGTERM');
  await exited;
}

async function buildAndServe() {
  if (process.env.LEARNING_QA_SKIP_BUILD !== '1') {
    const result = spawnSync(process.execPath, [join(repo, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', buildDir, '--emptyOutDir'], {
      cwd: repo, env: process.env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    });
    await writeFile(join(artifacts, 'production-build.log'), result.stdout + result.stderr);
    assert.equal(result.status, 0, 'The independent production Vite build failed; see production-build.log.');
  }
  assert.ok((await stat(join(buildDir, 'index.html'))).isFile());
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
  webServer = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, webOrigin).pathname);
      let filename = resolve(buildDir, `.${pathname}`);
      if (!filename.startsWith(`${buildDir}${sep}`)) filename = join(buildDir, 'index.html');
      try { if (!(await stat(filename)).isFile()) filename = join(buildDir, 'index.html'); }
      catch { filename = join(buildDir, 'index.html'); }
      response.setHeader('Content-Type', mime[extname(filename)] || 'application/octet-stream');
      response.setHeader('Cache-Control', 'no-store');
      createReadStream(filename).pipe(response);
    } catch { response.writeHead(500); response.end('local QA server error'); }
  });
  await new Promise((resolve, reject) => { webServer.once('error', reject); webServer.listen(webPort, '127.0.0.1', resolve); });
}

async function instrument(context) {
  context.on('page', page => {
    page.on('pageerror', error => browserErrors.push(safeFailure(error)));
    page.on('requestfailed', request => {
      if (request.isNavigationRequest()) {
        evidence.navigationFailures ||= [];
        evidence.navigationFailures.push({ url: request.url(), error: request.failure()?.errorText });
      }
    });
  });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace(/^\/backend/, '');
    if (path.startsWith('/api/learning/')) {
      const headers = request.headers();
      const response = await fetch(`${apiOrigin}${path}${url.search}`, {
        method: request.method(), headers: { 'Content-Type': 'application/json', ...(headers.authorization ? { Authorization: headers.authorization } : {}) },
        ...(['GET', 'HEAD'].includes(request.method()) ? {} : { body: request.postData() }), signal: AbortSignal.timeout(15000),
      });
      const body = await response.text();
      const parsed = JSON.parse(body);
      if (path === '/api/learning/accounts' && response.ok) accounts.set(parsed.accountId, parsed);
      if (path === '/api/learning/auth' && request.method() === 'POST' && response.ok) {
        const account = accounts.get(parsed.accountId);
        if (account) account.recoveredToken = parsed.token;
      }
      traffic.push({ method: request.method(), path, status: response.status, noStore: /no-store/.test(response.headers.get('cache-control') || '') });
      assert.ok(traffic.at(-1).noStore, `Actual API response must remain private: ${path}`);
      const outgoing = Object.fromEntries(response.headers);
      delete outgoing['content-length']; delete outgoing['content-encoding'];
      return route.fulfill({ status: response.status, headers: outgoing, body });
    }
    if (path.startsWith('/api/') || path.startsWith('/static/data/')) {
      if (path.startsWith('/api/published-data/')) return route.fulfill({ status: 503, json: { detail: 'local market fixture fallback' } });
      return route.fulfill({ json: payloadFor(url) });
    }
    if (url.origin !== webOrigin) {
      blocked.push({ origin: url.origin, path });
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
}

async function newContext(browser, options = {}) {
  const context = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul', serviceWorkers: 'block', ...options });
  await instrument(context);
  return context;
}
async function session(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), LEARNING_SESSION_KEY);
}
function metric(page, label) { return page.locator('.learning-stats > div').filter({ has: page.getByText(label, { exact: true }) }).locator('dd'); }
async function dashboard(page) { await page.goto(`${webOrigin}/#learning`); await expect(page.locator('.learning-stats')).toBeVisible(); }
async function noOverflow(page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
}
async function capture(page, name, options = {}) {
  assert.equal(await page.locator('[data-learning-recovery-key]').count(), 0, 'Never capture a recovery key.');
  await noOverflow(page);
  await page.screenshot({ path: join(artifacts, name), ...options });
  evidence.artifacts.push(name);
}
async function createAccount(page) {
  await page.goto(`${webOrigin}/#learning`);
  await page.locator('[data-learning-new-account]').click();
  await expect(page.locator('[data-learning-recovery-key]')).toBeVisible();
  const recoveryKey = await page.locator('[data-learning-recovery-key]').textContent();
  assert.equal(await session(page), null, 'Credentials must not persist before key acknowledgement.');
  await page.locator('[data-learning-recovery-ack]').click();
  await expect(page.locator('[data-learning-status]')).toContainText('복구 키를 저장한 뒤');
  await page.locator('[data-learning-recovery-saved]').check();
  await page.locator('[data-learning-recovery-ack]').click();
  await expect(metric(page, '공부한 날짜')).toHaveText('0일');
  const credentials = await session(page);
  assert.equal(accounts.get(credentials.accountId).recoveryKey, recoveryKey);
  return accounts.get(credentials.accountId);
}
async function recover(page, account) {
  const navigation = await page.goto(`${webOrigin}/#learning`);
  evidence.recoveryNavigations ||= [];
  evidence.recoveryNavigations.push({ engine: page.context().browser().browserType().name(), status: navigation?.status(), url: page.url(), contentType: navigation?.headers()['content-type'] });
  try { await expect(page.locator('[data-learning-new-account]')).toBeVisible(); }
  catch (error) {
    // Keep a bounded bootstrap diagnostic without recording any credential form.
    if (!await page.locator('[data-learning-recovery-key]').count()) {
      evidence.bootstrapFailure = { url: page.url(), state: await page.evaluate(() => document.readyState), text: (await page.locator('body').innerText()).slice(0, 2500) };
      await capture(page, 'bootstrap-failure.png');
    }
    throw error;
  }
  assert.equal(await session(page), null, 'Independent context must start without a shared credential.');
  const login = page.locator('[data-learning-login-form]');
  await login.locator('..').locator(':scope > summary').click();
  await login.locator('[name="recoveryKey"]').fill(account.recoveryKey);
  await login.locator('[data-learning-login]').click();
  await expect(page.locator('.learning-stats')).toBeVisible();
  assert.equal((await session(page)).accountId, account.accountId);
}
async function settings(page) {
  const panel = page.locator('[data-learning-settings]');
  if (await panel.getAttribute('open') === null) await panel.locator(':scope > summary').click();
  return panel;
}
async function answer(page, questions, correct) {
  const form = page.locator('[data-learning-quiz-form]');
  if (!await form.isVisible()) await form.locator('..').locator(':scope > summary').click();
  for (const q of questions) {
    const selected = correct || q.dimension === 'business' ? q.correctIndex : (q.correctIndex + 1) % q.options.length;
    await form.locator(`input[name="answer.${q.id}"][value="${selected}"]`).check();
  }
  await form.locator('[name="judgmentAnswer"]').fill('분기 매출·비용과 재구매를 연결하고 고객 획득 비용이 늘면 성장 가정을 다시 확인한다.');
  for (const [key, value] of Object.entries({ evidence: 2, logic: 3, indicators: 1 })) await form.locator(`[name="rubric.${key}"]`).selectOption(String(value));
  return form;
}
function sqlSnapshot(accountId) {
  return runPython(`import os,json,sys,hashlib,psycopg\na=json.load(sys.stdin)\nwith psycopg.connect(os.environ['LEARNING_DATABASE_URL']) as c:\n r=c.execute('SELECT document FROM learning_accounts WHERE id=%s',(a,)).fetchone()\n if r is None: print(json.dumps({'accounts':0}))\n else:\n  d=json.loads(r[0]); print(json.dumps({'accounts':1,'authSessions':c.execute('SELECT count(*) FROM learning_sessions WHERE account_id=%s',(a,)).fetchone()[0],'requestReceipts':c.execute('SELECT count(*) FROM learning_requests WHERE account_id=%s',(a,)).fetchone()[0],'documentSha256':hashlib.sha256(r[0].encode()).hexdigest(),'version':d['version'],'sessionIds':[s['id'] for s in d['sessions']],'sessions':len(d['sessions']),'revisions':len(d['revisions']),'attempts':len(d['attempts']),'reviews':len(d['reviews']),'validations':len(d['validations'])}))`, accountId);
}
function checkNoSecrets(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    assert.ok(!/^(?:token|recoveryKey|authorization|password|secret|accessToken|accountId|_lessons|correctIndex)$/i.test(key), `Backup exposed private field ${key}`);
    checkNoSecrets(entry);
  }
}
async function assertModelUi(page, workspace) {
  const model = learningDashboard(workspace, kstDate());
  await expect(metric(page, '공부한 날짜')).toHaveText(`${model.completedDays}일`);
  await expect(metric(page, '공부한 기업')).toHaveText(`${model.companyCount}개`);
  await expect(metric(page, '기본 퀴즈·복습')).toHaveText(`${model.quizCount}회`);
  await expect(metric(page, '평균 자기 이해도')).toHaveText(`${Math.round(model.averageUnderstanding)} / 100`);
  await expect(page.locator('.learning-page')).toContainText(`기본 퀴즈·복습 누적 ${model.quizTotal}점 · 평균 ${Math.round(model.quizAverage)}점`);
  return { completedDays: model.completedDays, companies: model.companyCount, quizCount: model.quizCount, quizTotal: model.quizTotal, quizAverage: model.quizAverage, understanding: model.averageUnderstanding };
}

async function main() {
  await mkdir(artifacts, { recursive: true });
  evidence.sources = {};
  for (const [label, filename] of Object.entries({
    learningView: join(repo, 'src/learningView.js'), learningModel: join(repo, 'src/learningModel.js'),
    learningClient: join(repo, 'src/learningClient.js'), learningService: join(backend, 'learning_service.py'),
    learningStore: join(backend, 'learning_store.py'), learningContent: join(backend, 'learning_content.py'),
  })) evidence.sources[label] = createHash('sha256').update(await readFile(filename)).digest('hex');
  await startApi();
  pass('fresh FastAPI learning router uses real local PostgreSQL');
  await buildAndServe();
  const browser = await chromium.launch({ headless: true }); browsers.push(browser);
  const context = await newContext(browser, { viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const account = await createAccount(page);
  pass('UI creates an isolated real account and requires recovery-key acknowledgement');
  await api('/workspace', { status: 401 });
  await api('/export', { status: 401 });
  pass('workspace and backup reject missing authorization');

  // Use an explicit scheduled date, so this check is reusable after the six weeks.
  const schedule = page.locator('details').filter({ has: page.locator('[data-learning-date-open]') });
  if (!await schedule.locator('[data-learning-date-open]').isVisible()) await schedule.locator(':scope > summary').click();
  await page.locator('[data-learning-date]').fill('2026-11-02');
  await page.locator('[data-learning-date-open]').click();
  await expect(page.locator('[data-learning-editor]')).toBeVisible();
  const original = '실제 PostgreSQL QA: 화장품과 디바이스의 매출·광고비·재구매를 공시에서 확인한다.';
  const edited = '실제 PostgreSQL QA 수정: 기존 고객 재구매 둔화를 확인해 해외 성장 가정을 수정했다.';
  const notes = page.locator('[data-learning-notes-form]');
  await notes.locator('[name="topic"]').fill('실제 저장소 QA 기업 노트');
  await notes.locator('[name="notes.business"]').fill(original);
  await notes.locator('[name="understanding"]').fill('0');
  await notes.locator('[name="minutes"]').fill('25');
  await page.locator('[data-learning-save="complete"]').click();
  await expect(page.locator('[data-learning-status]')).toContainText('성장하는 이유');
  assert.equal((await api('/workspace', { token: account.token })).sessions.length, 0);
  await page.locator('[data-learning-save="draft"]').click();
  await expect(page.locator('[data-learning-status]')).toContainText('클라우드에 저장했어요');
  let workspace = await api('/workspace', { token: account.token });
  const sid = workspace.sessions[0].id;
  assert.equal(workspace.sessions[0].notes.business, original);
  assert.equal(workspace.sessions[0].status, 'in_progress');
  assert.equal(workspace.sessions[0].understanding, 0);
  assert.equal(workspace.attempts.length, 0);
  await page.reload();
  await expect(page.locator(`a.learning-row[href="#learning/session/${sid}"]`)).toBeVisible();
  await page.locator(`a.learning-row[href="#learning/session/${sid}"]`).click();
  await expect(notes.locator('[name="notes.business"]')).toHaveValue(original);
  await expect(notes.locator('[name="understanding"]')).toHaveValue('0');
  pass('real draft save survives reload; zero understanding stays zero and completion validation writes nothing');

  for (const [key, value] of Object.entries({ growth: '해외 고객의 재구매와 유통망 확대를 공시로 확인한다.', risk: '광고비 증가와 재고 누적이 수익성을 낮출 수 있다.', metrics: '해외 매출·재고 회전율·영업이익률' })) await notes.locator(`[name="insight.${key}"]`).fill(value);
  await page.locator('[data-learning-save="complete"]').click();
  await expect(page.locator('.learning-editor-heading')).toContainText('공부 완료');
  workspace = await api('/workspace', { token: account.token });
  assert.equal(workspace.sessions[0].revision, 2);
  assert.equal(workspace.revisions.length, 2);
  assert.equal(workspace.attempts.length, 0);
  pass('historical draft completion appends a revision without inventing an attempt');

  const questions = runPython("from learning_content import build_lesson,default_curriculum\nimport json\nprint(json.dumps(build_lesson(default_curriculum(),'2026-11-02')['questions']))");
  const publicLesson = await api('/lessons/2026-11-02', { token: account.token });
  assert.ok(publicLesson.questions.every(q => !Object.hasOwn(q, 'correctIndex') && !Object.hasOwn(q, 'explanation')));
  let form = await answer(page, questions, false);
  await form.locator('[data-learning-quiz]').click();
  const history = page.locator('[data-learning-attempt-history]');
  await expect(history).toContainText('퀴즈 50점');
  await expect(history).toContainText('판단 근거 자기평가 50점');
  workspace = await api('/workspace', { token: account.token });
  const firstAttempt = structuredClone(workspace.attempts[0]);
  assert.deepEqual(firstAttempt.dimensions, { business: 100, inference: 0 });
  assert.equal(firstAttempt.score, 50); assert.equal(firstAttempt.judgment.assessment, 'self');
  assert.equal(firstAttempt.judgment.score, 50); assert.equal(firstAttempt.wrongAnswers.length, 2);
  const wrong = history.locator('.learning-wrong').first();
  await wrong.locator('summary').click();
  await expect(wrong).toContainText(firstAttempt.wrongAnswers[0].explanation);
  form = await answer(page, questions, true);
  await form.locator('[data-learning-review]').click();
  await expect(history).toContainText('복습 100점');
  workspace = await api('/workspace', { token: account.token });
  assert.deepEqual(workspace.attempts[0], firstAttempt);
  assert.equal(workspace.attempts[1].score, 100); assert.equal(workspace.attempts[1].isReview, true);
  assert.equal(workspace.reviews.length, 1);
  await expect(history).toContainText(`다음 ${workspace.sessions[0].nextReviewDate}`);
  await history.scrollIntoViewIfNeeded();
  await capture(page, 'quiz-desktop.png');
  pass('real server grades 50 then review 100; self rubric, wrong explanations and original attempt remain distinct');

  await page.locator('.learning-topline a').click();
  await page.locator('a[href="#learning/company/278470.KS"]').click();
  await page.locator(`a.learning-row[href="#learning/session/${sid}"]`).click();
  await expect(notes.locator('[name="notes.business"]')).toHaveValue(original);
  await notes.locator('[name="notes.business"]').fill(edited);
  await page.locator('[data-learning-save="complete"]').click();
  await expect(page.locator('.learning-editor-heading')).toContainText('공부 완료');
  await expect(history).toContainText('현재 노트와 개정 다름');
  const revisions = page.locator('[data-learning-revision-history]');
  await revisions.locator(':scope > summary').click();
  await revisions.locator('details').filter({ has: page.getByText('개정 1 ·', { exact: false }) }).first().locator(':scope > summary').click();
  await expect(revisions).toContainText(`과거: ${original}`);
  await expect(revisions).toContainText(`현재: ${edited}`);
  const validation = page.locator('[data-learning-validation-form]');
  await validation.locator('../..').locator(':scope > summary').click();
  await validation.locator('[name="revision"]').selectOption('1');
  for (const [key, value] of Object.entries({ assumption: '해외 기존 고객의 재구매가 지속된다.', observed: '공시에서 기존 고객 매출 둔화를 확인했다.', evidenceUrl: 'https://dart.fss.or.kr/', evidenceDate: '2026-11-01', currentJudgment: '신규 주문과 재구매를 나누어 다음 분기를 확인한다.', priceContext: '가격은 판정 근거에 포함하지 않는다.' })) await validation.locator(`[name="${key}"]`).fill(value);
  await validation.locator('[name="outcome"]').selectOption('contradicted');
  await validation.locator('[data-learning-validate]').click();
  await expect(page.locator('.learning-validation')).toContainText('개정 1 · 가정 반박');
  workspace = await api('/workspace', { token: account.token });
  assert.equal(workspace.revisions.length, 3);
  assert.equal(workspace.revisions[0].session.notes.business, original);
  assert.equal(workspace.sessions[0].notes.business, edited);
  assert.deepEqual(workspace.attempts[0], firstAttempt);
  assert.equal(workspace.validations[0].revision, 1);
  pass('company history edits append revision 3; original notes, attempts and revision-1 evidence validation persist');

  await dashboard(page);
  evidence.apiModelUi = await assertModelUi(page, workspace);
  await capture(page, 'dashboard-desktop.png');
  const panel = await settings(page);
  const downloaded = page.waitForEvent('download');
  await panel.locator('[data-learning-export]').click();
  const download = await downloaded;
  const stream = await download.createReadStream();
  const chunks = []; for await (const chunk of stream) chunks.push(chunk);
  const backup = JSON.parse(Buffer.concat(chunks).toString());
  checkNoSecrets(backup);
  assert.deepEqual(backup.workspace, workspace);
  const backupText = JSON.stringify(backup);
  for (const item of accounts.values()) assert.ok(!backupText.includes(item.token) && !backupText.includes(item.recoveryKey));
  pass('downloaded full backup equals the actual workspace and contains no credentials or answer keys');

  const independent = await newContext(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const otherPage = await independent.newPage();
  await recover(otherPage, account);
  evidence.recoveredApiModelUi = await assertModelUi(otherPage, await api('/workspace', { token: (await session(otherPage)).token }));
  assert.deepEqual(evidence.recoveredApiModelUi, evidence.apiModelUi);
  const recovered = await session(otherPage);
  await (await settings(otherPage)).locator('[data-learning-logout]').click();
  await expect(otherPage.locator('[data-learning-new-account]')).toBeVisible();
  await api('/workspace', { token: recovered.token, status: 401 });
  assert.deepEqual(await api('/workspace', { token: account.token }), workspace);
  pass('independent mobile browser recovery reads the same workspace; logout revokes that session with real 401');

  const isolatedContext = await newContext(browser);
  const isolatedPage = await isolatedContext.newPage();
  const isolated = await createAccount(isolatedPage);
  const isolatedWorkspace = await api('/workspace', { token: isolated.token });
  assert.deepEqual([isolatedWorkspace.sessions.length, isolatedWorkspace.attempts.length, isolatedWorkspace.revisions.length], [0, 0, 0]);
  await isolatedPage.goto(`${webOrigin}/#learning/session/${sid}`);
  await expect(isolatedPage.locator('.learning-page')).toContainText('이 계정에서 해당 공부 기록을 찾을 수 없어요.');
  await api(`/sessions/${sid}/reviews`, { token: isolated.token, method: 'POST', status: 404, body: {
    requestId: randomUUID(), expectedVersion: 0,
    answers: Object.fromEntries(questions.map(q => [q.id, q.correctIndex])),
    judgment: { answer: '다른 계정의 기록은 변경할 수 없어야 한다.', rubric: { evidence: 2, logic: 3, indicators: 1 } },
  } });
  assert.deepEqual(await api('/workspace', { token: isolated.token }), isolatedWorkspace);
  assert.deepEqual(await api('/workspace', { token: account.token }), workspace);
  pass('second real account starts empty, cannot render the first account session and receives 404 on cross-account mutation');

  const beforeRestart = sqlSnapshot(account.accountId);
  assert.equal(beforeRestart.sessions, 1); assert.equal(beforeRestart.attempts, 2);
  assert.equal(beforeRestart.revisions, 3); assert.equal(beforeRestart.validations, 1);
  await stopApi();
  if (process.env.LEARNING_QA_POSTGRES_RESTART_SCRIPT) {
    const result = spawnSync(resolve(process.env.LEARNING_QA_POSTGRES_RESTART_SCRIPT), ['restart'], { encoding: 'utf8', timeout: 30000 });
    assert.equal(result.status, 0, 'Coordinated local PostgreSQL restart failed.');
    evidence.postgresRestarted = true;
  } else evidence.postgresRestarted = false;
  await startApi();
  const afterRestart = sqlSnapshot(account.accountId);
  assert.deepEqual(afterRestart, beforeRestart);
  assert.deepEqual(await api('/workspace', { token: account.token }), workspace);
  await page.reload();
  await assertModelUi(page, workspace);
  evidence.retention = { ...afterRestart, documentSha256: afterRestart.documentSha256, exactWorkspaceSha256: hash(workspace), backendProcessRestarted: true };
  pass('fresh backend process preserves exact PostgreSQL document, record identity, history counts and request receipts', { postgresRestarted: evidence.postgresRestarted });

  const narrowContext = await newContext(browser, { viewport: { width: 320, height: 693 }, isMobile: true, hasTouch: true });
  const narrowPage = await narrowContext.newPage();
  await recover(narrowPage, account); await assertModelUi(narrowPage, workspace);
  await capture(narrowPage, 'dashboard-320px.png');
  await narrowPage.goto(`${webOrigin}/#learning/session/${sid}`);
  await expect(narrowPage.locator('[data-learning-editor]')).toBeVisible();
  await noOverflow(narrowPage);
  await narrowPage.locator('[data-learning-attempt-history]').scrollIntoViewIfNeeded();
  await capture(narrowPage, 'quiz-320px.png');
  pass('320px touch browser paints actual API model and complete history without horizontal overflow');

  const safari = await webkit.launch({ headless: true }); browsers.push(safari);
  const iphoneContext = await newContext(safari, { ...devices['iPhone SE'] });
  const iphonePage = await iphoneContext.newPage();
  await recover(iphonePage, account); await assertModelUi(iphonePage, workspace);
  await capture(iphonePage, 'dashboard-iphone-webkit.png');
  await iphonePage.goto(`${webOrigin}/#learning/session/${sid}`);
  await expect(iphonePage.locator('[data-learning-attempt-history]')).toContainText('복습 100점');
  await expect(iphonePage.locator('[name="notes.business"]')).toHaveValue(edited);
  await iphonePage.locator('[data-learning-attempt-history]').scrollIntoViewIfNeeded();
  await capture(iphonePage, 'quiz-iphone-webkit.png');
  pass('independent iPhone SE WebKit recovery renders stored edits and both actual graded attempts without overflow');

  assert.deepEqual(browserErrors, []);
  assert.deepEqual(blocked, [], 'The production build must not request unexpected external resources.');
  pass('all observed learning requests used no-store and both browser engines had no uncaught errors or external calls');
  successful = true;
}

try { await main(); }
catch (error) {
  evidence.failure = safeFailure(error);
  console.error(evidence.failure);
  process.exitCode = 1;
} finally {
  try {
    if (accounts.size && (!apiProcess || apiProcess.exitCode !== null)) await startApi();
    for (const account of accounts.values()) {
      await api('/account', { method: 'DELETE', token: account.token, body: { confirmation: 'DELETE' } });
      assert.deepEqual(sqlSnapshot(account.accountId), { accounts: 0 });
      await api('/workspace', { token: account.token, status: 401 });
    }
    cleanupComplete = true;
  } catch (error) {
    evidence.cleanupFailure = safeFailure(error); console.error(evidence.cleanupFailure); process.exitCode = 1;
  }
  for (const browser of browsers) await browser.close();
  if (webServer) await new Promise(resolve => webServer.close(resolve));
  await stopApi();
  evidence.passed = successful && cleanupComplete;
  evidence.cleanup = { createdAccounts: accounts.size, deletedAccounts: cleanupComplete ? accounts.size : null, verifiedDatabaseDeletion: cleanupComplete };
  evidence.browserErrors = browserErrors;
  evidence.blockedRequests = blocked;
  await mkdir(artifacts, { recursive: true });
  await writeFile(join(artifacts, 'results.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`${evidence.passed ? 'PASSED' : 'FAILED'}: ${checks.length} integration checks; artifacts: ${artifacts}`);
}
