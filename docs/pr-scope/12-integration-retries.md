# Reintentos confiables de integraciones

## Objetivo
Evitar pérdida o duplicación de comunicaciones y sincronizaciones externas mediante una identidad idempotente definida por operación, reintentos controlados y trazabilidad completa.

## Identidad idempotente

Cada operación externa recibe una `idempotencyKey` estable antes de su primer envío. La clave identifica una única intención de negocio, no un intento de red.

Ejemplo: “Crear persona Juan en ERP” conserva la misma clave si el ERP procesa la solicitud pero la respuesta se pierde por timeout. El reintento debe enviar la misma clave para que Nexo Klar y el proveedor reconozcan la operación y no creen un segundo registro.

La identidad incluye al menos tenant, proveedor, tipo de operación, entidad local y versión o referencia de negocio necesaria para distinguir cambios legítimos. Una modificación posterior de la persona genera una nueva operación con una nueva clave; reintentar la misma modificación reutiliza la original.

Dos solicitudes concurrentes con la misma clave se coalescen en una sola ejecución o devuelven el resultado ya en curso/finalizado. Nunca se ejecutan dos envíos independientes para la misma operación.

## Política de reintentos

Los estados de entrega son `pendiente`, `en_reintento`, `enviado`, `fallido` y `agotado`. Estos estados se integran con la salud visible del proveedor definida en PR #49 y enlazan al evento correlacionado.

| Resultado | Tratamiento |
| --- | --- |
| Timeout, fallo de red, 500, 502, 503 | Reintentable con espera progresiva y límite. |
| 400 o validación de negocio | No reintentar automáticamente. |
| 401 o 403 | Error de configuración/autorización; detener y requerir revisión. |
| Éxito remoto con respuesta perdida | Reintentar con la misma clave y consultar/aceptar el resultado idempotente. |

La espera progresiva tiene un máximo de intentos y una ventana temporal definida por proveedor. Al agotarse, la operación queda visible como `agotado`; no se reinicia automáticamente sin que cambie la causa o intervenga una acción autorizada.

## Reintento manual y auditoría

El reintento manual autorizado reutiliza la `idempotencyKey` y el contexto de la operación original cuando intenta completar la misma intención. Crear una nueva operación requiere una acción explícita y justificada, nunca ocurre como efecto secundario de “Reintentar”.

Cada intento registra proveedor, clave idempotente, evento correlacionado, estado anterior/nuevo, fecha, usuario o proceso automático, resultado clasificado y referencia segura del proveedor. No se guardan ni muestran secretos, payloads sensibles o tokens.

Las importaciones siguen la misma garantía: una confirmación o reintento de archivo ya aplicado no genera altas ni actualizaciones duplicadas, conforme al contrato del PR #43.

## Criterios de aceptación
1. Identificador idempotente estable por intención de negocio y operación externa.
2. Dos solicitudes concurrentes con la misma clave no producen dos ejecuciones.
3. Reintentos con límite, espera progresiva y política por clase de error.
4. Estado visible: pendiente, en reintento, enviado, fallido o agotado, enlazado al evento correlacionado.
5. Reintento manual autorizado reutiliza la identidad de la operación original.
6. Importaciones y otras confirmaciones repetidas no generan registros duplicados.
7. Todo intento, recuperación y agotamiento queda auditado sin secretos ni payloads sensibles.

## Pruebas
- Respuesta perdida después de éxito remoto: reintento con misma clave sin duplicar entidad.
- Dos solicitudes concurrentes con la misma clave: una sola ejecución efectiva.
- Timeout, 500 y 503: reintentos progresivos hasta éxito o agotamiento.
- Error 400 de validación y 401/403 de autorización: no se reintentan automáticamente.
- Agotamiento de reintentos visible en el estado de integración y evento correlacionado.
- Reintento manual autorizado, reutilizando clave y registrando auditoría.
- Reintento de importación confirmada: no duplica filas creadas ni actualizadas.
