# Independent narrow audit journey correction review

Reviewed the working-tree diff of `tests/audit_plan_qa.mjs` against frontend HEAD `4d61275abf380f037bf50dec63c79ef2eef1552d`. Root owns implementation and execution. No source edits, test/browser workloads, commits or subagents were performed by this reviewer.

**SPEC: PASS. QUALITY: PASS. No Critical, Important or separate Minor findings in this narrow test change.** Execution success and rerun CI remain coordinator-owned gates.

## Evidence and cause

The actual Mobile release QA job `116879878226`, run `38872566031`, failed only at the old `tests/audit_plan_qa.mjs:78:52` title-button click. The downloaded failed-step log records a 30-second wait for `getByRole('button', { name: /주소 미지원 기사/ })`. Root's `audit-default-red.log` independently reproduces the same exact selector, line and timeout with the normal build and Node `24.21.0`. See `mobile-release-38872566031-diagnosis.md` for the fixture→safe URL model→view trace.

The existing reader preserves unsafe-link article text but renders its headline as plain heading text, shows an inline safe-HTTPS notice and disables summary. Thus replacing the nonexistent title-button/toast path with assertions for the approved rendered behavior corrects the journey contract. It does not hide a demonstrated browser or outbound-safety failure.

## Diff assessment

- At `tests/audit_plan_qa.mjs:17`, the request observer records any request to `unknown.test` at the context level, including popup pages. It does not suppress or fulfill those requests.
- At lines 79–84, the test locates the specific retained card through its exact heading, requires the visible safe-HTTPS explanation, requires absence of its headline button and all `[data-news-external]` controls, and requires its summary button to be disabled. Removing the unsafe card entirely, reintroducing outbound controls or enabling its summary will fail these assertions.
- At line 85, it requires zero unsafe-destination requests and one remaining context page after the separately opened valid article has closed.
- The preceding known-publisher HTTP→HTTPS opening and destination verification remain unchanged. The fixtures, three viewport widths, earlier journeys, page-error/overflow assertions, browser versions and workflow gates remain unchanged. The diff introduces no skip, retry, timeout extension or assertion suppression.

The observed working-tree source status contained only this test modification, plus the pre-existing untracked `node_modules`. No application source change is part of the correction. Root was running the corrected audit at review time; this report does not claim that run or the follow-up CI passed.
