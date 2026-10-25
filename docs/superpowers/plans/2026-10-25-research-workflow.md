# Research Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Let users revisit saved research, reuse personal filters/comparisons and retain news evidence without changing investment calculations.

**Architecture:** Add bounded account-local stores behind existing `storage.js`. Extend existing Watch/research/news and lazy analysis views; the coordinator owns shared `main.js`, storage registration, integration, full QA and delivery.

**Tech Stack:** Vanilla JavaScript, Vite 7, Apps in Toss SDK 3.5.0, Node 24, Playwright 1.55.0, existing CSS.

**Spec:** [2026-10-25-research-workflow.md](../specs/2026-10-25-research-workflow.md)

## Global Constraints

- Existing four bottom tabs, compact rows, 44px controls, 320px/Android/iPhone behavior.
- No new backend/provider/LLM requests, dependencies, notifications or sync.
- Three new keys are registered by coordinator: `RESEARCH_TASKS_KEY`, `SAVED_SETS_KEY`, `RESEARCH_EVIDENCE_KEY`; existing records are preserved.
- Every new write is confirmed and serialized, guards storage generation, and fails visibly on corrupt/failed storage.
- Personal records never enter public share URLs or usage analytics; current calculation/provider contracts stay unchanged.
- Agents own disjoint files, do not commit/push independently, and run targeted Node checks only. Coordinator serializes builds/browser/full QA.

## Review Focus

- Deferred native storage save crossing reset/account change must not restore old personal data (each store + storage integration tests).
- Invalid dates, KST midnight and changed saved research must not classify an item incorrectly or hide it as completed (Task 2 tests).
- Failed/partial/new news data and navigation must not erase expanded state or create hidden summary/provider requests (Task 1 tests).
- Corrupt or malicious local records, URL credentials and long input must not overwrite data or create unsafe links (Tasks 1/2/3 tests).
- Applying stored filters/comparisons must preserve unrelated state, current quote freshness and the existing six-stock limit (Task 3 + integration tests).

## Task 0: Storage and environment foundation (coordinator)

Files: `src/storage.js`, `tests/storage.test.mjs`, project docs.

- [x] Record clean baseline Node suite and install existing pinned dependencies/browsers.
- [x] Add failing registration/reset/account isolation tests for the three new keys.
- [x] Register keys in existing initialization/clear paths; run storage tests.

## Task 1: News pagination and evidence (news owner)

Files: `src/newsReaderModel.js`, `src/newsReaderView.js`, `src/newsReaderView.css`; new `src/researchEvidence.js`, `src/researchEvidenceView.js`, `src/researchEvidence.css`; dedicated Node/E2E tests.

Interfaces:
- `mountNewsReader` gains `onSaveEvidence(row)` and uses existing `preferences` to retain visible count for each page/filter/sort.
- `mountResearchEvidence(host,{symbol,name,onExternal,onNotice,isCurrent})` returns cleanup and displays current saved evidence.
- `openNewsEvidenceEditor(host,row,{onNotice,isCurrent})` provides explicit related-stock selection, memo, confirmed save/cancel; returns cleanup.
- `readResearchEvidence(symbol?)` returns `{rows,error}`. Records contain bounded `id,symbol,title,url,sources,publishedAt,savedAt,memo`; preserve original date-only values and dedupe by symbol+safe URL.
- Coordinator mounts editor on News, evidence on every stock Detail, and adds a compact Watch entry for saved evidence.

- [x] Add/observe failing pagination, URL validation, duplicate/limit, failure/reset/account and persistence tests.
- [x] Implement 12-more UI with filter/sort reset, same-session return retention and no automatic summaries.
- [x] Implement evidence store/editor/detail list, preserving original fields, escaped markup and safe links.
- [x] Add actual-browser tests for more/return, evidence save/reload/edit/delete and non-Korean symbols; coordinate selectors with coordinator.
- [x] Run targeted Node tests, self-review and report evidence/integration hooks.

## Task 2: Due research queue (review owner)

Files: new `src/researchTasks.js`, `src/researchTasks.css`; `src/savedResearchView.js`; dedicated Node/E2E tests.

Interfaces:
- Preserve `savedResearchHtml(nameFor,{compact})` and existing selectors/content for original rows.
- Export `bindSavedResearchActions(host,{nameFor,onNotice,onUpdated})` with duplicate-binding protection; coordinator invokes it from existing `bindNav` and remount flows.
- Reuse `savedResearch()` as source. A separate task store holds source-revision-bound completedAt and rescheduled dates; never alter existing report/question evidence to mark a review complete.
- KST calendar labels `기한 지남`, `오늘`, `예정`, `완료`; undated rows stay accessible in 전체. Completion and postpone use explicit controls, preserve focus and allow retry/undo.

- [x] Add/observe failing KST/date validation, completion/reopen, changed-source, failure and account/reset tests.
- [x] Implement bounded store and compact/full rendering; preserve existing latest-filing refresh and one home row.
- [x] Add browser tests for complete/undo/postpone/reload, hidden/expanded mobile controls and unchanged original evidence.
- [x] Run targeted tests and report coordinator hooks.

## Task 3: Named saved filters/comparisons (sets owner)

Files: new `src/savedSets.js`, `src/savedSetsView.js`, `src/savedSets.css`; `src/analysisViews.js`; dedicated Node/E2E tests.

Interfaces:
- `mountSavedSets(host,{kind,getValue,onApply,onNotice,isCurrent})` returns cleanup; kinds `screener` and `comparison`.
- comparison values `{selected,period,customRange}`; screener values use actual current `{filters,activePreset,count}`. Reuse `decodeSharedView` validation where safe; reject invalid filter ranges instead of silently fixing user's input.
- Max 5 sets per kind; names 40 chars, save/rename/delete with inline accessible forms (no blocking prompt).
- Agent integrates screener via current apply/render path in analysisViews; coordinator mounts comparison below existing selected summary and applies through confirmed `persistList('selected',...)` before refreshing chart.

- [x] Add/observe failing persistence/name/limits/filter/date/six-symbol/corruption/queued-save tests.
- [x] Implement store and inline view, integrate screener using existing filters, preserve Back and clear behavior.
- [x] Add browser tests for multiple sets save/reload/apply/rename/delete and comparison without watchlist mutation.
- [x] Run targeted tests and report coordinator hooks.

## Task 4: Integration, independent review and delivery (coordinator)

Files: `src/main.js`, `public/privacy.html` if required, relevant existing integration tests and memory/docs.

- [x] Integrate three stores/views into current owners; keep lazy modules isolated and cleanup epoch-safe.
- [x] Update local-data copy/reset and changed content assertions deliberately, without weakening existing data/navigation checks.
- [x] Run independently authored spec/code review; fix validated findings with regressions.
- [x] Run focused new browser tests; inspect 320px/Android/iPhone screenshots and relevant mobile scripts.
- [x] Run `VITE_CHARTVIEW_STATIC_DATA_BASE='' npm run qa:prepush` and `npm run build:ait`; record actual results/limitations.
- [x] Update decision log/project memory/report, inspect final diff, commit and create a reviewable PR if connection permits. No direct main merge, public Toss submission or unrelated backend changes.
