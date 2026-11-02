# 기업 공부 — 실제 제품 사진 자산 등록 기준

차트뷰 토스의 카드형 학습 사진은 \`src/learningProductPhotos.js\`의 검증된 목록을 통해 표시합니다. **이미지 파일 자체는 현재 Wikimedia Commons에서 제공하는 960px 외부 썸네일**이며, 저장소에 복제해 보관한 파일은 아닙니다. 외부 이미지 서비스 이용 불가 시 개념도가 대체됩니다.

## 2026-11-02 사진 출처 및 사용 권리

| 종목 | 사진 내용 | 구분 | 저작자 | 라이선스 | 원본·조건 |
| --- | --- | --- | --- | --- | --- |
| 003230 삼양식품 | 조리한 불닭볶음면 | 실제 해당 기업 제품 | Mobius6 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Buldak_Ramen_20210114_004.jpg |
| 000660 SK하이닉스 | Computex 2025 SOCAMM 모듈 | 실제 해당 기업 제품(당시 전시 제품) | 4300streetcar | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:SK_Hynix_SOCAMM_module_Computex_2025.jpg |
| 005930 삼성전자 | SSD 990 PRO 4TB | 실제 해당 기업 제품 | Dinkun Chen | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:SAMSUNG_M.2_NVMe_SSD_990_PRO_4TB_(2).jpg |
| 062040 산일전기 | 일반 변전소 변압기 | **산업 대표사진** — 산일전기 제조품 아님 | Wikideas1 | CC0 1.0 | https://commons.wikimedia.org/wiki/File:Transformer_at_substation.jpg |

*위에 나온 CC BY/CC BY-SA 사진은 촬영자, 라이선스, 원본 링크 및 편집(썸네일 축소) 사실을 UI에 함께 표시합니다. 사진의 상표/브랜드 표시는 사진 저작권 허락과 별개이며 기업의 앱 후원을 뜻하지 않습니다.*

## APR(278470)

현재 공유 재사용 라이선스가 검증된 **에이피알/메디큐브 실물 제품 사진은 확보하지 못했습니다.** 이에 따라 회사 제품으로 오인될 이미지를 자동 수집하지 않습니다. 제품 설명·산업 개념도와 더불어 [메디큐브 공식 AGE-R 라인업](https://www.themedicube.kr/age-r/main2.html)으로 이동하는 버튼을 제공하며, 공식 웹사이트의 사진 자체를 차트뷰 서버에 복제하지 않습니다.

## 새로운 사진 등록 절차

1. 특정 **국내 상장사 종목코드와 실물 제품 모델**이 일치하는지 먼저 확인합니다. 산업 대표사진과 기업 전용 제품 사진을 절대 혼용하지 않습니다.
2. 소유자·출처·라이선스·재사용 조건(상업용 허용 여부, 표시 의무)을 사진별로 검토합니다. 공식 쇼핑몰·증권사 리포트의 이미지를 사용 허락 없이 복사하면 안 됩니다.
3. 검토된 사진만 \`PHOTOS\`에 \`type\`, \`title\`, \`description\`, \`imageUrl\`, \`sourceUrl\`, \`creator\`, \`license\`, \`licenseUrl\`, \`reviewDate\`, \`modification\`과 함께 등록합니다.
4. 이미지 원본 출처와 라이선스 조건 링크가 UI에서 열린다는 점과 사진 로딩 실패 폴백을 기기별로 확인합니다.
5. CC BY-SA 파일을 편집 또는 재배포할 때 원문 라이선스의 동일조건변경허락(ShareAlike) 의무를 준수합니다. 사진의 재가공/자르기 정책은 별도 검토합니다.

## 운영상 제한

- Commons 호스트가 이미지 응답을 제한하거나 연결이 끊기면 앱에서 제공하는 기존 SVG 산업 개념도가 우선 작동합니다.
- 종목별 사진 범위는 위 표의 4개입니다. 앱 전체 수천 개 기업이 전부 실물 사진을 가진 것처럼 표현하지 않습니다.
- 원본 사진과 수업 실적/DART 데이터는 독립적입니다. 사진 촬영 시점이 기업의 현재 제품 라인업을 보증하지 않습니다.
