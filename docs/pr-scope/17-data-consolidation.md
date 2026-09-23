# Consolidación de datos actuales e históricos

## Objetivo
Consolidar colecciones actuales y legacy sin omitir registros, elegir valores de forma
arbitraria ni destruir evidencia histórica. La consolidación debe entregar una fuente
canónica para fichas, reportes, alertas e integraciones, manteniendo el origen de cada
dato y los conflictos que requieran revisión.

## Identidad por dominio
La identidad se define por entidad; no se deduce solamente desde el nombre visible.

| Dominio | Clave de consolidación | Regla de respaldo |
| --- | --- | --- |
| Personas | RUT chileno normalizado | ID legado mapeado explícitamente cuando no exista RUT válido |
| Clientes | RUT de empresa normalizado | ID comercial canónico, nunca sólo razón social |
| Contratos | Cliente canónico + número/código normalizado | ID de contrato dentro del cliente |
| Órdenes de servicio | Cliente/contrato canónico + código de OS | ID de servicio dentro de su relación comercial |
| Entregas EPP | ID de entrega o persona + ítem + fecha efectiva + serie/lote cuando exista | Revisión manual si no hay una clave suficientemente estable |
| Documentos y evidencias | ID de evidencia/archivo y su entidad relacionada | No deduplicar por nombre de archivo solamente |

Las personas reutilizan la normalización de RUT definida en PR #37. Las claves de
importación del PR #43 deben reutilizar estas mismas definiciones.

## Resultado de la consolidación
Cada grupo de registros equivalentes debe clasificarse antes de persistir:

- **Duplicado exacto:** se conserva una representación canónica y se registran ambos orígenes.
- **Datos complementarios:** sólo se completa un campo canónico vacío con un valor legacy válido; se registra su procedencia.
- **Conflicto:** dos valores no vacíos y válidos difieren. No se selecciona uno en silencio; queda pendiente de regla explícita o revisión autorizada.
- **Sólo actual / sólo histórico:** se conserva el registro con su origen, sin inventar una contraparte.

No existe una regla global de que "actual gana todo" ni de que "legacy completa siempre".
La precedencia se define por campo y dominio. Los identificadores inmutables deben
coincidir; para campos de contacto, fechas, estado y datos operativos sólo podrá
preferirse un origen cuando exista una regla documentada, una fecha confiable y
trazabilidad de la decisión.

Ejemplo de persona con información complementaria:

```yaml
actual:
  rut: 13.848.379-7
  email: nuevo@empresa.cl
  telefono: ''
legacy:
  rut: 138483797
  email: antiguo@empresa.cl
  telefono: +56922222222
resultado:
  email: nuevo@empresa.cl
  telefono: +56922222222
  procedencia:
    email: actual
    telefono: legacy
```

Si ambos teléfonos son válidos y distintos, el resultado debe ser un conflicto
registrado, no una elección automática.

## Trazabilidad y referencias

- Conservar por cada campo incorporado la colección, ID de origen, fecha de consolidación y regla aplicada.
- Registrar conflictos con valores involucrados, estado de resolución y usuario/regla que los resolvió.
- Mantener documentos, eventos, movimientos y referencias legacy vinculados al ID canónico; no borrar la fuente histórica.
- Construir un mapa `legacyId -> canonicalId` por entidad y validar referencias entre persona, cliente, contrato, OS, asignaciones, documentos y EPP antes de habilitar la lectura canónica.
- Los expedientes exportables del PR #52 continúan siendo snapshots: una consolidación posterior no altera evidencia ni estado ya exportados.

## Aplicación común
La misma capa de identidad, fusión y conflicto debe ser consumida por importaciones,
fichas, reportes, alertas y APIs. Ningún consumidor puede volver a usar el patrón de
"primera colección que tiene datos". Las validaciones semánticas de RUT, correo,
teléfono y demás campos aplican antes de aceptar valores desde cualquiera de las dos
fuentes.

## Migración y retiro de legacy

1. Ejecutar consolidación en modo de comparación, sin retirar lecturas existentes, y medir duplicados, conflictos y referencias sin resolver.
2. Revisar o resolver los conflictos antes de promover datos canónicos para cada dominio.
3. Migrar consumidores a la resolución común y contrastar sus resultados con las colecciones originales.
4. Bloquear nuevas escrituras en colecciones legacy una vez que cada dominio tenga ruta canónica validada.
5. Verificar mediante pruebas, instrumentación y búsqueda de dependencias que no queden consumidores productivos de legacy.
6. Archivar las fuentes históricas y sus mapas de equivalencia; retirar fallbacks sólo después de respaldo, validación de referencias y período de observación definido.

## Criterios de aceptación
- Unir colecciones equivalentes por la clave estable propia de cada dominio, cubriendo personas, alertas, alojamiento, clientes, contratos, órdenes, formación, exámenes, vehículos y EPP.
- Conservar valores complementarios sólo con una regla de campo válida y guardar siempre su origen.
- Exponer conflictos reales para revisión, sin sobrescribir silenciosamente valores válidos distintos.
- Resolver y validar las referencias relacionadas antes de declarar canónico un registro consolidado.
- Eliminar fallbacks que toman sólo la primera colección con datos, reemplazándolos por el resolvedor común.
- No retirar colecciones legacy hasta demostrar que todos los consumidores usan la ruta canónica y que la trazabilidad histórica permanece disponible.

## Pruebas
- Persona con email actual y teléfono legacy complementario, validando procedencia por campo.
- Persona con dos teléfonos o correos válidos distintos, validando que se registre conflicto sin elección automática.
- Duplicados con distinta fecha, registro sólo legacy y registro sólo actual.
- RUT equivalente con y sin formato, RUT inválido y homónimos sin clave estable.
- Clientes, contratos, OS y EPP con sus claves de dominio y sin deduplicación basada sólo en texto.
- Referencias cruzadas de contrato, OS, asignación, documento y entrega EPP después de consolidar sus entidades origen.
- Importación que detecta la misma identidad/conflicto que la consolidación.
- Snapshot exportado antes de la consolidación y evidencia histórica que se mantiene consultable después.
- Consumidores sin fallback legacy, referencias sin huérfanos y retiro bloqueado mientras exista una dependencia legacy.
