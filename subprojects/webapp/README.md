# Ground Rupture Explorer — web application

The scenario page's application: TypeScript bundled by esbuild, built and
tested through the Gradle subproject `:subprojects:webapp`
([`docs/app/ddd.md` §2](../../docs/app/ddd.md#2-repository-structure-naming-and-toolchain)).

## Browser test lane

The lane ([`docs/app/ddd.md` §7.5](../../docs/app/ddd.md#75-browser-test-lane))
drives Playwright's pinned Chromium through the eleven functional specs of
`playwright/specs/`, in the projects `desktop` and `mobile`, against the
strict preview build `subprojects/mkdocs/site-preview/`, served by
`playwright/serve.mjs` under the site's published path. It runs locally on
request and is required before a release (release checklist, item 4); it
joins no lifecycle task and no CI job.

From the repository root:

```sh
./gradlew :subprojects:webapp:webappBrowserTest
```

`webappBrowserTest` first builds the preview tree (`mkdocsPreview`) and
installs the pinned Chromium (`playwrightInstall`, the npm script
`browser-install`), then runs the npm script `browser-test`,
`playwright test --project=desktop --project=mobile`. The JSON report is
written to `build/playwright/report.json` and the traces to
`build/playwright/test-results/`.

## Measurement diagnostic

The `measure` project
([`docs/app/ddd.md` §7.6](../../docs/app/ddd.md#76-performance-and-compatibility-measurements))
never runs in the lane. Run anywhere but the reference environment, it is
a diagnostic, and no Gradle task runs one. First install the pinned
Chromium from the repository root:

```sh
./gradlew :subprojects:webapp:playwrightInstall
```

then, in `subprojects/webapp`, in the one form of Node.js outside Gradle
([`docs/app/ddd.md` §2](../../docs/app/ddd.md#2-repository-structure-naming-and-toolchain)):

```sh
export PATH="$(ls -d "$PWD"/.gradle/nodejs/node-v22.12.0-*)/bin:$PATH"
npx playwright test --project=measure --workers=1
```
