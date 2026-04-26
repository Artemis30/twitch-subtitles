[README.md](https://github.com/user-attachments/files/27104229/README.md)
<div align="center">

# 💬 TwitchSubs

**Real-time subtitles and translation for any Twitch stream**

*No streamer setup required · Works on any channel · Free & open source*

[![License: MIT](https://img.shields.io/badge/License-MIT-9147ff.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-9147ff)](https://developer.chrome.com/docs/extensions/mv3/)
[![Powered by Deepgram](https://img.shields.io/badge/Powered%20by-Deepgram-00c472)](https://deepgram.com)

[English](#english) · [Español](#español)

</div>

---

## English

### What is TwitchSubs?

TwitchSubs is a Chrome extension that adds real-time captions to any Twitch stream — without the streamer having to do anything.

Most streams have no subtitles at all. This is a problem for deaf and hard-of-hearing viewers, and also for anyone trying to watch a streamer in a language they don't speak natively. TwitchSubs fixes that from the viewer's side.

### Features

- **Real-time transcription** — captions appear directly over the Twitch player with ~800ms latency
- **Automatic translation** — 30+ languages powered by DeepL
- **Speaker detection** — when multiple people are talking, each speaker gets their own color-coded line (S1, S2...)
- **Fully customizable** — font size, text color, background opacity
- **Privacy-first** — audio goes directly from your browser to Deepgram's API. Nothing passes through any server of ours
- **Free** — uses your own API keys (both have generous free tiers)

### Installation

> ⚠️ The extension is not yet on the Chrome Web Store. For now, you need to install it manually in developer mode — it takes about 2 minutes.

**Step 1 — Download**

Click **Code → Download ZIP** on this page and unzip it somewhere on your computer.

**Step 2 — Load in Chrome**

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select the `twitch-subtitles-extension-v5` folder (the one containing `manifest.json`)

The TwitchSubs icon will appear in your toolbar. If you don't see it, click the puzzle piece 🧩 icon and pin it.

### Setup

**Deepgram API key (required — transcription)**

1. Create a free account at [console.deepgram.com](https://console.deepgram.com)
2. Go to **API Keys → Create a new API key**
3. Copy the key (starts with `dg_...`)
4. Paste it in the TwitchSubs popup

Free tier includes **200 hours/month** — more than enough for regular use.

**DeepL API key (optional — translation)**

1. Sign up at [deepl.com/pro-api](https://www.deepl.com/pro-api) (Free API plan)
2. Find your key under **Account → Authentication Key**
3. It ends in `:fx` — that's the free plan indicator
4. Paste it in the TwitchSubs popup

Free tier includes **500,000 characters/month**.

### How to use

1. Open any stream on [twitch.tv](https://twitch.tv)
2. Click the TwitchSubs icon in your toolbar
3. Enter your Deepgram API key
4. Select the streamer's language and your target language
5. Click **Start subtitles**
6. Captions will appear over the player ✓

To stop, click the icon again and hit **Stop subtitles**.

### How it works

```
[Twitch tab]
    ↓  chrome.tabCapture.getMediaStreamId()
[background.js]
    ↓  streams streamId to offscreen document
[offscreen.js]
    ↓  getUserMedia() → AudioContext (keeps audio playing)
    ↓  MediaRecorder → WebSocket chunks every 250ms
[Deepgram Nova-2 API]  ~800ms latency
    ↓  transcript + speaker IDs
[DeepL API]  optional translation
    ↓  chrome.tabs.sendMessage()
[content_script.js]  injects subtitle overlay onto the player
```

### Known limitations

- Requires the Twitch tab to be in the foreground (Chrome restriction on `tabCapture`)
- Twitch's CDN introduces a few seconds of audio delay — subtitles are synced to the live audio, not the video
- Does not work on Firefox (uses Chrome-specific APIs)
- Accuracy varies by speaker clarity, accent, and background noise level

### Roadmap

- [ ] Firefox support
- [ ] Auto language detection
- [ ] Downloadable transcript history
- [ ] Chrome Web Store release
- [ ] Keyboard shortcut to toggle subtitles

### Contributing

Pull requests are welcome. If you find a bug or have a feature request, please [open an issue](../../issues).

### License

MIT — free to use, modify and distribute.

---

## Español

### ¿Qué es TwitchSubs?

TwitchSubs es una extensión de Chrome que añade subtítulos en tiempo real a cualquier stream de Twitch — sin que el streamer tenga que configurar nada.

La mayoría de streams no tienen subtítulos. Esto es un problema para personas sordas o con dificultades auditivas, y también para cualquiera que quiera ver a un streamer en un idioma que no domina. TwitchSubs lo soluciona desde el lado del espectador.

### Características

- **Transcripción en tiempo real** — los subtítulos aparecen sobre el player de Twitch con ~800ms de latencia
- **Traducción automática** — más de 30 idiomas con DeepL
- **Detección de hablantes** — cuando hay varias personas hablando, cada una tiene su propia línea con color (S1, S2...)
- **Totalmente personalizable** — tamaño de fuente, color del texto, opacidad del fondo
- **Privacidad** — el audio va directamente de tu navegador a la API de Deepgram. No pasa por ningún servidor nuestro
- **Gratis** — usa tus propias API keys (ambas tienen planes gratuitos generosos)

### Instalación

> ⚠️ La extensión todavía no está en la Chrome Web Store. Por ahora hay que instalarla manualmente en modo desarrollador — tarda unos 2 minutos.

**Paso 1 — Descarga**

Haz clic en **Code → Download ZIP** en esta página y descomprime el archivo en tu ordenador.

**Paso 2 — Cargar en Chrome**

1. Abre Chrome y ve a `chrome://extensions`
2. Activa el **Modo desarrollador** (esquina superior derecha)
3. Haz clic en **"Cargar descomprimida"**
4. Selecciona la carpeta `twitch-subtitles-extension-v5` (la que contiene `manifest.json`)

El icono de TwitchSubs aparecerá en tu barra de herramientas. Si no lo ves, haz clic en el puzzle 🧩 y fíjalo.

### Configuración

**API key de Deepgram (obligatoria — transcripción)**

1. Crea una cuenta gratis en [console.deepgram.com](https://console.deepgram.com)
2. Ve a **API Keys → Create a new API key**
3. Copia la key (empieza por `dg_...`)
4. Pégala en el popup de TwitchSubs

El plan gratuito incluye **200 horas/mes**.

**API key de DeepL (opcional — traducción)**

1. Regístrate en [deepl.com/pro-api](https://www.deepl.com/pro-api) (plan Free API)
2. Tu key está en **Cuenta → Authentication Key**
3. Termina en `:fx` — eso indica que es el plan gratuito
4. Pégala en el popup de TwitchSubs

El plan gratuito incluye **500.000 caracteres/mes**.

### Cómo usar

1. Abre cualquier stream en [twitch.tv](https://twitch.tv)
2. Haz clic en el icono de TwitchSubs en la barra de herramientas
3. Introduce tu API key de Deepgram
4. Selecciona el idioma del streamer y tu idioma destino
5. Haz clic en **Iniciar subtítulos**
6. Los subtítulos aparecerán sobre el player ✓

Para parar, haz clic en el icono de nuevo y pulsa **Detener subtítulos**.

### Limitaciones conocidas

- Requiere que la pestaña de Twitch esté en primer plano (restricción de Chrome)
- El CDN de Twitch introduce unos segundos de retraso en el audio — los subtítulos van sincronizados con el audio en vivo, no con el vídeo
- No funciona en Firefox (usa APIs específicas de Chrome)
- La precisión varía según la claridad del hablante, el acento y el ruido de fondo

### Contribuir

Los pull requests son bienvenidos. Si encuentras un bug o tienes una sugerencia, [abre un issue](../../issues).

### Licencia

MIT — libre para usar, modificar y distribuir.

---

<div align="center">

Made with ☕ · If this helped you, consider leaving a ⭐

</div>
