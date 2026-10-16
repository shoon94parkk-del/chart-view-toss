# Task 3 independent news review — 2026-10-16

Scope: read-only review of `news-review.diff` and current `src/newsReaderModel.js`, `src/newsReaderView.js`, `src/newsReaderView.css`, and `tests/newsReader*.test.mjs` in `/workspace/chartview-audit-20261015`. Requirements: `task-3-brief.md` and `docs/superpowers/specs/2026-10-16-moneytoring-ux.md`, section 2. Integration in main/api belongs to the coordinator and is not judged as missing from these owned files.

**SPEC verdict: CHANGES REQUIRED.** The same-visit summary-state requirement is incomplete, and summary request identity does not preserve the existing input-sensitive cache contract.

**QUALITY verdict: CHANGES REQUIRED.** Two Important findings below need fixes and targeted regressions. No Critical finding. Most core mechanics are well isolated and their source matches the implementation report. No broad suite or browser rerun was performed.

## Important findings

### I1 — Same-visit detail round trips discard expanded, pending and failed summary state

Location: `src/newsReaderView.js:34`, `:66`, `:85–86`, `:130`, `:154`. The controller's `states` Map and the view's `expanded` Set are new on every mount. The WeakMap preserves only successfully cached payloads. This conflicts with the spec's explicit requirement that filter/sort/summary state survive same-visit detail round trips. The report acknowledges that expansion always starts closed, but no approved exception appears in the requirements.

Concrete reproduction using the real mount and a dependency-free host: expand an article; wait for the summary; cleanup; remount the same payload with the identical preferences object. Before cleanup the generated toggle has `aria-expanded="true"`; after remount it has `aria-expanded="false"`. Returning while loading loses pending state and the eventual result is discarded because the old owner's current check fails. Returning after a failed request loses its retry/error presentation. The existing remount test at `tests/newsReaderView.test.mjs:77` checks successful payload reuse only and does not assert restored summary state.

Required change: keep visit-scoped expanded keys and relevant summary states together with the preferences/cache; restore the presentation on return without automatically starting new summary work. Cover ready, pending, error, collapse and a later payload where an article has disappeared.

### I2 — URL-only cache and pending identity can attach a stale summary to corrected article inputs

Location: `src/newsReaderView.js:19–25`, `:36`, `:39–48`, `:85`, `:92`. Both the shared pending map and visit cache use only the approved URL. `loadSummary` receives the title and summary seed too. The existing backend's summary identity intentionally includes URL, title and snippet (`/workspace/chartview-quote-release-main-20261015/news_summary_service.py:595–597`), allowing updates/corrections at a stable article URL to produce a different summary. The client bypasses that contract when it returns its cached payload without invoking the wrapper.

Concrete reproduction: mount URL `https://publisher.test/updated`, title `Original headline`, seed `Original seed`; explicitly expand and resolve `{summary:'Original headline', basis:'headline_only'}`. Cleanup, then remount using the same preferences and URL but title `Corrected headline` and seed `Corrected seed`. Explicit expansion leaves the loader call count at 1 and displays `Original headline` as the summary under `Corrected headline`. No retry is offered for this otherwise successful headline-only payload. The global pending map likewise shares the first request's row when a later explicit request has different title/seed inputs at the same URL.

Required change: separate article grouping identity from summary-input identity. Key cached/pending summaries by the URL plus the actual title/snippet inputs supplied to the existing wrapper, or validate that cached inputs still match before reuse. Keep URL-level grouping for relation receipts unchanged. Add regressions for changed headline and changed seed, including a pending cross-controller request.

## Minor observations

- `src/newsReaderModel.js:75`: an empty successful summary payload produces an empty-state message but `retry:false` when fetch/translation/quality flags are absent. For example `{summary:'',basis:'article_body',qualityStatus:'ok'}` also still says it was made from the article body. The spec calls for an empty/retry presentation. Treat missing summary content as an unsuccessful result with an explicit retry. A resolved null payload is a related edge: `newsReaderView.js:48` leaves the state pending indefinitely. The normal checked backend currently returns an object and nonempty message, so these are robustness gaps rather than an observed provider failure.
- `src/newsReaderView.js:10–13`: the current owner is selected before deferring loader execution to a microtask. `const p=c.request(row); c.dispose(); await p` still invokes the loader once. Existing queued-job coverage disposes only after a tick. A second current check immediately before calling `loadSummary` would close this narrow route-change timing window. In-flight response writes remain correctly guarded; this does not defeat the global three-request cap.
- Focus restoration at `src/newsReaderView.js:115–127` identifies title and original buttons by the same external URL, so a rerender while the original button is focused restores focus to the title button. A distinct control identity would preserve exact focus. The mock host tests do not exercise real document focus.

## Confirmed source properties and limits

- Same byte-identical approved HTTPS URL merges across `items` and `groups`; every distinct symbol/relation/basis receipt is retained. A direct receipt for A does not become a direct receipt for B. The selected-symbol relation filter checks that symbol's receipts.
- Source/relation filtering and their counts occur before slicing to the default 12 cards. The count copy limits its claim to returned data. Sorting uses supplied score/timestamps, including zero, without manufacturing a time or chart association.
- Link controls use approved HTTPS URLs. HTTP links go through the existing verified-publisher upgrade; unknown HTTP origins stay unavailable. Controls are siblings rather than nested buttons.
- Mount, filtering and cache restoration do not themselves call the summary callback. The shared queue caps active callbacks at three; pending requests dedupe, disposed queued subscribers are removed, and response rendering checks cleanup, same-host remount, connection and the caller's current guard.
- Blocked summary text is withheld, known basis/fallback/fetch/translation limits are explained, and untrusted text is HTML escaped. No article body/image is introduced by these modules.
- CSS declares 44px minimum button height, wrapping metadata, visible focus styles and scoped reader rules; no reader rule explicitly clips control height. This is source inspection, not a narrow-screen or browser accessibility certification.
- The added tests cover merge evidence, local filters, stable sorts, request limits/dedupe, retry, cleanup, same-host remount, successful visit cache and escaping. Their host harness lacks DOM parsing/layout/focus checks and misses the Important counterexamples above.

Verification performed: a single small `node --input-type=module` harness imported the real model/view, reproduced I1/I2, and inspected the two minor response/disposal cases. It exited 0; its printed evidence was `before round trip expanded=true`, `after round trip expanded=false`, `reopen calls=1 shows old summary=true`, `loader starts despite immediate disposal=1`, and empty summary `retry:false`. No source/test edits, commits, external provider/LLM calls, native checks, or green-suite reruns were made. This report is the only written artifact.

## Final disposition after implementation fixes — 2026-10-16

This disposition supersedes the initial SPEC/QUALITY verdicts above for the updated owned news module and tests.

**SPEC verdict: PASS within the scoped module review.**

**QUALITY verdict: PASS within the scoped module review.** No unresolved Critical or Important findings from this review. Main/api integration, full suite, browser layout/accessibility, native and deployment gates remain the coordinator's separate work.

- **I1 resolved.** `newsReaderView.js:10`, `:51–96`, `:120–124`, `:130–131` retain expanded/collapsed and ready/pending/error state in the preferences-associated session. Matching pending entries settle while away, without notifying disposed listeners. Return adopts only already explicitly requested pending work; mounting does not enqueue a new request. Entries are limited to 120 and successful replacement payloads prune vanished/corrected articles; late results cannot resurrect a removed entry (`:73–77`). Added tests at `tests/newsReaderView.test.mjs:96`, `:114`, `:156`, `:164`, `:170` cover restoration, removal, completion while away, bounds and immediate adoption.
- **I2 resolved.** `newsReaderView.js:5–7` keys summary state and shared pending jobs by approved URL, exact title and `(summarySeed || snippet || '')`, matching the current wrapper's three query inputs. Article grouping remains unchanged in the model. Cached and pending changed-title/seed cases have targeted regressions at `tests/newsReaderView.test.mjs:122`, `:133`.
- **Minor empty/null handling resolved.** Missing summary content now has an explicit missing-summary label and retry; null transport results become errors (`newsReaderModel.js:67–77`, `newsReaderView.js:74–77`). New tests cover both.
- **Minor disposal timing resolved.** The loader-start microtask rechecks the current subscribers (`newsReaderView.js:30–33`); immediate disposal no longer starts transport. Its regression also checks the null-result error.
- **Minor exact focus identity resolved.** Distinct `data-news-control` values for title/original are preferred during focus restoration (`newsReaderView.js:144`, `:148`, `:153`). The regression checks restoration to the original-link control instead of its title sibling.

Re-review evidence: read the updated source, implementation report and added regressions. Ran one small real-module Node assertion harness, not the green suite: ready expansion survives return with one loader call; corrected headline/seed shows the corrected summary after a second explicit call; a pending result finishing while away makes no DOM writes and is restored expanded on return; immediate disposal makes zero loader calls; empty content offers retry. The harness exited 0 and printed `Scoped re-review assertions passed: ready/away-pending restoration, corrected-input cache identity, disposal guard, empty retry. No network.` The implementation report separately records 24 targeted tests passing; that suite was not rerun by this reviewer. No source/test edits, provider/LLM calls, broad test loads, commits or deployments were performed during this re-review.

## Compatibility follow-up: existing article tags and title language — 2026-10-16

The retained browser accessibility guard caught an existing-display omission that this review's initial pass missed: reader cards had dropped the previous news card's backend investment tags and title-language context. The updated display hunks restore that contract.

**Final recommendation: retain SPEC PASS and QUALITY PASS for the reviewed module changes; proceed to the coordinator's refreshed browser/full validation.** No unresolved issue found in this narrow follow-up. The earlier stopped full run is not evidence of a successful release gate.

Reviewed `newsReaderView.js:2`, `:143`, `:147`, `newsReaderView.css:34–35` and `tests/newsReaderView.test.mjs:185–191`. The existing `translatedTag`/`titleLanguage` helpers are reused. Only the first two supplied tags render, all output is escaped, absent tags omit the wrapper, metadata remains at 12px and wrapping, and merged article/stock relation behavior is unchanged. The `.news-tags span` hook remains available to the existing accessibility guard.

Also reviewed the explicit `usLookbackDays` coverage display at `newsReaderView.js:158` and its empty-result test (`tests/newsReaderView.test.mjs:178`). It discloses a supplied positive integer provider window, including empty results. The integration passes 4 when U.S. symbols are requested; the checked backend source uses `today - timedelta(days=4)`. This display adds no provider request or historical-completeness claim.

Evidence: a tiny real-module Node harness verified translated `earnings` → `실적`, escaped second tag, exclusion of the third tag, English title-language label, one merged article and four-day disclosure on empty results. Exit 0: `Narrow compatibility assertions passed: supplied first-two translated/escaped tags, title language, merged card, explicit empty-result coverage. No network.` Read the new regression test and the implementation report's 26 targeted passes. No full suite or browser run was repeated by this reviewer; no code/test edits or external calls.
