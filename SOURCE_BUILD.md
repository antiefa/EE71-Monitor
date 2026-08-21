# Source build instructions

EE71 Monitor 1.4.0 contains readable JavaScript, HTML, and CSS. It does not use minification, obfuscation, bundling, transpilation, generated JavaScript, or third-party runtime libraries.

## Requirements

- Node.js 18 or later.
- No package installation or network access is required for the build.

## Reproduce all browser builds

Run from the source archive root:

```bash
node scripts/build.mjs
```

The script copies the shared files from `extension/` and selects the appropriate manifest:

- `extension/manifest.json` → `build/chrome/manifest.json`;
- `extension/manifest.firefox.json` → `build/firefox/manifest.json`;
- `extension/manifest.yandex.json` → `build/yandex/manifest.json`.

No source file contents are transformed.

## Tests

```bash
node tests/common.test.js
npx --yes web-ext@latest lint --source-dir build/firefox --output text --no-input
```

The optional lint command downloads Mozilla's `web-ext` tool if it is not already installed. It is not part of the build.
