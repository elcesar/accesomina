# Nexo Klar listo para carga productiva en AWS

## Estado dejado en este computador

El proyecto queda preparado para ser cargado a AWS usando una arquitectura productiva basada en:

```text
GitHub
  -> GitHub Actions
  -> Amazon ECR
  -> Amazon ECS Fargate
  -> Application Load Balancer HTTPS
  -> Amazon RDS PostgreSQL
  -> Amazon S3 privado
  -> AWS Secrets Manager
  -> CloudWatch Logs / Metrics
```

## Archivos agregados o ajustados

- `Dockerfile`: contenedor productivo con healthcheck y arranque controlado.
- `server/scripts/start-container.js`: permite arrancar la app y ejecutar migraciones solo si se configura `RUN_MIGRATIONS_ON_START=true`.
- `infra/aws/ecs-task-definition.json`: plantilla ECS Fargate.
- `infra/aws/production-env.template`: variables productivas esperadas.
- `infra/aws/README.md`: guía de arquitectura AWS.
- `.github/workflows/aws-ecs-deploy.yml`: pipeline base para build, test, push a ECR y deploy ECS.

## Configuración mínima AWS

### RDS PostgreSQL

- Motor PostgreSQL 15 o superior.
- Acceso no público.
- Cifrado activo.
- Backups automáticos.
- Security Group permitiendo acceso solo desde ECS.

### S3 privado

- Block Public Access activo.
- Cifrado activo.
- Versionado activo.
- Acceso solo desde el rol ECS.

### ECS Fargate

- Servicio en subred privada.
- Salida controlada a internet o NAT para integraciones externas.
- Logs hacia CloudWatch.
- Healthcheck contra `/api/health`.

### HTTPS

- Dominio sugerido: `https://nexo.domian.cl`.
- Certificado en AWS Certificate Manager.
- Application Load Balancer con listener 443.

### Secrets Manager

Guardar como secretos:

- `DATABASE_URL`
- `TENANT_SECRET_KEY`
- `METRICS_TOKEN`
- `REGISTRATION_INVITE_CODE`
- `ADMIN_INITIAL_PASSWORD`
- `VIRUS_SCAN_API_URL`
- `VIRUS_SCAN_API_TOKEN`
- Tokens de OCR, firma, correo, WhatsApp, ERP o acreditación.

## Variables críticas

En producción deben quedar así:

```env
NODE_ENV=production
APP_ORIGIN=https://nexo.domian.cl
REGISTRATION_ENABLED=false
MFA_REQUIRED=true
COOKIE_SECURE=true
FILE_STORAGE=s3
RUN_MIGRATIONS_ON_START=false
```

## Migraciones

Recomendación productiva:

1. Ejecutar migraciones como tarea controlada antes de actualizar el servicio.
2. Luego actualizar ECS.
3. Evitar que cada réplica migre al arrancar.

El contenedor permite migrar al inicio solo si se activa:

```env
RUN_MIGRATIONS_ON_START=true
```

## Validación antes de entregar a clientes

1. `/api/health` responde OK.
2. `/api/ready` responde OK.
3. Login con MFA.
4. Empresa A no ve datos de Empresa B.
5. Archivo subido queda en S3 privado.
6. Archivo se descarga solo con sesión autorizada.
7. Antivirus bloquea archivos no permitidos.
8. Respaldos RDS activos.
9. Restauración probada en ambiente aislado.
10. Logs y métricas disponibles en CloudWatch.

## Observación comercial

Con estos archivos, el repositorio queda listo para que un equipo AWS complete la carga productiva. Lo único que no puede quedar resuelto desde el código son las credenciales reales, el dominio, los servicios contratados de antivirus/OCR/firma y las políticas exactas de la cuenta AWS.
