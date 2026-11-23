# Issue #120 · MESA-07 — catálogo de estados semánticos

## Regla por defecto vigente (manual §23)

Únicos estados visibles **en campos de cumplimiento / vigencia**:
- Vigente (`ok`).
- Por vencer (`warn`).
- No habilitado (`error`).
- Sin información (`none`).

Los **estados de un proceso** (`pendiente`, `seguimiento`, `cerrado`, `borrador`, `finalizado`, `historico`, etc.) conservan su semántica y se exponen en un campo separado, nunca como resultado de cumplimiento.

| Módulo | Campo de cumplimiento | Campo de flujo | Tratamiento en PR |
| --- | --- | --- | --- |
| Salud ocupacional | Resultado de cumplimiento del protocolo | Etapa de protocolo (seguimiento, pendiente, cerrado) | Inputs separados; badge, filtro y contador usan solo cuatro estados |
| Habilitaciones y cumplimiento | Estado del requisito, por empresa | Alta/seguimiento administrativo | Badge, filtro y agregado calculados con catálogo común; faltantes no son automáticamente aprobados |
| Habilitación del cliente | Estado de cumplimiento de la acreditación, condicionado a evidencia | Pendiente, enviado, observado, corregido, rechazado, aprobado, pase emitido | Badge y filtro normados, filtro editable de proceso separado; no inferir habilitación solo por emitir credencial |
| Exámenes y aptitudes | Resultado y vigencia | Registro de examen | Conserva apto/no apto como resultado del examen; badge normado; apto con restricción no es habilitación sin decisión explícita |
| EPP | Vigencia de reposición | Entrega y movimiento | Badge normado según fecha; el proceso conserva sus propias etapas |
| Órdenes de servicio | Estado de preparación de personas asignadas obtenido de evidencias y vigencias | Estado de la orden y asignaciones | Nunca marcar como preparado un protocolo por estar cerrado/en seguimiento; lo desconocido queda Sin información |
| Contratos | Vigencia documental cuando aplica | Borrador, vigente contractual, finalizado | **No convertir automáticamente** borrador/finalizado en aptitud; se mantiene el indicador de estado contractual |
| Turnos | Vigencia de habilitación de persona, si aplica | Asistencia/cobertura del turno | Ausente, licencia, cobertura completa y brecha son **estados operativos**, no estados normativos de aptitud |
| Clientes, Órdenes y otros | Evidencia de cumplimiento específica | Activo, prospecto, en revisión, cancelado | No homologar estados comerciales o del proceso con aptitud |

## Compatibilidad histórica

La solución **no migra ni reescribe datos persistidos**. Los valores históricos no reconocidos se representan como `Sin información` en cumplimiento, manteniendo en otro campo la etapa original cuando existe. Para registros sin evidencia, no se infiere `Vigente` solo porque estén cerrados o finalizados.

## Decisiones pendientes de MESA-07

1. Si `apto_con_restriccion` puede equipararse con `Vigente` condicionado, y qué contexto / restricciones exige.
2. Si un requisito ausente o histórico parcial en Habilitaciones se clasifica como `No habilitado` o `Sin información`. Este PR usa `Sin información` por prudencia.
3. Definir qué pruebas de evidencia/documento permiten considerar `Vigente` un protocolo de Salud ocupacional.
4. Revisar si una acreditación aprobada **sin** archivo o enlace de evidencia puede considerarse vigente. En este PR se conserva como Sin información.
5. Validar semántica por módulo en ambiente real (Personas, Contratos, EPP, Turnos, Órdenes, Alertas y Cumplimiento) y registrar retest QA R03.

**Importante:** mientras la mesa no resuelva esos puntos, este PR no puede certificar por sí solo cierre completo del issue. Los ajustes conservadores evitan habilitaciones falsas.
