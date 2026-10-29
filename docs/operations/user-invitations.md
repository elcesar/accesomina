# Invitación de primer acceso

## Preparación de la liberación

Aplicar `database/postgres/024_user_invitations.sql` mediante el proceso de migración habitual antes de iniciar la versión corregida. La tabla conserva el hash del único enlace vigente de cada usuario y utiliza RLS por empresa. No modifica roles, permisos ni contraseñas de cuentas existentes.

La bienvenida usa la configuración SMTP global del backend (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`) y `APP_ORIGIN` para el enlace. La configuración de Comunicaciones por empresa no sustituye esta configuración de acceso. No guardar credenciales en el repositorio ni en evidencias de QA.

## Flujo y contrato

- `POST /api/users`: sólo administradores. Crea el usuario y una invitación pendiente en una transacción; después intenta la entrega. Responde `201 { user, invitation }` incluso cuando SMTP falla, para que la cuenta persistida no se cree nuevamente. Un correo duplicado en la misma empresa responde `409 USER_ALREADY_EXISTS`.
- `GET /api/users`: añade `invitation: null | { status, expiresAt, lastSentAt, failureCode }`. Los estados son `pending`, `sent`, `failed` y `accepted`; un enlace puede estar vencido además de haber sido enviado. No expone el token ni su hash.
- `POST /api/users/:id/resend-invitation`: sólo administradores de la empresa. Conserva el usuario, rol, permisos y contraseña; reemplaza primero el hash, invalidando el enlace anterior, y luego intenta enviar una nueva invitación. No admite cuentas aceptadas, desactivadas ni cuentas antiguas sin invitación pendiente.
- La URL pública es `/aceptar-invitacion?tenant=...&token=...`.
- `POST /api/auth/invitations/verify`, cuerpo `{ tenant, token }`: valida empresa y usuario activos, vigencia y uso del enlace; devuelve `{ companyName, companyRut, email, fullName, expiresAt }` sólo al poseedor de un enlace válido.
- `POST /api/auth/invitations/accept`, cuerpo `{ tenant, token, newPassword, confirmPassword }`: exige una contraseña de 12–128 caracteres con mayúscula, minúscula y número; devuelve `204` al consumir el enlace y establecer la contraseña personal. No inicia sesión. El próximo ingreso normal conserva el requisito de MFA.

La invitación vence a las 24 horas, es de un solo uso y sólo se persiste su SHA-256. Aceptarla deja `must_change_password=false` porque el usuario acaba de elegir su contraseña. Revoca sesiones y tokens de recuperación anteriores. Establecer una contraseña mediante recuperación o cambio personal también retira una invitación previa. Las operaciones serializan el bloqueo del usuario y vuelven a comprobar el enlace dentro de la transacción.

## Entrega y diagnóstico seguro

`sent` significa que SMTP aceptó al destinatario esperado; no certifica recepción final ni lectura. El envío tiene un límite total de 25 segundos. Las causas persistidas son únicamente `SMTP_NOT_CONFIGURED`, `SMTP_AUTH_FAILED`, `SMTP_CONNECTION_FAILED` y `DELIVERY_FAILED`.

La invitación queda `pending` antes de enviar; si el proceso se interrumpe o falla la persistencia posterior, el administrador puede consultar la cuenta y reenviar. No se ejecuta un reintento automático que pueda duplicar cuentas o mensajes. Un resultado tardío de SMTP sólo actualiza el hash de la generación que lo originó y no revierte una aceptación ni un reenvío posterior.

Los eventos de auditoría son `user.invitation.created`, `user.invitation.delivery.sent`, `user.invitation.delivery.failed` y `user.invitation.accepted`. No contienen token, URL, contraseña ni cuerpo/respuesta SMTP. Un fallo al persistir la entrega genera únicamente el código operativo `DELIVERY_STATUS_WRITE_FAILED`, sin secretos del proveedor.

## Compatibilidad y límites

Los clientes API existentes todavía pueden suministrar el `password` opcional a `POST /api/users`; se valida y guarda como antes, y la invitación se intenta igualmente. No se devuelve una contraseña temporal ni se incluye una contraseña en el correo de bienvenida. La interfaz de alta no envía ese campo.

El restablecimiento administrativo anterior mantiene su contrato con contraseña temporal y queda fuera de este cambio. La recuperación pública conserva sus respuestas genéricas y su plazo de 30 minutos. Registrar una Persona en el módulo operacional sigue siendo una operación distinta de dar acceso a un usuario; no crea accesos automáticamente.

Antes de liberar: ejecutar migración y pruebas en un entorno aislado, comprobar recepción con una casilla QA autorizada, probar enlace vencido/reenviado/usado, aislamiento por empresa, fallos SMTP, cambio personal y recuperación. No publicar enlaces activos, credenciales ni datos reales en capturas o issues.
