/*
 * EE71 Monitor
 * Copyright (c) 2026 antiefa
 * SPDX-License-Identifier: MIT
 * Source: https://github.com/antiefa/EE71-Monitor
 */

if (typeof importScripts === "function") {
  importScripts("common.js", "i18n.js");
}

(function initBackground(global) {
  "use strict";

  const ext = global.chrome;
  const {
    DEFAULT_SETTINGS,
    EMPTY_STATE,
    api,
    batteryLevel,
    extractVerificationValues,
    isBatteryCharging,
    normalizeRouterAddress,
    sanitizeSettings,
    shouldNotifyFullCharge
  } = global.EE71;
  const { resolveLocale, translate } = global.EE71_I18N;

  const ALARM_NAME = "ee71-router-poll";
  const LOW_BATTERY_NOTIFICATION_ID = "ee71-low-battery";
  const FULL_CHARGE_NOTIFICATION_ID = "ee71-full-charge";
  const REFERRER_RULE_ID = 71001;
  const REQUEST_TIMEOUT_MS = 12000;
  let refreshInFlight = null;

  class RouterError extends Error {
    constructor(code, detail, reachable) {
      super(detail || code);
      this.name = "RouterError";
      this.code = code;
      this.detail = detail || "";
      this.reachable = Boolean(reachable);
    }
  }

  async function getSettings() {
    return sanitizeSettings(await api.storageGet(DEFAULT_SETTINGS));
  }

  async function getState() {
    const stored = await api.storageGet({ routerState: EMPTY_STATE });
    return { ...EMPTY_STATE, ...(stored.routerState || {}) };
  }

  async function storeState(nextState) {
    await api.storageSet({ routerState: nextState });
    await updateBadge(nextState);
    return nextState;
  }

  function callAction(method, details) {
    try {
      if (typeof ext.action[method] !== "function") {
        return;
      }
      const result = ext.action[method](details);
      if (result && typeof result.catch === "function") {
        result.catch(() => undefined);
      }
    } catch (_error) {
      // Action decoration is supplementary; status remains available in the popup.
    }
  }

  function setActionAppearance({ text, backgroundColor, charging, settings, title }) {
    callAction("setBadgeText", { text });
    callAction("setBadgeBackgroundColor", { color: backgroundColor });
    callAction("setBadgeTextColor", { color: "#FFFFFF" });
    callAction("setTitle", { title });

    const iconPrefix = charging && settings.badgeChargingStyle === "icon-and-color"
      ? "icons/icon-charging"
      : "icons/icon";
    callAction("setIcon", {
      path: {
        16: `${iconPrefix}-16.png`,
        32: `${iconPrefix}-32.png`,
        48: `${iconPrefix}-48.png`
      }
    });
  }

  async function updateBadge(state) {
    try {
      const settings = await getSettings();
      const locale = resolveLocale(settings.language);
      const visibleText = (text) => settings.badgeEnabled ? text : "";

      if (state.loading && !state.data) {
        setActionAppearance({
          text: visibleText("…"),
          backgroundColor: "#526168",
          charging: false,
          settings,
          title: translate(locale, "badgeTitleLoading")
        });
        return;
      }
      if (!state.reachable) {
        setActionAppearance({
          text: visibleText("×"),
          backgroundColor: "#B23A32",
          charging: false,
          settings,
          title: translate(locale, "badgeTitleUnavailable")
        });
        return;
      }

      const level = batteryLevel(state.data);
      const charging = Boolean(state.charging && level !== null);
      const suffix = settings.badgeFormat === "percent" ? "%" : "";
      const title = level === null
        ? translate(locale, "badgeTitleNoBattery")
        : translate(locale, charging ? "badgeTitleCharging" : "badgeTitleBattery", { level });
      setActionAppearance({
        text: visibleText(level === null ? "•" : `${level}${suffix}`),
        backgroundColor: charging
          ? "#318BBB"
          : (level !== null && level <= settings.batteryThreshold ? "#9A5500" : "#26734D"),
        charging,
        settings,
        title
      });
    } catch (_error) {
      // Ignore badge API failures on browsers that handle SVG/action badges differently.
    }
  }

  async function fetchWithTimeout(url, options, errorCode) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new RouterError("timeout", url, false);
      }
      throw new RouterError(errorCode, error instanceof Error ? error.message : String(error), false);
    } finally {
      clearTimeout(timeout);
    }
  }

  function escapeRegularExpression(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  async function removeReferrerRule() {
    if (!ext.declarativeNetRequest) {
      return;
    }
    await api.updateDynamicRules({ removeRuleIds: [REFERRER_RULE_ID] });
  }

  async function configureReferrerRule(connection) {
    if (!ext.declarativeNetRequest) {
      throw new RouterError("api_unreachable", "declarativeNetRequest is unavailable", false);
    }

    await api.updateDynamicRules({
      removeRuleIds: [REFERRER_RULE_ID],
      addRules: [
        {
          id: REFERRER_RULE_ID,
          priority: 1,
          action: {
            type: "modifyHeaders",
            requestHeaders: [
              {
                header: "Referer",
                operation: "set",
                value: `${connection.baseUrl}/`
              }
            ]
          },
          condition: {
            regexFilter: `^${escapeRegularExpression(connection.baseUrl)}/jrd/webapi$`,
            requestMethods: ["post"],
            resourceTypes: ["xmlhttprequest"]
          }
        }
      ]
    });
  }

  async function loadCredentials(connection, forceReload) {
    const stored = await api.storageGet({ routerCredentials: null });
    const cached = stored.routerCredentials;
    if (!forceReload && cached && cached.baseUrl === connection.baseUrl && cached.key) {
      return cached;
    }

    const response = await fetchWithTimeout(
      `${connection.baseUrl}/pc/dist/build.js`,
      {
        method: "GET",
        cache: "no-store",
        credentials: "omit",
        headers: {
          Accept: "text/javascript, application/javascript, */*;q=0.8"
        }
      },
      "build_unreachable"
    );

    if (!response.ok) {
      throw new RouterError("build_http", `HTTP ${response.status}`, true);
    }

    const source = await response.text();
    const values = extractVerificationValues(source);
    if (!values.key) {
      throw new RouterError("key_missing", "_TclRequestVerificationKey", true);
    }

    const credentials = {
      baseUrl: connection.baseUrl,
      key: values.key,
      token: values.token || "",
      foundAt: Date.now()
    };
    await api.storageSet({ routerCredentials: credentials });
    return credentials;
  }

  async function requestSystemStatus(connection, credentials) {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-requested-with": "XMLHttpRequest",
      _tclrequestverificationkey: credentials.key
    };
    if (credentials.token) {
      headers._tclrequestverificationtoken = credentials.token;
    }

    const response = await fetchWithTimeout(
      `${connection.baseUrl}/jrd/webapi`,
      {
        method: "POST",
        cache: "no-store",
        credentials: "omit",
        headers,
        body: JSON.stringify({
          id: "12",
          jsonrpc: "2.0",
          method: "GetSystemStatus",
          params: {}
        })
      },
      "api_unreachable"
    );

    if (!response.ok) {
      throw new RouterError("api_http", `HTTP ${response.status}`, true);
    }

    let payload;
    try {
      payload = JSON.parse(await response.text());
    } catch (error) {
      throw new RouterError("invalid_json", error instanceof Error ? error.message : String(error), true);
    }

    if (payload && payload.error) {
      const detail = payload.error.message || payload.error.code || "JSON-RPC error";
      throw new RouterError("api_error", String(detail), true);
    }
    if (!payload || !payload.result || typeof payload.result !== "object") {
      throw new RouterError("invalid_response", "Missing result", true);
    }

    return payload.result;
  }

  async function createBatteryNotification(id, titleKey, template, locale, level) {
    const message = String(template || "").replaceAll("{level}", String(level));

    await new Promise((resolve) => {
      ext.notifications.create(
        id,
        {
          type: "basic",
          iconUrl: ext.runtime.getURL("icons/icon-128.png"),
          title: translate(locale, titleKey),
          message
        },
        () => {
          void ext.runtime.lastError;
          resolve();
        }
      );
    });
  }

  async function maybeNotifyBattery(settings, data) {
    const level = batteryLevel(data);
    if (level === null) {
      return;
    }

    const stored = await api.storageGet({
      batteryAlertArmed: true,
      lastBatteryLevel: null
    });
    const updates = { lastBatteryLevel: level };
    const isLowBatteryArmed = stored.batteryAlertArmed !== false;
    const locale = resolveLocale(settings.language);

    if (level > settings.batteryThreshold) {
      if (!isLowBatteryArmed) {
        updates.batteryAlertArmed = true;
      }
    } else if (level < 100 && settings.notificationsEnabled && isLowBatteryArmed) {
      const template = locale === "ru" ? settings.notificationTextRu : settings.notificationTextEn;
      await createBatteryNotification(
        LOW_BATTERY_NOTIFICATION_ID,
        "lowBatteryTitle",
        template,
        locale,
        level
      );
      updates.batteryAlertArmed = false;
    }

    if (
      settings.fullChargeNotificationsEnabled &&
      shouldNotifyFullCharge(stored.lastBatteryLevel, level)
    ) {
      const template = locale === "ru"
        ? settings.fullChargeNotificationTextRu
        : settings.fullChargeNotificationTextEn;
      await createBatteryNotification(
        FULL_CHARGE_NOTIFICATION_ID,
        "fullChargeTitle",
        template,
        locale,
        level
      );
    }

    await api.storageSet(updates);
  }

  function normalizeError(error) {
    if (error instanceof RouterError) {
      return error;
    }
    if (error && ["address_required", "address_invalid"].includes(error.message)) {
      return new RouterError("address_invalid", error.message, false);
    }
    return new RouterError(
      "unknown",
      error instanceof Error ? error.message : String(error),
      false
    );
  }

  async function performRefresh(forceCredentials) {
    const settings = await getSettings();
    const previous = await getState();
    const lastAttemptAt = Date.now();

    let connection;
    try {
      connection = normalizeRouterAddress(settings.routerAddress);
    } catch (error) {
      await removeReferrerRule().catch(() => undefined);
      const normalized = normalizeError(error);
      return storeState({
        ...previous,
        reachable: false,
        loading: false,
        configured: false,
        charging: false,
        error: normalized.code,
        errorDetail: normalized.detail,
        lastAttemptAt
      });
    }

    const hasPermission = await api.permissionsContains([connection.permissionPattern]);
    if (!hasPermission) {
      await removeReferrerRule().catch(() => undefined);
      return storeState({
        ...previous,
        reachable: false,
        loading: false,
        configured: false,
        charging: false,
        error: "permission_missing",
        errorDetail: connection.permissionPattern,
        lastAttemptAt
      });
    }

    try {
      await configureReferrerRule(connection);
    } catch (error) {
      const normalized = normalizeError(error);
      return storeState({
        ...previous,
        reachable: normalized.reachable,
        loading: false,
        configured: true,
        charging: false,
        error: normalized.code,
        errorDetail: normalized.detail,
        lastAttemptAt
      });
    }

    await storeState({
      ...previous,
      loading: true,
      configured: true,
      error: null,
      errorDetail: "",
      lastAttemptAt
    });

    try {
      let credentials = await loadCredentials(connection, Boolean(forceCredentials));
      let data;
      try {
        data = await requestSystemStatus(connection, credentials);
      } catch (error) {
        if (!forceCredentials && error instanceof RouterError && ["api_http", "api_error"].includes(error.code)) {
          credentials = await loadCredentials(connection, true);
          data = await requestSystemStatus(connection, credentials);
        } else {
          throw error;
        }
      }

      const state = {
        reachable: true,
        loading: false,
        configured: true,
        charging: isBatteryCharging(previous.data, data),
        data,
        error: null,
        errorDetail: "",
        lastAttemptAt,
        updatedAt: Date.now()
      };
      await storeState(state);
      await maybeNotifyBattery(settings, data);
      return state;
    } catch (error) {
      const normalized = normalizeError(error);
      return storeState({
        ...previous,
        reachable: normalized.reachable,
        loading: false,
        configured: true,
        charging: false,
        error: normalized.code,
        errorDetail: normalized.detail,
        lastAttemptAt
      });
    }
  }

  function refreshRouter(forceCredentials) {
    if (!refreshInFlight) {
      refreshInFlight = performRefresh(forceCredentials).finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  }

  async function setupAlarm() {
    const settings = await getSettings();
    await new Promise((resolve) => {
      ext.alarms.clear(ALARM_NAME, () => {
        void ext.runtime.lastError;
        resolve();
      });
    });
    ext.alarms.create(ALARM_NAME, {
      delayInMinutes: settings.pollInterval,
      periodInMinutes: settings.pollInterval
    });
  }

  async function initialize() {
    const existing = await api.storageGet({});
    const missingDefaults = {};
    Object.entries(DEFAULT_SETTINGS).forEach(([key, value]) => {
      if (typeof existing[key] === "undefined") {
        missingDefaults[key] = value;
      }
    });
    if (Object.keys(missingDefaults).length) {
      await api.storageSet(missingDefaults);
    }
    await setupAlarm();
    await refreshRouter(false);
  }

  ext.runtime.onInstalled.addListener(() => {
    initialize().catch(() => undefined);
  });

  if (ext.runtime.onStartup) {
    ext.runtime.onStartup.addListener(() => {
      setupAlarm().then(() => refreshRouter(false)).catch(() => undefined);
    });
  }

  ext.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      refreshRouter(false).catch(() => undefined);
    }
  });

  ext.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.pollInterval) {
      setupAlarm().catch(() => undefined);
    }
  });

  ext.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") {
      return false;
    }

    if (message.type === "getState") {
      getState().then(sendResponse).catch((error) => {
        sendResponse({ ...EMPTY_STATE, error: "unknown", errorDetail: error.message });
      });
      return true;
    }

    if (message.type === "refresh") {
      refreshRouter(Boolean(message.forceCredentials)).then(sendResponse).catch((error) => {
        sendResponse({ ...EMPTY_STATE, error: "unknown", errorDetail: error.message });
      });
      return true;
    }

    if (message.type === "settingsUpdated") {
      api.storageRemove(["routerCredentials", "routerState", "lastBatteryLevel"])
        .then(() => setupAlarm())
        .then(() => refreshRouter(true))
        .then(sendResponse)
        .catch((error) => {
          sendResponse({ ...EMPTY_STATE, error: "unknown", errorDetail: error.message });
        });
      return true;
    }

    return false;
  });

  setupAlarm().then(() => refreshRouter(false)).catch(() => undefined);
})(globalThis);
