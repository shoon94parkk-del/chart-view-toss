# 기업 공부 — Investment Learning

Classification: new behavior. Authorized by the user's detailed November 1 request, including autonomous technical choices, additive shared-backend work, implementation, tests and deployment within available permissions. Existing research notes are not migrated.

## Existing system and decision

- Client: `shoon94parkk-del/chart-view-toss`, vanilla JavaScript/Vite, Toss SDK 3.5.0, four primary tabs; base `a816278e2465deaa2c4bfaf00bb12e0e1bb18ddd`.
- Shared API: `shoon94parkk-del/chart_View`, FastAPI/psycopg; base `ca935dc03a2845f76fc5737aaae12713166c84fc`. Its separate web UI is preserved.
- Existing device-local stores cannot meet cross-browser retention. The existing guessable watchlist sync ID is inappropriate for private investment notes. Production `/api/profile-sync/status` reports unconfigured.
- Chosen architecture: a lazy 기업 공부 screen plus a separate authenticated FastAPI router and PostgreSQL tables. No frontend framework replacement or LLM dependency. Explicit SQLite path is supported only for local verification; Render must refuse ephemeral SQLite.
- Alternatives considered by the implementer: browser-only storage fails the retention requirement; a separate app duplicates navigation and breaks existing stock context. The integrated backend approach satisfies both.

## Product

An account starts empty. No fabricated streak, score, quiz submission or completion. Dates and daily streak use Asia/Seoul. Initial curriculum has 42 days starting Monday 2026-11-02 and the 18 companies in the user request. Monday–Wednesday company study, Thursday value chain, Friday comparison, Saturday macro scenario, Sunday review. Weeks and companies are editable and extendable without changing historical lessons.

| Week | Industry | Monday | Tuesday | Wednesday |
|---|---|---|---|---|
| 1 | 화장품 | 에이피알 278470.KS | 코스맥스 192820.KS | 한국콜마 161890.KS |
| 2 | K-푸드 | 삼양식품 003230.KS | 농심 004370.KS | CJ제일제당 097950.KS |
| 3 | 조선·LNG | 한화오션 042660.KS | 삼성중공업 010140.KS | HD한국조선해양 009540.KS |
| 4 | 방산 | 한화에어로스페이스 012450.KS | LIG넥스원 079550.KS | 현대로템 064350.KS |
| 5 | 원전 | 두산에너빌리티 034020.KS | 현대건설 000720.KS | 한전KPS 051600.KS |
| 6 | 전력기기 | HD현대일렉트릭 267260.KS | LS ELECTRIC 010120.KS | 산일전기 062040.KS |

Dashboard: today's lesson (or next scheduled lesson before start), explicit state, days/streak/companies/quiz total/average understanding, recent studies, wrong-answer/due reviews, weekly/monthly trends and per-industry strengths with sample counts. A 25-minute lesson offers reading prompts, official evidence links, in-app notes, questions and assessment.

Notes include business/products, customers/competitors, revenue/profit/margins and source period, growth/risks, macro sensitivity, new facts, unclear concepts, investment judgment and monitoring metrics. Growth reason, greatest risk and must-check metrics are required to mark a study completed. Draft save remains possible without them. Every update preserves a server-side revision; dated sessions and attempts are never overwritten by a later study.

Objective quiz evaluates business structure and macro inference. All answers are required; the server grades its pinned lesson definition. Judgment requires actual written reasoning and a separately labelled self-assessed rubric (evidence, logic, indicators, each 0–4), never an invented AI grade. Attempts, wrong answers, weak concepts and reviews are append-only. Due date follows actual submitted score, with poor scores due earlier. Completing notes does not submit a quiz. Saved records are `in_progress`, `completed`, or `evaluated`; absent records are `not_started`. Only a real server-graded attempt on a completed session creates `evaluated`.

Historical insight checks append business assumption, observed result, source URL/date and supported/contradicted/inconclusive outcome against a selected session revision. Price observations are optional context and do not determine reasoning accuracy. The UI compares past/current notes and preserves the original claims.

ChatGPT integration is manual: paste a versioned JSON study record, preview and confirm import. It never reads ChatGPT conversations or scheduled tasks. Imported scores are explicitly external and cannot create native quiz completion. Full JSON export/merge import supports backup. Import validates the entire payload and is atomic. No stored authentication secrets in exports.

## Security and persistence

Server-generated high entropy recovery key (256 bits) creates/recovers an account. It is shown once and the user must acknowledge saving it. Recovery is possession based; there is no email/password recovery. Hash recovery keys and bearer session tokens at rest. Sessions expire and logout revokes them. Client stores a session token only in the existing account-scoped storage; never put secrets in URLs, analytics, share text or exports. Existing local-data reset clears the device session, not cloud records; cloud-account deletion is a separate explicit action.

Account documents are stored in dedicated PostgreSQL tables, with transactional row locks, optimistic `version` checks and idempotent mutation `requestId`s. A stale save returns 409 and retains the UI draft. A timeout never claims success or silently retries a non-idempotent mutation. Private responses use no-store; no public cache/CDN. Unconfigured storage returns 503 and a setup message; it must never report a browser-only save as durable cloud persistence. Startup of existing market APIs must not depend on database readiness.

## Shared API contract (binding interface for workers)

Prefix `/api/learning`. JSON camelCase. Bearer authentication on everything except status, catalog, account creation and auth.

`GET /status` -> `{configured:boolean, storage:"postgres"|"sqlite"|null}`. Local sqlite reports sqlite; production only postgres.

`GET /catalog` -> `{schemaVersion:1,curriculum:Curriculum,companies:Company[]}`. `Company={symbol,name,industry}` with Yahoo Korean `.KS`/`.KQ` tickers.

`POST /accounts {}` -> `{accountId,token,recoveryKey,expiresAt}`. `POST /auth {recoveryKey}` -> `{accountId,token,expiresAt}`. `DELETE /auth` revokes current session. `DELETE /account` deletes authenticated account and cloud records, requires `{confirmation:"DELETE"}`.

`GET /workspace` -> `Workspace`. `GET /lessons/{YYYY-MM-DD}?symbol=...` -> `Lesson`. The optional symbol creates company study for a known catalog company or a validated custom identity supplied on save; curriculum days otherwise select the daily lesson. `GET /lessons/{date}` outside curriculum returns no lesson (404), not a fake scheduled day.

`Workspace={schemaVersion:1,version:number,curriculum:Curriculum,sessions:Session[],attempts:Attempt[],reviews:Review[],validations:Validation[],revisions:Revision[],imports:object[]}`.

`Curriculum={id,title,startDate,weeks:[{id,industry,companies:Company[]}]}`. Each week requires exactly three companies; any number of weeks up to 104. Dates are real calendar dates and start on Monday.

`Lesson={id,date,kind:"company"|"value_chain"|"comparison"|"scenario"|"review",title,industry,companies:Company[],duration:25,sections:[{title,minutes,body,prompts:string[]}],sources:[{title,url}],questions:[{id,dimension:"business"|"inference",prompt,options:string[]}],judgmentPrompt,quizVersion}`. Never expose correct answers before submission. Saved sessions pin lesson/quiz definitions independently of later curriculum edits.

`Session={id,lessonDate,lessonId,lesson:Lesson,company:Company|null,symbols:string[],industry,topic,status,notes:Notes,insight:{growth,risk,metrics},understanding:number|null,minutes:number,completedAt:string|null,createdAt,updatedAt,revision:number,nextReviewDate:string|null,sourceContext:object|null}`.

`Notes={business,customers,financials,growthDrivers,macro,newFacts,unknowns,judgment,indicators}`: all string fields (empty allowed in drafts), max 20000 chars each. `understanding` is optional 0–100 self-report, not quiz grade. `minutes` is 0–240, not a timer-derived assertion. `sourceContext` allowlists `{kind,symbol,name,date,key,reason}` and excludes private existing research notes.

All mutations below require UUID `requestId` and integer `expectedVersion`, and return `{workspace:Workspace,sessionId?:string,requestVersion?:number}`. Repeating a successful requestId returns the current workspace with the original entity and mutation receipt version, without reapplying the mutation; no duplicate attempt or revision. Receipts store only that small metadata, not a growing workspace copy. Version conflict returns 409; validate before writing.

`POST /sessions {requestId,expectedVersion,session:{id?:UUID,lessonDate,company?:Company,topic?:string,notes:Notes,insight:{growth,risk,metrics},understanding,minutes,sourceContext?},complete:boolean}` saves or revises a session. Server assigns id on creation, pins lesson, preserves completion/attempts and revisions. Reopening/completing a historical session never deletes prior attempts. Editing an evaluated note retains its actual attempt history but shows revision mismatch until another evaluation (status completed).

`POST /sessions/{id}/quiz {requestId,expectedVersion,answers:{[questionId]:zeroBasedOptionIndex},judgment:{answer:string,rubric:{evidence:0..4,logic:0..4,indicators:0..4}}}`. `/sessions/{id}/reviews` accepts the same input and records a new quiz attempt plus review. Require a completed study and all questions plus judgment/rubric. `Attempt={id,sessionId,sessionRevision,submittedAt,score:0..100,dimensions:{business,inference},answers,wrongAnswers:[{questionId,prompt,chosen,expected,explanation,concept}],judgment:{answer,rubric,score:0..100,assessment:"self"},isReview:boolean}`. Reviews record `{id,sessionId,attemptId,date,score,nextReviewDate}`.

`POST /sessions/{id}/validations {requestId,expectedVersion,revision:number,assumption:string,observed:string,evidenceUrl:string,evidenceDate:YYYY-MM-DD,outcome:"supported"|"contradicted"|"inconclusive",currentJudgment:string,priceContext?:string}` appends Validation with id/sessionId/createdAt. Require real business evidence and safe HTTPS source.

`PUT /curriculum {requestId,expectedVersion,curriculum:Curriculum}` updates future/current schedule only. `GET /export` -> `{format:"chartview-learning-backup",schemaVersion:1,exportedAt,workspace:Workspace}`. `POST /import {requestId,expectedVersion,payload:object}` accepts either this backup (merge; reject collisions with differing IDs/data) or `{format:"chartview-learning-result",schemaVersion:1,session:{...same editable fields},externalAssessment?:{score,notes}}`. Imported records remain draft/completed (validated required insights); external scores are labelled and cannot certify a native evaluation. Native attempts restored from another exported file are preserved as imported history, not asserted as newly submitted attempts. Never wholesale replace live account data.

## Client integration

Route `#learning`/`/learning/`, optional company `#learning/company/{symbol}` and session `#learning/session/{UUID}`. Four bottom tabs unchanged, Analysis selected. Home compact entry makes no learning network request. More has 기업 공부. Existing stock detail, watch, screener and PICK expose small learning history/status links; lazy authenticated summaries may load independently and fail locally. A company route lists all dated records and creates a fresh dated study; it must not overwrite prior study. Known attractive/PICK/watch candidates without learning show as study candidates, with no new buy recommendation or fabricated grade.

Keep all notes/keys out of generic sharing and screen analytics; generic learning route only. Device account switching must invalidate pending requests and stored credentials. Update privacy and Info for explicit new cloud scope, recovery and deletion.

## Verification and completion evidence

Tests cover KST dates/42-day boundary/18 correct identities, true missing vs zero, exact status transitions, incomplete quiz rejection, server scores, append-only attempts/revisions, idempotency, concurrent version conflict, cross-account isolation, restore provenance and rollback on malformed import. Test both local adapter and real Postgres semantics. Browser tests cover full study/save/reload/edit/quiz/wrong-answer review/insight verification/import/export/company links, failures retaining draft and mobile geometry. Run the existing complete qa:prepush and relevant mobile QA/AIT build. Deploy only tested main revisions using existing GitHub→Render promotion, verify exact /health/asset revision and persisted pre-deploy record after restart. Report unconfigured infrastructure or native-device gates honestly.
