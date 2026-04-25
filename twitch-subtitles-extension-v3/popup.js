// popup.js — lógica del panel de control de la extensión

(async function () {
  "use strict";

  // ── Referencias al DOM ────────────────────────────────────────────────────

  const btnToggle       = document.getElementById("btn-toggle");
  const statusDot       = document.getElementById("status-dot");
  const statusText      = document.getElementById("status-text");
  const keyDG           = document.getElementById("key-deepgram");
  const keyDL           = document.getElementById("key-deepl");
  const sourceLang      = document.getElementById("source-lang");
  const translateToggle = document.getElementById("translate-enabled");
  const targetSection   = document.getElementById("target-lang-section");
  const langBtns        = document.querySelectorAll(".lang-opt");
  const subsEnabled     = document.getElementById("subs-enabled");
  const fontSize        = document.getElementById("font-size");
  const fontSizeVal     = document.getElementById("font-size-val");
  const bgOpacity       = document.getElementById("bg-opacity");
  const bgOpacityVal    = document.getElementById("bg-opacity-val");
  const errorMsg        = document.getElementById("error-msg");

  let isRunning = false;
  let selectedTargetLang = "ES";

  // ── Cargar configuración guardada ────────────────────────────────────────

  const stored = await chrome.storage.sync.get([
    "deepgramKey", "deeplKey", "sourceLang", "targetLang",
    "translateEnabled", "fontSize", "bgOpacity", "subsEnabled",
  ]);

  if (stored.deepgramKey)    keyDG.value = stored.deepgramKey;
  if (stored.deeplKey)       keyDL.value = stored.deeplKey;
  if (stored.sourceLang)     sourceLang.value = stored.sourceLang;
  if (stored.targetLang)     selectedTargetLang = stored.targetLang;
  if (stored.fontSize)       fontSize.value = stored.fontSize;
  if (stored.bgOpacity)      bgOpacity.value = stored.bgOpacity;
  if (stored.translateEnabled === false) translateToggle.checked = false;
  if (stored.subsEnabled === false)      subsEnabled.checked = false;

  updateFontSizeLabel();
  updateOpacityLabel();
  updateLangSelection();
  targetSection.style.display = translateToggle.checked ? "" : "none";

  // ── Comprobar si ya está corriendo ──────────────────────────────────────

  chrome.runtime.sendMessage({ action: "GET_STATUS" }, (res) => {
    if (res?.running) setRunning(true);
  });

  // ── Eventos de UI ────────────────────────────────────────────────────────

  btnToggle.addEventListener("click", async () => {
    if (isRunning) {
      chrome.runtime.sendMessage({ action: "STOP_CAPTURE" });
      setRunning(false);
    } else {
      await startSubtitles();
    }
  });

  translateToggle.addEventListener("change", () => {
    targetSection.style.display = translateToggle.checked ? "" : "none";
    saveSettings();
  });

  subsEnabled.addEventListener("change", () => {
    sendToContent({ action: "UPDATE_SETTINGS", settings: { enabled: subsEnabled.checked } });
    saveSettings();
  });

  fontSize.addEventListener("input", () => {
    updateFontSizeLabel();
    sendToContent({
      action: "UPDATE_SETTINGS",
      settings: { fontSize: parseInt(fontSize.value) },
    });
    saveSettings();
  });

  bgOpacity.addEventListener("input", () => {
    updateOpacityLabel();
    sendToContent({
      action: "UPDATE_SETTINGS",
      settings: { bgOpacity: parseFloat(bgOpacity.value) },
    });
    saveSettings();
  });

  langBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedTargetLang = btn.dataset.lang;
      updateLangSelection();
      saveSettings();
    });
  });

  [keyDG, keyDL, sourceLang].forEach((el) => {
    el.addEventListener("change", saveSettings);
  });

  // ── Funciones ────────────────────────────────────────────────────────────

  async function startSubtitles() {
    const apiKey = keyDG.value.trim();
    if (!apiKey) {
      showError("Necesitas una API key de Deepgram para empezar.");
      return;
    }

    hideError();

    // Obtener la pestaña activa (debe ser twitch.tv)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.includes("twitch.tv")) {
      showError("Abre un stream de Twitch primero y luego activa los subtítulos.");
      return;
    }

    const config = {
      apiKey,
      apiKeyDeepL: keyDL.value.trim() || null,
      sourceLang: sourceLang.value,
      targetLang: selectedTargetLang,
      translateEnabled: translateToggle.checked && !!keyDL.value.trim(),
    };

    chrome.runtime.sendMessage(
      { action: "START_CAPTURE", config, tabId: tab.id },
      (res) => {
        if (res?.ok) {
          setRunning(true);
          saveSettings();
        } else {
          showError(res?.error ?? "Error al iniciar la captura de audio.");
        }
      }
    );
  }

  function setRunning(running) {
    isRunning = running;
    statusDot.className = "status-dot" + (running ? " active" : "");
    statusText.textContent = running ? "Activo" : "Inactivo";
    btnToggle.textContent = running ? "Detener subtítulos" : "Iniciar subtítulos";
    btnToggle.className = "btn-main " + (running ? "btn-stop" : "btn-start");
  }

  function updateFontSizeLabel() {
    fontSizeVal.textContent = fontSize.value + "px";
  }

  function updateOpacityLabel() {
    bgOpacityVal.textContent = Math.round(parseFloat(bgOpacity.value) * 100) + "%";
  }

  function updateLangSelection() {
    langBtns.forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.lang === selectedTargetLang);
    });
  }

  async function sendToContent(msg) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
    }
  }

  function saveSettings() {
    chrome.storage.sync.set({
      deepgramKey:     keyDG.value.trim(),
      deeplKey:        keyDL.value.trim(),
      sourceLang:      sourceLang.value,
      targetLang:      selectedTargetLang,
      translateEnabled: translateToggle.checked,
      fontSize:        fontSize.value,
      bgOpacity:       bgOpacity.value,
      subsEnabled:     subsEnabled.checked,
    });
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = "block";
  }

  function hideError() {
    errorMsg.style.display = "none";
  }
})();
