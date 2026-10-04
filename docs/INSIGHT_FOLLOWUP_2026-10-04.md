# Insight follow-up — 0.15.0

Classification: user-approved new behavior following the 78/100 product review. Preserve calculations, original selection scores including zero, fundamental/technical signals, quote freshness, native/account storage and public share exclusions.

## Scope and validation

- Observation cards: factual value/date → question → existing evidence route. Important source limits remain visible; extra interpretation has a named disclosure. No generated causes or issuer benefits.
- Records: fundamental status and price/volume warning have separate labels. TECH_SELL_REVIEW is presented as 강한 기술 경고; SELL_REVIEW as 기업 근거 재점검. Original raw codes/wording and all scores remain in detail. Existing combined priority/filter/count arithmetic is retained and labeled as combined; no trading decision is recalculated.
- Screening: optional priceBasis exclude/only filters reuse the existing ±35% warning threshold. Default remains inclusion, original prices and sort unchanged. State round-trips in public cv and detail/back. Null moves are not invented warnings.
- LAB: guided observation/questions precede candidates; manual screening purpose is explicit. Existing pattern engine/rank/context unchanged.
- Revisit: saved questions, conditions and acknowledged filings use REVIEW_KEY / RESEARCH_KEY. An additive observation retains fetched report/condition result and checkedAt without acknowledging/replacing the saved baseline. New/corrected/changed/older/incompatible/unavailable/unchecked states are distinct. Conditions require comparable dated sources. Home shows only a compact row; explicit latest-report check queries up to three saved domestic issuers with at most three peers per issuer, deduplicated. No automatic Home financial request. Late closed-page requests never persist.

## Boundaries

Revisit means last acknowledged filing / saved condition versus the latest explicitly fetched or detail-observed report, not a complete notification feed or proof of every change since a browser visit. No account synchronization, push notification, new data pipeline, fixed-period investment benchmark or AI prognosis is added. Android/iOS and five-user validation remain external gates.

## Evidence

Baseline main a12b29e / 205 tests. Add model tests for questions, optional warning filter, corrected/new/older/unavailable filings and changed conditions; saved-filing-only listing; strengthen detail regression to assert KEEP plus TECH_SELL_REVIEW remain separate. Mobile followup QA exercises explicit Home refresh, baseline retention after provider failure, URL reload/filter retention and late response guards at320/390/430px. Existing release QA suites continue to apply.

Observed locally: warning first card bottom601.1px above navigation615px at320×693; warning filter excludes it without modifying values; query cv includes exclude. Additional live/CI/deploy evidence recorded in the final workspace report and pull request.
