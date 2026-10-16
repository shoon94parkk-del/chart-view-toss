# Task 5 independent module review

Project: github:shoon94parkk-del/chart-view-toss. Checkout: `/workspace/chartview-audit-20261015`; HEAD `d09fd1400c04ed687b975d11104d4ffa1b5d264f`. Reviewed the Task 5 brief/report, frozen `frontend-module-review.diff`, chart evidence model/mount/CSS and its focused tests. Root's unfinished integration and PICK/LAB are outside this review. No source edits, commits, provider calls or repeat runs of already-green focused suites.

**SPEC: FAIL pending the Important cleanup finding below. QUALITY: FAIL pending that finding.** No Critical findings.

## Important — replacement mount can orphan old markers while its toggle is OFF

Location: `src/chartEvidence.js:171`–`175`, together with cleanup guards at `src/chartEvidence.js:157`–`166`.

`syncMarkers()` transfers ownership of an existing series to every new mount before checking whether that mount has enabled or written markers. A default-OFF replacement therefore owns the series with `wroteMarkers === false`, while the previous mount's markers may still exist. Previous cleanup skips removal because it no longer owns the series; replacement cleanup also skips removal because it wrote none. This leaves evidence markers after both mounts have been cleaned up and shows markers while the visible replacement toggle says OFF. Reusing the series for another symbol can also leave the previous issuer's markers present.

A tiny Node counterexample reused the exact fake DOM, `fakeSeries()` and toggle helpers from `tests/chartEvidence.test.mjs`, without running the suite:

```js
const a = mountChartEvidence(hostA, options);
toggle(hostA).click(); // one marker
const b = mountChartEvidence(hostB, options); // same series, default OFF
a();
// toggle(hostB).getAttribute('aria-pressed') === 'false'
// series.markers().length === 1
b();
// series.markers().length === 1; expected zero
```

Observed output was `{"newToggle":"false","markerCountAfterOldCleanup":1}` followed by `{"remainingMarkerCount":1}`. The existing stale-cleanup test enables the replacement first, which removes old prefixed markers and hides this branch. Resolve ownership transfer so a replacement OFF mount cannot strand previous evidence markers, while retaining unrelated markers and protecting markers actually written by a newer owner. Add the OFF replacement/cleanup counterexample to the lifecycle tests.

## Other reviewed behavior

The pure adapter reads only actual publication fields, rejects ambiguous/invalid date strings, handles issuer-market timezone/DST and retains day-only precision. It requires exact selected-symbol receipts, safe source URLs and actual finite chart observations on the exact publication date; weekend/holiday/off-chart dates remain listed without invented next-session mapping. Genuine zero remains valid. Inputs are not mutated and no price calculations/provider calls are added. Escaped DOM text, explicit cause/coverage limits, native buttons, initial OFF behavior on a clean series and ordinary series replacement/cleanup are covered in the tests.

## Minor observations

None separate from the lifecycle finding.

## Verification performed and limits

Read-only source/diff/test inspection and the single replacement-mount counterexample above. The implementer's reported 17/17 runs were not repeated or independently reasserted. Root integration, browser layout/a11y, full QA, native Sandbox and data-display permission remain unverified by this module review.

## Follow-up re-review — final disposition

**Final SPEC: PASS. Final QUALITY: PASS. The Important lifecycle finding is resolved; no open findings in this module review.**

Reviewed only the ownership/cleanup changes at `src/chartEvidence.js:157` and `src/chartEvidence.js:171`, the added OFF-replacement regression and the implementation report's follow-up evidence. A replacement now detects inherited evidence markers and assumes their cleanup responsibility. Its initial OFF synchronization removes that evidence immediately while retaining unrelated markers; current-owner cleanup also handles inherited evidence if a preceding write failed. Ownership checks still prevent stale cleanup from changing markers owned by a newer mount. Clean initial OFF mounts retain the no-marker-write behavior.

The new regression directly covers the originally missed OFF branch, issuer replacement, unrelated marker preservation and both cleanup orders. The reported 18/18 suite result was read, not rerun. Independently replayed a tiny version of the original counterexample using the existing fake DOM/series helpers: AAPL markers were removed on an OFF NVDA replacement, both cleanup orders retained only the unrelated marker, and the clean first mount made zero marker writes. No suites or source edits were performed. This final disposition supersedes the original pending FAIL verdict; integration/browser/native/license limitations remain unchanged.
