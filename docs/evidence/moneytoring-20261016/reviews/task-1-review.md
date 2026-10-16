# Task 1 backend review

SPEC verdict: **CHANGES REQUIRED** for optional-cache failure isolation, safe evidence URLs, and historical first-release validation. API issuance is accurately reported as blocked by user identity/authentication plus calendar/display/retention entitlement; no issued key or license is claimed.

QUALITY verdict: **CHANGES REQUIRED**. The default disabled path and provider-free integration are sound, but three small counterexamples escape the intended validation boundaries.

Scope: frozen `backend-review.diff`, actual implementation in `/workspace/chartview-quote-release-main-20261015`, task brief/report, and provider onboarding/adapter-contract evidence. Read-only review; no repository changes, provider acquisition, commits, or full-suite rerun. Findings below use only synthetic in-memory/temp-file examples. The reported 940-test run was not repeated.

## Findings

### Important 1 — a bounded malformed optional file can break the whole macro reader

- Location: `scripts/macro_forecast_data.py:137`, `scripts/macro_forecast_data.py:146`; propagation at `inflation_release_service.py:31`.
- Counterexample verified: write `'[' * 10000 + '0' + ']' * 10000` to an optional-cache temporary path and call `load_cache(path)`. It is only **20,001 bytes**, below the 2 MB limit, but raises **RecursionError** rather than returning `unavailable`.
- `json.loads` depth failure is not covered by the exception handler, and the optional attachment runs outside the existing inflation-cache try block. A damaged optional file can therefore prevent delivery of the six otherwise valid saved numeric histories.
- Required correction: contain decoder depth failures and return explicit unavailable coverage while preserving the saved macro response. Add one meaningful nested-document regression case. The byte/row bounds already present should remain.

### Important 2 — credential-bearing evidence query aliases survive into public receipts

- Location: `scripts/macro_forecast_data.py:54` and `scripts/macro_forecast_data.py:55`; accepted receipts are returned unchanged at `scripts/macro_forecast_data.py:177`.
- Counterexample verified: `safe_url('https://vendor.example/archive?api-key=REDACTED_TEST_VALUE')` returns **True**. Common aliases such as `client_secret` also fall outside the exact-name denylist.
- The same validator protects both `source.forecastUrl` and `archive.url`; the adapter can write this URL to disk and the request reader can expose it in the response. This contradicts the stated safe-HTTPS/no-secret-query contract even though TE `c`, Finnhub `token`, and FMP `apikey` are correctly blocked. No real credential was used or exposed during review.
- Required correction: adopt an explicit public-evidence query policy, preferably rejecting query-bearing evidence URLs unless their nonsecret parameters are allowlisted; otherwise normalize and cover the relevant credential aliases. Pin an importer/reader rejection test.

### Important 3 — historical comparisons can claim a first release before their observation period

- Location: `scripts/macro_forecast_data.py:118` through `scripts/macro_forecast_data.py:123`.
- The existing saved historical points generally have `publishedAt: null`; only the latest points have known publication timing. When timing is absent, both checks are skipped and an official-domain URL plus `actualVintage: first_release` suffices.
- Counterexample verified against the actual saved CPI row: a valid archive receipt for **month `2021-10`**, with arbitrary finite `actual`, `actualVintage: first_release`, **`publishedAt: 2020-01-01T12:30:00Z`**, and **`source.actualUrl: https://www.bls.gov/`** is accepted and appended to `comparisons`. Its release predates its observation month, and the homepage supplies no period-specific first-release evidence.
- Required correction: fail closed for impossible publication/period relationships and require sufficient original-release evidence when the saved point has no known publication metadata. A generic official homepage should not turn an archive forecast into a verified first-release comparison. Preserve the forecast itself as usable archive evidence and retain the existing legacy comparisons unchanged.

### Minor — conflicting forecast and comparison values share one identity without reconciliation

- Location: `scripts/macro_forecast_data.py:153`, `scripts/macro_forecast_data.py:170`.
- Counters quarantine duplicates separately within each collection. A forecast with expected `0` and a comparison with expected `9`, both for `(cpi, 2021-10, yoy, NSA, %)`, are simultaneously accepted. This was verified with the same temporary/in-memory example as Important 3; removing the impossible publication timestamp still leaves the cross-collection conflict behavior.
- The contract describes identity-based duplicate quarantine but does not explain distinct forecast vintages under the same identity. Define whether the two arrays must agree on expectation/provenance; if so, quarantine conflicting pairs. Otherwise document how consumers select and explain the distinct receipts. This is secondary to the three blockers above.

## Requirements that are satisfied

- No built-in provider HTTP client, no request-path provider call, no workflow activation, and no provider acquisition without explicitly injected transport and rights confirmation.
- Missing/unconfigured cache yields empty optional receipts with explicit `not_configured` coverage. Existing six series/rates/points and legacy comparisons are retained by the default path.
- Exact series/month/rate/basis/unit matching, CPI/PPI NSA YoY and SA MoM, PCE SA rates, finite numeric zero, per-collection duplicate quarantine, saved-month matching, and strict legacy pre-release capture ordering are implemented.
- Provider archive retrieval is distinct from local pre-release capture. The adapter does not manufacture forecast timestamps, infer reference months from release dates, use TEForecast as survey consensus, or promote vendor Actual into first-release comparisons.
- The injected adapter uses documented TE CalendarID/CalendarId, ReferenceDate, ForecastValue/Forecast, and Unit fields; event mappings remain explicit and real CPI/PPI/PCE coverage remains honestly unverified. Byte/row bounds exist on normal import/read paths, subject to Important 1.
- The three official onboarding flows, missing email/login/verification and contract/entitlement requirements, and the distinction between key issuance and display/retention rights are clearly recorded.

Frontend/native runtime, protected strategy behavior, production deployment, and licensed data authenticity were outside this scoped backend review. No critical findings identified.

## First correction re-review

Reviewed updated source, the 15 new regression cases, updated contract documentation, and `task-1-review-green.txt` showing **103 targeted tests passed**. The original three Important findings and the minor cross-array conflict finding are corrected: strict JSON decoding contains nesting errors; all evidence URL queries are rejected; missing historical official timing suppresses comparisons; impossible observation/release ordering and homepages are rejected; and valid cross-array expectation/provenance conflicts quarantine both receipts.

One newly introduced Important issue remains at this pass: `scripts/macro_forecast_data.py:133` converts `publishedAt` to New York before rejecting impossible historical dates. An otherwise structurally valid archive comparison with `publishedAt: 0001-01-01T00:00:00Z` raises **OverflowError: date value out of range** instead of rejecting that optional receipt. This was reproduced with a small in-memory call and communicated to the implementer. The failure propagates through the same unguarded macro attachment boundary. Contain timezone conversion overflow and preserve saved histories/the valid archive forecast. SPEC/QUALITY remain CHANGES REQUIRED pending that narrow correction.

## Final scoped re-review disposition

**SPEC: PASS within the authorized optional/offline backend scope. QUALITY: PASS; no remaining Critical, Important, or minor findings from this review.** This supersedes the earlier CHANGES REQUIRED dispositions above.

The timezone correction now catches `OverflowError`/`ValueError` around the New York conversion and rejects only the invalid comparison. Two reader-level regressions cover UTC year-0001 and a +23:59 offset, preserving numeric points, the valid archive forecast, and legacy comparisons. Reviewed RED evidence reproducing both failures and GREEN evidence in `task-1-overflow-green.txt`: **105 targeted tests passed** (67 optional-cache cases plus 38 existing inflation cases). An independent small review script also confirmed that the original nested-document and secret-query examples, missing historical publication evidence, and the newly discovered year-0001 boundary now reject safely.

All initial findings are resolved, the public contract matches the corrected behavior, and the extra strict JSON rejection has relevant regression coverage. No provider I/O, broad suite rerun, repository edits, or commits were performed by this reviewer. The coordinator still owns the final full-backend run after corrections and integration. API issuance, calendar entitlement, public display/retention rights, real provider data authenticity, production/native validation remain separately unresolved or outside this backend review; PASS does not claim those outcomes.
