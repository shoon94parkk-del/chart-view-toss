# Single question comparison prototype

Updated: 2026-09-30. Local only; no deployment or LLM.

Run `npm run dev:research` and open `http://127.0.0.1:5180/#detail/005930.KS`.
Select **내 질문**, type a question and press **비교 분석하기**.

The feature is labeled **DART 공시 비교**. Guidance before the input lists supported
revenue/profit/margin/growth comparison and excludes forecasts, price targets and
causal interpretation. Tappable examples fill the input only; the user explicitly
starts comparison or saves the question. Example selection clears any prior result.

- “요즘 실적 어때?” compares revenue, operating profit and margin against the prior comparable report period.
- “매출이 늘었나?” prioritizes revenue; “영업이익은 어때?” prioritizes profit and margin.
- “하이닉스와 비교해줘” recognizes a named listed company and compares both reports. Current screen stock stays fixed. Supports one domestic peer.
- “하이닉스랑 매출 및 영업이익 증가율 비교” shows both companies' growth rates and their percentage-point differences first. Company names/codes are shown above the table.
- Overlapping names use the longest match: 하이닉스 does not also match 이닉스. Separately named companies remain distinct; multiple peers prompt for a target selection.
- Keywords select a predefined report view. Free-form causal questions, production/sales-volume relations, forecasts and price judgments are not answered by an LLM. Scope limits are displayed with the result.

Matching cumulative interim periods are preferred. If interim periods differ, use
the latest shared annual year. Never mix annual and interim values. Cross-company
comparisons require matching statement basis and currency. Missing data stays
unavailable; zero or negative bases do not produce growth percentages. Margin is
operating profit / revenue * 100. The original DART filing and arithmetic basis are
displayed. Retrieval failure preserves the question and offers retry.

The module is lazy-loaded and independent of price/chart loading. Existing detail
routes/back handling are preserved. The dedicated localhost Vite config proxies
the existing API, without changing production config or backend CORS.

Question text is processed locally and is never sent to API, analytics or LLM.
Only stock codes are used for existing financial-history requests. Question save
uses RESEARCH_KEY with native account scoping and browser localStorage. Existing
support/challenge/date notes are preserved and readable under a collapsed section.
The revisit date remains a memo without notifications. Save failures retain input.
The existing native asynchronous storage failure notification remains in place.

Validation: 97 tests, production build and 320/390/430px browser flow QA passed.
Coverage includes broad input, named peer, missing figures, shared periods/basis,
provider failure/retry, escaped HTML, saving/reload, stock isolation and storage
failures. Real Samsung DART comparison was verified in the local browser. Native
Android/iOS and deployment were not performed.
