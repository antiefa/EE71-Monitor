/*
 * EE71 Monitor
 * Copyright (c) 2026 antiefa
 * SPDX-License-Identifier: MIT
 * Source: https://github.com/antiefa/EE71-Monitor
 */

(function initCommon(global) {
  "use strict";

  const DEFAULT_NOTIFICATION_TEXT = Object.freeze({
    ru: "Заряд роутера — {level}%. Подключите зарядное устройство.",
    en: "Router battery is at {level}%. Connect the charger."
  });

  const DEFAULT_FULL_NOTIFICATION_TEXT = Object.freeze({
    ru: "Роутер полностью заряжен. Можно отключить зарядное устройство.",
    en: "Router is fully charged. You can disconnect the charger."
  });

  const DEFAULT_SETTINGS = Object.freeze({
    routerAddress: "192.168.1.1",
    pollInterval: 5,
    batteryThreshold: 20,
    notificationsEnabled: true,
    language: "auto",
    popupStyle: "grid",
    badgeEnabled: true,
    badgeFormat: "percent",
    badgeChargingStyle: "icon-and-color",
    notificationTextRu: DEFAULT_NOTIFICATION_TEXT.ru,
    notificationTextEn: DEFAULT_NOTIFICATION_TEXT.en,
    fullChargeNotificationsEnabled: true,
    fullChargeNotificationTextRu: DEFAULT_FULL_NOTIFICATION_TEXT.ru,
    fullChargeNotificationTextEn: DEFAULT_FULL_NOTIFICATION_TEXT.en
  });

  const EMPTY_STATE = Object.freeze({
    reachable: false,
    loading: false,
    configured: false,
    charging: false,
    data: null,
    error: "permission_missing",
    errorDetail: "",
    lastAttemptAt: null,
    updatedAt: null
  });

  function extensionApi() {
    if (!global.chrome) {
      throw new Error("WebExtension API is unavailable");
    }
    return global.chrome;
  }

  function callbackCall(target, method, ...args) {
    return new Promise((resolve, reject) => {
      try {
        target[method](...args, (result) => {
          const api = global.chrome;
          const lastError = api && api.runtime && api.runtime.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
            return;
          }
          resolve(result);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  const api = {
    storageGet(defaults) {
      const ext = extensionApi();
      return callbackCall(ext.storage.local, "get", defaults);
    },
    storageSet(values) {
      const ext = extensionApi();
      return callbackCall(ext.storage.local, "set", values);
    },
    storageRemove(keys) {
      const ext = extensionApi();
      return callbackCall(ext.storage.local, "remove", keys);
    },
    permissionsContains(origins) {
      const ext = extensionApi();
      return callbackCall(ext.permissions, "contains", { origins });
    },
    permissionsRequest(origins) {
      const ext = extensionApi();
      return callbackCall(ext.permissions, "request", { origins });
    },
    permissionsRemove(origins) {
      const ext = extensionApi();
      return callbackCall(ext.permissions, "remove", { origins });
    },
    updateDynamicRules(options) {
      const ext = extensionApi();
      return callbackCall(ext.declarativeNetRequest, "updateDynamicRules", options);
    },
    sendMessage(message) {
      const ext = extensionApi();
      return callbackCall(ext.runtime, "sendMessage", message);
    }
  };

  function normalizeRouterAddress(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      throw new Error("address_required");
    }

    const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`;
    let url;
    try {
      url = new URL(candidate);
    } catch (_error) {
      throw new Error("address_invalid");
    }

    if (url.protocol !== "http:" || !url.hostname || url.username || url.password) {
      throw new Error("address_invalid");
    }
    if ((url.pathname && url.pathname !== "/") || url.search || url.hash) {
      throw new Error("address_invalid");
    }

    return {
      address: url.host,
      baseUrl: url.origin,
      permissionPattern: `http://${url.hostname}/*`
    };
  }

  function decodeJavaScriptString(value) {
    return String(value)
      .replace(/\\x([0-9a-f]{2})/gi, (_match, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\u([0-9a-f]{4})/gi, (_match, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\([\\"'])/g, "$1");
  }

  function extractAssignedString(source, name) {
    const expression = new RegExp(
      `${name}(?:["']\\s*\\])?\\s*[:=]\\s*(["'])([^"'\\r\\n]{4,1024})\\1`,
      "i"
    );
    const match = expression.exec(String(source || ""));
    return match ? decodeJavaScriptString(match[2]) : "";
  }

  function extractVerificationValues(source) {
    return {
      key: extractAssignedString(source, "_TclRequestVerificationKey"),
      token: extractAssignedString(source, "_TclRequestVerificationToken")
    };
  }

  function clampNumber(value, min, max, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, parsed));
  }

  function sanitizeSettings(values) {
    const source = values || {};
    const language = ["auto", "ru", "en"].includes(source.language)
      ? source.language
      : DEFAULT_SETTINGS.language;
    const popupStyle = ["grid", "network", "signal", "dark"].includes(source.popupStyle)
      ? source.popupStyle
      : DEFAULT_SETTINGS.popupStyle;
    const badgeFormat = ["percent", "number"].includes(source.badgeFormat)
      ? source.badgeFormat
      : DEFAULT_SETTINGS.badgeFormat;
    const badgeChargingStyle = ["icon-and-color", "color-only"].includes(source.badgeChargingStyle)
      ? source.badgeChargingStyle
      : DEFAULT_SETTINGS.badgeChargingStyle;

    return {
      routerAddress: String(source.routerAddress || DEFAULT_SETTINGS.routerAddress).trim(),
      pollInterval: Math.round(clampNumber(source.pollInterval, 1, 60, DEFAULT_SETTINGS.pollInterval)),
      batteryThreshold: Math.round(clampNumber(source.batteryThreshold, 1, 100, DEFAULT_SETTINGS.batteryThreshold)),
      notificationsEnabled: source.notificationsEnabled !== false,
      language,
      popupStyle,
      badgeEnabled: source.badgeEnabled !== false,
      badgeFormat,
      badgeChargingStyle,
      notificationTextRu: String(source.notificationTextRu || DEFAULT_NOTIFICATION_TEXT.ru).trim(),
      notificationTextEn: String(source.notificationTextEn || DEFAULT_NOTIFICATION_TEXT.en).trim(),
      fullChargeNotificationsEnabled: source.fullChargeNotificationsEnabled !== false,
      fullChargeNotificationTextRu: String(
        source.fullChargeNotificationTextRu || DEFAULT_FULL_NOTIFICATION_TEXT.ru
      ).trim(),
      fullChargeNotificationTextEn: String(
        source.fullChargeNotificationTextEn || DEFAULT_FULL_NOTIFICATION_TEXT.en
      ).trim()
    };
  }

  function batteryLevel(data) {
    if (!data || typeof data !== "object") {
      return null;
    }
    const candidate = data.BatteryLevel ?? data.bat_cap;
    const level = Number(candidate);
    return Number.isFinite(level) ? Math.round(clampNumber(level, 0, 100, 0)) : null;
  }

  const NETWORK_TYPE_LABELS = Object.freeze({
    0: "NA",
    1: "2G",
    2: "2G",
    3: "3G",
    4: "3G",
    5: "3G",
    6: "3G+",
    7: "3G+",
    8: "4G",
    9: "4G+",
    11: "2G"
  });

  function networkType(value) {
    if (value === null || typeof value === "undefined" || String(value).trim() === "") {
      return null;
    }
    const code = Number(value);
    if (!Number.isInteger(code)) {
      return null;
    }
    return {
      code,
      known: Object.hasOwn(NETWORK_TYPE_LABELS, code),
      label: NETWORK_TYPE_LABELS[code] || ""
    };
  }

  function shouldNotifyFullCharge(previousLevel, currentLevel) {
    if (previousLevel === null || typeof previousLevel === "undefined") {
      return false;
    }
    const previous = Number(previousLevel);
    const current = Number(currentLevel);
    return Number.isFinite(previous) && Number.isFinite(current) && previous < 100 && current === 100;
  }

  function isBatteryCharging(previousData, currentData) {
    const previous = batteryLevel(previousData);
    const current = batteryLevel(currentData);
    return previous !== null && current !== null && current > previous;
  }

  global.EE71 = Object.freeze({
    DEFAULT_FULL_NOTIFICATION_TEXT,
    DEFAULT_NOTIFICATION_TEXT,
    DEFAULT_SETTINGS,
    EMPTY_STATE,
    api,
    batteryLevel,
    extractVerificationValues,
    isBatteryCharging,
    networkType,
    normalizeRouterAddress,
    sanitizeSettings,
    shouldNotifyFullCharge
  });
})(globalThis);
