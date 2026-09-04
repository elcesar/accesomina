# Configuracion voz chilena para videos Nexo Klar

Desde esta version, todos los videos comerciales y tutoriales de Nexo Klar deben usar la voz:

- Proveedor: Microsoft Azure Speech
- Voz: `es-CL-CatalinaNeural`
- Idioma: Espanol Chile
- Ritmo recomendado: `+50%`, equivalente al estilo rapido 1.5x solicitado para piezas comerciales.

## Variables necesarias

Agregar en `.env`:

```bash
AZURE_SPEECH_KEY=clave-entregada-por-azure
AZURE_SPEECH_REGION=chilecentral
AZURE_SPEECH_VOICE=es-CL-CatalinaNeural
AZURE_SPEECH_RATE=+50%
```

Si el recurso Azure Speech se crea en otra region, reemplazar `chilecentral` por la region real del recurso.

## Generar audio desde un guion

```bash
pnpm run video:voice -- --text-file outputs/guion_video.txt --out outputs/voz_catalina.mp3
```

Tambien se puede cambiar el ritmo para videos mas pausados:

```bash
pnpm run video:voice -- --text-file outputs/guion_video.txt --out outputs/voz_catalina.mp3 --rate +25%
```

## Uso en videos

El archivo MP3 generado debe reemplazar cualquier audio local anterior, por ejemplo voces de macOS como `Paulina`.

Para videos de venta, mantener:

- Voz: `es-CL-CatalinaNeural`.
- Ritmo: `+50%`.
- Mensaje directo, comercial y enfocado en control, cumplimiento, trazabilidad y reduccion de riesgo operativo.

Para videos tutoriales, se recomienda usar:

- Voz: `es-CL-CatalinaNeural`.
- Ritmo: entre `+20%` y `+35%`, para que el cliente entienda cada paso.
