# Changelog

All notable changes to EE71 Monitor are documented in this file.

## 1.5.0 — 2026-08-23

- Added charging detection when the battery level increases between consecutive successful refreshes.
- Added a blue moving-stripe charging animation in the popup and a charging variant of the toolbar icon.
- Added toolbar badge settings: show or hide the value, include or omit the percent sign, and choose lightning plus color or color only while charging.
- Added a clickable router address and a home button beside Settings without changing the approved popup layout.
- Unified the Firefox desktop and Android 142+ builds in one package.
- Reworked the Russian and English project descriptions around user-facing features and installation.

## 1.4.1 — 2026-08-22

- Added Firefox for Android 142+ compatibility to the standard Firefox package, making one XPI work on desktop and Android.
- Expanded Mozilla source-review instructions with the reference environment, Node.js installation, and exact Firefox reproduction steps.

## 1.4.0 — 2026-08-21

- Added a localized About tab with a feature overview, privacy explanation, project links, copyright, and MIT license link.
- Added the current extension version from the active browser manifest to the settings header and About tab.
- Added GitHub `homepage_url` metadata to every browser manifest.
- Added copyright, SPDX license, and source repository headers to maintained JS, CSS, HTML, build, and test files.
- Improved mobile settings navigation to a compact two-column tab grid.
- Prepared a complete Chrome Web Store submission kit and refreshed Opera and Firefox store assets.
- Removed the duplicate visible Language label while preserving an accessible label for the selector.

## 1.3.1 — 2026-08-21

- Refined popup sizing and consistent internal rounded frame for Chromium browsers.
- Fixed the dark-layout error panel and network-type badge alignment.
- Replaced internal `build.js` references in user-facing errors with clear data-loading messages.
- Improved the two-ring layout preview, notification field labels, and automatic-language hint.
- Added refreshed store and project documentation.

## 1.3.0 — 2026-08-21

- Added four selectable popup layouts: Grid, Network Focus, Two Rings, and Dark Header.
- Added compact 2.4 GHz and 5 GHz Wi-Fi details with SSID and client counts.
- Added `NetworkType` display and colored signal, Wi-Fi, connection, and roaming states.
- Reduced the desktop popup width to 300 px and refreshed the settings previews.

## 1.2.0 — 2026-08-21

- Added selectable popup layouts and battery percentage badge styling.
- Added display mapping for the router `NetworkType` value.

## 1.1.0 — 2026-08-21

- Introduced the compact Android/Chrome-inspired interface and tabbed responsive settings.
- Added separate Chrome, Firefox, and Yandex Browser builds.
- Added configurable full-charge and low-battery notifications.

## 1.0.0 — 2026-08-21

- Initial release with Alcatel EE71 status retrieval, battery monitoring, and localization.
