**REA 실행 근거 — 2026-10-16**

기존 설치 rea-agents 6.4.0 CLI를 사용했다. Playwright는 소유한 익명 Chromium 창의 탐색·클릭·스크롤만 수행했고, REA는 CDP 대상 목록 확인 후 접근성 트리와 가시 뷰포트 스크린샷을 수동 관찰했다. REA가 직접 페이지를 조작했다는 의미가 아니다.

전체 canonical JSON은 rea/에 보관했다. 아래 PNG는 REA artifact base64를 그대로 디코딩했고, artifact.sha256과 매번 대조했다. 문서/SSR 자료는 official-sources/에 별도 보관했다.

|화면|작업|Evidence ID|산출물|
|---|---|---|---|
|01-home-desktop|inspect-web-page|`ev_d480b4ca4857b79aa2dd3c274ceef30568c8c4c412a4d04665f26e998bf58233`|[rea/01-home-desktop.inspect-web-page.json](rea/01-home-desktop.inspect-web-page.json)|
|01-home-desktop|capture-web-screenshot|`ev_b73bbb87a95c58fc93cf85c0422015eb69feae9924037a0bd4a624b247da4f36`|[rea/01-home-desktop.capture-web-screenshot.json](rea/01-home-desktop.capture-web-screenshot.json)|
|02-good-but-fell|inspect-web-page|`ev_dcbfa5e343d792e98e2af86f064f2799b5cd63330d099592419def8ba6017952`|[rea/02-good-but-fell.inspect-web-page.json](rea/02-good-but-fell.inspect-web-page.json)|
|02-good-but-fell|capture-web-screenshot|`ev_73bb97df83f6617a37c5b98cb1230a69855da3e5f380cab1311681c16968e09a`|[rea/02-good-but-fell.capture-web-screenshot.json](rea/02-good-but-fell.capture-web-screenshot.json)|
|03-nvda-desktop|inspect-web-page|`ev_da3253291fd2fa3860d37c583cc9b0a289a265aec586c2b71b75cd0ea66ca167`|[rea/03-nvda-desktop.inspect-web-page.json](rea/03-nvda-desktop.inspect-web-page.json)|
|03-nvda-desktop|capture-web-screenshot|`ev_f2657fe4cd8b44344b9f05465b0012cccb8363424cf8123b868deec59cb40955`|[rea/03-nvda-desktop.capture-web-screenshot.json](rea/03-nvda-desktop.capture-web-screenshot.json)|
|04-nvda-mobile|inspect-web-page|`ev_6fed01807a20d27fd993afc659630bf654f3b6ad8b869ac286e4326b9865d2b0`|[rea/04-nvda-mobile.inspect-web-page.json](rea/04-nvda-mobile.inspect-web-page.json)|
|04-nvda-mobile|capture-web-screenshot|`ev_740a5c7c0f7225ba9d912b2be2868c20a7da4129d45390311f6f9b6a23f2e759`|[rea/04-nvda-mobile.capture-web-screenshot.json](rea/04-nvda-mobile.capture-web-screenshot.json)|
|05-nvda-call-mobile|inspect-web-page|`ev_c18a95c6cb721191bf604a4495bac07823dba4c8b9aa745f19276ffd9e1516d2`|[rea/05-nvda-call-mobile.inspect-web-page.json](rea/05-nvda-call-mobile.inspect-web-page.json)|
|05-nvda-call-mobile|capture-web-screenshot|`ev_3509ed4a414f3fba65a9f24522cde430f4c411f9d572419b7a360747dd473c01`|[rea/05-nvda-call-mobile.capture-web-screenshot.json](rea/05-nvda-call-mobile.capture-web-screenshot.json)|
|06-calendar-mobile|inspect-web-page|`ev_0360d24f28e0e16e5f579aca481b29904890a22d11b3440d6eeb6d8f03780945`|[rea/06-calendar-mobile.inspect-web-page.json](rea/06-calendar-mobile.inspect-web-page.json)|
|06-calendar-mobile|capture-web-screenshot|`ev_35c750677f2802f057c38ec5ef2f1a2f51af80bc1d766c2b6e28df3690178289`|[rea/06-calendar-mobile.capture-web-screenshot.json](rea/06-calendar-mobile.capture-web-screenshot.json)|
|07-calendar-results-mobile|inspect-web-page|`ev_e52a7b553359c1b4a64120d9aed8d4cd02647250abd225967e191464ee5e2b4e`|[rea/07-calendar-results-mobile.inspect-web-page.json](rea/07-calendar-results-mobile.inspect-web-page.json)|
|07-calendar-results-mobile|capture-web-screenshot|`ev_6061d92dffd0e0cc7ff16a4194220f88df3888955dd609df5a15e226d30421b6`|[rea/07-calendar-results-mobile.capture-web-screenshot.json](rea/07-calendar-results-mobile.capture-web-screenshot.json)|
|08-brief-mobile|inspect-web-page|`ev_bc17cf973864fd9832e3355621647aeab7230b891eb17a724b79f9d64248bb50`|[rea/08-brief-mobile.inspect-web-page.json](rea/08-brief-mobile.inspect-web-page.json)|
|08-brief-mobile|capture-web-screenshot|`ev_1be9c851543dddadf557bb30b81cd38e1493ced200732b9d1b7a94d8d8dc4243`|[rea/08-brief-mobile.capture-web-screenshot.json](rea/08-brief-mobile.capture-web-screenshot.json)|
|09-season-mobile|inspect-web-page|`ev_996da3e0ed4b4dfeaf2ca752f372ee107ff6dabc67cea0472f549db111021ad2`|[rea/09-season-mobile.inspect-web-page.json](rea/09-season-mobile.inspect-web-page.json)|
|09-season-mobile|capture-web-screenshot|`ev_3aca239c9c3b5f2f906e8799ee187585d969fdd4f29a35a063d1976b63a08804`|[rea/09-season-mobile.capture-web-screenshot.json](rea/09-season-mobile.capture-web-screenshot.json)|
|10-home-mobile|inspect-web-page|`ev_57dd03f3745f9fb7d3e73d30b28c392a0569d7548e072406be6c56a4154d0c4a`|[rea/10-home-mobile.inspect-web-page.json](rea/10-home-mobile.inspect-web-page.json)|
|10-home-mobile|capture-web-screenshot|`ev_8e1d4cfa221fa0e1231cc5cc2bd4cd6ceabb551cd2bd40e4920a8cfcfee27f82`|[rea/10-home-mobile.capture-web-screenshot.json](rea/10-home-mobile.capture-web-screenshot.json)|
|11-chartview-live-desktop|inspect-web-page|`ev_37ff32cbcc3e8cab1cb731a1858689c72fe5e3263e6cbd11a42108839e4991e9`|[rea/11-chartview-live-desktop.inspect-web-page.json](rea/11-chartview-live-desktop.inspect-web-page.json)|
|11-chartview-live-desktop|capture-web-screenshot|`ev_6da7feef330ff08bd7cb78d25b29bccdf315c8b26b07a36851cfd86010166569`|[rea/11-chartview-live-desktop.capture-web-screenshot.json](rea/11-chartview-live-desktop.capture-web-screenshot.json)|
|12-chartview-live-mobile|inspect-web-page|`ev_7ffdf6da705b9209476d60e830fe814714d4961e40b29cd6811000c9803bd132`|[rea/12-chartview-live-mobile.inspect-web-page.json](rea/12-chartview-live-mobile.inspect-web-page.json)|
|12-chartview-live-mobile|capture-web-screenshot|`ev_58daed20cef5fd0aa513ceb6550ab14cfeeb4960acf18d51c167f322d9008993`|[rea/12-chartview-live-mobile.capture-web-screenshot.json](rea/12-chartview-live-mobile.capture-web-screenshot.json)|
|13-chartview-live-macro|inspect-web-page|`ev_522522b812eab6bf44cb9e8e1ff4c5b5c9145b0c4e85993127173d3597edf2c7`|[rea/13-chartview-live-macro.inspect-web-page.json](rea/13-chartview-live-macro.inspect-web-page.json)|
|13-chartview-live-macro|capture-web-screenshot|`ev_7ebc8a9ba88bb0851021e318c3c941cde2a9febb6bb400e5ef4fc6c2e807e906`|[rea/13-chartview-live-macro.capture-web-screenshot.json](rea/13-chartview-live-macro.capture-web-screenshot.json)|

**PNG SHA256**

- [01-home-desktop.png](screens/01-home-desktop.png): `bc46777f773ac44e6ee8f679027aa004d324cfb9a588febc2c2c47e421b5d8e2`
- [02-good-but-fell.png](screens/02-good-but-fell.png): `69c8b159d24002823d31542d1fb5b42a4ec3d13ea2e0d7fd5d7afd209ca4ee7a`
- [03-nvda-desktop.png](screens/03-nvda-desktop.png): `6f6436cdf2ea25389e6db18b115675b2c15ad60bc276721b2983759ce9d33d18`
- [04-nvda-mobile.png](screens/04-nvda-mobile.png): `9fe833ed94561ab14d35d54cb9cd2f0cd9ef77f59f2bdb70c3dcf64195689c3e`
- [05-nvda-call-mobile.png](screens/05-nvda-call-mobile.png): `6fd409a0d1bc8d539c6922e73382fb57988f16e81b4e1ab341a6842477e05014`
- [06-calendar-mobile.png](screens/06-calendar-mobile.png): `7cb51b2afcba8d2425823b9159497f11fa23d7c934d8fb053159a633bab60624`
- [07-calendar-results-mobile.png](screens/07-calendar-results-mobile.png): `1cb07b5da2b0ee2f72e84465eeff82bec4eed711db4e8251f71da9ee86b53af9`
- [08-brief-mobile.png](screens/08-brief-mobile.png): `0b6bbcc40612a1df60d27bb9bf7d5dd0d3dc5585594eb51d5ba5e4f5d6232119`
- [09-season-mobile.png](screens/09-season-mobile.png): `8bc5bd27aeb4059fe2d931c6e0ddeae05b4af7ebc132d522a0f010b744063a53`
- [10-home-mobile.png](screens/10-home-mobile.png): `0dff9fcbdf20a9387171f04e653aaa4ff05a9bcd16cf2e5419fdf632cfe88447`
- [11-chartview-live-desktop.png](screens/11-chartview-live-desktop.png): `ece59a6d2eb25e5cd906602360557d9912d5546f6e3c6fa531d1692d1b02575e`
- [12-chartview-live-mobile.png](screens/12-chartview-live-mobile.png): `8277d721a385d6953f03283dd0c7251b9aaa9357f4e0ab5d24d65fa5a262db64`
- [13-chartview-live-macro.png](screens/13-chartview-live-macro.png): `d3fd97c72174cbe13f4fd78453b74ad3ac1c055acd3fe4311ef2b3c09da40dc9`

총 13개 화면 상태, REA inspect/screenshot 26개 레코드와 대상 목록 13개. 10개 상태는 AFTERNS, 3개 상태는 운영 Chart View다.

13번 매크로 화면은 Playwright에서 `https://chart-view-toss.onrender.com/#macro`로 이동했다. REA의 committed target URL에는 fragment가 생략되어 `/`로 남아 있다. canonical 출력은 수정하지 않았으며 화면 내용·driver sidecar와 함께 해석한다.

**해석 한계**

- 스크린샷은 해당 순간의 가시 화면이며 전체 페이지·전수 테스트가 아니다. 데스크톱 1440×1000, 모바일은 동일 Chromium에서 390×844로 관찰했다. 실제 iPhone/WebKit/Toss Sandbox 검증이 아니다.
- REA 접근 이후의 짧은 관찰 창만 포함한다. 이전 네트워크 활동, 타 도메인 호출, 로그인 후 데이터는 전체 관찰 범위에 포함되지 않는다.
- 쿠키·저장소 값·원시 네트워크 본문·원시 헤더·콘솔 객체를 수집하지 않았다. 데이터 정확성, 지연 SLA, 접근성 전수·성능 비교는 검증하지 않았다.
- Good but fell 버튼 클릭은 로그인 안내로 끝났다. 로그인·댓글·투표·구독·캘린더 추가·피드백 전송을 진행하지 않았다.
- 운영 Chart View 홈은 초기 로딩 화면 이후 실제 시세와 수출 요약이 표시되는 상태를 관찰했다. 오늘의 정확한 운영 커밋 SHA를 역으로 추정하지 않았다.
