# Chart View Toss decision log

Append-only high-risk decisions.

## 2026-09-22 — Durable project memory
Added repository-level agent rules, project memory, regression guardrails, and this decision log so later UI/release work does not undo validated Toss behavior.

## 2026-09-21 — Separate Toss client, shared backend
The Toss client remains a separate repository and reuses the Chart View FastAPI backend. Toss-specific UX/SDK/lifecycle changes stay isolated; backend API extensions should be additive.

## 2026-09-21 — Apps in Toss runtime owns native navigation
Inside Apps in Toss, duplicate custom top chrome is hidden and the native navigation bar is used. Subpage back events are handled in-app while root exit remains the platform behavior.

## 2026-09-21 — Reliability before visual completeness
Added bounded request timeout/retry/offline handling, stale-response protection, partial-failure/progressive rendering, and release QA before treating feature parity as ready.

## 2026-09-21 — Data semantics remain explicit
Comparison, valuation, macro, news, and stock-detail surfaces expose calculation basis, observation/source metadata, and distinguish day change from selected-period return.

## 2026-09-21 — Release is gated by real devices
Render/Vite preview and automated Chromium tests are validation surfaces only. Public Apps in Toss release still requires Android/iOS Sandbox/QR verification plus provider-policy review.
