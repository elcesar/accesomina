# Retención temporal de planes públicos

Issue: #341. PR funcional previo: #377 (integrado en `main`).

## Decisión vigente

Hasta que la mesa comercial apruebe formalmente nombres, precios y condiciones, Nexo Klar no publica ofertas comerciales.

- La ruta pública `/planes` redirige a `/contacto`; navegación, portada y alta no deben comunicar planes, cupos ni precios.
- `GET /api/plans` y `POST /api/plans/recommend` responden `404 PUBLIC_PLANS_NOT_AVAILABLE`.
- `POST /api/commercial-requests` responde `503 COMMERCIAL_OFFER_NOT_APPROVED` antes de procesar datos comerciales.
- El catálogo privado autenticado y los contratos existentes permanecen disponibles. Las ofertas con precio sujeto a cotización no exponen importes.

## Cobertura automatizada

La política se comprueba en tres niveles:

1. `server/test/subscription-catalog.test.js` verifica el cierre de endpoints públicos y usa el catálogo privado autenticado para las reglas operacionales de suscripción.
2. `nexo-v2/e2e/qa-public-pages.spec.js` deriva las rutas indexables del mismo gate de publicación y confirma que `/planes` redirige a Contacto cuando está cerrado.
3. `nexo-v2/e2e/public-commercial-hold.spec.js` se ejecuta en el workflow de interfaz a 375 y 1440 px para comprobar ausencia de CTAs, tarjetas y mensajes comerciales no aprobados.

## Reapertura futura

No basta cambiar una página o una prueba. Una decisión comercial posterior debe actualizar coordinadamente los gates de frontend y backend, los enlaces públicos, las respuestas de API y sus pruebas; además requiere revisión, despliegue coordinado y retest QA. Este documento no aprueba ofertas ni acredita que un despliegue ya esté publicado.
