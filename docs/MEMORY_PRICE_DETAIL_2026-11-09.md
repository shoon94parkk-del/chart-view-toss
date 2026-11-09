# 반도체 가격 상세 개선

Project: `github:shoon94parkk-del/chart-view-toss` · baseline `ae26ffe9587938b952dc04726c606d364195c6b3` · branch `feat/memory-price-detail-20261109`.

사용자 요청은 반도체 가격 그래프와 누적 가격, 품목별 정보를 더 자세히 보는 것이다. 기존 독립 화면 안에 선택 품목 상세를 추가했다. 1개월/3개월/전체, USD/시작값100, 실제 관측일의 터치·마우스·키보드 탐색, 기간 변화·관측 평균·최고/최저·관측 수, 날짜별 가격과 직전 관측 대비 표, 공개/세션 고저가·공급자 게시 시각·원문을 제공한다. 작은 품목 카드는 유지한다.

## 데이터 기준

2026-11-09 공개 API를 읽기 전용 점검했다.5개 가격군15품목, 전역20개 날짜지만 품목별 이력은 다르다. DRAM17일(10/02–11/09), NAND/모듈6일(09/21–11/02), GDDR1일(09/21)이다. 이 숫자는 점검 당시 관측이며 앱에 상수로 넣지 않았다.

가격군별 공급자 기준일을 사용한다. 현재 단위USD를 유지하고 원문 사양의Gb/GB를 바꾸지 않는다. 기록은 평균가만 있으므로 과거 고저가·누락 날짜를 만들지 않는다. 공개 고저가의 원본 필드는 일부 가격군에서 주간 범위다. 공급자 변동률, 기간 시작 대비 변화와 직전 관측 대비 변화는 별개다.0인 분모는 계산 불가, 관측값1개는 추세 부족으로 표시한다.

GDDR는 API에서 오래된 bootstrap 확인값을 제공한다. 원문 내부 공백과 backend의 정확한 문자열 비교에 의한 수집 누락 가능성을 발견했으며 별도 백엔드 후속으로 남긴다. 이 작업은 공유 backend/API/수집 데이터를 바꾸지 않았다.

## 검증 기록

- Baseline: `npm test`,952passed/0failed.
- Model TDD: behavioral RED1passed/14failed → GREEN15/15. Coordinator reran model+existing DRAM tests20/20.
- UI TDD: detail absent on baseline; new actual-history browser test failed before implementation. Independent review reproduced the middle-zero predecessor display defect; new regression failed before the fix.
- Independent read-only review: model/date/source/lifecycle/focus contracts checked. Corrected previous-zero wording and mobile SVG transformed font size; added touch chart and12px geometry assertions.
- Initial targeted run used invalid native OpenAI Sans WOFF2 selection, causing invisible glyphs and scheduling timeouts. Preserved diagnostic log under `artifacts/memory-detail/invalid-font`. As documented in the prior performance audit, excluded `/usr/share/fonts/openai-sans/*.woff2` through a scratch-only FONTCONFIG_FILE; app fonts and test assertions were unchanged.
- This executor has a2CPU quota. The3worker targeted run completed27/40; three320px cases hit resource scheduling timeouts, and all10WebKit cases could not launch because native libraries were absent. The three unchanged320px cases passed in isolation3/3 in9.9s. No application assertion/timeout was relaxed.
- With no sudo/system installer available, downloaded required Debian packages from the executor's configured official snapshot into scratch, extracted them into the user-owned browser `sys/lib` directories. Browser launch and actual iPhone expanded-detail/axe test passed1/1. `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` bypasses only the root `ldconfig` inventory check, which cannot discover these user-space libraries; actual WebKit and all assertions still run. Final prepush uses existing `CI=1` two-worker configuration and blocks flaky retry passes.
- Final targeted run: existing memory accessibility/keyboard/API-integration/missing-zero/retry plus5new detail scenarios, all4projects,40/40passed in2.2min with no retries/flaky/skips. This used1worker to fit the executor's2CPU quota and kept all existing assertions/timeouts. Actual iPhone WebKit ran, rather than being skipped.
- Existing `tests/mobile_continuity_qa.mjs` passed at320/390/430px, preserving compact cards, menu identity, source readability and touch targets.
- Captured-live browser check: all15actual public API products matched their rendered price and normalized observation count at390px;0page errors/overflow. DRAM/GDDR screenshots and response report are in ignored `artifacts/memory-detail/live-*`. Only memory prices use the captured live response; unrelated startup requests use existing deterministic fixtures. This is a captured-response UI check, not a new provider collection or a live native Toss test.

### Full local gate diagnostic

`CI=1 FONTCONFIG_FILE=<scratch native fonts> PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 VITE_CHARTVIEW_STATIC_DATA_BASE='' npm run qa:prepush` passed967Node tests, production build and31direct-entry routes. The full1380case browser run was interrupted after337passed because the existing unrelated `research-workflow-a11y.spec.mjs` five-screen axe/screenshot journey timed out twice at33.8s/37s under this2CPU executor (1040cases did not run). This is not a full local gate PASS.

The preserved original trace reaches the fifth Detail screenshot at29.418s and completes it at31.153s; final accessibility/overflow and fatal-JS/unexpected-request assertions passed. Product changes are confined to memory modules, which these research routes do not load. The unchanged research test passed in isolation with1worker in18.8s. No source/test assertions/timeouts/workflows were relaxed. Keep the existing full4device CI gate on the exact draft-PR commit; do not merge/promote based on the partial local run. Final CI status belongs to the PR checks for that exact commit.

## Release boundary

Local/browser checks and a reviewable GitHub change are separate from production deployment. Real Android/iOS Apps in Toss Sandbox/QR validation remains a release gate. No new services, paid resources, provider purchases or LLM calls.
