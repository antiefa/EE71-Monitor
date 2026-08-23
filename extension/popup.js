/*
 * EE71 Monitor
 * Copyright (c) 2026 antiefa
 * SPDX-License-Identifier: MIT
 * Source: https://github.com/antiefa/EE71-Monitor
 */

(function initPopup(global) {
  "use strict";

  const ext = global.chrome;
  const {
    DEFAULT_SETTINGS,
    EMPTY_STATE,
    api,
    batteryLevel,
    networkType,
    normalizeRouterAddress,
    sanitizeSettings
  } = global.EE71;
  const { localizeDocument, resolveLocale, translate } = global.EE71_I18N;

  let settings = { ...DEFAULT_SETTINGS };
  let state = { ...EMPTY_STATE };
  let locale = "en";
  const elements = {};

  function byId(id) {
    return document.getElementById(id);
  }

  function all(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  function populateWifiNetworks() {
    const template = byId("wifiNetworksTemplate");
    if (!template) {
      return;
    }
    all("[data-wifi-networks]").forEach((host) => {
      host.replaceWith(template.content.cloneNode(true));
    });
  }

  function cacheElements() {
    populateWifiNetworks();
    [
      "availability",
      "availabilityText",
      "availabilityTime",
      "routerAddressLink",
      "routerAddressDisplay",
      "routerHomeButton",
      "updatedAt",
      "errorPanel",
      "errorText",
      "staleText",
      "setupPanel",
      "setupButton",
      "refreshButton",
      "refreshText",
      "settingsButton"
    ].forEach((id) => {
      elements[id] = byId(id);
    });

    elements.layouts = all("[data-layout]");
    elements.batteryUnits = all("[data-battery-unit]");
    elements.batteryVisuals = all("[data-battery-visual]");
    elements.batteryProgresses = all("[data-battery-progress]");
    elements.batteryRings = all("[data-battery-ring]");
    elements.chargingIndicators = all("[data-charging-indicator]");
    elements.signalBars = all("[data-signal-bars]");
    elements.signalRings = all("[data-signal-ring]");
    elements.connectionIcons = all("[data-connection-icon]");
    elements.roamingIcons = all("[data-roaming-icon]");
    elements.wifiBands = {
      "2g": all('[data-wifi-band="2g"]'),
      "5g": all('[data-wifi-band="5g"]')
    };
    elements.devicesSuffixes = all("[data-devices-suffix]");
    elements.values = {};
    ["battery", "network", "networkType", "signal", "devices", "roaming", "connection"].forEach((name) => {
      elements.values[name] = all(`[data-value="${name}"]`);
    });
  }

  function setValue(name, value) {
    elements.values[name].forEach((element) => {
      element.textContent = value;
    });
  }

  function formatUpdatedAt(timestamp) {
    if (!timestamp) {
      return translate(locale, "neverUpdated");
    }
    const elapsed = Date.now() - Number(timestamp);
    if (elapsed >= 0 && elapsed < 45000) {
      return translate(locale, "updatedNow");
    }
    const time = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(timestamp));
    return translate(locale, "updatedAt", { time });
  }

  function formatAvailabilityTime(timestamp) {
    if (!timestamp) {
      return "—";
    }
    const elapsed = Date.now() - Number(timestamp);
    if (elapsed >= 0 && elapsed < 45000) {
      return translate(locale, "now");
    }
    return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(timestamp));
  }

  function connectionLabel(value) {
    const status = Number(value);
    if (status === 2) {
      return translate(locale, "connected");
    }
    if (status === 0) {
      return translate(locale, "disconnected");
    }
    return Number.isFinite(status) ? translate(locale, "statusCode", { value: status }) : "—";
  }

  function networkTypeLabel(value) {
    const details = networkType(value);
    if (!details) {
      return "—";
    }
    return details.known
      ? details.label
      : translate(locale, "networkTypeUnknown", { value: details.code });
  }

  function renderSignal(value) {
    const signal = Number(value);
    const normalized = Number.isFinite(signal) ? Math.min(5, Math.max(0, Math.round(signal))) : 0;
    const label = Number.isFinite(signal) ? `${normalized}/5` : "—";
    const ariaLabel = `${translate(locale, "signal")}: ${label}`;
    setValue("signal", label);

    elements.signalBars.forEach((bars) => {
      bars.setAttribute("aria-label", ariaLabel);
      bars.querySelectorAll("span").forEach((bar, index) => {
        bar.classList.toggle("is-active", index < normalized);
      });
    });
    elements.signalRings.forEach((ring) => {
      ring.style.setProperty("--signal-progress", `${normalized * 72}deg`);
      ring.setAttribute("aria-label", ariaLabel);
    });
  }

  function renderAvailability() {
    elements.availability.classList.remove(
      "availability--online",
      "availability--offline",
      "availability--loading"
    );

    if (state.loading) {
      elements.availability.classList.add("availability--loading");
      elements.availabilityText.textContent = translate(locale, "checking");
    } else if (!state.configured) {
      elements.availability.classList.add("availability--offline");
      elements.availabilityText.textContent = translate(locale, "setupRequired");
    } else if (state.reachable) {
      elements.availability.classList.add("availability--online");
      elements.availabilityText.textContent = translate(locale, "routerOnline");
    } else {
      elements.availability.classList.add("availability--offline");
      elements.availabilityText.textContent = translate(locale, "routerOffline");
    }
  }

  function renderLayout() {
    document.body.dataset.popupStyle = settings.popupStyle;
    elements.layouts.forEach((layout) => {
      layout.hidden = layout.dataset.layout !== settings.popupStyle;
    });
  }

  function renderBattery(level) {
    const numericLevel = level === null ? 0 : level;
    const charging = Boolean(state.charging && level !== null);
    document.body.classList.toggle("is-charging", charging);
    setValue("battery", level === null ? "--" : String(level));
    elements.batteryUnits.forEach((unit) => {
      unit.hidden = level === null;
    });
    [...elements.batteryVisuals, ...elements.batteryProgresses].forEach((visual) => {
      visual.style.setProperty("--battery-level", numericLevel);
      visual.classList.toggle("battery--low", level !== null && level <= settings.batteryThreshold);
      visual.classList.toggle("battery--charging", charging);
    });
    elements.batteryProgresses.forEach((progress) => {
      progress.setAttribute("aria-valuenow", String(numericLevel));
      progress.setAttribute(
        "aria-label",
        `${translate(locale, "battery")}: ${level === null ? "—" : `${level}%`}${charging ? `, ${translate(locale, "charging")}` : ""}`
      );
    });
    elements.batteryRings.forEach((ring) => {
      ring.style.setProperty("--battery-progress", `${numericLevel}%`);
      ring.classList.toggle("battery--low", level !== null && level <= settings.batteryThreshold);
      ring.classList.toggle("battery--charging", charging);
      ring.setAttribute("aria-valuenow", String(numericLevel));
      ring.setAttribute(
        "aria-label",
        `${translate(locale, "battery")}: ${level === null ? "—" : `${level}%`}${charging ? `, ${translate(locale, "charging")}` : ""}`
      );
    });
    elements.chargingIndicators.forEach((indicator) => {
      indicator.hidden = !charging;
      indicator.title = translate(locale, "charging");
    });
  }

  function renderRouterHomeLinks() {
    const links = [elements.routerAddressLink, elements.routerHomeButton];
    try {
      const connection = normalizeRouterAddress(settings.routerAddress);
      links.forEach((link) => {
        link.href = `${connection.baseUrl}/`;
        link.removeAttribute("aria-disabled");
      });
    } catch (_error) {
      links.forEach((link) => {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
      });
    }
  }

  function renderConnection(value, hasData) {
    const status = Number(value);
    const kind = hasData && status === 2
      ? "connected"
      : (hasData && status === 0 ? "disconnected" : "unknown");
    const icon = kind === "connected" ? "#icon-check" : (kind === "disconnected" ? "#icon-x" : "#icon-alert");

    setValue("connection", hasData ? connectionLabel(value) : "—");
    elements.values.connection.forEach((element) => {
      element.classList.remove("status-value--connected", "status-value--disconnected", "status-value--unknown");
      element.classList.add(`status-value--${kind}`);
    });
    elements.connectionIcons.forEach((element) => {
      element.classList.remove("state-icon--connected", "state-icon--disconnected", "state-icon--unknown");
      element.classList.add(`state-icon--${kind}`);
      element.querySelector("use").setAttribute("href", icon);
    });
  }

  function renderRoaming(value, hasData) {
    const enabled = hasData && Number(value) === 1;
    setValue("roaming", hasData ? translate(locale, enabled ? "enabled" : "disabled") : "—");
    elements.roamingIcons.forEach((element) => {
      element.classList.toggle("state-icon--roaming", enabled);
      element.classList.toggle("state-icon--roaming-off", !enabled);
    });
  }

  function renderWifiBand(band, data) {
    const suffix = band === "2g" ? "2g" : "5g";
    const stateValue = data ? Number(data[`WlanState_${suffix}`]) : NaN;
    const active = stateValue === 1;
    const rawSsid = data && data[`Ssid_${suffix}`] !== undefined
      ? String(data[`Ssid_${suffix}`]).trim()
      : "";
    const rawClients = data ? Number(data[`curr_num_${suffix}`]) : NaN;
    const ssid = rawSsid || "—";
    const clients = Number.isFinite(rawClients) ? String(Math.max(0, Math.round(rawClients))) : "—";

    elements.wifiBands[band].forEach((row) => {
      row.classList.toggle("is-offline", !active);
      const ssidElement = row.querySelector("[data-wifi-ssid]");
      const clientsElement = row.querySelector("[data-wifi-clients]");
      ssidElement.textContent = ssid;
      ssidElement.title = rawSsid;
      clientsElement.textContent = clients;
    });
  }

  function renderWifiNetworks(data) {
    renderWifiBand("2g", data);
    renderWifiBand("5g", data);
  }

  function render() {
    localizeDocument(document, locale);
    renderLayout();
    renderAvailability();

    const data = state.data || null;
    const level = batteryLevel(data);
    const hasDevices = Boolean(data && Number.isFinite(Number(data.curr_num)));
    elements.routerAddressDisplay.textContent = settings.routerAddress;
    renderRouterHomeLinks();
    renderBattery(level);
    setValue("network", data && data.NetworkName ? String(data.NetworkName) : translate(locale, "noNetwork"));
    setValue("networkType", data ? networkTypeLabel(data.NetworkType) : "—");
    renderSignal(data && data.SignalStrength);
    setValue("devices", hasDevices ? String(data.curr_num) : "—");
    elements.devicesSuffixes.forEach((suffix) => {
      suffix.hidden = !hasDevices;
    });
    renderRoaming(data && data.Roaming, Boolean(data));
    renderConnection(data && data.ConnectionStatus, Boolean(data));
    renderWifiNetworks(data);
    elements.updatedAt.textContent = formatUpdatedAt(state.updatedAt);
    elements.availabilityTime.textContent = formatAvailabilityTime(state.updatedAt || state.lastAttemptAt);

    const needsSetup = state.error === "permission_missing" || !state.configured;
    elements.setupPanel.hidden = !needsSetup;
    elements.errorPanel.hidden = !state.error || needsSetup;
    if (state.error && !needsSetup) {
      elements.errorText.textContent = translate(locale, `error_${state.error}`);
      elements.staleText.hidden = !state.data;
    }

    elements.refreshButton.disabled = Boolean(state.loading) || needsSetup;
    elements.refreshText.textContent = translate(locale, state.loading ? "refreshing" : "refresh");
    elements.refreshButton.querySelector(".button__icon").classList.toggle("is-spinning", Boolean(state.loading));
  }

  function openOptions() {
    ext.runtime.openOptionsPage();
  }

  async function refresh() {
    state = { ...state, loading: true };
    render();
    try {
      state = await api.sendMessage({ type: "refresh" });
    } catch (error) {
      state = {
        ...state,
        loading: false,
        reachable: false,
        error: "unknown",
        errorDetail: error.message
      };
    }
    render();
  }

  async function load() {
    cacheElements();
    const stored = await api.storageGet({
      ...DEFAULT_SETTINGS,
      routerState: EMPTY_STATE
    });
    settings = sanitizeSettings(stored);
    state = { ...EMPTY_STATE, ...(stored.routerState || {}) };
    locale = resolveLocale(settings.language);

    elements.refreshButton.addEventListener("click", refresh);
    elements.settingsButton.addEventListener("click", openOptions);
    elements.setupButton.addEventListener("click", openOptions);
    render();

    ext.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") {
        return;
      }
      if (changes.routerState) {
        state = { ...EMPTY_STATE, ...(changes.routerState.newValue || {}) };
      }
      if (Object.keys(DEFAULT_SETTINGS).some((key) => changes[key])) {
        Object.entries(changes).forEach(([key, change]) => {
          if (Object.hasOwn(DEFAULT_SETTINGS, key)) {
            settings[key] = change.newValue;
          }
        });
        settings = sanitizeSettings(settings);
        locale = resolveLocale(settings.language);
      }
      render();
    });

    refresh();
  }

  document.addEventListener("DOMContentLoaded", () => {
    load().catch((error) => {
      console.error("EE71 popup initialization failed", error);
    });
  });
})(globalThis);
