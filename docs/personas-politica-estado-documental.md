# Política de estado documental de Personas

## Propósito

La ficha de una persona usa una única regla para **Requisitos**, **Documentos cargados** y el porcentaje de cumplimiento. La fuente de la regla es `documentRule()` y la evaluación es `documentStatus()`.

## Evidencia mínima

Una evidencia sólo es utilizable cuando contiene una referencia a archivo descargable:

- Documento de una cara: `fileId` o un archivo de `files[]` con `fileId`.
- Documento de dos caras: anverso y reverso con `fileId`.
- Un registro histórico que conserva sólo `fileName`, sin `fileId`, no acredita evidencia. Se mantiene visible como registro histórico y debe recargarse.

La comprobación de existencia física del objeto en almacenamiento no forma parte de esta regla de interfaz. Se sigue en #277.

## Vencimiento

Las fechas sin hora se representan como `YYYY-MM-DD` y se evalúan por día calendario local:

- **Cédula de identidad** y **licencia de conducir**: requieren anverso, reverso y fecha de vencimiento. La ausencia de cualquiera deja la evidencia en **No habilitado**.
- **Currículum vitae**: no requiere vencimiento.
- Contrato de trabajo, anexo asociado al servicio y los demás tipos con regla `optional`: pueden quedar **Vigentes** sin fecha, siempre que la evidencia sea válida y no esté rechazada.
- Una evidencia que vence hoy sigue **Vigente** durante ese día; pasa a **No habilitado** al iniciar el día calendario siguiente.
- Entre 1 y 30 días antes de vencer se muestra **Por vencer** y sigue contando como cumplimiento.
- Una fecha inválida, vencida o una evidencia rechazada queda **No habilitada** y no cuenta.

La validación transversal de zona horaria y horario de verano de Santiago se sigue en #278.

## Cómputo de cumplimiento

Cada requisito cuenta una sola vez. Si existen varias evidencias para el mismo requisito, basta una evidencia vigente o por vencer para cumplirlo. La tabla de documentos conserva el estado propio de cada evidencia, por lo que una evidencia antigua vencida no se presenta como vigente.

El porcentaje es `requisitos cumplidos / requisitos configurados`; por ejemplo, 4 de 5 es 80 %.
