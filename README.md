# AccesoMina Domian

Sistema web para gestión de acreditación minera de empresas contratistas.

## Estado actual

- Aplicación HTML funcional en `AccesoMina_v6.html`.
- Versión publicable en `public/index.html`.
- Portada pública Domian.
- Acceso privado por cliente.
- Registro de clientes con validación de RUT chileno y email.
- Datos separados por cliente en `localStorage` para prototipo local.
- Cuenta administradora Domian: RUT `78.425.213-2`.

## Funcionalidades

- Trabajadores.
- Mineras / mandantes.
- Proyectos y mantenciones.
- Hotelería.
- Contratos y firmas.
- Auditoría documental automática.
- Exámenes médicos.
- Cursos y certificaciones.
- Alertas de vencimiento.
- Reportes CSV.

## Base de datos para AWS RDS

La estructura PostgreSQL está en:

```text
database/postgres/001_schema.sql
database/postgres/002_seed_domian.sql
database/postgres/003_rls_template.sql
```

Ejecutar en RDS PostgreSQL:

```bash
psql "$DATABASE_URL" -f database/postgres/001_schema.sql
psql "$DATABASE_URL" -f database/postgres/002_seed_domian.sql
```

## Importante sobre persistencia

GitHub guarda el proyecto, la estructura de base de datos y los seeds. La data real de clientes debe guardarse en Amazon RDS y los archivos en S3 privado. No se debe usar GitHub como base de datos operacional.

## Despliegue AWS

Ver guía completa:

```text
docs/AWS_RDS_DEPLOY.md
```
