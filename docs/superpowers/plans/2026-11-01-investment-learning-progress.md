# Investment Learning execution ledger

User authorized autonomous implementation and permitted existing GitHub/Render integration. Render workspace confirmed: Chart View (`tea-dao48j942hec738cpseg`).

- Frontend baseline: `a816278e2465deaa2c4bfaf00bb12e0e1bb18ddd`; branch `feat/investment-learning`; 894 existing Node tests passed.
- Backend baseline: `ca935dc03a2845f76fc5737aaae12713166c84fc`; branch `feat/investment-learning`; 1207 existing pytest tests plus 43 subtests passed.
- New behavior. Existing local research remains local. No dependency/framework replacement.
- Frontend and backend recon complete, source findings incorporated in design.
- Task 1 complete: learning_content.py and61tests; independent custom-industry validation fixes verified.
- Task 2 complete:120 focused actual PostgreSQL/SQLite/content tests and final1327 Python+43subtests; existing52Node and bundle parity pass. Backend PR169 merged to61dcafd2b4a773b120244a5f86504fac206711e6 and Render deploy dep-dbjl09qvcj2c73f3ivh0 live. HTTP health revision/catalog18+6weeks/status false/401/no-store/unconfigured503/legacy200 verified.
- Task 3 complete:31 focused learning tests, final929 Node green; independent UI probes cross-account/expired auth/draft round-trip/ambiguous receipt recovery all pass.
- Task 4 root: route/storage/privacy/Home/More/stock integration, in progress. learning_browser_tests owns two new browser-fixture/spec files.
- Runtime helper complete: rootless PostgreSQL17 on localhost55432 and Chromium/WebKit with CJK rendering. Activate `/workspace/scratch/runtime/activate.sh` before browser commands. Local runtime and database are test infrastructure, not production persistence.
- Current Render Toss static site `srv-dao4n4mk1f9s73algnf0` auto deploys `feat/apps-in-toss-mvp`; shared Python `srv-dao4a50473hc73bclej0` auto deploys main, Virginia/free.
- Existing profile-sync free PostgreSQL `dpg-daodb0bm8hqs73e89nu0-a` expired October21 and is suspended (billing). User asked whether it was monthly capacity and next month would reset; explained it is the30-day free database lifetime, not monthly quota, and no automatic renewal. No cost approval received; no paid resource created.
- Ruling: use explicit 256-bit recovery possession login rather than short watchlist sync IDs; avoids external identity-provider setup and isolates new private notes.
- Ruling: idempotency receipts contain minimal original entity/receipt version and replay current workspace; avoids quadratic storage expansion.
- Remaining: complete implementation, independent review, required full local and CI QA, database decision/config, exact main integrations/deployments and pre/post-deploy record retention verification. Real Android/iOS Toss Sandbox remains a separate release gate.

- Actual Postgres + production-build browser QA:14checks passed with fresh API+Postgres restart and exact hash/IDs/counts retained; independent320px and iPhoneWebKit recovery/render passed. Reusable tests/learning_postgres_qa.mjs. Artifacts /workspace/scratch/learning-postgres-qa/passed/results.json, testaccountsdeleted.
- Independent API review clean after bounded revision continuity, shared curriculum validator, fresh account schedule restore and pre-body worker-thread authentication fixes.
- First backend CI failure was Ubuntu26.04 unsupported by pinnedPlaywright1.55; supportpin Ubuntu24.04 kept all assertions. NewPRhead7898fe5 passed all7mobile/check/build/actualPG jobs, then merged. Front mandatory browser workflows pinned likewise.
- Front final qa:prepush running exec35401, log /workspace/scratch/chart-learning-prepush-final.log, planned1316 cases (10learning×4 included). No source product changes since build. Separate targeted12passed and stressparallel40run39passed/1iPhonequiztimeout documented; do not claim40green until final stable gate/CI.
- Remaining: full frontend gate, existing mobile QA/AIT build, frontend commit/PR/CI/promotion and exact live asset check. Production learning writes intentionally remain unavailable until user chooses/configures durable DB. Do not provision paid storage without approval.

- Local full qa:prepush completed Node929/build/31routes green, browsers1314passed/2failed in30m. Both failures are old iPhone PICK setup assertions at pick-loading-recovery.spec.mjs:29 (savedY minus pendingmax=-14, expectation>1), before behavior assertions. New collapsed learning footer adds pageheight. Independent UI reviewer is proving geometry and a setup adjustment which retains unreachabletarget/1pxrestore/usercancellation assertions. All40newlearning cases passed in this full run, including iPhone quiz14.9s. Do not report local full green.
- Backend followupPR170 pins the separately triggered production-audit workflow toUbuntu24.04 after its post-merge dependency install failed on26.04. Appcodeunchanged; currenthead962ac0a.

- PICK geometry diagnosis confirmed: collapsed learning footer adds66px; oldsaved655/pendingmax669 means-14 gap. Hiding onlyfooter diagnostic restores+52 gap andengine error0. Bounded dynamic pre-clickscroll retainsbutton inusableviewport andrestoresunreachableprecondition. Root targeted8/8all4browsers pass17.7s, unchanged<=1px/cancel assertions. Productionappsourceunchanged bythisfixturefix; finalwholeCIwillrunexactfinalharnessbeforemerge. Firstlocalfullresultremains1314+2, notgreen.
- Existingmobile_continuity_qa passes320/390/430px. Approvedaudit currentlyrunning64201; AIT/webbuild andpushremaining.
- BackendPR170merged c1a1fcd70fe03e525abd6100ae06af1680f69d8a; appcodeidenticalto61dc, automaticproductionverifier24.04pin.

- Approvedaudit64201passes320/390/1440; build:ait79158exit0generatedchartview.ait (notnativepublicrelease). FinalwebbuildrestoresordinaryfixtureAPI/CDNmodeafterAIT. Required productsource is frozen; onlydocs/CI/PICKtestpreparationchangedafterfullrun.

- Backend main c1a1fcd live on dep-dbjl8dlg1s2s73834l1g; final App Regression and Production Mobile Verification both pass. Production storage remains unconfigured awaiting user choice, never a browser-only substitute.
- Front PR151 passed Node929/full browsers1316 and all required checks; merged as8ea2f5c. Main promotion run41320401636 correctly blocked on a new desktop PICK first-attempt66px restoration error (retry passed, failOnFlaky failed). No static deployment of this head occurred.
- Followup fix/learning-pick-layout: first-ready MutationObserver regression with held optional doorway module fails deterministically against old build. Static import of the tiny pure doorway helper and synchronous bindNav mounting reserve collapsed height before terminal restore. Auth client/network stay lazy behind explicit expansion. Rebuilt Node929/build/31routes pass; all48 related PICK/stock-learning/Home-lazy cases across4browsers pass. Existing1px/cancel assertions unchanged. Remaining: independent scoped review, followup PR/full CI/main exact-SHA promotion, final live checks and DB decision.
