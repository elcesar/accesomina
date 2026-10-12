# Decisiones funcionales pendientes de Personas

## Issues relacionados

Refs #144, #157 y #158.

## Propósito

Registrar las definiciones necesarias antes de construir cambios en formularios, ficha de
persona, permisos o flujos operativos. Este documento no aprueba una implementación ni
reemplaza la decisión de producto.

## Decisión 1: Cargo, rol operacional y especialidad

Definir si cada concepto es independiente y cuál es su fuente de verdad:

- **Cargo contractual:** vínculo laboral formal.
- **Rol o función operacional:** responsabilidad asignable en una Orden de Servicio.
- **Especialidad:** competencia o disciplina técnica reutilizable.

La decisión debe incluir campos obligatorios, catálogo, relación con contratos/OS,
presentación en alta y ficha, migración de valores históricos y reglas de habilitación.

## Decisión 2: Calificación

Definir qué representa la calificación, quién puede modificarla, su escala, su vigencia y
si afecta habilitación, asignación, reportes o sólo la ficha. Hasta entonces no debe
aparecer como control con una semántica ambigua.

## Decisión 3: WhatsApp

Definir si la acción se mantiene, su destinatario, permisos, contexto, trazabilidad,
consentimiento y ubicación visual. Una acción de comunicación no debe exponerse como
atajo universal si no existe flujo y responsable definidos.

## Criterio para iniciar implementación

Sólo se abrirá un PR de código cuando exista una decisión aprobada para cada punto y se
pueda describir:

1. comportamiento esperado;
2. impacto de datos históricos;
3. permisos y auditoría;
4. textos aprobados y accesibles;
5. pruebas de alta, edición, permisos y regresión.

## Resultado esperado

Evitar construir controles que parezcan completos pero representen reglas contradictorias
entre alta, ficha, operación, acreditación y reportes.
