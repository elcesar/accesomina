# QA de eliminación de cuentas y recuperación de archivos — issue #205

La pantalla de Administración de clientes distingue la eliminación de la cuenta y sus datos de la limpieza física de archivos. Una respuesta aceptada con limpieza pendiente no se presenta como eliminación total. La cola se consulta al abrir o actualizar la pantalla y no depende de conservar la empresa en el navegador.

## Contrato de interfaz

- `DELETE /api/tenants/:id/data` envía JSON con `confirmation` y `reasonCode`. La confirmación contiene el RUT exactamente como lo muestra el formulario. El motivo se conserva si el servidor rechaza la solicitud.
- Sólo `erased: true`, `cleanupPending: false` y `filesPending: 0` permiten confirmar la eliminación de cuenta, datos y archivos.
- `202`, `cleanupPending: true` o un conteo desconocido mantienen el estado de limpieza pendiente. `filesPending: null` se muestra como «Cantidad de archivos por confirmar».
- `GET /api/tenants/erasure-cleanups` devuelve referencias sin identidad de la empresa ni ubicaciones de almacenamiento: `erasureId`, `deletedAt`, `reasonCode`, `filesPending` y `lastError`.
- `POST /api/tenants/erasure-cleanup/:erasureId` reintenta la limpieza de una referencia. Una respuesta pendiente conserva la fila; sólo una confirmación explícita de cero archivos pendientes permite retirarla.
- La pantalla no muestra el valor crudo de `lastError`. Un fallo de lectura tampoco se representa como una cola vacía.

## Resultado perdido

Ante una respuesta de eliminación perdida o un fallo de servidor, la interfaz consulta empresas y limpiezas. Si la empresa ya no está registrada, informa ese hecho sin afirmar que todos sus archivos estén eliminados. Las referencias pendientes se pueden reintentar desde el listado, incluso después de recargar la página.

Si la cuenta sigue registrada y ambas consultas se completan, se permite un reintento explícito. Si no puede comprobarse el estado, el formulario bloquea otro envío y ofrece «Comprobar estado de eliminación». No se repite automáticamente el borrado.

La exclusión síncrona de solicitudes evita un segundo envío mientras se procesa una eliminación o un reintento de limpieza. Cancelar y Escape no cierran el formulario durante una eliminación en curso.

## Pruebas locales

`nexo-v2/e2e/tenant-erasure.spec.js` usa cuentas ficticias y APIs simuladas. Se ejecuta en 1440 y 375 píxeles e incluye:

- Eliminación completa, limpieza pendiente y conteo desconocido.
- JSON de confirmación y motivo; protección frente a doble envío.
- Cola recuperada tras recarga, reintento parcial y limpieza completada.
- Fallos de lectura y de reintento con recuperación explícita.
- Respuesta perdida con y sin borrado confirmado por la actualización.
- Rechazo de confirmación sin perder los datos del formulario.
- Error de confirmación asociado al campo y foco restaurado; comprobación fallida sin otro envío de eliminación.
- Acceso denegado a los cinco roles que no son administración global, sin consultar ni modificar la cola.

Desde la raíz del repositorio, con las dependencias y el navegador de Playwright preparados:

```sh
npm --prefix nexo-v2 run test:e2e -- e2e/tenant-erasure.spec.js
npm --prefix nexo-v2 run build
```

Estas pruebas verifican el comportamiento frontend con el contrato simulado. No borran cuentas ni archivos publicados, no demuestran por sí mismas persistencia tras reiniciar el servidor y no sustituyen las pruebas backend de autorización, transacciones, manifiesto o almacenamiento versionado. La validación publicada requiere una cuenta y archivos de prueba expresamente autorizados.

## Resultado local del 29 de octubre de 2026

32/32 casos aprobados en Chrome local con perfil aislado, sin reintentos automáticos del ejecutor. Los fallos iniciales de selección del campo Motivo y del mensaje de acceso denegado se corrigieron en los selectores de prueba antes del lote final; no alteran las expectativas de eliminación ni de permisos. El build frontend terminó correctamente y conserva la advertencia de tamaño del bundle.
