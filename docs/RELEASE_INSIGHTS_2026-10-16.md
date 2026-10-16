# REA 조사 후 자료 읽기·재방문 개선 — 0.16.0

사용자가 승인한 [AFTERNS/REA 분석 보고서](evidence/release-insights-20261016/rea/REPORT.md)의 여섯 제안과 DRAM 오류 수정을 기존 구조 안에 적용한다. 홈·관심종목·연구·비교 기능을 중복 개발하지 않는다. 프런트 기준은 최신 main02cb311 및 PR134/head1dd69이며 기존 PR134의 최근 본5개, 관심 정렬 복원, 저장 상태, 상세 복귀 개선을 조상으로 보존한다. 백엔드는 [통합 PR153](https://github.com/shoon94parkk-del/chart_View/pull/153)이며 기존 DRAM PR152를 포함한다.

## 사용자 경험과 파일

| 변경 | 파일 | 사용자가 확인할 수 있는 동작 |
| --- | --- | --- |
| 홈의 자료 비교 | `publicationJournal.js`, `homeBriefingBootstrap.js`, `homeChangesView.js`, `homeBriefing.css`, `homeExtras.js`, `storage.js` | 기존 카드와 호출을 유지하고 최초 기준·같은 자료·새 기준기간·표시값 변경·이전 자료를 구분한다. 공시/뉴스 신규 수집 기능을 만들지 않는다. |
| 미국 물가4종 | `macroInflationModel.js`, `macroInflationView.js`, `macroInflationView.css`, `main.js` | CPI·근원 CPI·PPI·근원 PPI, 전년/전월,1/3/5년과 접근 가능한 월별 표. 결측 구간은 끊고 기존 경제지표16개는 그대로 표시한다. |
| 검증된 발표 일정 | 위 물가 뷰, `earningsEventView.js`, `api.js`, `analysisViews.js` | BLS 예정일의 한국/원문 시간대, 선택 회사의 확인된 공식 콘퍼런스콜. 일정 실패 시 기존 추정치는 유지하며 일정만 재시도한다. |
| 조사 이어가기 | `releaseReading.js`, `financialHistoryView.js`, `main.js` | 실제 재무자료 표시 후 기존 연구 폼으로 이동한다. 작성 질문·비교회사·저장 상태와 API 요청을 유지한다. |
| 자료 기준 | `releaseReading.js`, `releaseReading.css`, `exportMomentumView.js`, `analysisViews.js` | 관측기간·공식 발표·수집·자료 생성·확인·수정 여부를 구분한다. 제공되지 않은 시각은 임의 생성하지 않는다. |
| 기기 기록 안내 | `public/privacy.html` | 홈의 공개 자료 비교 기록 최대12개, 계정별 기기 보관, 서버/분석 미전송, 초기화에 포함됨을 안내한다. |

새 물가/일정은 기존 요청의 정적 캐시 필드이며 Home snapshot에는 그래프 이력을 포함하지 않는다. 기업 콜 API는 실적 전망 화면에서만 지연 조회하고 전체 공개 캐시에서 선택 종목을 클라이언트에서 거른다. 선택 목록을 추가 전송하지 않는다. 정기 수집의 FRED/BLS HTML 접근 제한은 [공식 BLS API·ICS 보완 PR154](https://github.com/shoon94parkk-del/chart_View/pull/154)에서 처리한다. 지수는 실패한 쌍만 단일 공식 BLS 배치로 확인하고, 일정은 실제 확인한 행과 이전 확인행을 구분해 보존한다. 제공자 실패를 최신 확인으로 꾸미지 않는다.

새 분석 SDK·이벤트를 추가하지 않으며 기존 실제 검색/저장/조회 성공 이벤트와 중복 전송 방지는 그대로다. 핵심 전환은 기존 `watchlist_add_success`이고 웹 미리보기의 SDK 미전송 규칙도 유지한다. 자발적 후기 안내/거절·반복 제한과 기존 면책은 유지한다.

## 데이터의 의미

FRED/BLS의 공식 NSA 지수로 전년 동월비, SA 지수로 전월비를 정확히 같은 월과 비교한다. 저장 지수로 계산하므로 공식 보도자료의 반올림 값과 차이가 있을 수 있다. 2025-10 CPI 지수 누락과 이어지는 전월비 누락을 실제 공백으로 남긴다. 근원 PPI는 식품·에너지 제외이며 무역서비스까지 제외한 지표로 부르지 않는다. 전체 과거 시계열은 최신 관측치 기준이며 불변 과거 빈티지가 아니다.

공식 일정은 미래 예상 날짜와 확정 실적 발표 시각을 혼동하지 않는다. 현재 확인된 삼성전자10/29 10:00KST와 애플11/3 07:00KST는 콘퍼런스콜 시작이다. 공식 확인이 없는 회사에는 날짜를 추정해 표시하지 않는다. 매일 수집·최대7일 확인 유효기간을 사용한다.

여섯 제안 중 과거 예상/실제/주가 반응 비교는 선행조건을 확인한 결과 제공하지 않는다. 발표 전 저장시점이 고정된 예상치, 같은 회계기간·회계기준, 실제 발표시각과 거래일 종가가 없어 현재 Yahoo 추정치로 과거 서프라이즈를 만들 수 없다. 화면에 이 제한을 밝히며 허위 통계를 채우지 않는다.

DRAM은 백엔드에서 중복 HSK 전월 분모를 교정한다. 같은 수출액15.7331→16.777십억 달러는 -46.7%가 아닌 +6.6%다. Flash/MCP도 같은 원인이며 프런트 보정식은 추가하지 않는다. 상세 내용은 백엔드 PR153과 `docs/DRAM_MOM_AUDIT_2026-10-16.md`에 있다. 1~10일 잠정치는 기존 독립 API와 기준기간·빈값·복구 표시를 유지한다.

## 검증과 재현

- Node577개·Vite/직접 진입27경로 빌드 통과. 최초 통합의 CSS 직접 Node import/VM helper 오류를 수정했고 실패 로그를 보존했다. 기존 테스트를 삭제하거나 약화하지 않았다. 홈 비교 상태·기준기간의 보이는 텍스트와 ARIA 이름 구분자가 달라 기존 접근성 검사가 실패한 것은 실제 UI 결함으로 수정했다. 최초 E2E의 연구 저장 상태 기대는 비교회사 선택 전 상태를 잘못 가정한 테스트 오류였으며, CTA 전후 실제 상태 완전 일치로 바로잡았다. [실패 원본 기록](evidence/release-insights-20261016/failure-history/).
- 백엔드 Python815·Node52와 두 생성 번들 최신성 통과. 공급자 없이 선택 API를 읽고 Home payload 원형을 보존하는 회귀 테스트 포함.
- 신규 E2E: API→물가4종/결측/기준/일정/재시도, 공식 콜 분리·실패 복구·화면이탈, 연구 상태 유지, DRAM MoM/수출액 막대 일치. 320/390/430px 터치44px·가로 넘침 및 접근성 검증 포함.
- 기존 PICK/거장/LAB 관련34개 백엔드 파일·14개 프런트 파일 변경0. 공통 `homeExtras`는 홈 브리핑 제목·lazy import 두 줄 외 완전 동일. [해시 비교 결과](evidence/release-insights-20261016/protected-files.json). 기존 회귀 테스트도 유지한다.
- 독립 코드 검토의 잘못된 일정 타입 예외와 혼합 문자를 수정했고 미해결 Critical/High 없음.
- 로컬 전체 E2E904개를 실행했고2CPU 환경의4worker 영상 기록 부하에서896통과/8실패였다. 8개는 전체 흐름30초 제한, 의도된8초 API기한 초과에 따른 기존값 복구, 재렌더 중 DOM 이탈이었다. 동일 코드·타임아웃·데이터·검증식을 단독1worker로 다시 실행해8개 모두 통과했고 `qa:prepush -- -- --last-failed --workers=1` 종료0이다. 테스트나 시세·저장·PICK 로직은 바꾸지 않았다. 이를 단일 전체실행904/904 성공으로 바꾸어 기록하지 않는다. 독립 GitHub CI의 전체904개 결과와 최종 배포는 PR 댓글에 기록한다. 별도 Mobile release QA와 운영 Live backend contract smoke는 통과했다. 새 AIT 빌드도 성공했다(10475438bytes, SHA256 `719a0359c916a3afbaed789a788f48796e0a9747ae9df65ec874965d275d716d`, 2026-10-16 03:07UTC). 기존 AIT를 별도 보존한 뒤 빌드했으며 공개 콘솔 제출은 실행하지 않았다. 실제 Toss Sandbox는 별도 미검증이다.

```sh
npm ci
npx playwright install --with-deps chromium webkit
npm run qa:prepush
node tests/mobile_release_qa.mjs
node tests/live_api_contract.mjs
npm run build:ait
```

## 같은 조건의 성능 비교

운영 API 속도와 구분한 로컬390px Chromium 측정이다. PR134의 정확한1dd69 소스457개 검증, 각 화면 워밍업 제외7개 성공 표본, 고정 응답·80ms 요청지연을 양쪽에 똑같이 적용했다. p50/최대만 보고하며 작은 표본으로 p95나 운영 SLA를 주장하지 않는다.

| 유효 콘텐츠 | 전 중앙값/최대 | 후 중앙값/최대 | 초기 API 수 |
| --- | ---: | ---: | ---: |
| 홈 시세 |132/141ms|133/214ms|9→9|
| 종목 상세 현재가 |276/331ms|280/370ms|10→10|
| 기존 경제지표16개 |201/238ms|220/248ms|2→2|

신규 물가 그래프269/305ms. main JS gzip108615→108943B(+328B). 시세 제공자/API/캐시를 변경하지 않았으므로 시세가 빨라졌다고 주장하지 않는다. 두 빌드 모두 새 macro payload를 받아 UI 비용을 분리했고 Home 응답은 동일하다. 모든 측정 성공, JS/미정의 요청/가로누출0. [측정 원본과 보고서](evidence/release-insights-20261016/performance/REPORT.md), [독립 재현 harness](evidence/release-insights-20261016/performance/portable/README.md).

## 토스·운영 경계

새 콘솔 설정·SDK 메서드·리뷰 딥링크·유료 인프라·알림 요구를 추가하지 않았다. 공식 물가/일정 원문만 사용하고 AFTERNS 데이터나 투자전략을 복사하지 않는다. PICK 선정·기록·점수·상태·성과·API/노출 조건 및 LAB 핵심을 그대로 유지한다. PICK의 추천형 금융 서비스 정책 범위, 데이터 재배포 권리, 기존 콘솔 scheme과 실제 Android/iOS Sandbox는 `P0_RELEASE_GATE.md`의 별도 확인 항목이다. 브라우저·AIT 빌드와 Render 배포를 Toss 공개 출시 승인으로 부르지 않는다. 추천·부스팅은 실제 지표와 토스의 판단에 달려 있다.

운영 배포는 정확한 검증 main과 기존 QA→`feat/apps-in-toss-mvp` 승격을 사용한다. `/health` SHA, 실제 자산 해시, 같은 HSK·기준월 수출값 및 공식 자료/원문/모바일 화면을 최종 PR 댓글에 기록한다. AIT는 새로 빌드하고 SHA256을 기록하며 콘솔 공개 제출은 하지 않는다.
