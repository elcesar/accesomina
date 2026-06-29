# Despliegue AWS propuesto para AccesoMina Domian

## Arquitectura recomendada

- Frontend: S3 privado + CloudFront + ACM SSL.
- API/backend: Laravel PHP o Node.js en AWS Lightsail, ECS Fargate o Elastic Beanstalk.
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
6. Ejecutar:

```bash
psql "$DATABASE_URL" -f database/postgres/001_schema.sql
psql "$DATABASE_URL" -f database/postgres/002_seed_domian.sql
```

7. Crear bucket S3 privado para documentos:

```text
s3://accesomina-domian-prod/clientes/{tenant_id}/trabajadores/{worker_id}/...
```

8. Configurar variables de entorno en backend:

```env
APP_ENV=production
APP_URL=https://accesomina.domian.cl
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/accesomina
AWS_REGION=us-east-1
AWS_S3_BUCKET=accesomina-domian-prod
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
```

## Modelo multi-cliente

Cada tabla operacional tiene `tenant_id`. El backend debe filtrar siempre por `tenant_id` obtenido desde el usuario autenticado. Para mayor seguridad se puede activar Row Level Security con `003_rls_template.sql` cuando el backend esté listo.

## Backups

- RDS: backups automáticos + snapshots manuales antes de cambios grandes.
- S3: versioning activo + lifecycle policy.
- GitHub: código, migraciones y documentación.
