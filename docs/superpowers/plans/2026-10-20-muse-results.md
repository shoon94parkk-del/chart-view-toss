# Muse research publication implementation plan

> For agentic workers: implement with the existing project QA and independent review.

**Goal:** Completed public three-agent stock research appears in Toss without a frontend deployment.

**Architecture:** Reuse the approved schema1 research archive, separate from audited PICK v2. Muse exports a reviewed public projection; a bounded publisher merges it into chart_View/static/data/intelligence_debates_public.json. The existing published-data API and configured public CDN deliver independently versioned publications. Toss paints its bootstrap then revalidates, retains the newest good publication and polls only while visible.

**Tech Stack:** Python/FastAPI, GitHub Actions, Vite JavaScript, Node tests and Playwright.

## Global constraints

- Public stock research only: no portfolio membership, quantities, cost basis, account identity, private originals or credentials. No private GitHub ingestion and no LLM calls in viewers/CI.
- Existing schema1 envelopes and legacy records remain compatible. Optional summary (nonempty, <=600 characters) and updated_at (timezone-qualified, <= generated_at) are projected and validated together for new publications. Existing date remains the analysis basis date.
- New COMPLETED records with these extensions require phase1 from mer/nonggu/meng and attack, rebuttal, final stages. audit_verified stays false: publication/completion does not assert audit approval or a PICK.
- PARTIAL and BLOCKED remain truthful states. No synthetic report is published as real research.
- At most30 records,24 phases each,4MiB archive. Cap overflow rejects publication rather than silently deleting history.
- Refresh interval60 seconds while mounted and document visible; resume/manual refresh revalidates. Poll timing is an attempt, not an end-to-end availability SLA.
- Existing mobile navigation, isolated account storage, NPS model/data and audited PICK flags remain unchanged.

## Review focus

- Invalid/unapproved/private input must not replace public data.
- Old CDN or local fallback must not roll back a newer publication.
- Research arrival must not wait for optional Shadow status.
- Refresh/navigation must not disrupt nested disclosures/focus or paint obsolete hosts.
- Source dates, publication timestamps and fetch verification must be distinct.

## Tasks

1. Publisher/API: strengthen the public projection across all rendered fields; validate extensions/completeness; add atomic bounded merge CLI, tests and GitHub workflow. Seed only the existing three approved summaries. Extend the existing published-data allowlist with full validators and real timestamp comparison/last-good behavior for these feeds.
2. Toss consumer: bounded public CDN/API revalidation, initial bootstrap plus refresh, independent Shadow, monotonic last-good state, delayed-source notices, concise summary and state, expandable details, nested disclosure/focus preservation. Extend meaningful Node and deterministic mobile browser tests.
3. Verify: targeted red/green; full Python and npm qa:prepush; existing mobile continuity; independent diff review; protected main CI and exact-revision Render verification. Generate AIT test bundle separately; native Sandbox remains separate.
4. Handoff: document exact Muse projection fields, completed gate, atomic export and gh workflow command; leave actual pending Muse analyses unfilled. Record evidence and current publication/deployment limitations.

## Required regression discovered during full QA

The first full run yielded1038passed/2PICK Back-position failures. A forced held-monitor case also failed on unchangedf1, proving a latent restoration race. Preserve the existing position contract by reusing the root restore engine, retaining intent until initial monitoring layout settles, canceling on real user intent and protecting next-route ownership/queued epochs. Add deterministic held-monitor and user-cancel cases, independently review and rerun the complete final build/suite; do not accept the earlier partial pass as final validation.
