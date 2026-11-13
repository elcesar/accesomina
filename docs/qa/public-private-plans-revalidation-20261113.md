# Revalidación de planes públicos y parametrización privada

Fecha: 13 de noviembre de 2026. Issue #329; PR de servidor #337 y de interfaz #338. Se distingue la versión observada en producción de la ampliación pendiente de publicar.

## Fuente y decisiones

El adjunto `64bf694a-b49e-4a44-a1bb-e50176c0ff56/Texto pegado.txt` contiene 1.230 líneas, SHA-256 `034bd3645f62e5fcc450553f6486b44ccb29c4f0c842a09e5fe42a6b412f52f7`. Es idéntico al prompt previamente auditado. Aplican la matriz completa de `subscription-requirements-audit-20261112.md` y las confirmaciones posteriores del solicitante: cinco planes, seis meses calendario Free, CLP netos más IVA, paquetes confirmados y módulos comunes. Las seis opciones incompatibles del Word v1.1 no sustituyen estas decisiones.

| Plan inicial | Trabajadores registrados | Precio mensual neto CLP |
|---|---:|---:|
| Free, seis meses calendario y beneficio único por empresa | 15 | 0 |
| La Unión | 60 | 1.000 |
| Purranque | 180 | 2.000 |
| Frutillar | 360 | 3.000 |
| Puerto Octay | 720 | 4.000 |

Paquetes iniciales: +100/$50.000; +200/$100.000; +500/$300.000 mensuales netos. Se pueden combinar, inicialmente no repetir; sus reglas futuras son parametrizables. Libro de Obra y Gestor de Oportunidades tienen contratación independiente. No hay cobro automático ni cambios automáticos de plan.

## Prueba pública en producción

Chrome aislado, sin perfil ni sesión del usuario, en `https://nexoklar.com/planes`, a 375 y 1440 px. No se enviaron formularios válidos, solicitudes comerciales, altas ni correos; el recomendador real sólo calcula una oferta.

- Los cinco planes, cupos, precios, IVA, seis meses Free y renovación manual pagada coinciden con el catálogo real.
- Catorce dotaciones verificadas tanto en API como en pantalla: 1, 15, 16, 60, 61, 137, 180, 181, 360, 361, 720, 721, 850 y 1520. Todas correctas. Ejemplos: 137 → Purranque/$2.000; 850 → Puerto Octay +200, 920 cupos/$104.000; 1520 → los tres paquetes, 1.520 cupos/$454.000.
- Ocho recorridos de CTA pagados: cuatro planes en cada anchura, formulario y oferta correctos. Free abre Crear empresa y allí se informa la invitación necesaria. No se completó una inscripción.
- El envío vacío bloquea ocho campos obligatorios, presenta errores asociados y enfoca Razón social, sin POST comercial. Los paquetes muestran 0/1 y totales correctos en ambas anchuras.
- Se presentan ocho grupos de módulos comunes y ambos servicios separados. Sin desborde horizontal de página ni errores JavaScript. El 401 anónimo de `/api/auth/me` es esperado.
- `/api/health`: 7.8.0, commit `ee627c6`; `/api/ready`: correcto. `/api/auth/config` informa registro habilitado y MFA obligatorio; el alta aún requiere invitación y aprobación. El catálogo publicado todavía carece de los nuevos metadatos `publicFeatures`, `ctaText` y `active`, y la página no tiene la nueva tabla comparativa.

Evidencia local conservada en `nexoklar-evidence-20261113`: `public-qa-summary.txt`, `public-planes-qa.json`, `public-planes-followup.json` y ocho capturas. El contenido productivo inicial no demuestra el despliegue de #337/#338.

## Hallazgos y correcciones asociadas

| Prioridad | Hallazgo reproducible | Acción |
|---|---|---|
| P2 | Un aviso de vencimiento Free en panel o correo indicaba solicitar renovación manual, pero Free sólo puede activarse una vez y el servidor rechaza renovarlo. | #337 distingue Free: solicitar contratación de plan pagado; para pagados conserva renovación manual. Ambos canales mantienen ausencia de cobro/cambio y confirmación administrativa. Cuatro regresiones con transporte simulado y lectura real de la bandeja. |
| P2 | Publicar un paquete con `stackable=false` y abrir «¿Cómo amplío Puerto Octay?» seguía prometiendo «paquetes acumulables». | #338 usa las reglas vigentes de combinación y repetición, sin prometer una condición desactivable. Prueba de publicación del paquete y lectura de FAQ. |
| P3 | En producción, abrir Planes a 1440×1000 y zoom 100%: Purranque sobrepasa 1,33 px el borde de su tarjeta por un título de 40 px. | El estilo de #338 ya limita el título y permite partir palabras. Se refuerza la comprobación geométrica de los cinco títulos a 375/1440 px. Pendiente comprobar el estilo publicado. |

Se refuerza además el caso de conservar el precio histórico del **mismo** plan pagado: publicar Purranque a $2.750 muestra esa nueva oferta y conserva $2.000 en Mi plan y panel del contrato anterior. El backend ya lo cubría; ahora se comprueba también en navegador.

Validación de esta corrección: servidor **114/114**, cero omisiones, PostgreSQL16 y migraciones reales, commit `51973c02dd3383a294bd90c0cae5ed5b0cbbee6d`, [CI43421095977](https://github.com/elcesar/accesomina/actions/runs/43421095977). Prueba local enfocada del catálogo en Chrome **26/26**, sin reintentos, incluidos los casos anteriores y geometría375/1440. Compilación de interfaz correcta; conserva la advertencia ya existente de tamaño del bundle. La suite completa de interfaz se vuelve a ejecutar en el PR actualizado; sus resultados finales se registran en #338/#329.

## Parametrización privada y límites de la conclusión

La revisión de código y pruebas de #337/#338 conserva una cadena única: administración → API/BD versionada → oferta pública vigente → propuesta/contrato con condiciones históricas. Incluye nombres, descripciones, beneficios, CTA, orden, visibilidad, precios, cupos, duración, gracia, paquetes, perfiles comerciales/operativos, documentos y auditoría.

La capacidad cuenta todos los trabajadores registrados y se valida en servidor, importaciones y concurrencia. Los permisos limitan quién puede publicar, aprobar y ejecutar; nadie aprueba su propia solicitud. Las políticas de cancelación/retención pendientes de decisión siguen como borradores y no ejecutan borrado automático. No se detectó otro requisito compatible omitido al releer el mismo prompt.

Esta ronda no accedió a una sesión privada productiva ni cambió sus contratos o catálogo. No acredita recepción real de avisos, ejecución del proceso programado, una contratación real ni la totalidad de módulos internos. Las pruebas locales con API simulada no sustituyen esos recorridos productivos.

## Liberación

Mantener #329 abierto. César debe revisar los PR, publicar primero #337 y actualizar ECS, verificar las migraciones 028/029 y la versión, después integrar/publicar #338 y ejecutar QA privada con empresa y buzón autorizados. Conservar el orden y la pausa de nuevos documentos comerciales del runbook `subscriptions-production.md`: el frontend anterior no incluye todos los metadatos nuevos que exige el backend actualizado. La compilación de una imagen no actualiza por sí sola el servicio ECS.

Las correcciones de regresión #334/#335/#339 conservan sus revisiones separadas; no se mezclan con estos cambios de comunicación. No se hizo merge, despliegue, cierre del issue ni envío de correo.
