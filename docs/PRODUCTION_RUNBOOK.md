# Puesta en produccion

## Arquitectura objetivo

1. Balanceador HTTPS con certificado administrado y proteccion WAF.
2. Dos o mas replicas del contenedor, sin volumen compartido y ejecutadas como usuario no privilegiado.
3. PostgreSQL administrado, cifrado, Multi-AZ, respaldo diario y recuperacion a un punto en el tiempo.
4. S3 privado con cifrado, versionado, bloqueo de acceso publico y reglas de conservacion.
5. Servicios HTTPS para antivirus y analisis documental OCR, firma, QR, fotografia, integridad y emisor.
6. SMTP y WhatsApp Cloud API configurados por empresa cuando corresponda.
7. Recolector central de logs, monitor de `/api/health`, monitor de `/api/ready` y recoleccion autenticada de `/api/metrics`.

## Variables obligatorias

En produccion el arranque se bloquea si faltan `DATABASE_URL`, `APP_ORIGIN` HTTPS, `TENANT_SECRET_KEY`, `REGISTRATION_INVITE_CODE`, `METRICS_TOKEN`, almacenamiento S3 o antivirus HTTPS. Los secretos deben almacenarse en el gestor de secretos del proveedor y nunca en archivos del repositorio.

El analisis documental real requiere `DOCUMENT_AI_API_URL` y `DOCUMENT_AI_API_TOKEN`. Sin esas variables el archivo se conserva y puede revisarse manualmente, pero la interfaz no declara una validacion automatica exitosa.

## Despliegue

1. Crear una identidad de base de datos exclusiva para la aplicacion y otra para migraciones.
2. Ejecutar `pnpm run migrate` como tarea unica de despliegue. El bloqueo asesor evita ejecuciones simultaneas accidentales.
3. Publicar la imagen por su digest, no por una etiqueta mutable.
4. Esperar respuesta satisfactoria de `/api/ready` antes de recibir trafico.
5. En una tarea única con los secretos ya inyectados, ejecutar `npm run email:delivery:preflight -- --verify-smtp`. Debe informar `verified`; el control consulta DNS y verifica SMTP sin enviar correo, sin configurar DNS/ECS y sin exponer secretos.
6. Ejecutar una prueba real de invitación y recuperación con buzones QA autorizados de Microsoft 365 y Gmail; revisar bandeja de entrada y spam. El resultado SMTP o el preflight no sustituyen esta verificación de entrega.
7. Ejecutar una prueba con dos empresas y confirmar que usuarios, archivos, marca, integraciones y registros no se cruzan.
8. Probar WhatsApp, almacenamiento, antivirus y analisis documental con cuentas productivas.
9. Restaurar un respaldo en un entorno aislado y registrar tiempo real de recuperacion.
10. Ejecutar analisis de vulnerabilidades de imagen y una prueba de penetracion externa.

## Operacion

- Alertar si `/api/health` falla dos veces consecutivas, `/api/ready` responde 503, existen tareas fallidas o aparecen eventos criticos.
- Conservar logs de acceso sin contrasenas, tokens, documentos ni datos sensibles.
- Rotar secretos y credenciales de integracion de acuerdo con la politica del cliente.
- Revisar semanalmente tareas fallidas, documentos observados, accesos del mandante vencidos y solicitudes de privacidad.
- Mantener un procedimiento probado de incidente, contencion, recuperacion y comunicacion.

## Limites que requieren proveedor externo

MFA/SSO corporativo, WAF, monitoreo fuera del proceso, respaldos administrados, firma electronica, OCR especializado, WhatsApp, correo y prueba de penetracion dependen de servicios y credenciales contratados. En particular, SPF/DKIM/DMARC, identidad del remitente, reputación y configuración SMTP son dependencias operacionales de César o Infraestructura; este repositorio sólo puede validarlas y no puede publicarlas ni cambiar ECS. Su habilitación requiere evidencia del proveedor y una prueba de extremo a extremo.
