# Read-only production smoke script review

Reviewed `/workspace/research/moneytoring-implementation-20261016/live/live-smoke.mjs` against frontend source `a99d925564d20dcd13efbad03a1e12560f5cb222`. No script/source edits, tests, browser workloads or live API calls were performed.

**SPEC: FAIL pending the concrete corrections below. QUALITY: FAIL pending those corrections.** These are smoke-oracle/reporting findings, not demonstrated production application failures.

## Important — policy-text check reports an unverified transport result

Location: `live/live-smoke.mjs:266`–`271`.

The privacy step reads two policy strings, checks page geometry and takes a screenshot, then returns `serverTransmission: false`. That action does not inspect request bodies, server-bound note fields, analytics payloads or share transport; the script's request recorder at lines 101–103 records only method and URL. Thus a production document can pass these checks and the output will still claim no server transmission, even though that behavior was not measured by the step.

Report the observed policy disclosure explicitly, rather than a measured transport boolean, unless the script adds a concrete check of the relevant request data. The earlier independent source/policy review supports the intended implementation contract but cannot turn this page-text check into runtime network evidence.

## Important — real provider-error/partial news handling is incomplete

Location: `live/live-smoke.mjs:254`–`258` and return at line 264.

The smoke's `failed` predicate recognizes only `errors` and group errors. The current reader also treats `loadError`, `status: 'error'` and `error` as error indications (`src/newsReaderModel.js:59`–`60`); the detail adapter recognizes `loadError` and `status: 'error'` too (`src/newsResponse.js:2`–`7`). A valid HTTP-200 response such as `{items: [], status: 'error'}` therefore produces retry UI in the application but the smoke expects valid-empty text, falsely failing the correct failure presentation.

When a real payload contains both rows and errors, the smoke checks only the first card and can pass even if the partial-data warning/retry affordance disappears. The chart evidence step likewise accepts any terminal text without checking partial/error disclosure. Align classification with the application's supported response states, assert the observed ready/empty/partial/error presentation, and record which state was actually exercised. Without synthetic API responses, unobserved error/partial states must remain explicitly unexercised rather than claimed covered.

## Important — marker toggle state can pass after marker application fails

Location: `live/live-smoke.mjs:245`–`248`.

The marker branch marks `markersEnabled: true` after checking only `aria-pressed="true"`. In current `src/chartEvidence.js`, marker writes are caught and the UI can display `차트 표시를 적용하지 못했어요.` while preserving that pressed state (`syncMarkers()` and status composition at lines 203–205). The smoke therefore has a concrete false-pass path for an explicit chart-marker application failure.

After an eligible live toggle, require the application-failure notice to remain absent, and report that no marker interaction was exercised when the toggle is disabled. A subsequent OFF assertion would also verify the reversible interaction without changing any chart data.

## Other concrete review notes

The script contains seven named steps within four isolated configurations (320/390/430 Chromium plus iPhone WebKit), yielding 28 planned step results when browser setup succeeds. It seeds only explicit local watch/selected inputs, not market/news/API payloads. API/static requests are relayed through `route.fetch()` and fulfilled from the received response without invented JSON, prices, headers or success states. TLS verification stays enabled and service workers are blocked. The report correctly distinguishes supplied frontend SHA evidence, independently checked module name/bytes and backend health revision, and labels devices as browser emulation rather than native Toss verification.

The research journey checks actual quote/chart response existence, explicit local save, draft back/forward continuity, saved reload and a second persisted checkpoint after another reload. Date-/value-specific macro, calendar, earnings-call and DRAM assertions are tied to this October 16 release baseline; they are not a reusable future-date smoke contract.

One conditional stale locator exists at `live/live-smoke.mjs:342`: `.inflation-reading-head p` matches both the indicator-purpose and definition paragraphs in current `src/macroInflationView.js:73`. If a supplied row has `observationStatus: 'preliminary'`, the single-string assertion can fail strictness instead of checking the relevant definition. The checked-in saved macro baseline has unknown observation status, so this is not a demonstrated current-data blocker; scope the check before relying on that branch.

No live run result, 28/28 success claim, deployment or native/device verification is asserted by this review. Root owns corrections and execution after exact deployment verification.

## Narrow correction re-review — final disposition

**Final SPEC: PASS. Final QUALITY: PASS. The three Important oracle/reporting findings are resolved; no open blockers in this prepared script review.** This supersedes the preceding pending FAIL. The four browser runs and exact deployment/CI verification remain unexecuted by this reviewer.

Reviewed the corrected script only. The privacy result at lines 278–283 now explicitly reports what the policy states and makes no runtime no-transmission claim. The news classifier at lines 261–270 handles malformed roots, `loadError`, `error`, `status: 'error'`, top-level errors and group errors; actual partial rows require both their warning and retry action, and empty provider failures require retry UI. The marker interaction at lines 248–254 now checks ON status and absence of the explicit apply-failure notice, then toggles OFF and checks the resulting status/failure disclosure. A disabled live marker control remains unexercised (`markersEnabled: false`), rather than receiving invented article/price input. The conditional preliminary assertion now targets the single reading-head container, avoiding the two-paragraph strictness issue.

The real-response relay, strict TLS, isolated local inputs, seven steps/four browser configurations and release-date-specific assertions remain unchanged. No API responses, market values or success states were synthesized by these corrections. Root reports `node --check` passed; it was not rerun here. No source edits, script execution, tests, browsers or live API calls were performed by this reviewer. Error/partial and marker interactions are evidence for the states actually returned during execution; states not returned by live services must remain unclaimed as exercised coverage.
