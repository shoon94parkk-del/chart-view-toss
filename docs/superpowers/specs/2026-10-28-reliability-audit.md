# Thorough reliability audit

Project: `github:shoon94parkk-del/chart-view-toss`  
Baseline: `03fede3` (main, 2026-10-28).

The user requested a thorough audit and implementation of improvements. Preserve the existing compact mobile design, vanilla Vite architecture, shared backend contracts, SDK 3.5.0, and protected PICK/TOP10 calculations. Fix reproducible reliability and data-integrity defects instead of redesigning established subsystems.

## Approach

Broad redesign would increase regression exposure without evidence of need. Cosmetic-only changes would leave confirmed data-loss and misleading-value bugs unresolved. The chosen engineering approach is small fixes at existing ownership boundaries, with reproductions, regression tests, independent review and the existing four-device QA gate.

## Confirmed requirements

- A native reset must reject new read/modify/write transactions throughout the actual removal operation, including after a caller timeout. Deleted personal records must not return through a concurrent save.
- Malformed personal research storage must remain intact when saving/deleting fails; show the error through existing UI recovery and retain valid legacy editing.
- A newer quote with an explicit missing observation field must not inherit that field from an older observation. Preserve structural identity/market-cap fields and genuine zero values.
- Investigate and repair delayed News Back restoration and cached Detail quote recovery only after reproducing the corresponding user-visible failure.
- Keep source freshness, provider/API requests, personal-data privacy, native navigation, existing test assertions and release gates.

## Verification and limits

Run targeted RED/GREEN regression tests, the full Node/build/Playwright gate, relevant mobile QA and an independent diff review. Distinguish local fixture verification, GitHub publication and native Toss device validation. No shared backend, data-provider, paid-service or public release changes are included.
