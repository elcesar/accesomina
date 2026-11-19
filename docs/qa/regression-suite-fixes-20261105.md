# Corrección de los 14 fallos heredados

Base: `22fd446c5d0a41f46375364bc7f995f7498a0956`. Seguimiento: #332 (Contratos), #269 (Oportunidades) y #333 (pruebas).

## Correcciones funcionales

**Contratos y firmas.** La ruta del listado calculaba registros y filtros, pero sólo mostraba encabezado y contador. Se restaura la tabla, apertura de fichas y clientes, búsqueda, filtros por estado/cliente, resumen y estados de carga, error, catálogo vacío y filtros sin resultados. La creación conserva la acción global «+ Contrato». La ficha mantiene adjuntos, versiones y guardado; consulta no puede crear ni editar. Los filtros permanecen en la URL al abrir y volver del detalle.

**Importación de Oportunidades.** La normalización ya reunía los datos existentes y entrantes; el bucle posterior volvía a agregarlos. Eso duplicaba identificadores actuales o conservaba colecciones históricas que debían vaciarse. La composición final se aplica una sola vez, con una única colección principal. Los respaldos normalizan las colecciones recibidas y no recuperan registros antiguos del destino al reemplazar.

La transacción conserva las comprobaciones de referencias, permisos, confirmación de reemplazo, versiones y auditoría. Un fallo de validación, auditoría o configuración revierte la operación. Los demás módulos mantienen su comportamiento de agregado. El respaldo sin oportunidades no modifica esas colecciones; un respaldo con oportunidades explícitamente vacías sí las reemplaza, conservando la auditoría.

## Actualización de pruebas

Se corrigen las llamadas al validador que omitían `{previousState}`, el uso del mecanismo alternativo en módulos que no admite, la falta de órdenes para calcular disponibilidad, los CSV con saltos de línea literales, la confirmación de reemplazo y la comparación de un campo opcional `undefined` con el JSON persistido.

Salud mantiene la regla ya implementada en #266: cada fila es una evaluación individual, incluidas renovaciones con iguales fechas. Las pruebas verifican esa conservación y continúan rechazando identificadores duplicados y referencias inexistentes. También se conservan los rechazos de personas restringidas, oportunidades duplicadas y RUT históricos modificados indebidamente.

## Validación

La suite completa del servidor pasa localmente: **557/557**, sin omisiones. La comprobación adicional sobre los PR de planes #330/#331, en una copia temporal, pasa **627 casos, cero fallos y una omisión explícita** de la prueba de PostgreSQL externo; no se modificaron esas ramas. Incluye siete regresiones adicionales de importación y una prueba adicional de salud. Contratos pasa **10/10 pruebas Chrome** a 375/1440 px y compilación. Se sustituye la búsqueda de una expresión literal en el código de Contratos por pruebas de su interfaz real: lista, búsqueda/filtros, estados vacíos, recuperación, roles, alta, adjuntos, edición, recarga y rutas directas en escritorio y móvil.

`qa-regression.yml` ejecuta la suite completa del servidor, compilación y regresión de navegador de Contratos, Oportunidades, RUT, salud, acceso y recuperación de errores. No despliega. Consultar las comprobaciones del último commit del PR antes de aprobarlo.

Las pruebas usan registros ficticios, PostgreSQL embebido y APIs controladas. No se modificaron empresas, trabajadores, archivos ni credenciales del entorno publicado. No se envían correos.

## Integración y liberación

El cambio se propone directamente sobre main y no depende de los planes de #330/#331. Al integrar #300, conservar la composición única de Oportunidades y repetir sus regresiones. No se requieren migraciones ni cambios de precios o capacidades.

Tras revisión, el flujo existente publica la interfaz a S3/CloudFront y la imagen del servidor a ECR; César actualiza ECS. La corrección de importación sólo estará publicada al actualizar el servidor. Completar el retest autorizado de Contratos e importación antes de cerrar los issues funcionales. Las pruebas locales y CI no sustituyen esa validación del entorno publicado.
