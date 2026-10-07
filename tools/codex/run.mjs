import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const [tool, ...args] = process.argv.slice(2);
const env = { ...process.env };
let command;
let options;

function chromePath() {
  const supplied = env.AGENT_BROWSER_EXECUTABLE_PATH || env.CHROME_PATH;
  if (supplied && existsSync(supplied)) return supplied;
  try {
    const browser = createRequire(join(root, 'package.json'))('playwright').chromium.executablePath();
    if (existsSync(browser)) return browser;
  } catch { /* App dependencies or browser may not yet be installed. */ }
  return undefined;
}

switch (tool) {
  case 'browser': {
    // Codex supplies the reasoning. No secondary AI agent/cloud browser account.
    const forbidden = /^(chat|dashboard|plugin|auth|upgrade|batch|-p|--provider|--model|--api-key)(=|$)/;
    if (args.some(arg => forbidden.test(arg)) || env.AGENT_BROWSER_PROVIDER) {
      console.error('Use local browser commands only; AI chat, providers, plugins and accounts are disabled in this wrapper.');
      process.exit(2);
    }
    command = join(here, 'node_modules/agent-browser/bin/agent-browser.js');
    options = ['--no-webmcp', '--namespace', 'chartview-codex', '--session', 'chartview', ...args];
    const chrome = chromePath();
    if (chrome) env.AGENT_BROWSER_EXECUTABLE_PATH = chrome;
    break;
  }
  case 'lighthouse': {
    command = join(here, 'node_modules/lighthouse/cli/index.js');
    options = [...args, '--no-enable-error-reporting'];
    if (!args.some(arg => arg.startsWith('--chrome-flags'))) {
      options.push('--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage');
    }
    const chrome = chromePath();
    if (chrome) env.CHROME_PATH = chrome;
    break;
  }
  case 'knip':
    if (args.some(arg => /^--(fix|allow-remove-files)(=|$)/.test(arg))) {
      console.error('Review diagnostic findings before removing code. Auto-fix is disabled.');
      process.exit(2);
    }
    command = join(here, 'node_modules/knip/bin/knip.js');
    options = ['--config', join(here, 'knip.json'), ...args];
    break;
  case 'deps':
    command = join(here, 'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs');
    options = ['--no-config', '--do-not-follow', 'node_modules', '--output-type', 'json', 'src', ...args];
    break;
  default:
    console.error('Usage: node tools/codex/run.mjs browser|lighthouse|knip|deps <arguments>');
    process.exit(2);
}

if (!existsSync(command)) {
  console.error('Install the optional toolkit first: npm ci --prefix tools/codex --ignore-scripts');
  process.exit(2);
}
const child = spawn(process.execPath, [command, ...options], { cwd: root, env, stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = signal ? 1 : code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
