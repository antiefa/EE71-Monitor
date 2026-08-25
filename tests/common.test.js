/*
 * EE71 Monitor
 * Copyright (c) 2026 antiefa
 * SPDX-License-Identifier: MIT
 * Source: https://github.com/antiefa/EE71-Monitor
 */

"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

require("../extension/common.js");
require("../extension/i18n.js");

const {
  DEFAULT_SETTINGS,
  api,
  batteryBadgeText,
  batteryLevel,
  extractVerificationValues,
  isBatteryCharging,
  networkType,
  normalizeRouterAddress,
  sanitizeSettings,
  shouldNotifyFullCharge
} = globalThis.EE71;
const { resolveLocale, translate } = globalThis.EE71_I18N;

const manifest = JSON.parse(
  readFileSync(join(__dirname, "../extension/manifest.json"), "utf8")
);
const firefoxManifest = JSON.parse(
  readFileSync(join(__dirname, "../extension/manifest.firefox.json"), "utf8")
);
const yandexManifest = JSON.parse(
  readFileSync(join(__dirname, "../extension/manifest.yandex.json"), "utf8")
);

assert.equal(
  firefoxManifest.content_security_policy.extension_pages,
  "script-src 'self';"
);
assert.doesNotMatch(
  firefoxManifest.content_security_policy.extension_pages,
  /upgrade-insecure-requests/
);
assert.equal("content_security_policy" in manifest, false);
assert.equal("content_security_policy" in yandexManifest, false);
assert.equal(firefoxManifest.version, manifest.version);
assert.equal(yandexManifest.version, manifest.version);

const realFormatSample = [
  "t.http.headers.common._TclRequestVerificationKey=",
  '"KSDHSDFOGQ5WERYTUIQWERTYUISDFG1HJZXCVCXBN2GDSMNDHKVKFsVBNf",',
  '""!=i.slice(32)&&(t.http.headers.common._TclRequestVerificationToken=i.slice(32))'
].join("");

assert.deepEqual(extractVerificationValues(realFormatSample), {
  key: "KSDHSDFOGQ5WERYTUIQWERTYUISDFG1HJZXCVCXBN2GDSMNDHKVKFsVBNf",
  token: ""
});

assert.deepEqual(
  extractVerificationValues(
    'config["_TclRequestVerificationKey"]="key-value";config._TclRequestVerificationToken="token-value";'
  ),
  { key: "key-value", token: "token-value" }
);

assert.deepEqual(normalizeRouterAddress("192.168.1.1"), {
  address: "192.168.1.1",
  baseUrl: "http://192.168.1.1",
  permissionPattern: "http://192.168.1.1/*"
});

assert.deepEqual(normalizeRouterAddress("http://192.168.1.1:8080/"), {
  address: "192.168.1.1:8080",
  baseUrl: "http://192.168.1.1:8080",
  permissionPattern: "http://192.168.1.1/*"
});

assert.throws(() => normalizeRouterAddress("https://192.168.1.1"), /address_invalid/);
assert.throws(() => normalizeRouterAddress("192.168.1.1/admin"), /address_invalid/);
assert.throws(() => normalizeRouterAddress(""), /address_required/);

assert.equal(batteryLevel({ BatteryLevel: 62, bat_cap: 30 }), 62);
assert.equal(batteryLevel({ bat_cap: 101 }), 100);
assert.equal(batteryLevel(null), null);

assert.equal(batteryBadgeText(88, DEFAULT_SETTINGS, false), "88%");
assert.equal(batteryBadgeText(88, DEFAULT_SETTINGS, true), "↯88");
assert.equal(batteryBadgeText(100, DEFAULT_SETTINGS, true), "↯100");
assert.equal(
  batteryBadgeText(88, { ...DEFAULT_SETTINGS, badgeFormat: "number" }, true),
  "↯88"
);
assert.equal(
  batteryBadgeText(88, { ...DEFAULT_SETTINGS, badgeChargingStyle: "color-only" }, true),
  "88%"
);

assert.equal(isBatteryCharging(null, { BatteryLevel: 50 }), false);
assert.equal(isBatteryCharging({ BatteryLevel: 50 }, null), false);
assert.equal(isBatteryCharging({ BatteryLevel: 50 }, { BatteryLevel: 51 }), true);
assert.equal(isBatteryCharging({ BatteryLevel: 51 }, { BatteryLevel: 51 }), false);
assert.equal(isBatteryCharging({ BatteryLevel: 51 }, { BatteryLevel: 50 }), false);
assert.equal(isBatteryCharging({ BatteryLevel: 99 }, { BatteryLevel: 100 }), true);
assert.equal(isBatteryCharging(null, { BatteryLevel: 50, chg_state: 0 }), true);
assert.equal(isBatteryCharging({ BatteryLevel: 50 }, { BatteryLevel: 50, chg_state: 0 }), true);
assert.equal(isBatteryCharging({ BatteryLevel: 50 }, { BatteryLevel: 51, chg_state: 2 }), false);
assert.equal(isBatteryCharging({ BatteryLevel: 99 }, { BatteryLevel: 100, chg_state: 1 }), false);
assert.equal(isBatteryCharging(null, { BatteryLevel: 50, chg_state: "0" }), true);
assert.equal(isBatteryCharging({ BatteryLevel: 50 }, { BatteryLevel: 51, chg_state: "unknown" }), true);
assert.equal(isBatteryCharging({ BatteryLevel: 50 }, { BatteryLevel: 51, chg_state: "" }), true);
assert.equal(isBatteryCharging({ BatteryLevel: 50 }, { BatteryLevel: 51, chg_state: null }), true);

assert.deepEqual(networkType(0), { code: 0, known: true, label: "NA" });
assert.deepEqual(networkType(1), { code: 1, known: true, label: "2G" });
assert.deepEqual(networkType(2), { code: 2, known: true, label: "2G" });
assert.deepEqual(networkType(3), { code: 3, known: true, label: "3G" });
assert.deepEqual(networkType(6), { code: 6, known: true, label: "3G+" });
assert.deepEqual(networkType(8), { code: 8, known: true, label: "4G" });
assert.deepEqual(networkType(9), { code: 9, known: true, label: "4G+" });
assert.deepEqual(networkType(11), { code: 11, known: true, label: "2G" });
assert.deepEqual(networkType(10), { code: 10, known: false, label: "" });
assert.equal(networkType(undefined), null);
assert.equal(networkType(null), null);
assert.equal(networkType(""), null);

assert.equal(shouldNotifyFullCharge(null, 100), false);
assert.equal(shouldNotifyFullCharge(100, 100), false);
assert.equal(shouldNotifyFullCharge(99, 100), true);
assert.equal(shouldNotifyFullCharge(60, 100), true);
assert.equal(shouldNotifyFullCharge(99, 99), false);

assert.deepEqual(
  sanitizeSettings({ pollInterval: 0, batteryThreshold: 120, language: "de" }),
  {
    ...DEFAULT_SETTINGS,
    pollInterval: 1,
    batteryThreshold: 100
  }
);
assert.equal(sanitizeSettings({ popupStyle: "dark" }).popupStyle, "dark");
assert.equal(sanitizeSettings({ popupStyle: "unsupported" }).popupStyle, "grid");
assert.equal(sanitizeSettings({ badgeEnabled: false }).badgeEnabled, false);
assert.equal(sanitizeSettings({ badgeFormat: "number" }).badgeFormat, "number");
assert.equal(sanitizeSettings({ badgeFormat: "unsupported" }).badgeFormat, "percent");
assert.equal(
  sanitizeSettings({ badgeChargingStyle: "color-only" }).badgeChargingStyle,
  "color-only"
);
assert.equal(
  sanitizeSettings({ badgeChargingStyle: "unsupported" }).badgeChargingStyle,
  "icon-and-color"
);

assert.equal(resolveLocale("ru"), "ru");
assert.equal(resolveLocale("en"), "en");
assert.equal(translate("ru", "updatedAt", { time: "12:30" }), "обновлено 12:30");
assert.equal(translate("en", "statusCode", { value: 7 }), "Code 7");
assert.equal(translate("ru", "aboutTab"), "О расширении");
assert.equal(translate("en", "versionLabel"), "Version");
assert.equal(translate("ru", "error_build_unreachable"), "Не удалось загрузить данные.");
assert.equal(
  translate("ru", "error_build_http"),
  "Роутер вернул ошибку при загрузке данных."
);
assert.equal(
  translate("ru", "error_key_missing"),
  "В данных роутера не найден ключ проверки."
);
assert.equal(translate("en", "error_build_unreachable"), "Could not load data.");
assert.equal(
  translate("en", "error_build_http"),
  "The router returned an error while loading data."
);
assert.equal(
  translate("en", "error_key_missing"),
  "No verification key was found in the router data."
);

const popupHtml = readFileSync(join(__dirname, "../extension/popup.html"), "utf8");
assert.equal((popupHtml.match(/data-charging-indicator/g) || []).length, 4);
["grid", "network", "signal", "dark"].forEach((layout) => {
  const layoutStart = popupHtml.indexOf(`data-layout="${layout}"`);
  const nextLayout = popupHtml.indexOf("data-layout=", layoutStart + 1);
  const layoutMarkup = popupHtml.slice(layoutStart, nextLayout === -1 ? undefined : nextLayout);
  assert.ok(layoutStart >= 0, `Missing ${layout} layout`);
  assert.match(layoutMarkup, /data-charging-indicator/);
  assert.match(layoutMarkup, /data-i18n="charging"/);
});

assert.match(popupHtml, /id="setupButton"[^>]+data-i18n="allowAccess"/);
const popupJs = readFileSync(join(__dirname, "../extension/popup.js"), "utf8");
assert.match(popupJs, /api\.permissionsRequest\(\[connection\.permissionPattern\]\)/);
assert.match(popupJs, /type: "settingsUpdated"/);
const popupCss = readFileSync(join(__dirname, "../extension/popup.css"), "utf8");
assert.match(popupCss, /\.battery-progress\.battery--charging > span[\s\S]+animation: charge-flow 1\.35s linear infinite/);
assert.doesNotMatch(popupCss, /repeating-linear-gradient/);
assert.match(popupCss, /@keyframes charge-flow[\s\S]+background-position: 100% 0[\s\S]+background-position: -100% 0/);
assert.match(popupCss, /body \.charging-state svg[\s\S]+color: var\(--charging-bolt\)[\s\S]+animation: charging-bolt/);
assert.match(popupCss, /\.wide-metric__head > strong,[\s\S]+\.dark-metric--battery > strong \{ display: flex; align-items: center; \}/);
const backgroundJs = readFileSync(join(__dirname, "../extension/background.js"), "utf8");
assert.match(backgroundJs, /permissions\.onAdded\.addListener/);
assert.match(backgroundJs, /permissions\.onRemoved\.addListener/);
assert.doesNotMatch(backgroundJs, /icons\/icon-charging/);

let requestedStorageKeys = "not-called";
globalThis.chrome = {
  runtime: { lastError: null },
  storage: {
    local: {
      get(keys, callback) {
        requestedStorageKeys = keys;
        callback({ pollInterval: 17, popupStyle: "dark" });
      }
    }
  }
};

api.storageGetAll().then((stored) => {
  assert.equal(requestedStorageKeys, null);
  assert.deepEqual(stored, { pollInterval: 17, popupStyle: "dark" });
  delete globalThis.chrome;
  console.log("EE71 common tests passed");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
