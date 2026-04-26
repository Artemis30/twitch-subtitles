// popup.js v5

(async function () {
  "use strict";

  const btnToggle      = document.getElementById("btn-toggle");
  const statusPill     = document.getElementById("status-pill");
  const statusText     = document.getElementById("status-text");
  const keyDG          = document.getElementById("key-deepgram");
  const keyDL          = document.getElementById("key-deepl");
  const sourceLang     = document.getElementById("source-lang");
  const translateToggle= document.getElementById("translate-enabled");
  const targetSection  = document.getElementById("target-section");
  const langBtns       = document.querySelectorAll(".lang-btn");
  const diarizeToggle  = document.getElementById("diarize-enabled");
  const speakerPreview = document.getElementById("speaker-preview");
  const subsEnabled    = document.getElementById("subs-enabled");
  const fontSize       = document.getElementById("font-size");
  const fontSizeVal    = document.getElementById("font-size-val");
  const bgOpacity      = document.getElementById("bg-opacity");
  const bgOpacityVal   = document.getElementById("bg-opacity-val");
  const swatches       = document.querySelectorAll(".swatch");
  const errorMsg       = document.getElementById("error-msg");

  let isRunning = false;
  let selectedLang = "ES";
  let selectedColor = "#ffffff";

  // ── Cargar estado guardado ────────────────────────────────────────────────

  const s = await chrome.storage.sync.get([
    "deepgramKey","deeplKey","sourceLang","targetLang",
    "translateEnabled","fontSize","bgOpacity","subsEnabled",
    "diarize","textColor"
  ]);

  if (s.deepgramKey)   keyDG.value = s.deepgramKey;
  if (s.deeplKey)      keyDL.value = s.deeplKey;
  if (s.sourceLang)    sourceLang.value = s.sourceLang;
  if (s.targetLang)    selectedLang = s.targetLang;
  if (s.fontSize)      fontSize.value = s.fontSize;
  if (s.bgOpacity)     bgOpacity.value = s.bgOpacity;
  if (s.textColor)     selectedColor = s.textColor;
  if (s.translateEnabled === true)  translateToggle.checked = true;
  if (s.subsEnabled === false)      subsEnabled.checked = false;
  if (s.diarize === false)          diarizeToggle.checked = false;

  updateFontLabel();
  updateOpacityLabel();
  updateLangBtns();
  updateSwatches();
  targetSection.style.display = translateToggle.checked ? "" : "none";
  speakerPreview.style.opacity = diarizeToggle.checked ? "1" : "0.3";

  chrome.runtime.sendMessage({ action: "GET_STATUS" }, (res) => {
    if (res?.running) setRunning(true);
  });

  // ── Eventos ───────────────────────────────────────────────────────────────

  btnToggle.addEventListener("click", async () => {
    if (isRunning) {
      chrome.runtime.sendMessage({ action: "STOP_CAPTURE" });
      setRunning(false);
    } else {
      await start();
    }
  });

  translateToggle.addEventListener("change", () => {
    targetSection.style.display = translateToggle.checked ? "" : "none";
    save();
  });

  diarizeToggle.addEventListener("change", () => {
    speakerPreview.style.opacity = diarizeToggle.checked ? "1" : "0.3";
    save();
  });

  subsEnabled.addEventListener("change", () => {
    sendToContent({ action: "UPDATE_SETTINGS", settings: { enabled: subsEnabled.checked } });
    save();
  });

  fontSize.addEventListener("input", () => {
    updateFontLabel();
    sendToContent({ action: "UPDATE_SETTINGS", settings: { fontSize: parseInt(fontSize.value) } });
    save();
  });

  bgOpacity.addEventListener("input", () => {
    updateOpacityLabel();
    sendToContent({ action: "UPDATE_SETTINGS", settings: { bgOpacity: parseFloat(bgOpacity.value) } });
    save();
  });

  langBtns.forEach(btn => btn.addEventListener("click", () => {
    selectedLang = btn.dataset.lang;
    updateLangBtns();
    save();
  }));

  swatches.forEach(sw => sw.addEventListener("click", () => {
    selectedColor = sw.dataset.color;
    updateSwatches();
    sendToContent({ action: "UPDATE_SETTINGS", settings: { textColor: selectedColor } });
    save();
  }));

  [keyDG, keyDL, sourceLang].forEach(el => el.addEventListener("change", save));

  // ── Funciones ─────────────────────────────────────────────────────────────

  async function start() {
    const apiKey = keyDG.value.trim();
    if (!apiKey) { showError("Introduce tu API key de Deepgram."); return; }
    hideError();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.includes("twitch.tv")) {
      showError("Abre un stream de Twitch primero.");
      return;
    }

    const config = {
      apiKey,
      apiKeyDeepL: keyDL.value.trim() || null,
      sourceLang: sourceLang.value,
      targetLang: selectedLang,
      translateEnabled: translateToggle.checked && !!keyDL.value.trim(),
      diarize: diarizeToggle.checked,
    };

    chrome.runtime.sendMessage({ action: "START_CAPTURE", config, tabId: tab.id }, (res) => {
      if (res?.ok) { setRunning(true); save(); }
      else showError(res?.error ?? "Error al iniciar la captura.");
    });
  }

  function setRunning(v) {
    isRunning = v;
    statusPill.className = "status-pill" + (v ? " active" : "");
    statusText.textContent = v ? "Activo" : "Inactivo";
    btnToggle.textContent = v ? "Detener subtítulos" : "Iniciar subtítulos";
    btnToggle.className = "btn-main " + (v ? "btn-stop" : "btn-start");
  }

  function updateFontLabel()    { fontSizeVal.textContent = fontSize.value + "px"; }
  function updateOpacityLabel() { bgOpacityVal.textContent = Math.round(parseFloat(bgOpacity.value)*100) + "%"; }
  function updateLangBtns()     { langBtns.forEach(b => b.classList.toggle("selected", b.dataset.lang === selectedLang)); }
  function updateSwatches()     { swatches.forEach(s => s.classList.toggle("active", s.dataset.color === selectedColor)); }

  async function sendToContent(msg) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
  }

  function save() {
    chrome.storage.sync.set({
      deepgramKey: keyDG.value.trim(),
      deeplKey: keyDL.value.trim(),
      sourceLang: sourceLang.value,
      targetLang: selectedLang,
      translateEnabled: translateToggle.checked,
      fontSize: fontSize.value,
      bgOpacity: bgOpacity.value,
      subsEnabled: subsEnabled.checked,
      diarize: diarizeToggle.checked,
      textColor: selectedColor,
    });
  }

  function showError(msg) { errorMsg.textContent = msg; errorMsg.style.display = "block"; }
  function hideError()    { errorMsg.style.display = "none"; }
})();
