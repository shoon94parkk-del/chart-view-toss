# 거장 자료 범위와 미국 히트맵 초기 표시 점검

## 확인한 문제

- 미국 full API는 20 KR / 40 US를 기존 직렬 bulk capacity로 순차 수집한다. 부분 응답의 행 집합이 저장된 완성 지도까지 덮어써 40→17→21→40으로 줄었다. 기존 유효 타일 보존 계약의 회귀다.
- 실제 warm 서비스에서는 US40 표시 1.324초/API180ms였으므로 이 측정으로 cold 지연 해결을 주장하지 않는다. 재현은 실제 응답 구조를 이용한 cached40/partial17 브라우저 검사로 별도 확인했다.
- 거장 CDN 결과는 미너비니81/검증2049인데 운영 API는 이전 시장자료의 90% 범위 미달 때문에0이었다. 409 강제 갱신의 기존 backend recovery가 최신 CDN 목록을 과거 목록으로 되돌리는 경우를 확인했다.
- 금융 확인일은 10/05이고 가격 기준은10/07이었다. 린치의 EPS/기업행동 제외1485 중1110은 기존 검증 범위 만료였다. 오닐1394/그린블라트1524도 만료가 첫 사유지만 추가 금융조건 충족을 보장하지 않는다. 실제 기업행동의 불확실성은 계속 제외한다.
- 공식 Basic EPS 계정의 명시적인 ‘기본 및 희석’ 라벨을 희석 전용으로 잘못 제외했다. 원보고서 재해석으로 최신 누락93기업 EPS 복원 가능; 162회사406연도 계정·근거 갱신, 원보고서·재무 확인일·다른 숫자 불변.

## 수정과 안전 조건

`mergeHeatmapProgress`는 부분 응답에만 이전 유효 시세를 합친다. 0%/가격을 생성하지 않고 최신 timestamp 공용 시세가 이기며, 응답 수와 이전 유지 수를 구분한다. 완료 응답은 현재 universe를 교체한다. 이전 유지 행은 섹터 합계에서 제외한다. Home 아래의 lazy sectors도 같은 helper/기기 캐시를 사용한다.

공유 backend의 검증된 full snapshot은 기존 FULL_HEATMAP_CACHE의 cold seed 자료다. 레거시 heatmap.json 가격은 계속 금지하며 canonical 출처·관측 시각·대상·48시간 한계를 검사하고 저장값은 stale로 표시한다. TTL/수집 worker/provider budget은 유지하고 재검증은 기존 경로로 진행한다. 캐시를 현재 시세라고 표기하지 않는다. 토스 전체 히트맵 진입에서만 기존 data-only CDN의 같은 전체 스냅샷을 선택적으로 병렬 조회하므로 수동 backend 배포 사이에도 최신 저장 자료를 활용한다. 완성 live 응답을 늦은 스냅샷으로 교체하지 않는다. 48시간을 넘는 주말/휴장·공급자 부족 때는 첫40개를 보장하지 않고 실제 부분 상태를 표시한다.

거장 제외사유는 응답에 있는 양수 정수만 접힌 상세로 표시하며 자료 부족+지원 제외 범위임을 명시한다. 미너비니 설명은 일봉253거래일/비교시장90% 기준을 사용한다. 409 회복 시 기준일·생성시각이 이전이면 현재 목록과 정확한 근거 버전을 유지하고 재시도를 안내한다. 최신 응답의 실제 선정 감소는 수용한다. 기존 API-only recovery에 날짜 역행 방지 예외를 추가한 의도적 변경이다.

Backend 공시 증분 검증은 이전 verified/no-event/회사 매핑이 일치하는 경우만 짧은 실제 OpenDART 창을 조회한다. 전 페이지·개수·회사·날짜 검증 완료 전에는 아무 기업도 갱신하지 않는다. 실패·020·예산 소진은 기존 범위 보존; 새 기업행동/재무공시는 unknown으로 차단한다. 연간 재수집으로 매일 EPS 범위만 갱신하지 않는다. 기존 DART 키/예산 공유, 방문자 공급자 호출 추가 없음. 병합은 동일 금융근거와 reviewBase를 요구하고 새로운 금융자료를 이전 공시 검증으로 덮지 않는다.

## 실행과 새 회귀 추가

- 필수 `npm run qa:prepush`: Node → production build → Playwright desktop/320px/Android/iPhone WebKit. CI의 PR 및 main 동일 suite, flaky retry도 배포 차단, screenshot/trace/video/report14일 보존.
- 대상 `npx playwright test tests/e2e/heatmap-progress.spec.mjs tests/e2e/guru-coverage.spec.mjs`와 `node --test tests/heatmapProgress.test.mjs tests/guruInvesting.test.mjs tests/guruFive.test.mjs`.
- 기존 `tests/guru_investing_qa.mjs`, `tests/sector_heatmap_qa.mjs`, `tests/mobile_continuity_qa.mjs`, `tests/watch_quote_parity_qa.mjs`도 실행한다.
- Backend `python -m pytest -q`, 기존 six Node contract suites, `python scripts/build_frontend_bundle.py --check`.
- 새 기능은 기존 fixtures/qa.overrides에 명시적 응답을 추가하고 API→가공→UI 관계를 검증한다. stale/partial/error/최신 실제 감소를 함께 검사하며 기존 숫자·날짜·형상 기준을 낮추지 않는다.

agency 역할/native Codex로 구현·독립 리뷰를 나눴다. tester-army/e2e와 claude-mem은 조사 상태로 유지하며 CI/MCP/자동 hooks를 연결하지 않았다. 새 LLM API/키/비용은 없다. 실제 Toss Android/iOS Sandbox 출시는 별도 미완료 gate다. 최종 실행·배포 증거는 해당 PR 본문과 작업 로그에 기록한다.

## 측정 근거

동일 로컬 cold-seed harness/동일 실제 Home·universe에서 이전 US9/KR20(0.924ms) → 새 US40/KR20(2.156ms). 가격조회 없이 검증된 이미 수집한 관측을 초기 자료로 읽은 결과이며 네트워크 속도 향상 측정이 아니다. 실제 공개 warm 화면의1.324초/API180ms와 혼합 비교하지 않는다.

최초 한정 증분 Actions37647400172는 조회 미완료를 검출해1605개 기존 검증기간을 보존했다. 순수 EPS 재해석 후 린치 평가74→82/선정3→5, 오닐 평가70→78, 그린블라트 평가80→87; 새 공시 증분 검증 성공을 주장하지 않는다. 나머지 기준을 완화하지 않았다.

최종 로컬 검사: Node301/301, Playwright75개×4기기=300/300(unexpected0/flaky0/skipped0), 기존 guru/sector/mobile continuity/watch quote parity 모두통과. Snapshot 순서 회귀 별도16/16. Backend최초548/548+진단추가560/560 및 기존Node38/38, bundle --check 통과. PR CI와 정확한 배포 revision/공개 앱 검증은 최종PR본문에 업데이트한다.
