# Puerta de salida a producción - Nexo Klar

No se debe habilitar una cuenta cliente con datos reales hasta completar y evidenciar cada punto.

## Aplicación y datos

- `AccesoMina_v6.html` y `public/index.html` tienen el mismo hash.
- `pnpm run validate:production` finaliza sin errores.
- Se aplicaron las migraciones PostgreSQL en RDS mediante una tarea puntual.
- Se probaron al menos tres empresas con datos distintos y sin acceso cruzado.
- Se probó carga, descarga autorizada y eliminación lógica de un documento privado.

## AWS

- RDS PostgreSQL está en subredes privadas, cifrado y con backups automáticos.
- S3 tiene bloqueo público, cifrado, versionado, lifecycle y acceso solo desde el rol de la aplicación.
- ECS usa dos tareas mínimas distribuidas entre zonas de disponibilidad y un ALB HTTPS.
- ECS tiene escalamiento automático por CPU, memoria y solicitudes del balanceador.
- Todas las claves están en AWS Secrets Manager; ninguna vive en Git, HTML o variables de CI visibles.
- CloudWatch registra API, trabajos fallidos, latencia, errores 5xx y disponibilidad.

## Seguridad y continuidad

- MFA obligatorio probado para administrador y cliente.
- Antivirus de archivos configurado y probado con archivo de prueba seguro.
- Prueba de restauración RDS y recuperación de documento S3 realizada y registrada.
- Revisión de seguridad externa y prueba de aislamiento entre empresas aprobadas.
- Runbook de incidente, responsable técnico y canal de atención definidos.

## Integraciones

- Correo, WhatsApp, firma, OCR y portales externos solo se activan con proveedor, contrato, secretos y pruebas de extremo a extremo.
- Cada integración tiene reintentos, historial y responsable ante fallas.
