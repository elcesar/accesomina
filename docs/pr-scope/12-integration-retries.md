# Reintentos confiables de integraciones

## Objetivo
Evitar pérdida o duplicación de comunicaciones y sincronizaciones externas.

## Criterios de aceptación
- Identificador idempotente por operación.
- Reintentos con límite y espera progresiva.
- Estado visible: pendiente, enviado, fallido o agotado.
- Reintento manual autorizado y auditado.

## Pruebas
Timeout, respuesta 500, duplicado y recuperación posterior.
