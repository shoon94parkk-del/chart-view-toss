---
name: chartview-qa
description: Develop or test Chart View Toss using its existing data contracts, pinned browser tools and deterministic release QA; use for Chart View feature changes, regression fixes and browser/data verification.
---

# Chart View Toss development and QA

Find the repository root containing `AGENTS.md`, `package.json` and `docs/CODEX_HANDOFF.md`; do not assume a previous machine's absolute paths. This skill is self-contained project guidance, not a separate agent/model, connector or test engine.

1. Read `AGENTS.md` and its required documents, `docs/CODEX_TRANSFER.md`, `docs/AUTOMATED_QA.md` and tests nearest to the requested change. Search prior decisions/tests and classify new behavior, new bug or regression before editing.
2. Record project ID `github:shoon94parkk-del/chart-view-toss`, actual branch/SHA, source versus deployed revision, user scope and evidence paths. Toss UI belongs here; the separate shared backend/Web UI belongs in `shoon94parkk-del/chart_View`.
3. In a new environment, run `node tools/codex/setup.mjs --install --with-browsers`, then `--check`. Read the transfer guide for OS libraries, Korean fonts, proxy/CA and connectors. Never copy login files, keys, global hooks or scratch databases into Git. Package installation alone does not verify browser launch, Codex skill discovery or account connections.
4. Use `node tools/codex/run.mjs browser ...` for ordinary UI exploration, optional Lighthouse/dependency/Knip/fast-check diagnostics where helpful. Keep mandatory Playwright/axe tests. tester-army/e2e and claude-mem are researched sources, not connected runtimes. Do not activate model/provider/chat, telemetry, hooks, workers or new API keys through this skill.
5. Verify raw API → actual model → visible value: identifiers, price/change basis, dates/timezones, units, missing versus genuine zero, denominators and performance calculations. Live data is not a fixture; changing real prices are checked against captured responses. Keep current quote guards, lazy/nonblocking sections, cache freshness and canonical revalidation.
6. Add a regression for each behavioral fix using existing Node/E2E fixtures and stable role/name/action selectors. Inspect Android, 320px and small iPhone WebKit: overflow, card edges, touchability, fixed-menu overlap and control/result proximity. Do not weaken waits, geometry, data meaning or assertions to conceal failure.
7. Run `npm run qa:prepush` and the relevant existing QA before pushing frontend changes. Run actual API/browser checks when they are material. Serialize common report paths and isolate diagnostic artifacts. Analyze app bugs separately from faulty test assumptions or missing fonts/network. No flaky-pass, skipped required case or fixture-only result establishes release completion.
8. Update Git-backed decision/memory/handoff records with confirmed facts, commands, counts, artifacts and remaining limits. Do not collect raw conversations or private watchlists. Before deployment, verify CI and the exact tested main revision; after deployment verify actual app assets/API revision and changed UI. Existing user authorization governs publishing—this skill does not introduce a separate approval step.

GitHub Actions must remain deterministic Playwright/Node/axe without OpenAI/external LLM keys. Render web preview is not native Toss Android/iOS Sandbox approval. See `docs/P0_RELEASE_GATE.md` for the remaining real-device release scope.
