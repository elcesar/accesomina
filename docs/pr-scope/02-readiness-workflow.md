# Flujo único de habilitación

## Objetivo
Presentar un estado general de habilitación calculado para una persona en un contexto operacional, con su causa y próxima acción, sin reemplazar ni modificar las demás dimensiones de la persona.

## Dimensiones independientes

El estado general es un resumen para el usuario. No es una única variable persistida que mezcle relación laboral, disponibilidad, habilitación o acceso. Cada dimensión conserva su propio dato y ciclo de vida:

```text
Relación laboral: permanente, esporádica o planta
Disponibilidad: disponible, asignado, bloqueado o restringido
Habilitación: habilitado o no habilitado (resultado calculado)
Acreditación: pendiente, vigente, observada o vencida
Credencial: pendiente, vigente, vencida o revocada
```

Una asignación a una Orden de Servicio sólo modifica la disponibilidad operacional. No puede alterar `tipo`, `employmentProfile` ni la relación laboral. Del mismo modo, una credencial vencida o un documento faltante puede cambiar la habilitación, pero no la disponibilidad ni el vínculo laboral.

## Motor de habilitación

El motor recibe una persona, la fecha de evaluación y el contexto de Cliente, Contrato y Orden de Servicio. Debe consumir los requisitos efectivos resueltos por la matriz definida en PR #39; no debe replicar listas documentales ni reglas de vigencia propias.

```text
Matriz de requisitos
Cliente + Contrato + OS + Cargo
             ↓
Requisitos efectivos
             ↓
Motor de habilitación
             ↓
Estado general + causa + próxima acción
```

El resultado debe considerar documentos, salud, formación, EPP, restricciones, acreditación y credencial. Debe incluir al menos:

- `status`: `habilitado` o `no_habilitado`.
- `cause`: condición prioritaria verificable que impide la habilitación.
- `nextAction`: acción derivada de la causa, con destino de proceso cuando exista.
- `requirements`: resolución de requisitos de la matriz, incluyendo fuentes y evidencia.
- `evaluatedAt`: fecha y contexto usados para calcular el resultado.

Ejemplos de próxima acción:

| Causa | Próxima acción |
| --- | --- |
| Contrato faltante | Cargar contrato |
| Examen vencido | Renovar examen |
| Credencial vencida | Renovar credencial |
| Restricción activa | Revisar restricción |

Ficha de Persona, Alertas, Panel de Control y Planificación deben consumir esta misma respuesta del motor.

## Restricciones y autorización excepcional

Una persona bloqueada o no habilitada no puede asignarse por defecto. La excepción operacional es un registro explícito y auditable, no un cambio de categoría ni de disponibilidad.

Una excepción debe indicar: persona, OS, motivo, autorizada por, rol del autorizador, fecha de autorización y vigencia. Sólo roles autorizados por la empresa pueden crearla.

- Una restricción marcada como exceptuable puede permitir la asignación mientras exista una excepción vigente y aplicable a la misma OS.
- Una restricción no exceptuable mantiene prohibida la asignación, incluso ante una autorización operacional.
- Al vencer o revocarse la excepción, la persona vuelve a quedar impedida para esa asignación si la causa original persiste.

## Historial y trazabilidad

El historial de habilitación debe registrar cambios manuales y cambios derivados automáticamente por el sistema. Cada entrada debe conservar estado anterior, estado resultante, causa, origen, requisito o evidencia relacionada, contexto de OS y actor cuando corresponda.

Ejemplo de evento automático:

```text
23-09 00:00 — NO HABILITADO
Causa: Examen de altura vencido
Origen: regla automática
Requisito: OS-150
```

## Criterios de aceptación
1. El estado general de habilitación se calcula sin modificar relación laboral, disponibilidad, acreditación o credencial.
2. La matriz de requisitos del PR #39 es la única fuente de requisitos documentales para el motor.
3. El resultado entrega causa, próxima acción, fuentes, evidencia, contexto y fecha de evaluación.
4. La misma respuesta alimenta ficha, alertas, panel y planificación.
5. No se puede asignar una persona bloqueada o no habilitada, salvo una excepción vigente, aplicable y exceptuable autorizada por un rol permitido.
6. La excepción nunca elimina ni modifica la restricción de origen.
7. El historial muestra tanto acciones humanas como cambios derivados por condiciones automáticas.

## Pruebas
- Persona permanente, asignada y habilitada: la asignación no modifica su relación laboral.
- Persona disponible con documento obligatorio vencido: no habilitada sin cambio de disponibilidad.
- Persona acreditada con credencial vencida: no habilitada con causa de credencial.
- Persona bloqueada intentando ser asignada: la asignación es rechazada.
- Bloqueo exceptuable con excepción autorizada, auditada y vigente para la OS.
- Excepción vencida: la asignación vuelve a quedar impedida.
- Bloqueo no exceptuable: permanece prohibido aunque se solicite autorización.
- Cambio automático de habilitado a no habilitado por vencimiento de una evidencia.
- Misma persona evaluada para dos OS con requisitos efectivos distintos.
- Cambio de habilitación que no modifica disponibilidad, categoría laboral, acreditación ni credencial.
