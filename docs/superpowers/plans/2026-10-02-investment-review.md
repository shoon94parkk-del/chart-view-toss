# 공시를 통한 투자 검토 개선

> For agentic workers: REQUIRED SUB-SKILL: superpowers:executing-plans. Implement this approved plan inline.

Goal: Compact, informative quotes; direct index charts; eight standalone quarters and TTM; reviewed filing changes; saved, verifiable investment conditions.

Architecture: Preserve existing normalized chart data and financial-history contracts. Add a background cached quarterly endpoint in the shared backend. Load each detail feature independently. Store reviewed filings and comparison conditions only in account-scoped device storage.

Tech Stack: FastAPI, OpenDART, Redis cache, Vite, vanilla JavaScript, Lightweight Charts, Node test runner, pytest, Playwright.

Spec: User approval on 2026-10-02. Implement in order: (1) quarterly results, (2) filing changes, (3) investment reasoning tracking, plus compact quote and direct index chart requests. No LLM or paid API.

## Tasks and completion evidence

1. Compact quote with price/change together and expandable provenance. Index tiles open the index detail without altering comparison selections; chart plots actual index values. Verify at 320/390/430px.
2. Add /api/financial-quarters with asynchronous collection and stale cache preservation. Direct three-month IS values for Q1–Q3; Q4 from annual minus Q3. Same currency/basis, no missing-to-zero conversion. Eight ordered quarters, YOY, TTM only from four consecutive complete quarters. Unit tests for missing data, losses, mixed basis and Q4; mobile pending/retry.
3. Local reviewed report snapshot: first view has no invented new-report alert. Compare corrections only within identical periods; new period uses year-ago equivalent. Acknowledgement explicit and source linked.
4. Save typed conditions from existing comparison output. Re-evaluate supported metrics with period/source/value evidence. Missing/stale/mismatched reports are unverifiable, never an investment recommendation. Native account isolation, reset and public share exclusion tested.
5. Build and mobile regressions, whole-diff review, exact backend-first production deployment, warm real quarterly data, live browser journey and screenshots.

## Execution ledger

- 2026-10-02: Inspected both clean repositories and current data contracts. OpenDART official guide confirms interim IS thstrm_amount is three months and thstrm_add_amount is cumulative. Existing normalized chart points already contain price; preserve their meaning.
- Implemented tasks 1–4 with red-to-green unit/QA evidence. Independent final review found prior-value correction omission, receipt rollback, all-failed refresh mislabel, and stale quarter polling completion; all received regression tests and fixes. Stored cash baseline formatting preserves its own currency.
- Production web release and final mobile regression completed; see final ledger and SECTOR_PERFORMANCE_AUDIT_2026-10-02.md. Apps in Toss device/public-release gates are separate.
- Final: fixed same-receipt prior-value correction, older receipt rollback, all-failed refresh timestamps, stale-cache polling completion, and expanded-table/focus retention during background polling; regression reproductions were RED before implementation. No review findings left deferred.
- Local verification: 124 Node tests + build, 77 backend tests + bundle check, existing mobile release/financial/research/selection flows at 320/390/430px. Backend 09f1a4e committed; daily workflow generated real 14-company cache a396dcf, also passed backend regression suite. Final frontend build and production journey pending.
- Final build passed 124/124 tests, 17 direct-entry routes. Latest investment_review_qa passed at all three widths including cache refresh completion with expanded table/focus preservation. Existing mobile release, financial, question comparison and selection QA passed. Backend a396dcf is live and /health matches; Samsung/Hynix quarters returned all 8 rows plus TTM in 273/319ms on active service. Four real index APIs returned 62–65 observed prices and no errors.

- Final web delivery: frontend 9f0fe65 (0.10.2) and backend a0cd4ca confirmed live by Render commit, actual bundle and /health. Frontend 133 tests/build/17 direct-entry routes pass; final investment mobile flows pass at 320/390/430px. Backend final related regressions 40 pass. Independent review index freshness finding fixed with both timestamp directions tested.
- Live final flow passes KR/US sector → detail → eight quarters/TTM → filing acknowledgement → Hynix comparison → condition save/re-entry → actual KOSPI chart → US request isolation. No JS errors or horizontal overflow. CDN outage fallback passes. Full 17-route audit: all meaningful selectors render, 15/17 below 1s in the final warm sample; index 2.52s remains provider-sensitive. Baseline, degraded intermediate samples and final results are retained in the audit.
