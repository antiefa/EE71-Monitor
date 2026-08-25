# EE71 Monitor

[Русская версия](README.md)

EE71 Monitor is an unofficial Chrome, Opera, Yandex Browser, and Firefox extension that shows the status of an **Alcatel EE71** mobile router. It reads data directly from the router on the local network and does not send it to external services.

The current version for every browser is `1.5.2`. The Firefox package is universal for desktop and Firefox for Android 142+.

[Install EE71 Monitor from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/ee71-monitor/)

> This project is not affiliated with Alcatel, TCL, or any mobile operator. Compatibility may depend on router firmware.

## Features

- battery level, mobile network, network type, signal, connection, and roaming status;
- 2.4 and 5 GHz Wi‑Fi status, SSID, and connected-device counts;
- automatic and manual refresh;
- one-click router-address permission in the popup with an automatic retry after access is granted;
- charging detection from the router's battery status with battery growth as a fallback;
- an aligned blue Charging label with a blinking yellow bolt and a smooth moving highlight on each battery bar;
- configurable toolbar badge: hidden, `51%` or `51`, with a narrow blue `↯51` badge or color only while charging; the action icon stays unchanged;
- clickable router address and a home button that open the router home page;
- customizable low-battery and full-charge notifications;
- four popup layouts: Grid, Network Focus, Two Rings, and Dark Header;
- Russian and English interfaces with light and dark themes;
- local operation without analytics, advertising, or cloud services.

The browser controls the badge font size, so the extension cannot provide a font-size setting.

## Development installation

Create the browser builds first:

```bash
node scripts/build.mjs
```

### Chrome and Opera

1. Open `chrome://extensions/` or `opera://extensions/`.
2. Enable developer mode.
3. Choose “Load unpacked” and select `build/chrome`.

### Yandex Browser

1. Open `browser://extensions/` or `chrome://extensions/`.
2. Enable developer mode.
3. Load the `build/yandex` directory.

### Firefox desktop

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose “Load Temporary Add-on”.
3. Select `build/firefox/manifest.json`.

Temporary add-ons are removed after Firefox restarts. Mozilla must sign an XPI for permanent installation.

### Firefox for Android

The same `build/firefox` directory and XPI support desktop Firefox and Firefox for Android 142+. To run it temporarily on Android, use a current `web-ext` and ADB:

```bash
npx --yes web-ext@latest run --target firefox-android --source-dir build/firefox --adb-device DEVICE_ID --firefox-apk org.mozilla.firefox
```

## Configuration

The default router address is `192.168.1.1`. You can enter another IP address, hostname, and optional port, such as `192.168.1.1:8080`. When settings are saved, the browser asks for access to the selected address.

The settings tabs control the refresh interval, notifications, language, popup layout, and toolbar battery display. In the popup, both the router address and home button open the router home page.

Extension updates preserve saved settings; initialization only adds options introduced by a newer version.

Charging is detected from the battery-status field reported by the EE71. If a firmware does not provide this field, the extension falls back to a battery increase between consecutive successful refreshes.

## Permissions

| Permission | Purpose |
|---|---|
| `storage` | Stores settings and the latest status in the browser |
| `alarms` | Periodic refresh |
| `notifications` | Battery notifications |
| `declarativeNetRequestWithHostAccess` | Performs a router-compatible local status request |
| optional `http://*/*` | Access to the router address after user confirmation |

The extension does not change router settings or share router data with third parties. See the [privacy policy](PRIVACY.md).

## Builds and tests

`node scripts/build.mjs` creates:

- `build/chrome` for Chrome and Opera;
- `build/firefox` for desktop and Android Firefox;
- `build/yandex` for Yandex Browser.

Run the unit tests with:

```bash
node tests/common.test.js
```

Ready-to-install version 1.5.2 archives are in `dist/`. See [SOURCE_BUILD.md](SOURCE_BUILD.md) for reproducible build instructions and [CHANGELOG.md](CHANGELOG.md) for release history.

## Support and license

Report bugs and suggestions in [GitHub Issues](https://github.com/antiefa/EE71-Monitor/issues).

Author: [antiefa](https://github.com/antiefa). Licensed under the [MIT License](LICENSE).
