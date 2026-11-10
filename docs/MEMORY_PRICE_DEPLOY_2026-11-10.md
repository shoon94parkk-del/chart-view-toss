# 반도체 가격 개선 배포

사용자가 반도체 가격 상세 개선 PR158의 운영 배포까지 명시적으로 요청했다. 작업 시작 커밋은 `7e0538e1b4be9e92579ad86b9d0a82e08da6bdf6`, 기존 main/Render 배포 브랜치는 `ae26ffe9587938b952dc04726c606d364195c6b3`이다.

## 모바일 릴리스 검사 실패 원인

기존 `mobile_release_qa.mjs`는 홈 배치·실제 자료 표시·모바일 동선과503/timeout/offline을 함께 확인한다. 이 스크립트를 특수300ms 기본 요청 제한 빌드에 실행해 홈 bootstrap이 만료됐다. 단순 CI 재실행이나 제품 요청 제한 변경으로 덮지 않았다.

독립 진단에서 기준 ae26ffe와 개선7e0538e 소스를 별도 보관하고, 같은 fixture·320px·CPU8·native Noto 글꼴로 비교했다. 기존 홈 검사와30초 selector 대기를 유지했다.

| 소스 | 빌드 | 결과 |
| --- | --- | --- |
| ae26ffe |300ms|원래 PICK selector30초 timeout·0행·bootstrap 오류 DOM|
|7e0538e|300ms|같은 timeout·0행·오류 DOM|
| ae26ffe |운영 요청 제한|홈 검사 통과·3행·6.00초|
|7e0538e|운영 요청 제한|홈 검사 통과·3행·4.89초|

운영 bootstrap은 초기 시작에서2.029초/1.550초에 성공했고,300ms 빌드는 rebudget 후 timeout으로 거절했다. 초기 글꼴 설정이 잘못된 진단은 별도 보존하고 근거에서 제외했다. 증거는 ignored `artifacts/memory-deploy-diagnosis/`에 있다.

## 최소 수정과 보존 계약

`.github/workflows/mobile-release-qa.yml`에서 기존 `Run mobile release QA` 단계만 이미 존재하는 운영 빌드 다음으로 이동했다. 앞선300ms 빌드와 다른 fail-fast 검사는 유지한다. 원래 검사 스크립트·fixture·assertion·대기 제한·제품 코드·API/캐시/flag는 바꾸지 않는다.

비교 요청은 명시적으로8초 timeout을 사용하므로 기본 제한과 별개다. 운영 빌드에 원래9초 slow fixture와10초 대기/오류 문구 검사를 그대로 실행해 요청이7.999초에 중단되고8.31초에 통과함을 확인했다.503/offline 검사도 원래 전체 스크립트로 유지한다.

새 Node 회귀는 전체 모바일 검사가 운영 빌드 뒤에 있고 기존3개 초기 검사는300ms 빌드 구간에 남는지 확인한다. 수정 전에 실패한 뒤 단계 이동 후 통과했다. 독립 검토 결과 검사 완화 없음.

통합 로컬 검증: `npm run build`가 Node968/968·운영 web build·직접 진입31경로를 통과했다. native-font 환경에서 수정하지 않은 `node tests/mobile_release_qa.mjs` 전체가 exit0으로 responsive widths/selector viewport/503/timeout/offline 검사를 통과했다. 제품 소스와 원래 모바일 검사 스크립트 diff는 없다.

## 배포 절차와 범위

기존 Chart View 워크스페이스의 정적 서비스 `srv-dao4n4mk1f9s73algnf0`는 `feat/apps-in-toss-mvp`를 추적하고 자동 배포한다. 기존 live deploy는 `dep-dbju7rlg1s2s738djn30`/ae26ffe다. PR 검증 후 main 병합, 정확한 main SHA의 기존 Sync Render QA, 배포 브랜치 승격과 자동 배포를 사용한다. gate를 건너뛰거나 동일 커밋을 중복 수동 배포하지 않는다.

검증·배포의 최종 결과는 PR158의 정확한 커밋별 checks와 Render deploy에 연결한다. 운영 URL·배포 SHA·실제 화면을 함께 확인한다. Render 프런트 배포와 실제 Android/iOS Toss Sandbox/공개 심사는 구분한다.
