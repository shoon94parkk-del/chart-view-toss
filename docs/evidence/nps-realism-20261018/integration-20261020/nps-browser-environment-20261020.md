# Browser QA environment — 2026-10-20

Scope: restored only local OS/browser/font environment. No product source, tests, package lock, branch, dist or shared QA outputs were edited; no product/full QA suite was run here.

## Run product QA

```sh
cd /workspace/chart-view-toss
FONTCONFIG_FILE=/tmp/chartview-fonts-system.conf PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 npm run qa:prepush
```

Keep inherited proxy and CA/TLS variables. Do not change app code or weaken assertions for these environment issues.

## Fresh actual-browser proof

Playwright 1.55.0. Both probes exited 0, creating a page, setting Korean/Latin/numeric text, checking `document.body.innerText`, font measurements and screenshots. Both screenshots were visually inspected and contain normal glyphs.

| Browser | Version | Korean title height | 16px `KOSPI 21.5%` width |
| --- | --- | --- | --- |
| Chromium | 140.0.7339.16 | 35px | 98.71875px |
| WebKit | 26.0 | 35px | 98.71875px |

Chromium CDP confirms Noto Sans CJK KR renders Korean and Liberation Sans renders Latin. The config includes `/etc/fonts/fonts.conf` and prepends Liberation Sans, leaving installed CJK glyph fallback available. It does not force Latin into Noto, which previously made an unchanged compact PICK row exceed 64px.

Evidence lives outside product repositories:

- `/workspace/nps-browser-proof-20261020/chromium.json`, `webkit.json`
- `/workspace/nps-browser-proof-20261020/chromium.png`, `webkit.png`
- durable copies: `probe.mjs`, `fontconfig.xml`

Repeat:

```sh
FONTCONFIG_FILE=/tmp/chartview-fonts-system.conf node /workspace/nps-browser-proof-20261020/probe.mjs chromium
FONTCONFIG_FILE=/tmp/chartview-fonts-system.conf PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 node /workspace/nps-browser-proof-20261020/probe.mjs webkit
```

## Why WebKit needs local libraries

The replacement machine is Debian 13 trixie. Browser cache persisted but previous `/tmp/chartview-browser-libs` did not, leaving dangling cache links. Actual `ldd` initially found missing woff2/harfbuzz-icu; page creation also needed dynamically loaded GLESv2. GTK dependencies were restored as well and all stale links are repaired.

Signed Debian indexes/packages were fetched using the existing `/etc/apt/sources.list.d/caas-snapshot.list` and Debian archive keyring (signature verification remained enabled). Existing snapshot 20260925T181338Z uses `check-valid-until=no` in the preconfigured source, unchanged. Inherited HTTP(S) proxy and CA trust were preserved. No sudo/system install/TLS override was used. Rootless apt index/cache directory: `/tmp/chartview-browser-apt`; package extraction: `/tmp/chartview-browser-libs`.

Packages restored: `libwoff1`, `libharfbuzz-icu0`, `libgtk-4-1`, `libgraphene-1.0-0`, `libhyphen0`, `libmanette-0.2-0`, `libcairo-script-interpreter2`, `libhidapi-hidraw0`, `libgles2`, `liblzo2-2`, `libglvnd0`.

Libraries are linked into `/home/agent/.cache/ms-playwright/webkit-2203/minibrowser-{wpe,gtk}/sys/lib`. The cache wrapper resets `LD_LIBRARY_PATH`, so merely exporting the extraction directory does not fix launch. Final wrapper-equivalent ldd checks report no missing libraries for either MiniBrowser and no dangling links remain.

An actual WebKit launch/page/screenshot was first verified using explicit executablePath `/home/agent/.cache/ms-playwright/webkit-2203/pw_run.sh`, without skipping validation. Normal Playwright bundled-launch host preflight still reports host `libGLESv2.so.2` missing because user-local libraries are absent from system ldconfig. Only after the actual launch was verified, the normal launch was repeated with `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` and passed. This skips that host precheck only, not runtime loading, page rendering, assertions or tests.

## Limits

This proves browser execution and font rendering, not product regressions or native device correctness. Parent task must run product QA. `/tmp` paths and browser cache library links must be restored if the machine is replaced again; the durable config/probe copies above remain available. Browser logs include WebKit's automation-context fallback warning; page creation, rendered content and screenshots pass.
