# Eliminación definitiva de empresas: operación y retest

Seguimiento: issue #205. La implementación inicial de PR #73 está integrada;
su aprobación no acredita una eliminación funcional completa en el entorno publicado.

## Requisitos de publicación

1. Confirmar `025_tenant_hard_erasure.sql` y aplicar después la nueva
   `026_tenant_erasure_history.sql` antes de iniciar el backend corregido.
   La 026 habilita la cascada del historial del libro de obra únicamente para la
   empresa objeto de la eliminación autorizada. No se renumera ni modifica la 025.
2. Publicar primero el backend con el listado y reintento de limpieza y después el
   frontend que envía el cuerpo JSON y distingue eliminación completa de pendiente.
3. Para S3, comprobar en el rol efectivo `s3:GetBucketVersioning`,
   `s3:ListBucketVersions`, `s3:DeleteObjectVersion` y `s3:DeleteObject`.
   La aplicación no modifica IAM, retención, Object Lock ni MFA Delete.
4. Revisar las pruebas y los controles remotos de integración. Un build de imagen
   ECR no acredita por sí mismo actualización del servicio ni QA de borrado.

## Flujo y resultado

- Sólo el rol de administración global puede eliminar o consultar/reintentar limpiezas.
- La empresa debe estar suspendida; la cuenta global está protegida.
- Se exige un motivo admitido y la frase `ELIMINAR <RUT>` que muestra el diálogo.
  También se conserva la aceptación del mismo RUT sin puntos ni guion.
- En una transacción se guardan el manifiesto y el comprobante y se elimina la
  empresa con sus registros. El manifiesto incluye archivos registrados, documentos,
  exámenes, cursos, ítems y firmas digitales, aunque un archivo esté dado de baja lógica.
- La limpieza física empieza exclusivamente después de confirmar esa transacción.
  Cada objeto confirmado se retira del manifiesto; al finalizar queda el comprobante
  técnico, sin retener las claves de almacenamiento de objetos ya eliminados.
- Un error anterior al COMMIT revierte la eliminación y no borra objetos físicos.
- Las cargas de archivos toman un bloqueo de lectura compartida de la empresa y
  comprueban su estado activo dentro de su transacción, antes de escribir objetos.
  La suspensión y eliminación esperan ese bloqueo: una carga autenticada previamente
  no puede escribir un objeto nuevo después de eliminar la empresa.
- Un error de limpieza posterior no revierte la base ya confirmada. La respuesta es
  **202**, `erased: true`, `cleanupPending: true` y un `erasureId` recuperable.
  `filesPending: null` significa que no se pudo consultar el conteo, no que sea cero.
- Sólo **200** y `cleanupPending: false` confirman limpieza terminada.

## Recuperación tras fallo o reinicio

La pantalla de Administración Nexo Klar vuelve a consultar empresas y limpiezas
pendientes. La cola procede de PostgreSQL, por lo que no depende de la memoria del
navegador o del proceso que recibió la solicitud inicial.

- `GET /api/tenants/erasure-cleanups` devuelve identificador del comprobante, fecha,
  motivo, cantidad pendiente y código de error; no devuelve nombre, RUT, correo ni
  claves de objetos.
- `POST /api/tenants/erasure-cleanup/:erasureId` reintenta únicamente los objetos del
  manifiesto correspondiente. Una repetición después de terminar no vuelve a borrar
  datos de empresas: responde completa con cero pendientes.
- Si se perdió la respuesta de eliminación, actualizar ambas listas permite encontrar
  el comprobante pendiente aunque la empresa haya desaparecido. Si el estado no se
  puede consultar, la interfaz comunica incertidumbre y ofrece actualizar; no afirma
  que la eliminación haya fallado ni que la limpieza haya terminado.
- Los manifiestos anteriores con `deleted_at` informado también se revisan y purgan
  idempotentemente, para no conservar sus claves de almacenamiento indefinidamente.
- Ante permisos S3 insuficientes, indisponibilidad o retención, se conserva el objeto
  pendiente. Corregir la condición operativa y reintentar; no desactivar la protección
  para simular éxito ni volver a dar de alta la empresa eliminada.

## Almacenamiento S3 versionado

`DeleteObject` sin `VersionId` no elimina las versiones históricas de un bucket
versionado. El helper consulta el estado de versionado, pagina las versiones y
marcadores y filtra por la clave exacta antes de borrarlos. Un prefijo no se trata
como propiedad de todos los objetos que coincidan; los objetos vecinos se conservan.
Las fallas parciales mantienen el manifiesto y el siguiente intento retoma el estado
real de S3. No se aplica bypass de retención.

Referencias primarias:

- [AWS: DeleteObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html).
- [AWS: ListObjectVersions](https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectVersions.html).

## Aceptación en desarrollo

Usar una empresa desechable identificada como QA y archivos creados para esa prueba.
No eliminar Copeval ni otra empresa existente para validar este cambio sin autorización
específica de su eliminación definitiva. Conservar una segunda empresa QA como control.

1. Verificar rechazo para roles de cliente y para empresa activa, cuenta global,
   motivo ausente y confirmación distinta. Confirmar que no hay cambios ni limpieza.
2. Con empresa suspendida, enviar la confirmación literal que pide la pantalla.
   Comprobar el cuerpo JSON de DELETE, sin doble envío.
3. Confirmar cascada, aislamiento de la empresa de control y ausencia de archivos
   de documentos, ítems, exámenes, cursos y firmas.
4. En almacenamiento controlado, provocar un fallo parcial: esperar 202, mensaje
   pendiente y comprobante visible al recargar. Reiniciar el backend, recuperar el
   comprobante y completar el reintento; la cola debe quedar vacía.
5. Probar pérdida de respuesta y fallo al consultar el manifiesto después del COMMIT.
   No debe mostrarse una falsa confirmación completa ni perderse el acceso al reintento.
6. En un bucket de desarrollo con versionado y objetos vecinos, verificar todas las
   versiones y marcadores de la clave exacta y que los vecinos permanecen intactos.
7. Repetir escritorio/móvil y registrar versión de frontend, backend, migración y
   evidencia del resultado. Mantener #205 abierto hasta completar ese retest.

Las pruebas locales de PGlite y S3 simulado no certifican IAM, Object Lock, borrado
en AWS real ni concurrencia entre conexiones de PostgreSQL desplegado.

## Resultado local del 29-10-2026

- 40/40 pruebas dirigidas de servidor: 17 del servicio/cascada/migración, 14 de
  almacenamiento, 5 de cargas durante la baja y las 4 existentes de eliminación.
- 32/32 Chrome en 1440 y 375 px; build frontend aprobado.
- Suite de servidor: 561/575 aprobadas. Los 14 fallos coinciden por nombre con los
  14 reproducidos en main `0588846` (525/539); no se declara la suite completa verde.
- La prueba de migración parte de 025 con datos en las 60 tablas por empresa;
  aplicar 026 no altera esos datos. La eliminación posterior borra sólo el objetivo.
- La prueba de reinicio cierra y vuelve a abrir una base PGlite persistida en un
  directorio temporal propio y recupera la cola con un servicio nuevo. No equivale
  a una caída de ECS/RDS ni a concurrencia de PostgreSQL real.
