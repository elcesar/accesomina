# Solicitudes de demostración: evidencia SMTP y operación

Issues: #211 (flujo de contacto) y #298 (infraestructura SMTP).

## Significado de los estados

El formulario público registra la solicitud antes de intentar enviarla. Desde la migración `031_contact_delivery_diagnostics.sql`:

- `delivery_status='sent'` y `delivery_outcome='SMTP_ACCEPTED'` significan únicamente que el servidor SMTP aceptó el destinatario comercial configurado.
- `delivery_status='failed'` significa que el destinatario no fue aceptado, la entrega quedó pendiente/rechazada o ocurrió una falla de configuración, autenticación o transporte.
- `sent` no certifica que el mensaje llegó a una bandeja, superó filtros ni fue leído.
- Filas anteriores se conservan como `LEGACY_UNVERIFIED` o `LEGACY_FAILED`; no se reinterpretan como aceptación SMTP.

La respuesta HTTP sólo devuelve 201 tras `SMTP_ACCEPTED`. Si el resultado de SMTP no contiene el destinatario comercial normalizado en `accepted`, o si el transporte falla, devuelve 503 con un mensaje genérico.

## Datos de diagnóstico seguros

La tabla conserva únicamente un outcome de una lista controlada, el código SMTP numérico cuando existe, hash SHA-256 del `messageId` y la hora de intento. Los logs incluyen IDs opacos de solicitud, outcome y esos diagnósticos técnicos.

No se persisten ni registran el correo del destinatario, arreglos `accepted/rejected/pending`, respuesta del proveedor, mensajes de excepción, payload del formulario, contraseñas, secretos ni stack traces.

## Límite de la corrección

Esta implementación se prueba con transporte simulado: no envía correos y no modifica ECS, DNS, proveedores ni secretos. La recepción real, la coherencia TLS/puerto, la rotación de la credencial y la prueba desde ECS siguen siendo actividades de #298. Para validar producción se necesita un buzón QA autorizado y evidencia separada de aceptación SMTP y llegada al buzón.
