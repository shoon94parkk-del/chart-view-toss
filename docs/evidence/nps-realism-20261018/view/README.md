# Frontend realism evidence

- Project: `github:shoon94parkk-del/chart-view-toss`
- Base SHA: `c8f65604993a59866f8757817c4fb384183f3f7a`
- Tested state: uncommitted assigned view/CSS/browser tests plus coordinator-owned model and fixture changes, 2026-10-19 UTC.
- Scope: compact published summary, cash/source bridge and NAV assumptions inside disclosures, conditional sensitivity disclosure, optional alternative economic proxy/internal-trade scenario controls, monthly-disclosure status.
- Runtime: Node 24, pinned repository Playwright 1.55; desktop Chromium, 320px Chromium, Pixel 5 Chromium, iPhone SE WebKit. Linux font selection uses `/tmp/chartview-fonts-system.conf` (Liberation Sans with system CJK fallback). User-local WebKit libraries require `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`; actual browser and assertions run, no tests/rules skipped.
- Deterministic fixture: `tests/fixtures/nps/summary-realism.json`, derived from the verified provider publication at `2026-10-16` market close; served through existing HTTP fixture interception. This is a fixture browser run, not a live production or native Toss device test.

Isolated build and preview avoid shared coordinator output: `npx vite build --outDir /tmp/nps-realism-view-dist`; `npx vite preview --host 127.0.0.1 --port 4185 --strictPort --outDir /tmp/nps-realism-view-dist`. All Playwright commands set `E2E_BASE_URL=http://127.0.0.1:4185 FONTCONFIG_FILE=/tmp/chartview-fonts-system.conf PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`, use `--reporter=list` and individual `/tmp/nps-realism-view-*` output directories.

- `browser-red.txt`: original view successfully loaded valid v2 summary; new appraisal-basis selector absent as expected.
- `proxy-refresh-red.txt`: valid same-price metadata changed the economic proxy, but a checked scenario still displayed old 23.10% instead of recalculated 22.92%. Updated scenario now follows the new published proxy while retaining manually entered values and focus.
- `browser-legacy.txt`: existing 36 NPS browser cases passed (38.5s), using legacy v1 fixture, including holdings lazy fetch, failures, freshness, same-version SEC warnings, navigation and accessibility.
- `browser-green.txt`: final 24/24 realism browser cases passed (33.5s), including API → model → point/gap/adjustment, base/interest/carry/flow bridge, recalculated assumption cases, NAV uncertainty, user-only economic mark, monthly status, new-proxy refresh, focus, axe and geometry.

Screenshots/traces/videos from browser execution remain under `/tmp/nps-realism-view-final` (ephemeral); full CI and deployment gates are coordinator-owned. No Git commit, push, shared full QA or external deployment was performed by this implementation role.
