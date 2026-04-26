// content_script.js v5 — multi-hablante con colores + configuración de estilo

(function () {
  "use strict";

  const CONTAINER_ID = "twitchsubs-container";

  // Paleta de colores por hablante (hasta 8)
  const SPEAKER_COLORS = [
    "#a78bfa", // violeta
    "#34d399", // verde
    "#f87171", // rojo
    "#60a5fa", // azul
    "#fbbf24", // amarillo
    "#f472b6", // rosa
    "#4ade80", // verde claro
    "#fb923c", // naranja
  ];

  let settings = {
    fontSize: 16,
    bgOpacity: 0.82,
    enabled: true,
    textColor: "#ffffff",
    diarize: true,
  };

  let hideTimeout = null;

  chrome.storage.sync.get(["subtitleSettings"], (res) => {
    if (res.subtitleSettings) settings = { ...settings, ...res.subtitleSettings };
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "SUBTITLE" && settings.enabled) {
      showSubtitles(msg.segments, msg.isFinal);
    }
    if (msg.action === "CLEAR_SUBTITLE") {
      clearSubtitles();
      removeOverlay();
    }
    if (msg.action === "UPDATE_SETTINGS") {
      settings = { ...settings, ...msg.settings };
      applySettings();
    }
  });

  // ── Player finder con reintentos ─────────────────────────────────────────

  function findPlayer() {
    return (
      document.querySelector(".video-player__container") ||
      document.querySelector(".video-player") ||
      document.querySelector("[data-a-target='video-player']") ||
      document.querySelector(".player-video") ||
      document.querySelector("video")?.closest("div[class]")
    );
  }

  function getOrCreateContainer(retries = 10) {
    const existing = document.getElementById(CONTAINER_ID);
    if (existing) return existing;

    const player = findPlayer();
    if (!player) {
      if (retries > 0) setTimeout(() => getOrCreateContainer(retries - 1), 800);
      return null;
    }

    if (getComputedStyle(player).position === "static") {
      player.style.position = "relative";
    }

    const container = document.createElement("div");
    container.id = CONTAINER_ID;
    container.style.cssText = `
      position: absolute;
      bottom: 64px;
      left: 0;
      right: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      pointer-events: none;
      z-index: 99999;
      padding: 0 48px;
    `;

    player.appendChild(container);
    console.log("[TwitchSubs] Container v5 inyectado");
    return container;
  }

  function removeOverlay() {
    document.getElementById(CONTAINER_ID)?.remove();
  }

  // ── Mostrar subtítulos multi-hablante ────────────────────────────────────

  function showSubtitles(segments, isFinal) {
    let container = document.getElementById(CONTAINER_ID);
    if (!container) {
      container = getOrCreateContainer();
      if (!container) return;
    }

    // Limpiar líneas anteriores
    container.innerHTML = "";

    for (const seg of segments) {
      const speakerIdx = (seg.speaker ?? 0) % SPEAKER_COLORS.length;
      const speakerColor = SPEAKER_COLORS[speakerIdx];

      const line = document.createElement("div");
      line.style.cssText = `
        display: flex;
        align-items: baseline;
        gap: 8px;
        background: rgba(0,0,0,${settings.bgOpacity});
        padding: 5px 14px 6px;
        border-radius: 4px;
        max-width: 85%;
        border-left: 3px solid ${speakerColor};
      `;

      // Badge del hablante (solo si hay diarización activa y más de 1 hablante)
      if (settings.diarize && segments.length > 1) {
        const badge = document.createElement("span");
        badge.textContent = `S${(seg.speaker ?? 0) + 1}`;
        badge.style.cssText = `
          font-family: 'Helvetica Neue', Arial, sans-serif;
          font-size: ${Math.max(10, settings.fontSize - 4)}px;
          font-weight: 700;
          color: ${speakerColor};
          flex-shrink: 0;
          letter-spacing: 0.05em;
        `;
        line.appendChild(badge);
      }

      const text = document.createElement("span");
      text.textContent = seg.text;
      text.style.cssText = `
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: ${settings.fontSize}px;
        color: ${settings.textColor};
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
        text-shadow: 0 1px 4px rgba(0,0,0,0.9);
      `;

      line.appendChild(text);
      container.appendChild(line);
    }

    // Auto-ocultar tras 4s si es resultado final
    if (isFinal) {
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        container.innerHTML = "";
      }, 4000);
    }
  }

  function clearSubtitles() {
    const container = document.getElementById(CONTAINER_ID);
    if (container) container.innerHTML = "";
    clearTimeout(hideTimeout);
  }

  function applySettings() {
    // Re-renderizar con nuevos estilos si hay contenido visible
    const container = document.getElementById(CONTAINER_ID);
    if (container && container.children.length > 0) {
      // Los estilos se aplican en el próximo render de subtítulos
    }
  }

  // ── Observer SPA ──────────────────────────────────────────────────────────

  const observer = new MutationObserver(() => {
    if (!document.getElementById(CONTAINER_ID)) {
      setTimeout(() => getOrCreateContainer(), 1500);
    }
  });

  observer.observe(document.body, { childList: true, subtree: false });

  console.log("[TwitchSubs] Content script v5 cargado");
})();
