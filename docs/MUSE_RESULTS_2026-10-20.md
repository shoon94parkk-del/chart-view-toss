# Muse 3인 종목 연구 자동 갱신

분류: 새 동작. 기존 공개 요약 화면 `/debates/`를 유지하며, Muse가 검토한 공개 결과를 별도로 게시하면 앱 재배포 없이 확인한다. 개인 보유 목록/수량/평단/계좌, private GitHub 원문, 감사 PICK v2와는 연결하지 않는다.

## 표시와 데이터 흐름

- 닫힌 행: 종목/실제 분석 기준일/핵심 요약/완료·일부 결과·중단/연구상 판단. 상세는 기존 토론 phase별 펼침으로 남긴다. 검색은 공개 요약도 포함한다. Shadow 운영 현황도 별도 펼침이다.
- bootstrap을 즉시 읽고 공개 CDN 또는 `/api/published-data/intelligence_debates_public.json`을 독립 재검증한다. Shadow 실패·지연은 연구 결과를 막지 않는다. 기존 gated `/api/intelligence/*`를 활성화하지 않는다.
- 화면이 보일 때60초 주기, 수동 새로고침, 복귀 시 확인한다. workflow/CDN/네트워크 지연을 포함한 실시간 보장이나 분석 실행 주기가 아니다. 화면을 떠나면 요청·타이머·이벤트를 정리한다. Home 초기 요청은 추가하지 않는다.
- 실제 generated_at instant로 최신 자료를 고른다. 실패/오래된 CDN/같은 시각의 상충 자료로 최신 정상 결과를 되돌리지 않는다. 같은 내용은 다시 그리지 않고 변경 시 검색/필터/펼침/키보드 위치를 보존한다.
- 분석 기준일(date), 결과 수정(updated_at), 게시(generated_at), 해당 게시물 확인 시각을 구분한다. 늦게 온 bootstrap이 새로 선택되면 이전 게시물 확인 시각을 물려주지 않는다. 지연이면 마지막 정상 자료임을 표시한다.
- JSON4MiB/개별 필드/날짜/승인/개인정보 패턴을 검증한다. 새 summary+updated_at 확장이 있는 COMPLETED는3역할 phase1과 attack/rebuttal/final이 모두 필요하다. 기존 공개 기록은 그대로 읽고 audit_verified=false를 유지한다.

## Muse 인수인계

공유 저장소의 [공개 게시 계약·명령](https://github.com/shoon94parkk-del/chart_View/blob/main/docs/MUSE_RESEARCH_PUBLICATION.md)을 따른다. Muse는 실제 결과·공개 요약·근거 날짜·수정 시각·공개 검토를 채우고, 결과 내보내기 완료 후 다음 명령을 호출한다. 공개 projection만 입력한다.

```bash
python -m scripts.dispatch_debate_publication --archive /local/public-debates.json --check
python -m scripts.dispatch_debate_publication --archive /local/public-debates.json
```

공유 저장소 최신 main과 기존 gh 인증을 사용한다.60KB 이상 dispatch는 거절하며 검토된 git 게시 경로는 계약에 있다. 현재 결과를 갱신할 종목은 research-005930 같은 고정 id를 사용하고 실제 새 date/updated_at으로 수정한다. 매번 날짜를 id에 붙여 누적하면30개 상한에 도달하므로, 의도한 별도 과거 기록에만 새 id를 쓴다. 원본 이력은 Muse의 비공개 저장소에 남긴다. 실제 새 보고서나 정기 운영 로그는 아직 Muse가 채울 자료이며 이 구현이 임의로 생성하지 않는다.

## 검증 기록

- 대상 Node19개와 모바일 브라우저32개(8×4기기) 통과. 잘못된 글꼴 환경에서 input이 빈 값이 된 초기 실패, WebKit host validation 실패는 올바른 기존 환경으로 복구해 검사했다. 제품/오류 필터를 약화하지 않았다.
- 폴링 해제는 실제 하단 분석 메뉴를 눌러 SPA 이동으로 검사한다. full-document unload 중 WebKit의 취소된 cross-origin fetch 오류를 SPA lifecycle 검증으로 혼동하지 않는다.
- 독립 검토에서 게시물별 확인 시각 상속 문제를 재현/수정했고 회귀를 추가했다. 대상 재검증32/32 통과, 읽기 전용 재검토에서 미해결 항목 없음.
- 최종 소스로 `npm run qa:prepush`를 별도4179 preview에서 다시 실행하여 Node736개·직접 진입29경로·브라우저1,048개(4기기)가 모두 통과했다. unexpected/flaky/skipped는 각각0이며 소스/검사343개 파일의 실행 전후 SHA-256이 일치한다. 원격 CI·정확한 배포·운영 readback은 후속 기록에서 확정한다.
- AIT 테스트 번들과 실제 Android/iOS Toss Sandbox·공개 제출은 구분한다.

서버 검증 추가: main4d629c3의 실제 `/health` revision/세 Web canonical assets/거장 근거 정합성 검증을 통과했다. 신규 public archive와 Shadow published-data API는 모두HTTP200·github-main·no-store로 확인했다. 게시 workflow39392871253은 실제 기존 Shadow projection을 무변경 재게시하는 idempotent 경로로 성공했다. 새 보고서를 가짜로 게시한 검증은 아니다. 기존 모바일 연속성 QA는320/390/430px 모두 통과했다.

Muse exporter도 구현했다: [intel-os PR16](https://github.com/shoon94parkk-del/investment-intelligence-os/pull/16)은 PR12 위에서 summary/updated_at·3인 완료·Shadow 경로·개인정보를 검증하고 선택 `--publish-chartview`로 직접 게시 workflow를 요청한다. 기본 local-only, 승인 gate와 실패 시 로컬 결과 보존을 유지한다. Muse 실행 브랜치에는 기반 PR12와 이 패치를 통합해야 한다. 통합 후에는 Backend clone 없이 다음 한 명령을 분석 완료 시 호출할 수 있다.

```bash
python -m tools.export_debates --manifest /local/approved-manifest.json --out /local/public-debates.json --owner-approved --publish-chartview
```

이 producer 패치는 실제 private records/운영DB를 읽거나 게시하지 않았으며 로컬 targeted24개·전체1,011개 통과(기존 live E2E skip1개), 독립 검토 PASS다. 원격 CI는 계정 환경 사유로 job 시작 전에 차단되어 실행하지 못했다. 검사를 약화하지 않았으며 상세 사유는 비공개 PR16에 기록했다. 실제 Muse 실행 브랜치 통합·실제 결과 작성·완료 후 호출은 아직 남아 있다.

## 전체 검증에서 재현한 PICK 복귀 경합 보강

초기 전체 검사는 Node733개/브라우저1,038개 통과와2개 실패였다. 실패는 토론 기능이 아닌 기존 PICK 상세→Back의 위치 복원이었다. 데스크톱36px·320px94px이 소실됐고, 변경 없는 f1c45c8에서도 monitor 응답을 강제로 늦추면36px 소실을 재현했다. 단순 기존 케이스가 한 번 통과하는 것으로 원인을 배제하지 않았다.

Primary가 임시로 짧은 loading 화면에서 한 번 scrollTo한 뒤 원래 목표를 삭제하고, 늦은 monitor가 화면을 늘려도 재시도하지 않는 경합이었다. 기존 main 스크롤 복원 경로를 재사용하여 초기 monitor가 준비/실패로 정리될 때까지 목표를 유지한다. 사용자가 wheel/touch/pointer/key로 직접 조작하면 대기를 취소하고, 이전 화면 정리는 popstate가 새로 지정한 다른 화면의 목표나 새로 저장한 반환 위치를 지우지 않는다. queued frame에는 viewEpoch 검사를 추가했다. 성과/rows의 독립 표시와 기존 retry 포커스/위치, 공유·기기 저장은 유지한다.

대상 Node34개와4기기 브라우저12개 통과, 독립 검토에서 미해결 항목 없음. 신규 검사는 실제 사용자 조작 후20px 이상 이동과1px 이내 위치 보존을 유지했다. Mobile WebKit의 mouse.wheel 미지원은 실제 키보드 입력으로 검증하며 오류/허용치를 완화하지 않았다. 이 최종 소스로 qa:prepush를 새로 build/실행하여 Node736개·브라우저1,048개를 모두 통과했다. 첫 실패 실행과 구분하며 실패를 재시도로 숨기거나 허용치를 낮추지 않았다.

## 실제 게시와 재배포 없는 수신 확인

최종 서버는 f789a3b(배포 dep-dbbiq88473hc73cgun60)이며 main App Regression39396967004의12개 작업이 통과했다. 실제 health/canonical assets/거장 동일-version 근거를 확인했다. UTF-8와 Toss 경로 보강은 전체 Python1,133개·43subtests를 통과했다.

실제 [공개 게시 workflow39397592388](https://github.com/shoon94parkk-del/chart_View/actions/runs/39397592388)로 기존 한화시스템 스모크 기록의 짧은 공개 요약만 갱신했다. 게시 커밋22638c1 뒤에도 실행 서버 revision은 f789a3b 그대로이며, published-data API가HTTP200/github-main/no-store로 새 요약을 반환했다. 분석 기준일은2026-10-20, 요약 갱신은09:00:58UTC, 게시 생성은09:01:17UTC로 구분된다. 기존 phase와 다른 두 기록이 유지되는지도 대조했다. 결과는 여전히 총3건이며 새 보유종목 분석을 만들어 게시한 검증이 아니다.

## 최종 로컬 모바일·토스 빌드

전체 브라우저 검사 종료 후 기존 mobile_continuity_qa를 다시 실행하여320/390/430px의 메뉴·행선지·밀도·출처·터치 영역 검사를 통과했다. 이후 `npm run build:ait`가 성공했다. 테스트 번들 chartview.ait는10,531,683bytes, SHA-256 `c6fce16a61e01e3b224855676cfef4687d9fd756f5cc64aad3651eeef0bd7b81`, deploymentId `01a15895-bfd2-726b-a9a9-58185cba2064`다. 실제 Android/iOS Toss Sandbox·QR 확인과 공개 제출은 수행하지 않았으며 웹 배포와 구분한다.
