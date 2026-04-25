// content_script.js v3
// Fix: selector de player más robusto + retry automático si no encuentra el player

(function () {
  "use strict";

  const OVERLAY_ID = "twitchsubs-overlay";
  const CONTAINER_ID = "twitchsubs-container";

  let hideTimeout = null;
  let settings = {
    fontSize: 16,
    bgOpacity: 0.82,
    enabled: true,
  };

  chrome.storage.sync.get(["subtitleSettings"], (res) => {
    if (res.subtitleSettings) settings = { ...settings, ...res.subtitleSettings };
  });

  // ── Escuchar mensajes del background ──────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "SUBTITLE" && settings.enabled) {
      showSubtitle(msg.text, msg.isFinal);
    }
    if (msg.action === "CLEAR_SUBTITLE") {
      clearSubtitle();
      removeOverlay();
    }
    if (msg.action === "UPDATE_SETTINGS") {
      settings = { ...settings, ...msg.settings };
      applySettings();
    }
  });

  // ── Buscar el player con reintentos ───────────────────────────────────────
  // Twitch carga el player de forma asíncrona; hay que esperar a que exista.

  function findPlayer() {
    return (
      document.querySelector(".video-player__container") ||
      document.querySelector(".video-player") ||
      document.querySelector("[data-a-target='video-player']") ||
      document.querySelector(".player-video") ||
      document.querySelector("video")?.closest("div[class]")
    );
  }

  function getOrCreateOverlay(retries = 10) {
    // Si ya existe, devolver directamente
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) return existing;

    const player = findPlayer();

    if (!player) {
      if (retries > 0) {
        setTimeout(() => getOrCreateOverlay(retries - 1), 800);
      } else {
        console.warn("[TwitchSubs] No se encontró el player de Twitch tras varios intentos");
      }
      return null;
    }

    // Asegurar posición relativa en el player
    if (getComputedStyle(player).position === "static") {
      player.style.position = "relative";
    }

    // Contenedor del overlay
    const container = document.createElement("div");
    container.id = CONTAINER_ID;
    container.style.cssText = `
      position: absolute;
      bottom: 64px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      pointer-events: none;
      z-index: 99999;
      padding: 0 48px;
    `;

    // El texto de los subtítulos
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = `
      background: rgba(0,0,0,${settings.bgOpacity});
      color: #ffffff;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: ${settings.fontSize}px;
      line-height: 1.5;
      padding: 6px 18px 8px;
      border-radius: 4px;
      max-width: 85%;
      text-align: center;
      opacity: 0;
      transition: opacity 0.2s ease;
      white-space: pre-wrap;
      word-break: break-word;
      text-shadow: 0 1px 4px rgba(0,0,0,0.9);
      letter-spacing: 0.01em;
    `;

    container.appendChild(overlay);
    player.appendChild(container);

    console.log("[TwitchSubs] Overlay inyectado en el player");
    return overlay;
  }

  function removeOverlay() {
    document.getElementById(CONTAINER_ID)?.remove();
  }

  function applySettings() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    overlay.style.fontSize = settings.fontSize + "px";
    overlay.style.background = `rgba(0,0,0,${settings.bgOpacity})`;
  }

  // ── Mostrar subtítulos ─────────────────────────────────────────────────────

  function showSubtitle(text, isFinal) {
    let overlay = document.getElementById(OVERLAY_ID);

    // Si el overlay no existe todavía, intentar crearlo ahora
    if (!overlay) {
      overlay = getOrCreateOverlay();
      if (!overlay) return;
    }

    overlay.textContent = text;
    overlay.style.opacity = "1";

    if (isFinal) {
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        overlay.style.opacity = "0";
      }, 4000);
    }
  }

  function clearSubtitle() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.style.opacity = "0";
    clearTimeout(hideTimeout);
  }

  // ── Observar navegación SPA de Twitch ─────────────────────────────────────

  const observer = new MutationObserver(() => {
    if (!document.getElementById(CONTAINER_ID)) {
      setTimeout(() => getOrCreateOverlay(), 1500);
    }
  });

  observer.observe(document.body, { childList: true, subtree: false });

  console.log("[TwitchSubs] Content script v3 cargado");
})();
