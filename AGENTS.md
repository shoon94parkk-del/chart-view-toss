# Chart View Toss agent rules

This repository is the Apps in Toss client for Chart View. Do not rely on chat memory alone.

## Read before editing
1. `docs/project-memory.md`
2. `docs/regression-guardrails.md`
3. `docs/decision-log.md`
4. `docs/ARCHITECTURE.md`
5. `docs/P0_RELEASE_GATE.md`
6. Tests closest to the changed area

## Required workflow
1. Search prior commits/docs/tests for the same behavior before editing.
2. Keep Toss-specific UI isolated in this repository. Do not rewrite the Web Chart View UI from here.
3. Preserve the shared backend API contract unless the web backend change is explicitly coordinated.
4. Add/update a regression test for every behavioral fix.
5. Run `npm test`; for release-sensitive work also run `npm run build` and the relevant mobile QA.
6. Do not call Apps in Toss release complete from web preview alone; real Android/iOS Sandbox/QR validation remains a gate.
7. Update `docs/decision-log.md` and, when relevant, project memory/guardrails.

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
