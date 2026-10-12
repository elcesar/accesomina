# Plan comercial de altas guiadas

## Trazabilidad
Refs #192 y #193.

## Objetivo
Resolver dos bloqueos de flujo sin duplicar acciones de creación: mostrar los contratos compatibles después de seleccionar Cliente al crear una Orden de Servicio y convertir acciones bloqueadas de Terceros en orientación hacia el Header global.

## Criterios
- El Header global continúa como único punto de creación.
- El selector de contrato lista únicamente contratos vigentes y asociados al Cliente seleccionado.
- Cuando no existan datos previos, la interfaz explica la acción global disponible sin botones alternativos.
- Se valida alta, edición, contrato inexistente, contrato vencido y permisos.

## Cierre
El futuro PR de código debe partir de main y usar `Closes #192` y/o `Closes #193` para los alcances efectivamente implementados.