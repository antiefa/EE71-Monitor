# EE71 Monitor

[Русская версия](README.md)

EE71 Monitor is an unofficial browser extension for Chrome, Yandex Browser, Opera, and Firefox. It displays the current state of an **Alcatel EE71 mobile router**, including battery level, mobile network, signal strength, roaming, connection state, and connected clients.

The extension reads system information exposed by the router's home page on the local network without administrator authentication. It does not change router settings or transmit router information to external services.

Current version: `1.4.0`.

> This community project is not affiliated with or endorsed by Alcatel, TCL, or any mobile operator. Compatibility may depend on the router firmware version.

## Features

- Configurable router IP address with optional port.
- Local JSON-RPC `GetSystemStatus` polling.
- Router availability indicator and manual refresh.
- Battery percentage in the popup and toolbar badge.
- Configurable one-time low-battery and full-charge notifications.
- Mobile network name and type, signal strength, roaming, and connection state.
- Separate 2.4 GHz and 5 GHz Wi-Fi state, SSID, and connected-client counts.
- Four popup layouts: Grid, Network Focus, Two Rings, and Dark Header.
- Responsive tabbed settings page.
- About page with the manifest version, feature summary, privacy information, project links, license, and copyright.
- Russian and English interface with automatic browser-language selection.
- No external servers, analytics, or advertising.

## Install from an unpacked build

### Chrome and Opera

1. Open `chrome://extensions/` in Chrome or `opera://extensions/` in Opera.
2. Enable developer mode.
3. Choose **Load unpacked**.
4. Select `build/chrome`.
5. Open the extension settings, save the router address, and grant access to that host.

### Yandex Browser

Open `browser://extensions/`, enable developer mode, choose **Load unpacked**, and select `build/yandex`.

### Firefox

Open `about:debugging#/runtime/this-firefox`, select **Load Temporary Add-on**, and choose `build/firefox/manifest.json`.

The XPI in `dist` is unsigned. Permanent installation in regular Firefox requires Mozilla signing.

## Build

The project has no runtime dependencies and does not use minification or bundling. Node.js 18 or newer is sufficient to prepare browser-specific folders:

```bash
node scripts/build.mjs
```

Source code is stored in `extension/`. The build script copies the shared files and selects the appropriate Manifest V3 file for each browser.

## How it works

1. The extension loads `http://[router]/pc/dist/build.js` and extracts `_TclRequestVerificationKey` and an optional static `_TclRequestVerificationToken`.
2. It sends the `GetSystemStatus` JSON-RPC request to `http://[router]/jrd/webapi`.
3. The result is stored locally and displayed in the popup.

The extension uses `credentials: omit` and does not access administrator cookies. It requests optional HTTP host permission only for the router host entered by the user.

## Permissions

| Permission | Purpose |
|---|---|
| `storage` | Store settings and the latest router state locally |
| `alarms` | Periodically refresh router state |
| `notifications` | Show configured battery notifications |
| `declarativeNetRequestWithHostAccess` | Add the router-required `Referer` header only to its status API request |
| Optional `http://*/*` host access | Request access to the specific router address entered by the user |

## Testing

```bash
node --check extension/common.js
node --check extension/i18n.js
node --check extension/background.js
node --check extension/popup.js
node --check extension/options.js
node tests/common.test.js
npx --yes web-ext@latest lint --source-dir build/firefox --output text --no-input
```

## Privacy and support

Read the [privacy policy](PRIVACY.md). Report bugs and request features through [GitHub Issues](https://github.com/antiefa/EE71-Monitor/issues).

## License

Copyright © 2026 [antiefa](https://github.com/antiefa). Released under the [MIT License](LICENSE).
