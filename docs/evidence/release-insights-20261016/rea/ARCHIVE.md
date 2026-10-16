# REA 조사 보관본 범위

이 디렉터리는 2026-10-16 AFTERNS 비교 조사의 공개 근거를 Git에서 읽을 수 있도록 보관한다. `REPORT.md`·`EVIDENCE.md`의 본문은 당시 기록이며, 이후 제품 구현·CI·운영 배포의 완료 기록은 아니다. 현재 변경 범위와 검증은 [릴리스 문서](../../../RELEASE_INSIGHTS_2026-10-16.md)를 확인한다.

원조사 작업공간은 `/workspace/research/chartview-afterns-20261016`이었다. 보고서에 남은 절대 작업공간·도구 경로는 당시 환경을 설명하며, Git에서 배포하는 도구나 의존성이 아니다.

보관한 자료는 다음과 같다.

- [기존 기능 인벤토리](chartview-inventory/INVENTORY.md), [백엔드 인벤토리](chartview-inventory/backend/backend-inventory.md)와 당시 ref·PR·데이터셋 메타데이터 JSON. 인벤토리의 고정 SHA GitHub 링크는 당시 소스 근거다. 원조사의 `source-snapshots/` 전체 복사본은 중복 소스이므로 포함하지 않았다.
- [공식 문서 조사](official-sources/research-summary.md), [구조화된 발췌·한계](official-sources/facts.json), [조회 시각·HTTP 상태](official-sources/fetch-metadata.json), NVDA의 공개 속성·원문 링크 목록. 공식 문서 조사의 “HTML·읽기용 텍스트·링크 목록이 옆에 있음”은 원조사 작업공간 설명이다. 이 보관본에는 위 JSON을 남겼으며 전체 HTML·전체 읽기용 텍스트·나머지 중복 링크 목록은 포함하지 않았다.
- [근거 목록](EVIDENCE.md)에 연결된 REA JSON 26개와 대상 목록 JSON 13개. `inspect-web-page`는 브라우저·대상·관찰 구간·완전성·한계 및 이름이 있는 접근성 항목을 발췌했다. 무시/빈 이름 노드, 중복 항목, 중복 `InlineTextBox`, 노드 계층 ID 및 DOM·스크립트·리소스·네트워크·콘솔·저장소 구획은 생략했다. 발췌본은 전체 접근성 트리나 canonical 원본이 아니다.
- `capture-web-screenshot` JSON은 기존 PNG와 중복되는 base64만 생략했다. Evidence ID, 원본 캡처 메타데이터, 이미지 바이트 수·SHA256과 [screens/](screens/)의 PNG를 유지했다. 13개 PNG 모두 기록된 바이트 수·SHA256과 대조했다.
- [매크로 화면 driver sidecar](13-chartview-macro.driver.json)는 원문 그대로 보관했다. REA 대상 URL에서 생략된 `#macro` 해석을 돕는 당시 탐색 기록이며, 별도의 화면 검증 결과를 추가하지 않는다.

[archive-manifest.json](archive-manifest.json)은 추가 근거 파일의 보관 방식·바이트 수·SHA256과 원본 바이트 수·SHA256을 기록한다. 축약한 REA JSON에도 `archive` 필드로 생략 항목과 원본 해시를 명시했다. `evidence-index.json`과 기존 PNG는 수정하지 않았다. 원조사의 “canonical JSON 전체 보관”은 원작업공간에 해당하며, Git 보관본에 전체 원본을 복제했다는 뜻으로 해석하지 않는다.

이번 보관 작업은 새 웹 조회·공급자 수집·애플리케이션 코드 변경·제품 테스트·배포를 수행하지 않았다.
