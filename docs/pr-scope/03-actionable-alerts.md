# Alertas accionables

## Objetivo
Convertir cada alerta en una representación única, accionable y trazable de una causa vigente, sin duplicar reglas que ya resuelven la matriz de requisitos y el motor de habilitación.

## Modelo de alerta

Prioridad y estado son dimensiones independientes:

```text
Prioridad: bloqueante, próxima o informativa
Estado: pendiente, en_gestion o resuelta
```

Por ejemplo, un examen de altura vencido puede ser `bloqueante` y estar `en_gestion`. `Resuelta` nunca se usa como prioridad.

### Identidad, actualización y contexto

Cada alerta representa un hecho identificable. Su clave de deduplicación incluye el tipo de alerta, la entidad, el requisito o causa y el contexto operacional aplicable. Para una brecha documental, la identidad conceptual es:

```text
tipo + persona + requirementCode + orden de servicio
```

Una misma causa actualiza la alerta existente en vez de crear registros nuevos. Por ejemplo, un examen que vence primero en 30 días, luego en 7 días y finalmente vence conserva la misma alerta y sólo cambia su prioridad de `informativa` a `próxima` y luego a `bloqueante`.

Dos personas distintas con la misma brecha generan alertas independientes. Una misma persona con el mismo requisito en dos Órdenes de Servicio distintas conserva una alerta por contexto de OS cuando las exigencias sean independientes.

### Resolución por causa

Las alertas generadas por condiciones automáticas no se cierran de forma manual si la causa sigue vigente. El usuario puede indicar que está gestionando una alerta, pero el estado sólo pasa a `resuelta` cuando el motor correspondiente confirma que la causa desapareció.

```text
Examen vencido
      ↓
Alerta bloqueante / pendiente
      ↓
Usuario carga examen vigente
      ↓
Motor de requisitos y habilitación reevalúa
      ↓
Alerta resuelta automáticamente
```

Si la causa reaparece después de haberse resuelto, se crea una nueva ocurrencia vinculada a la misma identidad funcional y se conserva el ciclo anterior para auditoría. No se sobrescribe el historial de la resolución anterior.

### Responsable y acción

El tipo de alerta define el rol responsable y la acción sugerida; puede asignarse además una persona concreta cuando el flujo lo requiera.

| Tipo de alerta | Rol responsable | Acción sugerida |
| --- | --- | --- |
| Documento faltante | Administrador Cliente | Cargar documento |
| Doble asignación | Planificador | Revisar asignaciones |
| Credencial vencida | Encargado de acreditación | Renovar credencial |

La acción debe incluir un destino contextual, no sólo una ficha general. Por ejemplo, un contrato faltante abre `Persona → Documentos → Contrato de trabajo`; una doble asignación abre `Persona / Planificación → Asignaciones activas`.

## Motor común

Alertas no implementa otra lista de requisitos ni reglas propias de habilitación. Consume resultados de los siguientes servicios:

```text
PR #39: Matriz / motor de requisitos
                ↓
PR #40: Motor de habilitación
                ↓
PR #41: Alerta, responsable y acción sugerida
```

Así una modificación a una regla se refleja de forma coherente en Ficha, Habilitación, Panel, Planificación y Alertas.

## Auditoría

Cada ocurrencia registra clave de identidad, entidad y contexto, prioridad, estado, causa, fuentes, responsable por rol, responsable asignado cuando exista, acciones tomadas, fechas de creación/resolución y el evento o actor que originó cada cambio.

## Criterios de aceptación
1. Prioridad es bloqueante, próxima o informativa; estado es pendiente, en gestión o resuelta.
2. Una misma causa y contexto actualiza una alerta existente y no crea duplicados.
3. La alerta automática sólo se resuelve cuando se corrige su causa y el motor común lo confirma.
4. Enlace directo a la persona, orden, contrato, recurso y sección exacta donde se resuelve la causa.
5. Acción sugerida y responsable derivados del tipo de alerta.
6. Nueva aparición de una causa resuelta crea una nueva ocurrencia auditada.
7. Resolución auditada y coherente con los motores de requisitos e habilitación.

## Pruebas
- Misma alerta cambiando de prioridad sin duplicarse.
- Causa corregida que resuelve automáticamente la alerta.
- Intento de cierre manual mientras la causa continúa vigente.
- Causa resuelta que vuelve a aparecer posteriormente.
- Responsable distinto según tipo de alerta.
- Alerta asociada simultáneamente a Persona y Orden de Servicio.
- Enlace que lleva directamente al contexto de resolución.
- Dos personas con la misma brecha generan alertas independientes.
- Misma persona con el mismo requisito en dos OS, validando contexto y deduplicación.
