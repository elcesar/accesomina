# Expediente auditable

## Objetivo
Exportar evidencia ordenada por persona, contrato u orden de servicio como un snapshot histórico verificable de la evaluación realizada en una fecha y contexto determinados.

## Naturaleza histórica del expediente

El expediente es inmutable respecto de la información certificada al exportar. No es una vista dinámica de los datos actuales.

Por ejemplo, si el 23-09 se exporta un examen vigente hasta el 30-09, el expediente conserva que estaba vigente al 23-09 aunque el examen venza posteriormente. Un nuevo expediente puede reflejar el nuevo estado, pero no altera el anterior.

Cada exportación conserva fecha/hora, solicitante, tenant, alcance, versión del formato y fecha de evaluación. El estado de habilitación incluido corresponde al resultado calculado en ese momento y contexto; no se vuelve a calcular con reglas futuras sin generar un nuevo expediente.

## Requisitos, habilitación y evidencia

Para cada requisito efectivo, el snapshot registra:

- Código e identificador estable del requisito y nombre visible.
- Regla aplicada, obligatoriedad, vigencia y fuentes: base, cliente, contrato, OS, cargo o condición.
- Estado al exportar: vigente, faltante, vencido o no aplica.
- Documento o evidencia asociada, con identificador, emisor, fechas y referencia privada autorizada.
- Fecha de evaluación, persona y contexto operacional.

El estado de habilitación registra resultado, causa, próxima acción y contexto conforme al motor del PR #40. La resolución de requisitos y fuentes se obtiene del motor del PR #39.

Documentos faltantes o vencidos se incluyen como brechas explícitas, sin inventar una evidencia. Cuando un documento fue reemplazado, el snapshot conserva la versión o identificador de la evidencia usada en esa exportación; la nueva versión sólo aparece en expedientes posteriores.

## Integridad, permisos y formato

Cada expediente contiene un identificador único y una huella criptográfica del manifiesto de exportación. El manifiesto lista las evidencias incluidas mediante identificadores y huellas o versiones disponibles, permitiendo verificar qué archivo formó parte del expediente sin exponer su contenido.

El formato inicial es PDF con manifiesto estructurado adjunto o embebido; puede complementarse con una exportación estructurada autorizada para auditorías. Los archivos originales no se adjuntan ni descargan automáticamente si el usuario no tiene permiso sobre cada evidencia. En ese caso el expediente señala la evidencia como restringida sin revelar contenido o metadatos excesivos.

Tenant, permisos de descarga y alcance de entidad se comprueban antes de generar y antes de entregar el expediente. La bitácora registra solicitud, generación, descarga autorizada, huella, alcance y resultado, sin guardar archivos sensibles en el log.

## Criterios de aceptación
1. Cada expediente es un snapshot histórico y no cambia cuando cambian reglas o documentos posteriores.
2. Incluye estado, requisitos, documentos/evidencias, responsables, fechas, causa y próxima acción.
3. Identifica regla aplicada y fuentes de cada requisito: base, cliente, contrato, OS, cargo o condición.
4. Expone faltantes, vencidos y reemplazados como hechos auditables del momento de evaluación.
5. Incluye identificador y huella del manifiesto para verificar evidencia incluida.
6. Mantiene aislamiento por tenant, permisos de generación y permisos de descarga por evidencia.
7. Registra quién solicitó, generó y descargó la exportación autorizada.

## Pruebas
- Expediente completo con requisitos, fuentes y evidencias vigentes.
- Documento obligatorio faltante o vencido: brecha explícita y causa de habilitación.
- Regla modificada después de exportar: el snapshot anterior no cambia.
- Documento reemplazado después de exportar: el expediente conserva la evidencia original referenciada.
- Verificación de identificador y huella del manifiesto.
- Usuario sin permiso para una evidencia: no recibe su contenido ni metadatos no autorizados.
- Usuario sin permiso para generar o descargar: exportación rechazada.
