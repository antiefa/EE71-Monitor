# Source build instructions

EE71 Monitor 1.5.1 contains readable JavaScript, HTML, and CSS. It does not use minification, obfuscation, bundling, transpilation, generated JavaScript, or third-party runtime libraries.

## Requirements

- Linux, macOS, or Windows;
- Node.js 18 or later;
- no npm packages or network access are required for the build.

The reference package was prepared on Linux x86_64 with Node.js 24.19.0.

## Reproduce the submitted files

1. Extract the source archive into an empty directory.
2. Open a terminal in its root.
3. Run:

   ```bash
   node scripts/build.mjs
   ```

The script copies the readable source files without transforming them and creates:

- `build/chrome` from `extension/manifest.json`;
- `build/firefox` from `extension/manifest.firefox.json` for desktop and Android Firefox;
- `build/yandex` from `extension/manifest.yandex.json`.

The contents of `build/firefox` correspond to the root of the submitted universal Firefox XPI.

## Optional verification

```bash
node tests/common.test.js
npx --yes web-ext@latest lint --source-dir build/firefox --output text --no-input
```

The test and lint commands are optional and are not part of the reproducible build. `web-ext` may be downloaded by `npx`; the build itself requires no downloads.

All maintained JavaScript, HTML, CSS, localization, manifest, build-script, and test files are the original human-readable sources.
