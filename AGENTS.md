# Chart View Toss agent rules

This repository is the Apps in Toss client for Chart View. Do not rely on chat memory alone.

## Read before editing
0. `docs/CODEX_HANDOFF.md` (new-PC entry point and current product direction)
1. `docs/no-repeat-regression-policy.md`
2. `docs/project-memory.md`
3. `docs/regression-guardrails.md`
4. `docs/decision-log.md`
5. `docs/ARCHITECTURE.md`
6. `docs/P0_RELEASE_GATE.md`
7. Tests closest to the changed area

## Required workflow
1. Search prior commits/docs/tests for the same behavior before editing and classify the task as new behavior, new bug, or regression.
2. If it is a regression, restore the known-good contract first. Do not redesign an already-solved subsystem from scratch.
3. For performance/cache/quote work, compare against the recorded same-harness baseline before and after. Never weaken data-freshness guarantees merely to improve first paint.
4. Keep Toss-specific UI isolated in this repository. Do not rewrite the Web Chart View UI from here.
5. Preserve the shared backend API contract unless the web backend change is explicitly coordinated.
6. Add/update a regression test for every behavioral fix. A repeated bug without a new/strengthened regression test is not complete.
7. Before pushing a frontend change, run `npm run qa:prepush` (existing Node tests + production build + deterministic Playwright on desktop/Android/narrow/iPhone WebKit), plus the relevant existing mobile QA. Add a browser regression and API→processing→UI assertions for changed data flows. See `docs/AUTOMATED_QA.md`; do not use LLM APIs in CI or weaken failing tests.
8. Do not call Apps in Toss release complete from web preview alone; real Android/iOS Sandbox/QR validation remains a gate.
9. Update `docs/decision-log.md` and, when relevant, project memory/guardrails.

Optional cloud Codex diagnostics: read `docs/CLOUD_CODEX_TOOLS.md` when browser exploration, mobile performance, dependency impact, or generated financial edge cases would help. Install the separate pinned `tools/codex` package with `--ignore-scripts`. Use its local wrappers; do not enable secondary LLM/provider/chat features, auto-delete Knip findings, or replace the required Playwright release gate with a diagnostic score.

## Current production contract
- Toss preview: https://chart-view-toss.onrender.com
- Shared backend: https://chart-view-pkv8.onrender.com
- App key: `chartview`
- Apps in Toss Web Framework: 3.5.0
- Node: 24.x; CI pins 24.21.0
- Web client and Toss client are separate repos by design.

## Never regress
- Native back handling: subpage back first, platform root exit preserved.
- Safe-area and native navigation-bar behavior.
- Direct deep links for major screens.
- Device-local storage separation under Toss keys.
- Loading/offline/retry and stale-response protection.
- Data provenance/calculation basis text.
- AIT contract checks and real-device release gates.
