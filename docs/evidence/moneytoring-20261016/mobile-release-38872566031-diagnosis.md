# Mobile release QA failure diagnosis

Run: `38872566031`. Job: `116879878226` (`chromium-mobile`). Commit: `4d61275abf380f037bf50dec63c79ef2eef1552d`. Actual GitHub job status: completed/failure. Read-only investigation; no source edits, tests or browser workloads.

## Confirmed failure

Only step 28, **Verify audit fixes and navigation continuity**, failed. Steps 8–27, including the initial mobile release QA and all preceding journeys, succeeded. The actual log records `node tests/audit_plan_qa.mjs`, then `locator.click: Timeout 30000ms exceeded`, waiting for `getByRole('button', { name: /주소 미지원 기사/ })` at `tests/audit_plan_qa.mjs:78:52`. Node was `24.21.0`. This is an absent button expectation, not a recorded network/build/provider error.

## Root cause traced from fixture to rendered control

`tests/audit_plan_qa.mjs:29` supplies two articles: a known-publisher HTTP URL eligible for HTTPS upgrade, and `주소 미지원 기사` at `http://unknown.test/article`. The test successfully reached/passed the known-publisher opening check at lines 76–77, then attempted to click the unsupported article as a button and expected a toast.

The new reader deliberately does not expose an outbound action for an unsafe source URL. `src/newsReaderModel.js:20`–`25` retains the article row but assigns an empty `safeUrl` when neither an HTTPS original nor the allowlisted HTTP-upgrade path is valid. `src/newsReaderView.js:144` renders that article's title as plain heading text, `src/newsReaderView.js:149` renders an inline safe-HTTPS explanation instead of an external action, and `src/newsReaderView.js:140` disables the summary button. Thus the exact fixture remains readable, but the title button/toast-click path expected by the old audit no longer exists.

The demonstrated cause is a stale journey contract after the intentional safe-link presentation change. Correcting the test should verify the unsafe card remains readable, no outbound action exists, summary is disabled and no unsafe request is sent, while preserving the existing successful known-publisher HTTP→HTTPS opening assertion. Increasing the timeout or forcing a click would not address the mismatch.

## Retrieved evidence and access method

- `mobile-release-job-116879878226.log`: full 375,545-byte job log.
- `mobile-release-failed-step28.log`: isolated failed step, including exact selector/line/timeout.
- `mobile-release-job-116879878226.json`: actual job/step statuses.
- `mobile-release-artifacts-38872566031.json`: artifact metadata; `mobile-release-qa-screenshots` exists, id `12033901930`, 14,373,466 bytes, not expired.

The completed job log was retrieved successfully without a workaround:

```bash
gh run view 38872566031 --job 116879878226 --log > /workspace/research/moneytoring-implementation-20261016/mobile-release-job-116879878226.log
```

Direct artifact download hit the blob redirect HTTP 403. Root subsequently requested no further artifact retrieval because the actual logs and source path establish the cause. No screenshot or trace is claimed inspected.

## Follow-up status

Root owns the journey correction and reproduction. Independent read-only review of its narrow test diff is pending. This diagnosis does not claim the mobile workflow is passing or authorize merge before the corrected gates succeed.

Independent follow-up review is now complete: `audit-selector-review.md` records SPEC PASS / QUALITY PASS for the test-only correction, with no findings. The actual old-test local RED matches the CI failure. Root still owns corrected-run and rerun-CI success; no test or browser workload was run by this reviewer.
