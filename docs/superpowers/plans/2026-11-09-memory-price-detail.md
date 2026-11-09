# Memory price detail implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make collected semiconductor prices explorable by product, period and date.
**Architecture:** Pure calculation model plus existing lazy view; one selected product detail above existing cards. No new transport or dependencies.
**Tech Stack:** Vite, vanilla JavaScript, SVG, Node test, Playwright.
**Spec:** docs/superpowers/specs/2026-11-09-memory-price-detail-design.md

## Global Constraints
- Keep existing API and 900000ms cache, independent route/retry/lifecycle, family deep links and keyboard tabs.
- Use actual observations, source dates, missing versus zero; never invent HBM/MCP prices or interpolate missing observations.
- Mobile controls minimum44px, evidence minimum12px, no horizontal page overflow.

## Review Focus
- Per-group source dates may differ from global history dates.
- Empty/one-point histories and zero baselines need explicit states.
- Malformed dates, duplicate dates and unsorted data must not break geometry.
- Family/product/period selection must not fetch again or lose keyboard focus.
- Long product names and table values must fit320px and iPhone WebKit.

### Task 1: Calculation model
Files: src/memoryPriceModel.js, tests/memoryPriceModel.test.mjs.
Interface: memoryPriceSeries(history,key,{period='all',sourceDate}={}) returns sorted unique {date,value,change,changePct,index}[]; memoryPriceSummary(points) returns count,first,last,low,high,average,change,changePct.
- [x] Write failing tests for valid dates, finite values including0, dedup, cutoff against sourceDate,30/90day periods, exact deltas and zero denominators.
- [x] Implement and run Node tests.

### Task 2: Detail view and mobile styling
Files: src/memorySpotView.js, src/memoryPriceDetail.js, src/memoryPriceDetail.css, tests/e2e/memory-detail.spec.mjs.
Consumes Task1 interface; detail markup in separate module, interaction in existing mount owner.
- [x] Write browser tests for default detail, product/period/index/date selection and table values, sparse/missing/zero histories and source dates.
- [x] Implement responsive detail, SVG axes, native range with pointer chart selection, summary and table disclosure; preserve existing item-card contracts.
- [x] Run targeted4device browser and axe tests; inspect screenshots.

### Task 3: Review and verification
Files: docs/decision-log.md, docs/project-memory.md, docs/MEMORY_PRICE_DETAIL_2026-11-09.md.
- [x] Independent read-only review of complete diff and calculations, resolve concrete findings.
- [ ] Run qa:prepush and relevant existing mobile QA; record exact evidence and limits.
- [ ] Commit reviewable feature branch. Integrate or deploy only within authorized scope and verified gates.
