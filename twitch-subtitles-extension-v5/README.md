# TwitchSubs — Subtítulos en tiempo real para Twitch

Extensión de Chrome que transcribe y traduce cualquier stream de Twitch en tiempo real usando Deepgram (transcripción) y DeepL (traducción opcional).

---

## Instalación en Chrome (modo desarrollador)

1. Descarga o descomprime esta carpeta en tu ordenador.
2. Añade iconos a la carpeta `icons/` (ver sección abajo).
3. Abre Chrome y ve a `chrome://extensions`.
4. Activa el **Modo desarrollador** (esquina superior derecha).
5. Haz clic en **"Cargar descomprimida"**.
6. Selecciona la carpeta `twitch-subtitles-extension`.
7. La extensión aparecerá en la barra de herramientas.

---

## Iconos requeridos

La carpeta `icons/` necesita tres archivos PNG:
- `icon16.png` — 16×16 px
- `icon48.png` — 48×48 px
- `icon128.png` — 128×128 px

Puedes usar cualquier imagen PNG y redimensionarla, o generarla con herramientas como [favicon.io](https://favicon.io).

---

## Configuración

### 1. Deepgram (obligatorio — transcripción)
- Regístrate gratis en [console.deepgram.com](https://console.deepgram.com)
- Crea una API key nueva.
- Incluye **200 horas gratis al mes** en el plan gratuito.

### 2. DeepL (opcional — traducción)
- Regístrate en [deepl.com/pro-api](https://www.deepl.com/pro-api)
- Usa el plan **Free API** (500.000 caracteres/mes gratis).
- La key tiene el formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx`

---

## Uso

1. Abre un stream en `twitch.tv`.
2. Haz clic en el icono de la extensión en la barra de herramientas.
3. Introduce tu API key de Deepgram.
4. Selecciona el idioma del streamer y el idioma destino.
5. Haz clic en **"Iniciar subtítulos"**.
6. ¡Los subtítulos aparecerán sobre el player!

---

## Archivos del proyecto

```
twitch-subtitles-extension/
├── manifest.json       → Configuración de la extensión (permisos, etc.)
├── background.js       → Captura audio + WebSocket con Deepgram + traducción
├── content_script.js   → Inyecta el overlay de subtítulos en Twitch
├── subtitles.css       → Estilos del overlay
├── popup.html          → Interfaz del panel de control
├── popup.js            → Lógica del panel
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Arquitectura

```
[Pestaña Twitch]
      ↓ chrome.tabCapture.capture()
[background.js]
      ↓ WebSocket streaming (audio/webm, chunks 250ms)
[Deepgram API] — transcripción en tiempo real (~800ms latencia)
      ↓ texto transcrito
[DeepL API] — traducción (opcional)
      ↓ chrome.tabs.sendMessage()
[content_script.js] — inyecta texto en overlay sobre el player
```

---

## Limitaciones conocidas

- **chrome.tabCapture** requiere que la pestaña esté activa (primer plano).
- Twitch es una SPA: al cambiar de canal el overlay se re-crea automáticamente.
- El audio llega al CDN de Twitch con ~5-10s de retraso; los subtítulos van sobre el audio en vivo, puede haber desfase visual con el video.
- No funciona en Firefox (usa `tabCapture` específico de Chrome/Edge).

---

## Próximos pasos sugeridos

- [ ] Soporte para Firefox usando `browser.tabs.captureTab`
- [ ] Modo "solo subtítulos" sin traducción para ahorro de coste
- [ ] Publicar en Chrome Web Store
- [ ] Historial de transcripción descargable
- [ ] Detección automática del idioma del streamer

---

## Licencia

MIT — libre para usar, modificar y distribuir.
