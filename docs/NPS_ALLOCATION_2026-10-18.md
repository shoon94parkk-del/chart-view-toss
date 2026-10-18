# 국민연금 추정 탭 — 2026-10-18

project_id: github:shoon94parkk-del/chart-view-toss
base_sha: ee65113
classification: new behavior

분석 → 근거와 시장 환경 확인 → 국민연금. #pension 및 /pension/ 직접 진입을 지원한다. 네 개 하단 탭·native back·토스 safe-area를 재사용한다. 요약에는 국내주식 비중·목표 차이·총자산 유지 내부 조정액과 실제 가격 기준일만 표시하고 자산별 평가·13F 내역·추정 전제/출처·시장 가정은 닫힌 상세로 제공한다.

## 데이터와 갱신

공유 저장소 static/data/nps/summary.json과 holdings-<snapshotVersion>.json을 기존 public static CDN/API로 읽는다. 상세 552행은 명시적 13F 펼침 뒤에만 요청한다. Home 진입에는 국민연금 요청이나 lazy 자산을 추가하지 않는다.

시장 종가 수집은 공유 저장소의 update-nps workflow가 화~토01:30UTC(한국10:30)에 수행한다. 요약의 5분 확인은 새 게시 여부 확인이며 장중 실시간 가격이 아니다. 공식 월별 잔고와 새13F 종목/CUSIP 매핑은 검증된 새 기준이 필요하며 시장 수집일을 새 보유 기준일로 표시하지 않는다. SEC 검증 대기/확인 지연과 오래된 가격일은 메인 상태에도 표시한다.

초기 운영 게시의 공통 가격일은2026-10-16. 새 일관된Yahoo 일별환율과 국내 국채ETF 대용치를 사용한 계산은22.553851592%,목표차이+1.753851592%p,내부조정−27.9715597494조다. 독립 사이트의 과거seed22.7765%는 다른 환율 제공자와 채권 금리 근사를 사용한 것이므로 새 운영값과 구분한다. 테스트fixture는 그 이전 검증seed를 고정 회귀로 유지한다.

## 지킨 계약

13F 값은 달러(천 달러 아님), 직접평가 금액은 기존 해외주식 잔액 내부에 편입하고 미포함잔여만ACWI를 적용한다. 환율/헤지는 주 자산 계산에서1회 적용한다. 수량·종가·조정종가·분할/배당 근거를 저장하고 ETF 내부 종목을 다시 합산하지 않는다. 실제0 수익률과 미평가null은 구분한다.

요약/상세는 같은snapshotVersion을 검증하고 오래된 네트워크 응답을 채택하지 않는다. 새 요약 검증 실패는 이전 유효 결과를 유지한다. 화면이탈시 AbortController·timer·listener를 해제하고 늦은응답을 무시한다. 공개자료만 세션에서 보관하며 개인 저장정보/종목/질문을 추가수집하지 않는다.

## 검증 기록

순수 모형·게시 검증·이전응답 보호·버전 불일치 Node 검사,9개 기능/접근성 E2E×4기기,기존전체 qa:prepush와 관련mobile QA를 실행한다. 실제 명령/최종결과·CI·배포SHA는 아래에 실행 후 기록한다.

독립 검토는 같은 가격snapshotVersion에서 SEC 경고만 바뀌면 화면이 갱신되지 않는 문제를 찾았다. 유효한 요약마다 부분 갱신하고 보유내역은 같은 버전이면 재조회하지 않도록 고쳤다. 같은 버전 경고 변경 브라우저 회귀를 추가했다.

초기 환경은 OpenAISans 기본 fallback이 실제 glyph를 렌더하지 않아 body.innerText가 비고 source 버튼이6px가 되는 문제가 있었다. 앱CSS 변경 없이 실행환경 FONTCONFIG_FILE에 설치된 Noto Sans CJK KR을 지정해 실제 글자/너비를 복구했다. WebKit OS 라이브러리는 root 권한이 없어 Debian 서명 패키지를 사용자 임시 경로에 추출하고 브라우저 sys/lib에서 로딩했다. ldconfig 검사는 사용자 경로를 인식하지 않아 host-precheck만 생략했으며, 실제 WebKit 실행과 모든테스트 assertion은 유지했다. 환경 문제가 있는 초기 실행은 앱 성공 결과로 세지 않는다.

실제 토스 Android/iOS Sandbox·QR·스토어 제출은 웹 브라우저 검사로 대체하지 않는다. 기존 출시 gate를 유지한다.

## 자동 수집 운영 확인

공유 저장소 PR159를 15ebb5502f25eed5e857ab8e5bde45521638e00e에 병합했다. 실제 GitHub cloud workflow 39173304188에서 offline tests, 종목별 수집·검증, 게시 커밋까지 성공했다. 게시 commit은 ab3a1b7b854b22e6758c0394322a7050f2e61d8f이며 summaryVersion은 22ee5b75693fdaef다. 그 커밋의 summary와 552행 상세를 직접 읽고 일치 확인했다. 데이터 기준은10월16일이며 비중22.55385%는 유지됐다.

이 cloud 실행에서 SEC submissions 조회는 HTTP403이었다. 가격 게시를 성공으로 검증했지만 신규 SEC 확인을 성공이라고 기록하지 않는다. 10월18일 로컬에서 검증한6월말 보유수량을 유지하며, 운영 summary의 latestFilingCheck=unavailable 및 화면의 ‘새13F 확인 지연’이 이를 표시한다. 공식 월별 잔고·신규 매핑의 검증 범위는 그대로 남는다. Public CDN main URL의 최대5분 전파 지연과 immutable commit readback을 구분한다.

## 앱인토스 빌드의 데이터 경로

Render 웹의 설정만으로 SDK 번들에 공개 CDN이 포함되는 것은 아니다. build:ait를 별도 Node 실행기로 연결해, 명시한 CDN이 없으면 기존 Chart View 공개 데이터 호스트를 기본 적용한다. 이렇게 만든 SDK 파일도 백엔드 런타임의 정적 파일 배포와 독립적으로 새 종가 게시물을 읽는다. 명시적 호스트와 나머지 환경은 유지하며, QA 웹 빌드의 fixture 경로는 바꾸지 않는다. 두 Node 회귀 검사와 실제 AIT 번들 생성으로 검증한다.


## 로컬 최종 검증

- 순수 모형/자료·lazy route 포함 최초 Node685개 통과. 이후 앱인토스 환경 회귀2개 추가.
- `qa:prepush` 전체980회:978통과, 기존PICK행높이2회 실패. 모든 글꼴을Noto로 강제한 환경에서64.859375px가 측정되어64px상한을 넘었다. 원래main ee65113도 같은 두 프로젝트에서 동일하게 실패했다. PICK코드·높이상한은 변경하지 않았다.
- 라틴은Liberation Sans, 한글은설치된Noto CJK를 사용하는 정상대체글꼴 환경에서 해당2회 재검사 통과. 신규국민연금36회(9동작×4기기)도 같은환경에서 모두 통과.
- 기존mobile_continuity_qa 320/390/430px 모두 통과. 동작·접근성·기하검사를 완화하거나 건너뛰지 않았다. 전체release환경의 단일suite성공은 최종GitHub CI에서 별도로 확인한다.
- 최초로Noto를 사용한 환경복구와 최종Liberation/Noto환경을 구분한다. 실제Toss기기 검증은 수행하지 않았다.

최종 Node687개와 앱인토스 SDK 빌드가 성공했다. chartview.ait SHA256은 0b90e1ae3adabab0f2448a414b68b6f5e7b8c748c7d664b603533fc6f9b4a368이다. SDK buildId는 실제 기기 출시를 의미하지 않는다. 공개 CDN이 포함된 번들로 생성했다.
