# Planes: conciliación completa de requisitos

Fecha: 12 de noviembre de 2026. Alcance: ampliación de #329 posterior a los PR #330/#331, integrados por César el 10 de noviembre. Las comprobaciones de este documento corresponden a código y pruebas aisladas; el despliegue y su retest necesitan evidencia propia.

## Fuente y decisión prevalente

Se revisaron el prompt adjunto completo (1.230 líneas contando la última sin salto) y el documento «Nexo Klar - Modelo comercial y parametrizacion v1.1.docx», incluidas sus 14 secciones, matriz M01–M46/T01–T05 y pruebas de aceptación. El usuario confirmó expresamente: «Conservar los cinco planes y las reglas del prompt, con las decisiones ya confirmadas».

| Plan | Trabajadores iniciales | CLP netos mensuales |
|---|---:|---:|
| Free | 15 | 0 durante seis meses calendario |
| La Unión | 60 | 1.000 |
| Purranque | 180 | 2.000 |
| Frutillar | 360 | 3.000 |
| Puerto Octay | 720 | 4.000 |

Paquetes iniciales acumulables: +100/50.000, +200/100.000 y +500/300.000 CLP netos mensuales. IVA separado. Los valores son configuración inicial versionada, no constantes en los componentes. Todos los módulos principales se conservan en los cinco planes; Libro de Obra y Gestor de Oportunidades tienen contratación y vigencia propias. Cuenta el total de personas registradas, incluso inhabilitadas/archivadas; no se duplican personas por sus asignaciones. Los seis meses calendario sustituyen los 180 días literales. Renovación mensual manual; gracia pagada inicial de 30 días. No hay borrado ni cobro automático.

## Cobertura de todo el prompt

Los nombres conceptuales se adaptan a las estructuras existentes. Un equivalente no exige duplicar tablas, endpoints ni estados persistidos. Los casos de servidor están en `server/test/subscription*.test.js`; navegador, en `nexo-v2/e2e/subscription-*.spec.js`. Los resultados efectivos se registran por ejecución en el informe final.

| Líneas | Requisito y solución verificable |
|---|---|
| 1–33 | Discovery: React18/Vite5, JavaScript, Express5, PostgreSQL con SQL/pg y RLS; no ORM. Reutiliza sesiones, CSRF, MFA, tenant, auditoría, archivos, SMTP y workers. Sin cambio de arquitectura. |
| 35–82 | Empresa, contrato, autorización y conservación separados. `subscription_managed` conserva opt-out histórico. Vencimiento y cambios comerciales no borran información. |
| 84–128 | Catálogo único versionado, nombre/descripcion/beneficios/orden/CTA/visibilidad/recomendado/activo/duración/capacidad/precio. Migraciones 027/028; publicación crea nueva versión. |
| 130–173 | Total único de trabajadores de todas las modalidades; helper central y validación backend. UI muestra usado/total/disponible y explica exceso de carga. |
| 175–203 | Bloqueo de empresa y transacciones en altas, módulos, CSV y backup. Error revierte registros, configuración, versión y auditoría; prueba de PostgreSQL con conexiones independientes. |
| 205–226 | Beneficio Free único por empresa; seis meses desde primera activación, fechas y métricas. No tarjeta ni renovación Free; recrear empresa no repite beneficio. |
| 228–283 | Popup sólo en ingreso efectivo de administrador, no cada recarga ni antes de completar MFA. Días usados/restantes, fechas, progreso/cupos. Dashboard pagado con precio, base/adicional/total, vigencia y acciones. |
| 285–310 | Umbrales configurables; Free vencido lleva a pantalla comercial con Ver planes e información conservada. Administrador conserva privacidad, bitácora y exportación de su tenant, sin escrituras de negocio. |
| 312–400 | Upgrades permitidos por catálogo, downgrade solicitado/revisado y revalidado al ejecutar. Snapshot de ocupación al solicitar, actores/fechas/motivos/resultado. No recrea ni deshabilita personas. Autoaprobación prohibida. |
| 402–458 | Composición explícita de paquetes, capacidad y precio derivados. Tamaño real/activo/orden/acumulable/repetible/cantidad máxima versionados; código estable no determina el tamaño. |
| 460–514 | Mensual/manual; gracia configurada con días usados/restantes. Avisos 30/15/7/3/1 en panel y correo, outbox/reintentos/idempotencia/cancelación. SMTP aceptado no prueba recepción. |
| 516–568 | Solicitud→cotización aceptada→OC→factura→activación. Número, monto neto, fecha, estado, responsable, observaciones y archivo privado. Contexto empresa/RUT/plan preservado en propuesta. Mantiene documentos históricos sin inventar montos. No pasarela. |
| 570–614 | Superadministración, Comercial y Operaciones por capacidades verificadas en BD. Comercial gestiona/revisa documentos y solicitudes; Operaciones ejecuta autorizadas y licencias; ninguna concede administración global de clientes. Empresa sólo solicita. |
| 616–678 | Backoffice por empresa y auditoría paginada con valores antes/después, actor/solicitante/motivo. Respuestas tardías no mezclan empresas. No expone archivos comerciales privados en historial. |
| 680–747 | /planes enlazado desde navegación/home/footer; cinco tarjetas y CTA; usa diseño existente, accesibilidad y adaptación a móvil/tablet/escritorio. |
| 749–804 | Administración→BD→API→sitio público, sin precios duplicados. Retirar oferta afecta nuevas selecciones; contratos y cotizaciones aceptadas conservan sus condiciones. Comparador legible con desplazamiento interno/acordeones. |
| 806–848 | Recomendador con catálogo real, composición válida y menor exceso; respeta paquetes no acumulables/repetibles y máximos. Sin combinación válida, pide cotización, no inventa capacidad. |
| 850–907 | Solicitud pública validada por servidor con empresa/RUT/contacto/región/comuna/cargo/correo/teléfono/dotación/plan/paquetes/observaciones/términos; oferta versionada/idempotencia y estado NEW. |
| 909–947 | Free usa registro/aprobación existentes, no lead comercial ni tarjeta. FAQ explica conservación, límite, cambios, paquetes, contratación y renovación manual. |
| 949–982 | Entidades conceptuales mapeadas a catálogos/versiones/contratos/períodos/paquetes/requests/leads/documentos JSON/avisos/auditoría. Workflow PATCH sustituye endpoints redundantes. |
| 984–1070 | 20 casos obligatorios mapeados en tabla siguiente, con ajuste calendario confirmado. Ejecuciones local/CI separadas de QA productiva. |
| 1072–1095 | Migraciones aditivas, índices/FK/RLS; contratos no se recalculan. IVA y precios resueltos por usuario. Cancelación/retención versionadas, borradores nullable, aprobación y referencia explícitas. Nunca borrado automático. |
| 1097–1191 | Discovery/plan/código/backoffice/dashboard/público/avisos/QA/regresión/informe. Runbook de publicación, ECR≠ECS, revisión de César, rollback que preserva tablas y contratos. Lint/typecheck no configurados: no se presentan como aprobados. |
| 1193–1230 | Integridad, seguridad, reutilización, compatibilidad y trazabilidad. Reglas comerciales confirmadas prevalecen sobre documentos incompatibles. Despliegue y recepción real no se infieren de build. |

## Veinte pruebas obligatorias

| Caso | Evidencia funcional |
|---|---|
| 01–02 | Alta hasta15 y rechazo de16; `subscriptions`, `subscription-write-routes`, PostgreSQL real. |
| 03–04 | Free antes/después de seis meses calendario, datos intactos; fechas de fin de mes, bisiesto y horario local. |
| 05–08 | Reactivación pagada, upgrade58/60→58/180, downgrade45→60 permitido y135→60 rechazado, nueva validación al ejecutar. |
| 09–12 | Puerto Octay con +100/+200/+500 y composición completa; no sólo total opaco. |
| 13–14 | Gracia pagada y suspensión sin pérdida; métricas y aviso de UI. |
| 15 | Dos conexiones independientes con14/15: una creación y un rechazo; caso no certificado únicamente por PGlite serializado. |
| 16–17 | Company admin no cambia límites ni aprueba; tampoco se permite autoaprobación global. Revocación de perfiles y aislamiento probados en HTTP. |
| 18 | Precio/metadatos nuevos llegan a API/público; contrato y propuesta aceptada retienen snapshot anterior. |
| 19–20 |137→Purranque y850→Puerto Octay+200 según catálogo inicial; configuraciones cambiadas usan tamaños y reglas reales. |

## Conciliación de las 14 secciones del Word

| Sección | Decisión de implementación |
|---|---|
| Introducción y1: catálogo/precios/anualidad | Se sustituyen seis SKU Inicial/Platinum por cinco planes confirmados. No se publican sus precios ni descuento anual. La gratuidad de seis meses es compatible. |
| 2: funciones | Se conserva todo el inventario común; no se adopta segmentación Inicial/Platinum. Seguridad/documentos propios no se cobran como productos duplicados. |
| 3: personas/usuarios | Prevalece total registrado y límite estricto de todos los planes. No se implementan editores facturables, reservas comerciales de usuarios, máximo mensual, topes de clientes/contratos o exceso pagado permitido. Los permisos existentes permanecen. |
| 4: Free/cambios/salida | Seis meses calendario, beneficio único, acuerdos y datos conservados son compatibles. No se adopta salida Free de30 días ni retención90; gracia30 es sólo pagada. |
| 5: adicionales | Libro/Oportunidades separados y vigencia independiente. No se crean tarifas75.000/95.000, licencias por editor/libro ni venta autónoma no confirmada. El software no promete integraciones por mostrar una pantalla. |
| 6–7: implementación/soporte/costos | Propuestas no aprobadas: no se cobran implementación, SLA, acompañamiento, piloto, ERP, editor extra ni sus ejemplos/objetivos de margen. No se altera la oferta con cargos nuevos. |
| 8: datos | Separación catálogo/contrato/seguridad, snapshots, aceptación y trazabilidad compatibles. SKU/familia/tier/editores/medición activa/anualidad incompatibles no se agregan. |
| 9: derechos | Intersección tenant/rol/configuración se conserva. No se conceden datos sensibles por precio ni administración global de clientes por contratar plan. Lectura/exportación se sujeta a permisos originales. |
| 10: facturación/transición | No se implementan anualidad/prorrateos/descuentos de la propuesta. Mensual/manual y aceptación explícita sí. Legacy no migra por similitud de nombre ni se mezclan tenants. |
| 11: aceptación | CAT/CAP/ACL/FUN/BIL se adaptan al modelo de cinco planes; topes/editores/precios de seisSKU quedan descartados. Concurrencia, fechas, consulta, privacidad, licencias y preservación siguen verificables. |
| 12: revisión histórica | Las46 rutas abiertas el1nov son evidencia de navegación histórica; no se reinterpretan como prueba funcional de guardados ni versión productiva de esta ampliación. |
| 13: M01–M46/T01–T05 | M01–M27/M30–M46 comunes en los cinco planes según permisos actuales; M28/M29 independientes. T01/T02 reutilizados. T03/T04/T05 condicionados a aceptación/proveedor; no se promete firma/OCR/WhatsApp/ERP/multiempresa por comprar capacidad. |
| 14: conciliación | La confirmación posterior del usuario sustituye las decisiones comerciales incompatibles de esta sección. Nunca sobrescribir contratos históricos para aplicar las nuevas condiciones. |

## Revisión técnica y límites

No existe un script de lint ni typecheck en este proyecto JavaScript. Se ejecutan comprobación de sintaxis del servidor, tests, revisión de diferencias y build React. No se incorpora un cambio de lenguaje/linter como parte de esta solicitud.

Las pruebas de navegador con API simulada comprueban interacciones y accesibilidad; los tests HTTP con PGlite comprueban rutas, persistencia y aislamiento. La CI con PostgreSQL16 comprueba migraciones y concurrencia independiente. Las diferencias de estos alcances deben mantenerse en el informe y no sumarse como validación productiva.

No se modifica producción, no se borran datos ni se envían mensajes reales durante estas pruebas. El issue permanece abierto hasta revisión, liberación coordinada por César y retest del sistema desplegado con cuenta y buzón QA autorizados.
