# Arquitectura AWS productiva para Nexo Klar

Esta carpeta deja preparado el paquete base para cargar Nexo Klar en AWS con operación productiva.

## Componentes

- `ecs-task-definition.json`: referencia de tarea ECS Fargate.
- `render-ecs-task-definition.mjs`: genera una definición real desde la plantilla, usando la cuenta AWS y la etiqueta de imagen del despliegue.
- `production-env.template`: variables productivas esperadas.
- `.github/workflows/ci.yml`: validación automática activa de sintaxis, migraciones, seguridad funcional, paridad entre la versión local y la versión productiva, y construcción del contenedor.
- `github-actions-aws-ecs-deploy.yml`: plantilla de despliegue que debe activarse solo despues de completar roles, secretos y nombres AWS.

## Servicios AWS requeridos

1. Route 53 o DNS externo apuntando al dominio productivo aprobado para Nexo Klar.
2. AWS Certificate Manager con certificado HTTPS.
3. Application Load Balancer público con HTTPS.
4. ECS Fargate en subredes privadas.
5. ECR para la imagen Docker.
6. RDS PostgreSQL 15+ privado, cifrado y con backup automático.
7. S3 privado para documentos, con versionado, cifrado y bloqueo público.
8. Secrets Manager para `DATABASE_URL`, `TENANT_SECRET_KEY`, tokens y claves externas.
9. CloudWatch Logs y alarmas.
10. Proveedor HTTPS de antivirus de archivos, con endpoint de escaneo y endpoint de salud.

## Capacidad y salida controlada

Usa `service-capacity.template.json` como configuración mínima para el servicio ECS: dos tareas, despliegue con rollback, balanceador HTTPS y escalamiento por CPU, memoria y solicitudes. Antes de habilitar clientes reales, completa `PRODUCTION_GATE.md` y conserva la evidencia de cada validación.

## Flujo productivo recomendado

1. GitHub ejecuta pruebas.
2. GitHub construye y sube imagen a ECR.
3. GitHub registra una nueva task definition.
4. Se ejecuta una tarea puntual de migración.
5. ECS actualiza el servicio productivo.
6. El balanceador usa `/api/health` como liveness y `/api/ready` como readiness.
7. El despliegue genera una definición ECS sin placeholders desde la cuenta AWS autenticada.
8. Antes del cambio productivo se ejecuta `pnpm run validate:production` sobre la definición final.

## Preflight de despliegue

No edites los identificadores AWS dentro de la plantilla. Para revisar una definición real antes de desplegar:

```bash
AWS_ACCOUNT_ID=123456789012 ECR_IMAGE_TAG=preflight \
APP_ORIGIN=https://app.nexoklar.cl \
AWS_S3_BUCKET=nexo-klar-prod-private-documents \
node infra/aws/render-ecs-task-definition.mjs
ECS_TASK_DEFINITION_PATH=infra/aws/ecs-task-definition.rendered.json \
pnpm run validate:production
```

El archivo generado está excluido de Git para evitar que identificadores de una cuenta o imagen queden como configuración permanente del repositorio.

## Separación de datos

La aplicación usa `tenant_id` por empresa. El backend establece `app.current_tenant_id` en cada transacción y PostgreSQL aplica Row Level Security en tablas críticas.

## Importante

No se debe operar producción desde `AccesoMina_v6.html` abierto como archivo local. Producción debe usar:

```text
public/index.html
public/cloud-client.js
server/
database/postgres/
RDS PostgreSQL
S3 privado
```

## Antes de vender con datos reales

- Probar dos empresas completas y confirmar que sus datos no se cruzan.
- Probar restauración real de RDS.
- Probar descarga de archivos desde S3 con sesión autorizada.
- Probar antivirus obligatorio.
- Probar MFA.
- Probar correo, WhatsApp, firma y OCR con proveedores reales.
- Activar monitoreo externo y alertas.

## Paquete de seguridad y operación

- `iam-app-role-private-documents.json`: permisos mínimos para que ECS acceda únicamente al bucket privado de documentos y a los secretos autorizados.
- `cloudwatch-alarms.template.json`: alarmas para disponibilidad, errores, latencia, tareas ECS y RDS.
- `s3-private-documents.template.json`: configuración exigida para cifrado, versionado, bloqueo público y conservación del repositorio documental.
- `PRODUCTION_GATE.md`: lista de evidencia obligatoria antes de activar una empresa cliente.

Estos archivos se preparan en el repositorio. La creación efectiva de los recursos debe hacerla una cuenta AWS autorizada, usando sus identificadores reales, dominios y secretos de producción.
