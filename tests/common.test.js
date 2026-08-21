/*
 * EE71 Monitor
 * Copyright (c) 2026 antiefa
 * SPDX-License-Identifier: MIT
 * Source: https://github.com/antiefa/EE71-Monitor
 */

"use strict";

const assert = require("node:assert/strict");

require("../extension/common.js");
require("../extension/i18n.js");

const {
  DEFAULT_SETTINGS,
  batteryLevel,
  extractVerificationValues,
  networkType,
  normalizeRouterAddress,
  sanitizeSettings,
  shouldNotifyFullCharge
} = globalThis.EE71;
const { resolveLocale, translate } = globalThis.EE71_I18N;

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

console.log("EE71 common tests passed");
