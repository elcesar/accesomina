# Informe de limpieza, integración y arquitectura Nexo Klar

Fecha: 27 de julio de 2026  
Versión técnica: 7.7.0

## Objetivo

Fortalecer la base productiva sin cambiar la experiencia actual del frontend, manteniendo compatibilidad con sesiones, respaldos y datos existentes.

## Mejoras ejecutadas

### Identidad técnica

- El paquete pasa a llamarse `nexo-klar-cloud`.
- Correo predeterminado actualizado a `no-reply@nexoklar.cl`.
- Métricas productivas normalizadas con prefijo `nexo_klar_`.
- Los respaldos nuevos utilizan formato `nexo-klar-backup` y nombre `nexo_klar_FECHA.json`.
- Los respaldos antiguos `accesomina-backup` continúan siendo aceptados.

### Sesiones y seguridad

- Nueva cookie de sesión Nexo Klar.
- Compatibilidad de lectura y cierre con cookies antiguas para evitar cierres inesperados durante la transición.
- Se mantienen cookie HttpOnly, Secure en producción, SameSite Strict, CSRF, control de origen, MFA y bloqueo por intentos.
- Los errores quedan registrados como eventos JSON sin devolver detalles internos al usuario.

### Salud productiva

- `/api/health` comprueba que el proceso está vivo sin reiniciar el contenedor por una caída transitoria de base de datos.
- `/api/ready` comprueba PostgreSQL y acceso real al bucket S3.
- El antivirus puede comprobarse mediante `VIRUS_SCAN_HEALTH_URL`.
- La respuesta de disponibilidad informa servicio, versión, latencia y resultado de cada dependencia.
- OCR queda identificado como integración opcional con revisión humana cuando no existe proveedor.

### Observabilidad

- Cada solicitud recibe `X-Request-Id`.
- Los accesos API generan logs JSON con fecha, duración, estado, usuario y empresa.
- Las métricas siguen protegidas por token.
- Los eventos críticos continúan registrados por empresa.

### AWS y CI

- ECS incorpora el secreto de salud del antivirus.
- Se agregó validación automática de sincronización local/productiva, sintaxis del frontend, estructura ECS y variables críticas.
- Se preparo la plantilla `infra/aws/github-actions-ci.yml` para ejecutar pruebas, migraciones, validacion de version y construccion del contenedor. Debe copiarse a `.github/workflows/ci.yml` cuando el token GitHub tenga permiso `workflow`.
- La validación estricta detecta marcadores AWS no reemplazados antes del despliegue.

## Integración de datos confirmada

La plataforma mantiene el flujo:

Cliente -> contrato -> proyecto o servicio -> trabajador -> documentos -> cursos y exámenes -> EPP -> hotel -> vehículo -> turno -> credencial -> incidente -> alerta -> auditoría -> reporte.

La persistencia modular conserva control de versión para evitar que dos usuarios sobrescriban silenciosamente el mismo módulo. PostgreSQL aplica RLS forzado, claves foráneas e índices de unicidad por empresa.

## Compatibilidad

No se modificaron:

- Datos cargados.
- RUT de la cuenta administradora.
- Correo de acceso existente de la cuenta legal.
- Diseño y navegación visible.
- Estructura de módulos del frontend.
- Migraciones históricas ya aplicadas.

## Límites pendientes de infraestructura externa

El código queda preparado, pero deben verificarse en la cuenta AWS real:

- ARN definitivos de roles ECS.
- RDS Multi-AZ y restauración desde respaldo.
- Bucket S3 privado, versionado y ciclo de vida.
- ALB, certificado HTTPS, WAF y DNS.
- Antivirus productivo.
- SMTP, WhatsApp, OCR y firma electrónica.
- Alarmas CloudWatch y canal de respuesta.
- Análisis de imagen del contenedor y prueba de penetración.

## Deuda técnica controlada

El frontend continúa siendo un archivo grande con capas históricas de funciones. Las funciones vigentes prevalecen y las pruebas no detectan regresiones, pero la siguiente fase recomendada es extraer gradualmente componentes por módulo, comenzando por LEAD, hotelería, inventario y Cliente 360. Esta modularización debe hacerse por etapas para no arriesgar la operación actual.

## Criterio de salida

La aplicación puede avanzar a preproducción cuando la plantilla CI sea activada y su primera ejecución esté aprobada. La salida comercial definitiva requiere ejecutar la validación estricta, probar dos empresas reales aisladas, restaurar un respaldo y obtener evidencia de las integraciones externas.
