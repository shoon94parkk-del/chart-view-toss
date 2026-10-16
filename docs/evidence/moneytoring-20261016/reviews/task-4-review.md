# Task 4 independent module review

Project: github:shoon94parkk-del/chart-view-toss. Checkout: `/workspace/chartview-audit-20261015`; HEAD `d09fd1400c04ed687b975d11104d4ffa1b5d264f`. Reviewed the Task 4 brief/report, frozen `frontend-module-review.diff`, research note/card/checkpoint sources and closest persistence/UI tests. Root's unfinished integration and PICK/LAB are outside this review. No source edits, commits, provider calls or repeat runs of already-green focused suites.

**SPEC: PASS. QUALITY: PASS, with one minor observation.** No Critical or Important findings in the scoped change.

Checkpoints are embedded in the existing note and serialized with latest-note fields in the same confirmed UI save transaction. The existing storage context/queue guards remain in place. Read-only legacy access does not backfill events or write storage; explicit saves append only the new operation and retain legacy support/challenge fields. Retention is bounded to 20. Duplicate retained operation IDs do not append or overwrite a later note. Failed unchanged UI retries reuse operation ID, quote snapshot and operation time, while pending/double-click guards prevent duplicate saves. Missing/invalid quote values remain explicit missing snapshots; save time never supplies `asOf`. Untimed observations are disclosed, stale state remains separate and stored evidence is copied rather than mutating old returned records. Review date edits remain local drafts until explicit save; existing optional review is offered only after confirmed persistence.

Read the new legacy/atomic append/quote/retention/idempotency tests and UI retry/date/double-click tests, plus the existing transaction/context and storage guards they exercise. The implementer's reported 76/76 focused result was not rerun or independently reasserted. Root still owns the canonical quote callback, lazy CSS integration and browser/device validation.

## Minor observation

- `src/researchNotes.js:43`–`44`: `Date.parse` plus the timestamp-shape regex accepts impossible source calendar dates as timed evidence. A tiny VM counterexample saving `{price: 1, currency: 'USD', asOf: '2026-02-30T03:00:00Z'}` produced a checkpoint quote with the original impossible `asOf` and `timed: true`. No save-time substitution occurred, and the UI retains the raw source timestamp, so this is input-hardening rather than a demonstrated normal-flow blocker. Consider strict calendar-date validation before setting `timed: true`, retaining the missing/untimed disclosure when validation fails.

## Verification performed

Read-only source/diff/test inspection and the single malformed-observation counterexample above. No build, full QA, native Sandbox, deployment or live quote validation is claimed.

## Follow-up re-review — final disposition

**Final SPEC: PASS. Final QUALITY: PASS. The minor observation is resolved; no open findings in this module review.**

Reviewed only the follow-up validation at `src/researchNotes.js:43`, the added impossible-calendar regression and the implementation report's follow-up evidence. The change checks the source calendar component with the existing strict calendar validator before accepting ISO observation time. Invalid time becomes `asOf: null` / `timed: false`, retaining the real price and existing missing-time disclosure without save-time substitution. The regression also preserves valid leap-day and offset day-crossing observations. The reported 34/34 follow-up result was read, not rerun.

Replayed the original tiny VM counterexample independently: the impossible timestamp now yields `asOf: null` and `timed: false`, while price remains `1`. No suites or source edits were performed. This follow-up supersedes the earlier minor observation only; the original integration/browser/native/license limitations remain.

## Integration finding — persistent operation ID collides after reload (open)

**Current SPEC: FAIL pending correction. Current QUALITY: FAIL pending correction.** This newly confirmed Important finding supersedes the preceding final disposition until a narrow fix is re-reviewed.

Root integration observed the same failure in both mobile E2E runs: save a first question, reload, save a different question, and the timeline remains at one checkpoint. Source inspection confirms the cause at `src/researchCard.js:222`, `src/researchCard.js:232` and `src/researchCard.js:234`: the UI persists `newUsageOperation()` as the checkpoint operation ID. `src/usageMetrics.js:23` resets its in-memory sequence on page load and `src/usageMetrics.js:25` returns values such as `usage-1`. Repeating the same page interaction sequence after reload therefore reuses a prior retained checkpoint ID. The replay guard at `src/researchNotes.js:118` correctly treats that ID as acknowledged and returns the old note, silently discarding the genuinely new question/checkpoint.

The durable checkpoint operation needs an ID unique across sessions, separate from the analytics session key, while preserving that durable ID and original quote/time for unchanged failed-save retries. The implementation owner is preparing that correction. No broad suites or source edits were performed by this reviewer; final disposition remains pending fix review and the reload reproduction.

## Reload-collision fix re-review — final disposition

**Final scoped SPEC: PASS. Final scoped QUALITY: PASS. The Important reload collision is resolved; no open findings in this Task 4 module review.** This supersedes the preceding pending FAIL. Root's broader browser/integration gate remains separate and ongoing.

Reviewed the narrow fix at `src/researchNotes.js:68`, its default at `src/researchNotes.js:93`, and `src/researchCard.js:232`: the existing UUID/time-sequence-random fallback generator is now exported as `newResearchCheckpointOperation()` and used for the persistent checkpoint ID. The analytics `newUsageOperation()` remains a separate in-memory key. Unchanged failed-save retries continue retaining the original durable ID, quote and capture time. Existing stored usage-style checkpoint IDs remain readable and the replay guard is preserved.

Read the added `tests/researchUsage.test.mjs` regression, which starts two fresh UI/model VM sessions sharing only persisted note bytes and intentionally restarts the analytics counter. This closes the integration gap in the earlier review: prior model idempotency coverage supplied operation IDs and did not exercise the UI's restarted analytics key against persistent history. The implementer's reported 35/35 targeted result was read, not rerun.

Independently replayed a tiny two-session scenario using that test's setup helper and the actual note/card sources, without a test suite: analytics IDs repeated, durable checkpoint IDs differed, the second question became the latest note and both checkpoint events remained (`count: 2`). A second tiny failed-save retry check confirmed durable ID and capture time were retained and the quote callback ran once. No source edits, broad suites or root integration changes were performed by this reviewer. Full browser/native/license verification is not claimed here.
