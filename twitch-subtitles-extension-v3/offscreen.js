// offscreen.js v3
// Fix principal: reconectar el audio capturado a los altavoces mediante AudioContext
// para que el usuario siga escuchando el stream mientras se transcribe.

let mediaRecorder = null;
let websocket = null;
let captureStream = null;
let audioContext = null;
let sourceNode = null;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.target !== "offscreen") return;

  if (msg.action === "START_CAPTURE") {
    startCapture(msg.config, msg.streamId)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.action === "STOP_CAPTURE") {
    stopCapture();
    sendResponse({ ok: true });
  }
});

async function startCapture(config, streamId) {
  if (mediaRecorder) stopCapture();

  // 1. Capturar audio de la pestaña
  captureStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  });

  // 2. *** FIX AUDIO CORTADO ***
  // Reconectar el stream a los altavoces mediante Web Audio API
  // sin esto el audio queda "secuestrado" por getUserMedia y no suena
  audioContext = new AudioContext();
  sourceNode = audioContext.createMediaStreamSource(captureStream);
  sourceNode.connect(audioContext.destination);

  // 3. Conectar con Deepgram vía WebSocket
  const { apiKey, sourceLang, targetLang, translateEnabled, apiKeyDeepL } = config;

  const params = new URLSearchParams({
    model: "nova-2",
    language: sourceLang || "en",
    punctuate: "true",
    interim_results: "true",
    endpointing: "300",
    smart_format: "true",
  });

  websocket = new WebSocket(
    `wss://api.deepgram.com/v1/listen?${params.toString()}`,
    ["token", apiKey]
  );

  websocket.onopen = () => {
    console.log("[TwitchSubs] WebSocket conectado a Deepgram");

    // Crear un stream separado SOLO para enviar a Deepgram
    // usando el mismo captureStream (no afecta al audio de los altavoces)
    mediaRecorder = new MediaRecorder(captureStream, {
      mimeType: "audio/webm;codecs=opus",
    });

    mediaRecorder.ondataavailable = (e) => {
      if (websocket?.readyState === WebSocket.OPEN && e.data.size > 0) {
        websocket.send(e.data);
      }
    };

    mediaRecorder.start(250); // chunks de 250ms para baja latencia
  };

  websocket.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    const alt = data?.channel?.alternatives?.[0];
    if (!alt?.transcript?.trim()) return;

    let text = alt.transcript.trim();
    const isFinal = data.is_final;

    if (translateEnabled && apiKeyDeepL) {
      try {
        text = await translateText(text, targetLang, apiKeyDeepL);
      } catch (e) {
        console.warn("[TwitchSubs] Error traducción:", e.message);
      }
    }

    chrome.runtime.sendMessage({ action: "SUBTITLE", text, isFinal });
  };

  websocket.onerror = (e) => console.error("[TwitchSubs] WS error:", e);
  websocket.onclose = () => {
    console.log("[TwitchSubs] WebSocket cerrado");
  };
}

function stopCapture() {
  mediaRecorder?.stop();
  mediaRecorder = null;

  // Desconectar el nodo de audio antes de cerrar el contexto
  sourceNode?.disconnect();
  sourceNode = null;
  audioContext?.close();
  audioContext = null;

  captureStream?.getTracks().forEach((t) => t.stop());
  captureStream = null;

  websocket?.close();
  websocket = null;
}

async function translateText(text, targetLang, apiKey) {
  const res = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      auth_key: apiKey,
      text,
      target_lang: targetLang.toUpperCase(),
    }),
  });
  const json = await res.json();
  return json.translations?.[0]?.text ?? text;
}
