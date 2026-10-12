# Plan de documentos y evidencias

## Trazabilidad
Refs #164 y #170.

## Objetivo
Definir la implementación pendiente para una clasificación documental única y para que Contrato de trabajo y Anexo asociado al servicio sean evidencias distintas, cargables consecutivamente.

## Condiciones
- Una sola taxonomía visible para el usuario, manteniendo identificadores internos estables.
- Cada evidencia se persiste y valida de forma atómica.
- La eliminación conserva objetos todavía referenciados y la auditoría del evento.
- Las pruebas incluyen contrato, anexo, duplicados reales, anverso/reverso y recarga.

## Relación con otros cambios
Los PR ya integrados #177, #189, #201 y #203 establecen el patrón atómico. La validación productiva se controla en #212.

## Cierre
Abrir un PR de implementación desde main vigente con `Closes #164` y/o `Closes #170` sólo después de validar el modelo unificado.