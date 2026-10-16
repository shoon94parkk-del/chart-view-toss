# Independent live harness correction review

Compared preserved `live/live-smoke-initial.mjs` with current `live/live-smoke.mjs`, inspected `live/production-smoke-initial-failed/results.json` and the 320px news-step failure screenshot, and read the associated application cache/render contracts. No application/script edits, test execution, browser workloads or live API calls were performed by this reviewer.

**Current SPEC: FAIL pending the narrow relay-integrity correction below. Current QUALITY: FAIL pending that correction.** No application defect is established by these harness failures.

## Preserved failure evidence

The first 320px run records two failures: a news response-event timeout and `response.json: Protocol error (Network.getResponseBody): No resource with given identifier found` for the saved export response. It records zero page errors, earlier real HTTP-200 detail/news/export responses, successful research reload/continuation, and successful macro/company-call checks. The news failure screenshot shows the actual Samsung detail view with a live price and chart, consistent with failure to observe a redundant response rather than failure to render the detail route. The preserved report also includes a partially executed 390px attempt with page/context-closed errors after the run was stopped; those are not independent verified production defects.

## Integrity issue — JSON capture must not replace a real error response

At current `live/live-smoke.mjs:113`–`119`, `await response.json()` was added inside the route relay's outer `try`, before `route.fulfill({response})`. If the real export endpoint returns non-JSON, such as an HTTP-500 HTML error, capture parsing throws and the outer handler aborts the browser request. The browser therefore receives a network abort instead of the actual response/status/body. This violates the harness's unmodified relay contract on that concrete failure path.

Keep optional capture/parse errors separate from the actual relay: fulfill the original API response even if observation parsing fails, and let the later export status/JSON assertion report the genuine provider response. This does not require invented data or a relaxed financial assertion. If a run used the earlier capture implementation but every captured export response was real HTTP-200 valid JSON, distinguish that observed successful path from a general claim that non-JSON failures were tested.

## Changes otherwise preserve the test contract

- Fresh `about:blank` document transitions before the dedicated detail/news checks remove the harness assumption that a same-document hash route must refetch an already cached API value. Persistent local watch/research records remain in the isolated browser context. The earlier back/forward/cache-preservation journey remains unchanged.
- The two response predicates now require the intended single-detail or watchlist ticker set, avoiding accidental capture of a different news request. No API fixture, synthesized response or price is introduced.
- Export observation now comes from the original `route.fetch()` API response rather than a browser/CDP response handle whose resource can be released on later navigation. On the valid-JSON path, parsing does not alter the original APIResponse fulfilled to the page.
- The diff removes no financial/date/provenance/UI assertion, expands no timeout, and adds no skip, synthetic success or fallback payload. Exact revision/asset checks, strict TLS, seven steps/four device configurations, marker ON/OFF/failure checks, observed news error/partial checks and research reload remain intact.

Root owns the corrected operational four-device execution. No 28/28 live success or native Toss validation is claimed by this review.

## Parse-hardening re-review — final harness disposition

**Final harness SPEC: PASS. Final harness QUALITY: PASS. The narrow relay-integrity finding is resolved; no open harness-review blocker.** This supersedes the preceding pending FAIL and does not convert the live operational result into a complete pass.

At `live/live-smoke.mjs:114`–`115`, capture now retains the original `response.json()` promise without awaiting it in the relay. A separate attached rejection handler prevents an unhandled rejection; it does not replace the original promise with fabricated success. `route.fulfill({response})` proceeds with the original APIResponse at line 117. A non-JSON response therefore retains its actual status/body in the browser, while downstream status/JSON assertions still fail on the actual bad response. The correction changes no application source, financial assertion, timeout or API payload. No execution was performed by this reviewer.

## Actual second-run evidence — 27/28, one operational issue remains

Read the completed `live/production-smoke/results.json` (finished `2026-10-16T08:48:18.416Z`): it records 28 checks across four devices, with 27 passed and the 320px `news-reader-and-chart-evidence` check failed. Chromium 390/430 and iPhone WebKit each passed all seven checks, with actual news rows, `markersEnabled: true` through the checked ON/OFF path, zero automatic summary requests and no page errors. The 320px device passed its other six checks, including DRAM source/graph consistency; all devices record no page errors.

The remaining 320px failure is still a 45-second response-event wait, but it must not be dismissed as the earlier same-document cache assumption: the corrected run already uses fresh documents, and its real single-symbol news API transport durations include 11,477ms, 17,950ms, 20,430ms and 20,799ms. Root separately confirmed client-deadline abort behavior and is investigating provider bounds with the backend owner. The harness review passes; the live news latency/timeout issue remains an independent unresolved operational result. No 28/28, all-device news pass, native Toss or provider-license conclusion is claimed.
