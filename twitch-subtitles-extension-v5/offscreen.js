// offscreen.js v5 — diarización de hablantes + mejoras

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

  captureStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  });

  // Reconectar audio a los altavoces
  audioContext = new AudioContext();
  sourceNode = audioContext.createMediaStreamSource(captureStream);
  sourceNode.connect(audioContext.destination);

  const { apiKey, sourceLang, targetLang, translateEnabled, apiKeyDeepL, diarize } = config;

  const params = new URLSearchParams({
    model: "nova-2",
    language: sourceLang || "en",
    punctuate: "true",
    interim_results: "true",
    endpointing: "300",
    smart_format: "true",
  });

  // Activar diarización si está habilitada
  if (diarize) {
    params.set("diarize", "true");
    params.set("multichannel", "false");
  }

  websocket = new WebSocket(
    `wss://api.deepgram.com/v1/listen?${params.toString()}`,
    ["token", apiKey]
  );

  websocket.onopen = () => {
    console.log("[TwitchSubs] WebSocket conectado con diarización:", diarize);
    mediaRecorder = new MediaRecorder(captureStream, {
      mimeType: "audio/webm;codecs=opus",
    });
    mediaRecorder.ondataavailable = (e) => {
      if (websocket?.readyState === WebSocket.OPEN && e.data.size > 0) {
        websocket.send(e.data);
      }
    };
    mediaRecorder.start(250);
  };

  websocket.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    const alt = data?.channel?.alternatives?.[0];
    if (!alt?.transcript?.trim()) return;

    const isFinal = data.is_final;

    // Extraer hablantes si hay diarización
    let segments = [];

    if (diarize && alt.words?.length > 0) {
      // Agrupar palabras por hablante
      let currentSpeaker = null;
      let currentWords = [];

      for (const word of alt.words) {
        const speaker = word.speaker ?? 0;
        if (speaker !== currentSpeaker) {
          if (currentWords.length > 0) {
            segments.push({ speaker: currentSpeaker, text: currentWords.join(" ") });
          }
          currentSpeaker = speaker;
          currentWords = [word.punctuated_word ?? word.word];
        } else {
          currentWords.push(word.punctuated_word ?? word.word);
        }
      }
      if (currentWords.length > 0) {
        segments.push({ speaker: currentSpeaker, text: currentWords.join(" ") });
      }
    } else {
      segments = [{ speaker: 0, text: alt.transcript.trim() }];
    }

    // Traducir si corresponde
    if (translateEnabled && apiKeyDeepL) {
      for (let i = 0; i < segments.length; i++) {
        try {
          segments[i].text = await translateText(segments[i].text, targetLang, apiKeyDeepL);
        } catch (e) {
          console.warn("[TwitchSubs] Error traducción:", e.message);
        }
      }
    }

    chrome.runtime.sendMessage({ action: "SUBTITLE", segments, isFinal });
  };

  websocket.onerror = (e) => console.error("[TwitchSubs] WS error:", e);
  websocket.onclose = () => console.log("[TwitchSubs] WS cerrado");
}

function stopCapture() {
  mediaRecorder?.stop();
  mediaRecorder = null;
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
    body: new URLSearchParams({ auth_key: apiKey, text, target_lang: targetLang.toUpperCase() }),
  });
  const json = await res.json();
  return json.translations?.[0]?.text ?? text;
}
