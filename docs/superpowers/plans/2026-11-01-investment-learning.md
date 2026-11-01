# Investment Learning Implementation Plan

> **For agentic workers:** Use focused implementation tasks with independent read-only review. Steps use checkbox syntax for tracking.

**Goal:** Preserve daily company knowledge and dated investment reasoning in the existing Chart View Toss app.

**Architecture:** Lazy vanilla-JS learning UI in Toss; additive FastAPI router, per-account transactional PostgreSQL documents and expiring bearer sessions. Existing market data and local research remain unchanged.

**Tech Stack:** Existing Vite/Toss SDK, FastAPI/Pydantic/psycopg, PostgreSQL, Node tests and Playwright.

**Spec:** `docs/superpowers/specs/2026-11-01-investment-learning-design.md` (shared API contract is binding).

## Global Constraints

- Initial start date 2026-11-02; 6 weeks; 18 companies; 25 minutes daily; Asia/Seoul dates.
- Actual submission alone creates quiz attempts. Self-assessed judgment and external assessments are separate.
- No migration/upload of existing local research, no LLM calls, no fake metrics or financial facts.
- Private storage never falls back silently to Render ephemeral disk; existing market startup remains independent.
- Preserve four primary tabs, native back, safe areas, existing data semantics and deployment ancestry.

## Review Focus

- Repeated or timed-out mutations: UUID idempotency must avoid duplicate histories/attempts.
- Two browsers editing the same document: version conflict retains drafts and prevents overwrite.
- Curriculum edited after study: historical lesson/quiz and insight revisions remain readable.
- Account switching/logout/reset during requests: stale private responses cannot paint the next account.
- Corrupt imports/external scores: atomic validation and no invented native completion.

### Task 1: Curriculum and learning content

Files: backend `learning_content.py`, `tests/test_learning_content.py`.
Produces default curriculum/catalog and lesson/question definitions specified by the contract.

- [ ] Write failing schedule/identity/answer-redaction/pinned version tests.
- [ ] Implement 18 factual company primers with dated verification guidance and official sources, five daily lesson templates, two capability quiz dimensions and judgment prompts.
- [ ] Verify all 42 dates, weekday kinds, custom weeks and safe sources; report commands.

### Task 2: Authenticated durable API

Files: backend `learning_service.py`, `learning_store.py`, `tests/test_learning_service.py`, additive `main.py` router registration, deployment guide.
Consumes Task 1 functions and exposes the spec's `/api/learning` contract.

- [ ] Write failing auth isolation, storage readiness, state/score/history/version/idempotency/import tests.
- [ ] Implement separate auth/storage/router with transactional Postgres and explicit local test adapter.
- [ ] Verify saved record after fresh store/process, real PostgreSQL transaction behavior, incomplete quiz and stale-write rejection.

### Task 3: Learning client/model and complete screen

Files: frontend `src/learningClient.js`, `src/learningModel.js`, `src/learningView.js`, `src/learningView.css`, focused Node tests.
Consumes shared API contract; exports `renderLearning({state,shell,bindNav,isCurrent,openStockSelector?})` cleanup and separate authenticated status summary helper.

- [ ] Write failing KST progress/status/route-selection/client isolation tests.
- [ ] Implement recovery onboarding, dashboard, date/session/company study editor, lessons/quiz/review, immutable history comparisons, insight validation, editable curriculum and import/export/settings.
- [ ] Verify error drafts and real model rendering, no private share/analytics payloads; keep new UI compact with 44px controls.

### Task 4: Existing app integration and browser tests

Files: frontend `main.js`, `routes.js`, `uiIdentity.js`, direct-entry export/tests, privacy/info, `learningStockLinks.js`, `tests/e2e/learning.spec.mjs` and dedicated learning fixtures.

- [ ] Register lazy route, Home/More entry and stock/watch/screener/PICK learning links using independent lifecycle hooks.
- [ ] Verify save/reload/edit/quiz/review/history and stock links through API→processing→UI; exercise desktop/Android/320px/iPhone WebKit, failures and two contexts.
- [ ] Run complete qa:prepush, relevant mobile QA and AIT build; resolve substantive failures.

### Task 5: Review, integration and production preservation

- [ ] Independent source/security/data/mobile review; resolve findings and retain evidence.
- [ ] Document storage settings and operational backup/recovery; update decision/memory/privacy.
- [ ] Integrate tested revisions through existing GitHub/Render flow within authorization. Configure durable store only in confirmed workspace and within authorized cost.
- [ ] Verify deployed revisions and pre/post-deploy record retention; report actual outcomes and remaining user settings/native gates.
