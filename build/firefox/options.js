/*
 * EE71 Monitor
 * Copyright (c) 2026 antiefa
 * SPDX-License-Identifier: MIT
 * Source: https://github.com/antiefa/EE71-Monitor
 */

(function initOptions(global) {
  "use strict";

  const {
    DEFAULT_SETTINGS,
    EMPTY_STATE,
    api,
    normalizeRouterAddress,
    sanitizeSettings
  } = global.EE71;
  const { localizeDocument, resolveLocale, translate } = global.EE71_I18N;

  let currentSettings = { ...DEFAULT_SETTINGS };
  let currentState = { ...EMPTY_STATE };
  let locale = "en";
  let activeTab = "general";
  const elements = {};

  function byId(id) {
    return document.getElementById(id);
  }

  function cacheElements() {
    [
      "settingsForm",
      "appVersion",
      "aboutVersion",
      "formFooter",
      "routerAddress",
      "pollInterval",
      "language",
      "languageHint",
      "notificationsEnabled",
      "notificationFields",
      "batteryThreshold",
      "notificationTextRu",
      "notificationTextEn",
      "fullChargeNotificationsEnabled",
      "fullChargeNotificationFields",
      "fullChargeNotificationTextRu",
      "fullChargeNotificationTextEn",
      "headerRouterStatus",
      "headerRouterStatusText",
      "connectionSummary",
      "connectionSummaryTitle",
      "connectionSummaryDetail",
      "testButton",
      "saveStatus",
      "saveButton",
      "saveButtonText"
    ].forEach((id) => {
      elements[id] = byId(id);
    });
    elements.tabs = Array.from(document.querySelectorAll("[data-tab]"));
    elements.panels = Array.from(document.querySelectorAll("[data-panel]"));
    elements.notificationLocaleGroups = Array.from(document.querySelectorAll("[data-notification-locale]"));
    elements.popupStyleInputs = Array.from(document.querySelectorAll('input[name="popupStyle"]'));
  }

  function fillForm(settings) {
    elements.routerAddress.value = settings.routerAddress;
    elements.pollInterval.value = settings.pollInterval;
    elements.language.value = settings.language;
    elements.popupStyleInputs.forEach((input) => {
      input.checked = input.value === settings.popupStyle;
    });
    elements.notificationsEnabled.checked = settings.notificationsEnabled;
    elements.batteryThreshold.value = settings.batteryThreshold;
    elements.notificationTextRu.value = settings.notificationTextRu;
    elements.notificationTextEn.value = settings.notificationTextEn;
    elements.fullChargeNotificationsEnabled.checked = settings.fullChargeNotificationsEnabled;
    elements.fullChargeNotificationTextRu.value = settings.fullChargeNotificationTextRu;
    elements.fullChargeNotificationTextEn.value = settings.fullChargeNotificationTextEn;
    updateNotificationFields();
    updateLanguageHint();
  }

  function renderVersion() {
    let version = "—";
    try {
      version = global.chrome?.runtime?.getManifest?.().version || version;
    } catch (_error) {
      version = "—";
    }
    elements.appVersion.textContent = version === "—" ? "v—" : `v${version}`;
    elements.aboutVersion.textContent = version;
  }

  function readForm() {
    return sanitizeSettings({
      routerAddress: elements.routerAddress.value,
      pollInterval: elements.pollInterval.value,
      language: elements.language.value,
      popupStyle: elements.popupStyleInputs.find((input) => input.checked)?.value,
      notificationsEnabled: elements.notificationsEnabled.checked,
      batteryThreshold: elements.batteryThreshold.value,
      notificationTextRu: elements.notificationTextRu.value,
      notificationTextEn: elements.notificationTextEn.value,
      fullChargeNotificationsEnabled: elements.fullChargeNotificationsEnabled.checked,
      fullChargeNotificationTextRu: elements.fullChargeNotificationTextRu.value,
      fullChargeNotificationTextEn: elements.fullChargeNotificationTextEn.value
    });
  }

  function setFieldGroupEnabled(container, enabled) {
    container.classList.toggle("is-disabled", !enabled);
    container.querySelectorAll("input, textarea").forEach((control) => {
      control.disabled = !enabled;
    });
  }

  function updateNotificationFields() {
    setFieldGroupEnabled(elements.notificationFields, elements.notificationsEnabled.checked);
    setFieldGroupEnabled(
      elements.fullChargeNotificationFields,
      elements.fullChargeNotificationsEnabled.checked
    );
    updateNotificationLanguageFields();
  }

  function updateNotificationLanguageFields() {
    const notificationLocale = resolveLocale(elements.language.value);
    elements.notificationLocaleGroups.forEach((group) => {
      group.hidden = group.dataset.notificationLocale !== notificationLocale;
    });
  }

  function updateLanguageHint() {
    const automatic = elements.language.value === "auto";
    elements.languageHint.hidden = !automatic;
    if (!automatic) {
      elements.languageHint.textContent = "";
      return;
    }
    const browserLocale = resolveLocale("auto");
    elements.languageHint.textContent = translate(locale, "languageBrowserActive", {
      language: translate(locale, browserLocale === "ru" ? "languageNameRussian" : "languageNameEnglish")
    });
  }

  function showStatus(kind, message) {
    elements.saveStatus.classList.remove(
      "save-status--success",
      "save-status--error",
      "save-status--working"
    );
    if (kind) {
      elements.saveStatus.classList.add(`save-status--${kind}`);
    }
    elements.saveStatus.querySelector("span:last-child").textContent = message;
  }

  function setSaving(saving) {
    elements.saveButton.disabled = saving;
    elements.testButton.disabled = saving;
    elements.saveButtonText.textContent = translate(locale, saving ? "saving" : "saveAndCheck");
  }

  function validationMessage(error) {
    if (error && error.message === "address_required") {
      return translate(locale, "addressRequired");
    }
    return translate(locale, "addressInvalid");
  }

  function renderConnectionState(state) {
    const nextState = { ...EMPTY_STATE, ...(state || {}) };
    currentState = nextState;
    const isOnline = Boolean(nextState.reachable);
    const isLoading = Boolean(nextState.loading);

    elements.headerRouterStatus.classList.toggle("router-status--online", isOnline);
    elements.headerRouterStatus.classList.toggle("router-status--offline", !isOnline && !isLoading);
    elements.headerRouterStatus.classList.toggle("router-status--loading", isLoading);
    elements.connectionSummary.classList.toggle("connection-summary--online", isOnline);

    const statusKey = isLoading ? "checking" : (isOnline ? "routerOnline" : "routerOffline");
    const summaryKey = isLoading
      ? "checking"
      : (isOnline ? "routerResponding" : "routerNotResponding");
    elements.headerRouterStatusText.textContent = translate(locale, statusKey);
    elements.connectionSummaryTitle.textContent = translate(locale, summaryKey);
    elements.connectionSummaryDetail.textContent = isOnline
      ? `${currentSettings.routerAddress} · ${translate(locale, "checkedNow")}`
      : currentSettings.routerAddress;
  }

  function selectTab(tabName, focus) {
    activeTab = ["general", "notifications", "interface", "about"].includes(tabName)
      ? tabName
      : "general";
    elements.tabs.forEach((tab) => {
      const selected = tab.dataset.tab === activeTab;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) {
        tab.focus();
      }
    });
    elements.panels.forEach((panel) => {
      const selected = panel.dataset.panel === activeTab;
      panel.hidden = !selected;
      panel.classList.toggle("is-active", selected);
    });
    elements.formFooter.hidden = activeTab === "about";
  }

  async function save(event) {
    event.preventDefault();

    let nextSettings;
    let nextConnection;
    try {
      nextSettings = readForm();
      nextConnection = normalizeRouterAddress(nextSettings.routerAddress);
    } catch (error) {
      selectTab("general", false);
      showStatus("error", validationMessage(error));
      elements.routerAddress.focus();
      return;
    }

    setSaving(true);
    showStatus("working", translate(locale, "saving"));
    const stateBeforeSave = { ...currentState, loading: false };
    renderConnectionState({ ...stateBeforeSave, loading: true });

    try {
      const granted = await api.permissionsRequest([nextConnection.permissionPattern]);
      if (!granted) {
        showStatus("error", translate(locale, "permissionDenied"));
        renderConnectionState(stateBeforeSave);
        return;
      }

      let previousConnection = null;
      try {
        previousConnection = normalizeRouterAddress(currentSettings.routerAddress);
      } catch (_error) {
        previousConnection = null;
      }

      nextSettings.routerAddress = nextConnection.address;
      await api.storageSet(nextSettings);
      currentSettings = nextSettings;
      elements.routerAddress.value = nextConnection.address;

      if (
        previousConnection &&
        previousConnection.permissionPattern !== nextConnection.permissionPattern
      ) {
        await api.permissionsRemove([previousConnection.permissionPattern]).catch(() => false);
      }

      const state = await api.sendMessage({ type: "settingsUpdated" });
      renderConnectionState(state);
      showStatus(
        state && state.reachable ? "success" : "error",
        translate(locale, state && state.reachable ? "savedOnline" : "savedOffline")
      );
    } catch (error) {
      renderConnectionState({ ...stateBeforeSave, reachable: false });
      showStatus(
        "error",
        error && error.message ? error.message : translate(locale, "error_unknown")
      );
    } finally {
      setSaving(false);
    }
  }

  function updateLanguagePreview() {
    locale = resolveLocale(elements.language.value);
    localizeDocument(document, locale);
    updateNotificationLanguageFields();
    updateLanguageHint();
    elements.saveButtonText.textContent = translate(locale, "saveAndCheck");
    renderConnectionState(currentState);
    selectTab(activeTab, false);
    showStatus(null, translate(locale, "statusIdle"));
  }

  function handleTabKeydown(event) {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const currentIndex = elements.tabs.findIndex((tab) => tab.dataset.tab === activeTab);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + direction + elements.tabs.length) % elements.tabs.length;
    selectTab(elements.tabs[nextIndex].dataset.tab, true);
  }

  async function load() {
    cacheElements();
    const stored = await api.storageGet({
      ...DEFAULT_SETTINGS,
      routerState: EMPTY_STATE
    });
    currentSettings = sanitizeSettings(stored);
    currentState = { ...EMPTY_STATE, ...(stored.routerState || {}) };
    locale = resolveLocale(currentSettings.language);
    localizeDocument(document, locale);
    renderVersion();
    fillForm(currentSettings);
    renderConnectionState(currentState);
    selectTab("general", false);

    elements.settingsForm.addEventListener("submit", save);
    elements.tabs.forEach((tab) => {
      tab.addEventListener("click", () => selectTab(tab.dataset.tab, false));
      tab.addEventListener("keydown", handleTabKeydown);
    });
    elements.language.addEventListener("change", updateLanguagePreview);
    elements.notificationsEnabled.addEventListener("change", updateNotificationFields);
    elements.fullChargeNotificationsEnabled.addEventListener("change", updateNotificationFields);
    elements.settingsForm.addEventListener("input", () => {
      showStatus(null, translate(locale, "statusIdle"));
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    load().catch((error) => {
      console.error("EE71 settings initialization failed", error);
    });
  });
})(globalThis);
