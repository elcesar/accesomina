# Matriz de disponibilidad productiva - Nexo Klar

**Corte de validación:** 4 de septiembre de 2026

**Referencia funcional vigente:** `AccesoMina_v6.html`
**Aplicación objetivo de producción:** `nexo-v2` (React) + `server` (API) + PostgreSQL + almacenamiento privado de archivos.

## 1. Propósito y estructura

Nexo Klar se organiza en cuatro experiencias conectadas:

1. **Sitio público:** presenta la propuesta de valor, plataforma, beneficios, producto, soluciones, industrias, implementación, propósito y acceso.
2. **Acceso y creación de cuentas:** inicio de sesión, recuperación de acceso, registro controlado por invitación, segundo factor cuando está habilitado y selección de empresa autorizada.
3. **Sitio privado:** operación diaria por empresa, con permisos por perfil y datos aislados entre clientes.
4. **Administración Nexo Klar:** control global de empresas usuarias, planes, módulos habilitados y gobierno de la plataforma.

La relación operativa principal se conserva en toda la aplicación:

`Prospecto -> Cliente -> Contrato -> Orden de servicio -> Personas y recursos -> Ejecución -> Cumplimiento -> Reportes y trazabilidad`.

## 2. Módulos disponibles en el sitio privado

| Área | Módulos y alcance |
| --- | --- |
| Centro de control | Panel General, Alertas, Gestión de personal por proyecto y Centro Operativo. Permiten priorizar brechas y revisar la preparación de cada orden. |
| Capital humano | Personas, Turnos y asistencia, Protección personal (EPP), Formación y certificaciones, Exámenes y aptitudes, Salud ocupacional y Restringidos. Centralizan ficha, relación laboral, vigencias, controles y restricciones. |
| Gestión operacional | Comunicaciones y convocatorias, Flota y equipos móviles, Alojamientos y estadías y Credenciales de acceso. |
| Empresas colaboradoras | Terceros y subcontratos, Convenios y contratos de terceros, Personas de empresas colaboradoras, Habilitaciones y cumplimiento y Evaluación de desempeño. |
| Relación comercial | Clientes, Contratos y firmas y Órdenes de servicio. |
| Cumplimiento y calidad | Cumplimiento corporativo, Habilitación del cliente, Incidentes y no conformidades y Auditoría. |
| Proyectos y negocios | Bitácora operativa (Libro de Obra) y Prospectos y oportunidades, con anotaciones correlativas, evidencia, compromisos y firma. |
| Activos, equipos e inventario | Activos, Maquinaria, Equipos e instrumentos, Herramientas, Inventario de EPP, Materiales y ferretería, Insumos y consumibles, Bodegas, Movimientos, Mantenimiento y Asignaciones y préstamos. |
| Gestión y gobierno | Reportes y analítica, Configuración de la empresa, Importar y exportar, Usuarios y permisos, Bitácora de cambios y Privacidad y datos. |
| Administración Nexo Klar | Administración de clientes: controla empresas usuarias, planes y módulos habilitados. Visible solo para el administrador global de Nexo Klar. |

La versión React posee un catálogo, una ruta y un archivo JSX asignado para cada uno de los **46 módulos privados**, con permisos por área, lectura de estado y acción de creación o gestión asociada. Las pantallas especializadas de personas conservan flujo propio; el resto se entrega mediante el espacio de trabajo común mientras se completa la migración visual detallada de la referencia HTML.

## 3. Cobertura validada

### Validado en código local

- Compilación de React `nexo-v2` completada correctamente.
- `123 de 123` pruebas automatizadas aprobadas.
- Pruebas de autenticación, permisos, aislamiento multiempresa, integridad de datos y migraciones.
- Flujo conectado de cliente, contrato, orden de servicio, persona, asignaciones, documentos, alertas y reportes.
- Gestión de EPP, inventario, bodegas, movimientos, mantenimiento y préstamos.
- Libro de Obra: correlativos, bloqueo de anotaciones cerradas o firmadas, evidencias, solicitudes de firma y aislamiento por empresa.
- Importación y exportación JSON/CSV, evitando duplicidad de RUT en la carga de personas.
- Registro de incidentes, restricciones y validaciones para datos huérfanos o inconsistentes.

### Implementado para despliegue

- Servidor configurable para servir el sitio React en producción y HTML en desarrollo o respaldo.
- Imagen Docker de varias etapas que compila React y entrega los estáticos desde el servidor.
- Variables de entorno para elegir frontend, directorio de distribución y servicios externos.
- Migraciones PostgreSQL versionadas en `database/postgres`.
- Rutas API para autenticación, estado, usuarios, archivos, integraciones, auditoría, empresas, configuración, transferencias, privacidad, operaciones y Libro de Obra.

## 4. Estado de migración HTML a React

La referencia `AccesoMina_v6.html` sigue siendo el respaldo visual y funcional completo. La arquitectura React separa el sitio público, acceso y aplicación privada para facilitar mantenimiento, roles y despliegue.

| Capa | Estado |
| --- | --- |
| Sitio público | Secciones React independientes, navegación, solicitud de demostración, preguntas frecuentes, privacidad y acceso. |
| Acceso y creación de cuentas | Inicio de sesión y alta de cuenta por invitación conectados a la API. MFA queda disponible cuando se habilita en entorno real. |
| Sitio privado | Rutas, permisos, colecciones de datos y acciones base para los 46 módulos. |
| Flujos especializados | Personas, trabajadores y ficha de trabajador poseen vistas específicas. Las demás pantallas deben completar la equivalencia visual y de formularios particulares con la referencia HTML antes de retirar el respaldo. |

**Conclusión:** la base técnica y los módulos están disponibles; no corresponde declarar paridad visual total de cada formulario React mientras persistan vistas genéricas. El paso productivo debe mantener el HTML como respaldo hasta cerrar esa paridad por módulo.

## 5. Puerta de salida a producción

### Listo para avanzar

- Código fuente React y backend versionado.
- Validación automatizada aprobada.
- Contenedorización, migraciones y estructura de configuración disponibles.
- Separación entre sitio público, acceso, aplicación privada y administración global.

### Requisitos obligatorios antes de habilitar clientes reales

1. Crear PostgreSQL administrado privado, cifrado, con respaldo automático y prueba documentada de restauración.
2. Crear almacenamiento de archivos privado con versionado, ciclo de vida, cifrado y permisos mínimos por empresa.
3. Configurar balanceador HTTPS, certificados, tareas redundantes, escalamiento y monitoreo de disponibilidad, errores y base de datos.
4. Cargar secretos productivos fuera del repositorio: JWT, cifrado, correo, WhatsApp, firma digital, OCR y antivirus.
5. Conectar y probar proveedores reales de correo, WhatsApp, firma, OCR y análisis antivirus; no utilizar proveedores simulados en producción.
6. Ejecutar pruebas extremo a extremo en un ambiente de preproducción con usuarios, archivos y permisos reales.
7. Completar la paridad de formularios y estados particulares del HTML en cada módulo React antes de desactivar la referencia HTML.
8. Validar cumplimiento de privacidad, retención, trazabilidad y controles de acceso con asesoría legal y de seguridad antes de cargar datos personales reales.

## 6. Respaldo y control de versiones

### Respaldo local oficial

- Referencia HTML: `AccesoMina_v6.html`.
- Frontend React: `nexo-v2/`.
- API y lógica de negocio: `server/`.
- Base de datos y migraciones: `database/postgres/`.
- Configuración de contenedores: `Dockerfile`, `docker-compose.yml`, `.env.example`.
- Documentación técnica: `README.md`, `DEPLOYMENT_AWS.md` y `docs/`.

### Repositorio de César

Los cambios se respaldan en la rama de integración:

`codex/sincronizar-nexo-klar-react`

Antes de fusionar en `main`, se debe revisar mediante Pull Request y aprobar la lista de requisitos de la sección 5. No deben subirse al repositorio datos reales de trabajadores, documentos de clientes, claves, archivos cargados, `node_modules`, compilaciones ni material comercial auxiliar.

## 7. Recomendación de liberación

Liberar primero un **piloto controlado** con una empresa, usuarios limitados y datos no sensibles o anonimizados. Validar el flujo completo de punta a punta: crear cliente, contrato, orden de servicio, persona, documentos, recursos, alertas, Libro de Obra y reporte. Tras validar respaldos, permisos, rendimiento e integraciones externas, escalar por etapas al resto de los clientes.
