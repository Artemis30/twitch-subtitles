// background.js v5

let activeTabId = null;
let isRunning = false;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "START_CAPTURE") {
    startCapture(msg.config, msg.tabId)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  if (msg.action === "STOP_CAPTURE") {
    stopCapture().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.action === "GET_STATUS") {
    sendResponse({ running: isRunning });
  }
  if (msg.action === "SUBTITLE") {
    if (activeTabId) {
      chrome.tabs.sendMessage(activeTabId, {
        action: "SUBTITLE",
        segments: msg.segments,
        isFinal: msg.isFinal,
      }).catch(() => {});
    }
  }
});

async function startCapture(config, tabId) {
  if (isRunning) {
    await stopCapture();
    await new Promise(r => setTimeout(r, 600));
  }

  activeTabId = tabId;

  const streamId = await new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
      if (chrome.runtime.lastError) {
        const m = chrome.runtime.lastError.message ?? "";
        reject(new Error(m.includes("active stream")
          ? "Ya hay una captura activa. Recarga Twitch e inténtalo de nuevo."
          : m));
      } else if (!id) {
        reject(new Error("No se pudo obtener el stream de audio."));
      } else {
        resolve(id);
      }
    });
  });

  await ensureOffscreenDocument();
  await chrome.runtime.sendMessage({ target: "offscreen", action: "START_CAPTURE", config, streamId });
  isRunning = true;
}

async function stopCapture() {
  try { await chrome.runtime.sendMessage({ target: "offscreen", action: "STOP_CAPTURE" }); } catch (_) {}
  try {
    const ctx = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
    if (ctx.length > 0) await chrome.offscreen.closeDocument();
  } catch (_) {}
  if (activeTabId) chrome.tabs.sendMessage(activeTabId, { action: "CLEAR_SUBTITLE" }).catch(() => {});
  isRunning = false;
  activeTabId = null;
}

async function ensureOffscreenDocument() {
  const ctx = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (ctx.length > 0) return;
  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL("offscreen.html"),
    reasons: ["USER_MEDIA"],
    justification: "Captura de audio de la pestaña para transcripción en tiempo real",
  });
}
