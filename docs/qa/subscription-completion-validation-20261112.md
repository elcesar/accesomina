# Cierre técnico de parametrización de planes

Fecha: 12 de noviembre de 2026. Issue #329. Servidor PR #337, SHA ecf63c7630f804c38b2501e7fe95eb79a6a1f2df. La interfaz se entrega en un PR dependiente. No se modificó producción ni se enviaron correos reales.

## Resultado y decisiones

Se completa la ampliación del prompt después de integrar #330/#331. Permanecen Free, La Unión, Purranque, Frutillar y Puerto Octay, con capacidades iniciales 15/60/180/360/720, precios CLP netos 0/1.000/2.000/3.000/4.000 y paquetes confirmados. Free comienza con seis meses calendario; los parámetros nuevos sólo se aplican a nuevas ofertas/contratos. El documento v1.1 se concilia completo en `subscription-requirements-audit-20261112.md`; sus seis opciones y reglas incompatibles no prevalecen sobre la decisión del usuario.

La oferta pública, el backoffice y el portal consumen el mismo catálogo. Los contratos, períodos y propuestas aceptadas conservan snapshots. Las empresas históricas no se convierten automáticamente ni reinician Free. La conservación de datos se mantiene en vencimiento, cambios y cancelación; ninguna política nueva ejecuta borrado.

## Validación ejecutada

| Conjunto | Resultado y alcance |
|---|---|
| Servidor enfocado local | 107 aprobadas, 0 fallos, 1 omisión de PostgreSQL externo. Motor, HTTP real sobre PGlite, RLS, catálogo, documentos, permisos finos, auditoría, importación y avisos. |
| CI del servidor |**110/110 aprobadas, 0 omitidas**, PostgreSQL16, migraciones completas hasta 029 y conexiones independientes para concurrencia. [Ejecución43317692279](https://github.com/elcesar/accesomina/actions/runs/43317692279). |
| UI específica local |**52/52 aprobadas** en Chrome, con API simulada. Catálogo/metadatos, documentación, roles, historial, MFA/popup, gracia, suspensión, lectura/exportación y recuperación de errores;375/1440px más tamaños intermedios heredados. |
| Regresión general servidor con #334/#335 |**647 aprobadas, 0 fallos, 1 omisión local de PostgreSQL externo**, 648 casos totales. Las correcciones de regresión se aplicaron sólo a una copia temporal, sin incorporarlas al PR de planes. |
| Navegador contra API local real |Publicación desde administración→HTTP→BD→catálogo público. Precio Purranque 2750, descripción/beneficio/CTA nuevos; Free nuevo 7 meses, contrato anterior conserva 6 y exactamente la misma fecha. Chrome 375px sin desborde horizontal. Sólo datos ficticios y base aislada. |
| Compilación |Build final aprobado; conserva advertencia existente de bundle superior a 500kB. No se disimula modificando el umbral. |
| Sintaxis/formato |Comprobación de sintaxis de JavaScript del servidor y `git diff --check`; el build comprueba el parseo de JSX. |
| Lint/typecheck |No hay scripts configurados en este proyecto JavaScript. No se informan como aprobados ni se incorpora un cambio de herramientas ajeno al alcance. |

Los conjuntos se superponen; sus cifras no se suman como casos únicos. PGlite no sustituye la prueba de concurrencia PostgreSQL. API simulada no acredita persistencia; el recorrido real adicional sí verifica el enlace UI/API/BD. Aceptación SMTP no demuestra recepción de un correo real.

## Defectos detectados y corregidos al validar

- Respuesta tardía de empresa A podía aparecer bajo encabezado B: generación, identidad de selección y render protegido. Probado con 200/503 tardíos y doble clic sobre la misma empresa.
- Refrescar permisos/resumen desmontaba el panel y perdía la confirmación de guardado: conserva estado durante refresco de la misma identidad; los errores y revocaciones siguen cerrando el acceso y el servidor revalida.
- Más de 200 versiones de cancelación ocultaban la última de retención y causaban conflicto permanente: `latestVersions` separado del historial; prueba con 203 versiones y edición posterior.
- Carga 503 de políticas no permitía recuperarse: reintento local conserva el borrador y obtiene la versión actual antes de guardar.
- Cantidad de paquetes repetibles mayor que 100 no podía seleccionarse pese al máximo API 1000: entrada numérica con validación según catálogo.
- Solicitante de auditoría usaba nombre DTO incorrecto; ocupación histórica desconocida se mostraba como 0: campo real y «Sin registro histórico».
- Oferta Free retirada conservaba una promesa comercial de gratuidad y el plan pagado suspendido se anunciaba como próximo a vencer: textos y acciones según disponibilidad/estado real.

## Archivos y arquitectura

Servidor principal: `server/subscriptions.js`, `server/routes/subscriptions.js`, `server/routes/files.js`, `server/index.js`. Nuevos: `server/subscription-permissions.js`, `server/subscription-governance.js`, `server/routes/subscription-governance.js`, pruebas de catálogo/gobernanza y migraciones 028/029. Se reutilizan `withTenant`, transacciones, auditoría append-only, RLS, archivo/antivirus/almacenamiento y autenticación/MFA existentes.

Interfaz: `AdministracionPlanesPage`, `MiPlanPage`, `PlansSection`, `SubscriptionComponents`, nuevo `SubscriptionGovernancePanel`, provider de suscripciones, navegación, transferencia y privacidad. Estilos existentes ampliados. Tests nuevos de catálogo, recorridos de acceso y gobernanza; pruebas de planes actualizadas con el contrato API real.

## APIs y permisos

Se amplían catálogo y acciones de `/api/subscriptions/admin/companies/:id/requests/:requestId`, con capacidades por acción; se conserva el flujo manual en lugar de duplicar endpoints de upgrade/downgrade.

Nuevas lecturas/control:

- `GET /api/subscriptions/admin/access`: perfil efectivo y capacidades desde BD.
- `GET/PATCH /api/subscriptions/admin/operators[/id]`: consulta/asignación/revocación, sólo superadministración global.
- `GET/POST /api/subscriptions/admin/policies`: historial/versiones actuales; aprobación explícita sin efecto destructivo.
- `GET /api/subscription/audit` y `GET /api/subscriptions/admin/companies/:id/audit`: historial por cursor, aislado por tenant.

Comercial crea/revisa/aprueba/rechaza/programa/cancela solicitudes y administra documentos; no publica catálogo ni ejecuta acuerdos. Operaciones ejecuta lo ya autorizado y gestiona licencias; no aprueba ni carga documentación. Superadministración reúne las facultades, con aprobador distinto del solicitante. La empresa sólo solicita y consulta sus datos. Las capacidades no conceden administración global de clientes ni se pueden fabricar con el JSON genérico de permisos.

## Publicación y pendientes externos

1. César revisa y aprueba los PR. #337 es servidor; el PR de interfaz conserva base dependiente y borrador hasta verificar el servidor desplegado.
2. Integrar servidor, confirmar migraciones 028/029, publicar imagen y actualizar ECS por César; comprobar SHA, salud y catálogo. ECR por sí solo no cambia ECS.
3. Cambiar base de interfaz a main, revisar diff/pruebas e integrar después del backend. El workflow habitual publica S3/CloudFront.
4. Integrar o conciliar también #334/#335; los resultados generales verdes anteriores requieren esas correcciones todavía pendientes de merge.
5. Retest de producción con empresa/buzón QA autorizados: perfiles, documentación, contratación, límites/importación, ciclo de renovación y recepción real. Conservar #329 abierto hasta evidencia.

El 12 de noviembre se consultó sólo salud y catálogo productivos: 7.8.0/ee627c6, ready y cinco valores iniciales. Eso confirma el alcance inicial desplegado; no acredita la ampliación de #337 ni el retest funcional completo.

Rollback: seguir `docs/subscriptions-production.md`. Restaurar artefactos anteriores, conservar tablas/versiones/contratos/auditoría de 028/029, suspender nuevas activaciones durante la recuperación y registrar el tratamiento de contratos ya aceptados. No borrar tablas ni restablecer beneficios Free para volver de versión.
