export function performanceOptions(env = {}) {
  const runs = Number(env.PERF_RUNS || 1);
  const timeoutMs = Number(env.PERF_TIMEOUT_MS || 20000);
  if (!Number.isInteger(runs) || runs < 1 || runs > 20) throw new Error('PERF_RUNS must be an integer from 1 to 20');
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) throw new Error('PERF_TIMEOUT_MS must be between 1 and 120000');
  const phases = [...new Set(String(env.PERF_PHASES || 'cold,spa,warm').split(',').map(value => value.trim()).filter(Boolean))];
  if (!phases.length || phases.some(phase => !['cold', 'spa', 'warm'].includes(phase))) throw new Error('PERF_PHASES supports cold,spa,warm');
  const failurePath = String(env.PERF_FAILURE_PATH || '').trim();
  if (failurePath && !failurePath.startsWith('/')) throw new Error('PERF_FAILURE_PATH must be a URL pathname');
  const failureMode = String(env.PERF_FAILURE_MODE || 'abort');
  if (failurePath && !['abort', '503'].includes(failureMode)) throw new Error('PERF_FAILURE_MODE supports abort or 503');
  return {
    runs, timeoutMs, phases,
    routeNames: String(env.PERF_ROUTES || '').split(',').map(value => value.trim().replace(/^#/, '')).filter(Boolean),
    output: env.PERF_OUTPUT || null,
    proxyServer: env.E2E_PROXY_SERVER || null,
    failure: failurePath ? { path: failurePath, mode: failureMode, matching: 'exact pathname' } : null,
  };
}

export function summarizeRequests(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = row.key || row.path;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  return [...grouped.entries()].map(([key, list]) => {
    const completed = list.filter(row => row.bodyComplete);
    const sized = completed.filter(row => Number.isFinite(row.decodedBodyBytes));
    return {
      key, path: list[0].path, calls: list.length,
      ms: completed.length ? Math.max(...completed.map(row => row.ms)) : null,
      completedBodies: completed.length,
      pending: list.filter(row => row.state === 'pending').length,
      failed: list.filter(row => row.state === 'failed').length,
      canceled: list.filter(row => row.state === 'canceled').length,
      decodedBodyBytes: sized.length ? sized.reduce((sum, row) => sum + row.decodedBodyBytes, 0) : null,
      // HTTP errors have complete response bodies; keep them distinct from transport failures.
      httpErrors: list.filter(row => row.status >= 400).length,
      status: list.map(row => row.status ?? row.state).join(','),
      meta: list.find(row => row.meta)?.meta || null,
    };
  }).sort((a, b) => (b.ms ?? -1) - (a.ms ?? -1));
}

export function summarizeMeasurements(results, phases) {
  const keys = { cold: ['coldMs', 'coldReadyState'], spa: ['spaMs', 'spaReadyState'], warm: ['warmMs', 'warmReadyState'] };
  const routes = [...new Set(results.map(row => row.route))];
  return routes.flatMap(route => phases.map(phase => {
    const [duration, outcome] = keys[phase];
    const samples = results.filter(row => row.route === route && Number.isFinite(row[duration]));
    const ready = samples.filter(row => row[outcome] === 'ready').map(row => row[duration]).sort((a, b) => a - b);
    const outcomes = {};
    for (const row of samples) outcomes[row[outcome]] = (outcomes[row[outcome]] || 0) + 1;
    return { route, phase, samples: samples.length, readySamples: ready.length, outcomes,
      medianReadyMs: ready.length ? (ready[Math.floor((ready.length - 1) / 2)] + ready[Math.floor(ready.length / 2)]) / 2 : null,
      minReadyMs: ready[0] ?? null, maxReadyMs: ready.at(-1) ?? null };
  }));
}
