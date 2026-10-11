# 개선 후 화면·검증 증거

실행 결과의 전체 설명은 [구현 보고서](../../../UX_IMPROVEMENTS_2026-10-11.md)를 따른다. 이 폴더의 화면은 pixel baseline이 아니라 테스트 중 실제 브라우저가 캡처한 기록이다. 민감한 개인 관심 목록·메모는 수집하지 않았다.

| 파일 | 실행 조건과 의미 |
|---|---|
| `320-screener-expanded.png` | 320px touch Chromium, 공개 계약 형태의 고정 fixture. 접힌 목록에서 전체 조건과 자료 기준을 열어 읽는 상태. |
| `320-idea-expanded.png` | 320px touch Chromium, 고정 fixture. 실제 모델의 기업·기술 이유 전체와 제공된 재점검 날짜 표시. |
| `320-us-sector.png` | 320px touch Chromium, 고정 fixture. 미국 대체 종목의 티커·회사명과 이동 가능 행. |
| `iphone-financial-basis.png` | iPhone SE 크기 실제 WebKit, 고정 fixture. 재무 기준 단어 줄바꿈과 설명 접근. 실제 iPhone/Toss 앱 실행은 아니다. |
| `live-guru-waiting.png` | 수정한 로컬 public-data build와 실제 CDN/Render 응답. 목록/근거 버전이 달라 게시 대기를 설명하는 화면. 운영 Render 프런트 배포 후 화면은 아니다. |
| `production-publication.json` | 실제 health revision, raw/backend 목록 버전, 5개 전략의 실제 후보 근거409. 읽기 전용 요청이며 API 숫자를 fixture로 치환하지 않았다. |
| `live-guru-publication.json` | 실제 브라우저가 캡처한 5개 전략의 HTTP409와 본문 상태. HTTP200 검사는 실패로 유지한다. |
| `validation-overview.json` | 최종 로컬 회귀 건수·결과·실제 데이터 실패를 구분한 요약과 테스트한 source fingerprint. |
| `runtime-oracle-controls.json` | 네 브라우저의 의도적인 sync/async/closing-document 오류 감지 대조 검사. 실제 앱 오류 기록이 아니다. WebKit의 처리된 fetch 진단과 진짜 미처리 오류를 구분한다. |

전체 screenshot/trace/video/HTML/JSON은 Playwright 산출물과 해당 GitHub Actions artifact에서 확인한다. 실패 trace를 제거하거나 콘솔 메시지 문자열로 실패를 숨기지 않았다. 모든 `pageerror` 진단은 관심 저장 fixture의 별도 attachment에 남으며 실제 runtime 오류와 crash는 테스트를 실패시킨다.
