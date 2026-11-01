# Neon storage for Investment Learning

Chart View Toss keeps its existing Render static frontend and shared FastAPI API. Only Investment Learning's persistent database uses Neon. Quotes, charts, screeners, PICK, device-local research, legacy profile-sync configuration, and Redis keep their existing owners.

## Selected resources

- Organization: `org-floral-flower-47469142`
- Project: `solitary-forest-08804660` (`my-first-project`), confirmed Free plan
- Branch: `production`, ID `br-little-resonance-b4ax0qap`, default branch, no expiration configured
- Database: `neondb`, PostgreSQL 18, AWS US East (Ohio)
- API: existing Render `srv-dao4a50473hc73bclej0`, workspace Chart View

`neon.ts` manages the Postgres-only declaration. Production never receives the starter policy's seven-day expiry; new preview branches may receive it. Inspect any existing remote `expires_at` before production deployment because an omitted TTL does not clear an existing expiration. The existing application owns recovery-key authentication; Neon Auth, Functions, Data API, Object Storage, and AI Gateway are not needed for this integration.

## Local CLI setup

```bash
npm i -g neon@latest
neon init -y --org-id org-floral-flower-47469142 --project-id solitary-forest-08804660 --branch production --services postgres
neon config plan
neon deploy
```

The initial setup used CLI 8.16.0. Its `init` wrote an offline link and installed `@neon/config`, `@neon/env`, and the Neon agent plugin. Its first `deploy` stopped at a 60-second browser authentication timeout. A Neon website or ChatGPT sign-in does not authenticate this CLI profile. When CLI authentication is unavailable, the user-authorized Neon connection can inspect/provision the same selected resources and retrieve their connection URLs without requesting another terminal login. Report that fallback accurately; do not report a successful CLI deployment.

## Runtime connection

Keep the existing Python `psycopg` v3 driver and transactional store. The browser calls the FastAPI learning API; it never connects directly to Postgres. Neon connection pooling is enabled. Store the pooled TLS connection URL in the backend service's **`LEARNING_DATABASE_URL`** secret. Merge this key without replacing other Render variables. Do not set `DATABASE_URL` globally on that service: it could also affect legacy profile-sync.

The local ignored `.env.local` contains `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct, for migration/backup tooling). `.neon`, `.env`, and `.env.local` are ignored. Never prefix database credentials with `VITE_`, commit credentials, put them in frontend code, or include them in reports. The `@neon/*` dependencies manage infrastructure and are not imported by the Vite client.

The learning schema is maintained by the existing backend `learning_store.py`: `learning_accounts`, `learning_sessions`, `learning_requests`, and the account-session index. First connection creates missing tables without changing old records. Writes preserve account row locks, expected document versions, idempotency receipts, immutable study revisions, quiz attempts, and insight validations.

## Acceptance and backup

Require `/health` to match the deployed backend revision and `/api/learning/status` to report `configured: true, storage: postgres`. Verify an actual study save, refresh, historical edit, server-graded quiz and review, export, independent-browser recovery, and account isolation. Keep a temporary account's workspace hash/record identity/history counts across a completed Render redeploy, then delete only that test account. Provider status alone is not acceptance evidence.

Free-plan compute can sleep and resume. This is independent from expiration of stored records. The provider's short instant-restore window does not replace a long-term backup: use the application's full JSON backup/export and test restore. No paid plan upgrade or scheduled paid-backup service is part of this setup.

Activation and acceptance results are recorded in the setup PR and the execution plan; the setup is complete only after those actual checks pass.

## Observed activation result

The selected production DB is connected. Activation Render deploy `dep-dbjqfq6c6qcc73c9vpug` and the final retention redeploy `dep-dbjqkjvb9u1s73eq5jf0` both use backend main `c1a1fcd70fe03e525abd6100ae06af1680f69d8a`. `/api/learning/status` reports configured PostgreSQL. Neon independently reports the three learning tables on PG18.6; no paid plan was created or upgraded.

Actual production acceptance passed13 checks: save/refresh, incomplete-completion rejection, manual completion without invented quiz, server scores50→review100, original-preserving edits and validation, secret-free backup, exact workspace preservation after redeploy,320px recovery/logout401, second-account isolation404, iPhone WebKit recovery, matching API/model/UI metrics and no uncaught errors. Both temporary accounts were deleted and their token/recovery access rejected. The retained record before cleanup had version6,1study,3revisions,2attempts,1review and1validation, with identical SHA256 before/after deployment.

The first acceptance run passed redeploy retention but then exposed a test-helper error: same-document hash navigation returns null rather than an HTTP response. The helper now accepts null only for an actual origin/path/query-preserving hash change and checks the target URL/UI. Real document loads must still200. The corrected full run passed; no product code was changed to satisfy that harness correction.

## Release-gate followup

Required verification of the config-only head also exposed existing frontend reliability issues. The Home journey was tested under the special300ms fail-fast build; controlled slowdown reproduced the same failure on byte-identical baseline/current assets. Its unchanged workflow step now runs after the existing production-budget build. Short-timeout failure scenarios remain unchanged.

A News Back terminal-restore RAF could be invalidated by an immediate sort while leaving its target for the next render. A deterministic regression drove the original code to the stale target, then verified synchronous intent consumption, captured terminal clamp, epoch and cancellation/new-target guards. An isolated WebKit reload diagnostic also motivated a source-level pagehide regression: new request/retry starts in a closing document are blocked, with normal work resumed on pageshow and pending/cache contracts preserved. The original one-off screener error's exact scheduling was not reproduced; it is recorded separately from the proven document-exit guard. Strict error checks, UI assertions and timeout/freshness policy were not weakened. Final complete verification results are recorded in the setup PR.
