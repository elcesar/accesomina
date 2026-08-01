# AccesoMina Cloud

Version actual: 7.6.0. Incluye Centro Operativo multiempresa para monitoreo, flujo documental, notificaciones programadas, acceso mandante, formularios configurables y conservacion de datos. Ver `docs/OPERATIONS_HUB.md` para requisitos productivos y limites de validacion inteligente.

Plataforma multiempresa para controlar trabajadores, contratos, proyectos, mantenciones, acreditación, documentos, hotelería, vehículos y comunicaciones de empresas contratistas mineras.

## Arquitectura V7

- Frontend: `public/index.html` y `public/cloud-client.js`.
- API: Node.js 20+ con Express.
- Base de datos: PostgreSQL 15+ con `tenant_id` y Row-Level Security.
- Sesiones: token aleatorio almacenado como hash y cookie `HttpOnly`, `Secure`, `SameSite=Strict`.
- Archivos: S3 privado en producción; disco local únicamente para desarrollo.
- Concurrencia: versión optimista del estado de empresa; un cambio antiguo recibe `409 VERSION_CONFLICT`.
- Auditoría: `audit_log` append-only con usuario, fecha, entidad y resumen del cambio.
- Integraciones: SMTP, Meta WhatsApp Cloud API y webhooks para firma, ERP y acreditación.

La data operacional ya no debe almacenarse en GitHub ni en `localStorage`. El HTML independiente conserva modo demostración al abrirse con `file://`; el despliegue servido por la API usa PostgreSQL como fuente autoritativa.

## Desarrollo local

```bash
cp .env.example .env
docker compose up -d postgres
corepack enable
pnpm install
pnpm run migrate
pnpm run seed:admin
pnpm start
```

Abrir `http://localhost:8088`.


## Pruebas

```bash
pnpm run check
```

## Migraciones

Se ejecutan en orden desde `database/postgres/` y quedan registradas en `schema_migrations`.

## Producción

1. Configurar PostgreSQL privado.
2. Configurar S3 privado y escaneo antivirus.
3. Configurar HTTPS, secretos y cookie segura.
4. Ejecutar migraciones y seed inicial.
5. Configurar SMTP, WhatsApp y proveedores externos necesarios.
6. Ejecutar pruebas de aislamiento con al menos tres empresas.

Ver [arquitectura cloud](docs/CLOUD_ARCHITECTURE.md) y [despliegue AWS](docs/AWS_RDS_DEPLOY.md).
