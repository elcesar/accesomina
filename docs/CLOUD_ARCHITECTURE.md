# Arquitectura cloud de AccesoMina

## Límites de confianza

El navegador nunca decide a qué empresa pertenece una solicitud. La API obtiene `tenant_id`, `user_id` y rol desde la sesión validada. Todas las consultas operacionales se ejecutan dentro de una transacción que establece `app.current_tenant_id`; PostgreSQL aplica además Row-Level Security.

```text
Navegador
  -> HTTPS / cookie HttpOnly + CSRF
API Node.js
  -> autorización por rol
  -> transacción con tenant context
PostgreSQL RDS
  -> RLS + restricciones + auditoría
S3 privado
  -> carpeta por tenant + cifrado + antivirus
```

## Datos

`tenant_module_state` separa cada colección funcional y aplica una versión independiente por módulo. Esto permite trabajo simultáneo en contratos, personal, EPP u hotelería sin sobrescribir módulos ajenos. `tenant_state` se conserva únicamente para compatibilidad y migración. Las tablas normalizadas siguen siendo el destino para procesos analíticos y futuras APIs especializadas. Antes de cada guardado, la API valida:

- RUT único por trabajador dentro de la empresa.
- IDs únicos.
- referencias entre mineras, contratos, proyectos, trabajadores y asignaciones;
- fechas coherentes;
- eliminación de contenido HTML ejecutable y archivos Base64.

## Seguridad

- Contraseñas con `scrypt` y salt único.
- Bloqueo temporal por intentos fallidos.
- Sesiones revocables y expirables.
- Protección de origen y CSRF.
- Roles verificados por endpoint.
- Archivos con hash SHA-256, límite de 25 MB y estado antivirus.
- RLS forzado incluso para el propietario de las tablas.
- Secretos de integraciones por empresa cifrados con AES-256-GCM.
- Historial append-only.
- Secretos únicamente mediante variables de entorno o un secret manager.

## Roles

- `domian_admin`: administración global controlada.
- `client_admin`: usuarios y operación completa de su empresa.
- `rrhh`: trabajadores, contratos y comunicaciones.
- `prevencion`: documentación, riesgos y salud ocupacional.
- `acreditacion`: carga, revisión y envío al mandante.
- `consulta`: lectura y reportes.

## Parametrización por empresa

`tenant_settings` mantiene identidad visual, módulos habilitados, umbrales de alerta y catálogos sin afectar a otros clientes. `tenant_integrations` guarda configuración pública y secretos cifrados separados para cada empresa.

## Integraciones

- SMTP: envío de correo con registro de resultado.
- WhatsApp Cloud API: envío individual y convocatorias, sujeto a plantillas y consentimiento de Meta.
- Firma electrónica: webhook configurable hacia el proveedor contratado.
- ERP: webhook configurable por tenant/proceso.
- Acreditación: webhook hacia portales que entreguen API oficial.

Cada solicitud genera un `integration_event` y un evento de auditoría. Nunca se debe automatizar un portal de mandante sin autorización contractual y técnica.

## Continuidad

- RDS Multi-AZ y backups automáticos.
- S3 Versioning y lifecycle.
- métricas, logs y alertas centralizadas;
- recuperación probada periódicamente;
- despliegues con migraciones versionadas;
- pruebas de aislamiento Empresa A/B/C y concurrencia antes de cada liberación.

## Requisitos de infraestructura

Para operar en producción se deben contratar/configurar las cuentas reales de AWS, SMTP, Meta WhatsApp, firma electrónica, antivirus y cualquier API de ERP o mandante. `TENANT_SECRET_KEY` debe almacenarse en Secrets Manager y respaldarse: perder esa clave impide descifrar integraciones existentes.
