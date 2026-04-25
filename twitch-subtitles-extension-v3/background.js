// background.js (MV3 corregido)
// En Manifest V3, tabCapture.capture() no existe en service workers.
// La solución: usar tabCapture.getMediaStreamId() aquí y pasar el streamId
// al documento offscreen, que hace el getUserMedia real.

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
    stopCapture();
    sendResponse({ ok: true });
  }

  if (msg.action === "GET_STATUS") {
    sendResponse({ running: isRunning });
  }

  // El offscreen reenvía los subtítulos aquí para que los mandemos al content_script
  if (msg.action === "SUBTITLE") {
    if (activeTabId) {
      chrome.tabs.sendMessage(activeTabId, {
        action: "SUBTITLE",
        text: msg.text,
        isFinal: msg.isFinal,
      }).catch(() => {});
    }
  }
});

async function startCapture(config, tabId) {
  activeTabId = tabId;

  // 1. Obtener el streamId (esto SÍ funciona en service worker MV3)
  const streamId = await new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
      if (chrome.runtime.lastError || !id) {
        reject(new Error(chrome.runtime.lastError?.message ?? "No se pudo obtener el streamId"));
      } else {
        resolve(id);
      }
    });
  });

  // 2. Crear el documento offscreen si no existe
  await ensureOffscreenDocument();

  // 3. Pasar el streamId al offscreen para que haga el getUserMedia
  await chrome.runtime.sendMessage({
    target: "offscreen",
    action: "START_CAPTURE",
    config,
    streamId,
  });

  isRunning = true;
}

function stopCapture() {
  chrome.runtime.sendMessage({ target: "offscreen", action: "STOP_CAPTURE" }).catch(() => {});
  if (activeTabId) {
    chrome.tabs.sendMessage(activeTabId, { action: "CLEAR_SUBTITLE" }).catch(() => {});
  }
  isRunning = false;
  activeTabId = null;
}

async function ensureOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  if (existingContexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL("offscreen.html"),
    reasons: ["USER_MEDIA"],
    justification: "Captura de audio de la pestaña para transcripción en tiempo real",
  });
}
