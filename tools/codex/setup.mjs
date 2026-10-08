import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const args = new Set(process.argv.slice(2));
const allowed = new Set(['--install', '--check', '--with-browsers', '--help']);
const usage = `Chart View Codex setup (Node 24, npm 10–11)
  node tools/codex/setup.mjs --install [--with-browsers]
  node tools/codex/setup.mjs --check
Installs only the repository's two lockfiles and optional Playwright browsers.
No global configuration, credentials, MCP, hooks or model services are changed.
Linux OS dependencies and Korean fonts: see docs/CODEX_TRANSFER.md.`;
if ([...args].some(arg => !allowed.has(arg)) || (args.has('--install') && args.has('--check')) || (args.has('--with-browsers') && !args.has('--install'))) {
  console.error(usage);
  process.exit(2);
}
if (!args.size || args.has('--help')) {
  console.log(usage);
  process.exit(0);
}
if (Number(process.versions.node.split('.')[0]) !== 24) {
  console.error('Use Node 24.x (CI reference: 24.21.0).');
  process.exit(1);
}

// npm's JavaScript entry point also works on Windows without shell/.cmd quoting.
const npmCli = process.env.npm_execpath || [
  resolve(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
  resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
].find(path => existsSync(path));
function npm(options, capture = false) {
  const command = npmCli ? process.execPath : (process.platform === 'win32' ? undefined : 'npm');
  if (!command) throw new Error('Cannot locate npm. Run with npm exec or install a standard Node 24 distribution.');
  const result = spawnSync(command, npmCli ? [npmCli, ...options] : options, {
    cwd: root, env: process.env, stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8', shell: false,
  });
  if (result.error) throw new Error('Could not start npm. Check the Node/npm installation.');
  if (result.status !== 0) throw new Error('npm command failed. Check the output and inherited proxy/CA; do not disable TLS.');
  return result.stdout;
}
try {
  const npmVersion = npm(['--version'], true).trim();
  if (![10, 11].includes(Number(npmVersion.split('.')[0]))) throw new Error('Use npm 10 or 11.');
  if (args.has('--install')) {
    npm(['ci', '--no-fund', '--no-audit']);
    npm(['ci', '--prefix', 'tools/codex', '--ignore-scripts', '--no-fund', '--no-audit']);
    if (args.has('--with-browsers')) npm(['exec', '--no', '--', 'playwright', 'install', 'chromium', 'webkit']);
  }
  const failures = [];
  const installed = {};
  for (const directory of [root, here]) {
    const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
    const lock = JSON.parse(readFileSync(join(directory, 'package-lock.json'), 'utf8'));
    for (const name of Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })) {
      const target = join(directory, 'node_modules', name, 'package.json');
      const expected = lock.packages?.[`node_modules/${name}`]?.version;
      const actual = existsSync(target) ? JSON.parse(readFileSync(target, 'utf8')).version : null;
      installed[`${directory === root ? 'app' : 'tools'}/${name}`] = { expected, actual };
      if (!expected || actual !== expected) failures.push(`${name}: installed package does not match the lockfile`);
    }
  }
  const browsers = {};
  try {
    const { chromium, webkit } = createRequire(join(root, 'package.json'))('@playwright/test');
    for (const [name, browser] of Object.entries({ chromium, webkit })) {
      browsers[name] = existsSync(browser.executablePath());
      if (!browsers[name]) failures.push(`${name}: browser missing; use --install --with-browsers`);
    }
  } catch {
    failures.push('Playwright unavailable; install the app lockfile first');
  }
  for (const name of ['chartview-qa', 'chartview-agent-review']) {
    if (!existsSync(join(root, '.agents/skills', name, 'SKILL.md'))) failures.push(`Repository skill missing: ${name}`);
  }
  console.log(JSON.stringify({ node: process.versions.node, npm: npmVersion, installed, browsers, failures,
    next: 'Read docs/CODEX_TRANSFER.md. Browser launch/fonts/network/skill discovery and account connections need separate checks.',
  }, null, 2));
  process.exitCode = failures.length ? 1 : 0;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
