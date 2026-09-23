# Matriz de requisitos operacionales configurable

## Objetivo
Permitir definir requisitos documentales y de habilitación por empresa, cliente, contrato, orden de servicio, cargo y condición operacional, sin reemplazar la base obligatoria actual.

## Alcance funcional
- Mantener los requisitos base de Nexo Klar.
- Agregar reglas adicionales con vigencia, obligatoriedad y alcance explícito.
- Resolver requisitos efectivos de una persona para una orden de servicio.
- Mostrar el origen de cada requisito y el motivo de una brecha.

## Modelo de resolución

Los requisitos efectivos se resuelven para una persona y un contexto operacional concreto:

```text
Base Nexo Klar
  + Cliente
  + Contrato
  + Orden de servicio
  + Cargo / especialidad
  + Condición operacional
        ↓
Requisitos efectivos de la persona para la orden
```

Cada requisito debe tener un `requirementCode` estable, independiente de su texto visible. Por ejemplo, `EXAMEN_ALTURA`, `LICENCIA_A4` o `ODI`. El código es la identidad usada para consolidar, comparar documentos y evitar duplicados.

### Consolidación y origen

- Las reglas activas y vigentes de todos los niveles aplicables se agrupan por `requirementCode`.
- Un requisito definido por Cliente y por Orden de servicio genera una sola obligación efectiva.
- La obligación conserva todas sus fuentes para trazabilidad. Ejemplo: `EXAMEN_ALTURA` puede indicar como origen `Cliente Minera ABC` y `OS-150`.
- Las reglas desactivadas, fuera de su período de vigencia o cuyo alcance no coincida con la persona evaluada no entran al conjunto efectivo.

### Combinación de restricciones

Las reglas de distintos niveles se combinan de forma restrictiva; nunca una regla inferior relaja una condición ya exigida.

- Si cualquier fuente marca el requisito como obligatorio, el requisito efectivo es obligatorio.
- Si hay varias vigencias documentales, se utiliza la más corta. Por ejemplo, Cliente con 12 meses y Contrato con 6 meses da una vigencia efectiva de 6 meses.
- Si una regla exige vigencia y otra no, el requisito efectivo exige vigencia.
- Las fuentes y los valores que determinaron la regla efectiva quedan disponibles para auditoría.

### Aplicabilidad

Una regla puede limitarse por cargo, especialidad y condición operacional. Sólo aplica cuando la persona coincide con ese alcance.

Ejemplo: una regla `LICENCIA_A4` aplicada a `cargo = Conductor` no se exige a una persona con cargo Mecánico. Los filtros de cargo/especialidad se comparan mediante identificadores de catálogo cuando existan; mientras se migra el catálogo, la comparación debe ser normalizada y exacta, no por coincidencias parciales de texto.

### Estado documental

El motor compara cada requisito efectivo con los documentos de la persona por `requirementCode` o por una equivalencia explícita de catálogo. Debe informar al menos:

- `faltante`: no existe evidencia válida para el requisito.
- `vigente`: existe evidencia y, cuando corresponde, su fecha de vencimiento es igual o posterior a la fecha de evaluación.
- `vencido`: existe evidencia, pero su vencimiento ya ocurrió.
- `no_aplica`: la regla no coincide con el contexto de la persona; no forma parte de la habilitación.

La fecha de evaluación se recibe explícitamente y no se infiere de la fecha de carga del documento.

### Motor único

La configuración y la resolución quedan centralizadas en un servicio de requisitos. Ficha de Persona, Alertas, Gestión de Personal, Acreditación y cálculos futuros de habilitación deben consumir ese mismo resultado; ninguna pantalla debe replicar listas o criterios propios.

La respuesta del motor debe entregar, por cada requisito, `requirementCode`, nombre visible, estado, obligatoriedad, vigencia efectiva, evidencia asociada y fuentes que lo exigen. Así una ficha puede explicar, por ejemplo: “Examen de altura: faltante; exigido por Cliente Minera ABC y OS-150”.

## Criterios de aceptación
1. Un requisito de cliente se suma a los requisitos base.
2. Un requisito de una orden no elimina ni duplica reglas anteriores.
3. Dos reglas del mismo `requirementCode` producen una sola obligación efectiva con todas sus fuentes.
4. Ante vigencias distintas, se aplica la condición más restrictiva y se conserva la trazabilidad de la decisión.
5. Una regla limitada a un cargo, especialidad o condición sólo se exige a personas que coinciden con ese alcance.
6. La ficha de persona identifica el requisito, su fuente, evidencia y estado: faltante, vigente o vencido.
7. Las alertas, la ficha y la habilitación usan la misma resolución de requisitos.

## Pruebas requeridas
- Persona sin documentos base.
- Persona con documentos base pero sin requisito de altura.
- Dos órdenes con requisitos distintos para la misma persona.
- Mismo requisito definido por Cliente y Orden de servicio: un solo resultado con ambos orígenes.
- Mismo requisito con vigencia de 12 meses en Cliente y 6 meses en Contrato: regla efectiva de 6 meses.
- Licencia A4 exigida sólo a Conductores: no se exige a un Mecánico en la misma orden.
- Documento existente pero vencido a la fecha de evaluación.
- Una persona evaluada contra dos órdenes con requisitos distintos.
- Regla vencida, desactivada, no obligatoria o fuera de alcance: no se incorpora al conjunto efectivo.
