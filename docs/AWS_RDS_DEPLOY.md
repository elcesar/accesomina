# Despliegue AWS propuesto para AccesoMina Domian

## Arquitectura recomendada

- Frontend: S3 privado + CloudFront + ACM SSL.
- API/backend: Node.js en ECS Fargate, App Runner o Elastic Beanstalk usando el `Dockerfile` del repositorio.
- Base de datos: Amazon RDS PostgreSQL.
- Archivos: S3 privado por tenant.
- Login: AWS Cognito o backend auth propio con MFA.
- Dominio: Route 53, por ejemplo `accesomina.domian.cl`.

## Por qué la data no debe vivir solamente en GitHub

GitHub debe guardar código, migraciones SQL, seeds y documentación. La data operacional que los clientes cargan debe vivir en RDS y S3. Si se guarda la data viva en GitHub:

- se exponen datos sensibles de trabajadores;
- no escala con múltiples usuarios;
- no hay control transaccional;
- los archivos médicos/contratos no deberían versionarse públicamente ni en Git;
- recuperar cambios concurrentes sería inseguro.

El repositorio sí incluye `database/postgres/*.sql`, que define la estructura permanente para que la data no se pierda en producción.

## Pasos AWS RDS PostgreSQL

1. Crear VPC o usar una VPC existente.
2. Crear RDS PostgreSQL 15+.
3. Activar backups automáticos mínimo 7 a 30 días.
4. Crear base de datos: `accesomina`.
5. Crear usuario de aplicación con permisos limitados.
6. Ejecutar las migraciones desde la aplicación:

```bash
pnpm run migrate
pnpm run seed:admin
```

7. Crear bucket S3 privado para documentos:

```text
s3://accesomina-domian-prod/clientes/{tenant_id}/trabajadores/{worker_id}/...
```

8. Configurar variables de entorno en backend:

```env
NODE_ENV=production
APP_ORIGIN=https://accesomina.domian.cl
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/accesomina
TENANT_SECRET_KEY=<secreto-aleatorio-en-Secrets-Manager>
AWS_REGION=us-east-1
AWS_S3_BUCKET=accesomina-domian-prod
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
```

Agregar también `REGISTRATION_INVITE_CODE`, `ADMIN_INITIAL_PASSWORD` y servicio antivirus desde AWS Secrets Manager. SMTP, Meta WhatsApp y firma pueden configurarse por cliente desde el panel privado y quedan cifrados. No guardar secretos en imágenes Docker, GitHub o archivos públicos.

## Despliegue recomendado

- Application Load Balancer con HTTPS y certificado ACM.
- ECS Fargate en subred privada.
- RDS PostgreSQL sin acceso público.
- VPC Endpoint para S3.
- AWS WAF delante del balanceador.
- Secrets Manager para credenciales.
- CloudWatch para logs, alarmas y métricas.
- tareas separadas para migraciones y procesos programados.

## Modelo multi-cliente

Cada tabla operacional tiene `tenant_id`. El backend debe filtrar siempre por `tenant_id` obtenido desde el usuario autenticado. Para mayor seguridad se puede activar Row Level Security con `003_rls_template.sql` cuando el backend esté listo.

## Backups

- RDS: backups automáticos + snapshots manuales antes de cambios grandes.
- S3: versioning activo + lifecycle policy.
- GitHub: código, migraciones y documentación.
