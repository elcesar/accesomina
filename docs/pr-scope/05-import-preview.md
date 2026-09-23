# Previsualización de importaciones

## Objetivo
Validar una importación antes de modificar datos de la empresa y mostrar con precisión qué alta, actualización o rechazo producirá cada fila al confirmarse.

## Previsualización por fila

Cada fila recibe una acción propuesta y un resultado de validación antes de que exista cualquier persistencia:

```text
CREAR       No existe un registro con la clave estable.
ACTUALIZAR  Existe un registro y hay cambios permitidos.
SIN_CAMBIOS Existe un registro, pero los valores normalizados coinciden.
RECHAZAR    La fila tiene errores de formato, duplicidad, permisos o referencias.
```

Para Personas, la clave estable es el RUT chileno normalizado. El preview muestra los campos que cambiarán con valor anterior y nuevo. Ejemplo: `teléfono: +56911111111 → +56922222222`.

Cada tipo de importación debe declarar su propia clave estable y sus campos actualizables. La clave nunca se modifica mediante una actualización; una fila que intenta reutilizar una clave para una entidad incompatible se rechaza como conflicto.

## Validación común y aislamiento

Preview y confirmación consumen los mismos validadores semánticos y de API. Una importación no puede eludir las reglas de RUT, teléfono, correos, referencias, permisos o alcance del tenant.

- RUT inválido: se rechaza en preview y nunca llega a persistencia.
- Teléfono: se normaliza y valida según el contrato chileno usado por Personas y API.
- Referencias como cliente, contrato u Orden de Servicio deben existir y pertenecer a la misma empresa.
- Las reglas de rol se aplican tanto al preview como a la confirmación.

El preview incluye errores por fila y por campo, más la causa legible para el usuario.

## Confirmación y consistencia

La confirmación es atómica por archivo: si alguna fila falla al persistir, se revierte toda la importación y se informa el motivo. No se dejan 497 filas aplicadas si fallan 3 de 500.

Antes de confirmar, el servidor vuelve a validar el archivo y compara una huella de la previsualización con el estado relevante. Si datos concurrentes alteraron una fila, se exige generar un preview nuevo en vez de aplicar una decisión obsoleta.

La importación tiene un identificador idempotente. Reintentar la misma confirmación no puede duplicar altas ni repetir actualizaciones; devuelve el resultado ya registrado o rechaza una solicitud cuyo contenido no coincida con la ejecución original.

## Bitácora y archivo

Cada ejecución conserva, bajo permisos y aislamiento de tenant:

- Identificador de importación y huella del archivo original.
- Usuario, rol, fechas de preview y confirmación.
- Tipo de entidad, política de actualización y resultado final.
- Conteos de creadas, actualizadas, sin cambios y rechazadas.
- Motivo y campo de cada rechazo.
- Archivo original o referencia privada al archivo, según la política de retención.

La bitácora no expone el archivo ni datos de otra empresa a usuarios sin autorización.

## Criterios de aceptación
1. Mostrar válidos, inválidos, duplicados y referencias no encontradas, con detalle por campo.
2. Informar si cada fila crea, actualiza, no cambia o se rechaza.
3. Mostrar valores actuales y valores propuestos para cada actualización.
4. Usar una clave estable por tipo de entidad; Personas usa RUT normalizado.
5. Aplicar los mismos validadores de frontend y Backend/API antes de preview y confirmación.
6. Exigir confirmación sólo después de la revisión y volver a validar antes de persistir.
7. Persistir de forma atómica por archivo; ante un error no queda una importación parcial.
8. Reintentar una misma importación no duplica resultados.
9. Conservar archivo, usuario, fecha, resultado y motivos en la bitácora con aislamiento tenant.

## Pruebas
- RUT inválido y teléfono inválido: rechazados en preview y confirmación.
- Fila duplicada dentro del archivo y conflicto con clave existente.
- Persona existente con cambios de teléfono/correo: preview muestra valores antes y después.
- Contrato inexistente o perteneciente a otro tenant.
- Archivo parcialmente inválido: la confirmación no persiste ninguna fila.
- Error durante persistencia: la transacción se revierte completa.
- Reintento de la misma importación: no duplica altas ni actualizaciones.
- Cambio concurrente entre preview y confirmación: exige generar un preview actualizado.
- Archivo correcto con altas, actualizaciones y filas sin cambios.
