# UI·UX implementation — 2026-10-04 / 0.14.0

사용자가 승인한 U01–U12와 Task1–8의 구현. 계획 원본: workspace docs/superpowers/plans/2026-10-04-chartview-uiux.md. Web UI와 shared backend는 변경하지 않았다. Render 웹 프리뷰 반영은 별도로 exact revision을 확인한다.

## 구현
1. Null/malformed macro는 안내·재시도를 표시하며 시장/입구를 유지한다.
2. 공통 출처12px/44px조작/포커스/명칭, web visible title1회. Native content heading 계약 유지.
3. 홈 시장→입구→변화2/펼침3→최근기록2/이유→관심3/저장조사1→대표히트맵. 전체 저장/성과계산/원문 기록 보존. 지연 CTA 포커스/화면 위치 보존.
4. 수출 요약→기업 CTA→기존 분류 후보→차트. 검증 제품 구절·출처·날짜·한계가 기본 영역에 있고 전체 HS/국가/제품은 펼침. 동일 국가/품목 state로 상세왕복.
5. 상세 핵심 관찰·기준일·한계·행동과 전체 근거를 구분한다. 가격 다음 섹션 이동, 실제 DOM 및 스크롤끝 현재 위치. 확인된 공시 단위만 읽기 좋게 바꾸고 원값/단위 보존. 지원 비교항목 설명.
6. 목록 핵심 근거2개/전체 조건 상세. 회사·선정일별 실제 기술 경고와 정확한 기록 링크. 같은 논리만 중복 제거, 상태계산 유지. 공통 전망 주의1회, 경제 관찰 원문 의미 유지.
7. 동일payload 지도/목록, 시장/가격/등락/기준일·범위/색/크기 설명. 빈 관심 단일추가, 빈 저장조사 검색.

## 확인 근거
- 단위203/203과 AIT contract 통과. Null macro, 제품 구절, 공개매출 단위, 동일논리/개별경고, 지도/목록, 저장조사/홈cap, DOM순서 및 짧은 마지막섹션 회귀.
- CUA 실제 backend로320/390/430/1280px: 가로넘침없음, 시장/세입구가 하단고정메뉴위. 초기 관찰 카드 문서하단 약902–909px.
- 기업 CTA 상세상단 약380px에 위치, Samsung/SK검증제품·KRX자료일 표시, 미국범위가 종목 조사에 전달됨.
- 키보드 Enter검색/Escape닫기 및 원래 버튼포커스 복귀, 빈 조사 검색, 히트맵 목록 실제 데이터 확인.
- 최종 독립 검토: Critical/Important 미해결없음. 리뷰에서 발견한 navigation/source typography/focus/product근거는 회귀 또는 실제 CSS확인으로 해결.
- Browser QA는 기존 GitHub CI에서 실행한다. 최종 CI/배포상태는 PR94및 workspace outputs최종보고서에 기록한다. 이전 실패를 통과로 간주하지 않는다.

## 판정/비용
1. Bash없음→PowerShell장부. 비용: workflow bookkeeping차이.
2. UI는CUA, 기존browser suites는GitHub CI. 비용: 느린CI피드백.
3. 공통 scoped stylesheet uiExperience.css. 비용: 한 override파일 유지.
4. 앞당긴 홈 관찰이 기존 screener를 viewport근처에서 단일요청. 비용: 요청 경합 가능, 같은 성능harness로 측정.
5. 제품 요약 누락은 필수요건으로 올려 정확한 검증제품구절 표시. 비용: 후보카드 높이 증가.
6. Android/iOS실기기와 실제5명연구는 외부게이트. 비용: native/실사용 효과 미검증.
7. CI는 preview시작성공이면 독립suite를 계속실행, 전체실패 유지. 비용: 실패job시간 증가.

Deferred minors: none. Public Toss출시는 이번 Render웹프리뷰배포와 별개이며 기존 P0gate를 따른다. 화면읽기 virtual cursor/선택텍스트 보존을 검증한 것은 아니다.
