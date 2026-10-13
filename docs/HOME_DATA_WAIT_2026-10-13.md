# 2026-10-13 홈 데이터 대기 개선

홈 shell은 먼저 보이지만 지수·관심 시세가 늦는 문제를 다룬다. 이번 변경은 기존 requestClient, liveQuoteStore, Home device snapshot과 백엔드의 기존 갱신 작업을 재사용한다. 캐시 유효기간, 공급자 동시 조회 수, 정상 polling 주기는 늘리지 않는다. 패키지는 0.15.1이다.

## 확인한 지연 경로와 실제 사건의 한계

운영 프런트 `82c7b1132ff101b3793932d1b858036eea0aebfe`, 백엔드 `9824a49e0e8410c35e8bf60880d623f38c4e1f97`를 기준으로 확인했다. 사용자 관찰은 지수 표시까지 약20초였다. [당시 후속 운영 조회](audits/2026-10-13-home-data-wait/incident-observation.json)는 일반 지수 API HTTP200/353ms, 최근 재시작·실패 이벤트0건이었다. 응답 시각만 있는 access log로 그 사용자의 요청 시작·공급자·큐 대기 시간을 식별할 수 없다. 후속 정상 응답은 이전20초를 반박하지 않는다.

확인한 코드는 두 긴 대기 경로를 가진다. HTML의 초기 Home fetch에는 headers와 JSON body를 포함한 전체 deadline이 없었고 모듈 helper가 그 promise를 그대로 기다렸다. 초기 요청 실패 후 별도 일반 요청을 시작해 새 대기 예산도 생겼다. 백엔드 일반 cold 지수 요청은 기본4개가 준비되어도 같은 background pool2에서 보조4개까지 모두 끝나야 응답했다. 공급자별 순차 fallback timeout이 있으므로 한 지표가 오래 걸릴 수 있다. Home의 각 영역은 이미 독립적으로 렌더되므로 새 전체 병렬 렌더 구조를 만들지 않는다.

## 변경한 동작

- 초기3개 Home fetch를 기존 pending/cache에 한 번 인계한다. 원래 시작 시각부터5초 안에 headers와 body 전체를 끝내며 모듈 도착·재시도로 초기 예산을 다시 시작하지 않는다. 초기 실패를 자동 fallback 요청으로 중복하지 않는다. 명시 재시도는 새 작업이다.
- 기존 일반 requestClient timer가 fetch/body adapter의 abort 무시에도 끝나도록 단일 deadline을 사용한다. 기본12초, retry 수, clone, 캐시 크기, caller signal의 격리는 유지한다. 타임아웃 뒤의 값은 캐시에 저장하지 않는다.
- Home 관심 초기 조회에5초 상한을 전달한다. 관심/상세의 일반 helper 기본12초와 기존 fresh5초 경로는 유지한다. `/api/quotes`의 전체 batch 응답 계약은 그대로이므로 모든 관심종목 공급자 완료가 빨라졌다고 주장하지 않는다.
- 일반 cold `/api/market-now`는 같은 갱신 owner에서 기본4개 완료 또는 최대2초까지 기다린 후 실제 확보된 행과 기존 진행 flag를 반환한다. 완료한 지수는 즉시 게시한다. 보조 지표는 같은 작업에서 계속 조회한다. `fresh=true`는8개 전체 완료를 기다린다.
- pending 빈/부분 응답을 완료 TTL 성공 캐시로 남기지 않는다. 서버도 그 응답에 `no-store`, 완료 clock이 없으면 `cacheAgeSec:null`을 사용한다. 전체 batch timestamp는8개가 끝나야 갱신한다.
- 미완료와 확정 실패를 ticker별로 구분한다. 실제 이전 가격·기준일을 유지하며 실패 안내와 재시도를 제공한다. 빈 pending 응답은 사용 가능한 성공값으로 간주하거나 기존 device snapshot을 지우지 않는다.
- 지수 화면·기기 저장도 기존 canonical 최신 관측값으로 처리해 상세에서 받은 최신 가격을 오래된 market 응답으로 되돌리지 않는다. 출처·통화·session·asOf를 보존한다.
- 명시 지수 재시도만 기존 `fresh=true`를 사용한다. 정상 polling URL과6초/12초 cadence는 유지한다. 서버의5초 refresh guard나 진행 중8개 작업 때문에 재시도가 즉시 공급자를 다시 호출하거나5초 내 전체 완료함을 보장하지 않는다.
- 서버는 개인 식별자 없이 고정 `Server-Timing`의 지수 준비 대기/handler 시간을 제공한다. 향후 재발 시 공급자와 HTTP/화면 구간을 분리할 근거다.

## 같은 harness의20초 제어 실험

[전후 JSON](audits/2026-10-13-home-data-wait/controlled-http.json)은 실제 handler/cache 함수를 추출해 외부 공급자 대신 한 항목을20초, 나머지를3ms 지연시키고 동일 HTTP ASGI 호출을 실행한 결과다. 배포 코드와 main.py가 동일한 backend base `71cb721`을 before로 사용했다. 각 실험의 pool2·조회8회는 전후 동일하다.

| 지연 조건 | 첫 HTTP 응답 이전 → 이후 | 이후 표시 가능한 기본 지수 |
|---|---:|---:|
| 보조 VIX 하나20초 | 20,092 → 61ms | 4개 |
| 핵심 KOSPI 하나20초 | 20,069 → 2,003ms | 3개, KOSPI는 진행 상태 |

모든8개가 완료되는 시각은 전후 모두 약20초다. 실제 공급자의 지연을 없앤 결과나 모든 지수2초 SLA, 관찰하지 못한 사용자의20초 원인 확정으로 해석하지 않는다. 빈 경우에도 서버2초 후 진행 상태를 반환하고 Home transport5초 후에는 무한 로딩 대신 재시도 상태를 낸다. 남은 값 표시 시각에는 기존 polling cadence와 네트워크 시간이 추가될 수 있다.

[운영 브라우저 before 요약](audits/2026-10-13-home-data-wait/browser-before-summary.json)은 별도3회 표본이다. 저장 관심3개 cold Home shell 중앙값126ms, 기본4지수864ms, 관심3가격860ms, 관심 갱신 문구 종료1,880ms였다. 정상 warm cache 표본과 강제20초 제어 실험을 섞어 평균 개선율이나 p95를 만들지 않는다. 실제 배포 after는 같은 harness로 별도 확인한다.

## 검증과 공개

집중 Node47/47 및 신규 브라우저8시나리오 ×4프로젝트=32/32이 통과했다. headers/body 지연, 실패와 명시 재시도, 진행 중 빈/부분 응답, 실제 가격·날짜 보존, 상세 최신 지수 → Home 이전 응답 → 저장값의 정합성을 검사한다. 최초 focused browser에서 초기 skeleton을 progress-response 카드로 잘못 기대한4개 검사와 WebKit clock을 과거에 pause한1개 검사는 harness 오류로 수정했다. 앱 조건·가격·날짜 assertion은 유지했다.

독립 최종 검토에서 빈 pending 응답이 이후 확정 실패가 돼도 기존 polling dispatcher가0행을 버리고 listener가 오류 렌더링을 금지하는 문제가 확인됐다. 실제 scheduler Node 및 정상6초 polling →0행 terminal → 재시도 UI 브라우저 검사는 수정 전 실패했고 두 경계를 수정한 뒤 통과했다. Home-live의0행 미전달과 정상 market URL/cadence는 유지한다. 첫 전체 QA 진행 중 발견한 source 변경이므로 최종 전체 QA를 새로 실행한다.

통합 전 Home 수정의 `npm run qa:prepush`는 Node519개·26개 직접 진입 경로 build·E2E816회 전부 통과했다. 관련 기존 analysis/progressive/mobile_continuity/audit_plan/home_journey QA5종도 통과했다. 실패를 숨기는 retry/skip/flaky 통과는 없다. [검증 요약](audits/2026-10-13-home-data-wait/local-qa.json), 공유 백엔드 [PR148](https://github.com/shoon94parkk-del/chart_View/pull/148)와 [검증 기록](https://github.com/shoon94parkk-del/chart_View/blob/3b0cfec877975a383b61a33dd0f56804bd54cfb9/docs/HOME_DATA_WAIT_2026-10-13.md)을 연결한다. 정확한 main CI·Render live revision·실제 API→화면 검증은 후속 공개 기록에 보존한다. Web preview 배포와 실제 Toss Android/iOS Sandbox 승인은 구분한다.

초기 main 자산은317,231→320,742bytes(+1.1%)다. Deadline/인계/상태 보존을 위한 증가이며 번들 감소로 설명하지 않는다. 변경 후 실제 자산은 `index-Cyhr7OH3.js`, SHA-256 `285f79b1f9138d5f6267d0c3db88a3bc8ee46748f8e843239bfbdbd5f8843ba9`다. 운영에서 같은 bytes를 확인한다.

## 다음 개선

다음 우선순위는 전체 히트맵이다. `/heatmap` 직접 진입에서 사용하지 않는 Home market/bootstrap2개 요청이 실제 발생하며, 저장 스냅샷 게시 실패가 workflow 전체 green에 숨은 사례가 있었다. 해당 요청 제거와 스냅샷 게시 상태를 먼저 고치고 기존 실시간 재검증·60종목·기준 시각을 유지한 채 같은 cold/SPA/warm harness로 비교한다. Yahoo/컨센서스 실패 cooldown·공유 큐 대기는 별도 측정 대상으로 남긴다. 이번 Home 변경에 다른 화면 수정이나 새 API/키/유료 인프라를 섞지 않았다.

## 운영 브랜치 변경 보존

작업 중 사용자가 Render 전용 브랜치에 TOP10 히스토리5커밋을 추가해 실제 운영 프런트는 `f60f83c5e0553947e2d695ababba42baae8cb160`으로 바뀌었다. Home [PR132](https://github.com/shoon94parkk-del/chart-view-toss/pull/132)는 전체 QA/PR CI 후 `f84358d`에 병합됐으나, main에 없는 운영 변경을 버리지 않도록 기존 sync ancestry 검사에서 배포가 중단됐다. 해당 배포를 강제로 진행하지 않았다.

`54e7295`에서 운영 브랜치를 충돌 없이 통합했다. 원래 Home main `f84358d` 대비 변경은 사용자 파일4개(main/routes/TOP10 JS/CSS)뿐이다. TOP10 JS/CSS/routes는 운영 f60f83c와 동일하고, Home index/api/homeFastCache/liveHomeSync/requestClient는 f84358d와 동일하다. main.js의 두 변경 경계도 독립 검토했다. TOP10 기능을 재작성하지 않았다.

기존 운영 TOP10 메뉴 → 실제 기록 fixture의 날짜/부분/선정 표시·필터 → Home 시세 유지 왕복을4기기에서 검증했다. 이 보존 검사1개를 추가한 통합본의 전체 QA는205시나리오 ×4=820회로 다시 실행한다. 이전519/816 기록은 통합 전 Home 수정 검증을 의미하며 최종 통합 proof와 구분한다. 통합 main 자산은 `index-C6CUQ9H_.js`/321,359bytes/SHA-256 `de50a88ac8427936ffde18498423c7d01e3a568ebdc36e4613be6a8c44a3a8a8`이다.

백엔드3b0cfec가 이미 운영된 상태에서 f60f83c 프런트를 같은 harness로 다시3회 측정했다(2026-10-13T12:58Z). 저장 관심3개 cold 지수4개375/478/720ms, 관심3가격362/630/738ms였다. 이 후속 before는 프런트 통합 전·백엔드 수정 후 정상 캐시 표본이다. 이전82c/982 관찰이나20초 제어 실험과 섞어 인과 개선율을 만들지 않는다. 통합 배포 이후 같은 설정으로 다시 측정한다.


## 통합 QA에서 발견한 클릭 중 화면 이동

첫 통합 전체 QA는 Node519/build26 통과, E2E819/820이었다. 기존 작은 iPhone의 명시 날짜 PICK 이동 검사가 실패했고 독립8회 재현에서도2회 실패했다. trace와 실제 pointer down/up 좌표를 확인하니 클릭 중 늦은 screener 응답으로 PICK 위의 변화 카드가 갱신되어 CTA가 약80px 이동했고, pointer up은 다른 요소에 도착했다. 테스트에 로딩 wait를 추가하거나 retry 통과를 배포 근거로 사용하지 않았다.

분류는 기존 선택 동작을 방해하는 새로 확인한 화면 갱신 버그다. 가벼운 Home feed pointer 추적을 초기 section 생성에서 설치하고, 변화 영역의 DOM paint만 pointer up/cancel/blur 뒤 click dispatch가 끝난 task로 미룬다. exports/screener 요청·처리·각 source 완료는 계속 독립적이다. 기존 포커스/스크롤 보정, 사용자 TOP10 코드, quote/TTL/polling 계약은 유지한다. 한 document에 listener를 한 번 설치하고, 최신 paint를 host별로 합치며 떠난 host에는 반영하지 않는다. 첫 lazy module 로딩 도중 누른 경우도 초기 추적으로 보호한다.

실제 늦은 screener 응답을 pointer down 사이에 전달하는 브라우저 회귀는 수정 전 실패했다. 수정 후 신규 회귀와 기존 PICK 날짜/필터/부재 키 이동을4프로젝트에서각2회, 총16/16 통과했다. 실제 runtime Node9/9은 클릭 종료 전 응답·cancel·끊어진 host·다른 영역 pointer·재마운트·첫 lazy 진입을 검사한다. 임시 클릭 계측은 제품/test source에 남기지 않았다.

첫 gesture 보호 통합 전체 QA는 Node525/build26/E2E206×4=824 전부 통과했다. 실패·skip·flaky0이며 재시도는0이었다. [통합 검증 요약](audits/2026-10-13-home-data-wait/integrated-qa.json)을 따로 보존한다. 통합 자산은 `index-DYb6qk9a.js`/322,228bytes/SHA-256 `8e283971ccd42ffb2b3c7a34b450867573623c924ca5e2e62ce67c7b6c6ecaa1`이다. 관련 기존 analysis/progressive/mobile_continuity/audit_plan/home_journey QA5종도 전부 통과했다. 정확한 main CI·운영 배포 결과는 후속 공개 기록으로 연결한다.


## 명시 펼치기 계약 유지

첫 gesture 보호 head `fbdd393`의 PR CI는 네 브라우저·Node·AIT·API·audit8검사가 통과했고 기존 모바일 QA1검사가 실패했다. `insight_research_qa.mjs`의 사용자 클릭 직후 변화 카드3개 표시 assertion은2개를 관찰했다. 보호 범위가 명시 펼치기까지 다음 task로 미룬 것이 원인이다. 이 기존 테스트의 조건이나 기다림을 변경하지 않았다.

모든 pointer가 해제되고 이미 click이 dispatch된 명시 펼치기만 즉시 paint한다. 다른 pointer가 여전히 눌려 있거나 데이터 응답만 도착한 경우에는 기존 보류를 유지한다. 즉시 반영한 host의 이전 queued paint도 지운다. 기존 모바일 검사는 변경 없이320/390px 모두 통과했고 실제 runtime Node11/11에 즉시 펼치기·다른 pointer 보호 회귀를 추가했다. 최종 source의 전체 prepush는 Node527/build26/E2E824 전부 통과했다. 실패·skip·flaky0, 재시도0이다. 관련 기존 QA6종(기존5종+insight_research)도 전부 통과했다. 앞선525/824 기록은 첫 gesture 보호 source에 해당한다.

최종 통합 main 자산은 `index-BiploiZa.js`/322,262bytes/SHA-256 `0d2f4aff89a06b336e12d792a5c38e26991a0d91f6d394b00c503e4fb31beb1a`이다. 실제 직전 운영 f60 자산317,848bytes 대비 약1.4% 증가하며 번들 감소로 설명하지 않는다. 정확한 운영 제공 bytes를 후속 배포 기록에서 대조한다.
