# Procedimiento de carga productiva en AWS

Este documento describe el paso a paso recomendado para dejar AccesoMina funcionando en produccion, con acceso privado por empresa, datos separados, archivos seguros y capacidad de trabajo multiusuario.

## 1. Objetivo productivo

La aplicacion no debe operar en produccion solo desde el navegador ni con datos locales. Para clientes reales debe funcionar con:

- Aplicacion web desplegada en AWS.
- Base de datos PostgreSQL administrada.
- Archivos privados en S3.
- Acceso seguro por empresa y usuario.
- Auditoria, respaldos, monitoreo y recuperacion.

## 2. Arquitectura recomendada

Flujo recomendado:

1. Usuario ingresa a `https://app.domian.cl`.
2. El dominio apunta a AWS con HTTPS.
3. AWS entrega la aplicacion desde un balanceador o CloudFront.
4. La aplicacion corre como contenedor en ECS Fargate.
5. Los datos se guardan en RDS PostgreSQL.
6. Los documentos se guardan en S3 privado.
7. Las claves se guardan en Secrets Manager.
8. Los logs y alertas se revisan en CloudWatch.

Arquitectura:

```text
Usuario / Empresa
  -> Dominio HTTPS app.domian.cl
  -> Load Balancer o CloudFront
  -> ECS Fargate AccesoMina
  -> RDS PostgreSQL
  -> S3 privado
  -> Secrets Manager
  -> CloudWatch
```

## 3. Archivos principales del proyecto

Los archivos y carpetas relevantes para produccion son:

- `public/index.html`: interfaz web que se sirve en produccion.
- `public/cloud-client.js`: conexion de la interfaz con el backend cloud.
- `server/`: backend/API productiva.
- `database/`: estructura y migraciones de base de datos.
- `Dockerfile`: construccion del contenedor para AWS.
- `docker-compose.yml`: apoyo para pruebas locales.
- `.env.example`: plantilla de variables de entorno.
- `package.json`: dependencias y comandos del proyecto.
- `pnpm-lock.yaml`: versiones exactas de dependencias.

`AccesoMina_v6.html` puede mantenerse como copia local o respaldo funcional, pero en produccion se debe usar la version servida por el backend y conectada a base de datos.

## 4. Servicios AWS necesarios

### 4.1 Dominio y HTTPS

Usar un dominio o subdominio, por ejemplo:

- `app.domian.cl`
- `clientes.domian.cl`

Servicios recomendados:

- Route 53 para DNS, si el dominio se administrara en AWS.
- AWS Certificate Manager para certificado SSL.
- Application Load Balancer o CloudFront para entrada segura.

### 4.2 Base de datos

Crear una base Amazon RDS PostgreSQL.

Configuracion recomendada:

- Acceso no publico.
- Cifrado activado.
- Backups automaticos.
- Retencion minima inicial de 7 a 30 dias.
- Multi-AZ para produccion con clientes activos.
- Security Group permitiendo acceso solo desde la aplicacion.

La base debe guardar empresas, usuarios, trabajadores, contratos, proyectos, servicios, documentos, EPP, vehiculos, hoteles, credenciales, incidentes, auditorias y configuraciones.

### 4.3 Archivos privados

Crear un bucket Amazon S3 privado.

Configuracion recomendada:

- Block Public Access activado.
- Versionado activado.
- Cifrado activado.
- Politicas de ciclo de vida para documentos antiguos.
- Acceso solo desde el backend.

En S3 deben guardarse documentos laborales, certificados, examenes, cursos, respaldos de EPP, credenciales, incidentes, contratos y evidencias.

### 4.4 Secretos

Crear secretos en AWS Secrets Manager o Parameter Store.

Nunca subir claves reales a GitHub.

Secretos minimos:

- URL o credenciales de PostgreSQL.
- Clave de sesion.
- Configuracion S3.
- Claves de correo.
- Claves de WhatsApp/API, si aplica.
- Secretos de integraciones futuras.

### 4.5 Aplicacion

Usar Docker + Amazon ECR + ECS Fargate.

Flujo:

1. Construir imagen Docker usando `Dockerfile`.
2. Subir imagen a Amazon ECR.
3. Crear servicio ECS Fargate.
4. Configurar variables de entorno desde Secrets Manager.
5. Conectar ECS con RDS y S3.
6. Publicar mediante HTTPS.

## 5. Variables de entorno productivas

Las variables exactas deben tomarse desde `.env.example` y configurarse en AWS. Como regla general, produccion debe incluir:

- `NODE_ENV=production`
- `REGISTRATION_ENABLED=false`
- `MFA_REQUIRED=true`
- Puerto de aplicacion.
- Conexion PostgreSQL/RDS.
- Configuracion S3.
- Clave de sesion.
- Dominio publico permitido.
- Configuracion de correo.
- Configuracion WhatsApp, si aplica.

No usar datos reales dentro de archivos `.env` subidos al repositorio.

## 6. Separacion por empresa

Para que el sistema sea vendible como plataforma multiempresa:

- Cada empresa debe tener su identificador interno.
- Todos los datos deben quedar asociados a una empresa.
- Un usuario solo puede ver la empresa donde tiene permiso.
- La cuenta administradora Domian puede crear, validar, bloquear o restablecer accesos.
- La informacion de Empresa A nunca debe mezclarse con Empresa B.

Roles sugeridos:

- Administrador Domian.
- Administrador Empresa.
- Editor Empresa.
- Auditor.
- Solo lectura.
- Mandante externo.

## 7. Seguridad minima antes de vender

Antes de produccion comercial validar:

- Login seguro por usuario.
- Cookies seguras solo por HTTPS.
- Politica de contrasenas.
- Bloqueo por intentos fallidos.
- Separacion estricta por empresa.
- Auditoria de cambios importantes.
- Carga de archivos solo autenticada.
- Archivos privados no publicos.
- Backups activos.
- Logs centralizados.
- Prueba de restauracion.

## 8. Monitoreo y respaldo

Configurar CloudWatch para:

- Logs del backend.
- Errores de aplicacion.
- Caida del servicio.
- Uso alto de CPU/memoria.
- Problemas de base de datos.

Configurar respaldos:

- RDS con backup automatico.
- Snapshots manuales antes de cambios grandes.
- S3 con versionado.
- Prueba periodica de recuperacion.

## 9. Despliegue desde GitHub

El flujo ideal es automatizar con GitHub Actions:

1. Se actualiza el codigo en GitHub.
2. GitHub ejecuta pruebas.
3. Si pasa, construye imagen Docker.
4. Sube imagen a Amazon ECR.
5. Actualiza ECS Fargate.
6. AWS deja disponible la nueva version.

La rama de produccion debe ser estable, idealmente `main`.

## 10. Prueba funcional antes de entregar a cliente

Crear datos reales de prueba:

1. Empresa A.
2. Empresa B.
3. Usuarios distintos por empresa.
4. Clientes/mandantes.
5. Contratos.
6. Proyectos o servicios.
7. Trabajadores de planta.
8. Trabajadores spot.
9. Documentos y vencimientos.
10. EPP con tallas y entregas.
11. Vehiculos y equipos.
12. Hoteles y habitaciones.
13. Credenciales.
14. Incidentes y no conformidades.
15. Protocolos de salud.
16. Reportes.
17. Importacion y exportacion.
18. Alertas.
19. Correos o WhatsApp, si estan configurados.
20. Auditoria de cambios.

Validaciones obligatorias:

- Empresa A no ve datos de Empresa B.
- No se permite duplicar trabajadores con el mismo RUT dentro de la misma empresa.
- Los archivos cargados se abren solo con sesion autorizada.
- Los vencimientos generan alerta.
- Los reportes muestran informacion correcta.
- Un usuario sin permiso no puede administrar datos sensibles.

## 11. Orden recomendado de implementacion

1. Revisar que GitHub este actualizado.
2. Crear RDS PostgreSQL.
3. Crear S3 privado.
4. Crear Secrets Manager.
5. Crear ECR.
6. Construir y subir imagen Docker.
7. Crear ECS Fargate.
8. Configurar dominio y HTTPS.
9. Ejecutar migraciones de base.
10. Cargar datos de prueba.
11. Validar separacion por empresa.
12. Activar monitoreo y backups.
13. Hacer prueba completa con usuarios reales.
14. Pasar a produccion comercial.

## 12. Recomendacion final

La primera version productiva deberia salir con ECS Fargate, RDS PostgreSQL, S3 privado, Secrets Manager, HTTPS y CloudWatch. Despues se puede mejorar con MFA, SSO, WAF, firma electronica avanzada, OCR documental, integraciones con ERP y validacion automatica contra emisores.
