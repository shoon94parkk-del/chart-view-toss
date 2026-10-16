# PCE 운영 웹 게시 결과 — 2026-10-16

PCE·근원 PCE를 기존 CPI·근원 CPI·PPI·근원 PPI와 같은 선택형 그래프에 추가하고 운영 웹에 게시했다. 이 기록은 실제 공개 응답을 확인한 웹 게시 결과다. 토스 콘솔 제출과 실제 Android/iOS Sandbox 검증은 미실행이다.

## 변경과 데이터

- 프런트 제품 파일: `src/macroInflationModel.js`, `src/macroInflationView.js`, `src/macroInflationView.css`. 기존16개 경제지표, 홈·현재가 API·PICK/LAB 선정/계산/노출 코드는 유지했다. 테스트·출처·보관 원칙은 [구현 문서](../../MACRO_PCE_2026-10-16.md)와 [통합 검증](VALIDATION.md)에 있다.
- 백엔드는 정기 수집기에 BEA 공식 XLSX 파서와 PCE 두 SA 지수, 발표일·일정을 추가했다. 앱 요청 시 BEA를 호출하지 않는다. 한 번 받은 기존 macro 응답으로6종·두 변화율·기간을 전환한다.
- 기준월과 발표일을 분리했다. CPI/PPI의9월 관측치는10월14/15일 발표다. PCE 최신은8월 관측치·9월30일 발표이며 다음 공식 발표는10월29일이다. 발표 월을 관측 월로 바꾸지 않는다.
- PCE 전년/전월은 같은 계절조정 지수의 정확히12개월 전/직전 월과 비교한다. BEA 계정은 `DPCERG`/`DPCCRG`다. 수정된 현재 지수 계산값과 최초 발표값을 구분한다.
- 예상 대비 초록 낮음·노랑 같음·빨강 높음·회색 미제공을 구현하고 고정 자료로 검증했다. **운영 시장 예상치 수집은 미완료**다. 승인된 재배포 출처와 발표 전 보관 이력이 없어 실제 화면은 회색 `미제공`이다. 숫자나 과거 수집 시각을 만들지 않았다. 이 작업은 새 전환 이벤트/SDK를 추가하지 않았다.
- PICK/LAB 보호7개 파일 해시는 [확인 기록](final-protected-pick.json)과 같다. 정기 Guru 데이터 갱신은 기존 일정대로 진행됐으며 선정 로직 변경으로 집계하지 않는다.

## PR·CI·배포 버전

| 항목 | 결과 |
|---|---|
| 프런트 [PR136](https://github.com/shoon94parkk-del/chart-view-toss/pull/136) | 병합, main `95d6b8361e22958f9cea6773afcf6ca446c2447a` |
| 백엔드 [PR155](https://github.com/shoon94parkk-del/chart_View/pull/155) | 병합, 정기 데이터 후 최종 운영 `b08af11f4bca7703c8d9c6d7a0f551249c4323b2` |
| 프런트 PR Main / Mobile / AIT / Live smoke | [38854131319](https://github.com/shoon94parkk-del/chart-view-toss/actions/runs/38854131319), [38854132549](https://github.com/shoon94parkk-del/chart-view-toss/actions/runs/38854132549), [38854131416](https://github.com/shoon94parkk-del/chart-view-toss/actions/runs/38854131416), [38854131423](https://github.com/shoon94parkk-del/chart-view-toss/actions/runs/38854131423) 모두 성공 |
| 병합 main 재검사·정상 승격 | [Sync38854806041](https://github.com/shoon94parkk-del/chart-view-toss/actions/runs/38854806041)7개 job 모두 성공; 기존 workflow가 배포 브랜치를 exact95d6b83로 승격 |
| 병합 main AIT | [38854806013](https://github.com/shoon94parkk-del/chart-view-toss/actions/runs/38854806013) 성공 |
| 프런트 Render | `dep-db8r9kbl550s73eu3980`, exact95d6b83, **05:23:54 UTC live**; [응답](frontend-deploy-live.json) |
| 백엔드 Render | `dep-db8qo9ui0phs738mbea0`, exactb08af11, **04:47:58 UTC live**; [배포 메타데이터](backend-deploy-live.json), [실제 배포 검증](backend-release.json) |

main/기존 배포 브랜치 fast-forward와 CI를 확인한 뒤 기존 서비스를 각각 한 번 수동 게시했다. 프런트 서비스 메타데이터는 autoDeploy=yes였지만 정상 승격 후에도 신규/대기 배포가 없었고, 기존 게시 이력은 API 수동 배포였다. 새 서비스·요금제·환경변수·배포 훅을 만들거나 설정을 바꾸지 않았다. main과 배포 브랜치는95d6b83에 유지하며, 사후 증거는 별도 문서 브랜치에 보관한다.

공개 사이트는 기존 CDN 설정으로 재현한 빌드와 entry·본문 SHA256이 일치했다. `/assets/index-Bd1oWwEb.js`, SHA256 `951d6d631720cceaffb56b974631de755e2821f742c778279097b6279615ad38`. [빌드 조건](public-build.json), [실제 응답](production-smoke/chromium-390-deployed-revisions.json).

## 검증과 실패 기록

- Node596, Python890, 백엔드 Node52, Vite·직접 경로27개, 기존 모바일 QA, deterministic E2E912(4프로젝트×228) 통과. Android Chromium/iPhone WebKit,320/390/430px, axe와 기존 PICK 계약을 포함한다. 상세한 명령·로컬 성능·초기 실패는 [VALIDATION](VALIDATION.md)에 있다.
- **실제 운영 최종20/20 통과**, 페이지 예외0: [요약](production-summary.json), [전체 결과](production-smoke/results.json), [원본 공개 JSON·스크린샷](production-smoke/). 고정 API값·합성 가격으로 바꾸지 않았다. 기존 proxy 환경에서 route.fetch로 실제 상태/헤더/본문을 그대로 전달한 모바일 브라우저 검사다.
- 6종 물가, PCE 두 SA 변화율·같은 지수 재계산, 기준월/공표/출처, 누락 월 선 연결 방지, KST 공식 일정, 회색 미제공·현재 지수 계산값 구분, 추가 macro 요청0을 확인했다.
- 홈 관심3종목·시각, 정렬/리로드 저장, 실제 종목 차트, 연구 메모 저장/초안/뒤로 가기/복귀, 공식 기업 컨퍼런스콜 출처도 통과했다. 실제 사용자 계정/메모를 사용하지 않았다.
- DRAM은8월15.7331→9월16.777십억달러, `(9월/8월−1)×100=6.635…%`, 화면 MoM **+6.6%**와 증가한 막대가 일치했다.

최초 운영 실행은16/20 검사 통과·4검사 실패였으며 추가 runtime 예외도 기록됐다. [원본 결과](production-smoke-initial/results.json), [당시 검사 코드](production-smoke-initial/live-smoke.mjs), 실패 화면을 보존한다.

1. Chromium2곳의 수출 검사: Home에서 받은 browser Response 객체를 여러 문서 이동 뒤 처음 읽어 CDP 본문이 소멸했다. 수신 즉시 원본 JSON promise와 상태를 저장하도록 **검사 도구만** 수정했다. API 재요청이나 수치 assertion 완화는 없다.
2. Chromium430 차트: 클릭 후5초 안에 canvas가 없었고 로딩 UI가 보였다. 기존 기록만으로 공급 지연/렌더 오류를 확정할 수 없다. 최종 검사는 클릭 전에 실제 compare 응답 대기를 등록하고 HTTP200·실제 종목 유효 관측값·본문 완료를 확인한 뒤 기존5초 렌더 assertion을 유지한다. 클릭→응답→화면 시각을 기록한다. **초기 cold end-to-end5초 기준이 통과했다고 보고하지 않는다.**
3. 초기 WebKit에서 macro 응답 취소/대기 만료와 quotes access-control 예외가1회 관측됐다. 같은 게시 버전의 재실행에서는 모두 통과했다. 초기 원인을 서버/브라우저/proxy 중 하나로 확정하지 않았으며, 연결 지연이 영구 해결됐다는 근거로 사용하지 않는다. 제품의 오류·재시도 화면이 표시됐고 기존 실패 복구 회귀도 통과했다.

최종 실제 chart 클릭→화면 관측값은320/390/430/WebKit에서1,360/544/476/1,071ms, macro 실제 HTTP 응답은368/467/283/328ms다. 각1회 운영 관측이며 p95/SLA·냉기동 보장이 아니다. Render 무료 서버의 초기 부하·네트워크 지연은 남은 운영 관찰 항목이다.

## 성능·AIT·외부 확인

같은 조건 로컬 중앙값은 홈139→134ms, 종목 상세292→307ms, 기존 macro239→232ms, 물가 그래프312→309ms다. 시작 요청 수는 동일하다. 실제 예열 macro HTTP 중앙값206.859→188.796ms, 새 배포 직후979.897ms도 함께 보존했다. 응답 본문+21,523B이며, 현재가 공급 API 속도 향상이나 cold-start 해결로 해석하지 않는다. [방법·원자료](VALIDATION.md#동일-조건-로컬-성능).

병합 exact95d6b83에서 **새 `npm run build:ait` 성공**,10,477,313B, SHA256 `6767090614159c61d172479c1817648e4bd6166376dbd642eb7885d2d696aafb`. [생성 기록](ait-main.json). CI AIT도 성공했다. CI artifact 다운로드는403으로 실패해 이 해시는 해당 커밋의 로컬 새 생성물 기준이다. 기존 AIT를 이름만 바꾸지 않았다. 콘솔 업로드·실제 Sandbox·Toss 출시 제출은 하지 않았다.

남은 항목: 시장 예상치 공급/재배포 권한과 발표 전 불변 수집 이력, 실제 Toss Android/iOS Sandbox/QR, 추천형 금융 서비스 정책의 PICK 허용 범위 확인. 별도 신규 분석 이벤트나 콘솔 설정은 이 변경에 없다. 추천·부스팅 선정은 코드로 보장하지 않는다.
