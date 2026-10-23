# 투자 뉴스 조회

분류: 새 동작. `/investment-news/`는 공식 출처에서 수집한 공개 사건의 중요도·섹터·종목·발행일 KST·가설 재점검을 조회한다. 관심종목 `/news/`, 3인 공개 연구 `/debates/`, 기존 PICK 원장과 감사 PICK v2는 각각 기존 계약을 유지한다.

## 게시 계약

공유 서버의 `GET /api/intelligence/news`가 `intelligence_investment_news.json`을 기존 검증된 published-data 리더로 제공한다. `schemaVersion: investment-news.v1`, UTC `generated_at`, KST `as_of_date`, READY/PARTIAL/NOT_STARTED를 검증한다. API가 실패하고 공개 CDN이 설정된 경우에만 같은 파일을 조회한다. 조회·CI는 수집기나 LLM을 실행하지 않는다.

첫 저장 파일은 사건이 없는 NOT_STARTED다. 원문 숫자·출처·발행시각과 요약·조건부 해석을 구분하고, 공식 원문 확인을 독립 교차검증으로 표시하지 않는다. 규칙 점수는 성공 확률이 아니다. 개인 가설·보유·계좌·채팅 ID·Telegram 원문은 공개하지 않는다. 모든 사건은 REVIEW_ONLY다.

## 화면과 생명주기

분석 메뉴에서만 모듈/CSS를 지연 로드한다. 섹터·종목·발행일·가설 점검 및 중요도/최신 변경 정렬은 이미 받은 목록에 적용한다. UTC 원시 발행시각과 KST 필터 기준을 구분한다. 접은 사건 행을 펼치면 사실·출처·조건부 추론·실제 3인 결과·공개 가설 점검·개정 이력·실제 가격 성과를 확인한다. 없으면 AI 미실행/보류·성과 자료 미연결을 표시한다.

보이는 화면에서 60초·수동·복귀 확인을 한다. 실패 시 마지막 정상 자료와 펼침/필터를 유지한다. 더 오래되거나 같은 시각에 내용이 다른 게시물은 현재 자료를 덮어쓰지 않는다. 화면을 떠나면 요청·타이머·이벤트를 정리하고 늦은 응답은 다른 화면을 바꾸지 않는다. 출처는 기존 Toss/web 외부 링크 처리기를 사용한다. Home 초기 데이터/시세 요청과 PICK 계산은 변경하지 않는다.

## 검증과 운영 구분

새 Node 계약/보안/모델/마크업, 기존 lazy coordinator, 네 기기 E2E에서 실제 응답→정렬/필터/사실/조건부 해석/실패 보존/이탈/접근성/출처 열기를 검사한다. 별도 공식 피드 실수집 결과 122건·6개 출처의 검증된 projection으로 로컬 API와 실제 빌드 UI도 확인한다. 이는 합성 fixture, 공개 Render 게시, 실제 LLM/Telegram 연결, Android/iOS Toss Sandbox와 구분한다.

최종 명령·개수·실패 및 환경 보정·커밋은 작업 보고서와 최종 인수인계에 기록한다. 이번 UI 구현은 원문 전체 또는 실제 수집 스냅샷을 임의로 게시하지 않는다. 운영 게시 전 producer의 공개 요약·근거·권리와 정확한 tested revision을 확인한다.

## 2026-10-23 공개 입력 경계 검토

API 실패 시 공개 CDN을 직접 읽어도 동일한 보호를 적용한다. 출처 없는 사건, 비공개 필드·개인 보유 관련 문장, 잘못된 달력 날짜·미래/역순 성과 시각, 근거 없는 3인 완료, 비정규 백분율/MDD 별칭, credential/Telegram URL과 두 Telegram 입력 플래그를 거절한다. 성과는 canonical 소수 수익률과 실제 기준/관측 시각·출처를 요구한다. 실제 숫자0은 화면에서도0으로 유지한다.

주 API는 기존 요청 클라이언트의9초 예산을 사용하며, CDN fallback도 같은 클라이언트의2.5초 deadline·이탈 취소·credentials omit을 적용한다. 제공처/시세 캐시나 PICK 요청은 추가하지 않는다. 초기 실제 전체 QA가 이용량 중단으로 종료된 기록과 최종 소스의 완료된 검사 결과를 구분한다.

## 최종 로컬 검증 — 2026-10-23

`VITE_CHARTVIEW_STATIC_DATA_BASE='' npm run qa:prepush`가 Node753개·직접 진입30경로·브라우저1,068개(네 기기)로 통과했다. unexpected/flaky/skipped는 각각0이다. 검사 전후353개 source/test/config 파일의 SHA-256이 일치한다. 초기 이용량 중단/수정 전 중단 기록을 이 최종 완료 결과로 대체하거나 숨기지 않는다.

현재 검증된 공개300건·5출처 자료(게시2026-10-23T01:50:53.430519+00:00)를 실제 로컬 published-data reader와 FastAPI API에서 HTTP200/no-store로 받은 뒤 실제 빌드 UI에 전달했다. 네 기기 모두300건, 최신 실제 발행일 KST2026-10-21의3건 필터 결과, 가로 넘침0, 치명적 오류0, 실제 미연결 AI/Telegram 상태를 확인했다. 이전122건·6출처 확인은10월21일 자료의 역사적 검사로 보존한다. 공개 Render 배포·실제 원격 수신·native Sandbox는 별도 운영 검증이다.

이후 기존 mobile continuity는320/390/430px 모두 통과했고 `npm run build:ait`가 성공했다(Node753개 재검증 포함). 테스트 번들 chartview.ait는10,542,976bytes, SHA-256 `2ed7a3a47ae3c2e1c7447bc661f606769d65ec97faf6f9af66b49621c6470da4`, deploymentId `01a1667e-b833-7776-ae22-21b0040d28ed`다. AIT는 기존 공개 CDN 설정으로 다시 빌드하므로 fixture QA의 API-only dist와 구분한다. 이는 로컬 테스트 번들이며 실제 native Sandbox·공개 제출이 아니다.
