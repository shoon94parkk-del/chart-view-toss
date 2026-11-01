# Neon learning storage activation plan

**Goal:** Activate the existing Investment Learning feature using the user's Neon organization `org-floral-flower-47469142`, project `solitary-forest-08804660`, and `production` branch.

**Architecture:** Keep the Vite/Toss frontend and FastAPI API on their existing Render services. Manage Postgres with the requested Neon CLI configuration at the frontend project root; use its server-side connection variable only in the Python learning store through `LEARNING_DATABASE_URL`. The existing psycopg driver, transactions, immutable history, and API contract remain in use.

**Spec:** The user's six explicit Neon setup steps and the existing Investment Learning design. The user has delegated implementation and selected this organization/project/branch; no design reconfirmation is needed.

## Constraints and review focus

- Never expose DB credentials to frontend `VITE_*` variables, source control, logs, screenshots, or reports.
- Retain existing Render hosting, personal local research, legacy profile-sync, and Redis configuration.
- Inspect the selected existing project and its plan; do not upgrade billing or delete existing data.
- A browser authentication step requires the user's login; report it immediately if it appears.
- Prove real remote storage works, including cold connection and reload, actual grading, account isolation, and persistence after a fresh Render deployment.
- Existing `npm run build` must pass. Add tests only if application behavior needs a code change.

## Execution

- [x] Install `neon@latest`, run `neon init -y --org-id org-floral-flower-47469142 --project-id solitary-forest-08804660 --branch production --services postgres` in this project root, inspect generated files and installed Neon skills. The CLI explicitly wrote the link offline; remote identity has not been verified.
- [x] Review the selected Postgres configuration. The CLI deploy failed authentication; the later user-authorized Neon connection verified the same existing production DB, enabled pooling and supplied the ignored environment-file keys without printing values. No substitute or paid project was created.
- [x] Keep DB access on FastAPI with psycopg; securely merge only `LEARNING_DATABASE_URL` into the existing Render backend service. Activation deploy `dep-dbjqfq6c6qcc73c9vpug` is live and reports configured PostgreSQL.
- [x] Run `npm run build` and real learning/browser end-to-end checks with isolated temporary accounts. Corrected production run passed all13 checks; compare exact hashes/IDs/counts across completed deploy `dep-dbjqkjvb9u1s73eq5jf0`, then delete only its2 test accounts and verify old tokens/recovery keys401.
- [ ] Review generated tracked files, document the final configuration and any failures, integrate only relevant nonsecret changes through existing GitHub gates, and report actual build/test/production results.

## Current checkpoint

- `npm i -g neon@latest`: success, CLI 8.16.0; requested init: success, plugin/config/dependencies generated.
- Installed `neon` and `neon-postgres` skills and current official Python/Render configuration docs read. Keep server-side psycopg; no JS database driver or browser DB credentials are required.
- `neon deploy`: stopped before any provisioning because browser authentication timed out after 60 seconds. The user was immediately given the sign-in link, then asked to run `neon login` in this same execution environment according to their failure-handling instruction. DEFAULT CLI profile remains unauthenticated; no `.env`/`.env.local` exists yet.
- Production policy check: new/existing `production` and new default branches never receive the starter's seven-day TTL. Existing remote expiration must still be inspected after login; the policy does not clear an already existing expiration.
- `npm run build`: exit 0; Node 929 passed/0 failed, Vite build passed, 31 direct-entry routes match. Independent read-only review found no blocking issue or client credential references. Existing lockfile package versions are preserved.
- Subsequent user authorization connected the Neon management API. Confirmed org/project match, Free subscription, PG18.6, default production branch without expiration, and an existing ready database. CLI profile remains unauthenticated; no further terminal login is required for the authenticated connection fallback.
- Ignored `.env.local` now contains pooled `DATABASE_URL` and direct `DATABASE_URL_UNPOOLED`, mode0600. Known URL/password scans found neither in the Vite artifacts. Only the Render backend's `LEARNING_DATABASE_URL` changed; legacy profile-sync remains unconfigured.
- Actual production QA `/workspace/scratch/neon-production-qa-passed/results.json`:13 checks passed, no fixture responses, TLS validation enabled, browser errors empty, both temporary accounts deleted and old authentication rejected. Before/after Render deploy document hash `f0ba85bc8fd6a088a82959d0f73e494eae012e0d138ba6556a2cfcfefafaaf5d`, version6,1study/3revisions/2attempts/1review/1validation and scores50/100 match exactly. 320px Chromium and iPhone WebKit recovered the same data.
- The preserved first production attempt passed9 checks including redeploy retention, then failed a harness assumption that hash navigation returns an HTTP response. Its sole temporary account was deleted. The goto-only fix was reproduced and verified against public documents/hashes and malformed navigation guards, retaining HTTP200 for document loads; product code did not change.
- Final required local qa:prepush is running. Source client/API modules are unchanged by this infrastructure setup. Remaining: source/config integration through existing GitHub checks and final release metadata.
