# Reliability audit implementation plan

> Execute the user-authorized improvements with disjoint file ownership, regression tests and one final independent review.

**Goal:** prevent personal data resurrection/loss and misleading or unrecoverable refreshed screens.

**Architecture:** retain the existing storage queue, canonical quote store, news reader and route restore owners. Changes belong at those boundaries.

**Tech stack:** Node 24, vanilla JavaScript, Vite, Playwright, Apps in Toss SDK 3.5.0.

**Spec:** `docs/superpowers/specs/2026-10-28-reliability-audit.md`.

## Global constraints

- Preserve backend API, cache/freshness contracts, compact mobile layouts and protected PICK/TOP10 formulas.
- No private records in analytics/shares; no added external providers or LLM calls.
- Run required full QA before publishing a frontend branch.

## Review focus

Reset timeout/partial failure; valid legacy records versus corrupt roots; quote missing versus zero and structural identity; delayed content after Back; navigation during outstanding requests.

## Tasks

- [x] Reset transaction barrier: `src/storage.js`, storage regressions. Hold native removal, attempt a new confirmed personal save, prove records cannot return; cover timeout and partial failure. Run targeted storage tests.
- [x] Corrupt-store preservation: `src/researchNotes.js` and associated tests. Save/delete malformed JSON and wrong root types must fail without replacing raw bytes; valid legacy objects remain editable. Verify user-visible failure.
- [x] Quote coherence: `src/liveQuoteStore.js`, canonical quote tests. Newer explicit null quote fields clear older observations; structural fields and zero remain valid. Verify source-to-visible-value flow.
- [x] News/Detail recovery: reproduce pending News Back or cached-close failure in actual browser, then minimally repair the existing lifecycle owner and add four-device browser regressions.
- [x] Integration: review actual diff, run `npm run qa:prepush`, relevant mobile QA and AIT build as feasible; record exact outcomes and unresolved constraints in audit/decision/guardrail documents.

## Baseline

`npm run build`: 874 Node tests passed, production build and 30 static entry routes passed. Browser binaries installed; WebKit OS dependencies are being prepared separately. Work takes place in a fresh clone on `codex/thorough-improvements-20261028`.

## Execution record

Confirmed review follow-ups also preserve missing percentages through Home/full heatmaps, cancel pending News restoration on user intent and clamp terminal shorter/error feeds. The source-string CLOSE check was replaced by actual browser-clock behavior coverage. Final integration QA is running on the recorded source manifest; no product edits are planned during that run.

Final verification: 894 Node / 1276 browser passed (0 unexpected/flaky/skipped), mobile320/390/430 and legacy quote recovery passed under the documented native font profile; AIT artifact built. The pre-existing Noto compact-card boundary is recorded in the audit.
