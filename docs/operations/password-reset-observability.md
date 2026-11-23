# Recuperación de contraseña: trazabilidad SMTP

El endpoint `POST /api/auth/forgot-password` conserva una respuesta pública genérica para solicitudes cuyo RUT y correo tienen formato válido. No revela si la cuenta existe, si el servicio SMTP está configurado ni el detalle técnico de un fallo.

## Eventos de auditoría

Para una cuenta activa encontrada, el backend persiste uno de estos eventos:

- `user.password_reset_delivery.sent`: el servidor SMTP aceptó la solicitud de envío.
- `user.password_reset_delivery.failed`: no se pudo entregar la solicitud al servidor SMTP.

El valor `sent` significa aceptación por el servidor SMTP; no confirma lectura ni recepción final por el destinatario.

Las razones persistidas se normalizan, por ejemplo:

- `SMTP_NOT_CONFIGURED`
- `SMTP_AUTH_FAILED`
- `SMTP_CONNECTION_FAILED`
- `DELIVERY_FAILED`

No se persisten contraseñas SMTP, tokens de recuperación, URL de restablecimiento ni cuerpo del mensaje.

## Logs operacionales

El backend escribe una línea JSON a stderr por el resultado SMTP y, si corresponde, otra cuando falla la escritura de auditoría. Cada línea incluye:

- fecha UTC (`at`)
- servicio
- evento
- resultado
- código normalizado
- `requestId` de correlación

No incluye correo, RUT, token, URL de restablecimiento, contraseña SMTP ni contenido del mensaje.

## Consulta en producción

La ubicación depende del entorno efectivo:

- **Máquina virtual / systemd:** consultar la salida del servicio con `journalctl -u <servicio> --since "1 hour ago"`.
- **Contenedor:** consultar los logs del contenedor u orquestador que capture stdout/stderr.
- **ECS/CloudWatch:** consultar el grupo de logs y filtrar por `password_reset.smtp_delivery` o por `requestId`.

Antes de afirmar dónde están disponibles los logs, confirmar el mecanismo de despliegue real de NEXO KLAR. No registrar secretos al compartir evidencia de QA.
